function form_onload(executionContext) {
  const FORM_NEW = 1;
  const FORM_EDIT = 2;
  const formContext = executionContext.getFormContext();
  const formType = formContext.ui.getFormType();
  let retry = 0;
  const maxRetries = 100;
  const retryDelay = 1000; // 1-second delay

  console.log('FORM TYPE:');
  console.log(formType);

  if (formType !== FORM_NEW){
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_quoteLines"));
  }



  function setClientApiContextForWebResource(formContext, webResourceName) {
    const wrControl = formContext.getControl(webResourceName);
    if (wrControl) {
      wrControl.getContentWindow().then(function (contentWindow) {
        try {
          if (typeof contentWindow.setClientApiContext === "function") {
            contentWindow.setClientApiContext(Xrm, formContext);
            // wrControl.getObject().style.minHeight = "1000px";
            // Set the parent div's style to overflow-y: auto
            const parentDiv = wrControl.getObject().parentNode;
            if (parentDiv) {
              parentDiv.style.overflow = "auto";
            }
          } else {
            throw new Error("setClientApiContext is not a function");
          }
        } catch (e) {
          console.log(e);
          retryAttempt(() => setClientApiContextForWebResource(formContext, webResourceName));
        }
      }).catch(function (error) {
        console.log(error);
        retryAttempt(() => setClientApiContextForWebResource(formContext, webResourceName));
      });
    } else {
      retryAttempt(() => setClientApiContextForWebResource(formContext, webResourceName));
    }
  }

  function retryAttempt(func) {
    if (retry < maxRetries) {
      retry++;
      setTimeout(function () {
        func();
        // setClientApiContextForWebResource(formContext, "WebResource_new_2");
      }, retryDelay);
    } else {
      console.error("Max retries reached. Unable to set client API context.");
    }
  }
}