(function () {
    'use strict';

    angular.module('rehagoal.contactView', ['ngRoute'])

        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/contact', {
                template: '<contact-view></contact-view>'
            });
        }])
        .component('contactView', {
            templateUrl: 'views/contact_help/contactView.html',
            controller: ['$log',
                function ($log) {
                    $log.debug('ContactView Component initialized.');
                }]
        });
})();