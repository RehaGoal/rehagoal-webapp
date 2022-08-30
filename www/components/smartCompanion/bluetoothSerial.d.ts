declare module ngCordova {
    export interface IBluetoothDeviceInfo {
        address: string,
        name: string,
        class?: number
    }

    export interface IBluetoothSerial {
        connect(address: string): ng.IPromise<void>;
        connectInsecure(address: string): ng.IPromise<void>;
        disconnect(): ng.IPromise<void>;
        list(): ng.IPromise<IBluetoothDeviceInfo[]>;
        isEnabled(): ng.IPromise<void>;
        isConnected(): ng.IPromise<void>;
        available(): ng.IPromise<number>;
        read(): ng.IPromise<any>;
        readUntil(delimiter: string): ng.IPromise<any>;
        write(data: any): ng.IPromise<void>;
        subscribe(delimiter: string): ng.IPromise<any>;
        subscribeRawData(): ng.IPromise<any>;
        unsubscribe(): ng.IPromise<void>;
        unsubscribeRawData(): ng.IPromise<void>;
        clear(): ng.IPromise<void>;
        readRSSI(): ng.IPromise<any>;
    }
}