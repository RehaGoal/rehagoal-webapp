"use strict";
(function () {
    angular.module('rehagoal.infoModal')
        .component('infoModal', {
            template: '',
            bindings: {
                title: '<',
                text: '<',
                modalEnabled: '<',
                onConfirm: '&'
            },
            controller: ['$scope', '$uibModal', function ($scope, $uibModal) {
                var vm = this;
                vm.modalTitle = 'Title';
                vm.modalText = 'Text';
                vm.openModal = openModal;
                vm.onOpenModalCalled = onOpenModalCalled;
                vm.blocked = false;
                vm.infoModal = null;

                $scope.$on('infoModal.openModal', function (event, args) {
                    vm.modalTitle = args.modalTitle;
                    vm.modalText = args.modalText;
                    vm.onOpenModalCalled();
                });

                // TODO: Probably it would be better to require a reference to the actual modal
                //       (what if multiple infoModals may exist in the same context?)
                $scope.$on('infoModal.confirm', function () {
                    onConfirmModalInstance();
                });

                function openModal() {
                    vm.infoModal = $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        backdrop: 'static',
                        templateUrl: 'components/modal/infoModal.html',
                        keyboard: false,
                        controller: [function() {
                            this.text = vm.modalText;
                            this.title = vm.modalTitle;
                            this.onConfirm = onConfirm;

                            function onConfirm() {
                                onConfirmModalInstance();
                            }
                        }],
                        controllerAs: '$ctrl'
                    });
                }

                function onConfirmModalInstance() {
                    if (vm.infoModal !== null) {
                        vm.infoModal.close();
                        vm.blocked = false;
                        vm.onConfirm();
                    }
                }

                function onOpenModalCalled() {
                    if (!angular.isDefined(vm.modalEnabled) || vm.modalEnabled) {
                        if (!vm.blocked) {
                            vm.blocked = true;
                            openModal();
                        }
                    }
                }
            }]
            /*, controllerAs: '$ctrl'*/
        });
})();
