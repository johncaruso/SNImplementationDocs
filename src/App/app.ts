/// <reference path="../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Scripts/typings/angularjs/angular-route.d.ts" />
/// <reference path="../Scripts/typings/bootstrap/index.d.ts" />
/// <reference path="../Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="sys.ts" />
/// <reference path="IncidentManagement.ts" />

type Mandatory<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

namespace persistentStorageLoaderService {
    /**
     * Defines the service name as "persistentStorageLoader".
     * @export
     * @constant {string}
     */
    export const SERVICE_NAME: string = "persistentStorageLoader";

    /**
     * The session storage key used by the {@link Service} for storing URL configuration information.
     * @export
     * @constant {string}
     */
    export const STORAGEKEY_URL_CONFIG_SETTINGS: string = "UrlConfig";

    class SessionStorageEntryEnumerator implements IterableIterator<[string, string]> {
        private _index: number = 0;

        constructor(private _window: ng.IWindowService, private _keys: string[]) { }

        [Symbol.iterator](): IterableIterator<[string, string]> { return this; }

        next(): IteratorResult<[string, string]> {
            if (this._window.persistentStorageLegacy.length !== this._keys.length)
                this._index = this._keys.length;
            else if (this._index < this._keys.length) {
                try {
                    let key: string = this._keys[this._index];
                    let value: string = this._window.persistentStorageLegacy.getItem(key);
                    if (sys.notNil(value))
                        return { done: false, value: [key, value] };
                    this._index = this._keys.length;
                } catch { this._index = this._keys.length; }
            }
            return { done: true, value: undefined };
        }
    }

    class SessionStorageValueEnumerator implements IterableIterator<string> {
        private _index: number = 0;

        constructor(private _window: ng.IWindowService, private _keys: string[]) { }

        [Symbol.iterator](): IterableIterator<string> { return this; }

        next(): IteratorResult<string> {
            if (this._window.persistentStorageLegacy.length !== this._keys.length)
                this._index = this._keys.length;
            else if (this._index < this._keys.length) {
                try {
                    let value: string = this._window.persistentStorageLegacy.getItem(this._keys[this._index]);
                    if (sys.notNil(value))
                        return { done: false, value: value };
                    this._index = this._keys.length;
                } catch { this._index = this._keys.length; }
            }
            return { done: true, value: undefined };
        }
    }

    /**
     * Implements the persistentStorageLoader service.
     * @export
     * @class Service
     * @implements {Map<string, string>}
     */
    export class Service implements Map<string, string>  {
        private _allKeys: string[];
        private _parsedKeys: string[];
        private _parsedObjects: (any | null | undefined)[];
        [Symbol.toStringTag]: string;

        /**
         * The number of settings values being stored.
         * @readonly
         * @type {number}
         * @memberof Service
         */
        get size(): number { return this.$window.sessionStorage.length; }

        constructor(private $window: ng.IWindowService) {
            this[Symbol.toStringTag] = SERVICE_NAME;
            this.check(true);
        }

        private check(forceRefresh: boolean = false) {
            if (!forceRefresh && this.$window.sessionStorage.length == this._allKeys.length)
                return;
            this._allKeys = [];
            this._parsedKeys = [];
            this._parsedObjects = [];
            for (let i: number = 0; i < this.$window.sessionStorage.length; i++)
                this._allKeys.push(this.$window.sessionStorage.key(i));
        }

        clear(): void {
            this.$window.sessionStorage.clear();
            this._allKeys = [];
            this._parsedKeys = [];
            this._parsedObjects = [];
        }

        delete(key: string): boolean {
            this.check();
            this.$window.sessionStorage.removeItem(key);
            let i: number = this._parsedKeys.indexOf(key);
            if (i < 0)
                return false;
            if (i == 0) {
                this._parsedKeys.shift();
                this._parsedObjects.shift();
            } else if (i == (this._parsedKeys.length - 1)) {
                this._parsedKeys.pop();
                this._parsedObjects.pop();
            } else {
                this._parsedKeys.splice(i, 1);
                this._parsedObjects.splice(i, 1);
            }
        }

        entries(): IterableIterator<[string, string]> { return new SessionStorageEntryEnumerator(this.$window, this._allKeys); }
        [Symbol.iterator](): IterableIterator<[string, string]> { return this.entries(); }

        forEach(callbackfn: (value: string, key: string, map: Service) => void, thisArg?: any): void {
            this.check();
            if (typeof (thisArg) === "undefined")
                this._allKeys.forEach((key: string, index: number) => {
                    if (index < this._allKeys.length && this._allKeys[index] === key) {
                        let value: string | undefined;
                        try { value = this.$window.sessionStorage.getItem(key); } catch { /* okay to ignore */ }
                        if (sys.notNil(value))
                            callbackfn(value, key, this);
                    }
                }, this);
            else
                this._allKeys.forEach((key: string, index: number) => {
                    if (index < this._allKeys.length && this._allKeys[index] === key) {
                        let value: string | undefined;
                        try { value = this.$window.sessionStorage.getItem(key); } catch { /* okay to ignore */ }
                        if (sys.notNil(value))
                            callbackfn.call(thisArg, value, key, this);
                    }
                }, this);
        }

        get(key: string): string | null {
            this.check();
            try {
                if (this._allKeys.indexOf(key) > -1)
                    return this.$window.sessionStorage.getItem(key);
            } catch { /* okay to ignore */ }
            return null;
        }

        getKeys(): string[] {
            this.check();
            return Array.from(this._allKeys);
        }

        getObject<T>(key: string): T | undefined {
            this.check();
            let i: number = this._parsedKeys.indexOf(key);
            if (i > -1)
                return <T>this._parsedObjects[i];
            try {
                let json: string = this.$window.sessionStorage.getItem(key);
                if (!sys.isNilOrEmpty(json)) {
                    let result: T | undefined;
                    if (json !== "undefined")
                        result = <T>(ng.fromJson(json));
                    this._parsedKeys.push(key);
                    this._parsedObjects.push(result);
                    return result;
                }
            } catch { }
        }

        has(key: string): boolean {
            this.check();
            return this._allKeys.indexOf(key) > -1;
        }

        keys(): IterableIterator<string> {
            this.check();
            return Array.from(this._allKeys).values();
        }

        set(key: string, value: string): any | undefined {
            try {
                if (sys.isNil(value))
                    this.$window.sessionStorage.removeItem(key);
                else
                    this.$window.sessionStorage.setItem(key, value);
                let i: number = this._parsedKeys.indexOf(key);
                if (i == 0) {
                    this._parsedKeys.shift();
                    this._parsedObjects.shift();
                } else if (i == (this._parsedKeys.length - 1)) {
                    this._parsedKeys.pop();
                    this._parsedObjects.pop();
                } else if (i < this._parsedKeys.length) {
                    this._parsedKeys.splice(i, 1);
                    this._parsedObjects.splice(i, 1);
                }
            } catch (e) { return e; }
        }

        setObject<T>(key: string, value: T | undefined): any | undefined {
            try {
                if (typeof value === "undefined")
                    this.$window.sessionStorage.setItem(key, "undefined");
                else
                    this.$window.sessionStorage.setItem(key, angular.toJson(value, false));
                let i: number = this._parsedKeys.indexOf(key);
                if (i < 0) {
                    this._parsedKeys.push(key);
                    this._parsedObjects.push(value);
                } else
                    this._parsedObjects[i] = value;
            } catch (e) { return e; }
        }

        values(): IterableIterator<string> { return new SessionStorageValueEnumerator(this.$window, this._allKeys); }
    }

    export function getServiceInjectable(): ng.Injectable<Function> { return ["$window", Service]; }
}

namespace notificationMessageService {
    export const SERVICE_NAME: string = "notificationMessage";

    export enum NotificationMessageType {
        error,
        warning,
        info
    }

    export interface INotificationMessage {
        type: NotificationMessageType;
        title?: string;
        message: string;
    }

    export class Service {
        [Symbol.toStringTag]: string;
        private _messages: INotificationMessage[] = [];

        constructor(public readonly $log: ng.ILogService) { this[Symbol.toStringTag] = SERVICE_NAME; }

        addNotificationMessage(message: string, title: string, type: NotificationMessageType): void;
        addNotificationMessage(message: string, type: NotificationMessageType): void;
        addNotificationMessage(message: string, title: string): void;
        addNotificationMessage(message: string): void;
        addNotificationMessage(message: string, title?: string | NotificationMessageType, type?: NotificationMessageType): void {
            if (typeof title === "number") {
                type = title;
                title = undefined;
            }
            if (typeof type !== "number" || (type !== NotificationMessageType.error && type !== NotificationMessageType.warning && type !== NotificationMessageType.info))
                type = NotificationMessageType.info;

            this._messages.push({
                type: type,
                title: (typeof title !== "string" || (title = title.trim()).length == 0) ? (type === NotificationMessageType.error) ? "Error" : ((type === NotificationMessageType.warning) ? "Warning" : "Notice") : title,
                message: message
            });
        }
        getMessages(type: NotificationMessageType, clear: boolean): INotificationMessage[];
        getMessages(type: NotificationMessageType): INotificationMessage[];
        getMessages(clear: boolean): INotificationMessage[];
        getMessages(): INotificationMessage[];
        getMessages(type?: NotificationMessageType | boolean, clear?: boolean): INotificationMessage[] {
            let result: INotificationMessage[] = this._messages;
            if (typeof type === "boolean")
                clear = type;
            else if (typeof type === "number" && (type === NotificationMessageType.error || type === NotificationMessageType.warning || type === NotificationMessageType.info)) {
                if (clear === true)
                    this._messages = result.filter((item: INotificationMessage) => item.type !== type);
                return result.filter((item: INotificationMessage) => item.type === type);
            }
            if (clear === true)
                this._messages = [];
            return result;
        }
    }

    export function getServiceInjectable(): ng.Injectable<Function> { return ["$log", Service]; }
}

namespace appConfigLoaderService {
    /**
     * Defines the service name as "appConfigLoader".
     * @export
     * @constant {string}
     */
    export const SERVICE_NAME: string = "appConfigLoader";
    export const EVENT_NAME_SERVICENOW: string = "appConfigLoader:urlChange:sn";
    export const EVENT_NAME_GIT_SERVICE: string = "appConfigLoader:urlChange:git";
    export const EVENT_NAME_IDP: string = "appConfigLoader:urlChange:idp";

    /**
    * The default root absolute URL of the target ServiceNow instance.
    * @export
    * @constant {string}
    * @description - This MUST be an absolute URL and MUST NOT contain an explicit path (cannot end with "/"), URL query or fragment.
    */
    export const DEFAULT_URL_SERVICENOW: string = "https://inscomscd.service-now.com";

    /**
    * The default root absolute URL of the remote GIT repository service.
    * @export
    * @constant {string}
    * @description - This MUST be an absolute URL and MUST NOT contain a URL query or fragment. If this contains an explicit path (which is usually the case), the path must end with a "/".
    */
    export const DEFAULT_URL_GIT_SERVICE: string = "https://github.com/erwinel/";

    /**
     * The default root absolute URL of the SAML identity provider to be used by ServiceNow.
     * @export
     * @constant {string}
     * @description - This MUST be an absolute URL and MUST NOT contain an explicit path (cannot end with "/"), URL query or fragment.
     */
    export const DEFAULT_URL_IDP: string = "https://myidp.com";

    /**
    * Contains service URL definitions.
    * @export
    * @interface IUrlConfigSettings
    */
    export interface IUrlConfigSettings {
        /**
        * The base URL for the target ServiceNow instance.
        * @type {string}
        * @memberof IUrlConfigSettings
        */
        serviceNowUrl: string;

        /**
        * The base URL for the target remote GIT repository service.
        * @type {string}
        * @memberof IUrlConfigSettings
        */
        gitServiceUrl: string;

        /**
        * The base URL for the SAML identity provider to be used by ServiceNow.
        * @type {string}
        * @memberof IUrlConfigSettings
        */
        idpUrl: string;
    }

    /**
    * Defines the URL setting names supported by the appConfigData service.
    * @export
    * @typedef {('sn' | 'git' | 'idp')} UrlSettingsNames
    */
    export type UrlSettingsNames = 'sn' | 'git' | 'idp';

    /**
     * Defines a navigation menu item.
     * @interface INavigationDefinition
     */
    export interface INavigationDefinition {
        /**
        * Unique identifier of navigation menu item.
        *
        * @type {string}
        * @memberof INavigationDefinition
        */
        id?: string;
        /**
        * Relative target URL of navigation menu item.
        *
        * @type {string}
        * @memberof INavigationDefinition
        */
        url: string;
        /**
        * Display text for navigation menu item.
        *
        * @type {string}
        * @memberof INavigationDefinition
        */
        linkTitle: string;
        /**
        * Page title for navigation menu item.
        *
        * @type {string}
        * @memberof INavigationDefinition
        */
        pageTitle?: string;
        /**
        * Tooltip to use for navigation menu item.
        *
        * @type {string}
        * @memberof INavigationDefinition
        */
        toolTip?: string;
        /**
        * Heading text for child menu items that are displayed in the secondary navigation menu.
        *
        * @type {string}
        * @memberof INavigationDefinition
        */
        sideNavHeading?: string;
        /**
        * Child navigation menu items for the current navigation item, which gets displayed in the secondary navigation menu.
        *
        * @type {INavigationDefinition[]}
        * @memberof INavigationDefinition
        */
        items?: INavigationDefinition[];
    }

    /**
    * Represents the {@link IAppConfigJSON#navigation} property in the appConfigData.json file.
    * @interface INavigationJSON
    */
    export interface INavigationJSON {
        /**
        * CSS class names to be applied to any of the ancestor navigation menu items of the item that corresponds to the current page.
        *
        * @type {string[]}
        * @memberof INavigationJSON
        */
        currentItemClass: string[];
        /**
        * CSS class names to be applied to the navigation menu item that corresponds to the current page.
        *
        * @type {string[]}
        * @memberof INavigationJSON
        */
        selectedItemClass: string[];
        /**
        * CSS class names to be applied to the navigation menu items that do no correspond to the current page or any of its ancestor items.
        *
        * @type {string[]}
        * @memberof INavigationJSON
        */
        otherItemClass: string[];
        /**
        * Top-leve navigation menu items.
        *
        * @type {INavigationDefinition[]}
        * @memberof INavigationDefinition
        */
        items: INavigationDefinition[];
    }

    /**
     * Represents the contents of the appConfigData.json file.
     *
     * @interface IAppConfigJSON
     * @description The file represented by this interface is asynchronously loaded by the appConfigData service.
     */
    interface IAppConfigJSON extends IUrlConfigSettings {
        /**
         * Navigation menu settings.
         *
         * @type {INavigationJSON}
         * @memberof IAppConfigJSON
         */
        navigation: INavigationJSON;
    }

    const JSON_RELATIVE_URL_APPCONFIGDATA = "./appConfigData.json";

    export class Service {
        private _serviceNowUrl: URL = new URL(DEFAULT_URL_SERVICENOW);
        private _gitServiceUrl: URL = new URL(DEFAULT_URL_GIT_SERVICE);
        private _idpUrl: URL = new URL(DEFAULT_URL_IDP);
        private _loadNavigationSettings: ng.IPromise<INavigationJSON>;
        [Symbol.toStringTag]: string;

        static validateURL(value: URL, allowPath: boolean = false): URL | string {
            if (!(typeof value === "object" && value !== null && value instanceof URL))
                return "Value is not a URL";
            value = new URL(value.href);
            if (allowPath) {
                if (typeof value.pathname !== "string" || value.pathname.length == 0)
                    value.pathname = "/";
                else if (!value.pathname.endsWith("/"))
                    value.pathname = value.pathname + "/";
            } else if (typeof value.pathname === "string" && value.pathname.length > 0) {
                if (value.pathname !== "/")
                    return "Path not allowed";
                value.pathname = "";
            }
            if (typeof value.search === "string" && value.search.length > 0) {
                if (value.search !== "?")
                    return "Query parameters not allowed";
                value.search = "";
            }
            if (typeof value.hash === "string" && value.hash.length > 0) {
                if (value.hash !== "#")
                    return "Fragment not allowed";
                value.hash = "";
            }
            return value;
        }

        /**
        * Gets or sets the base URL for the target ServiceNow instance.
        *
        * @param {URL} [value] - Optionally specify new value for base URL of the target ServiceNow instance.
        * @returns {URL}
        * @memberof appConfigData
        * @description Changes in this value cause any callbacks specified through {@link appConfigData#onServiceNowUrlChanged} to be invoked.
        */
        serviceNowUrl(value?: URL): URL {
            if (sys.isNil(value))
                return this._serviceNowUrl;
            let validated: URL | string = Service.validateURL(value);
            if (typeof validated === "string") {
                this.$log.warn(angular.toJson({
                    reason: "appConfigLoaderService.Service#serviceNowUrl: Error validating URL value",
                    message: validated,
                    value: value
                }, true));
                throw new Error(validated);
            }
            let oldValue: URL = this._serviceNowUrl
            if (typeof oldValue !== "object" || oldValue.href !== value.href) {
                this._serviceNowUrl = value;
                this.$rootScope.$broadcast(EVENT_NAME_SERVICENOW, value, oldValue);
            }
            return this._serviceNowUrl;
        }

        onServiceNowUrlChanged(scope: ng.IScope, cb: { (newValue: URL, oldValue: URL): void }): void;
        onServiceNowUrlChanged<T>(scope: ng.IScope, cb: { (this: T, newValue: URL, oldValue: URL): void }, thisArg: T): void;
        onServiceNowUrlChanged(scope: ng.IScope, cb: { (newValue: URL, oldValue: URL): void }, thisArg?: any): void {
            if (arguments.length > 2)
                scope.$on(EVENT_NAME_SERVICENOW, (event: ng.IAngularEvent, newValue: URL, oldValue: URL) => { cb.call(thisArg, newValue, oldValue); });
            else
                scope.$on(EVENT_NAME_SERVICENOW, (event: ng.IAngularEvent, newValue: URL, oldValue: URL) => { cb(newValue, oldValue); });
        }

        /**
        * Gets or sets the base URL for the GIT repository service being used by the target ServiceNow instance.
        *
        * @param {URL} [value] - Optionally specify new value for base URL of the GIT repository service being used by the target ServiceNow instance.
        * @returns {URL}
        * @memberof appConfigData
        * @description Changes in this value cause any callbacks specified through {@link appConfigData#onGitServiceUrlChanged} to be invoked.
        */
        gitServiceUrl(value?: URL): URL {
            if (sys.isNil(value))
                return this._gitServiceUrl;
            let validated: URL | string = Service.validateURL(value, true);
            if (typeof validated === "string") {
                this.$log.warn(angular.toJson({
                    reason: "appConfigLoaderService.gitServiceUrl#serviceNowUrl: Error validating URL value",
                    activity: validated,
                    value: value
                }, true));
                throw new Error(validated);
            }
            let oldValue: URL = this._gitServiceUrl;
            if (typeof oldValue !== "object" || oldValue.href !== value.href) {
                this._gitServiceUrl = value;
                this.$rootScope.$broadcast(EVENT_NAME_GIT_SERVICE, value, oldValue);
            }
            return this._gitServiceUrl;
        }

        onGitServiceUrlChanged(scope: ng.IScope, cb: { (newValue: URL, oldValue: URL): void }): void;
        onGitServiceUrlChanged<T>(scope: ng.IScope, cb: { (this: T, newValue: URL, oldValue: URL): void }, thisArg: T): void;
        onGitServiceUrlChanged(scope: ng.IScope, cb: { (newValue: URL, oldValue: URL): void }, thisArg?: any): void {
            if (arguments.length > 2)
                scope.$on(EVENT_NAME_GIT_SERVICE, (event: ng.IAngularEvent, newValue: URL, oldValue: URL) => { cb.call(thisArg, newValue, oldValue); });
            else
                scope.$on(EVENT_NAME_GIT_SERVICE, (event: ng.IAngularEvent, newValue: URL, oldValue: URL) => { cb(newValue, oldValue); });
        }

        /**
        * Gets or sets the base URL of the Identity provider to be used by ServiceNow.
        *
        * @param {URL} [value] - Optionally specify new value for base URL of the Identity provider to be used by ServiceNow.
        * @returns {URL}
        * @memberof appConfigData
        * @description Changes in this value cause any callbacks specified through {@link appConfigData#onIdpUrlChanged} to be invoked.
        */
        idpUrl(value?: URL): URL {
            if (sys.isNil(value))
                return this._idpUrl;
            let validated: URL | string = Service.validateURL(value);
            if (typeof validated === "string") {
                this.$log.warn(angular.toJson({
                    reason: "appConfigLoaderService.Service#idpUrl: Error validating URL value",
                    activity: validated,
                    value: value
                }, true));
                throw new Error(validated);
            }
            let oldValue: URL = this._idpUrl;
            if (typeof oldValue !== "object" || oldValue.href !== value.href) {
                this._idpUrl = value;
                this.$rootScope.$broadcast(EVENT_NAME_IDP, value, oldValue);
            }
            return this._idpUrl;
        }

        onIdpUrlChanged(scope: ng.IScope, cb: { (newValue: URL, oldValue: URL): void }): void;
        onIdpUrlChanged<T>(scope: ng.IScope, cb: { (this: T, newValue: URL, oldValue: URL): void }, thisArg: T): void;
        onIdpUrlChanged(scope: ng.IScope, cb: { (newValue: URL, oldValue: URL): void }, thisArg?: any): void {
            if (arguments.length > 2)
                scope.$on(EVENT_NAME_IDP, (event: ng.IAngularEvent, newValue: URL, oldValue: URL) => { cb.call(thisArg, newValue, oldValue); });
            else
                scope.$on(EVENT_NAME_IDP, (event: ng.IAngularEvent, newValue: URL, oldValue: URL) => { cb(newValue, oldValue); });
        }

        /**
        * Creates a URL that is relative to a configuration setting URL base value.
        * @param {UrlSettingsNames} setting - The name of the URL setting.
        * @param {string} [relativeUrl] - The relative URL string.
        * @param {string} [queryParameter] - The name of the query parameter to add to the result URL.
        * @param {string} [queryValue] - The value of the query parameter to add to the result URL.
        * @returns {URL} A URL that is relative to the configuration settings URL base value.
        * @memberof appConfigData
        */
        createUrl(setting: UrlSettingsNames, relativeUrl?: string, queryParameter?: string, queryValue?: string): URL {
            let url: URL;
            if (setting === "git")
                url = this._gitServiceUrl;
            else
                url = sys.makeDirectoryUrl((setting == "sn") ? this._serviceNowUrl : this._idpUrl);
            if (typeof relativeUrl === "string" && relativeUrl.length > 0 && relativeUrl !== ".")
                url = new URL(relativeUrl, url);
            else
                url = new URL(url.href);
            if (typeof queryParameter === "string" && queryParameter.length > 0) {
                if (typeof queryValue === "string") {
                    if (url.searchParams.has(queryParameter))
                        url.searchParams.set(queryParameter, queryValue);
                    else
                        url.searchParams.append(queryParameter, queryValue);
                } else {
                    if (url.searchParams.has(queryParameter))
                        url.searchParams.delete(queryParameter);
                    if (typeof url.search !== "string" || url.search.length == 0 || url.search === "?")
                        url.search = "?" + queryParameter;
                    else
                        url.search = url.search + "&" + queryParameter;
                }
            }

            return url;
        }

