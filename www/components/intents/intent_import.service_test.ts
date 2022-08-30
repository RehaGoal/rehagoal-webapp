"use strict";

module rehagoal.intents {

    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
    type GenerateUriOptions = {exportId: string, decryptionKey: string};

    describe('rehagoal.intents', () => {
        let $rootScope: angular.IRootScopeService;
        let $window: angular.IWindowService;
        let $log: angular.ILogService;
        let $document: angular.IDocumentService;

        const REST_API_BASE_URL = 'https://rehagoal-server.local/api/v2';

        beforeEach(() => angular.mock.module('rehagoal.intents', function ($provide: angular.auto.IProvideService) {

        }));

        beforeEach(() => {
            inject(function (_$rootScope_: angular.IRootScopeService,
                             _$window_: angular.IWindowService,
                             _$log_: angular.ILogService,
                             _$document_: angular.IDocumentService) {
                $rootScope = _$rootScope_;
                $window = _$window_;
                $log = _$log_;
                $document = _$document_;
                spyOn($log, 'info').and.callThrough();
                spyOn($rootScope, '$broadcast').and.callThrough();
                spyOn($document[0], 'addEventListener').and.callFake(function (event: any, callback: Function) {
                    if (event === 'deviceready') {
                        callback();
                    }
                });
            })
        });

        describe('service: IntentImport', () => {
            let intentImportService: rehagoal.intents.IntentImportService;
            let restWorkflowExchangeService: rehagoal.exchange.RESTWorkflowExchangeService;

            beforeEach(inject(function (_intentImportService_,
                                        _restWorkflowExchangeService_) {
                intentImportService = _intentImportService_;
                restWorkflowExchangeService = _restWorkflowExchangeService_;
            }));

            it('test', function () {
                expect(intentImportService).toBeDefined();
            });

            describe('server workflow import', function () {
                let $cordovaToast: ngCordova.IToastService;
                let showLongBottomSpy: jasmine.Spy;
                let downloadWorkflowsSpy: jasmine.Spy;
                const decryptionKey = 'abcdefABCDEF0123456789abcdefABCDEF0123456789abcdefABCDEF01234567';
                const baseUri = REST_API_BASE_URL + '/workflows/';
                const validExportId = 'NCaaKC8h4Xh3';
                const invalidExportId = 'RANDOM';

                beforeEach(inject(function (_$cordovaToast_: ngCordova.IToastService) {
                    $cordovaToast = _$cordovaToast_;
                    showLongBottomSpy = spyOn($cordovaToast, 'showLongBottom');
                }));

                beforeEach(() => {
                    downloadWorkflowsSpy = spyOn(restWorkflowExchangeService, 'downloadWorkflows').and.callFake(() => {
                        return Promise.resolve();
                    });
                });

                function generateURI(options: GenerateUriOptions): string {
                    const uri = baseUri + options.exportId;
                    if (options.decryptionKey) {
                        return uri + "#" + decryptionKey;
                    } else {
                        return uri;
                    }
                }

                function expectSuccesfulImportToast() {
                    expect(showLongBottomSpy.calls.argsFor(1)).toEqual(['Workflows vom Server importiert!']);
                }

                function expectReceivedIntentToast(url: string, callIndex: number = 0) {
                    expect(showLongBottomSpy.calls.argsFor(callIndex)).toEqual([`Received intent: ${url}`]);
                }

                it('should handle an import intent and call import for a VALID link with decryption key', async function (done: DoneFn) {
                    const exportId = validExportId;
                    const uri = generateURI({exportId, decryptionKey});
                    await intentImportService.onNewIntent(uri);
                    expect(restWorkflowExchangeService.downloadWorkflows).toHaveBeenCalledWith({id: exportId, passphrase: decryptionKey});
                    expect($cordovaToast.showLongBottom).toHaveBeenCalledTimes(2);
                    expectReceivedIntentToast(`${baseUri}${validExportId}`);
                    expectSuccesfulImportToast();
                    done();
                });

                it('should handle rejections of downloadWorkflows (server error)', async function (done: DoneFn) {
                    const exportId = validExportId;
                    const uri = generateURI({exportId, decryptionKey});
                    downloadWorkflowsSpy.and.returnValue(Promise.reject({status: 500, statusText: "Server Error: test error"}));
                    await expectThrowsAsync(async () => intentImportService.onNewIntent(uri),
                        'Workflows konnten nicht vom Server geladen werden! (Code: 500)');
                    expect(restWorkflowExchangeService.downloadWorkflows).toHaveBeenCalledWith({id: exportId, passphrase: decryptionKey});
                    expect($cordovaToast.showLongBottom).toHaveBeenCalledTimes(1);
                    expectReceivedIntentToast(`${baseUri}${validExportId}`);
                    done();
                });

                it('should handle rejections of downloadWorkflows (generic error)', async function (done: DoneFn) {
                    const exportId = validExportId;
                    const uri = generateURI({exportId, decryptionKey});
                    downloadWorkflowsSpy.and.returnValue(Promise.reject(new Error('test error')));
                    await expectThrowsAsync(async () => intentImportService.onNewIntent(uri),
                        'Workflows konnten nicht vom Server geladen werden! ');
                    expect(restWorkflowExchangeService.downloadWorkflows).toHaveBeenCalledWith({id: exportId, passphrase: decryptionKey});
                    expect($cordovaToast.showLongBottom).toHaveBeenCalledTimes(1);
                    expectReceivedIntentToast(`${baseUri}${validExportId}`);
                    done();
                });

                it('should NOT handle an import intent and call import for an INVALID id', async function (done: DoneFn) {
                    const exportIds = [
                        invalidExportId,
                        'RANDOMRAN./,',
                        'RANDOMRANDO\n'
                    ];
                    for (const [i, exportId] of exportIds.entries()) {
                        const uri = generateURI({exportId, decryptionKey});
                        await expectThrowsAsync(() => intentImportService.onNewIntent(uri), 'Workflow-Link enthält keine gültige Workflow-ID. Import gescheitert.');
                        expect(restWorkflowExchangeService.downloadWorkflows).not.toHaveBeenCalledWith({id: exportId, passphrase: decryptionKey});
                        expectReceivedIntentToast(`${baseUri}${exportId.trim()}`, i);
                    }
                    expect($cordovaToast.showLongBottom).toHaveBeenCalledTimes(exportIds.length);
                    done();
                });

                it('should NOT handle an import intent if decryption key is missing within the url', async function (done: DoneFn) {
                    const uri = generateURI({exportId: validExportId, decryptionKey: ''});
                    $rootScope.$broadcast('intent', uri);
                    await expectThrowsAsync(() => intentImportService.onNewIntent(uri), 'Workflow-Link enthält keinen Entschlüsselungscode. Import gescheitert.');
                    expectReceivedIntentToast(`${baseUri}${validExportId}`);
                    expect($cordovaToast.showLongBottom).toHaveBeenCalledTimes(1);
                    expect($log.info).toHaveBeenCalledWith('No file decryption key within url, aborting!');
                    expect(restWorkflowExchangeService.downloadWorkflows).not.toHaveBeenCalled();
                    done();
                });

                it('should NOT handle an import intent if INVALID link appears', async function (done: DoneFn) {
                    const uriWithoutDecryptionKey = 'http://127.0.0.1:1234/api/v2/workflows/' + validExportId;
                    const uri = uriWithoutDecryptionKey + "#" + decryptionKey;
                    $rootScope.$broadcast('intent', uri);
                    await expectThrowsAsync(() => intentImportService.onNewIntent(uri), 'Intent does not match server URL, aborting.');
                    expectReceivedIntentToast(uriWithoutDecryptionKey);
                    expect($cordovaToast.showLongBottom).toHaveBeenCalledTimes(1);
                    done();
                });

                it('should reject loading if uri can not be parsed as an URL', async (done: DoneFn) => {
                    await expectThrowsAsync(() => intentImportService.onNewIntent('invalidUri'), 'Eingegebene URL konnte nicht gelesen werden.');
                    done();
                })
            });
        });
    });
}
