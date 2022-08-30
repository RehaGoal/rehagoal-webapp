namespace jasmine {
    class NumberCloseTo {
        constructor(private expected: number, private precision = 2) {
        }

        public asymmetricMatch(actual: any): boolean {
            if (this.expected === null || actual === null) {
                throw new Error('Cannot use toBeCloseTo with null. Arguments evaluated to: ' +
                    'expect(' + actual + ').toBeCloseTo(' + this.expected + ').'
                );
            }
            const pow = Math.pow(10, this.precision + 1);
            const delta = Math.abs(this.expected - actual);
            const maxDelta = Math.pow(10, -this.precision) / 2;

            return Math.round(delta * pow) / pow <= maxDelta;
        }

        public jasmineToString(): string {
            return `<NumberCloseTo ${this.expected}>`;
        }
    }

    export function numberCloseTo(expected: number, precision = 2): any {
        return new NumberCloseTo(expected, precision);
    }
}