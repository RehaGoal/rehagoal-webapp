'use strict';

module rehagoal.crypto {
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import SettingsService = rehagoal.settings.SettingsService;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;

    describe('rehagoal.crypto', function () {

        // TODO: Define real study operator public key for production here (OpenPGP ASCII-armored public key)
        const STUDY_OPERATOR_PUB_KEY = `TO-BE-DEFINED`;
        /**
         * Insecure PGP private key for testing
         * 2048 bit RSA
         * Passphrase: 'password'
         */
        const MOCK_USER_PRIV_KEY = `-----BEGIN PGP PRIVATE KEY BLOCK-----

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
=7diJ
-----END PGP PRIVATE KEY BLOCK-----`;
        const MOCK_USER_PUB_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----

xsBNBGLX/vMBCACvXSVBTV5FpD1o2R3HKd82SdFZzU112Sd6gHcbF2RH6zd5
+DXDqOaD8nt9zYxFp0GEiXWDevqQ2MCFIDmNG/myx2rzi1PiQP/PPgRGm6kR
k46U/RFqll9bToZT/akz1rmp7f4xFlDL8FTblPXDe3OOQJMMwmaKcyg/fxPG
YLKrVbxAxnwfw0ELou2vDAV4EySC0Xhw1dhZcLMWEl6VPwSBVq7P72laOHOE
n5T3oEfse5lZuogfE2ZHpNhtUuQ3dsBTEoP+s+uVT+2tjjV+Kh8TpdU2Ixla
bSGF/4dhw5Pozo5NS/J4QM0gVa2D9bpOrpeUh6Svj9MwS5BqkWpqouFXABEB
AAHNP1BzZXVkb255bW91cyBQYXRpZW50IDxwc2V1ZG9ueW1vdXNwYXRpZW50
QFJFSEFHT0FMLlRFU1QuU0VSVkVSPsLAjQQQAQgAIAUCYtf+8wYLCQcIAwIE
FQgKAgQWAgEAAhkBAhsDAh4BACEJENXtihxByoamFiEEKjGtabCoEZcE+DWb
1e2KHEHKhqYlyQgAiu5wYJ31CZ1TO9FbxFV3S499zhCvzKKi5A6L4xy+4X7g
HMlrQSCREprwa6R//USEskRFXlybEb3uwZK34G9BC3DKWN04WeItDsCeE/yL
mUDa/cSBV4QGu1DXOr3RWLP3fW/0unBoiZigvgU3ufWYDadBWFCP6bu/8Ir5
OuXKttdiAWqRlqRMhbqIp5cCh3JJEPv777lGcaX95w81fnzRoEdj37hrkWGb
UN+e0uwubT0GcqCcwx8nNCPhX3EVHbjLzDXR6T0RrKiJ9AXnkDC6QvJokaM/
Hm717QIy5F51pYEsdEa//Fb6xway850Mu+m35eeUwsaKrMb7w0kRKZKZ5c7A
TQRi1/7zAQgA1P/+l6yaZRcBlGAA+/EHm96KgNdhMJGxGzpkq00tAZEHvkL6
HLIPIAY44bt+hc3RYbk45Bgin+odRxeWXOAiYfCkpkRGaeYNs0gaMhkt2a9G
8gPuM7a0G8wpP0AJjRZg/GxczJybEJpwgFgz/BKCrNpfJvYD723YsmgYrbTX
d63gaH/nyrR8nC/Q5bEXuMwiYSo6PqXeUAMS7lZgMW3cTsXQV6RTG7H/dhtg
dwsKzPm8zTKKqtsGl3kYKBBKYYxV1XYYBRymgm4BkZ0vJvdQn7oDVN3wjcGw
9P3NFLXwBCsn5mbltHWE2+g7Gyo6nR6aBHA2wuNQH19E0xfYzGdhRQARAQAB
wsB2BBgBCAAJBQJi1/7zAhsMACEJENXtihxByoamFiEEKjGtabCoEZcE+DWb
1e2KHEHKhqbUjwf/ZmPd+vcLkqvflv4Ra5o6bWcEvqB8Rx4a0W0DE1KCBsYv
T74KqaJRmcd4nGJBnEpY1HfNcKVc+CQD51scyx1HvvVP+i2153hsB55HZ+th
uQUdI0+7AnpkvCM+62rvvo3OB0y3tU26oEiMSubs6hlSs31PhR5XX48gksU8
PSUo7bJFRBmuXVLUFHK/LL+2KkS50xX+8b3Kh9x2pgFM4XKGqkvtNu9XhNUB
LZ+75qzoVZH/ti/uyeHkMxe2SLjhygiP4Hd8gzl4ohBFMCWJlVvw0n6nAqe3
P3xqemfPsPUODVQa1wXGsV36HO+PVd/ZeDoHVvJMsWAUVE+rtmJ7eK9mNA==
=rBg8
-----END PGP PUBLIC KEY BLOCK-----`;
        const MOCK_USER_KEY_ID = 'F52C89B1198FDD9A147F039AF1CEA07E47C99687';
        const MOCK_OPERATOR_PUB_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----

xsBNBGLYA3YBCACrF+MorzkDgHsNpD5YJBQgVkUUYynnZGNrjxqST1ewPScA
QsuwhqYacwjJ6wpJ8cZTNd7lEkHW9xpVCTOdpPKKpyn2HJoiDYR2cNpARLj6
hq/epxYOpnc3k8z69MoloDEYxj25ZzqNw2K2O49erbYfZ2LvB1jfaIGKXLNh
6fhijDy2yxy/Ofyi/hnuLYfUs7ncdmKGcijat/ifbHM4BGJQjNti/xY3C7RY
+svhBJPVqkasmmn6S5sczDQFqZGgBZUlr3kJIvdpeatgTnBh70jmWreWDqOt
sxLslfUZ4+z1Ne2uLuk+1hP87m913aGhGFw9fXpJlGQWKXFU9KY9Pe4/ABEB
AAHNQFBzZXVkb255bW91cyBPcGVyYXRvciA8cHNldWRvbnltb3VzcGF0aWVu
dEBSRUhBR09BTC5URVNULlNFUlZFUj7CwI0EEAEIACAFAmLYA3YGCwkHCAMC
BBUICgIEFgIBAAIZAQIbAwIeAQAhCRDu0incK91AgBYhBHymefqo0IeLvgs0
P+7SKdwr3UCAXrAH/jiibOJyg4/ec+CqAqGVIXKacDDMoksY5j8Lr20DIrgq
lc4oso+YZPGRpKXb6N4ApOFtcV5Yd2YfbUUeuSUy5CYj6RWNRvk86sYTjwBw
0WIvAMjz/CKM/hLnYYdG1rwHlH9mzRszFyWX8FGkc8lFqlzGXwfkjXEO1zLO
vQADKT9eS7N5SW/SRme53GX4sq9QdklXeZCl7/Fr8cSSx2ykpDM0PeyzosQU
qWP6QSiZDxGb1b8cjNrotSLhBRDjCrip62IoC6bIGL515jfpU7g4HZEsP0OS
ToG50i09uSGgefgJMGGNlIwrLOHe3pa807jIl5BwKW3YshA6WaVFcsQUtZvO
wE0EYtgDdgEIALKS7KV+qWpah3U25ygXcYX+KVMwtaJEXIlL0Q8kbv5cskxN
eUJCPJqIkGBgsjMVdFCT7OYjd/jGXXZ8Ypn++RHNry40UXZvnhm4QFB+bj/N
MphgSnEiANaInRhpE0gt+gjbGEC+0TEs1exKS0o9gAMz7OcGKuifmhWyRtLf
bNcwEpnb+hIOKB6mn6LplzYZcbSJZHhIjxQKI/dUyWT+wBE8sFjcd1WG2IG8
5rLM3wI+aITG62RLuU6msvP+8htb1oXh1rkOOhZAcm+yT8Ad88KDWrOZCDig
Nf5ZCUjcqr3GVZnSLH0o1xfDN0EAWhXHET2/z3WK/h7YrUdr5aLMuKEAEQEA
AcLAdgQYAQgACQUCYtgDdgIbDAAhCRDu0incK91AgBYhBHymefqo0IeLvgs0
P+7SKdwr3UCAPdsIAKnlTOcn59MYjguj5s/mTonKQ6yfsJG1t1secebH0EpF
tQwy3NvFHIlwIRErEKCd5Nymy29kr58/meZT66w0uHuBoVmUPfdiZhyc8MkC
AuBa5bXLxaP6eRsNw9D3GgZRgKo7BcusKVHcnxnPO3ihVnP0wgD/YfJFA4ZO
vAvziuWkIStXkCpuocnJZhGe37R4wXquZtbD/+bHhooXXvYhGunSqwUCYnUe
3jNKUlzI46LppGDQKOMnRWpslUc6pSMBv63vrFqtTlLK9VmdQOPngdTMubQr
Zf/2gPand8HG6v26O8L53+Dfq8GIJbBCFZGdtau/4uYJQBV6TCZAtCzs9k0=
=hUSJ
-----END PGP PUBLIC KEY BLOCK-----`;
        /**
         * Insecure PGP private key for testing
         * 2048 bit RSA
         * Passphrase: 'studyp4ss'
         */
        const MOCK_OPERATOR_PRIV_KEY = `-----BEGIN PGP PRIVATE KEY BLOCK-----

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
=IqSt
-----END PGP PRIVATE KEY BLOCK-----`;
        const MOCK_OPERATOR_PASSPHRASE = 'studyp4ss';
        const MOCK_OPERATOR_KEYID = 'C6172CD4229FB067ED18EBD2BC97A0B863A0FA16';

        type MaybeStreamedEncryptOptions = {plaintext: string, streamed: false} | {plaintextStream: ReadableStream<Uint8Array>, streamed: true};

        function makeStream(plaintext: string): ReadableStream<Uint8Array> {
            return new ReadableStream({
                start: (controller) => {
                    controller.enqueue(new TextEncoder().encode(plaintext));
                    controller.close();
                }
            })
        }

        describe('PGPCryptoService', function () {
            let openpgp: OpenPGPNamespace;
            let pgpCryptoService: PGPCryptoService;
            let settingsService: SettingsService;

            const mockOpenPGPService = {
                initWorker: jasmine.createSpy('openpgp.initWorker'),
                key: jasmine.createSpyObj('openpgp.key', ['readArmored']),
                message: jasmine.createSpyObj('opengpgp.message', ['fromText', 'fromBinary', 'read']),
                enums: {
                    compression: {
                        zlib: window.openpgp.enums.compression.zlib
                    }
                },
                encrypt: jasmine.createSpy('openpgp.encrypt'),
                decrypt: jasmine.createSpy('openpgp.decrypt'),
                generateKey: jasmine.createSpy('openpgp.generateKey'),
            };

            describe('mocked openpgp', function () {
                // Spy only works if openpgp is a mock, otherwise it will fail as it is not setable
                beforeEach(() => angular.mock.module('rehagoal.crypto', function ($provide: angular.auto.IProvideService) {
                    $provide.value('openpgpService', mockOpenPGPService)
                }));
                beforeEach(() => inject(function (_openpgpService_: OpenPGPNamespace,
                                                  _settingsService_: SettingsService) {
                    openpgp = _openpgpService_;
                    settingsService = _settingsService_;
                }));
                describe('constructor', function () {
                    it('should initialize openpgp worker', function () {
                        inject(function (_pgpCryptoService_: PGPCryptoService) {
                            pgpCryptoService = _pgpCryptoService_;
                        });
                        expect(pgpCryptoService).toBeDefined();
                        expect(pgpCryptoService.signAndEncryptForStudyOperator).toBeDefined();
                        expect(pgpCryptoService.generateProtectedSigningKeyPair).toBeDefined();
                        expect(openpgp.initWorker).toHaveBeenCalledWith({path: 'bower_components/openpgp/dist/openpgp.worker.js'});
                    });
                });
                describe('methods', function () {
                    beforeEach(() => inject(function (_pgpCryptoService_: PGPCryptoService) {
                        pgpCryptoService = _pgpCryptoService_;
                    }));
                    xdescribe('signAndEncryptForStudyOperator', function () {
                        async function signEncryptCheckMocked(encryptOptions: MaybeStreamedEncryptOptions) {
                            const userPassphrase = 'password';
                            const pubKeyMock = {publicKeyMock: true, keys: ['publicKey']};
                            const privKeyMock = {
                                keys: [{
                                    privateKeyMock: true,
                                    decrypt: jasmine.createSpy('privKey.decrypt')
                                }]
                            };
                            const messageFromText = 'messageFromText';
                            const messageFromBinary = 'messageFromBinary';

                            settingsService.pgpUserPrivateKey = MOCK_USER_PRIV_KEY;
                            mockOpenPGPService.key.readArmored.and.callFake(function (armoredKey: string) {
                                if (armoredKey === STUDY_OPERATOR_PUB_KEY) {
                                    return pubKeyMock;
                                } else if (armoredKey === MOCK_USER_PRIV_KEY) {
                                    return privKeyMock;
                                }
                                return null;
                            });
                            mockOpenPGPService.message.fromBinary.and.returnValue(messageFromBinary);
                            mockOpenPGPService.message.fromText.and.returnValue(messageFromText);
                            if (encryptOptions.streamed) {
                                mockOpenPGPService.encrypt.and.returnValue({data: makeStream('encryptedData')});
                            } else {
                                mockOpenPGPService.encrypt.and.returnValue({data: 'encryptedData'});
                            }

                            await tryOrFailAsync(async () => {
                                let encryptedBlob = await pgpCryptoService.signAndEncryptForStudyOperator(angular.extend(encryptOptions, {
                                    userPassphrase,
                                }));
                                expect(mockOpenPGPService.key.readArmored).toHaveBeenCalledWith(MOCK_USER_PRIV_KEY);
                                expect(privKeyMock.keys[0].decrypt).toHaveBeenCalledWith(userPassphrase);
                                expect(mockOpenPGPService.encrypt).toHaveBeenCalledWith({
                                    message: encryptOptions.streamed ? messageFromBinary : messageFromText,
                                    publicKeys: [pubKeyMock.keys[0]],
                                    privateKeys: [privKeyMock.keys[0]],
                                    compression: mockOpenPGPService.enums.compression.zlib,
                                    armor: true,
                                    streaming: encryptOptions.streamed ? 'web' : false
                                });
                                expect(encryptedBlob instanceof Blob).toBe(true, `expected ${encryptedBlob} to be instanceOf Blob`);
                            });
                        }

                        it('should sign & encrypt with pgp (naive)', async function(done) {
                            await signEncryptCheckMocked({plaintext: 'someplaintext', streamed: false});
                            done();
                        });

                        it('should sign & encrypt with pgp (streamed)', async function(done) {
                            await signEncryptCheckMocked({plaintextStream: makeStream('someplaintext'), streamed: true});
                            done();
                        });
                    });
                    describe('generateProtectedSigningKeyPair', function() {
                        it('should call openpgp generateKey with appropriate options', async function(done) {
                            const passphrase = 'mysecretpassphrase1234';
                            const returnKeyPair: any = {keyPairMock: true};
                            mockOpenPGPService.generateKey.and.returnValue(Promise.resolve(returnKeyPair));
                            const returnValue = await pgpCryptoService.generateProtectedSigningKeyPair(passphrase);
                            expect(openpgp.generateKey).toHaveBeenCalledWith({
                                userIds: [{name: 'Pseudonymous Patient', email: 'pseudonymouspatient@rehagoal-server.local'}],
                                numBits: 2048,
                                passphrase
                            });
                            expect(openpgp.generateKey).toHaveBeenCalledTimes(1);
                            expect(returnValue).toEqual(returnKeyPair);
                            done();
                        });
                    });

                    describe('encrypt- & decryptStreamedMessage', function() {
                        const sufficientPW = 'dfv4m894jqs3ts847ruw7se6rvmmyqcn8co2dvkvp81861o8oum7vzbgtjw3vbta';

                        it('should use specific function calls when encrypting', async function(done) {
                            await tryOrFailAsync(async () => {
                                let createdMessage = null;
                                mockOpenPGPService.message.fromBinary.and.callFake(function () {
                                    let options: Parameters<typeof openpgp.message.fromBinary> = arguments as any;
                                    createdMessage = window.openpgp.message.fromBinary(...options);
                                    return createdMessage;
                                });
                                mockOpenPGPService.encrypt.and.callFake(function () {
                                    let options: Parameters<typeof openpgp.encrypt> = arguments as any;
                                    return window.openpgp.encrypt(...options);
                                });

                                const readableStream = new Blob(['test']).stream();
                                await pgpCryptoService.encryptStreamedMessage({
                                    stream: readableStream,
                                    passphrase: sufficientPW
                                });
                                expect(mockOpenPGPService.message.fromBinary).toHaveBeenCalledTimes(1);
                                expect(mockOpenPGPService.message.fromBinary).toHaveBeenCalledWith(readableStream);
                                expect(mockOpenPGPService.encrypt).toHaveBeenCalledTimes(1);
                                expect(mockOpenPGPService.encrypt).toHaveBeenCalledWith({
                                    message: createdMessage,
                                    streaming: 'web',
                                    armor: false,
                                    compression: window.openpgp.enums.compression.zlib,
                                    passwords: [sufficientPW]
                                });
                            });
                            done();
                        });
                        it('should use specific function calls when decrypting', async function(done) {
                            const encryptedMsgB64 = 'wy4ECQMIvPEJRxrTb8nge/VvG1LRelyTeevQDVwnK/eCZ08T+bgOSYuN8DOHTeV50lM' +
                                'BjEjr83pGJ4LvY+qOhNBsbP5Fuy6+Dy1H7nsClJLXb99lLFY+PtNeevlINpNJut5Q5MCEZFZ1Rtww7tShBKwve' +
                                'EV6CvwRR1jd2DRYKpXDsHrFgg=='

                            function base64StringToUint8Array(b64String: string) {
                                return Uint8Array.from(atob(b64String), (c) => c.charCodeAt(0))
                            }

                            await tryOrFailAsync(async () => {
                                mockOpenPGPService.message.read.and.callFake(function () {
                                    let options: Parameters<typeof openpgp.message.read> = arguments as any;
                                    return window.openpgp.message.read(...options);
                                });
                                mockOpenPGPService.decrypt.and.callFake(function () {
                                    let options: Parameters<typeof openpgp.decrypt> = arguments as any;
                                    return window.openpgp.decrypt(...options);
                                });

                                const readableStream = new Blob([base64StringToUint8Array(encryptedMsgB64)]).stream();
                                await pgpCryptoService.decryptStreamedMessage({
                                    stream: readableStream,
                                    passphrase: sufficientPW
                                });
                                expect(mockOpenPGPService.message.read).toHaveBeenCalledTimes(1);
                                expect(mockOpenPGPService.decrypt).toHaveBeenCalledTimes(1);
                            });
                            done();
                        });
                    });
                });
            });
            xdescribe('real openpgp, real study key', function () {
                let readFileAsText: (file: File | Blob) => Promise<string>;
                beforeEach(() => angular.mock.module('rehagoal.utilities'));
                beforeEach(() => angular.mock.module('rehagoal.crypto', function ($provide: angular.auto.IProvideService) {
                    // In Karma the path is different compared to a real deployment
                    $provide.decorator('openpgpWorkerPath', function ($delegate: string) {
                        return `base/${$delegate}`;
                    });
                }));
                beforeEach(() => inject(function (_openpgpService_: OpenPGPNamespace,
                                                  _settingsService_: SettingsService,
                                                  _pgpCryptoService_: PGPCryptoService,
                                                  _readFileAsText_: typeof readFileAsText) {
                    pgpCryptoService = _pgpCryptoService_;
                    openpgp = _openpgpService_;
                    settingsService = _settingsService_;
                    readFileAsText = _readFileAsText_;
                }));
                describe('signAndEncryptForStudyOperator', function () {
                    // may change with different keys/messages/ciphers
                    const CIPHERTEXT_LENGTH_MIN = 1;
                    const CIPHERTEXT_LENGTH_MAX = 1;
                    //TODO: replace with your values
                    const STUDY_OPERATOR_KEY_ID = 'TO-BE-DEFINED';

                    beforeEach(function() {
                        settingsService.pgpUserPrivateKey = MOCK_USER_PRIV_KEY;
                    });

                    async function checkPGPTextValid(encryptedText: string): Promise<void> {
                        expect(encryptedText.startsWith('-----BEGIN PGP MESSAGE-----')).toBe(true, 'Expected valid PGP header');
                        expect(encryptedText.endsWith('-----END PGP MESSAGE-----\r\n')).toBe(true, 'Expected valid PGP footer');
                        const message = await openpgp.message.readArmored(encryptedText);
                        const encryptionKeyIds = message.getEncryptionKeyIds();
                        expect(encryptionKeyIds.map(keyId => keyId.toHex())).toEqual([STUDY_OPERATOR_KEY_ID.toLowerCase()]);
                    }

                    async function signEncryptAndCheckValid(encryptOptions: MaybeStreamedEncryptOptions) {
                        const userPassphrase = 'password';

                        await tryOrFailAsync(async () => {
                            let encryptedBlob = await pgpCryptoService.signAndEncryptForStudyOperator(angular.extend({userPassphrase}, encryptOptions));
                            expect(encryptedBlob instanceof Blob).toBe(true, `expected ${encryptedBlob} to be instanceOf Blob`);
                            let encryptedText = await readFileAsText(encryptedBlob);
                            expect(encryptedText.length).toBeGreaterThanOrEqual(CIPHERTEXT_LENGTH_MIN);
                            expect(encryptedText.length).toBeLessThanOrEqual(CIPHERTEXT_LENGTH_MAX);
                            await checkPGPTextValid(encryptedText);
                        });
                    }


                    it('should encrypt & sign plaintext with pgp (naive)', async function (done: DoneFn) {
                        const plaintext = 'someplaintext';
                        await signEncryptAndCheckValid({plaintext, streamed: false});
                        done();
                    });
                    it('should encrypt & sign plaintext with pgp (streamed)', async function (done: DoneFn) {
                        const plaintext = 'someplaintext';
                        const plaintextStream = makeStream(plaintext);
                        await signEncryptAndCheckValid({plaintextStream, streamed: true});
                        done();
                    });


                    describe('long running tests', function() {
                        let origTestTimeout: number;
                        beforeAll(function() {
                            origTestTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
                            jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
                        });
                        afterAll(function () {
                            jasmine.DEFAULT_TIMEOUT_INTERVAL = origTestTimeout;
                        });

                        async function signEncryptCheckUnique(encryptOptions: MaybeStreamedEncryptOptions) {
                            const userPassphrase = 'password';
                            const messageSet = new Set<string>();
                            await tryOrFailAsync(async () => {
                                for (let i = 0; i < 3; ++i) {
                                    let encryptedBlob = await pgpCryptoService.signAndEncryptForStudyOperator(angular.extend({
                                        userPassphrase,
                                    }, encryptOptions));
                                    let encryptedText = await readFileAsText(encryptedBlob);
                                    await checkPGPTextValid(encryptedText);
                                    expect(encryptedText.length).toBeGreaterThanOrEqual(CIPHERTEXT_LENGTH_MIN);
                                    expect(encryptedText.length).toBeLessThanOrEqual(CIPHERTEXT_LENGTH_MAX);
                                    expect(messageSet.has(encryptedText)).toBe(false, 'Expected ciphertext to be unique');
                                    messageSet.add(encryptedText);
                                }
                            });
                        }

                        it('should encrypt same plaintext with different ciphertexts (naive)', async function (done: DoneFn) {
                            const plaintext = 'someplaintext';
                            await signEncryptCheckUnique({plaintext, streamed: false});
                            done();
                        });

                        it('should encrypt same plaintext with different ciphertexts (streamed)', async function (done: DoneFn) {
                            const plaintextStream = makeStream('someplaintext');
                            await signEncryptCheckUnique({plaintextStream, streamed: true});
                            done();
                        });
                    });
                });
                describe('generateProtectedSigningKeyPair', function() {
                    let origTestTimeout: number;
                    beforeAll(function() {
                        origTestTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
                        jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
                    });
                    afterAll(function () {
                        jasmine.DEFAULT_TIMEOUT_INTERVAL = origTestTimeout;
                    });
                    it('should return key pair protected with passphrase', async function(done) {
                        const passphrase = 'asdf12345passw0rd$';
                        await tryOrFailAsync(async () => {
                            const keys = await pgpCryptoService.generateProtectedSigningKeyPair(passphrase);
                            const publicKey = (await openpgp.key.readArmored(keys.publicKeyArmored)).keys[0];
                            const privateKey = (await openpgp.key.readArmored(keys.privateKeyArmored)).keys[0];
                            await privateKey.decrypt(passphrase);
                            const user = await publicKey.getPrimaryUser();
                            expect(await publicKey.getExpirationTime()).toBe(Infinity);
                            expect(user.user.userId.userid).toBe('Pseudonymous Patient <pseudonymouspatient@rehagoal-server.local>');
                            expect((publicKey.getAlgorithmInfo() as any).algorithm).toEqual('rsa_encrypt_sign');
                            expect((publicKey.getAlgorithmInfo() as any).bits).toEqual(2048);
                            const messageToSign = 'someStatement' + new Date().toISOString();
                            const signedMessage = (await openpgp.sign({
                                message: openpgp.cleartext.fromText(messageToSign) as any,
                                privateKeys: [privateKey],
                                armor: true,
                            })).data;
                            const verifyResult = await openpgp.verify({
                                message: await openpgp.cleartext.readArmored(signedMessage),
                                publicKeys: [publicKey]
                            });
                            expect(verifyResult.signatures[0].valid).toBe(true);
                            expect((verifyResult.signatures[0].keyid as any).toHex()).toEqual((publicKey.getKeyId() as any).toHex());
                        });
                        done();
                    });
                });
            });
            describe('real openpgp, mock study key', function () {
                let readFileAsText: (file: File | Blob) => Promise<string>;
                beforeEach(() => angular.mock.module('rehagoal.utilities'));
                beforeEach(() => angular.mock.module('rehagoal.crypto', function ($provide: angular.auto.IProvideService) {
                    // In Karma the path is different compared to a real deployment
                    $provide.decorator('openpgpWorkerPath', function ($delegate: string) {
                        return `base/${$delegate}`;
                    });
                    $provide.value('studyOperatorPublicKey', MOCK_OPERATOR_PUB_KEY);
                }));
                beforeEach(() => inject(function (_openpgpService_: OpenPGPNamespace,
                                                  _settingsService_: SettingsService,
                                                  _pgpCryptoService_: PGPCryptoService,
                                                  _readFileAsText_: typeof readFileAsText) {
                    pgpCryptoService = _pgpCryptoService_;
                    openpgp = _openpgpService_;
                    settingsService = _settingsService_;
                    readFileAsText = _readFileAsText_;
                }));
                describe('signAndEncryptForStudyOperator', function () {

                    beforeEach(function() {
                        settingsService.pgpUserPrivateKey = MOCK_USER_PRIV_KEY;
                    });

                    const plaintext = 'someplaintext';
                    const userPassphrase = 'password';

                    async function signEncryptAndCheck(encryptOptions: MaybeStreamedEncryptOptions) {
                        await tryOrFailAsync(async () => {
                            const encryptedBlob = await pgpCryptoService.signAndEncryptForStudyOperator(angular.extend({userPassphrase}, encryptOptions));
                            expect(encryptedBlob instanceof Blob).toBe(true, `expected ${encryptedBlob} to be instanceOf Blob`);
                            const encryptedText = await readFileAsText(encryptedBlob);

                            const userPublicKey = (await openpgp.key.readArmored(MOCK_USER_PUB_KEY)).keys[0];
                            const studyOperatorPrivKey = (await openpgp.key.readArmored(MOCK_OPERATOR_PRIV_KEY)).keys[0];
                            await studyOperatorPrivKey.decrypt(MOCK_OPERATOR_PASSPHRASE);

                            const decryptResult = await openpgp.decrypt({
                                message: await openpgp.message.readArmored(encryptedText),
                                privateKeys: [studyOperatorPrivKey],
                                publicKeys: [userPublicKey]
                            });
                            expect(decryptResult.signatures.length).toBe(1);
                            expect(decryptResult.signatures[0].valid).toBe(true);
                            expect(decryptResult.data).toEqual(plaintext);
                        });
                    }

                    it('should encrypt & sign plaintext with pgp (naive)', async function (done: DoneFn) {
                        await signEncryptAndCheck({plaintext, streamed: false});
                        done();
                    });

                    it('should encrypt & sign plaintext with pgp (streamed)', async function (done: DoneFn) {
                        await signEncryptAndCheck({plaintextStream: makeStream(plaintext), streamed: true});
                        done();
                    });

                    it('should throw an error if the user private key cannot be read', async function(done) {
                        settingsService.pgpUserPrivateKey = settingsService.pgpUserPrivateKey!.slice(100);
                        await expectThrowsAsync(async () => {
                            await pgpCryptoService.signAndEncryptForStudyOperator({plaintext, userPassphrase, streamed: false});
                        }, /Could not read user private key/);
                        await expectThrowsAsync(async () => {
                            await pgpCryptoService.signAndEncryptForStudyOperator({plaintextStream: makeStream(plaintext), userPassphrase, streamed: true});
                        }, /Could not read user private key/);
                        done();
                    })
                });

                describe('encrypt- & decryptStreamedMessage', function() {
                    const sufficientPW = 'dfv4m894jqs3ts847ruw7se6rvmmyqcn8co2dvkvp81861o8oum7vzbgtjw3vbta';
                    const expectedMsg = 'test';

                    async function readStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
                        let resultString = "";
                        await reader.read().then(
                            function processText({done, value}): any {
                                // Result objects contain two properties:
                                // done  - true if the stream has already given you all its data.
                                // value - some data. Always undefined when done is true.
                                if (done) {
                                    return;
                                }
                                resultString += value;
                                // Read some more, and call this function again
                                return reader.read().then(processText);
                            });
                        return resultString;
                    }

                    describe('encryptStreamedMessage', function() {
                        it('should return a readable, encrypted stream', async function(done) {
                            const expectedEncryptedStringMinLength = 100; //was around 133
                            const expectedEncryptedStringMaxLength = 166;

                            await tryOrFailAsync(async () => {
                                const encryptedStream = await pgpCryptoService.encryptStreamedMessage({stream: new Blob([expectedMsg]).stream(), passphrase: sufficientPW});

                                const result = await readStream(encryptedStream.getReader());
                                const streamLength = result.split(',').length;

                                expect(encryptedStream).not.toBeUndefined();
                                expect(streamLength).toBeGreaterThanOrEqual(expectedEncryptedStringMinLength);
                                expect(streamLength).toBeLessThanOrEqual(expectedEncryptedStringMaxLength);
                            });
                            done();
                        });
                        it('should throw an error if passphrase is too short (below 64 bytes)', async function(done) {
                            const passphrases = [
                                '',
                                'pass',
                                sufficientPW.slice(0, 63) // 63 bytes
                            ]
                            for (const passphrase of passphrases) {
                                await expectThrowsAsync(async () => {
                                    await pgpCryptoService.encryptStreamedMessage({stream: new ReadableStream(), passphrase});
                                }, /Passphrase too short/);
                            }
                            done();
                        });
                    });
                    describe('decryptStreamedMessage', function() {
                        const encryptedMsgB64 = 'wy4ECQMIvPEJRxrTb8nge/VvG1LRelyTeevQDVwnK/eCZ08T+bgOSYuN8DOHTeV50lM' +
                            'BjEjr83pGJ4LvY+qOhNBsbP5Fuy6+Dy1H7nsClJLXb99lLFY+PtNeevlINpNJut5Q5MCEZFZ1Rtww7tShBKwve' +
                            'EV6CvwRR1jd2DRYKpXDsHrFgg=='

                        function base64StringToUint8Array(b64String: string) {
                           return Uint8Array.from(atob(b64String), (c) => c.charCodeAt(0))
                        }

                        it('should return a readable, decrypted stream with correct content', async function(done) {
                            await tryOrFailAsync(async () => {
                                const encryptedStream = new Blob([base64StringToUint8Array(encryptedMsgB64)]).stream();
                                const decryptedStream = await pgpCryptoService.decryptStreamedMessage({stream: encryptedStream, passphrase: sufficientPW});

                                const result = await readStream(decryptedStream.getReader());
                                expect(decryptedStream).not.toBeUndefined();
                                expect(result).toBe(expectedMsg);
                            });
                            done();
                        });
                        it('should fail when trying to decrypted a stream with incorrect passphrase', async function(done) {
                            const encryptedStream = new Blob([base64StringToUint8Array(encryptedMsgB64)]).stream();

                            await expectThrowsAsync(async () => {
                                await pgpCryptoService.decryptStreamedMessage({stream: encryptedStream, passphrase: 'wrongPassword'});
                            }, /Error decrypting message: Session key decryption failed./);
                            done();
                        });
                    });
                    it('encrypting and decrypting should have correct message', async function(done) {
                        const expected = "superSecretTestMessage";
                        await tryOrFailAsync(async () => {
                            const encryptedStream = await pgpCryptoService.encryptStreamedMessage({stream: new Blob([expected]).stream(), passphrase: sufficientPW});
                            expect(encryptedStream).not.toBeUndefined();
                            const decryptedStream = await pgpCryptoService.decryptStreamedMessage({stream: encryptedStream, passphrase: sufficientPW});
                            expect(decryptedStream).not.toBeUndefined();

                            const actual = await readStream(decryptedStream.getReader());
                            expect(actual).toBe(expected);
                        });
                        done();
                    });
                });
            });
            describe('real openpgp, mock invalid study key', function () {
                let readFileAsText: (file: File | Blob) => Promise<string>;
                beforeEach(() => angular.mock.module('rehagoal.utilities'));
                beforeEach(() => angular.mock.module('rehagoal.crypto', function ($provide: angular.auto.IProvideService) {
                    // In Karma the path is different compared to a real deployment
                    $provide.decorator('openpgpWorkerPath', function ($delegate: string) {
                        return `base/${$delegate}`;
                    });
                    $provide.value('studyOperatorPublicKey', "");
                }));
                beforeEach(() => inject(function (_openpgpService_: OpenPGPNamespace,
                                                  _settingsService_: SettingsService,
                                                  _pgpCryptoService_: PGPCryptoService,
                                                  _readFileAsText_: typeof readFileAsText) {
                    pgpCryptoService = _pgpCryptoService_;
                    openpgp = _openpgpService_;
                    settingsService = _settingsService_;
                    readFileAsText = _readFileAsText_;
                }));
                describe('signAndEncryptForStudyOperator', function () {
                    const userPassphrase = 'password';
                    const plaintext = 'my plaintext';
                    beforeEach(function() {
                        settingsService.pgpUserPrivateKey = MOCK_USER_PRIV_KEY;
                    });


                    it('should throw an error, if study operator public key is not a valid ascii-armored key', async function (done) {
                        const expectedErrorMessage = 'Could not load study operator public key: Error: Misformed armored text';
                        await expectThrowsAsync(async() => {
                            await pgpCryptoService.signAndEncryptForStudyOperator({userPassphrase, plaintextStream: makeStream(plaintext), streamed: true});
                        }, expectedErrorMessage);
                        await expectThrowsAsync(async() => {
                            await pgpCryptoService.signAndEncryptForStudyOperator({userPassphrase, plaintext, streamed: false});
                        }, expectedErrorMessage);
                        done();
                    });
                });
            });
            describe('real openpgp, mock invalid study key', function () {
                let readFileAsText: (file: File | Blob) => Promise<string>;
                beforeEach(() => angular.mock.module('rehagoal.utilities'));
                beforeEach(() => angular.mock.module('rehagoal.crypto', function ($provide: angular.auto.IProvideService) {
                    // In Karma the path is different compared to a real deployment
                    $provide.decorator('openpgpWorkerPath', function ($delegate: string) {
                        return `base/${$delegate}`;
                    });
                    $provide.value('studyOperatorPublicKey', "");
                }));
                beforeEach(() => inject(function (_openpgpService_: OpenPGPNamespace,
                                                  _settingsService_: SettingsService,
                                                  _pgpCryptoService_: PGPCryptoService,
                                                  _readFileAsText_: typeof readFileAsText) {
                    pgpCryptoService = _pgpCryptoService_;
                    openpgp = _openpgpService_;
                    settingsService = _settingsService_;
                    readFileAsText = _readFileAsText_;
                }));
                describe('signAndEncryptForStudyOperator', function () {
                    const userPassphrase = 'password';
                    const plaintext = 'my plaintext';
                    beforeEach(function() {
                        settingsService.pgpUserPrivateKey = MOCK_USER_PRIV_KEY;
                    });


                    it('should throw an error, if study operator public key is not a valid ascii-armored key', async function (done) {
                        const expectedErrorMessage = 'Could not load study operator public key: Error: Misformed armored text';
                        await expectThrowsAsync(async() => {
                            await pgpCryptoService.signAndEncryptForStudyOperator({userPassphrase, plaintextStream: makeStream(plaintext), streamed: true});
                        }, expectedErrorMessage);
                        await expectThrowsAsync(async() => {
                            await pgpCryptoService.signAndEncryptForStudyOperator({userPassphrase, plaintext, streamed: false});
                        }, expectedErrorMessage);
                        done();
                    });
                });
            });
        });
    });
}
