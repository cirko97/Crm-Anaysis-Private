let timeEntriesArray = [];
let assetsArray = [];
let usersArray = [];
let timeEntryTypesArray = [];
let newCreateId;

// Add hours to Date method
Date.prototype.addHours = function (h) {
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

  const timeEntryTypes = await Xrm.Utility.getEntityMetadata('extreme_timeentry', ['extreme_type']).then(
    result => result.Attributes._collection.extreme_type.OptionSet,
    error => console.log(error)
  );
  timeEntryTypesArray = Object.keys(timeEntryTypes).map(key => {
    return timeEntryTypes[key];
  });

  console.log("TYPES: ", timeEntryTypes);
  console.log("TYPES ARR: ", timeEntryTypesArray);

  console.log('User id: ' + userId);
  console.log('GUID: ' + caseIdForm);
  await getTimeEntries(caseIdForm);
  await getAssetsLookUp(accountIdForm);
  await getUsers();


  initDataGrid(caseIdForm, userId);


  // Set title for grid inside header
  const timeEntriesDisplayName = await Xrm.Utility.getEntityMetadata('extreme_timeentry').then(
    result => result._displayName,
    error => console.log(error)
  );
  console.log('TimeEntriesName: ', timeEntriesDisplayName);
  // setTimeout(() => {
  //   const toolbarBefore = Xrm.Page.getControl("WebResource_timeEntries").getObject().contentWindow.window.document.querySelector('div.dx-toolbar-before');
  //   console.log('dx toolbar before: ', toolbarBefore);
  //   toolbarBefore.innerHTML = `<span style='font-weight: 500; position: absolute; width: 100px; bottom: 30%; left: 0;'>${timeEntriesDisplayName}</span>`;
  //   console.log(formContext.data.entity);
  // }, 1000); // Adjust the timeout as needed








  // Data from DV - Xrm Web Api
  async function getTimeEntries(caseId) {

    timeEntriesArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_timeentry", `?$select=activityid,_extreme_caseline_value,extreme_comuteinkm,createdon,_ownerid_value,
      extreme_expences,scheduledstart,extreme_return,scheduleddurationminutes,scheduledend,extreme_type,description,_extreme_asset_value
      &$filter=_regardingobjectid_value eq ${caseId}`).then(
      function success(results) {
        console.log(results);
        timeEntriesArray = [];
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var activityid = result["activityid"]; // Guid
          var extreme_caseline = result["_extreme_caseline_value"]; // Lookup
          var extreme_caseline_formatted = result["_extreme_caseline_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_caseline_lookuplogicalname = result["_extreme_caseline_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_comuteinkm = result["extreme_comuteinkm"]; // Decimal
          var extreme_comuteinkm_formatted = result["extreme_comuteinkm@OData.Community.Display.V1.FormattedValue"];
          var createdon = result["createdon"]; // Date Time
          var createdon_formatted = result["createdon@OData.Community.Display.V1.FormattedValue"];
          var ownerid = result["_ownerid_value"]; // Owner
          var ownerid_formatted = result["_ownerid_value@OData.Community.Display.V1.FormattedValue"];
          var ownerid_lookuplogicalname = result["_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_expences = result["extreme_expences"]; // Decimal
          var extreme_expences_formatted = result["extreme_expences@OData.Community.Display.V1.FormattedValue"];
          var scheduledstart = result["scheduledstart"]; // Date Time
          var scheduledstart_formatted = result["scheduledstart@OData.Community.Display.V1.FormattedValue"];
          var extreme_return = result["extreme_return"]; // Boolean
          var extreme_return_formatted = result["extreme_return@OData.Community.Display.V1.FormattedValue"];
          var scheduleddurationminutes = result["scheduleddurationminutes"]; // Decimal
          var scheduleddurationminutes_formatted = result["scheduleddurationminutes@OData.Community.Display.V1.FormattedValue"];
          var scheduledend = result["scheduledend"]; // Date Time
          var scheduledend_formatted = result["scheduledend@OData.Community.Display.V1.FormattedValue"];
          var extreme_type = result["extreme_type"]; // Choice
          var extreme_type_formatted = result["extreme_type@OData.Community.Display.V1.FormattedValue"];
          var description = result["description"]; // Multiline Text
          var extreme_asset = result["_extreme_asset_value"]; // Lookup
          var extreme_asset_formatted = result["_extreme_asset_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_asset_lookuplogicalname = result["_extreme_asset_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

          timeEntriesArray.push({
            "activityid": activityid,
            "extreme_caseline": extreme_caseline,
            "extreme_asset": extreme_asset,
            "owner": ownerid,
            "scheduledstart": scheduledstart,
            "scheduledend": scheduledend,
            "extreme_type": extreme_type,
            "scheduleddurationminutes": scheduleddurationminutes,
            "extreme_comuteinkm": extreme_comuteinkm,
            "extreme_return": extreme_return,
            "extreme_expences": extreme_expences,
            "description": description
          });

        }
      },
      function (error) {
        console.log(error.message);
      }
    );

  }

  async function getUsers() {

    usersArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("systemuser", "?$select=systemuserid,fullname&$filter=(not contains(fullname,'%23') and isdisabled eq false)").then(
      function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var systemuserid = result["systemuserid"]; // Guid
          var fullname = result["fullname"]; // Text

          usersArray.push({
            "id": systemuserid,
            "name": fullname
          });

        }
      },
      function (error) {
        console.log(error.message);
      }
    );
  }

  async function getAssetsLookUp(accountId) {

    assetsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_asset", `?$select=extreme_assetid,extreme_name,extreme_serialnumber&$filter=_extreme_account_value eq ${accountId}`).then(
      function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_assetid = result["extreme_assetid"]; // Guid
          var extreme_name = result["extreme_name"]; // Text
          var extreme_serialnumber = result["extreme_serialnumber"]; // Whole Number
          var extreme_serialnumber_formatted = result["extreme_serialnumber@OData.Community.Display.V1.FormattedValue"];

          assetsArray.push({
            "id": extreme_assetid,
            "name": extreme_serialnumber ? `${extreme_serialnumber} - ${extreme_name}` : extreme_name
          });

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

      const timeEntriesData = new DevExpress.data.ArrayStore({
        key: 'activityid',
        data: timeEntriesArray,
      });

      const dataGrid = $('#gridContainer').dxDataGrid({
        dataSource: timeEntriesData,
        width: "100%",
        wordWrapEnabled: true,
        showColumnLines: true,
        showRowLines: true,
        rowAlternationEnabled: true,
        showBorders: true,
        repaintChangesOnly: true,
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
          allowAdding: true,
          allowDeleting: true,
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
            dataField: 'extreme_asset',
            caption: 'Asset',
            // lookup: {
            //   dataSource: assetsArray,
            //   displayExpr: 'name',
            //   valueExpr: 'id'
            // },
            lookup: {
              dataSource: {
                store: {
                  type: "array",
                  data: assetsArray,
                  key: "id"
                },
                paginate: true,
                pageSize: 20,
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'owner',
            caption: 'Employee',
            width: 90,
            // lookup: {
            //   dataSource: usersArray,
            //   displayExpr: 'name',
            //   valueExpr: 'id'
            // },
            lookup: {
              dataSource: {
                store: {
                  type: "array",
                  data: usersArray,
                  key: "id"
                },
                paginate: true,
                pageSize: 20,
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'scheduledstart',
            caption: 'From',
            width: 90,
            dataType: 'datetime',
            pickerType: 'rollers',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy HH:mm",
            setCellValue: async function (newData, value, currentRowData) {
              console.log('newData: ');
              console.log(newData);
              console.log('value: ');
              console.log(value);
              console.log('currentRowData: ');
              console.log(currentRowData);
              const dateFrom = new Date(value);
              const currentTime = currentRowData.scheduleddurationminutes;
              newData.scheduledend = new Date(dateFrom.addMinutes(currentTime));
              newData.scheduledstart = new Date(value);
            },
          },
          {
            dataField: 'scheduledend',
            caption: 'To',
            width: 90,
            dataType: 'datetime',
            pickerType: 'rollers',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy HH:mm"
          },
          {
            dataField: 'extreme_type',
            caption: 'Type',
            width: 70,
            lookup: {
              dataSource: timeEntryTypesArray,
              displayExpr: 'text',
              valueExpr: 'value'
            },
          },
          {
            dataField: 'scheduleddurationminutes',
            caption: 'Time spent (minutes)',
            width: 90,
            dataType: 'number',
            setCellValue: async function (newData, value, currentRowData) {
              console.log('newData: ');
              console.log(newData);
              console.log('value: ');
              console.log(value);
              console.log('currentRowData: ');
              console.log(currentRowData);
              const dateFrom = new Date(currentRowData.scheduledstart);
              const currentTime = value;
              newData.scheduledend = new Date(dateFrom.addMinutes(currentTime));
              newData.scheduleddurationminutes = value;
            }
          },
          {
            dataField: 'extreme_comuteinkm',
            caption: 'Comute (km)',
            width: 90,
            dataType: 'number'
          },
          {
            dataField: 'extreme_return',
            caption: 'Return?',
            width: 90,
            dataType: 'boolean'
          },
          {
            dataField: 'extreme_expences',
            caption: 'Expences',
            width: 90,
            dataType: 'number'
          },
          {
            dataField: 'description',
            caption: 'Description',
            width: 300,
            dataType: 'string'
          }
        ],
        toolbar: {
          items: [
            {
              location: 'before',
              template() {
                return $('<div>')
                  .addClass('grid-title')
                  .text(`${timeEntriesDisplayName}`)
              },
            },
            {
              name: 'addRowButton',
              showText: 'always'
            }
            // {
            //   location: 'after',
            //   widget: 'dxButton',
            //   options: {
            //     text: 'Delete Selected Records',
            //     icon: 'trash',
            //     disabled: true,
            //     onClick() {
            //       dataGrid.getSelectedRowKeys().forEach((key) => {
            //         employeesStore.remove(key);
            //       });
            //       dataGrid.refresh();
            //     },
            //   },
            // }
          ],
        },
        onSelectionChanged(data) {
          dataGrid.option('toolbar.items[1].options.disabled', !data.selectedRowsData.length);
        },
        onEditorPreparing: async (e) => {
          console.log('Editor Preparing');
          console.log(e);
          // if (e.dataField == "createdon") e.editorOptions.disabled = true;
          if (e.dataField == "extreme_asset") e.editorOptions.onOpened = function (e) { e.component._popup.option('width', 400); };
          if (e.dataField == "scheduledend") e.editorOptions.disabled = true;
          if (e.dataField == "extreme_type") e.editorOptions.disabled = true;
          if (e.dataField == "scheduledstart") e.editorOptions.pickerType = "rollers";
          if (e.row.data.extreme_caseline) {
            if (e.dataField == "owner") e.editorOptions.disabled = true;
            if (e.dataField == "scheduleddurationminutes") e.editorOptions.disabled = true;
            if (e.dataField == "extreme_asset") e.editorOptions.disabled = true;
          }

          if (e.dataField === "description") {
            e.editorName = "dxTextArea";
            e.editorOptions.autoResizeEnabled = true;
            setTimeout(() => {
              // console.log(e.editorElement[0].querySelector("textarea"));
              e.editorElement[0].querySelector("textarea").style.lineHeight = "1.6";
              e.editorElement[0].querySelector("textarea").style.height = "auto";
            }, 200);
          }


        },
        onEditingStart: (e) => {
          console.log('EditingStart');
          console.log(e);
        },
        onInitNewRow: async (e) => {
          console.log('InitNewRow');
          console.log(e);
          console.log(timeEntriesData._array);

          let maxDate = null;
          let dateToFromMax = null;
          if (timeEntriesData._array.length > 0) {
            maxDate = new Date(-8640000000000000); // Initialize with the earliest possible date
            timeEntriesData._array.forEach((item) => {
              const scheduledEnd = new Date(item.scheduledend);
              if (scheduledEnd > maxDate) {
                maxDate = scheduledEnd;
              }
            });
            dateToFromMax = new Date(maxDate);
            dateToFromMax.addMinutes(60);
          }
          else {
            maxDate = new Date();
            dateToFromMax = new Date(maxDate);
            dateToFromMax.addMinutes(60);
          }

          e.data.owner = usersArray.find(item => item.id === userId.toLowerCase()).id;
          e.data.ownername = usersArray.find(item => item.id === userId.toLowerCase()).name;
          e.data.extreme_return = false;
          e.data.scheduledstart = maxDate;
          e.data.scheduledend = dateToFromMax;
          e.data.extreme_type = timeEntryTypesArray.find(item => item.value == 424000001).value;
          // if (oneAssetId !== undefined && oneAssetId !== 'none') e.data.extreme_asset = assetsArray.find(item => item.id === oneAssetId).id

        },
        onRowInserting: async (e) => {

          console.log('RowInserting');
          console.log(e);

          Xrm.Utility.showProgressIndicator('Loading... Please wait...');

          newCreateId = '';
          var record = {};
          record["regardingobjectid_extreme_case_extreme_timeentry@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
          record["extreme_Asset_extreme_TimeEntry@odata.bind"] = `/extreme_assets(${e.data.extreme_asset})`; // Lookup
          record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${e.data.owner})`; // Owner
          record.subject = e.data.ownername;
          record.scheduledstart = e.data.scheduledstart; // Date Time
          record.scheduledend = e.data.scheduledend; // Date Time
          record.extreme_type = e.data.extreme_type; // Choice
          record.scheduleddurationminutes = e.data.scheduleddurationminutes; // Decimal
          record.extreme_comuteinkm = e.data.extreme_comuteinkm; // Decimal
          record.extreme_return = e.data.extreme_return; // Boolean
          record.extreme_expences = e.data.extreme_expences; // Decimal

          await Xrm.WebApi.createRecord("extreme_timeentry", record).then(
            async function success(result) {
              var newId = result.id;
              newCreateId = newId;
              if (timeEntriesData._array.length > 0) {
                console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
                timeEntriesData._array[timeEntriesData._array.length - 1].activityid = newId;
                console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
                await getTimeEntries(caseIdForm);
                dataGrid.refresh();
              } else {
                console.log('timeEntriesData._array is empty');
              }
              console.log('NEW CREATED ID: ' + newCreateId);
            },
            function (error) {
              console.log(error.message);
            }
          );
        },
        onRowInserted: async (e) => {

          // setTimeout(async () => {

            console.log('RowInserted');
            console.log(e);

            let newAssetCreated = false;
            await Xrm.WebApi.retrieveMultipleRecords("extreme_caseasset", `?$select=extreme_caseassetid&$filter=(_extreme_case_value eq ${caseIdForm} and _extreme_asset_value eq ${e.data.extreme_asset})`).then(
              async function success(results) {
                console.log(results);
                if (results.entities.length === 0) newAssetCreated = true;
              },
              function (error) {
                console.log(error.message);
              }
            );
            if (newAssetCreated === true) {
              var record = {};
              record["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
              record["extreme_Asset@odata.bind"] = `/extreme_assets(${e.data.extreme_asset})`; // Lookup

              await Xrm.WebApi.createRecord("extreme_caseasset", record).then(
                function success(result) {
                  var newId = result.id;
                  console.log(newId);
                },
                function (error) {
                  console.log(error.message);
                }
              );
            }

            // if (timeEntriesData._array.length > 0) {
            //   console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
            //   timeEntriesData._array[timeEntriesData._array.length - 1].activityid = newCreateId;
            //   console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
            //   await getTimeEntries(caseIdForm);
            //   dataGrid.refresh();
            // } else {
            //   console.log('timeEntriesData._array is empty');
            // }

            if (newAssetCreated === true) await Xrm.Page.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);

            Xrm.Utility.closeProgressIndicator();

          // }, 1000);


        },
        onRowUpdating: async (e) => {
          console.log('RowUpdating');
          console.log(e);

          const oldDataAssetId = e.newData.extreme_asset;

          var record = {};
          if (e.newData.extreme_asset) record["extreme_Asset_extreme_TimeEntry@odata.bind"] = `/extreme_assets(${e.newData.extreme_asset})`; // Lookup
          if (e.newData.owner) record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${e.newData.owner})`; // Owner
          if (e.newData.scheduledstart) record.scheduledstart = e.newData.scheduledstart; // Date Time
          if (e.newData.scheduledend) record.scheduledend = e.newData.scheduledend; // Date Time
          if (e.newData.extreme_type) record.extreme_type = e.newData.extreme_type; // Choice
          if (e.newData.scheduleddurationminutes) record.scheduleddurationminutes = e.newData.scheduleddurationminutes; // Decimal
          if (e.newData.extreme_comuteinkm) record.extreme_comuteinkm = e.newData.extreme_comuteinkm; // Decimal
          if (typeof e.newData.extreme_return === "boolean") record.extreme_return = e.newData.extreme_return; // Boolean
          if (e.newData.extreme_expences) record.extreme_expences = e.newData.extreme_expences; // Decimal
          if (e.newData.description) record.description = e.newData.description; // Text

          await Xrm.WebApi.updateRecord("extreme_timeentry", `${e.key}`, record).then(
            async function success(result) {
              var updatedId = result.id;
              console.log(record);
              await getTimeEntries(caseIdForm);
              dataGrid.refresh();
            },
            function (error) {
              console.log(error.message);
            }
          );

          if (e.newData.extreme_asset) {
            // Check case assets after removing
            await checkAssetsAfterDelete(oldDataAssetId, caseIdForm);
            // Refresh grid for case assets
            await Xrm.Page.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          }
        },
        onRowUpdated() {
          console.log('RowUpdated');
        },
        onRowRemoving: async (e) => {
          console.log('RowRemoving');
          console.log(e);
          if (e.data.extreme_caseline) {
            // Delete case line on another web resource
            await Xrm.Page.getControl('WebResource_caseLines').getObject().contentWindow.window.deleteCaseLine(e.data.extreme_caseline);
            // Refresh grid for case lines
            await Xrm.Page.getControl('WebResource_caseLines').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          }
          await Xrm.WebApi.deleteRecord("extreme_timeentry", `${e.key}`).then(
            async function success(result) {
              console.log('DELETED SUCCESS: ' + result);
              await getTimeEntries(caseIdForm);
              dataGrid.refresh();
            },
            function (error) {
              console.log("Error: ", error.message);
            }
          );
          await checkAssetsAfterDelete(e.data.extreme_asset, caseIdForm);
          // Refresh grid for case assets
          await Xrm.Page.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);

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

  const wrControl = formContext.getControl('WebResource_timeEntries');
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
          if (gridContainerHeight > 350) {
            iframe.style.minHeight = `${gridContainerHeight + 20}px`;
          } else {
            iframe.style.minHeight = '350px';
          }
        }
      });
    });

    // Configuration of the observer
    const config = { attributes: true, childList: true, subtree: true };

    // Start observing the gridContainer for changes
    observer.observe(gridContainer, config);
  });


  // const wrControl = formContext.getControl('WebResource_timeEntries');
  // wrControl.getContentWindow().then(function (contentWindow) {
  //   console.log('HEIGHT MAIN CONTAINER:');
  //   console.log(contentWindow.document.getElementById('timeEntriesMainContainer').offsetHeight);
  //   wrControl.getObject().style.minHeight = `${contentWindow.document.getElementById('timeEntriesMainContainer').offsetHeight}px`;
  // });

  Xrm.Utility.closeProgressIndicator();

}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}

// Create time entry
async function createTimeEntry(assetId, caseId, caseLineId, ownerId, ownerName, description, dateTimeFrom, dateTimeTo, typeId, timeSpent, returnValue) {

  const dateFromFormat = new Date(dateTimeFrom);
  const dateToFormat = new Date(dateTimeTo);

  var record = {};
  record["regardingobjectid_extreme_case_extreme_timeentry@odata.bind"] = `/extreme_cases(${caseId})`; // Lookup
  record["extreme_CaseLine_extreme_TimeEntry@odata.bind"] = `/extreme_caselines(${caseLineId})`; // Lookup
  record["extreme_Asset_extreme_TimeEntry@odata.bind"] = `/extreme_assets(${assetId})`; // Lookup
  record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${ownerId})`; // Owner
  record.scheduledstart = dateFromFormat; // Date Time
  record.scheduledend = dateToFormat; // Date Time
  record.extreme_type = timeEntryTypesArray.find(item => item.value = typeId).value; // Choice
  record.scheduleddurationminutes = timeSpent; // Decimal
  record.extreme_return = returnValue; // Boolean
  record.subject = ownerName;
  record.description = description;

  await Xrm.WebApi.createRecord("extreme_timeentry", record).then(
    function success(result) {
      var newId = result.id;
      console.log(newId);
      return newId;
    },
    function (error) {
      console.log(error.message);
    }
  );
}