        loadNavigationSettings(): ng.IPromise<INavigationJSON> { return this._loadNavigationSettings; }

        /**
        * Creates an instance of the appConfigLoader service.
        * @param {persistentStorageLoaderService.Service} persistentStorageLoader - The persistentStorageLegacy service provider.
        * @param {ng.IHttpService} $http - The $http service provider.
        * @param {ng.ILogService} $log - The $log service provider.
        * @param {ng.IRootScopeService} $rootScope - The $root service provider.
        * @param {ng.IQService} $q - The $q service provider
        * @memberof appConfigData
        */
        constructor(persistentStorageLoader: persistentStorageLoaderService.Service, $http: ng.IHttpService, public $log: ng.ILogService, private $rootScope: ng.IRootScopeService, $q: ng.IQService) {
            this[Symbol.toStringTag] = SERVICE_NAME;
            let svc: Service = this;
            let original: IUrlConfigSettings | undefined = persistentStorageLoader.getObject<IUrlConfigSettings>(persistentStorageLoaderService.STORAGEKEY_URL_CONFIG_SETTINGS);
            if (sys.notNil(original)) {
                if (typeof original !== "object") {
                    $log.warn("Expected object for " + persistentStorageLoaderService.STORAGEKEY_URL_CONFIG_SETTINGS + " setting object; actual is " + (typeof original));
                    original = <IUrlConfigSettings>{};
                } else {
                    if (sys.notNil(original.serviceNowUrl)) {
                        if (typeof original.serviceNowUrl !== "string") {
                            $log.warn("Expected string for serviceNowUrl setting value; actual is " + (typeof original.serviceNowUrl));
                            original.serviceNowUrl = "";
                        }
                        else
                            try { this.serviceNowUrl(new URL(original.serviceNowUrl)); }
                            catch (e) {
                                $log.error("Error parsing application setting " + name + ": " + e);
                                original.serviceNowUrl = "";
                            }
                    }
                    if (sys.notNil(original.gitServiceUrl)) {
                        if (typeof original.gitServiceUrl !== "string") {
                            $log.warn("Expected string for gitServiceUrl setting value; actual is " + (typeof original.gitServiceUrl));
                            original.gitServiceUrl = "";
                        }
                        else
                            try { this.gitServiceUrl(new URL(original.gitServiceUrl)); }
                            catch (e) {
                                $log.error("Error parsing application setting " + name + ": " + e);
                                original.gitServiceUrl = "";
                            }
                    }
                    if (sys.notNil(original.idpUrl)) {
                        if (typeof original.idpUrl !== "string") {
                            $log.warn("Expected string for idpUrl setting value; actual is " + (typeof original.idpUrl));
                            original.idpUrl = "";
                        }
                        else
                            try { this.gitServiceUrl(new URL(original.idpUrl)); }
                            catch (e) {
                                $log.error("Error parsing application setting " + name + ": " + e);
                                original.idpUrl = "";
                            }
                    }
                }
            } else
                original = <IUrlConfigSettings>{};
            let promise: ng.IPromise<IAppConfigJSON> = $http.get(JSON_RELATIVE_URL_APPCONFIGDATA).then((result: ng.IHttpPromiseCallbackArg<IAppConfigJSON>) => {
                return $q((resolve: ng.IQResolveReject<IAppConfigJSON>, reject: ng.IQResolveReject<any>) => {
                    if (typeof result.data !== "object") {
                        $log.warn(angular.toJson({
                            activity: "Invalid application configuration retrieval response data",
                            data: result.data
                        }, true));
                        reject("Expected object response type, actual is " + (typeof result.data));
                    } else if (result.data == null) {
                        $log.warn("Application configuration retrieval response data was null");
                        reject("Expected object response type, actual is null");
                    } else
                        resolve(result.data);
                });
            }, (reason: any) => {
                $log.error({
                    activity: "Unexpected error making application configuration data request",
                    reason: reason
                }, true);
            });
            this._loadNavigationSettings = promise.then((data: IAppConfigJSON) => {
                return $q((resolve: ng.IQResolveReject<INavigationJSON>, reject: ng.IQResolveReject<any>) => {
                    if (typeof data.navigation !== "object") {
                        $log.warn(angular.toJson({
                            activity: "Invalid Application Navigation configuration property",
                            navigation: data.navigation
                        }, true));
                        reject("Expected object navigation property type, actual is " + (typeof data.navigation));
                    } else if (data.navigation == null) {
                        $log.warn("Application Navigation configuration property was null");
                        reject("Expected object navigation property type, actual is null");
                    } else
                        resolve(data.navigation);
                });
            });
            promise.then((data: IAppConfigJSON) => {
                function applyUrlSetting(name: string, cfgValue: string, settingsValue: string, defaultValue: URL): URL {
                    if (sys.notNilOrEmpty(settingsValue))
                        try { return new URL(cfgValue); } catch (e) {
                            $log.warn(angular.toJson({
                                reason: "Error parsing URL",
                                name: name,
                                href: settingsValue,
                                error: e
                            }, true));
                        }
                    if (sys.notNilOrEmpty(cfgValue))
                        try { return new URL(cfgValue); } catch (e) {
                            $log.warn(angular.toJson({
                                reason: "Error parsing URL",
                                name: name,
                                href: cfgValue,
                                error: e
                            }, true));
                        }
                    return defaultValue;
                };
                let settings: IUrlConfigSettings = {
                    serviceNowUrl: this.serviceNowUrl(applyUrlSetting("serviceNowUrl", data.serviceNowUrl, original.serviceNowUrl, this.serviceNowUrl())).href,
                    gitServiceUrl: this.gitServiceUrl(applyUrlSetting("gitServiceUrl", data.gitServiceUrl, original.gitServiceUrl, this.gitServiceUrl())).href,
                    idpUrl: this.idpUrl(applyUrlSetting("idpUrl", data.idpUrl, original.idpUrl, this.idpUrl())).href
                };
                if (original.serviceNowUrl !== settings.serviceNowUrl || original.gitServiceUrl !== settings.gitServiceUrl || original.idpUrl !== settings.idpUrl) {
                    persistentStorageLoader.setObject<IUrlConfigSettings>(persistentStorageLoaderService.STORAGEKEY_URL_CONFIG_SETTINGS, settings);
                }
            });
        }
    }

    export function getServiceInjectable(): ng.Injectable<Function> { return [persistentStorageLoaderService.SERVICE_NAME, "$http", '$log', '$rootScope', '$q', Service]; }
}

namespace navConfigLoaderService {
    /**
     * Defines the service name as "navConfigLoader".
     * @export
     * @constant {string}
     */
    export const SERVICE_NAME: string = "navConfigLoader";

    /**
    * The relative path of the default page.
    * @export
    * @constant {string}
    * @description - This is for a path string only - This MUST NOT contain relative segment names ("." or ".."), URL query or fragment and MUST NOT start or end with "/".
    */
    export const DEFAULT_PAGE_PATH: string = "index.html";

    const DEFAULT_CURRENT_ITEM_CLASS: ReadonlyArray<string> = ["active", "nav-link"];
    const DEFAULT_SELECTED_ITEM_CLASS: ReadonlyArray<string> = ["active", "nav-link"];
    const DEFAULT_OTHER_ITEM_CLASS: ReadonlyArray<string> = ["nav-link"];

    /**
    * Converts a URL path to a fallback (default) page ID.
    * @static
    * @param {string} path - The URL Path to convert.
    * @returns {string} The fallback page ID for the given URL path.
    * @memberof appConfigData
    */
    export function toPageId(path: string): string {
        let arr: string[];
        let i: number;
        if (typeof path !== "string" || path.length == 0 || path == "/" || (arr = path.split("/").filter((value: string) => value.length > 0)).length === 0)
            arr = DEFAULT_PAGE_PATH.split("/").filter((value: string) => value.length > 0);
        let n: string = arr.pop();
        if ((i = n.lastIndexOf(".")) < 1 || i === n.length - 1) {
            let a: string[] = DEFAULT_PAGE_PATH.split("/").filter((value: string) => value.length > 0);
            arr.push(n);
            n = a[a.length - 1];
            if ((i = n.lastIndexOf(".")) < 0) {
                arr.push(n);
                return arr.join("/");
            }
        }
        arr.push(n.substr(0, i));
        return (arr.length === 1) ? arr[0] : arr.join("/");
    }

    /**
    * Represents a menu navigation item.
    *
    * @export
    * @class NavigationItem
    */
    export class NavigationItem {
        private _id: string;
        private _linkTitle: string;
        private _pageTitle: string;
        private _toolTip: string;
        private _sideNavHeading: string;
        private _url: string;
        private _isCurrentPage?: boolean;
        private _previousNavItem: NavigationItem | undefined;
        private _nextNavItem: NavigationItem | undefined;
        private _parentNavItem: NavigationItem | undefined;
        private _childNavItems: ReadonlyArray<NavigationItem>;

        /**
        * The unique identifier of the navigation menu item.
        *
        * @readonly
        * @type {string}
        * @memberof NavigationItem
        */
        get id(): string { return this._id; }

        /**
        * The display text for the current navigation menu item.
        *
        * @readonly
        * @type {string}
        * @memberof NavigationItem
        */
        get linkTitle(): string { return this._linkTitle; }

        /**
        * The title of the page that corresponds to the current navigation menu item.
        *
        * @readonly
        * @type {string}
        * @memberof NavigationItem
        */
        get pageTitle(): string { return this._pageTitle; }

        /**
        * The tooltip for the current navigation menu item.
        *
        * @readonly
        * @type {string}
        * @memberof NavigationItem
        */
        get toolTip(): string { return this._toolTip; }

        /**
        * The secondary navigation heading text for child navigation menu items.
        *
        * @readonly
        * @type {string}
        * @memberof NavigationItem
        */
        get sideNavHeading(): string { return this._sideNavHeading; }

        /**
        * The navigation menu hyperlink for the current item.
        *
        * @readonly
        * @type {string}
        * @memberof NavigationItem
        */
        get navMenuHref(): string { return (this.hasOrIsCurrentPage) ? "#" : this._url; }

        /**
        * The relative URL of the current navigation menu item.
        *
        * @readonly
        * @type {string}
        * @memberof NavigationItem
        */
        get url(): string { return this._url; }

        /**
        * Indicates whether the current navigation menu item represents the current page.
        *
        * @readonly
        * @type {boolean}
        * @memberof NavigationItem
        */
        get isCurrentPage(): boolean { return this._isCurrentPage === true; }

        /**
        * Indicates whether the current navigation menu item represents the current page or the parent of the current page.
        *
        * @readonly
        * @type {boolean}
        * @memberof NavigationItem
        */
        get hasOrIsCurrentPage(): boolean { return typeof this._isCurrentPage === "boolean"; }

        /**
        * Indicates whether the current navigation menu item represents an ancestor of the current page.
        *
        * @readonly
        * @type {boolean}
        * @memberof NavigationItem
        */
        get hasCurrentPage(): boolean { return this._isCurrentPage === false; }

        /**
        * The CSS class names to be applied to the anchor tag.
        *
        * @readonly
        * @type {ReadonlyArray<string>}
        * @memberof NavigationItem
        */
        get anchorCssClass(): ReadonlyArray<string> { return (this.isCurrentPage) ? this._appConfigData.currentItemClass() : ((this.hasOrIsCurrentPage) ? this._appConfigData.selectedItemClass() : this._appConfigData.otherItemClass()); }

        /**
        * The child navigation menu items to display within the secondary navigation menu.
        *
        * @readonly
        * @type {ReadonlyArray<NavigationItem>}
        * @memberof NavigationItem
        */
        get childNavItems(): ReadonlyArray<NavigationItem> { return this._childNavItems; }

        /**
        * Indicates whether the current navigation menu item has child menu items.
        *
        * @readonly
        * @type {boolean}
        * @memberof NavigationItem
        */
        get hasChildNavItem(): boolean { return this._childNavItems.length > 0; }

        /**
        * Indicates whether the current navigation menu item has sibling items that share the same parent menu item.
        *
        * @readonly
        * @type {boolean}
        * @memberof NavigationItem
        */
        get hasSiblingNavItem(): boolean { return sys.notNil(this._previousNavItem) || sys.notNil(this._nextNavItem); }

        /**
        * Indicates whether the current navigation menu item is a child item of another.
        *
        * @readonly
        * @type {boolean}
        * @memberof NavigationItem
        */
        get isNestedNavItem(): boolean { return sys.notNil(this._parentNavItem) }

        /**
        * Navigation menu items to be displayed as nested items within the secondary navigation menu.
        *
        * @readonly
        * @type {ReadonlyArray<NavigationItem>}
        * @memberof NavigationItem
        */
        get nestedSideNavChildItems(): ReadonlyArray<NavigationItem> { return (this.showNestedSideNavChildItems) ? this._childNavItems : []; }

        /**
        * Indicates whether the current navigation menu item represents the current page, is being displayed within the secondary navigation menu, and has child items.
        *
        * @readonly
        * @type {boolean}
        * @memberof NavigationItem
        */
        get showNestedSideNavChildItems(): boolean { return this.isCurrentPage && this.isNestedNavItem && this.hasChildNavItem && !this.hasSiblingNavItem; }

        /**
        * Gets the parent navigation menu item.
        *
        * @readonly
        * @type {(NavigationItem | undefined)}
        * @memberof NavigationItem
        */
        get parentNavItem(): NavigationItem | undefined { return this._parentNavItem; }

        /**
        * Creates an instance of NavigationItem.
        *
        * @param {appConfigDataService} _appConfigData - The appConfigData service provider.
        * @param {INavigationDefinition} navDef - The navigation menu item definition.
        * @memberof NavigationItem
        */
        constructor(private _appConfigData: Service, navDef: appConfigLoaderService.INavigationDefinition) {
            this._url = navDef.url;
            this._sideNavHeading = (typeof navDef.sideNavHeading === "string") ? navDef.sideNavHeading.trim() : "";
            this._linkTitle = (typeof navDef.linkTitle === "string" && navDef.linkTitle.length > 0) ? navDef.linkTitle : navDef.url;
            this._pageTitle = (typeof navDef.pageTitle === "string") ? navDef.pageTitle.trim() : "";
            this._toolTip = (typeof navDef.toolTip === "string") ? navDef.toolTip.trim() : ((this._pageTitle != this._linkTitle) ? this._pageTitle : "");
            if (typeof navDef.id !== "string" || (this._id = navDef.id).length === 0)
                this._id = toPageId(this._url);
            if (this._id === _appConfigData.currentPageId())
                this._isCurrentPage = true;
            this._childNavItems = NavigationItem.createNavItems(_appConfigData, navDef.items);
            this._childNavItems.forEach((item: NavigationItem) => { item._parentNavItem = this; }, this);
            if (this.isCurrentPage)
                this.getAncestorNavItems().forEach((item: NavigationItem) => { item._isCurrentPage = false; });
        }

        /**
        * Gets preceding sibling items for the current menu navigation item.
        *
        * @returns {NavigationItem[]}
        * @memberof NavigationItem
        */
        precedingSiblings(): NavigationItem[] {
            if (typeof this._previousNavItem === "undefined")
                return [];
            let result: NavigationItem[] = this._previousNavItem.precedingSiblings();
            result.push(this._previousNavItem);
            return result;
        }

        /**
        * Gets following sibling items for the current menu navigation item.
        *
        * @returns {NavigationItem[]}
        * @memberof NavigationItem
        */
        followingSiblings(): NavigationItem[] {
            let result: NavigationItem[] = [];
            for (let i: NavigationItem = this._nextNavItem; typeof i !== "undefined"; i = i._nextNavItem)
                result.push(i);
            return result;
        }

        /**
        * Gets all ancestor navigation menu items.
        *
        * @returns {NavigationItem[]}
        * @memberof NavigationItem
        */
        getAncestorNavItems(): NavigationItem[] {
            let result: NavigationItem[] = [];
            for (let i: NavigationItem = this._parentNavItem; typeof i !== "undefined"; i = i._parentNavItem)
                result.unshift(i);
            return result;
        }

        /**
        * Gets ancestor navigation menu items that do not appear in the primary navigation menu.
        *
        * @returns {NavigationItem[]}
        * @memberof NavigationItem
        */
        getBreadcrumbLinks(): NavigationItem[] {
            let result: NavigationItem[] = [];
            if (sys.notNil(this._parentNavItem) && sys.notNil(this._parentNavItem._parentNavItem))
                for (let i: NavigationItem = this._parentNavItem; typeof i !== "undefined"; i = i._parentNavItem)
                    result.unshift(i);
            return result;
        }

        /**
        * Handles the menu item click event.
        *
        * @param {BaseJQueryEventObject} [event]
        * @memberof NavigationItem
        * @description The purpose of this member is to prevent the default action for the navigation menu item that represents the current page.
        */
        onClick(event?: BaseJQueryEventObject): void {
            if (this.isCurrentPage && sys.notNil(event)) {
                if (!event.isDefaultPrevented)
                    event.preventDefault();
                if (!event.isPropagationStopped)
                    event.stopPropagation();
            }
        }

        toJSON(): { [key: string]: any } {
            return {
                childNavItems: (typeof this._childNavItems === "object" && this._childNavItems !== null) ? this._childNavItems.map((item: NavigationItem) => item.toJSON()) : this._childNavItems,
                id: this._id,
                linkTitle: this._linkTitle,
                pageTitle: this._pageTitle,
                toolTip: this._toolTip,
                url: this._url,
                isCurrentPage: this._isCurrentPage,
                sideNavHeading: this._sideNavHeading
            };
        }

        /**
        * Creates a navigation menu item objects from navigation menu definition objects.
        *
        * @static
        * @param {appConfigDataService} appConfigData - The application configuration data service provider.
        * @param {INavigationDefinition[]} [items] - Defines the navigation menu items to be created.
        * @returns {NavigationItem[]} The navigation menu item objects.
        * @memberof NavigationItem
        */
        static createNavItems(appConfigData: Service, items?: appConfigLoaderService.INavigationDefinition[]): NavigationItem[] {
            if (typeof items !== "object" || items === null)
                return [];
            let result: NavigationItem[] = items.filter((value: appConfigLoaderService.INavigationDefinition) => typeof value === "object" && value !== null).map((value: appConfigLoaderService.INavigationDefinition) => new NavigationItem(appConfigData, value));
            if (result.length > 0) {
                let previous: NavigationItem = result[0];
                for (let i: number = 1; i < result.length; i++)
                    previous = (result[0]._previousNavItem = previous)._nextNavItem = result[0];
            }
            return result;
        }

        /**
        * Finds the navigation menu item that represents the current page.
        *
        * @static
        * @param {ReadonlyArray<NavigationItem>} items - Navigation menu items to recursively search.
        * @returns {(NavigationItem | undefined)} The navigation menu item that represents the current page or undefined if none are found that represent the current page.
        * @memberof NavigationItem
        */
        static findCurrentItem(items: ReadonlyArray<NavigationItem>): NavigationItem | undefined {
            if (items.length == 0)
                return undefined;
            if (items.length == 1)
                return (items[0].isCurrentPage) ? items[0] : this.findCurrentItem(items[0]._childNavItems);
            for (let i: number = 0; i < items.length; i++) {
                if (items[i].hasOrIsCurrentPage)
                    return (items[i].isCurrentPage) ? items[i] : this.findCurrentItem(items[i]._childNavItems);
            }
        }

        /**
        * Creates an array of ancestor navigation menu items to be displayed as breadcrumb links.
        *
        * @static
        * @param {NavigationItem} [current] - The navigation menu item that represents the current page.
        * @returns {ReadonlyArray<NavigationItem>}
        * @memberof NavigationItem
        */
        static createSideNavBreadcrumbItems(current?: NavigationItem): ReadonlyArray<NavigationItem> {
            if (typeof current === "undefined" || typeof current._parentNavItem === "undefined")
                return [];
            let result: NavigationItem[] = [];
            while (typeof (current = current._parentNavItem)._parentNavItem !== "undefined")
                result.unshift(current);
            return result;
        }

        /**
        * Creates an array of sibling navigation menu items.
        *
        * @static
        * @param {NavigationItem} [current] - The navigation menu item that represents the current page.
        * @returns {ReadonlyArray<NavigationItem>}
        * @memberof NavigationItem
        */
        static createSideNavSiblingItems(current?: NavigationItem): ReadonlyArray<NavigationItem> {
            if (typeof current === "undefined" || typeof current._parentNavItem === "undefined")
                return [];
            let result: NavigationItem[] = [current];
            if (typeof current._previousNavItem === "undefined") {
                if (typeof current._nextNavItem === "undefined")
                    return [];
            } else
                for (let item: NavigationItem | undefined = current._previousNavItem; typeof item != "undefined"; item = item._previousNavItem)
                    result.unshift(item);
            for (let item: NavigationItem | undefined = current._nextNavItem; typeof item != "undefined"; item = item._nextNavItem)
                result.push(item);
            return result;
        }
    }

    export class Service {
        private _currentPageId: string;
        private _currentPageURL: URL;
        private _relativePagePath: string;
        private _pageTitle: string;
        private _currentItemClass: string[] = <string[]>DEFAULT_CURRENT_ITEM_CLASS;
        private _selectedItemClass: string[] = <string[]>DEFAULT_SELECTED_ITEM_CLASS;
        private _otherItemClass: string[] = <string[]>DEFAULT_OTHER_ITEM_CLASS;
        private _loadTopNavItems: ng.IPromise<NavigationItem[]>;
        private _loadPageTitle: ng.IPromise<string>;
        private _loadCurrentItem: ng.IPromise<NavigationItem | undefined>;
        [Symbol.toStringTag]: string;

        /**
        * Gets the current page ID.
        *
        * @returns {string} The value of the "content" attribute for the html meta tag with the name attribute of "app:pageId".
        * @memberof navConfigLoaderService.Service
        */
        currentPageId(): string { return this._currentPageId; }

        /**
        * Gets relative path to the current page.
        *
        * @returns {string}
        * @memberof navConfigLoaderService.Service
        */
        pagePath(): string { return this._relativePagePath; }

        /**
        * Gets the CSS class names to apply to navigation menu items that are ancestors of the item that represents the current page.
        *
        * @returns {string[]}
        * @memberof navConfigLoaderService.Service
        */
        currentItemClass(): string[] { return this._currentItemClass; }

        /**
        * Gets the CSS class names to apply to the navigation menu item that represents the current page.
        *
        * @returns {string[]}
        * @memberof navConfigLoaderService.Service
        */
        selectedItemClass(): string[] { return this._selectedItemClass; }

