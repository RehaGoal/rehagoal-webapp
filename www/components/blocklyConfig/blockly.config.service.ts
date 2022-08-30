


module rehagoal.blocklyConfig {
    import IBlocklyWorkspace = rehagoal.blockly.IBlocklyWorkspace;
    import Block = rehagoal.blockly.Block;
    import depthFirstSearchGenerator = rehagoal.utilities.depthFirstSearchGenerator;
    const moduleName = 'rehagoal.blocklyConfig';

    type DropdownOption = [string, string];


    export class BlocklyConfigService {
        static $inject = [
            '$log',
            'imageService'
        ];

        private imageOptions: DropdownOption[] = [];
        private blocklyIdToIndex: Map<string, number> = new Map<string, number>();

        constructor(private $log: angular.ILogService,
                    private imageService: rehagoal.images.ImageService) {
            let vm = this;
            vm.imageService.addImageUpdateListener(vm.refreshImageList);
            vm.resetWorkflow();
        };

        public resetWorkflow(): void {
            let vm = this;
            let options: DropdownOption[] = [];
            options.push(["<Bild>", " "]);
            vm.imageOptions = options;
        }

        public updateBlocklyIdMap(workspace: IBlocklyWorkspace): void {
            this.blocklyIdToIndex = BlocklyConfigService.buildIdToIndexMap(workspace);
        }

        public getBlockIndex(block: Block): number {
            const index = this.blocklyIdToIndex.get(block.id);
            if (index === undefined) {
                throw new Error(`Block id "${block.id}" not in blocklyIdToIndex map!`);
            }
            return index;
        }

        private static buildIdToIndexMap(workspace: IBlocklyWorkspace): Map<string, number> {
            const idMap: Map<string, number> = new Map<string, number>();
            const taskGroupTopBlocks = workspace.getTopBlocks(true).filter(block => block.type === 'task_group');
            if (taskGroupTopBlocks.length !== 1) {
                throw new Error('Expected exactly one task_group top block.');
            }
            const top = taskGroupTopBlocks[0];
            let lastId = -1;
            for (const block of depthFirstSearchGenerator(top, (block) => block.getChildren(true))) {
                idMap.set(block.id, ++lastId);
            }
            return idMap;
        }

        public refreshImageList = () => {
            let vm = this;
            let options: DropdownOption[] = [];
            options.push(["<Bild>", " "]);
            vm.imageOptions = options;
            for (let img of vm.imageService.workflowImageData) {
                let name = "Bild: " + String(img.name);
                vm.imageOptions.push([name, String(img.hash)]);
            }
        };

        public getImageOptions(): DropdownOption[] {
            let vm = this;
            return vm.imageOptions;
        }

    }
    angular.module(moduleName).service('blocklyConfigService', BlocklyConfigService);
}
