var ProductForm = window.ProductForm || {};
(function () {
    const FORM_NEW = 1;
    var formContext = null;

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();

        const formType = formContext.ui.getFormType();
        const isParent = formContext.getAttribute("extreme_isparent");

        if (formType === FORM_NEW) {

            setDefaults(formContext);

        } else {
                // Get Nav. Item
                var navItem = formContext.ui.navigation.items.get("navSPDocuments");
                // First set focus on Nav. Item to open related tab
                navItem.setFocus();
                // get Main tab (replace it with your tab name)
                var mainTab =  formContext.ui.tabs.get("product_details");
                // Then move to Main Tab
                mainTab.setFocus();
        }

        if (isParent.getValue() !== null && isParent.getValue() === true){
            var tab = formContext.ui.tabs.get("product_details");
            var section = tab.sections.get("setProducts");
            section.setVisible(true);
        }
        
        formContext.getAttribute("extreme_synchronized").addOnChange(lockProductID);
        lockProductID();
        
        function lockProductID() {
            if (formContext.getAttribute("extreme_synchronized").getValue()) {
                formContext.getControl("productnumber").setDisabled(true);
            }
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

