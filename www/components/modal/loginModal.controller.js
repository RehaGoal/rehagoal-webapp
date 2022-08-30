"use strict";
(function () {
    angular.module('rehagoal.loginModal')
        .controller('LoginModalController', ['$scope', '$uibModal', 'authService',
            function ($scope, $uibModal, AuthService) {
                var vm = this;
                vm.errorMessage = '';
                vm.showModal = false;
                vm.showLoginModal = showLoginModal;
                vm.openLoginModal = openLoginModal;
                vm.isUserLoggedIn = isUserLoggedIn;
                vm.deferredList = [];

                $scope.$on("loginModal.openModalEvent", function(event, deferred) {
                    vm.deferredList.push(deferred);
                    vm.showLoginModal();
                });

                $scope.$on("loginModal.openModalWithErrorEvent", function(event, error) {
                    vm.errorMessage = error;
                    vm.showLoginModal();
                });

                function isUserLoggedIn() {
                    return AuthService.isUserLoggedIn();
                }

                function showLoginModal() {
                    if (!vm.showModal) {
                        vm.showModal = true;
                        vm.openLoginModal();
                    }
                }

                function openLoginModal() {
                    var modalInstance = $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl : 'components/modal/loginModal.html',
                        controller: ['$scope', '$timeout', function($scope, $timeout) {
                            var modal = this;
                            modal.username = '';
                            modal.password = '';
                            modal.errorMessage = vm.errorMessage;
                            modal.dataLoading = false;
                            modal.onLogin = onLogin;
                            modal.onLogout = onLogout;
                            modal.closeModal = closeModal;
                            modal.isUserLoggedIn = isUserLoggedIn;
                            modal.isUserInputValid = isUserInputValid;

                            $scope.$on("modal.closing", function() {
                                vm.showModal = false;
                            });

                            function onLogin() {
                                if (modal.isUserInputValid()) {
                                    modal.dataLoading = true;
                                    AuthService.login(modal.username, modal.password).then(
                                        function() {
                                            modal.errorMessage = '';
                                            while (vm.deferredList.length > 0) {
                                                var deferred = vm.deferredList.pop();
                                                deferred.resolve();
                                            }
                                            $timeout(modal.closeModal, 1000);
                                        },
                                        function(error) {
                                            AuthService.logout();
                                            modal.errorMessage = error;
                                        }
                                    ).then(function () {
                                        modal.dataLoading = false;
                                        modal.username = '';
                                        modal.password = '';
                                    });
                                }
                            }

                            function onLogout() {
                                AuthService.logout();
                            }

                            function closeModal(){
                                vm.errorMessage = '';
                                modalInstance.close();
                                // if there are deferred actions left, reject them all.
                                while (vm.deferredList.length > 0) {
                                    var deferred = vm.deferredList.pop();
                                    deferred.reject();
                                }
                            }

                            function isUserLoggedIn() {
                                return AuthService.isUserLoggedIn();
                            }

                            function isUserInputValid() {
                                // password is undefined unless min-length is reached
                                return (modal.username!=='' && modal.password!=='' && modal.password!==undefined);
                            }

                        }],
                        controllerAs: '$ctrl'
                    });
                }
        }]);
})();
