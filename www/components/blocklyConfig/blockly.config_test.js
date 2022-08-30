'use strict';

describe('blockly config', function () {
    var ngBlocklyProvider;

    beforeEach(function () {
        var mockWorkflowService = {};
        module(function ($provide) {
            $provide.value('workflowService', mockWorkflowService);
        });
        module('rehagoal.blockly');
        module(function(_ngBlocklyProvider_) {
            ngBlocklyProvider = _ngBlocklyProvider_;
            spyOn(ngBlocklyProvider, 'setOptions');
        });
        module('rehagoal.blocklyConfig');
        inject();
    });

    it('should enable blockly trashcan', function() {
        expect(ngBlocklyProvider.setOptions).toHaveBeenCalledWith(jasmine.objectContaining({
            trashcan: true
        }));
    });

    it('should enable scrollbars', function() {
        expect(ngBlocklyProvider.setOptions).toHaveBeenCalledWith(jasmine.objectContaining({
            scrollbars: true
        }));
    });

    it('should specify blockly path to bower_components', function() {
        expect(ngBlocklyProvider.setOptions).toHaveBeenCalledWith(jasmine.objectContaining({
            path: "bower_components/google-blockly/"
        }));
    });

    it('should initialize the toolbox with all required blocks and no additional block', function() {
        var toolbox = '<xml id="toolbox" style="display: none">';
        const required_blocks = [
            'task',
            'if_then_else',
            'repeat_times',
            'repeat_condition',
            'timer_remember',
            'timer_sleep',
            'parallel_or'
        ];
        required_blocks.forEach(function(block) {
            toolbox += '<block type="'+block+'"></block>';
        });
        toolbox += '</xml>';
        expect(ngBlocklyProvider.setOptions).toHaveBeenCalledWith(jasmine.objectContaining({
            toolbox: toolbox
        }));
    });
});
