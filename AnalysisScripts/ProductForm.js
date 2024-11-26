var ProductForm = window.ProductForm || {};
(function () {
    const FORM_NEW = 1;
    var formContext = null;

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();
        
        const disposalDate = formContext.getAttribute("extreme_disposaldate");

        const formType = formContext.ui.getFormType();
        if (formType === FORM_NEW) {

            lockOrUnlockFieldsInSection("General", "Operator_Information", true);
            lockOrUnlockFieldsInSection("General", "Calculations", true);
            lockOrUnlockFieldsInSection("General", "AdditionalInfo", true);

            setRequiredLevelInSection("General", "Operator_Information", "none");
            setRequiredLevelInSection("General", "Calculations", "none");
            setRequiredLevelInSection("General", "AdditionalInfo", "none");
            
            

            disposalDate.addOnChange(initialSave);
            locationName.addOnChange(initialSave);
            OrgDepartment.addOnChange(initialSave);
            indexNo.addOnChange(initialSave);
            indexNo.addOnChange(FilterContracts);
            contractNo.addOnChange(initialSave);
        }

        function initialSave(){
            if (disposalDate.getValue() !== null && locationName.getValue() !== null && OrgDepartment.getValue() !== null && indexNo.getValue() !== null && contractNo.getValue() !== null){
                formContext.data.refresh(true);
                
                lockOrUnlockFieldsInSection("General", "Operator_Information", false);
                lockOrUnlockFieldsInSection("General", "Calculations", false);
                lockOrUnlockFieldsInSection("General", "AdditionalInfo", false);
            }
        }

    }

    function FilterContracts () {
        if(formContext.getAttribute("extreme_indexno").getValue() !== null){
            const indexNoId = formContext.getAttribute("extreme_indexno").getValue()[0].id;

            var viewId = "628bdfc3-06b9-4366-9bc2-a60cfccd5518";
            var entityName = "extreme_contract";
            var viewDisplayName = "Contract Lookup";
            var isDefault = true;
    
            var layoutXml = `<grid name="resultset" object="10504" jump="extreme_name" select="1" icon="1" preview="1">
                                <row name="result" id="extreme_contractid">
                                <cell name="extreme_name" width="162" />
                                <cell name="extreme_operator" width="197" />
                                <cell name="extreme_expirationdate" width="245" />
                                </row>
                            </grid>`;
      
            var fetchXml = `<fetch>
                                <entity name="extreme_contract">
                                    <attribute name="extreme_name" />
                                    <attribute name="extreme_operator" />
                                    <attribute name="extreme_expirationdate" />
                                    <order attribute="extreme_expirationdate" />
                                        <link-entity name="extreme_indexnumberoncontract" from="extreme_contract" to="extreme_contractid" alias="indexnacontract">
                                        <filter>
                                            <condition attribute="extreme_indexnumber" operator="eq" value="${indexNoId}"  uitype="extreme_wastecatalog" />
                                        </filter>
                                        </link-entity>
                                </entity>
                            </fetch>`;
    
            formContext.getControl("extreme_contractno").addCustomView(viewId, entityName, viewDisplayName, fetchXml, layoutXml, isDefault)
        }
    }

    function lockOrUnlockFieldsInSection(tabName, sectionName, lock) {
        // Get the tab
        var tab = formContext.ui.tabs.get(tabName);
        if (tab) {
            // Get the section
            var section = tab.sections.get(sectionName);
            if (section) {
                // Get all controls in the section
                var controls = section.controls;
                controls.forEach(function (control) {
                    // Lock or unlock the field if it is an attribute control (excluding non-data fields like spacers)
                    if (control && control.getAttribute && control.getAttribute() !== null) {
                        control.setDisabled(lock);
                    }
                });
            } else {
                console.error("Section not found: " + sectionName);
            }
        } else {
            console.error("Tab not found: " + tabName);
        }
    }
    
    function setRequiredLevelInSection(tabName, sectionName, requiredLevel) {
    
            
          // Example usage: Call this function in the form OnLoad event or wherever needed
          // setRequiredLevelInSection("tab_general", "section_details", executionContext, "required"); // To set fields as required
          // setRequiredLevelInSection("tab_general", "section_details", executionContext, "none"); // To set fields as not required
        
        // Get the tab
        var tab = formContext.ui.tabs.get(tabName);
        if (tab) {
            // Get the section
            var section = tab.sections.get(sectionName);
            if (section) {
                // Get all controls in the section
                var controls = section.controls;
                controls.forEach(function (control) {
                    // Set required level if it is an attribute control (excluding non-data fields like spacers)
                    if (control && control.getAttribute && control.getAttribute() !== null) {
                        control.getAttribute().setRequiredLevel(requiredLevel);
                    }
                });
            } else {
                console.error("Section not found: " + sectionName);
            }
        } else {
            console.error("Tab not found: " + tabName);
        }
    }
    
}).call(ProductForm);

