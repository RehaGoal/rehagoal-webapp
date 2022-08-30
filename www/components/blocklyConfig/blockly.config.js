"use strict";
angular.module('rehagoal.blocklyConfig').config(['ngBlocklyProvider', function (ngBlocklyProvider) {
    // TODO: maybe load this via XHR (but then we might have to bootstrap angular)
    var toolbox = '<xml id="toolbox" style="display: none">';

    //toolbox += '<category name="Aufgaben">';
    toolbox += '<block type="task"></block>';
    //toolbox += '</category>';
    //toolbox += '<category name="Bedingungen">';
    toolbox += '<block type="if_then_else"></block>';
    //toolbox += '</category>';
    //toolbox += '<category name="Wiederholungen">';
    toolbox += '<block type="repeat_times"></block>';
    toolbox += '<block type="repeat_condition"></block>';
    //toolbox += '</category>';
    //toolbox += '<category name="Erinnerungen">';
    toolbox += '<block type="timer_remember"></block>';
    toolbox += '<block type="timer_sleep"></block>';
    //toolbox += '</category>';
    toolbox += '<block type="parallel_or"></block>';

    toolbox += '</xml>';

    ngBlocklyProvider.setOptions({
        path: "bower_components/google-blockly/",
        trashcan: true,
        collapse: true,
        toolbox: toolbox,
        scrollbars: true

    });
}]);
