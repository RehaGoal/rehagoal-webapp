module rehagoal.workflow {
    export interface IBlockFactory {
        createTaskBlock(description: string): TaskBlock
        createIfConditionBlock(condition: string, then_func: BuilderFuncNullable, else_func: BuilderFuncNullable): IfConditionBlock
        createRepeatTimesBlock(times: number, each_func: BuilderFuncNullable): RepeatTimesBlock
        createRepeatConditionBlock(condition: string, condition_location: string, each_func: BuilderFuncNullable): RepeatConditionBlock
        createParallelOrBlock(parallel_func: BuilderFuncNullable, description: string, n_tasks_to_choose: number): ParallelOrBlock
        createTimerSleepBlock(timer_value: number, timer_unit: string, description: string, disable_notification: boolean): TimerSleepBlock
        createWorkflowExecution(description: string, timer: TimerRemember | null): WorkflowExecution
    }

    export interface ExecutionBlockConvertible {
        timer?: TimerRemember
        image?: string
        id?: number
        toExecutionBlock(blockFactory: IBlockFactory): ExecutionBlock
    }
}
