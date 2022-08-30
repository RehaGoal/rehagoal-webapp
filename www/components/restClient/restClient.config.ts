module rehagoal.restClientConfig {
    const moduleName = 'rehagoal.restClientConfig';

    export type RestConstants = {TOKEN_AUTH_URL: string,
        TOKEN_REFRESH_URL: string,
        TOKEN_VERIFY_URL: string,
        BASE_URL: string}

    angular.module(moduleName, [])
        .constant('REST_API', (function (): RestConstants {
            //TODO: replace with production domain
            let server_base = 'https://rehagoal-server.local';
            return {
                TOKEN_AUTH_URL: server_base + '/api-token-auth/',
                TOKEN_REFRESH_URL: server_base + '/api-token-refresh/',
                TOKEN_VERIFY_URL: server_base + '/api-token-verify/',
                BASE_URL: server_base + '/api/v2'
            }
        })());
}
