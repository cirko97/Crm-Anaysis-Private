var ProductForm = window.ProductForm || {};
(function () {
    const FORM_NEW = 1;
    var formContext = null;

    this.OnLoad = async function (executionContext) {
        formContext = executionContext.getFormContext();
        
        const disposalDate = formContext.getAttribute("extreme_disposaldate");

        const formType = formContext.ui.getFormType();
        if (formType === FORM_NEW) {

        }

    }
  
}).call(ProductForm);

