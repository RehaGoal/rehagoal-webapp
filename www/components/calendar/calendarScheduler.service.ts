module rehagoal.calendar {
    import MILLISECONDS_PER_SECOND = rehagoal.utilities.MILLISECONDS_PER_SECOND;
    import INotification = ngCordova.INotification;
    import ILocalNotification = ngCordova.ILocalNotification;
    import NotificationTrigger = ngCordova.NotificationTrigger;
    import NotificationEvent = ngCordova.NotificationEvent;
    import SECONDS_PER_MINUTE = rehagoal.utilities.SECONDS_PER_MINUTE;
    const moduleName = 'rehagoal.calendar';

    type JSONDeserializedCalendarEvent = CalendarEvent & {date: string};

    type UnparsedCalendarEvent = JSONDeserializedCalendarEvent | string;

    export interface ICalendarSchedulerService {
        scheduleEvents(events: CalendarEvent[]): Promise<void>
        scheduleEventsImmediate(events: CalendarEvent[]): Promise<void>
        unscheduleEvents(eventUUIDs: string[]): Promise<void>
    }

    function getPrettyTime(date: Date): string {
        return date.toTimeString().substring(0, "HH:MM".length);
    }

    class CalendarSchedulerService implements ICalendarSchedulerService {
        static $inject = ['$log', '$rootScope', 'isCordova', 'webCalendarScheduler', 'cordovaCalendarScheduler'];
        schedulerImpl!: CalendarScheduler;

        constructor(private $log: angular.ILogService,
                    private $rootScope: angular.IRootScopeService,
                    isCordova: () => boolean,
                    webCalendarScheduler: CalendarScheduler,
                    cordovaCalendarScheduler: CalendarScheduler) {
            if (isCordova()) {
                this.setSchedulerImpl(cordovaCalendarScheduler);
            } else {
                this.setSchedulerImpl(webCalendarScheduler);
            }
            $log.info('CalendarScheduler initialized');
        }

        private calendarEventHandler = (event: CalendarEvent): void => {
            this.$log.info("CalendarEvent triggered:", event);
            this.$rootScope.$broadcast('CalendarScheduler::calendarEventTriggered', event);
        };

        private setSchedulerImpl(scheduler: CalendarScheduler) {
            this.schedulerImpl = scheduler;
            this.schedulerImpl.setEventHandler(this.calendarEventHandler);
        }

        async scheduleEvents(events: CalendarEvent[]): Promise<void> {
            return this.schedulerImpl.registerEvents(events);
        }

        async scheduleEventsImmediate(events: CalendarEvent[]): Promise<void> {
            return this.schedulerImpl.triggerEvents(events);
        }

        async unscheduleEvents(eventUUIDs: string[]): Promise<void> {
            return this.schedulerImpl.unregisterEvents(eventUUIDs);
        }
    }

    type CalendarEventHandler = (event: CalendarEvent) => void;

    export interface CalendarScheduler {
        /**
         * Sets the event handler that should handle calendar events once they occur.
         * @param eventHandler handler for handling calendar events
         */
        setEventHandler(eventHandler: CalendarEventHandler): void

        /**
         * Registers calendar events, such that they are being tracked and once the date occurs, the event handler is triggered.
         * @param events array of events to keep track of
         */
        registerEvents(events: CalendarEvent[]): Promise<void>


        /**
         * Unregisters calendar events, such they are not being tracked anymore and thus not handled by this instance.
         * @param eventUUIDs array of calendar event UUIDs to unregister
         */
        unregisterEvents(eventUUIDs: string[]): Promise<void>

        /**
         * Returns all registered calendar events.
         */
        getRegisteredEvents(): Promise<CalendarEvent[]>

        /**
         * Triggers (non-registered) calendar events immediately, i.e. without scheduling them.
         * @param events array of events to trigger now
         */
        triggerEvents(events: CalendarEvent[]): Promise<void>
    }

    abstract class AbstractCalendarScheduler implements CalendarScheduler {
        protected eventHandler: CalendarEventHandler = () => {};

        public setEventHandler(eventHandler: CalendarEventHandler): void {
            this.eventHandler = eventHandler;
        }

        protected assertEventUUIDsUnique(events: CalendarEvent[]): void {
            const uuids = new Set();
            for (const event of events) {
                if (uuids.has(event.uuid)) {
                    throw new Error(`Found a duplicate event UUID: ${event.uuid}.`);
                }
                uuids.add(event.uuid);
            }
        }

        public abstract registerEvents(events: CalendarEvent[]): Promise<void>
        public abstract unregisterEvents(eventUUIDs: string[]): Promise<void>
        public abstract getRegisteredEvents(): Promise<CalendarEvent[]>
        public abstract triggerEvents(events: CalendarEvent[]): Promise<void>
    }

    class WebCalendarScheduler extends AbstractCalendarScheduler {
        private intervalHandle: angular.IPromise<any> | undefined = undefined;
        private managedEvents: CalendarEvent[] = [];
        private managedEventUUIDs: Set<string> = new Set<string>();

        static $inject = [
            '$interval',
            'webCalendarSchedulerCheckInterval',
            'webNotification',
        ];

        constructor(private $interval: angular.IIntervalService,
                    private checkInterval: number,
                    private webNotification: angularWebNotification.IAngularWebNotification) {
            super();
            this.scheduleNextCheck();
        }

        private scheduleNextCheck(): void {
            if (this.intervalHandle !== undefined) {
                this.$interval.cancel(this.intervalHandle);
            }
            // Check at least every checkInterval, and check at full minute (whichever occurs first)
            const nextCheckDelay = Math.min(this.checkInterval, (SECONDS_PER_MINUTE - new Date().getSeconds()) * MILLISECONDS_PER_SECOND);
            this.intervalHandle = this.$interval(async () => await this.checkForEvents(), nextCheckDelay, 1);
        }

        private getEventsToTrigger(date: Date): CalendarEvent[] {
            const triggeredEvents = [];
            for (let event of this.managedEvents) {
                if (event.date.getTime() <= date.getTime()) {
                    triggeredEvents.push(event);
                }
            }
            return triggeredEvents;
        }

        private async checkForEvents(): Promise<void> {
            const now = new Date();
            const triggeredEvents = this.getEventsToTrigger(now);
            await this.triggerEvents(triggeredEvents);
            // TODO: Unregister here or somewhere else?
            await this.unregisterEvents(triggeredEvents.map(ev => ev.uuid));
            this.scheduleNextCheck();
        }

        public async triggerEvents(triggeredEvents: CalendarEvent[]): Promise<void> {
            for (let event of triggeredEvents) {
                this.eventHandler(event);
            }
            this.showEventsWebNotifications(triggeredEvents);
        }

        private showEventsWebNotifications(triggeredEvents: CalendarEvent[]) {
            if (triggeredEvents.length > 0) {
                const body = triggeredEvents.map((ev) =>
                    `- ${getPrettyTime(ev.date)}: ` +
                    `${ev.workflowIDs.length} Workflow${ev.workflowIDs.length > 1 ? "s" : ""}`
                ).join("\n");
                this.webNotification.showNotification("RehaGoal: Anstehende Kalenderereignisse", {
                    body,
                    icon: "xxhdpi-icon.png"
                });
            }
        }

        private assertEventUUIDsNotRegistered(events: CalendarEvent[]): void {
            for (const event of events) {
                if (this.managedEventUUIDs.has(event.uuid)) {
                    throw new Error(`There is already an event registered with UUID ${event.uuid}. Please unregister the old first.`);
                }
            }
        }

        async registerEvents(events: CalendarEvent[]): Promise<void> {
            this.assertEventUUIDsUnique(events);
            this.assertEventUUIDsNotRegistered(events);
            for (let event of events) {
                this.managedEvents.push(event);
                this.managedEventUUIDs.add(event.uuid)
            }
        }

        async getRegisteredEvents(): Promise<CalendarEvent[]> {
            return angular.copy(this.managedEvents);
        }

        async unregisterEvents(eventUUIDs: string[]): Promise<void> {
            const uuids = new Set(eventUUIDs);
            this.managedEvents = this.managedEvents.filter((event) => !uuids.has(event.uuid));
            uuids.forEach((uuid) => this.managedEventUUIDs.delete(uuid));
        }
    }

    class CordovaCalendarScheduler extends AbstractCalendarScheduler  {
        static $inject = ['$log', '$document', '$cordovaLocalNotification', '$rootScope'];

        private cordovaInitializedPromise: Promise<void>;

        constructor(private $log: angular.ILogService,
                    $document: angular.IDocumentService,
                    private $cordovaLocalNotification: ngCordova.ILocalNotification,
                    $rootScope: angular.IRootScopeService) {
            super();
            this.cordovaInitializedPromise = new Promise((resolve, reject) => {
                ($document[0] as Document).addEventListener('deviceready', function() {
                    resolve();
                })
            });
            // broadcast by ngCordova cordovaLocalNotification wrapper
            $rootScope.$on('$cordovaLocalNotification:trigger', this.onLocalNotificationTriggered);
            $rootScope.$on('$cordovaLocalNotification:click', this.onLocalNotificationClicked);
        }

        private onLocalNotificationTriggered = (event: angular.IAngularEvent, notification: INotification, notificationEvent: NotificationEvent): void => {
            this.$log.info('onLocalNotificationTriggered', event, notification, notificationEvent);
            this.handleNotification(notification);
        };

        private onLocalNotificationClicked = (event: angular.IAngularEvent, notification: INotification, notificationEvent: NotificationEvent): void => {
            this.$log.info('onLocalNotificationClicked', event, notification, notificationEvent);
            // TODO: Should this trigger the event again? (triggered => clicked could happen, where both call the eventHandler)
            //       Maybe handle this in actual event handler (i.e. index.html component) and check for duplicate uuids?
            this.handleNotification(notification);
        };

        private handleNotification(notification: ngCordova.INotification): void {
            const eventData: UnparsedCalendarEvent = notification.data;
            if (eventData === undefined) {
                return;
            }
            const calendarEvent = this.parseNotificationData(eventData);
            if (!calendarEvent) {
                return;
            }
            this.eventHandler(calendarEvent);
        }

        private async getCordovaLocalNotification(): Promise<ngCordova.ILocalNotification> {
            await this.cordovaInitializedPromise;
            return this.$cordovaLocalNotification;
        }

        private parseNotificationData(data: UnparsedCalendarEvent): CalendarEvent | null {
            let objData: JSONDeserializedCalendarEvent | CalendarEvent;
            if (angular.isString(data)) {
                objData = JSON.parse(data);
            } else {
                objData = data;
            }
            let calendarEvent: CalendarEvent;
            if (angular.isString(objData.date)) {
                calendarEvent = {...objData, date: new Date(objData.date)};
            } else {
                calendarEvent = objData;
            }
            // Sanity check: could be other notification data
            if (calendarEvent.hasOwnProperty("uuid") && angular.isString(calendarEvent.uuid) &&
                calendarEvent.hasOwnProperty("date") && angular.isDate(calendarEvent.date) &&
                calendarEvent.hasOwnProperty("workflowIDs") && angular.isArray(calendarEvent.workflowIDs)) {
                return calendarEvent;
            }
            return null;
        }

        private async scheduleNotificationWithTrigger(localNotificationService: ILocalNotification,
                                                      id: number,
                                                      event: CalendarEvent,
                                                      trigger: NotificationTrigger | undefined): Promise<void> {
            let scheduleOptions: INotification = {
                id: id,
                data: event,
                title: 'Geplantes Ereignis',
                text: 'Ereignis startet um ' + getPrettyTime(event.date),
                wakeup: true,
                launch: true,
                led: {on: 100, off: 100, color: '#0000FF'},
                vibrate: false,
                clock: "chronometer",
            };
            if (trigger !== undefined) {
                scheduleOptions = {...scheduleOptions, trigger};
            }
            return localNotificationService.schedule(scheduleOptions);
        }

        async registerEvents(events: CalendarEvent[]): Promise<void> {
            const localNotificationService = await this.getCordovaLocalNotification();
            this.assertEventUUIDsUnique(events);
            await this.assertEventUUIDsNotRegistered(localNotificationService, events);

            const firstFreeId = await this.getFirstFreeId(localNotificationService);
            for (let i = 0; i < events.length; ++i) {
                // TODO: ID should not collide with notification used by executionTimer
                const event = events[i];

                // TODO: Might not be transaction-safe w.r.t. cordova
                await this.scheduleNotificationWithTrigger(
                    localNotificationService,
                    firstFreeId + i,
                    event,
                    {at: event.date});
            }
        }

        private async getFirstFreeId(localNotificationService: ngCordova.ILocalNotification): Promise<number> {
            const registeredIds = await localNotificationService.getIds(this);
            // ID 0 is reserved for reminder notifications
            return Math.max(0, Math.max(...registeredIds)) + 1;
        }

        async getRegisteredEvents(): Promise<CalendarEvent[]> {
            const localNotificationService = await this.getCordovaLocalNotification();
            return (await localNotificationService.getAll(this))
                .map((notification: INotification) => this.parseNotificationData(notification.data))
                .filter((parsedData): parsedData is CalendarEvent => parsedData !== null);
        }

        async unregisterEvents(eventUUIDs: string[]): Promise<void> {
            const uuidsToUnregister = new Set(eventUUIDs);
            const localNotificationService = await this.getCordovaLocalNotification();
            const allNotifications = await localNotificationService.getAll(this);
            const unregisterNotifications = allNotifications.filter((notification: INotification) => {
                const event = this.parseNotificationData(notification.data);
                return event && uuidsToUnregister.has(event.uuid)
            });
            return localNotificationService.cancel(unregisterNotifications.map((notification) => notification.id!));
        }

        async triggerEvents(triggeredEvents: CalendarEvent[]): Promise<void> {
            const localNotificationService = await this.getCordovaLocalNotification();
            const firstFreeId = await this.getFirstFreeId(localNotificationService);
            for (let i = 0; i < triggeredEvents.length; ++i) {
                // TODO: ID should not collide with notification used by executionTimer
                await this.scheduleNotificationWithTrigger(
                    localNotificationService,
                    firstFreeId + i,
                    triggeredEvents[i],
                    undefined);
            }
        }

        private async assertEventUUIDsNotRegistered(localNotificationService: ngCordova.ILocalNotification,
                                                    events: rehagoal.calendar.CalendarEvent[]): Promise<void> {
            const allNotifications = await localNotificationService.getAll(this);
            let alreadyRegisteredUUIDs = new Set(allNotifications.map((notification) => {
                const event = this.parseNotificationData(notification.data);
                return event !== null ? event.uuid : null;
            }).filter((uuid): uuid is string => uuid !== null));
            for (let event of events) {
                if (alreadyRegisteredUUIDs.has(event.uuid)) {
                    throw new Error(`There is already an event registered with UUID ${event.uuid}. Please unregister the old first.`);
                }
            }
        }
    }

    angular.module(moduleName)
        .value('webCalendarSchedulerCheckInterval', 30 * MILLISECONDS_PER_SECOND)
        .service('calendarSchedulerService', CalendarSchedulerService)
        .service('webCalendarScheduler', WebCalendarScheduler)
        .service('cordovaCalendarScheduler', CordovaCalendarScheduler);
}