        /**
        * Gets the CSS class names to apply to the navigation menu item that do not represent the current page or any of its ancestors.
        *
        * @returns {string[]}
        * @memberof navConfigLoaderService.Service
        */
        otherItemClass(): string[] { return this._otherItemClass; }

        /**
        * Gets the navigation menu items that appear in the primary navigation menu.
        *
        * @returns {ng.IPromise<NavigationItem[]>}
        * @memberof navConfigLoaderService.Service
        */
        loadTopNavItems(): ng.IPromise<NavigationItem[]> { return this._loadTopNavItems; }

        loadPageTitle(): ng.IPromise<string> { return this._loadPageTitle; }

        loadCurrentItem(): ng.IPromise<NavigationItem | undefined> { return this._loadCurrentItem; }

        constructor(appConfigLoader: appConfigLoaderService.Service, $window: ng.IWindowService, $document: ng.IDocumentService, $q: ng.IQService) {
            this[Symbol.toStringTag] = SERVICE_NAME;
            let headElement: JQuery = $document.find('head').first();
            let titleElement: JQuery = headElement.find('title');
            if (titleElement.length == 0) {
                headElement.add(titleElement = $('<title></title>'));
                this._pageTitle = "";
            } else
                this._pageTitle = titleElement.text().trim();
            try { this._currentPageURL = new URL($window.location.href); } catch {
                // Just in case
                this._currentPageURL = new URL("http://localhost");
                this._currentPageURL.pathname = DEFAULT_PAGE_PATH;
            }
            let segments: string[] = (typeof this._currentPageURL.pathname !== "string" || this._currentPageURL.pathname.length == 0 || this._currentPageURL.pathname == "/") ? [] : this._currentPageURL.pathname.split("/").filter((n: string) => n.length > 0);
            if (segments.length == 0)
                segments = DEFAULT_PAGE_PATH.split("/");
            else if (!(/\.html?$/i).test(segments[segments.length - 1])) {
                let arr: string[] = DEFAULT_PAGE_PATH.split("/");
                segments.push(arr[arr.length - 1]);
            }
            this._currentPageURL.pathname = "/" + (this._relativePagePath = (segments.length == 1) ? segments[0] : segments.join("/"));
            if ((this._currentPageId = headElement.find('meta[name="app:pageId"]').attr("content")).length == 0)
                this._currentPageId = toPageId(this._currentPageURL.pathname);
            if (this._pageTitle.length === 0)
                this._pageTitle = this._currentPageId;
            let svc: Service = this;
            this._loadTopNavItems = appConfigLoader.loadNavigationSettings().then((navConfig: appConfigLoaderService.INavigationJSON) => {
                return $q((resolve: ng.IQResolveReject<NavigationItem[]>, reject: ng.IQResolveReject<any>) => {
                    if (typeof navConfig.items !== "object") {
                        appConfigLoader.$log.warn("Invalid navigation configuration items property type");
                        reject("Expected object items property type; actual is " + (typeof navConfig.items));
                    } else if (navConfig.items === null) {
                        appConfigLoader.$log.warn("Navigation configuration items property is null");
                        reject("Expected object items property type; actual is null");
                    } else if (Array.isArray(navConfig.items)) {
                        let items: appConfigLoaderService.INavigationDefinition[] = navConfig.items.filter((i: appConfigLoaderService.INavigationDefinition) => { return (typeof i === "object" && i !== null); });
                        if (items.length == 0) {
                            appConfigLoader.$log.warn("Navigation configuration items property is empty");
                            reject("Items property is empty.");
                        }
                        else
                            try { resolve(NavigationItem.createNavItems(svc, items)); } catch (e) {
                                appConfigLoader.$log.error(angular.toJson({
                                    reason: "Unexpected error importing navigation configuration items",
                                    error: e
                                }, true));
                                reject(e);
                            }
                    } else {
                        appConfigLoader.$log.warn("Navigation configuration items property is not an array");
                        reject("Items property is not an array");
                    }
                });
            });
            this._loadCurrentItem = this._loadTopNavItems.then((items: NavigationItem[]) => { return NavigationItem.findCurrentItem(items); });
            this._loadPageTitle = this._loadCurrentItem.then((item: NavigationItem | undefined) => {
                if (sys.notNil(item) && item.pageTitle.length > 0)
                    this._pageTitle = item.pageTitle;
                else if (this._pageTitle.trim() === titleElement.text().trim())
                    return this._pageTitle;
                titleElement.text(this._pageTitle);
                return this._pageTitle;
            });
        }
    }

    export function getServiceInjectable(): ng.Injectable<Function> { return [appConfigLoaderService.SERVICE_NAME, '$window', '$document', '$q', Service]; }
}

namespace appModalPopupService {
    /**
     * Defines the service name as "appModalPopup".
     * @export
     * @constant {string}
    */
    export const SERVICE_NAME: string = "appModalPopup";
    export const DIRECTIVE_NAME: string = "appModalPopupDialog";
    export const JQUERY_SELECTOR_DIALOG: string = "#appModalPopupDialog";

    /**
    * Severity of message for the modal dialog.
    * @typedef {('info' | 'warning' | 'danger' | 'primary' | 'success')} DialogMessageType
    */
    export type DialogMessageType = 'info' | 'warning' | 'danger' | 'primary' | 'success';

    /**
    * Defines a button to be displayed in a modal popup dialog.
    *
    * @export
    * @interface IPopupDialogButtonDefinition
    * @template T The type of value returned when the associated button is clicked.
    */
    export interface IPopupDialogButtonDefinition<T> {
        /**
        * Value to be returned when the associated button is clicked.
        *
        * @type {T}
        * @memberof IPopupDialogButtonDefinition
        */
        value?: T;

        /**
        * The text to be displayed for the button.
        *
        * @type {string}
        * @memberof IPopupDialogButtonDefinition
        */
        displayText: string;
        isDefault?: boolean;
    }

    interface IPopupDialogButtonConfig extends IPopupDialogButtonDefinition<any> {
        class: string[];
        closePopupDialog(event: BaseJQueryEventObject): void;
    }

    interface IDirectiveScope {
        title: string;
        class: string[];
        message: string;
        buttons: IPopupDialogButtonConfig[];
        closePopupDialog(event: BaseJQueryEventObject, value?: any): void;
    }

    export class Service {
        private _isVisible: boolean = false;
        private _type: DialogMessageType = "info";
        private _onClose?: Function;
        private _thisObj?: any;
        private _hasThis: boolean = false;
        private _scope: IDirectiveScope;
        [Symbol.toStringTag]: string;
        constructor(public appConfigLoader: appConfigLoaderService.Service, $window: ng.IWindowService, $document: ng.IDocumentService, $q: ng.IQService) {
            this[Symbol.toStringTag] = SERVICE_NAME;
            let svc: Service = this;
            this._scope = { buttons: [], class: [], closePopupDialog: (event: BaseJQueryEventObject) => { svc.closePopupDialog(); }, message: "", title: "" };
        }

        showPopupDialog(message: string, type?: DialogMessageType, title?: string): void;
        showPopupDialog(message: string, onClose: Function, type?: DialogMessageType, title?: string): void;
        showPopupDialog<T>(message: string, onClose: { (this: T): void }, type: DialogMessageType | null | undefined, title: string | null | undefined, thisObj: T): void;
        showPopupDialog<T>(message: string, onClose: { (result: T): void }, buttons: IPopupDialogButtonDefinition<T>[], type?: DialogMessageType, title?: string): void;
        showPopupDialog<TResult, TThis>(message: string, onClose: { (this: TThis, result: TResult): void }, buttons: IPopupDialogButtonDefinition<TResult>[], type: DialogMessageType | null | undefined, title: string | null | undefined, thisObj: TThis): void;
        showPopupDialog(message: string, arg1?: Function | string, arg2?: IPopupDialogButtonDefinition<any>[] | string | null | undefined, arg3?: string, arg4?: any, thisObj?: any): void {
            let title: string;
            let buttons: IPopupDialogButtonDefinition<any>[];
            if (this._isVisible)
                this.closePopupDialog();
            this._type = "info";
            this._onClose = undefined;
            if (arguments.length < 2 || typeof arg1 === "string") {
                this._type = <DialogMessageType>arg1;
                title = <string>arg2;
                this._hasThis = false;
            } else if (arguments.length > 5) {
                this._onClose = <Function>arg1;
                buttons = <IPopupDialogButtonDefinition<any>[]>arg2;
                this._type = <DialogMessageType>arg3;
                title = <string>arg4;
                this._hasThis = true;
                this._thisObj = thisObj;
            } else {
                this._onClose = <Function>arg1;
                if (arguments.length < 3 || typeof arg2 === "string" || sys.isNil(arg2)) {
                    this._type = <DialogMessageType>arg2;
                    title = <string>arg3;
                    thisObj = arg4;
                    this._hasThis = (arg2.length == 5);
                } else {
                    this._type = <DialogMessageType>arg3;
                    title = <string>arg4;
                    buttons = <IPopupDialogButtonDefinition<any>[]>arg2;
                    this._hasThis = false;
                }
            }
            if (sys.isNilOrWhiteSpace(title)) {
                switch (this._type) {
                    case 'warning':
                        this._scope.title = 'Warning';
                        break;
                    case 'danger':
                        this._scope.title = 'Critical';
                        break;
                    case 'success':
                        this._scope.title = 'Success';
                        break;
                    default:
                        this._scope.title = 'Notice';
                        this._type = "info";
                        break;
                }
            } else
                this._scope.title = title;
            this._scope.message = message;
            switch (this._type) {
                case 'warning':
                    this._scope.class = ['alert', 'alert-warning'];
                    break;
                case 'danger':
                    this._scope.class = ['alert', 'alert-danger'];
                    break;
                case 'success':
                    this._scope.class = ['alert', 'alert-success'];
                    break;
                default:
                    this._scope.class = ['alert', 'alert-info'];
                    break;
            }
            let svc: Service = this;
            if (sys.isNil(buttons) || (buttons = buttons.filter((value: IPopupDialogButtonDefinition<any>) => sys.notNil)).length == 0)
                this._scope.buttons = [{
                    displayText: "OK", isDefault: false, closePopupDialog: (event: BaseJQueryEventObject) => {
                        sys.preventEventDefault(event, true);
                        svc._closePopupDialog();
                    }, class: ["btn", "btn-primary"]
                }];
            else {
                let hasDefault: boolean = false;
                this._scope.buttons = buttons.map((value: IPopupDialogButtonDefinition<any>) => {
                    if (hasDefault)
                        return {
                            displayText: value.displayText, value: value.value, isDefault: false, closePopupDialog: (event: BaseJQueryEventObject) => {
                                sys.preventEventDefault(event, true);
                                svc._closePopupDialog(value.value);
                            }, class: ["btn", "btn-secondary"]
                        };
                    hasDefault = value.isDefault === true;
                    return {
                        displayText: value.displayText, value: value.value, isDefault: hasDefault, closePopupDialog: (event: BaseJQueryEventObject) => {
                            sys.preventEventDefault(event, true);
                            svc._closePopupDialog(value.value);
                        }, class: ["btn", (hasDefault) ? "btn-primary" : "btn-secondary"]
                    };
                });
                if (!hasDefault)
                    this._scope.buttons[0].class[1] = "btn-primary";
            }
            $(JQUERY_SELECTOR_DIALOG).modal('show');
        }
        private _closePopupDialog(value?: any): void {
            $(JQUERY_SELECTOR_DIALOG).modal('hide');
            if (typeof this._onClose !== "function")
                return;
            if (arguments.length == 0) {
                if (this._hasThis)
                    this._onClose.call(this._thisObj);
                else
                    this._onClose();
            } else if (this._hasThis)
                this._onClose.call(this._thisObj, value);
            else
                this._onClose(value);
        }

        closePopupDialog(value?: any): void {
            if (this._isVisible) {
                if (arguments.length == 0) {
                    let btn: IPopupDialogButtonConfig[] = this._scope.buttons.filter((value: IPopupDialogButtonConfig) => value.isDefault);
                    if (btn.length == 0)
                        this._closePopupDialog();
                    else
                        this._closePopupDialog(btn[0].value);
                }
                else
                    this._closePopupDialog(value);
            }
        }

        static getDirectiveInjectable(): ng.Injectable<ng.IDirectiveFactory> {
            return [SERVICE_NAME, (appModalPopup: Service) => <ng.IDirective>{
                restrict: "E",
                link: (scope: IDirectiveScope & ng.IScope, element: JQuery, attrs: ng.IAttributes) => {
                    scope.buttons = appModalPopup._scope.buttons;
                    scope.class = appModalPopup._scope.class;
                    scope.closePopupDialog = appModalPopup._scope.closePopupDialog;
                    scope.message = appModalPopup._scope.message;
                    scope.title = appModalPopup._scope.title;
                    appModalPopup._scope = scope;
                },
                scope: true,
                templateUrl: "Template/" + SERVICE_NAME + ".htm"
            }];
        }
    }

    export function getServiceInjectable(): ng.Injectable<Function> { return [appConfigLoaderService.SERVICE_NAME, '$window', '$document', '$q', Service]; }
}

namespace urlInputDirective {
    /**
     * Defines the directive name as "urlInput".
     *
     * @todo Rename to inputUrl to use as <input:url />
     * @export
     * @constant {string}
     */
    export const DIRECTIVE_NAME: string = "urlInput";

    const DEFAULT_CURRENT_ITEM_CLASS: ReadonlyArray<string> = ["active", "nav-link"];
    const DEFAULT_SELECTED_ITEM_CLASS: ReadonlyArray<string> = ["active", "nav-link"];
    const DEFAULT_OTHER_ITEM_CLASS: ReadonlyArray<string> = ["nav-link"];

    /**
     *
     * @export
     * @enum {string}
     */
    export enum cssValidationClass {
        isValid = 'is-valid',
        isInvalid = 'is-invalid'
    }

    /**
     *
     *
     * @export
     * @enum {string}
     */
    export enum cssFeedbackClass {
        isValid = 'valid-feedback',
        isInvalid = 'invalid-feedback'
    }

    /**
     *
     *
     * @export
     * @enum {string}
     */
    export enum cssAlertClass {
        alert = 'alert',
        danger = 'alert-danger',
        dark = 'alert-dark',
        dismissible = 'alert-dismissible',
        info = 'alert-info',
        heading = 'alert-heading',
        light = 'alert-light',
        link = 'alert-link',
        primary = 'alert-primary',
        secondary = 'alert-secondary',
        success = 'alert-success',
        warning = 'alert-warning'
    }

    /**
     *
     *
     * @export
     * @enum {string}
     */
    export enum cssBorderClass {
        border = 'border',
        danger = 'border-danger',
        dark = 'border-dark',
        info = 'alert-info',
        light = 'border-light',
        primary = 'border-primary',
        secondary = 'border-secondary',
        success = 'border-success',
        warning = 'border-warning'
    }

    /**
     * Attributes that can be used with the urlInput directive.
     *
     * @export
     * @interface IDirectiveAttributes
     * @example <caption>Example of a required URL.</caption>
     * ```
     * <!-- Where gitServiceUrl == "https://yourinstance.servicenow.com" -->
     * <url-input ng-model="serviceNowUrl" is-valid="gitUrlIsValid" required="true" label-text="ServiceNow URL" />
     * <!-- Model gitUrlIsValid will be set to true and transpiled code will be: -->
     * <label for="urlInput:0">ServiceNow URL</label>
     * <input type="text" class="valid-feedback" id="urlInput:0" value="https://yourinstance.servicenow.com" />
     * ```
     * @example <caption>Example of a required URL that is initially empty.</caption>
     * ```
     * <!-- Where gitServiceUrl == "" -->
     * <url-input ng-model="serviceNowUrl" is-valid="gitUrlIsValid" required="true" label-text="ServiceNow URL" />
     * <!-- Model gitUrlIsValid will be set to false and transpiled code will be: -->
     * <label for="urlInput:0">ServiceNow URL</label>
     * <input type="text" class="invalid-feedback" id="urlInput:0" value="" />
     * <div class="alert alert-warning">URL not provided.</div>
     * ```
     */
    export interface IDirectiveAttributes {
        /**
         * Model containing validated URL.
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        textModel: string,

        /**
         * Indicates whether the content of the input text field represents a valid URL.
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        isValid?: boolean,

        /**
         * Indicates whether a path is allowed in the URL.
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        allowPath?: boolean,

        /**
         * Indicates whether a fragment (hash) is allowed in the URL.
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        allowFragment?: boolean,

        /**
         * Indicates whether a query string is allowed in the URL.
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        allowQuery?: boolean,

        /**
         * Indicates whether the URL can be relative.
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        allowRelative?: boolean,

        /**
         * Indicates whether the URL is required (cannot be blank).
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        required?: boolean,

        /**
         * The text to display for the input field label.
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        labelText: string,

        /**
         * The value if the id attribute of the input text field.
         *
         * @type {string}
         * @memberof IDirectiveAttributes
         */
        textBoxId?: string
    }

    interface IDirectiveScope extends IDirectiveAttributes, ng.IScope {
        ctrl: Controller;
        text: string;
        textBoxId: string;
        inputClass: string[];
        messageClass: string[];
        validationMessage: string;
        isValid: boolean;
    }

    export class Controller {
        constructor(private $scope: IDirectiveScope) {
            let ctrl: Controller = this;
            if (typeof $scope.textBoxId !== "string" || $scope.textBoxId.trim().length == 0) {
                let i: number = 0;
                let id: string = DIRECTIVE_NAME + ":" + i++;
                for (let e: JQuery = $(id); sys.notNil(e) && e.length > 0; e = $(id))
                    id = DIRECTIVE_NAME + ":" + i++;
                $scope.textBoxId = id;
            }
            $scope.text = $scope.validationMessage = "";
            $scope.inputClass = ["form-control", cssValidationClass.isValid];
            $scope.messageClass = [];
            $scope.isValid = true;
            $scope.$watch('text', (value: string) => { ctrl.validate((typeof value !== "string") ? "" : value); });
            $scope.$watch('ngModel', (value: string) => {
                if (typeof value === "string" && value !== $scope.text)
                    $scope.text = value;
            });
            $scope.$watchGroup(["required", "allowRelative", "allowPath", "allowQuery", "allowFragment"], () => { ctrl.validate((typeof $scope.text !== "string") ? "" : $scope.text); });
        }

        validate(value: string): boolean {
            if (typeof value != "string" || value.trim().length === 0) {
                if (this.$scope.required === true) {
                    this.$scope.inputClass = ["form-control", cssBorderClass.warning];
                    this.$scope.messageClass = [cssFeedbackClass.isInvalid];
                    this.$scope.validationMessage = "URL not provided.";
                    this.$scope.isValid = false;
                } else {
                    this.$scope.isValid = true;
                    this.$scope.inputClass = ["form-control", cssValidationClass.isValid];
                    this.$scope.messageClass = [];
                    this.$scope.validationMessage = "";
                    this.$scope.textModel = "";
                }
                return this.$scope.isValid;
            }
            let url: URL | undefined;
            try { url = new URL(value); } catch {
                let i: number = value.indexOf('#');
                let hash: string;
                if (i > -1) {
                    hash = value.substr(i);
                    value = value.substr(0, i);
                } else
                    hash = '';
                let search: string;
                i = value.indexOf('?');
                if (i > -1) {
                    search = value.substr(i);
                    value = value.substr(0, i);
                } else
                    search = '';
                try { url = new URL(((value.length > 0) ? new URL(value, 'http://tempuri.org') : new URL('http://tempuri.org')) + search + hash); }
                catch (err) {
                    this.$scope.inputClass = ["form-control", cssValidationClass.isInvalid];
                    this.$scope.messageClass = [cssFeedbackClass.isInvalid];
                    this.$scope.validationMessage = "Invalid URL format: " + err;
                    this.$scope.isValid = false;
                    return false;
                }
                if (this.$scope.allowRelative !== true) {
                    this.$scope.inputClass = ["form-control", cssValidationClass.isInvalid];
                    this.$scope.messageClass = [cssFeedbackClass.isInvalid];
                    this.$scope.validationMessage = "Relative URL not allowed";
                    this.$scope.isValid = false;
                    return false;
                }
            }
            if (sys.isNilOrWhiteSpace(url.host))
                this.$scope.validationMessage = "Invalid URL format: Host name not specified";
            else if (url.hash.length > 0 && this.$scope.allowFragment !== true)
                this.$scope.validationMessage = "URL fragment not allowed";
            else if (url.search.length > 0 && this.$scope.allowQuery !== true)
                this.$scope.validationMessage = "URL query string not allowed";
            else if (url.pathname.length > 0 && url.pathname != "/" && this.$scope.allowPath !== true)
                this.$scope.validationMessage = "URL path not allowed";
            else {
                this.$scope.isValid = true;
                this.$scope.inputClass = ["form-control", cssValidationClass.isValid];
                this.$scope.messageClass = [];
                this.$scope.validationMessage = "";
                this.$scope.ngModel = value;
                return true;
            }
            this.$scope.inputClass = ["form-control", cssValidationClass.isInvalid];
            this.$scope.messageClass = [cssFeedbackClass.isInvalid];
            this.$scope.isValid = false;
            return false;
        }

        static createDirective(): ng.IDirective {
            return <ng.IDirective>{
                restrict: "E",
                controller: ['$scope', Controller],
                controllerAs: 'ctrl',
                scope: {
                    ngModel: '=',
                    isValid: '=?',
                    allowPath: '=?',
                    allowFragment: '=?',
                    allowQuery: '=?',
                    allowRelative: '=?',
                    required: '=?',
                    labelText: '@',
                    textBoxId: '@?'
                },
                template: '<div class="form-group"><label for="{{textBoxId}}">{{labelText}}</label><input type="text" ng-class="inputClass" id="{{textBoxId}}" ng-model="text" /><div ng-class="messageClass" ng-hide="isValid">{{validationMessage}}</div></div>'
            };
        }
    }

    export function getDirectiveInjectable(): ng.Injectable<ng.IDirectiveFactory> { return Controller.createDirective; }
}

namespace configUrlDirective {
    /**
     * Defines the directive name as "configUrl".
     * @export
     * @constant {string}
     */
    export const DIRECTIVE_NAME: string = "configUrl";

