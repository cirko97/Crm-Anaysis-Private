const { read } = require("fs");

async function form_onload(executionContext) {
    const FORM_NEW = 1;
    const FORM_EDIT = 2;
    const formContext = executionContext.getFormContext();
    const formType = formContext.ui.getFormType();
    let retry = 0;
    const maxRetries = 100;
    const retryDelay = 1000; // 1-second delay

      // Get Nav. Item
        var navItem = formContext.ui.navigation.items.get("navSPDocuments");
        // First set focus on Nav. Item to open related tab
        navItem.setFocus();
        // get Main tab (replace it with your tab name)
        var mainTab =  formContext.ui.tabs.get("general");
        // Then move to Main Tab
        mainTab.setFocus();

    // Check form type for quote grid
    if (formType !== FORM_NEW) {
        retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_quoteLines"));

        formContext.getControl("extreme_deliveryinfo").setDisabled(false);
        formContext.getControl("extreme_printoutinfo").setDisabled(false);
        formContext.getControl("extreme_newquotecurrency").setDisabled(false);

    }

    if (formType === FORM_NEW) {
        if(formContext.getAttribute("effectivefrom").getValue() === null){
            formContext.getAttribute("effectivefrom").setValue(new Date());
            var defaultQuoteValidDays = await readConfigurationValue("defaultQuoteValidDays");
            var newEffectiveTo = addDays(new Date(), parseInt(defaultQuoteValidDays, 10));
            formContext.getAttribute("effectiveto").setValue(newEffectiveTo);           
        }
        if(formContext.getAttribute("extreme_deliverymethod").getValue() === null 
        && formContext.getAttribute("extreme_paymentterms").getValue() === null){
            populateAccountDefaults();
        }
        var publishingLocation = await readConfigurationValue("QuotePublishingLocation")
        formContext.getAttribute("extreme_placeofpublishing").setValue(publishingLocation);   
    }

    if(formContext.getAttribute("effectivefrom").getValue() === null){
        formContext.getAttribute("effectivefrom").setValue(new Date());
        var defaultQuoteValidDays = await readConfigurationValue("defaultQuoteValidDays");
        var newEffectiveTo = addDays(new Date(), parseInt(defaultQuoteValidDays, 10));
        formContext.getAttribute("effectiveto").setValue(newEffectiveTo);           
    }


    formContext.getAttribute("customerid").addOnChange(populateAccountDefaults);

    function addDays(date, days) {
        var result = new Date(date.valueOf());
        result.setDate(result.getDate() + days);
        return result;
    }

    async function populateAccountDefaults(){
        if(formContext.getAttribute("customerid").getValue() !== null) {
            var accountId = formContext.getAttribute("customerid").getValue()[0].id;
            var account = await Xrm.WebApi.retrieveRecord("account", `${accountId}`, "?$select=_extreme_deliverymethod_value,_extreme_paymentterms_value").then(
                function success(result) {
                    return result;
                },
                function(error) {
                    console.log(error.message);
                }
            );
            var deliveryMethodLookup = [{
                id: account["_extreme_deliverymethod_value"], 
                name: account["_extreme_deliverymethod_value@OData.Community.Display.V1.FormattedValue"],
                entityType: account["_extreme_deliverymethod_value@Microsoft.Dynamics.CRM.lookuplogicalname"]
            }];

            if(account["_extreme_deliverymethod_value"]!== null)
            formContext.getAttribute("extreme_deliverymethod").setValue(deliveryMethodLookup);

            var paymentTermsLookup = [{
                id: account["_extreme_paymentterms_value"], 
                name: account["_extreme_paymentterms_value@OData.Community.Display.V1.FormattedValue"], 
                entityType: account["_extreme_paymentterms_value@Microsoft.Dynamics.CRM.lookuplogicalname"] 
            }];

            if(account["_extreme_paymentterms_value"]!== null)
            formContext.getAttribute("extreme_paymentterms").setValue(paymentTermsLookup);
        }
    }

    async function readConfigurationValue(key) {
        // eslint-disable-next-line no-undef
        var value = await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", `?$select=extreme_value&$filter=extreme_key eq '${key}'&$top=1`).then(
            function success(results) {
                return results.entities[0]["extreme_value"];
            },
            function (error) {
                console.log(error.message);
            }
        );
        return value;
    }

    function setClientApiContextForWebResource(formContext, webResourceName) {
        const wrControl = formContext.getControl(webResourceName);
        if (wrControl) {
            wrControl.getContentWindow().then(function (contentWindow) {
                try {
                    if (typeof contentWindow.setClientApiContext === "function") {
                        contentWindow.setClientApiContext(Xrm, formContext);
                        // wrControl.getObject().style.minHeight = "1000px";
                        // Set the parent div's style to overflow-y: auto
                        const parentDiv = wrControl.getObject().parentNode;
                        if (parentDiv) {
                            parentDiv.style.overflow = "auto";
                        }
                    } else {
                        throw new Error("setClientApiContext is not a function");
                    }
                } catch (e) {
                    console.log(e);
                    retryAttempt(() => setClientApiContextForWebResource(formContext, webResourceName));
                }
            }).catch(function (error) {
                console.log(error);
                retryAttempt(() => setClientApiContextForWebResource(formContext, webResourceName));
            });
        } else {
            retryAttempt(() => setClientApiContextForWebResource(formContext, webResourceName));
        }
    }

    function retryAttempt(func) {
        if (retry < maxRetries) {
            retry++;
            setTimeout(function () {
                func();
                // setClientApiContextForWebResource(formContext, "WebResource_new_2");
            }, retryDelay);
        } else {
            console.error("Max retries reached. Unable to set client API context.");
        }
    }
    
}
