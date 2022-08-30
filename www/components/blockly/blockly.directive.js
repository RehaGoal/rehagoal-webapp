"use strict";
(function () {
    angular.module('rehagoal.blockly')
        .directive('blockly', ['$log', 'blocklyService', 'ngBlockly', function ($log, Blockly, ngBlockly) {
            return {
                restrict: 'E',
                scope: {
                    workspace: '=', //Blockly workspace
                    onChange: '&', //onChange listener function
                    disableOrphans: '<',
                    blockSaturation: '<',
                    blockValue: '<'
                }, // Isolate scope
                templateUrl: 'components/blockly/blockly.template.html',
                link: function ($scope, element, attrs) {
                    var options = ngBlockly.getOptions();
                    if($scope.blockSaturation) {
                        Blockly.HSV_SATURATION = $scope.blockSaturation;
                    }
                    if($scope.blockValue) {
                        Blockly.HSV_VALUE = $scope.blockValue;
                    }

                    $scope.workspace = Blockly.inject(element.children()[0], options);
                    $scope.$on('$destroy', cleanUp);
                    if ($scope.disableOrphans) {
                        $scope.workspace.addChangeListener(Blockly.Events.disableOrphans);
                    }
                    $scope.workspace.addChangeListener(function(event) {
                        $scope.onChange({event: event});
                    });

                    function cleanUp() {
                        $log.debug('Blockly::onDestroy');
                        $scope.workspace.dispose();
                    }
                }
            };
        }]);
})();
