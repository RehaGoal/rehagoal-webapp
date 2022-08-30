module rehagoal.images {
    import TableDump = rehagoal.exchange.TableDump;
    import findNewNameFunc = rehagoal.utilities.findNewNameFunc;
    import IFileWithHash = rehagoal.database.IFileWithHash;
    import IFileReference = rehagoal.database.IFileReference;
    import NameConflictHandler = rehagoal.database.NameConflictHandler;
    const moduleName = 'rehagoal.images';

    export interface IImageDataMap {
        [key:string]: string
    }

    interface IWorkflowImagesMap {
        [key:number]: IFileReference[]
    }

    /**
     * This service is used to provide a mapping between a workflow and a datastore
     * to load images with their corresponding hash value.
     *
     * A workflow contains <i>n</i> images, which are represented by their hash value.
     * The datastore contains a name to the hash, as well as a list of all images which
     * are assigned to the given workflow id and possibly the meta type of an image
     */
    export class ImageService {
        static $inject = [
            'imagesDatabaseService',
            '$log',
            'hashFile',
            'findNewName',
            'readDataURLFromBlob',
            '$q'
        ];

        public workflowImageData: IFileReference[];
        private imageUpdateListeners: (() => void)[];
        private imageNames: string[];

        constructor(private imagesDatabaseService: rehagoal.database.ImagesDatabase,
                    private $log: angular.ILogService,
                    private hashFile: (file: Blob) => Promise<string>,
                    private findNewName: findNewNameFunc,
                    private readDataURLFromBlob: (blob: Blob) => Promise<string>) {
            this.workflowImageData = [];
            this.imageNames = [];
            this.imageUpdateListeners = [];
        };

        /**
         * Returns a datastructure containing a dump of the current images database.
         * @see {@link rehagoal.database.ImagesDatabase.dumpDB}
         */
        public dumpDB(): Promise<TableDump[]> {
            return this.imagesDatabaseService.dumpDB();
        }

        /**
         * Wrapper function between views and any datastore. Will store an image with a
         * given reference name for the supplied workflow id.
         * It checks if the image exists already in the datastore and / or the reference
         * name is already used. If the caller did not provide the allowOverwrite flag,
         * corresponding exceptions / errors will be thrown
         * @param workflowId    id of the workflow
         * @param imageName     name of the image it should be referenced by
         * @param image         image file / blob
         * @param allowOverwrite    flag to allow overwriting an existing entry
         */
        public storeImageAs = async (workflowId: number, imageName: string, image: Blob, allowOverwrite: boolean): Promise<void> => {
            let nameAlreadyUsed = false;

            const imageHash = await this.hashFile(image);
            if (await this.imagesDatabaseService.hasWorkflowImageReference(workflowId, imageName)) {
                nameAlreadyUsed = true;
            }
            if (await this.imagesDatabaseService.hasWorkflowImageHash(workflowId, imageHash)) {
                if (!allowOverwrite) {
                    if (nameAlreadyUsed) {
                        throw new Error('ImageExistsAlready');
                    } else {
                        throw new Error("ReferenceAlreadySaved");
                    }
                }
            } else if (nameAlreadyUsed) {
                if (!allowOverwrite) {
                    throw new Error("NameAlreadyUsed");
                }
            }
            return this.imagesDatabaseService.setWorkflowImageWithReference(workflowId, imageName, {hash: imageHash, data: image});
        };

        /**
         * Store multiple images with name references for a given workflow.
         * If for a given hash no Blob is provided, the reference will not be stored.
         * If an image with the given hash is already associated with the workflow, it will not be changed.
         * If the name of an image (in the reference) is already in use, a new name will be derived using `findNewName`.
         * @param workflowId workflow to which the images should be associated
         * @param imageReferences array of image references to be stored with the workflow (only added if a blob with the hash is provided in `imageData`).
         * @param imageData array of image files with hashes to be associated to the workflow (only stored if referenced by `imageReferences`.
         */
        public storeImages = async (workflowId: number, imageReferences: IFileReference[], imageData: IFileWithHash[]): Promise<void> => {
            const vm = this;
            const findNewNameConflictHandler: NameConflictHandler = (conflictingName, existingNames) =>
                vm.findNewName(existingNames, conflictingName);
            return this.imagesDatabaseService.setWorkflowImagesWithReferences(
                workflowId,
                imageReferences,
                imageData,
                findNewNameConflictHandler
            );
        }

        /**
         * gets a name for an image which was already stored inside the datastore
         * if there is a duplicate entry stored, it returns the reference name
         * otherwise it throws an ReferenceNotExisting error
         * @throws ReferenceNotExisting
         * @param workflowId    workflow id
         * @param image         image file which should be checked
         */
        public getDuplicateImageName = async (workflowId: number, image: Blob): Promise<string> => {
            let vm = this;

            const imageHash = await vm.hashFile(image);
            const entry = await vm.imagesDatabaseService.getWorkflowImageByHash(workflowId, imageHash);
            return entry.name;
        };

        public getImageNames = (): string[] => {
            return this.imageNames;
        };

        public getImageUrlFromHash = async (hash: string): Promise<string> => {
            const image = await this.imagesDatabaseService.getImageFile(hash);
            return URL.createObjectURL(image.data);
        };

        public getImageHash = async (workflowId: number, imageName: string): Promise<string> => {
            const entry = await this.imagesDatabaseService.getWorkflowImageByName(workflowId, imageName);
            return entry.hash;
        };

        public getImageUrl = async (workflowId: number, imageName: string): Promise<string> => {
            if (imageName === undefined) {
                throw new Error("no imageName provided");
            }
            const hash = await this.getImageHash(workflowId, imageName);
            return this.getImageUrlFromHash(hash);
        };

        public async getWorkflowImagesForIds(ids: number[]): Promise<IWorkflowImagesMap> {
            let imagesMap: IWorkflowImagesMap = {};
            if(!ids || ids.length == 0) {
                throw new Error('No workflowIds provided');
            }

            await Promise.all(ids.map(async (workflowId) => {
                imagesMap[workflowId] = await this.imagesDatabaseService.getWorkflowImages(workflowId);
            }));
            return imagesMap;
        };

        public removeImage = async (workflowId: number, imageName: string): Promise<boolean> => {
            if (workflowId === undefined) {
                throw new Error('no workflow id provided');
            }
            if (imageName === undefined) {
                throw new Error('no image name provided');
            }
            return this.imagesDatabaseService.removeImageEntry(workflowId, imageName);
        };

        public removeWorkflowImages = (workflowId: number): angular.IPromise<void>  => {
            if (workflowId === undefined) {
                throw new Error('no workflow id provided');
            }
            return this.imagesDatabaseService.removeWorkflowImages(workflowId);
        };

        /**
         * Update all image name/hash pairs for an associated workflow
         * @param {number} id - unique workflow id (locally) for which the datastore should be searched for
         * @return Promise - fulfilled when image names and data are loaded and returns all image names used
         */
        public refreshWorkflowImages = async (id: number): Promise<string[]> => {
            let vm = this;
            vm.imageNames = await vm.imagesDatabaseService.getImageNames(id);
            vm.workflowImageData = await vm.imagesDatabaseService.getWorkflowImages(id);
            for (let func of vm.imageUpdateListeners) {
                if (typeof func === "function") {
                    func();
                }
            }
            return vm.imageNames;
        };

        /**
         * add a new image update listener
         * @param {() => void} func the callback function
         * @return {Number} the index for the callback
         */
        public addImageUpdateListener = (func: () => void): number => {
            let vm = this;
            return vm.imageUpdateListeners.push(func) - 1;
        };

        /**
         * remove a listener for image update
         * @param {number} index
         */
        public removeImageUpdateListener = (index: number): void => {
            let vm = this;
            if (index >= 0 && index < vm.imageUpdateListeners.length) {
                vm.imageUpdateListeners.splice(index, 1);
            }
        };

        /**
         * duplicate all image links of workflow to another workflow
         * @param {Number} fromId the source workflow id
         * @param {Number} toId the target workflow id
         */
        public duplicateWorkflowImages = (fromId: number, toId: number): Promise<void> => {
            if (fromId === undefined) {
                throw new Error('no fromId provided');
            }
            if (toId === undefined) {
                throw new Error('no toId provided');
            }
            return this.imagesDatabaseService.duplicateWorkflowImages(fromId, toId);
        };

        /**
         * checks the workflowImageData if an image with given hash exists and returns the corresponding name
         * @param {string} hash of an image in the workflowImageData
         * @returns {string | null} name of that image
         */
        public getCorrespondingNameFromHash(hash: string): string | null {
            if (hash === undefined) {
                return null;
            }

            return this.getCorrespondingNamesFromHashes([hash]).get(hash) || null;
        }

        public getCorrespondingNamesFromHashes(hashes: string[]): Map<string, string> {
            let hashSet = new Set(hashes);
            let hashToName = new Map<string, string>();
            for (let img of this.workflowImageData) {
                if (hashSet.has(img.hash)) {
                    hashToName.set(img.hash, img.name);
                }
            }
            return hashToName;
        }

        public getImageDataForHashes(hashes: string[]): Promise<IFileWithHash[]> {
            return this.imagesDatabaseService.getImageFiles(hashes);
        }

        public releaseImageUrl(url: string): void {
            if (url) {
                URL.revokeObjectURL(url);
            }
        }

        public async loadImageHashToDataUriMap(workflowImagesMap: IWorkflowImagesMap): Promise<IImageDataMap> {
            let vm = this;
            let imageHashes: string[] = [];
            let imageDataMap: IImageDataMap = {};

            for (let workflow in workflowImagesMap) {
                if (!workflowImagesMap.hasOwnProperty(workflow)) {
                    continue;
                }
                let images = workflowImagesMap[workflow];
                if (images !== null) {
                    images.map((image) => {
                        imageHashes.push(image.hash);
                    })
                }
            }
            await Promise.all(imageHashes.map(async function (hash) {
                const image = await vm.imagesDatabaseService.getImageFile(hash);
                imageDataMap[hash] = await vm.readDataURLFromBlob(image.data);
            }));
            return imageDataMap
        }
    }

    angular.module(moduleName).service('imageService', ImageService);
}
