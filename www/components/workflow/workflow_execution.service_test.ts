module rehagoal.workflow {
    describe('rehagoal.workflow', function() {
        beforeEach(() => angular.mock.module('rehagoal.workflow'));

        describe('WorkflowExecutionService', function() {
            let workflowExecutionService: WorkflowExecutionService;
            beforeEach(() => inject(function(_workflowExecutionService_: WorkflowExecutionService) {
                workflowExecutionService = _workflowExecutionService_;
            }));

            function getFunctionBody(func: Function): string {
                const code = func.toString();
                return code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));
            }

            function makeExecution(builderCode: Function): WorkflowExecution | null {
                return workflowExecutionService.buildExecutionFromCode(getFunctionBody(builderCode));
            }

            function markCurrentTaskDone(execution: WorkflowExecution) {
                (execution.getCurrent() as TaskBlock).done(execution);
            }

            describe('repeatTimes block', function() {
                it('should contain remaining number of iterations in text', function() {
                    const execution = makeExecution(function() {
                        //@ts-ignore
                        const builder = new GoalExecutionBuilder();
                        builder.task('Task before')
                        builder.repeat_times(2)
                            .each(function(builder: IWorkflowBuilder) {
                                builder.task("Task inside");
                            });
                        builder.task("Task after");
                    })!;
                    expect(execution).not.toBeNull();
                    expect(execution.getCurrent()?.getText()).toBe("Task before");
                    expect(execution.getNext()?.getText()).toBe("Noch 2 mal...");
                    markCurrentTaskDone(execution);
                    for (let i = 1; i >= 0; --i) {
                        expect(execution.getPrevious()?.getText()).toBe(`Noch ${i + 1} mal...`);
                        expect(execution.getCurrent()?.getText()).toBe("Task inside");
                        expect(execution.getNext()?.getText()).toBe(`Noch ${i + 1} mal...`);
                        markCurrentTaskDone(execution);
                    }
                    expect(execution.getPrevious()?.getText()).toBe("Noch 0 mal...");
                    expect(execution.getCurrent()?.getText()).toBe("Task after");
                })
            });
        });
    });
}
