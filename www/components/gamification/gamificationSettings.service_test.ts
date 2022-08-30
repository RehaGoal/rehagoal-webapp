module rehagoal.gamification {
    import GamificationDB = rehagoal.database.GamificationDB;
    import SettingsService = rehagoal.settings.SettingsService;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
    import GamificationSettingsDBMap = rehagoal.database.GamificationSettingsDBMap;
    import GamificationSettingsDBEntry = rehagoal.database.GamificationSettingsDBEntry;

    describe('rehagoal.gamification', () => {
        let gamificationSettingsService: IGamificationSettingsService;
        let $log: angular.ILogService;
        let $rootScope: angular.IRootScopeService;
        let settingsService: SettingsService;
        let mockGamificationDatabaseService: jasmine.SpyObj<GamificationDB>;

        let $logSpy: jasmine.Spy;

        describe('gamificationIconStyle', () => {
            const pathPrefix = "components/gamification/assets/gamificationIcons.svg#";
            const totalNumberOfIcons = 19;

            it('should have defined icons and size of iconStylesCollection to be correct', () => {
                expect(GamificationIconStyle.DIAMOND).toBeDefined();
                expect(GamificationIconStyle.BI_AWARD).toBeDefined();
                expect(GamificationIconStyle.BI_DIAMOND).toBeDefined();
                expect(GamificationIconStyle.BI_STAR).toBeDefined();
                expect(GamificationIconStyle.BI_HEART).toBeDefined();
                expect(GamificationIconStyle.BI_SUIT_CLUB).toBeDefined();
                expect(GamificationIconStyle.BI_SUIT_DIAMOND).toBeDefined();
                expect(GamificationIconStyle.BI_SUIT_HEART).toBeDefined();
                expect(GamificationIconStyle.BI_SUIT_SPADE).toBeDefined();
                expect(GamificationIconStyle.BI_X_DIAMOND).toBeDefined();
                expect(GamificationIconStyle.BI_TRIANGLE).toBeDefined();
                expect(GamificationIconStyle.BI_HEPTAGON).toBeDefined();
                expect(GamificationIconStyle.BI_HEXAGON).toBeDefined();
                expect(GamificationIconStyle.BI_OCTAGON).toBeDefined();
                expect(GamificationIconStyle.BI_PENTAGON).toBeDefined();
                expect(GamificationIconStyle.BI_PIG).toBeDefined();
                expect(GamificationIconStyle.BI_CPU).toBeDefined();
                expect(GamificationIconStyle.BI_INCOGNITO).toBeDefined();
                expect(GamificationIconStyle.BI_ROBOT).toBeDefined();

                expect(GamificationIconStyle.getAllAsArray().length).toBe(totalNumberOfIcons);
            });
            it('should have names and paths to match current svg structure', () => {
                const iconStyles: GamificationIconStyle[] = GamificationIconStyle.getAllAsArray();
                expect(iconStyles.length).toBe(totalNumberOfIcons);

                for (let i = 0; i < iconStyles.length; i++) {
                    const currentStyle: GamificationIconStyle = iconStyles[i];
                    expect(currentStyle.name).toBeDefined();
                    expect(currentStyle.imageSrc).toBe(`${pathPrefix}${currentStyle.name}`);
                }
            });
            it('should return correct number of different names in getAllNamesAsArray', () => {
                const iconStyleNames: GamificationIconStyleName[] = GamificationIconStyle.getAllNamesAsArray();

                const nameSet: Set<string> = new Set<string>(iconStyleNames);
                expect(nameSet.size).toBe(totalNumberOfIcons);
            });
            it('should return correct number of paths in getAllImagePathsAsArray with correct prefix', () => {
                const iconStylePaths: string[] = GamificationIconStyle.getAllImagePathsAsArray();

                const nameSet: Set<string> = new Set<string>(iconStylePaths);
                expect(nameSet.size).toBe(totalNumberOfIcons);

                for (let i = 0; i < iconStylePaths.length; i++) {
                    expect(iconStylePaths[i]).toMatch(pathPrefix);
                }
            });
            it('should have matching name and path for each style in getter methods', () => {
                const iconStyles: GamificationIconStyle[] = GamificationIconStyle.getAllAsArray();
                const iconStyleNames: GamificationIconStyleName[] = GamificationIconStyle.getAllNamesAsArray();
                const iconStylePaths: string[] = GamificationIconStyle.getAllImagePathsAsArray();

                expect(iconStyleNames.length).toBe(iconStyles.length);
                expect(iconStylePaths.length).toBe(iconStyles.length);

                for (let i = 0; i < iconStyles.length; i++) {
                    const currentStyle: GamificationIconStyle = iconStyles[i];
                    expect(iconStyleNames[i]).toBe(currentStyle.name);
                    expect(iconStylePaths[i]).toBe(currentStyle.imageSrc);
                }
            });
            it('should return correct style if getStyleByName is called', () => {
                const iconStyles: GamificationIconStyle[] = GamificationIconStyle.getAllAsArray();

                for (let i = 0; i < iconStyles.length; i++) {
                    const currentStyle: GamificationIconStyle = iconStyles[i];

                    expect(GamificationIconStyle.getStyleByName(currentStyle.name)).toBe(currentStyle);
                }
            });
            it('should throw an error if no GamificationStyle exists for getStyleByName', () => {
                const notExistingName: string = "NotExisting";
                expect(() => GamificationIconStyle.getStyleByName(notExistingName as GamificationIconStyleName)).toThrow(jasmine.any(Error));
                expect(() => GamificationIconStyle.getStyleByName(notExistingName as GamificationIconStyleName)).toThrowError(`Unknown icon style: ${notExistingName}`)
            });
        });

        function objectToMap<K extends string, V>(obj: Record<K, V>): Map<K, V> {
            return new Map<K, V>(Object.entries(obj) as [K, V][]);
        }

        describe('gamificationSettingsService without stored settings', () => {

            beforeEach(angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
                mockGamificationDatabaseService = jasmine.createSpyObj('gamificationDBService', [
                    'getSettings',
                    'putSetting',
                    'putSettings'
                ]);
                mockGamificationDatabaseService.getSettings.and.returnValue(Promise.resolve<GamificationSettingsDBMap>(new Map()));
                $provide.value('gamificationDBService', mockGamificationDatabaseService);
            }));

            beforeEach(inject((_$rootScope_: angular.IRootScopeService,
                               _gamificationSettingsService_: IGamificationSettingsService,
                               _settingsService_: SettingsService) => {
                $rootScope = _$rootScope_;
                gamificationSettingsService = _gamificationSettingsService_;
                settingsService = _settingsService_;
                spyOn($rootScope, '$broadcast').and.callThrough();
                settingsService.gamificationEnabled = true;
            }));

            it('should load default value for "isPointsRecordingEnabled"', async (done: DoneFn) => {
                expect(await gamificationSettingsService.isPointsRecordingEnabled()).toBe(true);
                expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                expect(mockGamificationDatabaseService.putSettings).toHaveBeenCalledWith(jasmine.arrayContaining<GamificationSettingsDBEntry>([{ settingsKey: 'pointsRecordEnabled', value: true }]));
                done();
            });
            it('should load default value for "isPointsDisplayEnabled"', async (done: DoneFn) => {
                expect(await gamificationSettingsService.isPointsDisplayEnabled()).toBe(true);
                expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                expect(mockGamificationDatabaseService.putSettings).toHaveBeenCalledWith(jasmine.arrayContaining<GamificationSettingsDBEntry>([{ settingsKey: 'pointsShowEnabled', value: true }]));
                done();
            });
            it('should load default value for "getIconStyle"', async (done: DoneFn) => {
                expect(await gamificationSettingsService.getIconStyle()).toBe(GamificationIconStyle.BI_STAR);
                expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                expect(mockGamificationDatabaseService.putSettings).toHaveBeenCalledWith(jasmine.arrayContaining<GamificationSettingsDBEntry>([{ settingsKey: 'iconStyleName', value: 'bi-star' }]));
                done();
            });
            it('should load default value for "getDifficulty"', async (done: DoneFn) => {
                expect(await gamificationSettingsService.getDifficulty()).toBe("normal");
                expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                expect(mockGamificationDatabaseService.putSettings).toHaveBeenCalledWith(jasmine.arrayContaining<GamificationSettingsDBEntry>([{ settingsKey: 'difficulty', value: 'normal' }]));
                done();
            });
        });

        describe('gamificationSettingsService with mocked settings', () => {
            const defaultGamificationSettings: Readonly<GamificationSettings> = {
                pointsRecordEnabled: false,
                pointsShowEnabled: false,
                iconStyleName: 'bi-star',
                difficulty: 'normal'
            } as const;

            beforeEach(angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
                mockGamificationDatabaseService = jasmine.createSpyObj('gamificationDBService', [
                    'getStats',
                    'updateStats',
                    'getSettings',
                    'putSetting',
                    'putSettings'
                ]);
                mockGamificationDatabaseService.getSettings.and.returnValue(objectToMap(defaultGamificationSettings));
                $provide.value('gamificationDBService', mockGamificationDatabaseService);
            }));

            beforeEach(inject((_$log_: angular.ILogService,
                               _$rootScope_: angular.IRootScopeService,
                               _gamificationSettingsService_: IGamificationSettingsService,
                               _settingsService_: SettingsService) => {
                $log = _$log_;
                $rootScope = _$rootScope_;
                gamificationSettingsService = _gamificationSettingsService_;
                settingsService = _settingsService_;
                spyOn($rootScope, '$broadcast').and.callThrough();
                settingsService.gamificationEnabled = false;
            }));

            it('should return false after loading settings if global gamification in SettingsService is disabled', async (done: DoneFn) => {
                expect (await gamificationSettingsService.isPointsRecordingEnabled()).toBe(false);
                expect (await gamificationSettingsService.isPointsDisplayEnabled()).toBe(false);
                expect(mockGamificationDatabaseService.getSettings).not.toHaveBeenCalled();
                done();
            });

            describe('with global gamification enabled in SettingsService', () => {

                beforeEach(() => {
                    settingsService.gamificationEnabled = true;
                });

                it('should load stored settings from gamificationDB on first load for "isPointsRecordingEnabled"', async (done: DoneFn) => {
                    const expectedValue = defaultGamificationSettings.pointsRecordEnabled;
                    expect(await gamificationSettingsService.isPointsRecordingEnabled()).toBe(expectedValue);
                    expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                    done();
                });
                it('should load stored settings from gamificationDB on first load for "isPointsDisplayEnabled"', async (done: DoneFn) => {
                    expect(await gamificationSettingsService.isPointsDisplayEnabled()).toBe(defaultGamificationSettings.pointsShowEnabled);
                    expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                    done();
                });
                it('should load stored settings from gamificationDB on first load for "getIconStyle"', async (done: DoneFn) => {
                    expect(await gamificationSettingsService.getIconStyle()).toBe(GamificationIconStyle.getStyleByName(defaultGamificationSettings.iconStyleName));
                    expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                    done();
                });
                it('should load stored settings from gamificationDB on first load for "getDifficulty"', async (done: DoneFn) => {
                    expect(await gamificationSettingsService.getDifficulty()).toBe(defaultGamificationSettings.difficulty);
                    expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                    done();
                });

                describe('setting: pointsRecordEnabled', () => {
                    const testSettingsKey = 'pointsRecordEnabled';
                    const testDefaultSettingValue = defaultGamificationSettings[testSettingsKey];

                    beforeEach(async (done: DoneFn) => {
                        await gamificationSettingsService.isPointsRecordingEnabled();
                        since('Known settings or default values should have parsed already').expect(mockGamificationDatabaseService.putSettings).not.toHaveBeenCalled();
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        done();
                    });

                    it('should not load stored settings from gamificationDB again after first load', async function(done: DoneFn) {
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        expect(await gamificationSettingsService.isPointsRecordingEnabled()).toBe(testDefaultSettingValue);
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should persist a changed value within the gamificationDB', async function(done: DoneFn) {
                        const oldValue: boolean = await gamificationSettingsService.isPointsRecordingEnabled();
                        const expectedNewValue = !oldValue;
                        await gamificationSettingsService.setPointsRecordingEnabled(expectedNewValue);
                        expect(mockGamificationDatabaseService.putSetting).toHaveBeenCalledWith({settingsKey: testSettingsKey, value: expectedNewValue });
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, {settingsKey: testSettingsKey, value: expectedNewValue });
                        expect(await gamificationSettingsService.isPointsRecordingEnabled()).toEqual(expectedNewValue);
                        done();
                    });
                    it('should revert the setter if the persist call fails', async function(done: DoneFn) {
                        mockGamificationDatabaseService.putSetting.and.returnValue(Promise.reject(new Error('dexie failed transaction')));
                        const oldValue: boolean = defaultGamificationSettings[testSettingsKey]
                        const expectedNewValue = !oldValue;
                        await expectThrowsAsync(() => gamificationSettingsService.setPointsRecordingEnabled(expectedNewValue));
                        expect(await gamificationSettingsService.isPointsRecordingEnabled()).toEqual(oldValue);
                        expect($rootScope.$broadcast).not.toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME);
                        done();
                    });
                    it('should prevent storing invalid type-values to this settingsKey', async function(done: DoneFn) {
                        await expectThrowsAsync(() => gamificationSettingsService.setPointsRecordingEnabled('not a boolean' as unknown as boolean));
                        await expectThrowsAsync(() => gamificationSettingsService.setPointsRecordingEnabled(null as unknown as boolean));
                        await expectThrowsAsync(() => gamificationSettingsService.setPointsRecordingEnabled({} as unknown as boolean));
                        expect(await gamificationSettingsService.isPointsRecordingEnabled()).toBe(false);
                       done();
                    });
                    it('should toggle `pointsRecordEnabled` if global gamificationEnabled gets changed within settingsService', async (done: DoneFn) => {
                        expect(await gamificationSettingsService.isPointsRecordingEnabled()).toBe(testDefaultSettingValue);
                        await gamificationSettingsService.setPointsRecordingEnabled(true);
                        expect(await gamificationSettingsService.isPointsRecordingEnabled()).toBe(true);
                        settingsService.gamificationEnabled = false;
                        settingsService.saveSettings();
                        expect(await gamificationSettingsService.isPointsRecordingEnabled()).toBe(false);
                        settingsService.gamificationEnabled = true;
                        settingsService.saveSettings();
                        expect(await gamificationSettingsService.isPointsRecordingEnabled()).toBe(true);
                        done();
                    });
                });
                describe('setting: pointsShowEnabled', () => {
                    const testSettingsKey = 'pointsShowEnabled';
                    const testDefaultSettingValue = defaultGamificationSettings[testSettingsKey]

                    beforeEach(async (done: DoneFn) => {
                        await gamificationSettingsService.isPointsDisplayEnabled();
                        since('Known settings or default values should have parsed already').expect(mockGamificationDatabaseService.putSettings).not.toHaveBeenCalled();
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        done();
                    });

                    it('should not load stored settings from gamificationDB again after first load', async function(done: DoneFn) {
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        expect(await gamificationSettingsService.isPointsDisplayEnabled()).toBe(testDefaultSettingValue);
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should persist a changed value within the gamificationDB', async function(done: DoneFn) {
                        const oldValue: boolean = await gamificationSettingsService.isPointsDisplayEnabled();
                        const expectedNewValue = !oldValue;
                        await gamificationSettingsService.setPointsDisplayEnabled(expectedNewValue);
                        expect(mockGamificationDatabaseService.putSetting).toHaveBeenCalledWith({settingsKey: testSettingsKey, value: expectedNewValue });
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, {settingsKey: testSettingsKey, value: expectedNewValue });
                        expect(await gamificationSettingsService.isPointsDisplayEnabled()).toEqual(expectedNewValue);
                        done();
                    });
                    it('should revert the setter if the persist call fails', async function(done: DoneFn) {
                        mockGamificationDatabaseService.putSetting.and.returnValue(Promise.reject(new Error('dexie failed transaction')));
                        const oldValue: boolean = defaultGamificationSettings[testSettingsKey]
                        const expectedNewValue = !oldValue;
                        await expectThrowsAsync(() => gamificationSettingsService.setPointsDisplayEnabled(expectedNewValue));
                        expect(await gamificationSettingsService.isPointsDisplayEnabled()).toEqual(oldValue);
                        expect($rootScope.$broadcast).not.toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME);
                        done();
                    });
                    it('should prevent storing invalid type-values to this settingsKey', async function(done: DoneFn) {
                        await expectThrowsAsync(() => gamificationSettingsService.setPointsDisplayEnabled('not a boolean' as unknown as boolean));
                        await expectThrowsAsync(() => gamificationSettingsService.setPointsDisplayEnabled(null as unknown as boolean));
                        await expectThrowsAsync(() => gamificationSettingsService.setPointsDisplayEnabled({} as unknown as boolean));
                        expect(await gamificationSettingsService.isPointsDisplayEnabled()).toBe(false);
                        done();
                    });
                    it('should toggle `pointsShowEnabled` if global gamificationEnabled gets changed within settingsService', async (done: DoneFn) => {
                        expect(await gamificationSettingsService.isPointsDisplayEnabled()).toBe(testDefaultSettingValue);
                        await gamificationSettingsService.setPointsDisplayEnabled(true);
                        expect(await gamificationSettingsService.isPointsDisplayEnabled()).toBe(true);
                        settingsService.gamificationEnabled = false;
                        settingsService.saveSettings();
                        expect(await gamificationSettingsService.isPointsDisplayEnabled()).toBe(false);
                        settingsService.gamificationEnabled = true;
                        settingsService.saveSettings();
                        expect(await gamificationSettingsService.isPointsDisplayEnabled()).toBe(true);
                        done();
                    });
                });
                describe('setting: iconStyleName', () => {
                    const testSettingsKey = 'iconStyleName';
                    const testDefaultSettingValue = defaultGamificationSettings[testSettingsKey]

                    beforeEach(async (done: DoneFn) => {
                        await gamificationSettingsService.getIconStyle();
                        since('Known settings or default values should have parsed already').expect(mockGamificationDatabaseService.putSettings).not.toHaveBeenCalled();
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        done();
                    });

                    it('should not load stored settings from gamificationDB again after first load', async function(done: DoneFn) {
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        expect(await gamificationSettingsService.getIconStyle()).toBe(GamificationIconStyle.getStyleByName(testDefaultSettingValue));
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should persist a changed value within the gamificationDB', async function(done: DoneFn) {
                        const oldValue: GamificationIconStyle = await gamificationSettingsService.getIconStyle();
                        const expectedValue: GamificationIconStyle = GamificationIconStyle.BI_AWARD;
                        await gamificationSettingsService.setIconStyle(expectedValue);
                        expect(mockGamificationDatabaseService.putSetting).toHaveBeenCalledWith({settingsKey: testSettingsKey, value: expectedValue.name });
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, {settingsKey: testSettingsKey, value: expectedValue.name });
                        expect(await gamificationSettingsService.getIconStyle()).not.toEqual(oldValue);
                        expect(await gamificationSettingsService.getIconStyle()).toEqual(expectedValue);
                        done();
                    });
                    it('should revert the setter if the persist call fails', async function(done: DoneFn) {
                        mockGamificationDatabaseService.putSetting.and.returnValue(Promise.reject(new Error('dexie failed transaction')));
                        const oldValue: GamificationIconStyle = GamificationIconStyle.getStyleByName(testDefaultSettingValue);
                        await expectThrowsAsync(() => gamificationSettingsService.setIconStyle(GamificationIconStyle.BI_DIAMOND));
                        expect(await gamificationSettingsService.getIconStyle()).toEqual(oldValue);
                        expect($rootScope.$broadcast).not.toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME);
                        done();
                    });
                    it('should prevent storing invalid type-values to this settingsKey', async function(done: DoneFn) {
                        await expectThrowsAsync(() => gamificationSettingsService.setIconStyle({} as unknown as GamificationIconStyle));
                        await expectThrowsAsync(() => gamificationSettingsService.setIconStyle({ identifier: 'BI_SUIT_SPADE', imagePath: null } as unknown as GamificationIconStyle));
                        await expectThrowsAsync(() => gamificationSettingsService.setIconStyle({ identifier: 'not defined', imagePath: null } as unknown as GamificationIconStyle));
                        expect(await gamificationSettingsService.getIconStyle()).toEqual(GamificationIconStyle.getStyleByName(testDefaultSettingValue));
                        done();
                    });

                });
                describe('setting: difficulty', () => {
                    const testSettingsKey = 'difficulty';
                    const testDefaultSettingValue = defaultGamificationSettings[testSettingsKey]

                    beforeEach(async (done: DoneFn) => {
                        await gamificationSettingsService.getDifficulty();
                        since('Known settings or default values should have parsed already').expect(mockGamificationDatabaseService.putSettings).not.toHaveBeenCalled();
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        done();
                    });

                    it('should not load stored settings from gamificationDB again after first load', async function(done: DoneFn) {
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        expect(await gamificationSettingsService.getDifficulty()).toBe(testDefaultSettingValue);
                        expect(mockGamificationDatabaseService.getSettings).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should persist a changed value within the gamificationDB', async function(done: DoneFn) {
                        const oldValue: GamificationDifficulty = await gamificationSettingsService.getDifficulty();
                        const expectedValue: GamificationDifficulty = "easy";
                        await gamificationSettingsService.setDifficulty(expectedValue);
                        expect(mockGamificationDatabaseService.putSetting).toHaveBeenCalledWith({settingsKey: testSettingsKey, value: expectedValue });
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, {settingsKey: testSettingsKey, value: expectedValue });
                        expect(await gamificationSettingsService.getDifficulty()).not.toEqual(oldValue);
                        expect(await gamificationSettingsService.getDifficulty()).toEqual(expectedValue);
                        done();
                    });
                    it('should revert the setter if the persist call fails', async function(done: DoneFn) {
                        mockGamificationDatabaseService.putSetting.and.returnValue(Promise.reject(new Error('dexie failed transaction')));
                        const oldValue: GamificationDifficulty = defaultGamificationSettings[testSettingsKey];
                        await expectThrowsAsync(() => gamificationSettingsService.setDifficulty("easy"));
                        expect(await gamificationSettingsService.getDifficulty()).toEqual(oldValue);
                        expect($rootScope.$broadcast).not.toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME);
                        done();
                    });
                });
            });

            describe('with invalid settings loaded from gamificationDatabase', () => {
                const defaultGamificationEnabledSettings: Readonly<GamificationSettings> = {
                    pointsRecordEnabled: true,
                    pointsShowEnabled: true,
                    iconStyleName: 'bi-star',
                    difficulty: 'normal'
                } as const;

                beforeEach(() => {
                    settingsService.gamificationEnabled = true;
                    $logSpy = spyOn($log, 'error').and.callThrough();
                });

                function replaceGamificationSettingsValueForTest(settingsKey: GamificationSettingsKey, value: any) {
                    const gamificationSettings = {...defaultGamificationEnabledSettings};
                    gamificationSettings[settingsKey as string] = value as unknown as any;
                    mockGamificationDatabaseService.getSettings.and.returnValue(objectToMap(gamificationSettings));
                }

                async function assertValuesToEqualDefault() {
                    const pointsRecordEnabled = await gamificationSettingsService.isPointsRecordingEnabled();
                    expect(pointsRecordEnabled).toEqual(defaultGamificationEnabledSettings.pointsRecordEnabled);
                    const pointsDisplayEnabled = await gamificationSettingsService.isPointsDisplayEnabled();
                    expect(pointsDisplayEnabled).toEqual(defaultGamificationEnabledSettings.pointsShowEnabled);
                    const iconStyle = await gamificationSettingsService.getIconStyle();
                    expect(iconStyle.name).toEqual(defaultGamificationEnabledSettings.iconStyleName);
                    const difficulty = await gamificationSettingsService.getDifficulty();
                    expect(difficulty).toEqual(defaultGamificationEnabledSettings.difficulty);
                }

                function assertErrorMessageToBeLogged(errMsg: string) {
                    const warning = "Tried to load gamificationSettings that were not allowed. Using default instead.";
                    expect($log.error).toHaveBeenCalledTimes(1);
                    expect($logSpy.calls.mostRecent().args[0]).toEqual(warning);
                    expect($logSpy.calls.mostRecent().args[1].message).toEqual(errMsg);
                }

                async function assertInvalidSettingToLoadDefaultAndLogError(settingsKey: GamificationSettingsKey, values: any[])  {
                    const errMsg = `Value is not allowed for property ${settingsKey}`;
                    for (const value of values) {
                        it(`should log an error and use default settings for setting: ${settingsKey} when an invalid value is loaded`, async (done: DoneFn) => {
                            replaceGamificationSettingsValueForTest(settingsKey, value);
                            await assertValuesToEqualDefault();
                            assertErrorMessageToBeLogged(errMsg);
                            done();
                        });
                    }
                }

                assertInvalidSettingToLoadDefaultAndLogError('pointsRecordEnabled', ['wrong', '', null, 1, '1', undefined, Number.NaN, {}, [], ['test'], function(){}, ()=>{}]);
                assertInvalidSettingToLoadDefaultAndLogError('pointsShowEnabled', ['wrong', '', null, 1, '1', undefined, 'a', Number.NaN, {}, [], ['test'], function(){}, ()=>{}]);
                assertInvalidSettingToLoadDefaultAndLogError('iconStyleName', ['wrong', 'bi-stars', '', null, 1, '1', undefined, 'a', Number.NaN, {}, [], ['star'], function(){}, ()=>{}, true, false]);
                assertInvalidSettingToLoadDefaultAndLogError('difficulty', ['wrong', 'hardcore', '', null, 1, '1', undefined, 'a', Number.NaN, {}, [], ['hard'], function(){}, ()=>{}, true, false]);
            });
        });

    });
}
