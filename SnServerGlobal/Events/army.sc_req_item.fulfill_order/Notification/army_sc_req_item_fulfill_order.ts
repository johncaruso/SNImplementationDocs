﻿/// <reference path="../../../SnTypings/GlideSystem.d.ts" />
/// <reference path="../../../SnTypings/GlideRecord.d.ts" />
/// <reference path="../../../SnTypings/ServiceCatalog.d.ts" />

namespace army_sc_req_item_fulfill_order {
    declare var current: sc_catalogGlideRecord;
    declare var template: TemplatePrinter;
    declare var email: GlideEmailOutbound;
    declare var email_action: sysevent_email_actionGlideRecord;
    declare var event: syseventGlideRecord;
    (function runMailScript(current: sc_catalogGlideRecord, template: TemplatePrinter, email: GlideEmailOutbound, email_action: sysevent_email_actionGlideRecord, event: syseventGlideRecord) {
        if (gs.nil(event.parm1))
            gs.info(event.name + " raised, but parm1 had no value");
        else {
            gs.info(event.name + " raised, parm1 = " + event.parm1 + ' (' + JSUtil.describeObject(event.parm1) + ')');
            let gr: sc_taskGlideRecord = <sc_taskGlideRecord>new GlideRecord('sc_task');
            gr.addQuery('number', event.parm1.getValue());
            gr.query();
            if (gr.next()) {
                gs.info(event.name + ': Found task');
                gs.addInfoMessage('Found task');
                let taskLink: string = '<a href="' + gr.getLink(true) + '">' + event.parm1 + '</a>';
                template.print('<ol>\n<li>Open ' + taskLink + '.</li>\n');
                template.print('<li>If the item has to be ordered, Check the Backordered flag.</li>\n');
                template.print('<li>Close ' + taskLink + ' to indicate that the item has been backordered or it is ready for delivery / provisioning.</li>\n</ol>\n');
                template.print('Note: If you backordered the item, don\'t forget to specify the estimated delivery date on teh associted request item (<a href="' + current.getLink(true) + '">' + current.getDisplayValue() + '</a>)');
            } else
                gs.info(event.name + ': Task not found');
        }
    })(current, template, email, email_action, event);
}