module rehagoal.blocklyConfig {
    import ImageService = rehagoal.images.ImageService;
    import IBlockly = rehagoal.blockly.IBlockly;
    import IBlocklyWorkspace = rehagoal.blockly.IBlocklyWorkspace;
    describe('rehagoal.blocklyConfig', function() {
        let blocklyConfigService: BlocklyConfigService;
        let imageService: ImageService;
        let Blockly: IBlockly;

        function getDefaultImageOptions(): [string, string][] {
            return [
                ["<Bild>", " "],
            ];
        }

        beforeEach(() => angular.mock.module('rehagoal.blocklyConfig', function($provide: angular.auto.IProvideService) {
            $provide.decorator('imageService', function($delegate: ImageService) {
                spyOn($delegate, 'addImageUpdateListener').and.callThrough();
                return $delegate;
            });
        }));

        beforeEach(() => angular.mock.inject(function (_blocklyConfigService_: BlocklyConfigService, _imageService_: ImageService, _blocklyService_: IBlockly) {
            blocklyConfigService = _blocklyConfigService_;
            imageService = _imageService_;
            Blockly = _blocklyService_;
        }));

        describe('initialization', function() {
            it('should add an imageUpdateListener to imageService', function() {
                expect(imageService.addImageUpdateListener).toHaveBeenCalledWith(blocklyConfigService.refreshImageList);
            });
            it('should reset imageOptions to default options', function() {
                expect(blocklyConfigService.getImageOptions()).toEqual(getDefaultImageOptions());
            })
        });

        describe('resetWorkflow', function() {
            it('should clear imageOptions with empty option', function() {
                imageService.workflowImageData = [
                    {name: "Test image", hash: "some hash"},
                    {name: "Another test", hash: "hash no 2"},
                ];
                blocklyConfigService.refreshImageList();
                expect(blocklyConfigService.getImageOptions()).toEqual(
                    jasmine.arrayWithExactContents<[string, string]>(
                    [
                        ["<Bild>", " "],
                        ["Bild: Test image", "some hash"],
                        ["Bild: Another test", "hash no 2"]
                    ])
                );
                blocklyConfigService.resetWorkflow();
                expect(blocklyConfigService.getImageOptions()).toEqual(getDefaultImageOptions());
            });
        });
        
        describe('refreshImageList', function () {
            it('should update imageOptions based on imageService.workflowImageData', function() {
                imageService.workflowImageData = [
                    {name: "My image", hash: "some hash1"},
                    {name: "Some other test", hash: "hash #2"},
                ];
                blocklyConfigService.refreshImageList();
                expect(blocklyConfigService.getImageOptions()).toEqual(
                    jasmine.arrayWithExactContents<[string, string]>(
                        [
                            ["<Bild>", " "],
                            ["Bild: My image", "some hash1"],
                            ["Bild: Some other test", "hash #2"]
                        ])
                );
            });
        });

        const twoTopBlocksXml = `<xml xmlns=\"http://www.w3.org/1999/xhtml\">
<block type="task_group" id="blockId0"></block>
<block type="task_group" id="blockId1"></block>
</xml>`;

        const twoTopBlocksOneUnusedXml = `<xml xmlns="http://www.w3.org/1999/xhtml">
<block type="task_group" id="blockId0" deletable="false"></block>
<block type="if_then_else" id="blockId1" disabled="true"></block>
</xml>`;

        // FIXME: This xml would be better read from a file, however Karma does not support reading files as easily as it may be done in Protractor
        const dfsTestXml = '<xml xmlns="http://www.w3.org/1999/xhtml"> <block type="task_group" id="root" deletable="false" x="0" y="0"> <field name="description">&lt;Beschreibung&gt;</field> <statement name="tasks"> <block type="task" id="t1"> <field name="description">T1</field> <field name="image"> </field> <next> <block type="task" id="t2"> <field name="description">T2</field> <field name="image"> </field> <next> <block type="task" id="t3"> <field name="description">T3</field> <field name="image"> </field> <next> <block type="if_then_else" id="q1"> <field name="condition">Q1</field> <field name="image"> </field> <value name="timer"> <block type="timer_remember" id="r1"> <field name="eachValue">1</field> <field name="eachUnit">s</field> </block> </value> <statement name="then"> <block type="if_then_else" id="q2"> <field name="condition">Q2</field> <field name="image"> </field> <statement name="then"> <block type="task" id="t4"> <field name="description">T4</field> <field name="image"> </field> </block> </statement> <statement name="else"> <block type="repeat_times" id="l2"> <field name="times">2</field> <value name="timer"> <block type="timer_remember" id="r2"> <field name="eachValue">2</field> <field name="eachUnit">s</field> </block> </value> <statement name="body"> <block type="task" id="t5"> <field name="description">T5</field> <field name="image"> </field> <next> <block type="task" id="t6"> <field name="description">T6</field> <field name="image"> </field> </block> </next> </block> </statement> <next> <block type="task" id="t7"> <field name="description">T7</field> <field name="image"> </field> </block> </next> </block> </statement> </block> </statement> <statement name="else"> <block type="task" id="t8"> <field name="description">T8</field> <field name="image"> </field> </block> </statement> <next> <block type="repeat_condition" id="w1"> <field name="condition">W1</field> <field name="image"> </field> <field name="condition_location">while</field> <statement name="body"> <block type="parallel_or" id="p1"> <field name="nTasksToChoose">1</field> <field name="description">P1</field> <field name="image"> </field> <statement name="tasks"> <block type="task" id="t9"> <field name="description">T9</field> <field name="image"> </field> </block> </statement> </block> </statement> <next> <block type="parallel_or" id="p2"> <field name="nTasksToChoose">1</field> <field name="description">P2</field> <field name="image"> </field> <statement name="tasks"> <block type="task" id="t10"> <field name="description">T10</field> <field name="image"> </field> </block> </statement> </block> </next> </block> </next> </block> </next> </block> </next> </block> </next> </block> </statement> </block></xml>';

        // FIXME: This JS code would be better read from a file, however Karma does not support reading files as easily as it may be done in Protractor
        const dfsCode = `var builder = new GoalExecutionBuilder('<Beschreibung>'); //0
builder.with_id(0);
  builder.task('T1'); //1
  builder.with_id(1);
  builder.task('T2'); //2
  builder.with_id(2);
  builder.task('T3'); //3
  builder.with_id(3);
  builder.if_('Q1') //4
  .then(function(builder) {
    builder.if_('Q2') //6
    .then(function(builder) {
      builder.task('T4'); //7
      builder.with_id(7);
    }).else_(function(builder) {
      builder.repeat_times(2) //8
      .each(function(builder) {
        builder.task('T5'); //10
        builder.with_id(10);
        builder.task('T6'); //11
        builder.with_id(11);
      });
      builder.with_id(8);
      builder.timer_remember(2, 's');
      builder.task('T7'); //12
      builder.with_id(12);
    });
    builder.with_id(6);
  }).else_(function(builder) {
    builder.task('T8'); //13
    builder.with_id(13);
  });
  builder.with_id(4);
  builder.timer_remember(1, 's');
  builder.repeat_condition('W1', 'while') //14
  .each(function(builder) {
    builder.parallel_or('P1', 1) //15
    .of(function(builder) {
      builder.task('T9'); //16
      builder.with_id(16);
    });
    builder.with_id(15);
  });
  builder.with_id(14);
  builder.parallel_or('P2', 1) //17
  .of(function(builder) {
    builder.task('T10'); //18
    builder.with_id(18);
  });
  builder.with_id(17);
`;
        describe('updateBlocklyIdMap', function () {
            function checkExpectedBlockIndices(expectedBlockToIndex: object, workspace: IBlocklyWorkspace) {
                for (const name in expectedBlockToIndex) {
                    if (!expectedBlockToIndex.hasOwnProperty(name)) {
                        continue;
                    }
                    const block = workspace.getBlockById(name);
                    since(`Expected block with id '${name}' not to be null!`).expect(block).not.toBeNull();
                    since(`Expected block with id '${name}' to get index #{expected} but was #{actual}`).expect(blocklyConfigService.getBlockIndex(block!)).toBe(expectedBlockToIndex[name]);
                }
            };
            it('should throw error with multiple task_group top blocks', function() {
                const workspace = new Blockly.Workspace();
                const dom = Blockly.Xml.textToDom(twoTopBlocksXml);
                Blockly.Xml.domToWorkspace(dom, workspace);
                expect(() => blocklyConfigService.updateBlocklyIdMap(workspace)).toThrowError(/Expected exactly one task_group top block/);
            });
            it('should ignore unused top blocks which are not task_group blocks', function () {
                const workspace = new Blockly.Workspace();
                const dom = Blockly.Xml.textToDom(twoTopBlocksOneUnusedXml);
                Blockly.Xml.domToWorkspace(dom, workspace);
                expect(() => blocklyConfigService.updateBlocklyIdMap(workspace)).not.toThrow();
                const expectedBlockToIndex: object = {
                    "blockId0": 0
                };
            });
            it('should perform depth-first search to assign proper ids to each block', function() {
                const workspace = new Blockly.Workspace();
                const dom = Blockly.Xml.textToDom(dfsTestXml);
                Blockly.Xml.domToWorkspace(dom, workspace);
                blocklyConfigService.updateBlocklyIdMap(workspace);
                const expectedBlockToIndex: object = {
                    "root": 0,
                    "t1": 1,
                    "t2": 2,
                    "t3": 3,
                    "q1": 4,
                    "r1": 5,
                    "q2": 6,
                    "t4": 7,
                    "l2": 8,
                    "r2": 9,
                    "t5": 10,
                    "t6": 11,
                    "t7": 12,
                    "t8": 13,
                    "w1": 14,
                    "p1": 15,
                    "t9": 16,
                    "p2": 17,
                    "t10": 18,
                };
                checkExpectedBlockIndices(expectedBlockToIndex, workspace);
            });
        });

        describe('code generation', function() {
            it('should generate correct code with depth-first search generated ids', function() {
                const workspace = new Blockly.Workspace();
                const dom = Blockly.Xml.textToDom(dfsTestXml);
                Blockly.Xml.domToWorkspace(dom, workspace);
                blocklyConfigService.updateBlocklyIdMap(workspace);
                const code = Blockly.JavaScript.workspaceToCode(workspace);
                expect(code).toBe(dfsCode);
            });
        });
        
        describe('getBlockIndex', function () {
            it('should throw error if block id is not in map', function () {
                const workspace = new Blockly.Workspace();
                const dom = Blockly.Xml.textToDom(dfsTestXml);
                Blockly.Xml.domToWorkspace(dom, workspace);
                blocklyConfigService.updateBlocklyIdMap(workspace);
                const block = workspace.getBlockById('root')!;
                block.id = 'nxId';
                expect(() => blocklyConfigService.getBlockIndex(block)).toThrowError(/Block id "nxId" not in blocklyIdToIndex map/);
            });
        })
    });
}