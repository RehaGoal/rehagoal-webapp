"use strict";
describe('rehagoal.overviewView', function () {
    var $componentController, $rootScope, $log, $q;
    var workflow, mockWorkflowService, mockRestWorkflowExchangeService, mockAuthService;

    beforeEach(module('rehagoal.overviewView', function ($provide) {
        workflow = {
            id: 0,
            name: 'Test Workflow',
            workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>"
        };
        mockWorkflowService = {
            getWorkflowById: function (id) {
                return workflow;
            }
        };
        mockRestWorkflowExchangeService = {
            uploadWorkflows: function () {}
        };
        mockAuthService = {
            isUserLoggedIn: function () { return true;},
            requestUserLogin: function() {}
        };

        $provide.value('workflowService', mockWorkflowService);
        $provide.value('restWorkflowExchangeService', mockRestWorkflowExchangeService);
        $provide.value('authService', mockAuthService);
    }));

    beforeEach(inject(function (_$componentController_, _$rootScope_, _$log_, _$q_) {
        $componentController = _$componentController_;
        $rootScope = _$rootScope_;
        $log = _$log_;
        $q = _$q_;
    }));

    describe('serverExportButton', function() {
        var bindings = {
            workflowSelection: '<',
            buttonText: '@'
        };
        var serverExportButtonCtrl;
        var $scope;

        beforeEach(function () {
            $scope = $rootScope.$new();
            serverExportButtonCtrl = $componentController('serverExportButton', {$scope: $scope}, bindings);
        });

        describe('properties and methods', function () {
            it('should have a controller', function() {
                expect(serverExportButtonCtrl).toBeDefined();
            });
            it('should have a property "showPopover", default "false"', function () {
                expect(serverExportButtonCtrl.showPopover).toBeDefined();
                expect(serverExportButtonCtrl.showPopover).toBeFalsy();
            });
            it('should have a property "serverExportInProgress", default "false"', function () {
                expect(serverExportButtonCtrl.serverExportInProgress).toBeDefined();
                expect(serverExportButtonCtrl.serverExportInProgress).toBeFalsy();
            });
            it('should have a property "exportErrorMessage", default "null"', function () {
                expect(serverExportButtonCtrl.exportErrorMessage).toBeDefined();
                expect(serverExportButtonCtrl.exportErrorMessage).toBeNull();
            });
            it('should have a property "serverExportUrl", default "false"', function () {
                expect(serverExportButtonCtrl.serverExportUrl).toBeDefined();
                expect(serverExportButtonCtrl.serverExportUrl).toBeNull();
            });
            it('should have a method "getServerExportStatus"', function () {
                expect(serverExportButtonCtrl.getServerExportStatus).toBeDefined();
            });
            it('should have a method "exportSelectedWorkflowsToServer"', function () {
                expect(serverExportButtonCtrl.exportSelectedWorkflowsToServer).toBeDefined();
            });
        });

        describe('functional behaviour', function() {
            var msg_nothing = "Nichts exportiert",
                msg_inProgress = "Bitte warten...",
                msg_success = "Erfolgreich exportiert!",
                msg_error = "Fehler: ";

            beforeEach(function() {
                spyOn(serverExportButtonCtrl, "getServerExportStatus").and.callThrough();
                spyOn(serverExportButtonCtrl, "exportSelectedWorkflowsToServer").and.callThrough();
            });

            it('should return corresponding status information', function () {
                expect(serverExportButtonCtrl.getServerExportStatus()).toEqual(msg_nothing);
                serverExportButtonCtrl.exportErrorMessage = "none";
                expect(serverExportButtonCtrl.getServerExportStatus()).toEqual(msg_error + "none");
                serverExportButtonCtrl.exportErrorMessage = null;
                serverExportButtonCtrl.serverExportUrl = "none";
                expect(serverExportButtonCtrl.getServerExportStatus()).toEqual(msg_success);
                serverExportButtonCtrl.serverExportUrl = null;
                serverExportButtonCtrl.serverExportInProgress = true;
                expect(serverExportButtonCtrl.getServerExportStatus()).toEqual(msg_inProgress);
            });
            it('should abort action if user is not logged in', function() {
                spyOn(mockAuthService, "isUserLoggedIn").and.returnValue(false);
                spyOn(mockAuthService, "requestUserLogin").and.returnValue($q.reject());
                serverExportButtonCtrl.exportSelectedWorkflowsToServer();
                expect(mockAuthService.requestUserLogin).toHaveBeenCalledTimes(1);
            });
            it('should exportToServer if user is logged in after first call', function() {
                spyOn(mockAuthService, "isUserLoggedIn").and.returnValue(false);
                spyOn(mockAuthService, "requestUserLogin").and.returnValue($q.resolve());
                serverExportButtonCtrl.exportSelectedWorkflowsToServer();

                //FIXME: check if export is called again after successful login
                expect(mockAuthService.requestUserLogin).toHaveBeenCalledTimes(1);
                expect(serverExportButtonCtrl.exportSelectedWorkflowsToServer).toHaveBeenCalledTimes(1);
            });
            it('should abort action if export is in progress', function() {
                spyOn(serverExportButtonCtrl, "serverExportInProgress").and.returnValue(true);
                serverExportButtonCtrl.exportSelectedWorkflowsToServer();
                expect(serverExportButtonCtrl.showPopover).toBeFalsy();
            });
            it('should notify if no workflow was selected', function() {
                spyOn(mockWorkflowService, "getWorkflowById").and.returnValue(null);
                serverExportButtonCtrl.exportSelectedWorkflowsToServer();
                expect(serverExportButtonCtrl.exportErrorMessage).toEqual("Keine Workflows ausgewählt!");
                expect(serverExportButtonCtrl.showPopover).toBeTruthy();
            });
            it('should call the exportService if workflows have been selected', function() {
                spyOn(mockRestWorkflowExchangeService, "uploadWorkflows").and.returnValue($q.resolve());
                serverExportButtonCtrl.workflowSelection = { ids: [true] };
                serverExportButtonCtrl.exportSelectedWorkflowsToServer();

                expect(mockRestWorkflowExchangeService.uploadWorkflows).toHaveBeenCalledTimes(1);
                expect(serverExportButtonCtrl.exportErrorMessage).toBe(null);
                expect(serverExportButtonCtrl.showPopover).toBeTruthy();
            });
        });

        describe('error handling', function () {
           it('should handle export-rejection correctly', function () {
               spyOn(mockRestWorkflowExchangeService, "uploadWorkflows").and.callFake(function(workflows) {
                  return $q(function (resolve, reject) {
                      var failResponse = {
                          status: '-1',
                          statusText: 'server offline'
                      };
                      reject(failResponse);
                  });
               });
               serverExportButtonCtrl.workflowSelection = { ids: [true] };
               var promiseResult = null;
               serverExportButtonCtrl.exportSelectedWorkflowsToServer().then(function() {
                   promiseResult = "resolved";
               }).catch(function() {
                   promiseResult = "rejected";
               });
               expect(serverExportButtonCtrl.serverExportInProgress).toBe(true);
               $scope.$apply();

               expect(promiseResult).toBe("rejected");
               expect(serverExportButtonCtrl.serverExportInProgress).toBe(false);
               expect(serverExportButtonCtrl.exportErrorMessage).toMatch(/Server nicht erreichbar/);
               expect(serverExportButtonCtrl.showPopover).toBe(true);
           });
        });

    });
});
