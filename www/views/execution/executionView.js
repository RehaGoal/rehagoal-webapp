(function () {
    'use strict';

    angular.module('rehagoal.executionView', [
        'ngRoute',
        'ngAnimate',
        'bootstrapLightbox',
        'luegg.directives',
        'rehagoal.blockly',
        'rehagoal.blocklyConfig',
        'rehagoal.workflow',
        'rehagoal.leaveModal',
        'rehagoal.infoModal',
        'rehagoal.executionComponent',
        'rehagoal.tts'
    ])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/start/:workflowId', {
                template: '<execution-view></execution-view>'
            });
        }])
        .component('executionView', {
            templateUrl: 'views/execution/executionView.html',
            controller: ['$log', '$scope', '$rootScope', '$routeParams', '$location', 'blocklyService', 'workflowService', 'ttsService', 'settingsService',
                function ($log, $scope, $rootScope, $routeParams, $location, Blockly, workflowService, ttsService, settingsService) {
                    $log.debug('ExecutionView Component initialized.');

                    var vm = this;
                    vm.workflow = workflowService.getWorkflowById(Number($routeParams.workflowId));
                    vm.leaveModalEnabled = true;
                    vm.executionPaused = false;
                    vm.infoModalTitle = "Erinnerung";
                    vm.infoModalText = "";
                    vm.onWorkflowFinishClick = onWorkflowFinishClick;
                    vm.onWorkflowFinish = onWorkflowFinish;
                    vm.onCancelLeave = onCancelLeave;
                    vm.onNotification = onNotification;
                    vm.onNotificationConfirm = onNotificationConfirm;
                    vm.isFlexViewEnabled = isFlexViewEnabled;
                    vm.getFlexContentAlignment = getFlexContentAlignment;

                    $scope.$on('$locationChangeStart', function () {
                        vm.executionPaused = true;
                    });

                    $scope.$on('$locationChangeSuccess', function() {
                        // Close infoModal (reminder), if it is still open when leaving the view.
                        $scope.$broadcast('infoModal.confirm');
                    });

                    function onWorkflowFinishClick() {
                        $location.path("/overview");
                    }

                    function onWorkflowFinish() {
                        vm.leaveModalEnabled = false;
                    }

                    function onCancelLeave() {
                        vm.executionPaused = false;
                    }

                    function onNotification(title, text) {
                        vm.infoModalTitle = title;
                        vm.infoModalText = text;
                        /* this apply is necessary here to ensure that the modal is initialized correctly */
                        $scope.$applyAsync(function() {
                            $scope.$broadcast('infoModal.openModal', {modalTitle: title, modalText: text});
                        });
                        ttsService.speak(title + ": " + text);
                    }

                    function onNotificationConfirm() {
                        $scope.$broadcast('executionComponent.resetAllTimersEvent');
                        $scope.$broadcast('executionComponent.reminderConfirmed');
                    }

                    function isFlexViewEnabled() {
                        return settingsService.executionViewLayout === 'flex';
                    }

                    function getFlexContentAlignment() {
                        return settingsService.executionViewFlexContentAlignment;
                    }

                }]
        });
})();
