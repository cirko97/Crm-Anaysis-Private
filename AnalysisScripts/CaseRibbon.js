var CaseRibbon = window.CaseRibbon || {};
(function () {
	this.SendPrintoutButton = function (formContext, reportType) {

		var isDetailed = reportType == "detailed" ? true : false;
		var confirmStrings = { text: `This action will create a draft of an email with ${reportType} case printout attached. \nAre you sure you want to continue?`, title: "Send Case Printout" };
		var confirmOptions = { height: 300, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
			async function (success) {
				if (success.confirmed)
					await CaseRibbon.CreatePrintoutEmail(formContext, isDetailed);
			});
	}
	this.SendPrintoutEnableRule = function (formContext) {
		var statuscode = formContext.getAttribute("statuscode").getValue();
		if (statuscode == 1 || statuscode == 934670002 || statuscode == 934670003) { //only if Scheduled, resolved and resolved & signed Case
			return false;
		}
		return true;
	}
	this.CreatePrintoutEmail = async function (formContext, isDetailed) {
		//getReport
		Xrm.Utility.showProgressIndicator("Generating printout...");
		var caseId = formContext.data.entity.getId().slice(1, -1);
		var reportName = isDetailed == true ? 'Analysis+Service+Detail' : 'Analysis+Service';
		var queryReportName = isDetailed == true ? 'Analysis Service Detail' : 'Analysis Service';
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

		var arrReportSession = executeReport(caseId, reportid, reportName, formContext);
		
		var blobData = await convertResponseToPDF(arrReportSession); //3. Convert the response in base 64 string i.e. PDF.

		Xrm.Utility.showProgressIndicator("Creating email...");

		var brojServisnogNaloga = formContext.getAttribute("extreme_casenumber").getValue();
		var emailId = await createCaseEmail(caseId, brojServisnogNaloga, formContext);

		Xrm.Utility.showProgressIndicator("Creating attachment...");

		await attachFileToDraftEmail(blobData, emailId, `${brojServisnogNaloga}.pdf`, "application/pdf"); //smisliti naming konvenciju za PDF
		
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
	this.CancelCaseEnableRule = function () {
		return isSysAdminRole() || isServiceManager();
	}
	this.CancelCaseButton = function (formContext) {
		const caseId = formContext.data.entity.getId().slice(1,-1);
		var confirmStrings = { text:"Are you sure you want to cancel this Case?", title:"Case Cancelation" };
		var confirmOptions = { height: 200, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
		async function (success) {    
			if (success.confirmed){
				var record = {};
				record.statecode = 1; // State
				record.statuscode = 934670003; // Status
				record.extreme_casecanceled = true;
				
				await Xrm.WebApi.updateRecord("extreme_case", caseId, record);
				formContext.data.refresh(true);
			}
			else{

			}	
		});
	}
	this.SetCaseOnHoldButton = function (formContext) {
		const caseId = formContext.data.entity.getId().slice(1,-1);
		const onHoldReason = formContext.getAttribute("extreme_onholdreason");

		if(onHoldReason.getValue() === null){
			formContext.getControl("extreme_onholdreason").setVisible(true);
			formContext.getControl("extreme_onholdreason").setNotification("Please enter a reason for HOLD status.", "FieldNotificationId");
			formContext.getControl("extreme_onholdreason").setFocus();
			formContext.ui.setFormNotification("Please enter a reason for HOLD status.", "WARNING", "FormNotificationId");
			return;
		}
		else {
			formContext.getControl("extreme_onholdreason").clearNotification("FieldNotificationId");
			formContext.ui.clearFormNotification("FormNotificationId");
		}

		var confirmStrings = { text:"Are you sure you want to put this case on HOLD?", title:"Case On Hold Prompt" };
		var confirmOptions = { height: 200, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
		async function (success) {    
			if (success.confirmed){
				var record = {};
				record.statecode = 0; // State
				record.statuscode = 934670002; // Status
				record.extreme_casewasonhold = true;
				
				await Xrm.WebApi.updateRecord("extreme_case", caseId, record);
				formContext.data.refresh(true);
			}
			else{

			}	
		});
	}
	this.ResumeCaseButton = function (formContext) {
		const caseId = formContext.data.entity.getId().slice(1,-1);
		var confirmStrings = { text:"Are you sure you want to put resume this case?", title:"Case Resume Prompt" };
		var confirmOptions = { height: 200, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
		async function (success) {    
			if (success.confirmed){
				if(formContext.getAttribute("extreme_serviceappointment").getValue() !== null){ //set as scheduled
					var record = {};
					record.statecode = 0; // State
					record.statuscode = 934670001; // Status
					record.extreme_onholdreason = null;
					
					await Xrm.WebApi.updateRecord("extreme_case", caseId, record);
					formContext.data.refresh(true);
				}
				else{//set as new status
					var record = {};
					record.statecode = 0; // State
					record.statuscode = 1; // Status
					record.extreme_onholdreason = null;

					await Xrm.WebApi.updateRecord("extreme_case", caseId, record);
					formContext.data.refresh(true);
				}
			}
		});
	}
	this.ResolveCaseButton = function (formContext) {
		const caseId = formContext.data.entity.getId().slice(1,-1);
		var confirmStrings = { text:"Are you sure you want to resolve this case?", title:"Case Resolution Prompt" };
		var confirmOptions = { height: 200, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
		async function (success) {    
			if (success.confirmed){
				if(formContext.getAttribute("extreme_signedprintout").getValue() == null){ //set as resolved
					Xrm.Utility.showProgressIndicator("Resolving Case...");
					var record = {};
					record.statecode = 0; // State
					record.statuscode = 934670004; // Status
					
					await Xrm.WebApi.updateRecord("extreme_case", caseId, record);
					Xrm.Utility.closeProgressIndicator();
					formContext.data.refresh(true);
				}
				else{//set as resolved & signed
					Xrm.Utility.showProgressIndicator("Resolving Case...");
					var record = {};
					record.statecode = 1; // State
					record.statuscode = 2; // Status
					
					await Xrm.WebApi.updateRecord("extreme_case", caseId, record);
					Xrm.Utility.closeProgressIndicator();
					formContext.data.refresh(true);
				}
			}	
		});	
	}
	this.ReactivateCaseButton = function (formContext) {
		const caseId = formContext.data.entity.getId().slice(1,-1);
		var confirmStrings = { text:"Are you sure you want to reactivate this case?", title:"Case Reactivation Prompt" };
		var confirmOptions = { height: 200, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
		async function (success) {    
			if (success.confirmed){
				//set as scheduled
					Xrm.Utility.showProgressIndicator("Reactivating Case...");
					var record = {};
					record.statecode = 0; // State
					record.statuscode = 934670001; // Status
					record.extreme_casereactivated = true;

					await Xrm.WebApi.updateRecord("extreme_case", caseId, record);
					Xrm.Utility.closeProgressIndicator();
					formContext.data.refresh(true);
			}	
		});	
	}
	this.ReactivateCaseEnableRule = function (formContext) {
		var statuscode = formContext.getAttribute("statuscode").getValue();
		return (isSysAdminRole() || isServiceManager()) && (statuscode == 934670004 || statuscode == 2);
	}

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
const executeReport = function (caseId, reportGuid, reportName, formContext) {

    var globalContext = Xrm.Utility.getGlobalContext();
    var pth = globalContext.getClientUrl() + "/CRMReports/rsviewer/reportviewer.aspx";
    //Prepare query to execute report.

    //Prepare request object to execute the report.

	var queryDecoded = `id={${reportGuid}}&uniquename=${globalContext.organizationSettings.uniqueName}` + 
	            `&iscustomreport=true&reportnameonsrs=&signatureid=&reporttypecode=1&reportName=${reportName}`+
				`&isScheduledReport=false&CRM_Filter=`+
				`<ReportFilter><ReportEntity+paramname="CRM_Filteredextreme_Case"+displayname="Cases"+donotconvert="1">`+
				`<fetch+version="1.0"+output-format="xml-platform"+mapping="logical"+distinct="false">`+
				`<entity+name="extreme_case"><all-attributes/><filter+type="and"><condition+attribute="extreme_caseid"+operator="eq"+uitype="extreme_case"+value="${caseId}"/>`+
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
const createCaseEmail = async function (caseId, caseNo, formContext) {
    var emailActivityParties = [];
	//
    // Retrieve current user details for the sender
    const userId = Xrm.Utility.getGlobalContext().userSettings.userId.slice(1, -1); // Remove curly braces
    const currentUserName = Xrm.Utility.getGlobalContext().userSettings.userName;

    // Add the sender (current user) to the email_activity_parties array
    emailActivityParties.push({
        "partyid_systemuser@odata.bind": `/systemusers(${userId})`,
        "participationtypemask": 1 // Sender
    });

    // Retrieve primary contact or account for the To recipient
    const contact = formContext.getAttribute("extreme_contact");
    const account = formContext.getAttribute("extreme_account");

    if (contact && contact.getValue() !== null) {
        const contactId = contact.getValue()[0].id;
        const contactName = contact.getValue()[0].name;

        let contactEmail = null;
        try {
            contactEmail = await Xrm.WebApi.retrieveRecord("contact", contactId, "?$select=emailaddress1")
                .then(result => result["emailaddress1"]);
        } catch (error) {
            console.error("Error fetching contact email: ", error.message);
        }

        if (contactEmail) {
            emailActivityParties.push({
                "partyid_contact@odata.bind": `/contacts(${contactId.slice(1,-1)})`,
                "participationtypemask": 2 // To recipient
            });
        }
    } else if (account && account.getValue() !== null) {
        const accountId = account.getValue()[0].id;
        const accountName = account.getValue()[0].name;

        let accountEmail = null;
        try {
            accountEmail = await Xrm.WebApi.retrieveRecord("account", accountId, "?$select=emailaddress1")
                .then(result => result["emailaddress1"]);
        } catch (error) {
            console.error("Error fetching account email: ", error.message);
        }

        if (accountEmail) {
            emailActivityParties.push({
                "partyid_account@odata.bind": `/accounts(${accountId.slice(1,-1)})`,
                "participationtypemask": 2 // To recipient
            });
        }
    }

    // Prepare the email record
    var record = {
        "regardingobjectid_extreme_case_email@odata.bind": `/extreme_cases(${caseId})`, // Regarding field
        "subject": `Servisni izveštaj ${caseNo} - ${account?.getValue()?.[0]?.name || ""}`, // Subject
        "description": `
            Poštovani,<br><br>

            U prilogu je servisni izveštaj. Molim Vas za potpis.<br><br>

            Srdačan pozdrav,<br>
            <b>${currentUserName}</b><br>
            Analysis d.o.o, Japanska 4, 11070 Beograd<br>
            +381 11 318 64 46 / info@analysis.rs<br>
            https://www.analysis.rs/
        `,
        "email_activity_parties": emailActivityParties
    };

    // Create the email record
    try {
        const newId = await Xrm.WebApi.createRecord("email", record).then(result => result.id);
        console.log("Email created successfully with ID:", newId);
        return newId;
    } catch (error) {
        console.error("Error creating email record: ", error.message);
        return null;
    }
};

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
const isSysAdminRole = function () {
	var flag = false;
	var userRoles = Xrm.Utility.getGlobalContext().userSettings;
	if (Object.keys(userRoles.roles._collection).length > 0) {
		for (var rolidcollection in userRoles.roles._collection) {
			var currentUserRoles = Xrm.Utility.getGlobalContext().userSettings.roles._collection[rolidcollection].name;
			if (currentUserRoles.toLowerCase() == "system administrator") {
				flag = true;
				break;
			}
		}
	}
	return flag;
}
const isServiceManager = function () {
	var flag = false;
	var userRoles = Xrm.Utility.getGlobalContext().userSettings;
	if (Object.keys(userRoles.roles._collection).length > 0) {
		for (var rolidcollection in userRoles.roles._collection) {
			var currentUserRoles = Xrm.Utility.getGlobalContext().userSettings.roles._collection[rolidcollection].name;
			if (currentUserRoles.toLowerCase() == "analysis - customer service manager") {
				flag = true;
				break;
			}
		}
	}
	return flag;
}
const getRole = function (roleName) {
	var userRoles = Xrm.Utility.getGlobalContext().userSettings.roles;
	var hasRole = false;

	userRoles.forEach(function (role) {
		if (role.name.toLowerCase() === roleName.toLowerCase()) {
			hasRole = true;
		}
	});

	return hasRole;
}