    /**
     * Represents attributes that can be used with the configUrl directive.
     * @export
     * @interface IDirectiveAttributes
     * @example <caption>Example for simple url text.</caption>
     * ```
     * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" -->
     * <config-url base="idp" />
     * <!-- Transpiled code will be: -->
     * https://idp.f5server.com/
     * ```
     * @example <caption>Example using directive as attribute.</caption>
     * ```
     * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" -->
     * <div class="detail" config-url base="idp"></div>
     * <!-- Transpiled code will be: -->
     * <div class="detail">https://idp.f5server.com/</div>
     * ```
     * @example <caption>Example with a relative URL.</caption>
     * ```
     * <!-- Where Service#gitServiceUrl() returns "https://github.com/your-root/" -->
     * <config-url base="git" href="myRepo.git" />
     * <!-- Transpiled code will be: -->
     * https://github.com/your-root/myRepo.git
     * ```
     * @example <caption>Example for generating a hyperlink.</caption>
     * ```
     * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <config-url base="sn" href="login.do" as-link="true" />
     * <!-- Transpiled code will be: -->
     * <a href="https://yourinstance.servicenow.com/login.do" target="_blank">https://yourinstance.servicenow.com/login.do</a>
     * ```
     * @example <caption>Example for generating including a query parameter and css classes.</caption>
     * ```
     * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <config-url base="sn" href="nav_to.do" q="uri" v="/sys_user_group_list.do" as-link="true" link-class="myClass" />
     * <!-- Transpiled code will be: -->
     * <a href="https://yourinstance.servicenow.com/nav_to.do?uri=%2Fsys_user_group_list.do" target="_blank" class="myClass">https://yourinstance.servicenow.com/nav_to.do?uri=%2Fsys_user_group_list.do</a>
     * ```
     */
    export interface IDirectiveAttributes {
        /**
         * The name of the base URL setting.
         * @type {UrlSettingsNames}
         * @memberof IDirectiveAttributes
         * @example <caption>Example that emits the url of ServiceNow instance.</caption>
         * ```
         * <config-url base="sn" />
         * ```
         * @example <caption>Example that emits the url of git service.</caption>
         * ```
         * <config-url base="git" />
         * ```
         * @example <caption>Example that emits the url of identity provider.</caption>
         * ```
         * <config-url base="idp" />
         * ```
         */
        base: appConfigLoaderService.UrlSettingsNames;

        /**
         * The relative URL.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @example
         * ```
         * <!-- Where Service#gitServiceUrl() returns "https://github.com/your-root/" -->
         * <config-url base="git" href="myRepo.git" />
         * <!-- Transpiled code will be: -->
         * https://github.com/your-root/myRepo.git
         * ```
         */
        href?: string;

        /**
         * The name of the query parameter to include.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @example
         * ```
         * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
         * <config-url base="sn" href="sys_user_group_list.do" q="XML" as-link="true" />
         * <!-- Transpiled code will be: -->
         * <a href="https://yourinstance.servicenow.com/sys_user_group_list.do?XML" target="_blank">https://yourinstance.servicenow.com/sys_user_group_list.do?XML</a>
         * ```
         */
        q?: string;

        /**
         * The value for the query parameter to be included.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @description This is ignored if {@link IDirectiveAttributes#q} is empty or not defined.
         * @example
         * ```
         * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
         * <config-url base="sn" href="nav_to.do" q="uri" v="/sys_user_group_list.do" as-link="true" link-class="myClass" />
         * <!-- Transpiled code will be: -->
         * <a href="https://yourinstance.servicenow.com/nav_to.do?uri=%2Fsys_user_group_list.do" target="_blank" class="myClass">https://yourinstance.servicenow.com/nav_to.do?uri=%2Fsys_user_group_list.do</a>
         * ```
         */
        v?: string;

        /**
         * Whether to render as an anchor tag (default is false - render as plain text).
         * @type {("true" | "false")}
         * @memberof IDirectiveAttributes
         * @example
         * ```
         * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" -->
         * <config-url base="idp" as-link="true" />
         * <!-- Transpiled code will be: -->
         * <a href="https://idp.f5server.com/" target="_blank">https://idp.f5server.com/</a>
         * ```
         */
        asLink?: "true" | "false";

        /**
         * Specifies an alternate target frame.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @description This is ignored if {@link IDirectiveAttributes#asLink} is false or not specified.
         * @example
         * ```
         * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" -->
         * <config-url base="idp" as-link="true" target="_parent" />
         * <!-- Transpiled code will be: -->
         * <a href="https://idp.f5server.com/" target="_parent">https://idp.f5server.com/</a>
         * ```
         */
        target?: string;

        /**
         * Define class names for the rendered anchor tag.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @description This is ignored if {@link IDirectiveAttributes#asLink} is false or not specified.
         * @example
         * ```
         * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" -->
         * <config-url base="idp" as-link="true" link-class="myClass" />
         * <!-- Transpiled code will be: -->
         * <a href="https://idp.f5server.com/" target="_blank" class="myClass">https://idp.f5server.com/</a>
         * ```
         */
        linkClass?: string;

        /**
         * Bind to a model for class name(s).
         * @type {string}
         * @memberof IDirectiveAttributes
         * @description This is ignored if {@link IDirectiveAttributes#asLink} is false or not specified.
         * @example
         * ```
         * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" and $scope.myClass = ["nav", "nav-link"] -->
         * <config-url base="idp" as-link="true" link-class="p-1" link-class-model="myClass" />
         * <!-- Transpiled code will be: -->
         * <a href="https://idp.f5server.com/" target="_blank" class="p-1 nav nav-link">https://idp.f5server.com/</a>
         * ```
         */
        linkClassModel?: string;
    }

    function getConfigUrlDirectiveDirective(appConfigLoader: appConfigLoaderService.Service): ng.IDirective {
        return <ng.IDirective>{
            restrict: "AE",
            link: (scope: IDirectiveAttributes & ng.IScope, element: JQuery, attrs: IDirectiveAttributes & ng.IAttributes) => {
                function updateText() {
                    let url: URL = (typeof scope.q === "string" && scope.q.length > 0) ?
                        (((typeof scope.v === "string") ? appConfigLoader.createUrl(scope.base, scope.href, scope.q, scope.v) :
                            appConfigLoader.createUrl(scope.base, scope.href, scope.q))) : appConfigLoader.createUrl(scope.base, scope.href);
                    let a: JQuery = element.children("a");
                    if (sys.asBoolean(scope.asLink)) {
                        if (a.length == 0) {
                            element.text("");
                            a = element.add("<a></a>");
                        }
                        a.attr("href", url.href);
                        a.attr("target", (typeof scope.target === "string" && scope.target.length > 0) ? scope.target : "_blank");
                        let c: string[] = (typeof scope.linkClass === "string" && scope.linkClass.length > 0) ?
                            sys.unique(((typeof scope.linkClassModel === "string" && scope.linkClassModel.length > 0) ?
                                scope.linkClass.split(sys.whitespaceRe).concat(scope.linkClassModel.split(sys.whitespaceRe)) :
                                scope.linkClass.split(sys.whitespaceRe)).filter((v: string) => v.length > 0)) :
                            ((typeof scope.linkClassModel === "string" && scope.linkClassModel.length > 0) ? sys.unique(scope.linkClassModel.split(sys.whitespaceRe).filter((v: string) => v.length > 0)) : []);
                        if (c.length > 0)
                            a.attr("class", c.join(" "));
                        else {
                            let s: string = a.attr("class");
                            if (typeof s === "string" && s.length > 0)
                                a.removeAttr("class");
                        }
                        a.text(url.href);
                    } else {
                        if (a.length > 0)
                            a.remove();
                        element.text(url.href);
                    }
                }
                appConfigLoader.onServiceNowUrlChanged(scope, (value: URL) => {
                    if (scope.base === "sn")
                        updateText();
                });
                appConfigLoader.onGitServiceUrlChanged(scope, (value: URL) => {
                    if (scope.base === "git")
                        updateText();
                });
                appConfigLoader.onIdpUrlChanged(scope, (value: URL) => {
                    if (scope.base === "idp")
                        updateText();
                });
                updateText();
                scope.$watchGroup(["base", "href", "q", "v", "asLink", "target"], () => { updateText(); });
            },
            scope: { base: "@", href: "@?", q: "@?", v: "@?", asLink: "@?", linkClass: "@?", linkClassModel: "=?" }
        }
    }

    export function getDirectiveInjectable(): ng.Injectable<ng.IDirectiveFactory> { return [appConfigLoaderService.SERVICE_NAME, getConfigUrlDirectiveDirective]; }
}

namespace aConfigLinkDirective {
    /**
     * Defines the directive name as "aConfigLink".
     * @export
     * @constant {string}
     */
    export const DIRECTIVE_NAME: string = "aConfigLink";

    const DEFAULT_TARGET = "_blank";

    /**
     * Represents attributes that can be used with the aConfigLink directive.
     * @export
     * @interface IDirectiveAttributes
     * @example <caption>Example for simple url text.</caption>
     * ```
     * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" -->
     * <a:config-link base="idp">IDP<a:config-link>
     * <!-- Transpiled code will be: -->
     * <a href="https://idp.f5server.com/" target="_blank">IDP</a>
     * ```
     * @example <caption>Example with a relative URL.</caption>
     * ```
     * <!-- Where Service#gitServiceUrl() returns "https://github.com/your-root/" -->
     * <a:config-link base="git" href="myRepo.git">Git Repository<a:config-link>
     * <!-- Transpiled code will be: -->
     * <a href="https://github.com/your-root/myRepo.git" target="_blank">Git Repository</a>
     * ```
     * @example <caption>Example for generating including a query parameter.</caption>
     * ```
     * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <a:config-link base="sn" href="nav_to.do" q="uri" v="/sys_user_group_list.do">Group List<a:config-link>
     * <!-- Transpiled code will be: -->
     * <a href="https://yourinstance.servicenow.com/nav_to.do?uri=%2Fsys_user_group_list.do" target="_blank">Group List</a>
     * ```
     * @example <caption>Example for generating including css classes.</caption>
     * ```
     * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <a:config-link base="sn" href="nav_to.do" link-class="myClass">Group List<a:config-link>
     * <!-- Transpiled code will be: -->
     * <a href="https://yourinstance.servicenow.com/" target="_blank" class="myClass">Group List</a>
     * ```
     */
    export interface IDirectiveAttributes {
        /**
         * The name of the base URL setting.
         * @type {UrlSettingsNames}
         * @memberof IDirectiveAttributes
         * @example <caption>Example that emits a link to the ServiceNow instance.</caption>
         * ```
         * <a:config-link base="sn">ServiceNow</a:config-link>
         * ```
         * @example <caption>Example that emits a link to the git service.</caption>
         * ```
         * <a:config-link base="git">Git Service</a:config-link>
         * ```
         * @example <caption>Example that emits a link to the identity provider.</caption>
         * ```
         * <a:config-link base="idp">Identity Provider</a:config-link>
         * ```
         */
        base: appConfigLoaderService.UrlSettingsNames;

        /**
         * The relative URL.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @example
         * ```
         * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" -->
         * <a:config-link base="idp">IDP<a:config-link>
         * <!-- Transpiled code will be: -->
         * <a href="https://idp.f5server.com/" target="_blank">IDP</a>
         * ```
         */
        href?: string;

        /**
         * The name of the query parameter to include.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @example <caption>Example for generating including a query parameter.</caption>
         * ```
         * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
         * <a:config-link base="sn" href="sys_user_group_list.do" q="XML" v="/sys_user_group_list.do">Group XML Export<a:config-link>
         * <!-- Transpiled code will be: -->
         * <a href="https://yourinstance.servicenow.com/sys_user_group_list.do?XML" target="_blank">Group XML Export</a>
         * ```
         */
        q?: string;

        /**
         * The value for the query parameter to be included.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @description This is ignored if {@link IDirectiveAttributes#q} is empty or not defined.
         * @example <caption>Example for generating including a query parameter.</caption>
         * ```
         * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
         * <a:config-link base="sn" href="nav_to.do" q="uri" v="/sys_user_group_list.do">Group List<a:config-link>
         * <!-- Transpiled code will be: -->
         * <a href="https://yourinstance.servicenow.com/nav_to.do?uri=%2Fsys_user_group_list.do" target="_blank">Group List</a>
         * ```
         */
        v?: string;

        /**
         * Specifies an alternate target frame.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @example
         * ```
         * <!-- Where Service#idpUrl() returns "https://idp.f5server.com" -->
         * <a:config-link base="idp" target="_self">IDP<a:config-link>
         * <!-- Transpiled code will be: -->
         * <a href="https://idp.f5server.com/" target="_self">IDP</a>
         * ```
         */
        target?: string;

        /**
         * Define class names for the rendered anchor tag.
         * @type {string}
         * @memberof IDirectiveAttributes
         * @example
         * ```
         * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
         * <a:config-link base="sn" href="nav_to.do" link-class="myClass">Group List<a:config-link>
         * <!-- Transpiled code will be: -->
         * <a href="https://yourinstance.servicenow.com/" target="_blank" class="myClass">Group List</a>
         * ```
         */
        linkClass?: string;

        /**
         * Bind to a model for class name(s).
         * @type {string}
         * @memberof IDirectiveAttributes
         * @example
         * ```
         * <!-- Where Service#serviceNowUrl() returns "https://yourinstance.servicenow.com" and $scope.myClass = ["nav", "nav-link"] -->
         * <a:config-link base="sn" href="nav_to.do" link-class="p-1" link-class-model="myClass">Group List<a:config-link>
         * <!-- Transpiled code will be: -->
         * <a href="https://yourinstance.servicenow.com/" target="_blank" class="p-1 nav nav-link">Group List</a>
         * ```
         */
        linkClassModel?: string;
    }

    interface IDirectiveScope extends IDirectiveAttributes, ng.IScope {
        absHRef: string;
        linkTarget: string;
        class: string[];
    }

    class Controller implements ng.IController {
        constructor(private $scope: IDirectiveScope, private appConfigLoader: appConfigLoaderService.Service) {
            $scope.absHRef = $scope.href = "";
            $scope.linkTarget = DEFAULT_TARGET;
            $scope.class = [];
            let ctrl: Controller = this;
            $scope.$watchGroup(["base", "url", "q", "v"], () => { ctrl.updateHref(); });
            $scope.$watchGroup(["linkClass", "linkClassModel"], () => {
                $scope.class = (typeof $scope.linkClass === "string" && $scope.linkClass.length > 0) ?
                    sys.unique(((typeof $scope.linkClassModel === "string" && $scope.linkClassModel.length > 0) ?
                        $scope.linkClass.split(sys.whitespaceRe).concat($scope.linkClassModel.split(sys.whitespaceRe)) :
                        $scope.linkClass.split(sys.whitespaceRe)).filter((v: string) => v.length > 0)) :
                    ((typeof $scope.linkClassModel === "string" && $scope.linkClassModel.length > 0) ? sys.unique($scope.linkClassModel.split(sys.whitespaceRe).filter((v: string) => v.length > 0)) : []);
            });
            $scope.$watch("target", () => {
                if (typeof $scope.target === "string")
                    $scope.linkTarget = $scope.target;
                else
                    $scope.linkTarget = DEFAULT_TARGET;
            });
        }
        updateHref() {
            if (typeof this.$scope.q === "string" && this.$scope.q.length > 0)
                this.$scope.absHRef = ((typeof this.$scope.v === "string") ? this.appConfigLoader.createUrl(this.$scope.base, this.$scope.href, this.$scope.q, this.$scope.v) :
                    this.appConfigLoader.createUrl(this.$scope.base, this.$scope.href, this.$scope.q)).href;
            else
                this.$scope.absHRef = this.appConfigLoader.createUrl(this.$scope.base, this.$scope.href).href;
        }
        $onInit() { }
    }

    export function getDirectiveInjectable(): ng.Injectable<ng.IDirectiveFactory> {
        return [appConfigLoaderService.SERVICE_NAME, () => {
            return <ng.IDirective>{
                restrict: "E",
                controller: ['$scope', appConfigLoaderService.SERVICE_NAME, Controller],
                scope: { base: "@", href: "@?", q: "@?", v: "@?", linkClass: "@?", linkClassModel: "=?" },
                replace: true,
                template: '<a ng-href="{{absHRef}}" target="{{linkTarget}}" ng-class="class" ng-transclude></a>',
                transclude: true
            }
        }];
    }
}

namespace snNavLinkDirective {
    // #region snNavLink directive

    /**
     * Defines the directive name as "snNavLink".
     * @export
     * @constant {string}
     */
    export const DIRECTIVE_NAME: string = "snNavLink";

    /**
     * Attributes that may be used with the snNavLink directive.
     *
     * @export
     * @interface IDirectiveAttributes
     * @example <caption>Example of simple statically defined relative URL.</caption>
     * ```
     * <!-- Where Service.serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <sn-nav-link path-nodes="System LDAP/Data Sources" href="/sys_data_source_list.do" />
     * <!-- Transpiled code will be: -->
     * <samp class="navPath">
     *      <span>
     *          <var>System LDAP</var>
     *          &rArr;
     *      </span>
     *      <a href="https://yourinstance.servicenow.com/sys_data_source_list.do" target="_blank">
     *          <var class="targetName">Data Sources</var>
     *      </a>
     * </samp>
     * ```
     * @example <caption>Example of navigation path with alternate link index.</caption>
     * ```
     * <!-- Where Service.serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <sn-nav-link path-nodes="System LDAP/Transform Maps/Enterprise User Import" link-index="1" href="/sys_transform_map_list.do" />
     * <!-- Transpiled code will be: -->
     * <samp class="navPath">
     *      <span>
     *          <var>System LDAP</var>
     *          &rArr;
     *      </span>
     *      <a href="https://yourinstance.servicenow.com/sys_transform_map_list.do" target="_blank">
     *          <var>Transform Maps</var>
     *      </a>
     *      <span>
     *          &rArr;
     *          <var class="targetName">Enterprise User Import</var>
     *      </span>
     * </samp>
     * ```
     * @example <caption>Example of navigation path with alternate node separator.</caption>
     * ```
     * <!-- Where Service.serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <sn-nav-link path-nodes="Configuration|Identification/Reconciliation|CI Identifiers" node-separator="|" href="/cmdb_identifier_list.do" />
     * <!-- Transpiled code will be: -->
     * <samp class="navPath">
     *      <span>
     *          <var>Configuration</var>
     *          &rArr;
     *          <var>Identification/Reconciliation</var>
     *          &rArr;
     *      </span>
     *      <a href="https://yourinstance.servicenow.com/cmdb_identifier_list.do" target="_blank">
     *          <var class="targetName">CI Identifiers</var>
     *      </a>
     * </samp>
     * ```
     * @example <caption>Example of statically defined relative URL encoded in nav_to.do query parameter.</caption>
     * ```
     * <!-- Where Service.serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <sn-nav-link path-nodes="System LDAP/Data Sources" href="/sys_data_source_list.do" to-nav="true" />
     * <!-- Transpiled code will be: -->
     * <samp class="navPath">
     *      <span>
     *          <var>System LDAP</var>
     *          &rArr;
     *      </span>
     *      <a href="https://yourinstance.servicenow.com/nav_to.do?uri=%2Fsys_data_source_list.do" target="_blank">
     *          <var class="targetName">Data Sources</var>
     *      </a>
     * </samp>
     * ```
     * @example <caption>Example of bound URL model.</caption>
     * ```
     * <!-- Where modelVar === "/sys_data_source_list.do" and Service.serviceNowUrl() returns "https://yourinstance.servicenow.com" -->
     * <sn-nav-link path-nodes="System LDAP/Data Sources" href-model="modelVar" />
     * <!-- Transpiled code will be: -->
     * <samp class="navPath">
     *      <span>
     *          <var>System LDAP</var>
     *          &rArr;
     *      </span>
     *      <a href="https://yourinstance.servicenow.com/sys_data_source_list.do" target="_blank">
     *          <var class="targetName">Data Sources</var>
     *      </a>
     * </samp>
     * ```
     * @example <caption>Example of navigation path with no relative URL.</caption>
     * ```
     * <sn-nav-link path-nodes="System Policy/Rules/Caller VIP Lookup Rules" />
     * <!-- Transpiled code will be -->
     * <samp class="navPath">
     *      <span>
     *          <var>System Policy</var>
     *          &rArr;
     *          <var>Rules</var>
     *          &rArr;
     *      </span>
     *      <var class="targetName">Caller VIP Lookup Rules</var>
     * </samp>
     * ```
     */
    export interface IDirectiveAttributes {
        href?: string;
        hrefModel?: string;
        toNav?: "true" | "false";
        target?: string;
        pathNodes: string;
        nodeSeparator?: string;
        linkIndex?: string
    }

    interface IDirectiveScope extends IDirectiveAttributes, ng.IScope {
        effectiveHRef: string;
        text: string;
        hasLink: boolean;
        leadingSegments: string[];
        trailingSegments: string[];
        q?: string;
        v?: string;
    }

    export class Controller implements ng.IController {
        constructor(private $scope: IDirectiveScope) {
            $scope.effectiveHRef = "";
            $scope.text = "";
            $scope.hasLink = false;
            $scope.leadingSegments = [];
            $scope.trailingSegments = [];
            $scope.$watchGroup(['toNav', 'pathNodes', 'nodeSeparator', 'hrefModel', 'href'], () => {
                let nodeSeparator: string = (typeof $scope.nodeSeparator === "string" && $scope.nodeSeparator.length > 0) ? $scope.nodeSeparator : "/";
                let allSegments: string[] = (typeof $scope.pathNodes === "string" && $scope.pathNodes.length > 0) ?
                    $scope.pathNodes.split(nodeSeparator).map((value: string) => value.trim()).filter((value: string) => value.length > 0) : [];
                let index: number = allSegments.length - 1;
                if ((index = sys.asInt($scope.linkIndex, -1)) > -1 && index < (allSegments.length - 1)) {
                    $scope.leadingSegments = [];
                    while ($scope.leadingSegments.length < index)
                        $scope.leadingSegments.push(allSegments.shift());
                    $scope.text = allSegments.shift();
                    $scope.trailingSegments = allSegments;
                } else {
                    $scope.trailingSegments = [];
                    $scope.text = allSegments.pop();
                    $scope.leadingSegments = allSegments;
                }
                let href: string = (typeof $scope.hrefModel === "string" && $scope.hrefModel.length > 0) ? $scope.hrefModel :
                    ((typeof $scope.href === "string" && $scope.href.length > 0) ? $scope.href : "");
                if (href.length == 0) {
                    $scope.hasLink = false;
                    $scope.effectiveHRef = "";
                    $scope.q = $scope.v = undefined;
                } else {
                    if (sys.asBoolean($scope.toNav)) {
                        $scope.effectiveHRef = "/nav_to.do";
                        $scope.q = "uri";
                        $scope.v = href;
                    } else {
                        $scope.q = $scope.v = undefined;
                        $scope.effectiveHRef = href;
                    }
                    $scope.hasLink = true;
                }
            });
        }
        $onInit() { }
    }

    export function getDirectiveInjectable(): ng.Injectable<ng.IDirectiveFactory> {
        return () => {
            return <ng.IDirective>{
                restrict: "E",
                controller: ['$scope', Controller],
                scope: { href: "@?", hrefModel: "=?", toNav: "@?", target: "@?", pathNodes: "@?", nodeSeparator: "@?", linkIndex: "@?" },
                replace: true,
                template: '<samp class="navPath"><span ng-repeat="s in leadingSegments"><var>{{s}}</var> &rArr; </span><a:config-link ng-show="hasLink" base="sn" href="{{effectiveHRef}}" q="{{q}}" v="{{v}}" target="{{target}}"><var class="targetName">{{text}}</var></a:config-link><var ng-hide="hasLink" class="targetName">{{text}}</var><span ng-repeat="s in trailingSegments"> &rArr; <var>{{s}}</var></span></samp>'
            }
        };
    }
}

