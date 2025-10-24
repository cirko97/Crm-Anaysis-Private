const { read } = require("fs");

async function form_onload(executionContext) {
    const FORM_NEW = 1;
    const FORM_EDIT = 2;
    const formContext = executionContext.getFormContext();
    const formType = formContext.ui.getFormType();
    let retry = 0;
    const maxRetries = 100;
    const retryDelay = 1000; // 1-second delay

    formContext.getControl("customerid").setEntityTypes(["account"]);

    let initCustomer = formContext.getAttribute("customerid").getValue();

    // Set transaction currency on form load if customer exists and form is new
    if (formType === FORM_NEW && formContext.getAttribute("customerid").getValue() !== null) {
        var customerId = formContext.getAttribute("customerid").getValue()[0].id;
        const accTransaction = await Xrm.WebApi.retrieveRecord("account", customerId, "?$select=_transactioncurrencyid_value");

        if (accTransaction && accTransaction._transactioncurrencyid_value) {
            var currentCurrency = formContext.getAttribute("transactioncurrencyid").getValue();
            var accountCurrencyId = accTransaction["_transactioncurrencyid_value"];
            if (
                !currentCurrency ||
                currentCurrency[0].id.toLowerCase() !== accountCurrencyId.toLowerCase()
            ) {
                var transactionCurrencyLookup = [{
                    id: accountCurrencyId,
                    name: accTransaction["_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue"],
                    entityType: "transactioncurrency"
                }];
                formContext.getAttribute("transactioncurrencyid").setValue(transactionCurrencyLookup);
                await formContext.data.refresh(true);
            }
        }
    }

    // Check form type for quote grid
    if (formType !== FORM_NEW) {
        retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_quoteLines"));

        formContext.getControl("extreme_deliveryinfo").setDisabled(false);
        formContext.getControl("extreme_printoutinfo").setDisabled(false);
        formContext.getControl("extreme_newquotecurrency").setDisabled(false);

        formContext.getControl("extreme_printinenglish").setDisabled(false);
        formContext.getControl("extreme_printoutname").setDisabled(false);
        formContext.getControl("extreme_bankaccountonprintout").setDisabled(false);

    }

    if (formType === FORM_NEW) {
        if (formContext.getAttribute("effectivefrom").getValue() === null) {
            formContext.getAttribute("effectivefrom").setValue(new Date());
            var defaultQuoteValidDays = await readConfigurationValue("defaultQuoteValidDays");
            var newEffectiveTo = addDays(new Date(), parseInt(defaultQuoteValidDays, 10));
            formContext.getAttribute("effectiveto").setValue(newEffectiveTo);
        }
        if (formContext.getAttribute("extreme_deliverymethod").getValue() === null
            && formContext.getAttribute("extreme_paymentterms").getValue() === null) {
            populateAccountDefaults();
        }

    } else {
        const createdOnDate = getCreatedOnDate(formContext.data.entity.getId().slice(1, -1));
        createdOnDate.setHours(0, 0, 0, 0); // Normalize time to midnight
        // console.log("Created On Date: ", createdOnDate);
        // console.log("Effective From Date: ", new Date(formContext.getAttribute("effectivefrom").getValue()));
        if (createdOnDate > new Date(formContext.getAttribute("effectivefrom").getValue())) {
            formContext.getAttribute("effectivefrom").setValue(createdOnDate);
            var defaultQuoteValidDays = await readConfigurationValue("defaultQuoteValidDays");
            var newEffectiveTo = addDays(createdOnDate, parseInt(defaultQuoteValidDays, 10));
            formContext.getAttribute("effectiveto").setValue(newEffectiveTo);
        }

        formContext.getAttribute("effectivefrom").addOnChange(async () => {
            const effectiveFromDate = new Date(formContext.getAttribute("effectivefrom").getValue());

            console.log("Effective From Date: ", effectiveFromDate);
            console.log("Created On Date: ", createdOnDate);
            if (effectiveFromDate < createdOnDate) {
                formContext.getAttribute("effectivefrom").setValue(createdOnDate);
                Xrm.Utility.alertDialog("Effective From date cannot be earlier than the Created On date.");
                return;
            }
            if (effectiveFromDate) {
                var defaultQuoteValidDays = await readConfigurationValue("defaultQuoteValidDays");
                var newEffectiveTo = addDays(createdOnDate, parseInt(defaultQuoteValidDays, 10));
                formContext.getAttribute("effectiveto").setValue(newEffectiveTo);
                console.log("Default Quote Valid Days: ", defaultQuoteValidDays);
                console.log("New Effective To Date: ", newEffectiveTo);
            }
        });

        // Get Nav. Item
        var navItem = formContext.ui.navigation.items.get("navSPDocuments");
        // First set focus on Nav. Item to open related tab
        if (navItem) {
            navItem.setFocus();
        } else {
            console.error("Navigation item 'navSPDocuments' not found.");
        }
        // get Main tab (replace it with your tab name)
        var mainTab = formContext.ui.tabs.get("general");
        // Then move to Main Tab
        if (mainTab) {
            mainTab.setFocus();
        } else {
            console.error("Main tab 'general' not found.");
        }
    }

    if (formContext.getAttribute("extreme_placeofpublishing").getValue() === null) {
        var publishingLocation = await readConfigurationValue("QuotePublishingLocation")
        formContext.getAttribute("extreme_placeofpublishing").setValue(publishingLocation);
    }

    if (formContext.getAttribute("effectivefrom").getValue() === null) {
        formContext.getAttribute("effectivefrom").setValue(new Date());
        var defaultQuoteValidDays = await readConfigurationValue("defaultQuoteValidDays");
        var newEffectiveTo = addDays(new Date(), parseInt(defaultQuoteValidDays, 10));
        formContext.getAttribute("effectiveto").setValue(newEffectiveTo);
    }


    formContext.getAttribute("customerid").addOnChange(populateAccountDefaults);
    formContext.getAttribute("statecode").addOnChange(async () => {
        const quoteLinesControl = formContext.getControl('WebResource_quoteLines');
        if (quoteLinesControl && quoteLinesControl.getObject() && quoteLinesControl.getObject().contentWindow) {
            await quoteLinesControl.getObject().contentWindow.setClientApiContext(Xrm, formContext);
        }
    });
    const attributesToUpdate = [
        "extreme_printinenglish",
        "extreme_printoutname",
        "extreme_bankaccountonprintout"
    ];

    attributesToUpdate.forEach(attribute => {
        formContext.getAttribute(attribute).addOnChange(async () => {
            var sysAdminGuid = await readConfigurationValue("SystemAdminGuid");
            var record = {};
            attributesToUpdate.forEach(attr => {
                record[attr] = formContext.getAttribute(attr).getValue();
            });

            var req = new XMLHttpRequest();
            req.open("PATCH", Xrm.Utility.getGlobalContext().getClientUrl() + `/api/data/v9.2/quotes(${formContext.data.entity.getId().slice(1, -1)})`, false);
            req.setRequestHeader("OData-MaxVersion", "4.0");
            req.setRequestHeader("OData-Version", "4.0");
            req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            req.setRequestHeader("Accept", "application/json");
            req.setRequestHeader("Prefer", "odata.include-annotations=*");
            req.setRequestHeader("MSCRMCallerID", `${sysAdminGuid}`);
            req.onreadystatechange = function () {
                if (this.readyState === 4) {
                    req.onreadystatechange = null;
                    if (this.status === 204) {
                        console.log("Record updated");
                    } else {
                        console.log(this.responseText);
                    }
                }
            };
            req.send(JSON.stringify(record));
            formContext.data.refresh(true);
        });
    });



    function addDays(date, days) {
        var result = new Date(date.valueOf());
        result.setDate(result.getDate() + days);
        return result;
    }

    async function populateAccountDefaults() {
        if (formContext.getAttribute("customerid").getValue() !== null) {
            var accountId = formContext.getAttribute("customerid").getValue()[0].id;
            var account = await Xrm.WebApi.retrieveRecord("account", `${accountId}`, "?$select=_extreme_deliverymethod_value,_extreme_paymentterms_value").then(
                function success(result) {
                    return result;
                },
                function (error) {
                    console.log(error.message);
                }
            );
            var deliveryMethodLookup = [{
                id: account["_extreme_deliverymethod_value"],
                name: account["_extreme_deliverymethod_value@OData.Community.Display.V1.FormattedValue"],
                entityType: account["_extreme_deliverymethod_value@Microsoft.Dynamics.CRM.lookuplogicalname"]
            }];

            if (account["_extreme_deliverymethod_value"] !== null)
                formContext.getAttribute("extreme_deliverymethod").setValue(deliveryMethodLookup);

            var paymentTermsLookup = [{
                id: account["_extreme_paymentterms_value"],
                name: account["_extreme_paymentterms_value@OData.Community.Display.V1.FormattedValue"],
                entityType: account["_extreme_paymentterms_value@Microsoft.Dynamics.CRM.lookuplogicalname"]
            }];

            if (account["_extreme_paymentterms_value"] !== null)
                formContext.getAttribute("extreme_paymentterms").setValue(paymentTermsLookup);

            // Also set transaction currency on customerid change
            var customerValue = formContext.getAttribute("customerid").getValue();
            if (customerValue !== null && customerValue.length > 0) {
                var customerId = customerValue[0].id;
                const accTransaction = await Xrm.WebApi.retrieveRecord("account", customerId, "?$select=_transactioncurrencyid_value");
                
                if (accTransaction && accTransaction._transactioncurrencyid_value) {
                    var currentQuoteCurrency = formContext.getAttribute("transactioncurrencyid").getValue();
                    var newCustomerCurrencyId = accTransaction["_transactioncurrencyid_value"];
                    
                    // Check if quote currency is different from new customer currency
                    // Remove curly braces for comparison
                    var currentQuoteCurrencyId = currentQuoteCurrency ? currentQuoteCurrency[0].id.replace(/[{}]/g, "").toLowerCase() : null;
                    var newCustomerCurrencyIdClean = newCustomerCurrencyId.replace(/[{}]/g, "").toLowerCase();
                    
                    if (currentQuoteCurrencyId && currentQuoteCurrencyId !== newCustomerCurrencyIdClean) {
                        if (formType !== FORM_NEW) {
                            // Check if there are any quotedetails (quote products) for this quote
                            const quoteId = formContext.data.entity.getId().replace(/[{}]/g, "");
                            const quotedetailsResult = await Xrm.WebApi.retrieveMultipleRecords(
                                "quotedetail",
                                `?$select=quotedetailid&$filter=_quoteid_value eq ${quoteId}&$top=1`
                            );

                            if (quotedetailsResult.entities && quotedetailsResult.entities.length > 0) {
                                Xrm.Utility.alertDialog("Before changing the customer or currency, you must delete all Quote products.");
                                // Revert customer back to initial value
                                formContext.getAttribute("customerid").setValue(initCustomer);
                                await formContext.data.refresh(false);
                                return;
                            }
                        }
                        
                        // No products or new form - update currency to match new customer
                        var transactionCurrencyLookup = [{
                            id: newCustomerCurrencyId,
                            name: accTransaction["_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue"],
                            entityType: "transactioncurrency"
                        }];
                        formContext.getAttribute("transactioncurrencyid").setValue(transactionCurrencyLookup);
                        
                        if (formType !== FORM_NEW) {
                            const quoteIdForm = formContext.data.entity.getId().replace(/[{}]/g, "");
                            const fieldsToNull = [
                                "extreme_chfexchangerate",
                                "extreme_dollarexchangerate",
                                "extreme_euroexchangerate",
                                "exchangerate",
                                "extreme_gbpexchangerate",
                                "extreme_macedoniandenarexchangerate",
                                "extreme_rsdexchangerate"
                            ];
                            const recordToUpdate = {};
                            fieldsToNull.forEach(field => recordToUpdate[field] = null);

                            await Xrm.WebApi.updateRecord("quote", quoteIdForm, recordToUpdate);
                        }
                        retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_quoteLines"));
                        if (formType !== FORM_NEW) {
                            await formContext.data.refresh(true);
                        }
                    } else if (!currentQuoteCurrency) {
                        // If quote has no currency set, set it to customer's currency
                        var transactionCurrencyLookup = [{
                            id: newCustomerCurrencyId,
                            name: accTransaction["_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue"],
                            entityType: "transactioncurrency"
                        }];
                        formContext.getAttribute("transactioncurrencyid").setValue(transactionCurrencyLookup);
                        if (formType !== FORM_NEW) {
                            await formContext.data.refresh(true);
                        }
                    }
                } else {
                    formContext.getAttribute("transactioncurrencyid").setValue(null);
                }
            } else {
                formContext.getAttribute("transactioncurrencyid").setValue(null);
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


    function getCreatedOnDate(quoteId) {
        let createdOnDate = null;
        var req = new XMLHttpRequest();
        req.open("GET", Xrm.Utility.getGlobalContext().getClientUrl() + `/api/data/v9.2/quotes(${quoteId})?$select=createdon`, false);
        req.setRequestHeader("OData-MaxVersion", "4.0");
        req.setRequestHeader("OData-Version", "4.0");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Prefer", "odata.include-annotations=*");
        req.onreadystatechange = function () {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 200) {
                    var result = JSON.parse(this.response);
                    // console.log(result);
                    // Columns
                    var quoteid = result["quoteid"]; // Guid
                    var createdon = result["createdon"]; // Date Time
                    var createdon_formatted = result["createdon@OData.Community.Display.V1.FormattedValue"];

                    if (createdon) createdOnDate = new Date(createdon);

                } else {
                    console.log(this.responseText);
                }
            }
        };
        req.send();

        return createdOnDate;
    }

}

// async function ActivateQuote(primaryControl) {
//     const formContext = primaryControl;
//     Xrm.Utility.showProgressIndicator("Activating Quote...");
//     Xrm.Page.data.save().then(function () {
//         Xrm.WebApi.updateRecord("quote", Xrm.Page.data.entity.getId(), {
//             statecode: 1,
//             statuscode: -1
//         }).then(function () {
//             Xrm.Page.data.refresh().then(function () {
//                 Xrm.Page.ui.refreshRibbon();

//                 var userId = Xrm.Utility.getGlobalContext().userSettings.userId.replace(/[{}]/g, ""); // Remove curly braces
//                 var notificationData = {
//                     Title: "Quote Activated",
//                     Body: "You have activated a quote.",
//                     Recipient: `/systemusers(${userId})`,
//                     IconType: 100000001, // info
//                     ToastType: 200000000, // timed
//                     Expiry: 6 // 6 seconds
//                 };

//                 var req = new XMLHttpRequest();
//                 req.open("POST", Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/SendAppNotification", true);
//                 req.setRequestHeader("OData-MaxVersion", "4.0");
//                 req.setRequestHeader("OData-Version", "4.0");
//                 req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
//                 req.setRequestHeader("Accept", "application/json");
//                 req.onreadystatechange = function () {
//                     if (this.readyState === 4) {
//                         req.onreadystatechange = null;
//                         if (this.status === 200) {
//                             console.log("Notification sent successfully.");
//                         } else {
//                             console.log("Error sending notification: " + this.responseText + ", Status: " + this.status);
//                         }
//                     }
//                 };
//                 req.send(JSON.stringify(notificationData));

//             });
//         }).catch(function (error) {
//             progressIndicator.hideOnError(ClientUtility.ActionFailedHandler.actionFailedCallback)(error);
//         });
//     }).catch(function (error) {
//         progressIndicator.hideOnError(ClientUtility.ActionFailedHandler.actionFailedCallback)(error);
//     });

//     if (formContext.getControl('WebResource_quoteLines').getObject()) {
//         await formContext.getControl('WebResource_quoteLines').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
//     }

//     Xrm.Utility.closeProgressIndicator();
// }
