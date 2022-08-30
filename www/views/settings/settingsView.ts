module rehagoal.settingsView {
    import SettingsService = rehagoal.settings.SettingsService;
    import TTSService = rehagoal.tts.TTSService;
    import ExecutionViewLayout = rehagoal.settings.ExecutionViewLayout;
    import FlexContentAlignment = rehagoal.settings.FlexContentAlignment;
    import StudyExportService = rehagoal.exchange.StudyExportService;
    import DownloadService = rehagoal.exchange.DownloadService;
    import MINUTE_IN_MILLISECONDS = rehagoal.utilities.MINUTE_IN_MILLISECONDS;
    import HOUR_IN_MILLISECONDS = rehagoal.utilities.HOUR_IN_MILLISECONDS;
    import getWebNotificationPermissionStateType = rehagoal.utilities.getWebNotificationPermissionStateFunc;
    import IAngularWebNotification = angularWebNotification.IAngularWebNotification;
    const moduleName = 'rehagoal.settingsView';

    type TimeSpanOption = { label: string, value: number };
    const CALENDAR_STATIC_POSTPONE_DELAY_OPTIONS: TimeSpanOption[] = [
        {label: "1 Minute", value: MINUTE_IN_MILLISECONDS},
        {label: "5 Minuten", value: 5 * MINUTE_IN_MILLISECONDS},
        {label: "10 Minuten", value: 10 * MINUTE_IN_MILLISECONDS},
        {label: "15 Minuten", value: 15 * MINUTE_IN_MILLISECONDS},
        {label: "30 Minuten", value: 30 * MINUTE_IN_MILLISECONDS},
        {label: "1 Stunde", value: HOUR_IN_MILLISECONDS},
    ]

    export class SettingsView implements angular.IComponentController {
        static $inject = [
            '$log',
            '$document',
            '$scope',
            '$timeout',
            'navigatorService',
            'getWebNotificationPermissionState',
            'webNotification',
            'settingsService',
            'ttsService',
            'studyExportService',
            'downloadService',
            'GIT_INFO'
        ];

        private showCordovaSettings: boolean = false;
        private audioSampleText: string = "Die Sprachausgabe erfolgt mit dieser Geschwindigkeit";
        private userAgent: string;
        private _downloadUrl: string | null = null;
        private studyInitializing: boolean = false;
        private _exportInProgress: boolean = false;
        private _exportProgressValue: number | null = null;
        private _studyReferenceBeingValidated: boolean = false;
        public studyErrorMessage: string = "";
        public studyPassword: string = "";
        public studyPasswordRepeat: string = "";
        public studyNames: string[] = [];   //TODO: can this attr. be private?
        public studyReferenceKey: string = "";
        public studyNameSelected: string = "";

        constructor(private $log: angular.ILogService,
                    private $document: angular.IDocumentService,
                    private $scope: angular.IScope,
                    private $timeout: angular.ITimeoutService,
                    private navigatorService: Navigator,
                    private getWebNotificationPermissionState: getWebNotificationPermissionStateType,
                    private webNotification: IAngularWebNotification,
                    private settingsService: SettingsService,
                    private ttsService: TTSService,
                    private studyExportService: StudyExportService,
                    private downloadService: DownloadService,
                    private versionInfo: rehagoal.versionInfo.VersionConstants) {
            let vm = this;

            this.userAgent = navigatorService.userAgent;

            // load study settings
            this.studyNames = this.settingsService.getStudyNames();
            this.studyNameSelected = this.settingsService.getSelectedStudyName();

            ($document[0] as Document).addEventListener('deviceready', function () {
                vm.showCordovaSettings = true;
            });
        }

        $onInit(): void {
        }

        $onDestroy(): void {
            this.revokeDownloadUrl();
        }

        get executionViewLayout(): ExecutionViewLayout {
            return this.settingsService.executionViewLayout;
        }

        set executionViewLayout(val: ExecutionViewLayout) {
            this.settingsService.executionViewLayout = val;
            this.settingsService.saveSettings();
        }

        get executionViewFlexContentAlignment(): FlexContentAlignment {
            return this.settingsService.executionViewFlexContentAlignment;
        }

        set executionViewFlexContentAlignment(val: FlexContentAlignment) {
            this.settingsService.executionViewFlexContentAlignment = val;
            this.settingsService.saveSettings();
        }

        get ttsEnabled() {
            return this.settingsService.ttsEnabled;
        }

        set ttsEnabled(val: boolean) {
            this.settingsService.ttsEnabled = val;
            this.settingsService.saveSettings();
        }

        get ttsSpeed() {
            return this.settingsService.ttsSpeed;
        }

        set ttsSpeed(val: number) {
            this.settingsService.changeSpeechSpeeds(val);
            this.settingsService.saveSettings();
        }

        get gamificationEnabled() {
            return this.settingsService.gamificationEnabled;
        }

        set gamificationEnabled(val: boolean) {
            this.settingsService.gamificationEnabled = val;
            this.settingsService.saveSettings();
        }

        get webNotificationsState(): NotificationPermission | "unsupported" {
            return this.getWebNotificationPermissionState();
        }

        requestWebNotificationPermissions(): void {
            const vm = this;
            this.webNotification.showNotification("RehaGoal: Web Notifications aktiviert!", {
                icon: "xxhdpi-icon.png",
                body: "Web Notifications können jetzt verwendet werden."
            }, function (error, hide) {
                vm.$scope.$applyAsync();
            });
        }

        get wearCompanionEnabled() {
            return this.settingsService.wearCompanionEnabled;
        }

        set wearCompanionEnabled(val: boolean) {
            this.settingsService.wearCompanionEnabled = val;
            this.settingsService.saveSettings();
        }

        get bluetoothCompanionEnabled() {
            return this.settingsService.bluetoothCompanionEnabled;
        }

        set bluetoothCompanionEnabled(val: boolean) {
            this.settingsService.bluetoothCompanionEnabled = val;
            this.settingsService.saveSettings();
        }

        get imageResizeEnabled(): boolean {
            return this.settingsService.imageResizeEnabled;
        }

        set imageResizeEnabled(val: boolean) {
            this.settingsService.imageResizeEnabled = val;
            this.settingsService.saveSettings();
        }

        get imageResizeMaxWidth(): number {
            return this.settingsService.imageResizeMaxWidth;
        }

        get imageResizeMaxHeight(): number {
            return this.settingsService.imageResizeMaxHeight;
        }

        get imageResizeMaxFileSize(): number {
            return this.settingsService.imageResizeMaxFileSize;
        }

        get exportInProgress(): boolean {
            return this._exportInProgress;
        }

        get exportProgressValue(): number | null {
            return this._exportProgressValue;
        }

        get studyModeEnabled(): boolean {
            return this.settingsService.studyModeEnabled;
        }

        get studyInitialized(): boolean {
            return this.settingsService.isStudyInitialized();
        }

        public isStudyInitializing(): boolean {
            return this.studyInitializing;
        }

        public isStudyReferenceBeingValidated(): boolean {
            return this._studyReferenceBeingValidated;
        }

        get pseudonym(): string | null {
            return this.settingsService.userPseudonym;
        }

        get calendarStaticPostponeDelayOptions(): TimeSpanOption[] {
            return CALENDAR_STATIC_POSTPONE_DELAY_OPTIONS;
        }

        get calendarStaticPostponeDelay(): number {
            return this.settingsService.calendarStaticPostponeDelay;
        }

        set calendarStaticPostponeDelay(delay: number) {
            this.settingsService.calendarStaticPostponeDelay = delay;
            this.settingsService.saveSettings();
        }

        audioSample(): void {
            this.ttsService.speak(this.audioSampleText);
        }

        get gitBranchInfo() {
            return this.versionInfo.gitBranch;
        }

        get gitCommitInfo() {
            return this.versionInfo.gitCommit;
        }

        get platform() {
            if (this.versionInfo.platform === "placeholder") {
                return "Unknown";
            }
            return this.versionInfo.platform;
        }

        get browserInfo() {
            let vm = this;

            let browser: string = "Unknown";
            let browserVer: string = "";
            let verOffset: number;

            if (vm.versionInfo.platform === "CORDOVA") {
                verOffset = vm.userAgent.indexOf("Chrome");
                browser = "Chrome";
                browserVer = vm.userAgent.substring(verOffset + 7);
                let browserVerEnd: number = vm.userAgent.indexOf(" ");
                if (browserVerEnd != -1) {
                    browserVer = browserVer.substring(0, browserVerEnd + 1);
                }
            } else {
                if ((verOffset = vm.userAgent.indexOf("OPR")) != -1) {
                    browser = "Opera";
                    browserVer = vm.userAgent.substring(verOffset + 4);
                } else if ((verOffset = vm.userAgent.indexOf("Edge")) != -1) {
                    browser = "Edge";
                    browserVer = vm.userAgent.substring(verOffset + 5);
                } else if ((verOffset = vm.userAgent.indexOf("MSIE")) != -1) {            //untested!
                    browser = "Internet Explorer";
                    browserVer = vm.userAgent.substring(verOffset + 5, verOffset + 7);
                } else if ((verOffset = vm.userAgent.indexOf("Chrome")) != -1) {
                    browser = "Chrome";
                    browserVer = vm.userAgent.substring(verOffset + 7);
                    let browserVerEnd: number = vm.userAgent.indexOf(" ");
                    if (browserVerEnd != -1) {
                        browserVer = browserVer.substring(0, browserVerEnd + 1);
                    }
                } else if ((verOffset = vm.userAgent.indexOf("Safari")) != -1) {          //untested!
                    browser = "Safari";
                    browserVer = vm.userAgent.substring(verOffset + 7);
                } else if ((verOffset = vm.userAgent.indexOf("Firefox")) != -1) {
                    browser = "FireFox";
                    browserVer = vm.userAgent.substring(verOffset + 8);
                }

            }
            return (browser + " " + browserVer);
        }

        get OSInfo() {
            let vm = this;
            let platform: string = "Unknown";

            let regex: RegExp = /Android (\d+)\.(\d+)/;
            let android = regex.exec(vm.userAgent);

            if (android !== null) {
                platform = android[0];
            } else if (vm.userAgent.indexOf("Win") != -1) {
                platform = "Windows";
            } else if (vm.userAgent.indexOf("Linux") != -1) {
                platform = "Linux";
            }
            return platform;
        }

        get downloadUrl() {
            return this._downloadUrl;
        }

        public async exportStudyData() {
            this.revokeDownloadUrl();
            this.studyErrorMessage = "";
            const password = this.studyPassword;
            this.studyPassword = "";
            this._exportInProgress = true;
            try {
                const exportBlob = await this.studyExportService.exportAsBlob(password, progress => {
                    console.debug("Progress callback (exportAsBlob)", progress);
                    this.$scope.$applyAsync(() => {
                        this._exportProgressValue = progress;
                    });
                });
                this._downloadUrl = await this.downloadService.downloadFile(exportBlob, `studyExport-${this.pseudonym}.pgp`, (progress) => {
                    console.debug("Progress callback (download)", progress);
                    this.$scope.$applyAsync(() => {
                        this._exportProgressValue = progress;
                    });
                });
                this.$scope.$applyAsync();
            } catch (err) {
                this.$log.error("Error during export", err);
                this.studyErrorMessage = err.message;
                this._exportInProgress = false;
                this.$scope.$applyAsync();
            } finally {
                this._exportInProgress = false;
                this.$scope.$applyAsync();
            }

        }

        public async initStudy() {
            if (this.studyPassword.length < 8) {
                this.$log.warn("Password too short");
                return false;
            }
            if (this.studyPassword !== this.studyPasswordRepeat) {
                this.$log.warn("Passwords do not match");
                return false;
            }
            this.studyInitializing = true;
            const password = this.studyPassword;
            this.studyPassword = "";
            this.studyPasswordRepeat = "";
            await this.studyExportService.initStudy(password);
            this.settingsService.saveSettings();
            this.studyInitializing = false;
            this.$scope.$applyAsync();
        }

        public async exportPublicKey(): Promise<void> {
            this.revokeDownloadUrl();
            if (!this.settingsService.pgpUserPublicKey) {
                throw new Error('Public key is not set!');
            }
            const exportBlob = new Blob([this.settingsService.pgpUserPublicKey]);
            this._downloadUrl = await this.downloadService.downloadFile(exportBlob, `publicKey-${this.pseudonym}.asc`);
            this.$scope.$applyAsync();
        }

        public async initStudyReference() {
            this.studyErrorMessage = "";
            if (this.studyReferenceKey === "" || this.studyNameSelected === "") {
                return;
            }
            this._studyReferenceBeingValidated = true;

            this.$log.info("validation: ", this.isStudyReferenceBeingValidated());
            this.$scope.$applyAsync();
            try {
                await this.settingsService.enableStudyModeForReference(this.studyNameSelected, this.studyReferenceKey);
            } catch (validationError) {
                this.studyErrorMessage = validationError.message;
            } finally {
                this._studyReferenceBeingValidated = false;
                this.$log.info("validation: ", this.isStudyReferenceBeingValidated());
                this.$scope.$applyAsync();
            }
        }

        private revokeDownloadUrl(): void {
            if (this._downloadUrl !== null) {
                this.downloadService.revokeDownloadURL(this._downloadUrl);
                this._downloadUrl = null;
            }
        }
    }

    angular.module(moduleName, ['ngRoute', 'rehagoal.settings', 'rehagoal.versionInfo', 'rehagoal.exchange', 'rehagoal.toggleSwitch'])
        .config(['$routeProvider', function ($routeProvider: ng.route.IRouteProvider) {
            $routeProvider.when('/settings', {
                template: '<settings-view></settings-view>'
            });
        }])
        .component('settingsView', {
            templateUrl: 'views/settings/settingsView.html',
            controller: SettingsView
        })
}
