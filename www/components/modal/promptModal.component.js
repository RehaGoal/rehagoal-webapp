"use strict";
(function () {
    angular.module('rehagoal.promptModal')
        .component('promptModal', {
            template: '',
            bindings: {
                title: '<',
                textLabel: '<',
                textAccept: '<',
                textCancel: '<',
                showTextBox: '<',
                onConfirm: '&',
                onCancel: '&'
            },
            controller: ['$scope', '$uibModal', '$interval', function ($scope, $uibModal, $interval) {
                var vm = this;
                vm.isModalOpen = false;
                vm.showPromptModal = showPromptModal;
                vm.openPromptModal = openPromptModal;

                $scope.$on("promptModal.openModalEvent", function(event) {
                    vm.showPromptModal();
                });

                function showPromptModal() {
                    if (!vm.isModalOpen) {
                        vm.openPromptModal();
                    }
                }

                function openPromptModal() {
                    var modalInstance = $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        backdrop: 'static',
                        templateUrl: 'components/modal/promptModal.html',
                        keyboard: false,
                        controller: ['$scope', function ($scope) {
                            var modal = this;
                            modal.title = vm.title;
                            modal.textLabel = vm.textLabel;
                            modal.textAccept = vm.textAccept;
                            modal.textCancel = vm.textCancel;
                            modal.showTextBox = vm.showTextBox;
                            modal.showAlert = false;
                            modal.alertMessage = '';
                            modal.onConfirm = onConfirm;
                            modal.onCancel = onCancel;
                            modal.userInput = '';

                            function onConfirm() {
                                if (!modal.showTextBox) {
                                    vm.onConfirm();
                                    modalInstance.close();
                                } else if (modal.userInput !== '') {
                                    vm.onConfirm({input: modal.userInput});
                                    modalInstance.close();
                                } else {
                                    modal.alertMessage = "Eingabe darf nicht leer sein!";
                                    modal.showAlert = true;
                                    var interval = $interval(function() {
                                        modal.showAlert = false;
                                        $interval.cancel(interval);
                                    }, 3000);
                                }
                            }

                            function onCancel() {
                                vm.onCancel();
                                modalInstance.close();
                            }
                        }],
                        controllerAs: '$ctrl'
                    });

                    modalInstance.opened.then(function () {
                        vm.isModalOpen = true;
                    });

                    modalInstance.closed.then(function () {
                        vm.isModalOpen = false;
                    });
                }
            }]
        });
})();
