/// <reference path="../SnTypings/ServiceNowLegacy.d.ts" />
/// <reference path="../SnTypings/ServiceCatalog.d.ts" />
/// <reference path="../SnTypings/j2js.d.ts" />
var getElementTypes;
(function (getElementTypes) {
    var tableName = 'sc_req_item';
    var typeMap = {
        "integer": "INumberGlideElement", "decimal": "INumberGlideElement", "email": "IStringGlideElement", "ph_number": "IStringGlideElement", "glide_date": "IStringGlideElement",
        "glide_date_time": "IStringGlideElement", "float": "INumberGlideElement", "string": "IStringGlideElement", "boolean": "IBooleanGlideElement", "GUID": "IGUIDGlideElement",
        "url": "IStringGlideElement", "currency": "INumberGlideElement", "wide_text": "IStringGlideElement", "due_date": "IStringGlideElement",
        "glide_duration": "IStringGlideElement", "price": "INumberGlideElement", "translated_text": "IStringGlideElement", "translated_field": "IStringGlideElement",
        "html": "IStringGlideElement", "longint": "IStringGlideElement", "char": "IStringGlideElement", "table_name": "IStringGlideElement", "field_name": "IStringGlideElement",
        "translated_html": "IStringGlideElement", "date": "IStringGlideElement"
    };
    var stringTypes = ["integer", "decimal", "email", "ph_number", "glide_date", "glide_date_time", "float"];
    var sys_db_object = new GlideRecord('sys_db_object');
    sys_db_object.addQuery('name', tableName);
    sys_db_object.query();
    if (sys_db_object.next()) {
        var fieldsClassName = "I" + tableName + "Fields";
        var lines = [
            "/**",
            " * GlideElement values from the " + sys_db_object.label.toString() + " table.",
            " * @interface " + fieldsClassName
        ];
        var recordClassName = "I" + tableName + "GlideRecord";
        var recordExtends, elementExtends;
        if (sys_db_object.super_class.nil()) {
            recordExtends = "IGlideRecord";
            elementExtends = "IGlideRefElement<" + recordClassName + ">";
            lines.push(" */");
            lines.push("declare interface " + fieldsClassName + " {");
        }
        else {
            var superClass = sys_db_object.super_class.name.toString();
            recordExtends = "I" + superClass + "GlideRecord";
            elementExtends = "I" + superClass + "GlideElement<" + recordClassName + ">";
            superClass = "I" + superClass + "Fields";
            lines.push(" * @extends {" + superClass + "}");
            lines.push(" */");
            lines.push("declare interface " + fieldsClassName + " extends " + superClass + " {");
        }
        var sys_dictionary = new GlideRecord('sys_dictionary');
        sys_dictionary.addQuery('name', tableName);
        sys_dictionary.query();
        while (sys_dictionary.next()) {
            if (!sys_dictionary.element.nil()) {
                var element = sys_dictionary.element.toString();
                if (element.length > 0) {
                    lines.push("\t/**");
                    lines.push("\t * " + sys_dictionary.column_label.toString());
                    var dbType = sys_dictionary.internal_type.toString();
                    var jsType;
                    if (dbType == "reference") {
                        jsType = "I" + sys_dictionary.reference.name.toString() + "GlideElement";
                        lines.push("\t * @type {" + jsType + "}");
                        lines.push("\t * @memberof " + fieldsClassName);
                        lines.push("\t * @description Reference to " + sys_dictionary.reference.label.toString() + " (IGlideRefElement<I" + sys_dictionary.reference.name.toString() + "GlideRecord>)");
                    }
                    else {
                        var sys_choice = new GlideRecord("sys_choice");
                        sys_choice.addQuery("name", tableName);
                        sys_choice.addQuery("element", element);
                        sys_choice.addQuery("inactive", false);
                        sys_choice.query();
                        var choices = [];
                        while (sys_choice.next()) {
                            var label = (sys_choice.label.nil()) ? "" : sys_choice.label.toString().trim();
                            var value = (sys_choice.value.nil()) ? "" : sys_choice.value.toString();
                            if (label.length == 0) {
                                if (value.trim().length == 0)
                                    label = value = sys_choice.sys_id.toString();
                                else
                                    label = value;
                            }
                            var sequence = (sys_choice.sequence.nil()) ? "" : sys_choice.sequence.toString().trim();
                            choices.push({ label: label, value: value, sequence: (sequence.length > 0) ? parseInt(sequence) : NaN });
                        }
                        if (choices.length > 0) {
                            choices = choices.sort(function (a, b) {
                                if (isNaN(a.sequence))
                                    return (isNaN(b.sequence)) ? 0 : 1;
                                return (isNaN(b.sequence)) ? -1 : a.sequence - b.sequence;
                            });
                            var au = new ArrayUtil();
                            jsType = "IStringBasedGlideElement<(" + au.unique(choices.map(function (value) { return JSON.stringify(value.value); })).join(" | ") + ")>";
                            lines.push("\t * @type {" + jsType + "}");
                            lines.push("\t * @memberof " + fieldsClassName);
                            var desc = choices.filter(function (value) { return value.value !== value.label; }).map(function (value) { return JSON.stringify(value.value) + "=" + JSON.stringify(value.label); });
                            if (dbType != "string")
                                desc.unshift("Internal type is " + dbType);
                            if (desc.length > 0) {
                                desc[0] = "\t * @description " + desc[0];
                                lines.push(desc.join("; "));
                            }
                        }
                        else if (typeof typeMap[dbType] === "undefined") {
                            jsType = "GlideElement";
                            lines.push("\t * @type {GlideElement}");
                            lines.push("\t * @memberof " + fieldsClassName);
                            lines.push("\t * @description Internal type is " + JSON.stringify(dbType));
                        }
                        else {
                            jsType = typeMap[dbType];
                            lines.push("\t * @type {" + jsType + "}");
                            lines.push("\t * @memberof " + fieldsClassName);
                            if (dbType !== "boolean" && dbType != "string" && dbType != "GUID")
                                lines.push("\t * @description Internal type is " + dbType);
                        }
                    }
                    lines.push("\t */");
                    lines.push("\t" + element + ": " + jsType + ";");
                }
            }
        }
        lines.push("}");
        lines.push("declare interface " + recordClassName + " extends " + recordExtends + ", " + fieldsClassName + " { }");
        lines.push("declare interface I" + tableName + "GlideElement extends " + elementExtends + ", " + fieldsClassName + " { }");
        lines.push("declare type " + tableName + "GlideRecord = I" + recordExtends + "GlideRecord & GlideRecord;");
        lines.push("declare type " + tableName + "GlideElement = I" + recordExtends + "GlideElement & GlideElement;");
        gs.info(lines.join("\n"));
    }
    else
        gs.warn("Table " + JSON.stringify(tableName) + " not found");
})(getElementTypes || (getElementTypes = {}));
//# sourceMappingURL=getElementTypes.js.map