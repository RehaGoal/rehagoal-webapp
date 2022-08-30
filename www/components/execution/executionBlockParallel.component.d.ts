import WorkflowExecution = rehagoal.workflow.WorkflowExecution;
import TaskBlock = rehagoal.workflow.TaskBlock;

interface IExecutionBlockParallelComponentController extends ng.IComponentController {
    selectCheck(flow: WorkflowExecution, task: TaskBlock): void
    openLightbox(): void

    /* Bindings */
    currentBlockIndex?: number;
    flows?: WorkflowExecution[];
    flex?: boolean;
    text?: string;
    imageHash?: string | null;
    imageUrl?: string | null;
    numTasksTodo?: number;
    numTasksRemain?: number;
    onClickTitle?: () => void;
    onClickMiniLabel?: () => void;
    contentAlign?: 'left' | 'right'
}
