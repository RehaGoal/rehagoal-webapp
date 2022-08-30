module rehagoal.overviewView {
    import RESTWorkflowExchangeService = rehagoal.exchange.RESTWorkflowExchangeService;
    import AuthService = rehagoal.auth.AuthService;
    const moduleName = 'rehagoal.overviewView';

    export class ServerExportButtonController implements angular.IComponentController {
        static $inject = [
            '$log',
            '$scope',
            'workflowService',
            'restWorkflowExchangeService',
            'authService',
            '$q'
        ];

        public workflowSelection: { ids: number[] } | undefined;
        public showPopover: boolean = false;
        public serverExportInProgress: boolean = false;
        public exportErrorMessage: string | null = null;
        public serverExportUrl: string | null = null;


        constructor(private $log: angular.ILogService,
                    private $scope: angular.IScope,
                    private workflowService: IWorkflowService,
                    private restWorkflowExchangeService: RESTWorkflowExchangeService,
                    private authService: AuthService,
                    private $q: angular.IQService) {
        }

        $onInit(): void {
        }

        getServerExportStatus() {
            if (this.exportErrorMessage !== null) {
                return "Fehler: " + this.exportErrorMessage;
            }
            if (this.serverExportUrl !== null) {
                return "Erfolgreich exportiert!";
            }
            if (this.serverExportInProgress) {
                return "Bitte warten...";
            }
            return "Nichts exportiert";
        }

        exportSelectedWorkflowsToServer(): angular.IPromise<void> {
            //FIXME: use decorator instead of check in module
            let deferred = this.$q.defer<void>();
            let vm = this;
            if (!this.authService.isUserLoggedIn()) {
                this.authService.requestUserLogin().then(function() {
                    vm.exportSelectedWorkflowsToServer();
                });
                deferred.reject();
                return deferred.promise;
            }

            if (this.serverExportInProgress) {
                deferred.reject();
                return deferred.promise;
            }
            this.exportErrorMessage = null;
            this.serverExportUrl = null;
            let workflowIds: number[] = [];
            if (this.workflowSelection === undefined) {
                deferred.reject();
                return deferred.promise;
            }
            let ids = this.workflowSelection.ids;
            // TODO: Refactor duplicate code with exportSelectedWorkflows
            for (let id in ids) {
                if (ids.hasOwnProperty(id) && ids[id]) {
                    let id_int = Number.parseInt(id);
                    let workflow = this.workflowService.getWorkflowById(id_int);
                    if (workflow === null) {
                        throw "Unknown workflow id";
                    }
                    workflowIds.push(id_int);
                }
            }

            if (workflowIds.length > 0) {
                this.serverExportInProgress = true;
                this.showPopover = true;
                this.restWorkflowExchangeService.uploadWorkflows(workflowIds)
                    .then(function (url) {
                        vm.serverExportUrl = url;
                        vm.serverExportInProgress = false;
                        vm.showPopover = true;
                        deferred.resolve();
                    }).catch(function (err) {
                        vm.serverExportInProgress = false;
                        vm.exportErrorMessage = "";
                        if (err.status == -1) {
                            vm.exportErrorMessage = "Server nicht erreichbar. ";
                        }
                        vm.exportErrorMessage += "Status: " + err.status + " " + err.statusText;
                        vm.$log.error(err);
                        vm.showPopover = true;
                        deferred.reject();
                    });
            } else {
                this.exportErrorMessage = "Keine Workflows ausgewählt!";
                this.showPopover = true;
                deferred.reject();
            }
            return deferred.promise.then(() => {
                this.$scope.$applyAsync();
            });
        }
    }

    angular.module(moduleName).component('serverExportButton', {
        templateUrl: 'components/overview/serverExportButton.html',
        controller: ServerExportButtonController,
        bindings: {
            workflowSelection: '<',
            buttonText: '@',
        },
    });
}
