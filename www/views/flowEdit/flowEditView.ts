module rehagoal.flowEditView {
    import WorkflowExecutionBuilderService = rehagoal.workflow.WorkflowExecutionBuilderService;
    import IBlockly = rehagoal.blockly.IBlockly;
    import BlocklyConfigService = rehagoal.blocklyConfig.BlocklyConfigService;
    import ImageService = rehagoal.images.ImageService;
    import Block = rehagoal.blockly.Block;
    import IBlocklyWorkspace = rehagoal.blockly.IBlocklyWorkspace;
    import IBlocklyClipboardService = rehagoal.clipboard.IBlocklyClipboardService;
    import IBlocklyImageService = rehagoal.blockly.IBlocklyImageService;
    import IBlocklyWorkspaceSvg = rehagoal.blockly.IBlocklyWorkspaceSvg;
    import BlocklyMetrics = rehagoal.blockly.BlocklyMetrics;
    import CLIPBOARD_DATA_EXPIRED_EVENT = rehagoal.database.CLIPBOARD_DATA_EXPIRED_EVENT;
    import ClipboardEntryType = rehagoal.database.ClipboardEntryType;
    import readDataURLFromBlobType = rehagoal.utilities.readDataURLFromBlobType;
    const moduleName = 'rehagoal.flowEditView';

    const enum MODAL_MODE {
        OVERWRITE_IMAGE_AS,
        RENAME_IMAGE_AS,
        REMOVE_IMAGE
    }

    export class FlowEditViewController implements angular.IComponentController {
        static $inject = [
            '$log',
            '$scope',
            '$rootScope',
            '$routeParams',
            '$interval',
            'workflowService',
            'workflowExecutionBuilderService',
            'blocklyService',
            'blocklyConfigService',
            'blocklyImageService',
            'imageService',
            'settingsService',
            'Lightbox',
            'blocklyClipboardService',
        ];

        private blocklyDirty = false;
        private workspaceInitialized = false;
        private xml_text: string = "";

        public blocklyClipboardPreviewImageUrl: string | null = null;

        // FIXME: only public due to unit tests
        public uploadedImage: Blob | null = null;
        public uploadedImageUrl = "";

        // FIXME: only public due to unit tests
        public modalMode = 0;
        // FIXME: only public due to unit tests
        public newImageName = "";
        public previewImageName = "";
        public previewImageUrl = "";
        public imageNames: string[] = [];
        public promptModalTitle = "Title";
        public promptModalLabel = "Default Text";
        public promptModalAccept = "OK";
        public promptModalCancel = "Cancel";
        public modalShowTextBox = false;
        public imageSelectionActive = true;
        public previewOpen = false;
        public imageSelectLoaded = false;

        public alertIsWarning = false;
        public showAlertPreview = false;
        public showAlertSave = false;
        public alertMessagePreview = 'Alert';
        public alertMessageSave = 'Alert';
        public mainEditClass = 'col-main-m1';

        public copyInProgress = false;
        public showClipboardExpiryTooltip = false;

        public loadBlockly = false;
        // FIXME: only public due to unit tests
        public listenerIndex = -1;

        public workspace: IBlocklyWorkspaceSvg | null = null;
        public workflow: IWorkflow | null;

        // only public due to unit tests
        public showSizeWarning: boolean = false;

        public invalidImages: File[] | null = null;

        constructor(private $log: angular.ILogService,
                    private $scope: angular.IScope,
                    private $rootScope: angular.IRootScopeService,
                    private $routeParams: ng.route.IRouteParamsService,
                    private $interval: angular.IIntervalService,
                    private workflowService: IWorkflowService,
                    private workflowExecutionBuilder: WorkflowExecutionBuilderService,
                    private blockly: IBlockly,
                    private blocklyConfigService: BlocklyConfigService,
                    private blocklyImageService: IBlocklyImageService,
                    private imageService: ImageService,
                    private settingsService: rehagoal.settings.SettingsService,
                    // FIXME: any type
                    private Lightbox: any,
                    private blocklyClipboardService: IBlocklyClipboardService) {

            this.workflow = workflowService.getWorkflowById(Number($routeParams.workflowId));

            $scope.$watch(this.watchWorkspace, this.onWorkspaceChanged);

            $scope.$on('$locationChangeStart', (e) => {
                this.blocklyConfigService.resetWorkflow();
            });

            $scope.$on(CLIPBOARD_DATA_EXPIRED_EVENT, (ev, clipboardType: ClipboardEntryType) => {
                if (clipboardType === 'blockly') {
                    this.showClipboardExpiryTooltip = true;
                    this.$interval(() => {
                        this.showClipboardExpiryTooltip = false;
                    }, 2000, 1);
                    this.$scope.$applyAsync();
                }
            });

            this.init();

            $log.debug('FlowEdit Component initialized.');
        }

        public $onDestroy() {
            this.resetPreviewImage();
            this.resetBlocklyClipboardPreview();
            this.resetUploadedImage();
            this.imageService.removeImageUpdateListener(this.listenerIndex);
        }

        // FIXME: any type
        public onBlocklyChange(event: any): void {
            // @ts-ignore
            if (event.type === Blockly.Events.UI || event.type === Blockly.Events.CREATE) {
                return;
            }
            this.blocklyDirty = true;
            this.$scope.$applyAsync();
        }

        private init(): void {
            const vm = this;
            this.listenerIndex = this.imageService.addImageUpdateListener(this.updateImagesCallback);
            this.requestImagesUpdate().catch(function (e: Error) {
                vm.$log.error("Error while loading images", e);
                let errorMessage = "Unbekannter Fehler beim Laden der Bilder: " + e;
                if (e.name && e.name === "OpenFailedError") {
                    errorMessage = "Fehler beim Öffnen der Bilddatenbank. Sind Sie im privaten Modus?";
                }
                vm.$scope.$evalAsync(function () {
                    vm.showAlertMessage(errorMessage, true);
                });
            }).finally(function () {
                vm.$scope.$evalAsync(function () {
                    vm.loadBlockly = true;
                    vm.imageSelectLoaded = true;
                });
            });
        }

        public reloadPreview(): void {
            this.$scope.$broadcast('executionComponent.reloadWorkflow');
        }


        // FIXME: only public due to unit tests
        public resetPreviewImage(): void {
            const vm = this;
            if (this.previewImageUrl) {
                vm.imageService.releaseImageUrl(this.previewImageUrl);
            }
            vm.previewImageName = "";
            vm.previewImageUrl = "";
        }

        private updateMainEditClass(): void {
            const vm = this;
            const previousClass = this.mainEditClass;
            if (this.previewOpen) {
                if (this.imageSelectionActive) {
                    this.mainEditClass = 'col-main-s';
                } else {
                    this.mainEditClass = 'col-main-m2';
                }
            } else {
                if (this.imageSelectionActive) {
                    this.mainEditClass = 'col-main-m1';
                } else {
                    this.mainEditClass = 'col-main-l';
                }
            }

            if (previousClass !== this.mainEditClass) {
                this.$interval(function () {
                    vm.blockly.svgResize(vm.workspace!);
                }, 10, 25, false);
            }
        }

        // FIXME: only public due to unit tests
        public loadWorkspace(): void {
            if (this.workspace === null) {
                this.$log.warn('Workspace is null!');
                return;
            }
            this.xml_text = this.workflow!.workspaceXml;
            if (this.xml_text === null) {
                this.$log.info('Empty workflow');
                return;
            }
            const xml = this.blockly.Xml.textToDom(this.xml_text);
            this.blockly.Events.disable();
            this.blockly.Xml.domToWorkspace(xml, this.workspace);
            this.blockly.Events.enable();
        }

        public async saveWorkspace(): Promise<void> {
            let message;
            let isWarning = true;
            if (this.workspace === null) {
                this.$log.warn('Workspace is null!');
                message = 'Fehler beim Speichern!';
            } else {
                this.workflow!.workspaceXml = this.getXmlText();
                this.xml_text = this.workflow!.workspaceXml;
                await this.workflowService.saveWorkflow(this.workflow!);
                message = 'Workflow erfolgreich gespeichert!';
                isWarning = false;
                this.reloadPreview();
            }
            this.showAlertMessage(message, isWarning);
            this.$scope.$applyAsync();
        }

        private resetBlocklyClipboardPreview(): void {
            if (this.blocklyClipboardPreviewImageUrl !== null) {
                URL.revokeObjectURL(this.blocklyClipboardPreviewImageUrl);
                this.blocklyClipboardPreviewImageUrl = null;
                this.$scope.$applyAsync();
            }
        }

        public async updateBlocklyClipboardPreview(): Promise<void> {
            this.$log.debug("Start clipboard preview update");
            this.resetBlocklyClipboardPreview();
            const clipboardContent = await this.blocklyClipboardService.getContent();
            if (clipboardContent && clipboardContent.data.previewImage) {
                this.blocklyClipboardPreviewImageUrl = URL.createObjectURL(clipboardContent.data.previewImage);
            }
            this.$scope.$applyAsync();
            this.$log.debug("Clipboard preview update finished");
       }

        public undoBlockly(): void {
            if (this.workspace === null) {
                return;
            }
            this.workspace.undo(false);
        }

        public redoBlockly(): void {
            if (this.workspace === null) {
                return;
            }
            this.workspace.undo(true);
        }

        get undoAvailable(): boolean {
            return !!this.workspace?.undoStack_?.length;
        }

        get redoAvailable(): boolean {
            return !!this.workspace?.redoStack_?.length;
        }

        /**
         * Copy the currently selected block with children to the global blockly clipboard.
         * Images are stored with the block XML in the clipboard.
         */
        public async copyGlobally(): Promise<void> {
            this.$scope.$applyAsync(() => {
                this.copyInProgress = true;
            });
            try {
                const block = this.blockly.selected;
                if (block === null) {
                    return;
                }
                if (block.type === 'task_group') {
                    this.$log.info("Goal block copy is not allowed!");
                    return;
                }
                await this.blocklyClipboardService.copy(block);
                this.$log.info("Block copied!");
            } finally {
                this.$scope.$applyAsync(() => {
                    this.copyInProgress = false;
                });
            }
        }

        /**
         * Sets the position of the parent block in xmlDom to a ratio of the blockly view.
         * @param xmlDom Element for which to set the position (x/y attributes)
         * @param metrics metrics of the blockly workspace
         * @param viewRatioX ratio (number between 0 and 1) of the viewport in the x direction (width)
         * @param viewRatioY ratio (number between 0 and 1) of the viewport in the y direction (height)
         */
        private setBlockDomPastePositionUsingViewRatio(xmlDom: Element, metrics: BlocklyMetrics, viewRatioX: number, viewRatioY: number) {
            const x = Math.trunc(metrics.viewLeft + (metrics.viewWidth * viewRatioX));
            const y = Math.trunc(metrics.viewTop + (metrics.viewHeight * viewRatioY));
            xmlDom.setAttribute('x', x.toString());
            xmlDom.setAttribute('y', y.toString());
        }

        /**
         * Paste a block (including children) from the global blockly clipboard.
         * If the clipboard is empty, nothing will be pasted.
         * All images referenced in the original blocks are added to the current workflow, if necessary.
         */
        public async pasteGlobally(): Promise<void> {
            if (this.workspace === null || this.workflow === null) {
                return;
            }
            const clipboardContent = await this.blocklyClipboardService.getContent();
            if (clipboardContent === null) {
                this.$log.info("Clipboard is empty!");
                return;
            }
            const images = clipboardContent.data.images;
            if (images) {
                await this.imageService.storeImages(this.workflow.id, images.references, images.data);
                this.$log.info("Image import from clipboard complete");
                await this.requestImagesUpdate();
            }
            const xml = clipboardContent.data.blocklyXml;
            const xmlDom = this.blockly.Xml.textToDom(xml);
            const metrics = this.workspace.getMetrics();
            // set paste position: view top/center
            this.setBlockDomPastePositionUsingViewRatio(xmlDom, metrics, 0.5, 0);

            this.workspace.paste(xmlDom);
            this.$log.info("Block was pasted!");
        }

        public onPreviewNotification(title: string, text: string): void {
            this.showAlertMessagePreview(title + ": " + text);
        }

        public openPreviewImageLightbox(): void {
            let previewImageObj = {
                url: this.previewImageUrl,
                name: this.previewImageName,
                thumbUrl: this.previewImageUrl
            };
            this.Lightbox.openModal([previewImageObj], 0);
        }

        public confirmModal(): void {
            switch (this.modalMode) {
                case MODAL_MODE.OVERWRITE_IMAGE_AS:
                    this.storeImageAs(this.newImageName, true);
                    break;
                case MODAL_MODE.RENAME_IMAGE_AS:
                    this.storeImageAs(this.newImageName, true);
                    break;
                case MODAL_MODE.REMOVE_IMAGE:
                    this.removeImage();
                    break;
            }
        }

        public cancelModal(): void {
            switch (this.modalMode) {
                case MODAL_MODE.OVERWRITE_IMAGE_AS:
                    break;
                case MODAL_MODE.RENAME_IMAGE_AS:
                    break;
                case MODAL_MODE.REMOVE_IMAGE:
                    break;
            }
        }

        private requestPromptModal(): void {
            // Currently we need $$postDigest/timeout here, since the modal bindings have to be updated before triggering the actual modal
            // FIXME: Use modal function instead of modal bindings to trigger everything in one function (without state) and one digest cycle
            (this.$scope as any).$$postDigest(() => {
                this.$scope.$broadcast("promptModal.openModalEvent");
            });
        }

        public toggleImageSelection(): void {
            this.imageSelectionActive = !this.imageSelectionActive;
            this.updateMainEditClass();
        }

        private showAlertMessagePreview(msg: string): void {
            this.alertMessagePreview = msg;
            this.showAlertPreview = true;
            this.$interval(() => {
                this.showAlertPreview = false;
            }, 2900, 1);
        }

        // FIXME: only public due to unit tests
        public showAlertMessage(msg: string, isWarning: boolean): void {
            this.alertIsWarning = isWarning;
            this.alertMessageSave = msg;
            this.showAlertSave = true;
            this.$interval(() => {
                this.showAlertSave = false;
            }, 5000, 1);
        }

        private getXmlText(): string {
            const xml = this.blockly.Xml.workspaceToDom(this.workspace!);
            const xmlText = this.blockly.Xml.domToText(xml);
            return xmlText;
        }

        private getXmlTextStart(): string {
            return this.xml_text;
        }

        private workspaceHasChanged(): boolean {
            return this.blocklyDirty && this.getXmlText() !== this.getXmlTextStart();
        }

        public leaveModalEnabled(): boolean {
            return this.workspaceHasChanged();
        }

        private onWorkspaceChanged = (): void => {
            this.$log.debug("workspace = " + this.workspace);
            if (!this.workspaceInitialized && this.workspace !== null) {
                this.workspaceInitialized = true;
                this.loadWorkspace();
            }
        };

        private watchWorkspace = (): IBlocklyWorkspace | null => {
            return this.workspace;
        };

        public togglePreview(): void {
            this.previewOpen = !this.previewOpen;
            this.updateMainEditClass();
        }

        public closePreview(): void {
            this.previewOpen = false;
            this.updateMainEditClass();
        }

        public updateImageUrl(): void {
            const id = this.workflow!.id;

            this.imageService.releaseImageUrl(this.previewImageUrl);
            this.previewImageUrl = "";
            this.imageService.getImageUrl(id, this.previewImageName).then((url: string) => {
                this.$scope.$evalAsync(() => {
                    this.imageService.releaseImageUrl(this.previewImageUrl);
                    this.previewImageUrl = url;
                });
            }).catch(function () {
                // no previewImage found
            });
        }

        /**
         * upload a new image file temporarily
         * @param file the source image file
         */
        public uploadNewImage(file: Blob): void {
            if (file !== null && typeof file === 'object') {
                // revoke temporal image prior to new upload
                URL.revokeObjectURL(this.uploadedImageUrl);

                this.uploadedImage = file;
                this.uploadedImageUrl = URL.createObjectURL(this.uploadedImage);
            }
        }

        /**
         * checks if no image is uploaded, or errors were detected while uploading
         * @return <Code>true</Code> if uploadedImageUrl is an empty String or invalidImages is not null after an upload
         */
        public isEmptyOrFaultyImageUploaded(): boolean {
            return (this.uploadedImageUrl === "" || !!this.invalidImages);
        }

        //TODO test
        public shouldShowImageSizeWarning(): boolean {
            return (!this.isEmptyOrFaultyImageUploaded() && this.showSizeWarning)
        }

        //TODO test
        public isImageResizeEnabled(): boolean {
            return (this.settingsService.imageResizeEnabled)
        }

        get imageResizeMaxFileSize(): number {
            return this.settingsService.imageResizeMaxFileSize;
        }

        get imageResizeMaxWidth(): number {
            return this.settingsService.imageResizeMaxWidth;
        }

        get imageResizeMaxHeight(): number {
            return this.settingsService.imageResizeMaxHeight;
        }

        /**
         * checks FileSize and Image Size (Dimensions) within certain Dimensions (imageResizeMaxFileSize,
         * imageResizeMaxWidth or imageResizeMaxHeight - for direct values see
         * settingsService.imageResizeMax[FileSize|Width|Height]) and sets showSizeWarning equally
         * @param imgFile the image file
         * @param imgWidth width dimension of the image
         * @param imgHeight height dimension of the image
         * @return <Code>true</Code> if file size, width or height are exceeding boundaries
         */
        public shouldResizeImage(imgFile: Blob, imgWidth: number, imgHeight: number): boolean {
            if (!!imgFile) {
                this.showSizeWarning =
                    imgFile.size > this.imageResizeMaxFileSize ||
                    imgWidth > this.imageResizeMaxWidth ||
                    imgHeight > this.imageResizeMaxHeight;

                if (this.settingsService.imageResizeEnabled) {
                    return this.showSizeWarning;
                } else {
                    return false;
                }
            }
            return false;
        }

        /**
         *  Store a new image with the imageService
         * @param name              name of the image to be stored under
         * @param allowOverwrite     overwrite if there is already an entry
         */
        public storeImageAs(name: string, allowOverwrite: boolean): void {
            if (!name) {
                this.showAlertMessage("Bitte geben Sie einen Namen ein!", true);
                return;
            } else if (!this.uploadedImage) {
                //should be obsolete since button is not clickable if no image is uploaded
                this.showAlertMessage("Bitte wählen Sie ein Bild aus!", true);
                return;
            }

            const id = this.workflow!.id;
            this.imageService.storeImageAs(id, name, this.uploadedImage, allowOverwrite).then(() => {
                this.$scope.$evalAsync(() => {
                    this.previewImageName = name;
                });
            }).then(() => {
                this.requestImagesUpdate();
            }).catch((e: Error) => {
                if (e.message === "ImageExistsAlready") {
                    this.$scope.$evalAsync(() => {
                        this.showAlertMessage("Dieses Bild wurde bereits gespeichert!", true);
                    });
                } else if (e.message === "NameAlreadyUsed") {
                    this.showNameAlreadyUsed(name);
                } else if (e.message === "ReferenceAlreadySaved") {
                    this.imageService.getDuplicateImageName(id, this.uploadedImage!).then((duplicateName: string) => {
                        this.showImageAlreadySaved(duplicateName, name);
                    }).catch((reason: Error) => {
                        //TODO: either no image provided or fileReader got something wrong.
                        this.$log.error(reason);
                    });
                } else {
                    let reason = "Unbekannter Fehler: " + e;
                    if (e.name === "OpenFailedError") {
                        reason = "Die Bilddatenbank konnte nicht geöffnet werden. Privater Modus?";
                    } else if (e.name === "QuotaExceededError") {
                        reason = "Speicherplatz-Kontingent überschritten.";
                    }
                    this.$scope.$evalAsync(() => {
                        this.showAlertMessage("Fehler: Das Bild konnte nicht gespeichert werden: " + reason, true);
                    });
                    this.$log.warn("Error in storeImageAs: ");
                    this.$log.error(e);
                }
            });
        }

        private refreshBlocklyImageFields(): void {
            if (this.workspace === null) {
                return;
            }
            const imageFieldName = 'image';
            const allBlocks = this.workspace.getAllBlocks();
            allBlocks.forEach(function (block: Block) {
                const imageHash = block.getFieldValue(imageFieldName);
                if (imageHash !== null && imageHash !== ' ') {
                    block.setFieldValue(' ', imageFieldName);
                    block.setFieldValue(imageHash, imageFieldName);
                }
            });
        }

        /**
         * remove the current previewed image from database
         */
        // FIXME: only public due to unit tests
        public async removeImage(): Promise<void> {
            const id = this.workflow!.id;

            const allBlocks = this.workspace!.getAllBlocks();
            let unsavedChanges = false;
            for (let block of allBlocks) {
                const image = block.getFieldValue('image');
                if (image !== null) {
                    const imageName = this.imageService.getCorrespondingNameFromHash(image);
                    if (imageName !== null && imageName === this.previewImageName) {
                        block.setFieldValue(' ', 'image');
                        unsavedChanges = true;
                    }
                }
            }
            if (unsavedChanges) {
                await this.saveWorkspace();
            }

            await this.imageService.removeImage(id, this.previewImageName);
            await this.requestImagesUpdate();
            this.resetPreviewImage();
            this.$scope.$applyAsync();
        }

        // only public due to unit tests
        public resetUploadedImage(): void {
            if (this.uploadedImageUrl) {
                URL.revokeObjectURL(this.uploadedImageUrl);
                this.uploadedImageUrl = "";
            }
            this.uploadedImage = null;
        }

        // FIXME: only public due to unit tests
        public requestImagesUpdate(): Promise<void> {
            const id = this.workflow!.id;
            return this.imageService.refreshWorkflowImages(id).then((imageNames) => {
                this.$scope.$evalAsync(() => {
                    this.imageNames = imageNames;
                    this.refreshBlocklyImageFields();
                });
            }).then(() => {
                this.updateImageUrl();
            });

        }

        // FIXME: only public due to unit tests
        public updateImagesCallback = () => {
            this.imageNames = this.imageService.getImageNames();
            this.updateImageUrl();
        }

        private showNameAlreadyUsed(name: string): void {
            this.$scope.$evalAsync(() => {
                this.promptModalTitle = "Warnung";
                this.promptModalLabel = "Der Name '" + name + "' wurde bereits verwendet! " +
                    "Soll das alte Bild überschrieben werden? ";
                this.promptModalAccept = "Überschreiben";
                this.promptModalCancel = "Abbrechen";
                this.modalShowTextBox = false;
                this.modalMode = MODAL_MODE.OVERWRITE_IMAGE_AS;
                this.newImageName = name;
                this.requestPromptModal();
                this.$log.warn("showNameAlreadyUsed");
            });
        }

        private showImageAlreadySaved(oldName: string, newName: string): void {
            this.$scope.$evalAsync(() => {
                this.promptModalTitle = "Warnung";
                this.promptModalLabel = "Dieses Bild wurde bereits unter dem Namen '" + oldName + "' gespeichert! " +
                    "Möchten Sie dieses Bild in '" + newName + "' umbenennen?";
                this.promptModalAccept = "Umbenennen";
                this.promptModalCancel = "Abbrechen";
                this.modalShowTextBox = false;
                this.modalMode = MODAL_MODE.RENAME_IMAGE_AS;
                this.newImageName = newName;
                this.requestPromptModal();
                this.$log.warn("showImageAlreadySaved");
            });
        }

        public showRemoveImage(): void {
            this.promptModalTitle = "Warnung";
            this.promptModalLabel = "Soll das Bild '" + this.previewImageName + "' wirklich gelöscht werden? Dabei wird der aktuelle Workflow gespeichert.";
            this.promptModalAccept = "Löschen";
            this.promptModalCancel = "Abbrechen";
            this.modalShowTextBox = false;
            this.modalMode = MODAL_MODE.REMOVE_IMAGE;
            this.requestPromptModal();
            this.$log.warn("showRemoveImage");
        }
    }

    angular.module(moduleName, [
        'ngRoute',
        'bootstrapLightbox',
        'rehagoal.workflow',
        'rehagoal.blockly',
        'rehagoal.blocklyConfig',
        'rehagoal.clipboard',
        'rehagoal.leaveModal',
        'rehagoal.promptModal',
        'rehagoal.database']
    )
        .config(['$routeProvider', function ($routeProvider: ng.route.IRouteProvider) {
            $routeProvider.when('/edit/:workflowId', {
                template: '<flow-edit-view></flow-edit-view>'
            });
        }])
        .component('flowEditView', {
            templateUrl: 'views/flowEdit/flowEditView.html',
            controller: FlowEditViewController
        });
}
