
module rehagoal.database {
    import TableDump = rehagoal.exchange.TableDump;
    const moduleName = 'rehagoal.database';

    export interface IFileReference {
        name: string, hash: string
    }

    interface IFilename extends IFileReference {
        id: number, workflow: number
    }

    export interface IFileWithHash {
        hash: string, data: Blob
    }

    interface ImagesDexie extends dexie.Dexie {
        filenames: dexie.Dexie.Table<IFilename, {id: number}>
        files: dexie.Dexie.Table<IFileWithHash, {hash: string}>
    }

    export type NameConflictHandler = (conflictingName: string, existingNames: Set<string>) => string;
    const NAME_CONFLICT_ERROR_HANDLER: NameConflictHandler = (conflictingName) => {
        throw new Error(`The Image name "${conflictingName}" is already in use!`)
    };

    export class ImagesDatabase {

        static $inject = [
            '$window',
            '$log',
            'settingsService',
            'dexieFactory'
        ];

        private dexie: any;

        constructor(private $window: angular.IWindowService,
                    private $log: angular.ILogService,
                    private settingsService: rehagoal.settings.SettingsService,
                    private dexieFactory: DexieFactory) {
            this.dexie = dexieFactory<ImagesDexie>('fileDB');
            this.dexie.version(1).stores({
                filenames: '++id,workflow,name,hash',
                files: 'hash'
            });
            this.dexie.version(2).stores({
                filenames: '++id,workflow,name,hash,[workflow+name],[workflow+hash]',
                files: 'hash'
            });
        }

        /**
         * Exports all entries from all tables of this database to a datastructure.
         * The datastructure includes the table names and every field stored in the database.
         * @returns Promise, which will be resolved with the database dump datastructure.
         */
        public async dumpDB(): Promise<TableDump[]> {
            const db = this.dexie;
            return db.transaction('r', db.tables, () => {
                return Promise.all(
                    db.tables.map((table: dexie.Dexie.Table<any, any>) => table.toArray()
                        .then((rows: any[]) => ({table: table.name, rows: rows}))
                    )
                );
            });
        }

        /**
         * Sets an entry in the datastore for a workflow with a given reference name
         * (either a new image with storeImage call or an existing with hash reference)
         * If the settingsService.studyMode is disabled, it calls a cleanup function to
         * delete the old image if the reference was changed. Otherwise it will be kept.
         * @param workflowId    id for the containing workflow
         * @param imageName     name of the image reference
         * @param image         image file which should be stored
         */
        public setWorkflowImageWithReference = (workflowId: number, imageName: string, image: IFileWithHash): Promise<void> => {
            let db = this;
            let oldReference: string = "";

            return db.dexie.transaction('rw', db.dexie.filenames, db.dexie.files, () => {
                return db.findWorkflowImageByName(workflowId, imageName).then( (maybeFileEntry) => {
                    if (!maybeFileEntry) {
                        return;
                    }
                    oldReference = maybeFileEntry.hash;
                    return db.dexie.filenames.delete(maybeFileEntry.id);
                }).then(() => {
                    return db.getWorkflowImageByHash(workflowId, image.hash).then((referenceEntry) => {
                        // image already stored, delete reference entry
                        return db.dexie.filenames.delete(referenceEntry.id);
                    }).catch(() => {
                        // store new image
                        return db.storeImageFile(image);
                    });
                }).then(() => {
                    return db.setWorkflowImageReference(workflowId, imageName, image.hash);
                }).then(() => {
                    if (oldReference) {
                        return db.removeImageFileIfUnreferencedExceptStudyMode(oldReference).then(() => {});
                    }
                });
            });
        };

        /**
         * Store multiple images with name references for a given workflow in a transaction.
         * If for a given hash (in `imageReferences`) no Blob is provided in `imageData` the Promise is rejected.
         * If an image with the given hash is already associated with the workflow, it will not be changed.
         * If the name of an image (in the reference) is already in use, the `nameConflictHandler` will be invoked in order to find a new name or throw an error.
         * @param workflowId ID of the workflow to which the images should be associated
         * @param imageReferences array of image references to be stored with the workflow
         * @param imageData array of image files with hashes to be associated to the workflow (only stored if referenced by `imageReferences`.
         * @param nameConflictHandler
         *        Function which is called if an image name is already used in the workflow.
         *        The function should return a new name or throw an Error.
         *        By default an Error is thrown.
         */
        public setWorkflowImagesWithReferences = async (workflowId: number,
                                                        imageReferences: IFileReference[],
                                                        imageData: IFileWithHash[],
                                                        nameConflictHandler = NAME_CONFLICT_ERROR_HANDLER): Promise<void> => {
            let db = this;
            return db.dexie.transaction('rw', db.dexie.filenames, db.dexie.files, async () => {
                const hashToBlob = new Map<string, Blob>(imageData.map((entry) => [entry.hash, entry.data]));
                const existingImageNames = new Set(await db.getImageNames(workflowId));

                for (const imageReference of imageReferences) {
                    let {hash, name} = imageReference;
                    const blob = hashToBlob.get(hash);
                    if (!blob || !(blob instanceof Blob)) {
                        throw new Error(`No Blob specified for hash ${hash}`);
                    }
                    const imageExists = await db.hasWorkflowImageHash(workflowId, hash);
                    if (imageExists) {
                        this.$log.debug(`DB: Image for hash ${hash} already exists for workflow with id ${workflowId}.`);
                        continue;
                    }
                    if (existingImageNames.has(name)) {
                        name = nameConflictHandler(name, existingImageNames);
                    }
                    await db.setWorkflowImageWithReference(workflowId, name, {hash, data: blob});
                    existingImageNames.add(name);
                }
            });
        }

