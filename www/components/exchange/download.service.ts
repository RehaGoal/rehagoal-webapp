module rehagoal.exchange {
    import MEGABYTE = rehagoal.utilities.MEGABYTE;
    const moduleName = 'rehagoal.exchange';
    const cordovaDownloadDefaultChunkSize = 4 * MEGABYTE;

    type ProgressCallback = (progress: number | null) => void;

    /**
     * Provides functionality for downloading files to a device on various platforms.
     */
    export class DownloadService {

        static $inject = [
            '$log',
            '$window',
            '$cordovaFile',
            '$cordovaToast',
            '$q'
        ];

        constructor(private $log: angular.ILogService,
                    private $window: angular.IWindowService,
                    private $cordovaFile: ngCordova.IFileService,
                    private $cordovaToast: ngCordova.IToastService,
                    private $q: angular.IQService) {
        }

        /**
         * Downloads a file with a method appropriate for the current platform.
         * @param blob The data to download
         * @param filename The filename of the download
         * @param progressCallback Optional callback where progress may be reported (null: indeterminate, 1.0: complete)
         * @returns object URL which has to be revoked using `revokeDownloadURL` after the download, or null.
         */
        public async downloadFile(blob: Blob, filename: string, progressCallback: ProgressCallback = ()=>{}): Promise<string | null> {
            if (!!this.$window.cordova) {
                await this.downloadFileCordova(blob, filename, progressCallback);
                return null;
            } else {
                return this.downloadFileWeb(blob, filename, progressCallback);
            }
        }

        /**
         * Downloads a file on the cordova platform.
         * This saves the file on the externalRootDirectory (see cordova-file documentation) with the filename provided.
         * @param blob The data to download
         * @param filename The filename of the download
         * @param progressCallback Optional progress callback
         */
        public async downloadFileCordova(blob: Blob, filename: string, progressCallback: ProgressCallback = ()=>{}): Promise<void> {
            let vm = this;
            const directory = cordova.file.externalRootDirectory;
            const path = directory + "/" + filename;
            return this.writeFileChunkedCordova(directory, filename, blob, progressCallback)
                .then(function (success) {
                    const msg = "Successfully downloaded file to " + path;
                    vm.$log.info(msg);
                    vm.$cordovaToast.showLongBottom(msg);
                }, function (error) {
                    const msg = "Failed downloading file to " + path;
                    vm.$log.error(msg);
                    vm.$cordovaToast.showLongBottom(msg);
                });
        }

        /**
         * Writes a file in chunks on the Cordova platform. This can be used to write large files, which otherwise would
         * case an OutOfMemory error. Existing files will be replaced. Currently this function is intended to be called
         * once with a single Blob (it will itself continue writing chunks of that Blob until finished or an error occurs).
         * @param directory Directory where the file is placed
         * @param filename Name of the file to write
         * @param blob Blob containing the contents to write
         * @param progressCallback optional callback for reporting progress (range 0..1)
         * @param offset offset in the blob/file what to write
         * @param chunkSize size of each chunk.
         */
        private writeFileChunkedCordova(directory: string, filename: string, blob: Blob,
                                        progressCallback: ProgressCallback = ()=>{},
                                        offset: number = 0, chunkSize: number = cordovaDownloadDefaultChunkSize)
                                        : Promise<ProgressEvent | void> {
            let vm = this;
            if (offset >= blob.size) {
                progressCallback(1.0);
                return Promise.resolve();
            }
            const chunk = blob.slice(offset, offset + chunkSize);
            let promise: ngCordova.IFilePromise<ProgressEvent>;
            if (offset === 0) {
                vm.$log.debug("Writing first chunk of file. File will be replaced.");
                progressCallback(0);
                promise = vm.$cordovaFile.writeFile(directory, filename, chunk, true);
            } else {
                vm.$log.debug("Writing chunk", offset, offset + chunkSize, blob.size);
                promise = vm.$cordovaFile.writeExistingFile(directory, filename, chunk);
            }
            return new Promise((resolve, reject) => {
                promise.then(function (progress) {
                    offset = offset + chunkSize;
                    progressCallback(Math.min(offset, blob.size) / blob.size);
                    return vm.writeFileChunkedCordova(directory, filename, blob, progressCallback, offset, chunkSize);
                }).then(resolve, reject);
            });
        }

        /**
         * Revokes a URL, previously returned by `downloadFile` in order to release memory.
         * @param url URL to revoke
         */
        public revokeDownloadURL(url: string): void {
            this.$window.URL.revokeObjectURL(url);
        }

        /**
         * Downloads a file using a hyperlink in an `<a>` element, which is automatically clicked by issuing a MouseEvent.
         * This download method is appropriate in a web context, or if no other method works.
         * @param blob The data to download
         * @param filename The filename of the download
         * @param progressCallback Optional progress callback
         */
        public downloadFileWeb(blob: Blob, filename: string, progressCallback: ProgressCallback = ()=>{}): string {
            progressCallback(null);
            const exportUrl = this.$window.URL.createObjectURL(blob);
            const downloadLink = angular.element('<a></a>');
            downloadLink.attr('href', exportUrl);
            downloadLink.attr('download', filename);
            downloadLink.attr('target', '_self');
            downloadLink[0].dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
            progressCallback(1.0);
            return exportUrl;
        }

    }

    angular.module(moduleName).service('downloadService', DownloadService);
}
