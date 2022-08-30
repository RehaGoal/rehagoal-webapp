"use strict";

describe('ExecutionComponent module', function () {
    beforeEach(module('rehagoal.executionComponent'));
    beforeEach(module('rehagoal.templates'));

    var $componentController, $rootScope, $q;
    /**
     * @type angular.IIntervalService
     */
    var $interval;
    var workflowSingleTask, workflowImmediateFinish, workflowMulti, workflowInvalid, workflowIfCondition, workflowWhileCondition, workflowParallel2Of3, workflowParallel1Of1, workflowParallel3Of3, workflowTimerSleep, workflowTaskKinds, workflowRepeatTimesEmpty, workflowRepeatTimesEmptyThenTask;
    var workflowExecution, blocklyWorkspace;
    var blockly, blocklyConfigService, workflowService, workflowExecutionService, settingsService, ttsService, metricIdGeneratorService, metricService, gamificationService, generateWorkflowVersionHash;
    let recordingEnabledSpy;

    const defaultXmlHash = '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826';
    const defaultUUID = 'exampleUUID';

    beforeEach(module('rehagoal.workflow', function ($provide) {
        workflowSingleTask = {
            id: 0,
            name: 'Test Workflow',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"><statement name=\"tasks\"><block type=\"task\" id=\"t1\"><field name=\"description\">&lt;Beschreibung&gt;</field><field name=\"image\"></field></block></statement></block></xml>"
        };
        workflowImmediateFinish = {
            id: 2,
            name: 'Test Workflow 2',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            workspaceXml: "<xml><block type=\"task_group\" deletable=\"false\" movable=\"true\"></block></xml>"
        };
        workflowMulti = {
            id: 1,
            name: 'Multi',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            /**
             * Goal: <Beschreibung> //0
             * Task: 1 //1
             * Repeat Times (2) //2
             *      Task: 2&3 //3
             * Task: 4 //4
             */
            workspaceXml: "<xml xmlns=\"http://www.w3.org/1999/xhtml\"><block type=\"task_group\" id=\"0goal\" deletable=\"false\" x=\"-1\" y=\"-30\"><field name=\"description\">&lt;Beschreibung&gt;</field><statement name=\"tasks\"><block type=\"task\" id=\"1task\"><field name=\"description\">1</field><field name=\"image\"> </field><next><block type=\"repeat_times\" id=\"2times\"><field name=\"times\">2</field><statement name=\"body\"><block type=\"task\" id=\"3task\"><field name=\"description\">2&amp;3</field><field name=\"image\"> </field></block></statement><next><block type=\"task\" id=\"4task\"><field name=\"description\">4</field><field name=\"image\"> </field></block></next></block></next></block></statement></block></xml>"
        };
        workflowIfCondition = {
            id: 4,
            name: 'IfCondition',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            /**
             * Goal: goal
             * If: Yes or No?
             *      Task: Yes
             * Else:
             *      Task: No
             */
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="8M{_Y$u1-]XBln:zi%)S" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="if_then_else" id="Ioz6dq[+HP,6mo?0RoZ3"><field name="condition">Yes or No?</field><field name="image"> </field><statement name="then"><block type="task" id="Pi2:H,v887JAEj[+v*2%"><field name="description">Yes</field><field name="image"> </field></block></statement><statement name="else"><block type="task" id="Xqi*FtSNPZJ]Mo}/tE7Q"><field name="description">No</field><field name="image"> </field></block></statement></block></statement></block></xml>'
        };
        workflowWhileCondition = {
            id: 5,
            name: 'WhileCondition',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            /**
             * Goal: goal
             * While: Continue?
             *      Task: Do it
             */
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="8M{_Y$u1-]XBln:zi%)S" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="repeat_condition" id="H4ltsREy.I?twUrv70o,"><field name="condition">Continue?</field><field name="image"> </field><field name="condition_location">while</field><statement name="body"><block type="task" id="Pi2:H,v887JAEj[+v*2%"><field name="description">Do it</field><field name="image"> </field></block></statement></block></statement></block></xml>',
        };
        workflowParallel2Of3 = {
            id: 6,
            name: 'Parallel 2of3',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            /**
             * Goal: goal
             * Parallel (2): Do 2/3
             *      Task: Task 1
             *      Task: Task 2
             *      Task: Task 3
             */
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="8M{_Y$u1-]XBln:zi%)S" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="parallel_or" id="P|o`VoN,Tc4Gn9nUGy/A"><field name="nTasksToChoose">2</field><field name="description">Do 2/3</field><field name="image"> </field><statement name="tasks"><block type="task" id="bSXRjNh+67%D5^n=;=0M"><field name="description">Task 1</field><field name="image"> </field><next><block type="task" id=":io0f-0Rh08-g#mq|A|("><field name="description">Task 2</field><field name="image"> </field><next><block type="task" id="sj#^=MyGuH/v6PF!dmL("><field name="description">Task 3</field><field name="image"> </field></block></next></block></next></block></statement></block></statement></block></xml>'
        };
        workflowParallel1Of1 = {
            id: 7,
            name: 'Parallel 1of1',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            /**
             * Goal: goal
             * Parallel (1): Do 1/1
             *      Task: Task 1
             */
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="8M{_Y$u1-]XBln:zi%)S" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="parallel_or" id="P|o`VoN,Tc4Gn9nUGy/A"><field name="nTasksToChoose">1</field><field name="description">Do 1/1</field><field name="image"> </field><statement name="tasks"><block type="task" id="bSXRjNh+67%D5^n=;=0M"><field name="description">Task 1</field><field name="image"> </field></block></statement></block></statement></block></xml>',
        };
        workflowParallel3Of3 = {
            id: 8,
            name: 'Parallel 3of3',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="8M{_Y$u1-]XBln:zi%)S" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="parallel_or" id="P|o`VoN,Tc4Gn9nUGy/A"><field name="nTasksToChoose">3</field><field name="description">Do 3/3</field><field name="image"> </field><statement name="tasks"><block type="task" id="bSXRjNh+67%D5^n=;=0M"><field name="description">Task 1</field><field name="image"> </field><next><block type="task" id="@C8U~Q2%9rs?+LZUx!*F"><field name="description">Task 2</field><field name="image"> </field><next><block type="task" id="y~Xq#Tr;_Jv%4nT7!hYu"><field name="description">Task 3</field><field name="image"> </field></block></next></block></next></block></statement></block></statement></block></xml>',
        };
        workflowTimerSleep = {
            id: 9,
            name: 'TimerSleep',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="8M{_Y$u1-]XBln:zi%)S" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="timer_sleep" id="WhGz$4:;{fEsm{uF4LwG"><field name="timerValue">1</field><field name="timerUnit">s</field><field name="description">wait</field><field name="image"> </field><field name="disableNotificationCheck">FALSE</field></block></statement></block></xml>',
        };
        workflowTaskKinds = {
            id: 10,
            name: 'TaskKinds',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="8M{_Y$u1-]XBln:zi%)S" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="task" id="doqR]b^UJ~JJqTuy1.Ap"><field name="description"></field><field name="image"> </field><next><block type="task" id="2xR*#P/Y[;PJ0J%(D46X"><field name="description"></field><field name="image">d7c5f5dc6ca5e56b95444b245eb5ded8ed3425de9bcce94feba98157a9f99145</field><next><block type="task" id="rKpn1d//nuzr0!1F7%AU"><field name="description">+Text</field><field name="image"> </field><next><block type="task" id="[[5yz_{:h/?e)My_o~K-"><field name="description">+Text +Image</field><field name="image">d7c5f5dc6ca5e56b95444b245eb5ded8ed3425de9bcce94feba98157a9f99145</field></block></next></block></next></block></next></block></statement></block></xml>',
        };
        workflowRepeatTimesEmpty = {
            id: 11,
            name: 'RepeatTimesEmpty',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="8M{_Y$u1-]XBln:zi%)S" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="repeat_times" id="`xGq5Mz276YTDVxsxl@t"><field name="times">3</field></block></statement></block></xml>',
        }
        workflowRepeatTimesEmptyThenTask = {
            id: 12,
            name: 'RepeatTimesEmptyThenTask',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            workspaceXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="NT^ZY%|bEFhi{xjGcGDC" deletable="false" x="0" y="0"><field name="description">goal</field><statement name="tasks"><block type="repeat_times" id="`xGq5Mz276YTDVxsxl@t"><field name="times">3</field><next><block type="task" id="c`hI]i20;//._Y*%Vs!Y"><field name="description">2</field><field name="image"> </field></block></next></block></statement></block></xml>'
        }
        workflowInvalid = {
            id: 3,
            name: 'Invalid workflow',
            uuid: defaultUUID,
            xmlHash: defaultXmlHash,
            workspaceXml: '</xml>'
        };

        $provide.decorator('blocklyService', function($delegate) {
            var origDomToWorkspace = $delegate.Xml.domToWorkspace;
            $delegate.Xml.domToWorkspace = function(dom, workspace) {
                blocklyWorkspace = workspace;
                origDomToWorkspace.apply($delegate, [dom, workspace]);
            };
            return $delegate;
        });
        $provide.decorator('workflowExecutionService', function($delegate) {
            var origBuildExecutionFromCode = $delegate.buildExecutionFromCode;
            $delegate.buildExecutionFromCode = function(code) {
                workflowExecution = origBuildExecutionFromCode.apply($delegate, [code]);
                return workflowExecution;
            };
            return $delegate;
        });
    }));

    beforeEach(inject(function (_$componentController_,
                                _$rootScope_,
                                _$q_,
                                _$interval_,
                                _workflowService_,
                                _workflowExecutionService_,
                                _blocklyService_,
                                _blocklyConfigService_,
                                _ttsService_,
                                _settingsService_,
                                _metricIdGeneratorService_,
                                _metricService_,
                                _gamificationService_,
                                _generateWorkflowVersionHash_) {
        $componentController = _$componentController_;
        $rootScope = _$rootScope_;
        $q = _$q_;
        $interval =_$interval_;
        workflowService = -_workflowService_;
        workflowExecutionService = _workflowExecutionService_;
        blockly = _blocklyService_;
        blocklyConfigService = _blocklyConfigService_;
        metricIdGeneratorService = _metricIdGeneratorService_;
        metricService = _metricService_;
        ttsService = _ttsService_;
        settingsService = _settingsService_;
        gamificationService = _gamificationService_;
        generateWorkflowVersionHash = _generateWorkflowVersionHash_;

        spyOn(blocklyConfigService, 'updateBlocklyIdMap').and.callThrough();
        spyOn(blockly.Xml, 'domToWorkspace').and.callThrough();
        spyOn(blockly.Xml, 'textToDom').and.callThrough();
        spyOn(blockly.JavaScript, 'workspaceToCode').and.callThrough();
        spyOn(metricIdGeneratorService, 'getNewExecutionId').and.returnValue($q.resolve(42));
        spyOn(metricService, 'record').and.callThrough();
        spyOn(metricService, 'recordValue').and.callThrough();
        recordingEnabledSpy = spyOnProperty(metricService, 'recordingEnabled').and.returnValue(false);
    }));

    describe('executionComponent controller', function () {
        var $scope;
        var executionComponentCtrl;

        function taskDone() {
            executionComponentCtrl.selectCheck();
            $scope.$apply();
        }

        function sleepTimeOver() {
            executionComponentCtrl.sleepTimeOver();
            $scope.$apply();
        }

        function miniTaskDone(num) {
            var flows = executionComponentCtrl.getCurrentParallelFlows();
            flows[num].getCurrent().done(flows[num]);
        }

        function selectYes() {
            executionComponentCtrl.selectYes();
            $scope.$apply();
        }

        function selectNo() {
            executionComponentCtrl.selectNo();
            $scope.$apply();
        }

        function constructExecutionComponent() {
            $scope = $rootScope.$new();
            spyOn($scope, '$on').and.callThrough();
            executionComponentCtrl = $componentController('executionComponent', {$scope: $scope}, {workflow: workflowSingleTask, onWorkflowFinishClick: function() {}});
        }

        function initExecutionComponent() {
            executionComponentCtrl.$onInit();
            $scope.$apply();
        }

        function newExecutionComponent() {
            constructExecutionComponent();
            initExecutionComponent();
        }

        function newExecutionComponentAndVerify() {
            constructExecutionComponent();
            expect(blocklyConfigService.updateBlocklyIdMap).not.toHaveBeenCalled();
            expect(blockly.Xml.domToWorkspace).not.toHaveBeenCalled();
            expect(blockly.JavaScript.workspaceToCode).not.toHaveBeenCalled();
            expect(blockly.Xml.textToDom).not.toHaveBeenCalled();

            initExecutionComponent();
            expect(blockly.Xml.domToWorkspace).toHaveBeenCalledTimes(1);
            expect(blockly.JavaScript.workspaceToCode).toHaveBeenCalledTimes(1);
            expect(blockly.Xml.textToDom).toHaveBeenCalledTimes(1);
            expect(blocklyConfigService.updateBlocklyIdMap).toHaveBeenCalledTimes(1);
            expect(blocklyConfigService.updateBlocklyIdMap).toHaveBeenCalledWith(blocklyWorkspace);
            expect(blockly.Xml.domToWorkspace).toHaveBeenCalledBefore(blocklyConfigService.updateBlocklyIdMap);
            expect(blocklyConfigService.updateBlocklyIdMap).toHaveBeenCalledBefore(blockly.JavaScript.workspaceToCode);
        }

        describe('properties and methods', function () {
            beforeEach(function () {
                newExecutionComponentAndVerify();
            });

            it('controller should be defined', function() {
                expect(executionComponentCtrl).toBeDefined();
                expect(executionComponentCtrl.workflow).toBeDefined();
                expect(executionComponentCtrl.onWorkflowFinishClick).toBeDefined();
            });

            it('should have a method selectParallelMiniLabel', function() {
                expect(executionComponentCtrl.selectParallelMiniLabel).toBeDefined();
            });
            it('should have a method selectParallelTitle', function() {
                expect(executionComponentCtrl.selectParallelTitle).toBeDefined();
            });

            it('should have a property "workflowExecution"', function() {
                expect(executionComponentCtrl.workflowExecution).toBeDefined();
            });

            it('should have a method "getCurrentBlockImageHash"', function() {
                expect(executionComponentCtrl.getCurrentBlockImageHash).toBeDefined();
            });
        });

        describe('functional behaviour', function() {

            describe('init', function () {
                beforeEach(function () {
                    newExecutionComponentAndVerify();
                });

                it('should assign a new executionId on init', function() {
                    recordingEnabledSpy.and.returnValue(true);
                    var expectedExecutionIds = [0, 1, 2, 4, 5, 6, 10, 12];
                    var idPromises = expectedExecutionIds.map($q.resolve);
                    metricIdGeneratorService.getNewExecutionId.calls.reset();
                    metricIdGeneratorService.getNewExecutionId.and.returnValues.apply(null, idPromises);
                    var otherWorkflow = workflowImmediateFinish;
                    for (var i = 0; i < expectedExecutionIds.length; ++i) {
                        // swap workflows
                        [otherWorkflow, executionComponentCtrl.workflow] = [executionComponentCtrl.workflow, otherWorkflow];
                        $scope.$apply();
                        expect(executionComponentCtrl.executionId).toBe(expectedExecutionIds[i]);
                        expect(metricIdGeneratorService.getNewExecutionId.calls.mostRecent().args)
                            .toEqual([executionComponentCtrl.workflow.uuid]);
                    }
                    expect(metricIdGeneratorService.getNewExecutionId).toHaveBeenCalledTimes(expectedExecutionIds.length);
                });
                it('should assign default executionId always on init, if metrics are disabled (by MetricService)', function () {
                    recordingEnabledSpy.and.returnValue(false);
                    metricIdGeneratorService.getNewExecutionId.calls.reset();
                    let otherWorkflow = workflowImmediateFinish;
                    for (let i = 0; i < 10; ++i) {
                        // swap workflows
                        [otherWorkflow, executionComponentCtrl.workflow] = [executionComponentCtrl.workflow, otherWorkflow];
                        $scope.$apply();
                        expect(executionComponentCtrl.executionId).toBe(-1);
                        expect(metricIdGeneratorService.getNewExecutionId).not.toHaveBeenCalled();
                    }
                    expect(metricIdGeneratorService.getNewExecutionId).toHaveBeenCalledTimes(0);
                });
                it('should assign default executionId always on init, if metrics are disabled (executionComponent)', function () {
                    recordingEnabledSpy.and.returnValue(true);
                    executionComponentCtrl.metricsDisabled = true;
                    metricIdGeneratorService.getNewExecutionId.calls.reset();
                    let otherWorkflow = workflowImmediateFinish;
                    for (let i = 0; i < 10; ++i) {
                        // swap workflows
                        [otherWorkflow, executionComponentCtrl.workflow] = [executionComponentCtrl.workflow, otherWorkflow];
                        $scope.$apply();
                        expect(executionComponentCtrl.executionId).toBe(-1);
                        expect(metricIdGeneratorService.getNewExecutionId).not.toHaveBeenCalled();
                    }
                    expect(metricIdGeneratorService.getNewExecutionId).toHaveBeenCalledTimes(0);
                });
                it('should register event listener for "executionCountdownEvent" on $scope', function() {
                    constructExecutionComponent();
                    spyOn($rootScope, '$on');
                    expect($scope.$on).toHaveBeenCalledWith('executionCountdownEvent', jasmine.any(Function));
                    expect($rootScope.$on).not.toHaveBeenCalledWith('executionCountdownEvent', jasmine.any(Function));
                });
            });

            var scopeApplyWithUndefinedWorkflow = function () {
                expect(function () {
                    $scope.$apply();
                }).toThrowError(/Workflow to execute is undefined/);
            };
            var scopeApplyWithInvalidWorkflow = function () {
                expect(function () {
                    $scope.$apply();
                }).toThrowError(/Error while parsing Blockly XML/);
            };
            describe('Metrics', function() {
                /* TODO: recordPoint test cases
                 *       - [ ] workflowStart
                 *          - [✓] POS: component initialization with valid workflow
                 *          - [✓] NEG: component initialization with workflow = undefined
                 *          - [✓] NEG: component initialization with invalid workflow
                 *          - [✓] POS: workflow has changed
                 *       - [ ] workflowStart_ttsSpeed
                 *          - [✓] POS: component initialization with valid workflow
                 *          - [✓] NEG: component initialization with workflow = undefined
                 *          - [✓] NEG: component initialization with invalid workflow
                 *          - [✓] POS: workflow has changed
                 *       - [ ] workflowAbort
                 *          - [✓] POS: component destruction with valid workflow
                 *          - [✓] NEG: component destruction with workflow = undefined
                 *          - [✓] NEG: component destruction with invalid workflow
                 *          - [✓] NEG: workflow is already finished (from beginning)
                 *          - [✓] NEG: workflow is already finished (after interaction)
                 *          - [ ] POS: ??? workflow has changed (not finished yet). Does this happen?
                 *       - [ ] workflowAbort_task
                 *          - [✓] POS: component destruction with valid workflow task 1
                 *          - [✓] POS: component destruction with valid workflow task N
                 *          - [✓] NEG: component destruction with workflow = undefined
                 *          - [✓] NEG: component destruction with invalid workflow
                 *          - [✓] NEG: workflow is already finished (from beginning)
                 *          - [✓] NEG: workflow is already finished (after interaction)
                 *          - [ ] POS: ??? workflow has changed (not finished yet). Does this happen?
                 *       - [ ] workflowAbort_withTTS
                 *          - TTS enabled
                 *              - [✓] POS: component destruction with valid workflow
                 *              - [✓] NEG: component destruction with workflow = undefined
                 *              - [✓] NEG: component destruction with invalid workflow
                 *              - [✓] NEG: workflow is already finished (from beginning)
                 *              - [✓] NEG: workflow is already finished (after interaction)
                 *         - TTS disabled
                 *              - [✓] NEG: component destruction with valid workflow
                 *       - [ ] workflowAbort_withoutTTS
                 *          - TTS disabled
                 *              - [✓] POS: component destruction with valid workflow
                 *              - [✓] NEG: component destruction with workflow = undefined
                 *              - [✓] NEG: component destruction with invalid workflow
                 *              - [✓] NEG: workflow is already finished (from beginning)
                 *              - [✓] NEG: workflow is already finished (after interaction)
                 *         - TTS enabled
                 *              - [✓] NEG: component destruction with valid workflow
                 *       - [ ] workflowEnd
                 *          - [✓] POS: workflow is finished (from beginning)
                 *          - [✓] POS: workflow is finished (after interaction)
                 *          - [✓] NEG: workflow is still running
                 *          - [✓] NEG: component is destroyed
                 *          - [✓] NEG: workflow = undefined
                 *          - [✓] NEG: workflow is invalid
                 *       - [ ] workflowEnd_withTTS
                 *          - TTS enabled
                 *              - [✓] POS: workflow is finished (from beginning)
                 *              - [✓] POS: workflow is finished (after interaction)
                 *              - [✓] NEG: workflow is still running
                 *              - [✓] NEG: component is destroyed
                 *              - [✓] NEG: workflow = undefined
                 *              - [✓] NEG: workflow is invalid
                 *          - TTS disabled
                 *              - [✓] NEG: workflow is finished (from beginning)
                 *              - [✓] NEG: workflow is finished (after interaction)
                 *              - [✓] NEG: component is destroyed
                 *       - [ ] workflowEnd_withoutTTS
                 *          - TTS disabled
                 *              - [✓] POS: workflow is finished (from beginning)
                 *              - [✓] POS: workflow is finished (after interaction)
                 *              - [✓] NEG: workflow is still running
                 *              - [✓] NEG: component is destroyed
                 *              - [✓] NEG: workflow = undefined
                 *              - [✓] NEG: workflow is invalid
                 *          - TTS enabled
                 *              - [✓] NEG: workflow is finished (from beginning)
                 *              - [✓] NEG: workflow is finished (after interaction)
                 *              - [✓] NEG: component is destroyed
                 *      - [ ] notificationReminder
                 *          - [✓] POS: executionTimerEvent occurs (task 1)
                 *          - [✓] POS: executionTimerEvent occurs (task N)
                 *          - [✓] NEG: executionTimerEvent does not occur during execution
                 *       - [ ] reminderAccept
                 *          - [✓] POS: executionComponent.reminderConfirmed occurs
                 *       - [ ] blockAccept
                 *          - [✓] POS: Simple task is finished
                 *          - [✓] POS: If condition is answered with yes
                 *          - [✓] POS: If condition is answered with no
                 *          - [✓] POS: While condition is answered with yes
                 *          - [✓] POS: While condition is answered with no
                 *          - [ ] ???: Parallel block with 0 tasks is finished
                 *          - [✓] POS: Parallel block with 1/1 tasks is finished
                 *          - [✓] POS: Parallel block with 2/(2 of 3) tasks is finished
                 *          - [✓] NEG: Parallel block with 1,2/(3 of 3) tasks is not finished yet
                 *          - [✓] NEG: TimerSleepBlock is finished
                 *          - [✓] NEG: First task in the workflow is not finished yet
                 *       - [ ] task(Start|End)_(<options>)
                 *          - [✓] POS: when task of certain kind starts/finishes
                 *          - [✓] NEG: not for if-conditions
                 *          - [✓] NEG: not for while-conditions
                 *          - [✓] NEG: not for parallel blocks
                 *          - [✓] NEG: not for timer sleep blocks
                 *       - [ ] blockEnter
                 *          - [✓] POS: when block of type (simple, conditional, parallel, timer) is entered because workflow starts
                 *          - [✓] POS: when block is entered and entered block is of type simple task
                 *          - [✓] POS: when block is entered and entered block is of type conditional
                 *          - [✓] POS: when block is entered and entered block is of type parallel
                 *          - [✓] POS: when block is entered and entered block is of type timer (sleep)
                 *          - [✓] NEG: when block is entered and entered block is of type repeat
                 *          - [✓] NEG: when block is left and next block is not of type (simple, conditional, parallel, timer)
                 *          - [✓] NEG: when workflow is changed and workflow has no blocks
                 *          - [✓] NEG: when workflow is undefined
                 *          - [✓] NEG: when workflow is invalid
                 *       - [ ] blockLeave
                 *          - [✓] POS: when block of type (simple, conditional, parallel, timer) is left because workflow finishes
                 *          - [✓] POS: when block is left and left block is of type simple task
                 *          - [✓] POS: when block is left and left block is of type conditional
                 *          - [✓] POS: when block is left and left block is of type parallel
                 *          - [✓] POS: when parallel block is left, only once per parallel block
                 *          - [✓] POS: when block is left and left block is of type timer (sleep)
                 *          - [✓] NEG: when block is left and left block is of type repeat
                 *          - [✓] NEG: when block of type repeat is left because workflow finishes
                 *          - [✓] NEG: when block is entered and previous block is not of type (simple, conditional, parallel, timer)
                 *          - [✓] NEG: when workflow is changed and workflow has no blocks
                 *          - [✓] NEG: when workflow is undefined
                 *          - [✓] NEG: when workflow is invalid
                 *
                 *

                 */

                beforeEach(function() {
                    recordingEnabledSpy.and.returnValue(true);
                    newExecutionComponentAndVerify();
                })

                // TODO: Reduce code duplication in tests

                function getRecordPointAssignmentMatcherForWorkflow(workflow) {
                    return jasmine.objectContaining({
                        workflowId: workflow.uuid,
                        workflowVersionId: generateWorkflowVersionHash(workflow.name, workflow.xmlHash),
                        executionId: 42
                    });
                }

                function getRecordPointAssignmentMatcherForWorkflowAndTask(workflow, taskId) {
                    return jasmine.objectContaining({
                        workflowId: workflow.uuid,
                        workflowVersionId: generateWorkflowVersionHash(workflow.name, workflow.xmlHash),
                        executionId: 42,
                        taskId: taskId
                    });
                }

                function recordPointMatches(rp, matcher) {
                    return matcher instanceof RegExp ? matcher.test(rp) : rp === matcher;
                }

                function getRecordCallsFor(recordPoint) {
                    return metricService.record.calls.allArgs().filter(function (args) {
                        return args.length > 0 && recordPointMatches(args[0], recordPoint);
                    });
                }

                function getRecordValueCallsFor(recordPoint) {
                    return metricService.recordValue.calls.allArgs().filter(function (args) {
                        return args.length > 0 && recordPointMatches(args[0], recordPoint);
                    });
                }

                function getRecordPointRecordTimesCalled(recordPoint) {
                    return getRecordCallsFor(recordPoint).length;
                }

                function getRecordPointRecordValueTimesCalled(recordPoint) {
                    return getRecordValueCallsFor(recordPoint).length;
                }

                describe('recordPoint `workflowStart`', function () {
                    var recordPoint = 'workflowStart';
                    it('should be recorded when component is initialized with workflow', function () {
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask)
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & component is initialized with workflow', function () {
                        metricService.record.calls.reset();
                        constructExecutionComponent();
                        executionComponentCtrl.metricsDisabled = true;
                        initExecutionComponent();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow is undefined', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = undefined;
                        scopeApplyWithUndefinedWorkflow();
                        // TODO: is a changed workflow considered as aborted execution? Does this even happen?
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow is invalid', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowInvalid;
                        scopeApplyWithInvalidWorkflow();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should be recorded if workflow is changed', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowImmediateFinish)
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & if workflow is changed', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                });
                describe('recordPoint `workflowStart_ttsSpeed`', function () {
                    var recordPoint = 'workflowStart_ttsSpeed';
                    it('should be recorded when component is initialized with workflow and TTS enabled', function () {
                        settingsService.ttsEnabled = true;
                        metricService.recordValue.calls.reset();
                        newExecutionComponent();
                        expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask),
                            settingsService.currentTTSSpeedIndex
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & component is initialized with workflow and TTS enabled', function() {
                        settingsService.ttsEnabled = true;
                        metricService.recordValue.calls.reset();
                        constructExecutionComponent();
                        executionComponentCtrl.metricsDisabled = true;
                        initExecutionComponent();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toEqual(0);
                    });
                    it('should not be recorded when component is initialized with workflow and TTS disabled', function () {
                        settingsService.ttsEnabled = false;
                        metricService.recordValue.calls.reset();
                        newExecutionComponent();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toEqual(0);
                    });
                    it('should not be recorded if workflow is undefined', function () {
                        metricService.recordValue.calls.reset();
                        executionComponentCtrl.workflow = undefined;
                        scopeApplyWithUndefinedWorkflow();
                        // TODO: is a changed workflow considered as aborted execution? Does this even happen?
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow is invalid', function () {
                        metricService.recordValue.calls.reset();
                        executionComponentCtrl.workflow = workflowInvalid;
                        scopeApplyWithInvalidWorkflow();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should be recorded when workflow is changed and TTS is enabled', function () {
                        metricService.recordValue.calls.reset();
                        settingsService.ttsEnabled = true;
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowImmediateFinish),
                            settingsService.currentTTSSpeedIndex
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & workflow is changed and TTS is enabled', function () {
                        metricService.recordValue.calls.reset();
                        settingsService.ttsEnabled = true;
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded when workflow is changed and TTS is disabled', function () {
                        metricService.recordValue.calls.reset();
                        settingsService.ttsEnabled = false;
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toEqual(0);
                    });
                });
                describe('recordPoint `workflowAbort`', function () {
                    var recordPoint = 'workflowAbort';
                    it('should be recorded when workflow is aborted by component destruction', function () {
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        executionComponentCtrl.destroy();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask)
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & workflow is aborted by component destruction', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded on destroy when workflow is undefined', function () {
                        executionComponentCtrl.workflow = undefined;
                        scopeApplyWithUndefinedWorkflow();
                        metricService.record.calls.reset();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded on destroy if workflow is invalid', function () {
                        executionComponentCtrl.workflow = workflowInvalid;
                        scopeApplyWithInvalidWorkflow();
                        metricService.record.calls.reset();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded on destroy if the workflow is already finished (finished on start)', function () {
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        metricService.record.calls.reset();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded on destroy if the workflow is already finished (finished after a task)', function () {
                        taskDone();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                });
                describe('recordPoint `workflowAbort_task`', function () {
                    var recordPoint = 'workflowAbort_task';
                    it('should be recorded when workflow is aborted by component destruction (task 1)', function () {
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                        executionComponentCtrl.destroy();
                        expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask),
                            1
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & workflow is aborted by component destruction (task 1)', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should be recorded when workflow is aborted by component destruction (task 2/3)', function () {
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        taskDone();
                        executionComponentCtrl.destroy();
                        expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowMulti),
                            3
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & workflow is aborted by component destruction (task 2/3)', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        taskDone();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should be recorded when workflow is aborted by component destruction (task 2/3 loop 2)', function () {
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        taskDone();
                        taskDone();
                        executionComponentCtrl.destroy();
                        expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowMulti),
                            3
                        ]]);
                    });
                    it('should be recorded when workflow is aborted by component destruction (task 4)', function () {
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        taskDone();
                        taskDone();
                        taskDone();
                        executionComponentCtrl.destroy();
                        expect(getRecordValueCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowMulti),
                            4
                        ]]);
                    });
                    it('should not be recorded on destroy when workflow is undefined', function () {
                        executionComponentCtrl.workflow = undefined;
                        scopeApplyWithUndefinedWorkflow();
                        metricService.record.calls.reset();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded on destroy if workflow is invalid', function () {
                        executionComponentCtrl.workflow = workflowInvalid;
                        scopeApplyWithInvalidWorkflow();
                        metricService.record.calls.reset();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded on destroy if the workflow is already finished (finished on start)', function () {
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        metricService.record.calls.reset();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded on destroy if the workflow is already finished (finished after a task)', function () {
                        taskDone();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                });
                describe('recordPoint `workflowAbort_withTTS`', function () {
                    var recordPoint = 'workflowAbort_withTTS';
                    describe('TTS enabled', function () {
                        beforeEach(function () {
                            settingsService.ttsEnabled = true;
                        });
                        it('should be recorded when workflow is aborted by component destruction', function () {
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            executionComponentCtrl.destroy();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask)
                            ]]);
                        });
                        it('should not be recorded when metricsDisabled=true & workflow is aborted by component destruction', function () {
                            executionComponentCtrl.metricsDisabled = true;
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy when workflow is undefined', function () {
                            executionComponentCtrl.workflow = undefined;
                            scopeApplyWithUndefinedWorkflow();
                            metricService.record.calls.reset();
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy if workflow is invalid', function () {
                            executionComponentCtrl.workflow = workflowInvalid;
                            scopeApplyWithInvalidWorkflow();
                            metricService.record.calls.reset();
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy if the workflow is already finished (finished on start)', function () {
                            executionComponentCtrl.workflow = workflowImmediateFinish;
                            $scope.$apply();
                            metricService.record.calls.reset();
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy if the workflow is already finished (finished after a task)', function () {
                            taskDone();
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                    describe('TTS disabled', function () {
                        beforeEach(function () {
                            settingsService.ttsEnabled = false;
                        });
                        it('should not be recorded when workflow is aborted by component destruction', function () {
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                });
                describe('recordPoint `workflowAbort_withoutTTS`', function () {
                    var recordPoint = 'workflowAbort_withoutTTS';
                    describe('TTS disabled', function () {
                        beforeEach(function () {
                            settingsService.ttsEnabled = false;
                        });
                        it('should be recorded when workflow is aborted by component destruction', function () {
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            executionComponentCtrl.destroy();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask)
                            ]]);
                        });
                        it('should not be recorded when metricsDisabled=true & workflow is aborted by component destruction', function () {
                            executionComponentCtrl.metricsDisabled = true;
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy when workflow is undefined', function () {
                            executionComponentCtrl.workflow = undefined;
                            scopeApplyWithUndefinedWorkflow();
                            metricService.record.calls.reset();
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy if workflow is invalid', function () {
                            executionComponentCtrl.workflow = workflowInvalid;
                            scopeApplyWithInvalidWorkflow();
                            metricService.record.calls.reset();
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy if the workflow is already finished (finished on start)', function () {
                            executionComponentCtrl.workflow = workflowImmediateFinish;
                            $scope.$apply();
                            metricService.record.calls.reset();
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy if the workflow is already finished (finished after a task)', function () {
                            taskDone();
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                    describe('TTS enabled', function () {
                        beforeEach(function () {
                            settingsService.ttsEnabled = true;
                        });
                        it('should not be recorded when workflow is aborted by component destruction', function () {
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                            executionComponentCtrl.destroy();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                });
                describe('recordPoint `workflowEnd`', function() {
                    var recordPoint = 'workflowEnd';
                    it('should be recorded if workflow is finished from beginning', function() {
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowImmediateFinish)
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & workflow is finished from beginning', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should be recorded if workflow is finished after interaction', function() {
                        executionComponentCtrl.workflow = workflowSingleTask;
                        $scope.$apply();
                        taskDone();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask)
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & workflow is finished after interaction', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowSingleTask;
                        $scope.$apply();
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow is still running', function() {
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        taskDone();
                        taskDone();
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow = undefined', function () {
                        executionComponentCtrl.workflow = undefined;
                        scopeApplyWithUndefinedWorkflow();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow is invalid', function () {
                        executionComponentCtrl.workflow = workflowInvalid;
                        scopeApplyWithInvalidWorkflow();
                        expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded on destroy', function () {
                        executionComponentCtrl.destroy();
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        console.log(jasmine.pp(getRecordCallsFor(recordPoint)));
                    });
                });
                describe('recordPoint `workflowEnd_withTTS`', function() {
                    var recordPoint = 'workflowEnd_withTTS';
                    describe('TTS enabled', function() {
                        beforeEach(function() {
                            settingsService.ttsEnabled = true;
                        });
                        it('should be recorded if workflow is finished from beginning', function() {
                            executionComponentCtrl.workflow = workflowImmediateFinish;
                            $scope.$apply();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcherForWorkflow(workflowImmediateFinish)
                            ]]);
                        });
                        it('should not be recorded when metricsDisabled=true & workflow is finished from beginning', function () {
                            executionComponentCtrl.metricsDisabled = true;
                            executionComponentCtrl.workflow = workflowImmediateFinish;
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should be recorded if workflow is finished after interaction', function() {
                            executionComponentCtrl.workflow = workflowSingleTask;
                            $scope.$apply();
                            taskDone();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask)
                            ]]);
                        });
                        it('should not be recorded when metricsDisabled=true & workflow is finished after interaction', function () {
                            executionComponentCtrl.metricsDisabled = true;
                            executionComponentCtrl.workflow = workflowSingleTask;
                            $scope.$apply();
                            taskDone();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded if workflow is still running', function() {
                            executionComponentCtrl.workflow = workflowMulti;
                            $scope.$apply();
                            taskDone();
                            taskDone();
                            taskDone();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded if workflow = undefined', function () {
                            executionComponentCtrl.workflow = undefined;
                            scopeApplyWithUndefinedWorkflow();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded if workflow is invalid', function () {
                            executionComponentCtrl.workflow = workflowInvalid;
                            scopeApplyWithInvalidWorkflow();
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy', function () {
                            executionComponentCtrl.destroy();
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                    describe('TTS disabled', function() {
                        beforeEach(function() {
                            settingsService.ttsEnabled = false;
                        });
                        it('should not be recorded if workflow is finished from beginning', function() {
                            executionComponentCtrl.workflow = workflowImmediateFinish;
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded if workflow is finished after interaction', function() {
                            executionComponentCtrl.workflow = workflowSingleTask;
                            $scope.$apply();
                            taskDone();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy', function () {
                            executionComponentCtrl.destroy();
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                });
                describe('recordPoint `workflowEnd_withoutTTS`', function() {
                    var recordPoint = 'workflowEnd_withoutTTS';
                    describe('TTS disabled', function() {
                        beforeEach(function() {
                            settingsService.ttsDisabled = true;
                        });
                        it('should be recorded if workflow is finished from beginning', function() {
                            executionComponentCtrl.workflow = workflowImmediateFinish;
                            $scope.$apply();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcherForWorkflow(workflowImmediateFinish)
                            ]]);
                        });
                        it('should not be recorded when metricsDisabled=true & workflow is finished from beginning', function () {
                            executionComponentCtrl.metricsDisabled = true;
                            executionComponentCtrl.workflow = workflowImmediateFinish;
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should be recorded if workflow is finished after interaction', function() {
                            executionComponentCtrl.workflow = workflowSingleTask;
                            $scope.$apply();
                            taskDone();
                            expect(getRecordCallsFor(recordPoint)).toEqual([[
                                recordPoint,
                                getRecordPointAssignmentMatcherForWorkflow(workflowSingleTask)
                            ]]);
                        });
                        it('should not be recorded when metricsDisabled=true & workflow is finished after interaction', function () {
                            executionComponentCtrl.metricsDisabled = true;
                            executionComponentCtrl.workflow = workflowSingleTask;
                            $scope.$apply();
                            taskDone();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded if workflow is still running', function() {
                            executionComponentCtrl.workflow = workflowMulti;
                            $scope.$apply();
                            taskDone();
                            taskDone();
                            taskDone();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded if workflow = undefined', function () {
                            executionComponentCtrl.workflow = undefined;
                            scopeApplyWithUndefinedWorkflow();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded if workflow is invalid', function () {
                            executionComponentCtrl.workflow = workflowInvalid;
                            scopeApplyWithInvalidWorkflow();
                            expect(getRecordPointRecordValueTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy', function () {
                            executionComponentCtrl.destroy();
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                    describe('TTS enabled', function() {
                        beforeEach(function() {
                            settingsService.ttsEnabled = true;
                        });
                        it('should not be recorded if workflow is finished from beginning', function() {
                            executionComponentCtrl.workflow = workflowImmediateFinish;
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded if workflow is finished after interaction', function() {
                            executionComponentCtrl.workflow = workflowSingleTask;
                            $scope.$apply();
                            taskDone();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                        it('should not be recorded on destroy', function () {
                            executionComponentCtrl.destroy();
                            $scope.$apply();
                            expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        });
                    });
                });
                describe('recordPoint `notificationReminder`', function() {
                    var recordPoint = 'notificationReminder';
                    it('should be recorded when `executionTimerEvent` event occurs', function() {
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionTimerEvent');
                        var expectedCall = [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowSingleTask, 1)
                        ];
                        expect(getRecordCallsFor(recordPoint)).toEqual(Array(1).fill(expectedCall));
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                        $rootScope.$broadcast('executionTimerEvent');
                        expect(getRecordCallsFor(recordPoint)).toEqual(Array(2).fill(expectedCall));
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(2);
                        $rootScope.$broadcast('executionTimerEvent');
                        expect(getRecordCallsFor(recordPoint)).toEqual(Array(3).fill(expectedCall));
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(3);
                        $rootScope.$broadcast('executionTimerEvent');
                        expect(getRecordCallsFor(recordPoint)).toEqual(Array(4).fill(expectedCall));
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(4);
                    });
                    it('should not be recorded when metricsDisabled=true & `executionTimerEvent` event occurs', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        $rootScope.$broadcast('executionTimerEvent');
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should be recorded when `executionTimerEvent` event occurs (multiple tasks, multiple times)', function () {
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionTimerEvent');
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ]]);
                        $rootScope.$broadcast('executionTimerEvent');
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ]]);
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(2);
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(2);
                        $rootScope.$broadcast('executionTimerEvent');
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 3)
                        ]]);
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(3);
                        $rootScope.$broadcast('executionTimerEvent');
                        $rootScope.$broadcast('executionTimerEvent');
                        $rootScope.$broadcast('executionTimerEvent');
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 3)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 4)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 4)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 4)
                        ]]);
                    });
                    it('should not be recorded when `executionTimerEvent` event does not occur', function () {
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        taskDone();
                        taskDone();
                        taskDone();
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        executionComponentCtrl.workflow = workflowSingleTask;
                        $scope.$apply();
                        executionComponentCtrl.destroy();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                });
                describe('recordPoint `reminderAccept`', function() {
                    var recordPoint = 'reminderAccept';
                    const eventName = 'executionComponent.reminderConfirmed';
                    it('should be recorded when `executionComponent.reminderConfirmed` occurs', function () {
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        taskDone();
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast(eventName);
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 3)
                        ]]);
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                        $rootScope.$broadcast(eventName);
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 3)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 4)
                        ]]);
                        $rootScope.$broadcast(eventName);
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 3)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 4)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 4)
                        ]]);
                    });
                    it('should not be recorded when metricsDisabled=true & `executionComponent.reminderConfirmed` occurs', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        $rootScope.$broadcast(eventName);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                });
                describe('recordPoint `blockAccept_withAcceptedReminder`', function () {
                    var recordPoint = 'blockAccept_withAcceptedReminder';
                    it('should be recorded when a simple task is finished and reminder occurred in it', function() {
                        executionComponentCtrl.workflow = workflowSingleTask;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                    });
                    it('should not be recorded when metricsDisabled=true & a simple task is finished and reminder occurred in it', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowSingleTask;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded when a simple task is finished without reminder', function() {
                        executionComponentCtrl.workflow = workflowSingleTask;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should be recorded when if-condition is answered with yes and reminder occurred in it', function() {
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        selectYes();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(2);
                    });
                    it('should not be recorded when metricsDisabled=true & if-condition is answered with yes and reminder occurred in it', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        selectYes()
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded when if-condition is answered with yes without reminder', function() {
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        selectYes();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                    });
                    it('should be recorded when if-condition is answered with no and reminder occurred in it', function() {
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        selectNo();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(2);
                    });
                    it('should not be recorded when metricsDisabled=true & if-condition is answered with no and reminder occurred in it', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        selectNo();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded when if-condition is answered with no without reminder', function() {
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();;
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        selectNo();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                    });
                    it('should be recorded when while-condition is answered with yes and reminder occurred in it', function() {
                        executionComponentCtrl.workflow = workflowWhileCondition;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        selectYes();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(2);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        selectYes();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(3);
                    });
                    it('should be recorded when while-condition is answered with yes and only if a reminder occurred in it', function() {
                        executionComponentCtrl.workflow = workflowWhileCondition;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        selectYes();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        selectYes();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                    });
                    it('should be recorded when while-condition is answered with no and reminder occurred in it', function() {
                        executionComponentCtrl.workflow = workflowWhileCondition;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        selectNo();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                    });
                    it('should be recorded when parallel block (2/3) is finished and reminder occurred in it', function () {
                        executionComponentCtrl.workflow = workflowParallel2Of3;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                    });
                    it('should not be recorded when metricsDisabled=true & parallel block (2/3) is finished and reminder occurred in it', function () {
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowParallel2Of3;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        miniTaskDone(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded when parallel block (2/3) is finished without reminder', function () {
                        executionComponentCtrl.workflow = workflowParallel2Of3;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should be recorded when parallel block (1/1) is finished and reminder occurred in it', function () {
                        executionComponentCtrl.workflow = workflowParallel1Of1;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                    });
                    it('should not be recorded before parallel block (3/3) is finished and reminder occurred in it', function () {
                        executionComponentCtrl.workflow = workflowParallel3Of3;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(1);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(1);
                    });
                    it('should not be recorded when TimerSleep block finishes', function() {
                        executionComponentCtrl.workflow = workflowTimerSleep;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        sleepTimeOver();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded when TimerSleep block finishes with reminder', function() {
                        executionComponentCtrl.workflow = workflowTimerSleep;
                        $scope.$apply();
                        $rootScope.$broadcast('executionComponent.reminderConfirmed');
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        sleepTimeOver();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                });
                describe('recordPoints `task(Start|End)_(...)', function() {
                    function testTaskStartEnd(options, firstTaskInWorkflow) {
                        var taskEndTimesBefore = firstTaskInWorkflow ? 0 : 1;
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(1);
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(taskEndTimesBefore);
                        expect(getRecordPointRecordTimesCalled(`taskStart_(${options})`)).toBe(1);
                        metricService.record.calls.reset();
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(1);
                        expect(getRecordPointRecordTimesCalled(`taskEnd_(${options})`)).toBe(1);
                    }
                    function testTaskStartEnd_metricsDisabled(options) {
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(`taskStart_(${options})`)).toBe(0);
                        taskDone();
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(`taskEnd_(${options})`)).toBe(0);
                    }

                    it('should be recorded when task of certain kind starts/finishes', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowTaskKinds;
                        settingsService.ttsEnabled = false;
                        $scope.$apply();
                        testTaskStartEnd('-Image,-Text,-TTS', true);
                        testTaskStartEnd('+Image,-Text,-TTS');
                        testTaskStartEnd('-Image,+Text,-TTS');
                        testTaskStartEnd('+Image,+Text,-TTS');

                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        executionComponentCtrl.workflow = workflowTaskKinds;
                        settingsService.ttsEnabled = true;
                        $scope.$apply();
                        testTaskStartEnd('-Image,-Text,+TTS', true);
                        testTaskStartEnd('+Image,-Text,+TTS');
                        testTaskStartEnd('-Image,+Text,+TTS');
                        testTaskStartEnd('+Image,+Text,+TTS');
                    });
                    it('should not be recorded when metricsDisabled=true & task of certain kind starts/finishes', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.metricsDisabled = true;
                        executionComponentCtrl.workflow = workflowTaskKinds;
                        settingsService.ttsEnabled = false;
                        $scope.$apply();
                        testTaskStartEnd_metricsDisabled('-Image,-Text,-TTS');
                        testTaskStartEnd_metricsDisabled('+Image,-Text,-TTS');
                        testTaskStartEnd_metricsDisabled('-Image,+Text,-TTS');
                        testTaskStartEnd_metricsDisabled('+Image,+Text,-TTS');
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        executionComponentCtrl.workflow = workflowTaskKinds;
                        settingsService.ttsEnabled = true;
                        $scope.$apply();
                        testTaskStartEnd_metricsDisabled('-Image,-Text,+TTS');
                        testTaskStartEnd_metricsDisabled('+Image,-Text,+TTS');
                        testTaskStartEnd_metricsDisabled('-Image,+Text,+TTS');
                        testTaskStartEnd_metricsDisabled('+Image,+Text,+TTS');
                    });
                    it('should not be recorded for if-conditions', function() {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        selectYes();
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                    });
                    it('should not be recorded for while-conditions', function() {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowWhileCondition;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        selectNo();
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                    });
                    it('should not be recorded for parallel blocks', function() {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowParallel3Of3;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                    });
                    it('should not be recorded for timer sleep blocks', function() {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowTimerSleep;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                        sleepTimeOver();
                        expect(getRecordPointRecordTimesCalled(/taskStart_\(.*\)/)).toBe(0);
                        expect(getRecordPointRecordTimesCalled(/taskEnd_\(.*\)/)).toBe(0);
                    });
                });
                describe('recordPoint blockEnter', function () {
                    const recordPoint = 'blockEnter';
                    it('should be recorded when block of type simple is entered because workflow starts', function () {
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowSingleTask, 1)
                        ]]);
                    });
                    it('should be recorded when block of type question (if-condition) is entered because workflow starts', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowIfCondition, 1)
                        ]]);
                    });
                    it('should be recorded when block of type question (while-condition) is entered because workflow starts', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowWhileCondition;
                        $scope.$apply();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowWhileCondition, 1)
                        ]]);
                    });
                    it('should be recorded when block of type parallel is entered because workflow starts', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowParallel1Of1;
                        $scope.$apply();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowParallel1Of1, 1)
                        ]]);
                    });
                    it('should be recorded when block of type sleep is entered because workflow starts', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowTimerSleep;
                        $scope.$apply();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowTimerSleep, 1)
                        ]]);
                    });
                    it('should not be recorded when block of type repeat is entered because workflow starts', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowRepeatTimesEmpty;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow is undefined', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = undefined;
                        scopeApplyWithUndefinedWorkflow();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow is invalid', function () {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowInvalid;
                        scopeApplyWithInvalidWorkflow();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if block is left and next block is of type repeat', function() {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowMulti;
                        $scope.$apply();
                        // Enter: First task
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint, // First task
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ]]);
                        taskDone();
                        // Enter: Repeat block
                        // Enter: Task in repeat
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint, // First task
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 1)
                        ], [
                            recordPoint, // Task in repeat
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowMulti, 3)
                        ]]);
                    })
                    it('should not be recorded when workflow is changed and has no blocks', function() {
                        metricService.record.calls.reset();
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    // TODO: Add tests when metric recording (executionComponent) is disabled.
                });
                describe('recordPoint blockLeave', function () {
                    const recordPoint = 'blockLeave';
                    it('should be recorded when block of type simple is left because workflow finishes', function () {
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        taskDone();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowSingleTask, 1)
                        ]]);
                    });
                    it('should be recorded when block of type question (if-condition) is left', function () {
                        executionComponentCtrl.workflow = workflowIfCondition;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        selectYes();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowIfCondition, 1)
                        ]]);
                    });
                    it('should be recorded when block of type question (while-condition) is left', function () {
                        executionComponentCtrl.workflow = workflowWhileCondition;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        selectYes();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowWhileCondition, 1)
                        ]]);
                        taskDone();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowWhileCondition, 1)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowWhileCondition, 2)
                        ]]);
                        selectNo();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowWhileCondition, 1)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowWhileCondition, 2)
                        ], [
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowWhileCondition, 1)
                        ]]);
                    });
                    it('should be recorded when block of type parallel is left', function () {
                        executionComponentCtrl.workflow = workflowParallel1Of1;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowParallel1Of1, 1)
                        ]]);
                    });
                    it('should be recorded when parallel block is left, only once per parallel block', function () {
                        executionComponentCtrl.workflow = workflowParallel2Of3;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(0);
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        miniTaskDone(1);
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowParallel2Of3, 1)
                        ]]);
                    });
                    it('should be recorded when block of type sleep is left', function () {
                        executionComponentCtrl.workflow = workflowTimerSleep;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                        sleepTimeOver();
                        expect(getRecordCallsFor(recordPoint)).toEqual([[
                            recordPoint,
                            getRecordPointAssignmentMatcherForWorkflowAndTask(workflowTimerSleep, 1)
                        ]]);
                    });
                    it('should not be recorded when block of type repeat is left', function () {
                        executionComponentCtrl.workflow = workflowRepeatTimesEmpty;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded when block is entered and previous block is of type repeat', function () {
                        executionComponentCtrl.workflow = workflowRepeatTimesEmptyThenTask;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    })
                    it('should not be recorded if workflow is undefined', function () {
                        executionComponentCtrl.workflow = undefined;
                        scopeApplyWithUndefinedWorkflow();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded if workflow is invalid', function () {
                        executionComponentCtrl.workflow = workflowInvalid;
                        scopeApplyWithInvalidWorkflow();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    it('should not be recorded when workflow is changed and has no blocks', function() {
                        executionComponentCtrl.workflow = workflowImmediateFinish;
                        $scope.$apply();
                        expect(getRecordPointRecordTimesCalled(recordPoint)).toBe(0);
                    });
                    // TODO: Add tests when metric recording (executionComponent) is disabled.
                })
            });

            describe('with metrics disabled', function() {
                beforeEach(function () {
                    recordingEnabledSpy.and.returnValue(false);
                    newExecutionComponentAndVerify();
                });

                describe('getNextBlockText', function () {
                    it('should return empty string, if workflow is finished', function () {
                        workflowExecution.executionFinished = true;
                        expect(executionComponentCtrl.getNextBlockText()).toBe('');
                    });

                    it('should return "???" if current block is a condition block and workflow is not finished', function() {
                        spyOn(workflowExecution, 'getCurrent').and.returnValue({
                            isConditionBlock: function() {return true;},
                        });
                        expect(executionComponentCtrl.getNextBlockText()).toBe('???');
                    });

                    it('should return next text else', function() {
                        spyOn(workflowExecution, 'getCurrent').and.returnValue({
                            isConditionBlock: function() {return false;},
                        });
                        var expectedText = 'test next block';
                        spyOn(workflowExecution, 'getNext').and.returnValue({
                            getText: function() {
                                return expectedText;
                            }
                        });
                        expect(executionComponentCtrl.getNextBlockText()).toBe(expectedText);
                    });

                    it('should return "ENDE", if current & next are null and workflow not finished', function () {
                        spyOn(workflowExecution, 'getCurrent').and.returnValue(null);
                        spyOn(workflowExecution, 'getNext').and.returnValue(null);
                        expect(executionComponentCtrl.getNextBlockText()).toBe('ENDE');
                    });

                    it('should return "ENDE", if current is not a condition, next is null, and workflow not finished', function() {
                        spyOn(workflowExecution, 'getCurrent').and.returnValue({
                            isConditionBlock: function() {return false;},
                        });
                        spyOn(workflowExecution, 'getNext').and.returnValue(null);
                        expect(executionComponentCtrl.getNextBlockText()).toBe('ENDE');
                    });
                });

                describe('selectLabel', function() {
                    var $rootScope;
                    beforeEach(inject(function(_$rootScope_) {
                        $rootScope = _$rootScope_;
                    }));
                    it('should speak current block text, if clicked on block label', function() {
                        var deferred = $q.defer();
                        spyOn(ttsService, 'speak').and.returnValue(deferred.promise);
                        spyOn(executionComponentCtrl, 'getCurrentBlockText').and.returnValue('test text');
                        spyOn(executionComponentCtrl, 'isCurrentParallelBlock').and.returnValue(false);
                        executionComponentCtrl.selectLabel();
                        expect(ttsService.speak).toHaveBeenCalledWith('test text');
                    });
                });

                describe('getCurrentBlockImageHash', function() {
                    it("should return null, if currentBlock is null", function() {
                        spyOn(executionComponentCtrl, 'getCurrentBlock').and.returnValue(null);
                        expect(executionComponentCtrl.getCurrentBlockImageHash()).toBeNull();
                        expect(executionComponentCtrl.getCurrentBlock).toHaveBeenCalled();
                    });

                    it("should return hash, if currentBlock is not null", function() {
                        var currentBlock = {
                            getImageHash: function() {}
                        };
                        spyOn(currentBlock, 'getImageHash');

                        spyOn(executionComponentCtrl, 'getCurrentBlock').and.returnValue(currentBlock);
                        currentBlock.getImageHash.and.returnValue(null);
                        expect(executionComponentCtrl.getCurrentBlockImageHash()).toBeNull();
                        expect(executionComponentCtrl.getCurrentBlock).toHaveBeenCalledTimes(1);

                        currentBlock.getImageHash.and.returnValue("somehash");
                        expect(executionComponentCtrl.getCurrentBlockImageHash()).toBe("somehash");
                        expect(executionComponentCtrl.getCurrentBlock).toHaveBeenCalledTimes(2);
                    });
                });

                describe('getCurrentBlockSkipable', function() {
                    it('should return true, if sleepSkipable is true and current block is timer sleep', function() {
                        executionComponentCtrl.sleepSkipable = true;
                        spyOn(workflowExecution, 'getCurrent').and.returnValue({
                            isTimerSleepBlock: function() {return true;}
                        });
                        expect(executionComponentCtrl.getCurrentBlockSkipable()).toBe(true);
                    });
                    it('should return false, if sleepSkipable is false and current block is timer sleep', function() {
                        executionComponentCtrl.sleepSkipable = false;
                        spyOn(workflowExecution, 'getCurrent').and.returnValue({
                            isTimerSleepBlock: function() {return true;}
                        });
                        expect(executionComponentCtrl.getCurrentBlockSkipable()).toBe(false);
                    });
                    it('should return false, if sleepSkipable is true and current block is not timer sleep', function() {
                        executionComponentCtrl.sleepSkipable = true;
                        spyOn(workflowExecution, 'getCurrent').and.returnValue({
                            isTimerSleepBlock: function() {return false;}
                        });
                        expect(executionComponentCtrl.getCurrentBlockSkipable()).toBe(false);
                    });
                    it('should return false by default (with timer sleep block)', function() {
                        spyOn(workflowExecution, 'getCurrent').and.returnValue({
                            isTimerSleepBlock: function() {return true;}
                        });
                        expect(executionComponentCtrl.getCurrentBlockSkipable()).toBe(false);
                    });
                    it('should return false by default (without timer sleep block)', function() {
                        spyOn(workflowExecution, 'getCurrent').and.returnValue({
                            isTimerSleepBlock: function() {return false;}
                        });
                        expect(executionComponentCtrl.getCurrentBlockSkipable()).toBe(false);
                    });
                });

                describe('selectSkip', function() {
                    let currentBlockSpyObj;
                    let eventSpyObj;
                    beforeEach(function() {
                        currentBlockSpyObj = jasmine.createSpyObj('currentBlock', ['isTimerSleepBlock', 'forceFinish']);
                        eventSpyObj = jasmine.createSpyObj('event', ['stopPropagation']);
                        spyOn(workflowExecution, 'getCurrent').and.returnValue(currentBlockSpyObj);
                    });
                    it('should call forceFinish on the block, if sleepSkipable and is a timerSleepBlock', function () {
                        executionComponentCtrl.sleepSkipable = true;
                        currentBlockSpyObj.isTimerSleepBlock.and.returnValue(true);

                        executionComponentCtrl.selectSkip(eventSpyObj);
                        expect(eventSpyObj.stopPropagation).toHaveBeenCalledTimes(1);
                        expect(currentBlockSpyObj.forceFinish).toHaveBeenCalledTimes(1);
                    });
                    it('should call forceFinish on the block, if sleepSkipable and is a timerSleepBlock (no event)', function () {
                        executionComponentCtrl.sleepSkipable = true;
                        currentBlockSpyObj.isTimerSleepBlock.and.returnValue(true);

                        executionComponentCtrl.selectSkip();
                        expect(currentBlockSpyObj.forceFinish).toHaveBeenCalledTimes(1);
                    });
                    it('should not call forceFinish on the block, if sleepSkipable false', function () {
                        executionComponentCtrl.sleepSkipable = false;
                        currentBlockSpyObj.isTimerSleepBlock.and.returnValue(true);

                        executionComponentCtrl.selectSkip();
                        expect(currentBlockSpyObj.forceFinish).not.toHaveBeenCalled();
                    });
                    it('should not call forceFinish on the block, if it is not a timer sleep block', function () {
                        executionComponentCtrl.sleepSkipable = true;
                        currentBlockSpyObj.isTimerSleepBlock.and.returnValue(false);

                        executionComponentCtrl.selectSkip();
                        expect(currentBlockSpyObj.forceFinish).not.toHaveBeenCalled();
                    });
                });

                describe('scrollToCurrentBlock', function () {
                    const scrollEvent = 'scrollToCurrentBlock';
                    const scrollEventTimeoutMs = 200;

                    function expectScrollEventAgainAfterTimeout() {
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        expect($rootScope.$broadcast.calls.argsFor(0)).toEqual([scrollEvent]);
                        $interval.flush(scrollEventTimeoutMs - 1);
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                        $interval.flush(1);
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(2);
                        expect($rootScope.$broadcast.calls.argsFor(1)).toEqual([scrollEvent]);
                        $interval.flush(scrollEventTimeoutMs);
                        expect($rootScope.$broadcast).toHaveBeenCalledTimes(2);
                    }

                    beforeEach(function() {
                        spyOn($rootScope, '$broadcast');
                    });
                    describe('scrollToCurrent enabled', function () {
                        beforeEach(function () {
                            executionComponentCtrl.scrollToCurrent = true;
                        });

                        it(`should $broadcast ${scrollEvent} if enter animation is closed`, function () {
                            executionComponentCtrl.onAnimateEnter("enter", "close");
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(false);
                            expect($rootScope.$broadcast).toHaveBeenCalledWith(scrollEvent);
                        });

                        it(`should not $broadcast ${scrollEvent} if enter animation is started`, function () {
                            executionComponentCtrl.onAnimateEnter("enter", "start");
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(true);
                            expect($rootScope.$broadcast).not.toHaveBeenCalledWith(scrollEvent);
                        });

                        it(`should $broadcast ${scrollEvent} if image has been loaded and not in animation`, function () {
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(false);
                            executionComponentCtrl.onCurrentBlockImageLoaded();
                            expect($rootScope.$broadcast).toHaveBeenCalledWith(scrollEvent);
                        });

                        it(`should $broadcast ${scrollEvent} again once after 200ms if enter animation is closed`, function () {
                            executionComponentCtrl.onAnimateEnter("enter", "close");
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(false);
                            expectScrollEventAgainAfterTimeout();
                        });

                        it(`should $broadcast ${scrollEvent} again once after 200ms if image has been loaded and not in animation`, function () {
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(false);
                            executionComponentCtrl.onCurrentBlockImageLoaded();
                            expectScrollEventAgainAfterTimeout();
                        });

                        it('should cancel previous interval, if a new one is scheduled before triggering', function() {
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(false);
                            executionComponentCtrl.onCurrentBlockImageLoaded();
                            expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                            $interval.flush(1);
                            executionComponentCtrl.onCurrentBlockImageLoaded();
                            expect($rootScope.$broadcast).toHaveBeenCalledTimes(2);
                            $interval.flush(scrollEventTimeoutMs - 1);
                            expect($rootScope.$broadcast).toHaveBeenCalledTimes(2);
                            $interval.flush(1);
                            expect($rootScope.$broadcast).toHaveBeenCalledTimes(3);
                            $interval.flush(1);
                            expect($rootScope.$broadcast).toHaveBeenCalledTimes(3);
                        });


                        it(`should not $broadcast ${scrollEvent} if image has been loaded and in animation`, function () {
                            executionComponentCtrl.onAnimateEnter("enter", "start");
                            executionComponentCtrl.onCurrentBlockImageLoaded();
                            expect($rootScope.$broadcast).not.toHaveBeenCalledWith(scrollEvent);
                        });
                    });
                    describe('scrollToCurrent disabled', function () {
                        beforeEach(function () {
                            executionComponentCtrl.scrollToCurrent = false;
                        });

                        it(`should not $broadcast ${scrollEvent} if enter animation is started or closed`, function () {
                            executionComponentCtrl.onAnimateEnter("enter", "start");
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(true);
                            executionComponentCtrl.onAnimateEnter("enter", "close");
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(false);
                            expect($rootScope.$broadcast).not.toHaveBeenCalledWith(scrollEvent);
                            $interval.flush(scrollEventTimeoutMs * 2);
                            expect($rootScope.$broadcast).not.toHaveBeenCalledWith(scrollEvent);
                        });

                        it(`should not $broadcast ${scrollEvent} if image has been loaded`, function () {
                            expect(executionComponentCtrl.currentBlockInAnimation).toBe(false);
                            executionComponentCtrl.onCurrentBlockImageLoaded();
                            executionComponentCtrl.onAnimateEnter("enter", "start");
                            executionComponentCtrl.onCurrentBlockImageLoaded();
                            expect($rootScope.$broadcast).not.toHaveBeenCalledWith(scrollEvent);
                            $interval.flush(scrollEventTimeoutMs * 2);
                            expect($rootScope.$broadcast).not.toHaveBeenCalledWith(scrollEvent);
                        });
                    });
                });
            });

            describe('gamification event handling', function() {
                beforeEach(function() {
                    spyOn(gamificationService, 'handleGamificationEvent').and.callThrough();
                    constructExecutionComponent();
                });

                function testAndExpectGamificationEvents() {
                    it('should call gamificationService on workflow start when gamificationDisabled is not set or false', function() {
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        initExecutionComponent();
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledTimes(1);
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledWith('workflow_start');
                    });

                    it('should call gamificationService on task done when gamificationDisabled is not set or false', function() {
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        initExecutionComponent();
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledTimes(1);
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledWith('workflow_start');
                        executionComponentCtrl.workflow = workflowMulti;
                        executionComponentCtrl.selectCheck();
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledTimes(2);
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledWith('workflow_start');
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledWith('task_done');
                    });
                    it('should call gamificationService on workflow finish when gamificationDisabled is not set or false', function() {
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        initExecutionComponent();
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledTimes(1);
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledWith('workflow_start');
                        executionComponentCtrl.workflow = workflowSingleTask;
                        executionComponentCtrl.selectCheck();
                        $scope.$apply();
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledTimes(3);
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledWith('workflow_start');
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledWith('task_done');
                        expect(gamificationService.handleGamificationEvent).toHaveBeenCalledWith('workflow_finish');
                    });
                }

                describe('gamificationDisabled not set', function() {
                    testAndExpectGamificationEvents();
                });

                describe('gamificationDisabled set to false', function() {
                    beforeEach(function() {
                        executionComponentCtrl.gamificationDisabled = false;
                    });
                    testAndExpectGamificationEvents();
                });

                describe('gamificationDisabled set to true', function() {
                    beforeEach(function() {
                        executionComponentCtrl.gamificationDisabled = true;
                    });

                    it('should not call gamificationService on workflow Start when gamificationDisabled is true', function() {
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        initExecutionComponent();
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                    });

                    it('should not call gamificationService on task done when gamificationDisabled is true', function() {
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        initExecutionComponent();
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        executionComponentCtrl.workflow = workflowMulti;
                        executionComponentCtrl.selectCheck();
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        console.log(gamificationService.handleGamificationEvent.calls.allArgs())
                    });

                    it('should not call gamificationService on workflow finish when gamificationDisabled is true', function() {
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        initExecutionComponent();
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalled();
                        executionComponentCtrl.workflow = workflowSingleTask;
                        executionComponentCtrl.selectCheck();
                        $scope.$apply();
                        expect(gamificationService.handleGamificationEvent).not.toHaveBeenCalledWith();
                    });
                });
            });
        });
    });

    describe('executionComponent component', function () {
        let $compile;
        beforeEach(inject(function (_$compile_) {
            $compile = _$compile_;
        }));

        describe('classic view', function () {
            let jqElement;
            let executionComponentCtrl;
            let $scope;

            beforeEach(function () {
                $scope = $rootScope.$new();
            });
            afterEach(function() {
                $scope.$destroy();
                document.body.removeChild(jqElement[0]);
            });

            function initializeWithWorkflow(workflow) {
                $scope.workflow = workflow;
                jqElement = $compile(`<execution-component workflow="workflow"></execution-component>`)($scope);
                document.body.appendChild(jqElement[0]);
                $rootScope.$apply();
                executionComponentCtrl = jqElement.controller('executionComponent');
            }

            describe('currentExecutionBlock', function () {
                const scrollToCurrentBlockEvent = 'scrollToCurrentBlock';

                describe('execution-block', function() {
                    let currentExecutionBlock;
                    beforeEach(function() {
                        initializeWithWorkflow(workflowSingleTask);
                        currentExecutionBlock = jqElement[0].querySelector('execution-block[current="true"]');
                    });
                    it('should attach scroll-into-view-event directive', function () {
                        expect(currentExecutionBlock.getAttribute('scroll-into-view-event')).toBe(scrollToCurrentBlockEvent);
                        expect(currentExecutionBlock.getAttribute('scroll-into-view-disabled')).toBe('!$ctrl.scrollToCurrent');
                    });
                    it('should attach on-animate directive with on-animate-events attribute being "enter"', function() {
                        expect(currentExecutionBlock.getAttribute('on-animate')).toBe('$ctrl.onAnimateEnter(eventName, phase)');
                        expect(currentExecutionBlock.getAttribute('on-animate-events')).toBe('enter');

                    });
                    it('should set on-image-loaded attribute', function() {
                        expect(currentExecutionBlock.getAttribute('on-image-loaded')).toBe('$ctrl.onCurrentBlockImageLoaded()');
                    });
                });
                describe('execution-block-parallel', function() {
                    let currentExecutionBlockParallel;
                    beforeEach(function() {
                        initializeWithWorkflow(workflowParallel2Of3);
                        currentExecutionBlockParallel = jqElement[0].querySelector('execution-block-parallel');
                    });
                    it('should attach scroll-into-view-event directive', function () {
                        expect(currentExecutionBlockParallel.getAttribute('scroll-into-view-event')).toBe(scrollToCurrentBlockEvent);
                        expect(currentExecutionBlockParallel.getAttribute('scroll-into-view-disabled')).toBe('!$ctrl.scrollToCurrent');
                    });
                    it('should attach on-animate directive with on-animate-events attribute being "enter"', function() {
                        expect(currentExecutionBlockParallel.getAttribute('on-animate')).toBe('$ctrl.onAnimateEnter(eventName, phase)');
                        expect(currentExecutionBlockParallel.getAttribute('on-animate-events')).toBe('enter');
                    });
                    it('should set on-image-loaded attribute', function() {
                        expect(currentExecutionBlockParallel.getAttribute('on-image-loaded')).toBe('$ctrl.onCurrentBlockImageLoaded()');
                    });
                });
            });
        });
    });
});
