module rehagoal.testUtilities {
    export const TESTDATA_DATAURI_IMAGE_PNG_1BY1_WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==';

    export async function tryOrFailAsync(func: () => Promise<any>) {
        try {
            await func();
        } catch (e) {
            fail(e);
        }
    }

    export async function expectThrowsAsync(func: () => Promise<any>, message?: string | RegExp) {
        let error: Error | undefined = undefined;
        try {
            await func();
        } catch (err) {
            error = err;
        }
        if (error === undefined) {
            fail('Expected to throw async error.');
            return;
        }
        since(`Expected ${error} to be instanceof Error`).
        expect(error instanceof Error).toBe(true);
        if (message !== undefined) {
            if (message instanceof RegExp) {
                expect(error.message).toMatch(message);
            } else {
                expect(error.message).toEqual(message);
            }
        }
    }

    export function getComputedStyleProperty($window: angular.IWindowService, elem: HTMLElement,
                                             propertyValue: string, pseudoElem: string | null = null): string {
        const styles = $window.getComputedStyle(elem, pseudoElem);
        return styles.getPropertyValue(propertyValue);
    }
}
