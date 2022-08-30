module rehagoal.crypto {
    import SettingsService = rehagoal.settings.SettingsService;
    import streamToBlobType = rehagoal.utilities.streamToBlobType;
    const moduleName = 'rehagoal.crypto';

    export type OpenPGPNamespace = typeof openpgp;

    type KeyPairType = ReturnType<typeof openpgp.generateKey>;
    type MakePGPMessageOptions = {plaintext: string, streamed: false} | {plaintextStream: ReadableStream, streamed: true};
    type StreamedMessageOptions = {stream: ReadableStream<Uint8Array>, passphrase: string};

    export class PGPCryptoService {

        static $inject = [
            'openpgpService',
            'openpgpWorkerPath',
            'studyOperatorPublicKey',
            'settingsService',
            'readBlobAsUint8Array',
            'streamToBlob',
        ];

        private readonly studyOperatorPublicKey!: string;

        /**
         * Initializes the OpenPGP.js worker and stores the injected studyOperatorPublicKey in a readonly property.
         * @param openpgp injected openpgp.js service
         * @param openpgpWorkerPath injected path to the openpgp worker javascript file
         * @param studyOperatorPublicKey injected public key of the study operator
         * @param settingsService injected settingsService
         * @param readBlobAsUint8Array injected function for reading blobs to Uint8Array
         * @param streamToBlob injected function for converting a ReadableStream<string> to a Blob
         */
        constructor(private openpgp: OpenPGPNamespace,
                    openpgpWorkerPath: string,
                    studyOperatorPublicKey: string,
                    private settingsService: SettingsService,
                    private readBlobAsUint8Array: (blob: Blob) => Promise<Uint8Array>,
                    private streamToBlob: streamToBlobType) {
            openpgp.initWorker({path: openpgpWorkerPath});
            Object.defineProperty(this, 'studyOperatorPublicKey', {
                configurable: false,
                writable: false,
                value: studyOperatorPublicKey
            });
        }

        /**
         * Generates a new PGP key pair for the user, which should be used for signing study exports.
         * The private key will be protected by a user-supplied passphrase.
         * @param passphrase passphrase for protection of the private key
         */
        public async generateProtectedSigningKeyPair(passphrase: string): KeyPairType {
            const keyPairOptions = {
                userIds: [{name: 'Pseudonymous Patient', email: 'pseudonymouspatient@rehagoal-server.local'}],
                numBits: 2048,
                passphrase,
            };
            return this.openpgp.generateKey(keyPairOptions);
        }

        /**
         * Signs and encrypts the given plaintext for the study operator.
         * The plaintext is signed with the private key of the user (stored in settings service).
         * The message is encrypted with the public key of the study operator.
         * The message will be compressed with zlib compression.
         * @param options object containing both the plaintext, as well as the passphrase used for protecting the private key
         * @returns Promise, which resolves to a blob containing the (encrypted & signed) PGP message.
         */
        public async signAndEncryptForStudyOperator(options: MakePGPMessageOptions & {userPassphrase: string}): Promise<Blob> {
            const privKey = (await this.openpgp.key.readArmored(this.settingsService.pgpUserPrivateKey)).keys[0];
            if (!privKey) {
                throw new Error('Could not read user private key! Has it been generated?');
            }
            await privKey.decrypt(options.userPassphrase);

            const pubKeyResult = (await this.openpgp.key.readArmored(this.studyOperatorPublicKey));
            if (pubKeyResult.err || pubKeyResult.keys.length != 1) {
                throw new Error('Could not load study operator public key: ' + pubKeyResult.err);
            }
            const pubKey = pubKeyResult.keys[0];
            const message: openpgp.message.Message = this.makePGPMessage(options);
            const encryptionOptions: openpgp.EncryptOptions = {
                message,
                publicKeys: [pubKey],
                privateKeys: [privKey], // Private key for signing
                compression: this.openpgp.enums.compression.zlib,
                armor: true,
                streaming: options.streamed ? 'web' : false
            };
            if (options.streamed) {
                const encryptResult = await this.openpgp.encrypt(encryptionOptions);
                const encryptedStream: ReadableStream<string> = encryptResult.data;
                return await this.streamToBlob(encryptedStream);
            } else {
                const ciphertext = await this.openpgp.encrypt(encryptionOptions);
                return new Blob([ciphertext.data]);
            }
        }

        /**
         * Creates a plaintext PGP message, either from a binary stream, or from a string.
         * @param options either a plaintextStream {ReadableStream} and streamed: true, or plaintext {string} and
         * streamed: false
         * @return OpenPGP plaintext message
         */
        private makePGPMessage(options: MakePGPMessageOptions): openpgp.message.Message {
            if (options.streamed) {
                return this.openpgp.message.fromBinary(options.plaintextStream);
            } else {
                return this.openpgp.message.fromText(options.plaintext)
            }
        }

        /**
         * Encrypts a given stream object with a provided secret
         * @param options.stream        readable stream which contains the content which should be encrypted
         * @param options.passphrase  secret used for encryption, should be at least 64 bytes long
         * @returns           Promise, which resolves to a readable stream containing the encrypted message.
         */
        public async encryptStreamedMessage(options: StreamedMessageOptions): Promise<ReadableStream<Uint8Array>> {
            if (options.passphrase.length < 64) {
                throw new Error('Passphrase too short, should be at least 64 byte, actual length was: ' + options.passphrase.length);
            }
            const message: openpgp.message.Message = this.makePGPMessage({plaintextStream: options.stream, streamed: true});
            const encryptionOptions: openpgp.EncryptOptions = {
                message,
                passwords: [options.passphrase],
                compression: this.openpgp.enums.compression.zlib,
                armor: false,
                streaming: 'web'
            };
            const encryptResult = await this.openpgp.encrypt(encryptionOptions);
            const encryptedStream: ReadableStream<Uint8Array> = encryptResult.message.packets.write();
            return encryptedStream;
        }


        /**
         * Decrypts an encrypted streamed ciphertext with the provided secret.
         * @param options.stream  encrypted ciphertext
         * @param options.passphrase  secret used for encryption
         * @returns           Promise, which resolves to a readable stream containing the plaintext
         */
        public async decryptStreamedMessage(options: StreamedMessageOptions): Promise<ReadableStream<Uint8Array>> {
            const message: openpgp.message.Message = await this.openpgp.message.read(options.stream);
            const decryptionOptions: openpgp.DecryptOptions = {
                message,
                passwords: [options.passphrase],
                streaming: 'web'
            };
            const plaintext = await this.openpgp.decrypt(decryptionOptions);
            return plaintext.data
        }

    }

    angular.module(moduleName)
        .service('pgpCryptoService', PGPCryptoService)
        .service('openpgpService', ["$window", function ($window: angular.IWindowService): OpenPGPNamespace {
            return $window.openpgp;
        }])
        .value('openpgpWorkerPath', 'bower_components/openpgp/dist/openpgp.worker.js')
        // TODO: Define real study operator public key for production here (OpenPGP ASCII-armored public key)
        .value('studyOperatorPublicKey', ``);
}
