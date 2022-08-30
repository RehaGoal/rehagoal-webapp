"use strict";
angular.module('rehagoal.blocklyConfig').run(['blocklyService', 'blocklyConfigService' , 'workflowService', function (Blockly, blocklyConfigService, workflowService) {

    //TODO: remove dependency to workflowService and remove code for exit/jump block

    function getSafeNonNegativeInteger(value) {
        if (!/^[0-9]+$/.test(value)) {
            return 0;
        }
        return Number.parseInt(value);
    }

    // https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#micrct
    Blockly.Blocks['task'] = {
        init: function () {
            this.appendValueInput("timer")
                .setCheck("timer_remember")
                .appendField("Aufgabe")
                .appendField(new Blockly.FieldTextInput("<Beschreibung>"), "description")
                .appendField(new Blockly.FieldDropdown(getImageDropdownValues), "image");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(100);
            this.setTooltip('');
        }
    };
    //https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#u76qqc
    Blockly.Blocks['task_group'] = {
        init: function () {
            this.appendValueInput("timer")
                .setCheck("timer_remember")
                .appendField("Ziel")
                .appendField(new Blockly.FieldTextInput("<Beschreibung>"), "description");
            this.appendStatementInput("tasks")
                .setCheck(null)
                .appendField("Unteraufgaben");
            //this.setPreviousStatement(true, null);
            //this.setNextStatement(true, null);
            this.setColour(240);
            this.setTooltip('');
        }
    };
    //https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#nc25tc
    Blockly.Blocks['repeat_condition'] = {
        init: function () {
            this.appendValueInput("timer")
                .setCheck("timer_remember")
                .appendField("Wiederhole")
                .appendField(new Blockly.FieldTextInput("<Frage (Bedingung)>"), "condition")
                .appendField(new Blockly.FieldDropdown(getImageDropdownValues), "image");
            this.appendStatementInput("body")
                .setCheck(null)
                .appendField(new Blockly.FieldDropdown([["Solange Ja", "while"], ["Solange Nein", "until"]]), "condition_location");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(205);
            this.setTooltip('');
        }
    };
    //https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#45nszb
    Blockly.Blocks['repeat_times'] = {
        init: function () {
            this.appendValueInput("timer")
                .setCheck("timer_remember")
                .appendField("Wiederhole")
                .appendField(new Blockly.FieldNumber(0, 0), "times")
                .appendField("mal");
            this.appendStatementInput("body")
                .setCheck(null)
                .appendField("Mache");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(205);
            this.setTooltip('');
        }
    };

    Blockly.Blocks['if_then_else'] = {
        init: function () {
            this.appendValueInput("timer")
                .setCheck("timer_remember")
                .appendField("Wenn")
                .appendField(new Blockly.FieldTextInput("<Frage (Bedingung)>"), "condition")
                .appendField(new Blockly.FieldDropdown(getImageDropdownValues), "image");
            this.appendStatementInput("then")
                .setCheck(null)
                .appendField("dann");
            this.appendStatementInput("else")
                .setCheck(null)
                .appendField("sonst");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(330);
        }
    };

    //https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#2gvmn2
    Blockly.Blocks['timer_remember'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Erinnerung")
                .appendField("Alle")
                .appendField(new Blockly.FieldNumber(0), "eachValue")
                .appendField(new Blockly.FieldDropdown([["Sekunden", "s"], ["Minuten", "m"], ["Stunden", "h"]]), "eachUnit");
            this.setOutput(true, null);
            this.setColour(15);
            this.setTooltip('');
        }
    };

    Blockly.Blocks['parallel_and'] = {
        init: function() {
            this.appendValueInput("timer")
                .setCheck("timer_remember")
                .appendField("Aufgaben in beliebiger Reihenfolge")
                .appendField(new Blockly.FieldTextInput("<Titel>"), "description");
            this.appendStatementInput("tasks")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(275);
            this.setTooltip('');
        },
        onchange: function(changeEvent) {
            var targetBlock = this.getInput('tasks').connection.targetBlock();
            while (targetBlock != null) {
                if (targetBlock.type !== 'task') {
                    targetBlock.unplug();
                }
                targetBlock = targetBlock.getNextBlock();
            }
        }
    };

    Blockly.Blocks['parallel_or'] = {
        init: function() {
            this.appendValueInput("timer")
                .setCheck("timer_remember")
                .appendField(new Blockly.FieldNumber(1,1), "nTasksToChoose")
                .appendField("beliebige Aufgabe(n)")
                .appendField(new Blockly.FieldTextInput("<Titel>"), "description")
                .appendField(new Blockly.FieldDropdown(getImageDropdownValues), "image");
            this.appendStatementInput("tasks")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(275);
            this.setTooltip('');
        },
        onchange: function(changeEvent) {
            var targetBlock = this.getInput('tasks').connection.targetBlock();
            while (targetBlock != null) {
                if (targetBlock.type !== 'task') {
                    targetBlock.unplug();
                }
                targetBlock = targetBlock.getNextBlock();
            }
        }
    };

    Blockly.Blocks['timer_sleep'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Warte")
                .appendField(new Blockly.FieldNumber(0), "timerValue")
                .appendField(new Blockly.FieldDropdown([["Sekunden", "s"], ["Minuten", "m"], ["Stunden", "h"]]), "timerUnit")
                .appendField(new Blockly.FieldTextInput("<Titel>"), "description")
                .appendField(new Blockly.FieldDropdown(getImageDropdownValues), "image");
            this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox('FALSE'), "disableNotificationCheck")
                .appendField("Erinnerungen deaktivieren");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(15);
            this.setTooltip('Warteblock');
        }
    };

    Blockly.JavaScript['task'] = function (block) {
        var index = blocklyConfigService.getBlockIndex(block);
        var text_description = Blockly.JavaScript.quote_(block.getFieldValue('description'));
        var value_timer = Blockly.JavaScript.valueToCode(block, 'timer', Blockly.JavaScript.ORDER_ATOMIC);
        var code = "builder.task(" + text_description +"); //" + index + "\n";
        code += generateWithId(index);
        code += evalImageOption(block);
        code += value_timer;
        return code;
    };
    Blockly.JavaScript['task_group'] = function (block) {
        var index = blocklyConfigService.getBlockIndex(block);
        var text_description = Blockly.JavaScript.quote_(block.getFieldValue('description'));
        var statements_tasks = Blockly.JavaScript.statementToCode(block, 'tasks');
        var value_timer = Blockly.JavaScript.valueToCode(block, 'timer', Blockly.JavaScript.ORDER_ATOMIC);
        var code = "var builder = new GoalExecutionBuilder(" + text_description + "); //" + index + "\n";
        code += generateWithId(index);
        code += value_timer;
        code += statements_tasks;
        return code;
    };
    Blockly.JavaScript['repeat_condition'] = function (block) {
        var index = blocklyConfigService.getBlockIndex(block);
        var dropdown_condition_location = block.getFieldValue('condition_location');
        var text_condition = Blockly.JavaScript.quote_(block.getFieldValue('condition'));
        var statements_body = Blockly.JavaScript.statementToCode(block, 'body');
        var value_timer = Blockly.JavaScript.valueToCode(block, 'timer', Blockly.JavaScript.ORDER_ATOMIC);
        var code = "builder.repeat_condition("+text_condition+", '"+dropdown_condition_location+"') //" + index + "\n";
        code += '.each(function(builder) {\n';
        code += statements_body;
        code += '});\n';
        code += generateWithId(index);
        code += evalImageOption(block);
        code += value_timer;
        return code;
    };
    Blockly.JavaScript['repeat_times'] = function (block) {
        var index = blocklyConfigService.getBlockIndex(block);
        var number_times = getSafeNonNegativeInteger(block.getFieldValue('times'));
        var statements_body = Blockly.JavaScript.statementToCode(block, 'body');
        var value_timer = Blockly.JavaScript.valueToCode(block, 'timer', Blockly.JavaScript.ORDER_ATOMIC);
        var code = 'builder.repeat_times('+number_times+') //' + index + '\n';
        code += '.each(function(builder) {\n';
        code += statements_body;
        code += '});\n';
        code += generateWithId(index);
        code += value_timer;
        return code;
    };
    Blockly.JavaScript['if_then_else'] = function (block) {
        var index = blocklyConfigService.getBlockIndex(block);
        var text_condition = Blockly.JavaScript.quote_(block.getFieldValue('condition'));
        var statements_then = Blockly.JavaScript.statementToCode(block, 'then');
        var statements_else = Blockly.JavaScript.statementToCode(block, 'else');
        var value_timer = Blockly.JavaScript.valueToCode(block, 'timer', Blockly.JavaScript.ORDER_ATOMIC);
        var code = "builder.if_("+text_condition+") //" + index + "\n";
        code += '.then(function(builder) {\n';
        code += statements_then;
        code += '})';
        if (statements_else.trim() != "") {
            code += '.else_(function(builder) {\n';
            code += statements_else;
            code += '});';
        } else {
            code += ';';
        }
        code += '\n';
        code += generateWithId(index);
        code += evalImageOption(block);
        code += value_timer;
        return code;
    };
    Blockly.JavaScript['timer_remember'] = function (block) {
        var number_eachvalue = getSafeNonNegativeInteger(block.getFieldValue('eachValue'));
        var dropdown_eachunit = Blockly.JavaScript.quote_(block.getFieldValue('eachUnit'));
        var code = 'builder.timer_remember('+number_eachvalue+', '+dropdown_eachunit+');\n';
        return [code, Blockly.JavaScript.ORDER_ATOMIC];
    };
    Blockly.JavaScript['timer_sleep'] = function (block) {
        var index = blocklyConfigService.getBlockIndex(block);
        var number_value = getSafeNonNegativeInteger(block.getFieldValue('timerValue'));
        var dropdown_unit = Blockly.JavaScript.quote_(block.getFieldValue('timerUnit'));
        var text_description = Blockly.JavaScript.quote_(block.getFieldValue('description'));
        var disable_notfication_value = block.getFieldValue('disableNotificationCheck') === 'TRUE';
        var code = 'builder.timer_sleep('+number_value+', '+dropdown_unit+', '+text_description+', '+disable_notfication_value+'); //' + index + '\n';
        code += generateWithId(index);
        code += evalImageOption(block);
        return code;
    };
    Blockly.JavaScript['parallel_and'] = function(block) {
        var index = blocklyConfigService.getBlockIndex(block);
        var text_description = Blockly.JavaScript.quote_(block.getFieldValue('description'));
        var value_timer = Blockly.JavaScript.valueToCode(block, 'timer', Blockly.JavaScript.ORDER_ATOMIC);
        var statements_tasks = Blockly.JavaScript.statementToCode(block, 'tasks');
        var code = "builder.parallel_and("+text_description+") //" + index + "\n";
        code += '.of(function(builder) {\n';
        code += statements_tasks;
        code += '});\n';
        code += generateWithId(index);
        code += value_timer;
        return code;
    };

    Blockly.JavaScript['parallel_or'] = function(block) {
        var index = blocklyConfigService.getBlockIndex(block);
        var n_tasks_to_choose = getSafeNonNegativeInteger(block.getFieldValue('nTasksToChoose'));
        var text_description = Blockly.JavaScript.quote_(block.getFieldValue('description'));
        var value_timer = Blockly.JavaScript.valueToCode(block, 'timer', Blockly.JavaScript.ORDER_ATOMIC);
        var statements_tasks = Blockly.JavaScript.statementToCode(block, 'tasks');
        var code = "builder.parallel_or("+text_description+", "+n_tasks_to_choose+") //" + index + "\n";
        code += '.of(function(builder) {\n';
        code += statements_tasks;
        code += '});\n';
        code += generateWithId(index);
        code += evalImageOption(block);
        code += value_timer;
        return code;
    };

    function getImageDropdownValues() {
        return blocklyConfigService.getImageOptions();
    }

    function evalImageOption(block) {
        var fieldValue = block.getFieldValue('image');
        if (fieldValue !== " ") {
            var value = Blockly.JavaScript.quote_(fieldValue);
            return "builder.with_image(" + value +");\n";
        }
        return "";
    }

    function generateWithId(index) {
        return "builder.with_id(" + index + ");\n";
    }
}]);
