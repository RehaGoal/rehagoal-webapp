module rehagoal.utilities {
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
    describe('rehagoal.utilities', function() {
        beforeEach(angular.mock.module('rehagoal.utilities'));

        describe('value: readDataURLFromBlob', function () {
            let readDataURLFromBlob: readDataURLFromBlobType;
            const testBlob = new Blob(['random']);

            beforeEach(inject(function(_readDataURLFromBlob_: readDataURLFromBlobType) {
                readDataURLFromBlob = _readDataURLFromBlob_;
            }));

            it('should have a defined function', function() {
                expect(readDataURLFromBlob).toBeDefined();
                expect(typeof readDataURLFromBlob).toBe('function');
            });
            it('should return a promise', function () {
                expect(readDataURLFromBlob(new Blob()).then).toBeDefined();
                expect(typeof readDataURLFromBlob(new Blob()).then).toBe('function');
                expect(typeof readDataURLFromBlob(new Blob()).catch).toBe('function');
            });
            it('should reject if no file is provided', function (done) {
                readDataURLFromBlob(undefined as any as Blob).then(function () {
                    fail('Expected promise to be rejected');
                    done();
                }).catch(function (err) {
                    expect(err).toBe('Empty Blob provided');
                    done();
                });
            });
            it('should reject if an error within the reader occurred', function (done) {
                spyOn(window as any, 'FileReader').and.callFake(function (this: any) {
                     this.onloadend = null;
                     this.onerror = null;
                     this.readAsDataURL = function () {
                         this.error = 'rejectedError';
                         this.onerror();
                     };
                });

                readDataURLFromBlob(testBlob).then(function () {
                    fail('Expected promise to be rejected');
                    done();
                }).catch(function (err) {
                    expect(err).toBe('rejectedError');
                    done();
                });
            });
            it('should read a dataUri from a given blob', function (done) {
                const testDataUri = 'data:application/octet-stream;base64,cmFuZG9t';

                readDataURLFromBlob(testBlob).then(function (dataUri) {
                    expect(dataUri).toEqual(testDataUri);
                    done();
                }).catch(function (err) {
                    fail('Expected promise to be resolved: ' + err);
                    done();
                });
            });
            it('should match a dataUri from a given blob with different mime type', function (done) {
                const testDataUri = 'data:image/png;base64,cmFuZG9t';
                const testImgBlob = new Blob(['random'], {type: 'image/png'});
                readDataURLFromBlob(testImgBlob).then(function (dataUri) {
                    expect(dataUri).toEqual(testDataUri);
                    done();
                }).catch(function (err) {
                    fail('Expected promise to be resolved: ' + err);
                    done();
                });
            });
        });

        describe('value: streamToBlob', function () {
            let streamToBlob: streamToBlobType;
            let readFileAsText: readFileAsTextFunc;
            beforeEach(angular.mock.inject(function(_streamToBlob_: streamToBlobType,
                                                    _readFileAsText_: readFileAsTextFunc) {
                streamToBlob = _streamToBlob_;
                readFileAsText = _readFileAsText_;
            }));

            it('should read a push stream to the end and return a Blob with the stream contents', async function(done) {
                const expectedString = '👍test1234567890123456789';
                const blob = await streamToBlob(new ReadableStream<string>({
                    start: controller => {
                        controller.enqueue('👍test1234');
                        controller.enqueue('56789');
                        for (let i = 0; i < 10; ++i) {
                            controller.enqueue(i.toString());
                        }
                        controller.close();
                    }
                }));
                expect(await readFileAsText(blob)).toEqual(expectedString);
                done();
            });


            it('should read a pull stream to the end and return a Blob with the stream contents', async function(done) {
                const expectedString = '👍test1234567890123456789';
                let pos = 0;
                const blob = await streamToBlob(new ReadableStream<string>({
                    pull: controller => {
                        controller.enqueue(expectedString.slice(pos, pos + 2));
                        pos += 2;
                        if (pos >= expectedString.length) {
                            controller.close();
                        }
                    }
                }));
                expect(await readFileAsText(blob)).toEqual(expectedString);
                done();
            });

            it('should convert empty stream to empty blob', async function(done) {
                const blob = await streamToBlob(new ReadableStream<string>({
                    start: controller => {
                        controller.close();
                    }
                }));
                expect(blob.size).toBe(0);
                done();
            })
        });

        describe('value: jsonStringifyStreamed', function() {
            let jsonStringifyStreamed: jsonStringifyStreamedType;
            let streamToBlob: streamToBlobType;
            let readFileAsText: readFileAsTextFunc;
            beforeEach(angular.mock.inject(function(_jsonStringifyStreamed_: jsonStringifyStreamedType,
                                                    _streamToBlob_: streamToBlobType,
                                                    _readFileAsText_: readFileAsTextFunc) {
                jsonStringifyStreamed = _jsonStringifyStreamed_;
                streamToBlob = _streamToBlob_;
                readFileAsText = _readFileAsText_;
            }));

            it('should convert empty object to json stream', async function(done) {
                const stream = await jsonStringifyStreamed({});
                expect(stream instanceof ReadableStream).toBe(true);
                expect(await readFileAsText(await streamToBlob(stream))).toEqual('{}');
                done();
            });

            it('should convert object to json stream', async function(done) {
                const obj = {
                    a: "thisIsAString",
                    property2: 1234,
                    pi: 3.1415,
                    anotherOne: null,
                    foo: "bar",
                };
                const stream = await jsonStringifyStreamed({...obj});
                expect(await readFileAsText(await streamToBlob(stream))).toEqual(JSON.stringify(obj));
                done();
            });

            it('should convert object recursively to json stream', async function(done) {
                const obj = {
                    a: "thisIsAString",
                    property2: 1234,
                    anotherOne: null,
                    foo: "bar",
                    obj: {
                        layer: 1,
                        something: {
                            prop: true,
                            layer: 2,
                            p: "abc",
                            pi: 3.1415,
                            y: [1, "2a", 3, null, false, {a: "3"}]
                        },
                        prop: false
                    },
                    x: []
                };
                const stream = await jsonStringifyStreamed({...obj});
                expect(await readFileAsText(await streamToBlob(stream))).toEqual(JSON.stringify(obj));
                done();
            });

            it('should handle non-object values', async function(done) {
                async function checkJSONConversion(value: any) {
                    const stream = await jsonStringifyStreamed(value);
                    const blob = await streamToBlob(stream);
                    const actualJSON = await readFileAsText(blob);
                    expect(actualJSON).toEqual(JSON.stringify(value));
                }
                await checkJSONConversion(true);
                await checkJSONConversion(false);
                await checkJSONConversion(null);
                await checkJSONConversion(1.24);
                await checkJSONConversion(Number.POSITIVE_INFINITY);
                await checkJSONConversion("someString");
                await checkJSONConversion([]);
                await checkJSONConversion([1, "hello"]);
                done();
            })

            it('should replace undefined with null', async function(done) {
                const obj = {
                    something: undefined,
                    b: 2
                };
                const stream = await jsonStringifyStreamed({...obj});
                expect(await readFileAsText(await streamToBlob(stream))).toEqual('{"something":null,"b":2}');
                done();
            });

            it('should handle cyclic references', async function(done) {
                const obj = {a: true};
                obj['self'] = obj;
                await expectThrowsAsync(async () => {
                    const stream = await jsonStringifyStreamed({...obj});
                    await streamToBlob(stream);
                }, "cyclic object value");
                done();
            });

            it('should report progress', async function(done) {
                const obj = {
                    a: "thisIsAString",
                    b: true,
                    c: false,
                    d: 1.2345,
                    x: [],
                    e: {
                        e1: true,
                        e2: null,
                        e3: {
                            x: "hello"
                        },
                        y: [1, "2a", 3, null, false, {a: "3"}]
                    },
                    f: null
                };
                const progressSpy = jasmine.createSpy('progressCallback');
                const stream = await jsonStringifyStreamed({...obj}, progressSpy);
                expect(await readFileAsText(await streamToBlob(stream))).toEqual(JSON.stringify(obj));
                const progressArgs = progressSpy.calls.allArgs();
                let lastProgress = 0;
                expect(progressArgs.length).toBeGreaterThanOrEqual(3, "progress should have been reported at least 3 times");
                for (let [i, args] of progressArgs.entries()) {
                    expect(args.length).toEqual(1, "progressCallback should have at most one argument");
                    expect(args[0]).toBeGreaterThanOrEqual(lastProgress, "progress should be monotonous increasing");
                    expect(args[0]).toBeGreaterThanOrEqual(0, "progress should be >= 0");
                    expect(args[0]).toBeLessThanOrEqual(1, "progress should be <= 1");
                    lastProgress = args[0];
                }
                expect(progressArgs[progressArgs.length - 1][0]).toBe(1, "final progress should be 1");
                done();
            });

            it('should convert with pushSource=true', async function (done) {
                const obj = {
                    something: "hello",
                    b: 2
                };
                const stream: ReadableStream = await jsonStringifyStreamed(obj, ()=>{}, true);
                expect(await readFileAsText(await streamToBlob(stream))).toEqual(JSON.stringify(obj));
                done();
            });

            it('should convert with minChunkSize=1', async function (done) {
                const obj = {
                    something: "hello",
                    b: 2
                };
                const stream: ReadableStream = await jsonStringifyStreamed(obj, ()=>{}, false, 1);
                expect(await readFileAsText(await streamToBlob(stream))).toEqual(JSON.stringify(obj));
                done();
            });

            it('should error with minChunkSize <= 0', async function (done) {
                const obj = {
                    something: "hello",
                    b: 2
                }
                const expectedError = "minChunkSize should be > 0";
                await expectThrowsAsync(async () => {
                    await jsonStringifyStreamed(obj, ()=>{}, false, 0);
                }, expectedError);
                await expectThrowsAsync(async () => {
                    await jsonStringifyStreamed(obj, ()=>{}, false, -1);
                }, expectedError);
                await expectThrowsAsync(async () => {
                    await jsonStringifyStreamed(obj, ()=>{}, false, Number.NEGATIVE_INFINITY);
                }, expectedError);
                done();
            });
        });
    });
}


