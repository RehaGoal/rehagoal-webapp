
declare module rehagoal.blockly {
    interface Block {
        id: string
        type: string
        previousConnection: BlocklyConnection
        nextConnection: BlocklyConnection
        outputConnection: BlocklyConnection
        getChildren(ordered: boolean): Block[]
        getInput(name: string): BlocklyInput
        toString(maxLength?: number, emptyToken?: string): string
        getFieldValue(name: string): any
        setFieldValue(newValue: string, name: string): void
        disabled: boolean
        setDisabled(disabled: boolean): void
        workspace: IBlocklyWorkspace;
    }

    interface BlockSvg extends Block, ISelectable /* ICopyable */ {
        new(workspace: IBlocklyWorkspaceSvg, prototypeName: string | null, opt_id?: string): BlockSvg
        svgGroup_: SVGGraphicsElement;
    }

    interface ISelectable {
        select(): void
        unselect(): void
    }

    interface BlocklyInput {
        name: string
        connection: BlocklyConnection
    }

    interface BlocklyConnection {
        new(source: Block, type: number): BlocklyConnection
        targetConnection: BlocklyConnection
        connect(otherConnection: BlocklyConnection): void
    }

    interface BlocklyAbstractEvent {
        new(): BlocklyAbstractEvent
        group: string;
        isBlank: null | boolean;
        recordUndo: boolean;
        workspaceId: string | undefined;
        previousConnection: BlocklyConnection;
        fromJson(json: object): void;
        toJson(): object;
        isNull(): boolean;
        run(_forward: boolean): void;
    }

    interface BlocklyOptions {
        toolbox?: HTMLElement | string;
        readOnly?: boolean;
        trashcan?: boolean;
        maxInstances?: {[type: string]: number;};
        maxTrashcanContents?: number;
        collapse?: boolean;
        comments?: boolean;
        disable?: boolean;
        sounds?: boolean;
        rtl?: boolean;
        horizontalLayout?: boolean;
        toolboxPosition?: string;
        css?: boolean;
        oneBasedIndex?: boolean;
        media?: string;
        theme?: any; //Blockly.Theme | BlocklyThemeOptions;
        move?: {
            scrollbars?: boolean;
            drag?: boolean;
            wheel?: boolean;
        };
        grid?: {
            spacing?: number;
            colour?: string;
            length?: number;
            snap?: boolean;
        };
        zoom?: {
            controls?: boolean;
            wheel?: boolean;
            startScale?: number;
            maxScale?: number;
            minScale?: number;
            scaleSpeed?: number;
            pinch?: boolean;
        };
        renderer?: string;
        parentWorkspace?: IBlocklyWorkspaceSvg;
    }

    interface IOptions {
        new(options: BlocklyOptions): IOptions
    }

    interface BlocklyMetrics {
        absoluteLeft: number;
        absoluteTop: number;
        contentHeight: number;
        contentLeft: number;
        contentTop: number;
        contentWidth: number;
        flyoutHeight?: number;
        flyoutWidth?: number;
        svgHeight?: number;
        svgWidth?: number;
        toolboxHeight?: number;
        toolboxPosition?: number;
        toolboxWidth?: number;
        viewHeight: number;
        viewLeft: number;
        viewTop: number;
        viewWidth: number;
    }

    interface IBlocklyWorkspace {
        new(): IBlocklyWorkspace;
        newBlock(prototypeName: string, opt_id?: string): Block
        getTopBlocks(ordered: boolean): Block[]
        getBlockById(id: string): Block | null
        getAllBlocks(): Block[]
        undo(redo: boolean): void
        // getUndoStack(): BlocklyAbstractEvent[] // Not yet available in current blockly version
        undoStack_: BlocklyAbstractEvent[] // Blockly.Events.Abstract[]
        redoStack_: BlocklyAbstractEvent[] // Blockly.Events.Abstract[]
    }

    interface IBlocklyWorkspaceSvg extends IBlocklyWorkspace {
        new(options: IOptions, opt_blockDragSurface?: any, opt_wsDragSurface?: any): IBlocklyWorkspaceSvg;
        paste(xmlBlock: DocumentFragment | Element): void
        getMetrics(): BlocklyMetrics
    }

    interface IBlockly {
        Block: Block,
        BlockSvg: BlockSvg,
        Input: BlocklyInput
        Connection: BlocklyConnection
        Options: IOptions
        Xml: {
            textToDom(xmlText: string): Element
            blockToDom(block: Block, opt_noId?: boolean): Element | DocumentFragment
            blockToDomWithXY(block: Block, opt_noId?: boolean): Element | DocumentFragment
            workspaceToDom(workspace: IBlocklyWorkspace): Element
            domToWorkspace(dom: Element, workspace: IBlocklyWorkspace): void
            domToText(dom: Node): string
        },
        JavaScript: {
            workspaceToCode(workspace: IBlocklyWorkspace): string
        }
        Workspace: IBlocklyWorkspace
        WorkspaceSvg: IBlocklyWorkspaceSvg
        Events: {
            disable(): void,
            enable(): void
            Abstract: BlocklyAbstractEvent
        } & typeof Events

        selected: Block | null /* Blockly.ICopyable */
        svgResize(workspace: IBlocklyWorkspace): void;
    }

    interface BlocklyMetrics {
        absoluteLeft: number;
        absoluteTop: number;
        contentHeight: number;
        contentLeft: number;
        contentTop: number;
        contentWidth: number;
        flyoutHeight?: number;
        flyoutWidth?: number;
        svgHeight?: number;
        svgWidth?: number;
        toolboxHeight?: number;
        toolboxPosition?: number;
        toolboxWidth?: number;
        viewHeight: number;
        viewLeft: number;
        viewTop: number;
        viewWidth: number;
    }

    enum Events {
        /**
         * Name of event that creates a block.
         * @const
         */
        CREATE = 'create',

        /**
         * Name of event that deletes a block.
         * @const
         */
        DELETE = 'delete',

        /**
         * Name of event that changes a block.
         * @const
         */
        CHANGE = 'change',

        /**
         * Name of event that moves a block.
         * @const
         */
        MOVE = 'move',

        /**
         * Name of event that records a UI change.
         * @const
         */
        UI = 'ui'
    }
}
