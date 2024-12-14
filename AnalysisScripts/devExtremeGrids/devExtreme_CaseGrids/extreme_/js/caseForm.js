function form_onload(executionContext) {
  const FORM_NEW = 1;
  const FORM_EDIT = 2;
  const formContext = executionContext.getFormContext();
  const formType = formContext.ui.getFormType();
  let retry = 0;
  const maxRetries = 100;
  const retryDelay = 1000; // 1-second delay

  if (formType == FORM_EDIT){
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseLines"));
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_timeEntries"));
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseAssets"));
  }

  formContext.getAttribute("extreme_scheduledstart").addOnChange(PopulateScheduledEnd);

  formContext.getAttribute("extreme_scheduledstart").addOnChange(ValidateDates);
  formContext.getAttribute("extreme_scheduledend").addOnChange(ValidateDates);

function ValidateDates() {
    // Preuzmi vrednosti oba polja
    const start = formContext.getAttribute("extreme_scheduledstart").getValue();
    const end = formContext.getAttribute("extreme_scheduledend").getValue();

    // Ako oba polja imaju vrednosti
    if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Validacija: Start ne sme biti nakon End i obrnuto
        if (startDate > endDate) {
            // Prikaži grešku na oba polja
            formContext.getControl("extreme_scheduledstart").setNotification(
              "Start date and time cannot be after the end date and time."
            );
            formContext.getControl("extreme_scheduledend").setNotification(
                "End date and time cannot be before the start date and time."
            );
        } else {
            // Ukloni sve greške ako su validni
            formContext.getControl("extreme_scheduledstart").clearNotification();
            formContext.getControl("extreme_scheduledend").clearNotification();
        }
    } else {
        // Ukloni greške ako jedno od polja nema vrednost
        formContext.getControl("extreme_scheduledstart").clearNotification();
        formContext.getControl("extreme_scheduledend").clearNotification();
    }
}
function PopulateScheduledEnd () {
    // Preuzmi vrednost iz polja scheduledstart
    const start = formContext.getAttribute("extreme_scheduledstart").getValue();

    // Proveri da li postoji vrednost za scheduledstart
    if (start) {
        // Preuzmi vrednost iz scheduledend
        const end = formContext.getAttribute("extreme_scheduledend").getValue();

        // Ako je scheduledend prazno, setuj na scheduledstart + 2 sata
        if (!end) {
            const startDate = new Date(start);
            startDate.setHours(startDate.getHours() + 2); // Dodaj 2 sata
            formContext.getAttribute("extreme_scheduledend").setValue(startDate);
            formContext.getAttribute("extreme_scheduledend").setSubmitMode("always"); // Obavezno čuvanje
        }
    }
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