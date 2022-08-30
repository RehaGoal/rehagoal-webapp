'use strict';

module rehagoal.exchange {
    import MEGABYTE = rehagoal.utilities.MEGABYTE;
    describe('rehagoal.exchange', function () {
        describe('DownloadService', function () {
            type DownloadTestDataEntry = {blobData: string, filename: string};
            const testData: DownloadTestDataEntry[] = [
                {blobData: "testValue", filename: 'My filename'},
                {blobData: "anotherValue", filename: 'My filename2'}
            ];
            const {blobData: blobData1, filename: filename1} = testData[0];
            const blob1 = new Blob([blobData1]);
            const returnUrls = ['blob://some-blob-url', 'blob://some-other-url'];
            let downloadService: DownloadService;
            let $window: angular.IWindowService;
            let readFileAsText: (blob: Blob) => Promise<string>;
            let $cordovaFile: ngCordova.IFileService;
            let origCordova: Cordova;
            let $cordovaToastSpyObj: jasmine.SpyObj<ngCordova.IToastService>;

            beforeEach(() => angular.mock.module('rehagoal.utilities'));
            beforeEach(() => angular.mock.module('rehagoal.exchange',  function ($provide: angular.auto.IProvideService) {
                $cordovaToastSpyObj = jasmine.createSpyObj('$cordovaToast', ['showLongBottom', 'showShortBottom']);
                $provide.value('$cordovaToast', $cordovaToastSpyObj);
            }));
            beforeEach(() => inject(function(_downloadService_: DownloadService,
                                             _$window_: angular.IWindowService,
                                             _readFileAsText_: typeof readFileAsText,
                                             _$cordovaFile_: ngCordova.IFileService) {
                downloadService = _downloadService_;
                $window = _$window_;
                readFileAsText = _readFileAsText_;
                $cordovaFile = _$cordovaFile_;
            }));
            beforeEach(() => {
                origCordova = $window.cordova;
            });
            afterEach(() => {
                $window.cordova = origCordova;
            });

            describe('downloadFile', function () {
                let downloadFileCordovaSpy: jasmine.Spy;
                let downloadFileWebSpy: jasmine.Spy;
                let progressSpy: jasmine.Spy;

                beforeEach( () => {
                    downloadFileCordovaSpy = spyOn(downloadService, 'downloadFileCordova');
                    downloadFileWebSpy = spyOn(downloadService, 'downloadFileWeb').and.returnValues(...returnUrls);
                    progressSpy = jasmine.createSpy('progressCallback');
                });

                type PromiseResolved<T> = T extends Promise<infer R> ? R : never;

                async function testDownloadFile(type: 'web' | 'cordova',
                                                expectedReturnValue: PromiseResolved<ReturnType<typeof downloadService.downloadFile>>,
                                                testCaseData: DownloadTestDataEntry,
                                                progressCallback?: (progress: number | null) => void) {
                    const blob = new Blob([testCaseData.blobData]);
                    const expectedDownloadSpy = type === 'web' ? downloadFileWebSpy : downloadFileCordovaSpy;
                    const unexpectedDownloadSpy = type === 'web' ? downloadFileCordovaSpy : downloadFileWebSpy;
                    const actualReturnValue = await downloadService.downloadFile(blob, testCaseData.filename, progressCallback);
                    expect(unexpectedDownloadSpy).not.toHaveBeenCalled();
                    expect(expectedDownloadSpy).toHaveBeenCalledWith(blob, testCaseData.filename, progressCallback ?? jasmine.any(Function));
                    const callBlob: Blob = expectedDownloadSpy.calls.mostRecent().args[0];
                    expect(await readFileAsText(callBlob)).toEqual(testCaseData.blobData);
                    expect(actualReturnValue).toBe(expectedReturnValue);
                }

                describe('in a web environment', function () {
                    beforeEach(async (done) => {
                        expect($window.cordova).toBeUndefined();
                        done();
                    });


                    it('should download with web', async function (done) {
                        await testDownloadFile('web', returnUrls[0], testData[0], progressSpy);
                        await testDownloadFile('web', returnUrls[1], testData[1]);
                        done();
                    });
                    it('should pass progress callback', async function(done) {
                        await testDownloadFile('web', returnUrls[0], testData[0], progressSpy);
                        done();
                    })
                });
                describe('in a cordova environment', function () {
                    beforeEach( () => {
                        $window.cordova = {} as Cordova;
                    });

                    it('should download with cordova-file', async function (done) {
                        await testDownloadFile('cordova', null, testData[0]);
                        done();
                    });
                    it('should pass progress callback', async function(done) {
                        await testDownloadFile('cordova', null, testData[0], progressSpy);
                        done();
                    });
                });
            });
            describe('downloadFileCordova', function () {
                let writeFileSpy: jasmine.Spy;
                let writeExistingFileSpy: jasmine.Spy;
                beforeEach(() => {
                    writeFileSpy = spyOn($cordovaFile, 'writeFile').and.returnValue(Promise.resolve());
                    writeExistingFileSpy = spyOn($cordovaFile, 'writeExistingFile').and.returnValue(Promise.resolve());
                    if ($window.cordova === undefined) {
                        $window.cordova = {
                            file: {
                                externalRootDirectory: 'EXTERNAL_ROOT_DIR'
                            }
                        } as Cordova;
                    }
                });
                it('should download a file with cordova-file', async function(done) {
                    const replace = true;
                    const directory = $window.cordova.file.externalRootDirectory;
                    await downloadService.downloadFileCordova(blob1, filename1);
                    expect($cordovaFile.writeFile).toHaveBeenCalledWith(directory, filename1, blob1, replace);
                    expect($cordovaToastSpyObj.showLongBottom).toHaveBeenCalledWith("Successfully downloaded file to EXTERNAL_ROOT_DIR/My filename");
                    const callBlob: Blob = writeFileSpy.calls.mostRecent().args[2];
                    expect(await readFileAsText(callBlob)).toEqual(blobData1);
                    done();
                });
                function makeLargeBlob(): Blob {
                    return new Blob([new Uint8Array(10 * MEGABYTE)]);
                }
                it('should report progress', async function(done) {
                    const largeBlob1 = makeLargeBlob();
                    const progressSpy = jasmine.createSpy('progressCallback');
                    const replace = true;
                    const directory = $window.cordova.file.externalRootDirectory;
                    await downloadService.downloadFileCordova(largeBlob1, filename1, progressSpy);
                    expect($cordovaFile.writeFile).toHaveBeenCalledWith(directory, filename1, jasmine.any(Blob), replace);
                    expect($cordovaFile.writeFile).toHaveBeenCalledTimes(1);
                    expect($cordovaFile.writeExistingFile).toHaveBeenCalledTimes(2);
                    expect(progressSpy.calls.allArgs()).toEqual([[0], [0.4], [0.8], [1], [1]]);
                    const firstChunk: Blob = writeFileSpy.calls.mostRecent().args[2];
                    expect(firstChunk.size).toBe(4 * MEGABYTE);
                    const remainingChunks: Blob[] = writeExistingFileSpy.calls.allArgs().map((args) => args[2]);
                    expect(remainingChunks[0].size).toBe(4 * MEGABYTE);
                    expect(remainingChunks[1].size).toBe(2 * MEGABYTE);
                    expect(await readFileAsText(new Blob([firstChunk, ...remainingChunks]))).toEqual(await readFileAsText(largeBlob1));
                    done();
                });
            });
            describe('downloadFileWeb', function() {
                it('should download a file using a download link', async function(done) {
                    let createObjectURLSpy = spyOn($window.URL, 'createObjectURL').and.callThrough();
                    let downloadLinkSpy = {
                        attr: jasmine.createSpy('attr'),
                        0: {
                            dispatchEvent: jasmine.createSpy('dispatchEvent')
                        }
                    };
                    let angularElementSpy = spyOn(angular, 'element').and.returnValue(downloadLinkSpy);
                    const returnURL = downloadService.downloadFileWeb(blob1, filename1);
                    expect($window.URL.createObjectURL).toHaveBeenCalledTimes(1);
                    expect($window.URL.createObjectURL).toHaveBeenCalledWith(blob1);
                    const callBlob = createObjectURLSpy.calls.mostRecent().args[0];
                    expect(await readFileAsText(callBlob)).toEqual(blobData1);
                    expect(returnURL).toMatch(/blob:.*/);
                    expect(angular.element).toHaveBeenCalledWith('<a></a>');
                    expect(downloadLinkSpy.attr).toHaveBeenCalledWith('href', returnURL);
                    expect(downloadLinkSpy.attr).toHaveBeenCalledWith('download', filename1);
                    expect(downloadLinkSpy.attr).toHaveBeenCalledWith('target', '_self');
                    expect(downloadLinkSpy[0].dispatchEvent).toHaveBeenCalledTimes(1);
                    expect(downloadLinkSpy[0].dispatchEvent).toHaveBeenCalledWith(jasmine.any(MouseEvent));
                    expect(downloadLinkSpy[0].dispatchEvent).toHaveBeenCalledWith(jasmine.objectContaining({
                        type: 'click',
                        bubbles: true,
                        cancelable: true,
                        view: $window
                    }));

                    angularElementSpy.and.callThrough(); // cleanup
                    done();
                });
                it('should report progress (only null (indeterminate) and 1)', function () {
                    const progressSpy = jasmine.createSpy('progressCallback');
                    downloadService.downloadFileWeb(blob1, filename1, progressSpy);
                    expect(progressSpy.calls.allArgs()).toEqual([[null], [1]]);
                });
            });
            describe('revokeDownloadURL', function() {
                it('should revoke provided object url', function() {
                    spyOn($window.URL, 'revokeObjectURL');
                    downloadService.revokeDownloadURL(returnUrls[0]);
                    expect($window.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
                    expect($window.URL.revokeObjectURL).toHaveBeenCalledWith(returnUrls[0]);
                })
            });
        });
    });
}
