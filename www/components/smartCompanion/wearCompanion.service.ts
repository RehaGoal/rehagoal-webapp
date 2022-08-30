module rehagoal.smartCompanion {
    import IWearDataApi = wearDataApi.IWearDataApi;
    import IDataEvent = wearDataApi.IDataEvent;
    import TYPE_CHANGED = wearDataApi.TYPE_CHANGED;
    import TYPE_DELETED = wearDataApi.TYPE_DELETED;

    const moduleName = 'rehagoal.smartCompanion';

    export class WearCompanionService implements IConnectionCompanion {

        static $inject = [
            '$log',
            '$document',
            '$window',
            '$q'
        ];

        private wearDataApi: IWearDataApi | undefined;
        private smartCompanionConnection: DataReceiveListener | null = null;
        private deviceReadyDeferred: angular.IDeferred<void>;

        constructor(private $log: angular.ILogService,
                    private $document: angular.IDocumentService,
                    private $window: angular.IWindowService,
                    private $q: angular.IQService){
            let vm = this;
            this.deviceReadyDeferred = $q.defer<void>();

            ($document[0] as Document).addEventListener('deviceready', function () {
                $log.info("Initialized WearCompanionService.");
                vm.wearDataApi = $window.WearDataApi;
                vm.deviceReadyDeferred.resolve();
                vm.addListener();
            });
        }

        public setDataReceivedListener(smartCompanionConnector: rehagoal.smartCompanion.DataReceiveListener | null) {
            this.smartCompanionConnection = smartCompanionConnector;
        }

        public putData(path: string, data: ProtocolMessage): void {
            let vm = this;
            vm.deviceReadyDeferred.promise.then(() => {
                vm.putDataInternal(path, data);
            });
        }
        private putDataInternal(path: string, data: ProtocolMessage): void {
            let vm = this;
            let dataJSON = angular.toJson(data);
            if (!vm.wearDataApi) {
                vm.$log.error('WearDataAPI not initialized yet.');
                return;
            }
            vm.wearDataApi.putDataItem(path, dataJSON,
                function() {
                    vm.$log.info("wear put success in path " + path);
                },
                function(err) {
                    vm.$log.warn("wear put failed, satus code: " + err.toString());
                }
            );
        }

        private addListener(): void {
            let vm = this;
            if (!vm.wearDataApi) {
                vm.$log.error('WearDataAPI not initialized yet.');
                return;
            }
            vm.wearDataApi.addListener((events: IDataEvent[]) => {
                for (let event of events) {
                    // e.g. "wear://5f8acdfb/rehagoal/webapp/ping"
                    const uriRegex = new RegExp(`^wear://\\w+${smartCompanion.REHAGOAL_PATH_PREFIX_WEBAPP}(\\w+)$`);
                    const uriMatch = uriRegex.exec(event.Uri);
                    if (uriMatch === null) {
                        vm.$log.debug(`Ignoring Wear Data API URI, as it does not match: ${event.Uri}`, event);
                        return;
                    }
                    let path:string = uriMatch[1];

                    if (event.Type === TYPE_CHANGED ) {
                        switch(path) {
                            case REHAGOAL_API_TYPE_WORKFLOW_LIST:
                            case REHAGOAL_API_TYPE_SETTINGS:
                            case REHAGOAL_API_TYPE_START:
                            case REHAGOAL_API_TYPE_STOP:
                            case REHAGOAL_API_TYPE_REPLY:
                            case REHAGOAL_API_TYPE_QRCODE:
                            case REHAGOAL_API_TYPE_NOTIFICATION:
                            case REHAGOAL_API_TYPE_PING:
                                if (vm.smartCompanionConnection !== null) {
                                    vm.smartCompanionConnection(event.Data.data);
                                }
                                break;
                            default:
                                break;
                        }
                    }
                }
            });
        }
    }
    angular.module(moduleName).service('wearCompanionService', WearCompanionService);
}
