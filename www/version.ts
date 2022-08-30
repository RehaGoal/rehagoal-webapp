module rehagoal.versionInfo {
    const moduleName = 'rehagoal.versionInfo';

    export type VersionConstants = {
        gitCommit: string,
        gitBranch: string,
        platform: string
    }
    angular.module(moduleName, [])
        .constant('GIT_INFO', (function (): VersionConstants {
        return {
            gitCommit: "placeholder",
            gitBranch: "placeholder",
            platform: "placeholder"
        }
    })());
}