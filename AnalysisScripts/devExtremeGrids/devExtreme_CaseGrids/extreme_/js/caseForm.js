function form_onload(executionContext) {
  const FORM_NEW = 1;
  const FORM_EDIT = 2;
  const RESOLVED = 934670004;
  const ONHOLD = 934670002;
  const RESOLVEDSIGNED = 2;
  const globalContext = Xrm.Utility.getGlobalContext();
  const formContext = executionContext.getFormContext();
  const formType = formContext.ui.getFormType();
  const fileColumn = formContext.getAttribute("extreme_signedprintout");
  let retry = 0;
  const maxRetries = 100;
  const retryDelay = 1000; // 1-second delay

  console.log('formType');
  console.log(formType);

  formContext.getAttribute("statuscode").addOnChange(async () => {
    const caseLinesControl = formContext.getControl('WebResource_caseLines');
    const timeEntriesControl = formContext.getControl('WebResource_timeEntries');
    const caseAssetsControl = formContext.getControl('WebResource_caseAssets');

    if (caseLinesControl && caseLinesControl.getObject() && caseLinesControl.getObject().contentWindow) {
      await caseLinesControl.getObject().contentWindow.setClientApiContext(Xrm, formContext);
    }
    if (timeEntriesControl && timeEntriesControl.getObject() && timeEntriesControl.getObject().contentWindow) {
      await timeEntriesControl.getObject().contentWindow.setClientApiContext(Xrm, formContext);
    }
    if (caseAssetsControl && caseAssetsControl.getObject() && caseAssetsControl.getObject().contentWindow) {
      await caseAssetsControl.getObject().contentWindow.setClientApiContext(Xrm, formContext);
    }
  });

  if (formType !== FORM_NEW) {
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseLines"));
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_timeEntries"));
    retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseAssets"));

    let initAcc = formContext.getAttribute("extreme_account").getValue();

    formContext.getAttribute("extreme_account").addOnChange(() => {

      if (formContext.getAttribute("extreme_account").getValue() !== null) {
        initAcc = formContext.getAttribute("extreme_account").getValue();
      }
      else {

        var confirmStrings = { text: "If you change Account, all Case Details will be DELETED!", title: "Are you sre?" };
        var confirmOptions = { height: 200, width: 450 };
        Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
          async function (success) {
            if (success.confirmed) {
              console.log("Dialog closed using OK button.");

              Xrm.Utility.showProgressIndicator('Deleting Case Details...');

              // DELETE ALL CASE ASSETS
              await Xrm.WebApi.retrieveMultipleRecords("extreme_caseasset", `?$select=extreme_caseassetid&$filter=_extreme_case_value eq ${formContext.data.entity.getId().slice(1, -1)}`).then(
                async function success(results) {
                  console.log(results);
                  for (var i = 0; i < results.entities.length; i++) {
                    var result = results.entities[i];
                    // Columns
                    var extreme_caseassetid = result["extreme_caseassetid"]; // Guid

                    await Xrm.WebApi.deleteRecord("extreme_caseasset", extreme_caseassetid).then(
                      function success(result) {
                        console.log(result);
                      },
                      function (error) {
                        console.log(error.message);
                      }
                    );

                  }
                },
                function (error) {
                  console.log(error.message);
                }
              );

              // DELETE ALL CASE LINES
              await Xrm.WebApi.retrieveMultipleRecords("extreme_caseline", `?$select=extreme_caselineid&$filter=_extreme_case_value eq ${formContext.data.entity.getId().slice(1, -1)}`).then(
                async function success(results) {
                  console.log(results);
                  for (var i = 0; i < results.entities.length; i++) {
                    var result = results.entities[i];
                    // Columns
                    var extreme_caselineid = result["extreme_caselineid"]; // Guid

                    await Xrm.WebApi.deleteRecord("extreme_caseline", extreme_caselineid).then(
                      function success(result) {
                        console.log(result);
                      },
                      function (error) {
                        console.log(error.message);
                      }
                    );

                  }
                },
                function (error) {
                  console.log(error.message);
                }
              );

              // DELETE ALL TIME ENTRIES
              await Xrm.WebApi.retrieveMultipleRecords("extreme_timeentry", `?$select=activityid&$filter=regardingobjectid_extreme_case_extreme_timeentry/extreme_caseid eq ${formContext.data.entity.getId().slice(1, -1)}`).then(
                async function success(results) {
                  console.log(results);
                  for (var i = 0; i < results.entities.length; i++) {
                    var result = results.entities[i];
                    // Columns
                    var activityid = result["activityid"]; // Guid

                    await Xrm.WebApi.deleteRecord("extreme_timeentry", activityid).then(
                      function success(result) {
                        console.log(result);
                      },
                      function (error) {
                        console.log(error.message);
                      }
                    );

                  }
                },
                function (error) {
                  console.log(error.message);
                }
              );

              retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseLines"));
              retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_timeEntries"));
              retryAttempt(() => setClientApiContextForWebResource(formContext, "WebResource_caseAssets"));

              Xrm.Utility.closeProgressIndicator();

            }
            else {
              console.log("Dialog closed using Cancel button or X.");

              formContext.getAttribute("extreme_account").setValue(initAcc);

            }
          });

      }
    });

    if (formContext.getAttribute("extreme_additionalappointments").getValue() === true) {
      formContext.getControl("ServiceAppointments").setVisible(true);
    } else {
      formContext.getControl("ServiceAppointments").setVisible(false);
    }

    formContext.getAttribute("extreme_additionalappointments").addOnChange(() => {
      if (formContext.getAttribute("extreme_additionalappointments").getValue() === true) {
        formContext.getControl("ServiceAppointments").setVisible(true);
      } else {
        formContext.getControl("ServiceAppointments").setVisible(false);
      }
    }
    );

    if (formContext.getAttribute("extreme_onholdreason").getValue() !== null)
      formContext.getControl("extreme_onholdreason").setVisible(true);
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
    var mainTab = formContext.ui.tabs.get("generalTab");
    // Then move to Main Tab
    mainTab.setFocus();

  }


  formContext.getAttribute("extreme_calendaruser").setValue(934670000);
  formContext.getAttribute("extreme_calendaruser").addOnChange(changeCalendarView);

  function changeCalendarView() {

    const calendarUser = formContext.getAttribute("extreme_calendaruser").getValue();
    const calendarGridContext = formContext.getControl("calendarSubgrid"); // get the grid context
    const viewSelector = calendarGridContext.getViewSelector();

    var viewCHROMATOGRAPHY = {
      entityType: 1039,
      id: "d2644dd4-69d2-ef11-8ee9-6045bd898d29",
      name: "Service Team - CHROMATOGRAPHY"
    };
    var viewELEMENTAL = {
      entityType: 1039,
      id: "6ba9105c-69d2-ef11-8ee9-6045bd89637c",
      name: "Service Team - ELEMENTAL"
    };
    var viewGENERAL = {
      entityType: 1039,
      id: "79ed57fe-69d2-ef11-8ee9-6045bd898d29",
      name: "Service Team - GENERAL"
    };
    var viewMOLECULAR = {
      entityType: 1039,
      id: "ca69ab7f-69d2-ef11-8ee9-6045bd90a8a9",
      name: "Service Team - MOLECULAR"
    };
    var viewAleksandarStevanov = {
      entityType: 1039,
      id: "aa865266-1fc6-ef11-b8e8-6045bd898d29",
      name: "Service Team - Aleksandar Števanov"
    };
    var viewBojanJovic = {
      entityType: 1039,
      id: "7830d98e-1ac6-ef11-b8e8-6045bd898d29",
      name: "Service Team - Bojan Jović"
    };
    var viewBojanSajatovic = {
      entityType: 1039,
      id: "6773848f-1fc6-ef11-b8e9-0022487f5548",
      name: "Service Team - Bojan Šajatović"
    };
    var viewDimitrijeAndrejic = {
      entityType: 1039,
      id: "8e6021fc-1fc6-ef11-b8e9-0022487f5548",
      name: "Service Team - Dimitrije Andrejić"
    };
    var viewDusanPopovic = {
      entityType: 1039,
      id: "e600da0e-20c6-ef11-b8e8-6045bdf313bb",
      name: "Service Team - Dusan Popović"
    };
    var viewGoranPoprzen = {
      entityType: 1039,
      id: "9276e428-20c6-ef11-b8e8-6045bd898d29",
      name: "Service Team - Goran Popržen"
    };
    var viewJovanMitrovic = {
      entityType: 1039,
      id: "e0c99442-20c6-ef11-b8e8-6045bdf313bb",
      name: "Service Team - Jovan Mitrović"
    };
    var viewLukaMihajlovic = {
      entityType: 1039,
      id: "2e307a59-20c6-ef11-b8e9-0022487f5548",
      name: "Service Team - Luka Mihajlović"
    };
    var viewMarkoMitic = {
      entityType: 1039,
      id: "7a2b1f73-20c6-ef11-b8e8-6045bd898d29",
      name: "Service Team - Marko Mitić"
    };
    var viewMilanCosic = {
      entityType: 1039,
      id: "18e4f883-20c6-ef11-b8e8-6045bdf313bb",
      name: "Service Team - Milan Ćosić"
    };
    var viewMilanMisic = {
      entityType: 1039,
      id: "589a3d9d-20c6-ef11-b8e9-0022487f5548",
      name: "Service Team - Milan Mišić"
    };
    var viewMilanVidovic = {
      entityType: 1039,
      id: "2c929cb2-20c6-ef11-b8e8-6045bd898d29",
      name: "Service Team - Milan Vidović"
    };
    var viewMiroslavHavran = {
      entityType: 1039,
      id: "8607fac7-20c6-ef11-b8e8-6045bd898d29",
      name: "Service Team - Miroslav Havran"
    };
    var viewNikolaStevanovic = {
      entityType: 1039,
      id: "278a3bdd-20c6-ef11-b8e8-6045bdf313bb",
      name: "Service Team - Nikola Stevanović"
    };
    var viewRodoljubRadulovic = {
      entityType: 1039,
      id: "7a42acf7-20c6-ef11-b8e9-0022487f5548",
      name: "Service Team - Rodoljub Radulović"
    };
    var viewSanjaDjekic = {
      entityType: 1039,
      id: "8814560b-21c6-ef11-b8e8-6045bdf313bb",
      name: "Service Team - Sanja Đekić"
    };
    var viewSilviaBabarci = {
      entityType: 1039,
      id: "ae307120-21c6-ef11-b8e8-6045bdf313bb",
      name: "Service Team - Silvia Babarci"
    };
    var myAppointmentsView = {
      entityType: 1039,
      id: "606eea12-0c33-47d3-96e1-ba1529ee8205",
      name: "My Appointments"
    }

    var selectedView;

    // Dobijanje vrednosti iz option set polja
    switch (calendarUser) {
      case 934670000:
        var owner = formContext.getAttribute("ownerid").getValue();

        if (owner && owner.length > 0) {
          var ownerName = owner[0].name; // Dobijamo ime vlasnika

          switch (ownerName) {
            case "Aleksandar Števanov":
              selectedView = viewAleksandarStevanov;
              break;
            case "Bojan Jović":
              selectedView = viewBojanJovic;
              break;
            case "Bojan Šajatovic":
              selectedView = viewBojanSajatovic;
              break;
            case "Dimitrije Andrejić":
              selectedView = viewDimitrijeAndrejic;
              break;
            case "Dušan Popović":
              selectedView = viewDusanPopovic;
              break;
            case "Goran Popržen":
              selectedView = viewGoranPoprzen;
              break;
            case "Jovan Mitrović":
              selectedView = viewJovanMitrovic;
              break;
            case "Luka Mihajlović":
              selectedView = viewLukaMihajlovic;
              break;
            case "Marko Mitić":
              selectedView = viewMarkoMitic;
              break;
            case "Milan Ćosić":
              selectedView = viewMilanCosic;
              break;
            case "Milan Mišić":
              selectedView = viewMilanMisic;
              break;
            case "Milan Vidović":
              selectedView = viewMilanVidovic;
              break;
            case "Miroslav Havran":
              selectedView = viewMiroslavHavran;
              break;
            case "Nikola Stevanović":
              selectedView = viewNikolaStevanovic;
              break;
            case "Rodoljub Radulović":
              selectedView = viewRodoljubRadulovic;
              break;
            case "Sanja Đekić":
              selectedView = viewSanjaDjekic;
              break;
            case "Silvia Babarci":
              selectedView = viewSilviaBabarci;
              break;
            default:
              console.warn("Nema definisanog view-a za vlasnika: " + ownerName);
              selectedView = myAppointmentsView;
              break;
          }
        } else {
          console.warn("Nije pronađen owner za zapis.");
          selectedView = null;
        }
        break;

      case 934670001:
        selectedView = viewAleksandarStevanov;
        break;
      case 934670002:
        selectedView = viewBojanJovic;
        break;
      case 934670003:
        selectedView = viewBojanSajatovic;
        break;
      case 934670004:
        selectedView = viewDimitrijeAndrejic;
        break;
      case 934670005:
        selectedView = viewDusanPopovic;
        break;
      case 934670006:
        selectedView = viewGoranPoprzen;
        break;
      case 934670007:
        selectedView = viewJovanMitrovic;
        break;
      case 934670008:
        selectedView = viewLukaMihajlovic;
        break;
      case 934670009:
        selectedView = viewMarkoMitic;
        break;
      case 934670010:
        selectedView = viewMilanCosic;
        break;
      case 934670011:
        selectedView = viewMilanMisic;
        break;
      case 934670012:
        selectedView = viewMilanVidovic;
        break;
      case 934670013:
        selectedView = viewMiroslavHavran;
        break;
      case 934670014:
        selectedView = viewNikolaStevanovic;
        break;
      case 934670015:
        selectedView = viewRodoljubRadulovic;
        break;
      case 934670016:
        selectedView = viewSanjaDjekic;
        break;
      case 934670017:
        selectedView = viewSilviaBabarci;
        break;
      case 934670018:
        selectedView = viewCHROMATOGRAPHY;
        break;
      case 934670019:
        selectedView = viewELEMENTAL;
        break;
      case 934670020:
        selectedView = viewGENERAL;
        break;
      case 934670021:
        selectedView = viewMOLECULAR;
        break;
      default:
        console.warn("Nepoznata vrednost za option set polje.");
        selectedView = myAppointmentsView;
        break;
    }




    viewSelector.setCurrentView(selectedView);
    //calendarGridContext.refresh();
  }


  //case complaint
  formContext.getAttribute("extreme_casetype").addOnChange(showHideRelatedCase);
  showHideRelatedCase();

  //Resolved and ONHold lock
  formContext.getAttribute("statuscode").addOnChange(statusHandler);
  statusHandler();

  //Header Body hide when on Calendar TAB
  var calendarTab = formContext.ui.tabs.get("calendarTab");
  var caseDetailsTab = formContext.ui.tabs.get("caseDetailsTab");
  var generalTab = formContext.ui.tabs.get("generalTab");
  calendarTab.addTabStateChange(hideHeader);
  caseDetailsTab.addTabStateChange(showHeader);
  generalTab.addTabStateChange(showHeader);

  //schedule fields logic
  formContext.getAttribute("extreme_scheduledstart").addOnChange(PopulateScheduledEnd);
  formContext.getAttribute("extreme_scheduledstart").addOnChange(ValidateDates);
  formContext.getAttribute("extreme_scheduledend").addOnChange(ValidateDates);

  //completion date logic
  formContext.getAttribute("extreme_actualdateofcompletion").addOnChange(copyIfempty);


  //functions
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
    if (statusReason === RESOLVED || statusReason === ONHOLD || statusReason === RESOLVEDSIGNED) {
      lockOrUnlockFieldsInSection("generalTab", "general", true);
      lockOrUnlockFieldsInSection("generalTab", "ResolutionDetails", true);
      lockOrUnlockFieldsInSection("calendarTab", "Calendar_section_3", true);
      formContext.getControl("extreme_dateofcompletion").setDisabled(false);
    } else {
      lockOrUnlockFieldsInSection("generalTab", "general", false);
      lockOrUnlockFieldsInSection("generalTab", "ResolutionDetails", false);
      lockOrUnlockFieldsInSection("calendarTab", "Calendar_section_3", false);
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