module rehagoal.intents {
    const moduleName = 'rehagoal.intents';

    export class IntentService {
        //noinspection JSUnusedGlobalSymbols
        static $inject = [
            '$log',
            '$window',
            '$rootScope',
            '$document',
            'intentImportService'
        ];

        private previousUri: string | undefined = undefined;

        constructor(private $log: angular.ILogService,
                    private $window: angular.IWindowService,
                    private $rootScope: angular.IRootScopeService,
                    private $document: angular.IDocumentService,
                    private IntentImportService: rehagoal.intents.IntentImportService) {
            let vm = this;
            ($document[0] as Document).addEventListener('deviceready', function () {
                if (!!$window['cordova']) {
                    const webIntent: CordovaWebIntent.WebIntent = $window['plugins'].webintent;
                    webIntent.onNewIntent(function (uri) {
                        if (uri !== "") {
                            vm.handleUriIntent(uri);
                        }
                    });
                    webIntent.getUri(function (uri) {
                        if (uri !== "") {
                            vm.handleUriIntent(uri);
                        }
                    });
                }
            });
        }

        private handleUriIntent(uri: string) : void {
            let vm = this;
            if (uri === vm.previousUri) {
                return;
            }
            vm.previousUri = uri;
            if (!angular.isString(uri)) {
                vm.$log.info("IntentService: No intent.");
                return;
            }
            vm.$log.info("IntentService: Intent: " + uri);
            vm.IntentImportService.onNewIntent(uri);
        }
    }

    angular.module(moduleName).service('intentService', IntentService);
}
