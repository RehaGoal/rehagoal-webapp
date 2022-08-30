module rehagoal.images {
    import ImageService = rehagoal.images.ImageService;
    import ImagesDatabase = rehagoal.database.ImagesDatabase;
    import IFileWithHash = rehagoal.database.IFileWithHash;
    import readFileAsTextFunc = rehagoal.utilities.readFileAsTextFunc;
    import findNewNameFunc = rehagoal.utilities.findNewNameFunc;
    describe('rehagoal.images', function () {
        let imageService: ImageService;
        let $rootScope: angular.IRootScopeService;
        let mockImagesDatabaseService: jasmine.SpyObj<ImagesDatabase>;
        let mockHashFile: jasmine.Spy;
        let mockReadDataURLFromBlob: jasmine.Spy;
        let readFileAsText: readFileAsTextFunc;
        let findNewNameSpy: jasmine.Spy;

        //Modules
        beforeEach(angular.mock.module('rehagoal.utilities'));

        beforeEach(angular.mock.module('rehagoal.images', function ($provide: angular.auto.IProvideService) {
            mockHashFile = jasmine.createSpy('hashFile');
            mockImagesDatabaseService = jasmine.createSpyObj('imagesDatabaseService', [
                'hasWorkflowImageReference',
                'hasWorkflowImageHash',
                'setWorkflowImageWithReference',
                'setWorkflowImagesWithReferences',
                'getWorkflowImageByHash',
                'getImageFile',
                'getImageFiles',
                'getWorkflowImageByName',
                'removeImageEntry',
                'removeWorkflowImages',
                'getImageNames',
                'getWorkflowImages',
                'duplicateWorkflowImages',
                'dumpDB'
            ]);
            mockReadDataURLFromBlob = jasmine.createSpy('readDataURLFromBlob');
            $provide.value('hashFile', mockHashFile);
            $provide.value('imagesDatabaseService', mockImagesDatabaseService);
            $provide.value('readDataURLFromBlob', mockReadDataURLFromBlob);
            $provide.decorator('findNewName', function($delegate: findNewNameFunc) {
                findNewNameSpy = jasmine.createSpy('findNewName', $delegate);
                return findNewNameSpy;
            })
        }));

        beforeEach(inject(function (_imageService_: ImageService,
                                        _$rootScope_: angular.IRootScopeService,
                                        _readFileAsText_: readFileAsTextFunc) {
            imageService = _imageService_;
            $rootScope = _$rootScope_;
            readFileAsText = _readFileAsText_;
        }));

        beforeEach(function() {
            installPromiseMatchers({
                flushHttpBackend: false,
                flushInterval: false,
                flushTimeout: false
            });
        });

        describe('imageService', function () {
            const testImage1 = {
                name: 'test1',
                hash: 'nohash',
                file: new Blob(['testImage1'])
            };
            const testImage2 = {
                name: 'test2',
                hash: 'someHash',
                file: new Blob(['testImage2'])
            };
            const workflowId = 123;

            it('should have a controller', function () {
                expect(imageService).toBeDefined();
            });
            it('should have all class attributes on init', function () {
                expect(imageService.workflowImageData).toBeDefined();
            });
            it('should return all imageNames if getImageNames is called', async function (done) {
                const imageNames = ['first', 'second'];
                expect(imageService.getImageNames()).toEqual([]);
                mockImagesDatabaseService.getImageNames.and.returnValue(Promise.resolve(imageNames));
                mockImagesDatabaseService.getWorkflowImages.and.returnValue(Promise.resolve([]));
                await imageService.refreshWorkflowImages(0);
                expect(imageService.getImageNames()).toBe(imageNames);
                done();
            });
            it('should return the name for already stored image if getDuplicateImageName is called', async function (done) {
                mockHashFile.and.returnValue(Promise.resolve(testImage1.hash));
                mockImagesDatabaseService.getWorkflowImageByHash.and.returnValue(Promise.resolve({name: testImage1.name}));

                expect(await imageService.getDuplicateImageName(workflowId, testImage1.file)).toEqual(testImage1.name);
                expect(mockImagesDatabaseService.getWorkflowImageByHash).toHaveBeenCalledWith(workflowId, testImage1.hash);
                done();
            });
            it('should NOT return an url for an non-existing image if getImageUrlFromHash is called', async function (done) {
                mockImagesDatabaseService.getImageFile.and.returnValue(Promise.reject(new Error('test error')));
                // use testImage1
                await expectThrowsAsync(async () => imageService.getImageUrlFromHash(testImage1.hash));
                expect(mockImagesDatabaseService.getImageFile).toHaveBeenCalledWith(testImage1.hash);
                done();
            });
            it('should return an url for an image if getImageUrlFromHash is called', async function (done) {
                // use testImage2
                const testUrl = 'testurl';
                spyOn(URL, 'createObjectURL').and.returnValue(testUrl);
                mockImagesDatabaseService.getImageFile.and.returnValue(Promise.resolve(testImage2.hash));

                expect(await imageService.getImageUrlFromHash(testImage2.hash)).toEqual(testUrl);
                expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
                // next call should create a second URL
                await imageService.getImageUrlFromHash(testImage2.hash);
                expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
                done();
            });
            it('should provide an imageHash (if stored) given a workflow id and imageName if getImageHash is called', async function (done) {
                mockImagesDatabaseService.getWorkflowImageByName.and.returnValue(Promise.resolve(testImage1));
                expect(await imageService.getImageHash(workflowId, testImage1.name)).toEqual(testImage1.hash);
                expect(mockImagesDatabaseService.getWorkflowImageByName).toHaveBeenCalledTimes(1);
                expect(mockImagesDatabaseService.getWorkflowImageByName).toHaveBeenCalledWith(workflowId, testImage1.name);

                done();
            });
            it('should NOT provide an URL given a workflow id and an image name if getImageUrl is called', async function (done) {
                spyOn(imageService, 'getImageHash');
                spyOn(imageService, 'getImageUrlFromHash');
                // no image name provided
                await expectThrowsAsync(async () => await imageService.getImageUrl(workflowId, undefined as any), 'no imageName provided');
                expect(imageService.getImageHash).not.toHaveBeenCalled();
                expect(imageService.getImageUrlFromHash).not.toHaveBeenCalled();
                done();
            });
            it('should provide an URL given a workflow id and an image name if getImageUrl is called', async function (done) {
                // with image name
                const testUrl = 'some url';
                mockImagesDatabaseService.getWorkflowImageByName.and.returnValue(Promise.resolve(testImage1));
                mockImagesDatabaseService.getImageFile.and.returnValue(Promise.resolve(testImage1.file));
                spyOn(URL, 'createObjectURL').and.returnValue(testUrl);

                expect(await imageService.getImageUrl(workflowId, testImage2.name)).toEqual(testUrl);
                done();
            });
            it('should NOT request an delete call for the imagesDatabaseService if removeImage is called with no arguments', async function (done) {
                await expectThrowsAsync(async () => await imageService.removeImage(undefined as any, undefined as any), 'no workflow id provided');
                await expectThrowsAsync(async () => imageService.removeImage(1, undefined as any), 'no image name provided');
                expect(mockImagesDatabaseService.removeImageEntry).not.toHaveBeenCalled();
                done();
            });
            it('should request an delete call for the imagesDatabaseService if removeImage is called', async function (done) {
                mockImagesDatabaseService.removeImageEntry.and.returnValue(Promise.resolve());
                await imageService.removeImage(workflowId, testImage1.name);
                expect(mockImagesDatabaseService.removeImageEntry).toHaveBeenCalledTimes(1);
                expect(mockImagesDatabaseService.removeImageEntry).toHaveBeenCalledWith(workflowId, testImage1.name);
                done();
            });
            it('should NOT request an delete call for the imagesDatabaseService if removeWorkflowImages is called without workflowId', async function (done) {
                await expectThrowsAsync(async () => await imageService.removeWorkflowImages(undefined as any), 'no workflow id provided');
                expect(mockImagesDatabaseService.removeWorkflowImages).not.toHaveBeenCalled();
                done();
            });
            it('should request an delete call for the imagesDatabaseService if removeWorkflowImages is called', async function (done) {
                mockImagesDatabaseService.removeWorkflowImages.and.returnValue(Promise.resolve());
                await imageService.removeWorkflowImages(workflowId);
                expect(mockImagesDatabaseService.removeWorkflowImages).toHaveBeenCalledTimes(1);
                expect(mockImagesDatabaseService.removeWorkflowImages).toHaveBeenCalledWith(workflowId);
                done();
            });
            it('should update the image list if refreshWorkflowImages is called', async function (done) {
                const testNames = [testImage1.name, testImage2.name];
                mockImagesDatabaseService.getImageNames.and.returnValue(Promise.resolve(testNames));
                mockImagesDatabaseService.getWorkflowImages.and.returnValue(Promise.resolve());

                const spyUpdateListener = jasmine.createSpy('spyUpdateListener');
                imageService.addImageUpdateListener(spyUpdateListener);

                expect(await imageService.refreshWorkflowImages(workflowId)).toEqual(testNames);
                expect(mockImagesDatabaseService.getImageNames).toHaveBeenCalledWith(workflowId);
                expect(mockImagesDatabaseService.getWorkflowImages).toHaveBeenCalledWith(workflowId);
                expect(spyUpdateListener).toHaveBeenCalledTimes(1);
                done();
            });
            it('should handle the updateListeners correctly', async function (done) {
                // add
                const spyUpdateListener = jasmine.createSpy('spyUpdateListener');
                const index = imageService.addImageUpdateListener(spyUpdateListener);
                await imageService.refreshWorkflowImages(workflowId);
                expect(spyUpdateListener).toHaveBeenCalledTimes(1);
                // remove
                imageService.removeImageUpdateListener(index);
                await imageService.refreshWorkflowImages(workflowId);
                expect(spyUpdateListener).toHaveBeenCalledTimes(1);
                done();
            });
            it('should NOT set the corresponding refs for a new workflow if duplicateWorkflowImages is called', async function (done) {
                await expectThrowsAsync(async () => await imageService.duplicateWorkflowImages(undefined as any, undefined as any), 'no fromId provided');

                await expectThrowsAsync(async () => await imageService.duplicateWorkflowImages(1, undefined as any), 'no toId provided');
                expect(mockImagesDatabaseService.duplicateWorkflowImages).not.toHaveBeenCalled();
                done();
            });
            it('should set the corresponding refs for a new workflow if duplicateWorkflowImages is called', async function (done) {
                mockImagesDatabaseService.duplicateWorkflowImages.and.returnValue(Promise.resolve());
                await imageService.duplicateWorkflowImages(workflowId, workflowId+1);
                expect(mockImagesDatabaseService.duplicateWorkflowImages).toHaveBeenCalledWith(workflowId, workflowId+1);
                done();
            });
            it('should provide the name (for a stored image) by a given hash value if getCorrespondingNameFromHash is called', function () {
                imageService.workflowImageData.push(testImage1);
                imageService.workflowImageData.push(testImage2);

                expect(imageService.getCorrespondingNameFromHash(undefined as any)).toBeNull();
                expect(imageService.getCorrespondingNameFromHash('invalid')).toBeNull();
                expect(imageService.getCorrespondingNameFromHash(testImage1.hash)).toEqual(testImage1.name);
                expect(imageService.getCorrespondingNameFromHash(testImage2.hash)).toEqual(testImage2.name);
            });
            it('should provide the names (for a stored images) by given hash values if getCorrespondingNamesFromHashes is called', function () {
                imageService.workflowImageData.push(testImage1);
                imageService.workflowImageData.push(testImage2);

                expect([...imageService.getCorrespondingNamesFromHashes(undefined as any).entries()]).toEqual([]);
                expect([...imageService.getCorrespondingNamesFromHashes(['invalid']).entries()]).toEqual([]);
                expect([...imageService.getCorrespondingNamesFromHashes([testImage1.hash]).entries()]).toEqual([[testImage1.hash, testImage1.name]]);
                expect([...imageService.getCorrespondingNamesFromHashes([testImage2.hash]).entries()]).toEqual([[testImage2.hash, testImage2.name]]);
                expect([...imageService.getCorrespondingNamesFromHashes([]).entries()]).toEqual([]);
                expect([...imageService.getCorrespondingNamesFromHashes([testImage1.hash, testImage2.hash]).entries()])
                    .toEqual([[testImage1.hash, testImage1.name], [testImage2.hash, testImage2.name]]);
            });
            it('should remove a valid URL for an image if releaseImageUrl is called', async function (done) {
                const testUrl = 'test url';
                spyOn(URL, 'createObjectURL').and.returnValue(testUrl);
                spyOn(URL, 'revokeObjectURL');
                mockImagesDatabaseService.getImageFile.and.returnValue(Promise.resolve(new Blob()));
                expect(await imageService.getImageUrlFromHash(testImage2.hash)).toBe(testUrl);

                // urls which are falsy
                imageService.releaseImageUrl(undefined as any);
                expect(URL.revokeObjectURL).not.toHaveBeenCalled();
                imageService.releaseImageUrl("");
                expect(URL.revokeObjectURL).not.toHaveBeenCalled();
                imageService.releaseImageUrl(null as any);
                expect(URL.revokeObjectURL).not.toHaveBeenCalled();

                // valid url
                imageService.releaseImageUrl(testUrl);
                expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
                expect(URL.revokeObjectURL).toHaveBeenCalledWith(testUrl);
                done();
            });
            describe('getWorkflowImagesForIds', function() {
                it('should get a map containing all referenced images for a single workflow', async function(done) {
                    const input = [{name: testImage1.name, hash: testImage1.hash},
                        {name: testImage2.name, hash: testImage2.hash}];
                    const expectedResult = {123: input};

                    mockImagesDatabaseService.getWorkflowImages.and.returnValue(Promise.resolve(input));

                    expect(await imageService.getWorkflowImagesForIds([workflowId])).toEqual(jasmine.objectContaining(expectedResult) as any);
                    done();
                });
                it('should get a map containing all referenced images for multiple workflows', async function(done) {
                    const ids = [1, 2];
                    const firstInput = [{name: testImage1.name, hash: testImage1.hash}, {name: testImage2.name, hash: testImage2.hash}];
                    const secondInput = [{name: testImage1.name, hash: testImage1.hash}];

                    const expectedResult = {1: firstInput, 2: secondInput};

                    mockImagesDatabaseService.getWorkflowImages.and.returnValues(Promise.resolve(firstInput), Promise.resolve(secondInput));

                    expect(await imageService.getWorkflowImagesForIds(ids)).toEqual(jasmine.objectContaining(expectedResult) as any);
                    done();
                });
                it('should reject the promise if an workflowId is invalid or not present', async function(done) {
                    await expectThrowsAsync(async () => imageService.getWorkflowImagesForIds(null as any));
                    await expectThrowsAsync(async () => imageService.getWorkflowImagesForIds(0 as any));
                    await expectThrowsAsync(async () => imageService.getWorkflowImagesForIds([]));
                    mockImagesDatabaseService.getWorkflowImages.and.returnValue(Promise.reject(new Error()));
                    await expectThrowsAsync(async () =>  imageService.getWorkflowImagesForIds([workflowId]));
                    done();
                });
            });
            describe('getImageDataForHashes', function() {
                it('should return Promise from imagesDatabaseService.getImageFiles', async function(done) {
                    await tryOrFailAsync(async () => {
                        const expected: IFileWithHash[] = [{
                            hash: 'myTestHash1',
                            data: new Blob(['testDataA']),
                        }, {
                            hash: 'myTestHash2',
                            data: new Blob(['testDataB']),
                        }];
                        mockImagesDatabaseService.getImageFiles.and.returnValue(Promise.resolve(expected));
                        const actual = await imageService.getImageDataForHashes(['myTestHash1', 'myTestHash2']);
                        expect(mockImagesDatabaseService.getImageFiles).toHaveBeenCalledTimes(1);
                        expect(mockImagesDatabaseService.getImageFiles).toHaveBeenCalledWith(['myTestHash1', 'myTestHash2']);
                        expect(actual).toEqual(expected);
                        expect(await readFileAsText(actual[0].data)).toBe('testDataA');
                        expect(await readFileAsText(actual[1].data)).toBe('testDataB');
                    });
                    done();
                });
            });
            describe('store new image', function () {
                beforeEach(function () {
                    mockHashFile.and.returnValue(Promise.resolve(testImage2.hash));
                });
                it('should run through if image and name were not stored previously for given workflow', async function (done) {
                    await tryOrFailAsync(async () => {
                        mockImagesDatabaseService.hasWorkflowImageReference.and.returnValue(Promise.resolve(false));
                        mockImagesDatabaseService.hasWorkflowImageHash.and.returnValue(Promise.resolve(false));
                        mockImagesDatabaseService.setWorkflowImageWithReference.and.returnValue(Promise.resolve());

                        await imageService.storeImageAs(workflowId, testImage2.name, testImage2.file, false);
                        expect(mockImagesDatabaseService.setWorkflowImageWithReference).toHaveBeenCalledTimes(1);
                    });
                    done();
                });
                it('should FAIL if no image file was provided', async function (done) {
                    mockHashFile.and.returnValue(Promise.reject(new Error('EmptyFileHash')));

                    await expectThrowsAsync(async () => await imageService.storeImageAs(workflowId,testImage2.name, new Blob(), false), 'EmptyFileHash');
                    expect(mockImagesDatabaseService.setWorkflowImageWithReference).not.toHaveBeenCalled();

                    done();
                });
                it('should FAIL if image already exists', async function (done) {
                    mockImagesDatabaseService.hasWorkflowImageReference.and.returnValue(Promise.resolve(true));
                    mockImagesDatabaseService.hasWorkflowImageHash.and.returnValue(Promise.resolve(true));

                    await expectThrowsAsync(async () => await imageService.storeImageAs(workflowId,testImage2.name, new Blob(), false), 'ImageExistsAlready');
                    expect(mockImagesDatabaseService.setWorkflowImageWithReference).not.toHaveBeenCalled();
                    done();
                });
                it('should NOT FAIL if image already exists but override is set', async function (done) {
                    mockImagesDatabaseService.hasWorkflowImageReference.and.returnValue(Promise.resolve(true));
                    mockImagesDatabaseService.hasWorkflowImageHash.and.returnValue(Promise.resolve(true));

                    await imageService.storeImageAs(workflowId,testImage2.name, new Blob(), true);
                    expect(mockImagesDatabaseService.setWorkflowImageWithReference).toHaveBeenCalledTimes(1);
                    done();

                });
                it('should FAIL if reference was already saved', async function (done) {
                    mockImagesDatabaseService.hasWorkflowImageReference.and.returnValue(Promise.resolve(false));
                    mockImagesDatabaseService.hasWorkflowImageHash.and.returnValue(Promise.resolve(true));

                    await expectThrowsAsync(async () => await imageService.storeImageAs(workflowId,testImage2.name, new Blob(), false), 'ReferenceAlreadySaved');
                    expect(mockImagesDatabaseService.setWorkflowImageWithReference).not.toHaveBeenCalled();
                    done();
                });
                it('should NOT FAIL if reference was already saved but override is set', async function (done) {
                    mockImagesDatabaseService.hasWorkflowImageReference.and.returnValue(Promise.resolve(false));
                    mockImagesDatabaseService.hasWorkflowImageHash.and.returnValue(Promise.resolve(true));

                    await imageService.storeImageAs(workflowId,testImage2.name, new Blob(), true);
                    expect(mockImagesDatabaseService.setWorkflowImageWithReference).toHaveBeenCalledTimes(1);
                    done();
                });
                it('should FAIL if name is already used', async function (done) {
                    mockImagesDatabaseService.hasWorkflowImageReference.and.returnValue(Promise.resolve(true));
                    mockImagesDatabaseService.hasWorkflowImageHash.and.returnValue(Promise.resolve(false));

                    await expectThrowsAsync(async () => imageService.storeImageAs(workflowId,testImage2.name, new Blob(), false), 'NameAlreadyUsed');
                    expect(mockImagesDatabaseService.setWorkflowImageWithReference).not.toHaveBeenCalled();
                    done();
                });
                it('should NOT FAIL if name is already used but override is set', async function (done) {
                    mockImagesDatabaseService.hasWorkflowImageReference.and.returnValue(Promise.resolve(true));
                    mockImagesDatabaseService.hasWorkflowImageHash.and.returnValue(Promise.resolve(false));

                    await imageService.storeImageAs(workflowId,testImage2.name, new Blob(), true);
                    expect(mockImagesDatabaseService.setWorkflowImageWithReference).toHaveBeenCalledTimes(1);
                    done();
                });
            });
            describe('storeImages', function() {
                it('should call setWorkflowImagesWithReferences with findNewNameConflictHandler', async function(done) {
                    mockImagesDatabaseService.setWorkflowImagesWithReferences.and.returnValue(Promise.resolve());
                    const imageReferences = [
                        {name: 'Image1', hash: 'hash1'},
                        {name: 'Image2', hash: 'hash2'},
                    ];
                    const imageFiles = [
                        {hash: 'hash1', data: new Blob(['data1'])},
                        {hash: 'hash2', data: new Blob(['data2'])},
                    ];
                    await imageService.storeImages(workflowId, imageReferences, imageFiles);
                    expect(mockImagesDatabaseService.setWorkflowImagesWithReferences).toHaveBeenCalledTimes(1);
                    expect(mockImagesDatabaseService.setWorkflowImagesWithReferences).toHaveBeenCalledWith(
                        workflowId,
                        imageReferences,
                        imageFiles,
                        jasmine.any(Function)
                    );
                    const conflictHandler = mockImagesDatabaseService.setWorkflowImagesWithReferences.calls.mostRecent().args[3];
                    const name = 'existing';
                    const existingNames = new Set(['existing', 'existing (2)']);
                    const expectedResolution = findNewNameSpy(name, existingNames);
                    findNewNameSpy.calls.reset();
                    expect(conflictHandler(name, existingNames)).toBe(expectedResolution);
                    expect(findNewNameSpy).toHaveBeenCalledTimes(1);
                    expect(findNewNameSpy).toHaveBeenCalledWith(existingNames, name);
                    done();
                });
            });
            describe('loadImageHashToDataUriMap', function () {
                const testImageMap = {1: [
                        {name: testImage2.name, hash: testImage2.hash},
                        {name: testImage1.name, hash: testImage1.hash}
                    ], 2: [
                        {name: testImage1.name, hash: testImage1.hash}
                    ]};

                it('should reject the promise chain if an image could not get loaded from the imagesDatabaseService', async function(done) {
                    mockImagesDatabaseService.getImageFile.and.returnValue(Promise.reject(new Error('test error')));
                    await expectThrowsAsync(async () => imageService.loadImageHashToDataUriMap(testImageMap));
                    expect(mockImagesDatabaseService.getImageFile).toHaveBeenCalledTimes(3);
                    done();
                });
                it('should get a key value map containing the image hash and image file (data uri) with a valid imageMap input', async function(done) {
                    const t1 = {hash: testImage1.hash, data: testImage1.file};
                    const t2 = {hash: testImage2.hash, data: testImage2.file};
                    const dataUriT1 = 't1 data stream', dataUriT2 = 't2 data stream';
                    const testDataUriMap = {
                        "someHash": dataUriT2,
                        "nohash": dataUriT1
                    };

                    mockImagesDatabaseService.getImageFile.and.returnValues(Promise.resolve(t2), Promise.resolve(t1), Promise.resolve(t1));
                    mockReadDataURLFromBlob.and.returnValues(Promise.resolve(dataUriT2), Promise.resolve(dataUriT1), Promise.resolve(dataUriT1));

                    const result = await imageService.loadImageHashToDataUriMap(testImageMap);
                    expect(mockImagesDatabaseService.getImageFile).toHaveBeenCalledTimes(3);
                    expect(result).toEqual(testDataUriMap);
                    done();
                });
            });
            describe('dumpDB', function() {
                const expectedDBDump = [{
                    table: 'files',
                    rows: [
                        {hash: 'c0ffe', data: new Blob(['data1'])},
                        {hash: 'beef', data: new Blob(['data2'])}
                    ]
                }, {
                    table: 'filenames',
                    rows: [
                        {workflow: 1234, name: 'my image 1', hash: 'c0ffe'},
                        {workflow: 1234, name: 'image2', hash: 'beef'},
                        {worflow: 42, name: 'other image', hash: 'beef'}
                    ]
                }];
                it('should dump database using imagesDatabaseService', function(done) {
                    mockImagesDatabaseService.dumpDB.and.returnValue(Promise.resolve(expectedDBDump));
                    imageService.dumpDB().then((dbDump) => {
                        expect(dbDump).toEqual(expectedDBDump);
                        expect(mockImagesDatabaseService.dumpDB).toHaveBeenCalledTimes(1);
                        done();
                    });
                });
            });
        });
    });
}

