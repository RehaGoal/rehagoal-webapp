module rehagoal.plannerView {

    import PlannerView = rehagoal.plannerView.PlannerView;
    import ICalendarService = rehagoal.calendar.ICalendarService;
    import CalendarEvent = rehagoal.calendar.CalendarEvent;
    import HOUR_IN_MILLISECONDS = rehagoal.utilities.HOUR_IN_MILLISECONDS;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;

    const CALENDAR_EVENT_HANDLED_DB_EVENT = 'calendarEventComponent::eventHandledDB';

    describe('plannerView tests', function () {
        let $componentController: angular.IComponentControllerService;
        let $rootScope: angular.IRootScopeService;
        let $compile: angular.ICompileService;
        let $route: angular.route.IRouteService;
        let workflowService: IWorkflowService;
        let calendarService: ICalendarService;
        let workflowServiceGetWorkflowsSpy: jasmine.Spy;
        let calendarServiceAddCalendarEventSpy: jasmine.Spy;

        beforeEach(() => angular.mock.module('rehagoal.plannerView'));
        beforeEach(() => angular.mock.module('rehagoal.templates'));

        const workflows: IWorkflow[] = [
            {
                id: 1,
                uuid: "uuid1",
                name: "Another Workflow",
                xmlHash: "xmlHash1",
                workspaceXml: "workspaceXml1"
            },
            {
                id: 0,
                uuid: "uuid0",
                name: "Test Workflow",
                xmlHash: "xmlHash0",
                workspaceXml: "workspaceXml0"
            },
            {
                id: 2,
                uuid: "uuid2",
                name: "Test Workflow (2)",
                xmlHash: "xmlHash2",
                workspaceXml: "workspaceXml2"
            },
        ];

        const initialPlannedEvents: CalendarEvent[] = [
            {
                uuid: 'event0uuid',
                date: new Date(Date.UTC(2020, 2, 1, 2, 3)),
                workflowIDs: [0]
            },
            {
                uuid: 'event1uuid',
                date: new Date(Date.UTC(2020, 1, 4, 1, 8)),
                workflowIDs: [1, 0, 1]
            }
        ];

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _$compile_: angular.ICompileService,
                                    _$route_: angular.route.IRouteService,
                                    _workflowService_: IWorkflowService,
                                    _calendarService_: ICalendarService) {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
            $compile = _$compile_;
            $route = _$route_;
            workflowService = _workflowService_;
            calendarService = _calendarService_;
            workflowServiceGetWorkflowsSpy = spyOn(workflowService, 'getWorkflows').and.returnValue(workflows);
            const fakeGetWorkflowById: typeof workflowService.getWorkflowById = function (id: number) {
                return workflows.find((workflow) => workflow.id === id) || null;
            };
            spyOn(workflowService, 'getWorkflowById').and.callFake(fakeGetWorkflowById);
        }));

        function makeTime(hours?: number, minutes?: number, seconds?: number, millis?: number): Date {
            const date = new Date(0);
            date.setUTCHours(hours || 0);
            date.setUTCMinutes(minutes || 0);
            date.setUTCSeconds(seconds || 0);
            date.setUTCMilliseconds(millis || 0);
            return date;
        }

        it('should register route /planner', function () {
            expect($route.routes['/planner'].template).toEqual('<planner-view></planner-view>');
        });

        describe('plannerView controller', function () {
            describe('constructor', function () {
                const todayMock = new Date(Date.UTC(2020, 1, 2, 3, 4, 5));
                const todayDateMock = new Date(2020, 1, 2);

                beforeEach(function () {
                    jasmine.clock().install();
                    jasmine.clock().mockDate(todayMock)
                });
                afterEach(function () {
                    jasmine.clock().uninstall();
                });

                it('should initialize properties properly', function () {
                    const $scope = $rootScope.$new();
                    const plannerViewCtrl: PlannerView = $componentController('plannerView', {$scope: $scope}, {});
                    expect(plannerViewCtrl.selectedWorkflows).toEqual([]);
                    expect(plannerViewCtrl.workflows).toEqual([]);
                    expect(plannerViewCtrl.plannedEvents).toEqual([]);
                    expect(plannerViewCtrl.selectedTime).toEqual(null);
                    expect(plannerViewCtrl.selectedDate).toEqual(todayDateMock);
                });
            });

            describe('$onInit', function () {
                let bindings: any, $scope: angular.IScope, plannerViewCtrl: PlannerView;

                beforeEach(function () {
                    bindings = {};
                    $scope = $rootScope.$new();
                    plannerViewCtrl = $componentController('plannerView', {$scope: $scope}, bindings);
                });

                it('should load workflows from workflowService', function () {
                    plannerViewCtrl.$onInit();
                    expect(workflowService.getWorkflows).toHaveBeenCalledTimes(1);
                    expect(plannerViewCtrl.workflows).toEqual(workflows);
                });

                it('should register eventHandler for calendarEventComponent::eventHandledDB', function () {
                    spyOn($scope, '$on').and.callThrough();
                    plannerViewCtrl.$onInit();
                    expect($scope.$on).toHaveBeenCalledWith(CALENDAR_EVENT_HANDLED_DB_EVENT, jasmine.any(Function));
                    expect($scope.$on).toHaveBeenCalledTimes(1);
                });

                it('should load planned events', async function (done) {
                    spyOn(calendarService, 'getCalendarEvents').and.returnValue(Promise.resolve(initialPlannedEvents));
                    plannerViewCtrl.$onInit();
                    expect(calendarService.getCalendarEvents).toHaveBeenCalledWith(0, Number.POSITIVE_INFINITY);
                    expect(calendarService.getCalendarEvents).toHaveBeenCalledTimes(1);
                    await plannerViewCtrl.plannedEventsPromise;
                    expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                    done();
                });
            });

            describe('events', function () {
                let bindings: any, $scope: angular.IScope, plannerViewCtrl: PlannerView;
                let $scope$onSpy: jasmine.Spy;

                beforeEach(async function (done) {
                    bindings = {};
                    $scope = $rootScope.$new();
                    plannerViewCtrl = $componentController('plannerView', {$scope: $scope}, bindings);
                    $scope$onSpy = spyOn($scope, '$on').and.callThrough();
                    plannerViewCtrl.$onInit();
                    await plannerViewCtrl.plannedEventsPromise;
                    done();
                });

                it('should load planned events, when calendarEventComponent::eventHandledDB occurs', async function () {
                    expect($scope.$on).toHaveBeenCalledWith(CALENDAR_EVENT_HANDLED_DB_EVENT, jasmine.any(Function));
                    plannerViewCtrl.plannedEvents = [];
                    spyOn(calendarService, 'getCalendarEvents').and.returnValue(Promise.resolve(initialPlannedEvents));
                    $rootScope.$broadcast(CALENDAR_EVENT_HANDLED_DB_EVENT);
                    expect(calendarService.getCalendarEvents).toHaveBeenCalledTimes(1);
                    expect(calendarService.getCalendarEvents).toHaveBeenCalledWith(0, Number.POSITIVE_INFINITY);
                    await plannerViewCtrl.plannedEventsPromise;
                    expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                });
            });

            function installCalendarServiceMock() {
                const plannedEvents = initialPlannedEvents.slice();
                const fakeAddCalendarEvent: typeof calendarService.addCalendarEvent = async function (date: Date, workflowIDs: number[]) {
                    const event: CalendarEvent = {
                        date,
                        workflowIDs,
                        uuid: "uuid" + plannedEvents.length
                    };
                    plannedEvents.push(event);
                    return event;
                };
                const fakeGetCalendarEvents: typeof calendarService.getCalendarEvents = async function (offset: number, limit: number) {
                    return plannedEvents.slice(offset, offset + limit);
                };
                const fakeDeleteCalendarEvent: typeof calendarService.deleteCalendarEvent = async function (eventUUID) {
                    const removeIndex = plannedEvents.findIndex((ev) => ev.uuid === eventUUID);
                    plannedEvents.splice(removeIndex, 1);
                };
                calendarServiceAddCalendarEventSpy = spyOn(calendarService, 'addCalendarEvent').and.callFake(fakeAddCalendarEvent);
                spyOn(calendarService, 'getCalendarEvents').and.callFake(fakeGetCalendarEvents);
                spyOn(calendarService, 'deleteCalendarEvent').and.callFake(fakeDeleteCalendarEvent);
            }


            describe('methods', function () {
                let bindings: any, $scope: angular.IScope, plannerViewCtrl: PlannerView;

                beforeEach(async function (done) {
                    bindings = {};
                    $scope = $rootScope.$new();
                    spyOn($scope, '$broadcast').and.callThrough();
                    installCalendarServiceMock();
                    plannerViewCtrl = $componentController('plannerView', {$scope: $scope}, bindings);
                    plannerViewCtrl.$onInit();
                    await plannerViewCtrl.plannedEventsPromise;
                    done();
                });

                function expectModalWarning(modalText: string) {
                    expect($scope.$broadcast).toHaveBeenCalledWith('infoModal.openModal', {
                        modalTitle: 'Warnung',
                        modalText
                    });
                }

                function expectNoModal() {
                    expect($scope.$broadcast).not.toHaveBeenCalledWith('infoModal.openModal', jasmine.anything())
                }

                describe('addEvent', function () {
                    const nowMock = new Date(Date.UTC(2019, 5, 3, 1, 55, 1));

                    beforeEach(function () {
                        jasmine.clock().install();
                        jasmine.clock().mockDate(nowMock)
                    });
                    afterEach(function () {
                        jasmine.clock().uninstall();
                    });

                    it('should not add an event, if selectedTime is null', async function (done) {
                        plannerViewCtrl.selectedWorkflows = [workflows[0]];
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2020, 4, 5));
                        plannerViewCtrl.selectedTime = null;
                        await plannerViewCtrl.addEvent();
                        expect(calendarService.addCalendarEvent).not.toHaveBeenCalled();
                        done();
                    });

                    it('should not add an event, if selectedDate is null', async function (done) {
                        plannerViewCtrl.selectedWorkflows = [workflows[0]];
                        plannerViewCtrl.selectedDate = null;
                        plannerViewCtrl.selectedTime = makeTime(1, 2);
                        await plannerViewCtrl.addEvent();
                        expect(calendarService.addCalendarEvent).not.toHaveBeenCalled();
                        done();
                    });

                    it('should not add an event and show modal, if selectedWorkflows is empty', async function (done) {
                        plannerViewCtrl.selectedWorkflows = [];
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2020, 1, 2));
                        plannerViewCtrl.selectedTime = makeTime(1, 2);
                        await plannerViewCtrl.addEvent();
                        expect(calendarService.addCalendarEvent).not.toHaveBeenCalled();
                        expectModalWarning('Bitte mindestens einen Workflow zum Termin hinzufügen!');
                        done();
                    });

                    it('should not add an event, if selectedDateTime is in past', async function (done) {
                        plannerViewCtrl.selectedWorkflows = [workflows[0]];
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2019, 5, 3));
                        plannerViewCtrl.selectedTime = makeTime(1, 54);
                        await plannerViewCtrl.addEvent();
                        expect(calendarService.addCalendarEvent).not.toHaveBeenCalled();
                        expectModalWarning('Datum/Uhrzeit muss in der Zukunft liegen!');
                        done();
                    });

                    it('should not add an event, if selectedDateTime is in present', async function (done) {
                        plannerViewCtrl.selectedWorkflows = [workflows[0]];
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2019, 5, 3));
                        plannerViewCtrl.selectedTime = makeTime(1, 55, 1);
                        await plannerViewCtrl.addEvent();
                        expect(calendarService.addCalendarEvent).not.toHaveBeenCalled();
                        expectModalWarning('Datum/Uhrzeit muss in der Zukunft liegen!');
                        done();
                    });

                    it('should add an event, if all constraints are satisfied #1', async function (done) {
                        plannerViewCtrl.selectedWorkflows = [workflows[0]];
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2019, 5, 3));
                        plannerViewCtrl.selectedTime = makeTime(1, 56);
                        await plannerViewCtrl.addEvent();
                        const expectedDate = new Date(Date.UTC(2019, 5, 3, 1, 56));
                        const expectedWorkflowIds = [workflows[0].id];
                        expect(calendarService.addCalendarEvent).toHaveBeenCalledWith(expectedDate, expectedWorkflowIds);
                        expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                        $rootScope.$apply();
                        expect(plannerViewCtrl.plannedEvents).toEqual(await calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY));
                        done();
                    });

                    async function addValidTestCalendarEvent2() {
                        plannerViewCtrl.selectedWorkflows = [workflows[0], workflows[1], workflows[1], workflows[0]];
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2020, 11, 14));
                        plannerViewCtrl.selectedTime = makeTime(7, 38);
                        await plannerViewCtrl.addEvent();
                        const expectedDate = new Date(Date.UTC(2020, 11, 14, 7, 38));
                        const expectedWorkflowIds = [1, 0, 0, 1];
                        expect(calendarService.addCalendarEvent).toHaveBeenCalledWith(expectedDate, expectedWorkflowIds);
                        expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                        $rootScope.$apply();
                    }

                    it('should add an event, if all constraints are satisfied #2', async function (done) {
                        await addValidTestCalendarEvent2();
                        expect(plannerViewCtrl.plannedEvents).toEqual(await calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY));
                        expectNoModal();
                        done();
                    });

                    it('should show modal with error message, if adding an event fails for some other reason (QuotaExceeded)', async function (done) {
                        calendarServiceAddCalendarEventSpy.and.callFake(async function() {
                            const err = new Error("No storage space left");
                            err.name = "QuotaExceededError";
                            throw err;
                        });
                        await tryOrFailAsync(async () => {
                            await addValidTestCalendarEvent2();
                        })
                        expect(plannerViewCtrl.plannedEvents).toEqual(await calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY));
                        expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                        expectModalWarning('Ein unerwarteter Fehler ist aufgetreten: QuotaExceededError: No storage space left');

                        done();
                    });
                    it('should show modal with error message, if adding an event fails for some other reason (OpenFailed)', async function (done) {
                        calendarServiceAddCalendarEventSpy.and.callFake(async function() {
                            const err = new Error("Could not open database");
                            err.name = "OpenFailedError";
                            throw err;
                        });
                        await tryOrFailAsync(async () => {
                            await addValidTestCalendarEvent2();
                        })
                        expect(plannerViewCtrl.plannedEvents).toEqual(await calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY));
                        expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                        expectModalWarning('Ein unerwarteter Fehler ist aufgetreten: OpenFailedError: Could not open database');


                        done();
                    });
                    it('should show modal with error message, if adding an event fails for some other reason', async function (done) {
                        calendarServiceAddCalendarEventSpy.and.callFake(async function() {
                            throw new Error("Unknown error happened (mocked test error)");
                        });
                        await tryOrFailAsync(async () => {
                            await addValidTestCalendarEvent2();
                        })

                        expect(plannerViewCtrl.plannedEvents).toEqual(await calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY));
                        expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                        expectModalWarning('Ein unerwarteter Fehler ist aufgetreten: Error: Unknown error happened (mocked test error)');


                        done();
                    });
                });

                describe('removeEvent', function () {
                    it('should delete the event by uuid and remove it from plannedEvents #1', async function (done) {
                        const removedEvent = plannerViewCtrl.plannedEvents[0];
                        await plannerViewCtrl.removeEvent(removedEvent);
                        expect(calendarService.deleteCalendarEvent).toHaveBeenCalledWith(removedEvent.uuid);
                        expect(calendarService.deleteCalendarEvent).toHaveBeenCalledTimes(1);
                        expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                        $rootScope.$apply();
                        expect(plannerViewCtrl.plannedEvents).toEqual(await calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY));
                        expect(plannerViewCtrl.plannedEvents.some((ev) => ev.uuid === removedEvent.uuid)).toBeFalsy();
                        expect(plannerViewCtrl.plannedEvents.length).toBe(1);
                        done();
                    });

                    it('should delete the event by uuid and remove it from plannedEvents #2', async function (done) {
                        const removedEvent = plannerViewCtrl.plannedEvents[1];
                        await plannerViewCtrl.removeEvent(removedEvent);
                        expect(calendarService.deleteCalendarEvent).toHaveBeenCalledWith(removedEvent.uuid);
                        expect(calendarService.deleteCalendarEvent).toHaveBeenCalledTimes(1);
                        expect(plannerViewCtrl.plannedEvents).toEqual(initialPlannedEvents);
                        $rootScope.$apply();
                        expect(plannerViewCtrl.plannedEvents).toEqual(await calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY));
                        expect(plannerViewCtrl.plannedEvents.some((ev) => ev.uuid === removedEvent.uuid)).toBeFalsy();
                        expect(plannerViewCtrl.plannedEvents.length).toBe(1);
                        done();
                    });
                });

                describe('getWorkflowsForIds', function () {
                    it('should return workflows matching the ids from workflowService', function () {
                        expect(plannerViewCtrl.getWorkflowsForIds([0])).toEqual([workflows[1]]);
                        expect(plannerViewCtrl.getWorkflowsForIds([1])).toEqual([workflows[0]]);
                        expect(plannerViewCtrl.getWorkflowsForIds([0, 1, 0])).toEqual([workflows[1], workflows[0], workflows[1]]);
                        expect(plannerViewCtrl.getWorkflowsForIds([])).toEqual([]);
                    });
                    it('should return null entries, if workflow could not be found', function () {
                        expect(plannerViewCtrl.getWorkflowsForIds([0, 3])).toEqual([workflows[1], null]);
                    });
                });

                describe('get minTimeString', function () {
                    beforeEach(function () {
                        jasmine.clock().install();
                    });
                    afterEach(function () {
                        jasmine.clock().uninstall();
                    });

                    it('should return empty string, if selectedDate is not today', function () {
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2020, 2, 4));
                        jasmine.clock().mockDate(new Date(Date.UTC(2020, 2, 5)));
                        expect(plannerViewCtrl.minTimeString).toEqual("");
                        jasmine.clock().mockDate(new Date(Date.UTC(2019, 2, 4)));
                        expect(plannerViewCtrl.minTimeString).toEqual("");
                        jasmine.clock().mockDate(new Date(Date.UTC(2020, 2, 3)));
                        expect(plannerViewCtrl.minTimeString).toEqual("");
                        jasmine.clock().mockDate(new Date(Date.UTC(2020, 3, 4)));
                        expect(plannerViewCtrl.minTimeString).toEqual("");

                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2020, 2, 5));
                        jasmine.clock().mockDate(new Date(Date.UTC(2020, 2, 6)));
                        expect(plannerViewCtrl.minTimeString).toEqual("");
                        jasmine.clock().mockDate(new Date(Date.UTC(2019, 2, 4)));
                        expect(plannerViewCtrl.minTimeString).toEqual("");
                        jasmine.clock().mockDate(new Date(Date.UTC(2020, 2, 3)));
                        expect(plannerViewCtrl.minTimeString).toEqual("");
                        jasmine.clock().mockDate(new Date(Date.UTC(2020, 3, 4)));
                        expect(plannerViewCtrl.minTimeString).toEqual("");
                    });
                    it('should return start of next minute as HH:MM string, if selectedDate is today', function () {
                        jasmine.clock().mockDate(new Date(2020, 2, 4, 0, 1, 59, 999));
                        plannerViewCtrl.selectedDate = new Date(2020, 2, 4);
                        expect(plannerViewCtrl.minTimeString).toEqual("00:02");
                        jasmine.clock().mockDate(new Date(2020, 2, 4, 14, 54, 22, 999));
                        plannerViewCtrl.selectedDate = new Date(2020, 2, 4);
                        expect(plannerViewCtrl.minTimeString).toEqual("14:55");
                        jasmine.clock().mockDate(new Date(2020, 11, 24, 23, 18, 30, 123));
                        plannerViewCtrl.selectedDate = new Date(2020, 11, 24);
                        expect(plannerViewCtrl.minTimeString).toEqual("23:19");
                        jasmine.clock().mockDate(new Date(2020, 11, 24, 23, 11, 0, 0));
                        plannerViewCtrl.selectedDate = new Date(2020, 11, 24);
                        expect(plannerViewCtrl.minTimeString).toEqual("23:12");
                        jasmine.clock().mockDate(new Date(2020, 4, 5, 0, 0, 0, 0));
                        plannerViewCtrl.selectedDate = new Date(2020, 4, 5);
                        expect(plannerViewCtrl.minTimeString).toEqual("00:01");
                        jasmine.clock().mockDate(new Date(2020, 4, 5, 23, 59, 0, 0));
                        plannerViewCtrl.selectedDate = new Date(2020, 4, 5);
                        expect(plannerViewCtrl.minTimeString).toEqual("00:00");
                    });
                });

                describe('get selectedDateTime', function () {
                    it('should return null, if selectedDate is null', function () {
                        plannerViewCtrl.selectedDate = null;
                        plannerViewCtrl.selectedTime = new Date(9 * HOUR_IN_MILLISECONDS);
                        expect(plannerViewCtrl.selectedDateTime).toBe(null);
                    });
                    it('should return null, if selectedTime is null', function () {
                        plannerViewCtrl.selectedDate = new Date(2020, 1, 2);
                        plannerViewCtrl.selectedTime = null;
                        expect(plannerViewCtrl.selectedDateTime).toBe(null);
                    });
                    it('should return null, if selectedTime and selectedDate is null', function () {
                        plannerViewCtrl.selectedDate = null;
                        plannerViewCtrl.selectedTime = null;
                        expect(plannerViewCtrl.selectedDateTime).toBe(null);
                    });
                    it('should return Date constructed by date of selectedDate and time since epoch of selectedTime', function () {
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2020, 4, 5));
                        plannerViewCtrl.selectedTime = makeTime(15, 25, 3, 4);
                        expect(plannerViewCtrl.selectedDateTime).toEqual(new Date(Date.UTC(2020, 4, 5, 15, 25, 3, 4)));
                        plannerViewCtrl.selectedDate = new Date(Date.UTC(2020, 11, 18));
                        plannerViewCtrl.selectedTime = makeTime(13, 37, 42, 3141);
                        expect(plannerViewCtrl.selectedDateTime).toEqual(new Date(Date.UTC(2020, 11, 18, 13, 37, 42, 3141)));

                    });
                });

                describe('get minDateISOString', function () {
                    beforeEach(function () {
                        jasmine.clock().install();
                    });
                    afterEach(function () {
                        jasmine.clock().uninstall();
                    });

                    it('should return today\'s date as ISO formatted date string', function () {
                        jasmine.clock().mockDate(new Date(2020, 7, 11, 3, 6, 56, 777));
                        expect(plannerViewCtrl.minDateISOString).toEqual("2020-08-11");
                        jasmine.clock().mockDate(new Date(2020, 0, 1));
                        expect(plannerViewCtrl.minDateISOString).toEqual("2020-01-01");
                        jasmine.clock().mockDate(new Date(2020, 11, 31, 23, 59, 59, 999));
                        expect(plannerViewCtrl.minDateISOString).toEqual("2020-12-31");
                        jasmine.clock().mockDate(new Date(2020, 0, 1, 0, 0, 0, 1));
                        expect(plannerViewCtrl.minDateISOString).toEqual("2020-01-01");
                        jasmine.clock().mockDate(new Date(2020, 4, 27, 11, 8, 43, 583));
                        expect(plannerViewCtrl.minDateISOString).toEqual("2020-05-27");
                    });
                });

                describe('get selectedWorkflowIds', function () {
                    it('should return IDs for every workflow in selectedWorkflows', function () {
                        plannerViewCtrl.selectedWorkflows = [workflows[1], workflows[2], workflows[0]];
                        expect(plannerViewCtrl.selectedWorkflowIds).toEqual([0, 2, 1]);
                        plannerViewCtrl.selectedWorkflows = [workflows[2], workflows[0]];
                        expect(plannerViewCtrl.selectedWorkflowIds).toEqual([2, 1]);
                        plannerViewCtrl.selectedWorkflows = [workflows[2], workflows[0], workflows[0], workflows[0]];
                        expect(plannerViewCtrl.selectedWorkflowIds).toEqual([2, 1, 1, 1]);
                        plannerViewCtrl.selectedWorkflows = [workflows[0]];
                        expect(plannerViewCtrl.selectedWorkflowIds).toEqual([1]);
                        plannerViewCtrl.selectedWorkflows = [];
                        expect(plannerViewCtrl.selectedWorkflowIds).toEqual([]);
                    });
                });
            });
        });

        describe('plannerView element', function () {
            let $scope: angular.IScope;
            let element: HTMLElement;
            let jqElement: JQLite;
            let plannerViewCtrl: PlannerView;
            const mockDate = new Date(Date.UTC(2020, 1, 5, 3, 4, 5));

            beforeEach(async function (done) {
                spyOn(calendarService, 'getCalendarEvents').and.returnValue(Promise.resolve(initialPlannedEvents));

                $scope = angular.extend($rootScope.$new(), {});
                jqElement = $compile(`<planner-view></planner-view>`)($scope);
                element = jqElement[0];

                jasmine.clock().install();
                jasmine.clock().mockDate(mockDate);

                $rootScope.$apply();
                plannerViewCtrl = jqElement.controller('plannerView');

                await plannerViewCtrl.plannedEventsPromise;
                $rootScope.$apply();
                done();
            });

            afterEach(function () {
                jasmine.clock().uninstall();
            });

            function changeInputValue(inputElement: HTMLInputElement, value: string) {
                const evt = document.createEvent("HTMLEvents");
                evt.initEvent("change", false, true);
                inputElement.value = value;
                inputElement.dispatchEvent(evt);
                $scope.$apply();
            }

            function getInputElementForLabelText(labelText: string): HTMLInputElement | null {
                const labelElement = [...element.querySelectorAll('label')].filter((el) => el.textContent!.trim() === labelText)[0];
                expect(labelElement).toBeDefined();
                const inputElement = element.querySelector('#' + labelElement.getAttribute('for'));
                expect(inputElement).not.toBeNull();
                return inputElement as (HTMLInputElement | null);
            }

            it('should have title "Terminplanung"', function () {
                expect(element.querySelector('h1')!.textContent).toEqual("Terminplanung");
            });

            it('should have a date selection input field', function () {
                const inputElement = getInputElementForLabelText("Datum:");
                expect(inputElement!.getAttribute("type")).toBe("date");
                expect(inputElement!.getAttribute("min")).toBe("2020-02-05");
                expect(inputElement!.getAttribute("min")).toBe(plannerViewCtrl.minDateISOString);
                changeInputValue(inputElement as HTMLInputElement, "2020-03-01");
                expect(plannerViewCtrl.selectedDate).toEqual(new Date(2020, 2, 1));
            });

            it('should have a time input field', function () {
                const inputElement = getInputElementForLabelText("Uhrzeit:");
                expect(inputElement!.getAttribute("type")).toBe("time");
                expect(inputElement!.getAttribute("min")).toBe(plannerViewCtrl.minTimeString);
                changeInputValue(inputElement as HTMLInputElement, "12:05");
                expect(plannerViewCtrl.selectedTime).toEqual(makeTime(12, 5));
            });

            it('should include a list-builder component', function () {
                const listBuilder = element.querySelector("list-builder");
                expect(listBuilder).not.toBeNull();
                expect(listBuilder!.getAttribute("all-items")).toEqual("$ctrl.workflows");
                expect(listBuilder!.getAttribute("selected-items")).toEqual("$ctrl.selectedWorkflows");
                expect(listBuilder!.getAttribute("all-items-title")).toEqual("Verfügbare Aufgaben");
                expect(listBuilder!.getAttribute("selected-items-title")).toEqual("Geplante Aufgaben");
                expect(listBuilder!.getAttribute("no-items-selected-warning")).toEqual("Es wurden noch keine Workflows ausgewählt!");
                expect(listBuilder!.getAttribute("all-items-order-by")).toEqual("id");
            });

            it('should not display planned-events-table, if there are no planned events', function () {
                plannerViewCtrl.plannedEvents = [];
                $scope.$apply();
                expect(element.querySelector('table.planned-events-table')).toBeNull();
                expect(element.textContent).toContain("Keine geplanten Termine.");
                expect(element.textContent).not.toContain("Bereits geplant");
            });

            function getPlannedEventsTable(): HTMLElement | null {
                return element.querySelector('table.planned-events-table');
            }
            it('should display planned-events-table, if there are planned events', function () {
                const plannedEventsTable = getPlannedEventsTable();
                expect(plannedEventsTable).not.toBeNull();
                expect(element.textContent).not.toContain("Keine geplanten Termine.");
                expect(element.textContent).toContain("Bereits geplant");
                expect([...plannedEventsTable!.querySelectorAll('tr th')].map((th => th.textContent))).toEqual(["", "Datum", "Workflows"]);
                const trsWithoutHeader = [...plannedEventsTable!.querySelectorAll('tr')].slice(1);
                expect(trsWithoutHeader.length).toEqual(initialPlannedEvents.length);
                const removalLinks = trsWithoutHeader.map((tr) => [...tr.querySelectorAll('td')][0]!.querySelector("a.btn.glyphicon-remove"));
                expect(removalLinks.every((link) => link !== null)).toBeTruthy();
                const expectedPlannedEvents = initialPlannedEvents
                    .slice()
                    .sort((eventA, eventB) => eventA.date.getTime() - eventB.date.getTime());
                expect(trsWithoutHeader.map((tr) => [...tr.querySelectorAll('td')][1]!.textContent!)).toEqual(
                    expectedPlannedEvents.map(event => event.date.toLocaleString())
                );
                const plannedEventsWorkflowNames = trsWithoutHeader.map((tr) => [...[...tr.querySelectorAll('td')][2]!.querySelectorAll("li")].map((li) => li.textContent!.trim()));
                expect(plannedEventsWorkflowNames).toEqual([["Another Workflow", "Test Workflow", "Another Workflow"], ["Test Workflow"]]);
            });

            it('should add an event, if save button is clicked and constraints are fulfilled', function () {
                changeInputValue(getInputElementForLabelText("Uhrzeit:")!, "12:06");
                plannerViewCtrl.selectedWorkflows.push(workflows[0]);
                plannerViewCtrl.selectedWorkflows.push(workflows[2]);
                spyOn(plannerViewCtrl, 'addEvent').and.callThrough();
                const saveButton: HTMLElement = [...element.querySelectorAll("button")].find((button) => button.textContent === "Termin speichern")!;
                expect(saveButton).toBeDefined("Could not locate save button!");
                saveButton.click();
                expect(plannerViewCtrl.addEvent).toHaveBeenCalledTimes(1);
            });
        });
    });
}
