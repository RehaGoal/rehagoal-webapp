module rehagoal.executionComponent {
    import MetricIdGenerator = rehagoal.metrics.MetricIdGenerator;
    const moduleName = 'rehagoal.executionComponent';

    import WorkflowExecution = rehagoal.workflow.WorkflowExecution;
    import WorkflowFinishListener = rehagoal.smartCompanion.WorkflowFinishListener;
    import BlockChangeListener = rehagoal.smartCompanion.BlockChangeListener;
    import NotificationListener = rehagoal.smartCompanion.NotificationListener;
    import BlockType = rehagoal.workflow.BlockType;
    import ExecutionBlock = rehagoal.workflow.ExecutionBlock;
    import TaskBlock = rehagoal.workflow.TaskBlock;
    import TimerSleepBlock = rehagoal.workflow.TimerSleepBlock;
    import ParallelBlock = rehagoal.workflow.ParallelBlock;
    import ConditionBlock = rehagoal.workflow.ConditionBlock;
    import MetricService = rehagoal.metrics.MetricService;
    import RecordPointAssignment = rehagoal.metrics.RecordPointAssignment;
    import MetricRecorder = rehagoal.metrics.MetricRecorder;
    import GamificationEventType = rehagoal.gamification.GamificationEventType;

    type NotificationData = {title: string, text: string};
    type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];

    export class ExecutionComponentController implements IExecutionComponent {
        static $inject = [
            '$log',
            '$q',
            '$scope',
            '$rootScope',
            '$routeParams',
            '$location',
            '$interval',
            'blocklyService',
            'blocklyConfigService',
            'metricIdGeneratorService',
            'metricService',
            'timerService',
            'countdownService',
            'workflowExecutionService',
            'ttsService',
            'settingsService',
            'imageService',
            'smartCompanionService',
            'gamificationService',
            'generateWorkflowVersionHash'
        ];

        /* Public bindings */
        public workflow: IWorkflow | undefined;
        public hideLog: boolean | undefined;
        public flex: boolean | undefined;
        public contentAlign: 'left' | 'right' | undefined;
        public executionPaused: boolean | undefined;
        public ttsEnabled: boolean | undefined;
        public metricsDisabled: boolean | undefined;
        public gamificationDisabled: boolean | undefined;
        public onWorkflowFinishClick: (() => void) | undefined;
        public onWorkflowFinish: (() => void) | undefined;
        public onNotification: ((data: NotificationData) => void) | undefined;
        public sleepSkipable: boolean | undefined;
        public scrollToCurrent: boolean | undefined;

        /* Private properties */
        private workflowExecution: WorkflowExecution | null = null;
        private executionId: number = -1;
        private lastSelectYes: boolean = false;
        private blockChangeListeners: BlockChangeListener[] = [];
        private workflowFinishListeners: WorkflowFinishListener[] = [];
        private onNotificationListeners: NotificationListener[] = [];
        private timerRequestID: number | null = null;
        private _goalDescription: string = 'Default Goal Description';
        private reminderAcceptedInCurrentBlock = false;
        private currentBlockInAnimation = false;
        private scrollToCurrentBlockIntervalHandle: ng.IPromise<any> | null = null;

        /* Getter properties */
        get goalDescription() {
            return this._goalDescription;
        }


        constructor(private $log: angular.ILogService,
                    private $q: angular.IQService,
                    private $scope: angular.IScope,
                    private $rootScope: angular.IRootScopeService,
                    private $routeParams: angular.route.IRouteParamsService,
                    private $location: angular.ILocationService,
                    private $interval: angular.IIntervalService,
                    private Blockly: rehagoal.blockly.IBlockly,
                    private blocklyConfigService: rehagoal.blocklyConfig.BlocklyConfigService,
                    private metricIdGeneratorService: MetricIdGenerator,
                    private __metricService: MetricService,
                    private timerService: rehagoal.workflow.ExecutionTimerService,
                    private countdownService: any,
                    private workflowExecutionService: rehagoal.workflow.WorkflowExecutionService,
                    private ttsService: rehagoal.tts.TTSService,
                    private settingsService: rehagoal.settings.SettingsService,
                    private imageService: rehagoal.images.ImageService,
                    private smartCompanionService: rehagoal.smartCompanion.ISmartCompanionService,
                    private gamificationService: rehagoal.gamification.IGamificationService,
                    private generateWorkflowVersionHash: (workflow_name: string, xmlHash: string) => string) {
            const vm = this;
            vm.$log.debug('executionComponent initialized.');
            vm.registerWatches();
            vm.registerEventListeners();
        }


        /* Private methods */

        private tryParseBlockly(xmlText: string): Element {
            const xml: Element = this.Blockly.Xml.textToDom(xmlText);
            const document: Document = xml.getRootNode() as Document;
            const errorElement = document.querySelector('parsererror');
            if (errorElement !== null) {
                throw new Error(`Error while parsing Blockly XML: ${document.documentElement.textContent}`);
            }
            return xml;
        }

        private init() {
            let vm = this;
            this.executionId = -1;
            this.workflowExecution = null;

            if (this.workflow === undefined) {
                throw new Error('Workflow to execute is undefined!');
            }
            const xmlText = this.workflow.workspaceXml;
            let xml = this.tryParseBlockly(xmlText);

            this.$log.debug("Initialization deferred until executionId is provided.");
            const executionIdPromise = this.isMetricRecordingEnabled() ? this.metricIdGeneratorService.getNewExecutionId(this.workflow.uuid) : this.$q.resolve(-1);
            executionIdPromise.then(function(executionId) {
                vm.$scope.$evalAsync(function() {
                    vm.$log.debug(`Got executionId (${executionId}). Initializing.`);
                    vm.executionId = executionId;
                    // Set ExecutionComponent in smartCompanionService
                    vm.smartCompanionService.setExecutionComponent(vm);

                    // Create a headless workspace.
                    const workspace = new vm.Blockly.Workspace();
                    vm.Blockly.Xml.domToWorkspace(xml, workspace);
                    vm.blocklyConfigService.updateBlocklyIdMap(workspace);
                    const code = vm.Blockly.JavaScript.workspaceToCode(workspace);
                    const workflowExecution = vm.workflowExecutionService.buildExecutionFromCode(code);
                    vm.$log.debug(workflowExecution);
                    if (workflowExecution === null) {
                        throw new Error('workflowExecution is null in initialization!');
                    }
                    vm.workflowExecution = workflowExecution;
                    vm.workflowExecution.addOnLeaveListener((flow, block) => vm.onLeaveBlock(flow, block));
                    vm.workflowExecution.addOnEnteredListener((flow, block) => vm.onBlockEntered(flow, block));
                    if (vm.workflowExecution.description === undefined) {
                        vm._goalDescription = 'Default Goal Description';
                    } else {
                        vm._goalDescription = vm.workflowExecution.description;
                    }
                    vm.handleTimerRequest();
                    vm.workflowExecution.start();
                    vm.handleWorkflowStart();
                });
            });
        }

        private isMetricRecordingEnabled(): boolean {
            return this.__metricService.recordingEnabled && !this.metricsDisabled;
        }

        private destroy(): void {
            if (this.workflow !== undefined && this.workflowExecution && !this.isWorkflowFinished()) {
                this.handleWorkflowAbort();
            }
            this.executionId = -1;
            this.timerService.removeAllTimers();
            this.countdownService.stopCountdown();
        }

        private makeRecorderWrapper<T extends FunctionPropertyNames<MetricRecorder>>(funcName: T): (...args: Parameters<MetricRecorder[T]>) => void {
            const vm = this;
            return (...args: Parameters<MetricRecorder[T]>): void => {
                if (vm.isMetricRecordingEnabled()) {
                    return (<Function>vm.__metricService[funcName])(...args);
                }
            }
        }

        private metric_record = this.makeRecorderWrapper('record');
        private metric_recordValue = this.makeRecorderWrapper('recordValue');

        private registerWatches() {
            const vm = this;
            vm.$scope.$watch(function () {
                return vm.workflow;
            }, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    vm.init();
                }
            });

            vm.$scope.$watch(function () {
                return vm.executionPaused;
            }, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    vm.handleTimerRequest();
                    vm.$log.debug('execution executionPaused changed');
                }
            });

            vm.$scope.$watch(vm.getCurrentBlockIndex, vm.onBlockIndexChanged);
        }

        private registerEventListeners() {
            const vm = this;
            vm.$scope.$on('executionCountdownEvent', function () {
                vm.sleepTimeOver();
            });

            vm.$scope.$on('executionComponent.resetAllTimersEvent', function () {
                vm.timerService.resetAllTimers();
            });

            vm.$scope.$on('executionComponent.reloadWorkflow', function (event, args?: {skipDestroy?: boolean}) {
                if (!args?.skipDestroy) {
                    vm.destroy();
                }
                vm.init();
            });

            vm.$scope.$on('taskDone', function (event, task) {
                vm.$log.debug('Task done: ' + task.getText());
            });

            vm.$scope.$on('subTaskDone', function (event, task) {
                vm.$log.debug('Task done: ' + task.getText());
                vm.notifyBlockChanged();
            });

            vm.$scope.$on('executionTimerEvent', function () {
                vm.metric_record('notificationReminder', vm.getTaskLevelRecordPointAssignment());
                const text = vm.getCurrentBlockText();
                vm.onNotification && vm.onNotification({title: 'Erinnerung', text: text});
                vm.notifyOnNotification(text);
            });

            vm.$scope.$on('executionComponent.reminderConfirmed', function() {
                if (vm.getCurrentBlock() !== null) {
                    // FIXME: Check type of block?
                    vm.metric_record('reminderAccept', vm.getTaskLevelRecordPointAssignment());
                    vm.reminderAcceptedInCurrentBlock = true;
                }
            });

            vm.$scope.$on('$destroy', function () {
                vm.destroy();
                if (vm.workflow !== undefined) {
                    vm.notifyWorkflowFinish(vm.workflow.id);
                }
            });
        }

        private getExecutionLevelRecordPointAssignment(): RecordPointAssignment {
            if (this.workflow === undefined) {
                throw new Error('Workflow should not be undefined!');
            }
            return {
                workflowId: this.workflow.uuid,
                workflowVersionId: this.generateWorkflowVersionHash(this.workflow.name, this.workflow.xmlHash),
                executionId: this.executionId
            };
        }

        private getTaskLevelRecordPointAssignment(): RecordPointAssignment {
            const currentBlock = this.getCurrentBlock();
            if (!currentBlock || currentBlock.id === null) {
                throw new Error('Task id should be present!');
            }
            return rehagoal.utilities.extend(this.getExecutionLevelRecordPointAssignment(),{
                taskId: currentBlock.id
            });
        }

        private recordMetricsWorkflowStart() {
            const assignment: RecordPointAssignment = this.getExecutionLevelRecordPointAssignment();
            this.metric_record('workflowStart', assignment);
            // TODO: Maybe add mapping to tts speed ratio / percent?
            if (this.settingsService.ttsEnabled) {
                this.metric_recordValue('workflowStart_ttsSpeed', assignment, this.settingsService.currentTTSSpeedIndex);
            }
        }

        private recordMetricsWorkflowAbort() {
            if (!this.workflowExecution) {
                return;
            }
            const assignment: RecordPointAssignment = this.getExecutionLevelRecordPointAssignment();
            const currentBlock = this.workflowExecution.getCurrent();
            if (currentBlock !== null && currentBlock.id !== null) {
                const abortedBlockIndex = currentBlock.id;
                this.metric_recordValue('workflowAbort_task', assignment, abortedBlockIndex);
            } else {
                this.$log.warn("Workflow aborted but currentBlock or .id was null!", currentBlock);
            }
            this.metric_record('workflowAbort', assignment);

            if (this.settingsService.ttsEnabled) {
                this.metric_record('workflowAbort_withTTS', assignment);
            } else {
                this.metric_record('workflowAbort_withoutTTS', assignment);
            }
        }

        private recordMetricsWorkflowEnd() {
            if (this.workflow !== undefined) {
                const assignment: RecordPointAssignment = this.getExecutionLevelRecordPointAssignment();
                this.metric_record('workflowEnd', assignment);
                if (this.settingsService.ttsEnabled) {
                    this.metric_record('workflowEnd_withTTS', assignment);
                } else {
                    this.metric_record('workflowEnd_withoutTTS', assignment);
                }
            }
        }

        private recordMetricsTaskStart() {
            const optionsString = this.metricsGetCurrentTaskOptionsString();
            this.metric_record(`taskStart_${optionsString}`, this.getTaskLevelRecordPointAssignment());
        }

        private recordMetricsTaskEnd() {
            const optionsString = this.metricsGetCurrentTaskOptionsString();
            this.metric_record(`taskEnd_${optionsString}`, this.getTaskLevelRecordPointAssignment());
        }

        private recordMetricsBlockEntered() {
            if (!this.isMetricRecordingEnabled()) {
                return;
            }
            this.metric_record('blockEnter', this.getTaskLevelRecordPointAssignment());
        }

        private recordMetricsBlockLeave() {
            if (!this.isMetricRecordingEnabled()) {
                return;
            }
            this.metric_record('blockLeave', this.getTaskLevelRecordPointAssignment());
        }

        private metricsIsBlockAcceptBlock(block: ExecutionBlock): boolean {
            const blockType = block.getBlockType();
            const acceptedTypes = [BlockType.Simple, BlockType.Conditional, BlockType.Parallel];
            return acceptedTypes.some(
                (acceptedType) => blockType === acceptedType
            );
        }

        private metricsIsTaskBlock(block: ExecutionBlock): boolean {
            const blockType = block.getBlockType();
            const acceptedTypes = [BlockType.Simple];
            return acceptedTypes.some((acceptedType) => blockType === acceptedType);
        }

        private metricsIsRecordOnEnterOrLeaveBlock(block: ExecutionBlock): boolean {
            if (!block) {
                return false;
            }
            const blockType = block.getBlockType();
            const acceptedTypes = [BlockType.Simple, BlockType.Conditional, BlockType.Parallel, BlockType.Timer];
            return acceptedTypes.some((acceptedType) => blockType === acceptedType);
        }

        private metricsGetCurrentTaskOptionsString(): string {
            const hasImage: boolean = !!this.getCurrentBlockImageHash();
            const hasText: boolean = !!this.getCurrentBlockText();
            const ttsEnabled: boolean = this.settingsService.ttsEnabled;
            const imageSign = hasImage ? '+' : '-';
            const textSign = hasText ? '+' : '-';
            const ttsSign = ttsEnabled ? '+' : '-';
            return `(${imageSign}Image,${textSign}Text,${ttsSign}TTS)`;
        }

        private handleGamificationWorkflowStart() {
            this.handleGamificationEvent(GamificationEventType.WORKFLOW_START);
        }
        private handleGamificationTaskDone() {
            this.handleGamificationEvent(GamificationEventType.TASK_DONE);
        }
        private handleGamificationWorkflowFinish() {
            this.handleGamificationEvent(GamificationEventType.WORKFLOW_FINISH);
        }

        private handleGamificationEvent(event: GamificationEventType) {
            if (this.gamificationDisabled) {
                return;
            }
            this.gamificationService.handleGamificationEvent(event).catch((e) => {
                this.$log.error(`Handling of GamificationEvent ${event} failed: `, e);
            });
        }

        private gamificationIsTaskBlock(block: ExecutionBlock) {
            const blockType = block.getBlockType();
            /** add or remove BlockTypes from acceptedTypes to change which blocks are awarded with points */
            const acceptedTypes = [BlockType.Simple, BlockType.Timer, BlockType.Parallel];
            return acceptedTypes.some((acceptedType) => blockType === acceptedType);
        }

        private handleWorkflowStart() {
            this.recordMetricsWorkflowStart();
            this.handleGamificationWorkflowStart();
        }

        private handleWorkflowAbort() {
            this.recordMetricsWorkflowAbort();
        }

        private handleWorkflowFinish() {
            this.recordMetricsWorkflowEnd();
            this.handleGamificationWorkflowFinish();
            this.onWorkflowFinish && this.onWorkflowFinish()
        }

        private handleTimerRequest(): void {
            if (!this.workflowExecution) return;
            if (this.executionPaused) {
                this.timerRequestID === null ? this.timerRequestID = this.workflowExecution.requestDisableTimer() : false;
            } else {
                this.workflowExecution.requestEnableTimer(this.timerRequestID!);
                this.timerRequestID = null;
            }
        }

        private sleepTimeOver(): void {
            if (!this.workflowExecution) return;
            let task = this.getCurrentBlock();
            if (task !== null && task.isTimerSleepBlock()) {
                this.$scope.$broadcast('sleepTimeOver', task);
                (task as TimerSleepBlock).done(this.workflowExecution);
                this.timerService.resetAllTimers();
            }
        }

        private isWorkflowFinished(): boolean {
            if (!this.workflowExecution) return true;
            return this.workflowExecution.executionFinished;
        }

        private speakCurrentBlock(): void {
            let vm = this;
            vm.ttsService.speak(vm.getCurrentBlockText()).then(function() {
                let text = "";
                if (vm.isCurrentParallelBlock()) {
                    text += vm.getParallelBlockSpeakText();
                    vm.ttsService.speak(text);
                }
            });
        }

        private selectYesNo: (isYes: boolean, event?: Event) => void = (isYes, event) => {
            if (event !== undefined) {
                event.stopPropagation();
            }
            if (!this.workflowExecution) return;
            let task = this.getCurrentBlock();
            if (task !== null && task.isConditionBlock()) {
                const conditionBlock = task as ConditionBlock;
                if (isYes) {
                    conditionBlock.selectYes(this.workflowExecution);
                } else {
                    conditionBlock.selectNo(this.workflowExecution);
                }
                this.lastSelectYes = isYes;
                this.timerService.resetAllTimers();
                const eventName = isYes ? 'conditionSelectYes' : 'conditionSelectNo';
                this.$scope.$broadcast(eventName, task);
            }
        };

        private getParallelBlockSpeakText(): string {
            let text = "";
            text += this.getParallelTaskNumTodo() + " von " + this.getParallelTaskNumRemain() + ":\n";
            const flows = this.getCurrentParallelFlows();
            if (flows !== null) {
                for (let i = 0; i < flows.length; ++i) {
                    const currentBlock = flows[i].getCurrent();
                    if (currentBlock !== null) {
                        text += currentBlock.getText() + "\n";
                    }
                }
            }
            return text;
        }

        private onBlockIndexChanged: () => void = () => {
            if (!this.workflowExecution) {
                return;
            }
            this.isWorkflowFinished() ? this.handleWorkflowFinish() : false;
            if (this.ttsEnabled) {
                this.speakCurrentBlock();
            }
            this.notifyBlockChanged();
        };

        /**
         * Scrolls the current block into view, if `scrollToCurrent` is true.
         * This is done by broadcasting the 'scrollToCurrentBlock' event, which is received by scrollIntoViewEvent directive.
         */
        private scrollToCurrentBlockIfEnabled() {
            if (this.scrollToCurrent) {
                this.$log.debug("$broadcast scrollToCurrentBlock");
                this.$scope.$broadcast('scrollToCurrentBlock');
            }
        }

        /**
         * Schedule scrollToCurrentBlockIfEnabled at a later point, to ensure element is
         * still in view.
         */
        private scheduleScrollToCurrentBlockIfEnabled() {
            const intervalMs = 200;
            const count = 1;
            if (this.scrollToCurrentBlockIntervalHandle !== null) {
                this.$interval.cancel(this.scrollToCurrentBlockIntervalHandle);
                this.scrollToCurrentBlockIntervalHandle = null;
            }
            this.scrollToCurrentBlockIntervalHandle = this.$interval(() => this.scrollToCurrentBlockIfEnabled(), intervalMs, count);
        }

        /**
         * Calls scrollToCurrentBlockIfEnabled and schedules a later call, to ensure that element ist still in view
         */
        public scrollToCurrentBlockAndScheduleIfEnabled() {
            this.scrollToCurrentBlockIfEnabled();
            this.scheduleScrollToCurrentBlockIfEnabled();
        }

        /**
         * Callback for onAnimate directive. Called when enter animation starts or finishes.
         * This is triggered from the onAnimate directive.
         * @see https://docs.angularjs.org/api/ng/service/$animate#enter
         * @param eventName The name of the animation event. Should only get called on enter.
         * @param phase The phase of the animation. The two possible phases are start (when the animation starts) and close (when it ends).
         */
        public onAnimateEnter(eventName: string, phase: string | undefined) {
            this.currentBlockInAnimation = phase === "start";
            if (phase === "close") {
                this.scrollToCurrentBlockAndScheduleIfEnabled();
            }
        }

        /**
         * Called when the current block image has loaded (if there is any).
         * Triggered by onLoad directive in executionBlock[Parallel].
         */
        public onCurrentBlockImageLoaded(): void {
            // only scroll to the block if it is not already animated (it will be scrolled to at the end of the animation anyway)
            if (!this.currentBlockInAnimation) {
                this.scrollToCurrentBlockAndScheduleIfEnabled();
            }
        }

        private onLeaveBlock(flow: WorkflowExecution, leaveBlock: ExecutionBlock) {
            this.$log.debug("Leaving", leaveBlock);
            if (this.metricsIsRecordOnEnterOrLeaveBlock(leaveBlock)) {
                this.recordMetricsBlockLeave();
            }
            if (this.metricsIsBlockAcceptBlock(leaveBlock) && this.reminderAcceptedInCurrentBlock) {
                this.metric_record('blockAccept_withAcceptedReminder', this.getTaskLevelRecordPointAssignment());
            }
            if (this.metricsIsTaskBlock(leaveBlock)) {
                this.recordMetricsTaskEnd();
            }
            this.reminderAcceptedInCurrentBlock = false;
            if (this.gamificationIsTaskBlock(leaveBlock)) {
                this.handleGamificationTaskDone()
            }
        }

        private onBlockEntered(flow: WorkflowExecution, enteredBlock: ExecutionBlock) {
            this.$log.debug("Entered", enteredBlock);
            if (this.metricsIsRecordOnEnterOrLeaveBlock(enteredBlock)) {
                this.recordMetricsBlockEntered();
            }
            if (this.metricsIsTaskBlock(enteredBlock)) {
                this.recordMetricsTaskStart();
            }
        }

        private getPreviousBlock(): ExecutionBlock | null {
            if (!this.workflowExecution) return null;
            return this.workflowExecution.getPrevious();
        }

        private getCurrentBlock(): ExecutionBlock | null {
            if (!this.workflowExecution) return null;
            return this.workflowExecution.getCurrent();
        }

        private getNextBlock(): ExecutionBlock | null {
            if (!this.workflowExecution) return null;
            return this.workflowExecution.getNext();
        }

        private notifyBlockChanged(): void {
            this.blockChangeListeners.forEach(function (listener: BlockChangeListener) {
                listener();
            });
        }

        private notifyWorkflowFinish(workflowId: number): void {
            this.workflowFinishListeners.forEach(function (listener: WorkflowFinishListener) {
                listener(workflowId);
            });
        }

        private notifyOnNotification(text: string): void {
            this.onNotificationListeners.forEach(function (listener: NotificationListener) {
                listener(text);
            });
        }


        /* Public getters */

        public getPreviousBlockShowYes(): boolean {
            const prev = this.getPreviousBlock();
            if (prev !== null) {
                return prev.isConditionBlock() && this.lastSelectYes;
            } else {
                return false;
            }
        }

        public getPreviousBlockShowNo(): boolean {
            const prev = this.getPreviousBlock();
            if (prev !== null) {
                return prev.isConditionBlock() && !this.lastSelectYes;
            } else {
                return false;
            }
        }

        public getPreviousBlockShowCheck(): boolean {
            const prev = this.getPreviousBlock();
            if (prev !== null) {
                return !prev.isConditionBlock();
            } else {
                return false;
            }
        }

        public getPreviousBlockText(): string {
            const block = this.getPreviousBlock();
            if (block !== null) {
                return block.getText();
            } else {
                return 'START';
            }
        }

        public isCurrentParallelBlock() {
            const block = this.getCurrentBlock();
            if (block !== null) {
                return block.isParallelBlock();
            } else {
                return false;
            }
        }

        public getCurrentBlockText(): string {
            if (!this.workflowExecution) return 'Error getCurrentBlockText';
            if (this.workflowExecution.executionFinished) {
                return 'ENDE';
            } else {
                const block = this.getCurrentBlock();
                if (block !== null) {
                    return block.getText();
                } else {
                    return 'Error getCurrentBlockText';
                }
            }
        }

        public getCurrentBlockImageHash(): string | null {
            const currentBlock = this.getCurrentBlock();
            if (!currentBlock) {
                return null;
            }
            return currentBlock.getImageHash();
        }

        public getCurrentBlockAdditionalText(): string {
            if (!this.workflowExecution) return '';
            if (this.workflowExecution.executionFinished) {
                return '';
            } else {
                const block = this.getCurrentBlock();
                if (block !== null && block.isTimerSleepBlock()) {
                    return (block as TimerSleepBlock).getAdditionalText();
                } else {
                    return '';
                }
            }
        }

        public getCurrentButtonDisabled(): boolean {
            let current = this.getCurrentBlock();
            if (current !== null) {
                return current.isTimerRunning();
            }
            return false;
        }

        public getCurrentBlockIndex: () => number = () => {
            if (!this.workflowExecution) {
                return -1;
            }
            return this.workflowExecution.getCurrentIndex();
        };

        public getCurrentBlockType(): BlockType | null {
            const block = this.getCurrentBlock();
            if (block !== null) {
                return block.getBlockType();
            }
            return null;
        }

        public getCurrentBlockShowCondition(): boolean {
            const current = this.getCurrentBlock();
            if (current !== null) {
                return current.isConditionBlock();
            } else {
                return false;
            }
        }

        public getCurrentBlockSkipable(): boolean {
            const current = this.getCurrentBlock();
            if (current !== null) {
                return !!this.sleepSkipable && current.isTimerSleepBlock();
            } else {
                return false;
            }
        }

        public getCurrentBlockShowCheck(): boolean {
            if (!this.workflowExecution) return false;
            const current = this.getCurrentBlock();
            if (this.workflowExecution.executionFinished || current === null) {
                return false;
            } else {
                return !current.isTimerSleepBlock() && !current.isConditionBlock();
            }
        }

        public getCurrentParallelFlows(): WorkflowExecution[] | null {
            let block = this.getCurrentBlock();
            if (block === null || !block.isParallelBlock()) {
                return null;
            }
            return (block as ParallelBlock).parallel_flows;
        }

        public getNextBlockText(): string {
            if (!this.workflowExecution) return '';
            const next = this.getNextBlock();
            const current = this.getCurrentBlock();
            if (this.workflowExecution.executionFinished) {
                return '';
            } else if (current !== null
                && current.isConditionBlock()) {
                return '???';
            } else if (next !== null) {
                return next.getText();
            } else {
                return 'ENDE';
            }
        }

        public getNextBlockShowCondition(): boolean {
            if (!this.workflowExecution) return false;
            const next = this.getNextBlock();
            const current = this.getCurrentBlock();
            if (this.workflowExecution.executionFinished) {
                return false;
            } else if (current !== null &&
                current.isConditionBlock()) {
                return false;
            } else if (next !== null) {
                return next.isConditionBlock();
            } else {
                return false;
            }
        }

        public getNextBlockShowCheck(): boolean {
            if (!this.workflowExecution) return false;
            const next = this.getNextBlock();
            const current = this.getCurrentBlock();
            if (this.workflowExecution.executionFinished) {
                return false;
            } else if (current !== null &&
                current.isConditionBlock()) {
                return false;
            } else if (next !== null) {
                return !next.isConditionBlock();
            } else {
                return false;
            }
        }

        public getParallelTaskNumTodo(): number {
            if (this.isCurrentParallelBlock()) {
                return (this.getCurrentBlock() as ParallelBlock).getTaskNumberTodo();
            }
            return 0;
        }

        public getParallelTaskNumRemain(): number {
            if (this.isCurrentParallelBlock()) {
                return (this.getCurrentBlock() as ParallelBlock).getTaskNumberRemain();
            }
            return 0;
        }

        public getTimerBlockTimer(): number {
            const block = this.getCurrentBlock();
            if (block !== null && block.isTimerSleepBlock()) {
                return (this.getCurrentBlock() as TimerSleepBlock).sleepTime;
            }
            return 0;
        }


        /* Public action bindings */


        public $onInit() {
            this.init();
        }

        public selectCheck: (event?: Event) => void = (event) => {
            if (event !== undefined) {
                event.stopPropagation();
            }
            if (!this.workflowExecution) return;
            let task = this.getCurrentBlock();
            if (task !== null && !task.isConditionBlock()) {
                (task as TaskBlock).done(this.workflowExecution);
                this.timerService.resetAllTimers();
                this.$scope.$broadcast('taskDone', task);
            }
        };

        public selectLabel(): void {
            if (!this.workflowExecution) return;
            this.speakCurrentBlock();
            if (this.workflowExecution.executionFinished) {
                if (this.workflow !== undefined) {
                    this.$scope.$broadcast('workflowDone', this.workflow.name);
                }
                this.onWorkflowFinishClick && this.onWorkflowFinishClick();
            }
        }

        public selectParallelMiniLabel = (flow: WorkflowExecution, block: ExecutionBlock): void =>{
            if (!!block) {
                this.ttsService.speak(block.getText());
            }
        };

        public selectParallelTitle = (): void => {
            this.speakCurrentBlock();
        };

        public selectYes: (event?: Event) => void = (event) => {
            this.selectYesNo(true, event);
        };

        public selectNo: (event?: Event) => void = (event) => {
            this.selectYesNo(false, event);
        };

        public selectSkip: (event?: Event) => void = (event) => {
            if (event !== undefined) {
                event.stopPropagation();
            }
            if (!this.getCurrentBlockSkipable()) {
                return;
            }
            const block = this.getCurrentBlock();
            if (!block || !block.isTimerSleepBlock()) {
                return;
            }
            block.forceFinish();
        }

        /* Public methods */

        public addBlockChangeListener(listener: BlockChangeListener): void {
            this.blockChangeListeners.push(listener);
        }

        public addWorkflowFinishListener(listener: WorkflowFinishListener): void {
            this.workflowFinishListeners.push(listener);
        }

        public addOnNotificationListener(listener: NotificationListener): void {
            this.onNotificationListeners.push(listener);
        }
    }

    angular.module(moduleName, [
        'ngRoute',
        'webStorageModule',
        'rehagoal.utilities',
        'rehagoal.workflow',
        'rehagoal.blocklyConfig',
        'rehagoal.infoModal',
        'rehagoal.tts',
        'rehagoal.smartCompanion',
        'rehagoal.images',
        'rehagoal.metrics',
        'rehagoal.gamification'
    ]).component('executionComponent', {
        templateUrl: 'views/execution/executionComponent.html',
        controller: ExecutionComponentController,
        bindings: {
            workflow: '<',
            hideLog: '<',
            flex: '<',
            contentAlign: '<', //'left' or 'right'
            executionPaused: '<',
            ttsEnabled: '<',
            metricsDisabled: '<',
            gamificationDisabled: '<',
            sleepSkipable: '<',
            scrollToCurrent: '<',
            onWorkflowFinishClick: '&',
            onWorkflowFinish: '&',
            onNotification: '&'
        }
    });
}
