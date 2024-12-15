var CaseRibbon = window.CaseRibbon || {};
(function () {
	this.SendPrintoutButton = function (formContext, reportType) {

		var isDetailed = reportType == "detailed" ? true : false;
		var confirmStrings = { text: `This action will create a draft of an email with ${reportType} quote printout attached. \nAre you sure you want to continue?`, title: "Send Quote Printout" };
		var confirmOptions = { height: 300, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
			async function (success) {
				if (success.confirmed)
					await CaseRibbon.CreatePrintoutEmail(formContext, isDetailed);
			});
	}
	this.SendPrintoutEnableRule = function (formContext) {
		var statecode = formContext.getAttribute("statecode").getValue();
		if (statecode == 1) { //only if Active Quote
			return true;
		}
		return false;
	}
	this.CreatePrintoutEmail = async function (formContext, isDetailed) {
		//getReport
		Xrm.Utility.showProgressIndicator("Generating printout...");
		var quoteId = formContext.data.entity.getId().slice(1, -1);
		var reportName = isDetailed == true ? 'Analysis+Quote+Detail' : 'Analysis+Quote';
		var queryReportName = isDetailed == true ? 'Analysis Quote Detail' : 'Analysis Quote';
		var report = await Xrm.WebApi.retrieveMultipleRecords("report", `?$select=reportid,filename,name&$filter=name eq '${queryReportName}'`).then(
			function success(results) {
				return results.entities[0];
			},
			function(error) {
				console.log(error.message);
			}
		);
		var reportid = report["reportid"];
		var filename = report["filename"];

		var arrReportSession = executeReport(quoteId, reportid, reportName, formContext);
		
		var blobData = await convertResponseToPDF(arrReportSession); //3. Convert the response in base 64 string i.e. PDF.

		Xrm.Utility.showProgressIndicator("Creating email...");

		var emailId = await createEmail(quoteId);

		Xrm.Utility.showProgressIndicator("Creating attachment...");

		await attachFileToDraftEmail(blobData, emailId, "test.pdf", "application/pdf"); //smisliti naming konvenciju za PDF
		
		Xrm.Utility.closeProgressIndicator();

		var pageInput = {
			pageType: "entityrecord",
			entityName: "email",
			entityId: emailId //replace with actual ID
		};
		var navigationOptions = {
			target: 2,
			height: {value: 80, unit:"%"},
			width: {value: 70, unit:"%"},
			position: 1
		};
		Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
			function success() {
					// Run code on success
			},
			function error() {
					// Handle errors
			}
		);

	}

	
	// this.SyncQuoteButton = function (formContext) {

	// 	var confirmStrings = { text: "This action will synchronize this Quote to Pantheon. \nAre you sure you want to continue?", title: "Pantheon Synchronization" };
	// 	var confirmOptions = { height: 300, width: 450 };
	// 	Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
	// 		async function (success) {
	// 			if (success.confirmed)
	// 				await CaseRibbon.CheckAndSyncQuote(formContext);
	// 		});
	// }
	// this.CheckAndSyncQuote = async function (formContext) {
	// 	var quoteId = formContext.data.entity.getId().slice(1, -1);
	// 	// Checks
	// 	Xrm.Utility.showProgressIndicator(
	// 		'Synchronizing Data... Please Wait.');
	// 	//isAccountSynced
	// 	var accountId = formContext.getAttribute("customerid").getValue()[0].id.slice(1, -1);
	// 	if (await isAccountSynced(accountId) == false) {
	// 		Xrm.Utility.showProgressIndicator(
	// 			'Account Sync In Progress... Please Wait.');
	// 		await syncAccount(accountId);
	// 		Xrm.Utility.showProgressIndicator(
	// 			'Account Synchronized....... Please Wait.');
	// 	}
	// 	//isCostDriveNeededAndSynced
	// 	if (isCostDriveNeeded) {
	// 		if (formContext.getAttribute("opportunityid").getValue() !== null) {
	// 			var oppId = formContext.getAttribute("opportunityid").getValue()[0].id
	// 			Xrm.Utility.showProgressIndicator(
	// 				'Cost/Profit Code Sync In Progress... Please Wait.');
	// 			await syncCostDrive(oppId);
	// 			Xrm.Utility.showProgressIndicator(
	// 				'Cost/Profit Code Synchronized....... Please Wait.');
	// 		}
	// 	}
	// 	//areAllProductsCreatedAndSynced
	// 	await areAllProductsCreatedAndSynced(quoteId, formContext);
	// 	//QuoteSync
	// 	await syncQuote(quoteId, formContext);
	// 	Xrm.Utility.showProgressIndicator(
	// 		'Quote Synchronized!');
	// 	setTimeout(() => {
	// 		Xrm.Utility.closeProgressIndicator('Success!');
	// 	}, "1500");
	// }
	// this.SyncQuoteButtonEnableRule = function (formContext) {
	// 	var statecode = formContext.getAttribute("statecode").getValue();
	// 	if (statecode == 1) { //only if Active Quote
	// 		return true;
	// 	}
	// 	return false;
	// }
}).call(CaseRibbon);

