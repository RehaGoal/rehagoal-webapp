module rehagoal.imageThumbnailChooser {
    const moduleName = 'rehagoal.imageThumbnailChooser';

    export interface INamedImage {
        name: string;
        imageSrc: string;
    }

    export class ImageThumbnailChooserComponentController implements angular.IComponentController {
        public model?: INamedImage = undefined;
        public namedImages: INamedImage[] = [];
        public disabled: boolean = false;

        constructor() {
        }

        public isImgSelected(image: INamedImage): boolean {
            return angular.equals(image, this.model);
        }

        public onImageClicked(image: INamedImage): void {
            if (!this.disabled) {
                this.model = image;
            }
        }
    }

    angular.module(moduleName)
        .component('imageThumbnailChooser', {
            templateUrl: 'components/imageThumbnailChooser/imageThumbnailChooser.html',
            controller: ImageThumbnailChooserComponentController,
            bindings: {
                model: '=?',
                namedImages: '<',
                disabled: '<?',
            }
        });
}
