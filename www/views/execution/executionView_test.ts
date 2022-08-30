"use strict";
describe('ExecutionView module', function () {
    beforeEach(() => angular.mock.module('rehagoal.executionView'));
    beforeEach(() => angular.mock.module('rehagoal.templates'));

    let $componentController: ng.IComponentControllerService, $rootScope: ng.IRootScopeService, $location: ng.ILocationService;
    let workflow: IWorkflowV3;

    beforeEach(angular.mock.module('rehagoal.workflow', function ($provide: ng.auto.IProvideService) {
        workflow = {
            id: 0,
            name: 'Test Workflow',
            workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>",
            uuid: 'a1ddc066-91e4-4b33-aca1-7f5da9cacedf',
            xmlHash: '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826'
        };
        $provide.decorator('workflowService', function($delegate: IWorkflowService) {
            spyOn($delegate, 'getWorkflowById').and.returnValue(workflow);
            return $delegate;
        });
    }));

    beforeEach(inject(function (_$componentController_: ng.IComponentControllerService, _$rootScope_: ng.IRootScopeService, _$location_: ng.ILocationService) {
        $componentController = _$componentController_;
        $rootScope = _$rootScope_;
        $location = _$location_;
    }));

    describe('executionView controller', function () {
        let bindings: {}, executionViewCtrl: any, $scope: ng.IScope;

        beforeEach(function() {
            bindings = {};
            $scope = $rootScope.$new();
            executionViewCtrl = $componentController('executionView', {$scope: $scope}, bindings);
        });

        describe('properties and methods', function () {
            it('controller should be defined', function() {
                expect(executionViewCtrl).toBeDefined();
            });

            it('should have a property "leaveModalEnabled"', function() {
                expect(executionViewCtrl.leaveModalEnabled).toBeDefined();
            });

            it('should have a property "executionPaused"', function() {
                expect(executionViewCtrl.executionPaused).toBeDefined();
            });

            it('should have a property "infoModalTitle", default "Erinnerung"', function() {
                expect(executionViewCtrl.infoModalTitle).toBeDefined();
                expect(executionViewCtrl.infoModalTitle).toEqual('Erinnerung');
            });

            it('should have a property "infoModalText", default ""', function() {
                expect(executionViewCtrl.infoModalText).toBeDefined();
                expect(executionViewCtrl.infoModalText).toEqual("");
            });

            it('should have a method "onWorkflowFinishClick"', inject(function () {
                expect(executionViewCtrl.onWorkflowFinishClick).toBeDefined();
            }));

            it('should have a method "onWorkflowFinish"', inject(function () {
                expect(executionViewCtrl.onWorkflowFinish).toBeDefined();
            }));

            it('should have a method "onCancelLeave"', inject(function () {
                expect(executionViewCtrl.onCancelLeave).toBeDefined();
            }));

            it('should have a method "onNotification"', inject(function () {
                expect(executionViewCtrl.onNotification).toBeDefined();
            }));

            it('should have a method "onNotificationConfirm', inject(function () {
                expect(executionViewCtrl.onNotificationConfirm).toBeDefined();
            }));
        });

        describe('functional behaviour', function() {
            describe('Event management', function () {
                it('should change the location to overview when "onWorkflowFinishClick" has been called', function (){
                    spyOn($location, 'path');
                    executionViewCtrl.onWorkflowFinishClick();
                    expect($location.path).toHaveBeenCalledWith('/overview');
                });

                it('should set executionPaused after location has changed', function () {
                    expect(executionViewCtrl.executionPaused).toBe(false);
                    $scope.$broadcast('$locationChangeStart');
                    expect(executionViewCtrl.executionPaused).toBe(true);
                });

                it('should broadcast "infoModal.confirm", when location is changed, but not before location change was successful', function() {
                    spyOn($scope, '$broadcast').and.callThrough();
                    expect($scope.$broadcast).not.toHaveBeenCalledWith('infoModal.confirm');
                    $scope.$broadcast('$locationChangeStart');
                    expect($scope.$broadcast).not.toHaveBeenCalledWith('infoModal.confirm');
                    $scope.$broadcast('$locationChangeSuccess');
                    expect($scope.$broadcast).toHaveBeenCalledWith('infoModal.confirm');
                })

                it('should create an "executionComponent.resetAllTimersEvent" if "onNotificationConfirm" is called', function () {
                    spyOn($scope, '$broadcast');
                    executionViewCtrl.onNotificationConfirm();
                    expect($scope.$broadcast).toHaveBeenCalledWith('executionComponent.resetAllTimersEvent');
                });

                it('should create an "executionComponent.reminderConfirmed" if "onNotificationConfirm" is called', function () {
                    spyOn($scope, '$broadcast');
                    executionViewCtrl.onNotificationConfirm();
                    expect($scope.$broadcast).toHaveBeenCalledWith('executionComponent.reminderConfirmed');
                });
            });

            describe('notifications', function () {
                it('should disable the leaveModal when "onWorkflowFinish" has been called', function (){
                    executionViewCtrl.onWorkflowFinish();
                    expect(executionViewCtrl.leaveModalEnabled).toBe(false);
                });

                it('should resume the running workflow when "onCancelLeave" has been called', function (){
                    executionViewCtrl.onCancelLeave();
                    expect(executionViewCtrl.executionPaused).toBe(false);
                });

                it('should update the infoModal when "onNotification" has been called', function (){
                    var title = 'testTitle';
                    var text = 'testText';
                    executionViewCtrl.onNotification(title, text);
                    expect(executionViewCtrl.infoModalTitle).toEqual(title);
                    expect(executionViewCtrl.infoModalText).toEqual(text);
                });
            });
        });
    });

    describe('executionView component', function() {
        let $scope: ng.IScope;
        let element: Element;
        let jqElement: JQLite;
        let $compile: ng.ICompileService;
        let executionViewCtrl: any;

        beforeEach(() => inject(function (_$compile_) {
            $compile = _$compile_;
        }));

        beforeEach(function() {
            $scope = $rootScope.$new();
            jqElement = $compile(`<execution-view></execution-view>`)($scope);
            element = jqElement[0];
            $scope.$apply();
            executionViewCtrl = jqElement.controller('executionView');
        });

        it('should set ttsEnabled to true on executionComponent', function() {
            const executionComponentJQElement = jqElement.find('execution-component');
            const executionComponentController = executionComponentJQElement.controller('executionComponent');
            expect(executionComponentController.ttsEnabled).toBe(true);
        });

        it('should set scrollToCurrent to true on executionComponent', function() {
            const executionComponentJQElement = jqElement.find('execution-component');
            const executionComponentController = executionComponentJQElement.controller('executionComponent');
            expect(executionComponentController.scrollToCurrent).toBe(true);
        });
    });
});
