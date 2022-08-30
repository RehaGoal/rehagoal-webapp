"use strict";
module rehagoal.imageThumbnailChooser {

    import getComputedStyleProperty = rehagoal.testUtilities.getComputedStyleProperty;
    import assertUnreachable = rehagoal.utilities.assertUnreachable;

    describe('imageThumbnailChooser tests', function () {
        let $componentController: angular.IComponentControllerService, $rootScope: angular.IRootScopeService;

        //Note: this will not work outside of tests due to CSP
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg"><g id="layer1"><circle style="fill:#008000;stroke:#009eed;stroke-width:5" cx="110" cy="110" r="110"/></g></svg>`;
        const imgContentB64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAdzAAAHcwGjKWv1AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABtZJREFUeJzlm31QFOcdxz+7d7d3h/G4OwTBl2DUQ5FMaqVmNHQmLYYSZaJNM810JjNUC5kzU6tNxmmmQSwzkNiZJo1O0vqCSOP0rzDTtKmi1aJpamxs1WQKNYHzLRkoSIDjRI/bvZftH/QGFOT1bhfw898++zy/+e53dp9n97e/RyDeHG5LQW4pINyZQ8SXSsTnJHLbgiBaQDb3dTLLqJEA4owAYmIXgqMVg+MjLHNrKUxtj6c8IS5RqzyrUa5sIdziQmmYR+BkKsEmAVUZpSoJTEtULHltGLOaMc71YFr0Fs+7Po611NgZUPXVTEL1pQSv5+I/6sJ/xAZybGILZkhY7yNh3WUMD53ClFVOUXJPTEJPOMJBnxPl/KuEPsnl5psuQi3xuauiGOeBbds1TNnHsa0o4Tm7dyLhxi+2TBVJO7sd+V/F+CpchDsmomPsiMlg3+FByj6AO+cNBEEdT5jxGVDduBT/pd/hK1+OctE8rhixQloZwF7yKealGyla2jjW4WM3YP/pYgLnSune+eCoJ7W4YwT7z65iLXgdd87esYwcvQFlqkha3SG8rz9N4LhtzBq1wFrgI/GlP9CWW0yZEBnNkNEZ8K4q4T1dQ+e2fJR6fW/5kTBlKsx6uw4592m2CiMuQyMb8K4q0XH8GF3ubxH6UoyJyHhjTA+TtP8DkvLX8aww7HM6/AWVqSLe0zV0uR+fMhcPEPrCQGfRt/H+pYYydVjdw19USl01HVueJPSlIaYCtSDUItK5PZ/ZdZXDdbu3Afs+3Myt3d8leEmKuTitUBrM9Lz5PSr/8cK9ugxtQNXnS5BPv9z3OjvF8R+14//wZQ43ZQ51erABZapI4LN38FYsiLc2zeguTafnUhWqOmjSH2xA2sfbubnrEQhqok0TVAV85V+n8m8v3n3qTgMO+pzI54qR/2nVTJxWKBcsyPVuqr32gc13GhC5+Crdu1yaCtOS7vIM5AsVA5v6Dfh9p43e82uI3NBcl2aE2yH47zyqvpoZbeo34Fb9Dnp2L9ZFmJb4fu0i1PBK9LDfgNDVNXFPZkwGQs0CoS/yood9BlRdX43/6CLdRGmNv9bFwcZHIWqA8vkWeo8k6ipKS/zv2whd/wlEDQi3uFBjlMCcCqgBCLW4AEQOt6UQrJ+ntybNUS7N41BPsojcUkDvX1P11qM5gRNphD1rRcLeHBTP9J/970ZpFIl0PSYS8c6O2Q+MKYUMYV+aSKQ7SW8puhHpmiWiBqbfh89oUeUEkUhocmd544kakkQITd2U14QJSVMn0xsnRDBOlv9bOmBURETj/bgG9iEYFRHB0qu3Dt0QzH4R0d6ptw7dEJ0dIqLjBtyPK6EZDImtIqLjDFLGuKorpjTSkgiC8yMRy9xarHmteuvRHEt+K+riYyKFqe0Yslr01qM5psxm3LaOvhchaU4Twn00DwgWMM5pgmhKTFr6FtanfLqK0pIZG25izdwDUQN+9NA5EtY26SpKS6zrmtiYfgEG/hcwLjyFce70Xw2M81VM6Sejh/0GJGSWY/upRxdRWmLb7sGQtSt62G9AYeptzNl1iLN10aUJhhQwLzsxsM74zs/hB1aUYH9l+t4Fjp2NSN8oHdh0pwHP2b1IKw9gfnT6fSCZVwUwLd/HJkf3wObB6XBVFdj7p7O0f3/VtKkSESRIrjnLC+u/eXdR9eCMkCCoWLMLcZRd1UxgvLGXX8f68MahKsqHToltmu/BkruLhPUTqsWfFCQUdGNeVcGmRUPObffOCbpXH8S27Y9ID0/djJHpazK2l2rY/HjVvboMnxR15xbh3F2LaWE45uLijXFBmKQ3TtCWu3m4bsMbIAgqzjU/wPnbDzCmTx0TjAvCzNp/CmHNMyOVzY+cFn9WULiR/ySzKt9DemTyPw6mZQpJe48gfKcAtzDiMja2DROz6yrp2fMM/j9PzmqSGRu6mbm1Bneue7R7iMb+W7zybCG3//4LfKULJ9WWGcfOayQ88Uuef+zAWEaOry7gnSsZ3G6oxvfaCuRzlnHFiBXmVb0k/vwTpKwfUrz48liHj78wQlUF9p95keCnbrwVGZoXWBpSwbGjEfPyfRTn7NF229xAqr125IYyghfz8P0qk1BzfKtNDPMhces1pOxahOUluJ0TymTFTuxv2h/A+J8SgteewH/cRe/7iaiB2MQWLJCwwYc134O08CTBZa/x45RbMQkdiyCDqL6yEvnyVoLNGSifzUM+kYbSKIy+FMfcl7e35rdiyvz/5unMPRQ9eD7WUuNfHHWoJ5mwZy3hzhxU3xzCXieRgBWBu7bPE0C09GJwdCEk/hcx6Qzq4mO4bXHdk/s/QJ4yMcxxRvcAAAAASUVORK5CYII="

        beforeEach(() => angular.mock.module('rehagoal.templates'));
        beforeEach(() => angular.mock.module('rehagoal.imageThumbnailChooser'));

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _$rootScope_: angular.IRootScopeService) {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
        }));

        interface IImageThumbnailChooserBindings {
            selectedModel?: INamedImage,
            namedImages: INamedImage[],
            disabled?: boolean;
        }

        type ImageType = 'svg' | 'img';
        type IImageThumbnailChooserScope = angular.IScope & IImageThumbnailChooserBindings;

        /** data URLs only work in unit tests because of CSP */
        const testSvgDataUri = `data:image/svg+xml;base64,${btoa(svgContent)}#layer1`;
        const testImgDataUri = `data:image/png;base64,${imgContentB64}`;

        function makeTestNamedImageArray(length: number, imageSrc: string): INamedImage[] {
            const testNamedImageArray: INamedImage[] = [];
            for (let i = 0; i < length; i++) {
                const name = `TestImage${i}`;
                testNamedImageArray.push({name: name, imageSrc: imageSrc});
            }
            return testNamedImageArray;
        }

        describe('properties and methods', function() {
            let bindings: IImageThumbnailChooserBindings;
            let $scope: angular.IScope;
            let imageThumbnailChooserCtrl: ImageThumbnailChooserComponentController;

            const namedImage1: INamedImage = {name: "image1", imageSrc: "source1"};
            const namedImage2: INamedImage = {name: "image2", imageSrc: "source2"};

            beforeEach(function() {
                bindings = {namedImages: [namedImage1, namedImage2]};
                $scope = $rootScope.$new();
                imageThumbnailChooserCtrl = $componentController('imageThumbnailChooser', {$scope: $scope}, bindings);
            });

            describe('isImgSelected test', function() {
               it('should return true if given image is selected', function() {
                   imageThumbnailChooserCtrl.model = namedImage1;
                   expect(imageThumbnailChooserCtrl.isImgSelected(namedImage1)).toBe(true);
               });

               it('should return false if given image is not selected', function() {
                   imageThumbnailChooserCtrl.model = namedImage1;
                   expect(imageThumbnailChooserCtrl.isImgSelected(namedImage2)).toBe(false);
               });

               it('should return false if no image is selected, i.e. undefined', function() {
                   expect(imageThumbnailChooserCtrl.model).toBeUndefined();
                   expect(imageThumbnailChooserCtrl.isImgSelected(namedImage1)).toBe(false);
                   expect(imageThumbnailChooserCtrl.isImgSelected(namedImage2)).toBe(false);
               });
            });

            describe('onImageClicked test', function() {
                it('should change model to given image if not disabled', function() {
                    expect(imageThumbnailChooserCtrl.model).toBeUndefined();
                    expect(imageThumbnailChooserCtrl.disabled).toBe(false);
                    imageThumbnailChooserCtrl.onImageClicked(namedImage1);
                    expect(imageThumbnailChooserCtrl.model).toEqual(namedImage1);
                });

                it('should not change model to given image if disabled', function() {
                    expect(imageThumbnailChooserCtrl.model).toBeUndefined();
                    imageThumbnailChooserCtrl.disabled = true;
                    imageThumbnailChooserCtrl.onImageClicked(namedImage1);
                    expect(imageThumbnailChooserCtrl.model).toBeUndefined();
                });

                it('should change model to given image multiple times', function() {
                    expect(imageThumbnailChooserCtrl.model).toBeUndefined();
                    expect(imageThumbnailChooserCtrl.disabled).toBe(false);
                    imageThumbnailChooserCtrl.onImageClicked(namedImage1);
                    expect(imageThumbnailChooserCtrl.model).toEqual(namedImage1);
                    imageThumbnailChooserCtrl.onImageClicked(namedImage2);
                    expect(imageThumbnailChooserCtrl.model).toEqual(namedImage2);
                    imageThumbnailChooserCtrl.onImageClicked(namedImage1);
                    expect(imageThumbnailChooserCtrl.model).toEqual(namedImage1);
                });
            });
        });

        describe('imageThumbnailChooser element', function () {
            let $scope: IImageThumbnailChooserScope;
            let imageThumbnailChooser: HTMLElement;
            let jqElement: JQLite;
            let $compile: angular.ICompileService;
            let $window: angular.IWindowService;
            let imageThumbnailChooserCtrl: ImageThumbnailChooserComponentController;

            beforeEach(() => inject(function (_$compile_: angular.ICompileService, _$window_: angular.IWindowService) {
                $compile = _$compile_;
                $window = _$window_;
            }));

            const NUMBER_OF_THUMBNAILS_IN_TESTS = 5;
            const THUMBNAIL_BORDER_SELECTED = '5px solid rgb(0, 128, 0)';
            const THUMBNAIL_BORDER_NOT_SELECTED = '0px none rgb(0, 0, 0)';
            const THUMBNAIL_DISABLED_FILTER = 'grayscale(1)';

            function getThumbnailElements(): HTMLCollectionOf<HTMLElement> {
                return imageThumbnailChooser.getElementsByClassName("thumbnail") as HTMLCollectionOf<HTMLElement>;
            }

            function isThumbnailSelected(thumbnailElement: HTMLElement): boolean {
                const currentBorder: string = getComputedStyleProperty($window, thumbnailElement, 'border');
                expect(currentBorder).not.toBeNull();
                switch (currentBorder) {
                    case THUMBNAIL_BORDER_SELECTED:
                        return true;
                    case THUMBNAIL_BORDER_NOT_SELECTED:
                        return false;
                    default:
                        const errMsg = `Unknown Border for Thumbnail: '${currentBorder}'`;
                        throw new Error(errMsg);
                }
            }

            function expectThumbnailDisabledToBe(thumbnailElement: HTMLElement, expected: boolean) {
                const currentFilter: string = getComputedStyleProperty($window, thumbnailElement, 'filter');
                expect(currentFilter).not.toBeNull();
                const expectedFilter = expected ? THUMBNAIL_DISABLED_FILTER : 'none';
                expect(currentFilter).toEqual(expectedFilter);
            }

            function expectThumbnailDisabled(thumbnailElement: HTMLElement) {
                expectThumbnailDisabledToBe(thumbnailElement, true);
            }

            function expectThumbnailEnabled(thumbnailElement: HTMLElement) {
                expectThumbnailDisabledToBe(thumbnailElement, false);
            }

            function getSelectedThumbnailIndex(): number | null {
                const thumbnails = getThumbnailElements();
                for (let i = 0; i < thumbnails.length; i++) {
                    if (isThumbnailSelected(thumbnails[i])) {
                        return i;
                    }
                }
                return null;
            }

            function makeImageThumbnailChooserBindings(imgType: ImageType, numberOfThumbnails: number): IImageThumbnailChooserBindings {
                let namedImages: INamedImage[] = [];

                if (numberOfThumbnails < 1) {
                    throw new Error('makeImageThumbnailChooserBindings needs numberOfThumbnails to be > 0 to work properly');
                }

                switch (imgType) {
                    case 'svg':
                        namedImages = makeTestNamedImageArray(numberOfThumbnails, testSvgDataUri);
                        break;
                    case 'img':
                        namedImages = makeTestNamedImageArray(numberOfThumbnails, testImgDataUri);
                        break;
                    default:
                        assertUnreachable(imgType);
                }

                return {
                    selectedModel: namedImages[0],
                    namedImages: namedImages,
                    disabled: false
                }
            }

            function imageThumbnailChooserTestSuite(imageThumbnailChooserBindings: IImageThumbnailChooserBindings) {
                beforeEach(function () {
                    $scope = angular.extend($rootScope.$new(), imageThumbnailChooserBindings);

                    jqElement = $compile(`
                        <image-thumbnail-chooser model="selectedModel" named-images="namedImages" 
                        disabled="disabled"></image-thumbnail-chooser>
                    `)($scope);

                    imageThumbnailChooser = jqElement[0];
                    $scope.$apply();
                    imageThumbnailChooserCtrl = jqElement.controller('imageThumbnailChooser');
                    document.body.appendChild(imageThumbnailChooser);
                });
                afterEach(() => {
                    document.body.removeChild(imageThumbnailChooser);
                });

                function expectImgSrcAndAlt(actualThumbnail: Element, expected: INamedImage): void {
                    const img = actualThumbnail.getElementsByTagName("img")[0];
                    expect(img.getAttribute("alt")).toBe(expected.name);
                    expect(img.getAttribute("title")).toBe(expected.name);
                    expect(img.getAttribute("src")).toBe(expected.imageSrc);
                }

                it('should have thumbnail for each element in namedImages with correct title and href', function () {
                    expect(imageThumbnailChooser).toBeTruthy();
                    const thumbnails: HTMLCollection = getThumbnailElements();
                    expect(thumbnails.length).toBe(imageThumbnailChooserBindings.namedImages.length);
                    for (let i = 0; i < imageThumbnailChooserBindings.namedImages.length; i++) {
                        expectImgSrcAndAlt(thumbnails[i], imageThumbnailChooserBindings.namedImages[i]);
                    }
                });
                it('should have enabled thumbnails if disabled is false', function () {
                    expect($scope.disabled).toBe(false);
                    expect(imageThumbnailChooserCtrl.disabled).toBe(false);
                    const thumbnails: HTMLCollectionOf<HTMLElement> = getThumbnailElements();
                    for (let i = 0; i < imageThumbnailChooserBindings.namedImages.length; i++) {
                        expectThumbnailEnabled(thumbnails[i]);
                    }
                });
                describe('model given', function() {
                    it('should have correct selection if model is changed', function () {
                        expect(imageThumbnailChooserBindings.namedImages.length).toBeGreaterThan(0);
                        for (let i = 0; i < imageThumbnailChooserBindings.namedImages.length; i++) {
                            const currentSelectedModel = imageThumbnailChooserBindings.namedImages[i];
                            $scope.selectedModel = currentSelectedModel;
                            $scope.$apply();
                            since("should have correct selected index '#{expected}' but is '#{actual}'")
                                .expect(getSelectedThumbnailIndex()).toBe(i);
                            since("model should be selected model '#{expected}' but is '#{actual}")
                                .expect(imageThumbnailChooserCtrl.model).toEqual(currentSelectedModel);
                        }
                    });
                    it('should switch model accordingly, if elem is clicked', function () {
                        for (let i = imageThumbnailChooserBindings.namedImages.length-1; i >= 0; i--) {
                            since("should not be selected thumbnail yet: '#{expected}' but is '#{actual}'").expect(getSelectedThumbnailIndex()).not.toBe(i);
                            getThumbnailElements()[i].click();
                            since("should have correct selected thumbnail '#{expected}' but is '#{actual}'").expect(getSelectedThumbnailIndex()).toBe(i);
                        }
                    });
                });
                describe('model not given', function() {
                    it('model should be a controller property even when not given and be undefined by default', function() {
                        const $scopeWithoutModel = angular.extend($rootScope.$new(), {
                            namedImages: [],
                            disabled: false
                        });
                        const jqElementWithoutModel = $compile(
                            `<image-thumbnail-chooser named-images="namedImages" disabled="disabled">
                                    </image-thumbnail-chooser>`
                        )($scopeWithoutModel);

                        const imageThumbnailChooserWithoutModel: HTMLElement = jqElementWithoutModel[0];
                        $scopeWithoutModel.$apply();
                        const imageThumbnailChooserCtrlWithoutModel: ImageThumbnailChooserComponentController = jqElementWithoutModel.controller('imageThumbnailChooser');
                        document.body.appendChild(imageThumbnailChooserWithoutModel);

                        expect(imageThumbnailChooserCtrlWithoutModel.hasOwnProperty('model')).toBe(true);
                        expect(imageThumbnailChooserCtrlWithoutModel.model).toBeUndefined();

                        document.body.removeChild(imageThumbnailChooserWithoutModel);
                    });
                });
                describe('disabled given', function() {
                    beforeEach(function () {
                        $scope.disabled = true;
                        $scope.$apply();
                    });
                    afterAll(function () {
                        $scope.disabled = false;
                    });

                    it('all thumbnails should be in greyscale if disabled', function () {
                        expect($scope.disabled).toBe(true);
                        const thumbnails: HTMLCollectionOf<HTMLElement> = getThumbnailElements();
                        for (let i = 0; i < imageThumbnailChooserBindings.namedImages.length; i++) {
                            expectThumbnailDisabled(thumbnails[i]);
                        }
                    });
                    it('should still have border if selected and disabled', function () {
                        const selectedIndex = 0;
                        $scope.selectedModel = imageThumbnailChooserBindings.namedImages[selectedIndex];
                        $scope.$apply();
                        expect(getSelectedThumbnailIndex()).toBe(selectedIndex);
                        expectThumbnailDisabled(getThumbnailElements()[selectedIndex]);
                    });
                    it('should not change model if disabled and other image is clicked', function () {
                        const selectedIndex = getSelectedThumbnailIndex();
                        expect(selectedIndex).not.toBeNull();
                        for (let i = 0; i < imageThumbnailChooserBindings.namedImages.length; i++) {
                            if (i === selectedIndex) {
                                continue;
                            }
                            since("should be selected thumbnail: '#{expected}' but is '#{actual}'").expect(getSelectedThumbnailIndex()).toBe(selectedIndex);
                            getThumbnailElements()[i].click();
                            since("should still be same thumbnail selected '#{expected}' but is '#{actual}'").expect(getSelectedThumbnailIndex()).toBe(selectedIndex);
                        }
                    });
                });

                describe('disabled not given', function() {
                    it('disabled should be defined and "false" by default even when not given', function() {
                        const $scopeWithoutDisabled = angular.extend($rootScope.$new(), {
                            selectedModel: {},
                            namedImages: [],
                        });
                        const jqElementWithoutDisabled = $compile(
                            `<image-thumbnail-chooser model="selectedModel" named-images="namedImages">
                                    </image-thumbnail-chooser>`
                        )($scopeWithoutDisabled);

                        const imageThumbnailChooserWithoutDisabled: HTMLElement = jqElementWithoutDisabled[0];
                        $scopeWithoutDisabled.$apply();
                        const imageThumbnailChooserCtrlWithoutDisabled: ImageThumbnailChooserComponentController = jqElementWithoutDisabled.controller('imageThumbnailChooser');
                        document.body.appendChild(imageThumbnailChooserWithoutDisabled);

                        expect(imageThumbnailChooserCtrlWithoutDisabled.disabled).toBeDefined();
                        expect(imageThumbnailChooserCtrlWithoutDisabled.disabled).toBe(false);
                        document.body.removeChild(imageThumbnailChooserWithoutDisabled);
                    });
                });
                describe('neither disabled nor model given', function() {
                    it('both model and disabled should be controller properties and have default values', function() {
                        const $scopeOnlyWithNamedImages = angular.extend($rootScope.$new(), {
                            namedImages: [],
                        });
                        const jqElementOnlyWithNamedImages = $compile(
                            `<image-thumbnail-chooser named-images="namedImages" >
                                        </image-thumbnail-chooser>`
                        )($scopeOnlyWithNamedImages);

                        const imageThumbnailChooserOnlyWithNamedImages: HTMLElement = jqElementOnlyWithNamedImages[0];
                        $scopeOnlyWithNamedImages.$apply();
                        const imageThumbnailChooserCtrlOnlyWithNamedImages: ImageThumbnailChooserComponentController = jqElementOnlyWithNamedImages.controller('imageThumbnailChooser');
                        document.body.appendChild(imageThumbnailChooserOnlyWithNamedImages);

                        expect(imageThumbnailChooserCtrlOnlyWithNamedImages.hasOwnProperty('model')).toBe(true);
                        expect(imageThumbnailChooserCtrlOnlyWithNamedImages.model).toBeUndefined();
                        expect(imageThumbnailChooserCtrlOnlyWithNamedImages.disabled).toBeDefined();
                        expect(imageThumbnailChooserCtrlOnlyWithNamedImages.disabled).toBe(false);
                        document.body.removeChild(imageThumbnailChooserOnlyWithNamedImages);
                    });
                });
                describe('model change', function () {
                    it('should change model if thumbnail is clicked with correct img as param', function () {
                        for (let i = 0; i < imageThumbnailChooserBindings.namedImages.length; i++) {
                            const thumbnail: HTMLElement = getThumbnailElements()[i];
                            thumbnail.click();
                            expect(imageThumbnailChooserCtrl.model).toBe(imageThumbnailChooserBindings.namedImages[i]);
                        }
                    });
                    it('should not change model if thumbnail is clicked with correct img as param when disabled is true', function () {
                        imageThumbnailChooserCtrl.disabled = true;
                        for (let i = 0; i < imageThumbnailChooserBindings.namedImages.length; i++) {
                            const thumbnail: HTMLElement = getThumbnailElements()[i];
                            thumbnail.click();
                            expect(imageThumbnailChooserCtrl.model).toBe(imageThumbnailChooserBindings.namedImages[0]);
                        }
                    });
                });
            }

            describe('with svgs', function () {
                imageThumbnailChooserTestSuite(makeImageThumbnailChooserBindings('svg', NUMBER_OF_THUMBNAILS_IN_TESTS));
            });

            describe('with images', function () {
                imageThumbnailChooserTestSuite(makeImageThumbnailChooserBindings('img', NUMBER_OF_THUMBNAILS_IN_TESTS));
            });
        });
    });
}

