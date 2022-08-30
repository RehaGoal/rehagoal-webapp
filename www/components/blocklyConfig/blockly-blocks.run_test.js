"use strict";

describe('blockly blocks', function () {
    var Blockly, blocklyConfigService;

    var customMatchers = {
        toContainBlocklyInput: function (util, customEqualityTesters) {
            return {
                compare: function (actual, expected) {
                    var containsPrimary = util.contains(actual, expected, customEqualityTesters);

                    var result = {};
                    if (containsPrimary) {
                        result.pass = true;
                        return result;
                    }

                    actual.every(function (input) {
                        var containsField = util.contains(input.fieldRow, expected, customEqualityTesters);
                        if (containsField) {
                            result.pass = true;
                            return false;
                        }
                        return true;
                    });

                    return result;
                }
            };
        }
    };

    beforeAll(function () {
        jasmine.addMatchers(customMatchers);
    });

    beforeEach(function () {
        module('rehagoal.blockly');
        module('rehagoal.blocklyConfig');
        inject(function (_blocklyService_, _blocklyConfigService_) {
            Blockly = _blocklyService_;
            blocklyConfigService = _blocklyConfigService_;
        });
    });

    describe('block definitions', function () {
        it('should have defined a task block', function () {
            expect(Blockly.Blocks.task).toBeDefined();
        });
        it('should have defined a task_group block', function () {
            expect(Blockly.Blocks.task_group).toBeDefined();
        });
        it('should have defined a repeat_condition block', function () {
            expect(Blockly.Blocks.repeat_condition).toBeDefined();
        });
        it('should have defined a repeat_times block', function () {
            expect(Blockly.Blocks.repeat_times).toBeDefined();
        });
        it('should have defined a if_then_else block', function () {
            expect(Blockly.Blocks.if_then_else).toBeDefined();
        });
        it('should have defined a timer_remember block', function () {
            expect(Blockly.Blocks.timer_remember).toBeDefined();
        });
        it('should have defined a parallel_and block', function () {
            expect(Blockly.Blocks.parallel_and).toBeDefined();
        });
        it('should have defined a parallel_or block', function () {
            expect(Blockly.Blocks.parallel_or).toBeDefined();
        });
        it('should have defined a timer_sleep block', function () {
            expect(Blockly.Blocks.timer_sleep).toBeDefined();
        });
    });

    describe('JavaScript code generator definitions', function () {
        it('should have defined a JavaScript generator for the task block', function () {
            expect(Blockly.JavaScript.task).toBeDefined();
        });
        it('should have defined a JavaScript generator for the task_group block', function () {
            expect(Blockly.JavaScript.task_group).toBeDefined();
        });
        it('should have defined a JavaScript generator for the repeat_condition block', function () {
            expect(Blockly.JavaScript.repeat_condition).toBeDefined();
        });
        it('should have defined a JavaScript generator for the repeat_times block', function () {
            expect(Blockly.JavaScript.repeat_times).toBeDefined();
        });
        it('should have defined a JavaScript generator for the if_then_else block', function () {
            expect(Blockly.JavaScript.if_then_else).toBeDefined();
        });
        it('should have defined a JavaScript generator for the timer_remember block', function () {
            expect(Blockly.JavaScript.timer_remember).toBeDefined();
        });
        it('should have defined a JavaScript generator for the parallel_and block', function () {
            expect(Blockly.JavaScript.parallel_and).toBeDefined();
        });
        it('should have defined a JavaScript generator for the parallel_or block', function () {
            expect(Blockly.JavaScript.parallel_or).toBeDefined();
        });
        it('should have defined a JavaScript generator for the timer_sleep block', function () {
            expect(Blockly.JavaScript.timer_sleep).toBeDefined();
        });
    });
    describe('JavaScript code generation', function () {
        var workspace, block;
        const defaultEachValue = 42;
        const defaultEachUnit = 's';
        const defaultLinkedTaskCount = 5;
        const defaultIndentation = 2;
        const indentationChar = ' ';

        function attachTimer(block, timerInputName, eachValue, eachUnit) {
            var timer = workspace.newBlock('timer_remember');
            timer.setFieldValue(eachValue || defaultEachValue, 'eachValue');
            timer.setFieldValue(eachUnit || defaultEachUnit, 'eachUnit');
            var timerInput = block.getInput(timerInputName || 'timer');
            timerInput.connection.connect(timer.outputConnection);
            blocklyConfigService.updateBlocklyIdMap(workspace);
        }

        function getTimerCode(eachValue, eachUnit) {
            return "builder.timer_remember(" + (eachValue || defaultEachValue) +
                ", \'" + (eachUnit || defaultEachUnit) + "\');\n";
        }

        function getLinkedTaskBlocks(numTasks) {
            numTasks = numTasks || defaultLinkedTaskCount;
            var rootTask = numTasks > 0 ? workspace.newBlock('task') : null;
            if (rootTask !== null) {
                rootTask.setFieldValue('Task 0', 'description');
            }
            var task = rootTask;
            for (var i = 1; i < numTasks; ++i) {
                var newTask = workspace.newBlock('task');
                newTask.setFieldValue('Task ' + i, 'description');
                task.nextConnection.connect(newTask.previousConnection);
                task = newTask;
            }
            return rootTask;
        }

        function getLinkedTaskBlocksCode(startId, numTasks, indentation) {
            indentation = indentation || defaultIndentation;
            numTasks = numTasks || defaultLinkedTaskCount;
            var code = "";
            for (var i = 0; i < numTasks; ++i) {
                var id = startId + i;
                var indent = indentationChar.repeat(indentation);
                code += indent + "builder.task('Task " + i + "'); //" + id + "\n";
                code += indent + "builder.with_id(" + id + ");\n";
            }
            return code;
        }

        function attachStatements(block, firstStatement, statementInputName) {
            var stmtInput = block.getInput(statementInputName);
            stmtInput.connection.connect(firstStatement.previousConnection);
            blocklyConfigService.updateBlocklyIdMap(workspace);
        }

        function attachTaskStatements(block, statementInputName) {
            attachStatements(block, getLinkedTaskBlocks(), statementInputName);
        }

        function newBlockInGoal(block_type) {
            let goal = workspace.newBlock('task_group');
            block = workspace.newBlock(block_type);
            attachStatements(goal, block, 'tasks');
            return block;
        };

        function blockToCode(block, excludeWithIndex) {
            spyOn(blocklyConfigService, 'getBlockIndex').and.callThrough();
            var code = Blockly.JavaScript.blockToCode(block);
            if (!excludeWithIndex) {
                expect(blocklyConfigService.getBlockIndex).toHaveBeenCalled();
            }
            return code;
        }

        beforeEach(function () {
            workspace = new Blockly.Workspace();
        });
        describe('task block', function () {
            const description = "My task '\"";

            function defineBasicBlock() {
                block = newBlockInGoal('task');
                block.setFieldValue(description, 'description');
                blocklyConfigService.updateBlocklyIdMap(workspace);
                spyOn(Blockly.JavaScript, 'quote_').and.callThrough();
            }

            it('should generate valid builder code without timer', function () {
                defineBasicBlock();
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBe('builder.task(\'My task \\\'"\'); //1\nbuilder.with_id(1);\n');
            });
            it('should generate valid builder code with timer', function () {
                defineBasicBlock();
                attachTimer(block);
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBe('builder.task(\'My task \\\'"\'); //1\nbuilder.with_id(1);\n' + getTimerCode());
            });
        });
        describe('task_group block', function () {
            const description = "My goal '\"";

            function defineBasicBlock() {
                block = workspace.newBlock('task_group');
                block.setFieldValue(description, 'description');
                blocklyConfigService.updateBlocklyIdMap(workspace);
                spyOn(Blockly.JavaScript, 'quote_').and.callThrough();
            }

            it('should generate valid builder code without timer', function () {
                defineBasicBlock();
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBe('var builder = new GoalExecutionBuilder(\'My goal \\\'"\'); //0\nbuilder.with_id(0);\n');
            });
            it('should generate valid builder code with timer', function () {
                defineBasicBlock();
                attachTimer(block);
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBe('var builder = new GoalExecutionBuilder(\'My goal \\\'"\'); //0\nbuilder.with_id(0);\n' + getTimerCode());
            });
        });
        describe('repeat_condition block', function () {
            const condition = "my condition '\"";

            function defineBasicBlock() {
                block = newBlockInGoal('repeat_condition');
                block.setFieldValue('while', 'condition_location');
                block.setFieldValue(condition, 'condition');
                blocklyConfigService.updateBlocklyIdMap(workspace);
                spyOn(Blockly.JavaScript, 'quote_').and.callThrough();
            }

            it('should generate valid builder code without timer, without body', function () {
                defineBasicBlock();
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(condition);
                expect(code).toBe("builder.repeat_condition('my condition \\'\"', 'while') //1\n.each(function(builder) {\n});\nbuilder.with_id(1);\n");
            });
            it('should generate valid builder code with timer, without body', function () {
                defineBasicBlock();
                attachTimer(block);
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(condition);
                expect(code).toBe("builder.repeat_condition('my condition \\'\"', 'while') //1\n.each(function(builder) {\n});\nbuilder.with_id(1);\n" + getTimerCode());
            });
            it('should generate valid builder code without timer, with body', function () {
                defineBasicBlock();
                attachTaskStatements(block, 'body');
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(condition);
                expect(code).toBe("builder.repeat_condition('my condition \\'\"', 'while') //1\n.each(function(builder) {\n" +
                    getLinkedTaskBlocksCode(2) + "});\nbuilder.with_id(1);\n");
            });
        });
        describe('repeat_times block', function () {
            function defineBasicBlock() {
                block = newBlockInGoal('repeat_times');
                block.setFieldValue(42, 'times');
                blocklyConfigService.updateBlocklyIdMap(workspace);
            }

            it('should generate valid builder code without timer, without body', function () {
                defineBasicBlock();
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(code).toBe("builder.repeat_times(42) //1\n.each(function(builder) {\n});\nbuilder.with_id(1);\n");
            });
            it('should generate valid builder code with timer, without body', function () {
                defineBasicBlock();
                attachTimer(block);
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(code).toBe("builder.repeat_times(42) //1\n.each(function(builder) {\n});\nbuilder.with_id(1);\n" + getTimerCode());
            });
            it('should generate valid builder code without timer, with body', function () {
                defineBasicBlock();
                attachTaskStatements(block, 'body');
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(code).toBe("builder.repeat_times(42) //1\n.each(function(builder) {\n" +
                    getLinkedTaskBlocksCode(2) + "});\nbuilder.with_id(1);\n");
            });
        });
        describe('if_then_else block', function () {
            const condition = "my condition '\"";

            function defineBasicBlock() {
                block = newBlockInGoal('if_then_else');
                block.setFieldValue(condition, 'condition');
                blocklyConfigService.updateBlocklyIdMap(workspace);
                spyOn(Blockly.JavaScript, 'quote_').and.callThrough();
            }

            it('should generate valid builder code without timer, without then, without else', function () {
                defineBasicBlock();
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(condition);
                expect(code).toBeDefined();
                expect(code).toBe("builder.if_('my condition \\'\"') //1\n.then(function(builder) {\n});\nbuilder.with_id(1);\n");
            });
            it('should generate valid builder code with timer, without then, without else', function () {
                defineBasicBlock();
                attachTimer(block);
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(condition);
                expect(code).toBeDefined();
                expect(code).toBe("builder.if_('my condition \\'\"') //1\n.then(function(builder) {\n});\nbuilder.with_id(1);\n" + getTimerCode());
            });
            it('should generate valid builder code without timer, with then, without else', function () {
                defineBasicBlock();
                attachTaskStatements(block, 'then');
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(condition);
                expect(code).toBeDefined();
                expect(code).toBe("builder.if_('my condition \\'\"') //1\n.then(function(builder) {\n" +
                    getLinkedTaskBlocksCode(2) + "});\nbuilder.with_id(1);\n");
            });
            it('should generate valid builder code without timer, without then, with else', function () {
                defineBasicBlock();
                attachTaskStatements(block, 'else');
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(condition);
                expect(code).toBeDefined();
                expect(code).toBe("builder.if_('my condition \\'\"') //1\n.then(function(builder) {\n}).else_(function(builder) {\n" +
                    getLinkedTaskBlocksCode(2) + "});\nbuilder.with_id(1);\n");
            });
            it('should generate valid builder code without timer, with then, with else', function () {
                defineBasicBlock();
                attachTaskStatements(block, 'then');
                attachTaskStatements(block, 'else');
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(condition);
                expect(code).toBeDefined();
                expect(code).toBe("builder.if_('my condition \\'\"') //1\n.then(function(builder) {\n" +
                    getLinkedTaskBlocksCode(2) + "}).else_(function(builder) {\n" +
                    getLinkedTaskBlocksCode(7) + "});\nbuilder.with_id(1);\n");
            });
        });
        describe('timer_remember block', function () {
            it('should generate valid builder code', function () {
                let goal = workspace.newBlock('task_group');
                let timerInput = goal.getInput('timer');
                block = workspace.newBlock('timer_remember');
                block.setFieldValue(42, 'eachValue');
                block.setFieldValue('m', 'eachUnit');
                timerInput.connection.connect(block.outputConnection);
                blocklyConfigService.updateBlocklyIdMap(workspace);
                var code = blockToCode(block, true);
                expect(code).toBeDefined();
                expect(code).toEqual(['builder.timer_remember(42, \'m\');\n', Blockly.JavaScript.ORDER_ATOMIC]);
            });
        });
        describe('parallel_and block', function () {
            const description = "my parallel tasks '\"";

            function defineBasicBlock() {
                block = newBlockInGoal('parallel_and');
                block.setFieldValue(description, 'description');
                blocklyConfigService.updateBlocklyIdMap(workspace);
                spyOn(Blockly.JavaScript, 'quote_').and.callThrough();
            }

            it('should generate valid builder code without timer, without tasks', function () {
                defineBasicBlock();
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBeDefined();
                expect(code).toEqual("builder.parallel_and('my parallel tasks \\'\"') //1\n.of(function(builder) {\n});\nbuilder.with_id(1);\n");
            });
            it('should generate valid builder code with timer, without tasks', function () {
                defineBasicBlock();
                attachTimer(block);
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBeDefined();
                expect(code).toEqual("builder.parallel_and('my parallel tasks \\'\"') //1\n.of(function(builder) {\n});\nbuilder.with_id(1);\n" + getTimerCode());
            });
            it('should generate valid builder code without timer, with tasks', function () {
                defineBasicBlock();
                attachTaskStatements(block, 'tasks');
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBeDefined();
                expect(code).toEqual("builder.parallel_and('my parallel tasks \\'\"') //1\n.of(function(builder) {\n" +
                    getLinkedTaskBlocksCode(2) + "});\nbuilder.with_id(1);\n");
            });
        });
        describe('parallel_or block', function () {
            const description = "my parallel tasks '\"";

            function defineBasicBlock() {
                block = newBlockInGoal('parallel_or');
                block.setFieldValue(description, 'description');
                block.setFieldValue(42, 'nTasksToChoose');
                blocklyConfigService.updateBlocklyIdMap(workspace);
                spyOn(Blockly.JavaScript, 'quote_').and.callThrough();
            }

            it('should generate valid builder code without timer, without tasks', function () {
                defineBasicBlock();
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBeDefined();
                expect(code).toEqual("builder.parallel_or('my parallel tasks \\'\"', 42) //1\n.of(function(builder) {\n});\nbuilder.with_id(1);\n");
            });
            it('should generate valid builder code with timer, without tasks', function () {
                defineBasicBlock();
                attachTimer(block);
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBeDefined();
                expect(code).toEqual("builder.parallel_or('my parallel tasks \\'\"', 42) //1\n.of(function(builder) {\n});\nbuilder.with_id(1);\n" + getTimerCode());
            });
            it('should generate valid builder code without timer, without tasks', function () {
                defineBasicBlock();
                attachTaskStatements(block, 'tasks');
                var code = blockToCode(block);
                expect(Blockly.JavaScript.quote_).toHaveBeenCalledWith(description);
                expect(code).toBeDefined();
                expect(code).toEqual("builder.parallel_or('my parallel tasks \\'\"', 42) //1\n.of(function(builder) {\n" +
                    getLinkedTaskBlocksCode(2) + "});\nbuilder.with_id(1);\n");
            });
        });
        describe('timer_sleep block', function () {
            it('should generate valid builder code', function () {
                block = newBlockInGoal('timer_sleep');
                block.setFieldValue(42, 'timerValue');
                block.setFieldValue('m', 'timerUnit');
                block.setFieldValue('text', 'description');
                block.setFieldValue('true', 'disableNotificationCheck');
                blocklyConfigService.updateBlocklyIdMap(workspace);
                var code = blockToCode(block);
                expect(code).toBeDefined();
                expect(code).toEqual('builder.timer_sleep(42, \'m\', \'text\', true); //1\nbuilder.with_id(1);\n');
            });
        });
    });

    describe('Block definition contents', function () {
        var workspace, block;
        beforeEach(function () {
            workspace = new Blockly.Workspace();
        });

        describe('task block', function () {
            beforeEach(function () {
                block = workspace.newBlock('task');
                expect(block).toBeDefined();
            });
            it('should have connection to previous block', function () {
                expect(block.previousConnection).not.toBeNull();
            });
            it('should have connection to next block', function () {
                expect(block.nextConnection).not.toBeNull();
            });
            it('should contain timer field with check timer_remember', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timer',
                    connection: jasmine.objectContaining({
                        check_: ['timer_remember']
                    })
                }));
            });
            it('should contain description field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'description'
                }));
            });
        });

        describe('task_group block', function () {
            beforeEach(function () {
                block = workspace.newBlock('task_group');
                expect(block).toBeDefined();
            });
            it('should not have connection to previous block', function () {
                expect(block.previousConnection).toBeNull();
            });
            it('should not have connection to next block', function () {
                expect(block.nextConnection).toBeNull();
            });
            it('should contain timer field with check timer_remember', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timer',
                    connection: jasmine.objectContaining({
                        check_: ['timer_remember']
                    })
                }));
            });
            it('should contain description field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'description'
                }));
            });
            it('should contain statement input "tasks"', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'tasks',
                    type: Blockly.NEXT_STATEMENT
                }));
            });
        });

        describe('repeat_condition block', function () {
            beforeEach(function () {
                block = workspace.newBlock('repeat_condition');
                expect(block).toBeDefined();
            });
            it('should have connection to previous block', function () {
                expect(block.previousConnection).not.toBeNull();
            });
            it('should have connection to next block', function () {
                expect(block.nextConnection).not.toBeNull();
            });
            it('should contain timer field with check timer_remember', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timer',
                    connection: jasmine.objectContaining({
                        check_: ['timer_remember']
                    })
                }));
            });
            it('should contain condition_location field with dropdown for while/until', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'condition_location',
                    constructor: Blockly.FieldDropdown,
                    menuGenerator_: [[jasmine.any(String), "while"], [jasmine.any(String), "until"]]
                }));
            });
            it('should contain condition field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'condition'
                }));
            });
            it('should contain statement input "body"', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'body',
                    type: Blockly.NEXT_STATEMENT
                }));
            });
        });

        describe('repeat_times block', function () {
            beforeEach(function () {
                block = workspace.newBlock('repeat_times');
                expect(block).toBeDefined();
            });
            it('should have connection to previous block', function () {
                expect(block.previousConnection).not.toBeNull();
            });
            it('should have connection to next block', function () {
                expect(block.nextConnection).not.toBeNull();
            });
            it('should contain timer field with check timer_remember', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timer',
                    connection: jasmine.objectContaining({
                        check_: ['timer_remember']
                    })
                }));
            });
            it('should contain times field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'times',
                    constructor: Blockly.FieldNumber
                }));
            });
            it('should contain statement input "body"', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'body',
                    type: Blockly.NEXT_STATEMENT
                }));
            });
        });

        describe('if_then_else block', function () {
            beforeEach(function () {
                block = workspace.newBlock('if_then_else');
                expect(block).toBeDefined();
            });
            it('should have connection to previous block', function () {
                expect(block.previousConnection).not.toBeNull();
            });
            it('should have connection to next block', function () {
                expect(block.nextConnection).not.toBeNull();
            });
            it('should contain timer field with check timer_remember', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timer',
                    connection: jasmine.objectContaining({
                        check_: ['timer_remember']
                    })
                }));
            });
            it('should contain condition field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'condition'
                }));
            });
            it('should contain statement input "then"', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'then',
                    type: Blockly.NEXT_STATEMENT
                }));
            });
            it('should contain statement input "else"', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'else',
                    type: Blockly.NEXT_STATEMENT
                }));
            });
        });

        describe('timer_remember block', function () {
            beforeEach(function () {
                block = workspace.newBlock('timer_remember');
                expect(block).toBeDefined();
            });
            it('should not have connection to previous block', function () {
                expect(block.previousConnection).toBeNull();
            });
            it('should not have connection to next block', function () {
                expect(block.nextConnection).toBeNull();
            });
            it('should have output connection', function () {
                expect(block.outputConnection).not.toBeNull();
            });
            it('should contain eachValue field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'eachValue',
                    constructor: Blockly.FieldNumber
                }));
            });
            it('should contain eachUnit field with dropdown for h/m/s', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'eachUnit',
                    constructor: Blockly.FieldDropdown,
                    menuGenerator_: [[jasmine.any(String), "s"], [jasmine.any(String), "m"], [jasmine.any(String), "h"]]
                }));
            });
        });

        describe('parallel_and block', function () {
            beforeEach(function () {
                block = workspace.newBlock('parallel_and');
                expect(block).toBeDefined();
            });
            it('should have connection to previous block', function () {
                expect(block.previousConnection).not.toBeNull();
            });
            it('should have connection to next block', function () {
                expect(block.nextConnection).not.toBeNull();
            });
            it('should contain timer field with check timer_remember', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timer',
                    connection: jasmine.objectContaining({
                        check_: ['timer_remember']
                    })
                }));
            });
            it('should contain description field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'description'
                }));
            });
            it('should contain statement input "tasks"', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'tasks',
                    type: Blockly.NEXT_STATEMENT
                }));
            });
        });

        describe('parallel_or block', function () {
            beforeEach(function () {
                block = workspace.newBlock('parallel_or');
                expect(block).toBeDefined();
            });
            it('should have connection to previous block', function () {
                expect(block.previousConnection).not.toBeNull();
            });
            it('should have connection to next block', function () {
                expect(block.nextConnection).not.toBeNull();
            });
            it('should contain timer field with check timer_remember', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timer',
                    connection: jasmine.objectContaining({
                        check_: ['timer_remember']
                    })
                }));
            });
            it('should contain description field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'description'
                }));
            });
            it('should contain nTasksToChoose field with minimum 1 and default value 1', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'nTasksToChoose',
                    constructor: Blockly.FieldNumber,
                    min_: 1,
                    text_: '1'
                }));
            });
            it('should contain statement input "tasks"', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'tasks',
                    type: Blockly.NEXT_STATEMENT
                }));
            });
        });

        describe('timer_sleep block', function () {
            beforeEach(function () {
                block = workspace.newBlock('timer_sleep');
                expect(block).toBeDefined();
            });
            it('should have connection to previous block', function () {
                expect(block.previousConnection).not.toBeNull();
            });
            it('should have connection to next block', function () {
                expect(block.nextConnection).not.toBeNull();
            });
            it('should not have output connection', function () {
                expect(block.outputConnection).toBeNull();
            });
            it('should contain timerValue field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timerValue',
                    constructor: Blockly.FieldNumber
                }));
            });
            it('should contain timerUnit field with dropdown for h/m/s', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'timerUnit',
                    constructor: Blockly.FieldDropdown,
                    menuGenerator_: [[jasmine.any(String), "s"], [jasmine.any(String), "m"], [jasmine.any(String), "h"]]
                }));
            });
            it('should contain description field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'description',
                    constructor: Blockly.FieldTextInput
                }));
            });
            it('should contain disableNotificationCheck field', function () {
                expect(block.inputList).toContainBlocklyInput(jasmine.objectContaining({
                    name: 'disableNotificationCheck',
                    constructor: Blockly.FieldCheckbox
                }));
            });
        });
    });

    describe('onChange events', function () {
        var workspace;
        const nonTaskStatementBlocks = [
            'repeat_condition',
            'repeat_times',
            'if_then_else',
            'parallel_and',
            'parallel_or'
        ];

        beforeEach(function () {
            workspace = new Blockly.Workspace();
        });

        it('parallel_and block should disconnect non-task blocks when connected', function() {
            var block = workspace.newBlock('parallel_and');
            var tasksInput = block.getInput('tasks');
            nonTaskStatementBlocks.every(function(blockName) {
                var nonTaskBlock = workspace.newBlock(blockName);
                tasksInput.connection.connect(nonTaskBlock.previousConnection);
                Blockly.Events.fireNow_();
                expect(tasksInput.connection.isConnected()).toBe(false);
            });
            var taskBlock = workspace.newBlock('task');
            tasksInput.connection.connect(taskBlock.previousConnection);
            Blockly.Events.fireNow_();
            expect(tasksInput.connection.isConnected()).toBe(true);
        });

        it('parallel_or block should disconnect non-task blocks when connected', function() {
            var block = workspace.newBlock('parallel_or');
            var tasksInput = block.getInput('tasks');
            nonTaskStatementBlocks.every(function(blockName) {
                var nonTaskBlock = workspace.newBlock(blockName);
                tasksInput.connection.connect(nonTaskBlock.previousConnection);
                Blockly.Events.fireNow_();
                expect(tasksInput.connection.isConnected()).toBe(false);
            });
            var taskBlock = workspace.newBlock('task');
            tasksInput.connection.connect(taskBlock.previousConnection);
            Blockly.Events.fireNow_();
            expect(tasksInput.connection.isConnected()).toBe(true);
        });
    });
});
