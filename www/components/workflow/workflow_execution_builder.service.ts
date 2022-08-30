//import * as angular from 'angularjs';

//export default moduleName;


module rehagoal.workflow {
    const moduleName = 'rehagoal.workflow';
    export class WorkflowExecutionBuilderService {
        //noinspection JSUnusedGlobalSymbols
        static $inject = ['$log'];
        $log: angular.ILogService;

        constructor($log: angular.ILogService) {
            this.$log = $log;
        }

        createWorkflowExecutionBuilder(): WorkflowExecutionBuilder {
            return new WorkflowExecutionBuilder();
        }

        codeToBuilder(code: string): GoalExecutionBuilder | null {
            code += "\nbuilder";
            this.$log.debug("WorkflowExecutionBuilderService::codeToBuilder(\n\"" + code + "\"\n)");
            try {
                return (() => eval(code))();
            } catch (e) {
                this.$log.warn("Workflow is defect, eval failed!");
                this.$log.error(e);
                return null;
            }
        }
    }

    class WorkflowExecutionBuilder implements IWorkflowBuilder {
        executionList: ExecutionBlockConvertible[] = [];
        task(taskDescription: string): IWorkflowBuilder {
            this.executionList.push(new Task(taskDescription));
            return this;
        }
        if_(condition: string): IfBuilder {
            let builder = new IfBuilder(condition);
            this.executionList.push(builder);
            return builder;
        }
        repeat_times(times: number): RepeatTimesBuilder {
            let builder = new RepeatTimesBuilder(times);
            this.executionList.push(builder);
            return builder;
        }
        repeat_condition(condition: string, condition_location: string): RepeatConditionBuilder {
            let builder = new RepeatConditionBuilder(condition, condition_location);
            this.executionList.push(builder);
            return builder;
        }
        parallel_or(description: string, n_tasks_to_choose: number): ParallelOrBuilder {
            let builder = new ParallelOrBuilder(description, n_tasks_to_choose);
            this.executionList.push(builder);
            return builder;
        }
        timer_remember(each_value: number, each_unit: string): TimerRemember {
            let timer = new TimerRemember(each_value, each_unit);
            if (this.executionList.length == 0) {
                if (!(this instanceof GoalExecutionBuilder)) {
                    throw "Invalid location for a timer!";
                }
                this.timer = timer;
            } else {
                this.executionList[this.executionList.length - 1].timer = timer;
            }
            return timer;
        }
        timer_sleep(each_value: number, each_unit: string, description: string, disable_notification: boolean): IWorkflowBuilder {
            this.executionList.push(new TimerSleep(each_value, each_unit, description, disable_notification));
            return this;
        }
        with_image(image: string) {
            if (this.executionList.length == 0) {
                throw "Invalid location for an image!";
            } else {
                this.executionList[this.executionList.length - 1].image = image;
            }
            return image;
        }
        with_id(blockId: number): IWorkflowBuilder {
            if (this.executionList.length == 0) {
                if (!(this instanceof GoalExecutionBuilder)) {
                    throw "Invalid location for an id!";
                }
                this.id = blockId;
            } else {
                this.executionList[this.executionList.length - 1].id = blockId;
            }
            return this;
        }
        buildExec(exec: WorkflowExecution, blockFactory: IBlockFactory) {
            for (let i = 0; i < this.executionList.length; ++i) {
                let buildingBlock = this.executionList[i];
                let execBlock = buildingBlock.toExecutionBlock(blockFactory);

                if (execBlock != null) {
                    if (buildingBlock.timer !== undefined) {
                        let timer = buildingBlock.timer;
                        execBlock.setTimer(timer.each_value, timer.each_unit);
                    }
                    if (buildingBlock.image !== undefined) {
                        execBlock.setImageHash(buildingBlock.image);
                    }
                    if (buildingBlock.id !== undefined) {
                        execBlock.setId(buildingBlock.id);
                    }
                    exec.pushBlock(execBlock);
                } else {
                    console.warn("Execution block is null!");
                }

            }
            return exec;
        }
    }

    class GoalExecutionBuilder extends WorkflowExecutionBuilder {
        id: number | null = null;
        timer: TimerRemember | null = null;
        constructor(public description: string) {
            super();
        }
        build(blockFactory: IBlockFactory) {
            let exec = blockFactory.createWorkflowExecution(this.description, this.timer || null);
            return super.buildExec.call(this, exec, blockFactory);
        }
    }

    angular.module(moduleName)
        .service('workflowExecutionBuilderService', WorkflowExecutionBuilderService);

}
