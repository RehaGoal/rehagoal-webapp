(function () {
    'use strict';

    angular.module('rehagoal.executionView')
        .component('executionBlockParallel', {
            templateUrl: 'components/execution/executionBlockParallel.html',
            controller: ['$log', '$rootScope', '$scope', 'Lightbox', 'imageService', function ($log, $rootScope, $scope, Lightbox, imageService) {
                var vm = this;

                // TODO: Refactor duplicate code with executionBlock.component.js

                let destroyInProgress = false;

                vm.openLightbox = function () {
                    var imgArray = [
                        {
                            'url': vm.imageUrl,
                            'caption': vm.text,
                            'thumbUrl': vm.imageUrl
                        }];
                    Lightbox.openModal(imgArray, 0);
                };

                function releaseImage() {
                    if (vm.imageUrl) {
                        imageService.releaseImageUrl(vm.imageUrl);
                    }
                    vm.imageUrl = null;
                }

                function onBlockIndexChanged() {
                    if (!Lightbox.modalInstance) {
                        return;
                    }
                    Lightbox.closeModal();
                }

                function onImageHashChanged() {
                    releaseImage();
                    if (!vm.imageHash) {
                        return;
                    }
                    imageService.getImageUrlFromHash(vm.imageHash).then(function(imageUrl) {
                        $scope.$evalAsync(function() {
                            vm.imageUrl = imageUrl;
                            if (destroyInProgress) {
                                releaseImage();
                            }
                        });
                    });
                }

                this.$onDestroy = function() {
                    destroyInProgress = true;
                    releaseImage();
                };

                $scope.$watch(function() {
                    return vm.imageHash;
                }, onImageHashChanged);

                $scope.$watch(function() {
                    return vm.currentBlockIndex;
                }, onBlockIndexChanged);

                vm.selectCheck = function (flow, task) {
                    task.done(flow);
                    // TODO: $rootScope usage is probably problematic, when there are multiple executionViews in the scope
                    $rootScope.$broadcast('subTaskDone', task);
                };

                vm.onMiniImageLoaded = function(event) {
                    vm.onImageLoaded && vm.onImageLoaded({$event: event});
                };

                vm.onTitleImageLoaded = function(event) {
                    vm.onImageLoaded && vm.onImageLoaded({$event: event});
                };
            }],
            bindings: {
                currentBlockIndex: '<',
                flows: '<',
                flex: '<',
                text: '<',
                imageHash: '<',
                numTasksTodo: '<',
                numTasksRemain: '<',
                onClickTitle: '<',
                onClickMiniLabel: '<',
                onImageLoaded: '&',
                contentAlign: '<' //'left' or 'right'
            }
        });
})();
