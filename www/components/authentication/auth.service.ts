module rehagoal.auth {
    const moduleName = 'rehagoal.auth';
    const authTokenStorageKey: string = "authToken";
    type TokenResponseData = {token: string};

    export class AuthService {
        static $inject = [
            '$log',
            '$http',
            '$rootScope',
            '$q',
            'REST_API',
            'webStorage'
        ];

        private authToken: string | null = null;
        private userLoggedIn: boolean = false;

        constructor(private $log: angular.ILogService,
                    private $http: angular.IHttpService,
                    private $rootScope: angular.IRootScopeService,
                    private $q: angular.IQService,
                    private restApi: rehagoal.restClientConfig.RestConstants,
                    private webStorage: IAngularWebStorageService) {
            if (this.webStorage.has(authTokenStorageKey)) {
                let token: string = this.webStorage.get(authTokenStorageKey);
                this.verifyToken(token)
                    .then(() => this.setToken(token))
                    .catch((error: string) => {
                        this.$log.warn("Error while verifying token: "+error);
                        this.$log.debug("Token was "+token);
                        this.webStorage.remove(authTokenStorageKey);
                    });
            }
        }

        login(username: string, password: string) : angular.IPromise<void> {
            let authURL = this.restApi.TOKEN_AUTH_URL;
            let credentials = {
                username: username,
                password: password
            };
            return this.handleHTTPPostRequest(authURL,credentials);
        }

        logout() : void {
            this.authToken = null;
            this.userLoggedIn = false;
            if(this.$http.defaults.headers !== undefined) {
                this.$http.defaults.headers.common.Authorization = undefined;
            }
            this.webStorage.remove(authTokenStorageKey);
        }

        logoutWithError(err : string) : void {
            this.logout();
            this.$rootScope.$broadcast('loginModal.openModalWithErrorEvent', err);
        }

        isUserLoggedIn() : boolean {
            // use promise
            return this.userLoggedIn;
        }

        requestUserLogin() : angular.IPromise<void> {
            let deferred = this.$q.defer<void>();
            this.$rootScope.$broadcast('loginModal.openModalEvent', deferred);
            return deferred.promise;
        }

// _____________________________________________________________________

        private refreshToken(token: string) : angular.IPromise<void> {
            let refreshURL = this.restApi.TOKEN_REFRESH_URL;
            let data = {
                token: token
            };
            return this.handleHTTPPostRequest(refreshURL, data);
        }

        private verifyToken(token: string) : angular.IPromise<void> {
            let verifyURL = this.restApi.TOKEN_VERIFY_URL;
            let data = {
                token: token
            };
            return this.handleHTTPPostRequest(verifyURL, data);
        }

        private setToken(authToken: string) : void {
            this.authToken = authToken;
            this.webStorage.set(authTokenStorageKey, authToken);
            this.userLoggedIn = true;
            if(this.$http.defaults.headers !== undefined) {
                this.$http.defaults.headers.common.Authorization = 'Bearer ' + this.authToken;
            }
        }

        private handleHTTPPostRequest(url: string, data: any): angular.IPromise<void> {
            let vm = this;
            return this.$q<void>((resolve, reject) => {
                this.$http.post<TokenResponseData>(url, data)
                    .then(function successCallback(response) {
                        if (response.data !== undefined) {
                            vm.setToken(response.data.token);
                            resolve();
                        } else {
                            reject("Token data is undefined!");
                        }
                    }, function errorCallback(response) {
                        vm.logout();
                        const defaultErrorMessage: string = `Server responded with an error (${response.status}).`;
                        let errorMessage = "";
                        if (response.status != -1) {
                            for (let key in response.data) {
                                if (response.data.hasOwnProperty(key)) {
                                    errorMessage += response.data[key];
                                }
                            }
                        } else {
                            errorMessage = "Server could not been reached.";
                        }
                        if (errorMessage.trim() === "") {
                            errorMessage = defaultErrorMessage;
                        }
                        reject(errorMessage);
                    });
            });
        }
    }

    angular.module(moduleName).service('authService', AuthService);
}
