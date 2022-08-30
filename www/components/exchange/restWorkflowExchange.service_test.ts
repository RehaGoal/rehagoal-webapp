module rehagoal.exchange {
    import AuthService = rehagoal.auth.AuthService;
    import PGPCryptoService = rehagoal.crypto.PGPCryptoService;
    import SpyObj = jasmine.SpyObj;
    import streamToBlobType = rehagoal.utilities.streamToBlobType;

    describe('restWorkflowExchange.service', function () {
        let restWorkflowExchangeService: RESTWorkflowExchangeService;
        let streamToBlob: streamToBlobType;
        let mockAuthService: SpyObj<AuthService>;
        let mockRestangular: SpyObj<Restangular.IService>;
        let mockHttp: SpyObj<angular.IHttpService>;
        let mockPGPCryptoService: SpyObj<PGPCryptoService>;
        let mockImportService: SpyObj<IWorkflowImportService>;
        let mockExportService: SpyObj<IWorkflowExportService>;
        let mockGenerateRandom256BitHexString: jasmine.Spy;

        const REST_API_BASE_URL = 'https://rehagoal-server.local/api/v2';

        beforeEach(() => angular.mock.module('rehagoal.exchange', function ($provide: angular.auto.IProvideService) {
            mockAuthService = jasmine.createSpyObj<AuthService>('authService', ['isUserLoggedIn', 'requestUserLogin']);
            mockRestangular = jasmine.createSpyObj<Restangular.IService>('Restangular', ['one', 'all', 'customPOST', 'setBaseUrl', 'setRequestSuffix', 'setErrorInterceptor', 'addResponseInterceptor']);
            mockHttp = jasmine.createSpyObj<angular.IHttpService>('$http', ['get']);
            mockPGPCryptoService = jasmine.createSpyObj<PGPCryptoService>('pgpCryptoService', ['decryptStreamedMessage', 'encryptStreamedMessage']);
            mockImportService = jasmine.createSpyObj<IWorkflowImportService>('workflowImportService', ["importJSONStreamed"]);
            mockExportService = jasmine.createSpyObj<IWorkflowExportService>('workflowExportService', ['getSerializedWorkflows']);
            mockGenerateRandom256BitHexString = jasmine.createSpy('generateRandom256BitHexString');
            $provide.value('authService', mockAuthService);
            $provide.value('Restangular', mockRestangular);
            $provide.value('$http', mockHttp);
            $provide.value('pgpCryptoService', mockPGPCryptoService);
            $provide.value('workflowImportService', mockImportService);
            $provide.value('workflowExportService', mockExportService);
            $provide.value('generateRandom256BitHexString', mockGenerateRandom256BitHexString);
        }));

        beforeEach(() => angular.mock.inject(function (_restWorkflowExchangeService_: RESTWorkflowExchangeService,
                                                       _streamToBlob_: streamToBlobType) {
            restWorkflowExchangeService = _restWorkflowExchangeService_;
            streamToBlob = _streamToBlob_;
        }));

        describe("downloadWorkflows", function () {
            const downloadSelection: DownloadWorkflowSelection = { id: "1", passphrase: 'test' };
            const testWorkflowContent: Blob = new Blob(['content']);
            const testEncryptedWorkflowResponse = { content: 'testurl' };

            beforeEach(() => {
                mockAuthService.isUserLoggedIn.and.returnValue(true);
                mockRestangular.one.and.callFake(() => {
                    const restangularOneElement = jasmine.createSpyObj('restangularOneElement', ['get']);
                    restangularOneElement.get.and.callFake(() => {
                        return Promise.resolve(testEncryptedWorkflowResponse);
                    });
                    return restangularOneElement;
                });
                mockHttp.get.and.returnValue(Promise.resolve({ data: testWorkflowContent }));
                mockPGPCryptoService.decryptStreamedMessage.and.returnValue(Promise.resolve(testWorkflowContent.stream()));
                mockImportService.importJSONStreamed.and.returnValue(Promise.resolve());
            });

            it('should be defined', function () {
               expect(restWorkflowExchangeService.downloadWorkflows).toBeDefined();
            });
            it('should request to login if user is not logged in before downloading', async (done: DoneFn) => {
                mockAuthService.isUserLoggedIn.and.returnValue(false);
                mockAuthService.requestUserLogin.and.returnValue(Promise.resolve(true));
                await restWorkflowExchangeService.downloadWorkflows(downloadSelection);
                expect(mockAuthService.requestUserLogin).toHaveBeenCalled();
                done();
            });
            it('should NOT request to login if user is already logged in before downloading', async (done: DoneFn) => {
                mockAuthService.isUserLoggedIn.and.returnValue(true);
                mockAuthService.requestUserLogin.and.returnValue(Promise.resolve(true));
                await restWorkflowExchangeService.downloadWorkflows(downloadSelection);
                expect(mockAuthService.requestUserLogin).not.toHaveBeenCalled();
                done();
            });
            it('should request the workflow id response from the server', async (done: DoneFn) => {
                await restWorkflowExchangeService.downloadWorkflows(downloadSelection);
                expect(mockRestangular.one).toHaveBeenCalledWith('workflows', downloadSelection.id);
                done();
            });
            it('should download the encrypted workflow content and call the cryptoService to decrypt', async (done: DoneFn) => {
                await restWorkflowExchangeService.downloadWorkflows(downloadSelection);
                expect(mockHttp.get).toHaveBeenCalledWith(testEncryptedWorkflowResponse.content, {responseType: "blob"})
                expect(mockPGPCryptoService.decryptStreamedMessage).toHaveBeenCalledWith({stream: testWorkflowContent.stream(), passphrase: downloadSelection.passphrase});
                expect(mockImportService.importJSONStreamed).toHaveBeenCalledWith(testWorkflowContent.stream());
                done();
            });
        });

        describe("uploadWorkflows", function () {
            const testWorkflow = { id: 1, name: 'workflowName' };
            const testSerializedWorkflows = new Blob(['test']);
            const testEncryptedWorkflows = new Blob(['PGP: encryptedData asdf12e3asdfasdf1gasdf']);
            const testPassphrase = 'abcdefABCDEF0123456789';
            const testPostResult = { id: '1' };
            let formDataContent: Blob | null;

            beforeEach(() => {
                mockAuthService.isUserLoggedIn.and.returnValue(true);
                mockExportService.getSerializedWorkflows.and.returnValue(testSerializedWorkflows);
                mockGenerateRandom256BitHexString.and.returnValue(testPassphrase);
                mockPGPCryptoService.encryptStreamedMessage.and.returnValue(Promise.resolve(testEncryptedWorkflows.stream()));
                mockRestangular.all.and.callFake(() => {
                    const restangularAllElement = jasmine.createSpyObj('restangularAllElement', ['customPOST']);
                    restangularAllElement.customPOST.and.callFake((formData: FormData) => {
                        formDataContent = formData.get('content') as Blob;
                        return Promise.resolve(testPostResult);
                    })
                    return restangularAllElement;
                });
            });

            afterEach(() => {
                formDataContent = null;
            })

            it('should be defined', function () {
                expect(restWorkflowExchangeService.uploadWorkflows).toBeDefined();
            });
            it('should request a login if user is not logged in before uploading', async (done: DoneFn) => {
                mockAuthService.isUserLoggedIn.and.returnValue(false);
                mockAuthService.requestUserLogin.and.returnValue(Promise.resolve(true));
                await restWorkflowExchangeService.uploadWorkflows([testWorkflow.id]);
                expect(mockAuthService.requestUserLogin).toHaveBeenCalled();
                done();
            });
            it('should NOT request a login if user is logged in before uploading', async (done: DoneFn) => {
                mockAuthService.isUserLoggedIn.and.returnValue(true);
                mockAuthService.requestUserLogin.and.returnValue(Promise.resolve(true));
                await restWorkflowExchangeService.uploadWorkflows([testWorkflow.id]);
                expect(mockAuthService.requestUserLogin).not.toHaveBeenCalled();
                done();
            });
            it('should get the serialized workflow content for the selected workflow ids', async (done: DoneFn) => {
                const workflowIds = [ 1, 2, 5];
                await restWorkflowExchangeService.uploadWorkflows(workflowIds);
                expect(mockExportService.getSerializedWorkflows).toHaveBeenCalledWith(workflowIds);
                done();
            });
            it('should encrypt the workflow content with a cryptoService call', async (done: DoneFn) => {
                await restWorkflowExchangeService.uploadWorkflows([testWorkflow.id]);
                expect(mockPGPCryptoService.encryptStreamedMessage).toHaveBeenCalledWith({stream: testSerializedWorkflows.stream(), passphrase: testPassphrase});
                done();
            });
            it('should POST the encrypted workflow content to the server', async (done: DoneFn) => {
                await restWorkflowExchangeService.uploadWorkflows([testWorkflow.id]);
                expect(mockRestangular.all).toHaveBeenCalledWith('workflows');
                const actualContentText = await formDataContent?.text();
                expect(actualContentText).toBe(await testEncryptedWorkflows.text());
                expect(mockRestangular.all).toHaveBeenCalledTimes(1);
                done();
            });
            it('should return the correct URL after uploading, containing the workflow export id and decryption key', async (done: DoneFn) => {
                const uploadResult = await restWorkflowExchangeService.uploadWorkflows([testWorkflow.id]);
                expect(uploadResult).toBe(REST_API_BASE_URL + '/workflows/' + testPostResult.id + '#' + testPassphrase);
                done();
            });
        });
    });
}