namespace pageManager {
    /**
     * Prefix for hash portion of navigation URI strings.
     * @export
     * @constant HashPrefix
     * @type {"!"}
     */
    export const HASH_PREFIX = '!';

    /**
     * Prefix for relative navigation URI path strings.
     * @export
     * @constant NavPrefix
     * @type {"#!"}
     */
    export const NAV_PREFIX = '#!';

    export const DEFAULT_PAGE_TITLE = 'ServiceNow Implementation and Maintenance';
    export const CONTROLLER_NAME_MAIN_CONTENT = 'mainContentController';
    export const CONTROLLER_NAME_DEFAULT_PAGE = 'defaultPageController';
    export const SERVICE_NAME_PAGE_MANAGER = 'pageManager';
    export const PROVIDER_NAME_PAGE_MANAGER = SERVICE_NAME_PAGE_MANAGER + 'Provider';

    /**
     * Handles W3C DOM event.
     * @export
     * @typedef {(event?: BaseJQueryEventObject) => void} DOMelementEventCallback
     * @param {BaseJQueryEventObject} [event] - Contains information about the W3C DOM event that occurred.
     */
    export type DOMelementEventCallback = (event?: BaseJQueryEventObject) => void;

    export const CSS_CLASS_MAIN_SHOWING_ASIDE_NAV: Readonly<string[]> = [];
    export const CSS_CLASS_MAIN_HIDING_ASIDE_NAV: Readonly<string[]> = [];
    export const CSS_CLASS_NAV_ANCHOR_IS_CURRENT: Readonly<string[]> = [];
    export const CSS_CLASS_NAV_LINK_ITEM_IS_CURRENT: Readonly<string[]> = [];
    export const CSS_CLASS_NAV_ANCHOR_HAS_CURRENT: Readonly<string[]> = [];
    export const CSS_CLASS_NAV_LINK_ITEM_HAS_CURRENT: Readonly<string[]> = [];
    export const CSS_CLASS_NAV_ANCHOR_NOT_IN_CURRENT: Readonly<string[]> = [];
    export const CSS_CLASS_NAV_LINK_ITEM_NOT_IN_CURRENT: Readonly<string[]> = [];

    export class NavMenuItem {
        private readonly _id: string;
        private readonly _title: string;
        private readonly _tooltip: string;
        private _parent?: NavMenuItem;
        private _previous?: NavMenuItem;
        private _next?: NavMenuItem;
        private _childItems: NavMenuItem[];
        private _isCurrent = false;
        private _containsCurrent = false;
        private _linkItemCss: Readonly<string[]> = CSS_CLASS_NAV_LINK_ITEM_NOT_IN_CURRENT;
        private _anchorCss: Readonly<string[]> = CSS_CLASS_NAV_ANCHOR_NOT_IN_CURRENT;
        private _href: string;
        private _url: string;
        private _click: DOMelementEventCallback = NavMenuItem.clickNotCurrent;
        get title(): string { return this._title; }
        get tooltip(): string { return this._tooltip; }
        get parent(): NavMenuItem | undefined { return this._parent; }
        get previous(): NavMenuItem | undefined { return this._previous; }
        get next(): NavMenuItem | undefined { return this._next; }
        get isCurrent(): boolean { return this._isCurrent; }
        get containsCurrent(): boolean { return this._containsCurrent; }
        get notCurrent(): boolean { return !(this._isCurrent || this._containsCurrent); }
        get linkItemCss(): Readonly<string[]> { return this._linkItemCss; }
        get anchorCss(): Readonly<string[]> { return this._anchorCss; }
        get href(): string { return this._href; }
        get url(): string { return this._url; }
        get click(): DOMelementEventCallback { return this._click; }
        constructor(routeInfo: PageRouteInfo, parent: NavMenuItem | NavMenuItem[]) {
            this._id = routeInfo.id;
            this._title = ((typeof routeInfo.linkTitle === 'string' && routeInfo.linkTitle.trim().length > 0) || Provider.routeInfoHasExplicitController(routeInfo)) ?
                routeInfo.linkTitle : routeInfo.title;
            this._tooltip = (typeof routeInfo.tooltip === 'string' && routeInfo.tooltip.trim().length > 0) ? routeInfo.tooltip : '';
            let arr: NavMenuItem[];
            if (Array.isArray(parent)) {
                parent.push(this);
                arr = parent;
            } else {
                parent._childItems.push(this);
                arr = parent._childItems;
            }

            let i: number = arr.length - 2;
            (arr[i]._next = this)._previous = arr[i];
        }

        private static clickIsCurrent(event?: BaseJQueryEventObject): boolean {
            if (typeof event === 'object' && event !== null && !event.isDefaultPrevented())
                event.preventDefault();
            return false;
        }
        private static clickNotCurrent(event?: BaseJQueryEventObject): boolean { return true; }
        static find(source: ReadonlyArray<NavRouteInfo>, id: string): PageRouteInfo | undefined {
            for (let i: number = 0; i < source.length; i++) {
                if ((<PageRouteInfo>source[i]).id === id)
                    return <PageRouteInfo>source[i];
            }
        }
        static getParent(source: ReadonlyArray<NavRouteInfo>, target: PageRouteInfo | string): PageRouteInfo | undefined {
            return NavMenuItem.find(source, (typeof target === 'string') ? target : target.id);
        }
        static getChildren(source: ReadonlyArray<NavRouteInfo>, target: PageRouteInfo | string): PageRouteInfo[] {
            let result: PageRouteInfo[] = [];
            let id: string = (typeof target === 'string') ? target : target.id;
            for (let i: number = 0; i < source.length; i++) {
                if ((<PageRouteInfo>source[i]).parentId === id)
                    result.push(<PageRouteInfo>source[i]);
            }
            return result;
        }
        private static import(source: ReadonlyArray<NavRouteInfo>, scope: INavigationScope | NavMenuItem[], target: PageRouteInfo | string): NavMenuItem {
            let id: string;
            if (typeof target === 'string') {
                id = target;
                if (typeof (target = NavMenuItem.find(source, target)) === 'undefined')
                    return;
            }
            let parentRouteInfo: PageRouteInfo | undefined = NavMenuItem.getParent(source, id);
            let item: NavMenuItem;
            let i: number;
            if (typeof parentRouteInfo === 'undefined') {
                if (Array.isArray(scope)) {
                    for (i = 0; i < source.length; i++) {
                        if (!Provider.isRouteRedirectInfo(source[i]) && typeof NavMenuItem.getParent(source, <PageRouteInfo>source[i]) === 'undefined') {
                            let m: NavMenuItem = new NavMenuItem(<PageRouteInfo>source[i], scope);
                            if (m._id === id)
                                item = m;
                        }
                    }
                    if (typeof item !== 'undefined')
                        return item;
                    return new NavMenuItem(target, scope);
                }
                for (i = 0; i < scope.pageTopNavItems.length; i++) {
                    if (scope.pageTopNavItems[i]._id === id)
                        return scope.pageTopNavItems[i];
                }
                    
                return new NavMenuItem(target, <NavMenuItem[]>scope.pageTopNavItems);
            }
            let parentItem: NavMenuItem = this.import(source, scope, parentRouteInfo);
            if (parentItem._childItems.length == 0) {
                for (i = 0; i < source.length; i++) {
                    if (!Provider.isRouteRedirectInfo(source[i]) && typeof (<PageRouteInfo>source[i]).id === parentItem._id) {
                        let m: NavMenuItem = new NavMenuItem(<PageRouteInfo>source[i], parentItem);
                        if (m._id === id)
                            item = m;
                    }
                }
                if (typeof item !== 'undefined')
                    return item;
            } else
                for (i = 0; i < parentItem._childItems.length; i++) {
                    if (parentItem._childItems[i]._id === id)
                        return parentItem._childItems[i];
                }
            return new NavMenuItem(target, parentItem);
        }
        static setCurrent(source: ReadonlyArray<NavRouteInfo>, scope: INavigationScope | NavMenuItem[], routeInfo: PageRouteInfo): NavMenuItem {
            let currentNavItem: NavMenuItem = NavMenuItem.import(source, scope, routeInfo);
            let item: NavMenuItem;
            if (Array.isArray(scope)) {
                for (let i: number = 0; i < scope.length; i++) {
                    if (scope[i]._id === currentNavItem._id) {
                        if (scope[i]._isCurrent)
                            return scope[i];
                        scope[i]._isCurrent = false;
                        scope[i]._anchorCss = CSS_CLASS_NAV_ANCHOR_NOT_IN_CURRENT;
                        scope[i]._linkItemCss = CSS_CLASS_NAV_LINK_ITEM_NOT_IN_CURRENT;
                        scope[i]._click = NavMenuItem.clickNotCurrent;
                        scope[i]._href = currentNavItem._url;
                        for (let item: NavMenuItem = scope[i]._parent; typeof item !== 'undefined'; item = item._parent) {
                            item._containsCurrent = false;
                            item._anchorCss = CSS_CLASS_NAV_ANCHOR_NOT_IN_CURRENT;
                            item._linkItemCss = CSS_CLASS_NAV_LINK_ITEM_NOT_IN_CURRENT;
                            item._click = NavMenuItem.clickNotCurrent;
                            item._href = item._url;
                        }
                        break;
                    }
                }
                currentNavItem._isCurrent = true;
                currentNavItem._anchorCss = CSS_CLASS_NAV_ANCHOR_IS_CURRENT;
                currentNavItem._linkItemCss = CSS_CLASS_NAV_LINK_ITEM_IS_CURRENT;
                currentNavItem._click = NavMenuItem.clickIsCurrent;
                currentNavItem._href = currentNavItem._url;
                for (item = currentNavItem._parent; typeof item !== 'undefined'; item = item._parent) {
                    item._containsCurrent = false;
                    item._anchorCss = CSS_CLASS_NAV_ANCHOR_HAS_CURRENT;
                    item._linkItemCss = CSS_CLASS_NAV_LINK_ITEM_HAS_CURRENT;
                    item._click = NavMenuItem.clickNotCurrent;
                    item._href = item._url;
                }
                return currentNavItem;
            }
            if (typeof scope.currentNavItem === 'object' && scope.currentNavItem !== null) {
                if (routeInfo.id === scope.currentNavItem._id)
                    return scope.currentNavItem;
                scope.currentNavItem._isCurrent = false;
                scope.currentNavItem._anchorCss = CSS_CLASS_NAV_ANCHOR_NOT_IN_CURRENT;
                scope.currentNavItem._linkItemCss = CSS_CLASS_NAV_LINK_ITEM_NOT_IN_CURRENT;
                scope.currentNavItem._click = NavMenuItem.clickNotCurrent;
                scope.currentNavItem._href = scope.currentNavItem._url;
                for (item = scope.currentNavItem._parent; typeof item !== 'undefined'; item = item._parent) {
                    item._containsCurrent = false;
                    item._anchorCss = CSS_CLASS_NAV_ANCHOR_NOT_IN_CURRENT;
                    item._linkItemCss = CSS_CLASS_NAV_LINK_ITEM_NOT_IN_CURRENT;
                    item._click = NavMenuItem.clickNotCurrent;
                    item._href = item._url;
                }
            }
            while (scope.precedingSideNavItems.length > 0)
                (<NavMenuItem[]>scope.precedingSideNavItems).pop();
            while (scope.followingSideNavItems.length > 0)
                (<NavMenuItem[]>scope.followingSideNavItems).pop();
            while (scope.sideNavBreadcrumbItems.length > 0)
                (<NavMenuItem[]>scope.sideNavBreadcrumbItems).pop();
            while (scope.nestedChildNavItems.length > 0)
                (<NavMenuItem[]>scope.nestedChildNavItems).pop();
            (scope.currentNavItem = currentNavItem)._isCurrent = true;
            currentNavItem._isCurrent = true;
            currentNavItem._anchorCss = CSS_CLASS_NAV_ANCHOR_IS_CURRENT;
            currentNavItem._linkItemCss = CSS_CLASS_NAV_LINK_ITEM_IS_CURRENT;
            currentNavItem._click = NavMenuItem.clickIsCurrent;
            currentNavItem._href = currentNavItem._url;
            for (let item: NavMenuItem = currentNavItem._parent; typeof item !== 'undefined'; item = item._parent) {
                item._containsCurrent = false;
                item._anchorCss = CSS_CLASS_NAV_ANCHOR_HAS_CURRENT;
                item._linkItemCss = CSS_CLASS_NAV_LINK_ITEM_HAS_CURRENT;
                item._click = NavMenuItem.clickNotCurrent;
                item._href = item._url;
            }
            if (typeof currentNavItem._parent === 'undefined') {
                scope.showNestedChildNav = scope.showSideNavBreadcrumbs = scope.showCurrentItem = false;
                NavMenuItem.getChildren(source, routeInfo).forEach(function (value: PageRouteInfo) {
                    (<NavMenuItem[]>scope.precedingSideNavItems).push(NavMenuItem.import(source, scope, value));
                });
            } else {
                for (item = currentNavItem._parent; typeof item._parent !== 'undefined'; item = item._parent)
                    (<NavMenuItem[]>scope.sideNavBreadcrumbItems).push(item);
                scope.showSideNavBreadcrumbs = scope.sideNavBreadcrumbItems.length > 0;
                let i = 0;
                let id: string = scope.currentNavItem._id;
                let arr: NavMenuItem[] = currentNavItem._parent._childItems;
                while (arr[i]._id !== id)
                    (<NavMenuItem[]>scope.precedingSideNavItems).push(arr[i++]);
                while (++i < arr.length)
                    (<NavMenuItem[]>scope.followingSideNavItems).push(arr[i]);
                NavMenuItem.getChildren(source, routeInfo).forEach(function (value: PageRouteInfo) {
                    (<NavMenuItem[]>scope.nestedChildNavItems).push(NavMenuItem.import(source, scope, value));
                });
                scope.showNestedChildNav = scope.nestedChildNavItems.length > 0;
                scope.showCurrentItem = scope.precedingSideNavItems.length > 0 || scope.showNestedChildNav || scope.followingSideNavItems.length > 0 || scope.showSideNavBreadcrumbs;
            }
            scope.mainSectionClass = ((scope.showNavAsideElement = scope.showCurrentItem || scope.precedingSideNavItems.length > 0) == true) ? CSS_CLASS_MAIN_SHOWING_ASIDE_NAV : CSS_CLASS_MAIN_HIDING_ASIDE_NAV;
            return currentNavItem;
        }
    }

    export interface IVisibleState {
        readonly isVisible: boolean;
        readonly notVisible: boolean;
    }

    export class VisibilityState<S extends IVisibleState, V> {
        get whenVisible(): V | undefined { return this._whenVisible; }
        set whenVisibile(value: V | undefined) { this._whenVisible = value; }
        get whenNotVisible(): V | undefined { return this._whenNotVisible; }
        set whenNotVisible(value: V | undefined) { this._whenNotVisible = value; }
        get dependency(): S | undefined { return this._dependency; }
        set dependency(value: S | undefined) { this._dependency = value; }
        get isVisible(): boolean { return !VisbleDependency2.isNil(this._dependency) && this._dependency.isVisible; }
        get notVisible(): boolean { return VisbleDependency2.isNil(this._dependency) || this._dependency.notVisible; }
        get state(): V | undefined { return (this.isVisible) ? this._whenVisible : this._whenNotVisible; }
        constructor(private _whenVisible?: V, private _whenNotVisible?: V, private _dependency?: S) { }
    }

    export class VisbleDependency2<T1 extends IVisibleState, T2 extends IVisibleState> implements IVisibleState {
        get item1(): T1 | undefined { return this._item1; }
        get item2(): T2 | undefined { return this._item2; }
        get isVisible(): boolean { return !(VisbleDependency2.isNil(this._item1) || VisbleDependency2.isNil(this._item2)) && this._item1.isVisible && this._item2.isVisible; }
        get notVisible(): boolean { return VisbleDependency2.isNil(this._item1) || VisbleDependency2.isNil(this._item2) || this._item1.notVisible || this._item2.notVisible; }
        constructor(private _item1?: T1, private _item2?: T2) { }
        static isNil(obj: any): boolean { return typeof obj === 'undefined' || (typeof obj === 'object' && obj === null); }
    }

    export class VisbleDependency3<T1 extends IVisibleState, T2 extends IVisibleState, T3 extends IVisibleState> extends VisbleDependency2<T1, T2> {
        get item3(): T3 | undefined { return this._item3; }
        get isVisible(): boolean { return !VisbleDependency2.isNil(this._item3) && super.isVisible; }
        get notVisible(): boolean { return VisbleDependency2.isNil(this._item3) || super.notVisible; }
        constructor(item1?: T1, item2?: T2, private _item3?: T3) { super(item1, item2); }
    }

    export class VisbleDependency4<T1 extends IVisibleState, T2 extends IVisibleState, T3 extends IVisibleState, T4 extends IVisibleState> extends VisbleDependency3<T1, T2, T3> {
        get item4(): T4 | undefined { return this._item4; }
        get isVisible(): boolean { return !VisbleDependency2.isNil(this._item4) && super.isVisible; }
        get notVisible(): boolean { return VisbleDependency2.isNil(this._item4) || super.notVisible; }
        constructor(item1?: T1, item2?: T2, item3?: T3, private _item4?: T4) { super(item1, item2, item3); }
    }

    export class OrderedMap<E> implements IVisibleState, Map<string, E> {
        private _items: HideIfEmpty<E>;
        private readonly _key: symbol = Symbol();
        private _nullKey: string | undefined;
        private _undefinedKey: string | undefined;
        readonly [Symbol.toStringTag]: 'OrderedMap';
        get isVisible() { return this._items.isVisible; }
        get notVisible() { return this._items.notVisible; }
        get size(): number { return this._items.size; }
        constructor(comparer: (x: E, y: E) => boolean);
        constructor(getKey: (value: E) => string, item0: E, ...items: E[]);
        constructor(getKey: (value: E) => string, comparer: (x: E, y: E) => boolean, item0: E, ...items: E[]);
        constructor(arg0?: ((x: E, y: E) => boolean) | ((value: E) => string), arg1?: ((x: E, y: E) => boolean) | E, ...items: E[]) {
            if (arguments.length == 0)
                this._items = new HideIfEmpty<E>();
            else {
                let k: string;
                if (arguments.length == 1)
                    this._items = new HideIfEmpty<E>(<(x: E, y: E) => boolean>arg0);
                else if (arguments.length == 2) {
                    this._items = new HideIfEmpty<E>();
                    k = (<(value: E) => string>arg0)(<E>arg1);
                    if (typeof k !== 'string')
                        throw new Error('Invalid key');
                    if (typeof arg1 === 'undefined')
                        this._undefinedKey = k;
                    else if (typeof arg1 === 'object' && arg1 === null)
                        this._nullKey = k;
                    else
                        (<E>arg1)[this._key] = k;
                    this._items.add(<E>arg1);
                } else {
                    if (typeof arg1 === 'function')
                        this._items = new HideIfEmpty<E>(<(x: E, y: E) => boolean>arg1);
                    else {
                        k = (<(value: E) => string>arg0)(<E>arg1);
                        if (typeof k !== 'string')
                            throw new Error('Invalid key');
                        if (typeof arg1 === 'undefined')
                            this._undefinedKey = k;
                        else if (typeof arg1 === 'object' && arg1 === null)
                            this._nullKey = k;
                        else
                            (<E>arg1)[this._key] = k;
                        this._items = new HideIfEmpty<E>();
                        this._items.add(<E>arg1);
                    }
                    for (let i: number = 0; i < items.length; i++) {
                        if (typeof this.keyOf(items[i]) === 'string') {
                            this.clear();
                            throw new Error('Duplicate key');
                        }
                        k = (<(value: E) => string>arg0)(items[i]);
                        if (typeof k !== 'string') {
                            this.clear();
                            throw new Error('Invalid key');
                        }
                    }
                }
            }
        }
        add(values: Map<string, E>): void {
            let iterator = values.entries();
            let items: [string, E][] = [];
            for (let r = iterator.next(); r.done !== true; r = iterator.next()) {
                if (typeof r.value[0] !== 'string')
                    throw new Error("Invalid key");
                if (typeof this.keyOf(r.value) === 'string')
                    throw new Error("Item has already been added");
                items.push(r.value);
            }
            items.forEach(function (this: OrderedMap<E>, value: [string, E]): void { this.set(value[0], value[1]); });
        }
        merge(values: Map<string, E>): void {
            let iterator = values.entries();
            let items: [string, E][] = [];
            for (let r = iterator.next(); r.done !== true; r = iterator.next()) {
                if (typeof r.value[0] !== 'string')
                    throw new Error("Invalid key");
                items.push(r.value);
            }
            items.forEach(function (this: OrderedMap<E>, value: [string, E]): void { this.set(value[0], value[1]); });
        }
        clear(): void {
            this._items.forEach(function (this: OrderedMap<E>, value: E): void {
                if (typeof value !== 'undefined' && (typeof value !== 'object' || value !== null))
                    value[this._key] = undefined;
            }, this);
            this._nullKey = this._undefinedKey = undefined;
            this._items.clear();
        }
        delete(key: string): boolean {
            for (let i: number = 0; i < this._items.size; i++) {
                if (this.keyOf(this._items[i]) === key) {
                    this.deleteAt(i);
                    return true;
                }
            }
            return false;
        }
        deleteAt(index: number): void {
            let item: E = this._items.get(index);
            this._items.deleteAt(index);
            if (typeof item === 'undefined')
                this._undefinedKey = undefined;
            else if (typeof item === 'object' && item === null)
                this._nullKey = undefined;
            else
                item[this._key] = undefined;
        }
        filter(callbackfn: (value: E, key: string, index: number, set: Map<string, E>) => boolean): E[];
        filter<T>(callbackfn: (this: T, value: E, key: string, index: number, set: Map<string, E>) => boolean, thisArg: T): E[];
        filter(callbackfn: (value: E, key: string, index: number, set: Map<string, E>) => boolean, thisArg?: any): E[] {
            if (arguments.length > 1)
                return this._items.filter(function (this: OrderedMap<E>, value: E, index: number): boolean { return callbackfn.call(thisArg, value, this.keyOf(value), index, this); }, this);
            return this._items.filter(function (this: OrderedMap<E>, value: E, index: number): boolean { return callbackfn(value, this.keyOf(value), index, this); }, this);
        }
        forEach(callbackfn: (value: E, key: string, map: Map<string, E>) => void): void;
        forEach<T>(callbackfn: (this: T, value: E, key: string, map: Map<string, E>) => void, thisArg: T): void;
        forEach(callbackfn: (value: E, key: string, map: Map<string, E>) => void, thisArg?: any): void {
            if (arguments.length > 1)
                this._items.forEach(function (this: OrderedMap<E>, value: E): void { callbackfn.call(thisArg, value, this.keyOf(value), this); }, this);
            else
                this._items.forEach(function (this: OrderedMap<E>, value: E): void { callbackfn(value, this.keyOf(value), this); }, this);
        }
        map<R>(callbackfn: (value: E, key: string, index: number, set: Map<string, E>) => R): R[];
        map<T, R>(callbackfn: (this: T, value: E, key: string, index: number, set: Map<string, E>) => R, thisArg: T): R[];
        map<R>(callbackfn: (value: E, key: string, index: number, set: Map<string, E>) => R, thisArg?: any): R[] {
            if (arguments.length > 1)
                return this._items.map(function (this: OrderedMap<E>, value: E, index: number): R { return callbackfn.call(thisArg, value, this.keyOf(value), index, this); }, this);
            return this._items.map(function (this: OrderedMap<E>, value: E, index: number): R { return callbackfn(value, this.keyOf(value), index, this); }, this);
        }
        get(index: number): E;
        get(key: string): E;
        get(arg: number | string): E{
            if (typeof arg === "number")
                return this._items.get(arg);
            for (let i: number = 0; i < this._items.size; i++) {
                if (this.keyOf(this._items[i]) === arg)
                    return this._items[i];
            }
        }
        has(key: string): boolean {
            for (let i: number = 0; i < this._items.size; i++) {
                if (this.keyOf(this._items[i]) === key)
                    return true;
            }
            return false;
        }
        hasValue(value: E): boolean { return typeof this.keyOf(value) === 'string'; }
        indexOfValue(value: E): number {
            let key: string | undefined = this.keyOf(value);
            if (typeof key === 'string')
                return this.indexOf(key);
        }
        indexOf(key: string): number {
            for (let i: number = 0; i < this._items.size; i++) {
                if (this.keyOf(this._items[i]) === key)
                    return i;
            }
            return -1;
        }
        keyOf<T>(item: T): string | undefined {
            if (typeof item === 'undefined')
                return this._undefinedKey;
            if (typeof item === 'object' && item === null)
                return this._nullKey;
            return item[this._key];
        }
        set(key: string, value: E): this {
            if (typeof key !== 'string')
                throw new Error("Invalid key");
            let index: number = this.indexOf(key);
            if (index < 0) {
                if (typeof value === 'undefined')
                    this._undefinedKey = key;
                else if (typeof value === 'object' && value === null)
                    this._nullKey = key;
                else
                    value[this._key] = key;
                this._items.add(value);
            } else {
                if (key === this._undefinedKey)
                    this._undefinedKey = undefined;
                else if (key === this._nullKey)
                    this._nullKey = undefined;
                else
                    this._items.get(index)[this._key] = undefined;
                if (typeof value === 'undefined')
                    this._undefinedKey = key;
                else if (typeof value === 'object' && value === null)
                    this._nullKey = key;
                else
                    value[this._key] = key;
                this._items.set(index, value);
            }
            return this;
        }
        [Symbol.iterator](): IterableIterator<[string, E]> { return new SymbolKeyValueIterator<E>(this._items.values(), this._key, this._nullKey, this._undefinedKey); }
        entries(): IterableIterator<[string, E]> { return new SymbolKeyValueIterator<E>(this._items.values(), this._key, this._nullKey, this._undefinedKey); }
        keys(): IterableIterator<string> { return new SymbolKeyIterator<E>(this._items.values(), this._key, this._nullKey, this._undefinedKey); }
        values(): IterableIterator<E> { return this._items.values(); }
    }

