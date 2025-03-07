ReplyQuoteButton = function (formContext, reportType = "detailed") {
    var isDetailed = reportType == "detailed`" ? true : false;
    var confirmStrings = {

        title: "Reply with Quote",

        text: `This action will create a draft of an email with ${reportType} quote printout attached.

                Are you sure you want to continue?`,

    };
    var confirmOptions = { height: 300, width: 450 };
    Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
        async function (success) {
            if (success.confirmed)
                await CreatePrintoutEmail(formContext, isDetailed);
        });
}
ReplyQuoteEnableRule = async function (formContext) {
    if (formContext.getAttribute("regardingobjectid").getValue() !== null) {
        const stateCodeQuote = await Xrm.WebApi.retrieveRecord("quote", `${formContext.getAttribute("regardingobjectid").getValue()[0].id.slice(1, -1)}`, "?$select=statecode");
        if (stateCodeQuote.statecode === 1) {
            return true;
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
}
CreatePrintoutEmail = async function (formContext, isDetailed) {
    //getReport
    Xrm.Utility.showProgressIndicator("Generating printout...");
    var quoteId = formContext.getAttribute("regardingobjectid").getValue()[0].id.slice(1, -1);
    var reportName = isDetailed == true ? 'Analysis+Quote+Detail' : 'Analysis+Quote';
    var queryReportName = isDetailed == true ? 'Analysis Quote Detail' : 'Analysis Quote';
    var report = await Xrm.WebApi.retrieveMultipleRecords("report", `?$select=reportid,filename,name&$filter=name eq '${queryReportName}'`).then(
        function success(results) {
            return results.entities[0];
        },
        function (error) {
            console.log(error.message);
        }
    );
    var reportid = report["reportid"];
    var filename = report["filename"];

    var arrReportSession = executeReport(quoteId, reportid, reportName, formContext);

    var blobData = await convertResponseToPDF(arrReportSession); //3. Convert the response in base 64 string i.e. PDF.

    Xrm.Utility.showProgressIndicator("Creating email...");

    const quoteInfo = await Xrm.WebApi.retrieveRecord("quote", `${formContext.getAttribute("regardingobjectid").getValue()[0].id.slice(1, -1)}`, "?$select=quotenumber,revisionnumber");
    var brojPonude = quoteInfo.quotenumber;
    var revBroj = quoteInfo.revisionnumber;
    var puniBrojPonude = "";
    if (revBroj > 0) {
        puniBrojPonude = brojPonude + "/" + revBroj;
    } else {
        puniBrojPonude = brojPonude;
    }

    var emailId = await createEmail(quoteId, brojPonude, formContext);

    Xrm.Utility.showProgressIndicator("Creating attachment...");

    await attachFileToDraftEmail(blobData, emailId, `${brojPonude}.pdf`, "application/pdf"); //smisliti naming konvenciju za PDF

    Xrm.Utility.closeProgressIndicator();

    var pageInput = {
        pageType: "entityrecord",
        entityName: "email",
        entityId: emailId //replace with actual ID
    };
    var navigationOptions = {
        target: 2,
        height: { value: 80, unit: "%" },
        width: { value: 70, unit: "%" },
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
        `&iscustomreport=true&reportnameonsrs=&signatureid=&reporttypecode=1&reportName=${reportName}` +
        `&isScheduledReport=false&CRM_Filter=` +
        `<ReportFilter><ReportEntity+paramname="CRM_quote"+displayname="Quotes"+donotconvert="1">` +
        `<fetch+version="1.0"+output-format="xml-platform"+mapping="logical"+distinct="false">` +
        `<entity+name="quote"><all-attributes/><filter+type="and"><condition+attribute="quoteid"+operator="eq"+uitype="quote"+value="${quoteId}"/>` +
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
const createEmail = async function (quoteId, quoteNumber, formContext) {
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

    // Retrieve primary contact or account for the To & CC recipients
    const from = formContext.getAttribute("from").getValue();
    const to = formContext.getAttribute("to").getValue();
    const cc = formContext.getAttribute("cc").getValue();
    const bcc = formContext.getAttribute("bcc").getValue();

    console.log(from);
    console.log(to);
    console.log(cc);
    console.log(bcc);
    console.log(formContext.getAttribute("description").getValue());

    // Collect all parties
    if (from) {
        from.forEach(obj => {
            emailActivityParties.push({
                [`partyid_${obj.entityType}@odata.bind`]: `/${obj.entityType}s(${obj.id.slice(1, -1)})`,
                "participationtypemask": 2 // To recipient
            });
        });
    }
    if (cc) {
        cc.forEach(obj => {
            emailActivityParties.push({
                [`partyid_${obj.entityType}@odata.bind`]: `/${obj.entityType}s(${obj.id.slice(1, -1)})`,
                "participationtypemask": 3 // CC recipient
            });
        });
    }
    if (bcc) {
        bcc.forEach(obj => {
            emailActivityParties.push({
                [`partyid_${obj.entityType}@odata.bind`]: `/${obj.entityType}s(${obj.id.slice(1, -1)})`,
                "participationtypemask": 3 // BCC recipient
            });
        });
    }

    const emailInfo = await Xrm.WebApi.retrieveRecord("email", `${formContext.data.entity.getId().slice(1, -1)}`, "?$select=baseconversationindexhash,description");
    const fromInfo = await Xrm.WebApi.retrieveRecord(`${from[0].entityType}`, `${from[0].id.slice(1, -1)}`, `?$select=${from[0].entityType == 'systemuser' ? 'internalemailaddress' : 'emailaddress1'}`);
    const toInfo = await Xrm.WebApi.retrieveRecord(`${to[0].entityType}`, `${to[0].id.slice(1, -1)}`, `?$select=${to[0].entityType == 'systemuser' ? 'internalemailaddress' : 'emailaddress1'}`);
    const ccInfo = await Xrm.WebApi.retrieveRecord(`${cc[0].entityType}`, `${cc[0].id.slice(1, -1)}`, `?$select=${cc[0].entityType == 'systemuser' ? 'internalemailaddress' : 'emailaddress1'}`);
    // const bccInfo = await Xrm.WebApi.retrieveRecord(`${bcc[0].entityType}`, `${bcc[0].id.slice(1, -1)}`, `?$select=${bcc[0].entityType == 'systemuser' ? 'internalemailaddress' : 'emailaddress1'}`);
    const descriptionForReply = `
        <div style="direction:ltr"><br /><br /><br />
            <div dir="ltr" id="replyfwdmessage">
                <font face="Tahoma, Verdana, Arial" size="2">------------------- Original Message
                    -------------------<br><b>From:</b> ${from[0].name} &lt;${from[0].entityType == 'systemuser' ? fromInfo.internalemailaddress : fromInfo.emailaddress1}&gt;;
                    <br><b>Received:</b> Fri Dec 27 2024 12:25:05 GMT+0100 (Central European Standard Time)<br><b>To:</b>
                    ${to[0].name} &lt;${to[0].entityType == 'systemuser' ? toInfo.internalemailaddress : toInfo.emailaddress1}&gt;; <br><b>Cc:</b> ${cc[0].name}
                    &lt;${cc[0].entityType == 'systemuser' ? ccInfo.internalemailaddress : ccInfo.emailaddress1}&gt;; Snezana Vukadinovic &lt;snezana.vukadinovic@analysis.rs&gt;;
                    <br><b>Subject:</b> Zahtev za ponudu
                </font><br><br>
                ${emailInfo.description}
            </div>
        </div>
    `
    console.log(descriptionForReply);

    // Prepare the email record
    var record = {
        "regardingobjectid_quote_email@odata.bind": `/quotes(${quoteId})`, // Regarding field
        "subject": `PONUDA ${quoteNumber} - ACC NAME`, // Subject
        "description": `
            Poštovani,<br><br>

            u prilogu Vam dostavljamo našu prodajnu ponudu pripremljenu u skladu sa Vašim zahtevima.<br><br>

            <b>Detalji ponude uključuju:</b><br>
            - Opis proizvoda/usluga<br>
            - Količine i cene<br>
            - Rok isporuke<br>
            - Načini plaćanja<br><br>

            Ukoliko imate dodatna pitanja ili želite da razjasnimo bilo koji deo ponude, slobodno nas kontaktirajte.<br>
            Stojimo Vam na raspolaganju za dalje korake i saradnju.<br><br>

            Radujemo se Vašem odgovoru i nadamo se uspešnoj saradnji!<br><br>

        `,
        "email_activity_parties": emailActivityParties,
        "baseconversationindexhash": emailInfo.baseconversationindexhash
    };

    // Create the email record
    try {
        let newId = null;
        newId = await Xrm.WebApi.createRecord("email", record).then(async result => {

            const newEmailInfo = await Xrm.WebApi.retrieveRecord("email", `${result.id}`, "?$select=description");

            var record = {};
            record.description = newEmailInfo.description + descriptionForReply; // Multiline Text

            await Xrm.WebApi.updateRecord("email", `${result.id}`, record).then(
                function success(result) {
                    var updatedId = result.id;
                    console.log(updatedId);
                },
                function (error) {
                    console.log(error.message);
                }
            );
            console.log("Email created successfully with ID:", result.id);
            return result.id;
        });
        return newId;
    } catch (error) {
        console.error("Error creating email record: ", error.message);
        return null;
    }
};