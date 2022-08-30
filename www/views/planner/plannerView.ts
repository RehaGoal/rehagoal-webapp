module rehagoal.plannerView {
    import MINUTE_IN_MILLISECONDS = rehagoal.utilities.MINUTE_IN_MILLISECONDS;
    import ICalendarService = rehagoal.calendar.ICalendarService;
    import CalendarEvent = rehagoal.calendar.CalendarEvent;
    const moduleName = 'rehagoal.plannerView';

    export class PlannerView implements angular.IComponentController {
        static $inject = [
            '$log',
            '$scope',
            'workflowService',
            'calendarService',
        ];

        plannedEventsPromise: Promise<void> | null = null;
        public selectedDate: Date | null = this.getToday();
        public selectedTime: Date | null = null;
        public selectedWorkflows: IWorkflow[] = [];
        public workflows: IWorkflow[] = [];
        public plannedEvents: CalendarEvent[] = [];

        constructor(private $log: angular.ILogService,
                    private $scope: angular.IScope,
                    private workflowService: IWorkflowService,
                    private calendarService: ICalendarService) {
        }

        $onInit(): void {
            this.workflows = this.workflowService.getWorkflows();
            this.$scope.$on('calendarEventComponent::eventHandledDB', () => {
                this.plannedEventsPromise = this.loadPlannedEvents();
            });
            this.plannedEventsPromise = this.loadPlannedEvents();
        }

        $onDestroy(): void {
        }

        private async loadPlannedEvents() {
            this.plannedEvents = await this.calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY);
            this.$scope.$applyAsync();
        }

        get selectedWorkflowIds(): number[] {
            return this.selectedWorkflows.map(workflow => workflow.id);
        }

        private getTimezoneOffsetMillis(): number {
            return new Date().getTimezoneOffset() * MINUTE_IN_MILLISECONDS;
        }

        get minDateISOString(): string {
            const nowWithoutTZOffset = new Date(this.getNow().getTime() - this.getTimezoneOffsetMillis());
            const isoDateTimeString = nowWithoutTZOffset.toISOString();
            return isoDateTimeString.substring(0, isoDateTimeString.indexOf('T'));
        }

        // Note, that this method assumes, that selectedDate's hours/minutes/seconds/millis are 0
        // and selectedTime's year/month/day equals epoch.
        get selectedDateTime(): Date | null {
            if (!this.selectedDate) {
                return null;
            }
            if (!this.selectedTime) {
                return null;
            }
            return new Date(this.selectedDate.getTime() + this.selectedTime.getTime());
        }


        private isToday(date: Date | null): boolean {
            const now = this.getNow();
            return !!date &&
                now.getDate() === date.getDate() &&
                now.getMonth() === date.getMonth() &&
                now.getFullYear() === date.getFullYear();
        }

        private getToday(): Date {
            const today = this.getNow();
            today.setHours(0, 0, 0, 0);
            return today;
        }

        private getNow(): Date {
            return new Date();
        }

        private getNextMinuteStartDate(): Date {
            const date = this.getNow();
            const minuteOnlyDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
            return new Date(minuteOnlyDate.getTime() + MINUTE_IN_MILLISECONDS);
        }

        get minTimeString(): string {
            if (this.isToday(this.selectedDate)) {
                const timeString = this.getNextMinuteStartDate().toTimeString();
                return timeString.substring(0, 'HH:MM'.length);
            }
            return "";
        }

        public getWorkflowsForIds(ids: number[]): (IWorkflow | null)[] {
            return ids.map(id => this.workflowService.getWorkflowById(id) || null);
        }

        private isDateTimeInFuture(date: Date) {
            const now = this.getNow();
            return date.getTime() > now.getTime();
        }

        private showWarningModal(text: string) {
            this.$scope.$broadcast('infoModal.openModal', {modalTitle: 'Warnung', modalText: text});
        }

        public async addEvent(): Promise<void> {
            if (!this.selectedDateTime) {
                this.showWarningModal("Bitte gültiges Datum und Uhrzeit für den Termin eingeben!");
                return;
            }
            if (!this.isDateTimeInFuture(this.selectedDateTime)) {
                this.showWarningModal("Datum/Uhrzeit muss in der Zukunft liegen!");
                return;
            }
            if(this.selectedWorkflowIds.length === 0) {
                this.showWarningModal("Bitte mindestens einen Workflow zum Termin hinzufügen!");
                return;
            }
            try {
                const calendarEvent = await this.calendarService.addCalendarEvent(this.selectedDateTime, this.selectedWorkflowIds);
                this.$scope.$applyAsync(() => {
                    this.plannedEvents.push(calendarEvent);
                });
            } catch (err) {
                this.showWarningModal(`Ein unerwarteter Fehler ist aufgetreten: ${err}`);
            }
        }

        public async removeEvent(calendarEvent: CalendarEvent): Promise<void> {
            await this.calendarService.deleteCalendarEvent(calendarEvent.uuid);
            this.$scope.$applyAsync(() => {
                this.plannedEvents.splice(this.plannedEvents.indexOf(calendarEvent),1)
            });
        }
    }

    angular.module(moduleName, ['ngRoute', 'rehagoal.workflow', 'rehagoal.calendar'])
        .config(['$routeProvider', function ($routeProvider: ng.route.IRouteProvider) {
            $routeProvider.when('/planner', {
                template: '<planner-view></planner-view>'
            });
        }])
        .component('plannerView', {
            templateUrl: 'views/planner/plannerView.html',
            controller: PlannerView
        });
}
