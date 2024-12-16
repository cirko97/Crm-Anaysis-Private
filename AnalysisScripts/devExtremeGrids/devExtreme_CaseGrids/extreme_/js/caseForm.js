function form_onload(executionContext) {
  const FORM_NEW = 1;
  const FORM_EDIT = 2;
  const RESOLVED = 934670004;
  const ONHOLD = 934670002;
  const globalContext = Xrm.Utility.getGlobalContext();
  const formContext = executionContext.getFormContext();
  const formType = formContext.ui.getFormType();
  const fileColumn = formContext.getAttribute("extreme_signedprintout");
  let retry = 0;
  const maxRetries = 100;
  const retryDelay = 1000; // 1-second delay

  if (formType == FORM_EDIT){
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseLines"));
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_timeEntries"));
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseAssets"));

     // addonchange for file column when form is loaded
      if (fileColumn) {
        fileColumn.addOnChange(checkIfFileExists);
    }
  }

  //case complaint
  formContext.getAttribute("extreme_casetype").addOnChange(showHideRelatedCase);
  showHideRelatedCase();
  
  //Resolved and ONHold lock
  formContext.getAttribute("statuscode").addOnChange(statusHandler);
  statusHandler();
  
  //Header Body hide when on Calendar TAB
  var calendarTab = formContext.ui.tabs.get("calendarTab");
  var resolutionTab = formContext.ui.tabs.get("resolutionTab");
  var generalTab = formContext.ui.tabs.get("generalTab");
  calendarTab.addTabStateChange(hideHeader);
  resolutionTab.addTabStateChange(showHeader);
  generalTab.addTabStateChange(showHeader);

  //schedule fields logic
  formContext.getAttribute("extreme_scheduledstart").addOnChange(PopulateScheduledEnd);
  formContext.getAttribute("extreme_scheduledstart").addOnChange(ValidateDates);
  formContext.getAttribute("extreme_scheduledend").addOnChange(ValidateDates);

  //completion date logic
  formContext.getAttribute("extreme_actualdateofcompletion").addOnChange(copyIfempty);


//functions
async function checkIfFileExists(){
  var FileColumnValue = fileColumn.getValue();
  const statusReason = formContext.getAttribute("statuscode").getValue();
  const caseId = formContext.data.entity.getId();
  if(FileColumnValue!== null && statusReason === RESOLVED){
    var confirmStrings = { text:"Are you sure you want to upload this document as signed printout? \n This action will change the status of the case to Resolved & Signed!", title:"Confirm Signed Printout Upload" };
    var confirmOptions = { height: 350, width: 450 };
    Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
    async function (success) {    
        if (success.confirmed){
          var record = {};
          record.statecode = 1; // State
          record.statuscode = 2; // Status
      
          await Xrm.WebApi.updateRecord("extreme_case", caseId, record).then(
            function success(result) {
              var updatedId = result.id;
              console.log(updatedId);
              formContext.data.refresh(true);
            },
            function(error) {
              console.log(error.message);
            }
          );
        }
        else
          fileColumn.setValue(null);
    });
    
  }
  if(FileColumnValue!== null){
    var record = {};
    var URL = globalContext.getClientUrl() + `/api/data/v9.0/extreme_cases(${caseId.slice(1,-1)})/extreme_signedprintout/$value`
    record.extreme_signedprintouturl = URL; // Text

    await Xrm.WebApi.updateRecord("extreme_case", caseId, record).then(
      function success(result) {
        var updatedId = result.id;
        console.log(updatedId);
      },
      function(error) {
        console.log(error.message);
      }
    );
  }else {
    var record = {};
    record.extreme_signedprintouturl = ""; // Text

    await Xrm.WebApi.updateRecord("extreme_case", caseId, record).then(
      function success(result) {
        var updatedId = result.id;
        console.log(updatedId);
      },
      function(error) {
        console.log(error.message);
      }
    );
  }
}
function showHideRelatedCase(){
  if(formContext.getAttribute("extreme_casetype").getValue() !== null ){
    const CASECOMPLAINT = 8;
    const caseType = formContext.getAttribute("extreme_casetype").getValue();
    if(caseType === CASECOMPLAINT){
      formContext.getControl("extreme_relatedcase").setVisible(true);
      formContext.getAttribute("extreme_relatedcase").setRequiredLevel("required");
    }
    else{
      formContext.getAttribute("extreme_relatedcase").setRequiredLevel("none");
      formContext.getControl("extreme_relatedcase").setVisible(false);
    }
  }else{
    formContext.getAttribute("extreme_relatedcase").setValue(null);
  }
}
function statusHandler(){
  const statusReason = formContext.getAttribute("statuscode").getValue();
  if(statusReason === RESOLVED || statusReason === ONHOLD){
    lockOrUnlockFieldsInSection("generalTab", "general", true);
    lockOrUnlockFieldsInSection("resolutionTab", "ResolutionDetails", true);
    formContext.getControl("extreme_dateofcompletion").setDisabled(false);
  } else {
    lockOrUnlockFieldsInSection("generalTab", "general", false);
    lockOrUnlockFieldsInSection("resolutionTab", "ResolutionDetails", false);
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
function showHeader (){
  formContext.ui.headerSection.setBodyVisible(true);  
}
function hideHeader (){
  formContext.ui.headerSection.setBodyVisible(false);
}
function copyIfempty(){
  if(formContext.getAttribute("extreme_actualdateofcompletion").getValue() !== null 
  && formContext.getAttribute("extreme_dateofcompletion").getValue() === null){
    const dateofcompletion = formContext.getAttribute("extreme_actualdateofcompletion").getValue();
    formContext.getAttribute("extreme_dateofcompletion").setValue(dateofcompletion);
  }  
}
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