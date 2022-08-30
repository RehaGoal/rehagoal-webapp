module rehagoal.schedulingView {
    import MetricRecorder = rehagoal.metrics.MetricRecorder;
    import MetricIdGenerator = rehagoal.metrics.MetricIdGenerator;
    import ICalendarService = rehagoal.calendar.ICalendarService;
    import CalendarEvent = rehagoal.calendar.CalendarEvent;
    import TTSService = rehagoal.tts.TTSService;
    import SettingsService = rehagoal.settings.SettingsService;
    import FlexContentAlignment = rehagoal.settings.FlexContentAlignment;

    export interface ISchedulingView {
        workflows: IWorkflow[]
        scheduledWorkflows: IWorkflow[]
        activeWorkflow: IWorkflow | null
        leaveModalEnabled: boolean
        executionPaused: boolean
        infoModalTitle: string
        infoModalText: string
        scheduleId: number | null
        componentInitialized: boolean
        componentInitializedPromise: Promise<void>;

        isSchedulerRunning(): boolean
        startScheduler(): Promise<void>
        stopScheduler(): void
        addWorkflowToSchedule(workflow: IWorkflow): void
        removeWorkflowFromSchedule(index: number): void
        nextSchedule(): void
        onWorkflowFinish(): void;
        onCancelLeave(): void;
        onNotification(title: string, text: string): void
        onNotificationConfirm(): void
        $onDestroy(): void
    }


    class SchedulingView implements angular.IComponentController, ISchedulingView {
        static $inject = [
            '$log',
            '$location',
            '$window',
            '$scope',
            '$rootScope',
            '$routeParams',
            'workflowService',
            'metricIdGeneratorService',
            'metricService',
            'ttsService',
            'calendarService',
            'settingsService',
        ];

        public workflows: IWorkflow[];
        public scheduledWorkflows: IWorkflow[] = [];
        public activeWorkflow: IWorkflow | null = null;
        public leaveModalEnabled: boolean = true;
        public executionPaused: boolean = false;
        public infoModalTitle = 'Erinnerung';
        public infoModalText = '';
        public componentInitialized = false;
        public componentInitializedPromise: Promise<void>;
        public scheduleId: number | null = null;
        private isBeingDestroyed: boolean = false;
        private schedulerRunning: boolean = false;
        private startRequested: boolean = false;
        private scheduledWorkflowQueue: IWorkflow[] = [];
        private completedWorkflowInstances: Map<string, number> = new Map<string, number>();
        private calendarEvent: CalendarEvent | null = null;

        constructor(private $log: angular.ILogService,
                    private $location: angular.ILocationService,
                    private $window: angular.IWindowService,
                    private $scope: angular.IScope,
                    private $rootScope: angular.IRootScopeService,
                    private $routeParams: angular.route.IRouteParamsService,
                    private workflowService: IWorkflowService,
                    private metricIdGeneratorService: MetricIdGenerator,
                    private metricService: MetricRecorder,
                    private ttsService: TTSService,
                    private calendarService: ICalendarService,
                    private settingsService: SettingsService) {

            this.workflows = workflowService.getWorkflows();

            $scope.$on('$locationChangeStart', () => {
                this.executionPaused = true;
            });

            $scope.$on("views.updateWorkflows", () => {
                this.workflows = workflowService.getWorkflows();
            });

            this.componentInitializedPromise = this.initializeScheduler();
        }

        async initializeScheduler() {
            if (angular.isString(this.$routeParams.calendarEventUUID)) {
                const calendarEventUUID = this.$routeParams.calendarEventUUID;
                this.calendarEvent = (await this.calendarService.getCalendarEventByUUID(calendarEventUUID)) || null;
            }
            if (this.calendarEvent) {
                for (const workflowId of this.calendarEvent.workflowIDs) {
                    const workflow = this.workflowService.getWorkflowById(workflowId);
                    if (workflow === null) {
                        throw new Error(`Could not get a workflow for ID ${workflowId}, while initializing scheduler from calendar event.`);
                    }
                    this.scheduledWorkflows.push(workflow);
                }
                this.$rootScope.$broadcast('calendarEventComponent::calendarEventStarted', this.calendarEvent.uuid);
                await this.startScheduler();
            }
            this.$scope.$applyAsync(() => {
                this.componentInitialized = true;
            });
        }

        isFlexViewEnabled(): boolean {
            return this.settingsService.executionViewLayout === 'flex';
        }

        getFlexContentAlignment(): FlexContentAlignment {
            return this.settingsService.executionViewFlexContentAlignment;
        }

        isSchedulerRunning(): boolean {
            return this.schedulerRunning;
        }

        startScheduler(): Promise<void> {
            this.completedWorkflowInstances.clear();
            if (!this.schedulerRunning) {
                return this.deferStart();
            }
            return Promise.resolve();
        }

        stopScheduler(): void {
            if (this.schedulerRunning) {
                // TODO: Add abort notification
                if (this.activeWorkflow && this.scheduleId !== null) {
                    this.metricService.record('scheduleAbort', {scheduleId: this.scheduleId});
                }
                this.toggleScheduler();
                this.activeWorkflow = null;
                this.scheduleId = null;
                if (this.calendarEvent && !this.isBeingDestroyed) {
                    // Go back to overview, if we processed a calendar event and this is not caused by onDestroy
                    // (in which case we are already changing our location, e.g. starting a different calendar event)
                    this.$location.path('/overview');
                }
            }
        }

        addWorkflowToSchedule(workflow: IWorkflow): void {
            this.scheduledWorkflows.push(workflow);
        }

        removeWorkflowFromSchedule(index: number): void {
            this.scheduledWorkflows.splice(index, 1);
        }

        private metricRecordStartScheduler(): void {
            if (this.scheduleId === null) {
                throw new Error('Metric recording on scheduleStart depends on a scheduleId!');
            }
            const scheduleId = this.scheduleId;
            this.metricService.record('scheduleStart', {scheduleId: scheduleId});
            const instancesPerWorkflow = new Map();
            this.scheduledWorkflows.forEach(function(workflow) {
                const workflowId = workflow.uuid;
                let numInstances = instancesPerWorkflow.get(workflowId) || 0;
                instancesPerWorkflow.set(workflowId, ++numInstances);
            });
            instancesPerWorkflow.forEach((numInstances, workflowId) => {
                this.metricService.recordValue('scheduleStart_numInstancesWorkflow', {scheduleId: scheduleId, workflowId: workflowId}, numInstances);
            });
        }

        private metricRecordScheduleEnd(): void {
            if (this.scheduleId === null) {
                throw new Error('Metric recording on scheduleEnd depends on a scheduleId!');
            }
            const scheduleId = this.scheduleId;
            let totalInstances = 0;
            this.completedWorkflowInstances.forEach(function (numInstances) {
                totalInstances += numInstances;
            });
            this.metricService.recordValue('scheduleEnd_numInstances', {scheduleId: scheduleId}, totalInstances);
        }

        private metricRecordWorkflowFinished(): void {
            if (this.activeWorkflow === null || this.scheduleId === null) {
                throw new Error('Metric recording on workflowFinished depends on an activeWorkflow and a scheduleId!');
            }
            // vm.activeWorkflow is the last (finished) workflow
            const workflowId = this.activeWorkflow.uuid;
            let numCompletedInstances = this.completedWorkflowInstances.get(workflowId) || 0;
            this.completedWorkflowInstances.set(workflowId, ++numCompletedInstances);
            this.metricService.recordValue('scheduleWorkflowEnd_numInstancesWorkflow', {
                scheduleId: this.scheduleId,
                workflowId: this.activeWorkflow.uuid
            }, this.completedWorkflowInstances.get(workflowId)!);
        }

        nextSchedule(): void {
            const oldWorkflow = this.activeWorkflow;
            this.activeWorkflow = null;
            if(this.scheduledWorkflowQueue.length > 0) {
                this.activeWorkflow = this.scheduledWorkflowQueue[0];
                this.scheduledWorkflowQueue.splice(0,1);
                if (oldWorkflow === this.activeWorkflow) {
                    // reload the workflow without destroying the executionComponent (e.g. keep the execution log alive)
                    this.$scope.$broadcast('executionComponent.reloadWorkflow', {skipDestroy: true});
                }
            } else {
                this.metricRecordScheduleEnd();
                this.stopScheduler();
            }
        }

        private toggleScheduler(): void {
            this.schedulerRunning = !this.schedulerRunning;
        }

        private deferStart(): Promise<void> {
            if (this.startRequested) {
                return Promise.resolve();
            }
            this.startRequested = true;
            this.$log.debug("Deferring start of scheduleId until new scheduleId is known.");
            return this.metricIdGeneratorService.getNewScheduleId().then((scheduleId) => {
                this.$scope.$evalAsync(() => {
                    this.$log.debug("Got scheduleId (" + scheduleId + "). Starting schedule.");
                    this.scheduleId = scheduleId;
                    this.metricRecordStartScheduler();
                    this.toggleScheduler();
                    // TODO: Or should we only acquire a new scheduleId, if there are scheduled workflows?
                    if (this.scheduledWorkflows) {
                        this.scheduledWorkflowQueue = this.scheduledWorkflows.slice();
                        this.nextSchedule();
                    }
                    this.startRequested = false;
                });
            });
        }

        public onWorkflowFinish(): void {
            if(this.scheduledWorkflowQueue.length === 0) {
                this.leaveModalEnabled = false;
            }
            if (this.activeWorkflow) {
                this.metricRecordWorkflowFinished();
            }
        }

        public onCancelLeave(): void {
            this.executionPaused = false;
        }

        public onNotification(title: string, text: string): void {
            this.infoModalTitle = title;
            this.infoModalText = text;
            this.$scope.$applyAsync(() => {
                this.$scope.$broadcast('infoModal.openModal', {modalTitle: title, modalText: text});
            });
            this.ttsService.speak(title + ": " + text);
        }

        public onNotificationConfirm(): void {
            this.$scope.$broadcast('executionComponent.resetAllTimersEvent');
        }

        $onDestroy(): void {
            this.isBeingDestroyed = true;
            this.stopScheduler();
        }
    }

    angular.module('rehagoal.schedulingView', ['ngRoute', 'ngCordova', 'rehagoal.workflow', 'rehagoal.lists', 'rehagoal.tts', 'rehagoal.executionComponent', 'rehagoal.calendar', 'rehagoal.leaveModal', 'rehagoal.infoModal'])
        .config(['$routeProvider', function ($routeProvider: angular.route.IRouteProvider) {
            $routeProvider.when('/scheduling/:calendarEventUUID?', {
                template: '<scheduling-view></scheduling-view>'
            });
        }])
        .component('schedulingView', {
            templateUrl: 'views/scheduling/schedulingView.html',
            controller: SchedulingView
        });
}



