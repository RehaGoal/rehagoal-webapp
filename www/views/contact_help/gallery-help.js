"use strict";
angular.module('rehagoal.galleryhelp', ['bootstrapLightbox']);

(function() {

    angular.module('rehagoal.galleryhelp').config(['LightboxProvider', function (LightboxProvider) {
        LightboxProvider.templateUrl = 'views/contact_help/help-lightbox.html';
    }]);

    angular.module('rehagoal.galleryhelp')
        .controller('GalleryController', ['$log','$scope', 'Lightbox', function ($log,$scope, Lightbox) {
            var vm = this;

            vm.imagesOverview = [
                {
                    'url': 'views/contact_help/img/overview_explanation.jpg',
                    'caption': 'Übersicht aller Workflows',
                    'thumbUrl': 'views/contact_help/img/overview_explanation.jpg'
                }, {
                    'url': 'views/contact_help/img/overview_explanation2.jpg',
                    'caption': 'Workflows anlegen und speichern',
                    'thumbUrl': 'views/contact_help/img/overview_explanation2.jpg'
                }
            ];

            vm.imagesEditView= [
                {
                    'url': 'views/contact_help/img/editView-simple.jpg',
                    'caption': 'Bearbeiten eines Workflows - Einfache Aufgabenlisten',
                    'thumbUrl': 'views/contact_help/img/editView-simple.jpg'
                }, {
                    'url': 'views/contact_help/img/editView-bundle.jpg',
                    'caption': 'Bearbeiten eines Workflows - Beliebige Aufgabenliste',
                    'thumbUrl': 'views/contact_help/img/editView-bundle.jpg'
                }, {
                    'url': 'views/contact_help/img/editView-if.jpg',
                    'caption': 'Bearbeiten eines Workflows - Wenn-Dann-Sonst-Block',
                    'thumbUrl': 'views/contact_help/img/editView-if.jpg'
                }, {
                    'url': 'views/contact_help/img/editView-repeat1.jpg',
                    'caption': 'Bearbeiten eines Workflows - Wiederhole-Block',
                    'thumbUrl': 'views/contact_help/img/editView-repeat1.jpg'
                }, {
                    'url': 'views/contact_help/img/editView-repeat2.jpg',
                    'caption': 'Bearbeiten eines Workflows - Wiederhole-Solange-Block',
                    'thumbUrl': 'views/contact_help/img/editView-repeat2.jpg'
                }, {
                    'url': 'views/contact_help/img/editView-warten.jpg',
                    'caption': 'Bearbeiten eines Workflows - Warte-Block',
                    'thumbUrl': 'views/contact_help/img/editView-warten.jpg'
                }, {
                    'url': 'views/contact_help/img/editView-preview.jpg',
                    'caption': 'Bearbeiten eines Workflows - Vorschau',
                    'thumbUrl': 'views/contact_help/img/editView-preview.jpg'
                }
            ];

            vm.imagesExecutionView= [
                {
                    'url': 'views/contact_help/img/executionView.jpg',
                    'caption': 'Ausführen eines Workflows',
                    'thumbUrl': 'views/contact_help/img/executionView.jpg'
                }, {
                    'url': 'views/contact_help/img/unteraufgaben.jpg',
                    'caption': 'Workflow mit Unteraufgaben',
                    'thumbUrl': 'views/contact_help/img/unteraufgaben.jpg'
                }, {
                    'url': 'views/contact_help/img/executionView-explanation.jpg',
                    'caption': 'Fragen in Workflows',
                    'thumbUrl': 'views/contact_help/img/executionView-explanation.jpg'
                }
            ];

            vm.imagesSchedulingView= [
                {
                    'url': 'views/contact_help/img/scheduling.jpg',
                    'caption': 'Erstellen einer Ablaufplanung',
                    'thumbUrl': 'views/contact_help/img/scheduling.jpg'
                }
            ];

            vm.openLightboxOverview = openLightboxOverview;
            vm.openLightboxEditView = openLightboxEditView;
            vm.openLightboxExecutionView = openLightboxExecutionView;
            vm.openLightboxSchedulingView = openLightboxSchedulingView;

            function openLightboxOverview(index) {
                Lightbox.openModal(vm.imagesOverview, index);
            }

            function openLightboxEditView(index) {
                Lightbox.openModal(vm.imagesEditView, index);
            }

            function openLightboxExecutionView(index) {
                Lightbox.openModal(vm.imagesExecutionView, index);
            }

            function openLightboxSchedulingView(index) {
                Lightbox.openModal(vm.imagesSchedulingView, index);
            }
        }]);
})();

