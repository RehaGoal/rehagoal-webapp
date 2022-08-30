module rehagoal.tts {
    const moduleName = 'rehagoal.tts';
    const speakableContentClass = 'speakable-content';
    const speakingContentClass = 'speaking-content';

    angular.module(moduleName)
        .directive('speakContents', ['$log', 'ttsService',
            function($log: angular.ILogService, ttsService: TTSService): ng.IDirective {
                return {
                    link: function(scope: ng.IScope, element: JQLite, attr: ng.IAttributes): void {
                        element.addClass(speakableContentClass);

                        let speaking = false;

                        const onclick = function(event: Event): void {
                            if (ttsService.isTTSEnabled() && !speaking) {
                                const contents = element.text();
                                $log.info('SpeakContents', contents);
                                element.addClass(speakingContentClass);
                                speaking = true;
                                ttsService.speak(contents).finally(() => {
                                    element.removeClass(speakingContentClass);
                                    speaking = false;
                                });
                            }
                        };

                        element.on('click', onclick);

                        element.on('$destroy', function(): void {
                            element.removeClass(speakableContentClass);
                            element.removeClass(speakingContentClass);
                            element.off('click', onclick);
                        });
                    },
                    restrict: 'A',
                }
            }
        ]);
}
