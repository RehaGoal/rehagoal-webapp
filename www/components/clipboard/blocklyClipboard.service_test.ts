module rehagoal.clipboard {
    import ClipboardDB = rehagoal.database.ClipboardDB;
    import ImageService = rehagoal.images.ImageService;
    import IBlockly = rehagoal.blockly.IBlockly;
    import Block = rehagoal.blockly.Block;
    import DexieFactory = rehagoal.database.DexieFactory;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import readFileAsTextFunc = rehagoal.utilities.readFileAsTextFunc;
    import IFileWithHash = rehagoal.database.IFileWithHash;
    import ClipboardEntry = rehagoal.database.ClipboardEntry;
    import BlocklyTestHelpers = rehagoal.testUtilities.BlocklyTestHelpers;
    import IBlocklyImageService = rehagoal.blockly.IBlocklyImageService;
    describe('rehagoal.clipboard', function() {
        describe('BlocklyClipboardService', function() {
            let blocklyClipboardService: IBlocklyClipboardService;
            let blockly: IBlockly;
            let clipboardGetEntrySpy: jasmine.Spy;
            let clipboardSetEntrySpy: jasmine.Spy;
            let dexieFactory: DexieFactory;
            let imageServiceGetImageDataForHashesSpy: jasmine.Spy;
            let imageServiceGetCorrespondingNamesFromHashesSpy: jasmine.Spy;
            let blocklyImageServiceGetBlockAsSvgBlobSpy: jasmine.Spy;
            let readFileAsText: readFileAsTextFunc;
            beforeEach(() => angular.mock.module('rehagoal.blockly'));
            beforeEach(() => angular.mock.module('rehagoal.blocklyConfig'));

            beforeEach(function () {
                angular.mock.module('rehagoal.clipboard', function ($provide: angular.auto.IProvideService) {
                    $provide.decorator('clipboardDatabaseService', function ($delegate: ClipboardDB) {
                        clipboardGetEntrySpy = spyOn($delegate, 'getEntry').and.callThrough();
                        clipboardSetEntrySpy = spyOn($delegate, 'setEntry').and.callThrough();
                        return $delegate;
                    });
                    $provide.decorator('imageService', function($delegate: ImageService) {
                        imageServiceGetImageDataForHashesSpy = spyOn($delegate, 'getImageDataForHashes');
                        imageServiceGetCorrespondingNamesFromHashesSpy = spyOn($delegate, 'getCorrespondingNamesFromHashes');
                        return $delegate;
                    });
                    $provide.decorator('blocklyImageService', function ($delegate: IBlocklyImageService) {
                        blocklyImageServiceGetBlockAsSvgBlobSpy = spyOn($delegate, 'getBlockAsSvgBlob');
                        return $delegate;
                    });
                });
            });

            beforeEach(() => angular.mock.inject(function(_blocklyClipboardService_: IBlocklyClipboardService, _blocklyService_: IBlockly, _dexieFactory_: DexieFactory, _readFileAsText_: readFileAsTextFunc) {
                blocklyClipboardService = _blocklyClipboardService_;
                blockly =  _blocklyService_;
                dexieFactory = _dexieFactory_;
                readFileAsText = _readFileAsText_;
            }))

            function getBlockXml(block: Block) {
                return blockly.Xml.domToText(blockly.Xml.blockToDom(block));
            }

            describe('copy', function() {
                async function deleteClipboardDB(): Promise<void> {
                    return dexieFactory('clipboardDB').delete();
                }
                beforeEach(async function(done) {
                    await deleteClipboardDB();
                    done();
                })
                afterAll(async function(done) {
                    await deleteClipboardDB();
                    done();
                });

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
                    const blocklyMetrics = {
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
                    };
                    const workspace = new blockly.WorkspaceSvg(new blockly.Options({}));
                    spyOn(workspace, 'getMetrics').and.returnValue(blocklyMetrics);
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
                        workspace, blocklyMetrics, goal, task1, if_then_else, task2, task3
                    };
                }

                it('should copy blocks with referenced images to clipboardDB (full workflow)', async function(done) {
                    imageServiceGetCorrespondingNamesFromHashesSpy.and.returnValue(new Map<string, string>([
                        ['hash1', 'My Image 1'],
                        ['hash2', 'My Image 2'],
                        ['hash3', 'Another image'],
                    ]));
                    imageServiceGetImageDataForHashesSpy.and.returnValue(Promise.resolve([
                        {hash: 'hash1', data: new Blob(['data1'])},
                        {hash: 'hash2', data: new Blob(['data2'])},
                        {hash: 'hash3', data: new Blob(['data3'])},
                    ]));
                    const mockPreviewImageData = 'mockedPreviewImage blob data';
                    blocklyImageServiceGetBlockAsSvgBlobSpy.and.returnValue(Promise.resolve(new Blob([mockPreviewImageData])));
                    await tryOrFailAsync(async () => {
                        let {task1} = prepareWorkflow();

                        const xml = getBlockXml(task1);

                        await blocklyClipboardService.copy(task1);
                        expect(imageServiceGetCorrespondingNamesFromHashesSpy).toHaveBeenCalledTimes(1);
                        expect(imageServiceGetImageDataForHashesSpy).toHaveBeenCalledTimes(1);
                        expect(imageServiceGetCorrespondingNamesFromHashesSpy).toHaveBeenCalledWith(jasmine.arrayWithExactContents(['hash1', 'hash2', 'hash3']));
                        expect(imageServiceGetImageDataForHashesSpy).toHaveBeenCalledWith(jasmine.arrayWithExactContents(['hash1', 'hash2', 'hash3']));
                        expect(blocklyImageServiceGetBlockAsSvgBlobSpy).toHaveBeenCalledTimes(1);
                        expect(blocklyImageServiceGetBlockAsSvgBlobSpy).toHaveBeenCalledWith(jasmine.any(blockly.Block));
                        expect(clipboardSetEntrySpy.calls.mostRecent().args).toEqual([{
                            type: 'blockly',
                            data: {
                                blocklyXml: xml,
                                images: {
                                    references: jasmine.arrayWithExactContents([
                                        {name: 'My Image 1', hash: 'hash1'},
                                        {name: 'My Image 2', hash: 'hash2'},
                                        {name: 'Another image', hash: 'hash3'},
                                    ]),
                                    data: jasmine.arrayWithExactContents([
                                        {hash: 'hash1', data: jasmine.any(Blob)},
                                        {hash: 'hash2', data: jasmine.any(Blob)},
                                        {hash: 'hash3', data: jasmine.any(Blob)},
                                    ])
                                },
                                previewImage: jasmine.any(Blob)
                            }
                        }]);
                        expect(await readFileAsText(clipboardSetEntrySpy.calls.mostRecent().args[0].data.previewImage)).toEqual(mockPreviewImageData);
                        const imageData = clipboardSetEntrySpy.calls.mostRecent().args[0].data.images.data;
                        const blobHash1 = imageData.find((entry: IFileWithHash) => entry.hash === "hash1").data;
                        const blobHash2 = imageData.find((entry: IFileWithHash) => entry.hash === "hash2").data;
                        const blobHash3 = imageData.find((entry: IFileWithHash) => entry.hash === "hash3").data;
                        expect(await readFileAsText(blobHash1)).toBe('data1');
                        expect(await readFileAsText(blobHash2)).toBe('data2');
                        expect(await readFileAsText(blobHash3)).toBe('data3');
                    });
                    done();
                });

                it('should copy blocks with referenced images to clipboardDB (partial workflow)', async function(done) {
                    imageServiceGetCorrespondingNamesFromHashesSpy.and.returnValue(new Map<string, string>([
                        ['hash2', 'My Image 2'],
                    ]));
                    imageServiceGetImageDataForHashesSpy.and.returnValue(Promise.resolve([
                        {hash: 'hash2', data: new Blob(['data2'])},
                    ]));
                    const mockPreviewImageData = 'mockedPreviewImage another blob data';
                    blocklyImageServiceGetBlockAsSvgBlobSpy.and.returnValue(Promise.resolve(new Blob([mockPreviewImageData])));
                    await tryOrFailAsync(async () => {
                        let {task2} = prepareWorkflow();

                        const xml = getBlockXml(task2);

                        await blocklyClipboardService.copy(task2);
                        expect(imageServiceGetCorrespondingNamesFromHashesSpy).toHaveBeenCalledTimes(1);
                        expect(imageServiceGetImageDataForHashesSpy).toHaveBeenCalledTimes(1);
                        expect(imageServiceGetCorrespondingNamesFromHashesSpy).toHaveBeenCalledWith(jasmine.arrayWithExactContents(['hash2']));
                        expect(imageServiceGetImageDataForHashesSpy).toHaveBeenCalledWith(jasmine.arrayWithExactContents(['hash2']));
                        expect(blocklyImageServiceGetBlockAsSvgBlobSpy).toHaveBeenCalledTimes(1);
                        expect(blocklyImageServiceGetBlockAsSvgBlobSpy).toHaveBeenCalledWith(jasmine.any(blockly.Block));
                        expect(clipboardSetEntrySpy.calls.mostRecent().args).toEqual([{
                            type: 'blockly',
                            data: {
                                blocklyXml: xml,
                                images: {
                                    references: jasmine.arrayWithExactContents([
                                        {name: 'My Image 2', hash: 'hash2'},
                                    ]),
                                    data: jasmine.arrayWithExactContents([
                                        {hash: 'hash2', data: jasmine.any(Blob)},
                                    ])
                                },
                                previewImage: jasmine.any(Blob)
                            }
                        }]);
                        expect(await readFileAsText(clipboardSetEntrySpy.calls.mostRecent().args[0].data.previewImage)).toEqual(mockPreviewImageData);
                        const imageData = clipboardSetEntrySpy.calls.mostRecent().args[0].data.images.data;
                        const blobHash2 = imageData.find((entry: IFileWithHash) => entry.hash === "hash2").data;
                        expect(await readFileAsText(blobHash2)).toBe('data2');
                    });
                    done();
                });
            });
            describe('getContent', function() {
                it('should call clipboardDB.getEntry', async function(done) {
                    const entry: ClipboardEntry = {
                        type: 'blockly',
                        index: 0,
                        data: {
                            blocklyXml: 'xml',
                        }
                    };
                    clipboardGetEntrySpy.and.returnValue(Promise.resolve(entry));

                    expect(await blocklyClipboardService.getContent()).toEqual(entry);
                    expect(clipboardGetEntrySpy).toHaveBeenCalledTimes(1);
                    expect(clipboardGetEntrySpy).toHaveBeenCalledWith('blockly');
                    done();
                })
            });
        });
    });
}
