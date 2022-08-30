'use strict';

module rehagoal.executionView {
    import ImageService = rehagoal.images.ImageService;
    import WorkflowExecution = rehagoal.workflow.WorkflowExecution;
    import WorkflowExecutionService = rehagoal.workflow.WorkflowExecutionService;

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
            let executionBlockParallelCtrl: IExecutionBlockParallelComponentController;

            beforeEach(function () {
                const bindings = {};

                $scope = $rootScope.$new();
                executionBlockParallelCtrl = $componentController('executionBlockParallel', {$scope: $scope}, bindings);
            });

            describe('properties and methods', function () {
                it('controller should be defined', function () {
                    expect(executionBlockParallelCtrl).toBeDefined();
                });
            });

            describe('functional behaviour', function () {
                it('should open lightbox modal, when openLightbox is called', function () {
                    const url = 'someshorturl';
                    const text = "sometext";
                    executionBlockParallelCtrl.imageUrl = url;
                    executionBlockParallelCtrl.text = text;
                    spyOn(Lightbox, 'openModal').and.callThrough();
                    executionBlockParallelCtrl.openLightbox();
                    expect(Lightbox.openModal).toHaveBeenCalledWith([{
                        'url': url,
                        'caption': text,
                        'thumbUrl': url,
                    }], 0);
                });

                it('should close modal, when the block index has changed', function () {
                    spyOn(Lightbox, 'openModal').and.callThrough();
                    spyOn(Lightbox, 'closeModal').and.callThrough();
                    executionBlockParallelCtrl.currentBlockIndex = 0;
                    $scope.$apply();
                    executionBlockParallelCtrl.openLightbox();
                    expect(Lightbox.closeModal).toHaveBeenCalledTimes(0);
                    expect(Lightbox.openModal).toHaveBeenCalledTimes(1);
                    executionBlockParallelCtrl.currentBlockIndex = 1;
                    $scope.$apply();
                    expect(Lightbox.openModal).toHaveBeenCalledTimes(1);
                    expect(Lightbox.closeModal).toHaveBeenCalledTimes(1);
                });

                it('should set imageUrl, when imageHash has changed', function () {
                    const url = "myImageUrl";
                    const hash = "somehash";
                    spyOn(imageService, 'getImageUrlFromHash').and.returnValue($q.resolve(url));
                    spyOn(imageService, 'releaseImageUrl');
                    executionBlockParallelCtrl.imageHash = hash;
                    $scope.$apply();
                    expect(imageService.releaseImageUrl).not.toHaveBeenCalled();
                    expect(imageService.getImageUrlFromHash).toHaveBeenCalledWith(hash);
                    expect(imageService.getImageUrlFromHash).toHaveBeenCalledTimes(1);
                    expect(executionBlockParallelCtrl.imageUrl).toBe(url);

                    executionBlockParallelCtrl.imageHash = null;
                    $scope.$apply();
                    expect(imageService.releaseImageUrl).toHaveBeenCalledWith(url);
                    expect(imageService.getImageUrlFromHash).toHaveBeenCalledTimes(1);
                    expect(executionBlockParallelCtrl.imageUrl).toBe(null);
                });

                it('should complete task when selectCheck is clicked', function () {
                    const flow = {};
                    const task = {done: jasmine.createSpy('done')};
                    spyOn($rootScope, '$broadcast');
                    executionBlockParallelCtrl.selectCheck(flow as WorkflowExecution, task as any as TaskBlock);
                    expect(task.done).toHaveBeenCalledWith(flow);
                    expect(task.done).toHaveBeenCalledTimes(1);
                    expect($rootScope.$broadcast).toHaveBeenCalledWith('subTaskDone', task);
                    expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                });

                it('should release image in $onDestroy', function() {
                    const url = 'someUrl';
                    spyOn(imageService, 'releaseImageUrl');
                    executionBlockParallelCtrl.imageUrl = url;
                    expect(imageService.releaseImageUrl).not.toHaveBeenCalled();
                    executionBlockParallelCtrl.$onDestroy!();
                    expect(imageService.releaseImageUrl).toHaveBeenCalledWith(url);
                })
            });
        });

        describe('executionBlockParallel component', function() {
            interface ITestScope extends ng.IScope {
                onImageLoadedSpy?: jasmine.Spy;
                parallelFlows?: WorkflowExecution[]
            }

            let $compile: ng.ICompileService;
            let $scope: ITestScope;
            beforeEach(inject(function (_$compile_: ng.ICompileService) {
                $compile = _$compile_;
                $scope = $rootScope.$new();
            }));

            describe('classic view', function() {
                it('should call onImageLoaded, when image has been loaded', function() {
                    $scope.onImageLoadedSpy = jasmine.createSpy('onImageLoadedSpy');
                    const jqElement = $compile('<execution-block-parallel flex="false" current-block-index="0" on-image-loaded="onImageLoadedSpy($event)"></execution-block-parallel>')($scope);
                    $rootScope.$apply();
                    const ctrl = jqElement.controller('executionBlockParallel');
                    ctrl.imageUrl = 'someImageUrl';
                    $rootScope.$apply();
                    expect($scope.onImageLoadedSpy).not.toHaveBeenCalled();
                    let jqImg = jqElement.find('img');
                    let imgElement = jqImg[0];
                    const fakeOnLoadEvent = new Event('load');
                    imgElement.dispatchEvent(fakeOnLoadEvent);
                    $rootScope.$apply();
                    expect($scope.onImageLoadedSpy).toHaveBeenCalledWith(fakeOnLoadEvent);
                });
                it('should call onImageLoaded, when mini-task image has been loaded', function() {
                    let workflowExecutionService;
                    inject(function(_workflowExecutionService_: WorkflowExecutionService) {
                        workflowExecutionService = _workflowExecutionService_;
                    });

                    $scope.onImageLoadedSpy = jasmine.createSpy('onImageLoadedSpy');
                    const flow1 = new rehagoal.workflow.WorkflowExecution();
                    flow1.pushBlock(new rehagoal.workflow.TaskBlock("Task"));
                    $scope.parallelFlows = [flow1];

                    const jqElement = $compile('<execution-block-parallel flows="parallelFlows" flex="false" current-block-index="0" on-image-loaded="onImageLoadedSpy($event)"></execution-block-parallel>')($scope);
                    $rootScope.$apply();
                    const ctrl = jqElement.find("execution-block").controller('executionBlock');
                    ctrl.imageUrl = 'someImageUrl';
                    $rootScope.$apply();
                    expect($scope.onImageLoadedSpy).not.toHaveBeenCalled();
                    const imgElement = jqElement.find('execution-block').find('img')[0];
                    const fakeOnLoadEvent = new Event('load');
                    imgElement.dispatchEvent(fakeOnLoadEvent);
                    $rootScope.$apply();
                    expect($scope.onImageLoadedSpy).toHaveBeenCalledWith(fakeOnLoadEvent);
                });
            });
        });
    });
}
