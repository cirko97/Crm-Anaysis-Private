/* eslint-disable no-mixed-spaces-and-tabs */
var AccountForm = window.AccountForm || {};
(function () {
    const FORM_NEW = 1;
    const FORM_EDIT = 2;
    var formContext = null;

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();

        // eslint-disable-next-line no-undef
        //vscode change
        //vs change
        var countryCode = await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'countryCode'&$top=1").then(
	        function success(results) {
                return results.entities[0]["extreme_value"];
	        },
	        function(error) {
		        console.log(error.message);
	        }
        );

        const formType = formContext.ui.getFormType();
        if (formType === FORM_NEW) {

            await setDefaults(formContext);
            
        }else if (formType === FORM_EDIT && formContext.getAttribute("extreme_tax").getValue() == null){
            await setDefaults(formContext);
        }

        formContext.getAttribute("extreme_vatnumber").addOnChange(validateVAT);

        const validateVAT = async function () {
            
            if(formContext.getAttribute("extreme_vatnumber").getValue() !== null) {
                var vatNumber = formContext.getAttribute("extreme_vatnumber").getValue();
            
                switch (countryCode.toUpperCase()) {
                    case 'HR':
                         if(validateCroatiaVAT(vatNumber)){
                            formContext.getControl("extreme_vatnumber").clearNotification("VatValidation");
                            break;
                         }else{
                            formContext.getControl("extreme_vatnumber").setNotification("OIB (VAT number) must contain exactly 11 digits.", "VatValidation");
                            formContext.data.entity.attributes.getByName("extreme_vatnumber").setSubmitMode("always");
                            break;
                         }
                    case 'SI':
                        if(validateSloveniaVAT(vatNumber)){
                            formContext.getControl("extreme_vatnumber").clearNotification("VatValidation");
                            break;
                         }else{
                            formContext.getControl("extreme_vatnumber").setNotification("VAT number must contain exactly 8 digits.", "VatValidation");
                            formContext.data.entity.attributes.getByName("extreme_vatnumber").setSubmitMode("always");
                            break;
                         }
                    case 'RS':
                        if(validateSerbiaVAT(vatNumber)){
                            formContext.getControl("extreme_vatnumber").clearNotification("VatValidation");
                            break;
                         }else{
                            formContext.getControl("extreme_vatnumber").setNotification("PIB (VAT number) must contain exactly 9 digits.", "VatValidation");
                            formContext.data.entity.attributes.getByName("extreme_vatnumber").setSubmitMode("always");
                            break;
                         }
                    case 'MK':
                        if(validateMacedoniaVAT(vatNumber)){
                            formContext.getControl("extreme_vatnumber").clearNotification("VatValidation");
                            break;
                         }else{
                            formContext.getControl("extreme_vatnumber").setNotification("VAT number must contain exactly 13 digits.", "VatValidation");
                            formContext.data.entity.attributes.getByName("extreme_vatnumber").setSubmitMode("always");
                            break;
                         }
                    default:
                        return false;
                }
            }
            
        }
    }

    const setDefaults = async function (formContext) {
        // eslint-disable-next-line no-undef
        var defaultTax = await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'defaultTax'&$top=1").then(
	        function success(results) {
                return results.entities[0]["extreme_value"];
	        },
	        function(error) {
		        console.log(error.message);
	        }
        );

        formContext.getAttribute("extreme_tax").setValue(parseInt(defaultTax));            
    }




    
    const validateSloveniaVAT = function (vat) {
        vat = vat.replace(/\D/g, '');

        if (vat.length !== 8) return false;

        let total = 0;
        let multipliers = [8, 7, 6, 5, 4, 3, 2];

        for (let i = 0; i < 7; i++) {
            total += parseInt(vat.charAt(i), 10) * multipliers[i];
        }

        let modulus = 11 - (total % 11);
        if (modulus === 10) modulus = 0;
        else if (modulus === 11) modulus = 1;

        return modulus === parseInt(vat.charAt(7), 10);
    }

    const validateSerbiaVAT = function (vat) {
        vat = vat.replace(/\D/g, '');

        if (vat.length !== 9) return false;

        let sum = 10;
        for (let i = 0; i < 8; i++) {
            sum = (sum + parseInt(vat.charAt(i), 10)) % 10;
            if (sum === 0) sum = 10;
            sum = (sum * 2) % 11;
        }
        let checkDigit = (11 - sum) % 10;
        return checkDigit === parseInt(vat.charAt(8), 10);
    }

    const validateCroatiaVAT = function (vat) {
        // Uklonite sve ne-cifrene karaktere
        vat = vat.replace(/\D/g, '');

        if (vat.length !== 11) return false;

        let b = 10;
        for (let i = 0; i < 10; i++) {
            b = (parseInt(vat.charAt(i), 10) + b) % 10;
            if (b === 0) b = 10;
            b = (b * 2) % 11;
        }
        let control = (11 - b) % 10;
        return control === parseInt(vat.charAt(10), 10);
    }

    const validateMacedoniaVAT = function (vat) {
        vat = vat.replace(/\D/g, '');

        // Pretpostavka da VAT broj ima 8 cifara
        return vat.length === 8;
    }

}).call(AccountForm);

