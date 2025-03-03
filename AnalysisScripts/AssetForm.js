var AssetForm = window.AssetForm || {};
(function () {
    const FORM_NEW = 1;
    var formContext = null;

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();

        const formType = formContext.ui.getFormType();

        if (formType === FORM_NEW) {

        }  else {
              // Get Nav. Item
            var navItem = formContext.ui.navigation.items.get("navSPDocuments");
            // First set focus on Nav. Item to open related tab
            navItem.setFocus();
            // get Main tab (replace it with your tab name)
            var mainTab =  formContext.ui.tabs.get("general");
            // Then move to Main Tab
            mainTab.setFocus();
        }

        formContext.getAttribute("extreme_warrantystartdate").addOnChange(function () {
            var warrantyStartDate = formContext.getAttribute("extreme_warrantystartdate").getValue();
            if (warrantyStartDate) {
            var warrantyEndDateVendor = formContext.getAttribute("extreme_warrantyenddatevendor").getValue();
            var warrantyEndDate = formContext.getAttribute("extreme_warrantyend").getValue();

            if (!warrantyEndDateVendor) {
                var newEndDateVendor = new Date(warrantyStartDate);
                newEndDateVendor.setFullYear(newEndDateVendor.getFullYear() + 1);
                formContext.getAttribute("extreme_warrantyenddatevendor").setValue(newEndDateVendor);
            }

            if (!warrantyEndDate) {
                var newEndDate = new Date(warrantyStartDate);
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                formContext.getAttribute("extreme_warrantyend").setValue(newEndDate);
            }
            }
        });


    }

    // setDefaults = async function (formContext) {
    //     var DefaultUomSchedule = await Xrm.WebApi.retrieveMultipleRecords("uomschedule", "?$select=name&$filter=name eq 'Default Unit'&$top=1").then(
	//         function success(results) {
		        
    //             return results.entities[0];
	// 	        //for (var i = 0; i < results.entities.length; i++) {
	// 		    //    var result = results.entities[i];
	// 		        // Columns
	// 		    //    var uomscheduleid = result["uomscheduleid"]; // Guid
	// 		    //    var name = result["name"]; // Text
	// 	        //}
	//         },
	//         function(error) {
	// 	        console.log(error.message);
	//         }
    //     );

    //     var DefUomScheduleLookup = [{
    //         id: DefaultUomSchedule["uomscheduleid"],
    //         entityType: "uomschedule",
    //         name: DefaultUomSchedule["name"]
    //     }];

    //     formContext.getAttribute("defaultuomscheduleid").setValue(DefUomScheduleLookup);
    //     formContext.getAttribute("quantitydecimal").setValue(2);
    //     formContext.getControl("defaultuomid").setDisabled(false);
    //     formContext.getControl("defaultuomid").setRequiredLevel("required");
            
    // }
    
}).call(AssetForm);

