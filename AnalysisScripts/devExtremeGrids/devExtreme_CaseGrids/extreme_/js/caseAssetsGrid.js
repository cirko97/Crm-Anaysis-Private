let caseAssetsArray = [];
let usersArray = [];
let timeEntryTypesArray = [];
let preventiveCycleTypesArray = [];
let newCreateId;
let isEditable = true;
let heightAuto = true;

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

  // Xrm.Utility.showProgressIndicator('Loading... Please wait...');

  if (
    formContext.getAttribute("statuscode").getValue() === 1 ||
    formContext.getAttribute("statuscode").getValue() === 934670001
  ) {
    isEditable = true;
  }
  else {
    isEditable = false;
  }

  const preventiveCycleTypes = await Xrm.Utility.getEntityMetadata('extreme_asset', ['extreme_preventiveservicecycle']).then(
    result => result.Attributes._collection.extreme_preventiveservicecycle.OptionSet,
    error => console.log(error)
  );
  preventiveCycleTypesArray = Object.keys(preventiveCycleTypes).map(key => {
    return preventiveCycleTypes[key];
  });

  console.log('preventiveCycleTypesArray');
  console.log(preventiveCycleTypesArray);

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

    await Xrm.WebApi.retrieveMultipleRecords("extreme_caseasset", `?$select=extreme_isparent,_extreme_parentcaseasset_value,extreme_caseassetid,extreme_description,extreme_solution&$expand=extreme_Asset($select=extreme_preventiveservicecycle,extreme_assetid,extreme_location,extreme_serialnumber,extreme_warrantyend,extreme_warrantyenddatevendor,extreme_warrantystartdate,extreme_assetcode,extreme_lastactivitydate,extreme_name,extreme_serialnumber,extreme_warrantyend,extreme_warrantyenddatevendor)&$filter=_extreme_case_value eq ${caseId}`).then(
      function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_caseassetid = result["extreme_caseassetid"]; // Guid

          // Many To One Relationships
          if (result.hasOwnProperty("extreme_Asset") && result["extreme_Asset"] !== null) {
            var extreme_Asset_extreme_assetid = result["extreme_Asset"]["extreme_assetid"]; // Guid
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
            var extreme_isparent = result["extreme_isparent"]; // Boolean
            var extreme_parentcaseasset = result["_extreme_parentcaseasset_value"]; // Lookup
            var extreme_Asset_extreme_location = result["extreme_Asset"]["extreme_location"]; // Text
            var extreme_Asset_extreme_warrantystartdate = result["extreme_Asset"]["extreme_warrantystartdate"]; // Date Time
            var extreme_Asset_extreme_warrantystartdate_formatted = result["extreme_Asset"]["extreme_warrantystartdate@OData.Community.Display.V1.FormattedValue"];
            var extreme_Asset_extreme_preventiveservicecycle = result["extreme_Asset"]["extreme_preventiveservicecycle"]; // Choice

            caseAssetsArray.push({
              "extreme_caseassetid": extreme_caseassetid,
              "extreme_assetid": extreme_Asset_extreme_assetid,
              "extreme_name": extreme_Asset_extreme_name,
              "extreme_assetcode": extreme_Asset_extreme_assetcode,
              "extreme_lastactivitydate": extreme_Asset_extreme_lastactivitydate,
              "extreme_serialnumber": extreme_Asset_extreme_serialnumber,
              "extreme_location": extreme_Asset_extreme_location,
              "extreme_warrantystartdate": extreme_Asset_extreme_warrantystartdate,
              "extreme_warrantyend": extreme_Asset_extreme_warrantyend,
              "extreme_warrantyenddatevendor": extreme_Asset_extreme_warrantyenddatevendor,
              "extreme_description": extreme_description,
              "extreme_solution": extreme_solution,
              "extreme_isparent": extreme_isparent,
              "extreme_parentcaseasset": extreme_parentcaseasset,
              "extreme_preventiveservicecycle": extreme_Asset_extreme_preventiveservicecycle
            });
          }

        }

        console.log('caseAssetsArray');
        console.log(caseAssetsArray);

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
        filterValue: [
          [
            ["extreme_parentcaseasset", "=", null],
            "and",
            ["extreme_isparent", "=", false]
          ],
          "or",
          [
            ["extreme_parentcaseasset", "=", null],
            "and",
            ["extreme_isparent", "=", true]
          ],
        ],
        width: "100%",
        wordWrapEnabled: true,
        showColumnLines: true,
        showRowLines: true,
        rowAlternationEnabled: false,
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
          allowUpdating: isEditable,
          allowAdding: false,
          allowDeleting: false,
          useIcons: true
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
        masterDetail: {
          enabled: true,
          async template(container, options) {
            const assetData = options.data;

            container.css('padding', '0 0 10px 10px');
            container.css('background', '#e5edfe');

            $(`<div id="${assetData.extreme_caseassetid}" class="child-grid">`)
              .dxDataGrid({
                dataSource: caseAssetsData,
                filterValue: [
                  ["extreme_isparent", "=", false],
                  "and",
                  ["extreme_parentcaseasset", "=", assetData.extreme_caseassetid]
                ],
                width: "100%",
                wordWrapEnabled: true,
                showColumnLines: true,
                showRowLines: true,
                rowAlternationEnabled: false,
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
                  allowUpdating: isEditable,
                  allowAdding: false,
                  allowDeleting: false,
                  useIcons: true
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
                  {
                    dataField: 'extreme_parentcaseasset',
                    caption: 'Parent CA',
                    dataType: 'string',
                    visible: dataGrid.columnOption("extreme_parentcaseasset", "visible")
                  },
                  {
                    dataField: 'extreme_isparent',
                    caption: 'Is Parent',
                    dataType: 'boolean',
                    visible: dataGrid.columnOption("extreme_isparent", "visible")
                  },
                ],
                onSelectionChanged(data) {
                  dataGrid.option('toolbar.items[1].options.disabled', !data.selectedRowsData.length);
                },
                onRowPrepared: async (e) => {
                  console.log('ROW PREPARED');
                  console.log(e);

                  // Check calssify
                  if (typeof (e.isNewRow) === 'undefined' && e.rowType === 'data' && (e.data.extreme_isparent === true || e.data.extreme_isparent === false) && (
                    (e.data.extreme_serialnumber === null || e.data.extreme_serialnumber === undefined) ||
                    (e.data.extreme_location === null || e.data.extreme_location === undefined) ||
                    (e.data.extreme_warrantystartdate === null || e.data.extreme_warrantystartdate === undefined) ||
                    (e.data.extreme_warrantyend === null || e.data.extreme_warrantyend === undefined) ||
                    (e.data.extreme_warrantyenddatevendor === null || e.data.extreme_warrantyenddatevendor === undefined) ||
                    (e.data.extreme_preventiveservicecycle === null || e.data.extreme_preventiveservicecycle === undefined)
                  )) {
                    // promeniti bg color za classify
                    e.rowElement[0].style.backgroundColor = "#fce3c2";
                  }
                  else if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && e.data.extreme_isparent === true && caseAssetsData._array.find(item =>
                    (item.extreme_serialnumber === null || item.extreme_serialnumber === undefined) ||
                    (item.extreme_location === null || item.extreme_location === undefined) ||
                    (item.extreme_warrantystartdate === null || item.extreme_warrantystartdate === undefined) ||
                    (item.extreme_warrantyend === null || item.extreme_warrantyend === undefined) ||
                    (item.extreme_warrantyenddatevendor === null || item.extreme_warrantyenddatevendor === undefined) ||
                    (item.extreme_preventiveservicecycle === null || item.extreme_preventiveservicecycle === undefined)
                  )) {
                    e.cells[1].cellElement[0].style.backgroundColor = "#fce3c2";
                  }
                  else {
                    e.rowElement[0].style.backgroundColor = "#fff";
                  }

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
                  if (e.newData.extreme_description) record.extreme_description = e.newData.extreme_description; // Multiline Text
                  if (e.newData.extreme_solution) record.extreme_solution = e.newData.extreme_solution; // Multiline Text

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
              }).appendTo(container);
          },
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
            dataField: 'extreme_location',
            caption: 'Location',
            dataType: 'string',
            allowEditing: false,
            visible: false
          },
          {
            dataField: 'extreme_warrantystartdate',
            caption: 'Warranty start',
            dataType: 'date',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy",
            allowEditing: false,
            visble: false,
            editorOptions: {
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                }
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            }
          },
          {
            dataField: 'extreme_warrantyend',
            caption: 'Warranty end',
            dataType: 'date',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy",
            allowEditing: false,
            editorOptions: {
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                }
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            }
          },
          {
            dataField: 'extreme_warrantyenddatevendor',
            caption: 'Warranty end (vendor)',
            dataType: 'date',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy",
            allowEditing: false,
            editorOptions: {
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                }
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            }
          },
          {
            dataField: 'extreme_preventiveservicecycle',
            caption: 'PSC Duration',
            width: 130,
            wordWrapEnabled: false,
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: preventiveCycleTypesArray,
                    key: "value"
                  },
                  paginate: true,
                  pageSize: 20,
                  postProcess: function (data) {
                    // data.unshift({ name: "Price list", amount: "Price", disabled: true });
                    return data;
                  }
                }
              },
              displayExpr: 'text',
              valueExpr: 'value'
            },
            editorOptions: {
              acceptCustomValue: false,
              // popupWidth: 600,
              searchEnabled: true,
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  if (iframeCorrentHeight < 450) {
                    wrControl.getObject().style.minHeight = "600px";
                  }
                }
                e.component._popup.option('width', 400);
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            visible: false
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
          {
            dataField: 'extreme_parentcaseasset',
            caption: 'Parent CA',
            dataType: 'string',
            visible: false
          },
          {
            dataField: 'extreme_isparent',
            caption: 'Is Parent',
            dataType: 'boolean',
            visible: false
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
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                text: 'Normal',
                width: 'auto',
                elementAttr: {
                  id: "normalBtn",
                },
                disabled: true,
                onClick(e) {
                  console.log(e);
                  console.log(dataGrid);
                  // reset visible for all columns - classify
                  console.log('ALL COLUMNS');
                  console.log(dataGrid.option('columns'));
                  dataGrid.option('columns').forEach(col => {
                    if (
                      col.dataField == "extreme_name" ||
                      col.dataField == "extreme_assetcode" ||
                      col.dataField == "extreme_lastactivitydate" ||
                      col.dataField == "extreme_serialnumber" ||
                      col.dataField == "extreme_warrantyend" ||
                      col.dataField == "extreme_warrantyenddatevendor" ||
                      col.dataField == "extreme_description" ||
                      col.dataField == "extreme_solution"
                    ) {
                      dataGrid.columnOption(col.dataField, 'visible', true);
                      if (col.dataField == "extreme_description" || col.dataField == "extreme_solution") {
                        dataGrid.columnOption(col.dataField, 'allowEditing', true);
                      }
                      else {
                        dataGrid.columnOption(col.dataField, 'allowEditing', false);
                      }
                    }
                    else {
                      dataGrid.columnOption(col.dataField, 'visible', false);
                      dataGrid.columnOption(col.dataField, 'allowEditing', false);
                    }
                  });

                  dataGrid.option('filterValue', [
                    [
                      ["extreme_parentcaseasset", "=", null],
                      "and",
                      ["extreme_isparent", "=", false]
                    ],
                    "or",
                    [
                      ["extreme_parentcaseasset", "=", null],
                      "and",
                      ["extreme_isparent", "=", true]
                    ],
                  ]);

                  $('#classifyBtn').dxButton('instance').option('disabled', false);
                  e.component.option('disabled', true);
                },
              },
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                text: 'Classify',
                width: 'auto',
                elementAttr: {
                  id: "classifyBtn",
                },
                disabled: false,
                onClick(e) {
                  console.log(e);
                  console.log(dataGrid);
                  // reset visible for all columns - classify
                  console.log('ALL COLUMNS');
                  console.log(dataGrid.option('columns'));
                  dataGrid.option('columns').forEach(col => {
                    if (
                      col.dataField == "extreme_name" ||
                      col.dataField == "extreme_serialnumber" ||
                      col.dataField == "extreme_location" ||
                      col.dataField == "extreme_warrantystartdate" ||
                      col.dataField == "extreme_warrantyend" ||
                      col.dataField == "extreme_warrantyenddatevendor" ||
                      col.dataField == "extreme_preventiveservicecycle"
                    ) {
                      dataGrid.columnOption(col.dataField, 'visible', true);
                      if (col.dataField !== "extreme_name") {
                        dataGrid.columnOption(col.dataField, 'allowEditing', true);
                      }
                      else {
                        dataGrid.columnOption(col.dataField, 'allowEditing', false);
                      };
                    }
                    else {
                      dataGrid.columnOption(col.dataField, 'visible', false);
                      dataGrid.columnOption(col.dataField, 'allowEditing', false);
                    }
                  });

                  caseAssetsData._array.filter(item => item.extreme_isparent === true).forEach(elm => {
                    dataGrid.collapseRow(elm.extreme_caseassetid);
                  })

                  dataGrid.option('filterValue', [
                    [
                      ["extreme_serialnumber", "=", null],
                      "or",
                      ["extreme_location", "=", null],
                      "or",
                      ["extreme_warrantystartdate", "=", null],
                      "or",
                      ["extreme_warrantyend", "=", null],
                      "or",
                      ["extreme_warrantyenddatevendor", "=", null],
                      "or",
                      ["extreme_preventiveservicecycle", "=", null]
                    ]
                  ]);

                  $('#normalBtn').dxButton('instance').option('disabled', false);
                  e.component.option('disabled', true);
                },
              },
            }
          ],
        },
        onSelectionChanged(data) {
          dataGrid.option('toolbar.items[1].options.disabled', !data.selectedRowsData.length);
        },
        onRowPrepared: async (e) => {
          console.log('ROW PREPARED');
          console.log(e);

          if (e.rowType === 'data' && !e.data.extreme_isparent && e.data.extreme_caseassetid) {
            console.log('REMOVED EXPAND FOR ', e.data.extreme_caseassetid);
            console.log(dataGrid.hasEditData());
            console.log(e.cells[1].cellElement[0]);
            e.cells[0].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
            e.cells[0].cellElement[0].classList.remove('dx-datagrid-expand');
            // e.cells[1].cellElement[0].style.display = "none";
            // e.cells[2]?.cellElement?.[0].setAttribute('colspan', '2');
          }
          else if (e.rowType === 'data' && $('#classifyBtn').dxButton('instance').option('disabled') === true) {
            e.cells[0].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
            e.cells[0].cellElement[0].classList.remove('dx-datagrid-expand');
          }


          // Check calssify
          if (typeof (e.isNewRow) === 'undefined' && e.rowType === 'data' && (e.data.extreme_isparent === true || e.data.extreme_isparent === false) && (
            (e.data.extreme_serialnumber === null || e.data.extreme_serialnumber === undefined) ||
            (e.data.extreme_location === null || e.data.extreme_location === undefined) ||
            (e.data.extreme_warrantystartdate === null || e.data.extreme_warrantystartdate === undefined) ||
            (e.data.extreme_warrantyend === null || e.data.extreme_warrantyend === undefined) ||
            (e.data.extreme_warrantyenddatevendor === null || e.data.extreme_warrantyenddatevendor === undefined) ||
            (e.data.extreme_preventiveservicecycle === null || e.data.extreme_preventiveservicecycle === undefined)
          )) {
            // promeniti bg color za classify
            e.rowElement[0].style.backgroundColor = "#fce3c2";
          }
          else if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && e.data.extreme_isparent === true && caseAssetsData._array.find(item =>
            (item.extreme_serialnumber === null || item.extreme_serialnumber === undefined) ||
            (item.extreme_location === null || item.extreme_location === undefined) ||
            (item.extreme_warrantystartdate === null || item.extreme_warrantystartdate === undefined) ||
            (item.extreme_warrantyend === null || item.extreme_warrantyend === undefined) ||
            (item.extreme_warrantyenddatevendor === null || item.extreme_warrantyenddatevendor === undefined) ||
            (item.extreme_preventiveservicecycle === null || item.extreme_preventiveservicecycle === undefined)
          )) {
            e.cells[0].cellElement[0].style.backgroundColor = "#fce3c2";
          }
          else {
            e.rowElement[0].style.backgroundColor = "#fff";
          }

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
          var assetRecord = {};
          if (e.newData.extreme_description) record.extreme_description = e.newData.extreme_description; // Multiline Text
          if (e.newData.extreme_solution) record.extreme_solution = e.newData.extreme_solution; // Multiline Text

          if (e.newData.extreme_serialnumber) assetRecord.extreme_serialnumber = `${e.newData.extreme_serialnumber}`; // Text
          if (e.newData.extreme_location) assetRecord.extreme_location = `${e.newData.extreme_location}`; // Text
          if (e.newData.extreme_warrantystartdate) assetRecord.extreme_warrantystartdate = e.newData.extreme_warrantystartdate; // Date Time
          if (e.newData.extreme_warrantyend) assetRecord.extreme_warrantyend = e.newData.extreme_warrantyend; // Date Time
          if (e.newData.extreme_warrantyenddatevendor) assetRecord.extreme_warrantyenddatevendor = e.newData.extreme_warrantyenddatevendor; // Date Time
          if (e.newData.extreme_preventiveservicecycle) assetRecord.extreme_preventiveservicecycle = e.newData.extreme_preventiveservicecycle; // Choice

          await Xrm.WebApi.updateRecord("extreme_asset", `${e.oldData.extreme_assetid}`, assetRecord).then(
            function success(result) {
              var updatedId = result.id;
              console.log(updatedId);
            },
            function (error) {
              console.log(error.message);
            }
          );

          await Xrm.WebApi.updateRecord("extreme_caseasset", `${e.key}`, record).then(
            async function success(result) {
              var updatedId = result.id;
              console.log(updatedId);
            },
            function (error) {
              console.log(error.message);
            }
          );

          await getCaseAssets(caseIdForm);
          dataGrid.refresh();

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
        },
        onContentReady() {
          checkClassifyRows();
        }
      }).dxDataGrid('instance');


      // function for checking classify needed rows
      const checkClassifyRows = () => {

        let classifyNeededRows = 0;

        if (caseAssetsData._array.length > 0) {
          caseAssetsData._array.filter((item) =>
          // item.extreme_isparentitem === false &&
          (
            (item.extreme_serialnumber === null || item.extreme_serialnumber === undefined) ||
            (item.extreme_location === null || item.extreme_location === undefined) ||
            (item.extreme_warrantystartdate === null || item.extreme_warrantystartdate === undefined) ||
            (item.extreme_warrantyend === null || item.extreme_warrantyend === undefined) ||
            (item.extreme_warrantyenddatevendor === null || item.extreme_warrantyenddatevendor === undefined) ||
            (item.extreme_preventiveservicecycle === null || item.extreme_preventiveservicecycle === undefined)
          )
          ).forEach((item) => {
            classifyNeededRows += 1;
          })
        }

        if (classifyNeededRows > 0) {
          $('#classifyBtn')[0].style.backgroundColor = '#fce3c2';
          $('#classifyBtn')[0].style.display = 'inline-flex';
        }
        else {
          $('#classifyBtn')[0].style.backgroundColor = '#fff';
          $('#classifyBtn')[0].style.display = 'none';
        }

        console.log('CLASSIFY NEEDED ROWS');
        console.log(classifyNeededRows);

      }

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
          if (heightAuto === true) {
            if (gridContainerHeight > 250) {
              iframe.style.minHeight = `${gridContainerHeight + 20}px`;
            } else {
              iframe.style.minHeight = '250px';
            }
          }
        }
      });
    });

    // Configuration of the observer
    const config = { attributes: true, childList: true, subtree: true };

    // Start observing the gridContainer for changes
    observer.observe(gridContainer, config);
  });

  // Xrm.Utility.closeProgressIndicator();

}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}