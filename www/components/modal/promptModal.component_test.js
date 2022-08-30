"use strict";
describe('rehagoal.promptModal', function () {
    var $rootScope, $componentController, $uibModal, $controller;
    var $scope, promptModalCtrl, uibModalSettings;

    beforeEach(module('rehagoal.promptModal'));

    beforeEach(inject(function (_$rootScope_, _$componentController_, _$uibModal_, _$controller_) {
        $rootScope = _$rootScope_;
        $componentController = _$componentController_;
        $uibModal = _$uibModal_;
        $controller = _$controller_;
    }));

    beforeEach(function () {
        var bindings = {
            onConfirm: jasmine.createSpy('onConfirm')
        };

        $scope = $rootScope.$new();
        promptModalCtrl = $componentController('promptModal', {$scope: $scope}, bindings);
    });

    describe('promptModalComponent controller', function() {
        describe('properties and methods', function () {
            it('controller should be defined', function() {
                expect(promptModalCtrl).toBeDefined();
            });
            it('should have a private property isModalOpen, default: "False" ', function() {
                expect(promptModalCtrl.isModalOpen).toBeDefined();
                expect(promptModalCtrl.isModalOpen).toBeFalsy();
            });
            it('should have a method showLoginModal', function() {
                expect(promptModalCtrl.showPromptModal).toBeDefined();
            });
            it('should have a method openLoginModal', function() {
                expect(promptModalCtrl.openPromptModal).toBeDefined();
            });
        });

        describe('behaviour and functions', function() {
            it('should have a watch on "promptModal.openModalEvent"', function () {
                spyOn(promptModalCtrl, 'showPromptModal').and.callThrough();
                $rootScope.$broadcast('promptModal.openModalEvent');
                expect(promptModalCtrl.showPromptModal).toHaveBeenCalled();
            });
            it('should open modal if not already opened', function() {
                spyOn(promptModalCtrl, 'openPromptModal').and.callFake(function(){});
                promptModalCtrl.isModalOpen = false;
                promptModalCtrl.showPromptModal();
                expect(promptModalCtrl.openPromptModal).toHaveBeenCalled();
            });
            it('should NOT open modal if already opened', function() {
                spyOn(promptModalCtrl, 'openPromptModal').and.callFake(function(){});
                promptModalCtrl.isModalOpen = true;
                promptModalCtrl.showPromptModal();
                expect(promptModalCtrl.openPromptModal).not.toHaveBeenCalled();
            });
        });
    });
    describe('promptModalInstance controller', function() {
        var promptModalInstanceCtrl, modalInstance;

        beforeEach(function() {
            modalInstance = {
                opened: {
                    then: jasmine.createSpy('modalInstance.opened.then'),
                },
                closed: {
                    then: jasmine.createSpy('modalInstance.closed.then'),
                },
                open: function () {},
                close: function () {}
            };
            spyOn($uibModal, "open").and.callFake(function(modalSettings) {
                uibModalSettings = modalSettings;
                return modalInstance;
            });

            promptModalCtrl.openPromptModal();
            promptModalInstanceCtrl = $controller(uibModalSettings.controller, {$scope: $scope});
        });

        describe('properties and methods', function () {
            it('controller should be defined', function() {
                expect(promptModalInstanceCtrl).toBeDefined();
            });
            it('should have a private property userInput, default: "" ', function() {
                expect(promptModalInstanceCtrl.userInput).toBeDefined();
                expect(promptModalInstanceCtrl.userInput).toEqual('');
            });
            it('should have a method onConfirm', function() {
                expect(promptModalInstanceCtrl.onConfirm).toBeDefined();
            });
            it('should have a method onCancel', function() {
                expect(promptModalInstanceCtrl.onCancel).toBeDefined();
            });
        });

        describe('behaviour and functions', function() {
            it('should call the assigned function if input is VALID', function() {
                var userInput = 'test';
                promptModalInstanceCtrl.userInput = userInput;
                promptModalInstanceCtrl.showTextBox = true;
                promptModalInstanceCtrl.onConfirm();
                $scope.$digest();
                expect(promptModalCtrl.onConfirm).toHaveBeenCalledWith(jasmine.objectContaining({input: userInput}));

            });
            it('should NOT call the assigned function if input is INVALID', function() {
                var userInput = '';
                promptModalInstanceCtrl.userInput = userInput;
                promptModalInstanceCtrl.showTextBox = true;
                promptModalInstanceCtrl.onConfirm();
                $scope.$digest();
                expect(promptModalCtrl.onConfirm).not.toHaveBeenCalled();
            });
        });

        describe('no text box', function() {
            it('should close modal with onConfirm', function() {
                promptModalInstanceCtrl.showTextBox = false;
                promptModalInstanceCtrl.onConfirm();
                $scope.$digest();
                expect(promptModalCtrl.onConfirm).toHaveBeenCalled();
            });
        });
    });

});