// Update time entry
async function updateTimeEntry(caseLineId, assetId, ownerId, timeSpent) {

  await Xrm.WebApi.retrieveMultipleRecords("extreme_timeentry", `?$select=activityid,scheduledstart&$filter=_extreme_caseline_value eq ${caseLineId}`).then(
    async function success(results) {
      console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var activityid = result["activityid"]; // Guid
        var scheduledstart = result["scheduledstart"]; // Date Time
        var scheduledstart_formatted = result["scheduledstart@OData.Community.Display.V1.FormattedValue"];
        const dateFrom = new Date(scheduledstart);

        var record = {};
        record["extreme_Asset_extreme_TimeEntry@odata.bind"] = `/extreme_assets(${assetId})`; // Lookup
        record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${ownerId})`; // Owner
        record.scheduleddurationminutes = timeSpent; // Decimal
        record.scheduledend = new Date(dateFrom.addMinutes(timeSpent)).toISOString(); // Date Time

        await Xrm.WebApi.updateRecord("extreme_timeentry", `${activityid}`, record).then(
          function success(result) {
            var updatedId = result.id;
            console.log(updatedId);
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
}

// Delete time entry
async function deleteTimeEntry(caseLineId) {
  await Xrm.WebApi.retrieveMultipleRecords("extreme_timeentry", `?$select=activityid&$filter=_extreme_caseline_value eq ${caseLineId}`).then(
    async function success(results) {
      // console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var activityid = result["activityid"]; // Guid

        await Xrm.WebApi.deleteRecord("extreme_timeentry", `${activityid}`).then(
          function success(result) {
            // console.log(result);
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
}

// Check assets on delete
async function checkAssetsAfterDelete(assetId, caseId) {

  let assetExistsInTimeEntries = true;
  let assetExistsInCaseLines = true;

  await Xrm.WebApi.retrieveMultipleRecords("extreme_caseline", `?$select=extreme_caselineid&$filter=(_extreme_case_value eq ${caseId} and _extreme_asset_value eq ${assetId})`).then(
    function success(results) {
      console.log(results);
      if (results.entities.length === 0) assetExistsInCaseLines = false;
    },
    function (error) {
      console.log(error.message);
    }
  );

  await Xrm.WebApi.retrieveMultipleRecords("extreme_timeentry", `?$select=_extreme_asset_value&$filter=(_extreme_asset_value eq ${assetId} and _regardingobjectid_value eq ${caseId})`).then(
    async function success(results) {
      console.log(results);
      if (results.entities.length === 0) assetExistsInTimeEntries = false;
    },
    function (error) {
      console.log(error.message);
    }
  );

  if (assetExistsInCaseLines === false && assetExistsInTimeEntries === false) {
    await Xrm.WebApi.retrieveMultipleRecords("extreme_caseasset", `?$select=extreme_caseassetid&$filter=(_extreme_case_value eq ${caseId} and _extreme_asset_value eq ${assetId})`).then(
      async function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_caseassetid = result["extreme_caseassetid"]; // Guid

          await Xrm.WebApi.deleteRecord("extreme_caseasset", `${extreme_caseassetid}`).then(
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
  }

}