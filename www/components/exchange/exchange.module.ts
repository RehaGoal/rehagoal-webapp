module rehagoal.exchange {
    const moduleName = 'rehagoal.exchange';
    angular.module(moduleName, ['ngCordova', 'rehagoal.images', 'rehagoal.workflow', 'rehagoal.metrics', 'rehagoal.utilities', 'rehagoal.crypto', 'rehagoal.restClient']);

    import IImageDataMap = rehagoal.images.IImageDataMap;
    type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

    export interface IWorkflowWithImages extends IWorkflow {
        images: IImageDataMap;
    }

    export interface IWorkflowsExchangeObject {
        version: number,
        workflows: IWorkflowWithImages[],
        images : IImageDataMap
    }

    export interface IImageDataBlobMap {
        [key:string]: Blob
    }

    export interface IWorkflowsExchangeObjectWithBlobs extends Omit<IWorkflowsExchangeObject, 'images'> {
        images : IImageDataBlobMap
    }
}
