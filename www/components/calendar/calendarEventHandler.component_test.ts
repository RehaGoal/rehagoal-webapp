module rehagoal.calendar {

    import SettingsService = rehagoal.settings.SettingsService;
    describe('calendarEventHandler tests', function () {
        let $componentController: angular.IComponentControllerService;
        let $rootScope: angular.IRootScopeService;
        let $compile: angular.ICompileService;
        let $location: angular.ILocationService;
        let calendarService: ICalendarService;
        let workflowService: IWorkflowService;
        let settingsService: SettingsService;
        let webStorage: IAngularWebStorageService;
        const MISSED_EVENTS_EVENT = 'calendarEventComponent::missedEvents';
        const CALENDAR_EVENT_TRIGGERED_EVENT = 'CalendarScheduler::calendarEventTriggered';
        const CALENDAR_EVENT_STARTED_EVENT = 'calendarEventComponent::calendarEventStarted';
        const workflowNames = ["Test Workflow", "Workflow 1", "Workflow 2", "Some other workflow (3)", "WF 4", "Last Workflow"];

        beforeEach(() => angular.mock.module('rehagoal.calendar'));
        beforeEach(angular.mock.module('rehagoal.templates'));

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _$compile_: angular.ICompileService,
                                    _$location_: angular.ILocationService,
                                    _calendarService_: ICalendarService,
                                    _workflowService_: IWorkflowService,
                                    _settingsService_: SettingsService,
                                    _webStorage_: IAngularWebStorageService) {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
            $compile = _$compile_;
            $location = _$location_;
            calendarService = _calendarService_;
            workflowService = _workflowService_;
            settingsService = _settingsService_;
            webStorage = _webStorage_;
            spyOn(workflowService, 'getWorkflowById').and.callFake(function(id: number) {
                if (id < 0 || id > 5) {
                    return undefined;
                }
                const workflow: IWorkflow = {
                    id: id,
                    name: workflowNames[id],
                    workspaceXml: '<someXml>',
                    uuid: 'someUUID' + id,
                    xmlHash: 'xmlHash'
                };
                return workflow;
            })
        }));

        const event1: CalendarEvent = {
            uuid: 'event1UUID',
            workflowIDs: [0, 4, 1, 4],
            date: new Date(Date.UTC(2020, 0, 1, 15, 30))
        };

        const event2: CalendarEvent = {
            uuid: 'event2UUID',
            workflowIDs: [5, 1, 3, 2, 0],
            date: new Date(Date.UTC(2020, 1, 1, 18, 59))
        };

        const event3: CalendarEvent = {
            uuid: 'event3UUID',
            workflowIDs: [4],
            date: new Date(Date.UTC(2020, 2, 4, 9, 0))
        };

        describe('calendarEventHandler controller', function () {
            describe('constructor', function () {
                it('should register event listeners for missedEvents, calendarEventTriggered, calendarEventStarted', function () {
                    const bindings = {};
                    const $scope = $rootScope.$new();
                    spyOn($scope, '$on');
                    $componentController('calendarEventHandler', {$scope: $scope}, bindings);
                    expect($scope.$on).toHaveBeenCalledTimes(3);
                    expect($scope.$on).toHaveBeenCalledWith(MISSED_EVENTS_EVENT, jasmine.any(Function));
                    expect($scope.$on).toHaveBeenCalledWith(CALENDAR_EVENT_TRIGGERED_EVENT, jasmine.any(Function));
                    expect($scope.$on).toHaveBeenCalledWith(CALENDAR_EVENT_STARTED_EVENT, jasmine.any(Function));
                });
                it('should initialize properties correctly', function () {
                    const bindings = {};
                    const $scope = $rootScope.$new();
                    const ctrl: CalendarEventHandlerController = $componentController('calendarEventHandler', {$scope: $scope}, bindings);
                    expect(ctrl.activeEvents).toEqual([]);
                    expect(ctrl.showEventBar).toEqual(false);
                    expect(ctrl.eventBeingStarted).toBeNull();
                    expect(ctrl.eventBeingStartedIndex).toBeNull();
                })
            });

            describe('methods', function () {
                let bindings: any, $scope: angular.IScope, calendarEventHandlerCtrl: CalendarEventHandlerController;

                beforeEach(function () {
                    bindings = {};
                    $scope = $rootScope.$new();
                    calendarEventHandlerCtrl = $componentController('calendarEventHandler', {$scope: $scope}, bindings);
                });

                describe('event `CalendarScheduler::calendarEventTriggered`', function () {
                    it('should push event to activeEvents and show event bar', function () {
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1]);
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event2);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1, event2]);
                    });
                    it('should ignore event with same uuid', function () {
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1]);
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1]);
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event2);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1, event2]);
                        const sameUUIDEvent: CalendarEvent = {
                            uuid: event1.uuid,
                            workflowIDs: [42],
                            date: new Date(2020, 1, 21, 13, 4)
                        };
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, sameUUIDEvent);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1, event2]);
                    });
                    it('should show events bar after receiving an event', function () {
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1]);
                        expect(calendarEventHandlerCtrl.showEventBar).toBe(true);
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event2);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1, event2]);
                        expect(calendarEventHandlerCtrl.showEventBar).toBe(true);
                    });
                    it('should show events bar, even if event with same uuid is received', function () {
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1]);
                        expect(calendarEventHandlerCtrl.showEventBar).toBe(true);
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1]);
                        expect(calendarEventHandlerCtrl.showEventBar).toBe(true);
                        calendarEventHandlerCtrl.showEventBar = false;
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1]);
                        expect(calendarEventHandlerCtrl.showEventBar).toBe(true);
                        calendarEventHandlerCtrl.showEventBar = false;
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event2);
                        $rootScope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual([event1, event2]);
                        expect(calendarEventHandlerCtrl.showEventBar).toBe(true);
                    });
                });

                describe('event `calendarEventComponent::missedEvents`', function () {
                    let $uibModal: ng.ui.bootstrap.IModalService;
                    beforeEach(() => {
                        inject((_$uibModal_: ng.ui.bootstrap.IModalService) => {
                            $uibModal = _$uibModal_;
                        });
                    });

                    it('should open modal for missed events', function () {
                        const $uibModalOpenSpy = spyOn($uibModal, 'open').and.callThrough();
                        const missedEvents: CalendarEvent[] = [
                            event1
                        ];
                        $rootScope.$broadcast('calendarEventComponent::missedEvents', missedEvents);
                        $rootScope.$apply(); // Trigger modal controller instantiation
                        expect($uibModal.open).toHaveBeenCalledTimes(1);
                        expect($uibModal.open).toHaveBeenCalledWith(jasmine.objectContaining({
                            ariaLabelledBy: 'modal-title',
                            ariaDescribedBy: 'modal-body',
                            backdrop: 'static',
                            templateUrl: 'components/calendar/missedEventsModal.html',
                            keyboard: false,
                            controller: jasmine.anything(),
                            controllerAs: '$ctrl',
                            resolve: jasmine.objectContaining({
                                missedEvents: jasmine.any(Function)
                            })
                        }));
                        expect($uibModalOpenSpy.calls.argsFor(0)[0].resolve.missedEvents()).toEqual(missedEvents);
                    });

                    it('should open modal with expected contents', function () {
                        const missedEvents: CalendarEvent[] = [
                            event1,
                            event2
                        ];
                        $rootScope.$broadcast('calendarEventComponent::missedEvents', missedEvents);
                        $rootScope.$apply(); // Trigger modal controller instantiation
                        const modalElement = document.querySelector('.modal-content')!;
                        expect(modalElement.querySelector('#modal-title')!.textContent!.trim()).toEqual('Verpasste Termine');
                        const modalBody = modalElement.querySelector('#modal-body')!;
                        expect(modalBody.textContent).toMatch(/Sie haben Termine verpasst: /);
                        const missedEventsItems = modalBody.querySelectorAll('li[ng-repeat^="missedEvent in $ctrl.missedEvents "]');
                        expect(missedEventsItems.length).toEqual(2);
                        const event1DateString = event1.date.toLocaleString();
                        const event2DateString = event2.date.toLocaleString();
                        expect(missedEventsItems[0].textContent!.trim()).toEqual(`${event1DateString}: ${workflowNames[0]}, ${workflowNames[4]}, ${workflowNames[1]}, ${workflowNames[4]}`);
                        expect(missedEventsItems[1].textContent!.trim()).toEqual(`${event2DateString}: ${workflowNames[5]}, ${workflowNames[1]}, ${workflowNames[3]}, ${workflowNames[2]}, ${workflowNames[0]}`);
                    });

                    it('should close modal when clicking confirm button', function () {
                        const $uibModalOpenSpy = spyOn($uibModal, 'open').and.callThrough();
                        const missedEvents: CalendarEvent[] = [
                            event1,
                            event2
                        ];
                        $rootScope.$broadcast('calendarEventComponent::missedEvents', missedEvents);
                        $rootScope.$apply(); // Trigger modal controller instantiation#
                        const modalInstance: angular.ui.bootstrap.IModalInstanceService = $uibModalOpenSpy.calls.mostRecent().returnValue;
                        spyOn(modalInstance, 'close');
                        const modalElement = document.querySelector('.modal-content')!;
                        const modalFooter = modalElement.querySelector('.modal-footer')!;
                        const modalConfirmButton = modalFooter.querySelector('.btn-primary')! as HTMLElement;
                        expect(modalInstance.close).not.toHaveBeenCalled();
                        modalConfirmButton.click();
                        expect(modalInstance.close).toHaveBeenCalledTimes(1);
                    });
                });

                describe('calendarEvent actions', function () {
                    let expectedDeletedCalendarEvents = 0;
                    let expectedEvents: CalendarEvent[];

                    beforeEach(() => {
                        spyOn(calendarService, 'deleteCalendarEvent');
                        spyOn(calendarService, 'addCalendarEvent');
                        calendarEventHandlerCtrl.activeEvents.push(event2, event1);
                        expectedEvents = [event2, event1];
                        expectedDeletedCalendarEvents = 0;
                    });

                    function expectCalendarEventHandled(event: CalendarEvent) {
                        $rootScope.$apply();
                        expectedEvents.splice(expectedEvents.indexOf(event), 1);
                        expect(calendarEventHandlerCtrl.activeEvents.indexOf(event)).toEqual(-1);
                        expect(calendarService.deleteCalendarEvent).toHaveBeenCalledTimes(++expectedDeletedCalendarEvents);
                        expect(calendarService.deleteCalendarEvent).toHaveBeenCalledWith(event.uuid);
                        expect(calendarEventHandlerCtrl.activeEvents).toEqual(expectedEvents);
                        expect(calendarEventHandlerCtrl.showEventBar).toBe(!!expectedEvents.length);
                    }

                    describe('startCalendarEvent', function () {
                        it('should change location path of /scheduling/${event.uuid} and clean up after calendarEventComponent::calendarEventStarted', function () {
                            const $locationPathSpy = spyOn($location, 'path').and.callThrough();
                            calendarEventHandlerCtrl.startCalendarEvent(expectedEvents[1]);
                            expect(calendarEventHandlerCtrl.eventBeingStarted).toEqual(calendarEventHandlerCtrl.activeEvents[1]);
                            expect(calendarEventHandlerCtrl.eventBeingStartedIndex).toEqual(1);
                            expect($locationPathSpy).toHaveBeenCalledTimes(1);
                            expect($locationPathSpy).toHaveBeenCalledWith('/scheduling/event1UUID');
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(2);
                            $rootScope.$broadcast(CALENDAR_EVENT_STARTED_EVENT, 'event1UUID');
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(1);
                            expectCalendarEventHandled(event1);

                            calendarEventHandlerCtrl.startCalendarEvent(expectedEvents[0]);
                            expect(calendarEventHandlerCtrl.eventBeingStarted).toEqual(calendarEventHandlerCtrl.activeEvents[0]);
                            expect(calendarEventHandlerCtrl.eventBeingStartedIndex).toEqual(0);
                            expect($locationPathSpy).toHaveBeenCalledTimes(2);
                            expect($locationPathSpy.calls.mostRecent().args).toEqual(['/scheduling/event2UUID']);
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(1);
                            $rootScope.$broadcast(CALENDAR_EVENT_STARTED_EVENT, 'event2UUID');
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(0);
                            expectCalendarEventHandled(event2);
                        });

                        it('should not clean up, if no event was started', function () {
                            const $locationPathSpy = spyOn($location, 'path').and.callThrough();

                            // start an event
                            calendarEventHandlerCtrl.startCalendarEvent(expectedEvents[1]);
                            expect(calendarEventHandlerCtrl.eventBeingStarted).toEqual(calendarEventHandlerCtrl.activeEvents[1]);
                            expect(calendarEventHandlerCtrl.eventBeingStartedIndex).toEqual(1);
                            expect($locationPathSpy).toHaveBeenCalledTimes(1);
                            expect($locationPathSpy).toHaveBeenCalledWith('/scheduling/event1UUID');
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(2);
                            $rootScope.$broadcast('calendarEventComponent::calendarEventStarted', 'event1UUID');
                            expect(calendarService.deleteCalendarEvent).toHaveBeenCalledTimes(1);
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(1);

                            $rootScope.$broadcast('calendarEventComponent::calendarEventStarted', 'event2UUID');
                            expect(calendarService.deleteCalendarEvent).toHaveBeenCalledTimes(1);
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(1);
                        });

                        it('should not clean up, if event uuid is missing in broadcasted event', function () {
                            calendarEventHandlerCtrl.startCalendarEvent(expectedEvents[1]);
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(2);
                            $rootScope.$broadcast('calendarEventComponent::calendarEventStarted');
                            expect(calendarEventHandlerCtrl.activeEvents.length).toBe(2);
                            expect(calendarService.deleteCalendarEvent).not.toHaveBeenCalled();
                        });
                    });

                    describe('postponeCalendarEvent', function () {
                        beforeEach(() => jasmine.clock().install());
                        beforeEach(() => webStorage.clear());
                        afterEach(() => jasmine.clock().uninstall());
                        it('should schedule a new event in now + postponeDelay (default 1 minute)', async function (done) {
                            jasmine.clock().mockDate(new Date(2020, 7, 8, 9, 42));
                            await calendarEventHandlerCtrl.postponeCalendarEvent(expectedEvents[1]);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledTimes(1);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledWith(new Date(2020, 7, 8, 9, 43), event1.workflowIDs);
                            expectCalendarEventHandled(event1);

                            jasmine.clock().mockDate(new Date(2021, 3, 24, 23, 59));
                            await calendarEventHandlerCtrl.postponeCalendarEvent(expectedEvents[0]);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledTimes(2);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledWith(new Date(2021, 3, 25, 0, 0), event2.workflowIDs);
                            expectCalendarEventHandled(event2);
                            done();
                        });

                        it('should schedule a new event in now + postponeDelay (5 minutes via settings)', async function (done) {
                            settingsService.calendarStaticPostponeDelay = 5 * 60 * 1000;
                            jasmine.clock().mockDate(new Date(2020, 7, 8, 9, 42));
                            await calendarEventHandlerCtrl.postponeCalendarEvent(expectedEvents[1]);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledTimes(1);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledWith(new Date(2020, 7, 8, 9, 47), event1.workflowIDs);
                            expectCalendarEventHandled(event1);

                            jasmine.clock().mockDate(new Date(2021, 3, 24, 23, 59));
                            await calendarEventHandlerCtrl.postponeCalendarEvent(expectedEvents[0]);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledTimes(2);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledWith(new Date(2021, 3, 25, 0, 4), event2.workflowIDs);
                            expectCalendarEventHandled(event2);
                            done();
                        });
                    });

                    describe('cancelCalendarEvent', function () {
                        it('should cancel the event', async function (done) {
                            jasmine.clock().mockDate(new Date(2020, 7, 8, 9, 42));
                            await calendarEventHandlerCtrl.postponeCalendarEvent(expectedEvents[1]);
                            expectCalendarEventHandled(event1);

                            jasmine.clock().mockDate(new Date(2021, 3, 24, 23, 59));
                            await calendarEventHandlerCtrl.postponeCalendarEvent(expectedEvents[0]);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledTimes(2);
                            expect(calendarService.addCalendarEvent).toHaveBeenCalledWith(new Date(2021, 3, 25, 0, 0), event2.workflowIDs);
                            expectCalendarEventHandled(event2);
                            done();
                        });
                    });
                });
            });

            describe('calendarEventHandler element', function () {
                let $scope: angular.IScope;
                let element: HTMLElement;
                let jqElement: JQLite;
                let calendarEventHandlerCtrl: CalendarEventHandlerController;
                const calendarEventBarOverlay = '#calendar-event-bar-overlay';

                beforeEach(function () {
                    $scope = angular.extend($rootScope.$new(), {});
                    jqElement = $compile(`<calendar-event-handler></calendar-event-handler>`)($scope);
                    element = jqElement[0];
                    $scope.$apply();
                    calendarEventHandlerCtrl = jqElement.controller('calendarEventHandler');
                });

                function getOverlay(): HTMLElement {
                    const overlay = element.querySelector(calendarEventBarOverlay);
                    if (!overlay) {
                        throw new Error('Overlay element not found!');
                    }
                    return overlay as HTMLElement;
                }

                function getCalendarEventElements(): HTMLElement[] {
                    const overlay = getOverlay();
                    return [...overlay.querySelectorAll('li[ng-repeat^="activeEvent in $ctrl.activeEvents "]')] as HTMLElement[];
                }

                function getOverlayHeading(): HTMLElement {
                    const overlay = getOverlay();
                    const panelHeading = overlay.querySelector('.panel-heading');
                    if (!panelHeading) {
                        throw new Error('Panel heading element not found!');
                    }
                    return panelHeading as HTMLElement;
                }

                function getStartButton(calendarEventElement: HTMLElement): HTMLElement | undefined {
                    return calendarEventElement.querySelector('button[ng-click^="$ctrl.start"]') as (HTMLElement | undefined);
                }

                function getCancelButton(calendarEventElement: HTMLElement): HTMLElement | undefined {
                    return calendarEventElement.querySelector('button[ng-click^="$ctrl.cancel"]') as (HTMLElement | undefined);
                }

                function getPostponeButton(calendarEventElement: HTMLElement): HTMLElement | undefined {
                    return calendarEventElement.querySelector('button[ng-click^="$ctrl.postpone"]') as (HTMLElement | undefined);
                }

                function isHiddenByAngular (element: HTMLElement) {
                    return element.classList.contains('ng-hide');
                }

                function escapeRegExp (string: string) {
                    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                }

                function getLocalTimeString(date: Date) {
                    const timeString = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    expect(timeString).toMatch(/\d{2}:\d{2} ?(AM|PM)?/);
                    return timeString;
                }

                it('should only show overlay, if there are events in the activeEvents list, hide default', function () {
                    const overlay = getOverlay();
                    since('Expected overlay to be hidden by default').
                    expect(isHiddenByAngular(overlay)).toBe(true);
                    $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                    $scope.$apply();
                    since('Expected overlay to be displayed with one active calendar event').
                    expect(isHiddenByAngular(overlay)).toBe(false);

                    $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event2);
                    $scope.$apply();
                    since('Expected overlay to be displayed with two active calendar events').
                    expect(isHiddenByAngular(overlay)).toBe(false);
                });

                it('should show expected content for activeEvents', function () {
                    $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                    $scope.$apply();
                    expect(getOverlayHeading().textContent!).toEqual("1 Anstehender Termin");
                    const eventElements1 = getCalendarEventElements();
                    expect(eventElements1.length).toEqual(1);
                    const eventElement0Html = eventElements1[0].innerHTML;
                    expect(eventElements1[0].querySelector('.calendar-event-bar-workflow-name')!.textContent!)
                        .toMatch(`${escapeRegExp(getLocalTimeString(event1.date))}\\s+Test Workflow`);
                    expect(eventElements1[0].querySelector(".calendar-event-bar-event-description .badge")!.textContent!).toMatch(/\+3/);

                    $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event2);
                    $scope.$apply();
                    expect(getOverlayHeading().textContent!).toEqual("2 Anstehende Termine");
                    const eventElements2 = getCalendarEventElements();
                    expect(eventElements2.length).toEqual(2);
                    const eventElement1Html = eventElements2[1].innerHTML;
                    expect(eventElements2[0].innerHTML).toEqual(eventElement0Html);
                    expect(eventElements2[1].querySelector('.calendar-event-bar-workflow-name')!.textContent!)
                        .toMatch(`${escapeRegExp(getLocalTimeString(event2.date))}\\s+Last Workflow`);
                    expect(eventElements2[1].querySelector(".calendar-event-bar-event-description .badge")!.textContent!).toMatch(/\+4/);

                    $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event3);
                    $scope.$apply();
                    expect(getOverlayHeading().textContent!).toEqual("3 Anstehende Termine");
                    const eventElements3 = getCalendarEventElements();
                    expect(eventElements3.length).toEqual(3);
                    expect(eventElements3[0].innerHTML).toEqual(eventElement0Html);
                    expect(eventElements3[1].innerHTML).toEqual(eventElement1Html);
                    expect(eventElements3[2].querySelector('.calendar-event-bar-workflow-name')!.textContent!)
                        .toMatch(`${escapeRegExp(getLocalTimeString(event3.date))}\\s+WF 4`);
                    expect(eventElements3[2].querySelector(".calendar-event-bar-event-description .badge")!.textContent!).toEqual('');

                });

                it('should hide overlay, once every event was handled', async function (done) {
                    const overlay = getOverlay();
                    $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                    $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event2);
                    $scope.$apply();
                    since("Expected overlay to be visible by with active events").
                    expect(isHiddenByAngular(overlay)).toBe(false);

                    await calendarEventHandlerCtrl.cancelCalendarEvent(event2);
                    $scope.$apply();
                    since("Expected overlay to be visible by with one active event").
                    expect(isHiddenByAngular(overlay)).toBe(false);
                    await calendarEventHandlerCtrl.cancelCalendarEvent(event1);
                    $scope.$apply();
                    since("Expected overlay to be hidden after all events have been canceled").
                    expect(isHiddenByAngular(overlay)).toBe(true);
                    done();
                });

                it('should hide overlay, if showEventBar is set to false', function () {
                    const overlay = getOverlay();
                    $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                    $scope.$apply();
                    since("Expected overlay to be visible by with active events").
                    expect(isHiddenByAngular(overlay)).toBe(false);

                    calendarEventHandlerCtrl.showEventBar = false;
                    $scope.$apply();
                    since("Expected overlay to be hidden, when showEventBar is false").
                    expect(isHiddenByAngular(overlay)).toBe(true);
                });

                describe('button clicks', function () {
                    let overlay: HTMLElement;
                    beforeEach(function () {
                        overlay = getOverlay();
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event1);
                        $rootScope.$broadcast(CALENDAR_EVENT_TRIGGERED_EVENT, event2);
                        $scope.$apply();
                        expect(calendarEventHandlerCtrl.activeEvents.length).toBe(2);
                    });

                    it('should handle calendar event by canceling it (cancel button click)', function () {
                        spyOn(calendarEventHandlerCtrl, 'cancelCalendarEvent').and.callThrough();
                        const event2Element = getCalendarEventElements()[1];
                        expect(getCancelButton(event2Element)!.textContent!.trim()).toEqual('Löschen');
                        getCancelButton(event2Element)!.click();
                        $scope.$apply();
                        expect(overlay.contains(event2Element)).toBe(false);
                        expect(calendarEventHandlerCtrl.activeEvents.length).toBe(1);
                        expect(isHiddenByAngular(overlay)).toBe(false);
                        expect(calendarEventHandlerCtrl.cancelCalendarEvent).toHaveBeenCalledTimes(1);

                        const event1Element = getCalendarEventElements()[0];
                        getCancelButton(event1Element)!.click();
                        $scope.$apply();
                        expect(overlay.contains(event1Element)).toBe(false);
                        expect(calendarEventHandlerCtrl.activeEvents.length).toBe(0);
                        expect(calendarEventHandlerCtrl.cancelCalendarEvent).toHaveBeenCalledTimes(2);
                    });

                    it('should handle calendar event by postponing it (postpone button click)', function () {
                        spyOn(calendarEventHandlerCtrl, 'postponeCalendarEvent').and.callThrough();
                        const addCalendarEventSpy = spyOn(calendarService, 'addCalendarEvent').and.callThrough();
                        const event2Element = getCalendarEventElements()[1];
                        expect(getPostponeButton(event2Element)!.textContent!.trim()).toEqual('Später');
                        getPostponeButton(event2Element)!.click();
                        expect(addCalendarEventSpy).toHaveBeenCalledTimes(1);
                        $scope.$apply();
                        expect(overlay.contains(event2Element)).toBe(false);
                        expect(calendarEventHandlerCtrl.activeEvents.length).toBe(1);
                        expect(isHiddenByAngular(overlay)).toBe(false);
                        expect(calendarEventHandlerCtrl.postponeCalendarEvent).toHaveBeenCalledTimes(1);

                        const event1Element = getCalendarEventElements()[0];
                        getPostponeButton(event1Element)!.click();
                        expect(addCalendarEventSpy).toHaveBeenCalledTimes(2);
                        $scope.$apply();
                        expect(overlay.contains(event1Element)).toBe(false);
                        expect(calendarEventHandlerCtrl.activeEvents.length).toBe(0);
                        expect(calendarEventHandlerCtrl.postponeCalendarEvent).toHaveBeenCalledTimes(2);
                    });

                    it('should handle calendar event by starting it (start button click)', function () {
                        spyOn(calendarEventHandlerCtrl, 'startCalendarEvent').and.callThrough();
                        const $locationPathSpy = spyOn($location, 'path').and.callThrough();

                        const event2Element = getCalendarEventElements()[1];
                        expect($locationPathSpy).toHaveBeenCalledTimes(0);
                        expect(getStartButton(event2Element)!.textContent!.trim()).toEqual('Starten');
                        getStartButton(event2Element)!.click();
                        $rootScope.$broadcast(CALENDAR_EVENT_STARTED_EVENT, 'event2UUID');
                        $rootScope.$apply();
                        since("Event 2 should be removed from overlay, after event has been started").
                        expect(overlay.contains(event2Element)).toBe(false);
                        expect($locationPathSpy).toHaveBeenCalledWith('/scheduling/event2UUID');
                        expect($locationPathSpy).toHaveBeenCalledTimes(1);
                        since("activeEvents.length should be #{expected}, since event 2 should be processed after it has been started").
                        expect(calendarEventHandlerCtrl.activeEvents.length).toBe(1);
                        since("Overlay should be still be display").
                        expect(isHiddenByAngular(overlay)).toBe(false);
                        expect(calendarEventHandlerCtrl.startCalendarEvent).toHaveBeenCalledTimes(1);

                        const event1Element = getCalendarEventElements()[0];
                        getStartButton(event1Element)!.click();
                        $rootScope.$broadcast(CALENDAR_EVENT_STARTED_EVENT, 'event1UUID');
                        $rootScope.$apply();
                        expect(overlay.contains(event1Element)).toBe(false);
                        expect($locationPathSpy).toHaveBeenCalledWith('/scheduling/event1UUID');
                        expect($locationPathSpy).toHaveBeenCalledTimes(2);
                        expect(calendarEventHandlerCtrl.activeEvents.length).toBe(0);
                        expect(calendarEventHandlerCtrl.startCalendarEvent).toHaveBeenCalledTimes(2);
                    });
                });
            });
        });
    });
}
