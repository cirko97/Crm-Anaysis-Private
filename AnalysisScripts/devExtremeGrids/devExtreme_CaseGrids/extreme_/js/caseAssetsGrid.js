let caseAssetsArray = [];
let usersArray = [];
let timeEntryTypesArray = [];
let newCreateId;

// Add hours to Date method
Date.prototype.addMinutes = function (h) {
  this.setTime(this.getTime() + (h * 60 * 60 * 1000));
  return this;
}
// Add minutes to Date method
Date.prototype.addMinutes = function (m) {
  this.setTime(this.getTime() + (m * 60 * 1000));
  return this;
}

async function setClientApiContext(Xrm, formContext) {
  // Optionally set Xrm and formContext as global variables on the page.
  window.Xrm = Xrm;
  window._formContext = formContext;

  Xrm.Utility.showProgressIndicator('Loading... Please wait...');



  const caseIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
  const accountIdForm = replaceCurlyBrackets(formContext.getAttribute('extreme_account').getValue()[0].id, "");
  const userId = replaceCurlyBrackets(Xrm.Utility.getGlobalContext().userSettings.userId, "");
  await getCaseAssets(caseIdForm);


  initDataGrid(caseIdForm, userId);


  // Set title for grid inside header
  const caseAssetsDisplayName = await Xrm.Utility.getEntityMetadata('extreme_caseasset').then(
    result => result._displayName,
    error => console.log(error)
  );
  console.log('CaseAssets: ', caseAssetsDisplayName);
  // setTimeout(() => {
  //   const toolbarBefore = Xrm.Page.getControl("WebResource_caseAssets").getObject().contentWindow.window.document.querySelector('div.dx-toolbar-before');
  //   console.log('dx toolbar before: ', toolbarBefore);
  //   toolbarBefore.innerHTML = `<span style='font-weight: 500; position: absolute; width: 100px; bottom: 30%; left: 0;'>${caseAssetsDisplayName}</span>`;
  //   console.log(formContext.data.entity);
  // }, 1000); // Adjust the timeout as needed








  // Data from DV - Xrm Web Api
  async function getCaseAssets(caseId) {

    caseAssetsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_caseasset", `?$select=extreme_caseassetid,extreme_description,extreme_solution&$expand=extreme_Asset($select=extreme_assetcode,extreme_lastactivitydate,extreme_name,extreme_serialnumber,extreme_warrantyend,extreme_warrantyenddatevendor)&$filter=_extreme_case_value eq ${caseId}`).then(
      function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_caseassetid = result["extreme_caseassetid"]; // Guid

          // Many To One Relationships
          if (result.hasOwnProperty("extreme_Asset") && result["extreme_Asset"] !== null) {
            var extreme_Asset_extreme_assetcode = result["extreme_Asset"]["extreme_assetcode"]; // Text
            var extreme_Asset_extreme_lastactivitydate = result["extreme_Asset"]["extreme_lastactivitydate"]; // Date Time
            var extreme_Asset_extreme_lastactivitydate_formatted = result["extreme_Asset"]["extreme_lastactivitydate@OData.Community.Display.V1.FormattedValue"];
            var extreme_Asset_extreme_name = result["extreme_Asset"]["extreme_name"]; // Text
            var extreme_Asset_extreme_serialnumber = result["extreme_Asset"]["extreme_serialnumber"]; // Text
            var extreme_Asset_extreme_warrantyend = result["extreme_Asset"]["extreme_warrantyend"]; // Date Time
            var extreme_Asset_extreme_warrantyend_formatted = result["extreme_Asset"]["extreme_warrantyend@OData.Community.Display.V1.FormattedValue"];
            var extreme_Asset_extreme_warrantyenddatevendor = result["extreme_Asset"]["extreme_warrantyenddatevendor"]; // Date Time
            var extreme_Asset_extreme_warrantyenddatevendor_formatted = result["extreme_Asset"]["extreme_warrantyenddatevendor@OData.Community.Display.V1.FormattedValue"];
            var extreme_description = result["extreme_description"]; // Multiline Text
            var extreme_solution = result["extreme_solution"]; // Multiline Text

            caseAssetsArray.push({
              "extreme_caseassetid": extreme_caseassetid,
              "extreme_name": extreme_Asset_extreme_name,
              "extreme_assetcode": extreme_Asset_extreme_assetcode,
              "extreme_lastactivitydate": extreme_Asset_extreme_lastactivitydate,
              "extreme_serialnumber": extreme_Asset_extreme_serialnumber,
              "extreme_warrantyend": extreme_Asset_extreme_warrantyend,
              "extreme_warrantyenddatevendor": extreme_Asset_extreme_warrantyenddatevendor,
              "extreme_description": extreme_description,
              "extreme_solution": extreme_solution
            });
          }

        }
      },
      function (error) {
        console.log(error.message);
      }
    );

  }

  // Function to initialize data grid for case lines
  function initDataGrid(caseIdForm, userId) {
    $(() => {
      const now = new Date();

      const caseAssetsData = new DevExpress.data.ArrayStore({
        key: 'extreme_caseassetid',
        data: caseAssetsArray,
      });

      const dataGrid = $('#gridContainer').dxDataGrid({
        dataSource: caseAssetsData,
        width: "100%",
        wordWrapEnabled: true,
        showColumnLines: true,
        showRowLines: true,
        rowAlternationEnabled: true,
        showBorders: true,
        // headerFilter: {
        //   visible: true,
        //   height: 200
        // },
        paging: {
          pageSize: 5,
        },
        editing: {
          mode: 'cell',
          allowUpdating: true,
          allowAdding: false,
          allowDeleting: false,
        },
        // selection: {
        //   mode: 'multiple',
        // },
        allowColumnResizing: true,
        columnResizingMode: "mode",
        columnMinWidth: 10,
        columnAutoWidth: true,
        columnHidingEnabled: false,
        scrolling: {
          mode: "standard",
          scrollByContent: true,
          scrollByThumb: true
        },
        columns: [
          {
            dataField: 'extreme_name',
            caption: 'Name',
            dataType: 'string',
            allowEditing: false
          },
          {
            dataField: 'extreme_assetcode',
            caption: 'Code',
            dataType: 'string',
            allowEditing: false
          },
          {
            dataField: 'extreme_lastactivitydate',
            caption: 'Last Activity',
            dataType: 'datetime',
            pickerType: 'rollers',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy HH:mm",
            allowEditing: false
          },
          {
            dataField: 'extreme_serialnumber',
            caption: 'S/N',
            dataType: 'string',
            allowEditing: false
          },
          {
            dataField: 'extreme_warrantyend',
            caption: 'Warranty end',
            dataType: 'datetime',
            pickerType: 'rollers',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy HH:mm",
            allowEditing: false
          },
          {
            dataField: 'extreme_warrantyenddatevendor',
            caption: 'Warranty end (vendor)',
            dataType: 'datetime',
            pickerType: 'rollers',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy HH:mm",
            allowEditing: false
          },
          {
            dataField: 'extreme_description',
            caption: 'Description',
            dataType: 'string',
            width: 300,
            allowEditing: true
          },
          {
            dataField: 'extreme_solution',
            caption: 'Solution',
            dataType: 'string',
            width: 300,
            allowEditing: true
          },
        ],
        toolbar: {
          items: [
            {
              location: 'before',
              template() {
                return $('<div>')
                  .addClass('grid-title')
                  .text(`${caseAssetsDisplayName}`)
              },
            },
            {
              name: 'addRowButton',
              showText: 'always'
            }
          ],
        },
        onSelectionChanged(data) {
          dataGrid.option('toolbar.items[1].options.disabled', !data.selectedRowsData.length);
        },
        onEditorPreparing: async (e) => {
          console.log('Editor Preparing');
          console.log(e);

          if (e.dataField === "extreme_description" || (e.dataField === "extreme_solution")) {
            e.editorName = "dxTextArea";
            e.editorOptions.autoResizeEnabled = true;
            // console.log("EDITOR ELEMENT");
            setTimeout(() => {
              // console.log(e.editorElement[0].querySelector("textarea"));
              e.editorElement[0].querySelector("textarea").style.lineHeight = "1.6";
              e.editorElement[0].querySelector("textarea").style.height = "auto";
            }, 200);
          }

          // if (e.dataField == "createdon") e.editorOptions.disabled = true;
          // if (e.dataField == "scheduledend") e.editorOptions.disabled = true;
          // if (e.dataField == "extreme_type") e.editorOptions.disabled = true;
          // if (e.dataField == "scheduledstart") e.editorOptions.pickerType = "rollers";
          // if (e.row.data.extreme_caseline) {
          //   if (e.dataField == "owner") e.editorOptions.disabled = true;
          //   if (e.dataField == "scheduleddurationminutes") e.editorOptions.disabled = true;
          // }
        },
        onEditingStart: (e) => {
          console.log('EditingStart');
          console.log(e);
        },
        onInitNewRow: async (e) => {
          console.log('InitNewRow');
          console.log(e);
          // e.data.owner = usersArray.find(item => item.id === userId.toLowerCase()).id;
          // e.data.extreme_return = false;
          // e.data.scheduledstart = new Date().toISOString();
          // e.data.scheduledend = new Date().toISOString();
          // e.data.extreme_type = timeEntryTypesArray.find(item => item.value == 424000001).value;
          // if (oneAssetId !== undefined && oneAssetId !== 'none') e.data.extreme_asset = assetsArray.find(item => item.id === oneAssetId).id
        },
        onRowInserting: async (e) => {

          console.log('RowInserting');
          console.log(e);

          // Xrm.Utility.showProgressIndicator('Loading... Please wait...');

          // newCreateId = '';
          // var record = {};
          // record["regardingobjectid_extreme_case_extreme_timeentry@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
          // record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${e.data.owner})`; // Owner
          // record.scheduledstart = e.data.scheduledstart; // Date Time
          // record.scheduledend = e.data.scheduledend; // Date Time
          // record.extreme_type = e.data.extreme_type; // Choice
          // record.scheduleddurationminutes = e.data.scheduleddurationminutes; // Decimal
          // record.extreme_comuteinkm = e.data.extreme_comuteinkm; // Decimal
          // record.extreme_return = e.data.extreme_return; // Boolean
          // record.extreme_expences = e.data.extreme_expences; // Decimal

          // await Xrm.WebApi.createRecord("extreme_timeentry", record).then(
          //   function success(result) {
          //     var newId = result.id;
          //     newCreateId = newId;
          //     console.log('NEW CREATED ID: ' + newCreateId);
          //   },
          //   function (error) {
          //     console.log(error.message);
          //   }
          // );
        },
        onRowInserted: async (e) => {

          // setTimeout(async () => {

          //   console.log('RowInserted');
          //   console.log(e);

          //   if (timeEntriesData._array.length > 0) {
          //     console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
          //     timeEntriesData._array[timeEntriesData._array.length - 1].activityid = newCreateId;
          //     console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
          //     await getTimeEntries(caseIdForm);
          //     dataGrid.refresh();
          //   } else {
          //     console.log('timeEntriesData._array is empty');
          //   }

          //   Xrm.Utility.closeProgressIndicator();

          // }, 1000);


        },
        onRowUpdating: async (e) => {
          console.log('RowUpdating');
          console.log(e);

          var record = {};
          if(e.newData.extreme_description) record.extreme_description = e.newData.extreme_description; // Multiline Text
          if(e.newData.extreme_solution) record.extreme_solution = e.newData.extreme_solution; // Multiline Text

          await Xrm.WebApi.updateRecord("extreme_caseasset", `${e.key}`, record).then(
            async function success(result) {
              var updatedId = result.id;
              console.log(updatedId);
              await getCaseAssets();
              dataGrid.refresh();
            },
            function (error) {
              console.log(error.message);
            }
          );

          // var record = {};
          // if (e.newData.owner) record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${e.newData.owner})`; // Owner
          // if (e.newData.scheduledstart) record.scheduledstart = e.newData.scheduledstart; // Date Time
          // if (e.newData.scheduledend) record.scheduledend = e.newData.scheduledend; // Date Time
          // if (e.newData.extreme_type) record.extreme_type = e.newData.extreme_type; // Choice
          // if (e.newData.scheduleddurationminutes) record.scheduleddurationminutes = e.newData.scheduleddurationminutes; // Decimal
          // if (e.newData.extreme_comuteinkm) record.extreme_comuteinkm = e.newData.extreme_comuteinkm; // Decimal
          // if (typeof e.newData.extreme_return === "boolean") record.extreme_return = e.newData.extreme_return; // Boolean
          // if (e.newData.extreme_expences) record.extreme_expences = e.newData.extreme_expences; // Decimal

          // await Xrm.WebApi.updateRecord("extreme_timeentry", `${e.key}`, record).then(
          //   async function success(result) {
          //     var updatedId = result.id;
          //     console.log(record);
          //     await getTimeEntries(caseIdForm);
          //     dataGrid.refresh();
          //   },
          //   function (error) {
          //     console.log(error.message);
          //   }
          // );
        },
        onRowUpdated() {
          console.log('RowUpdated');
        },
        onRowRemoving: async (e) => {
          console.log('RowRemoving');
          console.log(e);
          // // Delete case line on another web resource
          // await Xrm.Page.getControl('WebResource_new_2').getObject().contentWindow.window.createTimeEntry(e.data.extreme_caseline);
          // // Refresh grid for case lines
          // await Xrm.Page.getControl('WebResource_new_2').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          await Xrm.WebApi.deleteRecord("extreme_caseasset", `${e.key}`).then(
            function success(result) {
              console.log(result);
            },
            function (error) {
              console.log(error.message);
            }
          );
        },
        onRowRemoved: (e) => {
          console.log('RowRemoved');
          console.log(e);
        },
        onSaving() {
          console.log('Saving');
        },
        onSaved() {
          console.log('Saved');
        },
        onEditCanceling() {
          console.log('EditCanceling');
        },
        onEditCanceled() {
          console.log('EditCanceled');
        }
      }).dxDataGrid('instance');
    });

  }



  // Select the gridContainer element
  let gridContainer;

  const wrControl = formContext.getControl('WebResource_caseAssets');
  wrControl.getContentWindow().then(function (contentWindow) {
    console.log('HEIGHT MAIN CONTAINER:');
    console.log(contentWindow.document.getElementById('gridContainer').offsetHeight);
    gridContainer = contentWindow.document.getElementById('gridContainer');
    console.log(gridContainer);

    // Create a MutationObserver instance
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style' || mutation.type === 'childList') {
          // Get the current height of the gridContainer
          const gridContainerHeight = gridContainer.offsetHeight;
          // Set the min-height of the iframe based on the gridContainer's height if it exceeds 200px
          const iframe = wrControl.getObject();
          if (gridContainerHeight > 250) {
            iframe.style.minHeight = `${gridContainerHeight + 20}px`;
          } else {
            iframe.style.minHeight = '250px';
          }
        }
      });
    });

    // Configuration of the observer
    const config = { attributes: true, childList: true, subtree: true };

    // Start observing the gridContainer for changes
    observer.observe(gridContainer, config);
  });

  Xrm.Utility.closeProgressIndicator();

}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}