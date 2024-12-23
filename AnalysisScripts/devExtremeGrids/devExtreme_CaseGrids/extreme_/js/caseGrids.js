let caseLinesArray = [];
let assetsArray = [];
let usersArray = [];
let productsArray = [];
let unitsArray = [];
let newCreateId;
let oneAssetId = undefined;
let timeEntryTypesArray = [];
let isEditable = true;
let treeView;

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

  const productTypes = await Xrm.Utility.getEntityMetadata('product', ['producttypecode']).then(
    result => result.Attributes._collection.producttypecode.OptionSet,
    error => console.log(error)
  );
  const productTypesArray = Object.keys(productTypes).map(key => {
    return productTypes[key];
  });

  console.log("TYPES: ", productTypes);
  console.log("TYPES ARR: ", productTypesArray);

  console.log('User id: ' + userId);
  console.log('GUID: ' + caseIdForm);
  await getCaseLines(caseIdForm);
  await getAssetsLookUp(accountIdForm);
  await getUsers();
  await getProductsLookUp();
  await getUnitsLookUp();


  initDataGrid(caseIdForm, userId);


  // Set title for grid inside header
  const caseLineDisplayName = await Xrm.Utility.getEntityMetadata('extreme_caseline').then(
    result => result._displayName,
    error => console.log(error)
  );
  // setTimeout(() => {
  //   const toolbarBefore = Xrm.Page.getControl("WebResource_caseLines").getObject().contentWindow.window.document.querySelector('div.dx-toolbar-before');
  //   console.log('dx toolbar before: ', toolbarBefore);
  //   toolbarBefore.innerHTML = `<span style='font-weight: 500; position: absolute; width: 100px; bottom: 30%; left: 0;'>${caseLineDisplayName}</span>`;
  //   console.log(formContext.data.entity);
  // }, 1000); // Adjust the timeout as needed








  // Data from DV - Xrm Web Api
  async function getCaseLines(caseId) {

    caseLinesArray = [];
    oneAssetId = undefined;

    Xrm.WebApi.retrieveMultipleRecords("extreme_caseasset", `?$select=_extreme_asset_value,_extreme_case_value&$filter=_extreme_case_value eq ${caseIdForm}`).then(
      function success(results) {
        console.log(results);
        if (results.entities.length === 1) {
          for (var i = 0; i < results.entities.length; i++) {
            var result = results.entities[i];
            // Columns
            var extreme_caseassetid = result["extreme_caseassetid"]; // Guid
            var extreme_asset = result["_extreme_asset_value"]; // Lookup
            var extreme_asset_formatted = result["_extreme_asset_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_asset_lookuplogicalname = result["_extreme_asset_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
            var extreme_case = result["_extreme_case_value"]; // Lookup
            var extreme_case_formatted = result["_extreme_case_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_case_lookuplogicalname = result["_extreme_case_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

            oneAssetId = extreme_asset;

          }
        }
        else if (results.entities.length === 0) {
          oneAssetId = 'none';
        }
        else {
          oneAssetId = [];

          for (var i = 0; i < results.entities.length; i++) {
            var result = results.entities[i];
            // Columns
            var extreme_caseassetid = result["extreme_caseassetid"]; // Guid
            var extreme_asset = result["_extreme_asset_value"]; // Lookup
            var extreme_asset_formatted = result["_extreme_asset_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_asset_lookuplogicalname = result["_extreme_asset_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
            var extreme_case = result["_extreme_case_value"]; // Lookup
            var extreme_case_formatted = result["_extreme_case_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_case_lookuplogicalname = result["_extreme_case_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

            oneAssetId.push(extreme_asset);
          }
        }
      },
      function (error) {
        console.log(error.message);
      }
    );

    await Xrm.WebApi.retrieveMultipleRecords("extreme_caseline",
      `?$select=extreme_caselineid,_extreme_asset_value,_extreme_case_value,extreme_name,_ownerid_value,_extreme_product_value,extreme_quantity,_extreme_unit_value
      &$expand=extreme_Product($select=producttypecode)&$filter=_extreme_case_value eq ${caseId}`).then(
        function success(results) {
          console.log(results);
          caseLinesArray = [];
          for (var i = 0; i < results.entities.length; i++) {
            var result = results.entities[i];
            // Columns
            // Columns
            var extreme_caselineid = result["extreme_caselineid"]; // Guid
            var extreme_asset = result["_extreme_asset_value"]; // Lookup
            var extreme_asset_formatted = result["_extreme_asset_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_asset_lookuplogicalname = result["_extreme_asset_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
            var extreme_case = result["_extreme_case_value"]; // Lookup
            var extreme_case_formatted = result["_extreme_case_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_case_lookuplogicalname = result["_extreme_case_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
            var extreme_name = result["extreme_name"]; // Text
            var ownerid = result["_ownerid_value"]; // Owner
            var ownerid_formatted = result["_ownerid_value@OData.Community.Display.V1.FormattedValue"];
            var ownerid_lookuplogicalname = result["_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
            var extreme_product = result["_extreme_product_value"]; // Lookup
            var extreme_product_formatted = result["_extreme_product_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_product_lookuplogicalname = result["_extreme_product_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
            var extreme_quantity = result["extreme_quantity"]; // Decimal
            var extreme_quantity_formatted = result["extreme_quantity@OData.Community.Display.V1.FormattedValue"];
            var extreme_unit = result["_extreme_unit_value"]; // Lookup
            var extreme_unit_formatted = result["_extreme_unit_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_unit_lookuplogicalname = result["_extreme_unit_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

            // Many To One Relationships
            if (result.hasOwnProperty("extreme_Product") && result["extreme_Product"] !== null) {
              var extreme_Product_producttypecode = result["extreme_Product"]["producttypecode"]; // Choice
              var extreme_Product_producttypecode_formatted = result["extreme_Product"]["producttypecode@OData.Community.Display.V1.FormattedValue"];
            }

            caseLinesArray.push({
              'extreme_caselineid': extreme_caselineid,
              'extreme_name': extreme_name,
              'extreme_asset': extreme_asset,
              'extreme_case': extreme_case,
              'owner': ownerid,
              'extreme_product': extreme_product,
              'extreme_quantity': extreme_quantity,
              'extreme_producttypecode': extreme_Product_producttypecode,
              'extreme_unit': extreme_unit
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
    await Xrm.WebApi.retrieveMultipleRecords("extreme_asset", `?$select=extreme_isparent,_extreme_parentasset_value,extreme_assetid,extreme_name,extreme_serialnumber&$filter=_extreme_account_value eq ${accountId}`).then(
      function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_assetid = result["extreme_assetid"]; // Guid
          var extreme_name = result["extreme_name"]; // Text
          var extreme_serialnumber = result["extreme_serialnumber"]; // Whole Number
          var extreme_serialnumber_formatted = result["extreme_serialnumber@OData.Community.Display.V1.FormattedValue"];
          var extreme_isparent = result["extreme_isparent"]; // Boolean
          var extreme_parentasset = result["_extreme_parentasset_value"]; // Lookup

          assetsArray.push({
            "id": extreme_assetid,
            "name": extreme_serialnumber ? `${extreme_serialnumber} - ${extreme_name}` : extreme_name,
            "extreme_isparent": extreme_isparent,
            "extreme_parentasset": extreme_parentasset
          });

        }

        console.log('assetsArray');
        console.log(assetsArray);

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
  async function getProductsLookUp() {
    let skipTokenExists = true;
    let skipToken = '';
    productsArray = [];
    while (skipTokenExists) {
      await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,name,productnumber${skipToken !== '' ? '&$skiptoken=' + skipToken : ''}`).then(
        function success(results) {
          console.log(results);
          results.nextLink ? skipToken = results.nextLink.split('$skiptoken=')[1] : skipToken = ''

          console.log("SKIPTOKEN HERE!!!!");
          console.log(skipToken);
          for (var i = 0; i < results.entities.length; i++) {
            var result = results.entities[i];
            // Columns
            var productid = result["productid"]; // Guid
            var name = result["name"]; // Text
            var productnumber = result["productnumber"]; // Text

            productsArray.push({
              "id": productid,
              "name": productnumber ? productnumber + ' - ' + name : name
            });
          }
          if (skipToken === '') {
            skipTokenExists = false;
          }
          console.log(productsArray);
        },
        function (error) {
          console.log(error.message);
        }
      );
    }
  }
  async function getUnitsLookUp() {
    await Xrm.WebApi.retrieveMultipleRecords("uom", "?$select=uomid,name").then(
      function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var uomid = result["uomid"]; // Guid
          var name = result["name"]; // Text

          unitsArray.push({
            "id": uomid,
            "name": name
          })

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
      const caseLinesData = new DevExpress.data.ArrayStore({
        key: 'extreme_caselineid',
        data: caseLinesArray,
      });

      const dataGrid = $('#gridContainer').dxDataGrid({
        dataSource: caseLinesData,
        width: "100%",
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
          allowUpdating: isEditable,
          allowAdding: isEditable,
          allowDeleting: isEditable,
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
            editCellTemplate: dropDownBoxEditorTemplate,
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'extreme_product',
            caption: 'Product',
            setCellValue: async function (newData, value, currentRowData) {
              console.log('newData: ', newData);
              console.log('value: ', value);
              newData.extreme_product = value;
              let defaultuomid;
              let producttypecode;
              await Xrm.WebApi.retrieveRecord("product", `${value}`, "?$select=productid,_defaultuomid_value,name,producttypecode").then(
                function success(result) {
                  console.log(result);
                  // Columns
                  var productid = result["productid"]; // Guid
                  defaultuomid = result["_defaultuomid_value"]; // Lookup
                  var defaultuomid_formatted = result["_defaultuomid_value@OData.Community.Display.V1.FormattedValue"];
                  var defaultuomid_lookuplogicalname = result["_defaultuomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                  var name = result["name"]; // Text
                  producttypecode = result["producttypecode"]; // Choice
                  var producttypecode_formatted = result["producttypecode@OData.Community.Display.V1.FormattedValue"];
                },
                function (error) {
                  console.log(error.message);
                }
              );
              console.log('DEFAULT UNIT: ', defaultuomid);
              console.log('PRODUCT TYPE: ', producttypecode);
              console.log('currentRowData', currentRowData);
              newData.extreme_unit = unitsArray.find(item => item.id === defaultuomid).id;
              newData.extreme_producttypecode = productTypesArray.find(item => item.value === producttypecode).value
            },
            lookup: {
              dataSource: {
                store: {
                  type: "array",
                  data: productsArray,
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
            dataField: 'extreme_quantity',
            caption: 'Quantity',
            dataType: 'number',
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'extreme_producttypecode',
            caption: 'Type',
            lookup: {
              dataSource: productTypesArray,
              displayExpr: 'text',
              valueExpr: 'value'
            }
          },
          {
            dataField: 'extreme_unit',
            caption: 'Unit',
            lookup: {
              dataSource: unitsArray,
              displayExpr: 'name',
              valueExpr: 'id'
            },
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'owner',
            caption: 'Owner',
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
          }
        ],
        toolbar: {
          items: [
            {
              location: 'before',
              template() {
                return $('<div>')
                  .addClass('grid-title')
                  .text(`${caseLineDisplayName}`)
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
          if (e.dataField == "extreme_unit") e.editorOptions.disabled = true;
          if (e.dataField == "extreme_producttypecode") e.editorOptions.disabled = true;

          if (e.dataField == "extreme_asset" || e.dataField == "extreme_product" || e.dataField == "owner") {
            e.editorOptions.onOpened = function (e) { e.component._popup.option('width', 400); }
          };
        },
        onEditingStart: (e) => {
          console.log('EditingStart');
          console.log(e);
        },
        onInitNewRow: async (e) => {
          console.log('InitNewRow');
          console.log(e);
          e.data.extreme_quantity = 1;
          e.data.owner = usersArray.find(item => item.id === userId.toLowerCase()).id;
          e.data.ownername = usersArray.find(item => item.id === userId.toLowerCase()).name;
          console.log('oneAssetId');
          console.log(oneAssetId);
          if (oneAssetId !== undefined && oneAssetId !== 'none' && typeof (oneAssetId) === 'string') e.data.extreme_asset = assetsArray.find(item => item.id === oneAssetId).id
        },
        onRowInserting: async (e) => {

          Xrm.Utility.showProgressIndicator('Creating... Please wait...');

          console.log('RowInserting');
          console.log(e);
          newCreateId = '';
          var record = {};
          record.extreme_name = undefined; // Text
          record["extreme_Asset@odata.bind"] = `/extreme_assets(${e.data.extreme_asset})`; // Lookup
          record["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
          record["ownerid@odata.bind"] = `/systemusers(${e.data.owner})`; // Owner
          record["extreme_Product@odata.bind"] = `/products(${e.data.extreme_product})`; // Lookup
          record.extreme_quantity = e.data.extreme_quantity; // Decimal
          record["extreme_Unit@odata.bind"] = `/uoms(${e.data.extreme_unit})`; // Lookup

          await Xrm.WebApi.createRecord("extreme_caseline", record).then(
            async function success(result) {
              var newId = result.id;
              console.log(newId);
              newCreateId = newId;
              console.log('newCreatedId: ', newCreateId);
              if (caseLinesData._array.length > 0) {
                console.log(caseLinesData._array[caseLinesData._array.length - 1].extreme_caselineid);
                caseLinesData._array[caseLinesData._array.length - 1].extreme_caselineid = newId;
                console.log(caseLinesData._array[caseLinesData._array.length - 1].extreme_caselineid);
                await getCaseLines(caseIdForm);
                dataGrid.refresh();
              } else {
                console.log('caseLinesData._array is empty');
              }
              console.log(caseLinesArray);
            },
            function (error) {
              console.log(error.message);
            }
          );
        },
        onRowInserted: async (e) => {
          console.log('RowInserted');
          console.log('newCreatedId: ', newCreateId);

          if (
            (oneAssetId !== undefined && oneAssetId.indexOf(e.data.extreme_asset) === -1) ||
            oneAssetId === 'none' ||
            (oneAssetId == undefined && oneAssetId.indexOf(e.data.extreme_asset) === -1)
          ) {
            // CREATE CASE ASSET FOR SELECTED ASSET
            console.log('Create asset here.');
            console.log(oneAssetId);
            console.log(oneAssetId.indexOf(e.data.extreme_asset));

            let newCreatedCasseAssetId = '';
            let assetToCreate = e.data.extreme_asset;
            const promises = [];

            // Check if the asset has a parent asset
            if (assetsArray.find(item => item.id === e.data.extreme_asset).extreme_parentasset) {
              assetToCreate = assetsArray.find(item => item.id === e.data.extreme_asset).extreme_parentasset;

              // Create the parent asset
              var parentRecord = {};
              parentRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
              parentRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${assetToCreate})`; // Lookup
              parentRecord.extreme_isparent = true; // Boolean

              await Xrm.WebApi.createRecord("extreme_caseasset", parentRecord).then(
                async function success(result) {
                  var newId = result.id;
                  newCreatedCasseAssetId = result.id;
                  console.log(newId);
                },
                function (error) {
                  console.log(error.message);
                }
              );

              // Create all child assets of the parent
              const childPromises = assetsArray.filter(item => item.extreme_parentasset === assetToCreate).map(async elm => {
                var childRecord = {};
                childRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                childRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${elm.id})`; // Lookup
                childRecord.extreme_isparent = false; // Boolean
                childRecord["extreme_ParentCaseAsset@odata.bind"] = `/extreme_caseassets(${newCreatedCasseAssetId})`; // Lookup

                return Xrm.WebApi.createRecord("extreme_caseasset", childRecord).then(
                  async function success(result) {
                    var newIdChild = result.id;
                    console.log(newIdChild);
                  },
                  function (error) {
                    console.log(error.message);
                  }
                );
              });

              promises.push(...childPromises);
            } else {
              // Create the selected asset
              var record = {};
              record["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
              record["extreme_Asset@odata.bind"] = `/extreme_assets(${assetToCreate})`; // Lookup
              record.extreme_isparent = assetsArray.find(item => item.id === e.data.extreme_asset).extreme_isparent; // Boolean

              await Xrm.WebApi.createRecord("extreme_caseasset", record).then(
                async function success(result) {
                  var newId = result.id;
                  newCreatedCasseAssetId = result.id;
                  console.log(newId);
                },
                function (error) {
                  console.log(error.message);
                }
              );

              // Create all child assets of the selected asset
              const childPromises = assetsArray.filter(item => item.extreme_parentasset === e.data.extreme_asset).map(async elm => {
                var childRecord = {};
                childRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                childRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${elm.id})`; // Lookup
                childRecord.extreme_isparent = false; // Boolean
                childRecord["extreme_ParentCaseAsset@odata.bind"] = `/extreme_caseassets(${newCreatedCasseAssetId})`; // Lookup

                return Xrm.WebApi.createRecord("extreme_caseasset", childRecord).then(
                  async function success(result) {
                    var newIdChild = result.id;
                    console.log(newIdChild);
                  },
                  function (error) {
                    console.log(error.message);
                  }
                );
              });

              promises.push(...childPromises);
            }

            await Promise.all(promises);

            // Refresh grid for case assets
            await Xrm.Page.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          }

          console.log('caseLineUnit: ', e.data.extreme_unit);
          console.log('unitsArray: ', unitsArray);

          if (e.data.extreme_producttypecode == 3) {
            let description = null;
            let highestScheduledEnd = null;
            await Xrm.WebApi.retrieveMultipleRecords("extreme_timeentry", `?$select=description,scheduledend&$filter=_regardingobjectid_value eq ${caseIdForm}&$orderby=scheduledend desc&$top=1`).then(
              function success(results) {
                console.log(results);

                for (var i = 0; i < results.entities.length; i++) {
                  var result = results.entities[i];
                  var activityid = result["activityid"]; // Guid
                  var scheduledend = result["scheduledend"]; // Date Time
                  var scheduledend_formatted = result["scheduledend@OData.Community.Display.V1.FormattedValue"];

                  description = result["description"];
                  highestScheduledEnd = scheduledend;
                }
              },
              function (error) {
                console.log(error.message);
              }
            );

            const dateFrom = highestScheduledEnd === null ? new Date(formContext.getAttribute("extreme_scheduledstart").getValue()) : new Date(highestScheduledEnd);
            const dateTo = highestScheduledEnd === null ? new Date(formContext.getAttribute("extreme_scheduledstart").getValue()) : new Date(highestScheduledEnd);
            dateTo.addMinutes(e.data.extreme_quantity * 60);
            const timeSpent = e.data.extreme_quantity * 60;
            console.log(e.data.extreme_quantity);

            await Xrm.Page.getControl('WebResource_timeEntries').getObject().contentWindow.window.createTimeEntry(
              e.data.extreme_asset, caseIdForm, caseLinesData._array[caseLinesData._array.length - 1].extreme_caselineid, e.data.owner, e.data.ownername, description, dateFrom, dateTo, timeEntryTypesArray.find(item => item.value == 424000000).value, timeSpent, false
            );

            // Refresh grid for time entries
            await Xrm.Page.getControl('WebResource_timeEntries').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          }

          await getCaseLines(caseIdForm);
          dataGrid.refresh();

          setTimeout(() => {
            Xrm.Utility.closeProgressIndicator();
          }, 1000);
        },
        onRowUpdating: async (e) => {

          Xrm.Utility.showProgressIndicator('Updating... Please wait...');

          console.log('RowUpdating');
          console.log(e);

          const oldDataAssetId = e.oldData.extreme_asset;

          const promises = [];

          if (e.newData.extreme_asset) {
            if (
              (oneAssetId !== undefined && oneAssetId.indexOf(e.newData.extreme_asset) === -1) ||
              oneAssetId === 'none' ||
              (oneAssetId == undefined && oneAssetId.indexOf(e.newData.extreme_asset) === -1)
            ) {
              // CREATE CASE ASSET FOR SELECTED ASSET
              console.log('Create asset here.');
              console.log(oneAssetId);
              console.log(oneAssetId.indexOf(e.newData.extreme_asset));

              let newCreatedCasseAssetId = '';
              let assetToCreate = e.newData.extreme_asset;

              // Check if the asset has a parent asset
              if (assetsArray.find(item => item.id === e.newData.extreme_asset).extreme_parentasset) {
                assetToCreate = assetsArray.find(item => item.id === e.newData.extreme_asset).extreme_parentasset;

                // Create the parent asset
                var parentRecord = {};
                parentRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                parentRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${assetToCreate})`; // Lookup
                parentRecord.extreme_isparent = true; // Boolean

                await Xrm.WebApi.createRecord("extreme_caseasset", parentRecord).then(
                  async function success(result) {
                    var newId = result.id;
                    newCreatedCasseAssetId = result.id;
                    console.log(newId);
                  },
                  function (error) {
                    console.log(error.message);
                  }
                );

                // Create all child assets of the parent
                const childPromises = assetsArray.filter(item => item.extreme_parentasset === assetToCreate).map(async elm => {
                  var childRecord = {};
                  childRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                  childRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${elm.id})`; // Lookup
                  childRecord.extreme_isparent = false; // Boolean
                  childRecord["extreme_ParentCaseAsset@odata.bind"] = `/extreme_caseassets(${newCreatedCasseAssetId})`; // Lookup

                  return Xrm.WebApi.createRecord("extreme_caseasset", childRecord).then(
                    async function success(result) {
                      var newIdChild = result.id;
                      console.log(newIdChild);
                    },
                    function (error) {
                      console.log(error.message);
                    }
                  );
                });

                promises.push(...childPromises);
              } else {
                // Create the selected asset
                var record = {};
                record["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                record["extreme_Asset@odata.bind"] = `/extreme_assets(${assetToCreate})`; // Lookup
                record.extreme_isparent = assetsArray.find(item => item.id === e.newData.extreme_asset).extreme_isparent; // Boolean

                await Xrm.WebApi.createRecord("extreme_caseasset", record).then(
                  async function success(result) {
                    var newId = result.id;
                    newCreatedCasseAssetId = result.id;
                    console.log(newId);
                  },
                  function (error) {
                    console.log(error.message);
                  }
                );

                // Create all child assets of the selected asset
                const childPromises = assetsArray.filter(item => item.extreme_parentasset === e.newData.extreme_asset).map(async elm => {
                  var childRecord = {};
                  childRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                  childRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${elm.id})`; // Lookup
                  childRecord.extreme_isparent = false; // Boolean
                  childRecord["extreme_ParentCaseAsset@odata.bind"] = `/extreme_caseassets(${newCreatedCasseAssetId})`; // Lookup

                  return Xrm.WebApi.createRecord("extreme_caseasset", childRecord).then(
                    async function success(result) {
                      var newIdChild = result.id;
                      console.log(newIdChild);
                    },
                    function (error) {
                      console.log(error.message);
                    }
                  );
                });

                promises.push(...childPromises);
              }
            }
          }

          // if owner or quantity is changed for time entries records
          if ((e.newData.owner || e.newData.extreme_quantity || e.newData.extreme_asset) && e.oldData.extreme_producttypecode == 3) {
            const ownerId = e.newData.owner ? e.newData.owner : e.oldData.owner;
            const quantity = e.newData.extreme_quantity ? e.newData.extreme_quantity : e.oldData.extreme_quantity;
            const assetId = e.newData.extreme_asset ? e.newData.extreme_asset : e.oldData.extreme_asset;
            // Create time entry on another web resource
            await Xrm.Page.getControl('WebResource_timeEntries').getObject().contentWindow.window.updateTimeEntry(e.key, assetId, ownerId, quantity * 60);
            // Refresh grid for time entries
            await Xrm.Page.getControl('WebResource_timeEntries').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          }

          var record = {};
          if (e.newData.extreme_asset) record["extreme_Asset@odata.bind"] = `/extreme_assets(${e.newData.extreme_asset})`; // Lookup
          record["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
          if (e.newData.owner) record["ownerid@odata.bind"] = `/systemusers(${e.newData.owner})`; // Owner
          if (e.newData.extreme_product) record["extreme_Product@odata.bind"] = `/products(${e.newData.extreme_product})`; // Lookup
          if (e.newData.extreme_quantity) record.extreme_quantity = e.newData.extreme_quantity; // Decimal
          if (e.newData.extreme_unit) record["extreme_Unit@odata.bind"] = `/uoms(${e.newData.extreme_unit})`; // Lookup

          await Xrm.WebApi.updateRecord("extreme_caseline", `${e.key}`, record).then(
            async function success(result) {
              var updatedId = result.id;
              console.log(updatedId);
              await getCaseLines(caseIdForm);
              dataGrid.refresh();
            },
            function (error) {
              console.log(error.message);
            }
          );

          if (e.newData.extreme_asset) {
            // Check case assets after removing
            await Xrm.Page.getControl('WebResource_timeEntries').getObject().contentWindow.window.checkAssetsAfterDelete(oldDataAssetId, caseIdForm);
            // Refresh grid for case assets
            await Xrm.Page.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          }

          await Promise.all(promises);

          await getCaseLines(caseIdForm);
          dataGrid.refresh();

          setTimeout(() => {
            Xrm.Utility.closeProgressIndicator();
          }, 1000);

        },
        onRowUpdated() {
          console.log('RowUpdated');
        },
        onRowRemoving: async (e) => {
          Xrm.Utility.showProgressIndicator('Deleting... Please wait...');
          console.log('RowRemoving');
          console.log(e.key);
          if (e.data.extreme_producttypecode == 3) {
            // Create time entry on another web resource
            await Xrm.Page.getControl('WebResource_timeEntries').getObject().contentWindow.window.deleteTimeEntry(e.key);
            // Refresh grid for time entries
            await Xrm.Page.getControl('WebResource_timeEntries').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          }
          await Xrm.WebApi.deleteRecord("extreme_caseline", `${e.key}`).then(
            async function success(result) {
              console.log(result);
              await getCaseLines(caseIdForm);
              dataGrid.refresh();
            },
            function (error) {
              console.log(error.message);
            }
          );
          // Check case assets after removing
          await Xrm.Page.getControl('WebResource_timeEntries').getObject().contentWindow.window.checkAssetsAfterDelete(e.data.extreme_asset, caseIdForm);
          // Refresh grid for case assets
          await Xrm.Page.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);

          await getCaseLines(caseIdForm);
          dataGrid.refresh();
          Xrm.Utility.closeProgressIndicator();
        },
        onRowRemoved: (e) => {
          console.log('RowRemoved');
          console.log(caseLinesData._array);
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

    const syncTreeViewSelection = function (treeViewInstance, value) {
      if (!value) {
        treeViewInstance.unselectAll();
      } else {
        treeViewInstance.selectItem(value);
      }
    };

    // Lookup drowpdown template dxDropDownBox editor
    function dropDownBoxEditorTemplate(cellElement, cellInfo) {

      console.log('cellElement');
      console.log(cellElement);
      console.log('cellInfo');
      console.log(cellInfo);

      return $('<div>').dxDropDownBox({
        value: cellInfo.data.extreme_asset ? cellInfo.data.extreme_asset : null,
        valueExpr: 'id',
        displayExpr: 'name',
        placeholder: 'Select a value...',
        showClearButton: true,
        inputAttr: { 'aria-label': 'Asset' },
        dataSource: assetsArray,
        contentTemplate(e) {
          const $treeView = $('<div>').dxTreeView({
            dataSource: e.component.getDataSource(),
            dataStructure: 'plain',
            keyExpr: 'id',
            parentIdExpr: 'extreme_parentasset',
            selectionMode: 'single',
            displayExpr: 'name',
            selectByClick: true,
            onContentReady(args) {
              const value = e.component.option('value');
              syncTreeViewSelection(args.component, value);
            },
            selectNodesRecursive: false,
            onItemSelectionChanged(args) {
              const selectedKeys = args.component.getSelectedNodeKeys();
              e.component.option('value', selectedKeys);
            },
          });

          treeView = $treeView.dxTreeView('instance');

          e.component.on('valueChanged', (args) => {
            syncTreeViewSelection(treeView, args.value);
            e.component.close();
          });

          return $treeView;
        },
      });
    }

  }


  // Select the gridContainer element
  let gridContainer;

  const wrControl = formContext.getControl('WebResource_caseLines');
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

  // Function to strectch web resource container for date picker
  function datePickerTrigger(state) {
    const wrControl = formContext.getControl('WebResource_caseLines');
    wrControl.getContentWindow().then(function (contentWindow) {
      console.log('HEIGHT MAIN CONTAINER:');
      console.log(contentWindow.document.getElementById('gridContainer').offsetHeight);
      gridContainer = contentWindow.document.getElementById('gridContainer');
      console.log(gridContainer);

      if (state == 'opened') {
        // Get the current height of the gridContainer
        const gridContainerHeight = gridContainer.offsetHeight;
        // Set the min-height of the iframe based on the gridContainer's height if it exceeds 200px
        const iframe = wrControl.getObject();
        if (gridContainerHeight < 500) {
          iframe.style.minHeight = '500px';
        }
      }

      // Configuration of the observer
      const config = { attributes: true, childList: true, subtree: true };

      // Start observing the gridContainer for changes
      observer.observe(gridContainer, config);
    });
  }

  // const wrControl = formContext.getControl('WebResource_caseLines');
  // wrControl.getContentWindow().then(function (contentWindow) {
  //   console.log('HEIGHT MAIN CONTAINER:');
  //   console.log(contentWindow.document.getElementById('caseLinesMainContainer').offsetHeight);
  //   wrControl.getObject().style.minHeight = `${contentWindow.document.getElementById('caseLinesMainContainer').offsetHeight}px`;
  // });

  // Xrm.Utility.closeProgressIndicator();

}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}

// Delete case line
async function deleteCaseLine(caseLineId) {
  await Xrm.WebApi.deleteRecord("extreme_caseline", `${caseLineId}`).then(
    function success(result) {
      console.log(result);
    },
    function (error) {
      console.log(error.message);
    }
  );
}