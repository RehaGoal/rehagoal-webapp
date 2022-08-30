
module rehagoal.crypto {
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    describe('rehagoal.crypto', function () {
        beforeEach(() => angular.mock.module('rehagoal.crypto'));

        beforeEach(angular.mock.module(function ($provide: angular.auto.IProvideService) {
            $provide.value('baseUrl', 'base/');
        }));

        describe('value: pbkdf2', function () {
            let pbkdf2: pbkdf2Type;

            beforeEach(inject(function(_pbkdf2_: pbkdf2Type) {
                pbkdf2 = _pbkdf2_;
            }));

            it('should have a defined function', function() {
                expect(pbkdf2).toBeDefined();
                expect(typeof pbkdf2).toBe('function');
            });
            it('should throw an error if no arguments are provided', async function (done) {
                const inputs = [
                    42,
                    null,
                    undefined,
                    false,
                    {}
                ];
                await Promise.all(inputs.map(async (input: any) => {
                    await expectThrowsAsync(async () => pbkdf2(input, input), /Expected string parameter/);
                }));
                expect( async () => await pbkdf2("", "")).not.toThrowError();
                done();
            });
            it('should parse an input string and return its derived key value (sha256, default with 1000 rounds)', async function (done) {
                const testInput = 'this is a test input';
                const testSalt = '604221D9 B515B962 F7F7443E EB541435';
                const testRounds = 10_000;
                const testRounds2 = 100_000;
                const testKeyLength = 256;
                const derivedKey_10k = '13baffb0c71e6c05d271f24f182b1b666fcf43321e4dfee5cf30ffa61b1e5e02';
                const derivedKey_100k = '76cc71cb8f4c61b2233018792201979f9dbb3b26e123833300833f1bc667a3bb';
                await tryOrFailAsync(async () => {
                    expect(await pbkdf2(testInput, testSalt)).toEqual(derivedKey_10k);
                    expect(await pbkdf2(testInput, testSalt, testRounds, testKeyLength)).toEqual(derivedKey_10k);
                    expect(await pbkdf2(testInput, testSalt, testRounds+1, testKeyLength)).not.toEqual(derivedKey_10k);
                    expect(await pbkdf2(testInput, testSalt, testRounds2, testKeyLength)).toEqual(derivedKey_100k);
                });
                done();
            });
        });

        describe('value: generateRandom256BitHexString', function () {
            let generateRandom256BitHexString: generateRandom256BitHexStringType;

            beforeEach(inject(function (_generateRandom256BitHexString_: generateRandom256BitHexStringType) {
                generateRandom256BitHexString = _generateRandom256BitHexString_;
            }));

            it('should have a defined function', function () {
                expect(generateRandom256BitHexString).toBeDefined();
                expect(typeof generateRandom256BitHexString).toBe('function');
            });
            it('should return a hex coded string with length equal to 64', function () {
                expect(generateRandom256BitHexString()).toMatch(/^[a-fA-F0-9]{64}$/);
            });
            it('should call sjcl for random word generation', function () {
                const sjclRandomSpy = spyOn(sjcl.random, 'randomWords').and.callThrough();
                const sjclHexSpy = spyOn(sjcl.codec.hex, 'fromBits').and.callThrough();
                const nwords = 8;
                generateRandom256BitHexString();
                expect(sjclRandomSpy).toHaveBeenCalledWith(nwords);
                expect(sjclHexSpy).toHaveBeenCalled();
            });
            it('should return unique values when called consecutively multiple times', function () {
                const generatedResults = new Set();
                for (let i = 0; i < 100; i++) {
                    const generatedValue = generateRandom256BitHexString();
                    expect(generatedResults.has(generatedValue)).toBe(false, `Duplicate random string: ${generatedValue}`);
                    generatedResults.add(generatedValue);
                }
            });
        });
    });
}

