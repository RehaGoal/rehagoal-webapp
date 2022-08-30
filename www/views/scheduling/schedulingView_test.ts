'use strict';
module rehagoal.schedulingView {
    import MetricService = rehagoal.metrics.MetricService;
    import MetricIdGenerator = rehagoal.metrics.MetricIdGenerator;
    import ISchedulingView = rehagoal.schedulingView.ISchedulingView;
    import MetricRecorder = rehagoal.metrics.MetricRecorder;
    import ICalendarService = rehagoal.calendar.ICalendarService;
    import CalendarEvent = rehagoal.calendar.CalendarEvent;
    import TTSService = rehagoal.tts.TTSService;
    import IExecutionComponent = rehagoal.executionComponent.IExecutionComponent;

    describe('SchedulingView', function () {
        beforeEach(() => angular.mock.module('rehagoal.schedulingView'));
        beforeEach(() => angular.mock.module('rehagoal.templates'));

        let $componentController: angular.IComponentControllerService;
        let $log: angular.ILogService;
        let $window: angular.IWindowService;
        let $location: angular.ILocationService;
        let $rootScope: angular.IRootScopeService;
        let metricService: MetricService;
        let mockWorkflowService: Partial<IWorkflowService>;
        let mockMetricIdGeneratorService: Partial<MetricIdGenerator>;
        let calendarService: ICalendarService;
        let ttsService: TTSService;
        let workflow0: IWorkflow;
        let workflow1: IWorkflow;
        let workflow2: IWorkflow;
        let metricRecordSpy: jasmine.Spy;
        let metricRecordValueSpy: jasmine.Spy;

        beforeEach(() => angular.mock.module('rehagoal.workflow', function ($provide: angular.auto.IProvideService) {
            workflow0 = {
                id: 0,
                uuid: "fgaa0348-19e1-9231-8b6c-a49b8c16m41e",
                name: 'First Workflow',
                workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>",
                xmlHash: 'someHash0',
            };
            workflow1 = {
                id: 1,
                uuid: "5a5a0348-19e1-4213-8b8b-a49b8c47a21e",
                name: 'Second Workflow',
                workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>",
                xmlHash: 'someHash1',
            };
            workflow2 = {
                id: 2,
                uuid: "91bcjd02-a2cd-7762-0xax-kkla8c47aop0",
                name: 'Third Workflow',
                workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>",
                xmlHash: 'someHash2'
            };
            const workflows = [workflow0, workflow1, workflow2];

            mockWorkflowService = {
                getWorkflows: function () {
                    return workflows;
                },
                getWorkflowById(id: number): IWorkflow | null {
                    return workflows.find((wf) => wf.id === id) || null;
                }
            };

            mockMetricIdGeneratorService = {
                async getNewScheduleId(): Promise<number> {
                    return 1337
                },
                async getNewExecutionId(workflowId: string): Promise<number> {
                    return 42;
                }
            };

            $provide.value('workflowService', mockWorkflowService);
            $provide.value('metricIdGeneratorService', mockMetricIdGeneratorService);
        }));

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _$log_: angular.ILogService,
                                    _$window_: angular.IWindowService,
                                    _$location_: angular.ILocationService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _metricService_: MetricService,
                                    _calendarService_: ICalendarService,
                                    _ttsService_: TTSService) {
            $componentController = _$componentController_;
            $log = _$log_;
            $window = _$window_;
            $location = _$location_;
            $rootScope = _$rootScope_;
            metricService = _metricService_;
            metricRecordSpy = spyOn(metricService, 'record').and.callThrough();
            metricRecordValueSpy = spyOn(metricService, 'recordValue').and.callThrough();
            calendarService = _calendarService_;
            ttsService = _ttsService_;
        }));

        function getRecordPointAssignmentMatcher(): jasmine.ObjectContaining<any> {
            return jasmine.objectContaining({
                scheduleId: 1337
            });
        }

        function getRecordPointAssignmentWorkflowMatcher(workflow: IWorkflow): jasmine.ObjectContaining<any> {
            return jasmine.objectContaining({
                scheduleId: 1337,
                workflowId: workflow.uuid
            });
        }

        function getRecordCallsFor(recordPoint: RecordPoint): Parameters<MetricRecorder['record']>[] {
            return metricRecordSpy.calls.allArgs().filter(function (args) {
                return args.length > 0 && args[0] === recordPoint;
            });
        }

        function getRecordValueCallsFor(recordPoint: RecordPoint): Parameters<MetricRecorder['recordValue']>[][] {
            return metricRecordValueSpy.calls.allArgs().filter(function (args) {
                return args.length > 0 && args[0] === recordPoint;
            });
        }

        function getRecordPointRecordTimesCalled(recordPoint: RecordPoint): number {
            return getRecordCallsFor(recordPoint).length;
        }

        function getRecordPointRecordValueTimesCalled(recordPoint: RecordPoint): number {
            return getRecordValueCallsFor(recordPoint).length;
        }

        afterEach(function () {
            $log.info.logs.forEach(function (x) {
                console.info(x);
            });
        });

        describe('schedulingView controller', function() {
            let $scope: angular.IScope;

            beforeEach(function () {
                $scope = $rootScope.$new();
            });

            const testEvent: CalendarEvent = {
                uuid: 'testUUID1',
                date: new Date(2020, 1, 11, 16, 20),
                workflowIDs: [2, 0 , 1]
            };

            describe('constructor', function () {
                it('should acquire workflows from workflow service', function () {
                    spyOn(mockWorkflowService, 'getWorkflows').and.callThrough();
                    $componentController('schedulingView', {$scope: $scope}, {});
                    expect(mockWorkflowService.getWorkflows).toHaveBeenCalledTimes(1);
                });
                it('should register two event listeners: $locationChangeStart and views.updateWorkflows', function () {
                    spyOn($scope, '$on').and.callThrough();
                    $componentController('schedulingView', {$scope: $scope}, {});
                    expect($scope.$on).toHaveBeenCalledTimes(2);
                    expect($scope.$on).toHaveBeenCalledWith('$locationChangeStart', jasmine.any(Function));
                    expect($scope.$on).toHaveBeenCalledWith('views.updateWorkflows', jasmine.any(Function));
                });
                describe('initialize component', function () {
                    it('should initialize component, if no calendar event is given', async function (done) {
                        const $ctrl: ISchedulingView = $componentController('schedulingView', {$scope: $scope}, {});
                        expect($ctrl.componentInitialized).toBe(false);
                        await $ctrl.componentInitializedPromise;
                        $scope.$apply();
                        expect($ctrl.componentInitialized).toBe(true);
                        expect($ctrl.scheduledWorkflows).toEqual([]);
                        expect($ctrl.isSchedulerRunning()).toBe(false);
                        done();
                    });
                    it('should initialize component, if calendar event is provided by routeParams', async function (done) {
                        spyOn($rootScope, '$broadcast').and.callThrough();
                        spyOn(calendarService, 'getCalendarEventByUUID').and.returnValue(Promise.resolve(testEvent));
                        const $ctrl: ISchedulingView = $componentController('schedulingView', {
                            $scope,
                            $routeParams: {calendarEventUUID: testEvent.uuid}
                        }, {});
                        await $ctrl.componentInitializedPromise;
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        expect($rootScope.$broadcast).toHaveBeenCalledWith('calendarEventComponent::calendarEventStarted', testEvent.uuid);
                        $scope.$apply();
                        expect(calendarService.getCalendarEventByUUID).toHaveBeenCalledTimes(1);
                        expect($ctrl.scheduledWorkflows).toEqual([workflow2, workflow0, workflow1]);
                        expect($ctrl.isSchedulerRunning()).toBe(true);
                        expect($ctrl.scheduleId).toEqual(1337);
                        done();
                    });
                    it('should initialize component without calendar event, if it cannot be identified', async function(done) {
                        spyOn($rootScope, '$broadcast').and.callThrough();
                        spyOn(calendarService, 'getCalendarEventByUUID').and.returnValue(Promise.resolve(null));
                        const $ctrl: ISchedulingView = $componentController('schedulingView', {
                            $scope,
                            $routeParams: {calendarEventUUID:  'invalidUUID'}
                        }, {});
                        await $ctrl.componentInitializedPromise;
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(0);
                        $scope.$apply();
                        expect(calendarService.getCalendarEventByUUID).toHaveBeenCalledTimes(1);
                        expect($ctrl.scheduledWorkflows).toEqual([]);
                        expect($ctrl.isSchedulerRunning()).toBe(false);
                        done();
                    });
                    it('should throw error if workflow from calendar event cannot be found', async function(done) {
                        spyOn(calendarService, 'getCalendarEventByUUID').and.returnValue(Promise.resolve({
                            uuid: 'corruptedEventUUID',
                            date: new Date(2020, 0, 0, 1, 2, 3),
                            workflowIDs: [0, 42]
                        }));
                        const $ctrl: ISchedulingView = $componentController('schedulingView', {
                            $scope,
                            $routeParams: {calendarEventUUID:  'someUUID'}
                        }, {});
                        await expectThrowsAsync(async () => {
                            await $ctrl.componentInitializedPromise;
                        }, 'Could not get a workflow for ID 42, while initializing scheduler from calendar event.');
                        expect($ctrl.componentInitialized).toBe(false);
                        done();
                    });
                });
            });

            describe('behaviour', function () {
                let schedulingViewCtrl: ISchedulingView;

                beforeEach(function() {
                    const bindings = {};
                    schedulingViewCtrl = $componentController('schedulingView', {$scope}, bindings);
                });

                describe('properties and methods', function() {
                    it('controller should be defined', function() {
                        expect(schedulingViewCtrl).toBeDefined();
                    });

                    it('should have correct route', inject(function ($route: angular.route.IRouteService) {
                        expect($route.routes['/scheduling/:calendarEventUUID?'].template).toEqual('<scheduling-view></scheduling-view>');
                    }));

                    it('should have a property "workflows"', function() {
                        expect(schedulingViewCtrl.workflows).toBeDefined();
                    });

                    it('should have a property "scheduledWorkflows"', function() {
                        expect(schedulingViewCtrl.scheduledWorkflows).toBeDefined();
                        expect(schedulingViewCtrl.scheduledWorkflows.length).toBe(0);

                    });

                    it('should have a property "activeWorkflow", default "null"', function() {
                        expect(schedulingViewCtrl.activeWorkflow).toBeDefined();
                        expect(schedulingViewCtrl.activeWorkflow).toBeNull();
                    });

                    it('should have a method "isSchedulerRunning", default: "false"', inject(function () {
                        expect(schedulingViewCtrl.isSchedulerRunning).toBeDefined();
                        expect(schedulingViewCtrl.isSchedulerRunning()).toBe(false);
                    }));

                    it('should have a method "startScheduler"', inject(function () {
                        expect(schedulingViewCtrl.startScheduler).toBeDefined();
                    }));

                    it('should have a method "stopScheduler"', inject(function () {
                        expect(schedulingViewCtrl.stopScheduler).toBeDefined();
                    }));

                    it('should have a method "addWorkflowToSchedule"', inject(function () {
                        expect(schedulingViewCtrl.addWorkflowToSchedule).toBeDefined();
                    }));

                    it('should have a method "removeWorkflowFromSchedule"', inject(function () {
                        expect(schedulingViewCtrl.removeWorkflowFromSchedule).toBeDefined();
                    }));

                    it('should have a method "nextSchedule"', inject(function () {
                        expect(schedulingViewCtrl.nextSchedule).toBeDefined();
                    }));

                    it('should have a method "onWorkflowFinish', inject(function () {
                        expect(schedulingViewCtrl.onWorkflowFinish).toBeDefined();
                    }));

                    it('should have a method "onCancelLeave', inject(function () {
                        expect(schedulingViewCtrl.onCancelLeave).toBeDefined();
                    }));

                    it('should have a method "onNotificationConfirm', inject(function () {
                        expect(schedulingViewCtrl.onNotificationConfirm).toBeDefined();
                    }));

                    it('should have a method "onNotification', inject(function () {
                        expect(schedulingViewCtrl.onNotification).toBeDefined();
                    }));
                });

                describe('start/stop behaviour', function() {
                    it('should add a given workflow to the scheduledWorkflows list', function() {
                        expect(schedulingViewCtrl.scheduledWorkflows.length).toBe(0);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        expect(schedulingViewCtrl.scheduledWorkflows.length).toBe(1);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                        expect(schedulingViewCtrl.scheduledWorkflows.length).toBe(2);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow2);
                        expect(schedulingViewCtrl.scheduledWorkflows.length).toBe(3);
                    });

                    it('should add a given workflow to the scheduledWorkflows list if it has been added as the last workflow', function() {
                        expect(schedulingViewCtrl.scheduledWorkflows.length).toBe(0);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        expect(schedulingViewCtrl.scheduledWorkflows.length).toBe(2);
                    });

                    it('should remove an workflow-entry (as index-number) from scheduledWorkflows when removeWorkflowFromSchedule(index) is called', function() {
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                        expect(schedulingViewCtrl.scheduledWorkflows.length).toBe(2);
                        schedulingViewCtrl.removeWorkflowFromSchedule(0);
                        expect(schedulingViewCtrl.scheduledWorkflows[0]).toEqual(workflow1);
                    });

                    it('should check if scheduler is running after startScheduler() was called with valid arguments', async function(done) {
                        expect(schedulingViewCtrl.isSchedulerRunning()).toBe(false);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        await schedulingViewCtrl.startScheduler();
                        $scope.$apply();
                        expect(schedulingViewCtrl.isSchedulerRunning()).toBe(true);
                        done();
                    });

                    it('should stop the status of the scheduler when stopScheduler() is called', async function(done) {
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        await schedulingViewCtrl.startScheduler();
                        $scope.$apply();
                        expect(schedulingViewCtrl.isSchedulerRunning()).toBe(true);
                        schedulingViewCtrl.stopScheduler();
                        expect(schedulingViewCtrl.isSchedulerRunning()).toBe(false);
                        expect(schedulingViewCtrl.activeWorkflow).toBeNull();
                        done();
                    });

                    it('should set the activeWorkflow when startSchedule() was called', async function(done) {
                        expect(schedulingViewCtrl.activeWorkflow).toBeNull();
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        await schedulingViewCtrl.startScheduler();
                        $scope.$apply();
                        expect(schedulingViewCtrl.activeWorkflow).toEqual(workflow0);
                        done();
                    });

                    it('should trigger a broadcast to reload a workflow if the same workflow gets scheduled twice', async function(done) {
                        spyOn($rootScope, '$broadcast').and.callThrough()
                        expect(schedulingViewCtrl.activeWorkflow).toBeNull();
                        schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        schedulingViewCtrl.addWorkflowToSchedule(workflow2);
                        await schedulingViewCtrl.startScheduler();
                        $scope.$apply();
                        expect(schedulingViewCtrl.activeWorkflow).toEqual(workflow1);
                        await schedulingViewCtrl.nextSchedule();
                        expect(schedulingViewCtrl.activeWorkflow).toEqual(workflow0);
                        expect($rootScope.$broadcast).not.toHaveBeenCalledWith('executionComponent.reloadWorkflow', {skipDestroy: true});
                        await schedulingViewCtrl.nextSchedule();
                        expect($rootScope.$broadcast).toHaveBeenCalledWith('executionComponent.reloadWorkflow', {skipDestroy: true});
                        expect(schedulingViewCtrl.activeWorkflow).toEqual(workflow0);
                        await schedulingViewCtrl.nextSchedule();
                        expect(schedulingViewCtrl.activeWorkflow).toEqual(workflow2);
                        done();
                    });

                    it('should stop scheduling if no workflow is scheduled', async function(done) {
                        expect(schedulingViewCtrl.activeWorkflow).toBeNull();
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        await schedulingViewCtrl.startScheduler();
                        $scope.$apply();
                        expect(schedulingViewCtrl.activeWorkflow).toEqual(workflow0);
                        schedulingViewCtrl.stopScheduler();
                        expect(schedulingViewCtrl.activeWorkflow).toBeNull();
                        done();
                    });

                    it('should assign a new scheduleId on startSchedule', async function(done) {
                        await tryOrFailAsync(async () => {
                            const expectedIds = [0, 1, 2, 3, 10, 11, 15];
                            const idPromises = expectedIds.map((x) => Promise.resolve(x));
                            spyOn(mockMetricIdGeneratorService, 'getNewScheduleId')
                                .and.returnValues.apply(null, idPromises);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);

                            for (let i = 0; i < expectedIds.length; ++i) {
                                expect(schedulingViewCtrl.scheduleId).toBe(null);
                                await schedulingViewCtrl.startScheduler();
                                $scope.$apply();
                                expect(schedulingViewCtrl.scheduleId).toBe(expectedIds[i]);
                                schedulingViewCtrl.stopScheduler();
                            }
                        });

                        done();
                    });

                    it('should navigate back to /overview, when stopped and a calendarEvent was active', async function (done) {
                        spyOn(calendarService, 'getCalendarEventByUUID').and.returnValue(Promise.resolve(testEvent));
                        const $locationPathSpy = spyOn($location, 'path').and.callThrough();
                        const $routeParams = {calendarEventUUID: testEvent.uuid};
                        schedulingViewCtrl = $componentController('schedulingView', {$scope, $routeParams}, {});
                        await schedulingViewCtrl.componentInitializedPromise;
                        $scope.$apply();
                        expect(schedulingViewCtrl.isSchedulerRunning()).toBe(true);
                        // $location.path is called internally in parseRoute of angular-route without argument, which is ok
                        expect($location.path).not.toHaveBeenCalledWith(jasmine.anything());
                        schedulingViewCtrl.stopScheduler();
                        expect($locationPathSpy.calls.allArgs()).toEqual([[], [], [], [], [], [], ['/overview']]);
                        done();
                    });

                    it('should not navigate back to /overview, when stopped by $onDestroy and a calendarEvent was active', async function (done) {
                        spyOn(calendarService, 'getCalendarEventByUUID').and.returnValue(Promise.resolve(testEvent));
                        const $locationPathSpy = spyOn($location, 'path');
                        const $routeParams = {calendarEventUUID: testEvent.uuid};
                        schedulingViewCtrl = $componentController('schedulingView', {$scope, $routeParams}, {});
                        await schedulingViewCtrl.componentInitializedPromise;
                        $scope.$apply();
                        expect(schedulingViewCtrl.isSchedulerRunning()).toBe(true);
                        expect($location.path).not.toHaveBeenCalledWith(jasmine.anything());
                        schedulingViewCtrl.$onDestroy();
                        expect($location.path).not.toHaveBeenCalledWith(jasmine.anything());
                        done();
                    });

                    it('should not navigate back to /overview, when stopped and no calendarEvent was active', async function (done) {
                        spyOn($location, 'path');
                        schedulingViewCtrl = $componentController('schedulingView', {$scope}, {});
                        await schedulingViewCtrl.componentInitializedPromise;
                        schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                        await schedulingViewCtrl.startScheduler();
                        $scope.$apply();
                        expect(schedulingViewCtrl.isSchedulerRunning()).toBe(true);
                        expect($location.path).not.toHaveBeenCalledWith(jasmine.anything());
                        schedulingViewCtrl.stopScheduler();
                        expect($location.path).not.toHaveBeenCalledWith(jasmine.anything());
                        done();
                    });
                });

                describe('events and notification behaviour', function() {
                    it('should set the paused attribute according to the event $locationChangeStart', function() {
                        expect(schedulingViewCtrl.executionPaused).toBeFalsy();
                        $rootScope.$broadcast('$locationChangeStart');
                        expect(schedulingViewCtrl.executionPaused).toBeTruthy();
                    });

                    it('should set "leaveModalEnabled" if "onWorkflowFinish" is called', function () {
                        expect(schedulingViewCtrl.leaveModalEnabled).toBeTruthy();
                        schedulingViewCtrl.onWorkflowFinish();
                        expect(schedulingViewCtrl.leaveModalEnabled).toBeFalsy();
                    });

                    it('should set "executionPaused" if "onCancelLeave" is called', function () {
                        schedulingViewCtrl.executionPaused = true;
                        schedulingViewCtrl.onCancelLeave();
                        expect(schedulingViewCtrl.executionPaused).toBeFalsy();
                    });

                    it('should set the infoModal title, text, visibility and call TTS if "onNotification(title, text) " is called', function () {
                        const modalTitle = 'ThisIsATitle';
                        const modalText = 'HereComesTheModalText';

                        spyOn($scope, '$broadcast').and.callThrough();
                        spyOn(ttsService, 'speak');

                        expect(schedulingViewCtrl.infoModalTitle).toEqual('Erinnerung');
                        expect(schedulingViewCtrl.infoModalText).toEqual('');

                        schedulingViewCtrl.onNotification(modalTitle, modalText);
                        $scope.$apply();

                        expect(schedulingViewCtrl.infoModalTitle).toEqual(modalTitle);
                        expect(schedulingViewCtrl.infoModalText).toEqual(modalText);
                        expect($scope.$broadcast).toHaveBeenCalledWith('infoModal.openModal', { modalTitle: modalTitle, modalText: modalText });
                        expect(ttsService.speak).toHaveBeenCalledWith(modalTitle + ': ' + modalText);
                    });

                    it('should create an "executionComponent.resetAllTimersEvent" if "onNotificationConfirm" is called', function () {
                        spyOn($scope, '$broadcast');
                        schedulingViewCtrl.onNotificationConfirm();
                        expect($scope.$broadcast).toHaveBeenCalledWith('executionComponent.resetAllTimersEvent');
                    });

                    it('should check if workflowService.getWorkflows gets called', function() {
                        spyOn(mockWorkflowService, 'getWorkflows').and.callThrough();
                        $rootScope.$broadcast('views.updateWorkflows');
                        expect(mockWorkflowService.getWorkflows).toHaveBeenCalled();
                    });
                });

                describe('Metrics', function() {
                    describe('recordPoint `scheduleStart`', function() {
                        const recordPoint = 'scheduleStart';
                        it('should be recorded when a new schedule is started', async function(done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcher()
                            ]]);
                            done();
                        });
                        it('should not be recorded when a schedule is already running', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            metricRecordSpy.calls.reset();
                            await schedulingViewCtrl.startScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            done();
                        });
                    });
                    describe('recordPoint `scheduleAbort`', function() {
                        const recordPoint = 'scheduleAbort';
                        it('should be recorded when a running schedule is aborted within an active workflow', async function(done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            schedulingViewCtrl.onWorkflowFinish();
                            schedulingViewCtrl.nextSchedule();
                            // still in workflow1
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcher()
                            ]]);
                            done();
                        });
                        it('should be recorded when a running schedule is aborted within an active workflow via component destroy', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            schedulingViewCtrl.onWorkflowFinish();
                            schedulingViewCtrl.nextSchedule();
                            // still in workflow1
                            schedulingViewCtrl.$onDestroy();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcher()
                            ]]);
                            done();
                        });
                        it('should not be recorded if scheduler is stopped, but scheduler is already not running', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                            done();
                        });
                        it('should not be recorded if scheduler is already finished', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            schedulingViewCtrl.onWorkflowFinish();
                            schedulingViewCtrl.nextSchedule();
                            schedulingViewCtrl.onWorkflowFinish();
                            schedulingViewCtrl.nextSchedule();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            done();
                        });
                    });
                    describe('recordPoint `scheduleStart_numInstancesWorkflow`', function() {
                        const recordPoint = 'scheduleStart_numInstancesWorkflow';
                        it('should be recorded when a new schedule is started (single workflow instance)', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow0),
                                1
                            ]] as any[][]);
                            done();
                        });
                        it('should be recorded when a new schedule is started (multiple instances of different workflows)', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow2);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            // 4 x w1; 3 x w0; 1 x w2
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            expect(getRecordValueCallsFor(recordPoint)).toEqual(jasmine.arrayWithExactContents([[
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow0),
                                3
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow1),
                                4
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow2),
                                1
                            ]] as any[][]));
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(3);
                            done();
                        });
                        it('should not be recorded when a schedule is already running', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            metricRecordSpy.calls.reset();
                            await schedulingViewCtrl.startScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            done();
                        });
                    });
                    describe('recordPoint `scheduleWorkflowEnd_numInstancesWorkflow`', function() {
                        const recordPoint = 'scheduleWorkflowEnd_numInstancesWorkflow';
                        it('should be recorded when a workflow has finished, repeatedly', async function (done) {
                            // 4 x w1; 3 x w0; 1 x w2
                            const expectedCalls = [[
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow0),
                                1
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow1),
                                1
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow2),
                                1
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow1),
                                2
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow0),
                                2
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow1),
                                3
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow0),
                                3
                            ], [
                                recordPoint,
                                getRecordPointAssignmentWorkflowMatcher(workflow1),
                                4
                            ]] as any[][];
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow2);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            for (let i = 0; i < expectedCalls.length; ++i) {
                                schedulingViewCtrl.onWorkflowFinish();
                                expect(getRecordValueCallsFor(recordPoint)).toEqual(expectedCalls.slice(0, i + 1));
                                schedulingViewCtrl.nextSchedule();
                                expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(i + 1);
                            }
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(expectedCalls.length);
                            expect(getRecordValueCallsFor(recordPoint)).toEqual(expectedCalls);
                            done();
                        });
                        it('should not be recorded when a workflow is aborted', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            done();
                        });
                    });
                    describe('recordPoint `scheduleEnd_numInstances`', function() {
                        const recordPoint = 'scheduleEnd_numInstances';
                        it('should be recorded when the schedule has finished and there is no active workflow', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow2);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            for (let i = 0; i < 4; ++i) {
                                schedulingViewCtrl.onWorkflowFinish();
                                schedulingViewCtrl.nextSchedule();
                            }
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            schedulingViewCtrl.onWorkflowFinish();
                            schedulingViewCtrl.nextSchedule();
                            expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcher(),
                                5
                            ]] as any[][]);
                            done();
                        });
                        it('should be recorded when the schedule has finished and there is no active workflow, with correct values after second run', async function (done) {
                            // i.e. this checks that completedWorkflowInstances is properly cleared
                            for (let i = 0; i < 2; ++i) {
                                schedulingViewCtrl.scheduledWorkflows = [];
                                schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                                schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                                schedulingViewCtrl.addWorkflowToSchedule(workflow2);
                                schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                                schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                                expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(i);
                                await schedulingViewCtrl.startScheduler();
                                $scope.$apply();
                                for (let i = 0; i < 4; ++i) {
                                    schedulingViewCtrl.onWorkflowFinish();
                                    schedulingViewCtrl.nextSchedule();
                                }
                                expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(i);
                                schedulingViewCtrl.onWorkflowFinish();
                                schedulingViewCtrl.nextSchedule();
                                const singleRunCall = [
                                    recordPoint,
                                    getRecordPointAssignmentMatcher(),
                                    5
                                ];
                                expect(getRecordValueCallsFor(recordPoint)).toEqual(Array(i+1).fill(singleRunCall) as any[][]);
                            }
                            done();
                        });
                        it('should be recorded when empty scheduler is started and finishes immediately', async function (done) {
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcher(),
                                0
                            ]] as any[][]);
                            done();
                        });
                        it('should not be recorded when scheduler was aborted', async function (done) {
                            schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                            schedulingViewCtrl.addWorkflowToSchedule(workflow1);
                            await schedulingViewCtrl.startScheduler();
                            $scope.$apply();
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            done();
                        });
                        it('should not be recorded when scheduler was not running and stopped again', function() {
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                            schedulingViewCtrl.stopScheduler();
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                });
            });
            describe('component element', function() {
                let $scope: angular.IScope;
                let element: HTMLElement;
                let jqElement: JQLite;
                let $compile: angular.ICompileService;
                let schedulingViewCtrl: ISchedulingView;

                beforeEach(() => inject(function (_$compile_: angular.ICompileService) {
                    $compile = _$compile_;
                }));

                beforeEach(async function(done) {
                    $scope = $rootScope.$new();
                    jqElement = $compile(`<scheduling-view></scheduling-view>`)($scope);
                    element = jqElement[0];
                    $scope.$apply();
                    schedulingViewCtrl = jqElement.controller('schedulingView');
                    await schedulingViewCtrl.componentInitializedPromise;
                    $scope.$apply();
                    done();
                });

                it('should set ttsEnabled to true on executionComponent element', async function(done) {
                    schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                    await schedulingViewCtrl.startScheduler();
                    $scope.$apply();
                    const executionComponentJQElement = jqElement.find('execution-component');
                    const executionComponentController: IExecutionComponent = executionComponentJQElement.controller('executionComponent');
                    expect(executionComponentController.ttsEnabled).toBe(true);
                    done();
                });

                it('should set scrollToCurrent to true on executionComponent element', async function(done) {
                    schedulingViewCtrl.addWorkflowToSchedule(workflow0);
                    await schedulingViewCtrl.startScheduler();
                    $scope.$apply();
                    const executionComponentJQElement = jqElement.find('execution-component');
                    const executionComponentController: IExecutionComponent = executionComponentJQElement.controller('executionComponent');
                    expect(executionComponentController.scrollToCurrent).toBe(true);
                    done();
                });
            });
        });
    });
}