const convertResponseToPDF = async function (arrResponseSession) {
    return new Promise((resolve, reject) => {
        // Extract the PdfDownloadUrl using a regular expression
        const pdfDownloadUrlRegex = /"PdfDownloadUrl"\s*:\s*"([^"]+)"/;
        const match = pdfDownloadUrlRegex.exec(arrResponseSession);

        if (match && match[1]) {
            const pdfDownloadUrl = match[1];
            console.log("Extracted PdfDownloadUrl:", pdfDownloadUrl);

            // Replace \u0026 with &
            const updatedPdfDownloadUrl = pdfDownloadUrl.replace(/\\u0026/g, "&");
            const globalContext = Xrm.Utility.getGlobalContext();
            const pth = globalContext.getClientUrl() + updatedPdfDownloadUrl;

            // Create request object that will be called to convert the response into a Base64 string
            const retrieveEntityReq = new XMLHttpRequest();

            retrieveEntityReq.open("GET", pth, true);
            retrieveEntityReq.setRequestHeader("Accept", "*/*");
            retrieveEntityReq.responseType = "arraybuffer";

            retrieveEntityReq.onreadystatechange = function () {
                if (retrieveEntityReq.readyState === 4) {
                    if (retrieveEntityReq.status === 200) {
                        try {
                            const bytes = new Uint8Array(retrieveEntityReq.response);
                            let binary = "";
                            for (let i = 0; i < bytes.byteLength; i++) {
                                binary += String.fromCharCode(bytes[i]);
                            }
                            const base64PDFString = btoa(binary); // Convert to Base64
                            console.log("Base64 PDF String Generated");
                            resolve(base64PDFString); // Resolve the promise with the Base64 string
                        } catch (error) {
                            console.error("Error converting response to Base64:", error);
                            reject(error);
                        }
                    } else {
                        reject(
                            new Error(
                                `Failed to retrieve PDF. Status: ${retrieveEntityReq.status}`
                            )
                        );
                    }
                }
            };

            retrieveEntityReq.onerror = function () {
                reject(new Error("Network error while fetching the PDF."));
            };

            retrieveEntityReq.send();
        } else {
            reject(new Error("PdfDownloadUrl not found."));
        }
    });
};
const executeReport = function (quoteId, reportGuid, reportName, formContext) {

    var globalContext = Xrm.Utility.getGlobalContext();
    var pth = globalContext.getClientUrl() + "/CRMReports/rsviewer/reportviewer.aspx";
    //Prepare query to execute report.

    //Prepare request object to execute the report.

	var queryDecoded = `id={${reportGuid}}&uniquename=${globalContext.organizationSettings.uniqueName}` + 
	            `&iscustomreport=true&reportnameonsrs=&signatureid=&reporttypecode=1&reportName=${reportName}`+
				`&isScheduledReport=false&CRM_Filter=`+
				`<ReportFilter><ReportEntity+paramname="CRM_quote"+displayname="Quotes"+donotconvert="1">`+
				`<fetch+version="1.0"+output-format="xml-platform"+mapping="logical"+distinct="false">`+
				`<entity+name="quote"><all-attributes/><filter+type="and"><condition+attribute="quoteid"+operator="eq"+uitype="quote"+value="${quoteId}"/>`+
				`</filter></entity></fetch></ReportEntity></ReportFilter>`

    var retrieveEntityReq = new XMLHttpRequest();

    retrieveEntityReq.open("POST", pth, false);

    retrieveEntityReq.setRequestHeader("Accept", "*/*");

    retrieveEntityReq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    //This statement runs the query and executes the report synchronously.

    retrieveEntityReq.send(queryDecoded);

	return retrieveEntityReq.responseText;

}
const attachFileToDraftEmail = async function (base64data, emailId, filename, mimetype) {
    return new Promise(async function (resolve, reject) {
        try {
			var record = {};
			record.subject = "att"; // Text
			record.objecttypecode = "email"; // EntityName
			record.mimetype = mimetype; // Text
			record.filename = filename; // Text
			record["objectid_activitypointer@odata.bind"] = `/activitypointers(${emailId})`; // Lookup
			record.body = base64data;

			var req = new XMLHttpRequest();
			req.open("POST", Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/activitymimeattachments", false);
			req.setRequestHeader("OData-MaxVersion", "4.0");
			req.setRequestHeader("OData-Version", "4.0");
			req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
			req.setRequestHeader("Accept", "application/json");
			req.setRequestHeader("Prefer", "odata.include-annotations=*");
			req.onreadystatechange = function () {
				if (this.readyState === 4) {
					req.onreadystatechange = null;
					if (this.status === 204) {
						var uri = req.getResponseHeader("OData-EntityId");
						var regExp = /\(([^)]+)\)/;
						var matches = regExp.exec(uri);
						var newId = matches[1];
						console.log(newId);
						resolve();
					} else {
						console.log(this.responseText);
					}
				}
			};
			req.send(JSON.stringify(record));
        } catch (error) {
            console.error("Error in attachment function:", error);
            reject(error);
        }
    });
};
const createEmail = async function (quoteId) {
	var record = {};
	record["regardingobjectid_quote_email@odata.bind"] = `/quotes(${quoteId})`; // Lookup
	record.subject = "PONUDA BATO"; // Text
	record.sender = "vladimir.djordjevic@extreme.rs"; // Text
	record.torecipients = "vladimir.djordjevic@extreme.rs"; // Text
	record.description = "NEKI TEKST"; // Multiline Text
	
	var newId = await Xrm.WebApi.createRecord("email", record).then(
		function success(result) {
			return result.id;
		},
		function(error) {
			console.log(error.message);
		}
	);

	return newId;

}

