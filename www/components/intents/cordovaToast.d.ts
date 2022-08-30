// Ref: https://github.com/ksachdeva/ngCordova-typescript-demo/blob/master/local_typings/ng-cordova/toast.d.ts

declare module ngCordova {

    interface IToastService {

        showShortTop(message:string):angular.IPromise<any>;
        showShortCenter(message:string):angular.IPromise<any>;
        showShortBottom(message:string):angular.IPromise<any>;

        showLongTop(message:string):angular.IPromise<any>;
        showLongCenter(message:string):angular.IPromise<any>;
        showLongBottom(message:string):angular.IPromise<any>;

        show(message:string, duration:string, position:string):angular.IPromise<any>;
    }
}
