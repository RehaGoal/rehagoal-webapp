module rehagoal.tts.services {
    const moduleName = 'rehagoal.tts.services';

    import ICordovaTTS = rehagoal.tts.services.cordovaTTS.ICordovaTTS;

    export module cordovaTTS {
        export interface ICordovaOptions {
            /** text to speak */
            text: string;
            /** a string like 'en-US', 'zh-CN', etc */
            locale?: string;
            /** speed rate, 0 ~ 1 */
            rate?: number;
            /** ambient(iOS) */
            category?: string;
        }

        export interface ICordovaTTS {
            speak(options: ICordovaOptions): Promise<void>
            speak(text: string): Promise<void>
            stop(): Promise<void>
            checkLanguage(): Promise<string>
            openInstallTts(): Promise<void>
        }
    }


    export interface ISpeakService extends OnSupportedService {
        speak(text: string, speed: number, onSuccess?: SpeakSuccessCallback, onFail?: SpeakFailCallback): void;
    }

    abstract class OnSupportedService {
        protected abstract speedValues: number[];

        protected abstract $q: angular.IQService;

        protected abstract isSupported(): boolean;

        private onSupportedDeferreds: angular.IDeferred<void>[] = [];

        protected resolveOnSupported() {
            let onSupported;
            while (onSupported = this.onSupportedDeferreds.pop()) {
                onSupported.resolve();
            }
        }

        public whenSupported(): angular.IPromise<void> {
            let deferred = this.$q.defer<void>();
            this.onSupportedDeferreds.push(deferred);
            if (this.isSupported()) {
                this.resolveOnSupported();
            }
            return deferred.promise;
        }

        public getSpeed(index: number): number {
            return this.speedValues[index];
        }
    }

    type SpeakSuccessCallback = () => void;
    type SpeakFailCallback = (reason: string) => void;

    export class CordovaSpeakService extends OnSupportedService implements ISpeakService {
        //noinspection JSUnusedGlobalSymbols
        readonly speedValues: number[] = [0.25, 0.5, 1, 1.5, 2];

        static $inject = [
            '$q',
            '$document',
            '$window',
        ];
        private isSpeaking: boolean = false;
        private tts: ICordovaTTS | undefined;

        constructor(protected $q: angular.IQService,
                    private $document: angular.IDocumentService,
                    private $window: angular.IWindowService) {
            super();
            let vm = this;
            ($document[0] as Document).addEventListener('deviceready', function () {
                if (!!$window['cordova'] && !!$window.TTS) {
                    vm.tts = $window.TTS;
                    vm.resolveOnSupported();
                }
            })
        }

        protected isSupported() {
            return !!this.tts;
        }

        private speakInternal = (text: string,
                                 speed: number,
                                 onSuccess?: SpeakSuccessCallback,
                                 onFail?: SpeakFailCallback) => {
            this.isSpeaking = true;
            if (!this.tts) {
                onFail && onFail('Cordova TTS not initialized.');
                return;
            }
            this.tts.speak({
                text: text,
                rate: speed,
                locale: 'de-DE'
            }).then(() => {
                this.isSpeaking = false;
                onSuccess && onSuccess();
            }).catch((reason: string) => {
                this.isSpeaking = false;
                onFail && onFail(reason);
            });
        };

        public speak(text: string,
                     speed: number,
                     onSuccess?: SpeakSuccessCallback,
                     onFail?: SpeakFailCallback): void {
            if (this.isSpeaking) {
                // Defer speech if we are already speaking, to prevent skipping the voice output.
                if (!this.tts) {
                    onFail && onFail('Cordova TTS not initialized.');
                    return;
                }
                this.tts.stop().then(() => {
                    this.speakInternal(text, speed, onSuccess, onFail);
                }).catch((reason) => {
                    onFail && onFail(reason);
                });
            } else {
                this.speakInternal(text, speed, onSuccess, onFail);
            }
        }
    }


    export class MeSpeakSpeakService extends OnSupportedService implements ISpeakService {
        readonly speedValues: number[] = [50, 70, 150, 200, 250];

        //noinspection JSUnusedGlobalSymbols
        static $inject = [
            '$log',
            '$q',
            'mespeakLoader'
        ];
        private mespeakLoaded: boolean = false;
        private mespeak: IMeSpeak | undefined;
        private germanVoiceLoadedCallbacks: (() => void)[] = [];

        constructor(private $log: angular.ILogService,
                    protected $q: angular.IQService,
                    private mespeakLoader: mespeak.MeSpeakLoader) {
            super();
            let vm = this;
            vm.germanVoiceLoadedCallbacks.push(() => {
                $log.info("mespeak german voice is loaded.");
                vm.mespeakLoaded = true;
                this.resolveOnSupported();
            });
            mespeakLoader.get().then((mespeak: IMeSpeak) => {
                vm.mespeak = mespeak;
                vm.mespeak.loadConfig('components/tts/mespeak/mespeak_config.json');
                vm.mespeak.loadVoice('components/tts/mespeak/voices/de.json', (status, code) => {
                    if (!status) {
                        $log.error("Error: Could not load voice: " + code);
                    }
                    for (let i = 0; i < this.germanVoiceLoadedCallbacks.length; ++i) {
                        $log.info("Retrying deferred speak call (" + i + ")");
                        this.germanVoiceLoadedCallbacks[i]();
                    }
                });
                vm.mespeak.loadVoice('components/tts/mespeak/voices/en/en.json', (status, code) => {
                    if (!status) {
                        $log.error("Error: Could not load voice: " + code);
                    }
                    vm.mespeak!.setDefaultVoice('de');
                });
                if (!vm.mespeak.canPlay()) {
                    $log.error("Error: MeSpeak cannot play sounds!");
                }
            }).catch((reason) => $log.error("Error: Could not load mespeak", reason));
        }

        protected isSupported(): boolean {
            return this.mespeakLoaded;
        }

        private speakInternal(text: string,
                              speed: number,
                              onSuccess?: SpeakSuccessCallback,
                              onFail?: SpeakFailCallback): void {
            // Stop previous speech before starting a new one.
            this.mespeak!.stop();
            this.mespeak!.speak(text, {
                voice: 'de',
                speed: speed,
            }, (success: boolean) => {
                if (success) {
                    onSuccess && onSuccess();
                } else {
                    onFail && onFail("Unknown error");
                }
            });
        }

        public speak(text: string,
                     speed: number,
                     onSuccess?: SpeakSuccessCallback,
                     onFail?: SpeakFailCallback): void {
            text = text.toLowerCase(); //mespeak is not able to pronounce uppercase Z for some reason
            if (!this.mespeak) {
                onFail && onFail('MeSpeak not initialized.');
                return;
            }
            if (!this.mespeak.isVoiceLoaded('de')) {
                // Defer speak calls if the german voice has not been loaded yet.
                this.$log.warn("Warning: MeSpeak German language not loaded! Deferring speak call.");
                this.germanVoiceLoadedCallbacks.push(() => this.speakInternal(text, speed, onSuccess, onFail));
            }
            this.speakInternal(text, speed, onSuccess, onFail)
        }
    }

    interface SpeechSynthesisErrorEvent extends SpeechSynthesisEvent {
        error: any;
    }

    interface Ctor<T> {
        new(): T;
    }

    export class WebSpeechSpeakService extends OnSupportedService implements ISpeakService {
        readonly speedValues: number[] = [0.25, 0.5, 1, 1.5, 2];

        //noinspection JSUnusedGlobalSymbols
        static $inject = [
            '$log',
            '$q',
            'webSpeechSynthesis',
            'webSpeechSynthesisUtterance'
        ];

        private voice!: SpeechSynthesisVoice;
        private browser_supported: boolean = false;
        private language_supported: boolean = false;

        constructor(private $log: angular.ILogService,
                    protected $q: angular.IQService,
                    private speechSynthesis: SpeechSynthesis,
                    private speechSynthesisUtterance: Ctor<SpeechSynthesisUtterance>) {
            super();
            if (this.speechSynthesis === null) {
                $log.debug("Web Speech synthesis not available: undefined");
                return;
            }
            if (this.speechSynthesisUtterance === null) {
                return;
            }
            this.browser_supported = true;
            this.loadVoices();
            this.speechSynthesis.onvoiceschanged = (ev: Event) => {
                this.loadVoices();
            };
        }

        private loadVoices() {
            let voices = this.speechSynthesis.getVoices();
            if (voices.length == 0) {
                return;
            }
            for (let voice of voices) {
                if (voice.lang === 'de-DE' || voice.lang === 'de_DE') {
                    if (!voice.localService) {
                        this.$log.debug("Web speech synthesis does support german language, but service is not local!");
                        continue;
                    }
                    this.voice = voice;
                    this.language_supported = true;
                    break;
                }
            }
            if (!this.language_supported) {
                this.$log.debug("Web Speech synthesis not available: german language not available");
            } else {
                this.$log.debug("Web Speech synthesis: language is now supported!");
                this.resolveOnSupported();
            }
        }

        isSupported(): boolean {
            return this.supported;
        }

        get supported(): boolean {
            return this.browser_supported && this.language_supported;
        }

        public speak(text: string,
                     speed: number,
                     onSuccess?: SpeakSuccessCallback,
                     onFail?: SpeakFailCallback): void {
            if (!this.browser_supported) {
                onFail && onFail("Web Speech synthesis is not supported!");
                return;
            }
            this.speechSynthesis.cancel();
            let msg = new this.speechSynthesisUtterance();
            msg.voice = this.voice;
            msg.text = text;
            msg.rate = speed;
            msg.onend = (ev: SpeechSynthesisEvent) => {
                onSuccess && onSuccess();
            };
            msg.onerror = (ev: SpeechSynthesisErrorEvent) => {
                let error = "Could not synthesize speech!";
                if (!!ev.error) {
                    error += " " + ev.error;
                }
                onFail && onFail(error);
            };
            this.speechSynthesis.speak(msg);
        }
    }



    angular.module(moduleName, ['mespeak'])
        .service('mespeakService', MeSpeakSpeakService)
        .service('webSpeechService', WebSpeechSpeakService)
        .service('cordovaSpeechService', CordovaSpeakService)
        .factory('webSpeechSynthesis', ['$window', function ($window: angular.IWindowService): SpeechSynthesis {
            return $window.speechSynthesis || null;
        }])
        .factory('webSpeechSynthesisUtterance', ['$window', function ($window: angular.IWindowService): Ctor<SpeechSynthesisUtterance> {
            return $window.SpeechSynthesisUtterance || null;
        }]);
}
