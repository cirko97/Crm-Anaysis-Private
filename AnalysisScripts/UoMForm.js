var UoMForm = window.UoMForm || {};
(function () {
    const FORM_NEW = 1;
    var formContext = null;

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();

        const formType = formContext.ui.getFormType();
        if (formType === FORM_NEW) {

            setDefaults(formContext);

        }

        formContext.getAttribute("extreme_synchronized").addOnChange(lockName);
        lockName();
        
        function lockName() {
            if (formContext.getAttribute("extreme_synchronized").getValue()) {
                formContext.getControl("name").setDisabled(true);
                formContext.getControl("quantity").setDisabled(true);
                formContext.getControl("baseuom").setDisabled(true);
            }
        }
    }
    
    setDefaults = async function (formContext) {
        var PrimaryUnit = await Xrm.WebApi.retrieveMultipleRecords("uom", "?$select=name&$filter=name eq 'Primary Unit'&$top=1").then(
	        function success(results) {
                return results.entities[0];

	        },
	        function(error) {
		        console.log(error.message);
	        }
        );

        var PrimaryUnitLookup = [{
            id: PrimaryUnit["uomid"],
            entityType: "uom",
            name: PrimaryUnit["name"]
        }];

        formContext.getAttribute("baseuom").setValue(PrimaryUnitLookup);

        var DefaultUomSchedule = await Xrm.WebApi.retrieveMultipleRecords("uomschedule", "?$select=name&$filter=name eq 'Default Unit'&$top=1").then(
	        function success(results) {
                return results.entities[0];
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
        
        formContext.getAttribute("uomscheduleid").setValue(DefUomScheduleLookup);
        formContext.getAttribute("quantity").setValue(1);

    }
}).call(UoMForm);

