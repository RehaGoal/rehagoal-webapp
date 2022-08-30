module rehagoal.exchange {
    import IImageDataMap = rehagoal.images.IImageDataMap;
    import IFileReference = rehagoal.database.IFileReference;
    const moduleName = 'rehagoal.exchange';

    export interface IWorkflowExportService {
        getSerializedWorkflows(workflowIds: number[]): angular.IPromise<Blob>;
    }

    class WorkflowExportService implements IWorkflowExportService {

        static $inject = [
            'imageService',
            'workflowService'
        ];

        constructor(private imageService: rehagoal.images.ImageService,
                    private workflowService: IWorkflowService) {
        }

        public getSerializedWorkflows(workflowIds: number[]): angular.IPromise<Blob> {
            let vm = this;
            return vm.imageService.getWorkflowImagesForIds(workflowIds).then((workflowImagesMap) => {
                let exportList: IWorkflowWithImages[] = workflowIds.map((workflowId) => {
                    let workflow = vm.workflowService.getWorkflowById(workflowId);
                    if (workflow === null) {
                        throw ('Workflow could not been loaded');
                    }
                    let images: IFileReference[] = workflowImagesMap[workflowId];
                    return WorkflowExportService.extendWorkflowWithImages(workflow, images);
                });

                return vm.imageService.loadImageHashToDataUriMap(workflowImagesMap).then((imageDataMap) => {
                    let workflowsExchangeObject: IWorkflowsExchangeObject = {
                        version: vm.workflowService.getVersion(),
                        workflows: exportList,
                        images: imageDataMap
                    };
                    return new Blob([angular.toJson(workflowsExchangeObject)], {type: "application/json;charset=utf-8;"});
                });
            })
        }

        private static extendWorkflowWithImages(workflow: IWorkflow, images: IFileReference[]): IWorkflowWithImages {
            let workflowWithImages: IWorkflowWithImages;
            let imageMap: IImageDataMap = {};
            for (let image of images) {
                imageMap[image.name] = image.hash;
            }
            workflowWithImages = rehagoal.utilities.extend(workflow, {images: imageMap});
            return workflowWithImages;
        }
    }

    angular.module(moduleName).service('workflowExportService', WorkflowExportService);
}
