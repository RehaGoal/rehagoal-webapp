module rehagoal.exchange {
    import ImageService = rehagoal.images.ImageService;
    import PGPCryptoService = rehagoal.crypto.PGPCryptoService;
    import MetricsDB = rehagoal.metrics.MetricsDB;
    import MetricService = rehagoal.metrics.MetricService;
    import SettingsService = rehagoal.settings.SettingsService;
    import WorkflowsDB = rehagoal.database.WorkflowsDB;
    import MetricSnapshotDBEntry = rehagoal.metrics.MetricSnapshotDBEntry;
    import jsonStringifyStreamedType = rehagoal.utilities.jsonStringifyStreamedType;
    const moduleName = 'rehagoal.exchange';

    export interface TableDump {
        table: string,
        rows: any[]
    }

    export interface StudyExportObject {
        pseudonym: string,
        imageDB: TableDump[],
        workflowsDB: TableDump[],
        metricSnapshots: MetricSnapshotDBEntry[]
    }

    export class StudyExportService {

        static $inject = [
            'imageService',
            'workflowsDBService',
            'metricsDBService',
            'metricService',
            'readDataURLFromBlob',
            'jsonStringifyStreamed',
            'settingsService',
            'pgpCryptoService'
        ];

        constructor(private imageService: ImageService,
                    private workflowsDBService: WorkflowsDB,
                    private metricsDBService: MetricsDB,
                    private metricService: MetricService,
                    private readDataURLFromBlob: (blob: Blob) => Promise<string>,
                    private jsonStringifyStreamed: jsonStringifyStreamedType,
                    private settingsService: SettingsService,
                    private pgpCryptoService: PGPCryptoService) {
        }

        /**
         * Traverses recursively through the given object, converting every Blob to its corresponding data uri.
         * The object is modified in-place, i.e. no copy is returned.
         * @param obj object in which to replace Blob instances with data uris.
         * @returns reference to the given, now modified object
         */
        private async deepBlobToDataUri(obj: any): Promise<any> {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (obj[key] instanceof Blob) {
                        obj[key] = await this.readDataURLFromBlob(obj[key]);
                    } else if (obj[key] instanceof Object) {
                        obj[key] = await this.deepBlobToDataUri(obj[key]);
                    }
                }
            }
            return obj;
        }

        /**
         * Initializes the study by generating a PGP key pair and deriving the user pseudonym.
         * The key pair will be stored in the settingsService. The private key is protected by a user-supplied password.
         * The user pseudonym is the key id of the PGP key in hexadecimal notation.
         * The settings will not be saved, this is the responsibility of the caller.
         * @param passphrase passphrase which protects the private key of the user
         */
        public async initStudy(passphrase: string): Promise<void> {
            if (this.settingsService.isStudyInitialized()) {
                throw new Error('Study is already initialized!');
            }
            const keyPair = await this.pgpCryptoService.generateProtectedSigningKeyPair(passphrase);
            this.settingsService.pgpUserPublicKey = keyPair.publicKeyArmored;
            this.settingsService.pgpUserPrivateKey = keyPair.privateKeyArmored;
            // FIXME: types seem to be wrong here for KeyId
            this.settingsService.userPseudonym = (keyPair.key.getKeyId() as any).toHex();
        }

        /**
         * Resets the study initialization by clearing the user key pair and the pseudonym.
         * This does not clear study data (i.e. recorded metrics, workflow versions etc.).
         */
        public resetStudy(): void {
            this.settingsService.pgpUserPublicKey = null;
            this.settingsService.pgpUserPrivateKey = null;
            this.settingsService.userPseudonym = null;
        }

        // TODO: Remove?
        private async exportObjectToBlobNaive(exportObj: StudyExportObject, userPassphrase: string): Promise<Blob> {
            const blobsSerialized = await this.deepBlobToDataUri(exportObj);
            const jsonStringified = JSON.stringify(blobsSerialized);
            const encrypted = await this.pgpCryptoService.signAndEncryptForStudyOperator({plaintext: jsonStringified, userPassphrase, streamed: false});
            return new Blob([encrypted]);
        }

        /**
         * Converts a prepared study export object into an encrypted and signed Blob using streams, i.e. hopefully without causing an OutOfMemoryError.
         * @param exportObj study export object to convert
         * @param userPassphrase passphrase of the user's private key
         * @param progressCallback callback for progress information (range: 0..1)
         */
        private async exportObjectToBlobStreamed(exportObj: StudyExportObject, userPassphrase: string, progressCallback: (progress: number) => void): Promise<Blob> {
            const jsonStream = this.jsonStringifyStreamed(exportObj, progressCallback, false);
            return await this.pgpCryptoService.signAndEncryptForStudyOperator({plaintextStream: jsonStream, userPassphrase, streamed: true});
        }

        /**
         * Creates an encrypted and signed Blob containing a study export.
         * This includes:
         *     - the currently stored snapshots of all currently registered public metrics (TODO: exportOrder)
         *     - a full dump of the image database (i.e. all images stored during the study)
         *     - the user pseudonym
         * The data is encrypted for the study operator using PGP.
         * The data is signed using the password-protected private key of the user.
         * @param userPassphrase: passphrase used to protect the private key of the user, needed for signing of the export
         * @param progressCallback Optional callback to report progress as a number between 0 and 1 (finished)
         * @returns Promise, resolved with an encrypted & signed Blob containing a study export.
         */
        public async exportAsBlob(userPassphrase: string, progressCallback: (progress: number) => void = ()=>{}): Promise<Blob> {
            const publicMetricNames = this.metricService.getPublicMetricNames();
            const pseudonym = this.settingsService.userPseudonym;
            if (pseudonym === null) {
                throw new Error('Pseudonym should not be null for export!');
            }
            const exportObj = {
                pseudonym,
                imageDB: await this.imageService.dumpDB(),
                workflowsDB: await this.workflowsDBService.dumpDB(),
                metricSnapshots: await this.metricsDBService.exportMetricSnapshots(publicMetricNames)
            };
            return await this.exportObjectToBlobStreamed(exportObj, userPassphrase, progressCallback);
            // TODO: Remove?
            //return await this.exportObjectToBlobNaive(exportObj, userPassphrase);
        }
    }

    angular.module(moduleName).service('studyExportService', StudyExportService);
}
