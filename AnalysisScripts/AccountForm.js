/* eslint-disable no-mixed-spaces-and-tabs */
var AccountForm = window.AccountForm || {};
(function () {
    const FORM_NEW = 1;
    const FORM_EDIT = 2;
    var formContext = null;
    let previousVatCountryValue = null; // Globalna promenljiva za čuvanje prethodne vrednosti

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();
        
        const formType = formContext.ui.getFormType();
        if (formType === FORM_NEW) {
            await setDefaults(formContext);
        }
        else if(formType === FORM_EDIT){
            if(formContext.getAttribute("extreme_pantheonno").getValue() !== null){
                formContext.getControl("extreme_paname30characters").setDisabled(true);
            }
            // Get Nav. Item
            var navItem = formContext.ui.navigation.items.get("navSPDocuments");
            // First set focus on Nav. Item to open related tab
            if (navItem) {
                navItem.setFocus();
            } else {
                console.error("Navigation item 'navSPDocuments' not found.");
            }
            // get Main tab (replace it with your tab name)
            var mainTab =  formContext.ui.tabs.get("general");
            // Then move to Main Tab
            mainTab.setFocus();

        } else if (formType === FORM_EDIT && formContext.getAttribute("extreme_tax").getValue() == null) {
            await setDefaults(formContext);
            
        }

        previousVatCountryValue = formContext.getAttribute("extreme_vatcountry").getValue();

        formContext.getAttribute("extreme_vatnumber").addOnChange(validateVAT);
        formContext.getAttribute("extreme_vatcountry").addOnChange(resetVat);
        formContext.getAttribute("extreme_pantheonno").addOnChange(lockShortName);
        formContext.getAttribute("telephone1").addOnChange(() => formatPhoneNumber("telephone1"));
        formContext.getAttribute("telephone2").addOnChange(() => formatPhoneNumber("telephone2"));
        
        function lockShortName() {
            if(formContext.getAttribute("extreme_pantheonno").getValue() !== null){
                formContext.getControl("extreme_paname30characters").setDisabled(true);
            }
        }
        async function resetVat() {
            const currentVatCountryValue = formContext.getAttribute("extreme_vatcountry").getValue();

            // Proveri da li je promenjena vrednost
            if (currentVatCountryValue !== previousVatCountryValue && formContext.getAttribute("extreme_vatnumber").getValue() !== null) {
                var confirmStrings = { 
                    text: "Changing VAT country will reset the existing VAT No. field. Are you sure?", 
                    title: "VAT No. Reset!" 
                };
                var confirmOptions = { height: 200, width: 450 };
                
                await Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
                    function (success) {
                        if (success.confirmed) {
                            console.log("Dialog closed using OK button.");
                            // Resetuj VAT number jer je korisnik potvrdio
                            formContext.getAttribute("extreme_vatnumber").setValue(null);
                            // Ažuriraj prethodnu vrednost na novu
                            previousVatCountryValue = currentVatCountryValue;
                        } else {
                            console.log("Dialog closed using Cancel button or X.");
                            // Vrati prethodnu vrednost VAT country
                            formContext.getAttribute("extreme_vatcountry").setValue(previousVatCountryValue);
                        }
                    },
                    function (error) {
                        console.error("Error opening dialog:", error);
                        // U slučaju greške vrati prethodnu vrednost
                        formContext.getAttribute("extreme_vatcountry").setValue(previousVatCountryValue);
                    }
                );
            }
        }
        async function validateVAT() {
            if (formContext.getAttribute("extreme_vatnumber").getValue() !== null) {
                var countryCode = formContext.getAttribute("extreme_vatcountry").getValue();
                var vatNumber = formContext.getAttribute("extreme_vatnumber").getValue();
                var lengthValid = false;
                var logicValid = false;
                var errorMessage = "";

                switch (countryCode) {
                    case 934670002: //HR
                        lengthValid = vatNumber.length === 11;
                        logicValid = validateCroatiaVAT(vatNumber);
                        if (!lengthValid) {
                            errorMessage = "OIB (VAT number) must contain exactly 11 digits.";
                        } else if (!logicValid) {
                            errorMessage = "OIB (VAT number) is not valid.";
                        }
                        break;
                    case 934670001: //SI
                        lengthValid = vatNumber.length === 8;
                        logicValid = validateSloveniaVAT(vatNumber);
                        if (!lengthValid) {
                            errorMessage = "VAT number must contain exactly 8 digits.";
                        } else if (!logicValid) {
                            errorMessage = "VAT number is not valid.";
                        }
                        break;
                    case 934670000: //RS
                        lengthValid = vatNumber.length === 9;
                        logicValid = validateSerbiaVAT(vatNumber);
                        if (!lengthValid) {
                            errorMessage = "PIB (VAT number) must contain exactly 9 digits.";
                        } else if (!logicValid) {
                            errorMessage = "PIB (VAT number) is not valid.";
                        }
                        break;
                    case 934670003: //MK
                        lengthValid = vatNumber.length === 13;
                        logicValid = validateMacedoniaVAT(vatNumber);
                        if (!lengthValid) {
                            errorMessage = "VAT number must contain exactly 13 digits.";
                        } else if (!logicValid) {
                            errorMessage = "VAT number is not valid.";
                        }
                        break;
                    default:
                        return false;
                }
    
                if (!lengthValid || !logicValid) {
                    formContext.getControl("extreme_vatnumber").setNotification(errorMessage, "VatValidation");
                    formContext.data.entity.attributes.getByName("extreme_vatnumber").setSubmitMode("always");
                } else {
                    formContext.getControl("extreme_vatnumber").clearNotification("VatValidation");
                    formContext.data.entity.attributes.getByName("extreme_vatnumber").setSubmitMode("dirty");
                }
            }
        }
    };



    function formatPhoneNumber(fieldName) {
        var phoneNumber = formContext.getAttribute(fieldName);
        if (phoneNumber.getValue() != null) {
            var phoneNo = phoneNumber.getValue().replace(/[^0-9]/g, "");
            var formattedNumber = "";

            if (phoneNo.length < 6 || phoneNo.length > 15) {
                formContext.getControl(fieldName).setNotification("Phone number must be between 6 and 15 digits.", "PhoneValidation");
                return;
            } else {
                formContext.getControl(fieldName).clearNotification("PhoneValidation");
            }

            if (phoneNo.startsWith("381")) {
                formattedNumber = formatSerbianPhone(phoneNo);
            } else if (phoneNo.startsWith("386")) {
                formattedNumber = formatSlovenianPhone(phoneNo);
            } else if (phoneNo.startsWith("385")) {
                formattedNumber = formatCroatianPhone(phoneNo);
            } else {
                formattedNumber = formatInternationalPhone(phoneNo);
            }

            phoneNumber.setValue(formattedNumber);
        }
    }
    function formatSerbianPhone(phoneNo) {
        if (phoneNo.length === 9) {
            return "381 " + phoneNo.substr(3, 2) + " " + phoneNo.substr(5, 3) + " " + phoneNo.substr(8);
        } else if (phoneNo.length === 10 || phoneNo.length === 11 || phoneNo.length === 12 ) {
            return "381 " + phoneNo.substr(3, 2) + " " + phoneNo.substr(5, 3) + " " + phoneNo.substr(8);
        }
        return phoneNo;
    }

    function formatSlovenianPhone(phoneNo) {
        if (phoneNo.length === 9) {
            return "386 " + phoneNo.substr(3, 2) + " " + phoneNo.substr(5, 3) + " " + phoneNo.substr(8);
        }
        return phoneNo;
    }

    function formatCroatianPhone(phoneNo) {
        if (phoneNo.length === 9) {
            return "385 " + phoneNo.substr(3, 2) + " " + phoneNo.substr(5, 3) + " " + phoneNo.substr(8);
        }
        return phoneNo;
    }

    function formatInternationalPhone(phoneNo) {
        return /*"+" +*/ phoneNo;
    }
    const setDefaults = async function (formContext) {
        // eslint-disable-next-line no-undef
        var defaultTax = await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'defaultTax'&$top=1").then(
            function success(results) {
                return results.entities[0]["extreme_value"];
            },
            function (error) {
                console.log(error.message);
            }
        );

        formContext.getAttribute("extreme_tax").setValue(parseInt(defaultTax));
    };

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
    };

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
    };

    const validateCroatiaVAT = function (vat) {
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
    };

    const validateMacedoniaVAT = function (vat) {
        vat = vat.replace(/\D/g, '');

        // Assuming VAT number must be 13 digits long for Macedonia
        return vat.length === 13;
    };

}).call(AccountForm);
