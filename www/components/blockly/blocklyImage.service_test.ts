module rehagoal.blockly {
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import hashFileFunc = rehagoal.utilities.hashFileFunc;
    import readFileAsTextFunc = rehagoal.utilities.readFileAsTextFunc;
    import DownloadService = rehagoal.exchange.DownloadService;
    import readDataURLFromBlobType = rehagoal.utilities.readDataURLFromBlobType;
    import BlocklyTestHelpers = rehagoal.testUtilities.BlocklyTestHelpers;
    describe('rehagoal.blockly', function () {
        let blocklyImageService: IBlocklyImageService;
        let blockly: IBlockly;
        let $compile: ng.ICompileService;
        let $rootScope: ng.IRootScopeService;
        let hashFile: hashFileFunc;
        let readDataURLFromBlob: readDataURLFromBlobType;

        beforeEach(() => angular.mock.module('rehagoal.blocklyConfig'));
        beforeEach(() => angular.mock.module('rehagoal.templates'));

        beforeEach(() => angular.mock.inject(function(_blocklyImageService_: IBlocklyImageService,
                                                            _blocklyService_: IBlockly,
                                                            _$compile_: ng.ICompileService,
                                                            _$rootScope_: ng.IRootScopeService,
                                                            _hashFile_: hashFileFunc,
                                                            _readDataURLFromBlob_: readDataURLFromBlobType) {
            blocklyImageService = _blocklyImageService_;
            blockly = _blocklyService_;
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            hashFile = _hashFile_;
            readDataURLFromBlob = _readDataURLFromBlob_;
        }));

        interface ITestScope extends ng.IScope {
            workspace?: IBlocklyWorkspaceSvg
        }
        // TODO: Maybe refactor duplicate instances of prepareWorkflow function / write generic workflow generator?
        function prepareWorkflow() {
            /**
             * Goal
             *   Task1 Image:hash1
             *   If Image:hash3
             *      Then:
             *      Else:
             *          Task2 Image:Hash2
             *          Task3
             */
            const workspace = new blockly.Workspace();
            const goal = workspace.newBlock("task_group");
            const task1 = workspace.newBlock("task");
            const if_then_else = workspace.newBlock("if_then_else");
            const task2 = workspace.newBlock("task");
            const task3 = workspace.newBlock("task");
            BlocklyTestHelpers.attachBlockAsChild(goal, task1, "tasks");
            BlocklyTestHelpers.attachBlockBelow(task1, if_then_else);
            BlocklyTestHelpers.attachBlockAsChild(if_then_else, task2, "else");
            BlocklyTestHelpers.attachBlockBelow(task2, task3);
            task1.setFieldValue('hash1', 'image');
            task2.setFieldValue('hash2', 'image');
            if_then_else.setFieldValue('hash3', 'image');

            return {
                workspace, goal, task1, if_then_else, task2, task3
            };
        }

        // TODO: Cleanup function
        async function svgBlobToPNGBlob(svgBlob: Blob): Promise<Blob> {
            const objectURL = URL.createObjectURL(svgBlob);
            try {
                const img = new Image();
                return await new Promise<Blob>((resolve, reject) => {
                    img.src = objectURL;
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const context = canvas.getContext('2d')!;
                        context.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob((pngBlob) => {
                            if (!pngBlob) {
                                reject(new Error('Could not convert canvas to Blob!'));
                            } else {
                                resolve(pngBlob);
                            }
                        }, 'image/png');
                    };
                    img.onerror = function() {
                        reject(new Error('Could not load image from objectURL!'));
                    }
                });
            } finally {
                URL.revokeObjectURL(objectURL);
            }
        }

        describe('BlocklyImageService', function () {
            let $scope: ITestScope;
            let jqElement: JQLite;


            beforeEach(function() {
                $scope = $rootScope.$new();
                jqElement = $compile('<blockly disable-orphans="true" workspace="workspace"></blockly>')($scope);
                document.body.appendChild(jqElement[0]);
                $rootScope.$apply();

                const {workspace} = prepareWorkflow();

                // Convert to DOM and back to workspace, to perform full blockly initialization
                const workspaceDOM = blockly.Xml.workspaceToDom(workspace);
                blockly.Xml.domToWorkspace(workspaceDOM, $scope.workspace!);
                // Simulate disabled blocks (should be temporarily enabled during SVG generation)
                $scope.workspace?.getTopBlocks(true)[0].setDisabled(true);
            });

            afterEach(function() {
                document.body.removeChild(jqElement[0]);
            });

            async function expectKnownBlobHash(allowedHashes: string[], blob: Blob, blobName='blob'): Promise<void> {
                const actualHash = await hashFile(blob);
                const dataUri = await readDataURLFromBlob(blob);
                since(function() {
                    return `#{message}\n${blobName}DataUri = ${dataUri}`;
                }).
                expect(allowedHashes).toContain(actualHash);
            }

            it('should generate exactly the expected image (SVG data)', async function(done) {
                await tryOrFailAsync(async () => {
                    const goalRendered = $scope.workspace!.getTopBlocks(true)[0] as BlockSvg;
                    const svgBlob = await blocklyImageService.getBlockAsSvgBlob(goalRendered);
                    // See testfiles/exampleBlocklyImage-*.svg
                    // TODO: Add your hash here, if it only differs barely from the existing images
                    // window.open(URL.createObjectURL(svgBlob), "_blank");
                    const allowedHashes: string[] = [
                        // ubuntu20-04: Ubuntu 20.04.2
                        'd04fc0289228f138373ca358bc5d282da534ddee90c4549ce7456655fadff284',
                        // ubuntu20-04-chrome104: Ubuntu 20.04.4 Chrome 104
                        'b35d288e9f677bc8bf2e986acc09077990f452b8f425325048bb9a3cae19d7e9',
                        // ci: Docker image build container
                        '99dde75708f8f87c09521fc7b266d192d276d681aa35480b5504d57366370b13',
                        // ci2
                        '50caca5f998f08c083b8090de5463f4c845a7b0ac60820f569aa25ee0c5c4dde',
                    ];
                    await expectKnownBlobHash(allowedHashes, svgBlob, 'svgBlob');
                });
                done();
            });

            it('should generate exactly the expected rasterized image (PNG data)', async function(done) {
                await tryOrFailAsync(async () => {
                    const goalRendered = $scope.workspace!.getTopBlocks(true)[0] as BlockSvg;
                    const svgBlob = await blocklyImageService.getBlockAsSvgBlob(goalRendered);
                    const pngBlob = await svgBlobToPNGBlob(svgBlob);
                    // Hash may change if canvas rendering changes
                    // TODO: Add your hash here, if it only differs barely from the existing images
                    // See testfiles/exampleBlocklyImage-*.png
                    // window.open(URL.createObjectURL(pngBlob), "_blank");
                    const allowedHashes: string[] = [
                        // ubuntu20-04: Ubuntu 20.04.2
                        '94c2460184ee3f8aa7a320d4b8e7b3d479b63c0b3dc6f7d325780e0f3552f2fe',
                        // ubuntu20-04-chrome104: Ubuntu 20.04.4 Chrome 104
                        '993c3637128b15876faeab42a1e433806a4cf541d7f92062b962071e7ea7b82b',
                        // ci: Docker image build container
                        '429ec9f88c4881850fe1db245921bd00c3cdcf2e6f2a73b28e178c7d07b26d81',
                        // ci2
                        '1f5757004ea1b4e85e1dff189b5da3b2a16dd0360b2ad8db083c07b3b0cd327b',
                    ];
                    await expectKnownBlobHash(allowedHashes, pngBlob, 'pngBlob');
                });
                done();
            });
        });
    });
}
