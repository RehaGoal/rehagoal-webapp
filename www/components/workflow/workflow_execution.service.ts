module rehagoal.workflow {
    import WorkflowFinishListener = rehagoal.smartCompanion.WorkflowFinishListener;
    import TimeBase = rehagoal.utilities.TimeBase;
    const moduleName = 'rehagoal.workflow';

    export enum BlockType {
        Simple = 1,
        Conditional = 2,
        Timer = 3,
        Parallel = 4,
        End = 5,
        Repeat = 6
    }

    export class WorkflowExecutionService {
        //noinspection JSUnusedGlobalSymbols
        static $inject = [
            '$log', '$location',
            'timerService', 'workflowService', 'countdownService',
            'workflowExecutionBuilderService'];

        constructor(private $log: angular.ILogService,
                    private $location: angular.ILocationService,
                    private timerService: ExecutionTimerService,
                    private workflowService: IWorkflowService, private countdownService: rehagoal.workflow.ExecutionCountdownService,
                    private workflowExecutionBuilderService: WorkflowExecutionBuilderService) {
            ExecutionBlock.$log = $log;
            ExecutionBlock.$location = $location;
            ExecutionBlock.timerService = timerService;
            ExecutionBlock.workflowService = workflowService;
            ExecutionBlock.countdownService = countdownService;
            ExecutionBlock.workflowExecutionBuilderService = workflowExecutionBuilderService;
        }

        buildExecutionFromCode(code: string) {
            let builder = this.workflowExecutionBuilderService.codeToBuilder(code);
            if (builder === null) {
                return null;
            }
            return builder.build(new BlockFactory());
        }
    }

    class BlockFactory implements IBlockFactory {
        createIfConditionBlock(condition: string, then_func: BuilderFuncNullable, else_func: BuilderFuncNullable) {
            return new IfConditionBlock(condition, then_func, else_func);
        }

        createRepeatConditionBlock(condition: string, condition_type: string, each_func: BuilderFuncNullable) {
            return new RepeatConditionBlock(condition, condition_type, each_func);
        }

        createRepeatTimesBlock(times: number, each_func: BuilderFuncNullable) {
            return new RepeatTimesBlock(times, each_func);
        }

        createParallelOrBlock(parallel_func: BuilderFuncNullable, description: string, n_tasks_to_choose: number) {
            return new ParallelOrBlock(parallel_func, description, n_tasks_to_choose);
        }

        createTaskBlock(description: string) {
            return new TaskBlock(description);
        }

        createTimerSleepBlock(timer_value: number, timer_unit: TimeBase, description: string, disable_notification: boolean) {
            return new TimerSleepBlock(timer_value, timer_unit, description, disable_notification);
        }

        createWorkflowExecution(description: string, timer: TimerConfig) {
            return new WorkflowExecution(description, timer);
        }
    }

    type TimerConfig = {each_value: number, each_unit: string};
    type BlockLeaveFunction = (flowExecution: WorkflowExecution) => void;

    export abstract class ExecutionBlock {
        static $log: angular.ILogService;
        static $location: angular.ILocationService;
        static timerService: ExecutionTimerService;
        static workflowService: IWorkflowService;
        static countdownService: ExecutionCountdownService;
        static workflowExecutionBuilderService: WorkflowExecutionBuilderService;

        id: number | null = null;
        timer: TimerConfig | null = null;
        imageHash: string | null = null;
        imageUrl: string | null = null;
        tim: ExecutionTimer | null = null;
        onLeaveCallbacks: BlockLeaveFunction[] = [];

        protected constructor(private text: string) {
        }

        getText(): string {
            return this.text;
        }

        getImageHash(): string | null {
            return this.imageHash;
        }

        isConditionBlock(): this is ConditionBlock {
            return false;
        }

        isParallelBlock(): this is ParallelBlock {
            return false;
        }

        isTimerSleepBlock(): this is TimerSleepBlock {
            return false;
        }

        isTimerRunning(): boolean {
            return false;
        }

        onEnter(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("ExecutionBlock::onEnter");
            ExecutionBlock.$log.debug("Text: " + this.getText());
            this.registerTimer();
        }

        addOnLeave(leave_function: BlockLeaveFunction) {
            this.onLeaveCallbacks.push(leave_function);
        }

        setImageHash(hash: string) {
            let vm = this;
            vm.imageHash = hash;
        }

        setId(id: number) {
            this.id = id;
        };

        setTimer(each_value: number, each_unit: string) {
            this.timer = {each_value: each_value, each_unit: each_unit};
        }

        registerTimer() {
            if (this.timer != null && this.tim == null) {
                this.tim = ExecutionBlock.timerService.addTimer(this.getText(), this.timer.each_value, this.timer.each_unit);
            }
        }

        unRegisterTimer() {
            if (this.tim != null) {
                ExecutionBlock.timerService.removeTimer(this.tim);
                this.tim = null;
            }
        }

        onPreLeave(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("ExecutionBlock::onPreLeave");
            this.unRegisterTimer();
        }

        onLeave(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("ExecutionBlock::onLeave");
            this.onPreLeave(flowExecution);
            let callback: BlockLeaveFunction | undefined;
            while (callback = this.onLeaveCallbacks.pop()) {
                callback(flowExecution);
            }
            flowExecution.onLeaveCurrent();
        };

        abstract getBlockType(): BlockType;
    }

    export class ConditionBlock extends ExecutionBlock {
        constructor(condition: string) {
            super(condition);
        }

        isConditionBlock() {
            return true;
        }

        onPreLeave(flowExecution: WorkflowExecution) {}

        selectYes(flowExecution: WorkflowExecution) {}

        selectNo(flowExecution: WorkflowExecution) {}

        getBlockType(): BlockType {
            return BlockType.Conditional;
        }
    }

    export class IfConditionBlock extends ConditionBlock {
        constructor(condition: string, public then_func: BuilderFuncNullable, public else_func: BuilderFuncNullable) {
            super(condition);
        }

        selectYes(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("IfConditionBlock::selectYes");
            let tempBuilder = ExecutionBlock.workflowExecutionBuilderService.createWorkflowExecutionBuilder();
            this.then_func && this.then_func(tempBuilder);

            if (tempBuilder.executionList.length == 0) {
                this.onLeave(flowExecution);
            } else {
                let tempExec = new WorkflowExecution();
                tempBuilder.buildExec(tempExec, new BlockFactory());
                let this_block = this;
                tempExec.getLastBlock().addOnLeave(function () {
                    this_block.unRegisterTimer();
                });
                flowExecution.mergeInsertNext(tempExec);

                this.onLeave(flowExecution);
            }
        }

        selectNo(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("IfConditionBlock::selectNo");
            let tempBuilder = ExecutionBlock.workflowExecutionBuilderService.createWorkflowExecutionBuilder();
            this.else_func && this.else_func(tempBuilder);
            if (tempBuilder.executionList.length == 0) {
                this.onLeave(flowExecution);
            } else {
                let tempExec = new WorkflowExecution();
                tempBuilder.buildExec(tempExec, new BlockFactory());
                let this_block = this;
                tempExec.getLastBlock().addOnLeave(function () {
                    this_block.unRegisterTimer();
                });
                flowExecution.mergeInsertNext(tempExec);

                this.onLeave(flowExecution);
            }
        }
    }

    export class RepeatTimesBlock extends ExecutionBlock {
        private entered: boolean = false;

        constructor(public times: number, public each_func: BuilderFuncNullable) {
            super("");
        }

        getText() {
            const timesRemaining = this.entered ? (this.times + 1) : this.times;
            return `Noch ${timesRemaining} mal...`;
        }

        onEnter(flowExecution: WorkflowExecution) {
            super.onEnter(flowExecution);
            this.entered = true;
            if (this.times > 0) {
                let tempBuilder = ExecutionBlock.workflowExecutionBuilderService.createWorkflowExecutionBuilder();
                this.each_func && this.each_func(tempBuilder);
                let tempExec = new WorkflowExecution();
                tempBuilder.buildExec(tempExec, new BlockFactory());
                if (this.times > 0) {
                    let this_block = this;
                    tempExec.pushBlock(this_block);
                }
                flowExecution.mergeInsertNext(tempExec);
            }
            this.done(flowExecution);
        }

        done(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("RepeatTimesBlock::done");
            this.onLeave(flowExecution);
        }

        onPreLeave(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("RepeatTimesBlock::onPreLeave");
            this.times--;
            if (this.times < 0) {
                this.unRegisterTimer();
            }
        }

        getBlockType(): BlockType {
            return BlockType.Repeat;
        }
    }

    export class RepeatConditionBlock extends ConditionBlock {
        is_while: boolean;
        continue_: boolean = false;

        constructor(condition: string, public condition_type: string, public each_func: BuilderFuncNullable) {
            super(condition);
            this.is_while = this.condition_type === "while"
        }

        onPreLeave(flowExecution: WorkflowExecution) {
            if (!this.continue_) {
                this.unRegisterTimer();
            }
        }

        continueLoop(flowExecution: WorkflowExecution) {
            let tempBuilder = ExecutionBlock.workflowExecutionBuilderService.createWorkflowExecutionBuilder();
            this.each_func && this.each_func(tempBuilder);
            let tempExec = new WorkflowExecution();
            tempBuilder.buildExec(tempExec, new BlockFactory());
            let this_block = this;
            tempExec.pushBlock(this_block);
            flowExecution.mergeInsertNext(tempExec);
            this.continue_ = true;
            this.onLeave(flowExecution);
        }

        exitLoop(flowExecution: WorkflowExecution) {
            this.continue_ = false;
            this.onLeave(flowExecution);
        }

        selectYes(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("RepeatConditionBlock::selectYes");
            if (this.is_while) {
                this.continueLoop(flowExecution);
            } else {
                this.exitLoop(flowExecution);
            }
        }

        selectNo(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("RepeatConditionBlock::selectNo");
            if (this.is_while) {
                this.exitLoop(flowExecution);
            } else {
                this.continueLoop(flowExecution);
            }
        }
    }

    export abstract class ParallelBlock extends ExecutionBlock {
        parallel_flows: WorkflowExecution[] = [];

        constructor(description: string, public parallel_func: BuilderFuncNullable) {
            super(description);
        }

        isParallelBlock() {
            return true;
        }

        abstract getThreadFinishCallback(flowExecution: WorkflowExecution): (thread: WorkflowExecution) => void

        abstract getTaskNumberTodo(): number

        abstract getTaskNumberRemain(): number

        onEnter(flowExecution: WorkflowExecution) {
            super.onEnter(flowExecution);
            let tempBuilder = ExecutionBlock.workflowExecutionBuilderService.createWorkflowExecutionBuilder();
            this.parallel_func && this.parallel_func(tempBuilder);
            let tempExec = new WorkflowExecution();
            tempBuilder.buildExec(tempExec, new BlockFactory());
            let parallel_tasks = tempExec.executionList;

            this.parallel_flows = [];
            // Init all parallel workflows
            for (let i = 0; i < parallel_tasks.length; ++i) {
                let thread = new WorkflowExecution();
                thread.pushBlock(parallel_tasks[i]);
                this.parallel_flows.push(thread);
                thread.addFinishListener(this.getThreadFinishCallback(flowExecution));
                thread.start();
            }
            if (this.parallel_flows.length == 0) {
                this.onLeave(flowExecution);
            }
        }

        getBlockType(): BlockType {
            return BlockType.Parallel;
        }
    }

    export class ParallelOrBlock extends ParallelBlock {
        parallel_complete: boolean = false;
        n_tasks_completed: number = 0;

        constructor(parallel_func: BuilderFuncNullable, description: string, public n_tasks_to_choose: number) {
            super(description, parallel_func);
        }

        getTaskNumberTodo() {
            return this.n_tasks_to_choose - this.n_tasks_completed;
        }

        getTaskNumberRemain() {
            return this.parallel_flows.length;
        }

        getThreadFinishCallback(flowExecution: WorkflowExecution) {
            let parallel_block = this;
            return function (thread: WorkflowExecution) {
                parallel_block.parallel_flows.splice(parallel_block.parallel_flows.indexOf(thread), 1);
                parallel_block.n_tasks_completed++;
                ExecutionBlock.$log.info("Tasks completed: " + parallel_block.n_tasks_completed +
                    "; To choose: " + parallel_block.n_tasks_to_choose);
                if (parallel_block.parallel_flows.length == 0
                    || parallel_block.n_tasks_completed == parallel_block.n_tasks_to_choose) {
                    for (let i = 0; i < parallel_block.parallel_flows.length; ++i) {
                        if (!parallel_block.parallel_flows[i].executionFinished) {
                            let current = parallel_block.parallel_flows[i].getCurrent();
                            current && current.onLeave(parallel_block.parallel_flows[i]);
                        }
                    }
                    if (!parallel_block.parallel_complete) {
                        parallel_block.onLeave(flowExecution);
                        parallel_block.parallel_complete = true;
                    }
                }
            }
        };
    }

    export class TaskBlock extends ExecutionBlock {
        constructor(description: string) {
            super(description);
        }

        done(flowExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("TaskBlock::done");
            this.onLeave(flowExecution);
        }

        getBlockType(): BlockType {
            return BlockType.Simple;
        }
    }

    export class TimerSleepBlock extends ExecutionBlock {
        sleepTime: number;
        requestID: number | undefined;

        constructor(public timerValue: number, public timerUnit: TimeBase, description: string, public disableNotification: boolean) {
            super(description);
            this.timerValue = timerValue;
            this.timerUnit = timerUnit;
            this.sleepTime = timerValue;
            this.disableNotification = disableNotification;
            if (timerUnit == 'm') {
                this.sleepTime *= 60;
            } else if (timerUnit == 'h') {
                this.sleepTime *= 3600;
            }
        }

        done(flowExecution: WorkflowExecution): void {
            if (this.disableNotification && this.requestID !== undefined) {
                flowExecution.requestEnableTimer(this.requestID);
            }
            ExecutionBlock.$log.debug("TimerSleepBlock::done");
            this.onLeave(flowExecution);
        }

        onEnter(flowExecution: WorkflowExecution): void {
            super.onEnter(flowExecution);
            if (this.timerValue > 0) {
                if(this.disableNotification) {
                    this.requestID = flowExecution.requestDisableTimer();
                }
                ExecutionBlock.$log.debug("Set countdown callback");
                let block = this;
                ExecutionBlock.countdownService.setCountdownCallback(function (sleepTime: number) {
                    block.updateSleepTime(sleepTime);
                });
                ExecutionBlock.countdownService.startCountdown(this.timerValue, this.timerUnit);
            } else {
                this.done(flowExecution);
            }
        }

        updateSleepTime(sleepTime: number): void {
            ExecutionBlock.$log.debug("Update sleepTime: " + sleepTime);
            this.sleepTime = sleepTime;
        }

        forceFinish(): void {
            ExecutionBlock.countdownService.forceCountdownFinish();
        }

        getAdditionalText(): string {
            let hours: number | string = Math.trunc(this.sleepTime / 3600);
            let minutes: number | string = Math.trunc((this.sleepTime % 3600) / 60);
            let seconds: number | string = Math.trunc(this.sleepTime % 60);
            if (minutes < 10) {
                minutes = '0' + minutes;
            }
            if (seconds < 10) {
                seconds = '0' + seconds;
            }
            let timeText = '';
            if (hours > 0) {
                if (hours < 10) {
                    hours = '0' + hours;
                }
                timeText = hours + ':';
            }
            timeText += minutes + ':' + seconds;
            return timeText;
        }

        getStartTimeText(): string {
            return this.timerValue + ' ' + this.timerUnit;
        }

        isTimerSleepBlock(): boolean {
            return true;
        }

        isTimerRunning(): boolean {
            ExecutionBlock.$log.debug("Is timer running: " + this.sleepTime);
            return (this.sleepTime > 0);
        }

        getBlockType(): BlockType {
            return BlockType.Timer;
        }
    }

    export class WorkflowExecution {
        tim: any;
        executionFinished: boolean = false;
        currentIndex: number = 0;
        executionList: ExecutionBlock[] = [];
        finishListeners: ((flow: WorkflowExecution) => void)[] = [];
        onLeaveListeners: ((flow: WorkflowExecution, block: ExecutionBlock) => void)[] = [];
        onEnteredListeners: ((flow: WorkflowExecution, block: ExecutionBlock) => void)[] = [];
        timerDisabledRequested: Set<number> = new Set<number>();
        timerRequestID: number = 0;


        constructor(public description?: string, public timer?: TimerConfig) {

        }

        getCurrentIndex() : number {
            return this.currentIndex;
        }

        get(index: number) : ExecutionBlock | null {
            if (index < 0 || index >= this.executionList.length) {
                return null;
            }
            return this.executionList[index];
        }

        getPrevious() : ExecutionBlock | null {
            return this.get(this.currentIndex - 1);
        }

        getCurrent() : ExecutionBlock | null {
            return this.get(this.currentIndex);
        }

        getNext() : ExecutionBlock | null {
            return this.get(this.currentIndex + 1);
        }

        onLeaveCurrent() {
            ExecutionBlock.$log.debug("WorkflowExecution::onLeaveCurrent");
            this.notifyOnLeave(this.getCurrent());

            this.currentIndex += 1;
            let current = this.getCurrent();
            this.enterBlockOrFinish(current);
        }

        addFinishListener(listener: (flow: WorkflowExecution) => void) {
            this.finishListeners.push(listener);
        }

        addOnLeaveListener(listener: (flow: WorkflowExecution, block: ExecutionBlock) => void) {
            this.onLeaveListeners.push(listener);
        }

        addOnEnteredListener(listener: (flow: WorkflowExecution, block: ExecutionBlock) => void) {
            this.onEnteredListeners.push(listener);
        }

        private notifyOnLeave(leaveBlock: ExecutionBlock | null) {
            if (!leaveBlock) {
                ExecutionBlock.$log.warn("leaveBlock is null!");
                return;
            }
            for (let i = 0; i < this.onLeaveListeners.length; ++i) {
                this.onLeaveListeners[i](this, leaveBlock);
            }
        }

        private notifyOnEntered(enteredBlock: ExecutionBlock | null) {
            if(!enteredBlock) {
                ExecutionBlock.$log.warn("enteredBlock is null!");
                return;
            }
            for (let i = 0; i < this.onEnteredListeners.length; ++i) {
                this.onEnteredListeners[i](this, enteredBlock);
            }
        }

        private notifyOnFinish() {
            for (let i = 0; i < this.finishListeners.length; ++i) {
                this.finishListeners[i](this);
            }
        }

        pushBlock(block: ExecutionBlock) {
            ExecutionBlock.$log.debug("WorkflowExecution::pushBlock");
            this.executionList.push(block);
            ExecutionBlock.$log.debug(this.executionList);
        }

        getLastBlock() {
            return this.executionList[this.executionList.length - 1];
        }

        mergeInsertNext(otherExecution: WorkflowExecution) {
            ExecutionBlock.$log.debug("WorkflowExecution::mergeInsertNext");
            // Keep same reference for executionList
            this.executionList.splice.apply(this.executionList, [this.currentIndex + 1, 0, ...otherExecution.executionList]);
            ExecutionBlock.$log.debug(this.executionList);
        }

        private enterBlockOrFinish(block: ExecutionBlock | null) {
            if (block) {
                block.onEnter(this);
                this.notifyOnEntered(block);
            } else {
                this.onFinish();
            }
        }

        onFinish() {
            if (this.timer) {
                ExecutionBlock.timerService.removeTimer(this.tim);
            }
            this.executionFinished = true;
            this.notifyOnFinish();
        }

        start() {
            if (this.timer && this.description !== undefined) {
                this.tim = ExecutionBlock.timerService.addTimer(this.description, this.timer.each_value, this.timer.each_unit);
            }
            let startBlock = this.getCurrent();
            this.enterBlockOrFinish(startBlock);
        }

        requestDisableTimer(): number {
            let timerRequestID = this.timerRequestID++;
            if (this.timerDisabledRequested.size === 0) {
                ExecutionBlock.timerService.setPaused(true);
            }
            this.timerDisabledRequested.add(timerRequestID);
            return timerRequestID;
        }

        requestEnableTimer(requestID: number) {
            this.timerDisabledRequested.delete(requestID);

            if (this.timerDisabledRequested.size === 0) {
                ExecutionBlock.timerService.setPaused(false);
            }
        }


    }

    angular.module(moduleName).service('workflowExecutionService', WorkflowExecutionService);
}
