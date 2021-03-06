/// <reference path="../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Scripts/typings/bootstrap/index.d.ts" />
/// <reference path="../Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="sys.ts" />
/// <reference path="app.ts" />
var accordionGroup;
(function (accordionGroup) {
    class AccordionGroupController {
        constructor() {
            this._state = [];
            this._current = undefined;
        }
        find(name) { return this._state.filter((value) => value.name === name); }
        get(id) {
            if (this._state.length > 0) {
                let result = this._state.find((value) => value.id == id);
                if (typeof result === "object" && result !== null)
                    return result;
            }
        }
        add(name, showHideCallback, autoExpand, state) {
            if (typeof name !== "string")
                name = "";
            let id = this._state.length;
            if (this._state.length > 0) {
                while (typeof (this.get(id)) !== "undefined")
                    id--;
            }
            if (this._state.length == 0) {
                this._state.push({ id: id, callback: showHideCallback, name: name, state: state });
                if (typeof autoExpand === "boolean" && !autoExpand)
                    showHideCallback(false, state);
                else {
                    this._current = name;
                    showHideCallback(true, state);
                }
            }
            else if (typeof autoExpand === "boolean" && autoExpand) {
                this._current = undefined;
                if (typeof this._current === "string") {
                    let toHide = this.find(this._current);
                    toHide.forEach((item) => item.callback(false, item.state));
                }
                let toShow = this.find(name);
                this._current = name;
                if (toShow.length > 0)
                    toShow.forEach((item) => item.callback(true, item.state));
                this._state.push({ id: id, callback: showHideCallback, name: name, state: state });
                showHideCallback(true, state);
            }
            else {
                this._state.push({ id: id, callback: showHideCallback, name: name, state: state });
                showHideCallback(this._current === name);
            }
            return id;
        }
        remove(id) {
            let index = this._state.findIndex((value) => value.id == id);
            let item;
            if (index == 0)
                item = this._state.shift();
            else if (index == this._state.length - 1)
                item = this._state.pop();
            else if (index > 0)
                item = this._state.splice(index, 1)[0];
            else
                return false;
            if (this._current == item.name && this._state.length > 0 && this.find(item.name).length == 0)
                this.show(this._state[0].name);
            return true;
        }
        show(name) {
            if (typeof name !== "string")
                name = "";
            if (name === this._current)
                return;
            let toHide = (this._state.length == 0 || (typeof this._current !== "string")) ? [] : this.find(this._current);
            let toShow = this.find(name);
            if (toShow.length == 0)
                return;
            toHide.forEach((item) => item.callback(false, item.state));
            this._current = name;
            toShow.forEach((item) => item.callback(true, item.state));
        }
        hide(name) {
            if (typeof name !== "string")
                name = "";
            if (name !== this._current || this._state.length == 0)
                return;
            this._current = undefined;
            this.find(name).forEach((toHide) => toHide.callback(false, toHide.state));
        }
        toggle(name) {
            if (typeof name !== "string")
                name = "";
            if (name === this._current)
                this.hide(name);
            else
                this.show(name);
        }
        $onInit() { }
    }
    app.appModule.directive("accordionGroup", () => ({
        restrict: "E",
        controller: ["$scope", AccordionGroupController]
    }));
    function AccordionGroupToggleOnClickLink(scope, element, instanceAttributes, controller) {
        element.on("click", () => controller.toggle(instanceAttributes.accordionGroupToggleOnClick));
        if (typeof instanceAttributes.class === "string") {
            let c = instanceAttributes.class.trim();
            if (c.length > 0) {
                let n = c.split(sys.whitespaceRe);
                if (n.indexOf("cursor-pointer") >= 0)
                    return;
            }
        }
        instanceAttributes.$addClass("cursor-pointer");
    }
    app.appModule.directive("accordionGroupToggleOnClick", () => ({
        require: "^^accordionGroup",
        restrict: "A",
        transclude: true,
        template: '<ng-transclude></ng-transclude>',
        link: AccordionGroupToggleOnClickLink
    }));
    function AccordionGroupContentItemLink(scope, element, instanceAttributes, controller) {
        let autoExpand;
        if (typeof instanceAttributes.autoExpand === "string") {
            let s = instanceAttributes.autoExpand.trim();
            if (s.length > 0) {
                if (sys.isTrueRe.test(s))
                    autoExpand = true;
                else if (sys.isFalseRe.test(s))
                    autoExpand = false;
            }
        }
        let id = controller.add(instanceAttributes.accordionGroupContentItem, (show) => {
            if (show)
                element.show();
            else
                element.hide();
        }, autoExpand);
        element.on("$destory", () => controller.remove(id));
    }
    app.appModule.directive("accordionGroupContentItem", () => ({
        require: "^^accordionGroup",
        restrict: "A",
        transclude: true,
        template: '<ng-transclude></ng-transclude>',
        link: AccordionGroupContentItemLink
    }));
    function AccordionGroupToggleButtonLink(scope, element, instanceAttributes, controller) {
        let expandedClass = [];
        let collapsedClass = [];
        let s;
        if ((typeof instanceAttributes.class === "string") && (s = instanceAttributes.class.trim()).length > 0) {
            expandedClass = s.split(/\s+/);
            collapsedClass = s.split(/\s+/);
        }
        if ((typeof instanceAttributes.expandedClass === "string") && (s = instanceAttributes.expandedClass.trim()).length > 0)
            expandedClass = expandedClass.concat(s.split(/\s+/));
        if ((typeof instanceAttributes.collapsedClass === "string") && (s = instanceAttributes.collapsedClass.trim()).length > 0)
            collapsedClass = collapsedClass.concat(s.split(/\s+/));
        if (expandedClass.indexOf("cursor-pointer") < 0)
            expandedClass.unshift("cursor-pointer");
        if (collapsedClass.indexOf("cursor-pointer") < 0)
            collapsedClass.unshift("cursor-pointer");
        scope.isShown = false;
        let id = controller.add(instanceAttributes.accordionGroupContentItem, (show) => {
            scope.isShown = show;
            if (show) {
                collapsedClass.forEach((n) => {
                    if (element.hasClass(n))
                        element.removeClass(n);
                });
                expandedClass.forEach((n) => {
                    if (!element.hasClass(n))
                        element.addClass(n);
                });
            }
            else {
                expandedClass.forEach((n) => {
                    if (element.hasClass(n))
                        element.removeClass(n);
                });
                collapsedClass.forEach((n) => {
                    if (!element.hasClass(n))
                        element.addClass(n);
                });
            }
        });
        element.on("$destory", () => controller.remove(id));
    }
    app.appModule.directive("accordionGroupToggleButton", () => ({
        restrict: "E",
        transclude: true,
        require: "^^accordionGroup",
        scope: { itemId: "@" },
        link: AccordionGroupToggleButtonLink,
        template: '<button onclick="return false;" ng-transclude></button>'
    }));
    function AccordionGroupButtonTextLink(scope, element, instanceAttributes, controller) {
        let expandedClass = [];
        let collapsedClass = [];
        let s;
        if ((typeof instanceAttributes.class === "string") && (s = instanceAttributes.class.trim()).length > 0) {
            expandedClass = s.split(/\s+/);
            collapsedClass = s.split(/\s+/);
        }
        if ((typeof instanceAttributes.expandedClass === "string") && (s = instanceAttributes.expandedClass.trim()).length > 0)
            expandedClass = expandedClass.concat(s.split(/\s+/));
        if ((typeof instanceAttributes.collapsedClass === "string") && (s = instanceAttributes.collapsedClass.trim()).length > 0)
            collapsedClass = collapsedClass.concat(s.split(/\s+/));
        function onShownCanged(newValue) {
            if (newValue) {
                element.text((typeof instanceAttributes.expandedText === "string") ? instanceAttributes.expandedText : "");
                collapsedClass.forEach((n) => {
                    if (element.hasClass(n))
                        element.removeClass(n);
                });
                expandedClass.forEach((n) => {
                    if (!element.hasClass(n))
                        element.addClass(n);
                });
            }
            else {
                element.text((typeof instanceAttributes.collapsedText === "string") ? instanceAttributes.collapsedText : "");
                expandedClass.forEach((n) => {
                    if (element.hasClass(n))
                        element.removeClass(n);
                });
                collapsedClass.forEach((n) => {
                    if (!element.hasClass(n))
                        element.addClass(n);
                });
            }
        }
        onShownCanged(scope.isShown);
        scope.$watch("isShown", onShownCanged);
    }
    app.appModule.directive("accordionGroupButtonText", () => ({
        require: "^^accordionGroupToggleButton",
        restrict: "E",
        link: AccordionGroupButtonTextLink,
        template: '<span></span>'
    }));
    // #endregion
    // #region <accordion-group-button-expanded></accordion-group-button-expanded>
    function AccordionGroupButtonExpandedLink(scope, element, instanceAttributes, controller) {
        function onShownCanged(newValue) {
            if (newValue)
                element.show();
            else
                element.hide();
        }
        onShownCanged(scope.isShown);
        scope.$watch("isShown", onShownCanged);
    }
    app.appModule.directive("accordionGroupButtonExpanded", () => ({
        require: "^^accordionGroupToggleButton",
        restrict: "E",
        transclude: true,
        template: '<ng-transclude></ng-transclude>',
        link: AccordionGroupButtonExpandedLink
    }));
    // #endregion
    // #region <accordion-group-button-collapsed></accordion-group-button-collapsed>
    function AccordionGroupButtonCollapsedLink(scope, element, instanceAttributes, controller) {
        function onShownCanged(newValue) {
            if (newValue)
                element.hide();
            else
                element.show();
        }
        onShownCanged(scope.isShown);
        scope.$watch("isShown", onShownCanged);
    }
    app.appModule.directive("accordionGroupButtonCollapsed", () => ({
        require: "^^accordionGroupToggleButton",
        restrict: "E",
        transclude: true,
        template: '<ng-transclude></ng-transclude>',
        link: AccordionGroupButtonCollapsedLink
    }));
    function AccordionGroupButtonImageLink(scope, element, instanceAttributes, controller) {
        let expandedClass = [];
        let collapsedClass = [];
        let s;
        if ((typeof instanceAttributes.class === "string") && (s = instanceAttributes.class.trim()).length > 0) {
            expandedClass = s.split(/\s+/);
            collapsedClass = s.split(/\s+/);
        }
        if ((typeof instanceAttributes.expandedClass === "string") && (s = instanceAttributes.expandedClass.trim()).length > 0)
            expandedClass = expandedClass.concat(s.split(/\s+/));
        if ((typeof instanceAttributes.collapsedClass === "string") && (s = instanceAttributes.collapsedClass.trim()).length > 0)
            collapsedClass = collapsedClass.concat(s.split(/\s+/));
        function onShownCanged(newValue) {
            if (newValue) {
                if (typeof (instanceAttributes.expandedSrc) === "string")
                    element.attr("src", instanceAttributes.expandedSrc);
                else
                    element.removeAttr("src");
                if (typeof (instanceAttributes.expandedAlt) === "string")
                    element.attr("alt", instanceAttributes.expandedAlt);
                else
                    element.removeAttr("alt");
                collapsedClass.forEach((n) => {
                    if (element.hasClass(n))
                        element.removeClass(n);
                });
                expandedClass.forEach((n) => {
                    if (!element.hasClass(n))
                        element.addClass(n);
                });
            }
            else {
                if (typeof (instanceAttributes.collapsedSrc) === "string")
                    element.attr("src", instanceAttributes.collapsedSrc);
                else
                    element.removeAttr("src");
                if (typeof (instanceAttributes.collapsedAlt) === "string")
                    element.attr("alt", instanceAttributes.collapsedAlt);
                else
                    element.removeAttr("alt");
                expandedClass.forEach((n) => {
                    if (element.hasClass(n))
                        element.removeClass(n);
                });
                collapsedClass.forEach((n) => {
                    if (!element.hasClass(n))
                        element.addClass(n);
                });
            }
        }
        onShownCanged(scope.isShown);
        scope.$watch("isShown", onShownCanged);
    }
    app.appModule.directive("accordionGroupButtonImage", () => ({
        require: "^^accordionGroupToggleButton",
        restrict: "E",
        link: AccordionGroupButtonImageLink,
        template: '<img />'
    }));
    // #endregion
})(accordionGroup || (accordionGroup = {}));
//# sourceMappingURL=accordionGroup.js.map