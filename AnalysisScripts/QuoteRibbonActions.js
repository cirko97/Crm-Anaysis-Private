/**
* @license Copyright (c) Microsoft Corporation. All rights reserved.
*/
var Sales;
(function (Sales) {
    var OpportunityRules = (function () {
        function OpportunityRules() {
        }
        /**
        * Function to log report success telemetry which works only for UCI so this need to be guraded in Web Client
        */
        OpportunityRules.reportSuccess = function (componentName, eventParams) {
            if (!ClientUtility.DataUtil.isNullOrUndefined(Xrm.Reporting)) {
                Xrm.Reporting.reportSuccess(componentName, eventParams);
            }
        };
        /**
        * Function to log report success telemetry which works only for UCI so this need to be guraded in Web Client
        */
        OpportunityRules.reportFailure = function (componentName, eventParams) {
            if (!ClientUtility.DataUtil.isNullOrUndefined(Xrm.Reporting)) {
                Xrm.Reporting.reportFailure(componentName, eventParams);
            }
        };
        /**
        * Method to return boolean value (is quick create for opportunity close feature is enabled or not)
        * @returns {boolean} true if all the fcbs and org settings are turned on, else false
        */
        OpportunityRules.IsQuickCreateEnabledForOpportunityClose = function (isUCI) {
            if (!(OpportunityRules.quickCreateOptyCloseEnabled === null || OpportunityRules.quickCreateOptyCloseEnabled === undefined)) {
                return OpportunityRules.quickCreateOptyCloseEnabled;
            }
            else {
                if (OpportunityRules.isOct2019FcbEnabed(isUCI) && OpportunityRules.isOptyCloseFcbEnabled(isUCI) && OpportunityRules.getOptyCloseFromOrgSettings()) {
                    OpportunityRules.quickCreateOptyCloseEnabled = true;
                }
                else {
                    OpportunityRules.quickCreateOptyCloseEnabled = false;
                }
                return OpportunityRules.quickCreateOptyCloseEnabled;
            }
        };
        /**
        * Method to check whether FCB for quick create for opportunity close is enabled or not
        * @returns {boolean} true if FCB for quick create for opportunity close is enabled, otherwise false
        */
        OpportunityRules.isOptyCloseFcbEnabled = function (isUCI) {
            var fcbName = isUCI ? OpportunityRules.fcbForOpptyClose : OpportunityRules.fcbPrefix + OpportunityRules.fcbForOpptyClose;
            var isOptyCloseFcb = Xrm.Internal.isFeatureEnabled(fcbName);
            return isOptyCloseFcb;
        };
        /**
        * Method to check whether FCB for Oct 2019 features are enabled or not
        * @returns  {boolean} true if FCB for Oct 2018 features are turned on, otherwise false
        */
        OpportunityRules.isOct2019FcbEnabed = function (isUCI) {
            var fcbName = isUCI ? OpportunityRules.fcbForOct2019 : OpportunityRules.fcbPrefix + OpportunityRules.fcbForOct2019;
            var isOct2019Fcb = Xrm.Internal.isFeatureEnabled(fcbName);
            return isOct2019Fcb;
        };
        /**
        * Method to check whether FCB for Enable Customized Opty Close Within Quote Close is enabled or not
        * @returns {boolean} true if FCB for Enable Customized Opty Close Within Quote Close is enabled, otherwise false
        */
        OpportunityRules.isOptyCloseCustomizationEnabledWithinQuoteClose = function (isUCI) {
            var fcbName = isUCI ? OpportunityRules.fcbForOptyCloseCustomizationWithinQuoteClose : OpportunityRules.fcbPrefix + OpportunityRules.fcbForOptyCloseCustomizationWithinQuoteClose;
            var isOptyCloseWithinQuoteFcb = Xrm.Internal.isFeatureEnabled(fcbName);
            return isOptyCloseWithinQuoteFcb;
        };
        /**
        * Method to get opportunity close feature is enabled or not from organization setting
        * @returns {boolean} true if opportunity close feature is enabled,else false.
        */
        OpportunityRules.getOptyCloseFromOrgSettings = function () {
            var isOptyCloseEnabled;
            var attribs = Xrm.Utility.getGlobalContext().organizationSettings.attributes;
            if (!ClientUtility.DataUtil.isNullOrUndefined(attribs) && !ClientUtility.DataUtil.isNullOrUndefined(attribs[OpportunityRules.opportunitityCloseOrgSetting])) {
                isOptyCloseEnabled = Xrm.Utility.getGlobalContext().organizationSettings.attributes[OpportunityRules.opportunitityCloseOrgSetting] == 0 ? false : true;
            }
            return isOptyCloseEnabled;
        };
        return OpportunityRules;
    }());
    OpportunityRules.fcbPrefix = "FCB.";
    OpportunityRules.fcbForOpptyClose = "EnableQuickCreateForOpportunityClose";
    OpportunityRules.fcbForOct2019 = "October2019Update";
    OpportunityRules.opportunitityCloseOrgSetting = "isquickcreateenabledforopportunityclose";
    OpportunityRules.fcbForOptyCloseCustomizationWithinQuoteClose = "EnableCustomizedOptyCloseWithinQuoteClose";
    /**
     * Function to find if Quick Create Form experience is to be shown or not during the Opportunity Close.
     */
    OpportunityRules.isValidforQuickCreateExperience = function (OppCloseSource) {
        var promise = new Promise(function (resolve, reject) {
            var isUCIClient = ClientUtility.ClientUtil.isUCI();
            var isMobileOffline = ClientUtility.ClientUtil.isMobileOffline();
            // we don't support new expereince currently on mobile offline and also we don't want to support webclient ever since it's being deprecated.
            if (isMobileOffline || !isUCIClient) {
                resolve(false);
            }
            OpportunityRules.IsEntityInCurrentAppModule(Sales.OpportunityCloseConstants.OpportunityCloseEntityId).then(function (isOppCloseInAppModule) {
                var isQuickCreateEnabledForOpportunityClose = OpportunityRules.IsQuickCreateEnabledForOpportunityClose(isUCIClient);
                // Check if the FCB for Opportunity Close Quick Create experience is enabled, if the org admin has consented for the new feature from settings,
                // if the UX is UCI and if the client is not mobile offline client only then it will return true.
                var eventParams = [
                    { name: "isUCIClient", value: isUCIClient },
                    { name: "isMobileOffline", value: isMobileOffline },
                    { name: "IsQuickCreateEnabledForOpportunityClose", value: isQuickCreateEnabledForOpportunityClose },
                    { name: "IsOpportunityCloseInCurrentAppModule", value: isOppCloseInAppModule },
                ];
                var componentName = OppCloseSource + "_isValidforQuickCreateExperience";
                OpportunityRules.reportSuccess(componentName, eventParams);
                var isValidforQuickCreateExperience = ClientUtility.ClientUtil.isUCI() && !ClientUtility.ClientUtil.isMobileOffline() && isQuickCreateEnabledForOpportunityClose && isOppCloseInAppModule;
                if (isValidforQuickCreateExperience) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            }).catch(function (error) {
                var eventParams = [
                    { name: "PromiseFailed", value: "IsEntityInCurrentAppModule" }
                ];
                var componentName = OppCloseSource + "_isValidforQuickCreateExperience";
                OpportunityRules.reportFailure(componentName, eventParams);
                // If the existing promise fails then log the telemetry and resolve the promise with false to fall back to MDD experience for Closing Opportunity.
                resolve(false);
            });
        });
        return promise;
    };
    /*
     * Function to find if a given entity is present or not in Current App Module of the user.
     */
    OpportunityRules.IsEntityInCurrentAppModule = function (entityId) {
        return new Promise(function (resolve, reject) {
            // Fetch AppModuleId and then In-turn find if app module contains Opportunity Close Entity.
            Xrm.Page.context.getCurrentAppProperties().then(function (appModuleProperties) {
                if (!ClientUtility.DataUtil.isNullOrUndefined(appModuleProperties) && !ClientUtility.DataUtil.isNullOrEmptyString(appModuleProperties["appId"])) {
                    var appModuleId = { guid: appModuleProperties["appId"] };
                    var retrieveAppComponentsRequest = new ODataContract.RetrieveAppComponentsRequest(appModuleId);
                    Xrm.WebApi.online.execute(retrieveAppComponentsRequest)
                        .then(function (response) {
                        if (ClientUtility.DataUtil.isNullOrUndefined(response))
                            resolve(false);
                        response.json().then(function (appComponentsResponse) {
                            if (ClientUtility.DataUtil.isNullOrUndefined(appComponentsResponse))
                                resolve(false);
                            // Build list of ObjectIds from AppComponents, which is equal to EntityId in case of Entity being an AppModule Component.
                            var appModuleObjectIdsList = appComponentsResponse.value.map(function (element) {
                                return element.objectid;
                            });
                            // If the entity is present in the list of AppModuleComponents, return true otherwise false.
                            if (appModuleObjectIdsList.indexOf(entityId) !== -1)
                                resolve(true);
                            else
                                resolve(false);
                        }, null);
                    }, function (error) { reject(error); });
                }
                else {
                    resolve(false);
                }
            }, function (error) { reject(error); });
        });
    };
    Sales.OpportunityRules = OpportunityRules;
})(Sales || (Sales = {}));
var Sales;
(function (Sales) {
    var OpportunityCloseConstants = (function () {
        function OpportunityCloseConstants() {
        }
        return OpportunityCloseConstants;
    }());
    OpportunityCloseConstants.ActualEndId = "actualend";
    OpportunityCloseConstants.ActualRevenueId = "actualrevenue";
    OpportunityCloseConstants.CompetitorId = "competitorid";
    OpportunityCloseConstants.DescriptionId = "description";
    OpportunityCloseConstants.OpportunityId = "opportunityid";
    OpportunityCloseConstants.OpportunityStateCodeId = "opportunitystatecode";
    OpportunityCloseConstants.OpportunityStatusCodeId = "opportunitystatuscode";
    OpportunityCloseConstants.Param_HideCompetitorField = "param_hideCompetitorField";
    OpportunityCloseConstants.Param_OpportunityId = "param_opportunityId";
    OpportunityCloseConstants.Param_OpportunityName = "param_opportunityName";
    OpportunityCloseConstants.Param_Won = "param_won";
    OpportunityCloseConstants.SubjectId = "subject";
    OpportunityCloseConstants.TransactionCurrencyId = "transactioncurrencyid";
    OpportunityCloseConstants.OpportunityCloseEntityId = "dc22c553-5e16-45d3-8842-d142bef3877e";
    OpportunityCloseConstants.TimeZoneOffsetMinutes = "param_timezone";
    Sales.OpportunityCloseConstants = OpportunityCloseConstants;
})(Sales || (Sales = {}));
/**
* @license Copyright (c) Microsoft Corporation. All rights reserved.
*/
/// <reference path="../../../../../../TypeDefinitions/CRM/ClientUtility.d.ts" />
/// <reference path="../../../../../../TypeDefinitions/AppCommon/Telemetry/TelemetryLibrary.d.ts" />
/// <reference path='../../../../ClientCommon/Sales_ClientCommon.d.ts' />
/// <reference path='../../../../CommandBarActions/SalesCommandBarActions.d.ts' />
/// <reference path="../../../../../client/Opportunity/OpportunityRules.ts" />
/// <reference path="../../../../../client/Opportunity/OpportunityCloseConstants.ts" />
var Sales;
(function (Sales) {
    var QuoteRibbonActionsLibrary = (function () {
        function QuoteRibbonActionsLibrary() {
            var _this = this;
            this.closeQuoteCommandAction = "CloseQuoteCommandActions";
            /**
             * Revises active or closed quote
             */
            this.reviseActiveOrClosedQuote = function () {
                //TODO: We cannot currently access the state code because the control is not currently there.
                _this.retrieveStateCode(function (stateCode) {
                    if (stateCode == Sales.QuoteState.Active) {
                        _this.reviseActiveQuote();
                    }
                    else if (stateCode === Sales.QuoteState.Closed) {
                        _this.reviseClosedQuote();
                    }
                });
            };
            /**
             * Revises active quote
             */
            this.reviseActiveQuote = function () {
                //Data will be saved only when user has admin rights.
                _this.checkCurrentUserisAdmin().then(function (isAdmin) {
                    if (isAdmin) {
                        Xrm.Page.data.save().then(function (Response) {
                            return _this.validateOwnerDetailsBeforeReviseSavedQuote();
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                    else {
                        _this.IgnoreAttributeOnNonAdminMode();
                        return _this.validateOwnerDetailsBeforeReviseSavedQuote();
                    }
                }).catch(function (error) { ClientUtility.ActionFailedHandler.actionFailedCallback; });
            };
            /**
             * Revises closed quote
             */
            this.reviseClosedQuote = function () {
                //Data will be saved only when user has admin rights.
                _this.checkCurrentUserisAdmin().then(function (isAdmin) {
                    if (isAdmin) {
                        Xrm.Page.data.save().then(function (Response) {
                            return _this.reviseQuote();
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                    else {
                        _this.IgnoreAttributeOnNonAdminMode();
                        return _this.reviseQuote();
                    }
                }).catch(function (error) { ClientUtility.ActionFailedHandler.actionFailedCallback; });
            };
            this.checkCurrentUserisAdmin = function () {
                return new Promise(function (resolve, reject) {
                    var isAdmin = false;
                    Xrm.WebApi.online.retrieveMultipleRecords("role", "?$select=roleid&$filter=_roletemplateid_value eq 627090ff-40a3-4053-8790-584edc5be201").then(function (response) {
                        var securityRoles = Xrm.Page.context.userSettings.securityRoles;
                        if (!ClientUtility.DataUtil.isNullOrUndefined(response) && !ClientUtility.DataUtil.isNullOrUndefined(response.entities) && !ClientUtility.DataUtil.isNullOrUndefined(securityRoles)) {
                            for (var j = 0; j < response.entities.length; j++) {
                                if (!ClientUtility.DataUtil.isNullOrUndefined(response.entities[j]) && !ClientUtility.DataUtil.isNullOrUndefined(response.entities[j].roleid)) {
                                    for (var i = 0; i < securityRoles.length; i++) {
                                        if (securityRoles[i].toLowerCase() == response.entities[j].roleid.toLowerCase()) {
                                            isAdmin = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        resolve(isAdmin);
                    }, function (error) {
                        return reject(error);
                    });
                });
            };
            /**
             * Revise a quote that is saved.
             * @private
             * @returns {*}
             */
            this.validateOwnerDetailsBeforeReviseSavedQuote = function () {
                var ownerLookup = Xrm.Page.data.entity.attributes.get('ownerid');
                var ownerid = ClientUtility.Guid.Empty;
                var ownerType = "";
                if (!ClientUtility.DataUtil.isNullOrUndefined(ownerLookup)) {
                    var ownerLookupValue = ownerLookup.getValue();
                    if (ownerLookupValue.length !== 0 && !ClientUtility.DataUtil.isNullOrUndefined(ownerLookupValue[0].entityType)) {
                        ownerid = ownerLookupValue[0].id;
                        ownerType = ownerLookupValue[0].entityType;
                        _this.reviseSavedQuote(ownerid, ownerType);
                    }
                }
                else {
                    var quoteId = Xrm.Page.data.entity.getId();
                    if (!ClientUtility.DataUtil.isNullOrUndefined(quoteId)) {
                        var that = _this;
                        Xrm.WebApi.online.retrieveRecord(Sales.EntityNames.Quote, ClientUtility.Guid.create(quoteId.toString())).then(function (quoterecord) {
                            if (!ClientUtility.DataUtil.isNullOrUndefined(quoterecord) && !ClientUtility.DataUtil.isNullOrUndefined(quoterecord["_ownerid_value"]) && !ClientUtility.DataUtil.isNullOrUndefined(quoterecord["_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"])) {
                                ownerid = quoterecord["_ownerid_value"];
                                ownerType = quoterecord["_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                                that.reviseSavedQuote(ownerid, ownerType);
                            }
                            else {
                                var options = new Xrm.AlertDialogStrings;
                                options.text = Sales.StringProvider.getResourceString("cannotReviseQuote");
                                Xrm.Dialog.openAlertDialog(options);
                            }
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                }
            };
            this.reviseSavedQuote = function (ownerid, ownerType) {
                var quoteClose = {};
                quoteClose.actualend = new Date();
                quoteClose["quoteid@odata.bind"] = "/quotes(" + ClientUtility.Guid.create(Xrm.Page.data.entity.getId()) + ")";
                // ToDo: replace label placeholders
                quoteClose.subject = Sales.StringProvider.getResourceString("Quote_Closed_Subject");
                if (!ClientUtility.DataUtil.isNullOrUndefined(Xrm.Page.data.entity.attributes.get('description'))) {
                    quoteClose.description = Xrm.Page.data.entity.attributes.get('description').getValue();
                }
                quoteClose.quotenumber = Xrm.Page.data.entity.attributes.get('quotenumber').getValue();
                quoteClose.revision = Xrm.Page.data.entity.attributes.get('revisionnumber').getValue();
                quoteClose["ownerid_quoteclose@odata.bind"] = "/" + ownerType + "s(" + ClientUtility.Guid.create(ownerid) + ")";
                var retrieveDefaultStatusForStateRequest = new ODataContract.RetrieveDefaultStatusForStateRequest(Sales.EntityNames.Quote, Sales.QuoteState.Closed);
                Xrm.WebApi.online.execute(retrieveDefaultStatusForStateRequest).then(function (response) {
                    var defaultStatusCode = Sales.CloseQuoteStatus.Revised;
                    response.json().then(function (jsonResponse) {
                        defaultStatusCode = jsonResponse.Status;
                        var closeQuoteRequest = new ODataContract.CloseQuoteRequest(quoteClose, defaultStatusCode);
                        Xrm.WebApi.online.execute(closeQuoteRequest).then(function () {
                            _this.reviseQuote();
                        }, ClientUtility.ActionFailedHandler.actionFailedErrorDialog);
                    }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                });
            };
            /**
             * The current quote
             * @private
             * @param {*} columnSet
             */
            this.reviseQuote = function (columnSet) {
                if (!columnSet) {
                    columnSet = new ODataContract.ColumnSet(true, []);
                }
                //TODO: See if guid is of object or string.
                var progressIndicator = new ClientUtility.ProgressIndicator();
                progressIndicator.show();
                var reviseQuoteRequest = new ODataContract.ReviseQuoteRequest({ guid: Xrm.Page.data.entity.getId() }, columnSet);
                Xrm.WebApi.online.execute(reviseQuoteRequest).then(function (response) {
                    response.json().then(function (jsonResponse) {
                        var childEntity = jsonResponse.value;
                        var revisedQuoteId = jsonResponse.quoteid;
                        if (!ClientUtility.DataUtil.isNullOrUndefined(revisedQuoteId)) {
                            Xrm.Utility.openEntityForm(Sales.EntityNames.Quote, revisedQuoteId, { formid: null }, { height: 0, width: 0, openInNewWindow: false });
                            progressIndicator.hide();
                            _this.commandBarActions.showToastMessageOnQuoteActions("Sales_Quote_Revised_ToastNotification");
                        }
                    });
                }, function (error) { progressIndicator.hideOnError(ClientUtility.ActionFailedHandler.actionFailedCallback)(error); });
            };
            /**
             * Closes the quote
             */
            this.closeQuote = function (createRevisedQuote, showDialog, userPreferences) {
                if (createRevisedQuote === void 0) { createRevisedQuote = true; }
                if (showDialog === void 0) { showDialog = true; }
                if (userPreferences === void 0) { userPreferences = {}; }
                _this.checkCurrentUserisAdmin().then(function (isAdmin) {
                    if (isAdmin) {
                        Xrm.Page.data.save().then(function () {
                            _this.handleCloseQuote(createRevisedQuote, showDialog, userPreferences);
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                    else {
                        _this.IgnoreAttributeOnNonAdminMode();
                        _this.handleCloseQuote(createRevisedQuote, showDialog, userPreferences);
                    }
                }).catch(function (error) { ClientUtility.ActionFailedHandler.actionFailedCallback; });
            };
            this.handleCloseQuote = function (createRevisedQuote, showDialog, userPreferences) {
                var opportunityAttribute = Xrm.Page.data.entity.attributes.get('opportunityid');
                var value = !ClientUtility.DataUtil.isNullOrUndefined(opportunityAttribute) ? opportunityAttribute.getValue() : null;
                var opportunityId = !ClientUtility.DataUtil.isNullOrUndefined(value) && value.length ? value[0].id : '';
                if (ClientUtility.DataUtil.isNullOrEmptyString(opportunityId)) {
                    showDialog ? _this.showCloseQuoteDialog(Xrm.Page.data.entity.getId(), opportunityId, false, createRevisedQuote) : _this.quickClose(userPreferences.statusReason, userPreferences.closeOpty, Xrm.Page.data.entity.getId(), opportunityId, false, userPreferences.createRevisedQuote);
                }
                else {
                    var canCloseOpportunityRequest = new ODataContract.CanCloseOpportunityRequest({ id: ClientUtility.Guid.create(opportunityId), entityType: Sales.EntityNames.Opportunity }, { id: ClientUtility.Guid.create(Xrm.Page.data.entity.getId()), entityType: Sales.EntityNames.Quote }, Sales.OpportunityState.Lost);
                    Xrm.WebApi.online.execute(canCloseOpportunityRequest).then(function (response) {
                        response.json().then(function (jsonResponse) {
                            showDialog ? _this.showCloseQuoteDialog(Xrm.Page.data.entity.getId(), opportunityId, jsonResponse.CanClose, createRevisedQuote) : _this.quickClose(userPreferences.statusReason, userPreferences.closeOpty, Xrm.Page.data.entity.getId(), opportunityId, jsonResponse.CanClose, userPreferences.createRevisedQuote);
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    });
                }
            };
            this.IgnoreAttributeOnNonAdminMode = function () {
                //Here we are handling dirty fields not to save for "Non Admin" user
                var quoteAttributes = Xrm.Page.data.entity.attributes.get();
                if (!ClientUtility.DataUtil.isNullOrUndefined(quoteAttributes)) {
                    for (var index in quoteAttributes) {
                        if (quoteAttributes[index].getIsDirty()) {
                            quoteAttributes[index].setSubmitMode("never");
                        }
                    }
                }
            };
            /**
             * shows close quote dialog
             * @private
             * @param {string} quoteId
             * @param {string} opportunityId
             * @param {boolean} canCloseOpportunity
             */
            this.showCloseQuoteDialog = function (quoteId, opportunityId, canCloseOpportunity, createRevisedQuote) {
                var formParameters = {};
                formParameters[Sales.MetadataDrivenDialogConstantsQuoteClose.TimeZoneOffsetMinutes] = Xrm.Utility.getGlobalContext().userSettings.getTimeZoneOffsetMinutes();
                var options = { height: 400, width: 475, position: 1 /* center */ };
                var dialogParams = {};
                dialogParams[Sales.MetadataDrivenDialogConstantsQuoteClose.QuoteId] = quoteId;
                dialogParams[Sales.MetadataDrivenDialogConstantsQuoteClose.CreateRevisedQuote] = createRevisedQuote;
                dialogParams[Sales.MetadataDrivenDialogConstantsQuoteClose.OpportunityId] = ClientUtility.DataUtil.isNullOrEmptyString(opportunityId) ? ClientUtility.Guid.Empty : ClientUtility.Guid.create(opportunityId);
                dialogParams[Sales.MetadataDrivenDialogConstantsQuoteClose.CanCloseOpportunity] = canCloseOpportunity;
                dialogParams[Sales.MetadataDrivenDialogConstantsQuoteClose.ClosedState] = Sales.QuoteState.Closed;
                dialogParams[Sales.MetadataDrivenDialogConstantsQuoteClose.TimeZoneOffsetMinutes] = Xrm.Utility.getGlobalContext().userSettings.getTimeZoneOffsetMinutes();
                Xrm.Navigation.openDialog(Sales.DialogName.CloseQuote, options, dialogParams).then(_this.closeQuoteDialogCloseCallback);
            };
            /**
             * Handles the closing of close quote dialog
             * @param {XrmClientApi.DialogResponse} response
             */
            this.closeQuoteDialogCloseCallback = function (response) {
                var parameters = response.parameters;
                var lastButtonClicked = parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.LastButtonClicked];
                if (ClientUtility.DataUtil.isNullOrUndefined(lastButtonClicked) || lastButtonClicked.toString() !== ClientUtility.MetadataDrivenDialogConstants.DialogOkId) {
                    return;
                }
                _this.executeQuoteClose(parameters);
            };
            this.getSelectedOptionValueFromOptionSetControl = function (controlName) {
                var optionSetControl = Xrm.Page.ui.controls.get(controlName);
                var options = optionSetControl.getAttribute();
                return options.getSelectedOption().value;
            };
            this.getCloseQuoteDialogClosedState = function () {
                var closedStateAttribute = Xrm.Page.data.attributes.get(Sales.MetadataDrivenDialogConstantsQuoteClose.ClosedState);
                return closedStateAttribute.getValue();
            };
            this.getCloseQuoteDialogQuoteId = function () {
                var quoteIdAttribute = Xrm.Page.data.attributes.get(Sales.MetadataDrivenDialogConstantsQuoteClose.QuoteId);
                return !ClientUtility.DataUtil.isNullOrUndefined(quoteIdAttribute.getValue()) ? quoteIdAttribute.getValue().toString() : null;
            };
            this.getCloseQuoteDialogOpportunityId = function () {
                var attribute = Xrm.Page.data.attributes.get(Sales.MetadataDrivenDialogConstantsQuoteClose.OpportunityId);
                return !ClientUtility.DataUtil.isNullOrUndefined(attribute.getValue()) ? attribute.getValue().toString() : null;
            };
            this.getCloseQuoteDialogDescription = function () {
                var descriptionAttribute = Xrm.Page.data.attributes.get(Sales.MetadataDrivenDialogConstantsQuoteClose.Description);
                return descriptionAttribute.getValue();
            };
            this.getCloseQuoteDialogDate = function () {
                var closeDateControl = Xrm.Page.ui.controls.get(Sales.MetadataDrivenDialogConstantsQuoteClose.Date);
                return closeDateControl.getAttribute().getValue();
            };
            /**
             * Show the opportunity close dialog
             * @private
             * @param {string} opportunityId
             * @param {string} quoteId
             * @param {*} reason
             * @param {*} closeDate
             * @param {string} description
             * @param {boolean} createRevisedQuote
             */
            this.showOpportunityCloseDialog = function (opportunityId, quoteId, reason, closeDate, description, createRevisedQuote) {
                var callbackParams = {};
                var options = { width: 450, height: 420, position: 1 /* center */ };
                var dialogParams = {};
                callbackParams[Sales.MetadataDrivenDialogConstantsQuoteClose.QuoteId] = quoteId;
                callbackParams[Sales.MetadataDrivenDialogConstantsQuoteClose.Reason] = reason;
                callbackParams[Sales.MetadataDrivenDialogConstantsQuoteClose.Date] = closeDate;
                callbackParams[Sales.MetadataDrivenDialogConstantsQuoteClose.Description] = description;
                callbackParams[Sales.MetadataDrivenDialogConstantsQuoteClose.CreateRevisedQuote] = createRevisedQuote;
                dialogParams[Sales.MetadataDrivenDialogConstantsOpportunityClose.Won] = false;
                dialogParams[Sales.MetadataDrivenDialogConstantsOpportunityClose.OpportunityId] = opportunityId;
                dialogParams[Sales.MetadataDrivenDialogConstantsOpportunityClose.Caller] = Sales.DialogName.CloseQuote;
                dialogParams[Sales.MetadataDrivenDialogConstantsOpportunityClose.CallerParameters] = callbackParams;
                Xrm.Navigation.openDialog(Sales.DialogName.CloseOpportunity, options, dialogParams).then(_this.closeOpportunityDialogCloseCallback);
            };
            /**
             * Handles the closing of close opportunity dialog
             * @param {*} dialogParams
             * @param {*} callbackParams
             */
            this.closeOpportunityDialogCloseCallback = function (response) {
                var parameters = response.parameters;
                var lastButtonClicked = parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.LastButtonClicked];
                if (ClientUtility.DataUtil.isNullOrUndefined(lastButtonClicked) || lastButtonClicked.toString() !== ClientUtility.MetadataDrivenDialogConstants.DialogOkId) {
                    return;
                }
                var opportunityInfo = {};
                if (parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.Won]) {
                    opportunityInfo['state'] = Sales.OpportunityState.Won;
                }
                else {
                    opportunityInfo['state'] = Sales.OpportunityState.Lost;
                }
                opportunityInfo['reason'] = parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.OpportunityStatusReasonId];
                if (!ClientUtility.DataUtil.isNullOrUndefined(parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.ActualRevenueId])) {
                    opportunityInfo['actualRevenue'] = parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.ActualRevenueId];
                }
                if (!ClientUtility.DataUtil.isNullOrUndefined(parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.DescriptionId])) {
                    opportunityInfo['description'] = parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.DescriptionId];
                }
                if (!ClientUtility.DataUtil.isNullOrUndefined(parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.CompetitorId])) {
                    opportunityInfo['competitor'] = parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.CompetitorId];
                }
                if (!ClientUtility.DataUtil.isNullOrUndefined(parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.CloseDateId])) {
                    opportunityInfo['actualEnd'] = parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.CloseDateId];
                }
                var callbackParameters = response.parameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.CallerParameters];
                _this.commandBarActions.closeQuoteAndOpportunity(callbackParameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Reason], opportunityInfo['reason'], opportunityInfo['state'], callbackParameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Description], callbackParameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Date], null, opportunityInfo, callbackParameters[Sales.MetadataDrivenDialogConstantsQuoteClose.CreateRevisedQuote], true);
            };
            this.acceptQuoteOrCreateOrder = function () {
                var stateCodeAttribute = Xrm.Page.data.entity.attributes.get('statecode');
                if (!stateCodeAttribute) {
                    return;
                }
                var stateCode = stateCodeAttribute.getValue();
                if (stateCode === Sales.QuoteState.Active) {
                    _this.acceptQuote();
                }
                if (stateCode === Sales.QuoteState.Won) {
                    _this.CreateOrder();
                }
            };
            this.CreateOrder = function () {
                _this.checkCurrentUserisAdmin().then(function (isAdmin) {
                    if (isAdmin) {
                        Xrm.Page.data.save().then(function (Response) {
                            _this.CreateQuoteToOrder();
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                    else {
                        _this.IgnoreAttributeOnNonAdminMode();
                        _this.CreateQuoteToOrder();
                    }
                }).catch(function (error) { ClientUtility.ActionFailedHandler.actionFailedCallback; });
            };
            this.CreateQuoteToOrder = function () {
                if (Xrm.Page.context.client.getClient() === Xrm.Constants.ClientNames.outlook) {
                    if (!_this.ConfirmCreateOrder()) {
                        return;
                    }
                }
                if (Xrm.Internal.isUci()) {
                    var progressIndicator_1 = new ClientUtility.ProgressIndicator();
                    progressIndicator_1.show();
                    var columnSet = new ODataContract.ColumnSet(true, []);
                    var createOrderRequest = new ODataContract.ConvertQuoteToSalesOrderRequest({ guid: ClientUtility.Guid.create(Xrm.Page.data.entity.getId()) }, columnSet, null, 0, "", "", { id: ClientUtility.Guid.Empty, entityType: "workflow" });
                    Xrm.WebApi.online.execute(createOrderRequest).then(function (response) {
                        response.json().then(function (responseCreateOrder) {
                            var quoteSalesOrderId = responseCreateOrder.salesorderid;
                            if (!ClientUtility.DataUtil.isNullOrEmptyString(quoteSalesOrderId)) {
                                if (Xrm.Internal.isUci()) {
                                    _this.commandBarActions.showQuoteToOrderToastMessage();
                                }
                                Xrm.Utility.openEntityForm(Sales.EntityNames.SalesOrder, quoteSalesOrderId);
                                progressIndicator_1.hide();
                            }
                        });
                    }, function (error) { progressIndicator_1.hideOnError(ClientUtility.ActionFailedHandler.actionFailedCallback)(error); });
                }
                else {
                    // This is the old script using internal deprecated APIs. 
                    // The UCI version should work for both cases, but there is a bug on the web client that they are not going to fix for Potassium because "it is not meeting the Potassium bug bar".
                    // TODO: This is tracked by 707338, once it is fixed, remove the if statement.
                    var columnSet = Microsoft.Crm.Client.Core.Storage.Common.AllColumns.get_instance();
                    Xrm.Internal.messages.createOrder(ClientUtility.Guid.create(Xrm.Page.data.entity.getId()), columnSet)
                        .then(function (response) {
                        var childEntity = (response).entity;
                        var quoteSalesOrderId = childEntity.get_identifier().Id.toString();
                        if (!ClientUtility.DataUtil.isNullOrEmptyString(quoteSalesOrderId)) {
                            Xrm.Utility.openEntityForm(Sales.EntityNames.SalesOrder, quoteSalesOrderId);
                        }
                    }, Mscrm.InternalUtilities.ClientApiUtility.actionFailedCallback);
                }
            };
            this.ConfirmCreateOrder = function () {
                try {
                    if (Xrm.Page.context.client.getClientState() === Xrm.Constants.ClientStates.offline) {
                        return confirm(Sales.StringProvider.getResourceString("Web.SFA.quotes.edit.aspx_340"));
                    }
                    else {
                        return true;
                    }
                }
                catch (e) {
                    throw e;
                }
            };
            /**
             * Opens the CreateOrder dialog
             */
            this.acceptQuote = function () {
                _this.checkCurrentUserisAdmin().then(function (isAdmin) {
                    if (isAdmin) {
                        Xrm.Page.data.save().then(function () {
                            _this.acceptQuoteForOrder();
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                    else {
                        _this.IgnoreAttributeOnNonAdminMode();
                        _this.acceptQuoteForOrder();
                    }
                }).catch(function (error) { ClientUtility.ActionFailedHandler.actionFailedCallback; });
            };
            this.acceptQuoteForOrder = function () {
                if (Xrm.Page.context.client.getClient() === Xrm.Constants.ClientNames.outlook) {
                    if (!_this.ConfirmCreateOrder()) {
                        return;
                    }
                }
                var opportunityAttribute = Xrm.Page.data.entity.attributes.get('opportunityid');
                var items = !ClientUtility.DataUtil.isNullOrEmptyString(opportunityAttribute) ? opportunityAttribute.getValue() : null;
                var oppId = (items) && items.length > 0 ? items[0].id : '';
                if (ClientUtility.DataUtil.isNullOrEmptyString(oppId)) {
                    _this.showCreateOrderDialog(Xrm.Page.data.entity.getId(), ClientUtility.Guid.Empty, false);
                }
                else {
                    var OpportunityStateLost = 2;
                    if (Xrm.Internal.isUci()) {
                        var canCloseOpportunityRequest = new ODataContract.CanCloseOpportunityRequest({ id: oppId, entityType: Sales.EntityNames.Opportunity }, { id: Xrm.Page.data.entity.getId(), entityType: Sales.EntityNames.Quote }, OpportunityStateLost);
                        Xrm.WebApi.online.execute(canCloseOpportunityRequest).then(function (response) {
                            response.json().then(function (jsonResponse) {
                                _this.showCreateOrderDialog(Xrm.Page.data.entity.getId(), oppId, jsonResponse.CanClose);
                            });
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                    else {
                        // This is the old script using internal deprecated APIs.
                        // The UCI version should work for both cases, but there is a bug on the web client that they are not going to fix for Potassium because it is not a regression.
                        // TODO: This is tracked by 707357, once it is fixed, remove the if statement.
                        Xrm.Internal.messages.canCloseOpportunity(ClientUtility.Guid.create(oppId), ClientUtility.Guid.create(Xrm.Page.data.entity.getId()), OpportunityStateLost).then(function (response) {
                            _this.showCreateOrderDialog(Xrm.Page.data.entity.getId(), oppId, (response).canClose);
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                }
            };
            /**
             * Sets the parameters for the CreateOrder dialog and opens the MDD
             */
            this.showCreateOrderDialog = function (quoteId, opportunityId, canCloseOpportunity) {
                var options = { width: 475, height: 500, position: 1 /* center */ };
                var dialogParams = {};
                var callbackParams = {};
                dialogParams[Sales.MetadataDrivenDialogConstantsOrderCreate.QuoteId] = quoteId;
                dialogParams[Sales.MetadataDrivenDialogConstantsOrderCreate.OpportunityId] = opportunityId;
                dialogParams[Sales.MetadataDrivenDialogConstantsOrderCreate.CanCloseOpportunity] = canCloseOpportunity;
                var WonClosedState = 2;
                dialogParams[Sales.MetadataDrivenDialogConstantsOrderCreate.ClosedState] = WonClosedState;
                Xrm.Navigation.openDialog(Sales.DialogName.CreateOrder, options, dialogParams).then(_this.createSalesOrderDialogCloseCallback);
            };
            /**
             * The callback function for the CreateOrder dialog; calls the CommandBarActions function to create
             * the order and close the opportunity
             */
            this.createSalesOrderDialogCloseCallback = function (dialogParams) {
                var lastButtonClicked = dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.LastButtonClicked];
                if (ClientUtility.DataUtil.isNullOrUndefined(lastButtonClicked) || lastButtonClicked.toString() !== ClientUtility.MetadataDrivenDialogConstants.DialogOkId) {
                    return;
                }
                var quoteId = dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.QuoteId];
                var closeDate = new Date(dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.Date]);
                var closedState = Number(dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.ClosedState]);
                var reason = Number(dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.Reason]);
                var reasonDescription = dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.ReasonDescription];
                var canCloseOpportunity = Number(dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.CloseOpportunity]) === 1;
                var closeOpportunity = Number(dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.CloseOpportunity]) === 1;
                var useGivenRevenue = Number(dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.CalculateRevenueFromQuote]) !== 1;
                var description = null;
                if (!ClientUtility.DataUtil.isNullOrUndefined(dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.Description])) {
                    description = dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.Description];
                }
                if (!Xrm.Internal.isUci() && description == null) {
                    // Workaround because the web client is serializing requests with null values incorrectly.
                    // TODO: remove this condition once 707338 is fixed.
                    description = "";
                }
                var actualRevenue = useGivenRevenue ? dialogParams.parameters[Sales.MetadataDrivenDialogConstantsOrderCreate.ActualRevenue].toString() : '0';
                _this.commandBarActions.performActionAfterAcceptQuote(quoteId, reason, reasonDescription, closeDate, description, canCloseOpportunity && closeOpportunity, useGivenRevenue, actualRevenue.toString());
            };
            this.performActionAfterAcceptQuote = function (result, callbackParams) {
                var lastButtonClicked = result[Sales.MetadataDrivenDialogConstantsOrderCreate.LastButtonClicked];
                if (ClientUtility.DataUtil.isNullOrUndefined(lastButtonClicked) || lastButtonClicked.toString() !== ClientUtility.MetadataDrivenDialogConstants.DialogOkId) {
                    return;
                }
                if (!ClientUtility.DataUtil.isNullOrUndefined(result)) {
                    var closeOpportunity = false;
                    var useGivenRevenue = false;
                    var actualRevenue = '';
                    if (!ClientUtility.DataUtil.isNullOrUndefined(result['closeOpportunity']) && result['closeOpportunity']) {
                        closeOpportunity = true;
                        if (!ClientUtility.DataUtil.isNullOrUndefined(result['useGivenRevenue']) && result['useGivenRevenue']) {
                            useGivenRevenue = true;
                            actualRevenue = result['actualRevenue'];
                        }
                        else {
                            useGivenRevenue = false;
                            actualRevenue = '';
                        }
                    }
                    var quoteCloseDate = result[Sales.MetadataDrivenDialogConstantsOrderCreate.Date];
                    if (ClientUtility.DataUtil.isNullOrUndefined(quoteCloseDate)) {
                        var getActualDateRequest = new ODataContract.GetActualDateRequest(result[Sales.MetadataDrivenDialogConstantsOrderCreate.Date]);
                        Xrm.WebApi.online.execute(getActualDateRequest).then(function (responseCreateOrder) {
                            quoteCloseDate = new Date((responseCreateOrder).Result);
                            _this.commandBarActions.performActionAfterAcceptQuote(result['quoteId'], result['newStatus'], result['newStatusMsg'], quoteCloseDate, result['description'], closeOpportunity, useGivenRevenue, actualRevenue);
                        }, ClientUtility.ActionFailedHandler.actionFailedCallback);
                    }
                    else {
                        _this.commandBarActions.performActionAfterAcceptQuote(result['quoteId'], result['newStatus'], result['newStatusMsg'], quoteCloseDate, result['description'], closeOpportunity, useGivenRevenue, actualRevenue);
                    }
                }
            };
            /**
             * Activates the quote
             */
            this.activateQuote = function () {
                var progressIndicator = new ClientUtility.ProgressIndicator();
                progressIndicator.show();
                Xrm.Page.data.save().then(function () {
                    Xrm.WebApi.updateRecord(Sales.EntityNames.Quote, Xrm.Page.data.entity.getId(), {
                        statecode: Sales.QuoteState.Active,
                        statuscode: -1
                    }).then(function () {
                        Xrm.Page.data.refresh().then(function () {
                            Xrm.Page.ui.refreshRibbon();
                            progressIndicator.hide();
                            _this.commandBarActions.showToastMessageOnQuoteActions("Sales_Quote_Activated_ToastNotification");
                        });
                    }, function (error) { progressIndicator.hideOnError(ClientUtility.ActionFailedHandler.actionFailedCallback)(error); });
                }, function (error) { progressIndicator.hideOnError(ClientUtility.ActionFailedHandler.actionFailedCallback)(error); });
            };
            /**
             * Opens the get products dialog
             */
            this.getProductsForQuote = function () {
                _this.commandBarActions.getProducts();
            };
            /**
             * Returns true if the quote is active.
             * @returns boolean
             */
            this.isQuoteActive = function () {
                var stateCodeAttribute = Xrm.Page.data.entity.attributes.get('statecode');
                var stateCode;
                if (!stateCodeAttribute) {
                    if (!_this.hasStateCode) {
                        _this.retrieveStateCode(function () {
                            Xrm.Page.ui.refreshRibbon();
                        });
                        return false;
                    }
                    else {
                        stateCode = _this.stateCode;
                    }
                }
                else {
                    stateCode = stateCodeAttribute.getValue();
                }
                if (stateCode === Sales.QuoteState.Active) {
                    return true;
                }
                return false;
            };
            this.isQuoteActiveOrWon = function () {
                var stateCodeAttribute = Xrm.Page.data.entity.attributes.get('statecode');
                var stateCode;
                if (!stateCodeAttribute) {
                    if (!_this.hasStateCode) {
                        _this.retrieveStateCode(function () {
                            Xrm.Page.ui.refreshRibbon();
                        });
                        return false;
                    }
                    else {
                        stateCode = _this.stateCode;
                    }
                }
                else {
                    stateCode = stateCodeAttribute.getValue();
                }
                if (stateCode === Sales.QuoteState.Active || stateCode === Sales.QuoteState.Won) {
                    return true;
                }
                return false;
            };
            this.isQuoteActiveOrClosed = function () {
                var stateCodeAttribute = Xrm.Page.data.entity.attributes.get('statecode');
                var stateCode;
                if (!stateCodeAttribute) {
                    if (!_this.hasStateCode) {
                        _this.retrieveStateCode(function () {
                            Xrm.Page.ui.refreshRibbon();
                        });
                        return false;
                    }
                    else {
                        stateCode = _this.stateCode;
                    }
                }
                else {
                    stateCode = stateCodeAttribute.getValue();
                }
                if (stateCode === Sales.QuoteState.Active || stateCode === Sales.QuoteState.Closed) {
                    return true;
                }
                return false;
            };
            this.retrieveStateCode = function (callback) {
                if (_this.hasStateCode) {
                    callback(_this.stateCode);
                    return;
                }
                Xrm.WebApi.retrieveRecord(Xrm.Page.data.entity.getEntityName(), Xrm.Page.data.entity.getId(), ClientUtility.ODataUtil.getSelectOption(["statecode"])).then(function (entity) {
                    _this.hasStateCode = true;
                    _this.stateCode = entity['statecode'];
                    callback(_this.stateCode);
                }, ClientUtility.ActionFailedHandler.actionFailedCallback);
            };
            this.printQuote = function () {
                // This button should only show up in legacy web client
                if (ClientUtility.ClientUtil.isUCI() || ClientUtility.ClientUtil.isIOSDevice()) {
                    alert(Xrm.Internal.getResourceString('LOCID_UNSUPPORTED_RIBBONACTION'));
                    return;
                }
                try {
                    var oUrl = Mscrm.GlobalImported.CrmUri.create('/_grid/cmds/dlg_webmailmerge.aspx?mergetype=3&objectTypeCode=' + CrmEncodeDecode.CrmUrlEncode('1084') + '&objectId=' + CrmEncodeDecode.CrmUrlEncode(Xrm.Page.data.entity.getId()));
                    var oDlgOptions = new Xrm.DialogOptions();
                    oDlgOptions.height = 600;
                    oDlgOptions.width = 500;
                    Xrm.Internal.openDialog(oUrl.toString(), oDlgOptions, null, null, null);
                }
                catch (e) {
                    throw e;
                }
            };
            /**
            *
            * Quick close quote without dialog
            */
            this.quickCloseQuoteWithoutDialog = function (statusReason, createRevisedQuote, closeOpty) {
                var userPreferences = {};
                userPreferences = {
                    statusReason: statusReason,
                    createRevisedQuote: createRevisedQuote,
                    closeOpty: closeOpty
                };
                _this.closeQuote(true, false, userPreferences);
            };
            this.quickClose = function (statusReason, closeOpty, quoteId, opportunityId, canCloseOpportunity, createRevisedQuote) {
                var parameters = {};
                parameters = _this.buildDialogParameters(statusReason, closeOpty, quoteId, opportunityId, canCloseOpportunity, createRevisedQuote);
                _this.executeQuoteClose(parameters);
            };
            this.executeQuoteClose = function (parameters) {
                var opportunityId = null;
                var quoteId = parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.QuoteId];
                var closeDate = parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Date];
                //TODO: Removed the conditional 401942
                var reason = parseInt(parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Reason]) || Sales.CloseQuoteStatus.Revised;
                var createRevisedQuote = Number(parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.CreateRevisedQuote]) === 1;
                var canCloseOpportunity = Number(parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.CanCloseOpportunity]) === 1;
                var closeOpportunity = canCloseOpportunity && Number(parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.CloseOpportunity]) === 1;
                var description = null;
                if (!ClientUtility.DataUtil.isNullOrUndefined(parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Description])) {
                    description = parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Description].toString();
                }
                if (closeOpportunity &&
                    !ClientUtility.DataUtil.isNullOrUndefined(parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.OpportunityId]) &&
                    parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.OpportunityId].guid !== ClientUtility.Guid.Empty) {
                    opportunityId = parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.OpportunityId];
                }
                if (closeOpportunity) {
                    var isUCI = ClientUtility.ClientUtil.isUCI();
                    if (Sales.OpportunityRules.isOptyCloseCustomizationEnabledWithinQuoteClose(isUCI)) {
                        Sales.OpportunityRules.isValidforQuickCreateExperience(_this.closeQuoteCommandAction).then(function (isValid) {
                            if (isValid) {
                                var options = { entityName: Sales.EntityNames.OpportunityClose, useQuickCreateForm: true };
                                var formParameters = {};
                                var quoteDialogParameters = {};
                                formParameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.Won] = false;
                                formParameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.OpportunityId] = opportunityId;
                                quoteDialogParameters = {
                                    "dialogParameters": parameters,
                                    "quoteNumber": Xrm.Page.data.entity.attributes.get('quotenumber').getValue()
                                };
                                formParameters[Sales.MetadataDrivenDialogConstantsOpportunityClose.QuoteDialogResponse] = JSON.stringify(quoteDialogParameters);
                                Xrm.Navigation.openForm(options, formParameters).then(function (response) {
                                    if (response.savedEntityReference && response.savedEntityReference.length > 0 && !ClientUtility.DataUtil.isNullOrUndefined(response.savedEntityReference[0].id)) {
                                        Xrm.Page.data.refresh(true).then(function () {
                                            Xrm.Page.ui.refreshRibbon();
                                        });
                                    }
                                });
                            }
                            else {
                                _this.showOpportunityCloseDialog(opportunityId, quoteId, reason, closeDate, description, createRevisedQuote);
                            }
                        });
                    }
                    else {
                        _this.showOpportunityCloseDialog(opportunityId, quoteId, reason, closeDate, description, createRevisedQuote);
                    }
                }
                else {
                    _this.commandBarActions.closeQuoteAndOpportunity(reason, 0, 0, description, closeDate, null, null, createRevisedQuote, closeOpportunity);
                }
            };
        }
        Object.defineProperty(QuoteRibbonActionsLibrary.prototype, "commandBarActions", {
            get: function () {
                if (ClientUtility.DataUtil.isNullOrUndefined(this._commandBarActions)) {
                    this._commandBarActions = new Sales.SalesCommandBarActions();
                }
                return this._commandBarActions;
            },
            enumerable: true,
            configurable: true
        });
        QuoteRibbonActionsLibrary.prototype.buildDialogParameters = function (statusReason, closeOpty, quoteId, opportunityId, canCloseOpportunity, createRevisedQuote) {
            var parameters = {};
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.QuoteId] = quoteId;
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Date] = new Date();
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.CreateRevisedQuote] = createRevisedQuote;
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.Reason] = statusReason;
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.OpportunityId] = ClientUtility.DataUtil.isNullOrEmptyString(opportunityId) ? ClientUtility.Guid.Empty : ClientUtility.Guid.create(opportunityId);
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.CanCloseOpportunity] = canCloseOpportunity;
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.CloseOpportunity] = closeOpty;
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.ClosedState] = Sales.QuoteState.Closed;
            parameters[Sales.MetadataDrivenDialogConstantsQuoteClose.TimeZoneOffsetMinutes] = Xrm.Utility.getGlobalContext().userSettings.getTimeZoneOffsetMinutes();
            return parameters;
        };
        return QuoteRibbonActionsLibrary;
    }());
    Sales.QuoteRibbonActionsLibrary = QuoteRibbonActionsLibrary;
})(Sales || (Sales = {}));
/**
* @license Copyright (c) Microsoft Corporation. All rights reserved.
*/
/// <reference path="../../../../../TypeDefinitions/CRM/ClientUtility.d.ts" />
///<reference path="../../../ClientCommon/Sales_ClientCommon.d.ts" />
/// <reference path="UCI/QuoteRibbonActionsLibrary.ts" />
var Sales;
(function (Sales) {
    var QuoteRibbonActions = (function () {
        function QuoteRibbonActions() {
        }
        return QuoteRibbonActions;
    }());
    QuoteRibbonActions.Instance = new Sales.QuoteRibbonActionsLibrary();
    Sales.QuoteRibbonActions = QuoteRibbonActions;
})(Sales || (Sales = {}));
//# sourceMappingURL=QuoteRibbonActions.js.map