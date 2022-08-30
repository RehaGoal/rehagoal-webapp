module rehagoal.flowEditView {
    import IBlockly = rehagoal.blockly.IBlockly;
    import ImageService = rehagoal.images.ImageService;
    import Block = rehagoal.blockly.Block;
    import IBlocklyWorkspace = rehagoal.blockly.IBlocklyWorkspace;
    import createSpyObj = jasmine.createSpyObj;
    import IBlocklyClipboardService = rehagoal.clipboard.IBlocklyClipboardService;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
    import IBlocklyWorkspaceSvg = rehagoal.blockly.IBlocklyWorkspaceSvg;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import ClipboardEntry = rehagoal.database.ClipboardEntry;
    import BlocklyClipboardEntry = rehagoal.database.BlocklyClipboardEntry;
    import readFileAsTextFunc = rehagoal.utilities.readFileAsTextFunc;
    import CLIPBOARD_DATA_EXPIRED_EVENT = rehagoal.database.CLIPBOARD_DATA_EXPIRED_EVENT;
    describe('FlowEditView module', function () {
        let $componentController: angular.IComponentControllerService;
        let $log: angular.ILogService;
        let $q: angular.IQService;
        let $rootScope: angular.IRootScopeService;
        let $interval: angular.IIntervalService;
        let mockBlockly: IBlockly;
        let mockWorkflowService: IWorkflowService;
        let imageService: ImageService;
        let blocklyClipboardService: IBlocklyClipboardService;
        let readFileAsText: readFileAsTextFunc;

        function getExampleWorkflow(): IWorkflow {
            return {id: 0, name: "TestWorkflow", workspaceXml: "<xml></xml>", uuid: 'testUUID', xmlHash: 'testXmlHash'};
        }

        function createWorkspaceMock() {
            const workspace: jasmine.SpyObj<IBlocklyWorkspaceSvg> = createSpyObj('workspace', ['undo']);
            Object.defineProperty(workspace, 'undoStack_', {
                configurable: true,
                enumerable: true,
                get() {}
            });
            Object.defineProperty(workspace, 'redoStack_', {
                configurable: true,
                enumerable: true,
                get() {}
            });
            const undoStackSpy = spyOnProperty(workspace, 'undoStack_');
            const redoStackSpy = spyOnProperty(workspace, 'redoStack_');
            return {
                workspace,
                undoStackSpy,
                redoStackSpy
            };
        }

        beforeEach(() => angular.mock.module('rehagoal.templates'));

        // Modules
        beforeEach(angular.mock.module('rehagoal.flowEditView',  function ($provide: angular.auto.IProvideService) {
            $provide.decorator('workflowService', function($delegate: IWorkflowService) {
                spyOn($delegate, 'getWorkflowById').and.callFake(function() {
                    return getExampleWorkflow();
                });
                spyOn($delegate, 'saveWorkflow').and.callFake(function() {
                    return Promise.resolve();
                });
                return $delegate;
            });
            $provide.decorator('blocklyService', function($delegate: IBlockly) {
                spyOn($delegate.Xml, 'textToDom').and.callFake(function (text: string) {
                    return {"dom_text": text} as unknown as Document;
                });
                spyOn($delegate.Xml, 'domToWorkspace').and.callFake(function (xmlDom: string, workspace: IBlocklyWorkspace) {
                });
                spyOn($delegate.Xml, 'workspaceToDom').and.callFake(function(workspace: IBlocklyWorkspace) {
                    return {"dom_workspace": workspace} as unknown as Document;
                });
                spyOn($delegate.Xml, 'domToText').and.callFake(function(dom: Document) {
                    return "<xml></xml>";
                });
                spyOn($delegate.Events, 'enable');
                spyOn($delegate.Events, 'disable');
                return $delegate;
            });
        }));




        describe('flowEdit controller', function () {

            // Dependency injection
            beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                        _$log_: angular.ILogService,
                                        _$q_: angular.IQService,
                                        _$rootScope_: angular.IRootScopeService,
                                        _$interval_: angular.IIntervalService,
                                        _blocklyService_: IBlockly,
                                        _workflowService_: IWorkflowService,
                                        _imageService_: ImageService,
                                        _blocklyClipboardService_: IBlocklyClipboardService,
                                        _readFileAsText_: readFileAsTextFunc) {
                $componentController = _$componentController_;
                $log = _$log_;
                $rootScope = _$rootScope_;
                $interval = _$interval_;
                mockBlockly = _blocklyService_;
                mockWorkflowService = _workflowService_;
                imageService = _imageService_;
                blocklyClipboardService = _blocklyClipboardService_;
                $q = _$q_;
                readFileAsText = _readFileAsText_;
            }));

            // AfterEach
            afterEach(function () {
                $log.info.logs.forEach(function (x) {
                    console.info(x);
                });
            });

            describe('defined properties and methods', function () {
                let flowEditViewCtrl: FlowEditViewController;

                beforeEach(() => {
                    const bindings = {};
                    flowEditViewCtrl = $componentController('flowEditView', {}, bindings);
                });

                it('controller and workspace property should be defined', inject(function () {
                    expect(flowEditViewCtrl).toBeDefined();
                    expect(flowEditViewCtrl.workspace).toBeDefined();
                }));
                it('should have a property "workflow"', inject(function () {
                    expect(flowEditViewCtrl.workflow).toBeDefined();
                }));
                it('should have a method "saveWorkspace"', inject(function () {
                    expect(flowEditViewCtrl.saveWorkspace).toBeDefined();
                }));
                it('should have method "imageResizeMaxWidth"', function () {
                    expect(flowEditViewCtrl.imageResizeMaxWidth).toBeDefined();
                });
                it('should have method "imageResizeMaxHeight"', function () {
                    expect(flowEditViewCtrl.imageResizeMaxHeight).toBeDefined();
                });
                it('should have method "imageResizeMaxFileSize"', function () {
                    expect(flowEditViewCtrl.imageResizeMaxFileSize).toBeDefined();
                });
                it('should have method "imageResizeMaxFileSize"', function () {
                    expect(flowEditViewCtrl.invalidImages).toBeDefined();
                });
                // TODO: Test for public properties & methods
            });

            describe('clipboard data expired event', function() {
                it('should enable tooltip for 2000ms, if clipboard type is blockly', function() {
                    const flowEditViewCtrl: FlowEditViewController = $componentController('flowEditView', {}, {});
                    expect(flowEditViewCtrl.showClipboardExpiryTooltip).toBe(false);
                    $rootScope.$broadcast(CLIPBOARD_DATA_EXPIRED_EVENT, 'blockly');
                    expect(flowEditViewCtrl.showClipboardExpiryTooltip).toBe(true);
                    $interval.flush(1999);
                    expect(flowEditViewCtrl.showClipboardExpiryTooltip).toBe(true);
                    $interval.flush(1);
                    expect(flowEditViewCtrl.showClipboardExpiryTooltip).toBe(false);
                });
                it('should not handle the event, if clipboard type is not blockly', function() {
                    const flowEditViewCtrl: FlowEditViewController = $componentController('flowEditView', {}, {});
                    expect(flowEditViewCtrl.showClipboardExpiryTooltip).toBe(false);
                    $rootScope.$broadcast(CLIPBOARD_DATA_EXPIRED_EVENT, 'not_blockly');
                    expect(flowEditViewCtrl.showClipboardExpiryTooltip).toBe(false);
                });
            })

            describe('loadWorkspace method', function () {
                it('loadWorkspace should skip loading if workspace is null', inject(function () {
                    const bindings = {};
                    const flowEditViewCtrl: FlowEditViewController = $componentController('flowEditView', {}, bindings);
                    flowEditViewCtrl.workspace = null;
                    flowEditViewCtrl.workflow = getExampleWorkflow();
                    flowEditViewCtrl.loadWorkspace();
                    expect(mockBlockly.Xml.textToDom).not.toHaveBeenCalled();
                    expect(mockBlockly.Xml.domToWorkspace).not.toHaveBeenCalled();
                }));
                it('loadWorkspace should skip loading if workflowXml is null', inject(function () {
                    const bindings = {};
                    const flowEditViewCtrl: FlowEditViewController = $componentController('flowEditView', {}, bindings);
                    flowEditViewCtrl.workspace = {'workspace_marker': true} as unknown as IBlocklyWorkspaceSvg;
                    flowEditViewCtrl.workflow = getExampleWorkflow();
                    flowEditViewCtrl.workflow.workspaceXml = null as any;
                    flowEditViewCtrl.loadWorkspace();
                    expect(mockBlockly.Xml.textToDom).not.toHaveBeenCalled();
                    expect(mockBlockly.Xml.domToWorkspace).not.toHaveBeenCalled();
                }));
                it('loadWorkspace should call domToWorkspace, if workspace and xml not null', inject(function () {
                    const bindings = {};
                    const flowEditViewCtrl: FlowEditViewController = $componentController('flowEditView', {}, bindings);
                    flowEditViewCtrl.workspace = {'workspace_marker': true} as unknown as IBlocklyWorkspaceSvg;
                    flowEditViewCtrl.workflow = getExampleWorkflow();
                    flowEditViewCtrl.loadWorkspace();
                    expect(mockBlockly.Xml.textToDom)
                        .toHaveBeenCalledWith(flowEditViewCtrl.workflow.workspaceXml);
                    expect(mockBlockly.Xml.domToWorkspace)
                        .toHaveBeenCalledWith({"dom_text": flowEditViewCtrl.workflow.workspaceXml},
                            flowEditViewCtrl.workspace);
                }));
            });

            describe('saveWorkspace method', function () {
                it('saveWorkspace should skip saving, if workspace is null', async function (done) {
                    const bindings = {};
                    const flowEditViewCtrl: FlowEditViewController = $componentController('flowEditView', {}, bindings);
                    await flowEditViewCtrl.saveWorkspace();
                    expect(mockBlockly.Xml.workspaceToDom).not.toHaveBeenCalled();
                    expect(mockBlockly.Xml.domToText).not.toHaveBeenCalled();
                    expect(mockWorkflowService.saveWorkflow).not.toHaveBeenCalled();
                    done();
                });
                it('saveWorkspace should save the workflow by using the workflowService', async function (done) {
                    const bindings = {};
                    const flowEditViewCtrl: FlowEditViewController = $componentController('flowEditView', {}, bindings);
                    flowEditViewCtrl.workspace = {"workspace_marker": true} as unknown as IBlocklyWorkspaceSvg;
                    flowEditViewCtrl.workflow = getExampleWorkflow();
                    flowEditViewCtrl.workflow.workspaceXml = "";
                    await flowEditViewCtrl.saveWorkspace();
                    expect(mockBlockly.Xml.workspaceToDom).toHaveBeenCalledWith(flowEditViewCtrl.workspace);
                    expect(mockBlockly.Xml.domToText).toHaveBeenCalledWith({"dom_workspace": flowEditViewCtrl.workspace});
                    expect(mockWorkflowService.saveWorkflow).toHaveBeenCalledWith(getExampleWorkflow());
                    done();
                });
            });

            describe('resetPreviewImage method', function() {
                let flowEditViewCtrl: FlowEditViewController;
                beforeEach(function () {
                    flowEditViewCtrl = $componentController('flowEditView', {}, {});
                    spyOn(imageService, "releaseImageUrl");
                });

                it('should not call releaseImageUrl, if previewImageUrl is not truthy, but clear them anyway', function() {
                    flowEditViewCtrl.resetPreviewImage();
                    expect(imageService.releaseImageUrl).not.toHaveBeenCalled();
                    expect(flowEditViewCtrl.previewImageName).toBe("");

                    flowEditViewCtrl.previewImageName = "someName";
                    flowEditViewCtrl.previewImageUrl = "";
                    flowEditViewCtrl.resetPreviewImage();
                    expect(flowEditViewCtrl.previewImageName).toBe("");
                    expect(flowEditViewCtrl.previewImageUrl).toBe("");
                    expect(imageService.releaseImageUrl).not.toHaveBeenCalled();
                });

                it('should call releaseImageUrl, if previewImageUrl or previewImageName are truthy, and clear them', function() {
                    const url = "someUrl;"
                    flowEditViewCtrl.previewImageUrl = url;
                    flowEditViewCtrl.previewImageName = "someName";
                    flowEditViewCtrl.resetPreviewImage();
                    expect(imageService.releaseImageUrl).toHaveBeenCalledWith(url);
                    expect(flowEditViewCtrl.previewImageUrl).toBe("");
                    expect(flowEditViewCtrl.previewImageName).toBe("");

                    flowEditViewCtrl.previewImageName = "";
                    flowEditViewCtrl.previewImageUrl = url;
                    flowEditViewCtrl.resetPreviewImage();
                    expect(imageService.releaseImageUrl).toHaveBeenCalled();
                    expect(flowEditViewCtrl.previewImageUrl).toBe("");
                    expect(flowEditViewCtrl.previewImageName).toBe("");
                });
            })

            describe('updateImageUrl method', function() {
                let flowEditViewCtrl: FlowEditViewController;
                beforeEach(function () {
                    flowEditViewCtrl = $componentController('flowEditView', {}, {});
                    spyOn(imageService, "releaseImageUrl");
                    spyOn(imageService, "getImageUrl").and.returnValue($q.resolve("newImageUrl"));
                });

                it('should release the old previewImageUrl and set the new one', function() {
                    flowEditViewCtrl.previewImageUrl = "oldImageUrl";
                    flowEditViewCtrl.previewImageName = "anotherImage";
                    flowEditViewCtrl.updateImageUrl();
                    expect(imageService.releaseImageUrl).toHaveBeenCalledTimes(1);
                    expect(imageService.releaseImageUrl).toHaveBeenCalledWith("oldImageUrl");
                    expect(flowEditViewCtrl.previewImageUrl).toBe("");
                    $rootScope.$apply();
                    expect(imageService.releaseImageUrl).toHaveBeenCalledTimes(2);
                    expect(flowEditViewCtrl.previewImageUrl).toBe("newImageUrl");
                });
            });

            describe('removeImage method', function () {
                let flowEditViewCtrl: FlowEditViewController;
                let blocks: jasmine.SpyObj<Block>[];
                beforeEach(function () {
                    (mockWorkflowService.getWorkflowById as jasmine.Spy).and.returnValue({
                        id: 42,
                        name: "TestWorkflow",
                        workspaceXml: ""
                    });
                    flowEditViewCtrl = $componentController('flowEditView', {}, {});
                    flowEditViewCtrl.workspace = jasmine.createSpyObj('workspace', [
                        'getAllBlocks'
                    ]);
                    spyOn(imageService, 'getCorrespondingNameFromHash');
                    spyOn(imageService, 'removeImage').and.callThrough();
                    blocks = [];
                    for (let i = 0; i < 3; i++) {
                        blocks.push(
                            jasmine.createSpyObj('block' + i, [
                                'getFieldValue',
                                'setFieldValue'
                            ])
                        );
                    }
                    // blocks[0] has no image field
                    blocks[0].getFieldValue.and.returnValue(null);
                    // blocks[1] contains an image
                    blocks[1].getFieldValue.and.callFake(function (fieldName: string) {
                        return fieldName === 'image' ? 'someHash' : null;
                    });
                    // blocks[2] has an image field, but no image set
                    blocks[2].getFieldValue.and.callFake(function (fieldName: string) {
                        return fieldName === 'image' ? ' ' : null;
                    });
                    (flowEditViewCtrl.workspace as jasmine.SpyObj<IBlocklyWorkspaceSvg>).getAllBlocks.and.returnValue(blocks);
                    spyOn(flowEditViewCtrl, 'saveWorkspace');
                    spyOn(flowEditViewCtrl, 'requestImagesUpdate').and.callThrough();
                    spyOn(flowEditViewCtrl, 'resetPreviewImage').and.callThrough();
                });
                it('should not call setFieldValue, if previewImageName does not match the image field value', async function (done) {
                    (imageService.removeImage as jasmine.Spy).and.returnValue(Promise.resolve());
                    await flowEditViewCtrl.removeImage();

                    flowEditViewCtrl.previewImageName = 'someImage';
                    blocks.forEach(function (block) {
                        expect(block.getFieldValue).toHaveBeenCalledWith('image');
                    });
                    expect((imageService.getCorrespondingNameFromHash as jasmine.Spy).calls.allArgs())
                        .toEqual([['someHash'], [' ']]);
                    blocks.forEach(function (block) {
                        expect(block.setFieldValue).not.toHaveBeenCalled();
                    });
                    since("saveWorkspace should not be called, when there are no blockly workspace changes").expect(flowEditViewCtrl.saveWorkspace).not.toHaveBeenCalled();
                    expect(imageService.removeImage).toHaveBeenCalled();
                    $rootScope.$apply();
                    expect(flowEditViewCtrl.requestImagesUpdate).toHaveBeenCalled();
                    expect(flowEditViewCtrl.resetPreviewImage).toHaveBeenCalled();
                    done();
                });
                it('should call setFieldValue, if previewImageName matches the image field value', async function (done) {
                    (imageService.getCorrespondingNameFromHash as jasmine.Spy).and.callFake(function (hash: string) {
                        if (hash === 'someHash') {
                            return "deleteName";
                        }
                        return null;
                    });
                    (imageService.removeImage as jasmine.Spy).and.returnValue(Promise.resolve());
                    flowEditViewCtrl.previewImageName = "deleteName";
                    await flowEditViewCtrl.removeImage();
                    $rootScope.$apply();
                    expect((imageService.getCorrespondingNameFromHash as jasmine.Spy).calls.allArgs())
                        .toEqual([['someHash'], [' ']]);
                    expect(blocks[0].setFieldValue).not.toHaveBeenCalled();
                    expect(blocks[1].setFieldValue).toHaveBeenCalledWith(' ', 'image');
                    expect(blocks[1].setFieldValue).toHaveBeenCalledTimes(5);
                    expect(blocks[2].setFieldValue).not.toHaveBeenCalled();
                    expect(flowEditViewCtrl.saveWorkspace).toHaveBeenCalled();
                    expect(imageService.removeImage).toHaveBeenCalled();
                    expect(flowEditViewCtrl.requestImagesUpdate).toHaveBeenCalled();
                    expect(flowEditViewCtrl.resetPreviewImage).toHaveBeenCalled();
                    done();
                });
            });

            describe('rename functionality', function () {
                let flowEditViewCtrl: FlowEditViewController;
                let blocks: jasmine.SpyObj<Block>[];
                beforeEach(function () {
                    flowEditViewCtrl = $componentController('flowEditView', {}, {});
                    flowEditViewCtrl.workspace = jasmine.createSpyObj('workspace', [
                        'getAllBlocks'
                    ]);
                    spyOn(imageService, 'getCorrespondingNameFromHash');
                    spyOn(imageService, 'removeImage').and.callThrough();
                    blocks = [];
                    for (let i = 0; i < 3; i++) {
                        blocks.push(
                            jasmine.createSpyObj('block' + i, [
                                'getFieldValue',
                                'setFieldValue'
                            ])
                        );
                    }
                    // blocks[0] has no image field
                    blocks[0].getFieldValue.and.returnValue(null);
                    // blocks[1] contains an image
                    blocks[1].getFieldValue.and.callFake(function (fieldName: string) {
                        return fieldName === 'image' ? 'someHash' : null;
                    });
                    // blocks[2] has an image field, but no image set
                    blocks[2].getFieldValue.and.callFake(function (fieldName: string) {
                        return fieldName === 'image' ? ' ' : null;
                    });
                    (flowEditViewCtrl.workspace as jasmine.SpyObj<IBlocklyWorkspaceSvg>).getAllBlocks.and.returnValue(blocks);
                    spyOn(flowEditViewCtrl, 'saveWorkspace');
                    spyOn(flowEditViewCtrl, 'requestImagesUpdate').and.callThrough();
                    spyOn(flowEditViewCtrl, 'resetPreviewImage').and.callThrough();
                });
                it('should rename images', function () {
                    spyOn(flowEditViewCtrl, 'showAlertMessage');
                    spyOn(flowEditViewCtrl, 'updateImageUrl').and.callThrough();
                    spyOn(imageService, 'storeImageAs').and.returnValue($q.resolve());
                    spyOn(imageService, 'refreshWorkflowImages').and.returnValue($q.resolve(['someName']));
                    const uploadedImage = {} as Blob;
                    const imageName = 'someName';
                    flowEditViewCtrl.uploadedImage = uploadedImage;
                    flowEditViewCtrl.storeImageAs(imageName, true);
                    $rootScope.$apply();
                    since("Should not show modal messages, when storing an image with allowOverwrite=true").expect(flowEditViewCtrl.showAlertMessage).not.toHaveBeenCalled();
                    const workflow = getExampleWorkflow();
                    expect(imageService.storeImageAs)
                        .toHaveBeenCalledWith(workflow.id, imageName, uploadedImage, true);
                    since("Should update the preview image after saving the image").expect(flowEditViewCtrl.previewImageName).toBe(imageName);
                    expect(flowEditViewCtrl.requestImagesUpdate).toHaveBeenCalled();
                    since("Should refresh the workflow images after updating the database").expect(imageService.refreshWorkflowImages).toHaveBeenCalledWith(getExampleWorkflow().id);
                    since("Should refresh blockly image fields after renaming an image").expect(blocks[1].setFieldValue.calls.allArgs())
                        .toEqual([[' ', 'image'], ['someHash', 'image']]);
                    expect(flowEditViewCtrl.imageNames).toEqual(['someName']);
                    since("Should update the preview image after saving the image").expect(flowEditViewCtrl.updateImageUrl).toHaveBeenCalled();
                });
            });

            describe('$onDestroy', function() {
                let $scope: angular.IScope;

                beforeEach(function () {
                    $scope = $rootScope.$new();
                });

                it('should remove imageUpdateListener', function() {
                    const listenerIndex = 42;
                    spyOn(imageService, 'addImageUpdateListener').and.returnValue(listenerIndex);
                    spyOn(imageService, 'removeImageUpdateListener');
                    const ctrl: FlowEditViewController = $componentController('flowEditView', {$scope: $scope}, {});
                    expect(imageService.addImageUpdateListener).toHaveBeenCalledTimes(1);
                    expect(imageService.removeImageUpdateListener).not.toHaveBeenCalled();
                    ctrl.$onDestroy();
                    expect(imageService.removeImageUpdateListener).toHaveBeenCalledTimes(1);
                    expect(imageService.removeImageUpdateListener).toHaveBeenCalledWith(listenerIndex);
                });

                it('should release previewImage, if present', function() {
                    spyOn(imageService, 'releaseImageUrl');
                    const ctrl: FlowEditViewController = $componentController('flowEditView', {$scope: $scope}, {});
                    const url = 'someUrl'
                    ctrl.previewImageUrl = url;
                    ctrl.previewImageName = 'someName';
                    ctrl.$onDestroy();
                    expect(imageService.releaseImageUrl).toHaveBeenCalledWith(url);
                });

                it('should revoke uploadedImageUrl', function() {
                    spyOn(URL, "revokeObjectURL");
                    const ctrl: FlowEditViewController = $componentController('flowEditView', {$scope: $scope}, {});
                    const url = 'anotherUrl'
                    ctrl.uploadedImageUrl = url;
                    ctrl.$onDestroy();
                    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
                });
            })

            describe('initialization', function () {
                let $scope: angular.IScope;
                beforeEach(function () {
                    $scope = $rootScope.$new();
                });
                it('should have properties initialized to default values', function () {
                    const ctrl: FlowEditViewController = $componentController('flowEditView', {$scope: $scope}, {});
                    expect(ctrl.uploadedImage).toBe(null);
                    expect(ctrl.uploadedImageUrl).toBe("");
                    expect(ctrl.modalMode).toBe(0);
                    expect(ctrl.newImageName).toBe("");
                    expect(ctrl.previewImageName).toBe("");
                    expect(ctrl.previewImageUrl).toBe("");
                    expect(ctrl.imageNames).toEqual([]);
                    expect(ctrl.modalShowTextBox).toBe(false);
                    expect(ctrl.imageSelectionActive).toBe(true);
                    expect(ctrl.previewOpen).toBe(false);
                    expect(ctrl.alertIsWarning).toBe(false);
                    expect(ctrl.showAlertPreview).toBe(false);
                    expect(ctrl.showAlertSave).toBe(false);
                    expect(ctrl.mainEditClass).toBe('col-main-m1');
                    expect(ctrl.loadBlockly).toBe(false);
                    expect(ctrl.workspace).toBe(null);
                    expect(ctrl.workflow).not.toBe(null);
                    expect(ctrl.listenerIndex).toBeGreaterThanOrEqual(0);
                    expect(ctrl.showSizeWarning).toBe(false);
                    expect(ctrl.invalidImages).toBe(null);
                });
                it('should register as imageUpdateListener', function () {
                    spyOn(imageService, 'addImageUpdateListener').and.callThrough();
                    const ctrl: FlowEditViewController = $componentController('flowEditView', $scope, {});
                    expect(imageService.addImageUpdateListener).toHaveBeenCalledWith(ctrl.updateImagesCallback);
                    expect(imageService.addImageUpdateListener).toHaveBeenCalledTimes(1);
                });
                it('should request refresh workflow images', function () {
                    spyOn(imageService, 'refreshWorkflowImages').and.callThrough();
                    $componentController('flowEditView', $scope, {});
                    expect(imageService.refreshWorkflowImages).toHaveBeenCalledWith(0);
                });
                it('should update imageNames after refreshing workflowImages', function () {
                    const imageNames = ["ImageA", "MyImageB"];
                    spyOn(imageService, 'refreshWorkflowImages').and.returnValue($q.resolve(imageNames));
                    const ctrl: FlowEditViewController = $componentController('flowEditView', $scope, {});
                    $rootScope.$apply();
                    expect(ctrl.imageNames).toEqual(imageNames);
                });
                it('should update blockly image fields after refreshing workflowImages', function () {
                    const imageNames = ["ImageA", "MyImageB"];
                    spyOn(imageService, 'refreshWorkflowImages').and.returnValue($q.resolve(imageNames));
                    const ctrl: FlowEditViewController = $componentController('flowEditView', $scope, {});
                    const stubBlockA = jasmine.createSpyObj('stubBlockA', ['getFieldValue', 'setFieldValue']);
                    const stubBlockB = jasmine.createSpyObj('stubBlockB', ['getFieldValue', 'setFieldValue']);
                    ctrl.workspace = jasmine.createSpyObj('workspace', ['getAllBlocks']);
                    (ctrl.workspace!.getAllBlocks as jasmine.Spy).and.returnValue([stubBlockA, stubBlockB]);
                    stubBlockB.getFieldValue.and.callFake(function (fieldName: string) {
                        if (fieldName === 'image') {
                            return 'SomeImageHash';
                        }
                        return null;
                    });
                    stubBlockA.getFieldValue.and.returnValue(null);
                    $scope.$apply();
                    expect(stubBlockA.getFieldValue).toHaveBeenCalledWith('image');
                    expect(stubBlockB.getFieldValue).toHaveBeenCalledWith('image');
                    expect(stubBlockA.setFieldValue).not.toHaveBeenCalled();
                    expect(stubBlockB.setFieldValue.calls.allArgs()).toEqual([[' ', 'image'], ['SomeImageHash', 'image']]);
                });
                it('should set loadBlockly after initialization', function () {
                    spyOn(imageService, 'refreshWorkflowImages').and.returnValue($q.resolve([]));
                    const ctrl: FlowEditViewController = $componentController('flowEditView', $scope, {});
                    $rootScope.$apply();
                    expect(ctrl.loadBlockly).toBe(true);
                });
                it('should set loadBlockly after initialization in failure case', function () {
                    spyOn(imageService, 'refreshWorkflowImages').and.returnValue($q.reject(new Error("Unexpected error")));
                    const ctrl: FlowEditViewController = $componentController('flowEditView', $scope, {});
                    expect(ctrl.loadBlockly).toBe(false);
                    $rootScope.$apply();
                    expect(ctrl.loadBlockly).toBe(true);
                });
                it('should show error message when refreshing images fails (unexpected error)', function () {
                    spyOn(imageService, 'refreshWorkflowImages').and.returnValue($q.reject(new Error("Unexpected error")));
                    const ctrl: FlowEditViewController = $componentController('flowEditView', $scope, {});
                    $rootScope.$apply();
                    expect(ctrl.showAlertSave).toBe(true);
                    expect(ctrl.alertIsWarning).toBe(true);
                    expect(ctrl.alertMessageSave).toMatch(/unbekannter fehler/i);
                    expect(ctrl.loadBlockly).toBe(true);
                });
                it('should show error message when refreshing images fails (OpenFailedError)', function () {
                    const error = new Error('OpenFailed');
                    error.name = "OpenFailedError";
                    spyOn(imageService, 'refreshWorkflowImages').and.returnValue($q.reject(error));
                    const ctrl: FlowEditViewController = $componentController('flowEditView', $scope, {});
                    $rootScope.$apply();
                    expect(ctrl.showAlertSave).toBe(true);
                    expect(ctrl.alertIsWarning).toBe(true);
                    expect(ctrl.alertMessageSave).toMatch(/fehler/i);
                    expect(ctrl.alertMessageSave).toMatch(/öffnen/i);
                    expect(ctrl.alertMessageSave).toMatch(/datenbank/i);
                    expect(ctrl.alertMessageSave).toMatch(/private. modus/i);
                    expect(ctrl.loadBlockly).toBe(true);
                });
            });

            describe('storeImageAs method', function () {
                let ctrl: FlowEditViewController;
                let $scope: angular.IScope;
                beforeEach(function () {
                    $scope = $rootScope.$new();
                    ctrl = $componentController('flowEditView', {$scope: $scope}, {});
                });
                it('Should show alert message, if no name is given', function () {
                    ctrl.uploadedImage = new Blob();
                    ctrl.storeImageAs('', false);
                    expect(ctrl.showAlertSave).toBe(true);
                    expect(ctrl.alertIsWarning).toBe(true);
                    expect(ctrl.alertMessageSave).toMatch(/bitte geben sie einen namen ein/i);
                });
                it('Should show alert message, if no image was uploaded', function () {
                    ctrl.storeImageAs('SomeName', false);
                    expect(ctrl.showAlertSave).toBe(true);
                    expect(ctrl.alertIsWarning).toBe(true);
                    expect(ctrl.alertMessageSave).toMatch(/bitte wählen sie ein bild aus/i);
                });
                it('Should call imageService.storeImageAs to store the image', function () {
                    spyOn(imageService, 'storeImageAs').and.returnValue($q.resolve());
                    const imageNames = ['A', 'myImageName'];
                    const imageUrl = 'someURL';
                    spyOn(imageService, 'refreshWorkflowImages').and.returnValue($q.resolve(imageNames));
                    spyOn(imageService, 'getImageUrl').and.returnValue($q.resolve(imageUrl));
                    const blob = new Blob();
                    const imageName = 'myImageName';
                    ctrl.uploadedImage = blob;
                    ctrl.storeImageAs(imageName, false);
                    expect(imageService.storeImageAs).toHaveBeenCalledWith(0, imageName, blob, false);
                    expect(ctrl.previewImageName).not.toEqual(imageName);
                    expect(ctrl.showAlertSave).toBe(false);
                    $rootScope.$apply();
                    expect(ctrl.showAlertSave).toBe(false);
                    expect(ctrl.previewImageName).toEqual(imageName);

                    expect(imageService.refreshWorkflowImages).toHaveBeenCalledWith(0);
                    expect(ctrl.imageNames).toBe(imageNames);
                    expect(imageService.getImageUrl).toHaveBeenCalledWith(0, imageName);
                    expect(ctrl.previewImageUrl).toBe(imageUrl);
                });
                it('Should show alert message for ImageExistsAlready', function () {
                    spyOn(imageService, 'storeImageAs').and.returnValue($q.reject(new Error("ImageExistsAlready")));
                    ctrl.uploadedImage = new Blob();
                    ctrl.storeImageAs('SomeName', false);
                    $rootScope.$apply();
                    expect(ctrl.showAlertSave).toBe(true);
                    expect(ctrl.alertIsWarning).toBe(true);
                    expect(ctrl.alertMessageSave).toMatch(/bereits gespeichert/i);
                });
                it('Should show modal for NameAlreadyUsed', function () {
                    spyOn(imageService, 'storeImageAs').and.returnValue($q.reject(new Error("NameAlreadyUsed")));
                    spyOn($scope, '$broadcast').and.callThrough();
                    ctrl.uploadedImage = new Blob();
                    ctrl.storeImageAs('SomeName', false);
                    expect(imageService.storeImageAs).toHaveBeenCalled();
                    $rootScope.$apply();
                    expect(ctrl.showAlertSave).toBe(false);
                    expect(ctrl.promptModalTitle).toBe("Warnung");
                    expect(ctrl.promptModalLabel).toMatch(/'SomeName'/i);
                    expect(ctrl.promptModalLabel).toMatch(/name .* bereits verwendet/i);
                    expect(ctrl.promptModalLabel).toMatch(/überschr[ieb]{3}en/i);
                    expect(ctrl.promptModalAccept).toBe("Überschreiben");
                    expect(ctrl.promptModalCancel).toBe("Abbrechen");
                    expect(ctrl.modalShowTextBox).toBeFalsy();
                    expect(ctrl.newImageName).toBe('SomeName');
                    expect($scope.$broadcast).toHaveBeenCalledWith("promptModal.openModalEvent");
                });
                it('Should show modal for renaming (ReferenceAlreadySaved)', function () {
                    spyOn(imageService, 'storeImageAs').and.returnValue($q.reject(new Error("ReferenceAlreadySaved")));
                    spyOn(imageService, 'getDuplicateImageName').and.returnValue($q.resolve("oldImageName"));
                    spyOn($scope, '$broadcast').and.callThrough();
                    ctrl.uploadedImage = new Blob();
                    ctrl.storeImageAs('SomeName', false);
                    expect(imageService.storeImageAs).toHaveBeenCalled();
                    $rootScope.$apply();
                    expect(imageService.getDuplicateImageName).toHaveBeenCalledWith(0, ctrl.uploadedImage);
                    expect(ctrl.showAlertSave).toBe(false);
                    expect(ctrl.promptModalTitle).toBe("Warnung");
                    expect(ctrl.promptModalLabel).toMatch(/'oldImageName'/i);
                    expect(ctrl.promptModalLabel).toMatch(/in 'SomeName' umbenennen?/i);
                    expect(ctrl.promptModalAccept).toBe("Umbenennen");
                    expect(ctrl.promptModalCancel).toBe("Abbrechen");
                    expect(ctrl.modalShowTextBox).toBeFalsy();
                    expect(ctrl.newImageName).toBe('SomeName');
                });
                it('should handle rejection by imageService.storeImageAs (unexpected error)', function () {
                    const imageName = 'myImage';
                    const error = new Error('unexpected error 123');
                    ctrl.uploadedImage = new Blob();
                    spyOn(imageService, 'storeImageAs').and.returnValue($q.reject(error));
                    ctrl.storeImageAs(imageName, false);
                    $rootScope.$apply();
                    expect(ctrl.showAlertSave).toBe(true);
                    expect(ctrl.alertIsWarning).toBe(true);
                    expect(ctrl.alertMessageSave).toMatch(/unbekannter fehler: Error: unexpected error 123/i);
                });
                it('should handle rejection by imageService.storeImageAs (QuotaExceededError)', function () {
                    const imageName = 'myImage';
                    const error = new Error('could not open database');
                    error.name = "QuotaExceededError";
                    ctrl.uploadedImage = new Blob();
                    spyOn(imageService, 'storeImageAs').and.returnValue($q.reject(error));
                    ctrl.storeImageAs(imageName, false);
                    $rootScope.$apply();
                    expect(ctrl.showAlertSave).toBe(true);
                    expect(ctrl.alertIsWarning).toBe(true);
                    expect(ctrl.alertMessageSave).toMatch(/fehler/i);
                    expect(ctrl.alertMessageSave).toMatch(/konnte nicht gespeichert werden/i);
                    expect(ctrl.alertMessageSave).toMatch(/kontingent überschritten/i);
                });
                it('should handle rejection by imageService.storeImageAs (OpenFailedError)', function () {
                    const imageName = 'myImage';
                    const error = new Error('could not open database');
                    error.name = "OpenFailedError";
                    ctrl.uploadedImage = new Blob();
                    spyOn(imageService, 'storeImageAs').and.returnValue($q.reject(error));
                    ctrl.storeImageAs(imageName, false);
                    $rootScope.$apply();
                    expect(ctrl.showAlertSave).toBe(true);
                    expect(ctrl.alertIsWarning).toBe(true);
                    expect(ctrl.alertMessageSave).toMatch(/fehler/i);
                    expect(ctrl.alertMessageSave).toMatch(/konnte nicht gespeichert werden/i);
                    expect(ctrl.alertMessageSave).toMatch(/datenbank konnte nicht geöffnet werden/i);
                    expect(ctrl.alertMessageSave).toMatch(/private. modus/i);
                });
            });

            describe('uploading a new image (imageFileUpload)', function () {
                let flowEditViewCtrl: FlowEditViewController;
                const imageWarningSizeThreshold = 2 * 1000 * 1000;

                function createFakeFile(size: number) {
                    return {size: size} as Blob;
                }

                describe('uploadNewImage method', function () {
                    const fakeURL = "fake url string";
                    beforeEach(function () {
                        flowEditViewCtrl = $componentController('flowEditView', {}, {});
                        spyOn(URL, 'createObjectURL').and.returnValue(fakeURL);
                        spyOn(URL, 'revokeObjectURL');
                    });

                    it('should do nothing if the file is null', function () {
                        flowEditViewCtrl.uploadNewImage(null as any);

                        expect(flowEditViewCtrl.uploadedImage).toBeNull();
                        expect(flowEditViewCtrl.uploadedImageUrl).toBe('');
                        expect(URL.createObjectURL).not.toHaveBeenCalled();
                        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
                    });
                    it('should do nothing if the file is not an object', function () {
                        flowEditViewCtrl.uploadNewImage(0 as any);

                        expect(flowEditViewCtrl.uploadedImage).toBeNull();
                        expect(flowEditViewCtrl.uploadedImageUrl).toBe('');
                        expect(URL.createObjectURL).not.toHaveBeenCalled();
                        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
                    });
                    it('should call createObjectURL and revokeObjectURL given an object', function () {
                        const file = createFakeFile(0);
                        flowEditViewCtrl.uploadNewImage(file);
                        expect(URL.createObjectURL).toHaveBeenCalledWith(file);
                        expect(URL.revokeObjectURL).toHaveBeenCalledWith('');
                    });
                    it('should call revokeObjectURL with file url that was uploaded in the last time the function was called', function () {
                        const file = createFakeFile(0);
                        const file2 = createFakeFile(0);
                        flowEditViewCtrl.uploadNewImage(file);
                        expect(URL.createObjectURL).toHaveBeenCalledWith(file);
                        expect(URL.revokeObjectURL).toHaveBeenCalledWith('');
                        flowEditViewCtrl.uploadNewImage(file2);
                        expect(URL.createObjectURL).toHaveBeenCalledWith(file2);
                        expect(URL.revokeObjectURL).toHaveBeenCalledWith(fakeURL);

                        expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
                        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
                    });
                });

                describe('isImageResizeEnabled', function () {
                    let $scope: angular.IScope;
                    let settingsService: any;

                    beforeEach(function () {
                        $scope = $rootScope.$new();
                        flowEditViewCtrl = $componentController('flowEditView', {$scope: $scope}, {});

                        inject(function (_settingsService_: any) {
                            settingsService = _settingsService_;
                        });
                    });

                    it('should be false if "settingsService.imageResizeEnabled" is false', function () {
                        settingsService.imageResizeEnabled = false;
                        expect(flowEditViewCtrl.isImageResizeEnabled()).toBe(false);
                    });
                    it('should be true if "settingsService.imageResizeEnabled" is true', function () {
                        settingsService.imageResizeEnabled = true;
                        expect(flowEditViewCtrl.isImageResizeEnabled()).toBe(true);
                    });
                });

                describe('isEmptyOrFaultyImageUploaded method', function () {
                    const emptyFile = new File([""], "fName");

                    let $scope: angular.IScope;
                    beforeEach(function () {
                        $scope = $rootScope.$new();
                        flowEditViewCtrl = $componentController('flowEditView', {$scope: $scope}, {});
                    });

                    it('should return true if "invalidImages" is not empty', function () {
                        flowEditViewCtrl.uploadedImageUrl = "url";
                        expect(flowEditViewCtrl.uploadedImageUrl).not.toBe("");

                        expect(flowEditViewCtrl.invalidImages).toBe(null);
                        flowEditViewCtrl.invalidImages = [emptyFile];
                        expect(flowEditViewCtrl.invalidImages.length).toBe(1);
                        expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(true);
                    });
                    //array is initialized after upload progress (only if images were invalid) - but this case shouldn't occur in live code
                    it('should also return true if "invalidImages" is empty', function () {
                        flowEditViewCtrl.uploadedImageUrl = "url";
                        expect(flowEditViewCtrl.uploadedImageUrl).not.toBe("");

                        expect(flowEditViewCtrl.invalidImages).toBe(null);
                        flowEditViewCtrl.invalidImages = [];
                        expect(flowEditViewCtrl.invalidImages.length).toBe(0);
                        expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(true);
                    });
                    it('should return true if "uploadedImageUrl" is empty', function () {
                        expect(flowEditViewCtrl.uploadedImageUrl).toBe("");
                        expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(true);
                    });
                    it('should return true if "uploadedImageUrl" is empty and "invalidImages" is not empty', function () {
                        flowEditViewCtrl.invalidImages = [emptyFile];
                        expect(flowEditViewCtrl.invalidImages.length).toBe(1);
                        expect(flowEditViewCtrl.uploadedImageUrl).toBe("");

                        expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(true);
                    });
                });

                describe('shouldShowImageSizeWarning', function () {
                    let $scope: angular.IScope;

                    beforeEach(function () {
                        $scope = $rootScope.$new();
                        flowEditViewCtrl = $componentController('flowEditView', {$scope: $scope}, {});
                    });

                    it('not emptyOrFaulty and "showSizeWarning" true', function () {
                        spyOn(flowEditViewCtrl, 'isEmptyOrFaultyImageUploaded').and.returnValue(false);
                        expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(false);
                        flowEditViewCtrl.showSizeWarning = true;

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(true);
                    });
                    it('is emptyOrFaulty and "showSizeWarning" true', function () {
                        spyOn(flowEditViewCtrl, 'isEmptyOrFaultyImageUploaded').and.returnValue(true);
                        expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(true);
                        flowEditViewCtrl.showSizeWarning = true;

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(false);
                    });
                    it('not emptyOrFaulty and "showSizeWarning" false', function () {
                        spyOn(flowEditViewCtrl, 'isEmptyOrFaultyImageUploaded').and.returnValue(false);
                        expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(false);
                        flowEditViewCtrl.showSizeWarning = false;

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(false);
                    });
                    it('is emptyOrFaulty and "showSizeWarning" false', function () {
                        spyOn(flowEditViewCtrl, 'isEmptyOrFaultyImageUploaded').and.returnValue(true);
                        expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(true);
                        flowEditViewCtrl.showSizeWarning = false;

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(false);
                    });
                });

                describe('shouldResizeImage method and showSizeWarnings', function () {
                    const smallFile = createFakeFile(imageWarningSizeThreshold);
                    const largeFile = createFakeFile(imageWarningSizeThreshold + 1);
                    const imageWidthThreshold = 1280;
                    const imageHeightThreshold = 720;

                    const biggerWidth = imageWidthThreshold + 1;
                    const biggerHeight = imageHeightThreshold + 1;

                    let $scope: angular.IScope;
                    beforeEach(function () {
                        $scope = $rootScope.$new();
                        flowEditViewCtrl = $componentController('flowEditView', {$scope: $scope}, {});

                        spyOn(flowEditViewCtrl, 'isEmptyOrFaultyImageUploaded').and.returnValue(false);
                    });

                    it('should return false by default', function () {
                        expect(flowEditViewCtrl.showSizeWarning).toBe(false);
                        expect(flowEditViewCtrl.shouldResizeImage(undefined as any, null as any, null as any)).toBe(false);
                        expect(flowEditViewCtrl.showSizeWarning).toBe(false);
                    });
                    it('should return false if and not show warning if FILE_SIZE matches the upper boundary', function () {
                        flowEditViewCtrl.showSizeWarning = true;
                        expect(flowEditViewCtrl.showSizeWarning).toBe(true);
                        expect(flowEditViewCtrl.shouldResizeImage(smallFile, 0, 0)).toBe(false);
                        expect(flowEditViewCtrl.showSizeWarning).toBe(false);

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(false);
                    });
                    it('should return false if and not show warning if WIDTH matches the upper boundary', function () {
                        flowEditViewCtrl.showSizeWarning = true;
                        expect(flowEditViewCtrl.showSizeWarning).toBe(true);
                        expect(flowEditViewCtrl.shouldResizeImage(new Blob(), imageWidthThreshold, 0)).toBe(false);
                        expect(flowEditViewCtrl.showSizeWarning).toBe(false);

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(false);
                    });
                    it('should return false if and not show warning if HEIGHT matches the upper boundary', function () {
                        flowEditViewCtrl.showSizeWarning = true;
                        expect(flowEditViewCtrl.showSizeWarning).toBe(true);
                        expect(flowEditViewCtrl.shouldResizeImage(new Blob(), 0, imageHeightThreshold)).toBe(false);
                        expect(flowEditViewCtrl.showSizeWarning).toBe(false);

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(false);
                    });
                    it('should return true if and show warning if FILE_SIZE exceeds the upper boundary', function () {
                        expect(flowEditViewCtrl.showSizeWarning).toBe(false);
                        expect(flowEditViewCtrl.shouldResizeImage(largeFile, 0, 0)).toBe(true);
                        expect(flowEditViewCtrl.showSizeWarning).toBe(true);

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(true);
                    });
                    it('should return true if and show warning if WIDTH exceeds the upper boundary', function () {
                        expect(flowEditViewCtrl.showSizeWarning).toBe(false);
                        expect(flowEditViewCtrl.shouldResizeImage(new Blob(), biggerWidth, 0)).toBe(true);
                        expect(flowEditViewCtrl.showSizeWarning).toBe(true);

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(true);
                    });
                    it('should return true if and show warning if HEIGHT exceeds the upper boundary', function () {
                        expect(flowEditViewCtrl.showSizeWarning).toBe(false);
                        expect(flowEditViewCtrl.shouldResizeImage(new Blob(), 0, biggerHeight)).toBe(true);
                        expect(flowEditViewCtrl.showSizeWarning).toBe(true);

                        expect(flowEditViewCtrl.shouldShowImageSizeWarning()).toBe(true);
                    });
                });

                describe("angular bindings", function() {
                    let $scope: angular.IScope;
                    let flowEditViewChild: HTMLElement;
                    let jqElement: JQLite;
                    let $compile: angular.ICompileService;
                    let $window: angular.IWindowService;
                    let flowEditViewCtrl: FlowEditViewController;

                    beforeEach(() => inject(function (_$compile_: angular.ICompileService, _$window_: angular.IWindowService) {
                        $compile = _$compile_;
                        $window = _$window_;
                    }));

                    function clearWebStorage() {
                        inject(function (webStorage: IAngularWebStorageService) {
                            webStorage.clear();
                        });
                    }

                    beforeEach(clearWebStorage);
                    afterEach(clearWebStorage);

                    beforeEach(function () {
                        $scope = $rootScope.$new();
                        jqElement = $compile(`<flow-edit-view></flow-edit-view>`)($scope);
                        flowEditViewChild = jqElement[0];
                        $scope.$apply();
                        flowEditViewCtrl = jqElement.controller('flowEditView');
                        document.body.appendChild(flowEditViewChild);
                    });

                    afterEach(() => document.body.removeChild(flowEditViewChild));

                    function getImageFileUpload(): HTMLLabelElement | null {
                        return flowEditViewChild.querySelector('#imageFileUpload');
                    }

                    function getImageUploadPreview() {
                        return flowEditViewChild.querySelector('#imageUploadPreview');
                    }

                    function getImageUploadError() {
                        return flowEditViewChild.querySelector('#imageUploadError');
                    }

                    function getUndoButton(): HTMLButtonElement | null {
                        return flowEditViewChild.querySelector('button[ng-click="$ctrl.undoBlockly()"]');
                    }

                    function getRedoButton(): HTMLButtonElement | null {
                        return flowEditViewChild.querySelector('button[ng-click="$ctrl.redoBlockly()"]');
                    }

                    it('should find "imageFileUpload" element and expect textContent to match \"Bild auswhählen\"', function () {
                        const imageFileUploadElem = getImageFileUpload();
                        expect(imageFileUploadElem).not.toBeNull();
                        expect(window.getComputedStyle(imageFileUploadElem!).display).not.toBe('none');
                        expect(imageFileUploadElem!.textContent).toMatch("Bild auswählen");
                    });
                    it('should call "resetUploadedImage" if "imageFileUpload" element is clicked', function () {
                        const resetUploadedImageSpy = spyOn(flowEditViewCtrl, 'resetUploadedImage');
                        const imageFileUploadElem: HTMLLabelElement | null = getImageFileUpload();
                        imageFileUploadElem!.click();
                        expect(resetUploadedImageSpy).toHaveBeenCalledTimes(1);
                    });

                    describe('undo and redo button', function() {
                        let workspace: jasmine.SpyObj<IBlocklyWorkspaceSvg>;
                        let undoStackSpy: jasmine.Spy;
                        let redoStackSpy: jasmine.Spy;

                        beforeEach(function() {
                            const workspaceMock = createWorkspaceMock();
                            workspace = workspaceMock.workspace;
                            undoStackSpy = workspaceMock.undoStackSpy;
                            redoStackSpy = workspaceMock.redoStackSpy;
                            flowEditViewCtrl.workspace = workspace;
                        });

                        describe('undo button', function() {
                            beforeEach(function() {
                                spyOn(flowEditViewCtrl, 'undoBlockly').and.callThrough();
                            });
                            it('should disable undo button if undoAvailable is false', function() {
                                undoStackSpy.and.returnValue([]);
                                $scope.$apply();
                                expect(getUndoButton()!.getAttribute('disabled')).toBe('disabled');
                            });
                            it('should enable undo button if undoAvailable is true', function() {
                                undoStackSpy.and.returnValue([{}]);
                                $scope.$apply();
                                expect(getUndoButton()!.getAttribute('disabled')).toBe(null);
                            });
                            it('should call undoBlockly', function() {
                                undoStackSpy.and.returnValue([{}]);
                                $scope.$apply();
                                expect(flowEditViewCtrl.undoBlockly).not.toHaveBeenCalled();
                                getUndoButton()!.click();
                                $scope.$apply();
                                expect(flowEditViewCtrl.undoBlockly).toHaveBeenCalledTimes(1);
                            });
                        });
                        describe('redo button', function() {
                            beforeEach(function() {
                                spyOn(flowEditViewCtrl, 'redoBlockly').and.callThrough();
                            });
                            it('should disable redo button if redoAvailable is false', function() {
                                redoStackSpy.and.returnValue([]);
                                $scope.$apply();
                                expect(getRedoButton()!.getAttribute('disabled')).toBe('disabled');
                            });
                            it('should enable redo button if redoAvailable is true', function() {
                                redoStackSpy.and.returnValue([{}]);
                                $scope.$apply();
                                expect(getRedoButton()!.getAttribute('disabled')).toBe(null);
                            });
                            it('should call redoBlockly', function() {
                                redoStackSpy.and.returnValue([{}]);
                                $scope.$apply();
                                expect(flowEditViewCtrl.redoBlockly).not.toHaveBeenCalled();
                                getRedoButton()!.click();
                                $scope.$apply();
                                expect(flowEditViewCtrl.redoBlockly).toHaveBeenCalledTimes(1);
                            });
                        })

                    });
                    describe("imageUploadPreview", function() {
                        it('should not show "imageUploadPreview" by default', function () {
                            spyOn(flowEditViewCtrl, 'isEmptyOrFaultyImageUploaded').and.returnValue(true);
                            expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(true);
                            $scope.$apply();

                            const preview = getImageUploadPreview();
                            expect(preview).not.toBeNull();
                            expect(window.getComputedStyle(preview!).display).toBe('none');
                        });
                        it('should show "imageUploadPreview" if "isEmptyOrFaultyImageUploaded" is false', function () {
                            spyOn(flowEditViewCtrl, 'isEmptyOrFaultyImageUploaded').and.returnValue(false);
                            expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(false);
                            $scope.$apply();

                            const preview = getImageUploadPreview();
                            expect(preview).not.toBeNull();
                            expect(window.getComputedStyle(preview!).display).not.toBe('none');
                            expect(window.getComputedStyle(preview!).display).toBe('inline');
                        });
                    });

                    describe("imageUploadError", function () {
                        it('should have no "imageUploadError" by default', function () {
                            expect(getImageUploadError()).toBeNull();
                        });
                        it('should show "imageUploadError" element and expect textContent to match if invalidImages is not null', function () {
                            let uploadError = getImageUploadError();
                            expect(uploadError).toBeNull();

                            flowEditViewCtrl.invalidImages = []
                            $scope.$apply();
                            expect(flowEditViewCtrl.isEmptyOrFaultyImageUploaded()).toBe(true);

                            uploadError = getImageUploadError();
                            expect(uploadError).not.toBeNull();

                            expect(window.getComputedStyle(uploadError!).display).not.toBe('none');
                            expect(uploadError!.textContent).toMatch("Achtung: Das hochgeladene Bild ist fehlerhaft!");
                        });
                    });

                    describe("sizeWarnings", function () {

                        function getSizeWarningDiv(): HTMLLabelElement | null {
                            return flowEditViewChild.querySelector('#sizeWarnings');
                        }

                        function getSizeWarningResizeEnabled(): HTMLLabelElement | null {
                            return flowEditViewChild.querySelector('#sizeWarningResizeEnabled');
                        }

                        function getSizeWarningResizeDisabled(): HTMLLabelElement | null {
                            return flowEditViewChild.querySelector('#sizeWarningResizeDisabled');
                        }

                        it('should not be visible if "shouldShowImageSizeWarning" is false', function () {
                            spyOn(flowEditViewCtrl, 'shouldShowImageSizeWarning').and.returnValue(false);
                            $scope.$apply();

                            expect(getSizeWarningDiv()).toBeNull();
                        });
                        it('should be visible if "shouldShowImageSizeWarning" is true', function () {
                            spyOn(flowEditViewCtrl, 'shouldShowImageSizeWarning').and.returnValue(true);
                            $scope.$apply();

                            expect(getSizeWarningDiv()).not.toBeNull();
                        });

                        describe("sizeWarningResizeEnabled", function () {
                            beforeEach(function () {
                                spyOn(flowEditViewCtrl, 'isImageResizeEnabled').and.returnValue(true);
                            });

                            it('should show no error if "shouldShowImageSizeWarning" returns false', function () {
                                spyOn(flowEditViewCtrl, 'shouldShowImageSizeWarning').and.returnValue(false);
                                $scope.$apply();

                                expect(getSizeWarningDiv()).toBeNull();

                                expect(getSizeWarningResizeEnabled()).toBeNull();
                                expect(getSizeWarningResizeDisabled()).toBeNull();
                            });
                            it('should show only "sizeWarningResizeEnabled" if "shouldShowImageSizeWarning" is true and match text', function () {
                                spyOn(flowEditViewCtrl, 'shouldShowImageSizeWarning').and.returnValue(true);
                                $scope.$apply();

                                expect(getSizeWarningDiv()).not.toBeNull();

                                const sizeWarningEnabled = getSizeWarningResizeEnabled();
                                expect(sizeWarningEnabled).not.toBeNull();
                                expect(sizeWarningEnabled!.textContent).toMatch("Achtung: Das Bild ist groß! Es wird automatisch verkleinert und die Qualität nimmt ab.");
                                expect(window.getComputedStyle(sizeWarningEnabled!).display).not.toBe('none');

                                expect(getSizeWarningResizeDisabled()).toBeNull();
                            });
                        });

                        describe("sizeWarningResizeDisabled", function () {
                            beforeEach(function () {
                                spyOn(flowEditViewCtrl, 'isImageResizeEnabled').and.returnValue(false);
                            });

                            it('should show no error if "shouldShowImageSizeWarning" returns false', function () {
                                spyOn(flowEditViewCtrl, 'shouldShowImageSizeWarning').and.returnValue(false);
                                $scope.$apply();

                                expect(getSizeWarningDiv()).toBeNull();

                                expect(getSizeWarningResizeEnabled()).toBeNull();
                                expect(getSizeWarningResizeDisabled()).toBeNull();
                            });
                            it('should show only "sizeWarningResizeDisabled" if "shouldShowImageSizeWarning" is true and match text', function () {
                                spyOn(flowEditViewCtrl, 'shouldShowImageSizeWarning').and.returnValue(true);
                                $scope.$apply();

                                expect(getSizeWarningDiv()).not.toBeNull();

                                const sizeWarningDisabled = getSizeWarningResizeDisabled();
                                expect(sizeWarningDisabled).not.toBeNull();
                                expect(sizeWarningDisabled!.textContent).toMatch("Achtung: Das Bild ist groß! Dies kann die Leistung der Anwendung beeinträchtigen.");
                                expect(window.getComputedStyle(sizeWarningDisabled!).display).not.toBe('none');

                                expect(getSizeWarningResizeEnabled()).toBeNull();
                            });
                        });
                    });
                });
            });

            describe('resetUploadedImage method', function () {
                let flowEditViewCtrl: FlowEditViewController;
                let $scope: angular.IScope;

                beforeEach(function () {
                    $scope = $rootScope.$new();
                    flowEditViewCtrl = $componentController('flowEditView', {$scope: $scope}, {});
                    spyOn(URL, 'revokeObjectURL').and.callThrough();
                });

                it('should revokeObjectURL and reset "uploadedImageUrl" to empty string', function () {
                    const imageUrl: string = "url";
                    flowEditViewCtrl.uploadedImageUrl = imageUrl;

                    flowEditViewCtrl.resetUploadedImage();
                    expect(URL.revokeObjectURL).toHaveBeenCalledWith(imageUrl)
                    expect(flowEditViewCtrl.uploadedImageUrl).toBe("");
                });
                it('should not revokeObjectURL and if "uploadedImageUrl" empty string', function () {
                    const emptyString: string = "";
                    flowEditViewCtrl.uploadedImageUrl = emptyString;

                    flowEditViewCtrl.resetUploadedImage();
                    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
                    expect(flowEditViewCtrl.uploadedImageUrl).toBe(emptyString);
                });
                it('should reset "uploadedImage"', function () {
                    flowEditViewCtrl.uploadedImage = new Blob([""]);

                    expect(flowEditViewCtrl.uploadedImage).not.toBeNull();
                    flowEditViewCtrl.resetUploadedImage();
                    expect(flowEditViewCtrl.uploadedImage).toBeNull();
                });
            });

            describe('openPreviewImageLightbox method', function() {
                let mockLightbox: jasmine.SpyObj< {openModal: Function}>;
                let flowEditViewCtrl: FlowEditViewController;
                beforeEach(function() {
                    mockLightbox = jasmine.createSpyObj('Lightbox', ['openModal']);
                    const bindings = {};
                    flowEditViewCtrl = $componentController('flowEditView', {Lightbox: mockLightbox}, bindings);
                })

                it('should call Lightbox.openModal when openPreviewImageLightbox is called', function() {
                    flowEditViewCtrl.openPreviewImageLightbox();
                    expect(mockLightbox.openModal).toHaveBeenCalled();
                });
                it('should call Lightbox.openModal with current preview image data', function() {
                    function createImgObj(name: string, url: string) {
                        return {
                            url: url,
                            name: name,
                            thumbUrl: url
                        }
                    }

                    const previewImageUrl1 = 'testUrl1';
                    const previewImageUrl2 = 'testUrl2';
                    const previewImageName1 = 'testName1';
                    const previewImageName2 = 'testName2';

                    flowEditViewCtrl.previewImageUrl = previewImageUrl1;
                    flowEditViewCtrl.previewImageName = previewImageName1;
                    flowEditViewCtrl.openPreviewImageLightbox();
                    expect(mockLightbox.openModal).toHaveBeenCalledWith([createImgObj(previewImageName1,previewImageUrl1)], 0);

                    flowEditViewCtrl.previewImageUrl = previewImageUrl2;
                    flowEditViewCtrl.previewImageName = previewImageName2;
                    flowEditViewCtrl.openPreviewImageLightbox();
                    expect(mockLightbox.openModal).toHaveBeenCalledWith([createImgObj(previewImageName2,previewImageUrl2)], 0);
                })
            });

            describe('undo and redo behaviour', function() {
                let flowEditViewCtrl: FlowEditViewController;
                let $scope: angular.IScope;
                let workspace: jasmine.SpyObj<IBlocklyWorkspaceSvg>
                let undoStackSpy: jasmine.Spy;
                let redoStackSpy: jasmine.Spy;

                beforeEach(function () {
                    $scope = $rootScope.$new();
                    flowEditViewCtrl = $componentController('flowEditView', {$scope: $scope}, {});
                    const workspaceMock = createWorkspaceMock();
                    workspace = workspaceMock.workspace;
                    undoStackSpy = workspaceMock.undoStackSpy;
                    redoStackSpy = workspaceMock.redoStackSpy;
                    flowEditViewCtrl.workspace = workspace;
                    expect(flowEditViewCtrl.workspace).not.toBeNull();
                });
                describe('undo behaviour', function() {
                    describe('property undoAvailable', function() {
                        it('undo should be unavailable if workspace is null', function() {
                            flowEditViewCtrl.workspace = null;
                            expect(flowEditViewCtrl.undoAvailable).toBe(false);
                        });

                        it('undo should be unavailable if undoStack_ is falsy', function() {
                            undoStackSpy.and.returnValues(undefined, [], null);
                            expect(flowEditViewCtrl.undoAvailable).toBe(false);
                        });

                        it('undo should be unavailable if undoStack is empty', function() {
                            undoStackSpy.and.returnValue([]);
                            expect(flowEditViewCtrl.undoAvailable).toBe(false);
                        });

                        it('undo should be available if undoStack has at least one element', function() {
                            undoStackSpy.and.returnValues([{}], [{}, {}], [{}, {}, {}]);
                            expect(flowEditViewCtrl.undoAvailable).toBe(true);
                            expect(flowEditViewCtrl.undoAvailable).toBe(true);
                            expect(flowEditViewCtrl.undoAvailable).toBe(true);
                        });
                    })

                    describe('method undoBlockly', function() {
                        it('should not call undo if workspace is null', function() {
                            flowEditViewCtrl.workspace = null;
                            flowEditViewCtrl.undoBlockly();
                            expect(workspace.undo).not.toHaveBeenCalled();
                        });
                        it('should call undo function of workspace', function() {
                            expect(workspace.undo).not.toHaveBeenCalled();
                            flowEditViewCtrl.undoBlockly();
                            expect(workspace.undo).toHaveBeenCalledTimes(1);
                            expect(workspace.undo).toHaveBeenCalledWith(false);
                        });
                    });
                });

                describe('redo behaviour', function() {
                    describe('property redoAvailable', function() {
                        it('redo should be unavailable if workspace is null', function() {
                            flowEditViewCtrl.workspace = null;
                            expect(flowEditViewCtrl.redoAvailable).toBe(false);
                        });

                        it('redo should be unavailable if undoStack_ is falsy', function() {
                            redoStackSpy.and.returnValues(undefined, [], null);
                            expect(flowEditViewCtrl.redoAvailable).toBe(false);
                        });

                        it('redo should be unavailable if undoStack is empty', function() {
                            redoStackSpy.and.returnValue([]);
                            expect(flowEditViewCtrl.redoAvailable).toBe(false);
                        });

                        it('redo should be available if undoStack has at least one element', function() {
                            redoStackSpy.and.returnValues([{}], [{}, {}], [{}, {}, {}]);
                            expect(flowEditViewCtrl.redoAvailable).toBe(true);
                            expect(flowEditViewCtrl.redoAvailable).toBe(true);
                            expect(flowEditViewCtrl.redoAvailable).toBe(true);
                        });
                    });

                    describe('method redoBlockly', function() {
                        it('should not call undo if workspace is null', function() {
                            flowEditViewCtrl.workspace = null;
                            flowEditViewCtrl.redoBlockly();
                            expect(workspace.undo).not.toHaveBeenCalled();
                        });
                        it('should call undo function of workspace with param "true"', function() {
                            expect(workspace.undo).not.toHaveBeenCalled();
                            flowEditViewCtrl.redoBlockly();
                            expect(workspace.undo).toHaveBeenCalledTimes(1);
                            expect(workspace.undo).toHaveBeenCalledWith(true);
                        });
                    });
                })
            });

            describe('copy & paste behaviour', function() {
                let flowEditViewCtrl: FlowEditViewController;
                let $scope: angular.IScope;

                beforeEach(function () {
                    $scope = $rootScope.$new();
                    flowEditViewCtrl = $componentController('flowEditView', {$scope: $scope}, {});
                    spyOn($scope, '$applyAsync').and.callThrough();
                });

                function prepareWorkspace() {
                    const workspace: IBlocklyWorkspaceSvg = new mockBlockly.WorkspaceSvg(new mockBlockly.Options({}));
                    const goal = workspace.newBlock("task_group");
                    const task = workspace.newBlock("task");
                    task.previousConnection.connect(goal.getInput("tasks").connection);
                    return {workspace, goal, task};
                }

                describe('paste preview', function() {
                   it('should update clipboard preview', async function(done) {
                       const fakePreviewImageData1 = 'mockPreviewImageData';
                       const fakePreviewImageData2 = 'mockPreview2ImageData';
                       const fakeObjectUrl1 = 'mockObjectUrl';
                       const fakeObjectUrl2 = 'mockObjectUrl2';
                       const clipboardEntry1: BlocklyClipboardEntry = {
                           index: 0,
                           type: "blockly",
                           data: {
                               blocklyXml: 'mockXml',
                               previewImage: new Blob([fakePreviewImageData1])
                           }
                       };
                       const clipboardEntry2: BlocklyClipboardEntry = {
                           index: 0,
                           type: "blockly",
                           data: {
                               blocklyXml: 'mockXml2',
                               previewImage: new Blob([fakePreviewImageData2])
                           }
                       };
                       spyOn(blocklyClipboardService, 'getContent').and.returnValues(Promise.resolve(clipboardEntry1), Promise.resolve(clipboardEntry2));
                       spyOn(URL, 'revokeObjectURL');
                       spyOn(URL, 'createObjectURL').and.returnValues(fakeObjectUrl1, fakeObjectUrl2);

                       await tryOrFailAsync(async () => {
                           await flowEditViewCtrl.updateBlocklyClipboardPreview();
                           expect(blocklyClipboardService.getContent).toHaveBeenCalledTimes(1);
                           expect(URL.revokeObjectURL).not.toHaveBeenCalled();
                           expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
                           expect(URL.createObjectURL).toHaveBeenCalledWith(jasmine.any(Blob));
                           expect(await readFileAsText((URL.createObjectURL as jasmine.Spy).calls.mostRecent().args[0])).toEqual(fakePreviewImageData1);
                           expect($scope.$applyAsync).toHaveBeenCalledTimes(1);
                           expect(flowEditViewCtrl.blocklyClipboardPreviewImageUrl).toBe(fakeObjectUrl1);

                           await flowEditViewCtrl.updateBlocklyClipboardPreview();
                           expect(blocklyClipboardService.getContent).toHaveBeenCalledTimes(2);
                           expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
                           expect(URL.revokeObjectURL).toHaveBeenCalledWith(fakeObjectUrl1);
                           expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
                           expect($scope.$applyAsync).toHaveBeenCalledTimes(3);
                           expect(await readFileAsText((URL.createObjectURL as jasmine.Spy).calls.mostRecent().args[0])).toEqual(fakePreviewImageData2);

                           flowEditViewCtrl.$onDestroy();
                           expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
                           expect(URL.revokeObjectURL).toHaveBeenCalledWith(fakeObjectUrl2);
                       });

                       done();
                   });
                });

                describe('copyGlobally', function() {
                    let copySpy: jasmine.Spy;
                    beforeEach(function() {
                        copySpy = spyOn(blocklyClipboardService, 'copy').and.returnValue(Promise.resolve());
                    })

                    it('should copy using blocklyClipboardService.copy', async function(done) {
                        expect(flowEditViewCtrl.copyInProgress).toBe(false);
                        await tryOrFailAsync(async () => {
                            const {workspace, task} = prepareWorkspace();
                            flowEditViewCtrl.workspace = workspace;
                            mockBlockly.selected = task;

                            const promise = flowEditViewCtrl.copyGlobally();
                            $rootScope.$apply();
                            expect(flowEditViewCtrl.copyInProgress).toBe(true);
                            await promise;
                            expect(blocklyClipboardService.copy).toHaveBeenCalledTimes(1);
                            expect(blocklyClipboardService.copy).toHaveBeenCalledWith(task);
                            $rootScope.$apply();
                        });
                        expect(flowEditViewCtrl.copyInProgress).toBe(false);
                        done();
                    });

                    it('should not copy goal block', async function(done) {
                        expect(flowEditViewCtrl.copyInProgress).toBe(false);
                        await tryOrFailAsync(async () => {
                            const {workspace, goal} = prepareWorkspace();
                            flowEditViewCtrl.workspace = workspace;
                            mockBlockly.selected = goal;

                            await flowEditViewCtrl.copyGlobally();
                            expect(blocklyClipboardService.copy).not.toHaveBeenCalled();
                            $rootScope.$apply();
                        });
                        expect(flowEditViewCtrl.copyInProgress).toBe(false);
                        done();
                    });

                    it('should not copy, if no block is selected', async function(done) {
                        expect(flowEditViewCtrl.copyInProgress).toBe(false);
                        await tryOrFailAsync(async () => {
                            const {workspace, goal} = prepareWorkspace();
                            flowEditViewCtrl.workspace = workspace;
                            mockBlockly.selected = null;

                            await flowEditViewCtrl.copyGlobally();
                            expect(blocklyClipboardService.copy).not.toHaveBeenCalled();
                            $rootScope.$apply();
                        });
                        expect(flowEditViewCtrl.copyInProgress).toBe(false);
                        done();
                    });

                    it('should reset copyInProgress in case there was an error', async function(done) {
                        copySpy.and.returnValue(Promise.reject(new Error('Mock Error')));
                        expect(flowEditViewCtrl.copyInProgress).toBe(false);
                        const {workspace, task} = prepareWorkspace();
                        flowEditViewCtrl.workspace = workspace;
                        mockBlockly.selected = task;
                        await expectThrowsAsync(async () => {
                            const promise = flowEditViewCtrl.copyGlobally();
                            $rootScope.$apply();
                            expect(flowEditViewCtrl.copyInProgress).toBe(true);
                            await promise;
                        }, 'Mock Error');
                        expect(blocklyClipboardService.copy).toHaveBeenCalledTimes(1);
                        $rootScope.$apply();
                        expect(flowEditViewCtrl.copyInProgress).toBe(false);
                        done();
                    });
                });

                describe('pasteGlobally', function() {
                    let blockDOM: Element | DocumentFragment;
                    let pasteSpy: jasmine.Spy;
                    let storeImagesSpy: jasmine.Spy;
                    let refreshWorkflowImagesSpy: jasmine.Spy;
                    let clipboardGetContentSpy: jasmine.Spy;
                    const workspaceBlocklyMetrics = {
                        absoluteLeft: 0,
                        absoluteTop: 0,
                        contentHeight: 1000,
                        contentLeft: 0,
                        contentTop: 0,
                        contentWidth: 800,
                        viewHeight: 200,
                        viewLeft: 10,
                        viewTop: 12,
                        viewWidth: 403,
                    }

                    const clipboardContent: ClipboardEntry = {
                        type: 'blockly',
                        index: 0,
                        data: {
                            blocklyXml: '<block type="customBlock"></block>'
                        }
                    }
                    const clipboardContentWithImages: ClipboardEntry = {
                        type: 'blockly',
                        index: 0,
                        data: {
                            blocklyXml: '<block type="customBlock"><field name="image">myImageHash</field></block>',
                            images: {
                                references: [
                                    {name: 'My Image', hash: 'myImageHash'},
                                ],
                                data: [
                                    {hash: 'myImageHash', data: new Blob(['imageData1'])},
                                ]
                            }
                        }
                    }

                    function checkBlocklyXml(actualDom: Element, origXml: string) {
                        const origDOM = mockBlockly.Xml.textToDom(origXml);
                        origDOM.setAttribute('x', "211");
                        origDOM.setAttribute('y', "12");
                        expect(mockBlockly.Xml.domToText(actualDom))
                            .toEqual(mockBlockly.Xml.domToText(origDOM));
                    }

                    beforeEach(function() {
                        (mockBlockly.Xml.textToDom as jasmine.Spy).and.callThrough();
                        (mockBlockly.Xml.domToText as jasmine.Spy).and.callThrough();
                        pasteSpy = spyOn(mockBlockly.WorkspaceSvg.prototype, 'paste');
                        storeImagesSpy = spyOn(imageService, 'storeImages');
                        refreshWorkflowImagesSpy = spyOn(imageService, 'refreshWorkflowImages');

                        clipboardGetContentSpy = spyOn(blocklyClipboardService, 'getContent').and.returnValue(Promise.resolve(
                            clipboardContent
                        ));
                        blockDOM = mockBlockly.Xml.blockToDom(prepareWorkspace().task);
                        flowEditViewCtrl.workspace = new mockBlockly.WorkspaceSvg(new mockBlockly.Options({}));
                        spyOn(flowEditViewCtrl.workspace, 'getMetrics').and.returnValue(workspaceBlocklyMetrics);
                        flowEditViewCtrl.workflow = getExampleWorkflow();
                    });

                    it('should not paste if workspace is null', async function(done) {
                        await tryOrFailAsync(async () => {
                            flowEditViewCtrl.workspace = null;
                            await flowEditViewCtrl.pasteGlobally();
                            expect(blocklyClipboardService.getContent).not.toHaveBeenCalled();
                            expect(storeImagesSpy).not.toHaveBeenCalled();
                            expect(pasteSpy).not.toHaveBeenCalled();
                        });
                        done();
                    });
                    it('should not paste if workflow is null', async function(done) {
                        await tryOrFailAsync(async () => {
                            flowEditViewCtrl.workflow = null;
                            await flowEditViewCtrl.pasteGlobally();
                            expect(blocklyClipboardService.getContent).not.toHaveBeenCalled();
                            expect(storeImagesSpy).not.toHaveBeenCalled();
                            expect(pasteSpy).not.toHaveBeenCalled();
                        });
                        done();
                    });
                    it('should not paste if clipboard content is null', async function(done) {
                        await tryOrFailAsync(async () => {
                            clipboardGetContentSpy.and.returnValue(Promise.resolve(null));
                            await flowEditViewCtrl.pasteGlobally();
                            expect(blocklyClipboardService.getContent).toHaveBeenCalledTimes(1);
                            expect(storeImagesSpy).not.toHaveBeenCalled();
                            expect(pasteSpy).not.toHaveBeenCalled();
                        });
                        done();
                    });
                    it('should paste blocks without images', async function(done) {
                        await tryOrFailAsync(async () => {
                            await flowEditViewCtrl.pasteGlobally();
                            expect(blocklyClipboardService.getContent).toHaveBeenCalledTimes(1);
                            expect(storeImagesSpy).not.toHaveBeenCalled();
                            expect(pasteSpy).toHaveBeenCalledTimes(1);
                            expect(pasteSpy).toHaveBeenCalledWith(jasmine.any(Element));
                            checkBlocklyXml(pasteSpy.calls.argsFor(0)[0], clipboardContent.data.blocklyXml);
                        });
                        done();
                    });
                    it('should paste blocks with images', async function(done) {
                        clipboardGetContentSpy.and.returnValue(Promise.resolve(clipboardContentWithImages));
                        refreshWorkflowImagesSpy.and.returnValue(Promise.resolve(['My Image']));
                        await tryOrFailAsync(async () => {
                            await flowEditViewCtrl.pasteGlobally();
                            expect(blocklyClipboardService.getContent).toHaveBeenCalledTimes(1);
                            expect(storeImagesSpy).toHaveBeenCalledTimes(1);
                            const imageReferences = clipboardContentWithImages.data.images?.references;
                            const imageData = clipboardContentWithImages.data.images?.data;
                            expect(storeImagesSpy).toHaveBeenCalledWith(getExampleWorkflow().id, imageReferences, imageData);
                            expect(refreshWorkflowImagesSpy).toHaveBeenCalledTimes(1);
                            expect(pasteSpy).toHaveBeenCalledTimes(1);
                            expect(pasteSpy).toHaveBeenCalledWith(jasmine.any(Element));
                            checkBlocklyXml(pasteSpy.calls.argsFor(0)[0], clipboardContentWithImages.data.blocklyXml);
                        });
                        done();
                    });
                });
            });

            describe('onBlocklyChange method', function() {
                let flowEditViewCtrl: FlowEditViewController;
                let $scope: angular.IScope;

                beforeEach(function () {
                    $scope = $rootScope.$new();
                    flowEditViewCtrl = $componentController('flowEditView', {$scope: $scope}, {});
                    spyOn($scope, '$applyAsync').and.callThrough();
                });

                it('should not call $scope.$applyAsync for events UI or CREATE', function() {
                    flowEditViewCtrl.onBlocklyChange({type: mockBlockly.Events.UI});
                    flowEditViewCtrl.onBlocklyChange({type: mockBlockly.Events.CREATE});
                    expect($scope.$applyAsync).not.toHaveBeenCalled();
                });

                it('should call $scope.$applyAsync for other events', function() {
                    flowEditViewCtrl.onBlocklyChange({type: 'customEvent'});
                    expect($scope.$applyAsync).toHaveBeenCalledTimes(1);
                    flowEditViewCtrl.onBlocklyChange({type: mockBlockly.Events.CHANGE});
                    expect($scope.$applyAsync).toHaveBeenCalledTimes(2);
                    flowEditViewCtrl.onBlocklyChange({type: mockBlockly.Events.DELETE});
                    expect($scope.$applyAsync).toHaveBeenCalledTimes(3);
                    flowEditViewCtrl.onBlocklyChange({type: mockBlockly.Events.MOVE});
                    expect($scope.$applyAsync).toHaveBeenCalledTimes(4);
                });
            })
        });
    });
}

