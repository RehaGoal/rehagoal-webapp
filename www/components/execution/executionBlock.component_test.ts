'use strict';

module rehagoal.executionView {
    import ImageService = rehagoal.images.ImageService;

    describe('ExecutionView module', function () {
        beforeEach(() => angular.mock.module('rehagoal.executionView'));
        beforeEach(() => angular.mock.module('rehagoal.templates'));
        beforeEach(() => angular.mock.module('bootstrapLightbox'));

        let $componentController: ng.IComponentControllerService,
            $rootScope: ng.IRootScopeService,
            Lightbox: any,
            imageService: ImageService,
            $q: ng.IQService;
        beforeEach(angular.mock.module('rehagoal.executionView', function () {
        }));

        beforeEach(inject(function (_$componentController_: ng.IComponentControllerService,
                                    _$rootScope_: ng.IRootScopeService,
                                    _Lightbox_: any,
                                    _imageService_: ImageService,
                                    _$q_: ng.IQService) {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
            Lightbox = _Lightbox_;
            imageService = _imageService_;
            $q = _$q_;
        }));

        describe('executionBlock controller', function () {
            let $scope: ng.IScope;
            let executionBlockCtrl: IExecutionBlockComponentController;

            beforeEach(function () {
                const bindings = {};

                $scope = $rootScope.$new();
                executionBlockCtrl = $componentController('executionBlock', {$scope: $scope}, bindings);
            });

            describe('properties and methods', function () {
                it('controller should be defined', function() {
                    expect(executionBlockCtrl).toBeDefined();
                });
            });

            describe('functional behaviour', function() {
                it('should open lightbox modal, when openLightbox is called', function() {
                    const url = 'someshorturl';
                    const text = "sometext";
                    executionBlockCtrl.imageUrl = url;
                    executionBlockCtrl.text = text;
                    spyOn(Lightbox, 'openModal').and.callThrough();
                    executionBlockCtrl.openLightbox();
                    expect(Lightbox.openModal).toHaveBeenCalledWith([{
                        'url': url,
                        'caption': text,
                        'thumbUrl': url
                    }], 0);
                });

                it('should not open lightbox modal, when lightbox is disabled', function() {
                    spyOn(Lightbox, 'openModal');
                    executionBlockCtrl.lightboxDisabled = true;
                    executionBlockCtrl.openLightbox();
                    expect(Lightbox.openModal).not.toHaveBeenCalled();
                });

                it('should close modal, when the block index has changed', function() {
                    spyOn(Lightbox, 'openModal').and.callThrough();
                    spyOn(Lightbox, 'closeModal').and.callThrough();
                    executionBlockCtrl.currentBlockIndex = 0;
                    $scope.$apply();
                    executionBlockCtrl.openLightbox();
                    expect(Lightbox.closeModal).toHaveBeenCalledTimes(0);
                    expect(Lightbox.openModal).toHaveBeenCalledTimes(1);
                    executionBlockCtrl.currentBlockIndex = 1;
                    $scope.$apply();
                    expect(Lightbox.openModal).toHaveBeenCalledTimes(1);
                    expect(Lightbox.closeModal).toHaveBeenCalledTimes(1);
                });

                it('should set imageUrl, when imageHash has changed', function() {
                    const url = "myImageUrl";
                    const hash = "somehash";
                    spyOn(imageService, 'getImageUrlFromHash').and.returnValue($q.resolve(url));
                    spyOn(imageService, 'releaseImageUrl');
                    executionBlockCtrl.imageHash = hash;
                    $scope.$apply();
                    expect(imageService.releaseImageUrl).not.toHaveBeenCalled();
                    expect(imageService.getImageUrlFromHash).toHaveBeenCalledWith(hash);
                    expect(imageService.getImageUrlFromHash).toHaveBeenCalledTimes(1);
                    expect(executionBlockCtrl.imageUrl).toBe(url);

                    executionBlockCtrl.imageHash = null;
                    $scope.$apply();
                    expect(imageService.releaseImageUrl).toHaveBeenCalledWith(url);
                    expect(imageService.getImageUrlFromHash).toHaveBeenCalledTimes(1);
                    expect(executionBlockCtrl.imageUrl).toBe(null);
                });

                it('should release image in $onDestroy', function() {
                    const url = 'someUrl';
                    spyOn(imageService, 'releaseImageUrl');
                    executionBlockCtrl.imageUrl = url;
                    expect(imageService.releaseImageUrl).not.toHaveBeenCalled();
                    executionBlockCtrl.$onDestroy!();
                    expect(imageService.releaseImageUrl).toHaveBeenCalledWith(url);
                })
            });
        });

        describe('executionBlock component', function() {
            interface ITestScope extends ng.IScope {
                onImageLoadedSpy?: jasmine.Spy;
            }

            let $compile: ng.ICompileService;
            let $scope: ITestScope;

            beforeEach(inject(function (_$compile_: ng.ICompileService) {
                $compile = _$compile_;
                $scope = $rootScope.$new();
            }));

            describe('classic view', function() {
                it('should call onImageLoaded, when image has been loaded', function(done) {
                    $scope.onImageLoadedSpy = jasmine.createSpy('onImageLoadedSpy');
                    const jqElement = $compile('<execution-block flex="false" current-block-index="0" on-image-loaded="onImageLoadedSpy($event)"></execution-block>')($scope);
                    $rootScope.$apply();
                    const ctrl = jqElement.controller('executionBlock');
                    ctrl.imageUrl = 'someImageUrl';
                    $rootScope.$apply();
                    expect($scope.onImageLoadedSpy).not.toHaveBeenCalled();
                    let jqImg = jqElement.find('img');
                    let imgElement = jqImg[0];
                    const fakeOnLoadEvent = new Event('load');
                    imgElement.dispatchEvent(fakeOnLoadEvent);
                    $rootScope.$apply();
                    expect($scope.onImageLoadedSpy).toHaveBeenCalledWith(fakeOnLoadEvent);
                    done();
                });
            });
        });
    });
}