    export class SymbolKeyIterator<E> implements IterableIterator<string> {
        constructor(private _iterator: IterableIterator<E>, private readonly _keySymbol: symbol, private readonly _nullKey?: string, private readonly _undefinedKey?: string) { }
        [Symbol.iterator](): IterableIterator<string> { return this; }
        next(): IteratorResult<string, any> {
            if (typeof this._iterator !== 'undefined') {
                let result: IteratorResult<E, any> = this._iterator.next();
                if (!result.done)
                    return { value: (typeof result.value === 'undefined') ? this._undefinedKey : ((typeof result.value === 'object' && result.value === null) ? this._nullKey : result.value[this._keySymbol]) };
                this._iterator = undefined;
            }
            return <IteratorReturnResult<any>>{ done: true };
        }
    }

    export class SymbolKeyValueIterator<E> implements IterableIterator<[string, E]> {
        constructor(private _iterator: IterableIterator<E>, private readonly _keySymbol: symbol, private readonly _nullKey?: string, private readonly _undefinedKey?: string) { }
        [Symbol.iterator](): IterableIterator<[string, E]> { return this; }
        next(): IteratorResult<[string, E], any> {
            if (typeof this._iterator !== 'undefined') {
                let result: IteratorResult<E, any> = this._iterator.next();
                if (!result.done)
                    return { value: [(typeof result.value === 'undefined') ? this._undefinedKey : ((typeof result.value === 'object' && result.value === null) ? this._nullKey : result.value[this._keySymbol]), result.value] };
                this._iterator = undefined;
            }
            return <IteratorReturnResult<any>>{ done: true };
        }
    }

    export class HideIfEmpty<E> implements Set<E> {
        private _items: E[] = [];
        private readonly _comparer: (x: E, y: E) => boolean;
        readonly [Symbol.toStringTag]: 'VisibleIfNotEmpty';
        get isVisible() { return this._items.length > 0; }
        get notVisible() { return this._items.length == 0; }
        get size(): number { return this._items.length; }
        constructor(...items: E[]);
        constructor(comparer: (x: E, y: E) => boolean, ...items: E[]);
        constructor(arg0?: ((x: E, y: E) => boolean) | E, ...items: E[]){
            if (arguments.length == 0)
                this._items = [];
            else {
                if (typeof arg0 == 'function') {
                    this._comparer = <(x: E, y: E) => boolean>arg0;
                    this._items = (arguments.length > 0) ? items : [];
                    return;
                }
                this._items = (arguments.length == 1) ? [<E>arg0] : [<E>arg0].concat(items);
            }
            this._comparer = function (x: E, y: E): boolean { return x === y; }
        }
        add(value: E): this {
            this._items.push(value);
            return this;
        }
        clear(): void { this._items.length == 0; }
        deleteAt(index: number): void {
            if (this._items.length > 0) {
                if (index === 0)
                    this._items.shift();
                else if (index == this._items.length - 1)
                    this._items.pop();
                else {
                    if (index >= this._items.length)
                        throw new RangeError("Index out of range");
                    this._items.splice(index, 1);
                }
            }
        }
        delete(value: E): boolean {
            for (let i: number = 0; i < this._items.length; i++) {
                if (this._comparer(this._items[i], value)) {
                    if (i === 0)
                        this._items.shift();
                    else if (i < this._items.length - 1)
                        this._items.splice(i, 1);
                    else
                        this._items.pop();
                    return true;
                }
            }
            return false;
        }
        filter(callbackfn: (value: E, index: number, set: Set<E>) => boolean): E[];
        filter<T>(callbackfn: (this: T, value: E, index: number, set: Set<E>) => boolean, thisArg: T): E[];
        filter(callbackfn: (value: E, index: number, set: Set<E>) => boolean, thisArg?: any): E[] {
            if (arguments.length > 1)
                return this._items.filter(function (this: HideIfEmpty<E>, value: E, index: number): boolean { return callbackfn.call(thisArg, value, index, this); }, this);
            return this._items.filter(function (this: HideIfEmpty<E>, value: E, index: number): boolean { return callbackfn(value, index, this); }, this);
        }
        forEach(callbackfn: (value: E, value2: E, set: Set<E>) => void): void;
        forEach<T>(callbackfn: (this: T, value: E, value2: E, set: Set<E>) => void, thisArg: T): void;
        forEach(callbackfn: (value: E, value2: E, set: Set<E>) => void, thisArg?: any): void {
            if (arguments.length > 1)
                this._items.forEach(function (this: HideIfEmpty<E>, value: E, index: number): void { callbackfn.call(thisArg, value, value, this); }, this);
            else
                this._items.forEach(function (this: HideIfEmpty<E>, value: E, index: number): void { callbackfn(value, value, this); }, this);
        }
        map<R>(callbackfn: (value: E, index: number, set: Set<E>) => R): R[];
        map<T, R>(callbackfn: (this: T, value: E, index: number, set: Set<E>) => R, thisArg: T): R[];
        map<R>(callbackfn: (value: E, index: number, set: Set<E>) => R, thisArg?: any): R[] {
            if (arguments.length > 1)
                return this._items.map(function (this: HideIfEmpty<E>, value: E, index: number): R { return callbackfn.call(thisArg, value, index, this); }, this);
            return this._items.map(function (this: HideIfEmpty<E>, value: E, index: number): R { return callbackfn(value, index, this); }, this);
        }
        get(index: number): E { return this._items[index]; }
        has(value: E): boolean {
            for (let i: number = 0; i < this._items.length; i++) {
                if (this._comparer(this._items[i], value))
                    return true;
            }
            return false;
        }
        indexOf(value: E): number {
            for (let i: number = 0; i < this._items.length; i++) {
                if (this._comparer(this._items[i], value))
                    return i;
            }
            return -1;
        }
        set(index: number, value: E): void { this._items[index] = value; }
        [Symbol.iterator](): IterableIterator<E> { return this._items.values(); }
        entries(): IterableIterator<[E, E]> { return this._items.map(function (value: E): [E, E] { return [value, value]; }).values(); }
        keys(): IterableIterator<E> { return this._items.values(); }
        values(): IterableIterator<E> { return this._items.values(); }
    }

    export interface IPageTitleScope {
        /**
         * The current page title.
         * @type {string}
         * @memberof IMainContentControllerScope
         */
        pageTitle: string;

        /**
         * Indicates whether the current page has a subtitle to be displayed.
         * @type {boolean}
         * @memberof IMainContentControllerScope
         */
        showSubtitle: boolean;

        /**
         * The subtitle for the current page.
         * @type {string}
         * @memberof IMainContentControllerScope
         */
        subTitle: string;
    }
    export interface IAppSettingsScope {
        /**
         * The value of the GIT repository URL field in the edit setup parameters dialog.
         *
         * @type {string}
         * @memberof IDirectiveScope
         */
        serviceNowUrl: string;
        /**
         * Indicates whether the ServiceNow URL field in the edit setup parameters dialog is valid.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        serviceNowUrlIsValid: boolean;
        /**
         * The value of the GIT repository URL field in the edit setup parameters dialog.
         *
         * @type {string}
         * @memberof IDirectiveScope
         */
        gitServiceUrl: string;
        /**
         * Indicates whether the GIT repository URL field in the edit setup parameters dialog is valid.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        gitServiceUrlIsValid: boolean;
        idpUrl: string;
        idpUrlIsValid: boolean;
        /**
         * Indicates whether all fields in the edit setup parameters dialog are valid.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        setupParametersAreInvalid: boolean;
        /**
         * Indicates whether the edit setup parameters dialog is being displayed.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        setupParametersDialogVisible: boolean;
    }
    export interface INavigationScope {
        /**
         * Navigation menu items to be displayed horizontally above the content.
         * @type {ReadonlyArray<NavMenuItem>}
         * @memberof IDirectiveScope
         */
        pageTopNavItems: ReadonlyArray<NavMenuItem>;
        /**
         * Ancestor navigation menu items to be displayed in the secondary navigation menu.
         *
         * @type {ReadonlyArray<NavMenuItem>}
         * @memberof IDirectiveScope
         */
        sideNavBreadcrumbItems: ReadonlyArray<NavMenuItem>;
        /**
         * Indicates whether ancestor navigation menu items are to be displayed in the secondary navigation menu.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        showSideNavBreadcrumbs: boolean;
        /**
         * Navigation menu items within the secondary navigation menu, exclusing any that represents the current page or sibling items following the one that represents the current page.
         *
         * @type {ReadonlyArray<NavMenuItem>}
         * @memberof IDirectiveScope
         */
        precedingSideNavItems: ReadonlyArray<NavMenuItem>;

        /**
         * Navigation menu item representing the current page.
         *
         * @type {NavMenuItem}
         * @memberof IDirectiveScope
         */
        currentNavItem?: NavMenuItem;
        /**
         * Indicates whether navigation menu item representing the current page is to be displayed in the secondary navigation menu.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        showCurrentItem: boolean;
        /**
         * Navigation menu items within the secondary navigation menu, exclusing any that represents the current page or sibling items following the one that represents the current page.
         *
         * @type {ReadonlyArray<NavMenuItem>}
         * @memberof IDirectiveScope
         */
        nestedChildNavItems: ReadonlyArray<NavMenuItem>;
        /**
         * Indicates whether the child/sibling navigation menu items are to be displayed in the secondary navigation menu.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        showNestedChildNav: boolean;
        /**
         * Navigation menu items within the secondary navigation menu that follow the item representing the current page.
         *
         * @type {ReadonlyArray<NavMenuItem>}
         * @memberof IDirectiveScope
         */
        followingSideNavItems: ReadonlyArray<NavMenuItem>;

        // TODO: Make obsolete
        /**
         * Indicates whether the child/sibling navigation menu items are to be displayed in the secondary navigation menu.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        showFollowingSideNav: boolean;
        /**
         * Heading text for the secondary navigation menu.
         *
         * @type {string}
         * @memberof IDirectiveScope
         */
        sideNavHeading: string;
        /**
         * Indicates whether a heading is to be displayed in the secondary navigation menu.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        showSideNavHeading: boolean;
        /**
         * Indicates whether the secondary navigation menu is to be displayed.
         *
         * @type {boolean}
         * @memberof IDirectiveScope
         */
        showNavAsideElement: boolean;
        /**
         * CSS class names for the main content section.
         *
         * @type {Readonly<string[]>}
         * @memberof IDirectiveScope
         */
        mainSectionClass: Readonly<string[]>;
    }
    /**
     * Defines the scope object for the main application controller.
     * @export
     * @interface IMainContentControllerScope
     * @extends {ng.IScope}
     */
    export interface IMainContentControllerScope extends IPageTitleScope, IAppSettingsScope, INavigationScope, ng.IScope {
    }
    /**
     * The main application controller.
     * @export
     * @class MainContentController
     * @implements {ng.IController}
     */
    export class MainContentController implements ng.IController {
        readonly [Symbol.toStringTag]: string = CONTROLLER_NAME_MAIN_CONTENT;

        /**
         * Creates an instance of MainContentController.
         * @param {IMainContentControllerScope} $scope
         * @param {PageTitleService} pageTitleService
         * @memberof MainContentController
         */
        constructor(private readonly $scope: IMainContentControllerScope, pageManager: Service) {
            const ctrl: MainContentController = this;
            pageManager.setScope($scope);
        }
        $doCheck(): void { }
        static getControllerInjectable(): ng.Injectable<ng.IControllerConstructor> {
            return ['$scope', 'pageManager', MainContentController];
        }
    }

    export interface IDefaultPageControllerScope extends ng.IScope {

    }
    /**
     * Controller for static pages.
     * @export
     * @class DefaultPageController
     * @implements {ng.IController}
     */
    export class DefaultPageController implements ng.IController {
        readonly [Symbol.toStringTag]: string = CONTROLLER_NAME_DEFAULT_PAGE;
        constructor(private readonly $scope: IDefaultPageControllerScope, pageManager: Service) {
        }
        $doCheck(): void { }
        static getControllerInjectable(): ng.Injectable<ng.IControllerConstructor> {
            return ['$scope', 'pageManager', DefaultPageController];
        }
    }

    /**
     * Service which provides page-related information and tracks and updates the current app page title.
     * @export
     * @class pageManager.Service
     */
    export class Service {
        private _pageTitle = DEFAULT_PAGE_TITLE;
        private _pageSubTitle = '';
        private _mainScope: IPageTitleScope & INavigationScope;
        private _currentRouteInfo: PageRouteInfo;
        private _currentRoute: ng.route.ICurrentRoute;
        private _currentNavItem: NavMenuItem;
        private _rootItems: NavMenuItem[] = [];
        readonly [Symbol.toStringTag]: string = SERVICE_NAME_PAGE_MANAGER;

        constructor($rootScope: ng.IRootScopeService, private readonly _pageRouteInfo: ReadonlyArray<NavRouteInfo>) {
            const svc: Service = this;
            this.setCurrentRoute(this._pageRouteInfo[0]);
            let item: NavMenuItem = this._currentNavItem;
            while (typeof item.parent !== 'undefined')
                item = item.parent;
            while (typeof item.previous !== 'undefined')
                item = item.previous;
            do { this._rootItems.push(item); } while (typeof (item = item.next) !== 'undefined');
            $rootScope.$on('$routeChangeSuccess', function (event: ng.IAngularEvent, current: ng.route.ICurrentRoute): void {
                if (typeof current.name !== 'string')
                    return;

                svc._currentRoute = current;
                let routeInfo: NavRouteInfo | undefined = this.getRouteInfoById(current.name);
                if (typeof routeInfo !== 'undefined')
                    svc.setCurrentRoute(routeInfo);
            });
        }

        getRouteInfoById(id: string): NavRouteInfo | undefined {
            for (let i: number = 0; i < this._pageRouteInfo.length; i++) {
                if ((<ICustomRouteMembers>this._pageRouteInfo[i]).id === id)
                    return this._pageRouteInfo[i];
            }
        }

        currentPage(): PageRouteInfo { return this._currentRouteInfo; }

        currentRoute(): ng.route.ICurrentRoute { return this._currentRoute; }

        private setCurrentRoute(route: NavRouteInfo): void {
            if (Provider.isRouteRedirectInfo(route))
                return;
            this._currentRouteInfo = route;
            if (Provider.routeInfoUsesDefaultController(route)) {
                if (route.subTitle === 'string' && route.subTitle.length > 0)
                    this.pageTitle(route.title, route.subTitle);
                else
                    this.pageTitle(route.title);
            }
            this._currentNavItem = NavMenuItem.setCurrent(this._pageRouteInfo, (typeof this._mainScope === 'undefined') ? this._rootItems : this._mainScope, route);
        }

        /**
         * Gets or sets the the current page title.
         * @param {string} [value] - If defined, this will set the current page title and the page subtitle will be empty.
         * @returns {string} The current page title.
         * @memberof PageLocationService
         */
        pageTitle(value?: string): string;
        /**
         * Sets the new page title and subtitle.
         * @param value - The new page title.
         * @param subTitle - The new page subtitle.
         * @returns {string} The current page title.
         * @memberof PageLocationService
         */
        pageTitle(value: string, subTitle: string): string;
        pageTitle(value?: string, subTitle?: string): string {
            if (typeof value === 'string') {
                this._pageTitle = ((value = value.trim()).length == 0) ? DEFAULT_PAGE_TITLE : value;
                this._pageSubTitle = (typeof subTitle === 'string') ? subTitle : '';
                if (typeof this._mainScope !== 'undefined') {
                    this._mainScope.pageTitle = this._pageTitle;
                    this._mainScope.subTitle = this._pageSubTitle;
                    this._mainScope.showSubtitle = this._pageSubTitle.trim().length > 0;
                }
            }
            return this._pageTitle;
        }

        /**
         * Gets the current page subtitle.
         * @returns {string} - The current page subtitle title or an empty string if there is currently no subtitle.
         * @memberof PageLocationService
         */
        pageSubTitle(value?: string): string { return this._pageSubTitle; }

