module rehagoal.clipboard {
    import ClipboardDB = rehagoal.database.ClipboardDB;
    import IBlockly = rehagoal.blockly.IBlockly;
    import BlocklyClipboardEntry = rehagoal.database.BlocklyClipboardEntry;
    import ImageService = rehagoal.images.ImageService;
    import depthFirstSearchGenerator = rehagoal.utilities.depthFirstSearchGenerator;
    import IFileReference = rehagoal.database.IFileReference;
    import IFileWithHash = rehagoal.database.IFileWithHash;
    import IBlocklyImageService = rehagoal.blockly.IBlocklyImageService;
    const moduleName = 'rehagoal.clipboard';

    export type IBlocklyClipboardService = BlocklyClipboardService;

    class BlocklyClipboardService {
        static $inject = [
            '$log',
            'clipboardDatabaseService',
            'imageService',
            'blocklyService',
            'blocklyImageService',
        ];


        constructor(private $log: angular.ILogService,
                    private clipboardDB: ClipboardDB,
                    private imageService: ImageService,
                    private Blockly: IBlockly,
                    private blocklyImageService: IBlocklyImageService) {
        }

        /**
         * Determine all referenced image hashes of the given block and child blocks using depth-first search.
         * @param topBlock block from which to start searching for image references
         * @private
         * @return set of hashes that were referenced by the block or children.
         */
        private getReferencedImageHashes(topBlock: rehagoal.blockly.Block): Set<string> {
            const imageHashes = new Set<string>();
            for (const block of depthFirstSearchGenerator(topBlock, (node) => node.getChildren(true))) {
                const imageHash = block.getFieldValue('image');
                if (angular.isString(imageHash) && imageHash.trim()) {
                    imageHashes.add(imageHash);
                }
            }
            return imageHashes;
        }

        /**
         * Returns XML text describing the given block (and children).
         * @param block block for which to determine XML
         * @private
         */
        private getBlockXml(block: rehagoal.blockly.Block): string {
            const xmlDom = this.Blockly.Xml.blockToDom(block);
            return this.Blockly.Xml.domToText(xmlDom);
        }

        /**
         * Returns an array of image references (name+hash) matching the given array of hashes for the current workflow.
         * @param imageHashes hashes for which to determine the image references
         * @private
         */
        private getImageReferences(imageHashes: string[]): IFileReference[] {
            const imageHashToName = this.imageService.getCorrespondingNamesFromHashes(imageHashes);
            const references = [];
            for (const hash of imageHashes) {
                const name = imageHashToName.get(hash);
                if (!name) {
                    this.$log.warn(`Missing name for image with hash ${hash}!`);
                    continue
                }
                references.push({name, hash});
            }
            return references;
        }

        /**
         * Returns an array of image data (hash+blob) referenced by the given hashes.
         * @param imageHashes array of hashes to search for
         * @private
         */
        private getImageData(imageHashes: string[]): Promise<IFileWithHash[]> {
            return this.imageService.getImageDataForHashes(imageHashes);
        }

        /**
         * Copy the given block including all children and referenced images to the global blockly clipboard.
         * @param block block to copy (including all children / following blocks)
         */
        public async copy(block: rehagoal.blockly.Block | rehagoal.blockly.BlockSvg): Promise<void> {
            const imageHashes = [...this.getReferencedImageHashes(block)];
            const imageReferences = this.getImageReferences(imageHashes);
            const imageData = await this.getImageData(imageHashes);
            const xml = this.getBlockXml(block);
            const previewImageBlob = block instanceof this.Blockly.BlockSvg ?
                await this.blocklyImageService.getBlockAsSvgBlob(block)
                : undefined;
            await this.clipboardDB.setEntry({
                type: 'blockly',
                data: {
                    blocklyXml: xml,
                    images: {
                        references: imageReferences,
                        data: imageData
                    },
                    previewImage: previewImageBlob
                }
            })
        }

        /**
         * Returns the current clipboard entry or null as a Promise
         */
        public async getContent(): Promise<BlocklyClipboardEntry | null> {
            return this.clipboardDB.getEntry('blockly');
        }
    }

    angular.module(moduleName).service('blocklyClipboardService', BlocklyClipboardService);
}