//Sync functions
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
	// DDBFFDDD-0328-4F96-8A3C-E9235550F347 - Account SYNC Insert Workflow
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
	await Xrm.WebApi.execute(executeWorkflowRequest).then(
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
		default:
			break;
	}
	return isNeeded;
}
const syncCostDrive = async function (oppId) {
	// 1516f4be-01b0-ef11-b8e8-6045bd898d29 - CostDrive SYNC Insert Workflow
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
	await Xrm.WebApi.execute(executeWorkflowRequest).then(
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
const areAllProductsCreatedAndSynced = async function (quoteId, formContext) {
	Xrm.Utility.showProgressIndicator(
		'Products Check In Progress... Please Wait.');

	var defaultuomscheduleid = await Xrm.WebApi.retrieveMultipleRecords("uomschedule", "?$filter=name eq 'Default Unit'").then(
		function success(results) {
			console.log(results);
			return results.entities[0]["uomscheduleid"];
		},
		function(error) {
			console.log(error.message);
		}
	);
	var primaryUnit = await Xrm.WebApi.retrieveMultipleRecords("uom", "?$filter=name eq 'Primary Unit'").then(
		function success(results) {
			console.log(results);
			return results.entities[0]["uomid"];
		},
		function(error) {
			console.log(error.message);
		}
	);
	// creates everything DESC isParent
	await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=_extreme_parentquoteline_value,_extreme_vatgroup_value,priceperunit,extreme_uomid,quotedetailname,_extreme_area_value,_productid_value,extreme_productdescription,extreme_customproductid,extreme_productid,productname,productnumber,_extreme_technology_value,_uomid_value,_extreme_vendorsupplier_value,productdescription&$filter=_quoteid_value eq ${quoteId}&$orderby=extreme_isparentitem desc`).then(
		async function success(results) {
			console.log(results);
			for (var i = 0; i < results.entities.length; i++) {
				var result = results.entities[i];
				// Columns
				var extreme_supplierpriceperunit = result["extreme_supplierpriceperunit"];
				var priceperunit = result["priceperunit"]; // Currency
				var quantity = result["quantity"];
				var quotedetailid = result["quotedetailid"]; // Guid
				var extreme_area = result["_extreme_area_value"]; // Lookup
				var extreme_area_formatted = result["_extreme_area_value@OData.Community.Display.V1.FormattedValue"];
				var extreme_area_lookuplogicalname = result["_extreme_area_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
				var productid = result["_productid_value"]; // Lookup
				var productid_formatted = result["_productid_value@OData.Community.Display.V1.FormattedValue"];
				var productid_lookuplogicalname = result["_productid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
				var extreme_productdescription = result["extreme_productdescription"]; // Multiline Text
				var extreme_customproductid = result["extreme_customproductid"]; // Text
				var extreme_productid = result["extreme_productid"]; // Text
				var quotedetailname = result["quotedetailname"]; // Text
				var productname = result["productname"]; // Text
				var productnumber = result["productnumber"]; // Text
				var extreme_uomid = result["extreme_uomid"]; // Text
				var extreme_technology = result["_extreme_technology_value"]; // Lookup
				var extreme_technology_formatted = result["_extreme_technology_value@OData.Community.Display.V1.FormattedValue"];
				var extreme_technology_lookuplogicalname = result["_extreme_technology_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
				var uomid = result["_uomid_value"]; // Lookup
				var uomid_formatted = result["_uomid_value@OData.Community.Display.V1.FormattedValue"];
				var uomid_lookuplogicalname = result["_uomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
				var extreme_vendorsupplier = result["_extreme_vendorsupplier_value"]; // Lookup
				var extreme_vendorsupplier_formatted = result["_extreme_vendorsupplier_value@OData.Community.Display.V1.FormattedValue"];
				var extreme_vendorsupplier_lookuplogicalname = result["_extreme_vendorsupplier_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
				var productdescription = result["productdescription"]; // Text
				var extreme_vatgroup = result["_extreme_vatgroup_value"]; // Lookup
				var extreme_vatgroup_formatted = result["_extreme_vatgroup_value@OData.Community.Display.V1.FormattedValue"];
				var extreme_vatgroup_lookuplogicalname = result["_extreme_vatgroup_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
				var extreme_parentquoteline = result["_extreme_parentquoteline_value"]; // Lookup
				var extreme_parentquoteline_formatted = result["_extreme_parentquoteline_value@OData.Community.Display.V1.FormattedValue"];
				var extreme_parentquoteline_lookuplogicalname = result["_extreme_parentquoteline_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
				var extreme_isparentitem = result["extreme_isparentitem"];
				var extreme_producttype = result["extreme_producttype"];
				if (productid == null) {
					//Create And Sync Product
					Xrm.Utility.showProgressIndicator(
						'Products Creation In Progress... Please Wait.');
					
					var record = {};
					//UOM Check
					var newUomId = null;
				    await Xrm.WebApi.retrieveMultipleRecords("uom", `?$filter=name eq '${extreme_uomid}'`).then(
						function success(results) {
							console.log(results);
							if(results.entities.length > 0)
								newUomId = results.entities[0]["uomid"];
						},
						function(error) {
							console.log(error.message);
						}
					);
					if (newUomId !== null){
						record["defaultuomid@odata.bind"] = `/uoms(${newUomId})`; // Lookup
					}else {
						var uomrecord = {};
							uomrecord["baseuom@odata.bind"] = `/uoms(${primaryUnit})`; // Lookup
							uomrecord["uomscheduleid@odata.bind"] = `/uomschedules(${defaultuomscheduleid})`; // Lookup
							uomrecord.name = extreme_uomid; // Text
							uomrecord.quantity = 1; // Decimal

						newUomId = await Xrm.WebApi.createRecord("uom", uomrecord).then(
							function success(result) {
								return result.id;
								console.log(newId);
							},
							function(error) {
								console.log(error.message);
							}
						);
						record["defaultuomid@odata.bind"] = `/uoms(${newUomId})`; // Lookup
					}
					
					record.productnumber = extreme_customproductid; // Text
					record.name = quotedetailname; // Text
					record.description = extreme_productdescription; // Multiline Text
					record.quantitydecimal = 2; // Whole Number
					record["defaultuomscheduleid@odata.bind"] = `/uomschedules(${defaultuomscheduleid})`; // Lookup
					// record["pricelevelid@odata.bind"] = `/pricelevels(${formContext.getAttribute("pricelevelid").getValue()[0].id.slice(1,-1)})`; // Lookup
					if(extreme_area !== null)
					record["extreme_Area@odata.bind"] = `/extreme_areas(${extreme_area})`; // Lookup
					if(extreme_technology !== null)
					record["extreme_Technology@odata.bind"] = `/extreme_technologies(${extreme_technology})`; // Lookup
					if(extreme_vendorsupplier !== null)
					record["extreme_Supplier@odata.bind"] = `/accounts(${extreme_vendorsupplier})`; // Lookup
					if(extreme_producttype !== null)
					record.producttypecode = extreme_producttype; // Choice   //1 products 3services
					if(extreme_vatgroup !== null)
					record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${extreme_vatgroup})`; 

					var newProductId = await Xrm.WebApi.createRecord("product", record).then(
						function success(result) {
							return result.id;
							console.log(newId);
						},
						function(error) {
							console.log(error.message);
						}
					);

					
					if (formContext.getAttribute("transactioncurrencyid").getValue() !== null) {
						var currencyName = formContext.getAttribute("transactioncurrencyid").getValue()[0].name;
						var defaultPriceListId = null;

						switch (currencyName) {
							case "EUR":
								defaultPriceListId = await readConfigurationValue("defaultEURPriceListId");
								break;
							case "USD":
								defaultPriceListId = await readConfigurationValue("defaultUSDPriceListId");
								break;
							case "RSD":
								defaultPriceListId = await readConfigurationValue("defaultRSDPriceListId");
								break;
							case "GBP":
								defaultPriceListId = await readConfigurationValue("defaultGBPPriceListId");
								break;
							case "CHF":
								defaultPriceListId = await readConfigurationValue("defaultCHFPriceListId");
								break;
							case "MKD":
								defaultPriceListId = await readConfigurationValue("defaultMKDPriceListId");
								break;
							default:
								break;
						}
					}  
					

					var PLIrecord = {};
						PLIrecord.amount = extreme_supplierpriceperunit; // Currency
						PLIrecord.pricingmethodcode = 1; // Choice
						PLIrecord["pricelevelid@odata.bind"] = `/pricelevels(${defaultPriceListId})`; // Lookup
						PLIrecord["productid@odata.bind"] = `/products(${newProductId})`; // Lookup
						PLIrecord.quantitysellingcode = 2; // Choice
						PLIrecord["uomid@odata.bind"] = `/uoms(${newUomId})`; // Lookup

					await Xrm.WebApi.createRecord("productpricelevel", PLIrecord).then(
							function success(result) {
								var newId = result.id;
								console.log(newId);
							},
							function(error) {
								console.log(error.message);
							}
						);

					await updateQuoteLine(newProductId, newUomId, defaultPriceListId, quotedetailid);
					//Update QuoteLine
				} else {
					await Xrm.WebApi.retrieveRecord("product", `${productid}`, "?$select=productid,extreme_synchronized").then(
						async function success(result) {
							console.log(result);
							// Columns
							var productid = result["productid"]; // Guid
							var extreme_synchronized = result["extreme_synchronized"]; // Boolean
							var extreme_synchronized_formatted = result["extreme_synchronized@OData.Community.Display.V1.FormattedValue"];
							
							if(extreme_parentquoteline !== null){
								var parentProductId = await Xrm.WebApi.retrieveRecord("quotedetail", extreme_parentquoteline, "?$select=_productid_value").then(
									function success(result) {
										console.log(result);
										// Columns
										return result["_productid_value"]; // Lookup
									},
									function(error) {
										console.log(error.message);
									}
								);
								var record = {};
								record["extreme_ParentProduct@odata.bind"] = `/products(${parentProductId})`; // Lookup

								await Xrm.WebApi.updateRecord("product", productid, record).then(
									function success(result) {
										var updatedId = result.id;
										console.log(updatedId);
									},
									function(error) {
										console.log(error.message);
									}
								);
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
	// syncs everything ASC isParent
	await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=productid&$filter=_quoteid_value eq ${quoteId}&$orderby=extreme_isparentitem asc`).then(
		async function success(results) {
			console.log(results);
			for (var i = 0; i < results.entities.length; i++) {
				var result = results.entities[i];
				// Columns
				var productid = result["_productid_value"]; // Lookup
	
				if (productid !== null) {
					Xrm.Utility.showProgressIndicator(
						'Products Sync In Progress... Please Wait.'); 

					await syncProduct(productid);
				} 
			}
		},
		function (error) {
			console.log(error.message);
		}
	);
}
const syncProduct = async function (productId) {
	// GUID - SYNC Product Workflow 
	var workflowId = 'A1A4C887-F9B0-EF11-B8E8-6045BD898D29';
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
	await Xrm.WebApi.execute(executeWorkflowRequest).then(
		function success(response) {
			if (response.ok) { /*return response.json(); */ }
		}
	).then(function (responseBody) {
		var result = responseBody;
		//console.log(result);
	}).catch(function (error) {
		console.log(error.message);
	});
}
const updateQuoteLine = async function (productId, uomid, pricelevelid, quoteDetailId) {
	var record = {};
	record["productid@odata.bind"] = `/products(${productId})`; // Lookup
	record["uomid@odata.bind"] = `/uoms(${uomid})`;
	record["extreme_pricelist@odata.bind"] = `pricelevels(${pricelevelid})`;
	await Xrm.WebApi.updateRecord("quotedetail", quoteDetailId, record).then(
		function success(result) {
			var updatedId = result.id;
			console.log(updatedId);
		},
		function (error) {
			console.log(error.message);
		}
	);
}
const syncQuote = async function (quoteId, formContext) {
	Xrm.Utility.showProgressIndicator(
		'Synchronizing Quote... Please Wait.');
	// GUID - SYNC Quote Workflow
	var workflowId = 'C96AADD9-BCB1-EF11-B8E9-000D3ABCCD41';
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


const readConfigurationValue = async function (key) {
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