        /**
         * Checks if an reference is already present in the database for a given workflow
         * Returns true if an entry was found or false if no reference has been stored
         * under the given imageName
         * @param workflowId    id of workflow
         * @param imageName     name of the image reference
         */
        public hasWorkflowImageReference = (workflowId: number, imageName: string): Promise<boolean> => {
            let db = this;
            return db.dexie.filenames.where({workflow: workflowId, name: imageName}).count((count: number) => count != 0);
        };

        /**
         * Checks if an image hash is already present in the database for a given workflow
         * Returns true if an entry was found or false if no hash has been stored under the
         * given imageHash
         * @param workflowId    id of workflow
         * @param imageHash     hash of the image file
         */
        public hasWorkflowImageHash = (workflowId: number, imageHash: string): Promise<boolean> => {
            let db = this;
            return db.dexie.filenames.where({workflow: workflowId, hash: imageHash}).count((count: number) => count != 0);
        };

        /**
         * Helper function to get an Filename-Entry which matches the
         * workflow id and the image name provided. In case there is no
         * match, an error is thrown
         * @throws              Error that no entry was found
         * @param workflowId    workflow id to search for
         * @param imageName     reference name of the image
         */
        public getWorkflowImageByName(workflowId: number, imageName: string): Promise<IFilename> {
            let db = this;
            return db.rejectIfUndefined(db.findWorkflowImageByName(workflowId, imageName));
        }

        private findWorkflowImageByName(workflowId: number, imageName: string): Promise<IFilename | undefined> {
            let db = this;
            return db.dexie.filenames.where({workflow: workflowId, name: imageName}).first();
        }

        /**
         * Returns the image reference of the given workflow with the given hash, if it exists in a Promise,
         * otherwise the Promise is rejected.
         * @param workflowId ID of the workflow to which the image is associated
         * @param imageHash hash of the image
         */
        public getWorkflowImageByHash(workflowId: number, imageHash: string): Promise<IFilename> {
            let db = this;
            return db.rejectIfUndefined(db.dexie.filenames.where({workflow: workflowId, hash: imageHash}).first());
        }

        /**
         * Helper function to check if an hash value is used as a
         * key value to store an image inside this datastore
         * @throws              Error that no entry was found
         * @param imageHash     hash of an image which should be stored
         */
        public getImageFile(imageHash: string): Promise<IFileWithHash> {
            let db = this;
            return db.rejectIfUndefined(db.dexie.files.get(imageHash));
        }

        /**
         * Returns a Promise of image files with the given hashes. If any of the hashes cannot be found, the Promise is rejected.
         * Result is **not** necessarily in the same order as the input array.
         * @param imageHashes array of hashes to search for
         * @return Promise of image files, not necessarily in the same order as imageHashes.
         */
        public getImageFiles(imageHashes: string[]): Promise<IFileWithHash[]> {
            //return this.dexie.files.bulkGet(imageHashes); // not available in current Dexie version
            const db = this;
            return db.dexie.transaction('r', db.dexie.files, async () => {
                const files = await this.dexie.files.where('hash').anyOf(imageHashes).toArray();
                if (files.length !== imageHashes.length) {
                    return Promise.reject('DB: could not find images for all requested hashes!');
                }
                return files;
            });
        }

        /**
         * If there is an image stored under a given reference name and workflow id, it will delete
         * the reference and check afterwards, if the image is still used. If it is not and the studyMode
         * is not enabled, the image will be removed completely. Otherwise the image will be kept in the
         * database as it is needed to fully restore old workflow versions.
         * @param {number} workflowId   id of the containing workflow
         * @param {string} imageName    image reference name
         * @return {Promise<boolean>}   Promise with resolution `true`, if the file was deleted, resolution `false` otherwise.
         */
        public removeImageEntry = (workflowId: number, imageName: string): Promise<boolean> => {
            let db = this;
            let imageHash: string = "";
            return db.dexie.transaction('rw', db.dexie.filenames, db.dexie.files, () => {
                return db.getWorkflowImageByName(workflowId, imageName).then((entry) => {
                    imageHash = entry.hash;
                    return db.dexie.filenames.delete(entry.id).then(() => {
                        return db.removeImageFileIfUnreferencedExceptStudyMode(imageHash);
                    });
                });
            });
        };

