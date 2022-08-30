module rehagoal.smartCompanion {
    import BlockType = rehagoal.workflow.BlockType;
    import IExecutionComponent = rehagoal.executionComponent.IExecutionComponent;

    export const REHAGOAL_API_VERSION: number = 1.0;
    export const REHAGOAL_API_NODE_NAME: string = "rehagoal-webapp";
    export const REHAGOAL_API_PREFIX: string = "/";
    export const REHAGOAL_PATH_PREFIX_WEBAPP: string = "/rehagoal/webapp/";
    export const REHAGOAL_PATH_PREFIX_COMPANIONS: string = "/rehagoal/companions/";

    export const REHAGOAL_TASK_REPLY_OK: string = "ok";
    export const REHAGOAL_TASK_REPLY_YES: string = "yes";
    export const REHAGOAL_TASK_REPLY_NO: string = "no";
    export const REHAGOAL_NOTIFICATION_REPLY_OK: string = "info_ok";

    export const REHAGOAL_API_TYPE_WORKFLOW_LIST: string = "workflow_list";
    export const REHAGOAL_API_TYPE_SETTINGS: string = "settings";
    export const REHAGOAL_API_TYPE_TASK: string = "task";
    export const REHAGOAL_API_TYPE_REPLY: string = "reply";
    export const REHAGOAL_API_TYPE_START: string = "start";
    export const REHAGOAL_API_TYPE_STOP: string = "stop";
    export const REHAGOAL_API_TYPE_QRCODE: string = "qrcode";
    export const REHAGOAL_API_TYPE_PING: string = "ping";
    export const REHAGOAL_API_TYPE_NOTIFICATION: string = "notification";

    // REHAGOAL_API Messages
    /**
     * Type definition for the protocol message handler
     */
    export type ProtocolMessageHandler = (msg: ProtocolMessage) => void;

    /**
     * Protocol definition with a list of valid messages
     */
    export type ProtocolMessage = TaskMessage
        | ListMessage
        | ReplyMessage
        | StartMessage
        | StopMessage
        | PingMessage
        | QRcodeMessage
        | NotificationMessage
        | null;

    /**
     * Message definition for tasks
     */
    export interface TaskMessage {
        /**
         * contains a task object
         */
        task: Task
    }
    /**
     * Message definition for lists
     */
    export interface ListMessage {
        /**
         * contains a listObject object, either for workflow_list
         */
        workflow_list?: WorkflowIdentifier[]
    }
    /**
     * Message definition for replies
     */
    export interface ReplyMessage {
        /**
         * contains a reply object
         */
        reply: Reply
    }
    /**
     * Message definition for start
     */
    export interface StartMessage {
        /**
         * contains a start object
         */
        start: Start
    }
    /**
     * Message definition for stop
     */
    export interface StopMessage {
        /**
         * contains a stop object
         */
        stop: Stop
    }
    /**
     * Message definition for ping
     */
    export interface PingMessage {
        /**
         * contains a ping object
         */
        ping: Ping
    }
    /**
     * Message definition for QR codes
     */
    export interface QRcodeMessage {
        /**
         * contains a qrcode object
         */
        qrcode: QRcode
    }
    /**
     * Message definition for notifications
     */
    export interface NotificationMessage {
        /**
         * contains a notification object
         */
        notification: Notification
    }
    /**
     * Task class
     */
    export interface Task {
        /**
         * Task-ID of this task
         */
        id: number,
        /**
         * defines the type of this task (simple, conditional, timer, parallel, end)
         */
        type: BlockType,
        /**
         * Description/target of this task
         */
        text: string
        /**
         * Contains the corresponding workflow id for the current task
         */
        workflowId?: number;
    }
    /**
     * Timer task class
     * extends the properties of task
     */
    export interface TimerTask extends Task {
        /**
         * contains the timer value of this task in seconds
         */
        timer: number | null;
    }
    /**
     * Parallel task class
     * extends the properties of task
     */
    export interface ParallelTask extends Task {
        /**
         * contains the number of subtask which have to be finished
         * in order to finish the parallel task
         */
        quantity: number;
        /**
         * contains all subtask of this parallel task
         */
        subtasks: Task[];
    }
    /**
     * Reply interface
     */
    export interface Reply {
        /**
         * Contains the id of task
         */
        taskId: number;
        /**
         * depending on the type of the task it could be yes/no/ok or
         * the id of the subtask, which was finished
         */
        response: string;
    }
    /**
     * Start interface
     */
    export interface Start {
        /**
         * Contains the id which should be started
         */
        id: number;
        /**
         * contains the type of id (workflow/scheduler)
         */
        type: string;
    }
    /**
     * Stop interface
     */
    export interface Stop {
        /**
         * Contains the workflow-id which should be stopped
         */
        id: number;
    }
    export interface Ping {
        /**
         * specifies the version of the companion device, must be lower
         * than the webapp in order to provide compatibility
         */
        rehagoal_api_version: number;
    }
    /**
     * QR Code interface
     */
    export interface QRcode {
        /**
         * an url scanned by a companion device to be processed by the importService
         */
        url: string
    }
    /**
     * Notification interface
     */
    export interface Notification {
        /**
         * Notification message to show on a companion device
         */
        text: string;
        taskId: number;
        workflowId: number;
    }

    /**
     * List class used for workflow_list
     */
    export interface WorkflowIdentifier {
        /**
         * identifier for this object
         */
        id: number;
        /**
         * type of this list object
         */
        name: string;
    }

    /**
     * Interface definition of a connectionCompanion
     */
    export interface IConnectionCompanion {
        /**
         * Transmits a protocol message with a given path to the companion device
         * @param path  defines the URI path for a given data message
         * @param data  contains an object with a message (string or message class)
         */
        putData(path: string, data: ProtocolMessage): void;
        /**
         * Registers or removes the smartCompanion listener function inside the
         * connectionCompanion
         * @param smartCompanionConnector listener callback
         */
        setDataReceivedListener(smartCompanionConnector: DataReceiveListener | null): void;
    }

    /**
     * Interface definition of a smartCompanionService
     */
    export interface ISmartCompanionService {
        /**
         * Adds a new companion to the current existing connection list
         * @param connection   inherited from IConnectionCompanion interface
         * @param name          name of this companion
         */
        addConnectionCompanion(connection: IConnectionCompanion, name: String): void;
        /**
         * Removes a given companion from the connection list
         * @param connection    inherited from IConnectionCompanion interface
         * @param name          name of this companion
         */
        removeConnectionCompanion(connection: IConnectionCompanion, name: String): void;
        /**
         * Sets the current workflow execution component for this companion
         * @param execution component of the currently executed workflow
         */
        setExecutionComponent(execution: IExecutionComponent): void

        // handle* are messages sent from a connected device to the app
        /**
         * Notifies that a companion device requested a new workflow_list
         * by sending an empty list (companion -> app)
         */
        handleWorkflowList(data: ListMessage): void;
        /**
         * Notifies the workflow execution that a stop request was send from a connected device
         * @param data stop action received containing the id of the currently executed workflow
         */
        handleStop(data: StopMessage): void;
        /**
         * Notifier for the task execution that the companion device has send an reply
         * @param data  message package containing the reply id of the current task
         *              and the response from the user
         */
        handleReply(data: ReplyMessage): void;
        /**
         * if a qr code has been scanned by an companion device, it notifies
         * the rehagoal app to import workflows from the containing url
         * @param data  message package that contains the url to be imported
         */
        handleQRcode(data: QRcodeMessage): void;
        /**
         * Compares the received version from the companion with the local version
         * @param data  ping package that contains the rehagoal_api_version
         */
        handlePing(data: PingMessage): void;
    }

    // Listener definition
    /**
     * Listener type for BlockChanged in ExecutionComponent
     */
    export type BlockChangeListener = () => void;
    /**
     * Listener type for WorkflowFinished in ExecutionComponent
     */
    export type WorkflowFinishListener = (id: number) => void;
    /**
     * Listener type for Notifications in ExecutionComponent
     */
    export type NotificationListener = (text: string) => void;
    /**
     * Listener type for SettingsChanged in SettingsService
     */
    export type SettingsChangeListener = () => void;

    /**
     * Listener type for Messages received by a companion
     */
    export type DataReceiveListener = (data: string) => void;
}
