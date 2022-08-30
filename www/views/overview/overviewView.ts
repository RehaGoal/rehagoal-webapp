module rehagoal.overviewView {
    import ImageService = rehagoal.images.ImageService;
    import RESTWorkflowExchangeService = rehagoal.exchange.RESTWorkflowExchangeService;
    import IntentImportService = rehagoal.intents.IntentImportService;
    import DownloadService = rehagoal.exchange.DownloadService;
    import IWorkflowExportService = rehagoal.exchange.IWorkflowExportService;
    import IWorkflowImportService = rehagoal.exchange.IWorkflowImportService;
    import ICalendarService = rehagoal.calendar.ICalendarService;
    const moduleName = 'rehagoal.overviewView';
    const defaultStorageUrl = '#';

    interface IScopeWithResults extends angular.IScope{
        results: IWorkflow[]
    }

    export interface IOverviewView {
        exportUrl: string;
        infoText: string;
        infoTitle: string;
        modalEnabled: boolean;
        promptAccept: string;
        promptCancel: string;
        promptLabel: string;
        promptTitle: string;
        workflowOrderType: string;
        workflowSelectAll: boolean;
        workflowSelection: {ids: {[id: string]: boolean}};
        workflows: IWorkflow[];
        lastClickedWorkflow: IWorkflow | null;

        beforeRename(workflow: IWorkflow): boolean
        deleteSelectedWorkflows(event?: Event): Promise<void>
        deleteWorkflow(id: number): Promise<void>
        duplicateWorkflow(id: number): Promise<void>
        exportSelectedWorkflows(event?: Event): Promise<void>
        getExportFileName(): string
        importWorkflows(blob: Blob): Promise<void>
        importWorkflowsFromServer(url: string | undefined): void
        newWorkflow(): Promise<void>
        renameWorkflow(workflow: IWorkflow): Promise<void>
        requestServerImportModal(): void
        toggleSelectAll(): void
        updateWorkflowSelectAll(): void
        handleWorkflowNameClicked(workflow: IWorkflow): void
    }

    class OverviewViewController implements angular.IComponentController, IOverviewView {
        static $inject = [
            '$log',
            '$location',
            '$window',
            '$scope',
            'workflowService',
            'imageService',
            'calendarService',
            '$cordovaFile',
            '$cordovaToast',
            '$Date',
            'restWorkflowExchangeService',
            'intentImportService',
            'workflowExportService',
            'workflowImportService',
            'readFileAsText',
            'settingsService',
            'downloadService'
        ];

        public promptTitle = "Workflow Import";
        public promptLabel = "Bitte Workflow-URL eingeben: ";
        public promptAccept = "Importieren";
        public promptCancel = "Abbrechen";
        public modalEnabled = true;
        public workflows: IWorkflow[] = [];
        public workflowSelection = {ids: {}};
        public workflowSelectAll = this.areAllWorkflowsSelected();
        public workflowOrderType = '-id';
        public infoTitle = 'Info';
        public infoText = 'Default Text';
        public exportUrl = defaultStorageUrl;
        public lastClickedWorkflow: IWorkflow | null = null;

        private serverExportInProgress = false;
        private serverExportUrl: string | null = null;
        private exportFileName = "export.json";
        private beforeRenameName: string | null = null;
        private importProgressUpdateEvent = rehagoal.exchange.IMPORT_PROGRESS_UPDATE_EVENT;

        constructor(private $log: angular.ILogService,
                    private $location: angular.ILocationService,
                    private $window: angular.IWindowService,
                    private $scope: IScopeWithResults,
                    private workflowService: IWorkflowService,
                    private imageService: ImageService,
                    private calendarService: ICalendarService,
                    private $cordovaFile: ngCordova.IFileService,
                    private $cordovaToast: ngCordova.IToastService,
                    private $Date: DateConstructor,
                    private restWorkflowExchangeService: RESTWorkflowExchangeService,
                    private intentImportService: IntentImportService,
                    private workflowExportService: IWorkflowExportService,
                    private workflowImportService: IWorkflowImportService,
                    private readFileAsText: utilities.readFileAsTextFunc,
                    private settingsService: SettingsService,
                    private downloadService: DownloadService) {
            $scope.$on('$destroy', () => {
                this.revokeExportUrl();
                this.settingsService.validateStudyModeEnabled();
            });

            $scope.$on("views.updateWorkflows", () => {
                this.updateWorkflows();
            });

            this.init();
        }

        private init(): void {
            this.updateWorkflows();
            // interval check to validate studyMode
            this.settingsService.validateStudyModeEnabled();
        }

        private revokeExportUrl(): void {
            if (this.exportUrl !== defaultStorageUrl) {
                this.$window.URL.revokeObjectURL(this.exportUrl);
                this.exportUrl = defaultStorageUrl;
            }
        }

        private updateWorkflows = (): void => {
            this.workflows = this.workflowService.getWorkflows();
            this.updateWorkflowSelectAll();
            this.$scope.$applyAsync();
        };

        public newWorkflow = async (): Promise<void> => {
            await this.workflowService.newWorkflow();
            this.updateWorkflows();
        };

        public beforeRename(workflow: IWorkflow): boolean {
            this.beforeRenameName = workflow.name;
            return true;
        }

        public async renameWorkflow(workflow: IWorkflow): Promise<void> {
            if (this.beforeRenameName === null) {
                throw new Error('beforeRenameName should not be null!');
            }
            await this.workflowService.renameWorkflow(this.beforeRenameName, workflow);
            this.updateWorkflows();
        }

        public handleWorkflowNameClicked(workflow: IWorkflow): void {
            this.lastClickedWorkflow = workflow;
        }

        private async deleteWorkflowInternal(id: number): Promise<void> {
            await this.calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents(id);
            await this.workflowService.deleteWorkflowById(id);
            await this.imageService.removeWorkflowImages(id);
            delete this.workflowSelection.ids[id];
            this.$log.info('images deleted for id:', id);
        }

        public async deleteWorkflow(id: number): Promise<void> {
            const vm = this;
            const flow = this.workflowService.getWorkflowById(id);
            if (flow !== null && this.$window.confirm("Wirklich den Workflow '" + flow.name + "' löschen?")) {
                try {
                    await this.deleteWorkflowInternal(id);
                } finally {
                    vm.updateWorkflows();
                }
            }
        }

        public async duplicateWorkflow(id: number): Promise<void> {
            const flow = this.workflowService.getWorkflowById(id);
            if (flow !== null) {
                const tempWorkflow = await this.workflowService.newWorkflow(flow.name, flow.workspaceXml, flow.uuid);
                try {
                    await this.imageService.duplicateWorkflowImages(id, tempWorkflow.id);
                    this.updateWorkflows();
                } catch (e) {
                    await this.deleteWorkflowInternal(tempWorkflow.id);
                    throw e;
                }
            }
        }

        private isServerExportPopoverOpen(): boolean {
            return this.serverExportUrl !== null || this.serverExportInProgress;
        }

        private areAllWorkflowsSelected(): boolean {
            if (Object.keys(this.workflowSelection.ids).length !== this.workflows.length) {
                return false;
            }
            for (let id in this.workflowSelection.ids) {
                if (!this.workflowSelection.ids[id]) {
                    return false;
                }
            }
            return true;
        }

        public updateWorkflowSelectAll(): void {
            this.workflowSelectAll = this.areAllWorkflowsSelected();
        }

        public toggleSelectAll(): void {
            for (let i = 0; i < this.$scope.results.length; ++i) {
                this.workflowSelection.ids[this.$scope.results[i].id] = this.workflowSelectAll;
            }
        }

        private clearSelection(): void {
            this.workflowSelection.ids = {};
        }

        public async deleteSelectedWorkflows(event?: Event): Promise<void> {
            if (event) {
                // Very important: Otherwise we could possibly perform a $locationChange,
                // which destroys this overviewView instance.
                // This also has to be performed before async calls, since event handling is synchronous.
                event.preventDefault();
            }
            const selectedWorkflows = [];
            let workflowNames = "";
            const ids = this.workflowSelection.ids;
            this.$log.debug("delete selection:", ids);
            for (let id in ids) {
                if (ids.hasOwnProperty(id) && ids[id]) {
                    selectedWorkflows.push(this.workflowService.getWorkflowById(parseInt(id)));
                    workflowNames += "- " + this.workflowService.getWorkflowById(parseInt(id))!.name + "\n";
                }
            }

            if (selectedWorkflows.length > 0) {
                if (this.$window.confirm(selectedWorkflows.length + " Workflows löschen?") &&
                    this.$window.confirm("Löschen bestätigen: \n" + workflowNames)) {
                    try {
                        await Promise.all(selectedWorkflows.map(async (flow) => {
                            try {
                                await this.deleteWorkflowInternal(flow!.id);
                            } catch (e) {
                                this.$log.error("Error during deletion of workflow", flow, e);
                                throw e;
                            }
                        }));
                    } finally {
                        this.clearSelection();
                        this.updateWorkflows();
                    }
                }
            } else {
                this.$log.debug('openModal');
                const text = 'Die Auswahl ist leer! \nBitte wählen Sie die gewünschten Workflows aus. \n' +
                    'Klicken Sie dazu in der linken Spalte auf die entsprechenden Kästchen.';
                this.$scope.$broadcast('infoModal.openModal', {modalTitle: 'Info', modalText: text});
            }
        }

        public async exportSelectedWorkflows(event?: Event): Promise<void> {
            if (event) {
                event.preventDefault();
            }
            this.revokeExportUrl();
            const workflowIds: number[] = [];
            const selectedWorkflows = this.workflowSelection.ids;

            for (let id in selectedWorkflows) {
                if (selectedWorkflows.hasOwnProperty(id) && selectedWorkflows[id]) {
                    workflowIds.push(parseInt(id));
                }
            }

            if (workflowIds.length > 0) {
                try {
                    const serializedWorkflows = await this.workflowExportService.getSerializedWorkflows(workflowIds);
                    this.setExportFileName(workflowIds);
                    this.exportUrl = await this.downloadService.downloadFile(serializedWorkflows, this.exportFileName) || "";
                    this.clearSelection();
                } catch (err) {
                    this.$log.error('Could not serialize workflows: ', err);
                    throw err;
                } finally {
                    this.$scope.$applyAsync();
                }
            } else {
                this.$log.debug('openModal');
                const text = 'Die Auswahl ist leer! \nBitte wählen Sie die gewünschten Workflows aus. \n' +
                    'Klicken Sie dazu in der linken Spalte auf die entsprechenden Kästchen.';
                this.$scope.$broadcast('infoModal.openModal', {modalTitle: 'Info', modalText: text});
            }
        }

        public async importWorkflows(blob: Blob): Promise<void> {
            if (event) {
                event.preventDefault();
            }
            if (blob === null || typeof blob !== 'object') {
                return;
            }

            try {
                await this.workflowImportService.importJSONStreamed(blob.stream());
            } catch (err) {
                this.$scope.$broadcast('infoModal.openModal', {
                    modalTitle: 'Fehler beim Import',
                    modalText: err.toString()
                });
            } finally {
                this.updateWorkflows();
            }
        }

        public requestServerImportModal(): void {
            this.$scope.$broadcast("promptModal.openModalEvent");
        }

        public async importWorkflowsFromServer(url: string | undefined): Promise<void> {
            if (url === undefined || url === "") {
                return;
            }
            try {
                await this.intentImportService.onNewIntent(url);
                this.updateWorkflows();
            } catch (err) {
                this.$log.debug('openModal');
                this.$scope.$broadcast('infoModal.openModal', {
                    modalTitle: 'Fehler beim Import',
                    modalText: err.toString()
                });
            }
        }

        private convertDateToTimeString(date: Date): string {
            const dateString = date.toISOString();
            const dateStr = dateString.substring(0, 10);
            const timeStr = dateString.substring(11, 19).replace(/\s*:\s*/g, "_");
            return (dateStr + "#" + timeStr);
        }

        private setExportFileName(workflowIds: number[]): void {
            // Use workflow name instead of rehagoal-export (single workflow)
            const filename = workflowIds.length === 1 ?
                this.workflowService.getWorkflowById(workflowIds[0])!.name.replace(/ /g, "_").toLowerCase()
                : "rehagoal-export";
            this.exportFileName = filename + "-" + this.convertDateToTimeString(new this.$Date()) + ".json";
        }

        public getExportFileName(): string {
            return this.exportFileName;
        }

        private getProgressBarStatus: () => IProgressBar[] = () => {
            return this.workflowImportService.getProgress();
        }

    }

    angular.module(moduleName, [
        'ngRoute',
        'ui.bootstrap',
        'ngFileUpload',
        'monospaced.qrcode',
        'ngCordova',
        'xeditable',
        'rehagoal.workflow',
        'rehagoal.infoModal',
        'rehagoal.promptModal',
        'rehagoal.utilities',
        'rehagoal.restClient',
        'rehagoal.intents',
        'rehagoal.images',
        'rehagoal.calendar',
        'rehagoal.exchange',
        'rehagoal.settings'])

        .config(['$routeProvider', function ($routeProvider: ng.route.IRouteProvider) {
            $routeProvider.when('/overview', {
                template: '<overview-view></overview-view>'
            });
        }])
        .component('overviewView', {
            templateUrl: 'views/overview/overviewView.html',
            controller: OverviewViewController
        });
}
