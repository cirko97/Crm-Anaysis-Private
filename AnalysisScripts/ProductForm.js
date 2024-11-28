var ProductForm = window.ProductForm || {};
(function () {
    const FORM_NEW = 1;
    var formContext = null;

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();
        
        const disposalDate = formContext.getAttribute("extreme_disposaldate");

        const formType = formContext.ui.getFormType();
        if (formType === FORM_NEW) {

            setDefaults(formContext);
            
        }

    }

    setDefaults = async function (formContext) {
        var DefaultUomSchedule = await Xrm.WebApi.retrieveMultipleRecords("uomschedule", "?$select=name&$filter=name eq 'Default Unit'&$top=1").then(
	        function success(results) {
		        
                return results.entities[0];
		        //for (var i = 0; i < results.entities.length; i++) {
			    //    var result = results.entities[i];
			        // Columns
			    //    var uomscheduleid = result["uomscheduleid"]; // Guid
			    //    var name = result["name"]; // Text
		        //}
	        },
	        function(error) {
		        console.log(error.message);
	        }
        );

        var DefUomScheduleLookup = [{
            id: DefaultUomSchedule["uomscheduleid"],
            entityType: "uomschedule",
            name: DefaultUomSchedule["name"]
        }];

        formContext.getAttribute("defaultuomscheduleid").setValue(DefUomScheduleLookup);
        formContext.getAttribute("quantitydecimal").setValue(2);
        formContext.getControl("defaultuomid").setDisabled(false);
        formContext.getControl("defaultuomid").setRequiredLevel("required");
            
    }
    
}).call(ProductForm);

