"use strict";
describe('rehagoal.loginModal', function () {
    var $rootScope, $controller, $uibModal, $q;
    var $scope, loginModalCtrl, uibModalSettings, mockAuthService;

    beforeEach(module('rehagoal.loginModal', function ($provide) {
        mockAuthService = {
            login: function () {},
            logout: function () {},
            isUserLoggedIn: function() {}
        };
        $provide.value('authService', mockAuthService);
    }));

    beforeEach(inject(function (_$rootScope_, _$controller_, _$uibModal_, _$q_) {
        $rootScope = _$rootScope_;
        $controller = _$controller_;
        $uibModal = _$uibModal_;
        $q = _$q_;
    }));

    beforeEach(function() {
        $scope = $rootScope.$new();
        loginModalCtrl = $controller('LoginModalController', {$scope: $scope});
    });

    describe('loginModalComponent controller', function() {
        describe('properties and methods', function () {
            it('controller should be defined', function() {
                expect(loginModalCtrl).toBeDefined();
            });
            it('should have a private property errorMessage, default: "" ', function() {
                expect(loginModalCtrl.errorMessage).toBeDefined();
                expect(loginModalCtrl.errorMessage).toEqual('');
            });
            it('should have a method showLoginModal', function() {
                expect(loginModalCtrl.showLoginModal).toBeDefined();
            });
        });

        describe('behaviour and functions', function() {
            it('should have a watch on "loginModal.openModalEvent"', function () {
                spyOn(loginModalCtrl, 'showLoginModal').and.callThrough();
                $rootScope.$broadcast('loginModal.openModalEvent');
                expect(loginModalCtrl.showLoginModal).toHaveBeenCalled();
            });
            it('should have a watch on "loginModal.openModalWithErrorEvent"', function (){
                var error = "thisIsAnError";
                spyOn(loginModalCtrl, 'showLoginModal').and.callThrough();
                $rootScope.$broadcast('loginModal.openModalWithErrorEvent',error);
                expect(loginModalCtrl.errorMessage).toEqual(error);
                expect(loginModalCtrl.showLoginModal).toHaveBeenCalled();
            });
        });
    });
    describe('loginModalInstance controller', function() {
        var loginModalInstanceCtrl, modalInstance;

        beforeEach(function() {
            modalInstance = jasmine.createSpyObj('modalInstance', ["close"]);
            spyOn($uibModal, "open").and.callFake(function(modalSettings) {
                uibModalSettings = modalSettings;
                return modalInstance;
            });
            loginModalCtrl.showLoginModal();
            loginModalInstanceCtrl = $controller(uibModalSettings.controller, {$scope: $scope});
        });

        describe('properties and methods', function () {
            it('controller should be defined', function() {
                expect(loginModalInstanceCtrl).toBeDefined();
            });
            it('should have a private property username, default: "" ', function() {
                expect(loginModalInstanceCtrl.username).toBeDefined();
                expect(loginModalInstanceCtrl.username).toEqual('');
            });
            it('should have a private property password, default: "" ', function() {
                expect(loginModalInstanceCtrl.password).toBeDefined();
                expect(loginModalInstanceCtrl.password).toEqual('');
            });
            it('should have a private property errorMessage, default: "" ', function() {
                expect(loginModalInstanceCtrl.errorMessage).toBeDefined();
                expect(loginModalInstanceCtrl.errorMessage).toEqual('');
            });
            it('should have a private property dataLoading, default: false ', function() {
                expect(loginModalInstanceCtrl.dataLoading).toBeDefined();
                expect(loginModalInstanceCtrl.dataLoading).toBeFalsy();
            });
            it('should have a method onLogin', function() {
                expect(loginModalInstanceCtrl.onLogin).toBeDefined();
            });
            it('should have a method onLogout', function() {
                expect(loginModalInstanceCtrl.onLogout).toBeDefined();
            });
            it('should have a method closeModal', function() {
                expect(loginModalInstanceCtrl.closeModal).toBeDefined();
            });
            it('should have a method isUserLoggedIn', function() {
                expect(loginModalInstanceCtrl.isUserLoggedIn).toBeDefined();
            });
            it('should have a method isUserInputValid', function() {
                expect(loginModalInstanceCtrl.isUserInputValid).toBeDefined();
            });
        });

        describe('behaviour and functions', function() {
            beforeEach(function (){
                spyOn(mockAuthService, "logout").and.callThrough();
                spyOn(mockAuthService, "isUserLoggedIn").and.callThrough();
                spyOn(loginModalInstanceCtrl, "isUserInputValid").and.callThrough();
            });

            it('should login the user with VALID credentials', function() {
                spyOn(mockAuthService, "login").and.returnValue($q.resolve());

                loginModalInstanceCtrl.username = 'demo';
                loginModalInstanceCtrl.password = 'nopass';

                loginModalInstanceCtrl.onLogin();
                $scope.$digest();
                expect(mockAuthService.login).toHaveBeenCalled();
                expect(loginModalInstanceCtrl.isUserInputValid).toHaveBeenCalled();
                expect(mockAuthService.logout).not.toHaveBeenCalled();

            });
            it('should NOT login the user with INVALID credentials', function() {
                var error = "thisError";
                spyOn(mockAuthService, "login").and.returnValue($q.reject(error));

                loginModalInstanceCtrl.username = 'demo';
                loginModalInstanceCtrl.password = 'nopass';

                expect(loginModalInstanceCtrl.errorMessage).toEqual('');
                loginModalInstanceCtrl.onLogin();
                $scope.$digest();
                expect(loginModalInstanceCtrl.isUserInputValid).toHaveBeenCalled();
                expect(mockAuthService.logout).toHaveBeenCalled();
                expect(loginModalInstanceCtrl.errorMessage).toEqual(error);
            });
            it('should call AuthService on onLogout', function () {
                loginModalInstanceCtrl.onLogout();
                expect(mockAuthService.logout).toHaveBeenCalled();
            });
            it('should reset the errorMessage and close the modal on closeModal', function() {
                loginModalCtrl.errorMessage = 'x';
                loginModalInstanceCtrl.closeModal();
                expect(loginModalCtrl.errorMessage).toEqual('');
                expect(modalInstance.close).toHaveBeenCalledTimes(1);
            });
            it('should verify username and password & min-length', function() {
                loginModalInstanceCtrl.username = '';
                loginModalInstanceCtrl.password = '';
                expect(loginModalInstanceCtrl.isUserInputValid()).toBeFalsy();

                loginModalInstanceCtrl.username = 'testuser';
                expect(loginModalInstanceCtrl.isUserInputValid()).toBeFalsy();

                loginModalInstanceCtrl.password = 'password';
                expect(loginModalInstanceCtrl.isUserInputValid()).toBeTruthy();

                loginModalInstanceCtrl.username = '';
                expect(loginModalInstanceCtrl.isUserInputValid()).toBeFalsy();
            });
            it('should close the the modal after successfull login', inject(function($timeout) {
                spyOn(mockAuthService, "login").and.returnValue($q.resolve());

                loginModalInstanceCtrl.username = 'demo';
                loginModalInstanceCtrl.password = 'nopass';

                loginModalInstanceCtrl.onLogin();
                $scope.$digest();

                $timeout.flush();
                expect(modalInstance.close).toHaveBeenCalledTimes(1);
            }));
            it('should NOT close the the modal after login failed', inject(function($timeout) {
                spyOn(mockAuthService, "login").and.returnValue($q.reject("error"));

                loginModalInstanceCtrl.username = 'demo';
                loginModalInstanceCtrl.password = 'nopass';

                loginModalInstanceCtrl.onLogin();
                $scope.$digest();

                $timeout.flush();
                expect(modalInstance.close).not.toHaveBeenCalled();
            }));
        });
    });

});