        /**
         * This should only be called by the main controller so the main controller's page title properties can be updated.
         * @param {IPageTitleScope & INavigationScope} scope - The scope of the main application controller.
         * @memberof PageLocationService
         */
        setScope(scope: IPageTitleScope & INavigationScope): void {
            if (typeof scope !== 'object' || scope === null)
                return;
            (this._mainScope = scope).pageTitle = this._pageTitle;
            scope.showSubtitle = (scope.subTitle = this._pageSubTitle).trim().length > 0;
            NavMenuItem.setCurrent(this._pageRouteInfo, this._mainScope, this._currentRouteInfo)
        }
    }
    export interface ICustomRouteMembers {
        route: string;
        id?: string;
        linkTitle?: string;
        parentId?: string;
        title: string;
        subTitle?: string;
        tooltip?: string;
    }
    export type RouteTemplateUrl = Readonly<Omit<Mandatory<ICustomRouteMembers, "linkTitle">, "title" | "subTitle"> & Omit<Mandatory<ng.route.IRoute, "controller" | "templateUrl">, "template">>;
    export type RouteTemplateString = Readonly<Omit<Mandatory<ICustomRouteMembers, "linkTitle">, "title" | "subTitle"> & Omit<Mandatory<ng.route.IRoute, "controller" | "template">, "templateUrl">>;
    export type RouteTemplateUrlDefaultController = Readonly<ICustomRouteMembers & Omit<Mandatory<ng.route.IRoute, "templateUrl">, "template">>;
    export type RouteTemplateStringDefaultController = Readonly<ICustomRouteMembers & Omit<Mandatory<ng.route.IRoute, "template">, "templateUrl">>;
    export type RouteRedirectInfo = Readonly<Pick<ICustomRouteMembers, "route"> & Omit<Mandatory<ng.route.IRoute, "redirectTo">, "controller" | "template" | "templateUrl" | "resolve">>;
    export type PageRouteInfo = Mandatory<RouteTemplateUrl, 'id'> | Mandatory<RouteTemplateString, 'id'> | Mandatory<RouteTemplateUrlDefaultController, 'id'> |
        Mandatory<RouteTemplateStringDefaultController, 'id'>;
    export type NavRouteInfo = PageRouteInfo | RouteRedirectInfo;
    export class Provider implements ng.IServiceProvider {
        readonly [Symbol.toStringTag]: string = PROVIDER_NAME_PAGE_MANAGER;
        private readonly _pageRouteInfo: ReadonlyArray<RouteTemplateUrl | RouteTemplateString | RouteTemplateUrlDefaultController | RouteTemplateStringDefaultController | RouteRedirectInfo> = [
            {
                templateUrl: 'Template/Pages/Home.htm',
                route: '/home',
                title: DEFAULT_PAGE_TITLE,
                linkTitle: "Home"
            },
            {
                id: 'implementation',
                templateUrl: 'Template/Pages/Implementation/Index.htm',
                route: '/implementation',
                title: 'ServiceNow Implementation Notes',
                linkTitle: 'Implementation Notes'
            },
            {
                parentId: 'implementation',
                templateUrl: 'Template/Pages/Implementation/ServiceCatalog.htm',
                route: '/implementation/serviceCatalog',
                title: 'ServiceNow Implementation Notes',
                subTitle: 'Service Catalog',
                linkTitle: 'Service Catalog'
            },
            {
                parentId: 'implementation',
                templateUrl: 'Template/Pages/Implementation/Incident.htm',
                route: '/implementation/incident',
                controller: incidentManagment.CONTROLLER_NAME_INCIDENT_MGMT,
                controllerAs: 'incidentManagment',
                linkTitle: 'Incident Management'
            },
            {
                parentId: 'implementation',
                templateUrl: 'Template/Pages/Implementation/Change.htm',
                route: '/implementation/change',
                title: 'ServiceNow Implementation Notes',
                subTitle: 'Change Management',
                linkTitle: 'Change Management'
            },
            {
                parentId: 'implementation',
                templateUrl: 'Template/Pages/Implementation/Security.htm',
                route: '/implementation/security',
                title: 'ServiceNow Implementation Notes',
                subTitle: 'Security Operations',
                linkTitle: 'Security Operations'
            },
            {
                templateUrl: 'Template/Pages/InitialConfig.htm',
                route: '/initialConfig',
                title: 'Initial Configuration Instructions',
                linkTitle: 'Initial Config'
            },
            {
                id: 'dev',
                templateUrl: 'Template/Pages/Dev/Index.htm',
                route: '/dev',
                title: 'Development Resources',
                linkTitle: 'Dev Resources'
            },
            {
                parentId: 'dev',
                templateUrl: 'Template/Pages/Dev/Notes.htm',
                route: '/dev/notes',
                title: 'Development Resources',
                subTitle: 'Development Notes',
                linkTitle: 'Notes'
            },
            {
                parentId: 'dev',
                templateUrl: 'Template/Pages/Dev/Git.htm',
                route: '/dev/git',
                title: 'Development Resources',
                subTitle: 'Git Notes',
                linkTitle: 'Git'
            },
            {
                parentId: 'dev',
                templateUrl: 'Template/Pages/Dev/Azure.htm',
                route: '/dev/azure',
                title: 'Development Resources',
                subTitle: 'Azure Notes',
                linkTitle: 'Azure'
            },
            {
                parentId: 'dev',
                templateUrl: 'Template/Pages/Dev/Snippets.htm',
                route: '/dev/snippets',
                title: 'Development Resources',
                subTitle: 'Code Snippets',
                linkTitle: 'Snippets'
            },
            {
                parentId: 'dev',
                templateUrl: 'Template/Pages/Dev/SiteDesign.htm',
                route: '/dev/siteDesign',
                title: 'Development Resources',
                subTitle: "Documentation Website Design Notes",
                linkTitle: "Site Design"
            },
            { route: '/', redirectTo: "/home" }
        ];
        get $get(): ['$rootScope', ($rootScope: ng.IRootScopeService) => Service] {
            let provider: Provider = this;
            return ['$rootScope', function pageManagerFactory($rootScope: ng.IRootScopeService): Service {
                return new Service($rootScope, provider.getRouteInfo());
            }];
        }
        private getRouteInfo(): ReadonlyArray<NavRouteInfo> {
            return this._pageRouteInfo.map(function (value: NavRouteInfo, index: number): NavRouteInfo {
                if (Provider.isRouteRedirectInfo(value))
                    return value;
                if (typeof value.id !== "string")
                    (<ICustomRouteMembers>value).id = "__page" + index;
                return <NavRouteInfo>value;
            });
        }
        static isRouteRedirectInfo(routeInfo: NavRouteInfo): routeInfo is RouteRedirectInfo {
            return typeof routeInfo === "object" && routeInfo !== null && typeof (<RouteRedirectInfo>routeInfo).redirectTo === "string";
        }
        static routeInfoHasPageTemplateUrl(routeInfo: NavRouteInfo): routeInfo is Exclude<PageRouteInfo, RouteTemplateString | RouteTemplateStringDefaultController> {
            return typeof routeInfo === "object" && routeInfo !== null && typeof (<RouteTemplateUrl>routeInfo).templateUrl === "string";
        }
        static routeInfoHasPageTemplateString(routeInfo: NavRouteInfo): routeInfo is Exclude<PageRouteInfo, RouteTemplateUrl | RouteTemplateUrlDefaultController> {
            return typeof routeInfo === "object" && routeInfo !== null && typeof (<RouteTemplateString>routeInfo).template === "string";
        }
        static routeInfoHasExplicitController(routeInfo: NavRouteInfo): routeInfo is Exclude<PageRouteInfo, RouteTemplateStringDefaultController | RouteTemplateUrlDefaultController> {
            return typeof routeInfo === "object" && routeInfo !== null && typeof (<RouteTemplateUrlDefaultController>routeInfo).title !== "string";
        }
        static routeInfoUsesDefaultController(routeInfo: NavRouteInfo): routeInfo is Exclude<PageRouteInfo, RouteTemplateString | RouteTemplateUrl> {
            return typeof routeInfo === "object" && routeInfo !== null && typeof (<RouteTemplateUrlDefaultController>routeInfo).title === "string";
        }
        ConfigureRoutes($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider): void {
            $locationProvider.hashPrefix(HASH_PREFIX);
            this.getRouteInfo().forEach(function (value: NavRouteInfo): void {
                let routeDef: ng.route.IRoute;
                if (Provider.isRouteRedirectInfo(value))
                    routeDef = { redirectTo: value.redirectTo };
                else {
                    if (Provider.routeInfoUsesDefaultController(value))
                        routeDef = { controller: CONTROLLER_NAME_DEFAULT_PAGE, controllerAs: CONTROLLER_NAME_DEFAULT_PAGE };
                    else {
                        routeDef = { controller: value.controller };
                        if (typeof value.controllerAs === 'string')
                            routeDef.controllerAs = value.controllerAs;
                    }
                    routeDef.name = value.id;
                    if (Provider.routeInfoHasPageTemplateUrl(value))
                        routeDef.templateUrl = value.templateUrl;
                    else
                        routeDef.template = value.template;
                    if (typeof value.caseInsensitiveMatch === "boolean")
                        routeDef.caseInsensitiveMatch = value.caseInsensitiveMatch;
                    if (typeof value.reloadOnSearch === "boolean")
                        routeDef.reloadOnSearch = value.reloadOnSearch;
                    if (typeof value.resolve === "object" && value.resolve !== null)
                        routeDef.resolve = value.resolve;
                }
                $routeProvider.when(value.route, routeDef);
            });
        }
    }
}

/**
 * The main application namespace
 * @namespace
 */
namespace app {
    /**
     * The main module for this app.
     * @export
     * @constant {ng.IModule}
     */
    export const appModule: ng.IModule = angular.module("app", [])
        .provider(pageManager.SERVICE_NAME_PAGE_MANAGER, pageManager.Provider)
        .config(['$locationProvider', '$routeProvider', 'pageManagerProvider',
            function ($locationProvider: ng.ILocationProvider, $routeProvider: ng.route.IRouteProvider, pageManagerProvider: pageManager.Provider) {
                pageManagerProvider.ConfigureRoutes($routeProvider, $locationProvider);
                window.alert('Called config');
            }])
        .controller(pageManager.CONTROLLER_NAME_MAIN_CONTENT, pageManager.MainContentController.getControllerInjectable())
        .controller(pageManager.CONTROLLER_NAME_DEFAULT_PAGE, pageManager.DefaultPageController.getControllerInjectable())
        .service(persistentStorageLoaderService.SERVICE_NAME, persistentStorageLoaderService.getServiceInjectable())
        .service(notificationMessageService.SERVICE_NAME, notificationMessageService.getServiceInjectable())
        .service(appConfigLoaderService.SERVICE_NAME, appConfigLoaderService.getServiceInjectable())
        .service(navConfigLoaderService.SERVICE_NAME, navConfigLoaderService.getServiceInjectable())
        .service(appModalPopupService.SERVICE_NAME, appModalPopupService.getServiceInjectable())
        .directive(appModalPopupService.DIRECTIVE_NAME, appModalPopupService.Service.getDirectiveInjectable())
        .directive(urlInputDirective.DIRECTIVE_NAME, urlInputDirective.getDirectiveInjectable())
        .directive(configUrlDirective.DIRECTIVE_NAME, configUrlDirective.getDirectiveInjectable())
        .directive(aConfigLinkDirective.DIRECTIVE_NAME, aConfigLinkDirective.getDirectiveInjectable())
        .directive(snNavLinkDirective.DIRECTIVE_NAME, snNavLinkDirective.getDirectiveInjectable());

    //// #region appContent directive.

    ///**
    // * Defines the directive name as "appContent".
    // * @export
    // * @constant {string}
    // */
    //export const DIRECTIVE_NAME_appContentDirective: string = "appContent";

    ///**
    // *
    // *
    // * @interface IDirectiveScope
    // * @extends {ng.IScope}
    // */
    //export interface IAppContentDirectiveScope extends ng.IScope {
    //    /**
    //     * The controller associated with the current scope.
    //     *
    //     * @type {appContentController}
    //     * @memberof IDirectiveScope
    //     */
    //    appContentController: appContentController;
    //    /**
    //     * The title of the current page.
    //     *
    //     * @type {string}
    //     * @memberof IDirectiveScope
    //     */
    //    pageTitle: string;
    //    /**
    //     * The value of the GIT repository URL field in the edit setup parameters dialog.
    //     *
    //     * @type {string}
    //     * @memberof IDirectiveScope
    //     */
    //    serviceNowUrl: string;
    //    /**
    //     * Indicates whether the ServiceNow URL field in the edit setup parameters dialog is valid.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    serviceNowUrlIsValid: boolean;
    //    /**
    //     * The value of the GIT repository URL field in the edit setup parameters dialog.
    //     *
    //     * @type {string}
    //     * @memberof IDirectiveScope
    //     */
    //    gitServiceUrl: string;
    //    /**
    //     * Indicates whether the GIT repository URL field in the edit setup parameters dialog is valid.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    gitServiceUrlIsValid: boolean;
    //    idpUrl: string;
    //    idpUrlIsValid: boolean;
    //    /**
    //     * Indicates whether all fields in the edit setup parameters dialog are valid.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    setupParametersAreInvalid: boolean;
    //    /**
    //     * Indicates whether the edit setup parameters dialog is being displayed.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    setupParametersDialogVisible: boolean;
    //    /**
    //     * Navigation menu items to be displayed in the primary navigation menu.
    //     *
    //     * @type {ReadonlyArray<NavigationItem>}
    //     * @memberof IDirectiveScope
    //     */
    //    topNavItems: ReadonlyArray<navConfigLoaderService.NavigationItem>;
    //    /**
    //     * Indicates whether the secondary navigation menu is to be displayed.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    showSideMenu: boolean;
    //    /**
    //     * Ancestor navigation menu items to be displayed in the secondary navigation menu.
    //     *
    //     * @type {ReadonlyArray<NavigationItem>}
    //     * @memberof IDirectiveScope
    //     */
    //    sideNavBreadcrumbItems: ReadonlyArray<navConfigLoaderService.NavigationItem>;
    //    /**
    //     * Indicates whether ancestor navigation menu items are to be displayed in the secondary navigation menu.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    showBreadcrumbLinks: boolean;
    //    /**
    //     * Indicates whether the child/sibling navigation menu items are to be displayed in the secondary navigation menu.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    showSideNavItems: boolean;
    //    /**
    //     * Heading text for the secondary navigation menu.
    //     *
    //     * @type {string}
    //     * @memberof IDirectiveScope
    //     */
    //    sideNavHeading: string;
    //    /**
    //     * Indicates whether a heading is to be displayed in the secondary navigation menu.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    showSideNavHeading: boolean;
    //    /**
    //     * Navigation menu items within the secondary navigation menu, exclusing any that represents the current page or sibling items following the one that represents the current page.
    //     *
    //     * @type {ReadonlyArray<NavigationItem>}
    //     * @memberof IDirectiveScope
    //     */
    //    sideNavItems: ReadonlyArray<navConfigLoaderService.NavigationItem>;
    //    /**
    //     * Indicates whether navigation menu item representing the current page is to be displayed in the secondary navigation menu.
    //     *
    //     * @type {boolean}
    //     * @memberof IDirectiveScope
    //     */
    //    showCurrentItem: boolean;
    //    /**
    //     * Navigation menu item representing the current page.
    //     *
    //     * @type {ReadonlyArray<NavigationItem>}
    //     * @memberof IDirectiveScope
    //     */
    //    currentNavItem?: navConfigLoaderService.NavigationItem;
    //    /**
    //     * Navigation menu items within the secondary navigation menu that follow the item representing the current page.
    //     *
    //     * @type {ReadonlyArray<NavigationItem>}
    //     * @memberof IDirectiveScope
    //     */
    //    followingSideNavItems: ReadonlyArray<navConfigLoaderService.NavigationItem>;
    //    /**
    //     * CSS class names for the main content section.
    //     *
    //     * @type {string[]}
    //     * @memberof IDirectiveScope
    //     */
    //    mainSectionClass: string[];
    //    ///**
    //    // * Indicates whether the main modal popup dialog is being displayed.
    //    // *
    //    // * @type {boolean}
    //    // * @memberof IDirectiveScope
    //    // */
    //    //popupDialogVisible: boolean;
    //    ///**
    //    // * The title of the modal popup dialog.
    //    // *
    //    // * @type {string}
    //    // * @memberof IDirectiveScope
    //    // */
    //    //popupDialogTitle: string;
    //    ///**
    //    // * Message text for modal popup dialog.
    //    // *
    //    // * @type {string}
    //    // * @memberof IDirectiveScope
    //    // */
    //    //popupDialogMessage: string;
    //    ///**
    //    // * Buttons to be displayed in modal popup dialog.
    //    // *
    //    // * @type {IPopupDialogButtonConfig[]}
    //    // * @memberof IDirectiveScope
    //    // */
    //    //popupDialogButtons: IPopupDialogButtonConfig[];
    //    ///**
    //    // * The callback to invoke when the modal popup dialog has been closed.
    //    // *
    //    // * @type {{ (result?: any): void; }}
    //    // * @param {*} [result] - The dialog result value.
    //    // * @memberof IDirectiveScope
    //    // */
    //    //onPopupDialogClose?: { (result?: any): void; };
    //    /**
    //     * CSS class names for the modal popup dialog body element.
    //     *
    //     * @type {string[]}
    //     * @memberof IDirectiveScope
    //     */
    //    //popupDialogBodyClass: string[];
    //}

    ///**
    // * Implements the controller for the appContent directive
    // * @class Controller
    // * @implements {ng.IController}
    // */
    //export class appContentController implements ng.IController {
    //    /**
    //     * Creates an instance of the controller for the appContent directive.
    //     *
    //     * @param {IAppContentDirectiveScope} $scope - The scope for the current appContent directive.
    //     * @param {ng.ILogService} $log - The $log service.
    //     * @param {ng.IWindowService} $window - The $window service.
    //     * @param {appConfigDataService} appConfigData - The appConfigData service.
    //     * @memberof Controller
    //     */
    //    constructor(private $scope: IAppContentDirectiveScope, private $log: ng.ILogService, private $window: ng.IWindowService, private navConfigLoader: navConfigLoaderService.Service, private appConfigLoader: appConfigLoaderService.Service) {
    //        $scope.serviceNowUrlIsValid = $scope.gitServiceUrlIsValid = $scope.idpUrlIsValid = $scope.setupParametersAreInvalid = true;
    //        $scope.setupParametersDialogVisible = $scope.showSideMenu = $scope.showBreadcrumbLinks = $scope.showSideNavItems = $scope.showSideNavHeading = $scope.showCurrentItem = false;
    //        $scope.topNavItems = $scope.sideNavBreadcrumbItems = $scope.sideNavItems = $scope.followingSideNavItems = [];
    //        $scope.sideNavHeading = '';
    //        appConfigLoader.onServiceNowUrlChanged($scope, (url: URL) => {
    //            $scope.serviceNowUrl = url.href;
    //        });
    //        $scope.serviceNowUrl = appConfigLoader.serviceNowUrl().href;
    //        appConfigLoader.onGitServiceUrlChanged($scope, (url: URL) => {
    //            $scope.gitServiceUrl = url.href;
    //        });
    //        $scope.gitServiceUrl = appConfigLoader.gitServiceUrl().href;
    //        appConfigLoader.onIdpUrlChanged($scope, (url: URL) => {
    //            $scope.idpUrl = url.href;
    //        });
    //        $scope.idpUrl = appConfigLoader.idpUrl().href;
    //        this.updateMainSectionClass();
    //        navConfigLoader.loadPageTitle().then((title: string) => { $scope.pageTitle = title; });
    //        $scope.$watchGroup(['serviceNowUrlIsValid', 'gitServiceUrlIsValid', 'idpUrlIsValid'], () => {
    //            let areValid: boolean = $scope.serviceNowUrlIsValid && $scope.gitServiceUrlIsValid && $scope.idpUrlIsValid;
    //            if (areValid !== $scope.setupParametersAreInvalid)
    //                $scope.setupParametersAreInvalid = !areValid;
    //        });
    //        $scope.setupParametersAreInvalid = !($scope.serviceNowUrlIsValid && $scope.gitServiceUrlIsValid && $scope.idpUrlIsValid);
    //        navConfigLoader.loadTopNavItems().then((items: navConfigLoaderService.NavigationItem[]) => { $scope.topNavItems = items; });
    //        let ctrl: appContentController = this;
    //        navConfigLoader.loadCurrentItem().then((currentNavItem: navConfigLoaderService.NavigationItem) => {
    //            if (sys.isNil(currentNavItem)) {
    //                $scope.showBreadcrumbLinks = $scope.showSideMenu = $scope.showSideNavHeading = $scope.showSideNavItems = $scope.showCurrentItem = false;
    //                $scope.sideNavHeading = '';
    //                $scope.sideNavBreadcrumbItems = $scope.sideNavItems = $scope.followingSideNavItems = [];
    //                $scope.currentNavItem = undefined;
    //            } else {
    //                if (currentNavItem.isNestedNavItem) {
    //                    $scope.showBreadcrumbLinks = ($scope.sideNavBreadcrumbItems = currentNavItem.getBreadcrumbLinks()).length > 0;
    //                    let parentNavItem: navConfigLoaderService.NavigationItem = currentNavItem.parentNavItem;
    //                    if (currentNavItem.hasSiblingNavItem) {
    //                        $scope.showSideMenu = $scope.showSideNavItems = $scope.showCurrentItem = true;
    //                        $scope.sideNavItems = currentNavItem.precedingSiblings();
    //                        $scope.followingSideNavItems = currentNavItem.followingSiblings();
    //                        $scope.showSideNavHeading = ($scope.sideNavHeading = parentNavItem.sideNavHeading.trim()).length > 0;
    //                        $scope.currentNavItem = currentNavItem;
    //                    } else {
    //                        $scope.showSideNavItems = $scope.showSideNavHeading = $scope.showCurrentItem = false;
    //                        $scope.followingSideNavItems = $scope.sideNavItems = [];
    //                        $scope.showSideMenu = $scope.showBreadcrumbLinks;
    //                        $scope.sideNavHeading = '';
    //                        $scope.currentNavItem = undefined;
    //                    }
    //                } else {
    //                    $scope.currentNavItem = undefined;
    //                    $scope.showBreadcrumbLinks = $scope.showCurrentItem = false;
    //                    $scope.sideNavBreadcrumbItems = $scope.followingSideNavItems = [];
    //                    $scope.showSideMenu = $scope.showSideNavItems = currentNavItem.hasChildNavItem;
    //                    if ($scope.showSideMenu) {
    //                        $scope.showSideNavHeading = ($scope.sideNavHeading = currentNavItem.sideNavHeading.trim()).length > 0;
    //                        $scope.sideNavItems = currentNavItem.childNavItems;
    //                    } else {
    //                        $scope.sideNavItems = [];
    //                        $scope.sideNavHeading = '';
    //                        $scope.showSideNavHeading = $scope.showSideNavItems = false;
    //                    }
    //                }
    //            }
    //            ctrl.updateMainSectionClass();
    //        }, (reason: any) => {
    //            $log.error(angular.toJson({
    //                message: "Error loading application settings",
    //                reason: reason
    //            }, true));
    //            $window.alert("Unexpected error loading application settings. See browser log for more detail.");
    //        });
    //    }

    //    private updateMainSectionClass() {
    //        if (this.$scope.showSideMenu)
    //            this.$scope.mainSectionClass = ["container-fluid", "col-8", "col-lg-9"];
    //        else
    //            this.$scope.mainSectionClass = ["container-fluid", "col-12"];
    //    }

    //    /**
    //     * Opens the edit dialog for setup parameters.
    //     *
    //     * @param {JQueryInputEventObject} [event] - The event object.
    //     * @memberof Controller
    //     */
    //    openSetupParametersEditDialog(event?: JQueryInputEventObject): void {
    //        sys.preventEventDefault(event);
    //        if (!this.$scope.setupParametersDialogVisible) {
    //            $("#setupParametersDialog").modal('show');
    //            this.$scope.setupParametersDialogVisible = true;
    //        }
    //    }

    //    /**
    //     * Closes the edit dialog for setup parameters.
    //     *
    //     * @param {JQueryInputEventObject} [event] - The event object.
    //     * @param {boolean} [accept] - Whether to accept any validated changes that were made.
    //     * @memberof Controller
    //     */
    //    closeSetupParametersEditDialog(event?: JQueryInputEventObject, accept?: boolean): void {
    //        sys.preventEventDefault(event);
    //        if (this.$scope.setupParametersDialogVisible) {
    //            $("#setupParametersDialog").modal('hide');
    //            this.$scope.setupParametersDialogVisible = false;
    //        }
    //    }

    //    $onInit(): void { }
    //}

    //appModule.directive(DIRECTIVE_NAME_appContentDirective, () => {
    //    return {
    //        controller: ['$scope', '$log', '$window', navConfigLoaderService.SERVICE_NAME, appConfigLoaderService.SERVICE_NAME, appContentController],
    //        controllerAs: 'appContentController',
    //        restrict: "E",
    //        scope: true,
    //        templateUrl: 'Template/appContent.htm',
    //        transclude: true
    //    };
    //});

    //// #endregion

    // #region copyToClipboardButton directive and copyToClipboardService.

    /**
     * Defines the copy service name as "copyToClipboardService".
     * @export
     * @constant {string}
     */
    export const SERVICE_NAME_copyToClipboard = "copyToClipboardService";

    /**
     * Defines the copy directive name as "copyToClipboardButton".
     *
     * @todo Rename to buttonCopyToClipboard to use as <button:copy-to-clipboard />
     * @export
     * @constant {string}
     */
    export const DIRECTIVE_NAME_copyToClipboard = "copyToClipboardButton";

    const btnCssClassRe: RegExp = /(^|\s)btn(\s|$)/g;
    const btnStyleCssClassRe: RegExp = /(^|\s)btn-\S/g;
    const paddingCssClassRe: RegExp = /(^|\s)p(l|t|r|b)?-\S/g;

    export class copyToClipboardService {
        [Symbol.toStringTag]: string;
        constructor(public $window: ng.IWindowService) { this[Symbol.toStringTag] = SERVICE_NAME_copyToClipboard; }
        copy(element: JQuery, successMsg?: string) {
            try {
                element.text();
                let range: Range = this.$window.document.createRange();
                range.selectNode(element[0]);
                let selection: Selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                this.$window.document.execCommand('copy');
                selection.removeAllRanges();
                if ((typeof successMsg === "string") && (successMsg = successMsg.trim()).length > 0)
                    alert(successMsg);
                else
                    alert('Text copied to clipboard');
            } catch (ex) {
                alert('Failed to copy to clipboard: ' + ex);
            }
        }
    }

