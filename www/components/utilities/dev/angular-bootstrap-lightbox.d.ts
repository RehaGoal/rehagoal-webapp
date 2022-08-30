declare namespace angular.bootstrap.lightbox {

    /**
     * Service for loading an image.
     */
    export interface IImageLoaderService {
        /**
         * Load the image at the given URL.
         * @param url URL of the image to load
         */
        load(url: string): ng.IPromise<HTMLImageElement>
    }

    export type ILightboxImage = string | {
        url: string
        type?: string
        caption?: string
    }

    export interface ILightboxProvider {
        /**
         * Template URL passed into `$uibModal.open()`.
         */
        templateUrl: string;
        /**
         * Whether images should be scaled to the maximum possible dimensions.
         */
        fullScreenMode: boolean;

        /**
         * @param image An element in the array of images.
         * @returns The URL of the given image.
         */
        getImageUrl(image: ILightboxImage): string;

        /**
         * @param image An element in the array of images.
         * @returns The caption of the given image.
         */
        getImageCaption(image: ILightboxImage): string;

        /**
         * Calculate the max and min limits to the width and height of the displayed image (all are optional).
         * The max dimensions override the min dimensions if they conflict.
         */
        calculateImageDimensionLimits(dimensions: { windowWidth: number, windowHeight: number }): { maxWidth: number, maxHeight: number };

        /**
         * Calculate the width and height of the modal. This method gets called after the width and height of the image, as displayed inside the modal, are calculated.
         */
        calculateModalDimensions(dimensions: { windowWidth: number, windowHeight: number, imageDisplayWidth: number, imageDisplayHeight: number}): {width: 'auto' | number; height: 'auto' | number};

        /**
         * Returns whether the provided element is a video.
         * @param image: An element in the array of images.
         */
        isVideo(image: ILightboxImage): boolean;

        /**
         * Returns whether the provided element is a video that is to be embedded with an external service like YouTube.
         * By default, this is determined by the url not ending in .mp4, .ogg, or .webm.
         */
        isSharedVideo(image: ILightboxImage): boolean;

        /**
         * Array of all images to be shown in the lightbox (not `Image` objects).
         */
        images: ILightboxImage[];
        /**
         * The index in the `Lightbox.images` array of the image that is currently shown in the lightbox.
         */
        index: number;
        /**
         * Whether keyboard navigation is currently enabled for navigating through images in the lightbox.
         */
        keyboardNavEnabled: boolean;
        /**
         * The image currently shown in the lightbox.
         */
        image: ILightboxImage;
        /**
         * The UI Bootstrap modal instance. See {@link http://angular-ui.github.io/bootstrap/#/modal}.
         */
        modalInstance: ui.bootstrap.IModalInstanceService;
        /**
         * The URL of the current image.
         * This is a property of the service rather than of Lightbox.image because Lightbox.image need not be an object,
         * and besides it would be poor practice to alter the given objects.
         */
        imageUrl: string;
        /**
         * The optional caption of the current image.
         */
        imageCaption: string;
        /**
         * Whether an image is currently being loaded.
         */
        loading: boolean;

        /**
         * Open the lightbox modal.
         * @param newImages An array of images. Each image may be of any type.
         * @param newIndex The index in `newImages` to set as the current image.
         * @param modalParams Custom params for the angular UI bootstrap modal (in `$uibModal.open()`).
         * @returns The created UI Bootstrap modal instance.
         */
        openModal(newImages: ILightboxImage[], newIndex: number, modalParams?: ui.bootstrap.IModalSettings): ui.bootstrap.IModalInstanceService;

        /**
         * Close the lightbox modal.
         * @param result This argument can be useful if the modal promise gets handler(s) attached to it.
         */
        closeModal(result?: any): ReturnType<ui.bootstrap.IModalInstanceService['close']>;

        /**
         * This method can be used in all methods which navigate/change the current image.
         * @param newIndex The index in the array of images to set as the new current image.
         */
        setImage(newIndex: number): void;

        /**
         * Navigate to the first image.
         */
        firstImage(): void;

        /**
         * Navigate to the previous image.
         */
        prevImage(): void;

        /**
         * Navigate to the next image.
         */
        nextImage(): void;

        /**
         * Navigate to the last image.
         */
        lastImage(): void;

        /**
         * Call this method to set both the array of images and the current image (based on the current index).
         * A use case is when the image collection gets changed dynamically in some way while the lightbox is still open.
         * @param newImages The new array of images.
         */
        setImages(newImages: ILightboxImage[]): void;
    }
}
