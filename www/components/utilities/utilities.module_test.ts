'use strict';

module rehagoal.utilities {
    describe('rehagoal.utilities', function () {
        beforeEach(angular.mock.module('rehagoal.utilities'));

        describe('factory: date-wrapper', function() {
            let dateFactory: DateConstructor;

            beforeEach(inject(function(_$Date_: DateConstructor) {
                dateFactory = _$Date_;
            }));

            it('should create a defined date instance', function() {
                expect(dateFactory).toBeDefined();
                expect(dateFactory.prototype).toBeDefined();
            });

            it('should return an date object', function() {
                const dateFromFactory = new dateFactory();
                expect(dateFromFactory.constructor.name).toBe('Date');
            });
        });

        describe('filter: bytes2', function() {
            let bytes2: ng.IFilterFunction;

            beforeEach(inject(function(_$filter_: ng.IFilterService){
                bytes2 = _$filter_('bytes2');
            }));

            it('should return "-" if bytes is not a valid float', function() {
                expect(bytes2(undefined)).toBe("-");
                expect(bytes2(NaN)).toBe("-");
                expect(bytes2("")).toBe("-");
                expect(bytes2("a")).toBe("-");
                expect(bytes2({})).toBe("-");
            });

            it('should return with unit bytes if value < 1024', function () {
                expect(bytes2(0)).toBe("0 bytes");
                expect(bytes2(1)).toBe("1 bytes");
                expect(bytes2(2)).toBe("2 bytes");
                expect(bytes2(1023)).toBe("1023 bytes");
            });

            it('should return with unit KiB', function() {
                expect(bytes2(1024)).toBe("1 KiB");
                expect(bytes2(1200)).toBe("1.17 KiB");
            });

            it('should return with unit MiB', function() {
                expect(bytes2(1024*1024-1)).toBe("1 MiB");
                expect(bytes2(1024*1024)).toBe("1 MiB");
                expect(bytes2(12*1024*1024)).toBe("12 MiB");
                expect(bytes2(12*1024*1024+10*1024)).toBe("12.01 MiB");
                expect(bytes2(123*1024*1024+110*1024)).toBe("123.11 MiB");
            });

            it('should return with unit GiB', function() {
                expect(bytes2(1024*1024*1024-1)).toBe("1 GiB");
                expect(bytes2(1024*1024*1024)).toBe("1 GiB");
                expect(bytes2(12*1024*1024*1024)).toBe("12 GiB");
                expect(bytes2(12*1024*1024*1024+10*1024*1024)).toBe("12.01 GiB");
                expect(bytes2(123*1024*1024*1024+110*1024*1024)).toBe("123.11 GiB");
            });

            it('should return with unit TiB', function() {
                expect(bytes2(1024*1024*1024*1024-1)).toBe("1 TiB");
                expect(bytes2(1024*1024*1024*1024)).toBe("1 TiB");
                expect(bytes2(12*1024*1024*1024*1024)).toBe("12 TiB");
                expect(bytes2(12*1024*1024*1024*1024+10*1024*1024*1024)).toBe("12.01 TiB");
                expect(bytes2(123*1024*1024*1024*1024+110*1024*1024*1024)).toBe("123.11 TiB");
                expect(bytes2(1024*1024*1024*1024*1024)).toBe("1024 TiB");
                expect(bytes2(2*1024*1024*1024*1024*1024)).toBe("2048 TiB");
            });

            it('should return negative values', function() {
                expect(bytes2(-1)).toBe('-1 bytes');
                expect(bytes2(-100)).toBe('-100 bytes');
                expect(bytes2(-1024)).toBe('-1 KiB');
                expect(bytes2(-1024*1024)).toBe('-1 MiB');
                expect(bytes2(-1024*1024)).toBe('-1 MiB');
                expect(bytes2(-12*1024*1024*1024-10*1024*1024)).toBe("-12.01 GiB");
            });
        });

        describe('factory: storageManager', function() {
            let storageManager: StorageManager;
            describe('properties and methods', function() {
                beforeEach(inject(function(_storageManager_: StorageManager) {
                    storageManager = _storageManager_;
                }));
                it('should be the same as navigator.storage', function() {
                    expect(storageManager).toBe(navigator.storage);
                });
                it('should have a method persisted()', function() {
                    expect(storageManager.persisted).toBeDefined();
                });
                it('should have a method persist()', function() {
                    expect(storageManager.persist).toBeDefined();
                });
                it('should have a method estimate()', function() {
                    expect(storageManager.estimate).toBeDefined();
                });
            });
            describe('fallback handling', function() {
                beforeEach(angular.mock.module(function($provide: ng.auto.IProvideService) {
                    $provide.value('$window', {
                        navigator: {}
                    });
                }));
                it('injection should not throw error, but return null instead', function() {
                    expect(function() {
                        inject(function(storageManager: StorageManager) {
                            expect(storageManager).toBeNull();
                        });
                    }).not.toThrowError();
                });
            });
            describe('behaviour', function() {
                beforeEach(inject(function(_storageManager_: StorageManager) {
                    storageManager = _storageManager_;
                }));
                describe('method estimate', function() {
                    it('should return a promise with storage estimate', function(done) {
                        storageManager.estimate().then(function(estimate) {
                            expect(estimate.quota).toEqual(jasmine.any(Number));
                            expect(estimate.usage).toEqual(jasmine.any(Number));
                            done();
                        }).catch(done.fail);
                    });
                });
            });
        });

        describe('function: extend', function () {
            const extend = rehagoal.utilities.extend;

            it('should check if function is defined', function () {
                expect(extend).toBeDefined();
            });
            it('should extend an Object with another property', function () {
                const testObj = {type: 'a'};
                const testObj2 = extend(testObj, {value: 'b'});
                const testObj3 = extend(testObj2, {name: 'c'});
                const testObj4 = extend(testObj3, {key: 'd'});
                expect(testObj2).toEqual({type: 'a', value: 'b'});
                expect(testObj3).toEqual({type: 'a', value: 'b', name: 'c'});
                expect(testObj4).toEqual({type: 'a', value: 'b', name: 'c', key: 'd'});
            });
        });

        describe('function: powerset', function() {
            const powerset = rehagoal.utilities.powerset;
            it('should return powerset/combinations of given set', function() {
                expect(powerset([])).toEqual([[]]);
                expect(powerset([1])).toEqual([[],[1]]);
                expect(powerset([0,-1,-33]))
                    .toEqual(jasmine.arrayWithExactContents([[],[0],[-1],[-33],[0,-1],[-1,-33],[0,-33],[0,-1,-33]]));
                console.log(powerset([1,2,3]));
                expect(powerset(['a','b','c']))
                    .toEqual(jasmine.arrayWithExactContents([[],['a'],['b'],['c'],['a','b'],['a','c'],['b','c'],['a','b','c']]));
                expect(powerset([1,'b','c']))
                    .toEqual(jasmine.arrayWithExactContents([[],[1],['b'],['c'],[1,'b'],[1,'c'],['b','c'],[1,'b','c']]));
                expect(powerset([1,2,3,4]))
                    .toEqual(jasmine.arrayWithExactContents([[],[1],[2],[3],[4],
                        [1,2],[1,3],[1,4],[2,3],[2,4],[3,4],
                        [1,2,3],[1,2,4],[1,3,4],[2,3,4],
                        [1,2,3,4]]));
                expect(powerset([1,2,3,4,5]))
                    .toEqual(jasmine.arrayWithExactContents([[],[1],[2],[3],[4],[5],
                        [1,2],[1,3],[1,4],[1,5],[2,3],[2,4],[2,5],[3,4],[3,5],[4,5],
                        [1,2,3],[1,2,4],[1,2,5],[1,3,4],[1,3,5],[1,4,5],[2,3,4],[2,3,5],[2,4,5],[3,4,5],
                        [1,2,3,4],[1,2,3,5],[1,2,4,5],[1,3,4,5],[2,3,4,5],
                        [1,2,3,4,5]]));
            });
        });

        describe('value: hashString', function () {
            let hashString: hashStringFunc;

            beforeEach(inject(function(_hashString_: hashStringFunc) {
                hashString = _hashString_;
            }));

            it('should have a defined function', function() {
                expect(hashString).toBeDefined();
                expect(typeof hashString).toBe('function');
            });
            it('should throw an error if no string is provided', function () {
                const inputs = [
                    42,
                    null,
                    undefined,
                    false,
                    {}
                ];
                inputs.forEach((input) => {
                    expect(() => hashString(input as any)).toThrowError(/Expected string parameter/);
                });
                expect(() => hashString("")).not.toThrowError();
            });
            it('should hash a string and return its hash value (sha256)', function () {
                const testInput = 'this is a test input';
                const testInputHash = 'bb913d9aa5d53eddb4d2deaf3763c28d864837370904b348c989658a8914bad4';
                expect(hashString(testInput)).toEqual(testInputHash);
            });
            it('should hash a string containing a xml and return its hash value (sha256)', function () {
                const testInput = '<xml xmlns=\"http://www.w3.org/1999/xhtml\"><block type=\"task_group\" id=\"m@TNjGki?Uc(Hpjo0A?c\" deletable=\"false\" x=\"0\" y=\"0\"><field name=\"description\">Protractor::images</field><statement name=\"tasks\"><block type=\"if_then_else\" id=\"kciWxPx-|wvz6|A(@Mtj\"><field name=\"condition\">TuxChecklist</field><field name=\"image\">1307cceec0de498d6271da84184048b9513d69117bfcbed87d5a867b6d148763</field><statement name=\"then\"><block type=\"task\" id=\"P0a7V`lld%=/=8_Ym_PL\"><field name=\"description\">TuxCrab</field><field name=\"image\">df1f60c72651b29a95a7aa6d1eaf410edaf9a7f1efc080f073c0c9835956169f</field></block></statement><statement name=\"else\"><block type=\"task\" id=\"?he/nQ0I+byYnL~ytsUc\"><field name=\"description\">TuxMagician</field><field name=\"image\">aebd3791d7bdcb0f0556412aeacb9fb38834ce1f79967d8dc72c98dfb287a0a6</field></block></statement></block></statement></block></xml>';
                const testInputHash = 'e2b8c84efb1d1b380c6467a0b5a26766ba7579ab380383f2c19708a10b5a1df7';
                expect(hashString(testInput)).toEqual(testInputHash);
            });

        });

        describe('value: hashFile', function () {
            let hashFile: hashFileFunc;
            const testFile = new Blob();

            beforeEach(inject(function(_hashFile_: hashFileFunc) {
                hashFile = _hashFile_;
            }));

            it('should have a defined function', function() {
                expect(hashFile).toBeDefined();
                expect(typeof hashFile).toBe('function');
            });
            it('should return a promise', function () {
                expect(hashFile(undefined as any).then).toBeDefined();
                expect(typeof hashFile(undefined as any).then).toBe('function');
                expect(typeof hashFile(undefined as any).catch).toBe('function');
            });
            it('should reject if no file is provided', function (done) {
                hashFile(undefined as any).then(function () {
                    fail('Expected promise to be rejected');
                    done();
                }).catch(function (err) {
                    expect(err).toBe('EmptyFileHash');
                    done();
                });
            });
            it('should reject if an error within the reader occurred', function (done) {
                spyOn(window, 'FileReader').and.callFake(function (this: FileReader) {
                    this.onloadend = null;
                    this.onerror = null;
                    this.readAsArrayBuffer = function (this: any) {
                        this.error = 'rejectedError';
                        this.onerror();
                    };
                });

                hashFile(testFile).then(function () {
                    fail('Expected promise to be rejected');
                    done();
                }).catch(function (err) {
                    expect(err).toBe('rejectedError');
                    done();
                });
            });
            it('should hash a file and return its hash value (sha256)', function (done) {
                const testHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

                hashFile(testFile).then(function (hash) {
                    expect(hash).toEqual(testHash);
                    done();
                }).catch(function (err) {
                    fail('Expected promise to be resolved: ' + err);
                    done();
                });
            });
        });

        describe('value: readFileAsText', function () {
            let readFileAsText: readFileAsTextFunc;
            const testText = 'TEST-123';
            const testFile = new Blob([testText]);

            beforeEach(inject(function(_readFileAsText_: readFileAsTextFunc) {
                readFileAsText = _readFileAsText_;
            }));

            it('should have a defined function', function() {
                expect(readFileAsText).toBeDefined();
                expect(typeof readFileAsText).toBe('function');
            });
            it('should return a promise', function () {
                expect(readFileAsText(undefined as any).then).toBeDefined();
                expect(typeof readFileAsText(undefined as any).then).toBe('function');
                expect(typeof readFileAsText(undefined as any).catch).toBe('function');
            });
            it('should reject if no file is provided', function (done) {
                readFileAsText(undefined as any).then(function () {
                    fail('Expected promise to be rejected');
                    done();
                }).catch(function (err) {
                    expect(err).toBe('EmptyFileToText');
                    done();
                });
            });
            it('should reject if an error within the reader occurred', function (done) {
                spyOn(window, 'FileReader').and.callFake(function (this: FileReader) {
                    this.onload = null;
                    this.onerror = null;
                    this.readAsText = function (this: any) {
                        this.error = 'rejectedError';
                        this.onerror();
                    };
                });

                readFileAsText(testFile).then(function () {
                    fail('Expected promise to be rejected');
                    done();
                }).catch(function (err) {
                    expect(err).toBe('rejectedError');
                    done();
                });
            });
            it('should read a file and return a Promise containing the content', function (done) {
                readFileAsText(testFile).then(function (text) {
                    expect(text).toEqual(testText);
                    done();
                }).catch(function (err) {
                    fail('Expected promise to be resolved: ' + err);
                    done();
                });
            });
        });

        describe('generateRandomUuid Tests:', function() {
            let generateRandomUUID: generateRandomUUIDFunc;
            beforeEach(inject(function(_generateRandomUUID_: generateRandomUUIDFunc) {
                generateRandomUUID = _generateRandomUUID_;
            }));

            it('should return some valid random and unique uuids (version 4)', function () {
                const numTries = 1000;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-([1-5])[0-9a-f]{3}-([89AB])[0-9a-f]{3}-[0-9a-f]{12}$/i;
                let usedUUIDs = new Set();
                for (var i = 0; i < numTries; ++i) {
                    var curUuid = generateRandomUUID();
                    var match = curUuid.match(uuidRegex);
                    since("Expected " + curUuid + " to match " + uuidRegex).
                    expect(match).not.toBeNull();
                    const uuidVersion = Number.parseInt(match![1], 16);
                    const uuidVariant = (Number.parseInt(match![2], 16) & 0xc) >> 2; // Bits 1-2 of octet 8 (3: don't care)
                    since("Expected UUID to be version 4, but got #{actual}").
                    expect(uuidVersion).toEqual(4);
                    since("Expected UUID variant to be 0b10. = 2, but got #{actual}(int)").
                    expect(uuidVariant).toEqual(2);
                    since("Expected UUID generation to deliver new UUIDs every call").
                    expect(usedUUIDs.has(curUuid.toLowerCase()));
                    usedUUIDs.add(curUuid.toLowerCase());
                }
            });
        });

        describe('generateWorkflowVersionHash Tests:', function() {
            let generateWorkflowVersionHash: generateWorkflowVersionHashFunc;
            beforeEach(inject(function(_generateWorkflowVersionHash_: generateWorkflowVersionHashFunc) {
                generateWorkflowVersionHash = _generateWorkflowVersionHash_;
            }));

            //TODO: write unit test for generateWorkflowVersionHash
            //it('should be tested', function () {});
        });

        describe('getWebNotificationPermissionState', function() {
            let $window: ng.IWindowService;
            let getWebNotificationPermissionState: getWebNotificationPermissionStateFunc;
            beforeEach(function() {
                inject(function(_$window_: ng.IWindowService, _getWebNotificationPermissionState_: getWebNotificationPermissionStateFunc) {
                    $window = _$window_;
                    getWebNotificationPermissionState = _getWebNotificationPermissionState_;
                });
            });
            describe('Notification is defined', function() {
                let permissionGetSpy: jasmine.Spy;

                beforeEach(function() {
                    permissionGetSpy = spyOnProperty($window.Notification, 'permission', 'get');
                });

                it('should return Notification.permission from $window', function() {
                    permissionGetSpy.and.returnValues("default", "granted", "denied", "granted");
                    expect(getWebNotificationPermissionState()).toBe("default");
                    expect(getWebNotificationPermissionState()).toBe("granted");
                    expect(getWebNotificationPermissionState()).toBe("denied");
                    expect(getWebNotificationPermissionState()).toBe("granted");
                    expect(permissionGetSpy).toHaveBeenCalledTimes(4);
                    permissionGetSpy.and.callThrough();
                    expect(getWebNotificationPermissionState()).toBe("default");
                });

                it('should return unsupported, if Notification.permission is not defined', function() {
                    permissionGetSpy.and.returnValue(undefined);
                    expect(getWebNotificationPermissionState()).toBe("unsupported");
                });
            });

            describe('Notification is undefined', function() {
                let Notification: Notification;
                beforeAll(function() {
                    Notification = $window.Notification;
                    delete $window.Notification;
                });
                afterAll(function() {
                    $window.Notification = Notification;
                });
                it('should return unsupported, if Notification is not defined', function() {
                    expect(getWebNotificationPermissionState()).toBe("unsupported");
                });
            });
        });

        describe('depthFirstSearchGenerator', function() {
            function getGeneratedElements<T>(generator: Generator<T>): T[] {
                const elements = [];
                for (let element of generator) {
                    elements.push(element);
                }
                return elements;
            }

            describe('with object childExpander', function() {
                let childExpander: jasmine.Spy;
                beforeEach(function() {
                    childExpander = jasmine.createSpy('childExpander', (node: object) => {
                        if (!angular.isObject(node)) {
                            return [];
                        }
                        return Object.getOwnPropertyNames(node).map(k => node[k]);
                    }).and.callThrough();
                });

                it('single root node should only return root node', function() {
                    const root = {};
                    const generator = depthFirstSearchGenerator(root, childExpander);
                    const elements = getGeneratedElements(generator);
                    expect(elements).toEqual([root]);
                    expect(childExpander).toHaveBeenCalledTimes(1);
                });

                it('should return root and then child nodes if tree depth is 1', function() {
                    const root = {
                        c1: 'child1',
                        c2: 'child2'
                    };
                    const generator = depthFirstSearchGenerator<any>(root, childExpander);
                    const elements = getGeneratedElements(generator);
                    expect(elements).toEqual([root, root.c1, root.c2]);
                    expect(childExpander).toHaveBeenCalledTimes(3);
                });

                it('should return elements in DFS-order (preorder), depth = 2 ', function() {
                    const root = {
                        c1: {
                            c1a: 'c1a',
                            c1b: 'c1b',
                        },
                        c2: {},
                        c3: {
                            c3a: 'c3a',
                            c3b: 'c3b',
                            c3c: 'c3c'
                        }
                    };
                    const generator = depthFirstSearchGenerator<any>(root, childExpander);
                    const elements = getGeneratedElements(generator);
                    expect(elements).toEqual([root, root.c1,
                        root.c1.c1a,
                        root.c1.c1b,
                        root.c2,
                        root.c3,
                        root.c3.c3a,
                        root.c3.c3b,
                        root.c3.c3c]);
                    expect(childExpander).toHaveBeenCalledTimes(9);
                });
                it('should return elements in DFS-order (preorder), depth = 3 ', function() {
                    const root = {
                        c1: {
                            c1a: {
                                c1a1: 'c1a1',
                                c1a2: 'c1a2',
                                c1a3: 'c1a3',
                                c1a4: 'c1a4',
                            },
                            c1b: 'c1b',
                        },
                        c2: {
                            c2a: 'c2a',
                            c2b: {
                                c2b1: 'c2b1',
                                c2b2: 'c2b1',
                            }
                        },
                        c3: {
                            c3a: 'c3a',
                            c3b: 'c3b',
                            c3c: 'c3c'
                        }
                    };
                    const generator = depthFirstSearchGenerator<any>(root, childExpander);
                    const elements = getGeneratedElements(generator);
                    expect(elements).toEqual([root,
                        root.c1,
                        root.c1.c1a,
                        root.c1.c1a.c1a1,
                        root.c1.c1a.c1a2,
                        root.c1.c1a.c1a3,
                        root.c1.c1a.c1a4,
                        root.c1.c1b,
                        root.c2,
                        root.c2.c2a,
                        root.c2.c2b,
                        root.c2.c2b.c2b1,
                        root.c2.c2b.c2b2,
                        root.c3,
                        root.c3.c3a,
                        root.c3.c3b,
                        root.c3.c3c]);
                    expect(childExpander).toHaveBeenCalledTimes(17);
                });
                it('should return elements in DFS-order (preorder), depth = 10', function() {
                    const root = {
                        c1: {
                            c1a: {
                                c1a1: {
                                    c1a1a: {
                                        c1a1a1: {
                                            c1a1a1a: {
                                                c1a1a1a1: {
                                                    c1a1a1a1a: {
                                                        c1a1a1a1a1: {
                                                            c1a1a1a1a1a: 'c1a1a1a1a1a'
                                                        }
                                                    },
                                                    c1a1a1a1b: 'c1a1a1a1b'
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                        },
                    };
                    const generator = depthFirstSearchGenerator<any>(root, childExpander);
                    const elements = getGeneratedElements(generator);
                    expect(elements).toEqual([
                        root,
                        root.c1,
                        root.c1.c1a,
                        root.c1.c1a.c1a1,
                        root.c1.c1a.c1a1.c1a1a,
                        root.c1.c1a.c1a1.c1a1a.c1a1a1,
                        root.c1.c1a.c1a1.c1a1a.c1a1a1.c1a1a1a,
                        root.c1.c1a.c1a1.c1a1a.c1a1a1.c1a1a1a.c1a1a1a1,
                        root.c1.c1a.c1a1.c1a1a.c1a1a1.c1a1a1a.c1a1a1a1.c1a1a1a1a,
                        root.c1.c1a.c1a1.c1a1a.c1a1a1.c1a1a1a.c1a1a1a1.c1a1a1a1a.c1a1a1a1a1,
                        root.c1.c1a.c1a1.c1a1a.c1a1a1.c1a1a1a.c1a1a1a1.c1a1a1a1a.c1a1a1a1a1.c1a1a1a1a1a,
                        root.c1.c1a.c1a1.c1a1a.c1a1a1.c1a1a1a.c1a1a1a1.c1a1a1a1b,
                    ]);
                    expect(childExpander).toHaveBeenCalledTimes(12);
                });
            })
            describe('with DOM Node childExpander', function() {
                let childExpander: jasmine.Spy;
                beforeEach(function() {
                    childExpander = jasmine.createSpy('childExpander', (node: Node) => {
                        return [...node.childNodes];
                    }).and.callThrough();
                });

                function getDOMRoot(xml: string) {
                    const parser = new DOMParser();
                    const xmlDocument = parser.parseFromString(xml, 'text/xml');
                    return xmlDocument.getRootNode().childNodes[0];
                }

                it('should return only root element if there are no children', function() {
                    const root = getDOMRoot(`<root></root>`);
                    const elements = getGeneratedElements(depthFirstSearchGenerator(root, childExpander));
                    expect(elements).toEqual([root]);
                });

                it('should return elements in DFS-order (depth=2)', function() {
                    const root = getDOMRoot(`<root><a><a1></a1><a2></a2></a><b><b1></b1></b><c></c></root>`);
                    const doc = root.ownerDocument!;
                    const xpathNode = (expr: string) => doc.evaluate(expr, root).iterateNext()!;
                    const elements = getGeneratedElements(depthFirstSearchGenerator<Node>(root, childExpander));
                    expect(elements).toEqual([
                        root,
                        xpathNode('//a'),
                        xpathNode('//a/a1'),
                        xpathNode('//a/a2'),
                        xpathNode('//b'),
                        xpathNode('//b/b1'),
                        xpathNode('//c'),
                    ]);
                });
            });
        });

        describe('findNewName', function() {
            let findNewName: findNewNameFunc;
            beforeEach(() => inject(function(_findNewName_: findNewNameFunc) {
                findNewName = _findNewName_;
            }));
            it('should return same name, if usedNames is empty', function() {
                expect(findNewName(new Set(), "")).toBe("");
                expect(findNewName(new Set(), "Example")).toBe("Example");
                expect(findNewName(new Set(), "Another example")).toBe("Another example");
                expect(findNewName(new Set(), "Example (1)")).toBe("Example (1)");
                expect(findNewName(new Set(), "Example (2)")).toBe("Example (2)");
            });
            it('should return same name, if it does not exist in usedNames', function() {
                expect(findNewName(new Set(["Example (1)"]), "Example")).toBe("Example");
                expect(findNewName(new Set(["Example (1), Example (3)"]), "Example")).toBe("Example");
                expect(findNewName(new Set(["Example (1), Example (3)"]), "Example (2)")).toBe("Example (2)");
                expect(findNewName(new Set(["Name", "Example (1), Example (3)"]), "My Name")).toBe("My Name");
                expect(findNewName(new Set(["Name", "Example (1), Example (3)"]), "")).toBe("");
            });
            it('should return a new name, if is already in usedNames', function() {
                expect(findNewName(new Set(["Example"]), "Example")).toBe("Example (2)");
                expect(findNewName(new Set(["Example (1)"]), "Example (1)")).toBe("Example (2)");
                expect(findNewName(new Set(["Name"]), "Name")).toBe("Name (2)");
                expect(findNewName(new Set(["Name (1)"]), "Name (1)")).toBe("Name (2)");
            });
            it('should return a new name, if is already in usedNames; conflicts in newly generated name', function() {
                expect(findNewName(new Set(["Example", "Example (2)"]), "Example")).toBe("Example (3)");
                expect(findNewName(new Set(["Example (1)", "Example (2)"]), "Example (1)")).toBe("Example (3)");
                expect(findNewName(new Set(["Name", "Name (1)", "Name (2)", "Name (3)"]), "Name")).toBe("Name (4)");
                expect(findNewName(new Set(["", " (1)", " (2)", " (3)", " (4)", " (6)"]), "")).toBe(" (5)");
            });
        });
    });
}
