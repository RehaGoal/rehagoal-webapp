module rehagoal.testUtilities {
    import Block = rehagoal.blockly.Block;

    export class BlocklyTestHelpers {
        static attachBlockBelow(previousBlock: Block, nextBlock: Block) {
            nextBlock.previousConnection.connect(previousBlock.nextConnection);
        }

        static attachBlockAsChild(parent: Block, child: Block, inputName: string) {
            child.previousConnection.connect(parent.getInput(inputName).connection);
        }
    }

}
