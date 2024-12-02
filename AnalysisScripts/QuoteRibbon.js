var QuoteRibbon = window.QuoteRibbon || {};
(function () {
	this.SyncQuoteButton = function (formContext) {

		var confirmStrings = { text: "This action will synchronize this Quote to Pantheon. \nAre you sure you want to continue?", title: "Pantheon Synchronization" };
		var confirmOptions = { height: 300, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
			async function (success) {
				if (success.confirmed)
					await QuoteRibbon.CheckAndSyncQuote(formContext);
			});
	}

	this.CheckAndSyncQuote = async function (formContext) {
		var quoteId = formContext.data.entity.getId().slice(1, -1);
		// Checks
		Xrm.Utility.showProgressIndicator(
			'Synchronizing Data... Please Wait.');
		//isAccountSynced
		var accountId = formContext.getAttribute("customerid").getValue()[0].id.slice(1, -1);
		if (!isAccountSynced(accountId)) {
			Xrm.Utility.showProgressIndicator(
				'Account Sync In Progress... Please Wait.');
			await syncAccount(accountId);
			Xrm.Utility.showProgressIndicator(
				'Account Synchronized....... Please Wait.');
		}
		//isCostDriveNeededAndSynced
		if (isCostDriveNeeded) {
			if (formContext.getAttribute("opportunityid").getValue() !== null) {
				var oppId = formContext.getAttribute("opportunityid").getValue()[0].id
				Xrm.Utility.showProgressIndicator(
					'Cost/Profit Code Sync In Progress... Please Wait.');
				await syncCostDrive(oppId);
				Xrm.Utility.showProgressIndicator(
					'Cost/Profit Code Synchronized....... Please Wait.');
			}
		}
		//areAllProductsCreatedAndSynced
		await areAllProductsCreatedAndSynced(quoteId);
		//QuoteSync
		await syncQuote(quoteId);
		Xrm.Utility.showProgressIndicator(
			'Quote Synchronized!');
		setTimeout(() => {
			Xrm.Utility.closeProgressIndicator('Success!');
		}, "3000");
	}
	this.SyncQuoteButtonEnableRule = function (formContext) {
		var statecode = formContext.getAttribute("statecode").getValue();
		if (statecode == 1) { //only if Active Quote
			return true;
		}
		return false;
	}

}).call(QuoteRibbon);


