"use strict";
(function () {
    angular.module('rehagoal.leaveModal')
        .component('leaveModal', {
            template: '',
            bindings: {
                text: '@',
                onConfirm: '<',
                onCancel: '<',
                modalEnabled: '<'
            },
            controller: ['$scope', '$uibModal', function ($scope, $uibModal) {
                var delayedLocationChangeUrl = null;
                var changeConfirmed = false;
                var vm = this;
                var isModalOpen = false;

                $scope.$on('$locationChangeStart', function (e, newUrl) {
                    if (!angular.isDefined(vm.modalEnabled) || vm.modalEnabled) {
                        if (!changeConfirmed) {
                            e.preventDefault();
                            delayedLocationChangeUrl = newUrl;
                            if (!isModalOpen) {
                                warnExecutionAbort();
                            }
                        }
                    }
                });

                function warnExecutionAbort()  {
                    var modalInstance = $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        backdrop: 'static',
                        templateUrl: 'components/modal/leaveModal.html',
                        keyboard: false,
                        controller: ['$sce', '$window', function($sce, $window) {
                            this.text = $sce.trustAsHtml(vm.text);
                            this.onConfirm = onConfirm;
                            this.onCancel = onCancel;

                            function onConfirm() {
                                if (angular.isDefined(vm.onConfirm)) {
                                    vm.onConfirm();
                                }

                                modalInstance.close();
                                changeConfirmed = true;
                                // TODO check if this is a problem for cordova (eg. reloading everything?)
                                $window.location.assign(delayedLocationChangeUrl);
                            }

                            function onCancel() {
                                if (angular.isDefined(vm.onCancel)) {
                                    vm.onCancel();
                                }
                                modalInstance.close();
                            }
                        }],
                        controllerAs: '$ctrl'
                    });

                    modalInstance.opened.then(function () {
                        isModalOpen = true;
                    });

                    modalInstance.closed.then(function () {
                        isModalOpen = false;
                    });
                }
            }]
        });
})();