    /**
     * Attributes that can be used with the copyToClipboardButton directive.
     * @export
     * @interface ICopyDirectiveAttributes
     * @example <caption>Example with default message.</caption>
     * ```
     * <copy-to-clipboard-button target="exampleCode" ></copy-to-clipboard-button>
     * <code class="multi-line" id="exampleCode">&lt;var class=&quot;targetName&quot;&gt;Example Name&lt;/var&gt;</code>
     * <!-- Clicking the button will produce the message "Text copied to clipboard" and Transpiled code will be: -->
     * <button class="btn btn-light btn-outline-dark p-1">
     *      <svg class="fill-light stroke-dark" width="16" height="16">
     *          <use xlink:href="images/icons.svg#clipboard"></use>
     *      </svg>
     * </button>
     * ```
     * @example <caption>Example with custom message and css.</caption>
     * ```
     * <copy-to-clipboard-button target="exampleCode" success-message="Code Copied" class="btn-secondary"></copy-to-clipboard-button>
     * <code class="multi-line" id="exampleCode">&lt;var class=&quot;targetName&quot;&gt;Example Name&lt;/var&gt;</code>
     * <!-- Clicking the button will produce the message "Code Copied" and Transpiled code will be: -->
     * <button class="btn btn-secondary p-1">
     *      <svg class="fill-light stroke-dark" width="16" height="16">
     *          <use xlink:href="images/icons.svg#clipboard"></use>
     *      </svg>
     * </button>
     * ```
     */
    export interface ICopyToClipboardDirectiveAttributes {
        /**
         * CSS class names to apply to button.
         * @type {string}
         * @memberof ICopyDirectiveAttributes
         */
        class?: string;

        /**
         * The id of the element containing text to be copied.
         * @type {string}
         * @memberof ICopyDirectiveAttributes
         */
        target: string;

        /**
         * Message to display after text is succssfully copied to clipboard.
         * @type {string}
         * @memberof ICopyDirectiveAttributes
         */
        successMessage?: string;
    }

    interface ICopyToClipboardDirectiveScope extends ng.IScope {
        ctrl: copyToClipboardButtonController;
    }

    export class copyToClipboardButtonController implements ng.IController {
        private _cssClass: string[];
        private _targetId: string;
        private _successMessage?: string;

        get cssClass(): string[] { return this._cssClass; }

        get targetId(): string { return this._targetId; }

        constructor(public $scope: ICopyToClipboardDirectiveScope, public copyToClipboardService: copyToClipboardService) { }

        copyToClipboard(event: BaseJQueryEventObject): void {
            try { this.copyToClipboardService.copy($("#" + this._targetId), this._successMessage); }
            finally { sys.preventEventDefault(event); }
        }

        static createDirective(): ng.IDirective {
            return {
                restrict: "E",
                controllerAs: "ctrl",
                controller: ["$scope", "copyToClipboardService", copyToClipboardButtonController],
                replace: true,
                template: '<button ng-click="ctrl.copyToClipboard(event)"><svg class="fill-light stroke-dark" width="16" height="16"><use xlink:href="images/icons.svg#clipboard"></use></svg></button>',
                link: (scope: ICopyToClipboardDirectiveScope, element: JQuery, attr: ICopyToClipboardDirectiveAttributes & ng.IAttributes, controller: ng.IController) => {
                    scope.ctrl.initialize(attr.target, attr.successMessage, attr.class);
                }
            };
        }

        initialize(targetId: string, successMessage?: string, cssClass?: string) {
            this._targetId = targetId;
            this._successMessage = successMessage;
            if (typeof cssClass === "string" && (cssClass = cssClass.trim()).length > 0) {
                this._cssClass = sys.unique(cssClass.split(sys.whitespaceRe));
                if (this._cssClass.indexOf('btn') < 0)
                    this._cssClass.unshift('btn');
                if (!btnStyleCssClassRe.test(cssClass)) {
                    this._cssClass.push("btn-light");
                    this._cssClass.push("btn-outline-dark");
                }
                if (!paddingCssClassRe.test(cssClass))
                    this._cssClass.push("p-1");
            } else
                this._cssClass = ['btn', 'btn-light', 'btn-outline-dark', 'p-1'];
        }

        $onInit() { }
    }

    appModule.service(SERVICE_NAME_copyToClipboard, ["$window", copyToClipboardService]);
    appModule.directive(DIRECTIVE_NAME_copyToClipboard, copyToClipboardButtonController.createDirective);

    // #endregion

    // #region urlBuilderService

    const uriParseRegex: RegExp = /^(([^\\\/@:]*)(:[\\\/]{0,2})((?=[^\\\/@:]*(?::[^\\\/@:]*)?@)([^\\\/@:]*)(:[^\\\/@:]*)?@)?([^\\\/@:]*)(?:(?=:\d*(?:[\\\/:]|$)):(\d*))?(?=[\\\/:]|$))?(.+)?$/;
    const originParseRegex: RegExp = /^(([^\\\/@\s?#:]+)(:\/{0,2})((?=[^\\\/@?#:]*(?::[^\\\/@?#:]*)?@)([^\\\/@?#:]*)(:[^\\\/@?#:]*)?@)?(?:([^\\\/@?#\s:]+)(?:(?=:\d*(?:[\\\/:]|$)):(\d*))?)?)([\/:])?$/;
    const schemeNameRegex: RegExp = /^([^\\\/@\s:]+):?$/;
    const schemeSeparatorRegex: RegExp = /^:(\/\/?)?$/;
    const hostRegex: RegExp = /^([^\\\/?#@\s"]+)(:\d+)?$/;
    const fileSystemPathRegex: RegExp = /^([a-z]:([\\\/]([^\\\/?#:]|$)|$)|[\\\/]{2}[^\\\/?#:]+)/i;

    enum uriParseGroup {
        all = 0,
        origin = 1,
        schemeName = 2,
        schemeSeparator = 3,
        userInfo = 4,
        username = 5,
        password = 6,
        hostname = 7,
        portnumber = 8,
        path = 9
    }

    /*
     * https://john.doe@www.example.com:123/forum/questions/?tag=networking&order=newest#top
      └─┬─┘ └───────┬────────────────────┘└─┬─────────────┘└──┬───────────────────────┘└┬─┘
      scheme     authority                 path              query                      fragment

      ldap://[2001:db8::7]/c=GB?objectClass?one
      └─┬┘ └───────┬─────┘└─┬─┘ └──────┬──────┘
     scheme    authority  path       query

      mailto:John.Doe@example.com
      └──┬─┘ └─────────┬────────┘
      scheme         path

      news:comp.infosystems.www.servers.unix
      └─┬┘ └───────────────┬───────────────┘
     scheme              path

      tel:+1-816-555-1212
      └┬┘ └──────┬──────┘
    scheme     path

      telnet://192.0.2.16:80/
      └──┬─┘ └──────┬──────┘│
      scheme    authority  path

      urn:oasis:names:specification:docbook:dtd:xml:4.1.2
     */
    export interface ISchemaProperties {
        supportsPath?: boolean;
        supportsQuery?: boolean;
        supportsFragment?: boolean;
        supportsCredentials?: boolean;
        requiresHost?: boolean;
        supportsPort?: boolean;
        requiresUsername?: boolean;
        schemeSeparator?: string;
        defaultPort?: number;
    }

    export class SchemaProperties implements ISchemaProperties {
        readonly name: string;
        readonly description: string;
        readonly supportsPath: boolean;
        readonly supportsQuery: boolean;
        readonly supportsFragment: boolean;
        readonly supportsCredentials: boolean;
        readonly requiresHost: boolean;
        readonly supportsPort: boolean;
        readonly requiresUsername: boolean;
        readonly defaultPort: number;
        readonly schemeSeparator: string;
        constructor(name: string, properties?: ISchemaProperties, description?: string) {
            this.name = name;
            description = ((typeof description !== "string") || (description = description.trim()).length == 0) ? "\"" + name + "\" scheme" : description;

            if (typeof (properties) === 'undefined' || properties === null) {
                this.supportsPath = true;
                this.supportsQuery = true;
                this.supportsFragment = true;
                this.supportsCredentials = true;
                this.requiresHost = false;
                this.supportsPort = true;
                this.requiresUsername = false;
                this.defaultPort = NaN;
                this.schemeSeparator = "://";
            } else {
                this.supportsPath = (typeof (properties.supportsPath) !== 'boolean' || properties.supportsPath === true);
                this.supportsQuery = (typeof (properties.supportsQuery) !== 'boolean' || properties.supportsQuery === true);
                this.supportsFragment = (typeof (properties.supportsFragment) !== 'boolean' || properties.supportsFragment === true);
                this.supportsCredentials = (typeof (properties.supportsCredentials) !== 'boolean' || properties.supportsCredentials === true);
                this.requiresHost = (typeof (properties.requiresHost) !== 'boolean' || properties.requiresHost === true);
                this.supportsPort = (typeof (properties.supportsPort) !== 'boolean' || properties.supportsPort === true);
                this.requiresUsername = (typeof (properties.requiresUsername) === 'boolean' && properties.requiresUsername === true);
                this.defaultPort = properties.defaultPort;
                this.schemeSeparator = (typeof (properties.schemeSeparator) == 'string') ? properties.schemeSeparator : "://";
            }
        }

        static getSchemaProperties(name: string): SchemaProperties {
            if (name.endsWith(':'))
                name = name.substr(0, name.length - 1);
            switch (name) {
                case 'ftp':
                    return SchemaProperties.uriScheme_ftp;
                case 'ftps':
                    return SchemaProperties.uriScheme_ftps;
                case 'sftp':
                    return SchemaProperties.uriScheme_sftp;
                case 'http':
                    return SchemaProperties.uriScheme_http;
                case 'https':
                    return SchemaProperties.uriScheme_https;
                case 'gopher':
                    return SchemaProperties.uriScheme_gopher;
                case 'mailto':
                    return SchemaProperties.uriScheme_mailto;
                case 'news':
                    return SchemaProperties.uriScheme_news;
                case 'nntp':
                    return SchemaProperties.uriScheme_nntp;
                case 'telnet':
                    return SchemaProperties.uriScheme_telnet;
                case 'wais':
                    return SchemaProperties.uriScheme_wais;
                case 'file':
                    return SchemaProperties.uriScheme_file;
                case 'net.pipe':
                    return SchemaProperties.uriScheme_netPipe;
                case 'net.tcp':
                    return SchemaProperties.uriScheme_netTcp;
                case 'ldap':
                    return SchemaProperties.uriScheme_ldap;
                case 'ssh':
                    return SchemaProperties.uriScheme_ssh;
                case 'git':
                    return SchemaProperties.uriScheme_git;
                case 'urn':
                    return SchemaProperties.uriScheme_urn;
            }
            return new SchemaProperties(name);
        }
        /**
         * File Transfer protocol
         **/
        static readonly uriScheme_ftp: SchemaProperties = new SchemaProperties("ftp", { supportsQuery: false, supportsFragment: false, defaultPort: 21 }, "File Transfer protocol");
        /**
         * File Transfer protocol (secure)
         **/
        static readonly uriScheme_ftps: SchemaProperties = new SchemaProperties("ftps", { supportsQuery: false, supportsFragment: false, defaultPort: 990 }, "File Transfer protocol (secure)");
        /**
         * Secure File Transfer Protocol
         **/
        static readonly uriScheme_sftp: SchemaProperties = new SchemaProperties("sftp", { supportsQuery: false, supportsFragment: false, defaultPort: 22 }, "Secure File Transfer Protocol");
        /**
         * Hypertext Transfer Protocol
         **/
        static uriScheme_http: SchemaProperties = new SchemaProperties("http", { defaultPort: 80 }, "Hypertext Transfer Protocol");
        /**
         * Hypertext Transfer Protocol (secure)
         **/
        static uriScheme_https: SchemaProperties = new SchemaProperties("https", { defaultPort: 443 }, "Hypertext Transfer Protocol (secure)");
        /**
         * Gopher protocol
         **/
        static uriScheme_gopher: SchemaProperties = new SchemaProperties("gopher", { defaultPort: 70 }, "Gopher protocol");
        /**
         * Electronic mail address
         **/
        static uriScheme_mailto: SchemaProperties = new SchemaProperties("mailto", { schemeSeparator: ":" }, "Electronic mail address");
        /**
         * USENET news
         **/
        static uriScheme_news: SchemaProperties = new SchemaProperties("news", { supportsCredentials: false, requiresHost: false, supportsPort: false, schemeSeparator: ":" }, "USENET news")
        /**
         * USENET news using NNTP access
         **/
        static uriScheme_nntp: SchemaProperties = new SchemaProperties("nntp", { defaultPort: 119 }, "USENET news using NNTP access");
        /**
         * Reference to interactive sessions
         **/
        static uriScheme_telnet: SchemaProperties = new SchemaProperties("telnet", { supportsPath: false, supportsQuery: false, supportsFragment: false, supportsCredentials: false, defaultPort: 23 }, "Reference to interactive sessions");
        /**
         * Wide Area Information Servers
         **/
        static uriScheme_wais: SchemaProperties = new SchemaProperties("wais", { defaultPort: 443 }, "Wide Area Information Servers");
        /**
         * Host-specific file names
         **/
        static uriScheme_file: SchemaProperties = new SchemaProperties("file", { supportsQuery: false, supportsFragment: false, supportsCredentials: false, requiresHost: false, supportsPort: false }, "Host-specific file names");
        /**
         * Net Pipe
         **/
        static uriScheme_netPipe: SchemaProperties = new SchemaProperties("net.pipe", { supportsPort: false }, "Net Pipe");
        /**
         * Net-TCP
         **/
        static uriScheme_netTcp: SchemaProperties = new SchemaProperties("net.tcp", { defaultPort: 808 }, "Net-TCP");
        /**
         * Lightweight Directory Access Protocol
         **/
        static uriScheme_ldap: SchemaProperties = new SchemaProperties("ldap", { defaultPort: 389 }, "Lightweight Directory Access Protocol");
        /**
         * Secure Shell
         **/
        static uriScheme_ssh: SchemaProperties = new SchemaProperties("ssh", { defaultPort: 22 }, "Secure Shell");
        /**
         * GIT Respository
         **/
        static uriScheme_git: SchemaProperties = new SchemaProperties("git", { supportsQuery: false, supportsFragment: false, defaultPort: 9418 }, "GIT Respository");
        /**
         * Uniform Resource notation
         **/
        static uriScheme_urn: SchemaProperties = new SchemaProperties("urn", { supportsCredentials: false, requiresHost: false, supportsPort: false, schemeSeparator: ":" }, "Uniform Resource notation");
    }

    export class QueryParameters implements URLSearchParams {
        constructor(params?: string | URLSearchParams) {
            throw new Error("Not Implemented");
            // TODO: Implement QueryParameters constructor.
        }

        append(name: string, value: string): void {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.append().
        }

        delete(name: string): void {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.delete().
        }

        get(name: string): string {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.get().
        }

        getAll(name: string): string[] {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.getAll().
        }

        has(name: string): boolean {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.has().
        }

        set(name: string, value: string): void {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.set().
        }

        sort(): void {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.sort().
        }

        forEach(callbackfn: (value: string, key: string, parent: URLSearchParams) => void, thisArg?: any): void {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.forEach().
        }

        [Symbol.iterator](): IterableIterator<[string, string]> {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.iterator().
        }

        entries(): IterableIterator<[string, string]> {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.entries().
        }

        keys(): IterableIterator<string> {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.keys().
        }

        values(): IterableIterator<string> {
            throw new Error("Method not implemented.");
            // TODO: Implement QueryParameters.values().
        }
    }

    export class Uri implements URL {
        private _href: string = "";
        private _origin: string = "";
        private _schemeName: string = "";
        private _schemeSeparator: string = "";
        private _username?: string = undefined;
        private _password?: string = undefined;
        private _hostname: string = "";
        private _port?: string = undefined;
        private _portnumber: number = NaN;
        private _pathname: string = "";
        private _search?: string = undefined;
        private _searchParams: URLSearchParams = new QueryParameters();
        private _hash?: string = undefined;

        // TODO: Implement QueryParameters.href.
        get href(): string { return this._href; };
        set href(value: string) { this._href = value; }

        get origin(): string { return this._origin; };
        set origin(value: string) {
            if ((typeof (value) == "string") && value.trim().length > 0) {
                let m: RegExpExecArray = originParseRegex.exec(value);
                if ((typeof m !== "object") || m === null)
                    throw new Error("Invalid origin");
                this._origin = m[uriParseGroup.origin];
                this._schemeName = m[uriParseGroup.schemeName];
                this._schemeSeparator = m[uriParseGroup.schemeSeparator];
                this._username = (typeof m[uriParseGroup.username] === "string" || typeof m[uriParseGroup.userInfo] !== "string") ? m[uriParseGroup.username] : "";
                this._password = m[uriParseGroup.password];
                this._hostname = m[uriParseGroup.hostname];
                this._port = m[uriParseGroup.portnumber];
                let s: string;
                this._portnumber = NaN;
                if ((typeof this._port === "string") && (s = this._port.trim()).length > 0) {
                    try { this._portnumber = parseInt(s); } catch { }
                    if (typeof this._portnumber !== "number")
                        this._portnumber = NaN;
                }
                if (typeof m[uriParseGroup.path] == "string" && !this._pathname.startsWith("/"))
                    this._pathname = (this._pathname.length == 0) ? "/" : "/" + this._pathname;
            } else {
                if (this._origin.length == 0)
                    return;
                this._origin = "";
            }
        }

        // TODO: Implement QueryParameters.protocol.
        get protocol(): string { return (typeof (this._schemeName) === "string") ? this._schemeName + this._schemeSeparator.substr(0, 1) : ""; };
        set protocol(value: string) {
            if ((typeof (value) == "string") && value.trim().length > 0) {
                let index: number = value.indexOf(":");
                if (index >= 0 && index < value.length - 1)
                    throw new Error("Invalid protocol string");
                this.schemeName = value;
            } else
                this.schemeName = "";
        }

        // TODO: Implement QueryParameters.schemeName.
        get schemeName(): string { return this._schemeName; }
        set schemeName(value: string) {
            if ((value = (typeof value !== "string") ? "" : value.trim()).length > 0) {
                let m: RegExpExecArray = schemeNameRegex.exec(value);
                if ((typeof m !== "object") || m === null)
                    throw new Error("Invalid scheme name");
                this._schemeName = m[1];
                if (this._schemeSeparator.length == 0)
                    this._schemeSeparator = SchemaProperties.getSchemaProperties(this._schemeName).schemeSeparator;
            } else {
                this._schemeName = this._schemeSeparator = "";

            }
        }

        // TODO: Implement QueryParameters.schemeSeparator.
        get schemeSeparator(): string { return this._schemeSeparator; }
        set schemeSeparator(value: string) {
            if ((value = (typeof value !== "string") ? "" : value.trim()).length > 0) {
                if (!schemeSeparatorRegex.test(value))
                    throw new Error("Invalid scheme separator");
                if (this._schemeName.length == 0)
                    this._schemeName = (value == ":") ? SchemaProperties.uriScheme_urn.name : SchemaProperties.uriScheme_http.name;
                this._schemeSeparator = value;
            } else
                this._schemeName = this._schemeSeparator = "";

            this._schemeSeparator = value;
        }

        // TODO: Implement QueryParameters.username.
        get username(): string { return this._username; };
        set username(value: string) { this._username = value; }

        // TODO: Implement QueryParameters.password.
        get password(): string { return this._password; };
        set password(value: string) { this._password = value; }

        // TODO: Implement QueryParameters.host.
        get host(): string { return (typeof this._port == "string") ? this._hostname + ":" + this._port : this._hostname; }
        set host(value: string) {
            if ((value = (typeof value !== "string") ? "" : value.trim()).length > 0) {
                let m: RegExpExecArray = hostRegex.exec(value);
                if ((typeof m !== "object") || m === null)
                    throw new Error("Invalid host");
                let p: number = NaN;
                if (typeof m[2] === "string") {
                    try { p = parseInt(m[2]); } catch { }
                    if (p === 0 || p === -1)
                        p = NaN;
                    else if (typeof p !== "number" || isNaN(p) || p < 0 || p > 65535)
                        throw new Error("Invalid port");
                }
                this._portnumber = p;
                this._hostname = m[1];
            } else
                this._schemeName = this._schemeSeparator = "";

            this._schemeSeparator = value;
        }

        // TODO: Implement QueryParameters.hostname.
        get hostname(): string { return this._hostname; };
        set hostname(value: string) { this._hostname = value; }

        // TODO: Implement QueryParameters.port.
        get port(): string { return this._port; };
        set port(value: string) { this._port = value; }

        // TODO: Implement QueryParameters.pathname.
        get pathname(): string { return this._pathname; };
        set pathname(value: string) { this._pathname = value; }

        // TODO: Implement QueryParameters.search.
        get search(): string { return this._search; };
        set search(value: string) { this._search = value; }

        // TODO: Implement QueryParameters.searchParams.
        get searchParams(): URLSearchParams { return this._searchParams; }
        set searchParams(value: URLSearchParams) { this._searchParams = value; }

        // TODO: Implement QueryParameters.hash.
        get hash(): string { return this._hash; }
        set hash(value: string) { this._hash = value; }

        // TODO: Implement QueryParameters.toJSON().
        toJSON(): string {
            throw new Error("Method not implemented.");
        }

        constructor(baseUri: URL | Uri, relativeUri: string | URL | Uri);
        constructor(uri: URL | Uri | string);
        constructor(baseUri: string | URL | Uri, relativeUri?: string | URL | Uri) {
            if ((typeof baseUri === "undefined") || ((typeof baseUri !== "string") && ((typeof baseUri !== "object") || baseUri === null))) {
                if ((typeof relativeUri === "undefined") || ((typeof relativeUri !== "string") && ((typeof relativeUri !== "object") || relativeUri === null)))
                    baseUri = "";
                else
                    baseUri = relativeUri;
                relativeUri = undefined;
            }

            if (typeof baseUri === "string") {
                // TODO: Implement QueryParameters constructor(string, *).

            } else if (baseUri instanceof Uri) {
                this._href = baseUri._href;
                this._origin = baseUri._origin;
                this._schemeName = baseUri._href;
                this._schemeSeparator = baseUri._schemeSeparator;
                this._username = baseUri._username;
                this._password = baseUri._password;
                this._hostname = baseUri._hostname;
                this._port = baseUri._port;
                this._portnumber = baseUri._portnumber;
                this._pathname = baseUri._pathname;
                this._search = baseUri._search;
                this._searchParams = new QueryParameters(baseUri._searchParams);
                this._hash = baseUri._hash;
            } else {
                // TODO: Implement QueryParameters constructor(Uri, *).

            }

                // TODO: Implement QueryParameters constructor(*, relative).
        }
    }

    export class UriBuilderService {

    }

    appModule.factory("uriBuilderService", ["$rootScope", UriBuilderService]);

    // #endregion
}
