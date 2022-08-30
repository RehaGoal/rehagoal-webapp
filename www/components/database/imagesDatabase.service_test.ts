'use strict';

module rehagoal.database {
    import SettingsService = rehagoal.settings.SettingsService;
    import readFileAsTextFunc = rehagoal.utilities.readFileAsTextFunc;
    import ImagesDatabase = rehagoal.database.ImagesDatabase;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;

    describe('rehagoal.database', function () {
        let imagesDatabaseService: ImagesDatabase;
        let $window: ng.IWindowService;
        let $log: ng.ILogService;
        // FIXME: any type
        let dexieInstance: any;
        let settingsService: SettingsService;
        let readFileAsText: readFileAsTextFunc;

        beforeEach(angular.mock.module('rehagoal.database', function($provide: ng.auto.IProvideService) {
            $provide.decorator('dexieFactory', function ($delegate: DexieFactory) {
                return function () {
                    dexieInstance = $delegate.apply(null, arguments as any);
                    return dexieInstance;
                };
            });
        }));

        beforeEach(inject(function (_$window_: ng.IWindowService, _$log_: ng.ILogService,_imagesDatabaseService_: ImagesDatabase, _settingsService_: SettingsService, _readFileAsText_: readFileAsTextFunc) {
            $window = _$window_;
            $log = _$log_;
            imagesDatabaseService = _imagesDatabaseService_;
            settingsService = _settingsService_;
            readFileAsText = _readFileAsText_;
        }));

        describe('imagesDatabase', function () {
            describe('properties and methods', function () {
                it('should have a controller', function () {
                    expect(imagesDatabaseService).toBeDefined();
                });
                it('should have a method "storeImageFile", returning a promise', function () {
                    // FIXME: private member access
                    expect(imagesDatabaseService["storeImageFile"]).toBeDefined();
                });
                it('should have a method "setWorkflowImageWithReference", returning a promise', function () {
                    expect(imagesDatabaseService.setWorkflowImageWithReference).toBeDefined();
                });
                it('should have a method "hasWorkflowImageReference", returning a promise', function () {
                    expect(imagesDatabaseService.hasWorkflowImageReference).toBeDefined();
                });
                it('should have a method "hasWorkflowImageHash", returning a promise', function () {
                    expect(imagesDatabaseService.hasWorkflowImageHash).toBeDefined();
                });
                it('should have a method "getWorkflowImageByName", returning a promise', function () {
                    expect(imagesDatabaseService.getWorkflowImageByName).toBeDefined();
                });
                it('should have a method "getWorkflowImageByHash", returning a promise', function () {
                    expect(imagesDatabaseService.getWorkflowImageByHash).toBeDefined();
                });
                it('should have a method "getImageFile", returning a promise', function () {
                    expect(imagesDatabaseService.getImageFile).toBeDefined();
                });
                it('should have a method "removeImageEntry", returning a promise', function () {
                    expect(imagesDatabaseService.removeImageEntry).toBeDefined();
                });
                it('should have a method "removeWorkflowImages", returning a promise', function () {
                    expect(imagesDatabaseService.removeWorkflowImages).toBeDefined();
                });
                it('should have a method "getImageNames", returning a promise', function () {
                    expect(imagesDatabaseService.getImageNames).toBeDefined();
                });
                it('should have a method "getWorkflowImages", returning a promise', function () {
                    expect(imagesDatabaseService.getWorkflowImages).toBeDefined();
                });
                it('should have a method "duplicateWorkflowImages", returning a promise', function () {
                    expect(imagesDatabaseService.duplicateWorkflowImages).toBeDefined();
                });
                it('should have a method "dumpDB"', function() {
                    expect(imagesDatabaseService.dumpDB).toBeDefined();
                });
            });
            describe('functional behaviour', function () {
                const workflowId = 1;
                const imgDataText = "imgDataBlob";
                const imgData = new Blob([imgDataText]);
                const imgHash = 'myHash';
                const imgName = 'myImage';
                const imgFile = { hash: imgHash, data: imgData };

                const errorNoEntry = 'DB: Entry not found';

                afterEach(function (done) {
                    // reset database
                    dexieInstance.delete().then(done);
                });

                function getDexieFilesObject(key: string): Promise<IFileWithHash | undefined> {
                    return dexieInstance.files.get(key);
                }

                function getDexieFilenamesObject(key: any): Promise<(IFileReference & {id: number}) | undefined> {
                    return dexieInstance.filenames.get(key);
                }

                it('should setup a new database on init', function () {
                    expect(dexieInstance.filenames).toBeDefined();
                    expect(dexieInstance.files).toBeDefined();
                });
                it('should store an image in the database if a file is provided and storeImageFile is called', function (done) {
                    getDexieFilesObject(imgHash).then(function (result) {
                        expect(result).toBeUndefined();
                    }).then(function () {
                        // FIXME: private member access
                        imagesDatabaseService['storeImageFile'](imgFile).then(function () {
                            getDexieFilesObject(imgHash).then(function (image) {
                                expect(image).toEqual(imgFile);
                                done();
                            });
                        }, function (reason) {
                            fail('expected promise to be resolved, but got: ' + reason);
                            done();
                        });
                    });
                });
                it('should NOT store an image in the database if no file is provided and storeImageFile is called', function (done) {
                    // FIXME: private member access
                    imagesDatabaseService['storeImageFile'](undefined as any).then(function () {
                        fail('expected promise to be rejected');
                        done();
                    }, function (reason) {
                        expect(reason).toBe('no image provided');
                        done();
                    });
                });
                it('should NOT store an image if storeImageFile is called with non-Blob data', function (done) {
                    // FIXME: private member access
                    imagesDatabaseService['storeImageFile']({
                        hash: 'someHash',
                        data: {} as any
                    }).then(function () {
                        fail('expected promise to be rejected');
                    }, function (reason) {
                        expect(reason).toBe('image is not a Blob');
                    }).finally(done);
                });
                it('should store and set a reference for an image to a given workflow if setWorkflowImageWithReference is called', function (done) {
                    // FIXME: private member access
                    spyOn(imagesDatabaseService as any, 'storeImageFile').and.callThrough();
                    imagesDatabaseService.setWorkflowImageWithReference(workflowId, imgName, imgFile).then(function () {
                        // FIXME: private member access
                        expect(imagesDatabaseService['storeImageFile']).toHaveBeenCalledTimes(1);
                        expect(imagesDatabaseService['storeImageFile']).toHaveBeenCalledWith(imgFile);
                    }).then(function () {
                        imagesDatabaseService.hasWorkflowImageReference(workflowId,imgName).then(function (hasReference) {
                            expect(hasReference).toBeTruthy();

                        }).then(function () {
                            imagesDatabaseService.getImageFile(imgFile.hash).then(function (relativeImg) {
                                expect(relativeImg.data).toEqual(imgData);
                                done();
                            }, function () {
                                fail('should have found an image for workflow ' + workflowId + 'and image name ' + imgName);
                                done();
                            });
                        });
                    });
                });
                describe('with stored images', function () {
                    var imgKey = {workflow: workflowId, name: imgName, hash: imgHash};

                    beforeEach(function (done) {
                        imagesDatabaseService.setWorkflowImageWithReference(workflowId, imgName, imgFile).then(function () {
                            done();
                        });
                    });
                    describe('setWorkflowImageWithReference', function() {
                        it('should use old reference for an already stored image', function (done) {
                            const newImgName = 'myNewImage';
                            let oldImageID: number;
                            // FIXME: private member access
                            spyOn(imagesDatabaseService as any, 'storeImageFile').and.callThrough();
                            spyOn(dexieInstance.filenames, 'delete').and.callThrough();

                            getDexieFilenamesObject(imgKey).then(function (entry) {
                                if (entry) {
                                    oldImageID = entry.id;
                                }
                            }).then(function () {
                                imagesDatabaseService.setWorkflowImageWithReference(workflowId, newImgName, imgFile).then(function () {
                                    // FIXME: private member access
                                    expect(imagesDatabaseService['storeImageFile']).not.toHaveBeenCalled();
                                    expect(dexieInstance.filenames.delete).toHaveBeenCalledWith(oldImageID);
                                }).then(function () {
                                    getDexieFilenamesObject(oldImageID).then(function (entry) {
                                        expect(entry).toBeUndefined();
                                    });
                                }).then(function () {
                                    imagesDatabaseService.hasWorkflowImageReference(workflowId,newImgName).then(function (hasReference) {
                                        expect(hasReference).toBeTruthy();
                                        done();
                                    });
                                });
                            });
                        });
                        it('should assert removing an old reference if a new reference is set', function (done) {
                            var newImgFile = { hash: "newImgHash", data: new Blob(["newImgData"]) };
                            // FIXME: private member access
                            spyOn(imagesDatabaseService as any, 'removeImageFileIfUnreferencedExceptStudyMode').and.callThrough();

                            imagesDatabaseService.setWorkflowImageWithReference(workflowId, imgName, newImgFile).then(function () {
                                // FIXME: private member access
                                expect(imagesDatabaseService['removeImageFileIfUnreferencedExceptStudyMode']).toHaveBeenCalled();
                            }).then(function () {
                                dexieInstance.filenames.count().then(function (entriesCount: number) {
                                    expect(entriesCount).toEqual(1);
                                    done();
                                });
                            });
                        });
                        it('should not clear the whole database if a new reference is set', function (done) {
                            const newImgFile = {hash: "newImgHash", data: new Blob(["newImgData"])};
                            // FIXME: private member access
                            spyOn(imagesDatabaseService as any, 'removeImageFileIfUnreferencedExceptStudyMode').and.callThrough();

                            imagesDatabaseService.setWorkflowImageWithReference(workflowId, 'name1', newImgFile).then(function () {
                                dexieInstance.filenames.count().then(function (entriesCount: number) {
                                    expect(entriesCount).toEqual(2);
                                });
                            }).then(function () {
                                imagesDatabaseService.setWorkflowImageWithReference(workflowId+1, 'name2', newImgFile).then(function () {
                                    dexieInstance.filenames.count().then(function (entriesCount: number) {
                                        expect(entriesCount).toEqual(3);
                                        done();
                                    });
                                });
                            });
                        });
                        it('should roll back a transaction if an error occurs', function (done) {
                            const unavailableImage = { hash: "no hash", data: new Blob(["no data"]) };
                            spyOn(dexieInstance.files, 'put').and.returnValue(Promise.reject('denied'));

                            imagesDatabaseService.setWorkflowImageWithReference(workflowId, 'unavailable', unavailableImage).then(function () {
                                fail('Expected promise to have been rejected');
                                done();
                            }, function () {
                                dexieInstance.filenames.count().then(function (entriesCount: number) {
                                    expect(entriesCount).toEqual(1);
                                }).then(function () {
                                    getDexieFilenamesObject({workflow: workflowId, name: 'unavailable', hash: unavailableImage.hash}).then(function (result) {
                                        expect(result).toBeUndefined();
                                        done();
                                    });
                                });

                            });
                        });
                    });
                    describe('setWorkflowImagesWithReferences', function() {
                        it('should store new images via setWorkflowImageWithReference', async function(done) {
                            const newWorkflowId = 2;
                            const imageReferences: IFileReference[] = [
                                {name: 'My Image', hash: 'hash1'},
                                {name: 'My Image 2', hash: 'hash2'},
                                {name: 'My Image 3', hash: 'hash3'},
                            ];
                            const imageData: IFileWithHash[] = [
                                {hash: 'hash1', data: new Blob(['blob1'])},
                                {hash: 'hash3', data: new Blob(['blob3'])},
                                {hash: 'hash2', data: new Blob(['blob2'])},
                            ];
                            await tryOrFailAsync(async () => {
                                spyOn(imagesDatabaseService, 'setWorkflowImageWithReference').and.callThrough();
                                await imagesDatabaseService.setWorkflowImagesWithReferences(newWorkflowId, imageReferences, imageData);
                                expect(imagesDatabaseService.setWorkflowImageWithReference).toHaveBeenCalledTimes(3);
                                expect(imagesDatabaseService.setWorkflowImageWithReference).toHaveBeenCalledWith(newWorkflowId, imageReferences[0].name, imageData[0]);
                                expect(imagesDatabaseService.setWorkflowImageWithReference).toHaveBeenCalledWith(newWorkflowId, imageReferences[1].name, imageData[2]);
                                expect(imagesDatabaseService.setWorkflowImageWithReference).toHaveBeenCalledWith(newWorkflowId, imageReferences[2].name, imageData[1]);
                                const files = await dexieInstance.files.toArray();
                                const filenames = await dexieInstance.filenames.toArray();
                                expect(files[0].hash).toBe('hash1');
                                expect(files[1].hash).toBe('hash2');
                                expect(files[2].hash).toBe('hash3');
                                expect(await readFileAsText(files[0].data)).toBe('blob1');
                                expect(await readFileAsText(files[1].data)).toBe('blob2');
                                expect(await readFileAsText(files[2].data)).toBe('blob3')
                                expect(filenames).toEqual(jasmine.arrayContaining(imageReferences.map(e => jasmine.objectContaining(e))));
                            });
                            done();
                        });
                        it('should not overwrite an image if the hash already exists for the workflow', async function(done) {
                            const imageReferences: IFileReference[] = [
                                {name: 'New Image', hash: 'hash1'},
                                {name: 'My Image 2', hash: imgHash},
                            ];
                            const imageData: IFileWithHash[] = [
                                {hash: 'hash1', data: new Blob(['blob1'])},
                                {hash: imgHash, data: new Blob(['blob2'])},
                            ];
                            await tryOrFailAsync(async () => {
                                await imagesDatabaseService.setWorkflowImagesWithReferences(workflowId, imageReferences, imageData);
                                expect(await dexieInstance.filenames.toArray()).toEqual(jasmine.arrayWithExactContents([
                                    jasmine.objectContaining({hash: 'hash1', name: 'New Image'}),
                                    jasmine.objectContaining({hash: imgHash, name: imgName}),
                                ]));
                                expect(await readFileAsText((await dexieInstance.files.get({hash: 'hash1'})).data)).toEqual('blob1');
                                expect(await readFileAsText((await dexieInstance.files.get({hash: imgHash})).data)).toEqual(imgDataText);
                            });
                            done();
                        });
                        it('should throw an Error and revert transaction if there is no blob for a certain hash', async function(done) {
                            const imageReferences: IFileReference[] = [
                                {name: 'New Image', hash: 'hash1'},
                                {name: 'Missing', hash: 'hash2'},
                            ];
                            const imageData: IFileWithHash[] = [
                                {hash: 'hash1', data: new Blob(['blob1'])},
                            ];
                            await expectThrowsAsync(async () => {
                                await imagesDatabaseService.setWorkflowImagesWithReferences(workflowId, imageReferences, imageData);
                            }, 'No Blob specified for hash hash2');
                            await tryOrFailAsync(async () => {
                                expect(await dexieInstance.filenames.toArray()).toEqual(jasmine.arrayWithExactContents([
                                    jasmine.objectContaining({hash: imgHash, name: imgName}),
                                ]));
                                expect((await dexieInstance.files.toArray())).toEqual([
                                    jasmine.objectContaining({hash: imgHash, data: jasmine.any(Blob)})
                                ]);
                            });
                            done();
                        });
                        it('should throw an Error and revert transaction if there is only an invalid blob for a certain hash', async function(done) {
                            const imageReferences: IFileReference[] = [
                                {name: 'New Image', hash: 'hash1'},
                                {name: 'Missing', hash: 'hash2'},
                            ];
                            const imageData1: IFileWithHash[] = [
                                {hash: 'hash1', data: new Blob(['blob1'])},
                                {hash: 'hash2', data: {} as any},
                            ];
                            const imageData2: IFileWithHash[] = [
                                {hash: 'hash1', data: new Blob(['blob1'])},
                                {hash: 'hash2', data: null as any},
                            ];
                            await expectThrowsAsync(async () => {
                                await imagesDatabaseService.setWorkflowImagesWithReferences(workflowId, imageReferences, imageData1);
                            }, 'No Blob specified for hash hash2');
                            await expectThrowsAsync(async () => {
                                await imagesDatabaseService.setWorkflowImagesWithReferences(workflowId, imageReferences, imageData2);
                            }, 'No Blob specified for hash hash2');
                            await tryOrFailAsync(async () => {
                                expect(await dexieInstance.filenames.toArray()).toEqual(jasmine.arrayWithExactContents([
                                    jasmine.objectContaining({hash: imgHash, name: imgName}),
                                ]));
                                expect((await dexieInstance.files.toArray())).toEqual([
                                    jasmine.objectContaining({hash: imgHash, data: jasmine.any(Blob)})
                                ]);
                            });
                            done();
                        });
                        it('should throw an error (by default) if an image with the same name already exists with a different hash', async function(done) {
                            const imageReferences: IFileReference[] = [
                                {name: 'New Image', hash: 'hash1'},
                                {name: imgName, hash: 'hash2'},
                            ];
                            const imageData: IFileWithHash[] = [
                                {hash: 'hash1', data: new Blob(['blob1'])},
                                {hash: 'hash2', data: new Blob(['blob2'])},
                            ];
                            await expectThrowsAsync(async () => {
                                await imagesDatabaseService.setWorkflowImagesWithReferences(workflowId, imageReferences, imageData);
                            }, `The Image name "${imgName}" is already in use!`);
                            await tryOrFailAsync(async () => {
                                expect(await dexieInstance.filenames.toArray()).toEqual(jasmine.arrayWithExactContents([
                                    jasmine.objectContaining({hash: imgHash, name: imgName}),
                                ]));
                                const files = await dexieInstance.files.toArray();
                                expect(files).toEqual([
                                    jasmine.objectContaining({hash: imgHash, data: jasmine.any(Blob)})
                                ]);
                                expect(await readFileAsText(files[0].data)).toEqual(imgDataText);
                            });
                            done();
                        });
                        it('should handle name conflicts with the given handler function', async function(done) {
                            const nameConflictHandler = jasmine.createSpy('nameConflictHandler').and.returnValues('Fixed1', 'Fixed2');
                            const imageReferences: IFileReference[] = [
                                {name: 'New Image', hash: 'hash1'},
                                {name: imgName, hash: 'hash2'},
                                {name: 'Another Image', hash: 'hash3'},
                                {name: 'Another Image', hash: 'hash4'},
                            ];
                            const imageData: IFileWithHash[] = [
                                {hash: 'hash1', data: new Blob(['blob1'])},
                                {hash: 'hash2', data: new Blob(['blob2'])},
                                {hash: 'hash3', data: new Blob(['blob3'])},
                                {hash: 'hash4', data: new Blob(['blob4'])},
                            ];
                            await tryOrFailAsync(async () => {
                                await imagesDatabaseService.setWorkflowImagesWithReferences(workflowId, imageReferences, imageData, nameConflictHandler);
                                expect(nameConflictHandler).toHaveBeenCalledTimes(2);
                                expect(nameConflictHandler).toHaveBeenCalledWith(imgName, jasmine.any(Set));
                                expect(nameConflictHandler).toHaveBeenCalledWith('Another Image', jasmine.any(Set));
                                expect(await dexieInstance.filenames.toArray()).toEqual(jasmine.arrayWithExactContents([
                                    jasmine.objectContaining({hash: imgHash, name: imgName}),
                                    jasmine.objectContaining({hash: 'hash1', name: 'New Image'}),
                                    jasmine.objectContaining({hash: 'hash2', name: 'Fixed1'}),
                                    jasmine.objectContaining({hash: 'hash3', name: 'Another Image'}),
                                    jasmine.objectContaining({hash: 'hash4', name: 'Fixed2'}),
                                ]));
                                const files: IFileWithHash[] = await dexieInstance.files.toArray();
                                expect(files as any).toEqual(jasmine.arrayWithExactContents([
                                    jasmine.objectContaining({hash: imgHash, data: jasmine.any(Blob)}),
                                    jasmine.objectContaining({hash: 'hash1', data: jasmine.any(Blob)}),
                                    jasmine.objectContaining({hash: 'hash2', data: jasmine.any(Blob)}),
                                    jasmine.objectContaining({hash: 'hash3', data: jasmine.any(Blob)}),
                                    jasmine.objectContaining({hash: 'hash4', data: jasmine.any(Blob)}),
                                ]));
                                expect(await readFileAsText(files.find(f => f.hash === imgHash)!.data)).toEqual(imgDataText);
                                expect(await readFileAsText(files.find(f => f.hash === 'hash1')!.data)).toEqual('blob1');
                                expect(await readFileAsText(files.find(f => f.hash === 'hash2')!.data)).toEqual('blob2');
                                expect(await readFileAsText(files.find(f => f.hash === 'hash3')!.data)).toEqual('blob3');
                                expect(await readFileAsText(files.find(f => f.hash === 'hash4')!.data)).toEqual('blob4');
                            });
                            done();
                        });
                    });
                    describe('hasWorkflowImageReference', function() {
                        it('should return true, if a workflow contains an image with the given name', function (done) {
                            imagesDatabaseService.hasWorkflowImageReference(workflowId, imgName).then(function (hasReference) {
                                expect(hasReference).toBeTruthy();
                                done();
                            });
                        });
                        it('should return false, if a workflow does NOT contain an image with the give name', function (done) {
                            imagesDatabaseService.hasWorkflowImageReference(workflowId, 'someName').then(function (hasReference) {
                                expect(hasReference).toBeFalsy();
                                done();
                            });
                        });
                        it('should check that a reference belongs to the correct workflow name', function (done) {
                            const newImgFile = { hash: "newImgHash", data: new Blob(["newImgData"]) };
                            imagesDatabaseService.setWorkflowImageWithReference(workflowId+1, "newImgName", newImgFile).then(function () {
                                imagesDatabaseService.hasWorkflowImageReference(workflowId+1, imgName).then(function (hasReference) {
                                    expect(hasReference).toBeFalsy('- Combination of workflowId/name was not correctly filtered');
                                });
                            }).then(function () {
                                imagesDatabaseService.hasWorkflowImageReference(workflowId+1, 'newImgName').then(function (hasReference) {
                                    expect(hasReference).toBeTruthy();
                                    done();
                                });
                            });
                        });
                    });
                    describe('hasWorkflowImageHash', function() {
                        it('should return true, if a workflow contains an image with the given hash', function (done) {
                            imagesDatabaseService.hasWorkflowImageHash(workflowId, imgHash).then(function (hasImage) {
                                expect(hasImage).toBeTruthy();
                                done();
                            });
                        });
                        it('should return false, if a workflow does NOT contain an image with the give hash', function (done) {
                            imagesDatabaseService.hasWorkflowImageHash(workflowId, 'someHash').then(function (hasImage) {
                                expect(hasImage).toBeFalsy();
                                done();
                            });
                        });
                        it('should check that a reference belongs to the correct workflow hash', function (done) {
                            const newImgFile = { hash: "newImgHash", data: new Blob(["newImgData"]) };
                            imagesDatabaseService.setWorkflowImageWithReference(workflowId+1, "newImgName", newImgFile).then(function () {
                                imagesDatabaseService.hasWorkflowImageHash(workflowId+1, imgHash).then(function (hasReference) {
                                    expect(hasReference).toBeFalsy('- Combination of workflowId/hash was not correctly filtered');
                                });
                            }).then(function () {
                                imagesDatabaseService.hasWorkflowImageHash(workflowId+1, newImgFile.hash).then(function (hasReference) {
                                    expect(hasReference).toBeTruthy();
                                    done();
                                });
                            });
                        });
                    });
                    describe('getWorkflowImageByName', function() {
                        it('should return an image for a given workflow id and image name', function (done) {
                            imagesDatabaseService.getWorkflowImageByName(workflowId, imgName).then(function (entry) {
                                expect(entry).toBeDefined();
                                expect(entry.workflow).toBe(workflowId);
                                expect(entry.hash).toBe(imgHash);
                                expect(entry.name).toBe(imgName);
                            }).then(function () {
                                imagesDatabaseService.getWorkflowImageByName(2, imgName).then(function () {
                                    fail('expected promise to be rejected');
                                    done();
                                }, function (reason) {
                                    expect(reason).toBe(errorNoEntry);
                                    done();
                                });
                            });
                        });
                        it('should reject the promise if an image for a given workflow id and image name could not be found', function (done) {
                            imagesDatabaseService.getWorkflowImageByName(workflowId, 'someOtherName').then(function () {
                                fail('expected promise to be rejected');
                                done();
                            }, function (reason) {
                                expect(reason).toBe(errorNoEntry);
                                done();
                            });
                        });
                    });
                    describe('getWorkflowImageByHash', function() {
                        it('should return an image for a given workflow id and image hash', function (done) {
                            imagesDatabaseService.getWorkflowImageByHash(workflowId, imgHash).then(function (entry) {
                                expect(entry).toBeDefined();
                                expect(entry.workflow).toBe(workflowId);
                                expect(entry.hash).toBe(imgHash);
                                expect(entry.name).toBe(imgName);
                            }).then(function () {
                                imagesDatabaseService.getWorkflowImageByHash(2, imgHash).then(function () {
                                    fail('expected promise to be rejected');
                                    done();
                                }, function (reason) {
                                    expect(reason).toBe(errorNoEntry);
                                    done();
                                });
                            });
                        });
                        it('should reject the promsie if an image for a given workflow id and image hash could not be found', function (done) {
                            imagesDatabaseService.getWorkflowImageByHash(workflowId, 'someOtherHash').then(function () {
                                fail('expected promise to be rejected');
                                done();
                            }, function (reason) {
                                expect(reason).toBe(errorNoEntry);
                                done();
                            });
                        });
                    });
                    describe('getImageFiles', function() {
                        beforeEach(function(done) {
                            Promise.resolve()
                                .then(() => imagesDatabaseService.setWorkflowImageWithReference(1, 'WF1Image1', {hash: 'hash1', data: new Blob(['data1'])}))
                                .then(() => imagesDatabaseService.setWorkflowImageWithReference(1, 'WF1Image2', {hash: 'hash2', data: new Blob(['data2'])}))
                                .then(() => imagesDatabaseService.setWorkflowImageWithReference(3, 'WF3Image1', {hash: 'hash3', data: new Blob(['data3'])}))
                                .then(() => imagesDatabaseService.setWorkflowImageWithReference(3, 'WF3Image2', {hash: 'hash4', data: new Blob(['data4'])}))
                                .then(() => imagesDatabaseService.setWorkflowImageWithReference(3, 'WF3Image3', {hash: 'hash5', data: new Blob(['data5'])}))
                                .then(done);
                        });
                        it('should return image files with the given hashes', function(done) {
                            imagesDatabaseService.getImageFiles(['hash1', 'hash2', 'hash4'])
                                .then((files) => {
                                    expect(files).toEqual(jasmine.arrayWithExactContents([
                                        {hash: 'hash2', data: jasmine.any(Blob)},
                                        {hash: 'hash1', data: jasmine.any(Blob)},
                                        {hash: 'hash4', data: jasmine.any(Blob)},
                                    ]) as any);
                                    return Promise.all(files.map((file) => readFileAsText(file.data).then(blobData => {return {hash: file.hash, blobData};})));
                                })
                                .then((filesWithData) => {
                                    expect(filesWithData.find(f => f && f.hash === 'hash1')?.blobData).toBe('data1');
                                    expect(filesWithData.find(f => f && f.hash === 'hash2')?.blobData).toBe('data2');
                                    expect(filesWithData.find(f => f && f.hash === 'hash4')?.blobData).toBe('data4');
                                })
                                .then(done);
                        });
                        it('should reject if a hash cannot be found', function(done) {
                            imagesDatabaseService.getImageFiles(['hash1', 'hash2', 'hashX']).then((result) => {
                                fail('Promise should have been rejected, was resolved instead: ' + result);
                            }).catch((msg) => {
                                expect(msg).toEqual('DB: could not find images for all requested hashes!');
                            }).finally(() => {
                                done();
                            });
                        });
                        it('should return empty array if input is empty', function(done) {
                            imagesDatabaseService.getImageFiles([]).then((result) => {
                                expect(result).toEqual([]);
                            }).then(done);
                        });
                    });
                    describe('hasImageFile', function() {
                        it('should return an image for a given image hash', function (done) {
                            imagesDatabaseService.getImageFile(imgHash).then(function (entry) {
                                expect(entry).toBeDefined();
                                expect(entry).toEqual(imgFile);
                                done();
                            });
                        });
                        it('should reject the promise if no image for a given image hash could be found', function (done) {
                            imagesDatabaseService.getImageFile('someOtherHash').then(function () {
                                fail('expected promise to be rejected');
                                done();
                            }, function (reason) {
                                expect(reason).toBe(errorNoEntry);
                                done();
                            });
                        });
                    });
                    describe('removeImageEntry', function() {
                        it('should remove all references and the image (if unreferenced & studyMode disabled) for a given workflow id', function (done) {
                            spyOn(imagesDatabaseService, 'getWorkflowImageByName').and.callThrough();
                            settingsService.studyModeEnabled = false;

                            getDexieFilenamesObject(imgKey).then(function (entry) {
                                expect(entry).toBeDefined();
                                expect(entry).not.toBeNull();
                            }).then(function () {
                                imagesDatabaseService.removeImageEntry(workflowId, imgName).then(function (hasBeenDeleted) {
                                    expect(imagesDatabaseService.getWorkflowImageByName).toHaveBeenCalledWith(workflowId, imgName);
                                    expect(hasBeenDeleted).toBeTruthy();
                                }).then(function () {
                                    getDexieFilenamesObject(imgKey).then(function (entry) {
                                        expect(entry).toBeUndefined();
                                    });
                                }).then(function () {
                                    getDexieFilesObject(imgKey.hash).then(function (image) {
                                        expect(image).toBeUndefined();
                                        done();
                                    });
                                });
                            });
                        });
                        it('should remove all references and not the image (if unreferenced & studyMode enabled) for a given workflow id', function (done) {
                            spyOn(imagesDatabaseService, 'getWorkflowImageByName').and.callThrough();
                            settingsService.studyModeEnabled = true;

                            getDexieFilenamesObject(imgKey).then(function (entry) {
                                expect(entry).toBeDefined();
                                expect(entry).not.toBeNull();
                            }).then(function () {
                                imagesDatabaseService.removeImageEntry(workflowId, imgName).then(function (hasBeenDeleted) {
                                    expect(imagesDatabaseService.getWorkflowImageByName).toHaveBeenCalledWith(workflowId, imgName);
                                    expect(hasBeenDeleted).toBeFalsy();
                                }).then(function () {
                                    getDexieFilenamesObject(imgKey).then(function (entry) {
                                        expect(entry).toBeUndefined();
                                    });
                                }).then(function () {
                                    getDexieFilesObject(imgKey.hash).then(function (image) {
                                        expect(image).toBeDefined();
                                        done();
                                    });
                                });
                            });
                        });
                        it('should remove all references and keep the image (if still referenced)', function (done) {
                            imagesDatabaseService.setWorkflowImageWithReference(2, imgName, imgFile).then(function () {
                                imagesDatabaseService.removeImageEntry(workflowId, imgName).then(function (hasBeenDeleted) {
                                    expect(hasBeenDeleted).toBeFalsy();
                                    done();
                                });
                            });
                        });
                        it('should roll back the delete transaction if an error occurs', function (done) {
                            spyOn(dexieInstance.filenames, 'delete').and.returnValue(Promise.reject('error'));
                            imagesDatabaseService.removeImageEntry(workflowId, imgName).then(function () {
                                fail('expected promise to be rejected');
                                done();
                            }, function () {
                                getDexieFilenamesObject(imgKey).then(function (entry) {
                                    expect(entry).toBeDefined();
                                    done();
                                });
                            });

                        });
                    });
                    describe('removeWorkflowImages', function() {
                        it('should remove all references to images for a given workflow id if removeWorkflowImages is called', function (done) {
                            const testBlob = new Blob(['no', 'content']);
                            const testFile = {hash: 'my test hash', data: testBlob};
                            spyOn(imagesDatabaseService, 'removeImageEntry').and.callThrough();
                            imagesDatabaseService.setWorkflowImageWithReference(workflowId,'my test image', testFile).then(function () {
                                imagesDatabaseService.getImageNames(workflowId).then(function (names) {
                                    expect(names.length).toBe(2);
                                    expect(names[0]).toEqual('my test image');
                                    expect(names[1]).toEqual(imgName);
                                });
                            }).then(function () {
                                imagesDatabaseService.removeWorkflowImages(workflowId).then(function () {
                                    expect(imagesDatabaseService.removeImageEntry).toHaveBeenCalledTimes(2);
                                }).then(function () {
                                    imagesDatabaseService.getImageNames(workflowId).then(function (names) {
                                        expect(names.length).toBe(0);
                                        done();
                                    });
                                });
                            });
                        });
                        it('should roll back the delete transaction if an error occurs', function (done) {
                            spyOn(dexieInstance.filenames, 'delete').and.returnValue(Promise.reject('error'));
                            imagesDatabaseService.removeWorkflowImages(workflowId).then(function () {
                                fail('expected promise to be rejected');
                                done();
                            }, function () {
                                getDexieFilenamesObject(imgKey).then(function (entry) {
                                    expect(entry).toBeDefined();
                                    done();
                                });
                            });

                        });
                    });
                    describe('duplicateWorkflowImages', function() {
                        it('should set the same references for a new workflow (toId) from a given workflow if duplicateWorkflowImages is called', function (done) {
                            imagesDatabaseService.hasWorkflowImageHash(workflowId + 1, imgHash).then(function (hasHash) {
                                expect(hasHash).toBeFalsy();
                            }).then(function () {
                                imagesDatabaseService.duplicateWorkflowImages(workflowId, workflowId + 1).then(function () {
                                    imagesDatabaseService.hasWorkflowImageHash(workflowId + 1, imgHash).then(function (hasHash) {
                                        expect(hasHash).toBeTruthy();
                                        done();
                                    });
                                });
                            });
                        });
                        it('should roll back the duplicate transaction if an error occurs', function (done) {
                            spyOn(dexieInstance.filenames, 'put').and.returnValue(Promise.reject('error'));

                            imagesDatabaseService.duplicateWorkflowImages(workflowId, workflowId+1).then(function () {
                                dexieInstance.filenames.where({workflow: workflowId}).count().then(function (count: number) {
                                    expect(count).toBe(1);
                                }).then(function () {
                                    dexieInstance.filenames.where({workflow: workflowId+1}).count().then(function (count: number) {
                                        expect(count).toBe(0);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                    describe('dumpDB', function() {
                        const imageBlob1Data = 'binary image mock data 1';
                        const imageBlob2Data = 'binary image mock data 2';
                        const expectedDBDump = [{
                            table: 'filenames',
                            rows: [
                                {id: 1, workflow: 1, name: 'myImage', hash: 'myHash'},
                                {id: 2, workflow: 1234, name: 'my image1', hash: 'c0ffe'},
                                {id: 3, workflow: 1234, name: 'image2', hash: 'beef'},
                                {id: 4, workflow: 42, name: 'other image', hash: 'beef'},
                            ]
                        }, {
                            table: 'files',
                            rows: [
                                {hash: 'beef', data: new Blob([imageBlob2Data])},
                                {hash: 'c0ffe', data: new Blob([imageBlob1Data])},
                                {hash: 'myHash', data: imgData},
                            ]
                        }];
                        const imageFile0 = imgFile;
                        const imageFile1 = {hash: 'c0ffe', data: new Blob([imageBlob1Data])};
                        const imageFile2 = {hash: 'beef', data: new Blob([imageBlob2Data])};

                        beforeEach(function(done) {
                            imagesDatabaseService.setWorkflowImageWithReference(1234, 'my image1', imageFile1).then(
                                () => imagesDatabaseService.setWorkflowImageWithReference(1234, 'image2', imageFile2)
                            ).then(
                                () => imagesDatabaseService.setWorkflowImageWithReference(42, 'other image', imageFile2)
                            ).then(done);
                        });
                        it('should return a database dump containing all tables and rows', function(done) {
                            imagesDatabaseService.dumpDB().then((dbDump) => {
                                expect(dbDump).toEqual(expectedDBDump);
                            }).then(done);
                        });
                    });
                    it('should get all image names for a given workflow id if getImageNames is called', function (done) {
                        imagesDatabaseService.getImageNames(workflowId).then(function (names) {
                            expect(names.length).toBe(1);
                            expect(names).toEqual([imgName]);
                            done();
                        });
                    });
                    it('should return empty array if workflow id in removeWorkflowImages is not present', function (done) {
                        const notExistingID = -1;
                        imagesDatabaseService.getImageNames(notExistingID).then(function (names) {
                            expect(names.length).toBe(0);
                            expect(names).toEqual([]);
                            done();
                        }, function () {
                            fail('should not reject if workflow is not current, instead return empty array');
                            done();
                        });
                    });
                    it('should get all image references with name and hash for a given workflow id if getWorkflowImages is called', function (done) {
                        const testBlob = new Blob(['no', 'content']);
                        const testFile = {hash: 'my test hash', data: testBlob};
                        imagesDatabaseService.setWorkflowImageWithReference(workflowId,'my test image', testFile).then(function () {
                            imagesDatabaseService.getWorkflowImages(workflowId).then(function (images) {
                                expect(images.length).toBe(2);
                                expect(images[0].hasOwnProperty('name')).toBeTruthy();
                                expect(images[0].hasOwnProperty('hash')).toBeTruthy();
                                expect(images[0].name).toBe('my test image');
                                expect(images[0].hash).toBe(testFile.hash);
                                expect(images[1].name).toBe(imgName);
                                expect(images[1].hash).toBe(imgHash);
                                done();
                            });
                        });
                    });

                });
            });
        });
    });

}
