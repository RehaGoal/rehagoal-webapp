module rehagoal.exchange {
    import IProgressBar = rehagoal.overviewView.IProgressBar;
    import IImageDataMap = rehagoal.images.IImageDataMap;
    import HASH_LENGTH = rehagoal.utilities.HASH_LENGTH;
    import IMPORT_PROGRESS_UPDATE_EVENT = rehagoal.exchange.IMPORT_PROGRESS_UPDATE_EVENT;
    import assertUnreachable = rehagoal.utilities.assertUnreachable;

    const moduleName = 'rehagoal.exchange';

    /**
     * Default mime type filter for allowed images to be imported
     */
    const imageMimeTypePattern: string = 'image\\/[\\w+-.]+';
    const streamParserErrorRegExp: RegExp = new RegExp(/^Unexpected [A-Z_]+\(.*\) in state [A-Z_]+$/);

    export interface IImportJob {
        getProgressData(): IProgressBar,
        start(): Promise<void>
    }

    interface ImageDataBlobMap {
        [hash:string]: Blob
    }

    interface StreamedParsingState {
        hasVersionProperty: boolean
        hasWorkflowsProperty: boolean
        requiresImages: boolean
        containsImages: boolean
        version?: number
        workflows: IWorkflowWithImages[],
        imageFiles: ImageDataBlobMap
    }

    interface ImportTaskString {
        type: 'string',
        workflowJSON: string
    }

    interface ImportTaskStream {
        type: 'stream',
        jsonStream: ReadableStream<Uint8Array>
    }

    export type ImportTask = ImportTaskString | ImportTaskStream;
    type JsonParseOnValueCallback = (value: any, key: string | number | undefined, parent: any, stack: jsonparse.StackElement[]) => Promise<void>;

    abstract class AbstractImportJob implements IImportJob{

        private currentImportedIds: number[] = [];
        protected readonly progressData: IProgressBar;
        protected parsingState: StreamedParsingState = {
            hasVersionProperty: false,
            hasWorkflowsProperty: false,
            requiresImages: false,
            containsImages: false,
            workflows: [],
            imageFiles: {},
        }

        //TODO: We could decide to split actual import functionality (calling service methods) from the parsing (single responsibility).
        //      - AbstractWorkflowExchangeParser -> StreamedWorkflowExchangeParser, StringWorkflowExchangeParser
        //          - this also requires that there is a subprogress, which is provided by the parsers to the calling instance.
        //      - ImportJob (calls parser, uses returned IWorkflowsExchangeObjectWithBlobs to call other services (workflowService, imageService).
        //      - Splitting ImportJob into ParsingJob/ImportJob is likely too complex (a job depends on another one, how to calculate progress etc.)

        protected constructor(protected $log: angular.ILogService,
                              private workflowService: IWorkflowService,
                              private imageService: rehagoal.images.ImageService,
                              private hashFile: (file: Blob) => Promise<string>,
                              private settingsService: rehagoal.settings.SettingsService,
                              private $rootScope:  angular.IRootScopeService,
                              protected importTask: ImportTask) {

            this.progressData = {
                text: "",
                type: "",
                eventsCount: 0,
                eventsTotal: 1,
                finished: false,
            };
        };

        // TODO: Maybe make public? Add tests for parseToExchangeObject
        //       - test that resulting object does not contain more images than necessary for the workflows. (do we need this?)
        /**
         * Load and parse the data from an ImportTask to a workflow exchange object, where images are represented as Blobs.
         * @param task task from which to parse the data
         * @protected
         */
        protected abstract parseToExchangeObject(task: ImportTask): Promise<IWorkflowsExchangeObjectWithBlobs>;

        /** Encapsulates the import of a JSON into one single promise that is returned;
         *  also changes the progress data object depending on actual progress;
         *  when this promise is resolved, progressFinish is called and the progress data object is set to show its finished;
         *  when this promise is rejected, progressCancel is called and the progress data object is also set to show its finished;
         * @return {Promise<void>}
         */
        public start: () => Promise<void> = async () => {
            let vm = this;
            const timeBefore = performance.now();

            try {
                let parsedExchangeObject = await this.parseToExchangeObject(this.importTask);

                for (const workflow of parsedExchangeObject.workflows) {
                    await vm.importWorkflow(workflow, parsedExchangeObject.images)
                    vm.onAfterWorkflowImport();
                }
                vm.progressFinish();
                const timeAfter = performance.now();
                const duration = timeAfter - timeBefore;
                vm.$log.info(`Import Job finished after ${duration} ms.`);
            } catch (e) {
                vm.progressCancel();
                await vm.rollBackCurrentImports();
                return Promise.reject(e);
            }
        };

        protected onAfterWorkflowImport(): void {
            this.progressStep();
        }

        /**
         * Returns the current progress of the import job.
         */
        public getProgressData(): IProgressBar {
            return this.progressData;
        }

        /**
         * Helper function to log an error message and reject a promise
         * @param err   error message to be logged
         */
        protected async rejectPromiseWithError<T>(err: string): Promise<T> {
            let vm = this;
            vm.$log.error(err);
            throw new Error(err);
        }

        /**
         * Process the version property in the workflow JSON file.
         * Verifies the property and modifies the parsingState accordingly.
         * @param value value of the "version" property
         * @protected
         */
        protected async handleVersionProperty(value: any): Promise<void> {
            this.parsingState.hasVersionProperty = true;
            if (typeof value !== 'number') {
                return this.rejectPromiseWithError('Workflow import version is not a number');
            }
            if (value > this.workflowService.getVersion()) {
                return this.rejectPromiseWithError('Workflow import version is newer than current workflow version');
            }
            if (value < this.workflowService.getVersion()) {
                if (this.settingsService.studyModeEnabled) {
                    return this.rejectPromiseWithError('Workflow import of older version is not allowed if studyMode is enabled');
                } else {
                    this.$log.debug('Version of stored data does not match current version. Data might be incompatible!');
                }
            }
            this.parsingState.version = value;
        }

        /**
         * Process the workflows property in the workflow JSON file.
         * Verifies the property and modifies the parsingState accordingly.
         * @param value value of the "workflows" property
         * @protected
         */
        protected async handleWorkflowsProperty(value: any): Promise<void> {
            this.parsingState.hasWorkflowsProperty = true;
            if (!angular.isArray(value)) {
                this.$log.debug('Workflows property:', value);
                return this.rejectPromiseWithError('workflows property is not an array!');
            }
        }

        /**
         * Process a single workflow in the workflow JSON file.
         * Verifies the workflow properties and modifies parsingState accordingly.
         * @param index index of the workflow in the workflows array
         * @param workflow the workflow to process
         * @protected
         */
        protected async handleWorkflow(index: number, workflow: any): Promise<void> {
            if (!Object.prototype.hasOwnProperty.call(workflow, 'id')) {
                this.$log.debug('Workflow property: ', workflow);
                return this.rejectPromiseWithError('Missing id property of a workflow in import!');
            }
            if (!Object.prototype.hasOwnProperty.call(workflow,'name')) {
                this.$log.debug('Workflow property: ', workflow);
                return this.rejectPromiseWithError('Missing name property of a workflow in import!');
            }
            if (!Object.prototype.hasOwnProperty.call(workflow,'workspaceXml')) {
                this.$log.debug('Workflow property: ', workflow);
                return this.rejectPromiseWithError('Missing workspaceXml property of a workflow in import!');
            }
            if (!Object.prototype.hasOwnProperty.call(workflow,'uuid')) {
                if (this.settingsService.studyModeEnabled) {
                    return this.rejectPromiseWithError('Missing uuid property of a workflow in import!');
                } else {
                    this.$log.warn('Missing uuid property of a workflow in import! Workflow name: ' + workflow.name);
                }
            }
            if (Object.prototype.hasOwnProperty.call(workflow, 'images')) {
                this.parsingState.requiresImages = true;
            }
            this.parsingState.workflows[index] = workflow;
        }

        /**
         * Process the images property in the workflow JSON file.
         * Modifies the parsingState to confirm the existence of images.
         * @param value value of the "images" property
         * @protected
         */
        protected async handleImagesProperty(value: any): Promise<void> {
            this.parsingState.containsImages = true;
            if (!angular.isObject(value) || angular.isArray(value)) {
                this.$log.debug('Images property:', value);
                return this.rejectPromiseWithError('images property is not an object, or is an array!');
            }
        }

        /**
         * Process a single image file by loading it as a Blob and verifying the hash.
         * Modifies the parsingState accordingly (stores the image Blob).
         * Performs a progressStep (image data URI has been loaded as a Blob).
         * @param hash hash of the image, as specified in the JSON file (key).
         * @param value data URI of the image, as specified in the JSON file (value).
         * @protected
         */
        protected async handleImageFile(hash: string, value: string): Promise<void> {
            const blob = await this.generateBlobFromDataUri(value, imageMimeTypePattern);
            if (blob === null) {
                return this.rejectPromiseWithError('Images property is damaged and can\'t be correctly decoded!');
            }
            const hashFromFile = await this.hashFile(blob);
            if (hash !== hashFromFile) {
                return this.rejectPromiseWithError('Image hash does not match image data.');
            }
            this.parsingState.imageFiles[hash] = blob;
            this.onAfterImageFileParsed();
        }

        /**
         * Called after an image has been parsed from a data URI to a Blob.
         * Performs a progressStep.
         * @protected
         */
        protected onAfterImageFileParsed() {
            this.progressStep();
        }

        /**
         * Checks that the parsingState contains the required root properties of the JSON file ("version" and "workflows" property).
         * Rejects the promise otherwise.
         * @protected
         */
        protected async verifyHasRootProperties(): Promise<void> {
            if (!this.parsingState.hasVersionProperty) {
                return this.rejectPromiseWithError('Missing version information for workflow import! JSON is corrupted!');
            }
            if (!this.parsingState.hasWorkflowsProperty) {
                return this.rejectPromiseWithError('Missing workflows property in import!');
            }
        }

        /**
         * Verifies that the parsingState contains images, if and only if images are required for a workflow.
         * Rejects the promise otherwise.
         * @protected
         */
        protected async verifyImagesRequired(): Promise<void> {
            if (this.parsingState.requiresImages && !this.parsingState.containsImages) {
                return this.rejectPromiseWithError('Missing images property in import, while workflow contains images!');
            }
        }

        /**
         * Verifies that the format of the image hash seems to be valid (string and length is correct).
         * Throws an Error otherwise.
         * @param imageHash
         * @protected
         */
        protected verifyImageHashFormat(imageHash: any): asserts imageHash is string {
            if (!angular.isString(imageHash)) {
                throw new Error('Image hash should be a string!');
            }
            if (imageHash.length !== HASH_LENGTH) {
                throw new Error('Image hash referenced in a workflow is too short or too long to be valid!');
            }
        }

        /**
         * Reject the promise, due to a parsing error with the JSON file.
         * @param e original error
         * @protected
         */
        protected async rejectWithJSONParsingError<T>(e: Error): Promise<T> {
            this.$log.error("Syntax error in JSON file!: ", e);
            return this.rejectPromiseWithError('Could not parse workflow json');
        }

        /**
         * Increases the progress (eventsCount) and informs listeners.
         */
        private progressStep: () => void = () => {
            this.progressData.eventsCount++;
            this.$rootScope.$broadcast(IMPORT_PROGRESS_UPDATE_EVENT);
        };

        /**
         * Cancels the progress due to an error and informs listeners.
         */
        private progressCancel: () => void = () => {
            this.progressData.eventsCount = this.progressData.eventsTotal;
            this.progressData.finished = true;
            this.progressData.type = "danger";
            this.$rootScope.$broadcast(IMPORT_PROGRESS_UPDATE_EVENT);
        };

        /**
         * Sets the progress to finished and informs listeners.
         */
        private progressFinish: () => void = () => {
            this.progressData.finished = true;
            this.$rootScope.$broadcast(IMPORT_PROGRESS_UPDATE_EVENT);
        };

        /**
         * Removes all Workflows that are currently inside currentWorkflowsImportedIDs (this array is reset after
         * every import file)
         */
        private async rollBackCurrentImports(): Promise<void> {
            let vm = this;
            /** remove workflows */
            await Promise.all(vm.currentImportedIds.map((workflowID) => {
                vm.workflowService.deleteWorkflowById(workflowID);
            }));
            /** remove images stored for already imported workflows */
            await Promise.all(vm.currentImportedIds.map((workflowID) => {
                return vm.imageService.removeWorkflowImages(workflowID);
            }));
        }

        /**
         * Creates a new workflow in the workflow service, using the name, contents and uuid of the given workflow.
         * If a workflow contains images, it will sequentially call importImages for each image. In case of an error
         * it will remove all previously added images and the workflow itself.
         * A progressStep is performed for every imported image.
         * @param workflow  object containing relevant workflow data
         * @param imagesData    map which could be empty or contain hash -> dataUrl values
         */
        private async importWorkflow(workflow: IWorkflowWithImages, imagesData: IImageDataBlobMap) : Promise<void>{
            let vm = this;
            let newWorkflow: IWorkflow = await vm.workflowService.newWorkflow(workflow.name, workflow.workspaceXml, workflow.uuid);
            vm.currentImportedIds.push(newWorkflow.id);
            if(!workflow.images) {
                return Promise.resolve();
            }
            const imageNames = Object.getOwnPropertyNames(workflow.images);

            let imageInfos = imageNames.map((imageName) => {
                let imageHash = workflow.images[imageName];
                let blob = imagesData[imageHash];
                return {
                    hash: imageHash,
                    name: imageName,
                    blob,
                }
            });

            for (const imageInfo of imageInfos) {
                await vm.importImage(newWorkflow.id, imageInfo.name, imageInfo.hash, imageInfo.blob);
                vm.onAfterImageImport();
            }
        }

        /**
         * Called after an image has been imported to the database.
         * Performs a progressStep.
         * @protected
         */
        protected onAfterImageImport(): void {
            this.progressStep();
        }

        /**
         * Creates a new file based on the provided Blob to store it
         * inside the image database. Will only proceed if the provided hash matches the
         * generated file hash, otherwise rejects with an error. Will also reject if the image
         * has been already stored (previously)
         * @param workflowId    specifies under which workflow the file will be referenced to
         * @param name          image alias inside the given workflow
         * @param hash          integrity hash value of the expected file
         * @param image         blob value which contains the image binary value
         */
        private async importImage(workflowId: number, name: string, hash: string, image: Blob): Promise<void> {
            let vm = this;
            return vm.imageService.storeImageAs(workflowId, name, image, true);
        }

        /**
         * Creates a valid blob from a valid dataUri.
         * Note that this method is used instead of fetch, due to the CSP.
         * @param {string} dataUri: a valid dataUri has the format: "data:<type>;base64,<base64 encoded data>", were <type> could look like "image/png"
         * @param {string} mimeTypeRegExp: a RegExp containing the mime Type of the blob (e.g. <Code>'/image\\/[\\w-]+/'</Code>
         * @returns {Blob} a blob object including the data of the image given by the dataUri, or null if the blob creation failed
         */
        private async generateBlobFromDataUri(dataUri: string, mimeTypeRegExp?: string): Promise<Blob | null> {
            let regexMatch: RegExpExecArray | null =
                new RegExp(/^(data:)([\w\/+]+)(;charset=[\w-]+)?(;base64)?,(.*)/gi).exec(dataUri);

            if(!regexMatch) {
                return null;
            }

            let blob: Blob;
            try {
                if (regexMatch[4] !== ';base64') {
                    throw new Error('Only base64 DataURIs are supported!');
                }
                const byteString = atob(regexMatch[5]);
                const arrayBuffer = new ArrayBuffer(byteString.length);
                const bytesArray = new Uint8Array(arrayBuffer);
                for (let i = 0; i < byteString.length; i++) {
                    bytesArray[i] = byteString.charCodeAt(i);
                }
                blob = new Blob([bytesArray], {type: regexMatch[2]});
            } catch (err) {
                this.$log.error(err);
                return null;
            }

            let type: string = regexMatch[2];
            if(mimeTypeRegExp !== undefined && !type.match(mimeTypeRegExp)) {
                return null;
            }

            return blob;
        }
    }

    /**
     * ImportJob that loads the data from a string using `angular.fromJson`.
     * This job may exceed the available memory, especially on mobile devices, as the whole file is loaded into memory.
     */
    class StringImportJob extends AbstractImportJob {
        constructor($log: angular.ILogService,
                    workflowService: IWorkflowService,
                    imageService: rehagoal.images.ImageService,
                    hashFile: (file: Blob) => Promise<string>,
                    settingsService: rehagoal.settings.SettingsService,
                    $rootScope:  angular.IRootScopeService,
                    importTask: ImportTaskString) {
            super($log, workflowService, imageService, hashFile, settingsService, $rootScope, importTask);
        };

        /**
         * Returns the number of total progress events expected, given the workflows with images.
         * @param {{images?: Record<string, string>}[]} workflows   workflows part of the imported json file
         */
        private getNumberOfTotalEvents (workflows: {images?: Record<string, string>}[]): number {
            const referencedImageHashes = new Set();
            let numTotalEvents: number = workflows.length;
            for (let workflow of workflows) {
                if(!!workflow.images) {
                    Object.values(workflow.images).forEach((hash) => referencedImageHashes.add(hash));
                    numTotalEvents += Object.keys(workflow.images).length; // an event for storing image/reference to DB
                }
            }
            numTotalEvents += referencedImageHashes.size; // an event for image to Blob conversion
            return numTotalEvents;
        }

        /**
         * Verifies the hash format and returns all referenced hashes of images required by a workflow.
         * @param images object mapping of image name to image hash
         * @return array of referenced hashes, or empty array if no images were referenced.
         * @private
         */
        private async getRequiredImageHashes(images: IImageDataMap | undefined): Promise<string[]> {
            const requiredImageHashes = [];
            if (images === undefined) {
                return [];
            }

            for (const imageName of Object.getOwnPropertyNames(images)) {
                const imageHash = images[imageName];
                this.verifyImageHashFormat(imageHash);
                requiredImageHashes.push(imageHash);
            }
            return requiredImageHashes;
        }

        /**
         * Loads the required images as Blobs using `handleImageFile`.
         * Rejects if a referenced image does not exist in the mapping of hashes to data URIs.
         * @param requiredImageHashes array of hashes of the required images
         * @param images object mapping of hashes to the corresponding data URI of an image
         * @private
         */
        private async loadRequiredWorkflowImages(requiredImageHashes: string[], images: IImageDataMap): Promise<void> {
            for (const requiredImageHash of requiredImageHashes) {
                if (Object.prototype.hasOwnProperty.call(this.parsingState.imageFiles, requiredImageHash)) {
                    return;
                }
                const imageData = images[requiredImageHash];
                if (imageData === undefined) {
                    return this.rejectPromiseWithError('Workflow references an image hash for which no image data exists!');
                }
                await this.handleImageFile(requiredImageHash, imageData);
            }
        }

        /**
         * Parses and verifies the (already parsed) JSON data (object) into a WorkflowsExchangeObject.
         * @private
         */
        private async parseAndVerifyJSONSkeleton(): Promise<IWorkflowsExchangeObject> {
            if (this.importTask.type !== 'string') {
                return this.rejectPromiseWithError('Expected import task type "string"');
            }
            if (this.importTask.workflowJSON === undefined) {
                return this.rejectPromiseWithError('Expected argument workflowJSON not to be undefined.');
            }
            let workflowsExchangeObject: IWorkflowsExchangeObject;
            try {
                workflowsExchangeObject = angular.fromJson(this.importTask.workflowJSON);
            } catch(e) {
                return this.rejectWithJSONParsingError(e);
            }

            if (Object.prototype.hasOwnProperty.call(workflowsExchangeObject, 'version')) {
                this.parsingState.hasVersionProperty = true;
            }
            if (Object.prototype.hasOwnProperty.call(workflowsExchangeObject, 'workflows')) {
                this.parsingState.hasWorkflowsProperty = true;
            }
            await this.verifyHasRootProperties();

            if (Object.prototype.hasOwnProperty.call(workflowsExchangeObject, 'images')) {
                await this.handleImagesProperty(workflowsExchangeObject.images);
            }
            await this.handleVersionProperty(workflowsExchangeObject.version);
            await this.handleWorkflowsProperty(workflowsExchangeObject.workflows);
            return workflowsExchangeObject;
        }

        /**
         * Parses a json string and check the integrity of the resulting
         * workflowExchangeObject, which should have all relevant properties and values.
         * In case the check fails, it will reject the promise with an error message.
         */
        private async parseAndVerifyJSONContent(workflowsExchangeObject: IWorkflowsExchangeObject): Promise<IWorkflowsExchangeObjectWithBlobs> {
            for (const [i, workflow] of workflowsExchangeObject.workflows.entries()) {
                await this.handleWorkflow(i, workflow);
                const requiredImageHashes = await this.getRequiredImageHashes(workflow.images);
                if (requiredImageHashes.length > 0) {
                    this.parsingState.requiresImages = true;
                }
                await this.verifyImagesRequired();
                await this.loadRequiredWorkflowImages(requiredImageHashes, workflowsExchangeObject.images);
            }
            const parsedExchangeObject: IWorkflowsExchangeObjectWithBlobs = {
                version: this.parsingState.version!,
                workflows: this.parsingState.workflows,
                images: this.parsingState.imageFiles
            }

            return Promise.resolve(parsedExchangeObject);
        }

        protected async parseToExchangeObject(task: ImportTask): Promise<IWorkflowsExchangeObjectWithBlobs> {
            const preliminaryExchangeObject = await this.parseAndVerifyJSONSkeleton();
            this.progressData.eventsTotal = this.getNumberOfTotalEvents(preliminaryExchangeObject.workflows);
            return await this.parseAndVerifyJSONContent(preliminaryExchangeObject);
        }
    }

    /**
     * ImportJob that loads the data from a ReadableStream.
     * This job should work with larger files even on mobile devices, since not the whole file is loaded into memory.
     * Instead, only a section of the file at a time is loaded and parsed using jsonparse2.
     * The parser should be delayed by non-resolved Promises (async), therefore only what is currently required for parsing should
     * be referenced in memory.
     * However, Data URIs are still fully loaded into memory but are then converted to Blobs as early as possible.
     * Blobs may be stored by the browser in temporary storage, especially if the memory pressure is high enough.
     */
    class StreamImportJob extends AbstractImportJob {
        constructor($log: angular.ILogService,
                    workflowService: IWorkflowService,
                    imageService: rehagoal.images.ImageService,
                    hashFile: (file: Blob) => Promise<string>,
                    settingsService: rehagoal.settings.SettingsService,
                    $rootScope:  angular.IRootScopeService,
                    importTask: ImportTaskStream) {
            super($log,
                workflowService,
                imageService,
                hashFile,
                settingsService,
                $rootScope,
                importTask);
        };

        /**
         * Verifies that the imported file is valid (via parsingState), after the whole file has been streamed.
         * Checks that root properties where present, images only there if required and all required images are available.
         * Unnecessary image files are also removed from the workflowExchangeObject (similar to StringImporJob, which does not store
         * the images in the first place).
         * @private
         */
        private async verifyFinal(): Promise<void> {
            await this.verifyHasRootProperties();
            await this.verifyImagesRequired();
            const requiredImageHashes = new Set<string>();
            for (const workflow of this.parsingState.workflows) {
                if (angular.isObject(workflow.images)) {
                    const hashes = Object.values(workflow.images);
                    await this.verifyWorkflowImagesProvided(hashes);
                    hashes.forEach(requiredImageHashes.add, requiredImageHashes);
                }
            }

            // Normalize the resulting workflow exchange object, by removing unreferenced images.
            // TODO: Refactor parsing to separate class and test that unreferenced images are removed.
            this.removeUnnecessaryImageFiles(requiredImageHashes);
        }

        /**
         * Removes images except those with the given required image hashes from the parsingState.
         * Note that this method is necessary, as in the streamed case, we do not know which images may be necessary, until
         * the whole file has been loaded.
         * @param requiredImageHashes set of required image hashes (imags to keep)
         * @private
         */
        private removeUnnecessaryImageFiles(requiredImageHashes: Set<string>): void {
            const providedImageHashes = Object.keys(this.parsingState.imageFiles);
            // Streamed import only: may contain Blobs for images that are not required (but were provided in images section)
            // => Remove unnecessary images from the object
            const unnecessaryImageHashes = providedImageHashes.filter((hash) => !requiredImageHashes.has(hash));
            if (unnecessaryImageHashes.length > 0) {
                unnecessaryImageHashes.forEach((hash) => delete this.parsingState.imageFiles[hash]);
                this.$log.warn(`There were ${unnecessaryImageHashes.length} unnecessary images removed from the import.`);
            }
        }

        /**
         * Verifies that all images referenced by a workflow are provided in the parsingState.
         * @param imageHashes array of required image hashes of the workflow
         * @private
         */
        private async verifyWorkflowImagesProvided(imageHashes: string[]): Promise<void> {
            for (const imageHash of imageHashes) {
                if (!Object.prototype.hasOwnProperty.call(this.parsingState.imageFiles, imageHash)) {
                    return this.rejectPromiseWithError('Workflow references an image hash for which no image data exists!');
                }
            }
        }

        /**
         * Parses and verifies the streamed workflow JSON file using jsonparse2.
         * Returns a promise with the parsed and verified data.
         * The eventsTotal of progress is updated while properties are discovered in the stream.
         * @private
         */
        private async parseAndVerifyJSONStream(): Promise<IWorkflowsExchangeObjectWithBlobs> {
            const onValue = async (value: any, key: string | number | undefined, parent: any, stack: jsonparse.StackElement[]) => {
                let doDelete = true;
                if (stack.length === 1) { // root nodes
                    switch (key) {
                        case 'version':
                            await this.handleVersionProperty(value);
                            break;
                        case 'workflows':
                            await this.handleWorkflowsProperty(value);
                            break;
                        case 'images':
                            await this.handleImagesProperty(value);
                            break;
                        default:
                            doDelete = false;
                    }
                } else if (stack.length === 2 && stack[1].key === 'workflows' && parent instanceof Array && typeof key === 'number') {
                    this.progressData.eventsTotal++; // corresponding progressStep in start() when workflow is imported / onAfterWorkflowImport
                    await this.handleWorkflow(key, value);
                } else if (stack.length === 3 && key === 'images' && angular.isNumber(stack[2].key) && stack[1].key === 'workflows' && angular.isObject(value)) {
                    // image references in a workflow
                    const hashes = Object.values(value);
                    this.progressData.eventsTotal += hashes.length; // event for each image reference. corresponding progressStep in importWorkflow / onAfterImageImport.
                    hashes.forEach((hash) => this.verifyImageHashFormat(hash));
                    doDelete = false;
                } else if (stack.length === 2 && stack[1].key === 'images' && parent.constructor === Object && typeof key === 'string') {
                    this.progressData.eventsTotal++; // conversion to Blob. corresponding progressStep in handleImageFile / onAfterImageFileParsed
                    await this.handleImageFile(key, value);
                } else {
                    doDelete = false;
                }
                if (doDelete && parent !== undefined && key !== undefined) {
                    delete parent[key];
                }
            };
            await this.parseStream(onValue);
            await this.verifyFinal();
            return {
                version: this.parsingState.version!,
                images: this.parsingState.imageFiles,
                workflows: this.parsingState.workflows
            };
        }

        /**
         * Parses the stream using jsonparse2, letting the parser wait until a given section has been processed.
         * @param callback callback that is called for every value in the JSON file.
         * @private
         */
        private async parseStream(callback: JsonParseOnValueCallback): Promise<void> {
            if (this.importTask.type !== 'stream' || !this.importTask.jsonStream) {
                return this.rejectPromiseWithError('Expected stream import task or invalid stream');
            }
            const parser = new jsonparse.JsonParser({stringBufferSize: 64 * 1024});
            parser.onValue = callback;
            const reader = this.importTask.jsonStream.getReader();
            let parserPromise = Promise.resolve();
            while (true) {
                const {done, value} = await reader.read();
                if (done || value === undefined) {
                    break;
                }
                parserPromise = parserPromise
                    .then(async () => await parser.write(value));
            }
            try {
                await parserPromise;
            } catch (err) {
                if (streamParserErrorRegExp.exec(err.message) !== null) {
                    // rethrow as parsing error
                    return this.rejectWithJSONParsingError(err);
                }
                throw err;
            }
        }

        protected async parseToExchangeObject(task: ImportTask): Promise<IWorkflowsExchangeObjectWithBlobs> {
            // Progress may be seen as "completed" for a brief moment (0/0 events), but is updated later on
            this.progressData.eventsTotal = 0; //Updated during parsing
            return await this.parseAndVerifyJSONStream();
        }
    }

    angular.module(moduleName)
        .factory('importJobFactory', [
            '$log',
            'workflowService',
            'imageService',
            'hashFile',
            'settingsService',
            '$rootScope',
            function ($log: angular.ILogService,
                      workflowService: IWorkflowService,
                      imageService: rehagoal.images.ImageService,
                      hashFile: (file: Blob) => Promise<string>,
                      settingsService: rehagoal.settings.SettingsService,
                      $rootScope: angular.IRootScopeService) {
                return (importTask: ImportTask) => {
                    switch (importTask.type) {
                        case "string":
                            return new StringImportJob($log,
                                workflowService,
                                imageService,
                                hashFile,
                                settingsService,
                                $rootScope,
                                importTask);
                        case "stream":
                            return new StreamImportJob($log,
                                workflowService,
                                imageService,
                                hashFile,
                                settingsService,
                                $rootScope,
                                importTask);
                        default:
                            return assertUnreachable(importTask);
                    }
                }
            }

        ]);
}
