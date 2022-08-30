"use strict";
module rehagoal.exchange {
    import IProgressBar = rehagoal.overviewView.IProgressBar;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import assertUnreachable = rehagoal.utilities.assertUnreachable;
    describe('rehagoal.exchange', function () {
        describe('WorkflowImportService', function () {
            let workflowImportService: IWorkflowImportService;
            let mockImportJobFactory: jasmine.Spy;


            enum MockImportJobDescription {
                resolvedAndFinished = "resolvedAndFinished",
                resolvedAndMaybeFinished = "resolvedAndMaybeFinished",
                resolvedAndPending = "resolvedAndPending",
                rejectedAndFinished = "rejectedAndFinished",
                rejectedAndPending = "rejectedAndPending",
            }

            const {rejectedAndPending, resolvedAndPending, resolvedAndFinished, resolvedAndMaybeFinished, rejectedAndFinished} = MockImportJobDescription;

            function makeMockImportJob(promise: Promise<any>, total: number, count: number, finished?: boolean): IImportJob {
                return {
                    start: () => {
                        return promise.catch(() => {
                        })
                    },
                    getProgressData: () => {
                        return {
                            text: "",
                            type: "",
                            eventsTotal: total,
                            eventsCount: count,
                            finished: finished ?? total === count
                        }
                    }
                }
            }

            function makeMockImportJobViaDescription(jobDescription: MockImportJobDescription): IImportJob {
                switch (jobDescription) {
                    case (resolvedAndFinished): {
                        return makeMockImportJob(Promise.resolve(), 1, 1);
                    }
                    case (resolvedAndMaybeFinished): {
                        return makeMockImportJob(Promise.resolve(), 1, 1, false);
                    }
                    case (resolvedAndPending): {
                        return makeMockImportJob(Promise.resolve(), 1, 0);
                    }
                    case (rejectedAndFinished): {
                        return makeMockImportJob(Promise.reject(new Error()), 1, 1);
                    }
                    case (rejectedAndPending): {
                        return makeMockImportJob(Promise.reject(new Error()), 1, 0);
                    }
                    default: {
                        return assertUnreachable(jobDescription);
                    }
                }
            }



            beforeEach(() => angular.mock.module('rehagoal.exchange', function ($provide: angular.auto.IProvideService) {
                mockImportJobFactory = jasmine.createSpy('importJobFactory');
                mockImportJobFactory.and.returnValue(makeMockImportJobViaDescription(resolvedAndPending));
                $provide.value('importJobFactory', mockImportJobFactory);
            }));

            beforeEach(() => {
                inject(function (_workflowImportService_: IWorkflowImportService) {
                    workflowImportService = _workflowImportService_;
                })
            });

            describe('properties and methods', function () {
                it('controller should be defined', function () {
                    expect(workflowImportService).toBeDefined();
                });
                it('importJSONString should be defined', function () {
                    expect(workflowImportService.importJSONString).toBeDefined();
                });
                it('importJSONStreamed should be defined', function () {
                    expect(workflowImportService.importJSONStreamed).toBeDefined();
                });
                it('getProgress should be defined', function () {
                    expect(workflowImportService.getProgress).toBeDefined();
                });
            });

            describe('importJsonString', function () {
                it('should call importJobFactory and give the workflowJson string through', async function (done: DoneFn) {
                    const testString = "test";
                    await tryOrFailAsync(async () => {
                        await workflowImportService.importJSONString(testString);
                        expect(mockImportJobFactory).toHaveBeenCalledTimes(1);
                        expect(mockImportJobFactory).toHaveBeenCalledWith({
                            type: 'string',
                            workflowJSON: testString
                        });
                    });
                    done();
                });

                function makeImportStringTask(jobDescription: MockImportJobDescription): ImportTask {
                    return {type: 'string', workflowJSON: jobDescription};
                }

                async function checkRememberImportJobs(jobDescriptions: MockImportJobDescription[]) {
                    await tryOrFailAsync(async () => {
                        const expectedJobFactoryArgs = [];
                        const returnedImportJobMocks = jobDescriptions.map(makeMockImportJobViaDescription);
                        mockImportJobFactory.and.returnValues(...returnedImportJobMocks);
                        for (const jobDescription of jobDescriptions) {
                            await workflowImportService.importJSONString(jobDescription);
                            expectedJobFactoryArgs.push([makeImportStringTask(jobDescription)]);
                        }
                        expect(mockImportJobFactory.calls.allArgs()).toEqual(expectedJobFactoryArgs);
                        expect(mockImportJobFactory).toHaveBeenCalledTimes(expectedJobFactoryArgs.length);
                        // FIXME: bad access to private property
                        expect(workflowImportService["importJobs"]).toEqual(returnedImportJobMocks);
                    });
                }

                it('should create and remember any importJob whose progress is not yet finished, regardless of promise state', async function (done: DoneFn) {
                    await checkRememberImportJobs([resolvedAndPending,
                        rejectedAndPending,
                        resolvedAndMaybeFinished,
                        resolvedAndPending]);
                    done();
                });

                it('should create and remember any importJob until all are finished, regardless of promise state', async function (done: DoneFn) {
                    await checkRememberImportJobs([resolvedAndPending,
                        rejectedAndFinished,
                        resolvedAndFinished]);
                    done();
                });

                it('should clear any remembered imports once they are finished, regardless of promise state', async function (done: DoneFn) {
                    await tryOrFailAsync(async () => {
                        mockImportJobFactory.and.returnValues(makeMockImportJobViaDescription(resolvedAndFinished));
                        await workflowImportService.importJSONString(resolvedAndFinished);
                        expect(mockImportJobFactory.calls.allArgs()).toEqual([[makeImportStringTask(resolvedAndFinished)]]);
                        expect(mockImportJobFactory).toHaveBeenCalledTimes(1);
                        // FIXME: bad access to private property
                        expect(workflowImportService["importJobs"]).toEqual([]);

                        mockImportJobFactory.and.returnValues(makeMockImportJobViaDescription(rejectedAndFinished));
                        await workflowImportService.importJSONString(rejectedAndFinished);
                        expect(mockImportJobFactory.calls.allArgs()).toEqual([
                            [makeImportStringTask(resolvedAndFinished)],
                            [makeImportStringTask(rejectedAndFinished)]
                        ]);
                        expect(mockImportJobFactory).toHaveBeenCalledTimes(2);
                        // FIXME: bad access to private property
                        expect(workflowImportService["importJobs"]).toEqual([]);

                        mockImportJobFactory.and.returnValues(makeMockImportJobViaDescription(resolvedAndFinished));
                        await workflowImportService.importJSONString(resolvedAndFinished);
                        expect(mockImportJobFactory.calls.allArgs()).toEqual([
                            [makeImportStringTask(resolvedAndFinished)],
                            [makeImportStringTask(rejectedAndFinished)],
                            [makeImportStringTask(resolvedAndFinished)]
                        ]);
                        expect(mockImportJobFactory).toHaveBeenCalledTimes(3);
                        // FIXME: bad access to private property
                        expect(workflowImportService["importJobs"]).toEqual([]);
                    });
                    done();
                });
            });

            describe('getProgress', function () {
                const pendingProgress: IProgressBar = {
                    text: "",
                    type: "",
                    eventsTotal: 1,
                    eventsCount: 0,
                    finished: false
                };
                const pendingMaybeFinishedProgress: IProgressBar = {
                    text: "",
                    type: "",
                    eventsTotal: 1,
                    eventsCount: 1,
                    finished: false
                };
                const finishedProgress: IProgressBar = {
                    text: "",
                    type: "",
                    eventsTotal: 1,
                    eventsCount: 1,
                    finished: true
                };
                it('should be an empty array if no imports have been started', function () {
                    expect(workflowImportService.getProgress()).toEqual([]);
                });
                it('should return an empty array if no unfinished imports are pending', async function (done: DoneFn) {
                    mockImportJobFactory.and.returnValues(...[resolvedAndFinished, rejectedAndFinished, resolvedAndFinished, rejectedAndFinished].map(makeMockImportJobViaDescription));
                    await workflowImportService.importJSONString(MockImportJobDescription.resolvedAndFinished);
                    await workflowImportService.importJSONString(MockImportJobDescription.rejectedAndFinished);
                    await workflowImportService.importJSONStreamed(new ReadableStream<Uint8Array>());
                    await workflowImportService.importJSONStreamed(new ReadableStream<Uint8Array>());
                    expect(workflowImportService.getProgress()).toEqual([]);
                    done();
                });
                it('should return an array containing all progressDatas since the last one that did not yet finish', async function (done: DoneFn) {
                    mockImportJobFactory.and.returnValues(...[resolvedAndPending, rejectedAndFinished, resolvedAndFinished,
                                                              resolvedAndPending, rejectedAndFinished, resolvedAndFinished].map(makeMockImportJobViaDescription));
                    await workflowImportService.importJSONString(MockImportJobDescription.resolvedAndPending);
                    await workflowImportService.importJSONString(MockImportJobDescription.rejectedAndFinished);
                    await workflowImportService.importJSONString(MockImportJobDescription.resolvedAndFinished);
                    await workflowImportService.importJSONStreamed(new ReadableStream<Uint8Array>());
                    await workflowImportService.importJSONStreamed(new ReadableStream<Uint8Array>());
                    await workflowImportService.importJSONStreamed(new ReadableStream<Uint8Array>());
                    expect(workflowImportService.getProgress()).toEqual([pendingProgress, finishedProgress, finishedProgress,
                                                                                  pendingProgress, finishedProgress, finishedProgress]);
                    done();
                });
                it('should return an array containing still unfinished progressData - special case: eventsCount === totalCount, but not yet finished', async function (done: DoneFn) {
                    mockImportJobFactory.and.returnValues(...[resolvedAndMaybeFinished, rejectedAndFinished, resolvedAndFinished,
                                                              resolvedAndMaybeFinished, rejectedAndFinished, resolvedAndFinished].map(makeMockImportJobViaDescription));
                    await workflowImportService.importJSONString(MockImportJobDescription.resolvedAndMaybeFinished);
                    await workflowImportService.importJSONString(MockImportJobDescription.rejectedAndFinished);
                    await workflowImportService.importJSONString(MockImportJobDescription.resolvedAndFinished);
                    await workflowImportService.importJSONStreamed(new ReadableStream<Uint8Array>());
                    await workflowImportService.importJSONStreamed(new ReadableStream<Uint8Array>());
                    await workflowImportService.importJSONStreamed(new ReadableStream<Uint8Array>());
                    expect(workflowImportService.getProgress()).toEqual([pendingMaybeFinishedProgress, finishedProgress, finishedProgress,
                                                                                  pendingMaybeFinishedProgress, finishedProgress, finishedProgress]);
                    done();
                });
            })
        });
    });
}
