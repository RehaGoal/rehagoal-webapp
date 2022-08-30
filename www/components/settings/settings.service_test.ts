"use strict";

import SettingsService = rehagoal.settings.SettingsService;
import FlexContentAlignment = rehagoal.settings.FlexContentAlignment;
import ExecutionViewLayout = rehagoal.settings.ExecutionViewLayout;
import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;

describe('rehagoal.settings', function () {
    beforeEach(angular.mock.module('rehagoal.settings'));

    let mockAvailableStudyReferences, mockPbkdf2: jasmine.Spy, logWarnSpy: jasmine.Spy;

    beforeEach(angular.mock.module(function ($provide: angular.auto.IProvideService) {
        mockAvailableStudyReferences = {
            "validRef": {
                studyName: "ValidStudy",
                referenceOptions: {
                    salt: "somesalt1234",
                    iterations: 12000,
                    keySize: 256
                },
                startDate: new Date("2019-01-01T00:00:01"),
                endDate: new Date("2021-12-31T23:59:59")
            },
            "validRef_sameDay": {
                studyName: "ValidStudy - edge case",
                referenceOptions: {
                    salt: "awdaw1dawd",
                    iterations: 1020,
                    keySize: 256
                },
                startDate: new Date("2019-01-02T23:59:58"),
                endDate: new Date("2021-12-31T23:59:59")
            },
            "invalidRef_sameDay": {
                studyName: "InvalidStudy - start to soon",
                referenceOptions: {
                    salt: "2awdawdawd",
                    iterations: 100000,
                    keySize: 128
                },
                startDate: new Date("2019-01-02T23:59:59"),
                endDate: new Date("2021-12-31T23:59:59"),
            },
            "invalidRef_startDate": {
                studyName: "InvalidStudy - startDate wrong",
                referenceOptions: {
                    salt: "aw3dawdawd",
                    iterations: 1234,
                    keySize: 256
                },
                startDate: new Date("2022-01-01T00:00:01"),
                endDate: new Date("2021-12-31T23:59:59")
            },
            "invalidRef_endDate": {
                studyName: "InvalidStudy - endDate wrong",
                referenceOptions: {
                    salt: "a4wdawdawd",
                    iterations: 1000,
                    keySize: 256
                },
                startDate: new Date("2019-01-01T00:00:01"),
                endDate: new Date("2018-12-31T23:59:59")
            },
            "invalidRef_endDateTime": {
                studyName: "InvalidStudy - endDate wrong2",
                referenceOptions: {
                    salt: "awdawda5wd",
                    iterations: 1000,
                    keySize: 256
                },
                startDate: new Date("2019-01-01T00:00:01"),
                endDate: new Date("2019-01-02T23:59:57")
            }

        };
        mockPbkdf2 = jasmine.createSpy("mockPbkdf2");
        $provide.value('availableStudyReferences', mockAvailableStudyReferences);
        $provide.value('pbkdf2', mockPbkdf2);
        $provide.decorator('$log', function($delegate: angular.ILogService) {
            logWarnSpy = spyOn($delegate, 'warn').and.callThrough();
            return $delegate;
        });
    }));

    beforeAll(function() {
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date("2019-01-02T23:59:58"));
    });

    afterAll(function () {
        jasmine.clock().uninstall();
    });

    describe('settings service', function() {
        const settingsKey = 'rehagoalSettings';
        let webStorage: IAngularWebStorageService;

        beforeEach(angular.mock.inject(function(_webStorage_: IAngularWebStorageService) {
            webStorage = _webStorage_;
            webStorage.clear();
        }));

        describe('constructor', function() {
            it('should load settings', function() {
                let settingsService: SettingsService;
                spyOn(webStorage, 'has').and.returnValue(true);
                spyOn(webStorage, 'get').and.returnValue({
                    studyModeEnabled: false,
                    ttsEnabled: true
                });
                angular.mock.inject(function(_settingsService_: SettingsService) {
                    settingsService = _settingsService_;
                });
                expect(webStorage.has).toHaveBeenCalledWith(settingsKey);
                expect(webStorage.get).toHaveBeenCalledWith(settingsKey);
                expect(settingsService!.ttsEnabled).toBe(true);
                expect(settingsService!.studyModeEnabled).toBe(false);
            });
        });

        describe('functional behaviour', function() {
            let settingsService: SettingsService;

            beforeEach(angular.mock.inject(function(_settingsService_: SettingsService) {
                settingsService = _settingsService_;
            }));

            describe('method loadSettings', function() {
                it('should load settings from webStorage', function() {
                    expect(settingsService.executionViewLayout).toBe('default');
                    expect(settingsService.executionViewFlexContentAlignment).toBe('left');
                    expect(settingsService.ttsEnabled).toBe(false);
                    expect(settingsService.imageResizeEnabled).toBe(true);
                    expect(settingsService.studyModeEnabled).toBe(false);
                    expect(settingsService.wearCompanionEnabled).toBe(false);
                    expect(settingsService.bluetoothCompanionEnabled).toBe(false);
                    expect(settingsService.pgpUserPrivateKey).toBeNull();
                    expect(settingsService.pgpUserPublicKey).toBeNull();
                    expect(settingsService.userPseudonym).toBeNull();
                    expect(settingsService.gamificationEnabled).toBe(false);
                    spyOn(webStorage, 'has').and.returnValue(true);
                    spyOn(webStorage, 'get').and.returnValue({
                        ttsEnabled: true,
                        imageResizeEnabled: false,
                        studyModeEnabled: false,
                        executionViewLayout: 'flex',
                        executionViewFlexContentAlignment: 'right',
                        wearCompanionEnabled: true,
                        bluetoothCompanionEnabled: true,
                        userPseudonym: 'pseudonym',
                        pgpUserPrivateKey: 'privKey1',
                        pgpUserPublicKey: 'pubKey2',
                        gamificationEnabled: true
                    });
                    settingsService.loadSettings();
                    expect(settingsService.ttsEnabled).toBe(true);
                    expect(settingsService.ttsSpeed).toBe(3);
                    expect(settingsService.imageResizeEnabled).toBe(false);
                    expect(settingsService.studyModeEnabled).toBe(false);
                    expect(settingsService.executionViewLayout).toBe('flex');
                    expect(settingsService.executionViewFlexContentAlignment).toBe('right');
                    expect(settingsService.wearCompanionEnabled).toBe(true);
                    expect(settingsService.bluetoothCompanionEnabled).toBe(true);
                    expect(settingsService.pgpUserPrivateKey).toBe('privKey1');
                    expect(settingsService.pgpUserPublicKey).toBe('pubKey2');
                    expect(settingsService.userPseudonym).toBe('pseudonym');
                    expect(settingsService.calendarStaticPostponeDelay).toBe(rehagoal.utilities.MINUTE_IN_MILLISECONDS);
                    expect(settingsService.gamificationEnabled).toBe(true);
                    expect(webStorage.has).toHaveBeenCalledWith(settingsKey);
                    expect(webStorage.get).toHaveBeenCalledWith(settingsKey);
                });
                it('should not load settings from webStorage, which are not defined in the class', function() {
                    expect(settingsService.ttsEnabled).toBe(false);
                    spyOn(webStorage, 'has').and.returnValue(true);
                    (settingsService as any).notARealSetting = true;
                    spyOn(webStorage, 'get').and.returnValue({
                        ttsEnabled: true,
                        loadSettings: null,
                        toString: "some string",
                        hasOwnProperty: function() {return true;},
                        someUndefinedSetting: "myValue",
                        notARealSetting: false
                    });
                    settingsService.loadSettings();
                    expect(settingsService.ttsEnabled).toBe(true);
                    expect(webStorage.has).toHaveBeenCalledWith(settingsKey);
                    expect(webStorage.get).toHaveBeenCalledWith(settingsKey);
                    expect(settingsService.loadSettings).not.toBe(null);
                    expect(settingsService.toString).not.toEqual("someString");
                    expect(settingsService.hasOwnProperty("toString")).not.toBe(true);
                    expect((settingsService as any).someUndefinedSetting).toBeUndefined();
                    expect((settingsService as any).notARealSetting).toBe(true);
                });
                it('should force studyModeEnabled disabled if studyReferenceKey is invalid during load settings from webStorage', function() {
                    expect(settingsService.studyModeEnabled).toBe(false);
                    spyOn(webStorage, 'has').and.returnValue(true);
                    spyOn(webStorage, 'get').and.returnValue({
                        studyReferenceKey: "invalidRef_sameDay",
                        studyModeEnabled: true
                    });
                    settingsService.loadSettings();
                    expect(settingsService.studyModeEnabled).toBe(false);
                    expect(webStorage.has).toHaveBeenCalledWith(settingsKey);
                    expect(webStorage.get).toHaveBeenCalledWith(settingsKey);
                });
                it('should enable studyModeEnabled if studyReferenceKey is valid during load settings from webStorage', function() {
                    expect(settingsService.studyModeEnabled).toBe(false);
                    spyOn(webStorage, 'has').and.returnValue(true);
                    spyOn(webStorage, 'get').and.returnValue({
                        studyReferenceKey: "validRef_sameDay",
                        studyModeEnabled: true
                    });
                    settingsService.loadSettings();
                    expect(settingsService.studyModeEnabled).toBe(true);
                    expect(webStorage.has).toHaveBeenCalledWith(settingsKey);
                    expect(webStorage.get).toHaveBeenCalledWith(settingsKey);
                });
            });
            describe('method saveSettings', function() {
                it('should save settings to webStorage', function() {
                    expect(settingsService.ttsEnabled).toBe(false);
                    expect(settingsService.imageResizeEnabled).toBe(true);
                    spyOn(settingsService, 'saveSettings').and.callThrough();
                    spyOn(webStorage, 'set');
                    settingsService.studyModeEnabled = true;
                    settingsService.studyReferenceKey = "";
                    (settingsService as any).notARealSetting = true;
                    settingsService.ttsEnabled = true;
                    settingsService.changeSpeechSpeeds(3);
                    settingsService.imageResizeEnabled = false;
                    expect(settingsService.saveSettings).not.toHaveBeenCalled();
                    settingsService.saveSettings();
                    expect(webStorage.set).toHaveBeenCalledWith(settingsKey, {
                        studyModeEnabled: false,
                        studyReferenceKey: "",
                        ttsEnabled: true,
                        wearCompanionEnabled: false,
                        ttsSpeed: 3,
                        imageResizeEnabled: false,
                        calendarStaticPostponeDelay: 60000,
                        bluetoothCompanionEnabled: false,
                        executionViewFlexContentAlignment: 'left',
                        executionViewLayout: 'default',
                        pgpUserPrivateKey: null,
                        pgpUserPublicKey: null,
                        userPseudonym: null,
                        gamificationEnabled: false
                    });
                    settingsService.ttsEnabled = false;
                    settingsService.imageResizeEnabled = true;
                    settingsService.studyModeEnabled = false;
                    settingsService.executionViewFlexContentAlignment = 'right';
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    settingsService.saveSettings();
                    expect(webStorage.set).toHaveBeenCalledWith(settingsKey, {
                        studyModeEnabled: false,
                        studyReferenceKey: "",
                        ttsEnabled: false,
                        ttsSpeed: 3,
                        imageResizeEnabled: true,
                        calendarStaticPostponeDelay: 60000,
                        wearCompanionEnabled: false,
                        bluetoothCompanionEnabled: false,
                        executionViewFlexContentAlignment: 'right',
                        executionViewLayout: 'default',
                        pgpUserPrivateKey: null,
                        pgpUserPublicKey: null,
                        userPseudonym: null,
                        gamificationEnabled: false
                    });
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    settingsService.studyModeEnabled = true;
                    settingsService.studyReferenceKey = "validRef";
                    settingsService.saveSettings();
                    expect(webStorage.set).toHaveBeenCalledWith(settingsKey, {
                        studyModeEnabled: true,
                        studyReferenceKey: "validRef",
                        ttsEnabled: false,
                        ttsSpeed: 3,
                        imageResizeEnabled: true,
                        calendarStaticPostponeDelay: 60000,
                        wearCompanionEnabled: false,
                        bluetoothCompanionEnabled: false,
                        executionViewFlexContentAlignment: 'right',
                        executionViewLayout: 'default',
                        pgpUserPrivateKey: null,
                        pgpUserPublicKey: null,
                        userPseudonym: null,
                        gamificationEnabled: false
                    });
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(3);
                });
            });
            describe('getters', function() {
                describe('isStudyInitialized', function() {
                    beforeEach(function () {
                        settingsService.pgpUserPrivateKey = 'someKey';
                        settingsService.pgpUserPublicKey = 'someOtherKey';
                        settingsService.userPseudonym = 'somePseudonym';
                    });
                    it('should return false if pgpUserPrivateKey is null', function() {
                        settingsService.pgpUserPrivateKey = null;
                        expect(settingsService.isStudyInitialized()).toBe(false);
                    });
                    it('should return false if pgpUserPublicKey is null', function() {
                        settingsService.pgpUserPublicKey = null;
                        expect(settingsService.isStudyInitialized()).toBe(false);
                    });
                    it('should return false if userPseudonym is null', function() {
                        settingsService.userPseudonym = null;
                        expect(settingsService.isStudyInitialized()).toBe(false);
                    });
                    it('should return true if pgpUserPublicKey, pgpUserPrivateKey and userPseudonym are not null', function() {
                        expect(settingsService.isStudyInitialized()).toBe(true);
                    });
                });
                describe("image resizing values", function() {
                    const IMAGE_MAX_WIDTH = 1280;
                    const IMAGE_MAX_HEIGHT = 720;
                    const IMAGE_MAX_FILE_SIZE = 2 * 1000 * 1000;

                    it('should have method "imageResizeMaxWidth"', function () {
                        expect(settingsService.imageResizeMaxWidth).toBeDefined();
                    });
                    it('"imageResizeMaxWidth" should return 1280', function () {
                        expect(settingsService.imageResizeMaxWidth).toBe(IMAGE_MAX_WIDTH);
                    });
                    it('should have method "imageResizeMaxHeight"', function () {
                        expect(settingsService.imageResizeMaxHeight).toBeDefined();
                    });
                    it('"imageResizeMaxHeight" should return 720', function () {
                        expect(settingsService.imageResizeMaxHeight).toBe(IMAGE_MAX_HEIGHT);
                    });
                    it('should have method "imageResizeMaxFileSize"', function () {
                        expect(settingsService.imageResizeMaxFileSize).toBeDefined();
                    });
                    it('"imageResizeMaxFileSize" should return 2MB', function () {
                        expect(settingsService.imageResizeMaxFileSize).toBe(IMAGE_MAX_FILE_SIZE);
                    });
                });
            });
            describe('setting validation', function() {
                var errorRegex = /not allowed/;
                it('should only allow "left" or "right" for flexContentAlignment', function() {
                    settingsService.executionViewFlexContentAlignment = 'left';
                    settingsService.executionViewFlexContentAlignment = 'right';
                    expect(function() {settingsService.executionViewFlexContentAlignment = 'left1' as FlexContentAlignment;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewFlexContentAlignment = 'middle' as FlexContentAlignment;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewFlexContentAlignment = 'something' as FlexContentAlignment;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewFlexContentAlignment = null as any as FlexContentAlignment;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewFlexContentAlignment = undefined as any as FlexContentAlignment;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewFlexContentAlignment = 1 as any as FlexContentAlignment;}).toThrowError(errorRegex);
                });
                it('should only allow "default" or "flex" for executionViewLayout', function() {
                    settingsService.executionViewLayout = 'default';
                    settingsService.executionViewLayout = 'flex';
                    expect(function() {settingsService.executionViewLayout = 'flex2' as ExecutionViewLayout;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewLayout = 'something' as ExecutionViewLayout;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewLayout = null as any as ExecutionViewLayout;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewLayout = undefined as any as ExecutionViewLayout;}).toThrowError(errorRegex);
                    expect(function() {settingsService.executionViewLayout = 1 as any as ExecutionViewLayout;}).toThrowError(errorRegex);
                });
                it('should allow setting studyModeEnabled to be true, if a valid studyReferenceKey is set', function() {
                    const references = ["validRef", "validRef_sameDay"];
                    for (let ref of references) {
                        settingsService.studyReferenceKey = ref;
                        settingsService.studyModeEnabled = true;
                        since(`Reference: ${ref} should enable studyModeEnabled flag`).expect(settingsService.studyModeEnabled).toBeTruthy();
                    }
                });
                it('getSelectedStudyName should return the name of the selected study with valid study reference', function () {
                    settingsService.studyReferenceKey = "validRef";
                    expect(settingsService.getSelectedStudyName()).toEqual('ValidStudy');
                });
                it('getStudyName should return an array containing all availabe study names', function () {
                    const mockStudyNames = [
                        "ValidStudy",
                        "ValidStudy - edge case",
                        "InvalidStudy - start to soon",
                        "InvalidStudy - startDate wrong",
                        "InvalidStudy - endDate wrong",
                        "InvalidStudy - endDate wrong2"
                    ];
                    expect(settingsService.getStudyNames()).toEqual(mockStudyNames);
                });
                it('should validate study mode when enableStudyModeForReference is called', async function (done) {
                    spyOn(settingsService, 'saveSettings').and.callThrough();
                    // with no reference
                    await expectThrowsAsync(async () => {
                        await settingsService.enableStudyModeForReference(undefined as any, undefined as any);
                    }, /Study with the name undefined does not exist/);
                    expect(mockPbkdf2).not.toHaveBeenCalled();
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(0);
                    expect(settingsService.studyModeEnabled).toBeFalsy();

                    // with valid reference:
                    mockPbkdf2.and.returnValue("validRef");
                    await tryOrFailAsync(async () => {
                        await settingsService.enableStudyModeForReference("ValidStudy", "some input");
                    });
                    expect(mockPbkdf2).toHaveBeenCalledWith("some input", "somesalt1234", 12000, 256);
                    expect(mockPbkdf2).toHaveBeenCalledTimes(1);
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.studyModeEnabled).toBeTruthy();

                    // with invalid reference:
                    mockPbkdf2.and.returnValue("invalidRef_sameDay");
                    await expectThrowsAsync(async () => {
                        await settingsService.enableStudyModeForReference("InvalidStudy - start to soon", "some other input");
                    }, /Maybe the study is already expired or not yet started?/);
                    expect(mockPbkdf2.calls.mostRecent().args).toEqual(["some other input", "2awdawdawd", 100000, 128]);
                    expect(mockPbkdf2).toHaveBeenCalledTimes(2);
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.studyModeEnabled).toBeFalsy();

                    // with valid reference, invalid password:
                    mockPbkdf2.and.returnValue("adsfasfdinvalidpassword");
                    await expectThrowsAsync(async () => {
                        await settingsService.enableStudyModeForReference("ValidStudy", "invalid password");
                    }, /Entered key is not valid/);
                    expect(mockPbkdf2.calls.mostRecent().args).toEqual(["invalid password", "somesalt1234", 12000, 256]);
                    expect(mockPbkdf2).toHaveBeenCalledTimes(3);
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.studyModeEnabled).toBeFalsy();

                    done();
                });

                it('should call pbkdf2 with correct parameters when enableStudyModeForReference is called', async function() {
                    const references = ["validRef", "validRef_sameDay", "invalidRef_sameDay", "invalidRef_startDate", "invalidRef_endDate", "invalidRef_endDateTime"];
                    const studyNames = ["ValidStudy", "ValidStudy - edge case", "InvalidStudy - start to soon", "InvalidStudy - startDate wrong", "InvalidStudy - endDate wrong", "InvalidStudy - endDate wrong2"];
                    const salts = ["somesalt1234", "awdaw1dawd", "2awdawdawd", "aw3dawdawd", "a4wdawdawd", "awdawda5wd"];
                    const num_iterations = [12000, 1020, 100000, 1234, 1000, 1000];
                    const key_sizes = [256, 256, 128, 256, 256, 256];
                    const referenceTexts = ["test1", "2", "another", "value", "password", "last"];
                    expect(studyNames.length).toEqual(references.length);
                    expect(salts.length).toEqual(references.length);
                    expect(num_iterations.length).toEqual(references.length);
                    expect(key_sizes.length).toEqual(references.length);
                    expect(referenceTexts.length).toEqual(references.length);
                    mockPbkdf2.and.returnValues(...references);

                    async function enableStudyModeForReferenceWithDateError(studyName: string, referenceText: string) {
                        await expectThrowsAsync(async () => {
                            await settingsService.enableStudyModeForReference(studyName, referenceText)
                        }, /Maybe the study is already expired or not yet started?/);
                    }

                    for (let i = 0; i < references.length; ++i) {
                        if (i < 2) {
                            await settingsService.enableStudyModeForReference(studyNames[i], referenceTexts[i]);
                        } else {
                            await enableStudyModeForReferenceWithDateError(studyNames[i], referenceTexts[i]);
                        }
                        expect(mockPbkdf2.calls.mostRecent().args).toEqual([referenceTexts[i], salts[i], num_iterations[i], key_sizes[i]]);
                    }
                });

                describe("should not allow studyModeEnabled to be set to true, if no valid studyReferenceKey is set (saveSettings)", function () {
                    function testReferenceKey(referenceKey: string, expectedWarning: string) {
                        settingsService.studyReferenceKey = referenceKey;
                        settingsService.studyModeEnabled = true;
                        settingsService.saveSettings();
                        since(`Reference: ${referenceKey} should not enable studyModeEnabled flag`).expect(settingsService.studyModeEnabled).toBeFalsy();
                        expect(logWarnSpy.calls.mostRecent().args).toEqual([expectedWarning]);
                    }

                    it('with no reference', function () {
                        testReferenceKey("", `Disabling study mode. Reason: Study reference not found: `);
                    });
                    it('with wrong dates', function () {
                        const references = ["invalidRef_sameDay", "invalidRef_startDate", "invalidRef_endDate", "invalidRef_endDateTime"];
                        const studyNames = ["InvalidStudy - start to soon", "InvalidStudy - startDate wrong", "InvalidStudy - endDate wrong", "InvalidStudy - endDate wrong2"];
                        expect(studyNames.length).toEqual(references.length);
                        for (let i = 0; i < references.length; ++i) {
                            const ref = references[i];
                            const studyName = studyNames[i];
                            testReferenceKey(ref, `Disabling study mode. Reason: Referenced study ${studyName} is not available at the current date!`);
                        }
                    });
                });
            });
        });
    });
});
