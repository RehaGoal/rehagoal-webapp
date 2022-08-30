module rehagoal.calendar {
    import SettingsService = rehagoal.settings.SettingsService;
    const moduleName = 'rehagoal.calendar';

    export class CalendarEventHandlerController implements angular.IComponentController {
        static $inject = [
            '$log',
            '$scope',
            '$rootScope',
            '$location',
            'calendarService',
            'workflowService',
            'settingsService',
            '$uibModal',
        ];

        activeEvents: CalendarEvent[] = [];
        showEventBar: boolean = false;
        eventBeingStarted: CalendarEvent | null = null;
        eventBeingStartedIndex: number | null = null;

        constructor(private $log: angular.ILogService,
                    private $scope: angular.IScope,
                    private $rootScope: angular.IRootScopeService,
                    private $location: angular.ILocationService,
                    private calendarService: ICalendarService,
                    private workflowService: IWorkflowService,
                    private settingsService: SettingsService,
                    private $uibModal: ng.ui.bootstrap.IModalService) { //calendarService needs to be instantiated (reschedules events)
            $scope.$on('calendarEventComponent::missedEvents', this.onMissedCalendarEvents);
            $scope.$on('calendarEventComponent::calendarEventStarted', this.onCalendarEventStarted);
            $scope.$on('CalendarScheduler::calendarEventTriggered', this.onCalendarEventTriggered);
        }

        $onInit(): void {
            this.$log.info('CalendarEventHandler initialized.');
        }

        private onCalendarEventTriggered = (angularEvent: angular.IAngularEvent, event: CalendarEvent) => {
            this.$log.info('CalendarEventHandler received a triggered calendar event', event);
            if (this.activeEvents.find((ev) => ev.uuid === event.uuid)) {
                this.$log.info('Ignoring duplicate event', event);
            } else {
                this.activeEvents.push(event);
            }
            this.$scope.$applyAsync(() => {
                this.showEventBar = true;
            });
        };

        private onMissedCalendarEvents = (angularEvent: angular.IAngularEvent, missedEvents: CalendarEvent[]) => {
            this.$log.info('CalendarEventHandler received missed events', missedEvents);
            const resolver: MissedEventsModalResolver = {
                missedEvents: () => missedEvents
            };
            this.$uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                backdrop: 'static',
                templateUrl: 'components/calendar/missedEventsModal.html',
                keyboard: false,
                controller: MissedEventsModalController,
                controllerAs: '$ctrl',
                resolve: resolver
            })
        };

        private getStartUrlPath(event: CalendarEvent) {
            return `/scheduling/${event.uuid}`;
        }

        private onCalendarEventStarted = async (angularEvent: angular.IAngularEvent, eventUUID: string): Promise<void> => {
            if (this.eventBeingStarted !== null && this.eventBeingStartedIndex !== null
                && eventUUID === this.eventBeingStarted.uuid) {
                const eventBeingStarted = this.eventBeingStarted;
                const index = this.eventBeingStartedIndex;
                this.$log.info(`CalendarEventHandler: starting of ${this.eventBeingStarted.uuid} finished.`);
                this.calendarEventHandledUI(this.eventBeingStartedIndex);
                this.eventBeingStarted = null;
                this.eventBeingStartedIndex = null;
                await this.calendarEventHandledDB(eventBeingStarted);
            } else {
                this.$log.warn('calendarEventStarted event ignored: event has not been started, or UUID is missing. UUID parameter: ', eventUUID);
            }
        };

        private calendarEventHandledUI(activeEventIndex: number): void {
            const event = this.activeEvents[activeEventIndex];
            this.activeEvents.splice(activeEventIndex, 1);
            this.showEventBar = this.activeEvents.length !== 0;
        }

        private async calendarEventHandledDB(event: CalendarEvent): Promise<void> {
            await this.calendarService.deleteCalendarEvent(event.uuid);
            this.$rootScope.$broadcast('calendarEventComponent::eventHandledDB');
        }

        public getTimeAsString(date: Date): string {
            return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        public getWorkflowName(workflowId: number): string | undefined {
            const workflow = this.workflowService.getWorkflowById(workflowId);
            if (!workflow) {
                return undefined;
            }
            return workflow.name;
        }

        startCalendarEvent(event: CalendarEvent): void {
            const activeEventIndex = this.activeEvents.indexOf(event);
            this.$log.info('CalendarEventHandler: startCalendarEvent @ ', activeEventIndex, event);
            // The event can only be removed, after it is has been started successfully ($locationChangeSuccess)
            // This is handled in onLocationChangeSuccess above.
            this.eventBeingStarted = event;
            this.eventBeingStartedIndex = activeEventIndex;
            this.$location.path(this.getStartUrlPath(event));
        }

        async postponeCalendarEvent(event: CalendarEvent): Promise<void> {
            const activeEventIndex = this.activeEvents.indexOf(event);
            this.$log.info('CalendarEventHandler: postponeCalendarEvent @ ', activeEventIndex, event);
            this.calendarEventHandledUI(activeEventIndex);
            const postponedDate = new Date();
            // Postpone by postpone delay milliseconds
            const delay = this.settingsService.calendarStaticPostponeDelay;
            postponedDate.setTime(postponedDate.getTime() + delay);
            this.$log.info('CalendarEventHandler: postponed Date ', postponedDate, 'delay', delay);
            await this.calendarService.addCalendarEvent(postponedDate, event.workflowIDs);
            return this.calendarEventHandledDB(event);
        }

        async cancelCalendarEvent(event: CalendarEvent): Promise<void> {
            const activeEventIndex = this.activeEvents.indexOf(event);
            this.$log.info('CalendarEventHandler: cancelCalendarEvent @ ', activeEventIndex, event);
            this.calendarEventHandledUI(activeEventIndex);
            return this.calendarEventHandledDB(event);
        }
    }

    interface MissedEventsModalResolved {
        missedEvents: CalendarEvent[];
    }
    type MissedEventsModalResolver = {
        [K in keyof MissedEventsModalResolved]: () => MissedEventsModalResolved[K]
    };
    class MissedEventsModalController implements angular.IController {
        static $inject = [
            '$uibModalInstance',
            'missedEvents',
            'workflowService',
        ];
        private readonly title: string = "Verpasste Termine";
        private readonly message: string = "Sie haben Termine verpasst: ";

        constructor(private $uibModalInstance: ng.ui.bootstrap.IModalInstanceService,
                    private missedEvents: CalendarEvent[],
                    private workflowService: IWorkflowService) {
        }

        onConfirm() {
            this.$uibModalInstance.close();
        }

        public getWorkflowNames(workflowId: number[]): (string | undefined)[] {
            return workflowId
                .map((id) => this.workflowService.getWorkflowById(id))
                .map((workflow) => workflow ? workflow.name : undefined);

        }
    }

    angular.module(moduleName).component('calendarEventHandler', {
        templateUrl: 'components/calendar/calendarEventHandler.html',
        controller: CalendarEventHandlerController,
        require: {
        },
        bindings: {
        },
    });
}
