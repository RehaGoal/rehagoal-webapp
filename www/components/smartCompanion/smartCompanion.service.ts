module rehagoal.smartCompanion {
    import IExecutionComponent = rehagoal.executionComponent.IExecutionComponent;
    import WorkflowExecution = rehagoal.workflow.WorkflowExecution;
    import TaskBlock = rehagoal.workflow.TaskBlock;
    import extend =  rehagoal.utilities.extend;

    const moduleName = 'rehagoal.smartCompanion';

    export class SmartCompanionService implements ISmartCompanionService {
        static $inject = [
            '$log',
            '$rootScope',
            '$location',
            'workflowService',
            'settingsService',
            'intentImportService',
            'wearCompanionService',
            'bluetoothCompanionService'
        ];

        private readonly connectionCompanions: IConnectionCompanion[];
        private executionComponent: IExecutionComponent | null = null;
        private handleDispatcher: Map<string,ProtocolMessageHandler>;

        constructor(private $log: angular.ILogService,
                    private $rootScope: angular.IRootScopeService,
                    private $location: angular.ILocationService,
                    private workflowService: IWorkflowService,
                    private settingsService: rehagoal.settings.SettingsService,
                    private intentImportService: rehagoal.intents.IntentImportService,
                    private wearCompanionService: WearCompanionService,
                    private bluetoothCompanionService: BluetoothCompanionService){

            this.connectionCompanions = [];
            let keyValues:[string, ProtocolMessageHandler][] = [
                [smartCompanion.REHAGOAL_API_TYPE_WORKFLOW_LIST, (msg: ProtocolMessage) => this.handleWorkflowList(msg as ListMessage)],
                [smartCompanion.REHAGOAL_API_TYPE_REPLY, (msg: ProtocolMessage) => this.handleReply(msg as ReplyMessage)],
                [smartCompanion.REHAGOAL_API_TYPE_START, (msg: ProtocolMessage) => this.handleStartWorkflow(msg as StartMessage)],
                [smartCompanion.REHAGOAL_API_TYPE_STOP, (msg: ProtocolMessage) => this.handleStop(msg as StopMessage)],
                [smartCompanion.REHAGOAL_API_TYPE_QRCODE, (msg: ProtocolMessage) => this.handleQRcode(msg as QRcodeMessage)],
                [smartCompanion.REHAGOAL_API_TYPE_PING, (msg: ProtocolMessage) => this.handlePing(msg as PingMessage)]
            ];
            this.handleDispatcher = new Map<string,ProtocolMessageHandler>(keyValues);

            // add settings listener
            settingsService.addSettingsChangeListener(this.onSettingsChanged);

            // apply current settings
            this.applySettings();
        }

        // =========================================
        // config
        // =========================================
        /**
         * Adds a new companion to the current existing connection list
         * @param connection   inherited from IConnectionCompanion interface
         * @param name         name of the companion
         */
        public addConnectionCompanion(connection: IConnectionCompanion, name: String): void {
            this.$log.info(`[smartCompanionService]addConnectionCompanion: ${name}`);
            this.connectionCompanions.push(connection);

            // set listener
            try {
                connection.setDataReceivedListener(this.onDataReceived);
                this.sendPing();
            } catch (e) {
                this.$log.error('Error while adding a connection companion', e);
                this.connectionCompanions.splice(this.connectionCompanions.length - 1, 1);
            }
        }

        /**
         * Removes a given companion from the connection list
         * @param connection    inherited from IConnectionCompanion interface
         * @param name          name of the companion service
         */
        public removeConnectionCompanion(connection: IConnectionCompanion, name: String): void {
            for (let i = 0; i < this.connectionCompanions.length; i++) {
                if(connection === this.connectionCompanions[i]) {
                    this.$log.info(`[smartCompanionService]removeConnectionCompanion: ${name}`);
                    this.connectionCompanions.splice(i, 1);
                    connection.setDataReceivedListener(null);
                    return;
                }
            }
        }

        /**
         * Sets the current workflow execution component for this companion
         * @param execution component of the currently executed workflow
         */
        public setExecutionComponent(execution: IExecutionComponent): void {
            if (execution !== null) {
                this.executionComponent = execution;
                const workflowName = execution.workflow === undefined ? '' : execution.workflow.name;
                this.$log.info(`[smartCompanionService]setExecutionComponent: ${workflowName}`);

                this.executionComponent.addBlockChangeListener(this.onBlockChanged);
                this.executionComponent.addWorkflowFinishListener(this.onWorkflowFinish);
                this.executionComponent.addOnNotificationListener(this.onNotification);
            }
        }

        // =========================================
        // Listener handles
        // =========================================
        /**
         * Listener function which got notified by the observable.
         * It calls the applySettings handler
         */
        private onSettingsChanged = (): void => {
            this.$log.info("[smartCompanionService]onSettingsChanged: received");
            this.applySettings();
        };

        /**
         * Listener function which got notified by the observable.
         * It calls the sendTask handler
         */
        private onBlockChanged = (): void => {
            this.$log.info("[smartCompanionService]onBlockChanged: received");
            if (this.connectionCompanions.length !== 0) {
                this.sendTask();
            }
        };

        /**
         * Listener function which got notified by the observable.
         * It calls the sendNotification handler
         */
        private onNotification = (text: string): void => {
            this.$log.info(`[smartCompanionService]onNotification: received with text: ${text}`);
            if (this.connectionCompanions.length !== 0) {
                this.sendNotification(text);
            }
        };

        /**
         * Listener function which got notified by the observable.
         * It calls the sendStop handler
         */
        private onWorkflowFinish = (id: number): void => {
            this.$log.info(`[smartCompanionService]onFinish: received for ID: ${id}`);
            if (this.connectionCompanions.length !== 0) {
                this.sendStop(id);
            }
        };

        /**
         * Dispatcher function which handles the received data and transfers
         * them to the correct function
         * @param data   a message received from a companion device which could be
         *              TaskMessage, ListMessage, SettingsMessage, ReplyMessage,
         *              StartMessage, StopMessage, PingMessage, QRcodeMessage or
         *              others
         */
        private onDataReceived = (data: string): void => {
            const vm = this;
            if (data === null) {
                return;
            }
            const msg = angular.fromJson(data);
            vm.$log.info(`[smartCompanionService]onMessageReceived with data: ${data}`);

            vm.$rootScope.$applyAsync(function () {
                for (let key in msg) {
                    if (Object.prototype.hasOwnProperty.call(msg, key) && vm.handleDispatcher.has(key)) {
                        let handler = vm.handleDispatcher.get(key);
                        if (handler !== undefined) {
                            handler(msg);
                            break;
                        }
                    }
                }
            });
        };

        // =========================================
        // Workflow
        // =========================================
        /**
         * Creates a new message to push the workflow list to the devices
         */
        private sendWorkflowList(): void {
            let vm = this;
            const workflowList = [];
            for (let workflow of vm.workflowService.getWorkflows()) {
                const entry: WorkflowIdentifier = {
                    id: workflow.id,
                    name: workflow.name
                };
                workflowList.push(entry);
            }

            const msg: ListMessage = {
                workflow_list: workflowList
            };

            vm.$log.info(`[smartCompanionService]sendWorkflowList: ${SmartCompanionService.convertToJSON(msg)}`);

            this.sendData(smartCompanion.REHAGOAL_API_TYPE_WORKFLOW_LIST, msg);
        }

        /**
         * Notifies that a companion device requested a new workflow_list
         * by sending an empty list (companion -> app)
         */
        public handleWorkflowList(data: ListMessage): void {
            const vm = this;
            if (data.workflow_list && data.workflow_list.length > 0) {
                vm.sendWorkflowList();
                vm.$log.info("[smartCompanionService]handleWorkflowList: list requested");
            }
        }

        /**
         * Notifies that a workflow has been selected to start by a companion device
         * @param data    workflow id to be started
         */
        private handleStartWorkflow(data: StartMessage): void {
            const vm = this;
            const startObject: Start = data.start;

            if (startObject.type !== "workflow") {
                return;
            }
            if (vm.workflowService.getWorkflowById(startObject.id) !== null) {
                const target = '/start/' + startObject.id;
                vm.$location.path(target);
                vm.$log.info(`[smartCompanionService]handleStartWorkflow: ${startObject.id}  started.`);
            } else {
                vm.$log.warn(`[smartCompanionService]handleStartWorkflow: No Workflow with ID: ${startObject.id} found`);
            }
        }

        /**
         * Notifies all connected devices that an execution has finished
         * @param id workflow with id has been finished / stopped
         */
        private sendStop(id: number): void {
            this.$log.info(`[smartCompanionService]sendStop: ${id} finished/stopped.`);

            const msg: StopMessage = {
                stop: {
                    id: id
                }
            };
            this.sendData(smartCompanion.REHAGOAL_API_TYPE_STOP, msg);
        }

        /**
         * Notifies the workflow execution that a stop request was send from a connected device
         * @param data stop action received containing the id of the currently executed workflow
         */
        public handleStop(data: StopMessage): void {
            const vm = this;
            if (vm.executionComponent === null) {
                return;
            }

            const stop: Stop = data.stop;
            vm.$log.info(`[smartCompanionService]handleStop: ${stop.id} requested.`);

            if (vm.executionComponent.workflow !== undefined && vm.executionComponent.workflow.id === stop.id) {
                vm.executionComponent.onWorkflowFinish && vm.executionComponent.onWorkflowFinish();
                vm.executionComponent.onWorkflowFinishClick && vm.executionComponent.onWorkflowFinishClick();
            } else {
                vm.$log.warn(`[smartCompanionService]handleStop: Workflow-ID ${stop.id} is currently not running, aborting`);
            }
        }

        // =========================================
        // Task-Execution
        // =========================================
        /**
         * Creates a task data string to be exchanged between devices
         */
        private sendTask(): void {
            const exec = this.executionComponent;
            if (exec === null || exec.workflow === undefined) {
                return;
            }
            const taskID = exec.getCurrentBlockIndex();
            let taskType = exec.getCurrentBlockType();
            taskType === null ? taskType = workflow.BlockType.End : false;
            const taskText = exec.getCurrentBlockText();
            let task: Task = {
                id: taskID,
                type: taskType,
                text: taskText,
                workflowId: exec.workflow.id
            };

            if (workflow.BlockType.Timer === taskType) {
                task = extend(task, {
                    timer: exec.getTimerBlockTimer()
                });
            } else if (workflow.BlockType.Parallel === taskType) {
                const parallelFlows = exec.getCurrentParallelFlows();
                if (parallelFlows === null) {
                    this.$log.error('parallelFlows is null!');
                } else {
                    task = extend(task, {
                        quantity: exec.getParallelTaskNumTodo(),
                        subtasks: SmartCompanionService.createSubtaskListFrom(parallelFlows)
                    });
                }
            }

            const msg: TaskMessage = {
              task: task
            };

            this.$log.info(`[smartCompanionService]sendTask: ${SmartCompanionService.convertToJSON(msg)}`);
            this.sendData(smartCompanion.REHAGOAL_API_TYPE_TASK, msg);
        }

        // =========================================
        // Reply
        // =========================================
        /**
         * Notifier for the task execution that the companion device has send an reply
         * @param data  message package containing the reply id of the current task
         *              and the response from the user
         */
        public handleReply(data: ReplyMessage): void {
            const vm = this;
            const reply: Reply = data.reply;

            if(!vm.executionComponent) {
                return;
            }
            const currentID = vm.executionComponent.getCurrentBlockIndex();

            if (currentID === reply.taskId) {
                vm.$log.info("[smartCompanionService]handleReply: Task reply received");
                switch (reply.response) {
                    case REHAGOAL_TASK_REPLY_YES:
                        vm.executionComponent.selectYes();
                        break;
                    case REHAGOAL_TASK_REPLY_NO:
                        vm.executionComponent.selectNo();
                        break;
                    case REHAGOAL_TASK_REPLY_OK:
                        vm.executionComponent.selectCheck();
                        break;
                    case REHAGOAL_NOTIFICATION_REPLY_OK:
                        vm.$rootScope.$broadcast('infoModal.confirm');
                        break;
                    default:
                        vm.$log.info("[smartCompanionService]handleReply: Subtask reply received");
                        const parallelFlows = vm.executionComponent.getCurrentParallelFlows();
                        if (parallelFlows === null) {
                            vm.$log.error('parallelFlows is null!');
                        } else {
                            const subtaskExecution: WorkflowExecution = parallelFlows[reply.response];
                            const subtasks = parallelFlows.length;
                            if (subtaskExecution) {
                                const task: TaskBlock = subtaskExecution.executionList[0] as TaskBlock;
                                task.done(subtaskExecution);

                                //FIXME: dirty workaround for executionBlockParallel (selectCheck logic)
                                if (subtasks > 1) {
                                    vm.$rootScope.$broadcast('subTaskDone', task);
                                }
                            }
                        }

                }
            } else {
                vm.$log.warn("[smartCompanionService]handleReply: Could not handle response data");
           }

        }

        // =========================================
        // Notifications
        // =========================================
        /**
         * Creates a new Notification message for the companion devices
         * @param text  Notification content
         */
        private sendNotification(text: string): void {
            const vm = this;

            if (vm.executionComponent === null || vm.executionComponent.workflow === undefined) {
                return;
            }
            const msg: NotificationMessage = {
                notification: {
                    text: text,
                    taskId: vm.executionComponent.getCurrentBlockIndex(),
                    workflowId: vm.executionComponent.workflow.id
                }
            };
            this.$log.info(`[smartCompanionService]sendNotification: ${SmartCompanionService.convertToJSON(msg)}`);
            this.sendData(smartCompanion.REHAGOAL_API_TYPE_NOTIFICATION, msg);
        }

        // =========================================
        // QRCode
        // =========================================
        /**
         * if a qr code has been scanned by an companion device, it notifies
         * the rehagoal app to import workflows from the containing url
         * @param data  message package that contains the url to be imported
         */
        public handleQRcode(data: QRcodeMessage): void {
            let vm = this;
            let url = data.qrcode.url;
            vm.$log.info(`[smartCompanionService]handleQRcode: code received from: ${url}`);
            vm.intentImportService.onNewIntent(url);
        }

        // =========================================
        // Ping
        // =========================================
        /**
         * Notifier that a companion has connected to the webapp and requested the info
         * which local version of the api is running or needed
         * @param data      ping package that is contains the api version of the companion
         *                  to process the request. If the version is equal or higher,
         *                  sendWorkflowList will be called
         */
        public handlePing(data: PingMessage): void {
            const vm = this;
            vm.$log.info("[smartCompanionService]handlePing: received a ping request");
            vm.sendPing();

            if (data.ping.rehagoal_api_version >= REHAGOAL_API_VERSION) {
                vm.sendWorkflowList();
            } else {
                vm.$log.info(`[smartCompanionService]handlePing: mismatched API version, expected ${REHAGOAL_API_VERSION}, but got ${data.ping.rehagoal_api_version}`);
            }
        }

        /**
         * Notifies the companion devices about the used api version
         */
        private sendPing(): void {
            const msg: PingMessage = {
                ping: {
                    rehagoal_api_version: smartCompanion.REHAGOAL_API_VERSION
                }
            };
            this.$log.info(`[smartCompanionService]sendPing: ${SmartCompanionService.convertToJSON(msg)}`);
            this.sendData(smartCompanion.REHAGOAL_API_TYPE_PING, msg);
        }

        // =========================================
        // general helper methods
        // =========================================

        /**
         * Helper method to get the user settings and add/remove connectionCompanions
         */
        private applySettings(): void {
            this.settingsService.wearCompanionEnabled ? this.addConnectionCompanion(this.wearCompanionService, "WearCompanionService") : this.removeConnectionCompanion(this.wearCompanionService, "WearCompanionService");
            this.settingsService.bluetoothCompanionEnabled ? this.addConnectionCompanion(this.bluetoothCompanionService, "BluetoothCompanionService") : this.removeConnectionCompanion(this.bluetoothCompanionService, "BluetoothCompanionService");
        }

        /**
         * Helper method to create a subtask list with id, type and text definition
         * @param subflow   WorkflowExecution Objects for all subtasks
         * @returns {Task[]}    List with id, type and text to be used by IConnectionCompanion
         */
        private static createSubtaskListFrom(subflow: WorkflowExecution[]): Task[] {
            let subtasks: Task[] = [];
            for (let i = 0; i < subflow.length; i++) {
                const task: Task = {
                    id: i,
                    type: subflow[i].executionList[0].getBlockType(),
                    text: subflow[i].executionList[0].getText(),
                };
                subtasks.push(task);
            }
            return subtasks;
        }

        /**
         * Converts a given ProtocolMessage into JSON with angular helper class
         * @param msg    ProtocolMessage object to convert
         * @returns {string}    json content
         */
        private static convertToJSON(msg: ProtocolMessage): string {
            return angular.toJson(msg);
        }

        /**
         * This methods sends the received messages to all ConnectionCompanions
         * @param path  path to send the data message to
         * @param data  data to be send to the connected devices
         */
        private sendData(path: string, data: ProtocolMessage): void {
            const vm = this;
            const pathWithPrefix = smartCompanion.REHAGOAL_PATH_PREFIX_COMPANIONS.concat(path);
            vm.connectionCompanions.forEach((connection) => {
                connection.putData(pathWithPrefix, data);
                vm.$log.warn("[smartCompanionService]sendData: ...");
            });
        }
    }
    angular.module(moduleName).service('smartCompanionService', SmartCompanionService);
}
