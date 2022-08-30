"use strict";
(function () {
    angular.module('rehagoal.blockly')
        .service('blocklyService', ["$window", function ($window) {
            return $window.Blockly;
        }]);
})();
