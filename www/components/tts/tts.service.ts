module rehagoal.tts {
    const moduleName = 'rehagoal.tts';

    export class TTSService {
        //noinspection JSUnusedGlobalSymbols
        static $inject = [
            '$log',
            '$q',
            '$window',
            '$document',
            'settingsService',
            'mespeakService',
            'webSpeechService',
            'cordovaSpeechService'
        ];
        private activeService: services.ISpeakService | undefined;
        private serviceLoaded: boolean = false;
        private serviceLoadedDeferred: angular.IDeferred<void>;

        constructor(private $log: angular.ILogService,
                    private $q: angular.IQService,
                    private $window: angular.IWindowService,
                    private $document: angular.IDocumentService,
                    private settingsService: rehagoal.settings.SettingsService,
                    private mespeakService: services.MeSpeakSpeakService,
                    private webSpeechService: services.WebSpeechSpeakService,
                    private cordovaSpeechService: services.CordovaSpeakService) {
            this.serviceLoadedDeferred = $q.defer<void>();
            this.serviceLoadedDeferred.promise.then(() => {
                this.serviceLoaded = true;
            });

            this.mespeakService.whenSupported().then(() => {
                if (this.serviceLoaded) {
                    return;
                }

                this.$log.info("Using mespeakService as TTS service.");
                this.activeService = this.mespeakService;
                this.serviceLoadedDeferred.resolve();
            });
            this.webSpeechService.whenSupported().then(() => {
                this.$log.info("Using webSpeechService as TTS service.");
                this.activeService = this.webSpeechService;
                this.serviceLoadedDeferred.resolve();
            });
            this.cordovaSpeechService.whenSupported().then(() => {
                this.$log.info("Using CordovaTTS as TTS service.");
                this.activeService = cordovaSpeechService;
                this.serviceLoadedDeferred.resolve();
            });
        }

        public isTTSEnabled(): boolean {
            return this.settingsService.ttsEnabled;
        }

        public speak(text: string): angular.IPromise<void> {
            let deferred = this.$q.defer<void>();
            if (!this.isTTSEnabled()) {
                this.speakInternalDisabled(text, deferred);
            } else {
                if (!this.serviceLoaded) {
                    this.serviceLoadedDeferred.promise.then(() => {
                        this.speakInternalEnabled(text, deferred);
                    });
                } else {
                    this.speakInternalEnabled(text, deferred);
                }

            }
            return deferred.promise;
        }

        private speakInternalEnabled(text: string, deferred: angular.IDeferred<void>) {
            this.$log.debug("[tts enabled] ttsSpeak('" + text + "')");
            if (!this.activeService) {
                this.$log.error('No TTS service active!');
                return;
            }
            this.activeService.speak(text, this.activeService.getSpeed(this.settingsService.currentTTSSpeedIndex), deferred.resolve, deferred.reject);
        }

        private speakInternalDisabled(text: string, deferred: angular.IDeferred<void>) {
            this.$log.debug("[tts disabled] ttsSpeak('" + text + "')");
            deferred.resolve();
        }
    }

    angular.module(moduleName)
        .service('ttsService', TTSService);
}
