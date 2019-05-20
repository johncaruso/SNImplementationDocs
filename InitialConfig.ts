/// <reference path="Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="Scripts/typings/bootstrap/index.d.ts" />
/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="sys.ts" />
/// <reference path="app.ts" />
/// <reference path="cards.ts" />

namespace initialConfig {
    //type TopLevelCardName = 'adminLogins' | 'importInitiaUpdateSet' | 'importUtilityApp' | 'initialConfig' | 'uploadLogoImage' | 'bulkPluginActivation' | 'activeDirectoryImport' | 'importPhysNetworks' |
    //  'serviceCatalogConfig';

    app.appModule.controller("InitialConfigController", ['$scope', cards.CardParentController]);

    class adminLoginsController extends cards.CardController {
        static cardName: string = 'adminLogins';
        constructor($scope: cards.ICardScope) { super($scope, 'Add Administrative Logins'); }
    }
    app.appModule.controller("adminLoginsController", ['$scope', adminLoginsController]);

    class importInitiaUpdateSetController extends cards.CardController {
        static cardName: string = 'importInitiaUpdateSet';
        constructor($scope: cards.ICardScope) { super($scope, 'Import Initial Update Set'); }
    }
    app.appModule.controller("importInitiaUpdateSetController", ['$scope', importInitiaUpdateSetController]);

    class importUtilityAppController extends cards.CardController {
        static cardName: string = 'importUtilityApp';
        constructor($scope: cards.ICardScope) { super($scope, 'Import Utility Application'); }
    }
    app.appModule.controller("importUtilityAppController", ['$scope', importUtilityAppController]);

    class initialConfigController extends cards.CardController {
        static cardName: string = 'initialConfig';
        constructor($scope: cards.ICardScope) { super($scope, 'Initial Config'); }
    }
    app.appModule.controller("initialConfigController", ['$scope', initialConfigController]);

    class uploadLogoImageController extends cards.CardController {
        static cardName: string = 'uploadLogoImage';
        constructor($scope: cards.ICardScope) { super($scope, 'Upload logo image'); }
    }
    app.appModule.controller("uploadLogoImageController", ['$scope', uploadLogoImageController]);

    class bulkPluginActivationController extends cards.CardController {
        static cardName: string = 'bulkPluginActivation';
        constructor($scope: cards.ICardScope) { super($scope, 'Bulk Plugin Activation'); }
    }
    app.appModule.controller("bulkPluginActivationController", ['$scope', bulkPluginActivationController]);

    class activeDirectoryImportController extends cards.CardController {
        static cardName: string = 'activeDirectoryImport';
        constructor($scope: cards.ICardScope) { super($scope, 'Configure Active Directory Import'); }
    }
    app.appModule.controller("activeDirectoryImportController", ['$scope', activeDirectoryImportController]);

    class importPhysNetworksController extends cards.CardController {
        static cardName: string = 'importPhysNetworks';
        constructor($scope: cards.ICardScope) { super($scope, 'Import Physical Networks Application'); }
    }
    app.appModule.controller("importPhysNetworksController", ['$scope', importPhysNetworksController]);

    class serviceCatalogConfigController extends cards.CardController {
        static cardName: string = 'serviceCatalogConfig';
        constructor($scope: cards.ICardScope) { super($scope, 'Import Service Catalog Update Set'); }
    }
    app.appModule.controller("serviceCatalogConfigController", ['$scope', serviceCatalogConfigController]);

    class incidentManagementConfigController extends cards.CardController {
        static cardName: string = 'incidentManagementConfig';
        constructor($scope: cards.ICardScope) { super($scope, 'Import Incident Management Update Set'); }
    }
    app.appModule.controller("incidentManagementConfigController", ['$scope', serviceCatalogConfigController]);

    // #endregion
}
