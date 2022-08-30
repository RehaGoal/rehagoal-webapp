module rehagoal.intents {
    import DownloadWorkflowSelection = rehagoal.exchange.DownloadWorkflowSelection;
    const moduleName = 'rehagoal.intents';

    /**
     * Validate that provided object has a property named `status`
     * @param obj   Object to check that property exists on
     * @private
     */
    function hasStatusAttribute(obj: unknown): obj is {status: any} {
        return Object.prototype.hasOwnProperty.call(obj, 'status');
    }

    export class IntentImportService {
        static $inject = [
            '$log',
            '$rootScope',
            '$document',
            'workflowService',
            '$cordovaToast',
            'restWorkflowExchangeService',
            'REST_API'
        ];

        /**
         * Export ID length of the workflow that have been stored on a remote server
         * @private
         */
        private readonly WORKFLOW_ID_LENGTH: number = 12;

        constructor(private $log: angular.ILogService,
                    private $rootScope: angular.IRootScopeService,
                    private $document: angular.IDocumentService,
                    private workflowService: IWorkflowService,
                    private $cordovaToast: ngCordova.IToastService,
                    private restWorkflowExchangeService: rehagoal.exchange.RESTWorkflowExchangeService,
                    private restApi: rehagoal.restClientConfig.RestConstants) {
            $log.info("Initialized IntentImportService.");
        }

        /**
         * Intent handling function which will validate that a provided `uri` can be parsed
         * as a URL and contains the expected attributes.
         * 1. Checks that the `uri` is an actual URL or throws an error
         * 2. Checks that parsed URL starts like the BASE_URL, has the expected origin and correct path, otherwise throws error
         * 3. Check that workflow ID can be matched within url pathname, otherwise throws error
         * 4. Check that a decryption key exists within url hash property (hash not empty)
         * Once all checks pass, will try to import from the provided url
         * @param uri   String containing a URL target for the remote server including a decryption key
         */
        async onNewIntent(uri: string): Promise<void> {
            let vm = this;
            let intentURL: URL;

            try {
                intentURL = new URL(uri);
            } catch (e) {
                throw new Error('Eingegebene URL konnte nicht gelesen werden.');
            }

            const baseURL = new URL(this.restApi.BASE_URL);

            vm.showLongToast("Received intent: " + intentURL.origin + intentURL.pathname);

            if (!intentURL.href.startsWith(baseURL.href) || !intentURL.pathname.startsWith(baseURL.pathname) || intentURL.origin !== baseURL.origin) {
                throw new Error('Intent does not match server URL, aborting.');
            }

            const restPath = intentURL.pathname.substring(baseURL.pathname.length);
            const exportMatcherRegex = new RegExp('^/workflows/([a-zA-Z0-9_-]{' + Number(this.WORKFLOW_ID_LENGTH) + '})$');
            const exportIdMatch = restPath.match(exportMatcherRegex);

            if (exportIdMatch === null) {
                throw new Error('Workflow-Link enthält keine gültige Workflow-ID. Import gescheitert.');
            }

            const exportId = exportIdMatch[1];

            if (intentURL.hash === "") {
                vm.$log.info('No file decryption key within url, aborting!');
                throw new Error("Workflow-Link enthält keinen Entschlüsselungscode. Import gescheitert.");
            }
            // remove appending # from hash
            const passphrase: string = intentURL.hash.substr(1, intentURL.hash.length);
            return await vm.importServerWorkflows({id: exportId, passphrase: passphrase});
        }

        private async importServerWorkflows(selection: DownloadWorkflowSelection): Promise<void> {
            let vm = this;

            vm.$log.info("Starting import of workflows...");
            try {
                await vm.restWorkflowExchangeService.downloadWorkflows(selection);
                vm.$log.info("Successfully imported workflows from the server!");
                vm.showLongToast("Workflows vom Server importiert!");
            } catch (rejected: unknown) {
                let rejectMsg: string = "Workflows konnten nicht vom Server geladen werden! ";
                if (hasStatusAttribute(rejected)) {
                    rejectMsg += `(Code: ${rejected.status})`;
                }
                return Promise.reject(new Error(rejectMsg));
            }
        }

        private showLongToast(msg: string) : void {
            let vm = this;
            (vm.$document[0] as Document).addEventListener('deviceready', function () {
                vm.$cordovaToast.showLongBottom(msg);
            });
        }
    }

    angular.module(moduleName).service('intentImportService', IntentImportService);
}
