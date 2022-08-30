module rehagoal.smartCompanion {
    import IExecutionComponent = rehagoal.executionComponent.IExecutionComponent;
    import SettingsService = rehagoal.settings.SettingsService;
    import IntentImportService = rehagoal.intents.IntentImportService;
    import BlockType = rehagoal.workflow.BlockType;

    describe('rehagoal.smartCompanion', function () {
        let $log: angular.ILogService;
        let $rootScope: angular.IRootScopeService;
        let $location: angular.ILocationService;
        let workflowService: IWorkflowService;
        let wearCompanionService: WearCompanionService;
        let settingsService: SettingsService;
        let intentImportService: IntentImportService;
        let bluetoothCompanionService: BluetoothCompanionService;

        beforeEach(() => angular.mock.module('rehagoal.smartCompanion'));

        beforeEach(inject(function (_$log_: angular.ILogService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _$location_: angular.ILocationService,
                                    _workflowService_: IWorkflowService,
                                    _settingsService_: SettingsService,
                                    _intentImportService_: IntentImportService,
                                    _wearCompanionService_: WearCompanionService,
                                    _bluetoothCompanionService_: BluetoothCompanionService) {
            $log = _$log_;
            $rootScope = _$rootScope_;
            $location = _$location_;
            workflowService = _workflowService_;
            settingsService = _settingsService_;
            intentImportService = _intentImportService_;
            wearCompanionService = _wearCompanionService_;
            bluetoothCompanionService = _bluetoothCompanionService_;
        }));

        describe('smartCompanion', function() {
            let smartCompanionService: ISmartCompanionService;
            let mockCompanionOne: IConnectionCompanion;
            let mockCompanionTwo: IConnectionCompanion;
            let mockExecutionComponent: Omit<jasmine.SpyObj<IExecutionComponent>, 'workflow'> & Pick<IExecutionComponent, 'workflow'>;
            let executionBlockChangeListener: Function;

            function setExecutionComponentAndAddCompanion(executionComponent: IExecutionComponent, companion: IConnectionCompanion, name: string): void {
                smartCompanionService.setExecutionComponent(executionComponent);
                smartCompanionService.addConnectionCompanion(companion, name);
            }

            beforeEach(() => angular.mock.inject(function (_smartCompanionService_: ISmartCompanionService) {
                smartCompanionService = _smartCompanionService_;

                mockCompanionOne = jasmine.createSpyObj('SpyCompanionOne', [
                    'putData',
                    'setDataReceivedListener'
                ]);
                mockCompanionTwo = jasmine.createSpyObj('SpyCompanionTwo', [
                    'putData',
                    'setDataReceivedListener'
                ]);

                const sampleWorkflow: IWorkflow = { uuid: 'uniqueid', xmlHash: '123ef5', workspaceXml: 'workspace', name: 'newWorkflow', id: 3 };
                mockExecutionComponent = {...jasmine.createSpyObj<IExecutionComponent>('SpyExecutionComponentOne', [
                        'addBlockChangeListener',
                        'addWorkflowFinishListener',
                        'addOnNotificationListener',
                        'getTimerBlockTimer',
                        'getCurrentBlockIndex',
                        'getCurrentBlockType',
                        'getCurrentBlockText',
                        'getCurrentParallelFlows',
                        'getParallelTaskNumTodo',
                        'onWorkflowFinish',
                        'onWorkflowFinishClick'
                    ]), workflow: sampleWorkflow};
            }));

            describe('configure companions with service', function() {
                const taskPath = '/rehagoal/companions/task';
                const taskData = { task: { id: 2, type: BlockType.Simple, text: "task text", workflowId: 3 } };

                beforeEach(() => {
                    smartCompanionService.setExecutionComponent(mockExecutionComponent);
                    expect(mockExecutionComponent.addBlockChangeListener).toHaveBeenCalledTimes(1);
                    expect(mockExecutionComponent.addBlockChangeListener).toHaveBeenCalledWith(jasmine.any(Function));
                    expect(mockExecutionComponent.addWorkflowFinishListener).toHaveBeenCalledTimes(1);
                    expect(mockExecutionComponent.addWorkflowFinishListener).toHaveBeenCalledWith(jasmine.any(Function));
                    expect(mockExecutionComponent.addOnNotificationListener).toHaveBeenCalledTimes(1);
                    expect(mockExecutionComponent.addOnNotificationListener).toHaveBeenCalledWith(jasmine.any(Function));
                    mockExecutionComponent.getCurrentBlockType.and.returnValue(taskData.task.type);
                    mockExecutionComponent.getCurrentBlockIndex.and.returnValue(taskData.task.id);
                    mockExecutionComponent.getCurrentBlockText.and.returnValue(taskData.task.text);
                    executionBlockChangeListener = mockExecutionComponent.addBlockChangeListener.calls.mostRecent().args[0];
                });

                afterAll(() => {
                    executionBlockChangeListener = () => {};
                });

                it('should set workflow execution component for the companion service', function() {
                    smartCompanionService.setExecutionComponent(mockExecutionComponent);
                    // Two times because we already set it in beforeEach
                    expect(mockExecutionComponent.addBlockChangeListener).toHaveBeenCalledTimes(2);
                    expect(mockExecutionComponent.addBlockChangeListener).toHaveBeenCalledWith(jasmine.any(Function));
                    expect(mockExecutionComponent.addWorkflowFinishListener).toHaveBeenCalledTimes(2);
                    expect(mockExecutionComponent.addWorkflowFinishListener).toHaveBeenCalledWith(jasmine.any(Function));
                    expect(mockExecutionComponent.addOnNotificationListener).toHaveBeenCalledTimes(2);
                    expect(mockExecutionComponent.addOnNotificationListener).toHaveBeenCalledWith(jasmine.any(Function));
                });

                it('should add a new companion to the list', function() {
                    smartCompanionService.addConnectionCompanion(mockCompanionOne, 'testCompanion');
                    expect(mockCompanionOne.setDataReceivedListener).toHaveBeenCalledTimes(1);
                    expect(mockCompanionOne.setDataReceivedListener).toHaveBeenCalledWith(jasmine.any(Function));
                    executionBlockChangeListener();
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(taskPath, taskData);
                });

                it('should do nothing if a companion cannot be added to the list', function() {
                    smartCompanionService.addConnectionCompanion({} as IConnectionCompanion, "noCompanion");
                    expect(mockCompanionOne.setDataReceivedListener).toHaveBeenCalledTimes(0);
                    executionBlockChangeListener();
                    expect(mockCompanionOne.putData).not.toHaveBeenCalled();
                });

                it('should remove a given companion from the list', function() {
                    // add companion
                    smartCompanionService.addConnectionCompanion(mockCompanionOne, 'removeCompanion');
                    executionBlockChangeListener();
                    expect(mockCompanionOne.setDataReceivedListener).toHaveBeenCalledWith(jasmine.any(Function));

                    // remove companion
                    smartCompanionService.removeConnectionCompanion(mockCompanionOne, 'removeCompanion');
                    executionBlockChangeListener();
                    expect(mockCompanionOne.setDataReceivedListener).toHaveBeenCalledWith(null);
                });

                it('should remove only the given companion from the list', function() {
                    smartCompanionService.addConnectionCompanion(mockCompanionOne, 'testCompanion');
                    smartCompanionService.addConnectionCompanion(mockCompanionTwo, 'removeCompanion');
                    executionBlockChangeListener();
                    // Companion has been called three times already: once within beforeEach and after both added connections
                    expect(mockCompanionOne.putData).toHaveBeenCalledTimes(3);
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(taskPath, taskData);
                    expect(mockCompanionTwo.putData).toHaveBeenCalledTimes(2);
                    expect(mockCompanionTwo.putData).toHaveBeenCalledWith(taskPath, taskData);
                    smartCompanionService.removeConnectionCompanion(mockCompanionTwo, 'removeCompanion');
                    executionBlockChangeListener();
                    expect(mockCompanionOne.putData).toHaveBeenCalledTimes(4);
                    expect(mockCompanionTwo.putData).toHaveBeenCalledTimes(2);
                    smartCompanionService.removeConnectionCompanion(mockCompanionTwo, 'removeCompanion');
                    executionBlockChangeListener();
                    expect(mockCompanionOne.putData).toHaveBeenCalledTimes(5);
                    expect(mockCompanionTwo.putData).toHaveBeenCalledTimes(2);
                });
            });

            describe('workflows', function() {
                const workflowPath = '/rehagoal/companions/workflow_list';
                const workflowMessage: ListMessage = {"workflow_list": [{"id": 0, "name": "Test Workflow"}]};
                const stopPath = '/rehagoal/companions/stop';
                const stopWorkflow: StopMessage = {stop: {id: 3}};

                beforeEach(() => {
                    smartCompanionService.addConnectionCompanion(mockCompanionOne, 'testCompanion');
                });

                it('should send a ListMessage if a device requested a new workflow list', function() {
                    smartCompanionService.handleWorkflowList(workflowMessage);
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(workflowPath, workflowMessage);
                });

                it('should send a ListMessage to all devices if a new workflow list is requested', function() {
                    smartCompanionService.addConnectionCompanion(mockCompanionTwo, 'anotherCompanion');
                    smartCompanionService.handleWorkflowList(workflowMessage);
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(workflowPath, workflowMessage);
                    expect(mockCompanionTwo.putData).toHaveBeenCalledWith(workflowPath, workflowMessage);
                });

                it('should not send ListMessage to devices that have been removed if a new workflow list is requested', function() {
                    smartCompanionService.addConnectionCompanion(mockCompanionTwo, 'anotherCompanion');
                    smartCompanionService.removeConnectionCompanion(mockCompanionTwo, 'anotherCompanion');
                    smartCompanionService.handleWorkflowList(workflowMessage);
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(workflowPath, workflowMessage);
                    expect(mockCompanionTwo.putData).not.toHaveBeenCalledWith(workflowPath, workflowMessage);
                });

                it('should not send ListMessage if no data was given', function() {
                    const emptyWorkflowMessage: ListMessage = {"workflow_list": []};
                    smartCompanionService.handleWorkflowList(emptyWorkflowMessage);
                    expect(mockCompanionOne.putData).not.toHaveBeenCalledWith(workflowPath, emptyWorkflowMessage);
                    expect(mockCompanionOne.putData).not.toHaveBeenCalledWith(workflowPath, jasmine.anything());
                });

                it('should notify the workflow execution that a stop request was sent from a connected device', function() {
                    smartCompanionService.setExecutionComponent(mockExecutionComponent);
                    smartCompanionService.handleStop(stopWorkflow);
                    expect(mockExecutionComponent.onWorkflowFinish).toHaveBeenCalled();
                    expect(mockExecutionComponent.onWorkflowFinishClick).toHaveBeenCalled();
                });

                it('should notify companions that a workflow execution has been finished', function() {
                    setExecutionComponentAndAddCompanion(mockExecutionComponent, mockCompanionTwo, 'anotherCompanion')
                    const executionWorkflowFinishListener = mockExecutionComponent.addWorkflowFinishListener.calls.mostRecent().args[0];
                    executionWorkflowFinishListener(stopWorkflow.stop.id);
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(stopPath, stopWorkflow);
                    expect(mockCompanionTwo.putData).toHaveBeenCalledWith(stopPath, stopWorkflow);
                });

                it('should NOT notify the workflow execution that a stop request was send if stop ID does not match workflow ID', function() {
                    const stopWorkflow: StopMessage = {stop: {id: 5}};
                    smartCompanionService.setExecutionComponent(mockExecutionComponent);
                    smartCompanionService.handleStop(stopWorkflow);
                    expect(mockExecutionComponent.onWorkflowFinish).not.toHaveBeenCalled();
                    expect(mockExecutionComponent.onWorkflowFinishClick).not.toHaveBeenCalled();
                });
            });

            describe('taskExecution', function() {
                const taskData = { task: {
                    id: 1,
                    type: BlockType.Simple,
                    text: 'Text',
                    workflowId: 3
                }};
                const taskPath = '/rehagoal/companions/task';

                beforeEach(() => {
                    setExecutionComponentAndAddCompanion(mockExecutionComponent, mockCompanionOne, 'testCompanion')
                    mockExecutionComponent.getCurrentBlockIndex.and.returnValue(1);
                    mockExecutionComponent.getCurrentBlockText.and.returnValue("Text");
                    executionBlockChangeListener = mockExecutionComponent.addBlockChangeListener.calls.mostRecent().args[0];
                });

                afterAll(() => {
                    executionBlockChangeListener = () => {};
                });

                it('should create a task and send the data string to one companion', function() {
                    mockExecutionComponent.getCurrentBlockType.and.returnValue(BlockType.Simple);
                    executionBlockChangeListener();
                    expect(mockExecutionComponent.getCurrentBlockIndex).toHaveBeenCalled();
                    expect(mockExecutionComponent.getCurrentBlockText).toHaveBeenCalled();
                    expect(mockExecutionComponent.getCurrentBlockType).toHaveBeenCalled();
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(taskPath, taskData);
                });

                it('should create a task and send the data string to multiple companions', function() {
                    smartCompanionService.addConnectionCompanion(mockCompanionTwo, 'testCompanionTwo');
                    mockExecutionComponent.getCurrentBlockType.and.returnValue(BlockType.Simple);
                    executionBlockChangeListener();
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(taskPath, taskData);
                    expect(mockCompanionTwo.putData).toHaveBeenCalledWith(taskPath, taskData);
                });

                it('should extend the task with a timer if BlockType is Timer', function() {
                    const timerTaskData = { task: {...taskData.task, ...{ type: BlockType.Timer, timer: 1} } };
                    mockExecutionComponent.getCurrentBlockType.and.returnValue(BlockType.Timer);
                    mockExecutionComponent.getTimerBlockTimer.and.returnValue(1);
                    executionBlockChangeListener();
                    expect(mockExecutionComponent.getTimerBlockTimer).toHaveBeenCalled();
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(taskPath, timerTaskData);
                });

                it('should extend the task with quantity and subtasks if BlockType is Parallel and parallelFlow is not null', function() {
                    const parallelTaskData = { task: {...taskData.task, ...{ type: BlockType.Parallel, quantity: 1, subtasks: [] } } };
                    mockExecutionComponent.getCurrentBlockType.and.returnValue(BlockType.Parallel);
                    mockExecutionComponent.getCurrentParallelFlows.and.returnValue([]);
                    mockExecutionComponent.getParallelTaskNumTodo.and.returnValue(1);
                    executionBlockChangeListener();
                    expect(mockExecutionComponent.getCurrentParallelFlows).toHaveBeenCalled();
                    expect(mockExecutionComponent.getParallelTaskNumTodo).toHaveBeenCalled();
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(taskPath, parallelTaskData);
                });

                it('should NOT extend task if parallelFlows is null', function() {
                    const parallelTaskData = { task: {...taskData.task, ...{ type: BlockType.Parallel} } };
                    mockExecutionComponent.getCurrentBlockType.and.returnValue(BlockType.Parallel);
                    mockExecutionComponent.getCurrentParallelFlows.and.returnValue(null);
                    executionBlockChangeListener();
                    expect(mockExecutionComponent.getCurrentParallelFlows).toHaveBeenCalled();
                    expect(mockExecutionComponent.getParallelTaskNumTodo).not.toHaveBeenCalled();
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(taskPath, parallelTaskData);
                });
            });

            describe('reply', function() {
                let mockExecutionComponent: any;
                let msg: ReplyMessage = { reply: { taskId: 1, response: "" } };

                beforeEach(() => {
                    mockExecutionComponent = jasmine.createSpyObj('SpyExecutionComponent', [
                        'addBlockChangeListener',
                        'addWorkflowFinishListener',
                        'addOnNotificationListener',
                        'selectYes',
                        'selectNo',
                        'selectCheck',
                        'getCurrentBlockIndex',
                        'getCurrentParallelFlows'
                    ]);
                    smartCompanionService.setExecutionComponent(mockExecutionComponent);
                    mockExecutionComponent.getCurrentBlockIndex.and.returnValue(1);
                });

                it('should call "selectYes" method if reply is "YES"', function() {
                    msg.reply.response = REHAGOAL_TASK_REPLY_YES;
                    smartCompanionService.handleReply(msg);
                    expect(mockExecutionComponent.selectYes).toHaveBeenCalled();
                });

                it('should call "selectNo" method if reply is "NO"', function() {
                    msg.reply.response = REHAGOAL_TASK_REPLY_NO;
                    smartCompanionService.handleReply(msg);
                    expect(mockExecutionComponent.selectNo).toHaveBeenCalled();
                });

                it('should call "selectCheck" method if reply is "OK"', function() {
                    msg.reply.response = REHAGOAL_TASK_REPLY_OK;
                    smartCompanionService.handleReply(msg);
                    expect(mockExecutionComponent.selectCheck).toHaveBeenCalledWith();
                });

                it('should do nothing for other replies and parallelFlow being null', function() {
                    mockExecutionComponent.getCurrentParallelFlows.and.returnValue(null);
                    spyOn($rootScope, '$broadcast').and.callThrough();
                    smartCompanionService.handleReply(msg);
                    expect($rootScope.$broadcast).not.toHaveBeenCalled();
                });

                it('should broadcast "infoModel.confirm" if reply is "INFO_OK"', function() {
                    msg.reply.response = REHAGOAL_NOTIFICATION_REPLY_OK;
                    spyOn($rootScope, '$broadcast').and.callThrough();
                    smartCompanionService.handleReply(msg);
                    expect($rootScope.$broadcast).toHaveBeenCalledWith('infoModal.confirm');
                });
            });

            describe('notifications', function() {
                const notificationPath = '/rehagoal/companions/notification';
                const notificationData = { notification: { text: 'somethingHappened', taskId: undefined, workflowId: 3 } };
                let executionNotificationListener: Function;

                beforeEach(() => {
                    setExecutionComponentAndAddCompanion(mockExecutionComponent, mockCompanionOne, 'testCompanion')
                    executionNotificationListener = mockExecutionComponent.addOnNotificationListener.calls.mostRecent().args[0];
                });

                it('should create notifications messages', function() {
                    smartCompanionService.setExecutionComponent(mockExecutionComponent);
                    executionNotificationListener('somethingHappened');
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(notificationPath, notificationData);
                });

            });

            describe('qrcode', function() {
                it('should sent the qrcode url to the intent service', function() {
                   const sampleQRcode: QRcodeMessage = { qrcode: { url: 'https://127.0.0.1' } };
                   spyOn(intentImportService, 'onNewIntent').and.callThrough();
                   smartCompanionService.handleQRcode(sampleQRcode);
                   expect(intentImportService.onNewIntent).toHaveBeenCalledWith(sampleQRcode.qrcode.url);
                });
            });

            describe('pings', function() {
                const pingPath = '/rehagoal/companions/ping';
                const pingData: PingMessage = { ping: { rehagoal_api_version: REHAGOAL_API_VERSION } };
                const workflowListPath = '/rehagoal/companions/workflow_list';
                const workflowListData: ListMessage = { workflow_list: [{ id: 0, name: 'Test Workflow' }] };

                beforeEach(() => {
                    smartCompanionService.addConnectionCompanion(mockCompanionOne, 'testCompanion');
                });

                it('should notify a device about the current API version in use', function() {
                    smartCompanionService.addConnectionCompanion(mockCompanionTwo, 'pingCompanion');
                    expect(mockCompanionTwo.putData).toHaveBeenCalledWith(pingPath, pingData);
                });

                it('should notify that a device has connected to the app and send workflow list', function() {
                    smartCompanionService.handlePing(pingData);
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(pingPath, pingData);
                    expect(mockCompanionOne.putData).toHaveBeenCalledWith(workflowListPath, workflowListData);
                });

                it('should send ping but no workflow list if API version is not supported', function() {
                    let invalidApiPing = pingData;
                    invalidApiPing.ping.rehagoal_api_version = 0;
                    smartCompanionService.handlePing(invalidApiPing);
                    expect(mockCompanionOne.putData).not.toHaveBeenCalledWith(workflowListPath, workflowListData);
                });
            });
        });
    });
}
