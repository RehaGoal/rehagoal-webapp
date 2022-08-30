module rehagoal.smartCompanion {
    const moduleName = 'rehagoal.smartCompanion';

    export class BluetoothCompanionService implements IConnectionCompanion {

        private smartCompanionConnection: DataReceiveListener | null = null;

        static $inject = [
            '$log',
            '$document',
            '$window',
            '$cordovaBluetoothSerial',
            '$q'
        ];

        private deviceReadyDeferred: angular.IDeferred<void>;

        constructor(private $log: angular.ILogService,
                    private $document: angular.IDocumentService,
                    private $window: angular.IWindowService,
                    private $cordovaBluetoothSerial: ngCordova.IBluetoothSerial,
                    private $q: angular.IQService) {

            let vm = this;
            this.deviceReadyDeferred = $q.defer<void>();

            ($document[0] as Document).addEventListener('deviceready', function () {
                if (!!$window['cordova']) {
                    $log.info("Initialized BluetoothCompanionService.");
                    vm.smartCompanionConnection = null;
                    vm.deviceReadyDeferred.resolve();
                }
            });
        }

        private getBluetoothSerial(): angular.IPromise<ngCordova.IBluetoothSerial> {
            let vm = this;
            return vm.deviceReadyDeferred.promise.then(() => {
                return vm.$cordovaBluetoothSerial;
            })
        }

        private successBT(msg: string): void {
            let vm = this;
            vm.$log.info("Bluetooth success: " + msg);
        }

        private failureBT(msg: string): void {
            let vm = this;
            vm.$log.error("Bluetooth failure: " + msg);
        }

        public isConnected(): boolean {
            let vm = this;
            let result: boolean = false;
            vm.getBluetoothSerial().then(btSerial => {
                btSerial.isConnected().then(
                    function () {
                        vm.successBT("Bluetooth is connected.");
                        result = true;
                        vm.getData();
                    },
                    function () {
                        vm.failureBT("Bluetooth is not connected");
                        result = false;
                    }
                );
            });
            return result;
        }

        public deviceList(): void {
            let vm = this;
            vm.getBluetoothSerial().then(btSerial => {
                btSerial.list().then(
                    function (devices) {
                        devices.forEach(function (device) {
                            vm.$log.info("device adress:" + device.address + " device name " + device.name);
                            vm.connectBT(device.address);
                            if (vm.isConnected()) {
                                return;
                            }
                        })
                    })
                    .catch(() => vm.failureBT("failure list all bonded devices"));
            });
        }

        public enableBT(): void {
            let vm = this;
            vm.getBluetoothSerial().then((btSerial) => {
                btSerial.isEnabled().then(function () {
                    vm.$log.info("Bluetooth is enabled");
                    vm.deviceList();
                    vm.isConnected();
                    vm.addListener();
                    vm.getData();
                }).catch(() => vm.failureBT("Bluetooth Disabled."));
            });
        }

        public connectBT(macAddress: string): void {
            let vm = this;
            if (!vm.isConnected()) {
                vm.getBluetoothSerial().then((btSerial) => {
                    btSerial.connect(macAddress)
                        .then(() => vm.successBT("Bluetooth connecting to " + macAddress))
                        .catch(() => vm.failureBT("Bluetooth connecting error"));
                });

            }
        }

        public disconnectBT(): void {
            let vm = this;
            vm.getBluetoothSerial().then((btSerial) => {
                btSerial.disconnect()
                    .then(() => vm.successBT("disconnected"))
                    .catch(() => vm.failureBT("disconnect"));
            });
        }

        public putData(path: string, data: ProtocolMessage): void {
            let vm = this;
            let json: string = vm.toJSON(data);
            vm.getBluetoothSerial().then((btSerial) => {
                btSerial.write(json)
                    .then(() => vm.successBT("writing " + json))
                    .catch(() => vm.failureBT(" writing " + json));
            });
        }

        private getData(): void {
            let vm = this;
            vm.getBluetoothSerial().then((btSerial) => {
                btSerial.read()
                    .then(function (data) {
                        vm.successBT("Incoming data: " + data);
                        if (vm.smartCompanionConnection !== null) {
                            vm.smartCompanionConnection(data);
                        }
                        vm.getData();
                    });
            });
        }

        private addListener(): void {
            let vm = this;
            vm.getBluetoothSerial().then((btSerial) => {
                return btSerial.subscribe("\n")
                    .then((data) => {
                        vm.successBT("success subscribing");
                        vm.$log.info(data)
                    })
                    .catch(() => vm.failureBT("Subscribe Failed"));
            });
        }


        private toJSON(data: ProtocolMessage): string {
            return angular.toJson(data);
        }

        public setDataReceivedListener(smartCompanionConnector: rehagoal.smartCompanion.DataReceiveListener | null): void {
            this.smartCompanionConnection = smartCompanionConnector;
            if (smartCompanionConnector === null) {
                this.disconnectBT();
            } else {
                this.enableBT();
            }
        }
    }

    angular.module(moduleName).service('bluetoothCompanionService', BluetoothCompanionService);
}
