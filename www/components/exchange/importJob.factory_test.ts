module rehagoal.exchange {
    import ImageService = rehagoal.images.ImageService;
    import Spy = jasmine.Spy;
    import IProgressBar = rehagoal.overviewView.IProgressBar;
    describe('importJob.factory', function () {
        let importJobFactory: (task: ImportTask) => IImportJob;
        let workflowService: IWorkflowService;
        let imageService: ImageService;
        let settingsService: SettingsService;
        let $log: angular.ILogService;
        let $rootScope: angular.IRootScopeService;
        let fakeHashFile: jasmine.Spy;

        beforeEach(() => angular.mock.module('rehagoal.exchange', function ($provide: angular.auto.IProvideService) {
            fakeHashFile = jasmine.createSpy('hashFile');
            $provide.value('hashFile', fakeHashFile);
        }));

        beforeEach(() => angular.mock.inject(function (_importJobFactory_: (task: ImportTask) => IImportJob,
                                                       _workflowService_: IWorkflowService,
                                                       _imageService_: ImageService,
                                                       _settingsService_: SettingsService,
                                                       _$log_: angular.ILogService,
                                                       _$rootScope_: angular.IRootScopeService) {

            importJobFactory = _importJobFactory_;
            workflowService = _workflowService_;
            imageService = _imageService_;
            settingsService = _settingsService_;
            $log = _$log_;
            $rootScope = _$rootScope_;
        }));

        describe("import job", function () {
            const currentStorageVersion = 3;

            let newWorkflowSpy: Spy;
            let $logWarnSpy: Spy;
            let $logDebugSpy: Spy;
            let $logErrorSpy: Spy;
            let $rootScopeBroadcastSpy: Spy;

            function makeStringImportJob(workflowJSON: string): IImportJob {
                return importJobFactory({
                    type: 'string',
                    workflowJSON
                })
            }

            function makeStreamImportJob(workflowJSON: string): IImportJob {
                let jsonStream: ReadableStream<Uint8Array> | undefined;
                if (workflowJSON !== undefined) {
                    jsonStream = new Blob([workflowJSON]).stream();
                }
                return importJobFactory({
                    type: 'stream',
                    jsonStream: jsonStream as ReadableStream<Uint8Array> // allow passing undefined for the test
                });
            }

            function expectProgressFinished(progressData: IProgressBar) {
                expect(progressData.finished).toBe(true);
                expect(progressData.eventsTotal).toBe(progressData.eventsCount);
            }


            beforeEach(() => {
                const defaultWorkflowId: number = 42;
                const fakeNewWorkflow: typeof workflowService.newWorkflow = function (name: string, xml: string, uuid?: string) {
                    return Promise.resolve ({
                        id: defaultWorkflowId,
                        name: name,
                        workspaceXml: xml,
                        xmlHash: "",
                        uuid: "",
                        hash: ""
                    });
                };
                newWorkflowSpy = spyOn(workflowService, 'newWorkflow').and.callFake(fakeNewWorkflow);

                const fakeDeleteWorkflowById: typeof workflowService.deleteWorkflowById = function(id: number) { return Promise.resolve() };
                spyOn(workflowService, 'deleteWorkflowById').and.callFake(fakeDeleteWorkflowById);

                spyOn(imageService, 'storeImageAs').and.returnValue(Promise.resolve());
                spyOn(imageService, 'removeWorkflowImages').and.returnValue(Promise.resolve());

                $logDebugSpy = spyOn($log, 'debug').and.callThrough();
                $logWarnSpy = spyOn($log, 'warn').and.callThrough();
                $logErrorSpy = spyOn($log, 'error').and.callThrough();

                $rootScopeBroadcastSpy = spyOn($rootScope, '$broadcast').and.callThrough();

                settingsService.studyModeEnabled = false;
            });

            describe('behaviour and functions', function () {

                /**
                 * helper function that creates a map with one element from its two parameters
                 * @param key - the key of the map
                 * @param value - the value of the map
                 * @return {object}
                 */
                function mapKeyToValue(key: string | number, value: any): object {
                    let obj = {};
                    obj[key] = value;
                    return obj;
                }

                function createJSON(dataUri: any): string {
                    return angular.toJson({
                        "version": currentStorageVersion,
                        "workflows":
                            [{
                                "id": 0,
                                "name": "test",
                                "workspaceXml": "",
                                "remoteId": null,
                                "uuid": "",
                                "xmlHash": "",
                                "images": {test: hash}
                            }],
                        "images": mapKeyToValue(hash, dataUri)
                    });
                }

                type ImportJobFromStringFn = (json: string) => IImportJob;

                const hash: string = "b6305ae2f3b208ab140fd5d9a88a6d71fdc3eacc8522f56bd2346141fbee6361";
                const validDataURI: string = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAWSURBVBhXYwCC/yAAosEsJAEYg+E/AJCkFOwNjsKOAAAAAElFTkSuQmC";

                describe('start', function () {
                    const image1DataURI: string = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAWSURBVBhXYwCC/yAAosEsJAEYg+E/AJCkFOwNjsKOAAAAAElFTkSuQmA=";
                    const image1Hash: string = "b6305ae2f3b208ab140fd5d9a88a6d71fdc3eacc8522f56bd2346141fbee6361";
                    const image2DataURI: string = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7CAAAOwgEVKEqAAAAAB3RJTUUH4goMCAkTzFEcHwAAAB5JREFUCNc9ybENAAAIAyDi/ze3DiayAg1FJxjE+Vm/cQn3i8A+1AAAAABJRU5ErkJggg==";
                    const image2Hash: string = "29fc29be8b13e4780110344d2e722bce301a88e1474046db7b92f5b2c5893fc5";

                    let twoImagesMap: Object = {};
                    twoImagesMap[image1Hash] = image1DataURI;
                    twoImagesMap[image2Hash] = image2DataURI;

                    const noImagesJSON: string = angular.toJson({
                        "version": 1,
                        "workflows":
                            [{
                                "id": 0,
                                "name": "test",
                                "workspaceXml": "<testData>exampleWorkspaceXml</testData>",
                                "remoteId": null
                            }]
                    });
                    const noImagesJSONVersion3: string = angular.toJson({
                        "version": 3,
                        "workflows":
                            [{
                                "id": 0,
                                "name": "test",
                                "workspaceXml": "<testData>example2WorkspaceXml</testData>",
                                "uuid": "",
                                "xmlHash": "",
                                "remoteId": null
                            }]
                    });
                    const noWorkflowImagesJSON: string = angular.toJson({
                        "version": 2,
                        "workflows":
                            [{
                                "id": 0,
                                "name": "test",
                                "workspaceXml": "",
                                "remoteId": null
                            }],
                        "images": {}
                    });
                    const validImageJSON: string = createJSON(validDataURI);
                    const twoWorkflowsJSON: string = angular.toJson({
                        "version": 2,
                        "workflows":
                            [{
                                "id": 1,
                                "name": "first",
                                "workspaceXml": "firstXml",
                                "remoteId": null,
                                "images": {}
                            },
                                {
                                    "id": 2,
                                    "name": "second",
                                    "workspaceXml": "secondXml",
                                    "remoteId": null,
                                    "images": {}
                                }],
                        "images": {}
                    });
                    const wrongImageHashValidDataURIJSON: string = angular.toJson({
                        "version": 2,
                        "workflows":
                            [{
                                "id": 0,
                                "name": "test",
                                "workspaceXml": "",
                                "remoteId": null,
                                "images": {}
                            }],
                        "images": mapKeyToValue(hash, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAWSURBVBhXYwCC/yAAosEsJAEYg+E/AJCkFOwNjsKOAAAAAElFTkSuQmCC")

                    });
                    const twoImagesJson: string = angular.toJson({
                        "version": 2,
                        "workflows":
                            [{
                                "id": 0,
                                "name": "test",
                                "workspaceXml": "",
                                "remoteId": null,
                                "images": {image1: image1Hash, image2: image2Hash}
                            }],
                        "images": twoImagesMap
                    });
                    const oneImageMultipleImageDataJson: string = angular.toJson({
                        "version": 2,
                        "workflows":
                            [{
                                "id": 0,
                                "name": "test",
                                "workspaceXml": "",
                                "remoteId": null,
                                "images": {image1: image1Hash}
                            }],
                        "images": twoImagesMap
                    });

                    function importJobStartTestSuite(importJobFromStringFn: ImportJobFromStringFn) {
                        it('should import an old workflow without images', async function (done: DoneFn) {
                            let importJob: IImportJob = importJobFromStringFn(noImagesJSON);

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(workflowService.newWorkflow).toHaveBeenCalledWith('test', '<testData>exampleWorkspaceXml</testData>', undefined);
                                expect(imageService.storeImageAs).not.toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should import a new workflow without images', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(noImagesJSONVersion3);

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(workflowService.newWorkflow).toHaveBeenCalledWith('test', '<testData>example2WorkspaceXml</testData>', '');
                                expect(imageService.storeImageAs).not.toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should not import images if the workflow contains no images', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(noImagesJSON);

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(workflowService.newWorkflow).toHaveBeenCalled();
                                expect(imageService.storeImageAs).not.toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should not be rejected if the JSON includes an images property while not including a workflow.images property', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(noWorkflowImagesJSON);

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(workflowService.newWorkflow).toHaveBeenCalled();
                                expect(imageService.storeImageAs).not.toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should call storeImageAs if the workflow contains any images', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(validImageJSON);
                            fakeHashFile.and.returnValue(Promise.resolve(hash));

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(imageService.storeImageAs).toHaveBeenCalled();
                                expect(workflowService.newWorkflow).toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should log a warning if the version is not matching the currentVersion, while still creating a new workflow', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(noImagesJSON);

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect($logDebugSpy).toHaveBeenCalledWith('Version of stored data does not match current version. Data might be incompatible!');
                                expect(workflowService.newWorkflow).toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should create two new workflows if the JSON includes two workflows', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(twoWorkflowsJSON);

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(workflowService.newWorkflow).toHaveBeenCalledTimes(2);
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should not import any images if the images hash of the json file do not match any images', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(wrongImageHashValidDataURIJSON);
                            fakeHashFile.and.returnValue(Promise.resolve(hash));

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(workflowService.newWorkflow).toHaveBeenCalled();
                                expect(imageService.storeImageAs).not.toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should import a workflow with images if the json contains images', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(twoImagesJson);
                            fakeHashFile.and.returnValues(Promise.resolve(image1Hash), Promise.resolve(image2Hash));

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(workflowService.newWorkflow).toHaveBeenCalledTimes(1);
                                expect(imageService.storeImageAs).toHaveBeenCalledTimes(2);
                                expect(imageService.storeImageAs).toHaveBeenCalledWith(jasmine.any(Number), "image1", jasmine.any(Blob), true);
                                expect(imageService.storeImageAs).toHaveBeenCalledWith(jasmine.any(Number), "image2", jasmine.any(Blob), true);
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should only import images which are referenced in the workflows, ignoring any other images', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(oneImageMultipleImageDataJson);
                            fakeHashFile.and.returnValues(Promise.resolve(image1Hash), Promise.resolve(image2Hash));

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect(workflowService.newWorkflow).toHaveBeenCalledTimes(1);
                                expect(imageService.storeImageAs).toHaveBeenCalledTimes(1);
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });
                        it('should log a warning if the uuid attribute is missing, while still creating a new workflow (only preStudyMode)', async function (done: DoneFn) {
                            let importJob = importJobFromStringFn(noImagesJSON);

                            await tryOrFailAsync(async function () {
                                await importJob.start();
                                expect($logWarnSpy.calls.mostRecent().args[0]).toMatch(/Missing uuid property of a workflow in import!/);
                                expect(workflowService.newWorkflow).toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                            });
                            done();
                        });

                        describe('should be rejected if', function () {
                            async function expectImportToThrowWithoutImageImport(json: string, done?: DoneFn) {
                                let importJob = importJobFromStringFn(json);
                                await expectThrowsAsync(importJob.start, "Images property is damaged and can't be correctly decoded!");
                                expect(workflowService.newWorkflow).not.toHaveBeenCalled();
                                expect(imageService.removeWorkflowImages).not.toHaveBeenCalled();
                                expect(workflowService.deleteWorkflowById).not.toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                                if (done !== undefined) {
                                    done();
                                }
                            }

                            async function expectImportToThrowWithoutWorkflowImport(json: string, errorMsg: string | RegExp, done?: DoneFn) {
                                let importJob = importJobFromStringFn(json);
                                await expectThrowsAsync(importJob.start, errorMsg);
                                expect(workflowService.newWorkflow).not.toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                                if (done !== undefined) {
                                    done();
                                }
                            }

                            const noImagesDataJSON: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "id": 0,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {}
                                    }]
                            });
                            const imagesIsArrayJSON: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "id": 0,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {"name": hash}
                                    }],
                                "images": []
                            });
                            const imagesIsNullJSON: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "id": 0,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {"name": hash}
                                    }],
                                "images": null
                            });
                            const noVersionJSON: string = angular.toJson({
                                "workflows":
                                    [{
                                        "id": 0,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {}
                                    }],
                                "images": {}
                            });
                            const noWorkflowsJSON: string = angular.toJson({
                                "version": 1,
                                "images": {}
                            });
                            const noWorkflowsArrayJSON: string = angular.toJson({
                                "version": 2,
                                "workflows": {},
                                "images": {}
                            });
                            const noWorkflowIdJSON: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {}
                                    }],
                                "images": {}
                            });
                            const noWorkflowXmlJSON: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "id": 1,
                                        "name": "test",
                                        "remoteId": null,
                                        "images": {}
                                    }],
                                "images": {}
                            });
                            const noWorkflowUuidV3JSON: string = angular.toJson({
                                "version": 3,
                                "workflows":
                                    [{
                                        "id": 1,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "xmlHash": "",
                                        "images": {}
                                    }],
                                "images": {}
                            });
                            const noWorkflowNameJSON: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "id": 0,
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {}
                                    }],
                                "images": {}
                            });
                            const invalidJSON = "{{}";
                            const invalidVersionJSON: string = angular.toJson({
                                "version": 999,
                                "workflows":
                                    [{
                                        "id": 0,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {}
                                    }],
                                "images": {}
                            });
                            const invalidImageDataJSON: string = createJSON("data:image/png;base64,error");
                            const invalidImageTypeJSON: string = createJSON("datas:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAWSURBVBhXYwCC/yAAosEsJAEYg+E/AJCkFOwNjsKOAAAAAElFTkSuQmCC");
                            const invalidImageTypeDataURIJSON: string = createJSON("data:invalid;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAWSURBVBhXYwCC/yAAosEsJAEYg+E/AJCkFOwNjsKOAAAAAElFTkSuQmCC");
                            const notMatchingimageReferencesJSON: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "id": 0,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {test: '49421ca7bca3da85d095890b4c22a5788d5f84c82dcf41062ce5badd82f1b23f'}
                                    }],
                                "images": mapKeyToValue(hash, validDataURI)
                            });
                            const hashTooShortWorkflowsJSON: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "id": 0,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {test: '#'}
                                    }],
                                "images": mapKeyToValue(hash, validDataURI)
                            });
                            const emptyDataURIJSON: string = createJSON("");
                            const nullDataURIJSON: string = createJSON(null);
                            const objDataURIJSON: string = createJSON({});
                            const undefinedDataURIJSON: string = createJSON(undefined);
                            const oneImageDataMissingJson: string = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [{
                                        "id": 0,
                                        "name": "test",
                                        "workspaceXml": "",
                                        "remoteId": null,
                                        "images": {
                                            image1: image1Hash,
                                            image2: image2Hash,
                                            image3: '12fc29be8b13e4780110344d2e722bce301a88e1474046db7b92f5b2c5893fc5'
                                        }
                                    }],
                                "images": twoImagesMap
                            });

                            it('no json is provided for the construction of the importJob', async function (done: DoneFn) {
                                /** cast "undefined" as any here
                                 *  because importJson (which calls importJob.start()) is in a typescript file,
                                 *  it is itself called from a javascript file which might call it without parameter
                                 */
                                // TODO: Maybe unify error messages or differentiate between stream or string test case?
                                //       Otherwise it is allowed that string parsing throws an error regarding a stream...
                                await expectImportToThrowWithoutWorkflowImport(undefined as any,
                                    /Expected argument workflowJSON not to be undefined.|Expected stream import task or invalid stream/, done);
                            });
                            it('the version is missing from JSON', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(noVersionJSON, 'Missing version information for workflow import! JSON is corrupted!', done);
                            });
                            it('the version is newer than the current workflow version from JSON', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(invalidVersionJSON, 'Workflow import version is newer than current workflow version', done);
                            });
                            it('the version is older than the current workflow version from JSON and studyModeEnabled is true', async function (done: DoneFn) {
                                settingsService.studyModeEnabled = true;
                                await expectImportToThrowWithoutWorkflowImport(twoWorkflowsJSON, 'Workflow import of older version is not allowed if studyMode is enabled', done)
                            });
                            it('the uuid attribute is missing for a workflow if studyModeEnabled is true', async function (done: DoneFn) {
                                settingsService.studyModeEnabled = true;
                                await expectImportToThrowWithoutWorkflowImport(noWorkflowUuidV3JSON, 'Missing uuid property of a workflow in import!', done);
                            });
                            it('no workflowXml is contained inside a workflow', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(noWorkflowXmlJSON, 'Missing workspaceXml property of a workflow in import!', done);
                            });
                            it('the JSON is not correctly formatted', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(invalidJSON, 'Could not parse workflow json');
                                done();
                            });
                            it('the JSON does not include the workflows property', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(noWorkflowsJSON, 'Missing workflows property in import!', done);
                            });
                            it('the JSON does not include a workflows property which is an array', async function (done) {
                                await expectImportToThrowWithoutWorkflowImport(noWorkflowsArrayJSON, 'workflows property is not an array!', done);
                            });
                            it('the JSON includes a workflow without an id property', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(noWorkflowIdJSON, 'Missing id property of a workflow in import!', done);
                            });
                            it('the JSON includes a workflow without a name property', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(noWorkflowNameJSON, 'Missing name property of a workflow in import!', done);
                            });
                            it('the JSON includes a workflow.images property while not including an images property', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(noImagesDataJSON, 'Missing images property in import, while workflow contains images!', done);
                            });
                            it('images property is an array instead of an object', async function(done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(imagesIsArrayJSON, 'images property is not an object, or is an array!', done);
                            });
                            it('images property is null instead of an object', async function(done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(imagesIsNullJSON, 'images property is not an object, or is an array!', done);
                            });
                            it('images includes a dataUri with invalid data', async function (done: DoneFn) {
                                await expectImportToThrowWithoutImageImport(invalidImageDataJSON, done);
                            });
                            it('images includes a dataUri with invalid type', async function (done: DoneFn) {
                                await expectImportToThrowWithoutImageImport(invalidImageTypeJSON, done);
                            });
                            it('the type of the dataURI is not an image', async function (done: DoneFn) {
                                await expectImportToThrowWithoutImageImport(invalidImageTypeDataURIJSON, done);
                            });
                            it('images includes an empty dataURI', async function (done: DoneFn) {
                                await expectImportToThrowWithoutImageImport(emptyDataURIJSON, done);
                            });
                            it('images includes a dataURI which is null', async function (done: DoneFn) {
                                await expectImportToThrowWithoutImageImport(nullDataURIJSON, done);
                            });
                            it('images includes a dataURI which is an object', async function (done: DoneFn) {
                                await expectImportToThrowWithoutImageImport(objDataURIJSON, done);
                            });
                            it('images includes a dataURI which is undefined', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(undefinedDataURIJSON, 'Workflow references an image hash for which no image data exists!', done);
                            });
                            it('an image hash referenced in the workflows is not contained in the images property', async function (done: DoneFn) {
                                fakeHashFile.and.returnValues(Promise.resolve(image1Hash));
                                await expectImportToThrowWithoutWorkflowImport(notMatchingimageReferencesJSON, 'Workflow references an image hash for which no image data exists!', done);
                            });
                            it('the length of an image hash referenced in the workflows is not equal to the standard hash length', async function (done: DoneFn) {
                                await expectImportToThrowWithoutWorkflowImport(hashTooShortWorkflowsJSON, 'Image hash referenced in a workflow is too short or too long to be valid!', done);
                            });
                            it('any of multiple workflow images have no imageData in the JSON file', async function (done: DoneFn) {
                                fakeHashFile.and.returnValues(Promise.resolve(image1Hash), Promise.resolve(image2Hash));
                                await expectImportToThrowWithoutWorkflowImport(oneImageDataMissingJson, 'Workflow references an image hash for which no image data exists!', done);
                            });
                            it('a workflow image hash does not match the calculated hash', async function (done: DoneFn) {
                                fakeHashFile.and.returnValue(Promise.resolve('randomHash'));
                                let importJob = importJobFromStringFn(validImageJSON);
                                await expectThrowsAsync(async () => importJob.start(), 'Image hash does not match image data.');
                                expect(workflowService.newWorkflow).not.toHaveBeenCalled();
                                expect(imageService.removeWorkflowImages).not.toHaveBeenCalled();
                                expect(workflowService.deleteWorkflowById).not.toHaveBeenCalled();
                                expect(imageService.storeImageAs).not.toHaveBeenCalled();
                                expectProgressFinished(importJob.getProgressData());
                                done();
                            });
                        });

                        describe('getProgress and import progress broadcasts', function () {
                            const IMPORT_PROGRESS_UPDATE_EVENT: string = "update_import_progress";

                            const fiveWorkflowsJSON = angular.toJson({
                                "version": 2,
                                "workflows":
                                    [
                                        {
                                            "id": 1,
                                            "name": "first",
                                            "workspaceXml": "firstXml",
                                            "remoteId": null,
                                            "images": {}
                                        },
                                        {
                                            "id": 2,
                                            "name": "second",
                                            "workspaceXml": "secondXml",
                                            "remoteId": null,
                                            "images": {}
                                        },
                                        {
                                            "id": 3,
                                            "name": "third",
                                            "workspaceXml": "thirdXml",
                                            "remoteId": null,
                                            "images": {}
                                        },
                                        {
                                            "id": 4,
                                            "name": "second",
                                            "workspaceXml": "secondXml",
                                            "remoteId": null,
                                            "images": {}
                                        },
                                        {
                                            "id": 5,
                                            "name": "third",
                                            "workspaceXml": "thirdXml",
                                            "remoteId": null,
                                            "images": {}
                                        }],
                                "images": {}
                            });

                            /** the $broadcast calls should always be the constant IMPORT_PROGRESS_UPDATE_EVENT different times
                             * number of broadcasts: amount of workflows + amount of images + 1 all workflows finished
                             * @param broadcasts - number of broadcasts expected
                             */
                            function createExpectedArguments(broadcasts: number) {
                                let expectedArguments = [];
                                for (let i = 0; i < broadcasts; i++) {
                                    expectedArguments.push([IMPORT_PROGRESS_UPDATE_EVENT]);
                                }
                                return expectedArguments;
                            }

                            async function testProgressUpdateAndBroadcasts(json: string, events: number, broadcasts: number, done?: DoneFn, hashes?: string[]) {
                                // FIXME: events argument not used?
                                // TODO: Maybe move this to testProgressUpdateAndBroadcastsStringImport/testProgressUpdateAndBroadcastsStreamedImport?
                                let importJob: IImportJob = importJobFromStringFn(json);
                                if (hashes !== undefined) {
                                    fakeHashFile.and.returnValues(...hashes);
                                }
                                // TODO: Wrong return type do we need this mock really?
                                //spyOn(window, 'atob').and.returnValue(Promise.resolve());
                                // TODO: Do we need this mock really? Its also rather dirty to create empty blobs here...
                                //spyOn(window, 'Blob').and.returnValue(new Blob());
                                expect(importJob.getProgressData().eventsCount).toEqual(0);

                                await tryOrFailAsync(async () => {
                                    await importJob.start();
                                    expectProgressFinished(importJob.getProgressData());

                                    const actualArguments = $rootScopeBroadcastSpy.calls.allArgs();
                                    const expectedArguments = createExpectedArguments(broadcasts);
                                    expect(actualArguments).toEqual(expectedArguments);
                                });

                                if (done !== undefined) {
                                    done();
                                }
                            }

                            beforeEach(function () {
                                $rootScopeBroadcastSpy.calls.reset();
                            });

                            it('should have a property called getProgressData', function () {
                                let importJob = importJobFromStringFn("");
                                expect(importJob.getProgressData).toBeDefined();
                            });

                            it('should set eventsCount equal to eventsTotal & finish = true on finish', async function (done: DoneFn) {
                                let importJob = importJobFromStringFn(twoWorkflowsJSON);
                                expect(importJob.getProgressData().eventsCount).toEqual(0);

                                await tryOrFailAsync(async () => {
                                    await importJob.start();
                                    expectProgressFinished(importJob.getProgressData());
                                });
                                done();
                            });

                            it('should set eventsCount equal to eventsTotal on failure', async function (done: DoneFn) {
                                let importJob = importJobFromStringFn(twoWorkflowsJSON);
                                newWorkflowSpy.and.throwError("");

                                expect(importJob.getProgressData().eventsCount).toEqual(0);
                                await expectThrowsAsync(importJob.start);
                                expectProgressFinished(importJob.getProgressData());
                                expect(importJob.getProgressData().type).toEqual('danger');
                                done();
                            });

                            /**
                             * With every change of the progressData, an update broadcast will occur
                             * however, the progressData will not be changed on finish while still broadcasting
                             * thus, the number of events + 1 = number of broadcasts
                             * Exception might occur on failure, where the event count will be set directly to the total (as the import is "finished" on failure)
                             */

                            describe('imports without images', function () {
                                it('the $broadcasts should be called twice with IMPORT_PROGRESS_UPDATE_EVENT when importing a workflow without images', async function (done: DoneFn) {
                                    /** number of broadcasts: 1 workflow + 1 all workflows finished */
                                    await testProgressUpdateAndBroadcasts(noImagesJSON, 1, 2, done);
                                });

                                it('the $broadcasts should be called 3 times with IMPORT_PROGRESS_UPDATE_EVENT when importing 2 workflows without images', async function (done: DoneFn) {
                                    /** number of broadcasts: 2 workflows + 1 all workflows finished */
                                    await testProgressUpdateAndBroadcasts(twoWorkflowsJSON, 2, 3, done);
                                });

                                it('the $broadcasts should be called with specific arguments in a specific order when importing 5 workflows without images', async function (done: DoneFn) {
                                    /** number of broadcasts: 5 workflows + 1 all workflows finished */
                                    await testProgressUpdateAndBroadcasts(fiveWorkflowsJSON, 5, 6, done);
                                });
                            });

                            describe('workflows with images', function () {
                                const twoWorkflowsWithImageEachJSON = angular.toJson({
                                    "version": 2,
                                    "workflows":
                                        [
                                            {
                                                "id": 1,
                                                "name": "first",
                                                "workspaceXml": "firstXml",
                                                "remoteId": null,
                                                "images": {image1: image1Hash}
                                            },
                                            {
                                                "id": 2,
                                                "name": "second",
                                                "workspaceXml": "secondXml",
                                                "remoteId": null,
                                                "images": {image2: image2Hash}
                                            }],
                                    "images": twoImagesMap
                                });

                                const image3Hash = "934f3c780cae3654c600b0b90e7530f537c9fdd4e23c0e934835d2f4e0013b4d";
                                let threeImagesMap = {};
                                threeImagesMap[image1Hash] = image1DataURI;
                                threeImagesMap[image2Hash] = image2DataURI;
                                threeImagesMap[image3Hash] =
                                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7CAAAOwgEVKEqAAAAAB3RJTUUH4goMCA8BabLK0QAAACpJREFUCNclwbENwCAMADCH0p0FDuz/FyA1YcCOr2Y9Xr+tEa7QhyWlkg6pkAidB6YIlAAAAABJRU5ErkJggg==";

                                const workflowsWithImages = angular.toJson({
                                    "version": 2,
                                    "workflows":
                                        [
                                            {
                                                "id": 1,
                                                "name": "first",
                                                "workspaceXml": "firstXml",
                                                "remoteId": null,
                                                "images": {image1: image1Hash}
                                            },
                                            {
                                                "id": 2,
                                                "name": "second",
                                                "workspaceXml": "secondXml",
                                                "remoteId": null,
                                                "images": {
                                                    image2: image2Hash,
                                                    image3: image3Hash
                                                }
                                            }
                                        ],
                                    "images": threeImagesMap
                                });

                                const twoWorkflowsWithSameImageJSON = angular.toJson({
                                    "version": 2,
                                    "workflows":
                                        [
                                            {
                                                "id": 1,
                                                "name": "first",
                                                "workspaceXml": "firstXml",
                                                "remoteId": null,
                                                "images": {image1: image1Hash}
                                            },
                                            {
                                                "id": 2,
                                                "name": "second",
                                                "workspaceXml": "secondXml",
                                                "remoteId": null,
                                                "images": {image1: image1Hash}
                                            }],
                                    "images": mapKeyToValue(image1Hash, image1DataURI)
                                });

                                it('the $broadcasts should be called the correct amount of times when importing a workflow with an image', async function (done: DoneFn) {
                                    /** number of broadcasts: 1 workflow + 1 image * 2 [toBlob & toDB] + 1 all workflows finished */
                                    await testProgressUpdateAndBroadcasts(validImageJSON, 2, 4, done, [hash]);
                                });

                                it('the $broadcasts should be called the correct amount of times when importing a workflow with two images', async function (done: DoneFn) {
                                    /** number of broadcasts: 1 workflow + 2 images * 2 [toBlob & toDB] + 1 all workflows finished */
                                    await testProgressUpdateAndBroadcasts(twoImagesJson, 3, 6, done, [image1Hash, image2Hash]);
                                });

                                it('the $broadcasts should be called the correct amount of times when importing two workflow with an image each', async function (done: DoneFn) {
                                    /** number of broadcasts: 2 workflows + 2 images * 2 [toBlob & toDB] + 1 all workflows finished */
                                    await testProgressUpdateAndBroadcasts(twoWorkflowsWithImageEachJSON, 4, 7, done, [image1Hash, image2Hash]);
                                });

                                it('the $broadcasts should be called the correct amount of times when importing multiple workflows with multiple images', async function (done: DoneFn) {
                                    /** number of broadcasts: 2 workflows + 3 image * 2 [toBlob & toDB] + 1 all workflows finished */
                                    await testProgressUpdateAndBroadcasts(workflowsWithImages, 5, 9, done, [image1Hash, image2Hash, image3Hash]);
                                });

                                it('every image should be an event, even if its already uploaded', async function (done: DoneFn) {
                                    /** number of broadcasts: 2 workflows + 1 image [toBlob] + 2 image [toDB] + 1 all workflows finished */
                                    await testProgressUpdateAndBroadcasts(twoWorkflowsWithSameImageJSON, 4, 6, done, [image1Hash, image1Hash]);
                                });
                            });

                            it('should IMPORT_PROGRESS_UPDATE_EVENT on failure', async function (done: DoneFn) {
                                /** this json import fails before any event step could resolve */
                                let importJob = importJobFromStringFn('{{}');

                                await expectThrowsAsync(() => importJob.start());
                                expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                                expect($rootScope.$broadcast).toHaveBeenCalledWith(IMPORT_PROGRESS_UPDATE_EVENT);
                                done();
                            });
                        });
                    }

                    describe('streamed JSON', function() {
                        importJobStartTestSuite(makeStreamImportJob);
                    });
                    describe('string JSON', function() {
                        importJobStartTestSuite(makeStringImportJob);
                    })
                });
            });
        });
    });
}
