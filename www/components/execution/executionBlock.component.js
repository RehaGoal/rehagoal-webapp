(function () {
    'use strict';

    angular.module('rehagoal.executionView')
        .component('executionBlock', {
            templateUrl: 'components/execution/executionBlock.html',
            controller: ['Lightbox', '$scope', 'imageService', function (Lightbox, $scope, imageService) {
                var vm = this;
                let destroyInProgress = false;
                vm.openLightbox = openLightbox;

                function openLightbox() {
                    if (vm.lightboxDisabled) {
                        return;
                    }
                    var imgArray = [
                        {
                            'url': vm.imageUrl,
                            'caption': vm.text,
                            'thumbUrl': vm.imageUrl
                        }];
                    Lightbox.openModal(imgArray, 0);
                }

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
            }],
            bindings: {
                text: '<',
                imageHash: '<',
                flex: '<',
                contentAlign: '<', //'left' or 'right'
                additionalText: '<',
                currentBlockIndex: '<',
                lightboxDisabled: '<',
                buttonDisabled: '<',
                buttonYes: '<',
                buttonNo: '<',
                buttonCheck: '<',
                buttonSkip: '<',
                onClickCheck: '&',
                onClickYes: '<',
                onClickNo: '<',
                onClickLabel: '&',
                onClickSkip: '<',
                onImageLoaded: '&',
                current: '<',
                miniTask: '<'
            }
        });
})();
