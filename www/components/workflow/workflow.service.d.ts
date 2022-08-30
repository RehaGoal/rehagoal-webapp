import WorkflowsDBEntry = rehagoal.database.WorkflowsDBEntry;

interface IWorkflowData {
    name: string,
    workspaceXml: string
}

interface IWorkflowV1 extends IWorkflowData {
    id: number
}

interface IWorkflowV2 extends IWorkflowV1 {
    remoteId?: string | null
}

interface IWorkflowV3 extends IWorkflowV2 {
    uuid: string,
    xmlHash: string
}

type IWorkflow = IWorkflowV3;

interface IWorkflowService {
    getWorkflows(): IWorkflow[]

    getWorkflowById(id: number): IWorkflow | null

    getWorkflowByName(name: string): IWorkflow | null

    newWorkflow(name?: string, workspaceXml?: string, uuid?: string): Promise<IWorkflow>

    renameWorkflow(previousName: string, workflow: IWorkflow): Promise<void>

    saveWorkflow(workflow: IWorkflow): Promise<void>

    deleteWorkflowById(id: number): Promise<void>

    setRemoteID(workflow_name: string, remoteId: string): Promise<void>

    getVersion(): number

    persistAllWorkflowsInWorkflowsDB(): Promise<void>

    validateWorkflowForWorkflowsDB(workflow: IWorkflow): WorkflowsDBEntry
}
