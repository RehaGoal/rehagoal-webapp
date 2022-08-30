module rehagoal.settingsView {
    import SettingsService = rehagoal.settings.SettingsService;
    import TTSService = rehagoal.tts.TTSService;
    import StudyExportService = rehagoal.exchange.StudyExportService;
    import DownloadService = rehagoal.exchange.DownloadService;
    import PGPCryptoService = rehagoal.crypto.PGPCryptoService;
    import readFileAsTextFunc = rehagoal.utilities.readFileAsTextFunc;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import getWebNotificationPermissionStateType = rehagoal.utilities.getWebNotificationPermissionStateFunc;
    import IAngularWebNotification = angularWebNotification.IAngularWebNotification;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;

    describe('SettingsView tests', function() {
        let settingsService: SettingsService, ttsService: TTSService, studyExportService: StudyExportService, downloadService: DownloadService;
        let $componentController: angular.IComponentControllerService, $log: angular.ILogService, $rootScope: angular.IRootScopeService;
        let $timeout: angular.ITimeoutService;
        let mockNavigator: {userAgent: string}, mockPGPCryptoService: Partial<PGPCryptoService>;
        let readFileAsText: readFileAsTextFunc;
        let getWebNotificationPermissionStateSpy: jasmine.Spy;
        let webNotification: IAngularWebNotification;
        let showNotificationSpy: jasmine.Spy;

        beforeEach(() => angular.mock.module('rehagoal.tts'));
        beforeEach(() => angular.mock.module('rehagoal.templates'));

        beforeEach(() => angular.mock.module('rehagoal.settingsView', function ($provide: angular.auto.IProvideService) {
            mockNavigator = {
                userAgent: "Safari"
            };
            mockPGPCryptoService = {
                signAndEncryptForStudyOperator: function(options: {plaintext: string, userPassphrase: string, streamed: false}) {return Promise.reject();}
            };
            $provide.value('navigatorService', mockNavigator);
            $provide.value('pgpCryptoService', mockPGPCryptoService);
            $provide.decorator('getWebNotificationPermissionState', function($delegate: getWebNotificationPermissionStateType) {
                getWebNotificationPermissionStateSpy = jasmine.createSpy('getWebNotificationPermissionState', $delegate).and.callThrough();
                return getWebNotificationPermissionStateSpy;
            });
        }));

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _settingsService_: SettingsService,
                                    _ttsService_: TTSService,
                                    _studyExportService_: StudyExportService,
                                    _downloadService_: DownloadService,
                                    _$log_: angular.ILogService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _$timeout_: angular.ITimeoutService,
                                    _readFileAsText_: readFileAsTextFunc,
                                    _webNotification_: IAngularWebNotification)  {
            $componentController = _$componentController_;
            settingsService =  _settingsService_;
            ttsService = _ttsService_;
            studyExportService = _studyExportService_;
            downloadService = _downloadService_;
            $log = _$log_;
            $rootScope = _$rootScope_;
            $timeout = _$timeout_;
            readFileAsText = _readFileAsText_;
            webNotification = _webNotification_;
            showNotificationSpy = spyOn(webNotification, "showNotification").and.callThrough();
        }));

        afterEach(function () {
            $log.info.logs.forEach(function (x) {
                console.info(x);
            });
        });
        describe('settingsView controller', function() {
            let bindings: {}, $scope: angular.IScope, settingsViewCtrl: SettingsView;

            beforeEach(function () {
                bindings = {};
                $scope = $rootScope.$new();
                settingsViewCtrl = $componentController('settingsView', {$scope: $scope}, bindings);
            });

            describe('properties and methods', function () {
                it('controller should be defined', inject(function () {
                    expect(settingsViewCtrl).toBeDefined();
                }));
                it('should have correct route', inject(function ($route: ng.route.IRouteService) {
                    expect($route.routes['/settings'].template).toEqual('<settings-view></settings-view>');
                }));
                it('should have a property called ttsEnabled', function () {
                    expect(settingsViewCtrl.ttsEnabled).toBeDefined();
                });
                it('should have a property called ttsSpeed', function () {
                    expect(settingsViewCtrl.ttsSpeed).toBeDefined();
                });
                it('should have a property called webNotificationsState', function() {
                    expect(settingsViewCtrl.webNotificationsState).toBeDefined();
                });
                it('should have a method called requestWebNotificationPermissions', function() {
                    expect(settingsViewCtrl.requestWebNotificationPermissions).toBeDefined();
                })
                it('should have a property called wearCompanionEnabled', function () {
                    expect(settingsViewCtrl.wearCompanionEnabled).toBeDefined();
                });
                it('should have a property called bluetoothCompanionEnabled', function () {
                    expect(settingsViewCtrl.bluetoothCompanionEnabled).toBeDefined();
                });
                it('should have a property called executionViewLayout', function() {
                    expect(settingsViewCtrl.executionViewLayout).toBeDefined();
                });
                it('should have a property called executionViewFlexContentAlignment', function() {
                    expect(settingsViewCtrl.executionViewFlexContentAlignment).toBeDefined();
                });
                it('should have a method called audioSample', function () {
                    expect(settingsViewCtrl.audioSample).toBeDefined();
                });
                it('should have a property called calendarStaticPostponeDelay', function() {
                    expect(settingsViewCtrl.calendarStaticPostponeDelay).toBeDefined();
                });
                it('should have a property called calendarStaticPostponeDelayOptions', function() {
                    expect(settingsViewCtrl.calendarStaticPostponeDelayOptions).toBeDefined();
                });
                it('should have a property called exportInProgress', function() {
                    expect(settingsViewCtrl.exportInProgress).toBeDefined();
                });
                it('should have a property called studyModeEnabled', function() {
                    expect(settingsViewCtrl.studyModeEnabled).toBeDefined();
                });
                it('should have a method called isStudyInitializing', function() {
                    expect(settingsViewCtrl.isStudyInitializing).toBeDefined();
                });
                it('should have a property called studyInitialized', function() {
                    expect(settingsViewCtrl.studyInitialized).toBeDefined();
                });
                it('should have a property called pseudonym', function() {
                    expect(settingsViewCtrl.pseudonym).toBeDefined();
                });
                it('should have a property called downloadUrl', function() {
                    expect(settingsViewCtrl.downloadUrl).toBeDefined();
                });
                it('should have a property called studyReferenceKey', function() {
                    expect(settingsViewCtrl.studyReferenceKey).toBeDefined();
                });
                it('should have a property called studyNameSelected', function() {
                    expect(settingsViewCtrl.studyNameSelected).toBeDefined();
                });
                it('should have a property called studyNames', function() {
                    expect(settingsViewCtrl.studyNames).toBeDefined();
                });
                it('should have a method called initStudyReference', function() {
                    expect(settingsViewCtrl.initStudyReference).toBeDefined();
                });
                it('should have method "imageResizeMaxWidth"', function () {
                    expect(settingsViewCtrl.imageResizeMaxWidth).toBeDefined();
                });
                it('should have method "imageResizeMaxHeight"', function () {
                    expect(settingsViewCtrl.imageResizeMaxHeight).toBeDefined();
                });
                it('should have method "imageResizeMaxFileSize"', function () {
                    expect(settingsViewCtrl.imageResizeMaxFileSize).toBeDefined();
                });
                it('should have a property called gamificationEnabled', function () {
                    expect(settingsViewCtrl.gamificationEnabled).toBeDefined();
                });
            });

            describe('behaviour', function() {
                beforeEach(function () {
                    spyOn(settingsService, 'saveSettings').and.callThrough();
                });
                it('should call settingsService.saveSettings if ttsEnabled is changed', function() {
                    settingsViewCtrl.ttsEnabled = true;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.ttsEnabled).toBe(true);
                    settingsViewCtrl.ttsEnabled = false;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.ttsEnabled).toBe(false);
                });
                it('should call settingsService.changeSpeechSpeeds if ttsSpeed is changed', function() {
                    spyOn(settingsService, 'changeSpeechSpeeds').and.callThrough();
                    settingsViewCtrl.ttsSpeed = 3;
                    expect(settingsService.changeSpeechSpeeds).toHaveBeenCalled();
                });
                it('should call settingsService.saveSettings if wearCompanionEnabled is changed', function() {
                    settingsViewCtrl.wearCompanionEnabled = true;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.wearCompanionEnabled).toBe(true);
                    settingsViewCtrl.wearCompanionEnabled = false;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.wearCompanionEnabled).toBe(false);
                });
                it('should call settingsService.saveSettings if bluetoothCompanionEnabled is changed', function() {
                    settingsViewCtrl.bluetoothCompanionEnabled = true;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.bluetoothCompanionEnabled).toBe(true);
                    settingsViewCtrl.bluetoothCompanionEnabled = false;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.bluetoothCompanionEnabled).toBe(false);
                });
                it('should call settingsService.saveSettings if flexContentAlignment is changed', function() {
                    settingsViewCtrl.executionViewFlexContentAlignment = 'right';
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.executionViewFlexContentAlignment).toBe('right');
                    settingsViewCtrl.executionViewFlexContentAlignment = 'left';
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.executionViewFlexContentAlignment).toBe('left');
                });
                it('should call settingsService.saveSettings if executionViewLayout is changed', function() {
                    settingsViewCtrl.executionViewLayout = 'flex';
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.executionViewLayout).toBe('flex');
                    settingsViewCtrl.executionViewLayout = 'default';
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.executionViewLayout).toBe('default');
                });
                it('should call settingsService.saveSettings if calendarStaticPostponeDelay is changed', function() {
                    settingsViewCtrl.calendarStaticPostponeDelay = 100 * 60 * 1000;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.calendarStaticPostponeDelay).toBe(100 * 60 * 1000);
                });
                it('should call ttsService.speak if audioSample is called', function() {
                    spyOn(ttsService, 'speak').and.callThrough();
                    settingsViewCtrl.audioSample();
                    expect(ttsService.speak).toHaveBeenCalled();
                });
                it('webNotificationsState should return permission state from getWebNotificationPermissionState', function() {
                    expect(getWebNotificationPermissionStateSpy).toHaveBeenCalledTimes(0);
                    getWebNotificationPermissionStateSpy.and.returnValues("default", "granted");
                    expect(settingsViewCtrl.webNotificationsState).toBe("default");
                    expect(settingsViewCtrl.webNotificationsState).toBe("granted");
                    expect(getWebNotificationPermissionStateSpy).toHaveBeenCalledTimes(2);
                });
                it('requestWebNotificationPermissions should show a notification in order to request permissions', function() {
                    const applyAsyncSpy = spyOn($scope, "$applyAsync");
                    expect(showNotificationSpy).toHaveBeenCalledTimes(0);
                    settingsViewCtrl.requestWebNotificationPermissions();
                    expect(showNotificationSpy).toHaveBeenCalledTimes(1);
                    expect(showNotificationSpy).toHaveBeenCalledWith(
                        "RehaGoal: Web Notifications aktiviert!",
                        {
                            body: "Web Notifications können jetzt verwendet werden.",
                            icon: "xxhdpi-icon.png"
                        },
                        jasmine.any(Function)
                    );
                    const callback = showNotificationSpy.calls.argsFor(0)[2];
                    expect(applyAsyncSpy).not.toHaveBeenCalled();
                    callback();
                    expect(applyAsyncSpy).toHaveBeenCalledTimes(1);
                });
                it('should call settingsService.saveSettings if imageResizeEnabled is changed', function() {
                    settingsViewCtrl.imageResizeEnabled = true;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.imageResizeEnabled).toBe(true);
                    settingsViewCtrl.imageResizeEnabled = false;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.imageResizeEnabled).toBe(false);
                });
                it('should export using studyExportService and downloadService if exportStudyData is called', async function (done) {
                    const testBlob = new Blob(["exportTestSuccessful"]);
                    const mockDownloadUrl1 = 'object-download-url1';
                    const mockDownloadUrl2 = 'object-download-url2';
                    settingsService.userPseudonym = 'myPseudonym1';
                    spyOn(studyExportService, 'exportAsBlob').and.returnValue(Promise.resolve(testBlob));
                    spyOn(downloadService, 'downloadFile').and.returnValues(Promise.resolve(mockDownloadUrl1), Promise.resolve(mockDownloadUrl2));
                    spyOn(downloadService, 'revokeDownloadURL');

                    await settingsViewCtrl.exportStudyData();
                    expect(downloadService.revokeDownloadURL).not.toHaveBeenCalled();
                    expect(studyExportService.exportAsBlob).toHaveBeenCalledTimes(1);
                    expect(downloadService.downloadFile).toHaveBeenCalledWith(testBlob, 'studyExport-myPseudonym1.pgp', jasmine.any(Function));
                    expect(settingsViewCtrl.downloadUrl).toEqual(mockDownloadUrl1);
                    expect(settingsViewCtrl.studyErrorMessage).toBe("");
                    expect(settingsViewCtrl.exportInProgress).toBe(false);

                    await settingsViewCtrl.exportStudyData();
                    expect(downloadService.revokeDownloadURL).toHaveBeenCalledWith(mockDownloadUrl1);
                    expect(studyExportService.exportAsBlob).toHaveBeenCalledTimes(2);
                    expect(downloadService.downloadFile).toHaveBeenCalledTimes(2);
                    expect(settingsViewCtrl.downloadUrl).toEqual(mockDownloadUrl2);
                    expect(settingsViewCtrl.studyErrorMessage).toBe("");
                    expect(settingsViewCtrl.exportInProgress).toBe(false);
                    done();
                });
                it('should handle errors during studyExport', async function (done) {
                    spyOn(studyExportService, 'exportAsBlob').and.returnValue(Promise.reject(new Error('mock error')));
                    await settingsViewCtrl.exportStudyData();
                    expect(settingsViewCtrl.studyErrorMessage).toEqual('mock error');
                    expect(settingsViewCtrl.exportInProgress).toBe(false);
                    done();
                });
                it('should set exportInProgress = true during studyExport', async function(done) {
                    let resolve: () => void;
                    spyOn(studyExportService, 'exportAsBlob').and.returnValue(new Promise<void>((_resolve) => {
                        resolve = _resolve;
                    }));
                    spyOn(downloadService, 'downloadFile');
                    let promise = settingsViewCtrl.exportStudyData();
                    expect(settingsViewCtrl.exportInProgress).toBe(true);
                    resolve!();
                    await promise;
                    expect(settingsViewCtrl.exportInProgress).toBe(false);
                    done();

                });
                it('should revoke download URL in $onDestroy', async function(done) {
                    const mockUrl = 'mockUrl';
                    spyOn(downloadService, 'downloadFile').and.returnValue(Promise.resolve(mockUrl));
                    spyOn(downloadService, 'revokeDownloadURL');
                    spyOn(studyExportService, 'exportAsBlob').and.returnValue(Promise.resolve());
                    await settingsViewCtrl.exportStudyData();
                    expect(downloadService.revokeDownloadURL).not.toHaveBeenCalled();
                    settingsViewCtrl.$onDestroy();
                    expect(downloadService.revokeDownloadURL).toHaveBeenCalledWith(mockUrl);
                    done();
                });
                it('should pass an input with a selected study to settingsService if initStudyReference is called', function() {
                    spyOn(settingsService, 'enableStudyModeForReference');
                    const refValue: string = "a ref key";
                    const nameValue: string = "a name";
                    settingsViewCtrl.studyReferenceKey = "";
                    settingsViewCtrl.studyNameSelected = "";
                    settingsViewCtrl.initStudyReference();
                    $timeout.verifyNoPendingTasks();
                    expect(settingsService.enableStudyModeForReference).not.toHaveBeenCalled();

                    settingsViewCtrl.studyReferenceKey = refValue;
                    settingsViewCtrl.studyNameSelected = nameValue;
                    settingsViewCtrl.initStudyReference();
                    $timeout.flush();
                    expect(settingsService.enableStudyModeForReference).toHaveBeenCalledTimes(1);
                    expect(settingsService.enableStudyModeForReference).toHaveBeenCalledWith(nameValue, refValue);
                });
                it('should call settingsService.saveSettings if gamificationEnabled is changed', function() {
                    settingsViewCtrl.gamificationEnabled = true;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                    expect(settingsService.gamificationEnabled).toBe(true);
                    settingsViewCtrl.gamificationEnabled = false;
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(2);
                    expect(settingsService.gamificationEnabled).toBe(false);
                });

                describe('study initialization', function() {
                    let initStudyMock: jasmine.Spy;
                    beforeEach(function () {
                        initStudyMock = spyOn(studyExportService, 'initStudy');
                        spyOn($scope, '$applyAsync').and.callThrough();
                    });
                    it('should skip if password length < 8', function() {
                        settingsViewCtrl.studyPassword = '12345';
                        settingsViewCtrl.studyPasswordRepeat = '12345';
                        settingsViewCtrl.initStudy();
                        expect(studyExportService.initStudy).not.toHaveBeenCalled();
                    });
                    it('should skip if passwords do not match', function() {
                        settingsViewCtrl.studyPassword = '12345678';
                        settingsViewCtrl.studyPasswordRepeat = '12349678';
                        settingsViewCtrl.initStudy();
                        expect(studyExportService.initStudy).not.toHaveBeenCalled();
                    });
                    it('should initialize study if conditions are met', async function(done) {
                        let resolve: () => void;
                        initStudyMock.and.returnValue(new Promise<void>((_resolve) => {
                            resolve = _resolve;
                        }));
                        const studyPassword = '12345678p4$$';
                        settingsViewCtrl.studyPassword = studyPassword;
                        settingsViewCtrl.studyPasswordRepeat = studyPassword;
                        expect(settingsViewCtrl.studyInitialized).toBe(false);
                        expect(settingsViewCtrl.isStudyInitializing()).toBe(false);
                        let promise = settingsViewCtrl.initStudy();
                        expect(settingsViewCtrl.isStudyInitializing()).toBe(true);
                        expect(settingsViewCtrl.studyInitialized).toBe(false);
                        expect(studyExportService.initStudy).toHaveBeenCalledWith(studyPassword);
                        expect(settingsService.saveSettings).not.toHaveBeenCalled();
                        resolve!();
                        await promise;
                        expect(settingsViewCtrl.isStudyInitializing()).toBe(false);
                        expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                        expect(settingsViewCtrl.studyPassword).toBe("");
                        expect(settingsViewCtrl.studyPasswordRepeat).toBe("");
                        expect($scope.$applyAsync).toHaveBeenCalled();
                        done();
                    });
                });

                describe('exportPublicKey', function() {
                    let downloadFileSpy: jasmine.Spy;
                    beforeEach(() => {
                        downloadFileSpy = spyOn(downloadService, 'downloadFile');
                    })
                    it('should throw an error if there is no public key to export', function() {
                        settingsService.pgpUserPublicKey = null;
                        expectThrowsAsync(async () => settingsViewCtrl.exportPublicKey(), 'Public key is not set!');
                        expect(downloadService.downloadFile).not.toHaveBeenCalled();
                    });
                    it('should download public key if it is set', async function(done) {
                        const keyData = 'myPublicKey';
                        const mockPseudonym = 'mockPseudonym';
                        const expectedBlob = new Blob([keyData]);
                        tryOrFailAsync(async () => {
                            settingsService.pgpUserPublicKey = keyData;
                            settingsService.userPseudonym = mockPseudonym;
                            settingsViewCtrl.exportPublicKey();
                            expect(downloadService.downloadFile).toHaveBeenCalledWith(expectedBlob, `publicKey-${mockPseudonym}.asc`);
                            const actualContent = await readFileAsText(downloadFileSpy.calls.mostRecent().args[0]);
                            expect(actualContent).toBe(keyData);
                        });
                        done();
                    });
                });
            });


            describe('version information display properties', function() {
                it('should have a property called gitBranchInfo', function () {
                    expect(settingsViewCtrl.gitBranchInfo).toBeDefined();
                });
                it('should have a property called gitCommitInfo', function () {
                    expect(settingsViewCtrl.gitCommitInfo).toBeDefined();
                });
                it('should have a property called platform', function () {
                    expect(settingsViewCtrl.platform).toBeDefined();
                });
                it('should have a property called browserInfo', function () {
                    expect(settingsViewCtrl.browserInfo).toBeDefined();
                });
                it('should have a property called OSInfo', function () {
                    expect(settingsViewCtrl.OSInfo).toBeDefined();
                });
                it('gitBranchInfo should be "placeholder" by default', function () {
                    expect(settingsViewCtrl.gitBranchInfo).toEqual("placeholder");
                });
                it('gitCommitInfo should be "placeholder" by default', function () {
                    expect(settingsViewCtrl.gitCommitInfo).toEqual("placeholder");
                });
                it('platform should be "Unknown" by default', function () {
                    expect(settingsViewCtrl.platform).toEqual("Unknown");
                });
            });

            describe('version information display functions', function() {
                function refresh() {
                    settingsViewCtrl = $componentController('settingsView', {$scope: $scope}, bindings);
                }

                it('should recognize Chrome from userAgent String', function () {
                    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36';
                    refresh();
                    expect(settingsViewCtrl.browserInfo).toEqual("Chrome 67.0.3396.99");
                });

                it('should recognize Firefox from userAgent String', function () {
                    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0';
                    refresh();
                    expect(settingsViewCtrl.browserInfo).toEqual("FireFox 61.0");
                });

                it('should recognize Opera from userAgent String', function () {
                    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36 OPR/54.0.2952.54';
                    refresh();
                    expect(settingsViewCtrl.browserInfo).toEqual("Opera 54.0.2952.54");
                });

                it('should recognize Internet Explorer from userAgent String', function () {
                    mockNavigator.userAgent = 'Mozilla/5.0 (compatible, MSIE 11, Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
                    refresh();
                    expect(settingsViewCtrl.browserInfo).toEqual("Internet Explorer 11");
                });

                it('should recognize Safari from userAgent String', function () {
                    mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A';
                    refresh();
                    expect(settingsViewCtrl.browserInfo).toEqual("Safari 7046A194A");
                });

                it('should say Unknown if no Browser was recognized', function () {
                    mockNavigator.userAgent = 'This is not a real userAgent String';
                    refresh();
                    expect(settingsViewCtrl.browserInfo).toEqual("Unknown ");
                });

                it('should recognize Windows from UserAgent String', function () {
                    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0';
                    refresh();
                    expect(settingsViewCtrl.OSInfo).toEqual("Windows");
                });

                it('should recognize Android from UserAgent String', function () {
                    mockNavigator.userAgent = 'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';
                    refresh();
                    expect(settingsViewCtrl.OSInfo).toEqual("Android 4.0");
                });

                it('should recognize Linux from UserAgent String', function () {
                    mockNavigator.userAgent = '            Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36\n';
                    refresh();
                    expect(settingsViewCtrl.OSInfo).toEqual("Linux");
                })


            })
        });
        describe('settingsView element', function () {
            let $scope: angular.IScope;
            let settingsViewChild: HTMLElement;
            let jqElement: JQLite;
            let $compile: angular.ICompileService;
            let $window: angular.IWindowService;
            let settingsViewCtrl: SettingsView;

            beforeEach(() => inject(function (_$compile_: angular.ICompileService, _$window_: angular.IWindowService) {
                $compile = _$compile_;
                $window = _$window_;
            }));

            function clearWebStorage() {
                inject(function(webStorage: IAngularWebStorageService) {
                    webStorage.clear();
                });
            }

            beforeEach(clearWebStorage);
            afterEach(clearWebStorage);

            beforeEach(function() {
                $scope = $rootScope.$new();
                jqElement = $compile(`<settings-view></settings-view>`)($scope);
                settingsViewChild = jqElement[0];
                $scope.$apply();
                settingsViewCtrl = jqElement.controller('settingsView');
                document.body.appendChild(settingsViewChild);
            });

            afterEach(() => document.body.removeChild(settingsViewChild));

            describe('calendarStaticPostponeDelay', function() {
                function getCalendarStaticPostponeDropdown(): HTMLSelectElement | null {
                    return settingsViewChild.querySelector('#settings-calendar select#selectCalendarStaticPostponeDelay');
                }
                it('should have a dropdown for changing the static postpone delay of calendar events', function () {
                    expect(getCalendarStaticPostponeDropdown()).not.toBeNull();
                });
                it('should have expected dropdown options', function() {
                    const options = getCalendarStaticPostponeDropdown()!.querySelectorAll('option');
                    const optionNames = [...options].map((option: HTMLOptionElement) => option.textContent!.trim());
                    const optionValues = [...options].map((option: HTMLOptionElement) => option.value).map((v) => Number.parseInt(/^number:(\d+)$/.exec(v)![1]));
                    expect(optionNames).toEqual([
                        "1 Minute",
                        "5 Minuten",
                        "10 Minuten",
                        "15 Minuten",
                        "30 Minuten",
                        "1 Stunde"
                    ]);
                    expect(optionValues).toEqual([
                        60 * 1000,
                        5 * 60 * 1000,
                        10 * 60 * 1000,
                        15 * 60 * 1000,
                        30 * 60 * 1000,
                        60 * 60 * 1000
                    ]);
                });
                it('should have 1 minute selected by default', function() {
                   const selectedOptions =  getCalendarStaticPostponeDropdown()!.querySelectorAll('option:checked');
                   expect(selectedOptions.length).toBe(1);
                   expect(selectedOptions[0].textContent!.trim()).toBe('1 Minute');
                });
                it('should change calendarStaticPostponeDelay option, if dropdown is changed', function() {
                    spyOn(settingsService, 'saveSettings').and.callThrough();
                    const select = getCalendarStaticPostponeDropdown()!;
                    select.selectedIndex = 1;
                    select.dispatchEvent(new Event('change'));

                    expect(settingsService.calendarStaticPostponeDelay).toBe(5 * 60 * 1000);
                    expect(settingsService.saveSettings).toHaveBeenCalledTimes(1);
                });
            });

            describe('Web Notifications', function () {
                function getWebNotificationSettingsElement() {
                    return settingsViewChild.querySelector('#settings-web-notifications');
                }
                function getEnableWebNotificationsButton() {
                    return getWebNotificationSettingsElement()!.querySelector('button');
                }
                it('should show button for requesting web notification permissions by default', function() {
                    const button = getEnableWebNotificationsButton();
                    expect(button).not.toBeNull();
                    expect(button!.textContent).toBe("Web Notifications aktivieren");
                    expect(window.getComputedStyle(button!).display).not.toBe('none');
                });
                it('should call requestWebNotificationPermissions when activate button is clicked', function () {
                    const requestPermissionsSpy = spyOn(settingsViewCtrl, 'requestWebNotificationPermissions');
                    const button = getEnableWebNotificationsButton();
                    button!.click();
                    expect(requestPermissionsSpy).toHaveBeenCalledTimes(1);
                });
                it('should show "erlaubt" and not have activate button, if notification permission is granted', function () {
                    getWebNotificationPermissionStateSpy.and.returnValue('granted');
                    $scope.$apply();
                    expect(getWebNotificationSettingsElement()!.textContent!.trim()).toMatch(/Web Notifications:\s+erlaubt/);
                    expect(getEnableWebNotificationsButton()).toBeNull();
                });
                it('should show "❌ verweigert" and not have activate button, if notification permission is denied', function () {
                    getWebNotificationPermissionStateSpy.and.returnValue('denied');
                    $scope.$apply();
                    expect(getWebNotificationSettingsElement()!.textContent!.trim()).toMatch(/Web Notifications:\s+❌ verweigert/);
                    expect(getEnableWebNotificationsButton()).toBeNull();
                });
            });

            describe('image resize setting', function () {
                function getImageResizeSettingsElement() {
                    return settingsViewChild.querySelector('#settings-flowEditView');
                }

                function getImageResizeEnableCheckBox() {
                    return getImageResizeSettingsElement()!.querySelector('input');
                }

                it('should have image resizing text like pattern', function() {
                    const ImageResizeMaxWidth = 1280;
                    const ImageResizeMaxHeight = 720;
                    const ImageResizeMaxFileSize = "1.91 MiB"; //arbitrary due to MiB vs MB
                    const expectedHeadline = "^Bilder automatisch verkleinern\\b";
                    const expectedDescription = `\\b(größer als ${ImageResizeMaxWidth}×${ImageResizeMaxHeight} & ${ImageResizeMaxFileSize})\\b`;

                    const resizingDescriptionLabel = getImageResizeSettingsElement()!.querySelector('label');
                    expect(resizingDescriptionLabel).not.toBeNull();
                    const currentLabelText = resizingDescriptionLabel!.textContent;
                    expect(currentLabelText).toMatch(expectedHeadline);
                    expect(currentLabelText).toMatch(expectedDescription);

                });
                it('should have image resizing enabled by default', function() {
                    const chkBox = getImageResizeEnableCheckBox();
                    expect(chkBox).not.toBeNull();
                    expect(chkBox!.checked).toBe(true);
                    expect(settingsViewCtrl.imageResizeEnabled).toBe(true);
                    expect($window.getComputedStyle(chkBox!).display).not.toBe('none');
                });
                it('should disable image resizing if checkbox is deactivated by default', function() {
                    const chkBox = getImageResizeEnableCheckBox();
                    expect(chkBox).not.toBeNull();
                    expect($window.getComputedStyle(chkBox!).display).not.toBe('none');

                    expect(chkBox!.checked).toBe(true);
                    expect(settingsViewCtrl.imageResizeEnabled).toBe(true);

                    chkBox!.click();

                    expect(chkBox!.checked).toBe(false);
                    expect(settingsViewCtrl.imageResizeEnabled).toBe(false);
                });
            });
        });
    })
}
