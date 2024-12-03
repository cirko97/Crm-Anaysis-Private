var PriceListImportRibbon = window.PriceListImportRibbon || {};
(function () {
	this.StartImportButton = function (formContext) {
		formContext.getAttribute("statuscode").setValue(934670001); //Processing
        formContext.data.refresh(true);
	}

	this.StartImportEnableRule = function (formContext) {
		if (formContext.getAttribute("statuscode").getValue() == 1) {
			return true;
		}
		return false;
	}
    
}).call(PriceListImportRibbon);

