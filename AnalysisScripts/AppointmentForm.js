var AppointmentForm = window.AppointmentForm || {};
(function () {
    const FORM_NEW = 1;
    var formContext = null;

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();

        const formType = formContext.ui.getFormType();

        if (formType === FORM_NEW) {

            if(formContext.getAttribute("regardingobjectid").getValue() != null) {
                var regardingCase = formContext.getAttribute("regardingobjectid").getValue();
                var caseId = regardingCase[0].id;
                var caseName = regardingCase[0].name;
                var caseType = regardingCase[0].entityType;
                console.log("regardingCase: " + caseId + " " + caseName + " " + caseType);

                var caseObj = await Xrm.WebApi.retrieveRecord("extreme_case", caseId, "?$select=extreme_description,_extreme_account_value,extreme_casenumber,extreme_name").then(
                    function success(result) {
                        return result;
                        console.log(result);
                        // Columns
                        var extreme_caseid = result["extreme_caseid"]; // Guid
                        var extreme_account = result["_extreme_account_value"]; // Lookup
                        var extreme_account_formatted = result["_extreme_account_value@OData.Community.Display.V1.FormattedValue"];
                        var extreme_account_lookuplogicalname = result["_extreme_account_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        var extreme_casenumber = result["extreme_casenumber"]; // Text
                        var extreme_name = result["extreme_name"]; // Text
                    },
                    function(error) {
                        console.log(error.message);
                    }
                );

                formContext.getAttribute("subject").setValue(caseObj.extreme_casenumber + " - " + caseObj["_extreme_account_value@OData.Community.Display.V1.FormattedValue"] 
                    + ": " + caseObj.extreme_name);
                formContext.getAttribute("description").setValue(caseObj.extreme_description);

            }

        } else {

        }
        
    }
        

    function setScheduledDates(formContext) {
        // Set scheduled start to the current time
        var currentDate = new Date();
        formContext.getAttribute("scheduledstart").setValue(currentDate);
    
        // Add 60 minutes to the current time
        currentDate.setMinutes(currentDate.getMinutes() + 60);
        formContext.getAttribute("scheduledend").setValue(currentDate);
    }
    
    
}).call(AppointmentForm);

