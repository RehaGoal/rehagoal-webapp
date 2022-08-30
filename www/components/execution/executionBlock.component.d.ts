interface IExecutionBlockComponentController extends ng.IComponentController {
    openLightbox(): void
    /* Bindings */
    text?: string;
    additionalText?: string;
    imageHash?: string | null;
    imageUrl?: string | null;
    contentAlign?: 'left' | 'right';
    currentBlockIndex?: number;
    flex?: boolean;
    lightboxDisabled?: boolean;
    current?: boolean;
    miniTask?: boolean;
    buttonDisabled?: boolean;
    buttonYes?: boolean;
    buttonNo?: boolean;
    buttonCheck?: boolean;
    onClickCheck?: () => void;
    onClickYes?: () => void;
    onClickNo?: () => void;
    onClickLabel?: () => void;
    onClickSkip?: () => void;
}
