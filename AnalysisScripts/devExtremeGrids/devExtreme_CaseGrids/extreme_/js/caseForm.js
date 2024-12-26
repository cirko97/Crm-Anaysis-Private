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
  let isFilterApplied = false; // Flag to prevent infinite refresh loop

  if (formType == FORM_EDIT) {
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseLines"));
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_timeEntries"));
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseAssets"));

    // addonchange for file column when form is loaded
    if (fileColumn) {
      fileColumn.addOnChange(checkIfFileExists);
    }
  } else {
    
    // Get Nav. Item
    var navItem = formContext.ui.navigation.items.get("navSPDocuments");
    // First set focus on Nav. Item to open related tab
    navItem.setFocus();
    // get Main tab (replace it with your tab name)
    var mainTab =  formContext.ui.tabs.get("generalTab");
    // Then move to Main Tab
    mainTab.setFocus();

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

  //customCalendarFetch
  calendarTab.addTabStateChange(filterCalendarSubgrid);
  filterCalendarSubgrid();

  //schedule fields logic
  formContext.getAttribute("extreme_scheduledstart").addOnChange(PopulateScheduledEnd);
  formContext.getAttribute("extreme_scheduledstart").addOnChange(ValidateDates);
  formContext.getAttribute("extreme_scheduledend").addOnChange(ValidateDates);

  //completion date logic
  formContext.getAttribute("extreme_actualdateofcompletion").addOnChange(copyIfempty);


  //functions

  async function filterCalendarSubgrid() {
    var subgrid = formContext.getControl("Subgrid_new_1");

    if (subgrid) {
      console.log("Subgrid control found. Waiting for it to load...");

      subgrid.addOnLoad(() => {
        if (!isFilterApplied) {
          console.log("Subgrid is loaded. Applying FilterXml...");
          applyCalendarFilter();
          isFilterApplied = true; // Set flag after first application
        } else {
          console.log("Filter already applied. Skipping...");
        }
      });

      // Fallback in case `addOnLoad` doesn't trigger
      ensureSubgridIsReady(subgrid);
    } else {
      console.error("Subgrid control not found!");
    }
  }

  // Fallback retry logic to ensure the grid is loaded
  function ensureSubgridIsReady(subgrid, retries = 5, delay = 500) {
    if (retries === 0) {
      console.error("Subgrid failed to load after multiple retries.");
      return;
    }

    // Check if subgrid data is available
    if (subgrid && subgrid.getGrid && subgrid.getGrid().getRows().getLength() >= 0) {
      if (!isFilterApplied) {
        console.log("Subgrid is ready (via fallback retry). Applying FilterXml...");
        applyCalendarFilter();
        isFilterApplied = true; // Set flag after first application
      } else {
        console.log("Filter already applied (via fallback retry). Skipping...");
      }
    } else {
      console.warn(`Subgrid not ready. Retrying... (${retries} retries left)`);
      setTimeout(() => ensureSubgridIsReady(subgrid, retries - 1, delay), delay);
    }
  }

  // Apply the filter to the calendar subgrid
  async function applyCalendarFilter() {
    var subgrid = formContext.getControl("Subgrid_new_1");
    var ownerId = formContext.getAttribute("ownerid").getValue();

    if (ownerId !== null) {
      var ownerGuid = ownerId[0].id.slice(1, -1); // Extract GUID without braces

      var fetchXml = `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true">
                            <entity name="appointment">
                                <attribute name="statecode"/>
                                <attribute name="subject"/>
                                <attribute name="scheduledstart"/>
                                <attribute name="scheduledend"/>
                                <attribute name="regardingobjectid"/>
                                <attribute name="prioritycode"/>
                                <attribute name="activityid"/>
                                <attribute name="instancetypecode"/>
                                <attribute name="location"/>
                                <order attribute="scheduledstart" descending="false"/>
                                <filter type="and">
                                    <condition attribute="statecode" operator="in">
                                        <value>0</value>
                                        <value>3</value>
                                    </condition>
                                </filter>
                                <link-entity name="activityparty" from="activityid" to="activityid" alias="aa" link-type="inner">
                                    <filter type="and">
                                        <condition attribute="partyid" operator="eq" value="${ownerGuid}" uitype="systemuser"/>
                                        <condition attribute="participationtypemask" operator="in">
                                            <value>7</value>
                                            <value>9</value>
                                            <value>5</value>
                                            <value>6</value>
                                        </condition>
                                    </filter>
                                </link-entity>
                            </entity>
                        </fetch>`;

      subgrid.setFilterXml(fetchXml);
      subgrid.refresh();
      console.log("Filter applied and grid refreshed.");
    } else {
      console.warn("Owner ID is null. Hiding subgrid.");
      subgrid.setVisible(false);
    }
  }

  async function checkIfFileExists() {
    var FileColumnValue = fileColumn.getValue();
    const statusReason = formContext.getAttribute("statuscode").getValue();
    const caseId = formContext.data.entity.getId();
    if (FileColumnValue !== null && statusReason === RESOLVED) {
      var confirmStrings = { text: "Are you sure you want to upload this document as signed printout? \n This action will change the status of the case to Resolved & Signed!", title: "Confirm Signed Printout Upload" };
      var confirmOptions = { height: 350, width: 450 };
      Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
        async function (success) {
          if (success.confirmed) {
            var record = {};
            record.statecode = 1; // State
            record.statuscode = 2; // Status

            await Xrm.WebApi.updateRecord("extreme_case", caseId, record).then(
              function success(result) {
                var updatedId = result.id;
                console.log(updatedId);
                formContext.data.refresh(true);
              },
              function (error) {
                console.log(error.message);
              }
            );
          }
          else
            fileColumn.setValue(null);
        });

    }
    if (FileColumnValue !== null) {
      var record = {};
      var URL = globalContext.getClientUrl() + `/api/data/v9.0/extreme_cases(${caseId.slice(1, -1)})/extreme_signedprintout/$value`
      record.extreme_signedprintouturl = URL; // Text

      await Xrm.WebApi.updateRecord("extreme_case", caseId, record).then(
        function success(result) {
          var updatedId = result.id;
          console.log(updatedId);
        },
        function (error) {
          console.log(error.message);
        }
      );
    } else {
      var record = {};
      record.extreme_signedprintouturl = ""; // Text

      await Xrm.WebApi.updateRecord("extreme_case", caseId, record).then(
        function success(result) {
          var updatedId = result.id;
          console.log(updatedId);
        },
        function (error) {
          console.log(error.message);
        }
      );
    }
  }
  function showHideRelatedCase() {
    if (formContext.getAttribute("extreme_casetype").getValue() !== null) {
      const CASECOMPLAINT = 8;
      const caseType = formContext.getAttribute("extreme_casetype").getValue();
      if (caseType === CASECOMPLAINT) {
        formContext.getControl("extreme_relatedcase").setVisible(true);
        formContext.getAttribute("extreme_relatedcase").setRequiredLevel("required");
      }
      else {
        formContext.getAttribute("extreme_relatedcase").setRequiredLevel("none");
        formContext.getControl("extreme_relatedcase").setVisible(false);
      }
    } else {
      formContext.getAttribute("extreme_relatedcase").setValue(null);
    }
  }
  function statusHandler() {
    const statusReason = formContext.getAttribute("statuscode").getValue();
    if (statusReason === RESOLVED || statusReason === ONHOLD) {
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
  function showHeader() {
    formContext.ui.headerSection.setBodyVisible(true);
  }
  function hideHeader() {
    formContext.ui.headerSection.setBodyVisible(false);
  }
  function copyIfempty() {
    if (formContext.getAttribute("extreme_actualdateofcompletion").getValue() !== null
      && formContext.getAttribute("extreme_dateofcompletion").getValue() === null) {
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
  function PopulateScheduledEnd() {
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