        /**
         * Removes all image references for a given workflow, cleaning up unreferenced image files afterwards.
         * @param {Number} workflowId the id of the workflow
         * @return {Promise<void>} fulfilled if transaction finishes, otherwise rejects
         */
        public removeWorkflowImages = (workflowId: number): Promise<void>  => {
            let db = this;
            return db.dexie.transaction('rw', db.dexie.filenames, db.dexie.files, () => {
                return db.dexie.filenames.where({workflow: workflowId})
                    .each((entry: IFilename) => {
                        return db.removeImageEntry(workflowId, entry.name);
                    });
            });
        };

        /**
         * get all image names to given workflow
         * @param workflowId the id of the workflow
         * @return {Promise<string[]>} promise of array with image names
         */
        public getImageNames = (workflowId: number): Promise<string[]> => {
            let db = this;
            return db.dexie.filenames.where({workflow: workflowId})
                .sortBy('name', (entries: IFilename[]) =>
                    entries.map((entry) => entry.name)
                );
        };

        /**
         * Returns all image references (name + hash) for a given workflow
         * @param {Number} workflowId the id of the workflow
         * @returns {Promise<rehagoal.database.IFileReference[]>} promise of array with image references (name+hash)
         */
        public getWorkflowImages = (workflowId: number): Promise<IFileReference[]> => {
            let db = this;
            return db.dexie.filenames.where({workflow: workflowId})
                .sortBy('name', (entries: IFilename[]) =>
                    entries.map((entry) => ({
                        name: entry.name,
                        hash: entry.hash
                    })
                )
            );
        };

        /**
         * Copies all image references (name + hash) of a workflow to another workflow
         * @param {Number} fromId the id of the source workflow
         * @param {Number} toId the id of the target workflow
         */
        public duplicateWorkflowImages = (fromId: number, toId: number): Promise<void> => {
            let db = this;
            return db.dexie.transaction("rw", db.dexie.filenames, function () {
                return db.dexie.filenames.where({workflow: fromId}).each((entry: IFilename) => {
                    return db.dexie.filenames.put({workflow: toId, name: entry.name, hash: entry.hash});
                })
            })
        };

        /**
         * Store a temporary uploaded image into the database
         * @throws          PutError while storing image in files db
         * @param image     Image to store in DB
         */
        private storeImageFile = (image: IFileWithHash): Promise<void> => {
            if (!image) {
                return Promise.reject<void>('no image provided');
            }
            if (!(image.data instanceof Blob)) {
                return Promise.reject<void>('image is not a Blob');
            }
            let db = this;
            return db.dexie.files.put({hash: image.hash, data: image.data});
        };

        /**
         * Adds/overwrites a named reference to an image file for a specified workflow.
         * @param workflowId    id of the containing workflow
         * @param imageName     name of the image reference
         * @param hash         hash value for the image file
         */
        private setWorkflowImageReference = (workflowId: number, imageName: string, hash: string): Promise<void> => {
            let db = this;
            return db.dexie.filenames.put({workflow: workflowId, name: imageName, hash: hash});
        };

        /**
         * Removes an image file from the database, if it is not referenced any more in the filenames table,
         * except the studyMode in components/settings.service.ts has been enabled. In this case, all images
         * are kept in the database to later be able to restore specific workflow versions.
         * If there was an error, the Promise is rejected.
         * @param {string} imageHash hash of the image, as referenced in the files table.
         * @return {Promise<boolean>} Promise with resolution `true`, if the file was deleted, resolution `false` otherwise.
         */
        private removeImageFileIfUnreferencedExceptStudyMode(imageHash: string): Promise<boolean> {
            let db = this;
            if(db.settingsService.studyModeEnabled) {
                db.$log.info("studyMode enabled on this device, keeping image file in database");
                return Promise.resolve(false);
            }
            return db.dexie.transaction('rw', db.dexie.filenames, db.dexie.files, () => {
                return db.dexie.filenames.where('hash').equals(imageHash).count((count: number) => {
                    if (count == 0) {
                        db.$log.log("Delete image file in database");
                        return db.dexie.files.delete(imageHash).then(() => {
                            return true;
                        });
                    } else {
                        return false;
                    }
                });
            });
        }

        /**
         * Helper function which will check if an promise returns the expected type
         * if not, it will reject. This ensures that promise chains depending
         * on the promise can expect a certain type
         * @param promise   promise returning either an object type or undefined
         * @return Promise that resolves the defined value or rejects for undefined values.
         */
        private rejectIfUndefined<T>(promise: Promise<T | undefined>): Promise<T> {
            return promise.then((value) => {
                if (value) {
                    return value;
                }
                return Promise.reject<T>("DB: Entry not found");
            })
        }
    }

    angular.module(moduleName).service('imagesDatabaseService', ImagesDatabase);
}
