module rehagoal.restClient {
    import AuthService = rehagoal.auth.AuthService;
    const moduleName = 'rehagoal.restClient';

    angular.module(moduleName, ['restangular', 'rehagoal.restClientConfig', 'rehagoal.auth'])
        .run([
            'Restangular',
            'REST_API',
            '$window',
            'authService',
            (RestangularProvider: Restangular.IProvider,
             restApi: rehagoal.restClientConfig.RestConstants,
             $window: angular.IWindowService,
             authService: AuthService) => {

                RestangularProvider.setBaseUrl(restApi.BASE_URL);
                RestangularProvider.setRequestSuffix('/');

                RestangularProvider.setErrorInterceptor(function(response, deferred, responseHandler) {
                    if(response.status === 403) {
                        let extractedResponse: string = "";
                        for (let key in response.data){
                            if (response.data.hasOwnProperty(key)) {
                                extractedResponse += response.data[key];
                            }
                        }
                        authService.logoutWithError(extractedResponse);
                        authService.requestUserLogin();
                    }
                    return true;
                });

                RestangularProvider.addResponseInterceptor(function(data, operation, what, url, response, deferred) {
                    let extractedData;
                    if (operation === "getList") {
                        extractedData = data.results;
                        extractedData.count = data.count;
                        extractedData.next = data.next;
                        extractedData.previous = data.previous;
                    } else {
                        extractedData = data;
                    }
                    return extractedData;
                });
            }]
        );
}
