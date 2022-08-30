'use strict';

// Declare app level module which depends on views, and components
angular.module('rehagoal', [
    'ngRoute',
    'rehagoal.intents',
    'rehagoal.flowEditView',
    'rehagoal.executionView',
    'rehagoal.overviewView',
    'rehagoal.contactView',
    'rehagoal.helpView',
    'rehagoal.schedulingView',
    'rehagoal.plannerView',
    'rehagoal.loginModal',
    'rehagoal.calendar',
    'rehagoal.smartCompanion',
    'rehagoal.settingsView',
    'rehagoal.utilities',
    'rehagoal.crypto',
    'rehagoal.settings',
    'rehagoal.versionInfo',
    'rehagoal.workflow',
    'rehagoal.gamification'
]).config(['$locationProvider', '$routeProvider', function ($locationProvider, $routeProvider) {
    $locationProvider.hashPrefix('!');

    $routeProvider.otherwise({redirectTo: '/overview'});
}]).config(['$compileProvider',
    function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
    }
]).run(['editableOptions', function(editableOptions) {
    editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
}]).run(['intentService', function(intentService) {
}]).run(['intentImportService', function(intentService) {
}]).run(['smartCompanionService', function(smartCompanionService) {
}]).run(['calendarSchedulerService', function() {
}]);
