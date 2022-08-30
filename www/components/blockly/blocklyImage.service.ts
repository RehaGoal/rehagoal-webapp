module rehagoal.blockly {

    import depthFirstSearchGenerator = rehagoal.utilities.depthFirstSearchGenerator;
    const moduleName = 'rehagoal.blockly';

    // based on https://github.com/mit-cml/appinventor-sources/blob/cc121a481d7edd75878f24c3ccac70fa8584daa8/appinventor/blocklyeditor/src/exportBlocksImage.js

    export type IBlocklyImageService = BlocklyImageService;

    class BlocklyImageService {
        static $inject = [
            '$log',
            'blocklyService',
            '$document',
            '$window',
        ];

        constructor(private $log: angular.ILogService,
                    private blockly: IBlockly, private $document: angular.IDocumentService, private $window: angular.IWindowService) {

        }

        private isExternalUrl(url: string | null): boolean {
            return !!url && url.lastIndexOf('http', 0) == 0 && url.lastIndexOf(window.location.host) == -1;
        }

        private getSvgStyles(el: SVGElement | SVGGraphicsElement) {
            let css = "";
            const sheets = (this.$document[0] as Document).styleSheets;
            for (const sheet of sheets) {
                if (this.isExternalUrl(sheet.href)) {
                    this.$log.warn("Cannot include styles from other hosts: " + sheet.href);
                    continue;
                }
                const rules = sheet.cssRules;
                for (let rule of rules) {
                    if (rule instanceof CSSStyleRule) {
                        let match = null;
                        try {
                            match = el.querySelector(rule.selectorText);
                        } catch (err) {
                            this.$log.warn('Invalid CSS selector "' + rule.selectorText + '"', err);
                        }
                        if (match && rule.selectorText.indexOf("blocklySelected") == -1) {
                            const patchedCSSText = this.patchFontFamily(rule);
                            css += rule.selectorText + " { " + patchedCSSText + " }\n";
                        } else if (rule.cssText.match(/^@font-face/)) {
                            css += rule.cssText + '\n';
                        }
                    }
                }
            }
            return css;
        }

        private patchFontFamily(rule: CSSStyleRule) {
            const replaceFont = 'Arial, Verdana, "Nimbus Sans L", Helvetica';
            const fontFamilyBackup = rule.style.fontFamily;
            rule.style.fontFamily = rule.style.fontFamily.replace(/(^|,\s*)sans-serif(\s*,\s*|$)/g, `$1${replaceFont}$2`);
            const patchedCSSText = rule.style.cssText;
            rule.style.fontFamily = fontFamilyBackup;
            return patchedCSSText;
        }

        private async doWithEnabledBlocks<T>(topBlock: Block, doFn: () => Promise<T>): Promise<T> {
            const previouslyDisabledBlocks = [];
            for (const block of depthFirstSearchGenerator(topBlock, (block) => block.getChildren(true))) {
                if (block.disabled) {
                    previouslyDisabledBlocks.push(block);
                }
                block.setDisabled(false);
            }

            try {
                return await doFn();
            } finally {
                for (let previouslyDisabledBlock of previouslyDisabledBlocks) {
                    previouslyDisabledBlock.setDisabled(true);
                }
            }
        }

        public async getBlockAsSvgBlob(block: BlockSvg): Promise<Blob> {
            return this.doWithEnabledBlocks(block, async () => {
                try {
                    this.blockly.Events.disable();
                    return this.svgAsBlob(block.svgGroup_);
                } finally {
                    this.blockly.Events.enable();
                }
            });
        }

        private async svgAsBlob(svgGraphicsElement: SVGGraphicsElement): Promise<Blob> {
            const document = this.$document[0] as Document;

            const svgGraphicsClone = svgGraphicsElement.cloneNode(true) as SVGGraphicsElement;
            const newTransform = svgGraphicsClone.getAttribute('transform')?.replace(/(translate|scale)\(.*?\)/g, '')?.trim() || '';
            svgGraphicsClone.setAttribute('transform', newTransform);

            const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
            const svgNamespaceUri = 'http://www.w3.org/2000/svg';
            const outer = document.createElement("div");
            const svgElement = document.createElementNS(svgNamespaceUri, 'svg');
            svgElement.setAttribute('xmlns', svgNamespaceUri);
            svgElement.appendChild(svgGraphicsClone);

            const box = svgGraphicsElement.getBBox();
            const width = box.width;
            const height = box.height;

            svgElement.setAttribute('viewBox', box.x + " " + box.y + " " + width + " " + height);
            svgElement.setAttribute("version", "1.1");
            svgElement.setAttribute("width", width.toString());
            svgElement.setAttribute("height", height.toString());
            svgElement.setAttribute("style", 'background-color: rgba(255, 255, 255, 0);');
            outer.appendChild(svgElement);

            this.insertStyles(svgGraphicsElement, svgElement);

            let svgText = doctype + outer.innerHTML;
            svgText = svgText.replace(/&nbsp;/g, '&#160;');
            return new Blob([svgText], {type: 'image/svg+xml'});
        }

        private insertStyles(svgElement: SVGGraphicsElement, clone: SVGElement) {
            const document = this.$document[0] as Document;
            const css = this.getSvgStyles(svgElement);
            const s = document.createElement('style');
            s.setAttribute('type', 'text/css');
            s.innerHTML = "<![CDATA[\n" + css + "\n]]>";
            const defs = document.createElement('defs');
            defs.appendChild(s);
            clone.insertBefore(defs, clone.firstChild);
        }
    }

    angular.module(moduleName).service('blocklyImageService', BlocklyImageService);
}
