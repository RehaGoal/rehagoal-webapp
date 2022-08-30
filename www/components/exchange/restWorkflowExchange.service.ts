module rehagoal.exchange {

    import AuthService = rehagoal.auth.AuthService;
    import PGPCryptoService = rehagoal.crypto.PGPCryptoService;
    import streamToBlobType = rehagoal.utilities.streamToBlobType;
    const moduleName = 'rehagoal.exchange';

    interface IRemoteEncryptedWorkflow {
        id?: string
        owner?: string
        content: string
    }

    interface IEncryptedWorkflowResponse extends IRemoteEncryptedWorkflow, Restangular.IResponse {
        id: string,
        owner?: string,
        content: string,
    }

    export type DownloadWorkflowSelection = {id: string, passphrase: string};

    export class RESTWorkflowExchangeService {
        static $inject = [
            'Restangular',
            'authService',
            'REST_API',
            'pgpCryptoService',
            'generateRandom256BitHexString',
            'workflowExportService',
            'workflowImportService',
            'streamToBlob',
            '$http'
        ];

        constructor(private restangular: Restangular.IService,
                    private authService: AuthService,
                    private restApi: rehagoal.restClientConfig.RestConstants,
                    private pgpCryptoService: PGPCryptoService,
                    private generateRandom256BitHexString: rehagoal.crypto.generateRandom256BitHexStringType,
                    private workflowExportService: IWorkflowExportService,
                    private workflowImportService: IWorkflowImportService,
                    private streamToBlob: streamToBlobType,
                    private $http: angular.IHttpService) {
        }

        /**
         * Requests the selected workflow object from the remote server.
         * Checks if a user is authenticated with the remote server prior to requesting
         * the workflow object. Once the response has been received, it will
         * decrypt the response object (stream) with the provided passphrase and import
         * the decrypted JSON content to the local workflow list.
         * @param selection.id  workflow object stored within the server
         * @param selection.passphrase  key to decrypt the requested workflow object
         */
        async downloadWorkflows(selection: DownloadWorkflowSelection): Promise<void> {
            let vm = this;
            if (!vm.authService.isUserLoggedIn()) {
              await vm.authService.requestUserLogin();
            }
            const workflowsContentPath = await vm.restangular.one('workflows', selection.id).get()
                .then((result: IEncryptedWorkflowResponse) => {
                    return result.content;
                });
            const workflowContentResponse = await this.$http.get<Blob>(workflowsContentPath, {responseType: "blob"});
            const workflowContentStream = workflowContentResponse.data.stream();
            const decryptedStream = await vm.pgpCryptoService.decryptStreamedMessage({stream: workflowContentStream, passphrase: selection.passphrase});
            return vm.workflowImportService.importJSONStreamed(decryptedStream);
        }

        /**
         * Serializes and encrypts a workflow selection and store them on a remote server.
         * Checks if a user is authenticated with the remote server prior to processing the workflow selection.
         * Once authenticated, it will create a Blob object of the selected workflows.
         * Generates a random encryption key for each upload (size: 256 bit) and encrypts the Blob object
         * within a stream. This stream will be added to the web request to be posted to the remote server.
         * @param workflowsIds  selected workflows to be uploaded to the server
         */
        async uploadWorkflows(workflowsIds: number[]): Promise<string> {
            let vm = this;
            if (!vm.authService.isUserLoggedIn()) {
              await vm.authService.requestUserLogin();
            }
            const serializedWorkflows: Blob = await vm.workflowExportService.getSerializedWorkflows(workflowsIds);
            const passphrase: string = vm.generateRandom256BitHexString();
            const encryptedWorkflowContentStream = await this.pgpCryptoService.encryptStreamedMessage({stream: serializedWorkflows.stream(), passphrase});
            const encryptedWorkflowContent = await this.streamToBlob(encryptedWorkflowContentStream);
            const requestFormData = new FormData();
            requestFormData.append('content', encryptedWorkflowContent);
            // Note that request content type is undefined here, based on https://github.com/mgonto/restangular#how-can-i-send-files-in-my-request-using-restangular
            const postResult: IEncryptedWorkflowResponse = await vm.restangular
                .all('workflows')
                .customPOST(requestFormData, '', undefined, {'Content-Type': undefined});
            return vm.restApi.BASE_URL + "/workflows/" + postResult.id + '#' + passphrase;
        }

    }

    angular.module(moduleName).service('restWorkflowExchangeService', RESTWorkflowExchangeService);
}
