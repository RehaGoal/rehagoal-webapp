'use strict';

module rehagoal.database {
    import DexieFactory = rehagoal.database.DexieFactory;
    import readFileAsTextFunc = rehagoal.utilities.readFileAsTextFunc;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;

    describe('rehagoal.database', function () {
        let dexieInstance: ClipboardDexie;

        beforeEach(function () {
            angular.mock.module('rehagoal.database', function ($provide: angular.auto.IProvideService) {
                $provide.decorator('dexieFactory', function ($delegate: DexieFactory) {
                    return function () {
                        dexieInstance = $delegate.apply(null, arguments as any) as ClipboardDexie;
                        return dexieInstance;
                    };
                });
            });
        });
        describe('clipboardDatabase', function () {
            let clipboardDB: ClipboardDB;
            let readFileAsText: readFileAsTextFunc;
            let $rootScope: angular.IRootScopeService;
            beforeEach((done) => angular.mock.inject(async function (dexieFactory: DexieFactory) {
                await dexieFactory("clipboardDB").delete();
                done();
            }));
            beforeEach(() => angular.mock.inject(function (_clipboardDatabaseService_: ClipboardDB,
                                                           _readFileAsText_: readFileAsTextFunc,
                                                           _$rootScope_: angular.IRootScopeService) {
                clipboardDB = _clipboardDatabaseService_;
                readFileAsText = _readFileAsText_;
                $rootScope = _$rootScope_;
            }));
            afterAll(async function (done) {
                await dexieInstance.delete();
                done();
            });

            const xml = '<?xml><block attr="value">testBlocklyXmlContent</block>';
            const blob1Data = "blob1";
            const blob2Data = "blob2";
            const blob3Data = "blob3";
            const previewBlobData = "previewBlob1";
            const entry1: ClipboardEntryWithoutIndex = {
                type: 'blockly',
                data: {
                    blocklyXml: xml,
                    images: {
                        references: [
                            {name: "Image 2", hash: "someHash2"},
                            {name: "Image 1", hash: "someHash1"},
                            {name: "Image 3", hash: "someHash3"},
                        ],
                        data: [
                            {data: new Blob([blob3Data]), hash: "someHash3"},
                            {data: new Blob([blob2Data]), hash: "someHash2"},
                            {data: new Blob([blob1Data]), hash: "someHash1"},
                        ]
                    }
                }
            };
            const entry2: ClipboardEntryWithoutIndex = {
                type: 'blockly',
                data: {
                    blocklyXml: 'xml',
                    previewImage: new Blob([previewBlobData])
                }
            };
            const entry3 = {
                type: 'blockly',
                data: {
                    blocklyXml: 'xml'
                },
                index: 1,
            };

            describe('setEntry', function() {
                it('should store an entry always at index 0', async function (done) {
                    await tryOrFailAsync(async () => {
                        const putEntrySpy = spyOn(dexieInstance.clipboardEntries, 'put').and.callThrough();
                        await clipboardDB.setEntry(entry1);
                        expect(dexieInstance.clipboardEntries.put).toHaveBeenCalledTimes(1);
                        expect(dexieInstance.clipboardEntries.put).toHaveBeenCalledWith({
                            ...entry1,
                            index: 0
                        });
                        let allEntries = await dexieInstance.clipboardEntries.toArray();
                        expect(allEntries).toEqual([{...entry1, index: 0}]);
                        expect(await readFileAsText(allEntries[0].data.images!.data[0].data)).toEqual(blob3Data);
                        expect(await readFileAsText(allEntries[0].data.images!.data[1].data)).toEqual(blob2Data);
                        expect(await readFileAsText(allEntries[0].data.images!.data[2].data)).toEqual(blob1Data);

                        await clipboardDB.setEntry(entry2);
                        expect(dexieInstance.clipboardEntries.put).toHaveBeenCalledTimes(2);
                        expect(putEntrySpy.calls.mostRecent().args).toEqual([{
                            ...entry2,
                            index: 0
                        }]);
                        allEntries = await dexieInstance.clipboardEntries.toArray();
                        expect(allEntries).toEqual([{...entry2, index: 0}]);
                        expect(await readFileAsText(allEntries[0].data.previewImage!)).toEqual(previewBlobData);

                        await clipboardDB.setEntry(entry3 as ClipboardEntryWithoutIndex);
                        allEntries = await dexieInstance.clipboardEntries.toArray();
                        expect(allEntries).toEqual([{...entry3 as ClipboardEntryWithoutIndex, index: 0}]);
                    });
                    done();
                });
                it('should reject if called with invalid type', async function(done) {
                    await expectThrowsAsync(async () => {
                        await clipboardDB.setEntry({
                            type: "invalid" as ClipboardEntryType,
                            data: {blocklyXml: ""}
                        });
                    }, 'Unsupported clipboard type: invalid');
                    done();
                });
            });

            describe('getEntry', function() {
                it('should return the specified entry or null', async function(done) {
                    await tryOrFailAsync(async () => {
                        let actualEntry: ClipboardEntry | null;
                        expect(await clipboardDB.getEntry("blockly")).toBeNull();
                        await expectThrowsAsync(() => clipboardDB.getEntry("invalid" as ClipboardEntryType), /Unsupported clipboard type: invalid/);

                        await clipboardDB.setEntry(entry1);
                        actualEntry = await clipboardDB.getEntry("blockly");
                        expect(actualEntry).toEqual({...entry1, index: 0});
                        expect(await readFileAsText(actualEntry!.data.images!.data[0].data)).toEqual(blob3Data);
                        expect(await readFileAsText(actualEntry!.data.images!.data[1].data)).toEqual(blob2Data);
                        expect(await readFileAsText(actualEntry!.data.images!.data[2].data)).toEqual(blob1Data);

                        await clipboardDB.setEntry(entry2);
                        actualEntry = await clipboardDB.getEntry("blockly");
                        expect(actualEntry).toEqual({...entry2, index: 0});
                        expect(await readFileAsText(actualEntry!.data.previewImage!)).toEqual(previewBlobData);
                        await expectThrowsAsync(() => clipboardDB.getEntry("invalid" as ClipboardEntryType), /Unsupported clipboard type: invalid/);
                    });
                    done();
                });
                it('should reject if called with invalid type', async function(done) {
                    await expectThrowsAsync(async () => {
                        await clipboardDB.getEntry('invalid' as ClipboardEntryType);
                    }, 'Unsupported clipboard type: invalid');
                    done();
                });
            });



            describe('auto-expiry feature', function() {
                let $broadcastSpy: jasmine.Spy;
                beforeEach(function() {
                    jasmine.clock().install();
                    $broadcastSpy = spyOn($rootScope, '$broadcast');
                });
                afterEach(function() {
                    jasmine.clock().uninstall();
                });

                const date1 = new Date(Date.UTC(2021, 1, 2, 3, 4, 5, 6));
                const date1Trimmed = new Date(Date.UTC(2021, 1, 2));
                const date1AlmostExpired = new Date(Date.UTC(2021, 1, 3, 23, 59, 59, 999));
                const date1AlmostExpiredTrimmed = new Date(Date.UTC(2021, 1, 3));
                const date1JustExpired = new Date(Date.UTC(2021, 1, 4));
                const date1Expired2 = new Date(Date.UTC(2021, 1, 4, 1, 2, 3, 4));
                const date2 = new Date(Date.UTC(2021, 1, 3, 4, 5, 6, 7));
                const date2Trimmed = new Date(Date.UTC(2021, 1, 3));
                const type: ClipboardEntryType = 'blockly';
                const testEntry: ClipboardEntryWithoutIndex = {type, data: {blocklyXml: "myData1"}} as const;
                const testEntry2: ClipboardEntryWithoutIndex = {type, data: {blocklyXml: "myData2"}} as const;
                const extraEntry = {type, index: 1, data: {blocklyXml: "superflousEntry"}} as const;
                const invalidEntry = {type: 'invalidType', data: "something", index: 0} as const;

                describe(`getEntry (type=${type})`, function() {
                    it(`should set last operation to current day`, async function(done) {
                        jasmine.clock().mockDate(date2);
                        await dexieInstance.lastOperation.put({type, last: date1Trimmed});
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1Trimmed});
                        await clipboardDB.getEntry(type);
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date2Trimmed});
                        done();
                    });
                    it('should not delete entry, if expiry date is not yet reached (1ms before expired)', async function(done) {
                        jasmine.clock().mockDate(date1);
                        await clipboardDB.setEntry(testEntry);
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1Trimmed});
                        jasmine.clock().mockDate(date1AlmostExpired);
                        expect(await clipboardDB.getEntry(type)).toEqual({...testEntry, index: 0});
                        expect($rootScope.$broadcast).not.toHaveBeenCalledWith(CLIPBOARD_DATA_EXPIRED_EVENT, jasmine.anything());
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toEqual({...testEntry, index: 0});
                        done();
                    });
                    it('should delete entry, if expiry date is reached (just expired)', async function(done) {
                        jasmine.clock().mockDate(date1);
                        await clipboardDB.setEntry(testEntry);
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1Trimmed});
                        jasmine.clock().mockDate(date1JustExpired);
                        expect(await clipboardDB.getEntry(type)).toBeNull();
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(CLIPBOARD_DATA_EXPIRED_EVENT, type);
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toBeUndefined();
                        done();
                    });
                    it('should delete entry, if expiry date is reached (later after expiry)', async function(done) {
                        jasmine.clock().mockDate(date1);
                        await clipboardDB.setEntry(testEntry);
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1Trimmed});
                        jasmine.clock().mockDate(date1Expired2);
                        expect(await clipboardDB.getEntry(type)).toBeNull();
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(CLIPBOARD_DATA_EXPIRED_EVENT, type);
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toBeUndefined();
                        done();
                    });
                    it('should not delete other entry types, if present', async function(done) {
                        await dexieInstance.clipboardEntries.put(invalidEntry as unknown as ClipboardEntry);
                        jasmine.clock().mockDate(date1);
                        await clipboardDB.setEntry(testEntry);
                        jasmine.clock().mockDate(date1JustExpired);
                        expect(await clipboardDB.getEntry(type)).toBeNull();
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(CLIPBOARD_DATA_EXPIRED_EVENT, type);
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toBeUndefined();
                        expect(await dexieInstance.clipboardEntries.get({type: 'invalidType', index: 0})).toEqual(invalidEntry as unknown as ClipboardEntry);
                        done();
                    });
                    it('should delete entry, if lastOperation date lies in the future', async function(done) {
                        jasmine.clock().mockDate(date2);
                        await clipboardDB.setEntry(testEntry);
                        jasmine.clock().mockDate(date1);
                        expect(await clipboardDB.getEntry(type)).toBeNull();
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(CLIPBOARD_DATA_EXPIRED_EVENT, type);
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toBeUndefined();
                        done();
                    });
                });
                describe(`setEntry (type=${type})`, function() {
                    beforeEach(async function(done) {
                        // prepare second entry, in order to check that something (everything with that type is deleted)
                        await dexieInstance.clipboardEntries.put(extraEntry);
                        await dexieInstance.lastOperation.put({type, last: date1});
                        done();
                    });
                    it(`should set last operation to current day`, async function(done) {
                        jasmine.clock().mockDate(date2);
                        await dexieInstance.lastOperation.put({type, last: date1Trimmed});
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1Trimmed});
                        await clipboardDB.setEntry(testEntry);
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date2Trimmed});
                        done();
                    });
                    it('should not delete entry, if expiry date is not yet reached (1ms before expired)', async function(done) {
                        jasmine.clock().mockDate(date1);
                        await clipboardDB.setEntry(testEntry);
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1Trimmed});
                        jasmine.clock().mockDate(date1AlmostExpired);
                        await clipboardDB.setEntry(testEntry2);
                        expect($rootScope.$broadcast).not.toHaveBeenCalledWith(CLIPBOARD_DATA_EXPIRED_EVENT, jasmine.anything());
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1AlmostExpiredTrimmed});
                        expect(await clipboardDB.getEntry(type)).toEqual({...testEntry2, index: 0});
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toEqual({...testEntry2, index: 0});
                        expect(await dexieInstance.clipboardEntries.get({type, index: 1})).toEqual({...extraEntry, index: 1});
                        done();
                    });
                    it('should delete all entries, if expiry date is reached (just expired)', async function(done) {
                        jasmine.clock().mockDate(date1);
                        await clipboardDB.setEntry(testEntry);
                        expect(await dexieInstance.clipboardEntries.get({type, index: 1})).toEqual(extraEntry);
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1Trimmed});
                        jasmine.clock().mockDate(date1JustExpired);
                        await clipboardDB.setEntry(testEntry2);
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(CLIPBOARD_DATA_EXPIRED_EVENT, type);
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toEqual({...testEntry2, index: 0});
                        expect(await clipboardDB.getEntry(type)).toEqual({...testEntry2, index: 0});
                        expect(await dexieInstance.clipboardEntries.get({type, index: 1})).toBeUndefined();
                        done();
                    });
                    it('should delete all entries, if expiry date is reached (later after expiry)', async function(done) {
                        jasmine.clock().mockDate(date1);
                        await clipboardDB.setEntry(testEntry);
                        expect(await dexieInstance.lastOperation.get(type)).toEqual({type, last: date1Trimmed});
                        jasmine.clock().mockDate(date1Expired2);
                        await clipboardDB.setEntry(testEntry2);
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(CLIPBOARD_DATA_EXPIRED_EVENT, type);
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toEqual({...testEntry2, index: 0});
                        expect(await dexieInstance.clipboardEntries.get({type, index: 1})).toBeUndefined();
                        expect(await dexieInstance.clipboardEntries.count()).toBe(1);
                        done();
                    });
                    it('should not delete other entry types, if present', async function(done) {
                        await dexieInstance.clipboardEntries.put(invalidEntry as unknown as ClipboardEntry);
                        jasmine.clock().mockDate(date1);
                        await clipboardDB.setEntry(testEntry);
                        jasmine.clock().mockDate(date1JustExpired);
                        await clipboardDB.setEntry(testEntry2);
                        expect(await dexieInstance.clipboardEntries.get({type, index: 0})).toEqual({...testEntry2, index: 0});
                        expect(await clipboardDB.getEntry(type)).toEqual({...testEntry2, index: 0});
                        expect(await dexieInstance.clipboardEntries.get({type, index: 1})).toBeUndefined();
                        expect(await dexieInstance.clipboardEntries.get({type: 'invalidType', index: 0})).toEqual(invalidEntry as unknown as ClipboardEntry);
                        done();
                    });
                });
            });
        });
    });
}
