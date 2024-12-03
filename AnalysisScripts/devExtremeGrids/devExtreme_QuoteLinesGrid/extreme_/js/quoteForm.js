async function form_onload(executionContext) {
    const FORM_NEW = 1;
    const FORM_EDIT = 2;
    const formContext = executionContext.getFormContext();
    const formType = formContext.ui.getFormType();
    let retry = 0;
    const maxRetries = 100;
    const retryDelay = 1000; // 1-second delay

    if (formType !== FORM_NEW) {
        retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_quoteLines"));
    }

    formContext.getAttribute("transactioncurrencyid").addOnChange(setDefaultPriceList);
    if (formContext.getAttribute("pricelevelid").getValue() == null) {
        await setDefaultPriceList()
    }

    async function setDefaultPriceList() {
        if (formContext.getAttribute("transactioncurrencyid").getValue() !== null) {
            var currencyName = formContext.getAttribute("transactioncurrencyid").getValue()[0].name;
            var defaultPriceListLookup = [{
                id: null,
                entityType: "pricelevel",
                name: null
            }];
            switch (currencyName) {
                case "EUR":
                    defaultPriceListLookup[0].id = await readConfigurationValue("defaultEURPriceListId");
                    defaultPriceListLookup[0].name = 'defaultEURPriceListId';
                    formContext.getAttribute("pricelevelid").setValue(defaultPriceListLookup);
                    break;
                case "USD":
                    defaultPriceListLookup[0].id = await readConfigurationValue("defaultUSDPriceListId");
                    defaultPriceListLookup[0].name = 'defaultUSDPriceListId';
                    formContext.getAttribute("pricelevelid").setValue(defaultPriceListLookup);
                    break;
                case "RSD":
                    defaultPriceListLookup[0].id = await readConfigurationValue("defaultRSDPriceListId");
                    defaultPriceListLookup[0].name = 'defaultRSDPriceListId';
                    formContext.getAttribute("pricelevelid").setValue(defaultPriceListLookup);
                    break;
                case "GBP":
                    defaultPriceListLookup[0].id = await readConfigurationValue("defaultGBPPriceListId");
                    defaultPriceListLookup[0].name = 'defaultGBPPriceListId';
                    formContext.getAttribute("pricelevelid").setValue(defaultPriceListLookup);
                    break;
                case "CHF":
                    defaultPriceListLookup[0].id = await readConfigurationValue("defaultCHFPriceListId");
                    defaultPriceListLookup[0].name = 'defaultCHFPriceListId';
                    formContext.getAttribute("pricelevelid").setValue(defaultPriceListLookup);
                    break;
                case "MKD":
                    defaultPriceListLookup[0].id = await readConfigurationValue("defaultMKDPriceListId");
                    defaultPriceListLookup[0].name = 'defaultMKDPriceListId';
                    formContext.getAttribute("pricelevelid").setValue(defaultPriceListLookup);
                    break;
                default:
                    break;
            }
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