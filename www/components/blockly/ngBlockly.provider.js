"use strict";
(function () {
    angular.module('rehagoal.blockly')
        .provider("ngBlockly", function () {
            this.options = {
                path: "assets/",
                trashcan: true,
                toolbox: ''
            };

            this.$get = function () {
                var localOptions = this.options;
                return {
                    getOptions: function () {
                        return localOptions;
                    }
                };
            };

            this.setOptions = function (options) {
                this.options = options;
            };
        });
})();
