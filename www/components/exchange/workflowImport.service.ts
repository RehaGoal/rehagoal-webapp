module rehagoal.exchange {

    const moduleName = 'rehagoal.exchange';

    import IProgressBar = rehagoal.overviewView.IProgressBar;

    export const IMPORT_PROGRESS_UPDATE_EVENT: string = "update_import_progress";

    export interface IWorkflowImportService {
        /**
         * Import a workflow JSON file provided as a string.
         * This is a bit faster than the stream import method, but may exceed the available memory, especially on mobile devices.
         * @deprecated
         * @param workflowJSON workflow JSON file as string
         */
        importJSONString(workflowJSON: string): Promise<void>;
        /**
         * Import a workflow JSON file provided as a ReadableStream.
         * This is a bit slower than the string import method, but has lower memory requirements and therefore should work with
         * larger files, even on mobile devices.
         * @param jsonStream
         */
        importJSONStreamed(jsonStream: ReadableStream<Uint8Array>): Promise<void>;
        /**
         * Returns the current progress of all current import jobs.
         */
        getProgress(): IProgressBar[];
    }

    class WorkflowImportService implements IWorkflowImportService {

        private importJobs: IImportJob[] = [];

        static $inject = [
            'importJobFactory'
        ];

        constructor(private importJobFactory: (importTask: ImportTask) => IImportJob) {
        };

        private importJSON(task: ImportTask): Promise<void> {
            let vm = this;
            let importJob = vm.importJobFactory(task);

            vm.importJobs.push(importJob);
            let importJobPromise = importJob.start();

            importJobPromise = importJobPromise.finally(function () {
                if (vm.checkAllFinished()) {
                    vm.importJobs = [];
                }
            });

            return importJobPromise;
        }

        public importJSONString(workflowJSON: string): Promise<void> {
            return this.importJSON({type: 'string', workflowJSON});
        }

        public importJSONStreamed(jsonStream: ReadableStream<Uint8Array>): Promise<void> {
            return this.importJSON({type: 'stream', jsonStream});
        }

        public getProgress: () => IProgressBar[] = () => {
            let progressBars: IProgressBar[] = [];
            this.importJobs.map((importJob: IImportJob) => progressBars.push(importJob.getProgressData()));
            return progressBars;
        }

        private checkAllFinished(): boolean {
            let allFinished: boolean = true;
            for (let job of this.importJobs) {
                let progressData = job.getProgressData();
                allFinished = allFinished && progressData.finished && (progressData.eventsTotal === progressData.eventsCount);
            }
            return allFinished;
        }
    }

    angular.module(moduleName).service('workflowImportService', WorkflowImportService);
}