const isAccountSynced = async function (accountId) {
	var isAccountSynced = null;
	isAccountSynced = await Xrm.WebApi.retrieveRecord("account", accountId, "?$select=extreme_synchronized").then(
		async function success(result) {
			console.log(result);
			// Columns
			var accountid = result["accountid"]; // Guid
			var extreme_synchronized = result["extreme_synchronized"]; // Boolean
			var extreme_synchronized_formatted = result["extreme_synchronized@OData.Community.Display.V1.FormattedValue"];
			return extreme_synchronized;
		},
		function (error) {
			console.log(error.message);
		}
	);
	return isAccountSynced;
}
const syncAccount = async function (accountId) {
	// DDBFFDDD-0328-4F96-8A3C-E9235550F347  -  Account SYNC Insert Workflow
	var workflowId = 'DDBFFDDD-0328-4F96-8A3C-E9235550F347';
	var executeWorkflowRequest = {
		entity: { entityType: "workflow", id: `${workflowId}` },
		EntityId: { guid: `${accountId}` },

		getMetadata: function () {
			return {
				boundParameter: "entity",
				parameterTypes: {
					entity: { typeName: "mscrm.workflow", structuralProperty: 5 },
					EntityId: { typeName: "Edm.Guid", structuralProperty: 1 }
				},
				operationType: 0, operationName: "ExecuteWorkflow"
			};
		}
	};
	Xrm.WebApi.execute(executeWorkflowRequest).then(
		function success(response) {
			if (response.ok) { /*return response.json(); */ }
		}
	).then(function (responseBody) {
		var result = responseBody;
		console.log(result);
	}).catch(function (error) {
		console.log(error.message);
	});
}
const isCostDriveNeeded = async function (formContext) {
	var isNeeded = false;
	var totalAmount = formContext.getAttribute("totalamount").getValue();
	var currency = formContext.getAttribute("transactioncurrencyid").getValue()[0].name;
	switch (currency) {
		case "EUR":
			if (totalAmount >= 10000) {
				isNeeded = true;
				break;
			}
		case "USD":
			if (totalAmount >= 10500) {
				isNeeded = true;
				break;
			};
		case "RSD":
			if (totalAmount >= 1200000) {
				isNeeded = true;
				break;
			};
		case "GBP":
			if (totalAmount >= 8300) {
				isNeeded = true;
				break;
			};
		case "CHF":
			if (totalAmount >= 9300) {
				isNeeded = true;
				break;
			};
		case "MKD":
			if (totalAmount >= 615000) {
				isNeeded = true;
				break;
			};
	}
	return isNeeded;
}
const syncCostDrive = async function (oppId) {
	// 1516f4be-01b0-ef11-b8e8-6045bd898d29  -  CostDrive SYNC Insert Workflow
	var workflowId = '1516f4be-01b0-ef11-b8e8-6045bd898d29';
	var executeWorkflowRequest = {
		entity: { entityType: "workflow", id: `${workflowId}` },
		EntityId: { guid: `${oppId}` },

		getMetadata: function () {
			return {
				boundParameter: "entity",
				parameterTypes: {
					entity: { typeName: "mscrm.workflow", structuralProperty: 5 },
					EntityId: { typeName: "Edm.Guid", structuralProperty: 1 }
				},
				operationType: 0, operationName: "ExecuteWorkflow"
			};
		}
	};
	Xrm.WebApi.execute(executeWorkflowRequest).then(
		function success(response) {
			if (response.ok) { /*return response.json(); */ }
		}
	).then(function (responseBody) {
		var result = responseBody;
		console.log(result);
	}).catch(function (error) {
		console.log(error.message);
	});
}
const areAllProductsCreatedAndSynced = async function (quoteId) {
	Xrm.Utility.showProgressIndicator(
		'Products Check In Progress... Please Wait.');
	await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=_productid_value&$filter=_quoteid_value eq ${quoteId}`).then(
		async function success(results) {
			console.log(results);
			for (var i = 0; i < results.entities.length; i++) {
				var result = results.entities[i];
				// Columns
				var quotedetailid = result["quotedetailid"]; // Guid
				var productid = result["_productid_value"]; // Lookup
				var productid_formatted = result["_productid_value@OData.Community.Display.V1.FormattedValue"];
				var productid_lookuplogicalname = result["_productid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

				if (productid == null) {
					//Create And Sync Product
					Xrm.Utility.showProgressIndicator(
						'Products Creation In Progress... Please Wait.');

					await createProduct(quoteId);

					Xrm.Utility.showProgressIndicator(
						'Products Sync In Progress... Please Wait.');

					await syncProduct(newProductId);

					await updateQuoteLine(newProductId, quotedetailid);
					//Update QuoteLine
				} else {
					await Xrm.WebApi.retrieveRecord("product", `${productid}`, "?$select=productid,extreme_synchronized").then(
						async function success(result) {
							console.log(result);
							// Columns
							var productid = result["productid"]; // Guid
							var extreme_synchronized = result["extreme_synchronized"]; // Boolean
							var extreme_synchronized_formatted = result["extreme_synchronized@OData.Community.Display.V1.FormattedValue"];
							if (!extreme_synchronized) {
								//Sync Product
								Xrm.Utility.showProgressIndicator(
									'Products Sync In Progress... Please Wait.');

								await syncProduct(productid);
							}
						},
						function (error) {
							console.log(error.message);
						}
					);
				}

			}
		},
		function (error) {
			console.log(error.message);
		}
	);
}
const syncProduct = async function (productId) {
	// GUID  -  SYNC Product Workflow
	var workflowId = 'GUID';
	var executeWorkflowRequest = {
		entity: { entityType: "workflow", id: `${workflowId}` },
		EntityId: { guid: `${productId}` },

		getMetadata: function () {
			return {
				boundParameter: "entity",
				parameterTypes: {
					entity: { typeName: "mscrm.workflow", structuralProperty: 5 },
					EntityId: { typeName: "Edm.Guid", structuralProperty: 1 }
				},
				operationType: 0, operationName: "ExecuteWorkflow"
			};
		}
	};
	Xrm.WebApi.execute(executeWorkflowRequest).then(
		function success(response) {
			if (response.ok) { /*return response.json(); */ }
		}
	).then(function (responseBody) {
		var result = responseBody;
		formContext.data.refresh(true);

		//console.log(result);
	}).catch(function (error) {
		console.log(error.message);
	});
}
const updateQuoteLine = async function (productId, quoteDetailId) {
	var record = {};
	record["productid@odata.bind"] = `/products(${productId})`; // Lookup

	await Xrm.WebApi.updateRecord("quotedetail", `${quoteDetailId}`, record).then(
		function success(result) {
			var updatedId = result.id;
			console.log(updatedId);
		},
		function (error) {
			console.log(error.message);
		}
	);
}
const syncQuote = async function (quoteId) {
	Xrm.Utility.showProgressIndicator(
		'Synchronizing Quote... Please Wait.');
	// GUID  -  SYNC Quote Workflow
	var workflowId = 'GUID';
	var executeWorkflowRequest = {
		entity: { entityType: "workflow", id: `${workflowId}` },
		EntityId: { guid: `${quoteId}` },

		getMetadata: function () {
			return {
				boundParameter: "entity",
				parameterTypes: {
					entity: { typeName: "mscrm.workflow", structuralProperty: 5 },
					EntityId: { typeName: "Edm.Guid", structuralProperty: 1 }
				},
				operationType: 0, operationName: "ExecuteWorkflow"
			};
		}
	};
	Xrm.WebApi.execute(executeWorkflowRequest).then(
		function success(response) {
			if (response.ok) { /*return response.json(); */ }
		}
	).then(function (responseBody) {
		var result = responseBody;
		formContext.data.refresh(true);
		//console.log(result);
	}).catch(function (error) {
		console.log(error.message);
	});
}