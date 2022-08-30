module rehagoal.executionComponent {
    import WorkflowExecution = rehagoal.workflow.WorkflowExecution;
    import BlockChangeListener = rehagoal.smartCompanion.BlockChangeListener;
    import WorkflowFinishListener = rehagoal.smartCompanion.WorkflowFinishListener;
    import NotificationListener = rehagoal.smartCompanion.NotificationListener;
    import BlockType = rehagoal.workflow.BlockType;

    export interface IExecutionComponent {
        addBlockChangeListener(listener: BlockChangeListener): void,
        addWorkflowFinishListener(listener: WorkflowFinishListener): void,
        addOnNotificationListener(listener: NotificationListener): void,
        onWorkflowFinish: (() => void) | undefined,
        onWorkflowFinishClick: (() => void) | undefined,
        onNotification: ((data: {title: string, text: string}) => void) | undefined,
        selectYes(): void,
        selectNo(): void,
        selectCheck(): void,
        getCurrentBlockText(): string,
        getCurrentBlockIndex(): number,
        getCurrentBlockType(): BlockType | null,
        getTimerBlockTimer(): number|null,
        getParallelTaskNumTodo(): number,
        getCurrentParallelFlows(): WorkflowExecution[] | null,
        goalDescription: string,
        workflow: IWorkflow | undefined
        hideLog: boolean | undefined,
        flex: boolean | undefined,
        contentAlign: 'left' | 'right' | undefined,
        executionPaused: boolean | undefined,
        ttsEnabled: boolean | undefined,
        metricsDisabled: boolean | undefined,
        sleepSkipable: boolean | undefined
        scrollToCurrent: boolean | undefined
    }
}
