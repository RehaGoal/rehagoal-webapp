import IMeSpeak = mespeak.IMeSpeak;
module mespeak {

    export class MeSpeakLoader {
        //noinspection JSUnusedGlobalSymbols
        static $inject = [
            '$log',
            '$q',
            '$window',
            '$document',
        ];

        private loadedPromise!: angular.IPromise<IMeSpeak>; //initialized by rejectLoading/constructor

        constructor(private $log: angular.ILogService,
                    private $q: angular.IQService,
                    private $window: angular.IWindowService,
                    private $document: angular.IDocumentService) {
            if (!!$window.cordova) {
                this.rejectLoading();
                return;
            }
            $log.info("Deferred loading of mespeak.min.js.");
            this.loadedPromise = this.loadScript('components/tts/mespeak/mespeak.min.js');
            this.loadedPromise
                .then((event) => {
                    $log.info("Loading of mespeak.min.js complete.");
                })
                .catch((reason: any) => {
                    $log.warn("Could not load mespeak.min.js: " + reason);
                })
        }

        private rejectLoading() {
            let deferred = this.$q.defer<IMeSpeak>();
            this.loadedPromise = deferred.promise;
            deferred.reject("Mespeak is not recommended on mobile devices!");
            return;
        }

        get(): angular.IPromise<IMeSpeak> {
            let deferred = this.$q.defer<IMeSpeak>();
            this.loadedPromise
                .then((event) => {
                    deferred.resolve(this.$window.meSpeak);
                })
                .catch((reason: any) => {
                    deferred.reject(reason);
                });
            return deferred.promise;
        }

        private loadScript(src: string): angular.IPromise<IMeSpeak> {
            return new this.$q(function (resolve, reject) {
                let s = document.createElement('script');
                s.src = src;
                s.onload = resolve;
                s.onerror = reject;
                if (document.head === null) {
                    reject(new Error('document.head is null!'));
                    return;
                }
                document.head.appendChild(s);
            });
        }
    }

    angular.module('mespeak')
        .service('mespeakLoader', MeSpeakLoader);

}
