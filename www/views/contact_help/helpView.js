(function () {
    'use strict';

    angular.module('rehagoal.helpView', ['ngRoute', 'rehagoal.galleryhelp'])

        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/help', {
                template: '<help-view></help-view>'
            });
        }])
        .component('helpView', {
            templateUrl: 'views/contact_help/helpView.html'
        });
})();