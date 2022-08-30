module rehagoal.workflow {
    import WorkflowsDB = rehagoal.database.WorkflowsDB;
    import Dexie = dexie.Dexie;
    import DexieFactory = rehagoal.database.DexieFactory;
    describe('rehagoal.workflow module', function () {
        const workflowStorageKey = 'workflowStorage';
        const curVersion = 3;
        const defaultWorkspaceXml = '<xml><block type="task_group" deletable="false" movable="true"></block></xml>';
        const defaultXmlHash = '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826';
        const defaultUUID = 'exampleUUID';
        let $componentController: angular.IComponentControllerService;
        let $log: angular.ILogService;
        let mockWebStorage: Partial<IAngularWebStorageService>;
        let internalStorage: any;
        let workflowsDBService: WorkflowsDB;
        let generateRandomUUID: () => string;
        let hashString: (str: string) => string;
        let generateWorkflowVersionHash: (workflow_name: string, workspaceXmlHash: string) => string;
        let settingsService: SettingsService;
        let workflowsDBDexieInstance: Dexie;

        function hasMatchingLogMessageMatcher(regex: RegExp): any {
            return {
                asymmetricMatch: function (actual: any) {
                    return angular.isArray(actual) && actual.some(function (x) {
                        return angular.isArray(x) && x[0].match(regex);
                    });
                }
            };
        }

        function getExampleWorkflowStorage(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [0],
                workflowsById: {
                    0: {id: 0, name: 'exampleWorkflow', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash}
                },
                workflowNameToId: {
                    'exampleWorkflow': 0
                }
            };
        }

        function getCorruptedWorkflowStorageCombined(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [0, 10, 14, 'a' as any, null as any, 12, 13, 16, 17],
                workflowsById: {
                    // OK
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // Non-matching ids
                    10: {id: 0, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // OK
                    12: {id: 12, name: 'exampleWorkflow3', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // Invalid id type
                    // @ts-ignore
                    null: {id: null, name: 'exampleWorkflow4', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // Invalid id type
                    'b': {id: 'b', name: 'exampleWorkflow5', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // ID not listed in workflowIds
                    15: {id: 15, name: 'exampleWorkflow6', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // missing uuid
                    16: {id: 15, name: 'exampleWorkflow6', workspaceXml: defaultWorkspaceXml, xmlHash: defaultXmlHash} as IWorkflow,
                    // missing xmlHash
                    17: {id: 15, name: 'exampleWorkflow6', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID} as IWorkflow,
                },
                workflowNameToId: {}
            };
        }

        function getCorruptedWorkflowStorageNonMatchingIds(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [0, 10, 12],
                workflowsById: {
                    // OK
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // Non-matching ids
                    10: {id: 0, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // OK
                    12: {id: 12, name: 'exampleWorkflow3', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash}
                },
                workflowNameToId: {}
            };
        }

        function getCorruptedWorkflowStorageInvalidIdType(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [0, 'b' as any, null as any, 12],
                workflowsById: {
                    // Invalid id type
                    // @ts-ignore
                    null: {id: null, name: 'exampleWorkflow4', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // OK
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // Invalid id type
                    'b': {id: 'b', name: 'exampleWorkflow5', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // OK
                    12: {id: 12, name: 'exampleWorkflow3', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash}
                },
                workflowNameToId: {
                    'exampleWorkflow4': null as any,
                    'exampleWorkflow1': 0,
                    'exampleWorkflow5': 'b' as any,
                    'exampleWorkflow12': 12
                }
            };
        }

        function getCorruptedWorkflowStorageIDNotListed(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [0, 12],
                workflowsById: {
                    // OK
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // ID not listed in workflowIds
                    15: {id: 15, name: 'exampleWorkflow6', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // OK
                    12: {id: 12, name: 'exampleWorkflow3', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash}
                },
                workflowNameToId: {
                    'exampleWorkflow1': 0,
                    'exampleWorkflow6': 15,
                    'exampleWorkflow3': 12
                }
            };
        }

        function getCorruptedWorkflowStorageDuplicateNamesAfterUpgrade(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [0, 1, 2],
                workflowsById: {
                    // Duplicate name
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // Duplicate name
                    1: {id: 1, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // OK
                    2: {id: 2, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash}
                },
                workflowNameToId: {
                    'exampleWorkflow1': 0,
                    'exampleWorkflow2': 2
                }
            };
        }

        function getCorruptedWorkflowStorageUnusedNames(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [2],
                workflowsById: {
                    // OK
                    2: {id: 2, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash}
                },
                workflowNameToId: {
                    // non-existent name
                    'exampleWorkflow1': 0,
                    // OK
                    'exampleWorkflow2': 2
                }
            };
        }

        function getCorruptedWorkflowStorageMissingNamesToId(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [0, 1, 2],
                workflowsById: {
                    // OK
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // Missing nameToId
                    1: {id: 1, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // Missing nameToId
                    2: {id: 2, name: 'exampleWorkflow3', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash}
                },
                workflowNameToId: {
                    'exampleWorkflow1': 0
                }
            };
        }

        // TODO: unused?
        function getCorruptedWorkflowStorageMissingAttributes(): IWorkflowStorageCurrentVersion {
            return {
                version: curVersion,
                workflowIds: [0, 1, 2, 3],
                workflowsById: {
                    // OK
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID, xmlHash: defaultXmlHash},
                    // uuid missing for workflow
                    1: {id: 1, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml, xmlHash: defaultXmlHash} as IWorkflow,
                    // xmlHash missing for workflow
                    2: {id: 2, name: 'exampleWorkflow3', workspaceXml: defaultWorkspaceXml, uuid: defaultUUID} as IWorkflow,
                    // uuid and xmlHash missing
                    3: {id: 3, name: 'exampleWorkflow4', workspaceXml: defaultWorkspaceXml} as IWorkflow
                },
                workflowNameToId: {
                    'exampleWorkflow1': 0,
                    'exampleWorkflow2': 1,
                    'exampleWorkflow3': 2,
                    'exampleWorkflow4': 3
                }
            };
        }

        function getWorkflowStorageV1WithDuplicateNames(): IWorkflowStorageV1 {
            return {
                version: 1,
                workflowIds: [0, 1, 2, 3],
                workflowsById: {
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml},
                    1: {id: 1, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml},
                    2: {id: 2, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml},
                    3: {id: 3, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml}
                }
            };
        }

        function getWorkflowStorageV1WithDuplicateSpecialNames(): IWorkflowStorageV1 {
            return {
                version: 1,
                workflowIds: [0, 1, 2, 3, 4],
                workflowsById: {
                    0: {id: 0, name: '__proto__', workspaceXml: defaultWorkspaceXml},
                    1: {id: 1, name: 'hasOwnProperty', workspaceXml: defaultWorkspaceXml},
                    2: {id: 2, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml},
                    3: {id: 3, name: '__proto__', workspaceXml: defaultWorkspaceXml},
                    4: {id: 4, name: 'entries', workspaceXml: defaultWorkspaceXml}
                }
            };
        }

        function getWorkflowStorageV2(): IWorkflowStorageV2 {
            return {
                version: 2,
                workflowIds: [0, 1, 2, 3],
                workflowsById: {
                    0: {id: 0, name: 'exampleWorkflow1', workspaceXml: defaultWorkspaceXml},
                    1: {id: 1, name: 'exampleWorkflow2', workspaceXml: defaultWorkspaceXml},
                    2: {id: 2, name: 'exampleWorkflow3', workspaceXml: defaultWorkspaceXml},
                    3: {id: 3, name: 'exampleWorkflow4', workspaceXml: defaultWorkspaceXml},
                },
                workflowNameToId: {
                    'exampleWorkflow1': 0,
                    'exampleWorkflow2': 1,
                    'exampleWorkflow3': 2,
                    'exampleWorkflow4': 3
                }
            }
        }

        function getWorkflowStorageV2SpecialNames(): IWorkflowStorageV2 {
            return {
                version: 2,
                workflowIds: [0, 1, 2, 3],
                workflowsById: {
                    0: {id: 0, name: '__proto__', workspaceXml: defaultWorkspaceXml},
                    1: {id: 1, name: 'hasOwnProperty', workspaceXml: defaultWorkspaceXml},
                    2: {id: 2, name: 'entries', workspaceXml: defaultWorkspaceXml},
                    3: {id: 3, name: 'exampleWorkflow4', workspaceXml: defaultWorkspaceXml},
                },
                workflowNameToId: JSON.parse(`{
                    "__proto__": 0,
                    "hasOwnProperty": 1,
                    "entries": 2,
                    "exampleWorkflow4": 3
                }`)
            }
        }

        //Modules
        beforeEach(() => angular.mock.module('rehagoal.workflow'));

        //Mocks
        beforeEach(function () {
            internalStorage = {};
            mockWebStorage = {
                get: function (key: string) {
                    return internalStorage[key];
                },
                has: function (key: string) {
                    return internalStorage.hasOwnProperty(key);
                },
                set: function (key: string, value: any, allEngines?): boolean {
                    internalStorage[key] = value;
                    return true;
                }
            };
            angular.mock.module(function ($provide: angular.auto.IProvideService) {
                $provide.value('webStorage', mockWebStorage);
                $provide.decorator('dexieFactory', function($delegate: DexieFactory) {
                    return function (...args: ConstructorParameters<typeof dexie.Dexie>) {
                        workflowsDBDexieInstance = $delegate(...args);
                        return workflowsDBDexieInstance;
                    };
                });
            });
        });

        //Dependency Injections
        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                        _$log_: angular.ILogService,
                                        _workflowsDBService_: WorkflowsDB,
                                        _hashString_: (str: string) => string,
                                        _generateRandomUUID_: () => string,
                                        _generateWorkflowVersionHash_: (workflow_name: string, workspaceXmlHash: string) => string,
                                        _settingsService_: SettingsService) {
            $componentController = _$componentController_;
            $log = _$log_;
            workflowsDBService = _workflowsDBService_;
            hashString = _hashString_;
            generateRandomUUID = _generateRandomUUID_;
            generateWorkflowVersionHash = _generateWorkflowVersionHash_;
            settingsService = _settingsService_;
        }));

        //After Each
        afterEach(function () {
            $log.info.logs.forEach(function (x) {
                console.info(x);
            });
            $log.warn.logs.forEach(function (x) {
                console.warn(x);
            });
        });

        describe('workflow service', function () {

            describe('inject before', function () {
                let workflowService: IWorkflowService;
                let workflowsDBServiceStoreWorkflowsIfStudyModeEnabledSpy: jasmine.Spy;

                beforeEach(inject(function (_workflowService_: IWorkflowService) {
                    workflowService = _workflowService_;
                }));

                beforeEach(function () {
                    spyOn(mockWebStorage, 'has').and.callThrough();
                    spyOn(mockWebStorage, 'get').and.callThrough();
                    spyOn(mockWebStorage, 'set').and.callThrough();
                    workflowsDBServiceStoreWorkflowsIfStudyModeEnabledSpy = spyOn(workflowsDBService, 'storeWorkflowsIfStudyModeEnabled').and.callThrough();
                });

                describe('defined properties and methods', function () {
                    it('getWorkflows should be defined and should return something defined', function () {
                        expect(workflowService.getWorkflows).toBeDefined();
                        expect(workflowService.getWorkflows()).toBeDefined();
                    });
                    it('getWorkflowById should be defined and should return something defined', function () {
                        expect(workflowService.getWorkflowById).toBeDefined();
                        expect(workflowService.getWorkflowById(0)).toBeDefined();
                        expect(workflowService.getWorkflowById(0)).not.toBeNull();
                    });
                    it('getWorkflowByName should be defined and should return something defined', function () {
                        expect(workflowService.getWorkflowByName).toBeDefined();
                        expect(workflowService.getWorkflowByName('Test Workflow')).toBeDefined();
                    });
                    it('newWorkflow should be defined', function () {
                        expect(workflowService.newWorkflow).toBeDefined();
                    });
                    it('renameWorkflow should be defined', function () {
                        expect(workflowService.renameWorkflow).toBeDefined();
                    });
                    it('saveWorkflow should be defined', function () {
                        expect(workflowService.saveWorkflow).toBeDefined();
                    });
                    it('deleteWorkflowById should be defined', function () {
                        expect(workflowService.deleteWorkflowById).toBeDefined();
                    });
                    it('getVersion should be defined and should return the current version', function () {
                        expect(workflowService.getVersion).toBeDefined();
                        expect(workflowService.getVersion()).toBeDefined();
                        expect(workflowService.getVersion()).toEqual(curVersion);
                    });
                });
                describe('newWorkflow method', function () {
                    it('should create a new workflow with maximum id + 1', async function (done) {
                        const beforeWorkflows = workflowService.getWorkflows();
                        const beforeWorkflowLength = beforeWorkflows.length;
                        const beforeMaxId = Object.keys(beforeWorkflows).map(parseInt).reduce((a,b) => Math.max(a, b), -1);
                        const newFlow = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(newFlow).toBeDefined();
                        expect(newFlow.id).toBeDefined();
                        expect(newFlow.id).toEqual(beforeMaxId + 1);
                        expect(newFlow.name).toBeDefined();
                        expect(newFlow.workspaceXml).toBeDefined();
                        // Should contain default undeletable, movable root element 'task_group'
                        expect(newFlow.workspaceXml)
                            .toEqual('<xml><block type="task_group" deletable="false" movable="true"></block></xml>');
                        const afterWorkflows = workflowService.getWorkflows();
                        expect(afterWorkflows).not.toEqual(beforeWorkflows);
                        expect(afterWorkflows.length).toEqual(beforeWorkflowLength + 1);
                        expect(workflowService.getWorkflowById(newFlow.id)).toEqual(newFlow);
                        done();
                    });
                    it('should use id 0, if there are no workflows present', async function (done) {
                        const beforeWorkflows = workflowService.getWorkflows();
                        for (let i = 0; i < beforeWorkflows.length; ++i) {
                            await workflowService.deleteWorkflowById(beforeWorkflows[i].id);
                        }
                        expect(workflowService.getWorkflows().length).toBe(0);
                        const newFlow = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(newFlow).toBeDefined();
                        expect(newFlow.id).toBeDefined();
                        expect(newFlow.id).toEqual(0);
                        expect(newFlow.name).toBeDefined();
                        expect(newFlow.workspaceXml).toBeDefined();
                        done();
                    });
                    it('should create a unique workflow name', async function (done) {
                        const beforeWorkflows = workflowService.getWorkflows();
                        for (let i = 0; i < beforeWorkflows.length; ++i) {
                            await workflowService.deleteWorkflowById(beforeWorkflows[i].id);
                        }
                        expect(workflowService.getWorkflows().length).toBe(0);
                        const newFlow = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(newFlow).toBeDefined();
                        expect(newFlow.id).toBeDefined();
                        expect(newFlow.id).toEqual(0);
                        expect(newFlow.name).toBeDefined();
                        expect(newFlow.workspaceXml).toBeDefined();
                        expect(workflowService.getWorkflows().length).toBe(1);
                        const newFlow2 = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(newFlow2).toBeDefined();
                        expect(newFlow2.name).not.toEqual(newFlow.name);
                        expect(newFlow2.workspaceXml).toBeDefined();
                        done();
                    });
                    it('should add a new uuid and xmlHash attribute', async function(done) {
                        const beforeWorkflows = workflowService.getWorkflows();
                        for (let i = 0; i < beforeWorkflows.length; ++i) {
                            await workflowService.deleteWorkflowById(beforeWorkflows[i].id);
                        }
                        const newFlow = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(newFlow).toBeDefined();
                        expect(newFlow.uuid).toBeDefined();
                        expect(newFlow.xmlHash).toBeDefined();
                        expect(newFlow.name).toBeDefined();
                        expect(newFlow.workspaceXml).toBeDefined();
                        done();
                    });
                    it('should call workflowsDBService to store an entry if valid', async function(done) {
                        const testWorkflow = await workflowService.newWorkflow();
                        expect(testWorkflow.uuid).toBeDefined();
                        expect(testWorkflow.xmlHash).toBeDefined();
                        expect(testWorkflow.workspaceXml).toBeDefined();
                        expect(testWorkflow.name).toBeDefined();
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledTimes(1);
                        const expectedDBEntry = workflowService.validateWorkflowForWorkflowsDB(testWorkflow);
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledWith([expectedDBEntry]);
                        done();
                    });
                });
                describe('renameWorkflow method', function () {
                    it('should rename a workflow', async function (done) {
                        const beforeWorkflows = workflowService.getWorkflows();
                        expect(beforeWorkflows.length).toBe(1);
                        const id = beforeWorkflows[0].id;
                        const workflow = workflowService.getWorkflowById(id)!;
                        const previousName = workflow.name;
                        const newName = workflow.name + "1";
                        workflow.name = newName;
                        await workflowService.renameWorkflow(previousName, workflow);
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(workflowService.getWorkflowById(id)!.name).toBe(newName);
                        done();
                    });
                    it('should generate a new name, if the name is already in use', async function (done) {
                        const beforeWorkflows = workflowService.getWorkflows();
                        expect(beforeWorkflows.length).toBe(1);
                        const workflow1 = workflowService.getWorkflowById(0)!;
                        let previousName = workflow1.name;
                        workflow1.name = "Flow (1)";
                        await workflowService.renameWorkflow(previousName, workflow1);
                        const workflow3 = await workflowService.newWorkflow();
                        previousName = workflow3.name;
                        workflow3.name = "Flow (3)";
                        await workflowService.renameWorkflow(previousName, workflow3);
                        const workflow2 = await workflowService.newWorkflow();
                        previousName = workflow2.name;
                        workflow2.name = "Flow (2)";
                        await workflowService.renameWorkflow(previousName, workflow2);
                        const workflow2_1 = await workflowService.newWorkflow();
                        previousName = workflow2_1.name;
                        workflow2_1.name = "Flow (2)";
                        await workflowService.renameWorkflow(previousName, workflow2_1);
                        expect(workflow2_1.name).toBe("Flow (4)");
                        expect(workflow2.name).toBe("Flow (2)");
                        expect(workflow1.name).toBe("Flow (1)");
                        expect(workflow3.name).toBe("Flow (3)");
                        const afterWorkflows = workflowService.getWorkflows();
                        expect(afterWorkflows.length).toBe(4);
                        expect(workflowService.getWorkflowById(0)!.name).toBe("Flow (1)");
                        expect(workflowService.getWorkflowById(1)!.name).toBe("Flow (3)");
                        expect(workflowService.getWorkflowById(2)!.name).toBe("Flow (2)");
                        expect(workflowService.getWorkflowById(3)!.name).toBe("Flow (4)");
                        done();

                    });
                    it('should call workflowsDBService to store a workflow after renaming', async function(done) {
                        const beforeWorkflows = workflowService.getWorkflows();
                        expect(beforeWorkflows.length).toBe(1);
                        const id = beforeWorkflows[0].id;
                        const workflow = workflowService.getWorkflowById(id)!;
                        const previousName = workflow.name;
                        const newName = workflow.name + "1";
                        workflow.name = newName;
                        await workflowService.renameWorkflow(previousName, workflow);
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledTimes(1);
                        done();
                    })
                });
                describe('saveWorkflow method', function () {
                    it('saveWorkflow should not persist, if the id is non-existent', async function (done) {
                        async function saveWorklowNonExistent(): Promise<void> {
                            return workflowService.saveWorkflow({id: -999, name: "Non-existent", workspaceXml: 'workspaceXml', uuid: 'uuid', xmlHash: 'xmlHash'});
                        }
                        await expectThrowsAsync(async () => saveWorklowNonExistent());
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        done();
                    });
                    it('saveWorkflow should persist, if the id is existent', async function (done) {
                        const flow = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        flow.name = 'TestSaveName';
                        flow.workspaceXml = "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>";
                        await workflowService.saveWorkflow(flow);
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        done();
                    });
                    it('saveWorkflow should persist to ' + workflowStorageKey + ', webstorage should change', async function (done) {
                        mockWebStorage.set = jasmine.createSpy().and.callFake(function (key: string, value: any) {
                            let lastStorageValue = null;
                            expect(key).toBe(workflowStorageKey);
                            expect(value).not.toEqual(lastStorageValue);
                            lastStorageValue = angular.copy(value);
                        });
                        const flow = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        flow.name = 'TestSaveName';
                        flow.workspaceXml = "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>";
                        await workflowService.saveWorkflow(flow);
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        done();
                    });
                    it('should update the xmlHash value and call workflowsDBService to store a workflow after saving', async function(done) {
                        const flow = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledTimes(1);
                        const previousXmlHash = flow.xmlHash;

                        flow.workspaceXml = "<xml><block type=\"task_group\" id=\"some-special-id\" deletable=\"false\" movable=\"true\"></block></xml>";
                        await workflowService.saveWorkflow(flow);
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledTimes(2);
                        expect(flow.xmlHash).not.toBe(previousXmlHash);
                        done();
                    });
                    it('should fail to update the xmlHash value if xml is undefined', async function(done) {
                        const flow = await workflowService.newWorkflow();
                        expect(mockWebStorage.set).toHaveBeenCalledTimes(1);

                        flow.workspaceXml = undefined as any;
                        await expectThrowsAsync(async () => await workflowService.saveWorkflow(flow), /Workflow or xml is undefined/);
                        expect(mockWebStorage.set).toHaveBeenCalledTimes(1);
                        done();
                    });
                });
                describe('deleteWorkflowById method', function () {
                    it('deleteWorkflowById should delete a workflow', async function (done) {
                        const beforeWorkflows = workflowService.getWorkflows();
                        const newFlow = await workflowService.newWorkflow();
                        expect(workflowService.getWorkflows().length).toEqual(beforeWorkflows.length + 1);
                        await workflowService.deleteWorkflowById(newFlow.id);
                        expect(mockWebStorage.set).toHaveBeenCalled();
                        expect(workflowService.getWorkflows()).toEqual(beforeWorkflows);
                        done();
                    });
                    it('deleteWorkflowById should not persist and throw if id is invalid', async function (done) {
                        const beforeWorkflows = workflowService.getWorkflows();

                        async function deleteNonExistentWorkflow(): Promise<void> {
                            return workflowService.deleteWorkflowById(-999);
                        }

                        await expectThrowsAsync(deleteNonExistentWorkflow);
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect(workflowService.getWorkflows()).toEqual(beforeWorkflows);
                        done();
                    });
                });
                describe('getWorkflowByName method', function () {
                    it('should return the workflow with the given name', function () {
                        expect(workflowService.getWorkflowByName('Test Workflow')).toBe(workflowService.getWorkflowById(0)!);
                    });
                    it('should return null if the given name does not exist', function () {
                        expect(workflowService.getWorkflowByName('Does not exist')).toBe(null);
                    });
                });
                describe('getWorkflowById method', function () {
                    it('should throw an error if a non-number ID is passed', function () {
                        expect(() => workflowService.getWorkflowById("0" as unknown as number))
                            .toThrowError("getWorkflowById needs the `id` argument to be a Number!");
                    });
                    it('should return null, if workflow with that ID does not exist', async function (done) {
                        expect(workflowService.getWorkflowById(1)).toBe(null);
                        await workflowService.deleteWorkflowById(0);
                        expect(workflowService.getWorkflowById(0)).toBe(null);
                        done();
                    });
                    it('should return workflow, if workflow with that ID does exist', async function (done) {
                        expect(workflowService.getWorkflowById(0)).toBeTruthy();
                        expect(workflowService.getWorkflowById(0)?.name).toBe("Test Workflow");
                        expect(workflowService.getWorkflowById(1)).toBe(null);
                        await workflowService.newWorkflow();
                        expect(workflowService.getWorkflowById(1)).toBeTruthy();
                        expect(workflowService.getWorkflowById(1)?.name).toBe("New Workflow");
                        done();
                    });
                })
                describe('setRemoteID functionality', function () {
                    let workflow: IWorkflow;
                    beforeEach(function () {
                        workflow = workflowService.getWorkflowByName('Test Workflow')!;
                    });

                    const workflow_name_notOk = 'Does not exist';
                    const remoteIds = ['abc123', 'def456'];

                    it('should set a remoteID, for a correct workflow', async function (done) {
                        expect(workflow.remoteId).toBeNull();
                        await workflowService.setRemoteID(workflow.name, remoteIds[0]);
                        expect(workflow.remoteId).toEqual(remoteIds[0]);
                        expect(workflowService.getWorkflowById(workflow.id)!.remoteId).toEqual(remoteIds[0]);
                        done();
                    });

                    it('should not set a remoteID, for an incorrect workflow', async function (done) {
                        expect(workflow.remoteId).toBeNull();
                        let workflow2 = workflowService.getWorkflowByName(workflow_name_notOk);
                        expect(workflow2).toBeNull();
                        await workflowService.setRemoteID(workflow_name_notOk, remoteIds[0]);
                        expect(workflow2).toBeNull();
                        done();
                    });

                    it('should set remoteId to null, if remoteId-parameter is null', async function (done) {
                        expect(workflow.remoteId).toBeNull();
                        await workflowService.setRemoteID(workflow.name, null as any);
                        expect(workflow.remoteId).toBeNull();
                        done();
                    });

                    it('should overwrite remoteId, if workflow alreadey has a remoteId ', async function (done) {
                        expect(workflow.remoteId).toBeNull();
                        await workflowService.setRemoteID(workflow.name, remoteIds[0]);
                        expect(workflow.remoteId).toEqual(remoteIds[0]);
                        await workflowService.setRemoteID(workflow.name, remoteIds[1]);
                        expect(workflow.remoteId).toEqual(remoteIds[1]);
                        done();
                    });
                });
                describe('validateWorkflowForWorkflowsDB method', function () {
                    it('should throw an error if uuid or xmlHash is missing or of wrong type', async function(done) {
                        const testWorkflow1 = await workflowService.newWorkflow();
                        testWorkflow1.uuid = null as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow1)).toThrowError(/UUID.*missing/);
                        testWorkflow1.uuid = undefined as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow1)).toThrowError(/UUID.*missing/);
                        testWorkflow1.uuid = 123 as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow1)).toThrowError(/UUID.*missing/);
                        testWorkflow1.uuid = {} as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow1)).toThrowError(/UUID.*missing/);
                        testWorkflow1.uuid = ['123'] as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow1)).toThrowError(/UUID.*missing/);

                        const testWorkflow2 = await workflowService.newWorkflow();
                        testWorkflow2.xmlHash = null as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow2)).toThrowError(/xmlHash.*missing/);
                        testWorkflow2.xmlHash = undefined as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow2)).toThrowError(/xmlHash.*missing/);
                        testWorkflow2.xmlHash = 123 as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow2)).toThrowError(/xmlHash.*missing/);
                        testWorkflow2.xmlHash = {} as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow2)).toThrowError(/xmlHash.*missing/);
                        testWorkflow2.xmlHash = ['123'] as any;
                        expect(() => workflowService.validateWorkflowForWorkflowsDB(testWorkflow2)).toThrowError(/xmlHash.*missing/);
                        done();
                    });
                    it('should update and use a new xmlHash on mismatch', async function(done) {
                        const testWorkflow = await workflowService.newWorkflow();
                        expect(testWorkflow.xmlHash).toBeDefined();
                        const oldXmlHash = testWorkflow.xmlHash;
                        testWorkflow.xmlHash = 'a new hash value';
                        workflowService.validateWorkflowForWorkflowsDB(testWorkflow);
                        expect(testWorkflow.xmlHash).toEqual(oldXmlHash);
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/recalculated/));
                        done();
                    });
                    it('should generate a versionHash based on the name and xmlHash values', async function(done) {
                        const testWorkflow = await workflowService.newWorkflow();
                        let name = testWorkflow.name;
                        const xmlHash = testWorkflow.xmlHash;

                        // versionHash = workflowName || xml
                        const expectedVersionHash = hashString(xmlHash.concat(name));

                        await workflowService.saveWorkflow(testWorkflow);
                        expect(workflowService.validateWorkflowForWorkflowsDB(testWorkflow).versionHash).toEqual(expectedVersionHash);

                        // changed name should resolve in a new versionHash
                        name = 'a new workflow name';
                        testWorkflow.name = name;

                        const expectedVersionHashAfterChange = hashString(xmlHash.concat(name));
                        await workflowService.saveWorkflow(testWorkflow);
                        expect(workflowService.validateWorkflowForWorkflowsDB(testWorkflow).versionHash).toEqual(expectedVersionHashAfterChange);

                        done();
                    });
                    it('should generate a versionHash each time the function is called', async function(done) {
                        const testWorkflow = await workflowService.newWorkflow();
                        const testDBEntry = workflowService.validateWorkflowForWorkflowsDB(testWorkflow);
                        expect(workflowsDBServiceStoreWorkflowsIfStudyModeEnabledSpy.calls.mostRecent().args[0]).toEqual([testDBEntry]);

                        const testWorkflow2 = await workflowService.newWorkflow('no name');
                        const testDBEntry2 = workflowService.validateWorkflowForWorkflowsDB(testWorkflow2);
                        expect(workflowsDBServiceStoreWorkflowsIfStudyModeEnabledSpy.calls.mostRecent().args[0]).toEqual([testDBEntry2]);
                        done();
                    });
                });
                describe('persistAllWorkflowsInWorkflowsDB method', function () {
                    afterEach(function(done) {
                        workflowsDBDexieInstance.delete().then(done);
                    });

                    it('should persist and store all workflows within the workflowsDB', async function(done) {
                        spyOn(workflowService, 'validateWorkflowForWorkflowsDB').and.callThrough();
                        settingsService.studyModeEnabled = true;
                        const testWorkflow1 = await workflowService.newWorkflow();
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledTimes(1);

                        const testWorkflow2 = await workflowService.newWorkflow();
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledTimes(2);

                        const testWorkflow3 = await workflowService.newWorkflow();
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledTimes(3);

                        await workflowService.persistAllWorkflowsInWorkflowsDB();
                        expect(workflowService.validateWorkflowForWorkflowsDB).toHaveBeenCalledWith(testWorkflow1);
                        expect(workflowService.validateWorkflowForWorkflowsDB).toHaveBeenCalledWith(testWorkflow2);
                        expect(workflowService.validateWorkflowForWorkflowsDB).toHaveBeenCalledWith(testWorkflow3);
                        // should persist again with all workflows
                        expect(workflowsDBService.storeWorkflowsIfStudyModeEnabled).toHaveBeenCalledTimes(4);
                        done();
                    });
                    it('should store a workflow if studyMode is enabled within workflowsDB', async function(done) {
                        settingsService.studyModeEnabled = true;

                        await workflowService.deleteWorkflowById(0); // remove test workflow
                        const testWorkflow1 = await workflowService.newWorkflow();
                        const expectedDump = [{
                            table: 'workflowXML',
                            rows: [
                                {xml: testWorkflow1.workspaceXml, xmlHash: testWorkflow1.xmlHash}
                            ]
                        }, {
                            table: 'workflowVersions',
                            rows: [
                                {uuid: testWorkflow1.uuid, name: testWorkflow1.name, xmlHash: testWorkflow1.xmlHash, versionHash: jasmine.anything()}
                            ]
                        }];
                        await workflowService.persistAllWorkflowsInWorkflowsDB();
                        const dump = await workflowsDBService.dumpDB();
                        expect(dump).toEqual(expectedDump);
                        done();
                    });
                    it('should not store workflows if studyMode is disabled', async function(done) {
                        settingsService.studyModeEnabled = false;
                        await workflowService.newWorkflow();
                        await workflowService.persistAllWorkflowsInWorkflowsDB();
                        const dump = await workflowsDBService.dumpDB();
                        expect(dump[0].rows.length).toEqual(0);
                        expect(dump[1].rows.length).toEqual(0);
                        done();
                    });
                });

            });

            describe('loadStorage functionality', function () {
                beforeEach(function () {
                    spyOn(mockWebStorage, 'has').and.callThrough();
                    spyOn(mockWebStorage, 'get').and.callThrough();
                    spyOn(mockWebStorage, 'set').and.callThrough();
                    spyOn(workflowsDBService, 'storeWorkflowsIfStudyModeEnabled').and.callThrough();
                });

                it('should not load workflowStorage, if key is not set', function () {
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).not.toHaveBeenCalled();
                        expect(workflowService.getWorkflows()).toBeDefined();
                        expect(workflowService.getWorkflows()).not.toBeNull();
                    });
                });
                it('should load workflowStorage, if key is set; log warn if version key is missing', function () {
                    internalStorage[workflowStorageKey] = {};
                    inject(['workflowService', function () {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                    }]);
                });
                it('should load workflowStorage, if key is set; log warn if version is not current', function () {
                    internalStorage[workflowStorageKey] = {version: -999};
                    inject(['workflowService', function () {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                    }]);
                });
                it('should load workflowStorage with workflows', function () {
                    internalStorage[workflowStorageKey] = getExampleWorkflowStorage();
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                        expect(workflowService.getWorkflows().length).toBe(1);
                        expect(workflowService.getWorkflows()[0]).toEqual(getExampleWorkflowStorage().workflowsById[0]);
                    });
                });
                it('should not load workflows with non-integer ids', function () {
                    internalStorage[workflowStorageKey] = getCorruptedWorkflowStorageInvalidIdType();
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                        expect(workflowService.getWorkflows().length).toBe(2);
                        expect(workflowService.getWorkflows()[0]).toEqual(getCorruptedWorkflowStorageInvalidIdType().workflowsById[0]);
                        expect(workflowService.getWorkflows()[1]).toEqual(getCorruptedWorkflowStorageInvalidIdType().workflowsById[12]);
                    });
                });
                it('should not load workflows with non-matching ids in workflowsById', function () {
                    internalStorage[workflowStorageKey] = getCorruptedWorkflowStorageNonMatchingIds();
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/id mismatch in workflowsById/));
                        expect(workflowService.getWorkflows().length).toBe(2);
                        expect(workflowService.getWorkflows()[0]).toEqual(getCorruptedWorkflowStorageNonMatchingIds().workflowsById[0]);
                        expect(workflowService.getWorkflows()[1]).toEqual(getCorruptedWorkflowStorageNonMatchingIds().workflowsById[12]);
                    });
                });
                it('should not load workflows with duplicate workflow names after upgrade', function () {
                    internalStorage[workflowStorageKey] = getCorruptedWorkflowStorageDuplicateNamesAfterUpgrade();
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/Duplicate workflow name/));
                        expect(workflowService.getWorkflows().length).toBe(2);
                        expect(workflowService.getWorkflows()[0]).toEqual(getCorruptedWorkflowStorageDuplicateNamesAfterUpgrade().workflowsById[0]);
                        expect(workflowService.getWorkflows()[1]).toEqual(getCorruptedWorkflowStorageDuplicateNamesAfterUpgrade().workflowsById[2]);
                    });

                });
                it('should remove unused workflow names from workflowNameToId', function () {
                    internalStorage[workflowStorageKey] = getCorruptedWorkflowStorageUnusedNames();
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/non-existent/));
                        expect(workflowService.getWorkflows().length).toBe(1);
                        expect(workflowService.getWorkflows()[0]).toEqual(getCorruptedWorkflowStorageUnusedNames().workflowsById[2]);
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow1']).not.toBeDefined();
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow2']).toBeDefined();
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow2']).toBe(2);
                    });
                });
                it('should add missing workflow names to workflowNameToId', function () {
                    internalStorage[workflowStorageKey] = getCorruptedWorkflowStorageMissingNamesToId();
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/not listed in workflowNameToId/));
                        expect(workflowService.getWorkflows().length).toBe(3);
                        expect(workflowService.getWorkflows()[0]).toEqual(getCorruptedWorkflowStorageMissingNamesToId().workflowsById[0]);
                        expect(workflowService.getWorkflows()[1]).toEqual(getCorruptedWorkflowStorageMissingNamesToId().workflowsById[1]);
                        expect(workflowService.getWorkflows()[2]).toEqual(getCorruptedWorkflowStorageMissingNamesToId().workflowsById[2]);
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow1']).toBeDefined();
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow2']).toBeDefined();
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow3']).toBeDefined();
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow1']).toBe(0);
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow2']).toBe(1);
                        expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow3']).toBe(2);
                    });
                });
                describe('upgrade functionality', function () {
                    describe('version 1 -> version 2', function () {
                        it('should make sure, that all workflow names are unique, renaming duplicate names', function () {
                            internalStorage[workflowStorageKey] = getWorkflowStorageV1WithDuplicateNames();
                            inject(function (workflowService: IWorkflowService) {
                                expect(mockWebStorage.has).toHaveBeenCalled();
                                expect(mockWebStorage.get).toHaveBeenCalled();
                                since("Upgrade should persist changes").expect(mockWebStorage.set).toHaveBeenCalled();
                                expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/not listed in workflowNameToId/));
                                expect(workflowService.getWorkflows().length).toBe(4);
                                const originalFlows = getWorkflowStorageV1WithDuplicateNames().workflowsById;
                                const resultingFlows = workflowService.getWorkflows();
                                const usedWorkflowNames = Object.create(null);
                                for (let i = 0; i < 4; ++i) {
                                    since("Resulting workflow name '" + resultingFlows[i].name + "' should contain '" + originalFlows[i].name + "'").expect(resultingFlows[i].name.includes(originalFlows[i].name)).toBe(true);
                                    expect(usedWorkflowNames[resultingFlows[i].name]).not.toBeDefined();
                                    usedWorkflowNames[resultingFlows[i].name] = true;
                                }
                            });
                        });
                        it('should add a new field \'workflowNameToId\' to the storage, with name->id mapping', function () {
                            internalStorage[workflowStorageKey] = getWorkflowStorageV1WithDuplicateNames();
                            inject(function (workflowService: IWorkflowService) {
                                expect(mockWebStorage.has).toHaveBeenCalled();
                                expect(mockWebStorage.get).toHaveBeenCalled();
                                since("Upgrade should persist changes").expect(mockWebStorage.set).toHaveBeenCalled();
                                expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/not listed in workflowNameToId/));
                                expect(workflowService.getWorkflows().length).toBe(4);
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow1']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow1 (2)']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow1 (3)']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow2']).toBeDefined();
                                for (let i = 0; i < 4; ++i) {
                                    const workflow = workflowService.getWorkflows()[i];
                                    expect(workflow.id).toBe(workflowService.getWorkflowByName(workflow.name)!.id);
                                    expect(workflow.name).toBe(workflowService.getWorkflowByName(workflow.name)!.name);
                                }
                                expect(Object.getOwnPropertyNames(internalStorage.workflowStorage.workflowNameToId).length).toBe(4);
                            });
                        });
                        it('should not break with special workflow names', function() {
                            internalStorage[workflowStorageKey] = getWorkflowStorageV1WithDuplicateSpecialNames();
                            inject(function (workflowService: IWorkflowService) {
                                expect(mockWebStorage.has).toHaveBeenCalled();
                                expect(mockWebStorage.get).toHaveBeenCalled();
                                since("Upgrade should persist changes").expect(mockWebStorage.set).toHaveBeenCalled();
                                expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/not listed in workflowNameToId/));
                                expect(workflowService.getWorkflows().length).toBe(5);
                                expect(internalStorage.workflowStorage.workflowNameToId['__proto__']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['__proto__ (2)']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['hasOwnProperty']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow2']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['entries']).toBeDefined();
                                for (let i = 0; i < 5; ++i) {
                                    const workflow = workflowService.getWorkflows()[i];
                                    expect(workflow.id).toBe(workflowService.getWorkflowByName(workflow.name)!.id);
                                    expect(workflow.name).toBe(workflowService.getWorkflowByName(workflow.name)!.name);
                                }
                                expect(Object.getOwnPropertyNames(internalStorage.workflowStorage.workflowNameToId).length).toBe(5);
                            });
                        });
                    });
                    describe('version 2 -> version 3', function () {
                        it('should add two new new fields \'uuid\' and \'xmlHash\' to all workflow from the storage', function () {
                            internalStorage[workflowStorageKey] = getWorkflowStorageV2();
                            inject(function (workflowService: IWorkflowService) {
                                expect(mockWebStorage.has).toHaveBeenCalled();
                                expect(mockWebStorage.get).toHaveBeenCalled();
                                since("Upgrade should persist changes").expect(mockWebStorage.set).toHaveBeenCalled();
                                expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/not listed in workflowNameToId/));
                                expect(workflowService.getWorkflows().length).toBe(4);
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow1']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow2']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow3']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow4']).toBeDefined();
                                for (let i = 0; i < 4; ++i) {
                                    const workflow = workflowService.getWorkflows()[i];
                                    expect(workflow.id).toBe(workflowService.getWorkflowByName(workflow.name)!.id);
                                    expect(workflow.name).toBe(workflowService.getWorkflowByName(workflow.name)!.name);
                                    expect(workflow.uuid).toBeDefined();
                                    expect(workflow.xmlHash).toBeDefined();
                                    expect(workflow.uuid).toBe(workflowService.getWorkflowByName(workflow.name)!.uuid);
                                    expect(workflow.xmlHash).toBe(workflowService.getWorkflowByName(workflow.name)!.xmlHash);
                                }
                                expect(Object.getOwnPropertyNames(internalStorage.workflowStorage.workflowNameToId).length).toBe(4);
                            });
                        });
                        it('should not break with special workflow names', function () {
                            internalStorage[workflowStorageKey] = getWorkflowStorageV2SpecialNames();
                            inject(function (workflowService: IWorkflowService) {
                                expect(mockWebStorage.has).toHaveBeenCalled();
                                expect(mockWebStorage.get).toHaveBeenCalled();
                                since("Upgrade should persist changes").expect(mockWebStorage.set).toHaveBeenCalled();
                                expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                                expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/not listed in workflowNameToId/));
                                expect(workflowService.getWorkflows().length).toBe(4);
                                expect(internalStorage.workflowStorage.workflowNameToId['__proto__']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['hasOwnProperty']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['entries']).toBeDefined();
                                expect(internalStorage.workflowStorage.workflowNameToId['exampleWorkflow4']).toBeDefined();
                                for (let i = 0; i < 4; ++i) {
                                    const workflow = workflowService.getWorkflows()[i];
                                    expect(workflow.id).toBe(workflowService.getWorkflowByName(workflow.name)!.id);
                                    expect(workflow.name).toBe(workflowService.getWorkflowByName(workflow.name)!.name);
                                    expect(workflow.uuid).toBeDefined();
                                    expect(workflow.xmlHash).toBeDefined();
                                    expect(workflow.uuid).toBe(workflowService.getWorkflowByName(workflow.name)!.uuid);
                                    expect(workflow.xmlHash).toBe(workflowService.getWorkflowByName(workflow.name)!.xmlHash);
                                }
                                expect(Object.getOwnPropertyNames(internalStorage.workflowStorage.workflowNameToId).length).toBe(4);
                            });
                        });
                    });
                });
                it('should not load workflows where the id is not listed in workflowIds', function () {
                    internalStorage[workflowStorageKey] = getCorruptedWorkflowStorageIDNotListed();
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/id mismatch in workflowsById/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/not listed in workflowIds/));
                        expect(workflowService.getWorkflows().length).toBe(2);
                        expect(workflowService.getWorkflows()[0]).toEqual(getCorruptedWorkflowStorageInvalidIdType().workflowsById[0]);
                        expect(workflowService.getWorkflows()[1]).toEqual(getCorruptedWorkflowStorageInvalidIdType().workflowsById[12]);
                    });
                });
                it('should not load workflows where combined errors occurr', function () {
                    internalStorage[workflowStorageKey] = getCorruptedWorkflowStorageCombined();
                    inject(function (workflowService: IWorkflowService) {
                        expect(mockWebStorage.has).toHaveBeenCalled();
                        expect(mockWebStorage.get).toHaveBeenCalled();
                        expect(mockWebStorage.set).not.toHaveBeenCalled();
                        expect($log.warn.logs).not.toEqual(hasMatchingLogMessageMatcher(/incompatible/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/non-integer/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/corrupted/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/id mismatch in workflowsById/));
                        expect($log.warn.logs).toEqual(hasMatchingLogMessageMatcher(/not listed in workflowIds/));
                        console.log(workflowService.getWorkflows());
                        expect(workflowService.getWorkflows().length).toBe(2);
                        expect(workflowService.getWorkflows()[0]).toEqual(getCorruptedWorkflowStorageCombined().workflowsById[0]);
                        expect(workflowService.getWorkflows()[1]).toEqual(getCorruptedWorkflowStorageCombined().workflowsById[12]);
                    });
                });
            });
        });
    });
}


