
module rehagoal.database {

    describe('rehagoal.database', function () {
        let dexieInstance: GamificationDexie;

        beforeEach(function () {
            angular.mock.module('rehagoal.database', function ($provide: angular.auto.IProvideService) {
                $provide.decorator('dexieFactory', function ($delegate: DexieFactory) {
                    return function () {
                        dexieInstance = $delegate.apply(null, arguments as any) as GamificationDexie;
                        return dexieInstance;
                    };
                });
            });
        });

        describe('gamificationDatabase', function () {
            let gamificationDatabaseService: GamificationDB;

            beforeEach((done: DoneFn) => angular.mock.inject(function (dexieFactory: DexieFactory) {
                dexieFactory("gamificationDB").delete().then(done);
            }));

            beforeEach(() => angular.mock.inject(function (_gamificationDBService_: GamificationDB) {
                gamificationDatabaseService = _gamificationDBService_;
            }));

            afterAll(function (done: DoneFn) {
                dexieInstance.delete().then(done);
            });

            describe('table: statsEntries', function () {
                let putStatsEntriesSpy: jasmine.Spy;
                let getStatsEntriesSpy: jasmine.Spy;
                const expectedDefaultStats: GamificationStatsEntry = { points: 0, level: 1 };

                beforeEach(() => {
                    putStatsEntriesSpy = spyOn(dexieInstance.statsEntries, 'put').and.callThrough();
                    getStatsEntriesSpy = spyOn(dexieInstance.statsEntries, 'get').and.callThrough();
                });

                describe('method: getStats', function () {

                    it('should return the default stats if no points or levels have been stored', async function (done: DoneFn) {
                        expect(await gamificationDatabaseService.getStats()).toEqual(expectedDefaultStats);
                        expect(getStatsEntriesSpy).toHaveBeenCalledTimes(2);
                        expect(getStatsEntriesSpy).toHaveBeenCalledWith('points');
                        expect(getStatsEntriesSpy).toHaveBeenCalledWith('level');
                        done();
                    });
                });

                describe('method: updateStats', function () {

                    /**
                     * Mock implementation for points increase and level management. This function
                     * will always add a static amount to the previous points value. The level will
                     * increase, if new points modulo 10 is zero (e.g. 10 points, 20 points, etc.).
                     * @param previousStats last stored value within the database
                     * @returns new stats with points (and maybe level) increase
                     */
                    function statUpdaterCallback(previousStats: GamificationStatsEntry): GamificationStatsEntry {
                        const newPoints: number = previousStats.points + 5;
                        const levelUp: boolean = newPoints % 10 === 0;
                        const newLevel: number = levelUp ? previousStats.level + 1 : previousStats.level;
                        return { points: newPoints, level: newLevel };
                    }

                    it('should store the new value for points with same level in the database', async function (done: DoneFn) {
                        const expectedPoints: number = 5;
                        const expectedLevel: number = 1;
                        const expectedStats: GamificationStatsEntry = { points: expectedPoints, level: expectedLevel };

                        expect(await gamificationDatabaseService.getStats()).toEqual(expectedDefaultStats);
                        expect(await gamificationDatabaseService.updateStats(statUpdaterCallback)).toEqual(expectedStats);
                        expect(await gamificationDatabaseService.getStats()).toEqual(expectedStats);

                        expect(putStatsEntriesSpy).toHaveBeenCalledTimes(2);
                        expect(putStatsEntriesSpy).toHaveBeenCalledWith(expectedPoints, 'points');
                        expect(putStatsEntriesSpy).toHaveBeenCalledWith(expectedLevel, 'level');
                        done();
                    });
                    it('should store the new value for points with a new level in the database', async function (done: DoneFn) {
                        const expectedPoints: number = 10;
                        const expectedLevel: number = 2;
                        const expectedStats: GamificationStatsEntry = { points: expectedPoints, level: expectedLevel };

                        expect(await gamificationDatabaseService.getStats()).toEqual(expectedDefaultStats);
                        await gamificationDatabaseService.updateStats(statUpdaterCallback);
                        await gamificationDatabaseService.updateStats(statUpdaterCallback);

                        expect(putStatsEntriesSpy).toHaveBeenCalledTimes(4);
                        expect(putStatsEntriesSpy).toHaveBeenCalledWith(expectedPoints, 'points');
                        expect(putStatsEntriesSpy).toHaveBeenCalledWith(expectedLevel, 'level');

                        expect(await gamificationDatabaseService.getStats()).toEqual(expectedStats);
                        done();
                    });
                });
            });

            describe('table: settingsEntries', function () {
                let putSettingsEntriesSpy: jasmine.Spy;
                let getSettingsEntriesSpy: jasmine.Spy;
                const validSettingsKeys: string[] = ['pointsRecordEnabled', 'pointsShowEnabled', 'iconStyleName', 'difficulty'];
                let sampleSettings: GamificationSettingsDBMap = new Map<string, unknown>( [
                    [ 'pointsRecordEnabled', true ],
                    [ 'pointsShowEnabled', false ],
                    [ 'iconStyleName', 'diamond' ],
                    [ 'difficulty', 'normal' ]
                ]);

                beforeEach(() => {
                    putSettingsEntriesSpy = spyOn(dexieInstance.settingsEntries, 'put').and.callThrough();
                    getSettingsEntriesSpy = spyOn(dexieInstance.settingsEntries, 'get').and.callThrough();
                });

                afterEach(() => {
                    dexieInstance.settingsEntries.clear();
                })

                function settingsMapToArray(settingsMap: GamificationSettingsDBMap): GamificationSettingsDBEntry[] {
                    const settingsArray: GamificationSettingsDBEntry[] = [];
                    settingsMap.forEach(((value, key: string) => settingsArray.push({ settingsKey: key, value: value })));
                    return settingsArray;
                }

                async function getStoredSettings(): Promise<GamificationSettingsDBMap> {
                    return await gamificationDatabaseService.getSettings(new Set(validSettingsKeys));
                }

                async function putSettingsInternal(settings: GamificationSettingsDBEntry[]): Promise<void> {
                    await dexieInstance.settingsEntries.bulkPut(settings);
                }

                describe('method: getSettings', function () {
                    const settingsMap: GamificationSettingsDBMap = new Map<string, unknown>( [
                        [ 'pointsShowEnabled', false ],
                        [ 'difficulty', 'normal' ]
                    ]);

                    it('should return an empty map if no settings have been stored previously', async function(done: DoneFn) {
                        expect(await getStoredSettings()).toEqual(new Map());
                        done();
                    });
                    it('should get the stored database entries for all valid settingsKeys', async (done: DoneFn) => {
                        await putSettingsInternal(settingsMapToArray(sampleSettings));
                        expect(await getStoredSettings()).toEqual(sampleSettings);
                        done();
                    });
                    it('should return the stored settings for the provided keys (partially)', async function(done: DoneFn) {
                        await putSettingsInternal(settingsMapToArray(settingsMap));
                        expect(await gamificationDatabaseService.getSettings(new Set(["pointsShowEnabled", "difficulty"]))).toEqual(new Map([
                            [ "pointsShowEnabled", settingsMap.get("pointsShowEnabled")!],
                            [ "difficulty", settingsMap.get("difficulty")!]
                        ]));
                        done();
                    });
                    it('should return the stored settings for the provided keys (not all keys have been stored)', async function(done: DoneFn) {
                        await putSettingsInternal(settingsMapToArray(settingsMap));
                        expect(await gamificationDatabaseService.getSettings(new Set(["pointsRecordEnabled", "pointsShowEnabled", "difficulty"]))).toEqual(new Map([
                            [ "pointsShowEnabled", settingsMap.get("pointsShowEnabled")!],
                            [ "difficulty", settingsMap.get("difficulty")!]
                        ]));
                        done();
                    });
                    it('should return an empty settings map if the provided Set is empty', async function(done: DoneFn) {
                        await putSettingsInternal(settingsMapToArray(settingsMap));
                        expect(await gamificationDatabaseService.getSettings(new Set())).toEqual(new Map());
                        done();
                    });
                });

                describe('method: putSetting', function () {

                    it('should store the provided entry with a reference to the settingsKey', async (done: DoneFn) => {
                        const recordSetting: GamificationSettingsDBEntry = { settingsKey: 'pointsRecordEnabled', value: true };
                        await gamificationDatabaseService.putSetting({...recordSetting});
                        const showSetting: GamificationSettingsDBEntry = { settingsKey: 'pointsShowEnabled', value: false };
                        await gamificationDatabaseService.putSetting({...showSetting});
                        expect(await getStoredSettings()).toEqual(new Map([
                            [recordSetting.settingsKey, recordSetting.value ],
                            [showSetting.settingsKey, showSetting.value ]
                        ]));
                        done();
                    });
                    it('should overwrite only the given setting if the settingsKey was stored previously', async (done: DoneFn) => {
                        await gamificationDatabaseService.putSetting({ settingsKey: 'pointsRecordEnabled', value: true });
                        await gamificationDatabaseService.putSetting({ settingsKey: 'pointsShowEnabled', value: false });
                        expect(await getStoredSettings()).toEqual(new Map([
                            ['pointsRecordEnabled', true ],
                            ['pointsShowEnabled', false ]
                        ]));
                        await gamificationDatabaseService.putSetting({ settingsKey: 'pointsRecordEnabled', value: false });
                        expect(await getStoredSettings()).toEqual(new Map([
                            ['pointsRecordEnabled', false ],
                            ['pointsShowEnabled', false ]
                        ]));
                        done();
                    });
                });

                describe('method: putSettings', function () {

                    it('should store the provided entries with a reference to their settingsKeys', async (done: DoneFn) => {
                        expect(await getStoredSettings()).toEqual(new Map());
                        await gamificationDatabaseService.putSettings(settingsMapToArray(sampleSettings));
                        expect(await getStoredSettings()).toEqual(sampleSettings);
                        done();
                    });
                    it('should overwrite the values if the settingsKeys were stored previously', async (done: DoneFn) => {
                        await gamificationDatabaseService.putSettings(settingsMapToArray(sampleSettings));
                        expect(await getStoredSettings()).toEqual(sampleSettings);
                        const updatedSettings = sampleSettings;
                        const previousValue = sampleSettings.get("pointsShowEnabled")!;
                        updatedSettings.set("pointsShowEnabled", !previousValue)
                        await gamificationDatabaseService.putSettings(settingsMapToArray(updatedSettings));
                        expect(await getStoredSettings()).toEqual(updatedSettings);
                        done();
                    });
                    it('should succeed when trying to store an empty settings array', async (done: DoneFn) => {
                        await gamificationDatabaseService.putSettings([]);
                        expect(await getStoredSettings()).toEqual(new Map());
                        done();
                    });
                    it('should succeed when trying to store a single settings entry', async (done: DoneFn) => {
                        await gamificationDatabaseService.putSettings([ { settingsKey: "pointsShowEnabled", value: false } ]);
                        expect(await getStoredSettings()).toEqual(new Map([
                            ['pointsShowEnabled', false ]
                        ]));
                        done();
                    });
                    it('should only overwrite the provided settings and leave the previously stored settings untouched', async (done: DoneFn) => {
                        await gamificationDatabaseService.putSettings(settingsMapToArray(sampleSettings));
                        expect(await getStoredSettings()).toEqual(sampleSettings);
                        const updatedSettings = sampleSettings;
                        const previousValue = sampleSettings.get("pointsRecordEnabled")!;
                        updatedSettings.set("pointsRecordEnabled", !previousValue)
                        await gamificationDatabaseService.putSettings([ { settingsKey: "pointsRecordEnabled", value: !previousValue }]);
                        expect(await getStoredSettings()).toEqual(updatedSettings);
                        done();
                    });
                    it('should overwrite a single setting and add a ones as well while leaving the previously stored settings untouched', async (done: DoneFn) => {
                        const limitedSampleSettings: GamificationSettingsDBMap = new Map<string, unknown>( [
                            [ 'pointsRecordEnabled', true ],
                            [ 'difficulty', 'normal' ]
                        ]);
                        const updatedSettings: GamificationSettingsDBMap = new Map<string, unknown>( [
                            [ 'iconStyleName', 'diamond'],
                            [ 'difficulty', 'easy' ]
                        ]);
                        const expectedUpdatedSettings: GamificationSettingsDBMap = new Map<string, unknown>( [
                            [ 'pointsRecordEnabled', true ],
                            [ 'iconStyleName', 'diamond'],
                            [ 'difficulty', 'easy' ]
                        ]);
                        await gamificationDatabaseService.putSettings(settingsMapToArray(limitedSampleSettings));
                        expect(await getStoredSettings()).toEqual(limitedSampleSettings);
                        await gamificationDatabaseService.putSettings(settingsMapToArray(updatedSettings));
                        expect(await getStoredSettings()).toEqual(expectedUpdatedSettings);
                        done();
                    });
                });
            });
        });
    });
}
