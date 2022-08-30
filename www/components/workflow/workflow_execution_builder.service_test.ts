module rehagoal.workflow {
    describe('rehagoal.workflow', function () {
        beforeEach(() => angular.mock.module('rehagoal.workflow'));

        describe('workflowExecutionBuilderService', function () {
            let workflowExecutionBuilderService: WorkflowExecutionBuilderService;

            beforeEach(() => angular.mock.inject(function (_workflowExecutionBuilderService_: WorkflowExecutionBuilderService) {
                workflowExecutionBuilderService = _workflowExecutionBuilderService_;
            }));

            it('should support tasks', function() {
                const builder = workflowExecutionBuilderService.codeToBuilder(`
                    var builder = new GoalExecutionBuilder('goal');
                    builder.task('Task 1');
                `)!;
                expect(builder).not.toBeNull();
                expect(builder.executionList.length).toBe(1);
                expect(builder.executionList[0]).toEqual(new Task('Task 1'));
            });

            it('should assign ids to tasks', function() {
                const builder = workflowExecutionBuilderService.codeToBuilder(`
                    var builder = new GoalExecutionBuilder('goal');
                    builder.task('Task 1');
                    builder.with_id(42);
                `)!;
                expect(builder).not.toBeNull();
                expect(builder.executionList.length).toBe(1);
                const expected: ExecutionBlockConvertible = new Task('Task 1');
                expected.id = 42;
                expect(builder.executionList[0]).toEqual(expected);
            });

            // TODO: Implement more tests for WorkflowExecutionBuilderService
        })
    })
}