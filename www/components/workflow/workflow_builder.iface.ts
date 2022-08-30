module rehagoal.workflow {

    export type BuilderFunc = (builder: IWorkflowBuilder) => undefined;
    export type BuilderFuncNullable = BuilderFunc | null;

    export interface IWorkflowBuilder {
        task(taskDescription: string): IWorkflowBuilder
        if_(condition: string): IfBuilder
        repeat_times(times: number): RepeatTimesBuilder
        repeat_condition(condition: string, condition_location: string): RepeatConditionBuilder
        parallel_or(description: string, n_tasks_to_choose: number): ParallelOrBuilder
        timer_remember(each_value: number, each_unit: string): TimerRemember
        timer_sleep(each_value: number, each_unit: string, description: string, disable_notification: boolean): IWorkflowBuilder
        with_image(image: string): string
        with_id(blockId: number): IWorkflowBuilder
    }

    export interface IPartialWorkflowBuilder extends ExecutionBlockConvertible {
        getBuilderFunctions(): BuilderFuncNullable[]
    }

    export class Task implements ExecutionBlockConvertible {
        constructor(public description: string) {}

        toExecutionBlock(blockFactory: IBlockFactory) {
            return blockFactory.createTaskBlock(this.description);
        }
    }

    export class TimerRemember {
        constructor(public each_value: number, public each_unit: string) {}
    }

    export class IfBuilder implements IPartialWorkflowBuilder {
        then_func: BuilderFuncNullable = null;
        else_func: BuilderFuncNullable = null;

        constructor(public condition: string) {}

        then(builder_func: BuilderFunc) {
            this.then_func = builder_func;
            return this;
        }

        else_(builder_func: BuilderFunc) {
            this.else_func = builder_func;
            return this;
        }

        getBuilderFunctions(): BuilderFuncNullable[] {
            return [this.then_func, this.else_func];
        }

        toExecutionBlock(blockFactory: IBlockFactory) {
            return blockFactory.createIfConditionBlock(this.condition,
                this.then_func, this.else_func);
        }
    }

    export class RepeatTimesBuilder implements IPartialWorkflowBuilder {
        each_func: BuilderFuncNullable = null;
        constructor(public times: number) {}
        each(builder_func : BuilderFunc) {
            this.each_func = builder_func;
            return this;
        }

        getBuilderFunctions(): rehagoal.workflow.BuilderFuncNullable[] {
            return [this.each_func];
        }

        toExecutionBlock(blockFactory: IBlockFactory) {
            return blockFactory.createRepeatTimesBlock(this.times, this.each_func);
        }
    }

    export class RepeatConditionBuilder implements IPartialWorkflowBuilder {
        each_func: BuilderFuncNullable = null;
        constructor(public condition: string, public condition_location: string) {}
        each(builder_func: BuilderFunc) {
            this.each_func = builder_func;
            return this;
        }

        getBuilderFunctions(): rehagoal.workflow.BuilderFuncNullable[] {
            return [this.each_func];
        }

        toExecutionBlock(blockFactory: IBlockFactory) {
            return blockFactory.createRepeatConditionBlock(this.condition, this.condition_location,
                this.each_func);
        }
    }

    export class ParallelOrBuilder implements IPartialWorkflowBuilder {
        parallel_func: BuilderFuncNullable = null;
        constructor(public description: string, public n_tasks_to_choose: number) {}
        of(builder_func: BuilderFuncNullable) {
            this.parallel_func = builder_func;
            return this;
        }

        getBuilderFunctions(): rehagoal.workflow.BuilderFuncNullable[] {
            return [this.parallel_func];
        }

        toExecutionBlock(blockFactory: IBlockFactory) {
            return blockFactory.createParallelOrBlock(this.parallel_func, this.description, this.n_tasks_to_choose);
        }
    }

    export class TimerSleep implements ExecutionBlockConvertible {
        constructor(public timer_value: number, public timer_unit: string, public description: string, public disable_notification: boolean) {}
        toExecutionBlock(blockFactory: IBlockFactory) {
            return blockFactory.createTimerSleepBlock(this.timer_value, this.timer_unit, this.description, this.disable_notification);
        }
    }

}
