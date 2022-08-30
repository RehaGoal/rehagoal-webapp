module rehagoal.overviewView {
    import ImageService = rehagoal.images.ImageService;
    import SpyObj = jasmine.SpyObj;
    import IWorkflowImportService = rehagoal.exchange.IWorkflowImportService;
    import IWorkflowExportService = rehagoal.exchange.IWorkflowExportService;
    import ImagesDatabase = rehagoal.database.ImagesDatabase;
    import ICalendarService = rehagoal.calendar.ICalendarService;
    import IntentImportService = rehagoal.intents.IntentImportService;
    describe('OverviewView module', function () {
        const mockDateValue = '2017-03-02T12:23:08.000Z';
        let mockExportService: SpyObj<IWorkflowExportService>;
        let mockImportService: SpyObj<IWorkflowImportService>;
        let mockReadFileAsText: jasmine.Spy;
        let mockImagesDatabaseService: SpyObj<ImagesDatabase>;
        let mockSettingsService: SpyObj<SettingsService>;
        let mockIntentImportService: SpyObj<IntentImportService>;

        beforeEach(angular.mock.module('rehagoal.overviewView', function ($provide: angular.auto.IProvideService) {
            $provide.decorator('$Date', function ($delegate: DateConstructor) {
                spyOn($delegate.prototype, 'toISOString').and.returnValue(mockDateValue);
                return $delegate;
            });
            mockImportService = jasmine.createSpyObj<IWorkflowImportService>('workflowImportService', ["importJSONStreamed"]);
            mockReadFileAsText = jasmine.createSpy('readFileAsText');
            mockExportService = jasmine.createSpyObj<IWorkflowExportService>('workflowExportService', ['getSerializedWorkflows']);
            mockImagesDatabaseService = jasmine.createSpyObj('imagesDatabaseService', ['removeWorkflowImages']);
            mockImagesDatabaseService.removeWorkflowImages.and.returnValue(Promise.resolve());
            mockSettingsService = jasmine.createSpyObj('settingsService', ['validateStudyModeEnabled']);
            mockIntentImportService = jasmine.createSpyObj<IntentImportService>('intentImportService', ['onNewIntent']);
            $provide.value('settingsService', mockSettingsService);
            $provide.value('workflowExportService', mockExportService);
            $provide.value('workflowImportService', mockImportService);
            $provide.value('imagesDatabaseService', mockImagesDatabaseService);
            $provide.value('readFileAsText', mockReadFileAsText);
            $provide.value('intentImportService', mockIntentImportService);
        }));

        let $componentController: angular.IComponentControllerService;
        let $log: angular.ILogService;
        let $window: angular.IWindowService;
        let workflowService: IWorkflowService;
        let $rootScope: angular.IRootScopeService;
        let imageService: ImageService;

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                        _$window_: angular.IWindowService,
                                        _workflowService_: IWorkflowService,
                                        _$log_: angular.ILogService,
                                        _$rootScope_: angular.IRootScopeService,
                                        _imageService_: ImageService) {
            $componentController = _$componentController_;
            workflowService = _workflowService_;
            $window = _$window_;
            $log = _$log_;
            $rootScope = _$rootScope_;
            imageService = _imageService_;
        }));

        afterEach(function () {
            $log.info.logs.forEach(function (x) {
                console.info(x);
            });
        });

        interface IScopeWithResults extends angular.IScope {
            results: IWorkflow[]
        }

        describe('overviewView controller', function () {
            let bindings;
            let overviewViewCtrl: IOverviewView;
            let $scope: IScopeWithResults;

            beforeEach(function() {
                bindings = {};
                $scope = $rootScope.$new() as IScopeWithResults;
                overviewViewCtrl = $componentController('overviewView',  {$scope: $scope}, bindings);
            });

            describe('properties and methods', function() {
                it('controller should be defined', inject(function () {
                    expect(overviewViewCtrl).toBeDefined();
                }));

                it('should have correct route', inject(function ($route: ng.route.IRouteService) {
                    expect($route.routes['/overview'].template).toEqual('<overview-view></overview-view>');
                }));

                it('should have a property "workflows"', inject(function () {
                    expect(overviewViewCtrl.workflows).toBeDefined();
                }));

                it('should have a property "workflowSelection", default "{ }" ', inject(function () {
                    expect(overviewViewCtrl.workflowSelection).toBeDefined();
                    expect(overviewViewCtrl.workflowSelection.ids).toEqual({ });
                }));

                it('should have a property "workflowSelectAll", default "false" ', inject(function () {
                    expect(overviewViewCtrl.workflowSelectAll).toBeDefined();
                    expect(overviewViewCtrl.workflowSelectAll).toBe(false);
                }));

                it('should have a property "exportUrl", default "#"', inject(function () {
                    expect(overviewViewCtrl.exportUrl).toBeDefined();
                    expect(overviewViewCtrl.exportUrl).toEqual('#');
                }));

                it('should have a method "deleteWorkflow"', inject(function () {
                    expect(overviewViewCtrl.deleteWorkflow).toBeDefined();
                }));

                it('should have a method "beforeRename"', inject(function () {
                    expect(overviewViewCtrl.beforeRename).toBeDefined();
                }));

                it('should have a method "renameWorkflow"', inject(function () {
                    expect(overviewViewCtrl.renameWorkflow).toBeDefined();
                }));

                it('should have a method "newWorkflow"', inject(function () {
                    expect(overviewViewCtrl.newWorkflow).toBeDefined();
                }));

                it('should have a method "exportSelectedWorkflows"', inject(function () {
                    expect(overviewViewCtrl.exportSelectedWorkflows).toBeDefined();
                }));

                it('should have a method "importWorkflows"', inject(function () {
                    expect(overviewViewCtrl.importWorkflows).toBeDefined();
                }));

                it('should have a method "importWorkflowsFromServer"', inject(function () {
                    expect(overviewViewCtrl.importWorkflowsFromServer).toBeDefined();
                }));

                it('should have a method "requestServerImportModal"', inject(function () {
                    expect(overviewViewCtrl.requestServerImportModal).toBeDefined();
                }));

                it('should have a method "deleteSelectedWorkflows"', inject(function () {
                    expect(overviewViewCtrl.deleteSelectedWorkflows).toBeDefined();
                }));

                it('should have a method "manageWorkflowSelectAll"', inject(function () {
                    expect(overviewViewCtrl.updateWorkflowSelectAll).toBeDefined();
                }));

                it('should have a method "toggleSelectAll"', inject(function () {
                    expect(overviewViewCtrl.toggleSelectAll).toBeDefined();
                }));

                it('should have a method "getExportFileName", default "export.json"', inject(function () {
                    expect(overviewViewCtrl.getExportFileName).toBeDefined();

                    const exportName = overviewViewCtrl.getExportFileName();
                    expect(exportName).toEqual('export.json');
                }));

                it('should have a method "duplicateWorkflow"', inject(function () {
                    expect(overviewViewCtrl.duplicateWorkflow).toBeDefined();
                }));
            });

            describe('functional behaviour', function() {
                afterEach(function () {
                    $window.localStorage.clear();
                });

                //TODO: isolate view from other services

                it('should add a new workflow to the list when newWorkflow() is called', async function (done) {
                    const size = overviewViewCtrl.workflows.length;
                    await overviewViewCtrl.newWorkflow();
                    expect(overviewViewCtrl.workflows.length).toEqual(size + 1);
                    done();
                });

                it('should generate data url when exportSelectedWorkflows is invoked', async function (done) {
                    await overviewViewCtrl.exportSelectedWorkflows();
                    expect(overviewViewCtrl.exportUrl).not.toBeNull();
                    done();
                });

                it('should broadcast to open promptModal when requestServerImportModal is called', function() {
                    const rootScopeSpy = spyOn($rootScope, '$broadcast').and.callThrough();
                    overviewViewCtrl.requestServerImportModal();
                    expect(rootScopeSpy).toHaveBeenCalledWith('promptModal.openModalEvent');
                });

                it('should call importJSONStreamed with the right file when importWorkflows is called', function (done) {
                    const testVal = "test";
                    let actualVal: string | undefined;
                    mockImportService.importJSONStreamed.and.callFake(async (stream: ReadableStream<Uint8Array>) => {
                        actualVal = await new Response(stream).text();
                    });
                    overviewViewCtrl.importWorkflows(new Blob([testVal])).then(function () {
                        expect(mockImportService.importJSONStreamed).toHaveBeenCalledWith(jasmine.any(ReadableStream));
                        expect(actualVal).toEqual(testVal);
                        done();
                    });
                });

                it('should call importJSONStreamed with the right file when importWorkflows is called', function (done) {
                    const testVal = "test";
                    let actualVal: string | undefined;
                    mockImportService.importJSONStreamed.and.callFake(async (stream: ReadableStream<Uint8Array>) => {
                        actualVal = await new Response(stream).text();
                        return Promise.reject();
                    });
                    overviewViewCtrl.importWorkflows(new Blob([testVal])).then(function () {
                        fail('promise should have been rejected');
                        done();
                    }, function () {
                        expect(mockImportService.importJSONStreamed).toHaveBeenCalledWith(jasmine.any(ReadableStream));
                        expect(actualVal).toEqual(testVal);
                        done();
                    });
                });

                it('importWorkflows should return if called with invalid param', function () {
                    overviewViewCtrl.importWorkflows(null as any);
                    overviewViewCtrl.importWorkflows(1 as any);

                    expect(mockImportService.importJSONStreamed).not.toHaveBeenCalled();
                    expect(mockReadFileAsText).not.toHaveBeenCalled();
                });

                it('importWorkflows should return successfully if importJSONStreamed resolved', function (done) {
                    spyOn(workflowService, 'getWorkflows').and.callThrough();
                    mockReadFileAsText.and.returnValue(Promise.resolve('test'));
                    mockImportService.importJSONStreamed.and.returnValue(Promise.resolve());

                    overviewViewCtrl.importWorkflows(new Blob()).then(function () {
                        expect(mockImportService.importJSONStreamed).toHaveBeenCalled();
                        $rootScope.$apply();
                        expect(workflowService.getWorkflows).toHaveBeenCalled();
                        done();
                    });
                });

                it ('importWorkflows should not return successfully if importJSONStreamed rejected', function (done) {
                    spyOn($scope, '$broadcast').and.callThrough();

                    const errorMsg = "test error";

                    mockReadFileAsText.and.returnValue(Promise.resolve());
                    mockImportService.importJSONStreamed.and.returnValue(Promise.reject(new Error(errorMsg)));
                    overviewViewCtrl.importWorkflows(new Blob()).then(function () {
                        expect(mockImportService.importJSONStreamed).toHaveBeenCalled();
                        expect($scope.$broadcast).toHaveBeenCalledWith('infoModal.openModal', { modalTitle: 'Fehler beim Import', modalText: 'Error: '+ errorMsg});
                        done();
                    });
                });

                it('should call intentImportService.onNewIntent with a valid url when importWorkflowsFromServer is called', async function (done) {
                    const testVal = "test";
                    mockIntentImportService.onNewIntent.and.returnValue(Promise.resolve());
                    spyOn(workflowService, 'getWorkflows').and.callThrough();
                    await overviewViewCtrl.importWorkflowsFromServer(testVal);
                    expect(mockIntentImportService.onNewIntent).toHaveBeenCalledWith(testVal);
                    expect(workflowService.getWorkflows).toHaveBeenCalled();
                    done();
                });

                it('should NOT call intentImportService.onNewIntent with invalid url when importWorkflowsFromServer is called', async function (done) {
                    spyOn(workflowService, 'getWorkflows').and.callThrough();
                    await overviewViewCtrl.importWorkflowsFromServer('');
                    await overviewViewCtrl.importWorkflowsFromServer(undefined);
                    expect(workflowService.getWorkflows).toHaveBeenCalledTimes(0);
                    done();
                });

                it('should prompt the infoModal containing an error if importWorkflowsFromServer fails to import', async function (done) {
                    const errorMsg = 'import rejected';
                    mockIntentImportService.onNewIntent.and.returnValue(Promise.reject(new Error(errorMsg)));
                    spyOn(workflowService, 'getWorkflows').and.callThrough();
                    spyOn($scope, '$broadcast');

                    await overviewViewCtrl.importWorkflowsFromServer('test');
                    expect(workflowService.getWorkflows).not.toHaveBeenCalled();
                    expect($scope.$broadcast).toHaveBeenCalledWith('infoModal.openModal', { modalTitle: 'Fehler beim Import', modalText: 'Error: ' + errorMsg });
                    done();
                });

                it('should mark all existing workflows as selected', function() {
                    const expectedValue = overviewViewCtrl.workflowSelectAll;
                    $scope.results = overviewViewCtrl.workflows;
                    overviewViewCtrl.toggleSelectAll();
                    for (let id in overviewViewCtrl.workflowSelection.ids) {
                        expect(overviewViewCtrl.workflowSelection.ids[id]).toBe(expectedValue);
                    }
                    overviewViewCtrl.workflowSelectAll = !expectedValue;
                    overviewViewCtrl.toggleSelectAll();
                    for (let id in overviewViewCtrl.workflowSelection.ids) {
                        expect(overviewViewCtrl.workflowSelection.ids[id]).not.toBe(expectedValue);
                    }
                });

                it('should set the property "workflowSelectAll" if all workflows are manually selected', async function(done: DoneFn) {
                    overviewViewCtrl.workflowSelectAll = false;
                    await overviewViewCtrl.newWorkflow();
                    for(let workflow of overviewViewCtrl.workflows){
                        overviewViewCtrl.workflowSelection.ids[workflow.id] = true;
                    }
                    overviewViewCtrl.updateWorkflowSelectAll();
                    expect(overviewViewCtrl.workflowSelectAll).toBe(true);
                    done();
                })

                it('should unset the property "workflowSelectAll" when a new Workflow is added', async function (done: DoneFn) {
                    overviewViewCtrl.workflowSelectAll = true;
                    $scope.results = overviewViewCtrl.workflows;
                    overviewViewCtrl.toggleSelectAll();
                    await overviewViewCtrl.newWorkflow();
                    overviewViewCtrl.updateWorkflowSelectAll();
                    expect(overviewViewCtrl.workflowSelectAll).toBe(false);
                    done();
                })

                it('should unset the property "workflowSelectAll" when a Workflow is duplicated', async function(done: DoneFn) {
                    overviewViewCtrl.workflowSelectAll = true;
                    $scope.results = overviewViewCtrl.workflows;
                    overviewViewCtrl.toggleSelectAll();
                    spyOn(imageService, 'duplicateWorkflowImages').and.returnValue(Promise.resolve());
                    await overviewViewCtrl.duplicateWorkflow(0);
                    expect(overviewViewCtrl.workflowSelectAll).toBe(false);
                    done();
                })


                it('should set the property "workflowSelectAll" when the last unselected Workflow is deleted', async function (done: DoneFn) {
                    $scope.results = overviewViewCtrl.workflows;
                    await overviewViewCtrl.newWorkflow();
                    await overviewViewCtrl.newWorkflow();
                    overviewViewCtrl.workflowSelection.ids[0] = true;
                    expect(overviewViewCtrl.workflowSelectAll).toBe(false);
                    spyOn($window, 'confirm').and.returnValue(true);
                    await overviewViewCtrl.deleteWorkflow(2);
                    expect(overviewViewCtrl.workflowSelectAll).toBe(false);
                    await overviewViewCtrl.deleteWorkflow(1);
                    expect(overviewViewCtrl.workflowSelectAll).toBe(true);
                    done();
                })

                it('should unset the property "workflowSelectAll" when a workflow is unselected', function() {
                    $scope.results = overviewViewCtrl.workflows;
                    overviewViewCtrl.workflowSelectAll = true;
                    overviewViewCtrl.toggleSelectAll();
                    overviewViewCtrl.workflowSelection.ids[0] = false;
                    overviewViewCtrl.updateWorkflowSelectAll();
                    expect(overviewViewCtrl.workflowSelectAll).toBe(false);
                })

                it('should not remember selection after deleting a workflow', async function (done: DoneFn) {
                    $scope.results = overviewViewCtrl.workflows;
                    await overviewViewCtrl.newWorkflow();
                    overviewViewCtrl.workflowSelection.ids[1] = true;
                    spyOn($window, 'confirm').and.returnValue(true);
                    await overviewViewCtrl.deleteWorkflow(1);
                    await overviewViewCtrl.newWorkflow();
                    expect(overviewViewCtrl.workflowSelection.ids[1]).toBeFalsy();
                    done();
                })

                it('should test renaming of a workflow', function() {
                    const workflow = {
                        id: 0,
                        name: 'No First Workflow',
                        workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>",
                        uuid: 'exampleUUID',
                        xmlHash: '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826'
                    };

                    expect(overviewViewCtrl.beforeRename(workflow)).toBe(true);
                    workflow.name = 'First Workflow';
                    overviewViewCtrl.renameWorkflow(workflow);
                    expect(workflow.name).toBe('First Workflow');
                });

                it('should delete all workflows from the list', async function(done) {
                    await overviewViewCtrl.newWorkflow();
                    overviewViewCtrl.workflowSelectAll = true;
                    $scope.results = overviewViewCtrl.workflows;
                    overviewViewCtrl.toggleSelectAll();
                    spyOn($window, 'confirm').and.returnValue(true);
                    const imageServiceRemoveWorkflowImagesSpy = spyOn(imageService, 'removeWorkflowImages').and.callThrough();
                    mockImagesDatabaseService.removeWorkflowImages.and.returnValue(Promise.resolve());
                    await overviewViewCtrl.deleteSelectedWorkflows();
                    $rootScope.$apply();
                    expect(imageService.removeWorkflowImages).toHaveBeenCalledTimes(2);
                    expect(imageServiceRemoveWorkflowImagesSpy.calls.allArgs()).toEqual([[0], [1]]);
                    $rootScope.$apply();
                    expect(overviewViewCtrl.workflows.length).toBe(0);
                    done();
                });

                it('should check if view.updateWorkflows gets called', function() {
                    spyOn(workflowService, 'getWorkflows').and.callThrough();
                    $rootScope.$broadcast('views.updateWorkflows');
                    expect(workflowService.getWorkflows).toHaveBeenCalled();
                });

                it('should check if validateStudyMode gets called after initialization', function() {
                    expect(mockSettingsService.validateStudyModeEnabled).toHaveBeenCalled();
                });

                describe('lastWorkflowNameClicked', function() {
                    it('should be null by default', function() {
                        expect(overviewViewCtrl.lastClickedWorkflow).toBeNull();
                    });
                    it('should change to the passed workflow in handleWorkflowNameClicked', async function (done) {
                        await overviewViewCtrl.newWorkflow();

                        overviewViewCtrl.handleWorkflowNameClicked(overviewViewCtrl.workflows[0]);
                        expect(overviewViewCtrl.lastClickedWorkflow).toBe(overviewViewCtrl.workflows[0]);

                        overviewViewCtrl.handleWorkflowNameClicked(overviewViewCtrl.workflows[1]);
                        expect(overviewViewCtrl.lastClickedWorkflow).toBe(overviewViewCtrl.workflows[1]);

                        done();
                    });
                });

                describe("workflowExportService dependency", function () {
                    let workflow1: IWorkflow, workflow2: IWorkflow;
                    let expectedUrl: string;

                    beforeEach(async function (done) {
                        spyOn($window.URL, 'createObjectURL').and.returnValues("someUrl1", "someUrl2");
                        spyOn($window.URL, 'revokeObjectURL').and.callFake(function(){});
                        expectedUrl = 'something';
                        mockExportService.getSerializedWorkflows.and.returnValue(Promise.resolve(expectedUrl));

                        workflow1 = {
                            id: 0,
                            name: 'first Workflow',
                            workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>",
                            xmlHash: '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826',
                            uuid: 'exampleUUID1'
                        };
                        workflow2 = {
                            id: 1,
                            name: 'second Workflow',
                            workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>",
                            xmlHash: '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826',
                            uuid: 'exampleUUID2'
                        };
                        await overviewViewCtrl.newWorkflow();
                        await workflowService.saveWorkflow(workflow1);
                        await workflowService.saveWorkflow(workflow2);
                        done();
                    });

                    it('should generate data url when exportSelectedWorkflows is invoked', async function (done) {
                        overviewViewCtrl.workflowSelection.ids[workflow1.id] = true;
                        await overviewViewCtrl.exportSelectedWorkflows();
                        $rootScope.$apply();
                        expect(overviewViewCtrl.exportUrl).toBe('someUrl1');
                        expect($window.URL.createObjectURL).toHaveBeenCalledWith(expectedUrl);
                        done();
                    });

                    it('should revoke the old object url if a new export creates a new object url', async function (done) {
                        overviewViewCtrl.workflowSelection.ids[workflow1.id] = true;
                        await overviewViewCtrl.exportSelectedWorkflows();
                        $rootScope.$apply();
                        expect(overviewViewCtrl.exportUrl).toBe('someUrl1');
                        expect($window.URL.createObjectURL).toHaveBeenCalledWith(expectedUrl);

                        overviewViewCtrl.workflowSelection.ids[workflow2.id] = true;
                        await overviewViewCtrl.exportSelectedWorkflows();
                        $rootScope.$apply();
                        expect(overviewViewCtrl.exportUrl).toBe('someUrl2');
                        expect($window.URL.revokeObjectURL).toHaveBeenCalledWith('someUrl1');
                        done();
                    });

                    it('should set the export filename to match selected workflows with valid export ids', async function(done) {
                        overviewViewCtrl.workflowSelection.ids[workflow1.id] = true;
                        expect(Object.keys(overviewViewCtrl.workflowSelection.ids).length).toBe(1);
                        await overviewViewCtrl.exportSelectedWorkflows();
                        $rootScope.$apply();
                        expect(Object.keys(overviewViewCtrl.workflowSelection.ids).length).toBe(0);
                        expect(mockExportService.getSerializedWorkflows).toHaveBeenCalledWith([workflow1.id]);
                        expect(overviewViewCtrl.getExportFileName()).toEqual('first_workflow-2017-03-02#12_23_08.json');
                        overviewViewCtrl.workflowSelection.ids[workflow1.id] = true;
                        overviewViewCtrl.workflowSelection.ids[workflow2.id] = true;
                        expect(Object.keys(overviewViewCtrl.workflowSelection.ids).length).toBe(2);
                        await overviewViewCtrl.exportSelectedWorkflows();
                        $rootScope.$apply();
                        expect(Object.keys(overviewViewCtrl.workflowSelection.ids).length).toBe(0);
                        expect(overviewViewCtrl.getExportFileName()).toEqual('rehagoal-export-2017-03-02#12_23_08.json');
                        done();
                    });
                    it('should not export workflows if workflowExportService rejects', async function(done) {
                        mockExportService.getSerializedWorkflows.and.returnValue(Promise.reject(new Error('something')));
                        overviewViewCtrl.workflowSelection.ids[workflow1.id] = true;
                        await expectThrowsAsync(async () =>  await overviewViewCtrl.exportSelectedWorkflows(), 'something');
                        $rootScope.$apply();
                        expect($window.URL.createObjectURL).not.toHaveBeenCalled();
                        done();
                    });
                    it('should prompt a modal that no workflow id was provided', async function(done) {
                        spyOn($scope, '$broadcast');
                        await overviewViewCtrl.exportSelectedWorkflows();
                        $rootScope.$apply();
                        expect($scope.$broadcast).toHaveBeenCalledTimes(1);
                        done();
                    });
                });

                describe("imageService dependency", function () {
                    let imageService: ImageService;
                    let imageServiceRemoveWorkflowImagesSpy: jasmine.Spy;

                    beforeEach(function() {
                        inject(function ( _imageService_: ImageService) {
                            imageService = _imageService_;
                        });
                    });

                    it('should delete a selected workflow from the list', async function(done) {
                        imageServiceRemoveWorkflowImagesSpy = spyOn(imageService, 'removeWorkflowImages').and.returnValue(Promise.resolve());
                        const size = overviewViewCtrl.workflows.length;
                        await overviewViewCtrl.newWorkflow();
                        expect(overviewViewCtrl.workflows.length).toEqual(size+1);
                        spyOn($window, 'confirm').and.returnValue(true);
                        await overviewViewCtrl.deleteWorkflow(0);
                        expect(imageServiceRemoveWorkflowImagesSpy.calls.allArgs()).toEqual([[0]]);
                        $rootScope.$apply();
                        expect(overviewViewCtrl.workflows.length).toEqual(size);
                        done();
                    });

                    it('should create a workflow copy, when duplicateWorkflow is called', async function(done) {
                        spyOn(imageService, 'duplicateWorkflowImages').and.returnValue(Promise.resolve());
                        expect(overviewViewCtrl.workflows.length).toBe(1);
                        const workflow = overviewViewCtrl.workflows[0];
                        await overviewViewCtrl.duplicateWorkflow(0);
                        $rootScope.$apply();
                        expect(imageService.duplicateWorkflowImages).toHaveBeenCalled();
                        expect(overviewViewCtrl.workflows.length).toBe(2);
                        const workflowCopy = overviewViewCtrl.workflows[1];
                        expect(workflowCopy.name).toContain(workflow.name);
                        expect(workflowCopy.name).not.toEqual(workflow.name);
                        expect(workflowCopy.workspaceXml).toBe(workflow.workspaceXml);
                        expect(workflowCopy.uuid).toBe(workflow.uuid);
                        done();
                    });

                    it('should NOT create a workflow copy, when duplicateWorkflow returns with an error', async function (done) {
                        spyOn(imageService, 'duplicateWorkflowImages').and.returnValue(Promise.reject(new Error('test error')));
                        spyOn(imageService, 'removeWorkflowImages').and.returnValue(Promise.resolve());
                        spyOn($window, 'confirm').and.returnValue(true);
                        expect(overviewViewCtrl.workflows.length).toBe(1);
                        await expectThrowsAsync(async () => {
                            await overviewViewCtrl.duplicateWorkflow(0);
                        });
                        $rootScope.$apply();
                        expect(imageService.duplicateWorkflowImages).toHaveBeenCalled();
                        expect(overviewViewCtrl.workflows.length).toBe(1);
                        done();
                    });
                });

                describe("calendarService dependency", function () {
                    let calendarService: ICalendarService;
                    let removeWorkflowFromCalendarEventsAndGetDeletedEventsSpy: jasmine.Spy;

                    let testWorkflow: IWorkflow;
                    let workflow1: IWorkflow;
                    let workflow2: IWorkflow;
                    let workflow3: IWorkflow;

                    beforeEach(async function(done) {
                        await overviewViewCtrl.newWorkflow();
                        await overviewViewCtrl.newWorkflow();
                        await overviewViewCtrl.newWorkflow();
                        $rootScope.$apply();
                        expect(overviewViewCtrl.workflows.length).toBe(3 + 1);
                        testWorkflow = workflowService.getWorkflowById(0)!;
                        workflow1 = workflowService.getWorkflowById(1)!;
                        workflow2 = workflowService.getWorkflowById(2)!;
                        workflow3 = workflowService.getWorkflowById(3)!;
                        done();
                    });

                    beforeEach(function() {
                        inject(function ( _calendarService_: ICalendarService) {
                            calendarService = _calendarService_;
                            removeWorkflowFromCalendarEventsAndGetDeletedEventsSpy =
                                spyOn(calendarService, 'removeWorkflowFromCalendarEventsAndGetDeletedEvents')
                                    .and.returnValue(Promise.resolve([]));
                        });
                    });

                    describe('deleteSelectedWorfklows', function () {

                        it('should remove workflows from calendar events (3 workflows)', async function (done) {
                            spyOn($window, 'confirm').and.returnValues(true, true);
                            overviewViewCtrl.workflowSelection.ids = {0: true, 1: true, 3: true};
                            await overviewViewCtrl.deleteSelectedWorkflows();
                            expect($window.confirm).toHaveBeenCalledTimes(2);
                            $rootScope.$apply();
                            expect(calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents).toHaveBeenCalledTimes(3);
                            expect(removeWorkflowFromCalendarEventsAndGetDeletedEventsSpy.calls.allArgs()).toEqual([[0], [1], [3]]);
                            expect(overviewViewCtrl.workflows.length).toBe(1);
                            done();
                        });
                        it('should remove workflows from calendar events (1 workflow)', async function (done) {
                            spyOn($window, 'confirm').and.returnValues(true, true);
                            overviewViewCtrl.workflowSelection.ids = {1: true};
                            await overviewViewCtrl.deleteSelectedWorkflows();
                            expect($window.confirm).toHaveBeenCalledTimes(2);
                            $rootScope.$apply();
                            expect(calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents).toHaveBeenCalledTimes(1);
                            expect(removeWorkflowFromCalendarEventsAndGetDeletedEventsSpy.calls.allArgs()).toEqual([[1]]);
                            expect(overviewViewCtrl.workflows.length).toBe(3);
                            done();
                        });
                        it('should not remove workflows from calendar events (0 workflows)', async function (done) {
                            spyOn($window, 'confirm').and.returnValue(true);
                            overviewViewCtrl.workflowSelection.ids = {};
                            await overviewViewCtrl.deleteSelectedWorkflows();
                            expect($window.confirm).toHaveBeenCalledTimes(0);
                            $rootScope.$apply();
                            expect(calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents).not.toHaveBeenCalled();
                            expect(overviewViewCtrl.workflows.length).toBe(4);
                            done();
                        });
                        it('should not remove workflows from calendar events, if confirm dialogs are cancelled', async function(done) {
                            spyOn($window, 'confirm').and.returnValues(true, false, false);
                            overviewViewCtrl.workflowSelection.ids = {0: true, 1: true, 3: true};
                            await overviewViewCtrl.deleteSelectedWorkflows();
                            expect($window.confirm).toHaveBeenCalledTimes(2);
                            $rootScope.$apply();
                            await overviewViewCtrl.deleteSelectedWorkflows();
                            expect($window.confirm).toHaveBeenCalledTimes(3);
                            $rootScope.$apply();
                            expect(calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents).not.toHaveBeenCalled();
                            expect(overviewViewCtrl.workflows.length).toBe(4);
                            done();
                        });
                    });
                    describe('deleteWorkflow', function () {
                        it('should remove workflow from calendar events', async function (done) {
                            spyOn($window, 'confirm').and.returnValues(true);
                            await overviewViewCtrl.deleteWorkflow(2);
                            expect($window.confirm).toHaveBeenCalledTimes(1);
                            $rootScope.$apply();
                            expect(calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents).toHaveBeenCalledTimes(1);
                            expect(removeWorkflowFromCalendarEventsAndGetDeletedEventsSpy.calls.allArgs()).toEqual([[2]]);
                            expect(overviewViewCtrl.workflows.length).toBe(3);
                            done();
                        });
                        it('should not remove workflow from calendar events, if confirm is cancelled', async function (done) {
                            spyOn($window, 'confirm').and.returnValues(false);
                            await overviewViewCtrl.deleteWorkflow(2);
                            expect($window.confirm).toHaveBeenCalledTimes(1);
                            $rootScope.$apply();
                            expect(calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents).not.toHaveBeenCalled();
                            expect(overviewViewCtrl.workflows.length).toBe(4);
                            done();
                        });
                    });

                });
            });
        });
    });
}
