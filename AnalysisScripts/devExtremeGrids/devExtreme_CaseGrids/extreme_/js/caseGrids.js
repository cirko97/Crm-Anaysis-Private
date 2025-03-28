let caseLinesArray = [];
let assetsArray = [];
let usersArray = [];
// let productsArray = [];
let unitsArray = [];
let newCreateId;
let oneAssetId = undefined;
let timeEntryTypesArray = [];
let isEditable = true;
let heightAuto = true;
let importingFromQuote = null;
let importingFromQuoteNumOfItems = [];
var treeList, searchTimer, focusedRowKey;

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

  if (formContext.getAttribute('extreme_account').getValue() == null) return;

  Xrm.Utility.showProgressIndicator('Loading... Please wait...');

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
    error => {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message
      });
    }
  );
  timeEntryTypesArray = Object.keys(timeEntryTypes).map(key => {
    return timeEntryTypes[key];
  });

  const productTypes = await Xrm.Utility.getEntityMetadata('product', ['producttypecode']).then(
    result => result.Attributes._collection.producttypecode.OptionSet,
    error => {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message
      });
    }
  );
  const productTypesArray = Object.keys(productTypes).map(key => {
    return productTypes[key];
  });

  // console.log("TYPES: ", productTypes);
  // console.log("TYPES ARR: ", productTypesArray);

  // console.log('User id: ' + userId);
  // console.log('GUID: ' + caseIdForm);
  await getAssetsLookUp(accountIdForm);
  await getUsers();
  // await getProductsLookUp();
  await getUnitsLookUp();
  await getCaseLines(caseIdForm);


  initDataGrid(caseIdForm, userId);


  // Set title for grid inside header
  const caseLineDisplayName = await Xrm.Utility.getEntityMetadata('extreme_caseline').then(
    result => result._displayName,
    error => {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message
      });
    }
  );
  // setTimeout(() => {
  //   const toolbarBefore = formContext.getControl("WebResource_caseLines").getObject().contentWindow.window.document.querySelector('div.dx-toolbar-before');
  //   // console.log('dx toolbar before: ', toolbarBefore);
  //   toolbarBefore.innerHTML = `<span style='font-weight: 500; position: absolute; width: 100px; bottom: 30%; left: 0;'>${caseLineDisplayName}</span>`;
  //   // console.log(formContext.data.entity);
  // }, 1000); // Adjust the timeout as needed



  // console.log("GET CONTROLS WITh TWO DIFFERENT METHODS!!!!!");
  // console.log(formContext.getControl('WebResource_timeEntries'));
  // console.log(formContext.getControl('WebResource_timeEntries'));





  // Data from DV - Xrm Web Api
  async function getCaseLines(caseId) {

    caseLinesArray = [];
    oneAssetId = undefined;

    Xrm.WebApi.retrieveMultipleRecords("extreme_caseasset", `?$select=_extreme_asset_value,_extreme_case_value&$filter=_extreme_case_value eq ${caseIdForm}`).then(
      function success(results) {
        // console.log(results);
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
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );

    await Xrm.WebApi.retrieveMultipleRecords("extreme_caseline",
      `?$select=extreme_caselineid,_extreme_caseasset_value,_extreme_asset_value,_extreme_case_value,extreme_name,_ownerid_value,_extreme_product_value,extreme_quantity,_extreme_unit_value
      &$expand=extreme_Product($select=producttypecode,name,productnumber)&$filter=_extreme_case_value eq ${caseId}`).then(
        function success(results) {
          // console.log(results);
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
            var extreme_caseasset = result["_extreme_caseasset_value"]; // Lookup
            var extreme_caseasset_formatted = result["_extreme_caseasset_value@OData.Community.Display.V1.FormattedValue"];
            var extreme_caseasset_lookuplogicalname = result["_extreme_caseasset_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

            // Many To One Relationships
            if (result.hasOwnProperty("extreme_Product") && result["extreme_Product"] !== null) {
              var extreme_Product_producttypecode = result["extreme_Product"]["producttypecode"]; // Choice
              var extreme_Product_producttypecode_formatted = result["extreme_Product"]["producttypecode@OData.Community.Display.V1.FormattedValue"];
              var extreme_Product_name = result["extreme_Product"]["name"]; // String
              var extreme_Product_productnumber = result["extreme_Product"]["productnumber"]; // String
            }

            caseLinesArray.push({
              'extreme_caselineid': extreme_caselineid,
              'extreme_name': extreme_name,
              'extreme_asset': extreme_asset,
              'extreme_assetType': assetsArray.find(item => item.id === extreme_asset).extreme_isparent === true ? 'Set' : assetsArray.find(item => item.id === extreme_asset).extreme_parentasset ? 'Component' : 'Regular',
              'extreme_case': extreme_case,
              'owner': ownerid,
              'extreme_product': extreme_product,
              'extreme_quantity': extreme_quantity,
              'extreme_producttypecode': extreme_Product_producttypecode,
              'productname': extreme_Product_productnumber ? extreme_Product_productnumber + ' - ' + extreme_Product_name : extreme_Product_name,
              'extreme_unit': extreme_unit,
              'extreme_caseasset': extreme_caseasset
            });

          }
        },
        function (error) {
          Xrm.Navigation.openErrorDialog({
            details: error,
            errorCode: 400,
            message: error.message
          });
        }
      );
  }
  async function getAssetsLookUp(accountId) {
    assetsArray = [];
    await Xrm.WebApi.retrieveMultipleRecords("extreme_asset", `?$select=extreme_isparent,_extreme_parentasset_value,extreme_assetid,extreme_name,extreme_serialnumber&$filter=_extreme_account_value eq ${accountId}`).then(
      function success(results) {
        // console.log(results);
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
            "sn": extreme_serialnumber,
            "name": extreme_name,
            "extreme_isparent": extreme_isparent,
            "extreme_parentasset": extreme_parentasset
          });

        }

        // console.log('assetsArray');
        // console.log(assetsArray);

      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  }
  async function getUsers() {
    usersArray = [];
    await Xrm.WebApi.retrieveMultipleRecords("systemuser", "?$select=systemuserid,fullname&$filter=(not contains(fullname,'%23') and isdisabled eq false)").then(
      function success(results) {
        // console.log(results);
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
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  }
  // async function getProductsLookUp() {
  //   let skipTokenExists = true;
  //   let skipToken = '';
  //   productsArray = [];
  //   while (skipTokenExists) {
  //     await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,name,productnumber${skipToken !== '' ? '&$skiptoken=' + skipToken : ''}`).then(
  //       function success(results) {
  //         // console.log(results);
  //         results.nextLink ? skipToken = results.nextLink.split('$skiptoken=')[1] : skipToken = ''

  //         // console.log("SKIPTOKEN HERE!!!!");
  //         // console.log(skipToken);
  //         for (var i = 0; i < results.entities.length; i++) {
  //           var result = results.entities[i];
  //           // Columns
  //           var productid = result["productid"]; // Guid
  //           var name = result["name"]; // Text
  //           var productnumber = result["productnumber"]; // Text

  //           productsArray.push({
  //             "id": productid,
  //             "name": productnumber ? productnumber + ' - ' + name : name,
  //             "nameWoSn": name
  //           });
  //         }
  //         if (skipToken === '') {
  //           skipTokenExists = false;
  //         }
  //         // console.log(productsArray);
  //       },
  //       function (error) {
  //        Xrm.Navigation.openErrorDialog({
  //   details: error,
  //   errorCode: 400,
  //   message: error.message
  // });
  //       }
  //     );
  //   }
  // }
  async function getUnitsLookUp() {
    await Xrm.WebApi.retrieveMultipleRecords("uom", "?$select=uomid,name").then(
      function success(results) {
        // console.log(results);
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
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
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

      const productsODataStore = new DevExpress.data.ODataStore({
        type: "odata",
        version: 4,
        filterToLower: false,
        url: Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/products",
        key: "productid",
        keyType: "Guid",
        select: [
          'productid',
          'name',
          'productnumber'
        ],
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
        wordWrapEnabled: false,
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
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_asset = value;
              newData.extreme_assetType = assetsArray.find(item => item.id === value).extreme_isparent === true ? 'Set' : assetsArray.find(item => item.id === value).extreme_parentasset ? 'Component' : 'Regular';
            },
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'extreme_assetType',
            caption: 'Asset Type',
            dataType: 'string',
            width: 100,
            allowEditing: false
          },
          {
            dataField: 'extreme_product',
            caption: 'Product',
            calculateDisplayValue: "productname",
            lookup: {
              dataSource: {
                store: productsODataStore,
                paginate: true,
                pageSize: 100,
                loadMode: 'raw',
                filter: ["statecode", "=", 0]
              },
              displayExpr: 'name',
              valueExpr: 'productid'
            },
            editorOptions: {
              acceptCustomValue: false,
              // popupWidth: 600,
              searchEnabled: true,
              // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
              searchExpr: ["productnumber", "name"],
              itemTemplate: function (data, index, container) {
                var row = $("<div>").addClass("row text-wrap");
                var containerFluid = $("<div>").addClass("container-fluid");
                $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
                $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
                row.appendTo(containerFluid);
                container.append(containerFluid);
              },
              onOpened: function (e) {
                e.component._popup.option('width', 400);
              },
            },
            setCellValue: async function (newData, value, currentRowData) {
              // console.log('newData: ', newData);
              // console.log('value: ', value);
              newData.extreme_product = value;
              const productInfo = await Xrm.WebApi.retrieveRecord("product", `${value}`, "?$select=productid,_defaultuomid_value,name,producttypecode");
              // console.log('DEFAULT UNIT: ', productInfo._defaultuomid_value);
              // console.log('PRODUCT TYPE: ', productInfo.producttypecode);
              // console.log('currentRowData', currentRowData);
              newData.extreme_unit = unitsArray.find(item => item.id === productInfo._defaultuomid_value).id;
              newData.extreme_producttypecode = productInfo.producttypecode
              newData.extreme_name = productInfo.name;
            },
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'extreme_name',
            caption: 'Name',
            dataType: 'string',
            allowEditing: true,
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'extreme_quantity',
            caption: 'Quantity',
            dataType: 'number',
            width: 80,
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
            width: 80,
            allowEditing: false,
            // validationRules: [{ type: 'required' }]
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
              name: 'addRowButton',
              showText: 'always'
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
              location: 'after',
              widget: 'dxButton',
              options: {
                text: 'Import lines from Quote',
                icon: 'copy',
                disabled: false,
                onClick() {
                  //define data for lookupOptions
                  var lookupOptions =
                  {
                    defaultEntityType: "quote",
                    entityTypes: ["quote"],
                    allowMultiSelect: false,
                    defaultViewId: "47ea12e0-fcb6-ef11-b8e8-7c1e5270c843",
                    viewIds: ["47ea12e0-fcb6-ef11-b8e8-7c1e5270c843"],
                    searchText: "",
                    filters: [{ filterXml: `<filter type="and"><condition attribute="customerid" operator="eq" value="${formContext.getAttribute("extreme_account").getValue()[0].id.slice(1, -1)}" /></filter>`, entityLogicalName: "account" }]
                  };

                  Xrm.Utility.lookupObjects(lookupOptions).then(
                    async function (success) {
                      if (success.length === 0) return;
                      const selectedQuoteId = success[0].id.slice(1, -1);
                      var confirmStrings = { text: `You are about to copy all products from selected Quote("${success[0].name}") to this Case`, title: "Are you sure?" };
                      var confirmOptions = { height: 200, width: 450 };
                      await Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
                        async function (success) {
                          if (success.confirmed) {
                            try {
                              const results = await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=quotedetailid&$expand=productid($select=productid,_defaultuomid_value,name,productnumber,producttypecode)&$filter=_quoteid_value eq ${selectedQuoteId}`);
                              console.log(results);
                              for (var i = 0; i < results.entities.length; i++) {
                                var result = results.entities[i];
                                if (result.hasOwnProperty("productid") && result["productid"] !== null) {
                                  var productid_productid = result["productid"]["productid"];
                                  var productid_defaultuomid = result["productid"]["_defaultuomid_value"];
                                  var productid_name = result["productid"]["name"];
                                  var productid_productnumber = result["productid"]["productnumber"];
                                  var productid_producttypecode = result["productid"]["producttypecode"];

                                  importingFromQuote = {
                                    extreme_product: productid_productid,
                                    extreme_name: productid_productnumber ? productid_productnumber + ' - ' + productid_name : productid_name,
                                    extreme_quantity: 1,
                                    extreme_type: productid_producttypecode,
                                    extreme_unit: productid_defaultuomid,
                                  };

                                  importingFromQuoteNumOfItems.push(importingFromQuote);
                                }
                              }

                              const item = importingFromQuoteNumOfItems.pop();
                              importingFromQuote = item;
                              dataGrid.addRow();

                            } catch (error) {
                              console.error("Error retrieving quote details:", error);
                            }
                          } else {
                            return;
                          }
                        }).catch(error => {
                          console.error("Error in confirmation dialog:", error);
                        });
                    }).catch(error => {
                      console.error("Error in lookupObjects:", error);
                    });

                },
              },
            }
          ],
        },
        onSelectionChanged(data) {
          dataGrid.option('toolbar.items[1].options.disabled', !data.selectedRowsData.length);
        },
        onEditorPreparing: async (e) => {
          // console.log('Editor Preparing');
          // if (e.dataField == "extreme_unit") e.editorOptions.disabled = true;
          if (e.dataField == "extreme_producttypecode") e.editorOptions.disabled = true;

          if (e.dataField == "extreme_asset" || e.dataField == "extreme_product" || e.dataField == "owner") {
            e.editorOptions.onOpened = function (e) { e.component._popup.option('width', 400); }
          };
        },
        onEditingStart: (e) => {
          // console.log('EditingStart');
          // console.log(e);
        },
        onInitNewRow: async (e) => {

          if (importingFromQuote !== null) {
            e.data.extreme_product = importingFromQuote.extreme_product;
            e.data.extreme_name = importingFromQuote.extreme_name;
            e.data.extreme_quantity = importingFromQuote.extreme_quantity;
            e.data.extreme_producttypecode = importingFromQuote.extreme_type;
            e.data.extreme_unit = importingFromQuote.extreme_unit;
            e.data.owner = usersArray.find(item => item.id === userId.toLowerCase()).id;
          }
          else {
            // console.log('InitNewRow');
            // console.log(e);
            e.data.extreme_quantity = 1;
            e.data.owner = usersArray.find(item => item.id === userId.toLowerCase()).id;
            e.data.ownername = usersArray.find(item => item.id === userId.toLowerCase()).name;
            // console.log('oneAssetId');
            // console.log(oneAssetId);
            if (oneAssetId !== undefined && oneAssetId !== 'none' && typeof (oneAssetId) === 'string') {
              e.data.extreme_asset = assetsArray.find(item => item.id === oneAssetId).id
              e.data.extreme_assetType = assetsArray.find(item => item.id === oneAssetId).extreme_isparent === true ? 'Set' : assetsArray.find(item => item.id === oneAssetId).extreme_parentasset ? 'Component' : 'Regular';
            }
          }
        },
        onRowInserting: async (e) => {

          Xrm.Utility.showProgressIndicator('Creating... Please wait...');

          // console.log('RowInserting');
          // console.log(e);
          newCreateId = '';
          var record = {};
          record.extreme_name = e.data.extreme_name.trim(); // Text
          record["extreme_Asset@odata.bind"] = `/extreme_assets(${e.data.extreme_asset})`; // Lookup
          record["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
          record["ownerid@odata.bind"] = `/systemusers(${e.data.owner})`; // Owner
          record["extreme_Product@odata.bind"] = `/products(${e.data.extreme_product})`; // Lookup
          record.extreme_quantity = e.data.extreme_quantity; // Decimal
          record["extreme_Unit@odata.bind"] = `/uoms(${e.data.extreme_unit})`; // Lookup

          await Xrm.WebApi.createRecord("extreme_caseline", record).then(
            async function success(result) {
              var newId = result.id;
              // console.log(newId);
              newCreateId = newId;
              // console.log('newCreatedId: ', newCreateId);
              if (caseLinesData._array.length > 0) {
                // console.log(caseLinesData._array[caseLinesData._array.length - 1].extreme_caselineid);
                caseLinesData._array[caseLinesData._array.length - 1].extreme_caselineid = newId;
                // console.log(caseLinesData._array[caseLinesData._array.length - 1].extreme_caselineid);
                await getCaseLines(caseIdForm);
                dataGrid.refresh();
              } else {
                // console.log('caseLinesData._array is empty');
              }
              // console.log(caseLinesArray);
            },
            function (error) {
              Xrm.Navigation.openErrorDialog({
                details: error,
                errorCode: 400,
                message: error.message
              });
            }
          );

        },
        onRowInserted: async (e) => {
          // console.log('RowInserted');
          // console.log('newCreatedId: ', newCreateId);

          Xrm.Utility.showProgressIndicator('Creating... Please wait...');

          if (
            (oneAssetId !== undefined && oneAssetId.indexOf(e.data.extreme_asset) === -1) ||
            oneAssetId === 'none' ||
            (oneAssetId == undefined && oneAssetId.indexOf(e.data.extreme_asset) === -1)
          ) {
            // CREATE CASE ASSET FOR SELECTED ASSET
            // console.log('Create asset here.');
            // console.log(oneAssetId);
            // console.log(oneAssetId.indexOf(e.data.extreme_asset));

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
              const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
              dateNow.setHours(0, 0, 0, 0);
              const warranty = await Xrm.WebApi.retrieveRecord("extreme_asset", `${assetToCreate}`, "?$select=extreme_warrantyend,extreme_warrantystartdate");
              if (warranty.extreme_warrantystartdate && warranty.extreme_warrantyend) {
                const startDate = new Date(warranty.extreme_warrantystartdate);
                const endDate = new Date(warranty.extreme_warrantyend);

                // console.log("DATES!!!");
                // console.log(startDate);
                // console.log(endDate);
                // console.log(dateNow);

                if (dateNow >= startDate && dateNow <= endDate) {
                  parentRecord.extreme_warranty = true;
                }
                else {
                  parentRecord.extreme_warranty = false;
                }
              }
              else {
                parentRecord.extreme_warranty = false;
              }

              await Xrm.WebApi.createRecord("extreme_caseasset", parentRecord).then(
                async function success(result) {
                  var newId = result.id;
                  newCreatedCasseAssetId = result.id;
                  // console.log(newId);
                },
                function (error) {
                  Xrm.Navigation.openErrorDialog({
                    details: error,
                    errorCode: 400,
                    message: error.message
                  });
                }
              );

              // Create all child assets of the parent
              const childPromises = assetsArray.filter(item => item.extreme_parentasset === assetToCreate).map(async elm => {
                var childRecord = {};
                childRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                childRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${elm.id})`; // Lookup
                childRecord.extreme_isparent = false; // Boolean
                childRecord["extreme_ParentCaseAsset@odata.bind"] = `/extreme_caseassets(${newCreatedCasseAssetId})`; // Lookup
                const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
                dateNow.setHours(0, 0, 0, 0);
                const warranty = await Xrm.WebApi.retrieveRecord("extreme_asset", `${elm.id}`, "?$select=extreme_warrantyend,extreme_warrantystartdate");
                if (warranty.extreme_warrantystartdate && warranty.extreme_warrantyend) {
                  const startDate = new Date(warranty.extreme_warrantystartdate);
                  const endDate = new Date(warranty.extreme_warrantyend);

                  // console.log("DATES!!!");
                  // console.log(startDate);
                  // console.log(endDate);
                  // console.log(dateNow);

                  if (dateNow >= startDate && dateNow <= endDate) {
                    childRecord.extreme_warranty = true;
                  }
                  else {
                    childRecord.extreme_warranty = false;
                  }
                }
                else {
                  childRecord.extreme_warranty = false;
                }

                return Xrm.WebApi.createRecord("extreme_caseasset", childRecord).then(
                  async function success(result) {
                    var newIdChild = result.id;
                    // console.log(newIdChild);
                  },
                  function (error) {
                    Xrm.Navigation.openErrorDialog({
                      details: error,
                      errorCode: 400,
                      message: error.message
                    });
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
              const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
              dateNow.setHours(0, 0, 0, 0);
              const warranty = await Xrm.WebApi.retrieveRecord("extreme_asset", `${assetToCreate}`, "?$select=extreme_warrantyend,extreme_warrantystartdate");
              if (warranty.extreme_warrantystartdate && warranty.extreme_warrantyend) {
                const startDate = new Date(warranty.extreme_warrantystartdate);
                const endDate = new Date(warranty.extreme_warrantyend);

                // console.log("DATES!!!");
                // console.log(startDate);
                // console.log(endDate);
                // console.log(dateNow);

                if (dateNow >= startDate && dateNow <= endDate) {
                  record.extreme_warranty = true;
                }
                else {
                  record.extreme_warranty = false;
                }
              }
              else {
                record.extreme_warranty = false;
              }

              await Xrm.WebApi.createRecord("extreme_caseasset", record).then(
                async function success(result) {
                  var newId = result.id;

                  // var recordNN = {};
                  // recordNN["extreme_CaseLine@odata.bind"] = `/extreme_caselines(${newCreateId})`; // Lookup
                  // recordNN["extreme_CaseAsset@odata.bind"] = `/extreme_caseassets(${newId})`; // Lookup

                  // await Xrm.WebApi.createRecord("extreme_caseline_caseasset", recordNN).then(
                  //   function success(result) {
                  //     var newId = result.id;
                  //     // console.log(newId);
                  //   },
                  //   function (error) {
                  //    Xrm.Navigation.openErrorDialog({
                  //   details: error,
                  //   errorCode: 400,
                  //   message: error.message
                  // });
                  //   }
                  // );

                  newCreatedCasseAssetId = newId;
                  // console.log(newId);
                },
                function (error) {
                  Xrm.Navigation.openErrorDialog({
                    details: error,
                    errorCode: 400,
                    message: error.message
                  });
                }
              );

              // Create all child assets of the selected asset
              const childPromises = assetsArray.filter(item => item.extreme_parentasset === e.data.extreme_asset).map(async elm => {
                var childRecord = {};
                childRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                childRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${elm.id})`; // Lookup
                childRecord.extreme_isparent = false; // Boolean
                childRecord["extreme_ParentCaseAsset@odata.bind"] = `/extreme_caseassets(${newCreatedCasseAssetId})`; // Lookup
                const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
                dateNow.setHours(0, 0, 0, 0);
                const warranty = await Xrm.WebApi.retrieveRecord("extreme_asset", `${elm.id}`, "?$select=extreme_warrantyend,extreme_warrantystartdate");
                if (warranty.extreme_warrantystartdate && warranty.extreme_warrantyend) {
                  const startDate = new Date(warranty.extreme_warrantystartdate);
                  const endDate = new Date(warranty.extreme_warrantyend);

                  // console.log("DATES!!!");
                  // console.log(startDate);
                  // console.log(endDate);
                  // console.log(dateNow);

                  if (dateNow >= startDate && dateNow <= endDate) {
                    childRecord.extreme_warranty = true;
                  }
                  else {
                    childRecord.extreme_warranty = false;
                  }
                }
                else {
                  childRecord.extreme_warranty = false;
                }

                return Xrm.WebApi.createRecord("extreme_caseasset", childRecord).then(
                  async function success(result) {
                    var newIdChild = result.id;
                    // console.log(newIdChild);
                  },
                  function (error) {
                    Xrm.Navigation.openErrorDialog({
                      details: error,
                      errorCode: 400,
                      message: error.message
                    });
                  }
                );
              });

              promises.push(...childPromises);
            }

            await Promise.all(promises);

          }

          if (e.data.extreme_producttypecode == 3) {

            Xrm.Utility.showProgressIndicator('Creating time entry... Please wait...');

            let description = null;
            let highestScheduledEnd = null;
            await Xrm.WebApi.retrieveMultipleRecords("extreme_timeentry", `?$select=description,scheduledend&$filter=_regardingobjectid_value eq ${caseIdForm}&$orderby=scheduledend desc&$top=1`).then(
              function success(results) {
                // console.log(results);

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
                Xrm.Navigation.openErrorDialog({
                  details: error,
                  errorCode: 400,
                  message: error.message
                });
              }
            );

            const dateFrom = highestScheduledEnd === null ? new Date(formContext.getAttribute("extreme_scheduledstart").getValue()) : new Date(highestScheduledEnd);
            const dateTo = highestScheduledEnd === null ? new Date(formContext.getAttribute("extreme_scheduledstart").getValue()) : new Date(highestScheduledEnd);
            let timeSpent;
            // console.log("UNIT FOR CREATE TIME ENTRY");
            // console.log(unitsArray.find(item => item.id === e.data.extreme_unit).name);
            if (unitsArray.find(item => item.id === e.data.extreme_unit).name == "PAK" || unitsArray.find(item => item.id === e.data.extreme_unit).name == "DAN") {
              dateTo.addMinutes(e.data.extreme_quantity * (60 * 8));
              timeSpent = e.data.extreme_quantity * (60 * 8);
            }
            else {
              dateTo.addMinutes(e.data.extreme_quantity * 60);
              timeSpent = e.data.extreme_quantity * 60;
            }
            // console.log(e.data.extreme_quantity);
            // console.log(timeSpent);

            await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.createTimeEntry(
              e.data.extreme_asset, caseIdForm, caseLinesData._array[caseLinesData._array.length - 1].extreme_caselineid, e.data.owner, e.data.ownername, description, dateFrom, dateTo, timeEntryTypesArray.find(item => item.value == 424000000).value, timeSpent, false
            );

            // Refresh grid for time entries
            setTimeout(async () => {
              await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
            }, 1000);

            // Xrm.Utility.closeProgressIndicator();

          }

          await formContext.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);

          await getCaseLines(caseIdForm);
          dataGrid.refresh();


          // proveriti time entrije dodavanje
          setTimeout(async () => {
            await this.setClientApiContext(Xrm, formContext);
            Xrm.Utility.closeProgressIndicator();
            console.log(importingFromQuoteNumOfItems);
          }, 1000);

          setTimeout(() => {
            if (importingFromQuoteNumOfItems.length > 0) {
              console.log(importingFromQuoteNumOfItems);
              const item = importingFromQuoteNumOfItems.pop();
              importingFromQuote = item;
              dataGrid.addRow();
              console.log(importingFromQuoteNumOfItems);
            }
            else {
              importingFromQuote = null;
            }
          }, 2000);
        },
        onRowUpdating: async (e) => {

          Xrm.Utility.showProgressIndicator('Updating... Please wait...');

          // console.log('RowUpdating');
          // console.log(e);

          const oldDataAssetId = e.oldData.extreme_asset;

          const promises = [];

          if (e.newData.extreme_asset) {
            if (
              (oneAssetId !== undefined && oneAssetId.indexOf(e.newData.extreme_asset) === -1) ||
              oneAssetId === 'none' ||
              (oneAssetId == undefined && oneAssetId.indexOf(e.newData.extreme_asset) === -1)
            ) {
              // CREATE CASE ASSET FOR SELECTED ASSET
              // console.log('Create asset here.');
              // console.log(oneAssetId);
              // console.log(oneAssetId.indexOf(e.newData.extreme_asset));

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
                const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
                dateNow.setHours(0, 0, 0, 0);
                const warranty = await Xrm.WebApi.retrieveRecord("extreme_asset", `${assetToCreate}`, "?$select=extreme_warrantyend,extreme_warrantystartdate");
                if (warranty.extreme_warrantystartdate && warranty.extreme_warrantyend) {
                  const startDate = new Date(warranty.extreme_warrantystartdate);
                  const endDate = new Date(warranty.extreme_warrantyend);

                  // console.log("DATES!!!");
                  // console.log(startDate);
                  // console.log(endDate);
                  // console.log(dateNow);

                  if (dateNow >= startDate && dateNow <= endDate) {
                    parentRecord.extreme_warranty = true;
                  }
                  else {
                    parentRecord.extreme_warranty = false;
                  }
                }
                else {
                  parentRecord.extreme_warranty = false;
                }

                await Xrm.WebApi.createRecord("extreme_caseasset", parentRecord).then(
                  async function success(result) {
                    var newId = result.id;
                    newCreatedCasseAssetId = result.id;
                    // console.log(newId);
                  },
                  function (error) {
                    Xrm.Navigation.openErrorDialog({
                      details: error,
                      errorCode: 400,
                      message: error.message
                    });
                  }
                );

                // Create all child assets of the parent
                const childPromises = assetsArray.filter(item => item.extreme_parentasset === assetToCreate).map(async elm => {
                  var childRecord = {};
                  childRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                  childRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${elm.id})`; // Lookup
                  childRecord.extreme_isparent = false; // Boolean
                  childRecord["extreme_ParentCaseAsset@odata.bind"] = `/extreme_caseassets(${newCreatedCasseAssetId})`; // Lookup
                  const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
                  dateNow.setHours(0, 0, 0, 0);
                  const warranty = await Xrm.WebApi.retrieveRecord("extreme_asset", `${elm.id}`, "?$select=extreme_warrantyend,extreme_warrantystartdate");
                  if (warranty.extreme_warrantystartdate && warranty.extreme_warrantyend) {
                    const startDate = new Date(warranty.extreme_warrantystartdate);
                    const endDate = new Date(warranty.extreme_warrantyend);

                    // console.log("DATES!!!");
                    // console.log(startDate);
                    // console.log(endDate);
                    // console.log(dateNow);

                    if (dateNow >= startDate && dateNow <= endDate) {
                      childRecord.extreme_warranty = true;
                    }
                    else {
                      childRecord.extreme_warranty = false;
                    }
                  }
                  else {
                    childRecord.extreme_warranty = false;
                  }

                  return Xrm.WebApi.createRecord("extreme_caseasset", childRecord).then(
                    async function success(result) {
                      var newIdChild = result.id;
                      // console.log(newIdChild);
                    },
                    function (error) {
                      Xrm.Navigation.openErrorDialog({
                        details: error,
                        errorCode: 400,
                        message: error.message
                      });
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
                const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
                dateNow.setHours(0, 0, 0, 0);
                const warranty = await Xrm.WebApi.retrieveRecord("extreme_asset", `${assetToCreate}`, "?$select=extreme_warrantyend,extreme_warrantystartdate");
                if (warranty.extreme_warrantystartdate && warranty.extreme_warrantyend) {
                  const startDate = new Date(warranty.extreme_warrantystartdate);
                  const endDate = new Date(warranty.extreme_warrantyend);

                  // console.log("DATES!!!");
                  // console.log(startDate);
                  // console.log(endDate);
                  // console.log(dateNow);

                  if (dateNow >= startDate && dateNow <= endDate) {
                    record.extreme_warranty = true;
                  }
                  else {
                    record.extreme_warranty = false;
                  }
                }
                else {
                  record.extreme_warranty = false;
                }

                await Xrm.WebApi.createRecord("extreme_caseasset", record).then(
                  async function success(result) {
                    var newId = result.id;
                    newCreatedCasseAssetId = result.id;
                    // console.log(newId);
                  },
                  function (error) {
                    Xrm.Navigation.openErrorDialog({
                      details: error,
                      errorCode: 400,
                      message: error.message
                    });
                  }
                );

                // Create all child assets of the selected asset
                const childPromises = assetsArray.filter(item => item.extreme_parentasset === e.newData.extreme_asset).map(async elm => {
                  var childRecord = {};
                  childRecord["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                  childRecord["extreme_Asset@odata.bind"] = `/extreme_assets(${elm.id})`; // Lookup
                  childRecord.extreme_isparent = false; // Boolean
                  childRecord["extreme_ParentCaseAsset@odata.bind"] = `/extreme_caseassets(${newCreatedCasseAssetId})`; // Lookup
                  const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
                  dateNow.setHours(0, 0, 0, 0);
                  const warranty = await Xrm.WebApi.retrieveRecord("extreme_asset", `${elm.id}`, "?$select=extreme_warrantyend,extreme_warrantystartdate");
                  if (warranty.extreme_warrantystartdate && warranty.extreme_warrantyend) {
                    const startDate = new Date(warranty.extreme_warrantystartdate);
                    const endDate = new Date(warranty.extreme_warrantyend);

                    // console.log("DATES!!!");
                    // console.log(startDate);
                    // console.log(endDate);
                    // console.log(dateNow);

                    if (dateNow >= startDate && dateNow <= endDate) {
                      childRecord.extreme_warranty = true;
                    }
                    else {
                      childRecord.extreme_warranty = false;
                    }
                  }
                  else {
                    childRecord.extreme_warranty = false;
                  }

                  return Xrm.WebApi.createRecord("extreme_caseasset", childRecord).then(
                    async function success(result) {
                      var newIdChild = result.id;
                      // console.log(newIdChild);
                    },
                    function (error) {
                      Xrm.Navigation.openErrorDialog({
                        details: error,
                        errorCode: 400,
                        message: error.message
                      });
                    }
                  );
                });

                promises.push(...childPromises);
              }
            }
          }

          // if owner or quantity is changed for time entries records
          if ((e.newData.owner || e.newData.extreme_quantity || e.newData.extreme_asset) && e.oldData.extreme_producttypecode == 3) {
            Xrm.Utility.showProgressIndicator('Updating time entry... Please wait...');

            const quantity = e.newData.extreme_quantity ? e.newData.extreme_quantity : e.oldData.extreme_quantity;
            const ownerId = e.newData.owner ? e.newData.owner : e.oldData.owner;
            const assetId = e.newData.extreme_asset ? e.newData.extreme_asset : e.oldData.extreme_asset;

            let timeSpent;
            if (unitsArray.find(item => item.id === e.oldData.extreme_unit).name == "PAK" || unitsArray.find(item => item.id === e.oldData.extreme_unit).name == "DAN") {
              timeSpent = quantity * (60 * 8);
            }
            else {
              timeSpent = quantity * 60;
            }


            // Create time entry on another web resource
            await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.updateTimeEntry(e.key, assetId, ownerId, timeSpent);
            setTimeout(async () => {
              await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
            }, 1000);

            // Xrm.Utility.closeProgressIndicator();
          }
          else if (e.newData.extreme_producttypecode == 3) {
            Xrm.Utility.showProgressIndicator('Creating time entry... Please wait...');

            let description = null;
            let highestScheduledEnd = null;
            await Xrm.WebApi.retrieveMultipleRecords("extreme_timeentry", `?$select=description,scheduledend&$filter=_regardingobjectid_value eq ${caseIdForm}&$orderby=scheduledend desc&$top=1`).then(
              function success(results) {
                // console.log(results);

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
                Xrm.Navigation.openErrorDialog({
                  details: error,
                  errorCode: 400,
                  message: error.message
                });
              }
            );

            const dateFrom = highestScheduledEnd === null ? new Date(formContext.getAttribute("extreme_scheduledstart").getValue()) : new Date(highestScheduledEnd);
            const dateTo = highestScheduledEnd === null ? new Date(formContext.getAttribute("extreme_scheduledstart").getValue()) : new Date(highestScheduledEnd);

            // console.log("UNIT FOR CREATE TIME ENTRY");
            // console.log(unitsArray.find(item => item.id === e.oldData.extreme_unit));

            dateTo.addMinutes(e.oldData.extreme_quantity * 60);
            const timeSpent = e.oldData.extreme_quantity * 60;
            // console.log(e.oldData.extreme_quantity);

            await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.createTimeEntry(
              e.oldData.extreme_asset, caseIdForm, e.key, e.oldData.owner, e.oldData.ownername, description, dateFrom, dateTo, timeEntryTypesArray.find(item => item.value == 424000000).value, timeSpent, false
            );

            // Refresh grid for time entries
            setTimeout(async () => {
              await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
            }, 1000);

            // Xrm.Utility.closeProgressIndicator();
          }
          else if (typeof (e.newData.extreme_producttypecode) === 'number' && e.newData.extreme_producttypecode !== 3) {
            Xrm.Utility.showProgressIndicator('Deleting time entry... Please wait...');

            // Create time entry on another web resource
            await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.deleteTimeEntry(e.key);
            // Refresh grid for time entries
            setTimeout(async () => {
              await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
            }, 1000);

            // Xrm.Utility.closeProgressIndicator();
          }

          var record = {};
          if (e.newData.extreme_name) record.extreme_name = e.newData.extreme_name.trim();
          if (e.newData.extreme_asset) record["extreme_Asset@odata.bind"] = `/extreme_assets(${e.newData.extreme_asset})`; // Lookup
          record["extreme_Case@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
          if (e.newData.owner) record["ownerid@odata.bind"] = `/systemusers(${e.newData.owner})`; // Owner
          if (e.newData.extreme_product) record["extreme_Product@odata.bind"] = `/products(${e.newData.extreme_product})`; // Lookup
          if (e.newData.extreme_quantity) record.extreme_quantity = e.newData.extreme_quantity; // Decimal
          if (e.newData.extreme_unit) record["extreme_Unit@odata.bind"] = `/uoms(${e.newData.extreme_unit})`; // Lookup

          await Xrm.WebApi.updateRecord("extreme_caseline", `${e.key}`, record).then(
            async function success(result) {
              var updatedId = result.id;
              // console.log(updatedId);
              await getCaseLines(caseIdForm);
              dataGrid.refresh();
            },
            function (error) {
              Xrm.Navigation.openErrorDialog({
                details: error,
                errorCode: 400,
                message: error.message
              });
            }
          );

          if (e.newData.extreme_asset) {
            // Check case assets after removing
            await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.checkAssetsAfterDelete(oldDataAssetId, caseIdForm);
            // Refresh grid for case assets
            await formContext.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          }

          await Promise.all(promises);

          setTimeout(async () => {
            await this.setClientApiContext(Xrm, formContext);

            Xrm.Utility.closeProgressIndicator();
          }, 1000);

        },
        onRowUpdated() {
          // console.log('RowUpdated');
        },
        onRowRemoving: async (e) => {
          Xrm.Utility.showProgressIndicator('Deleting... Please wait...');
          // console.log('RowRemoving');
          // console.log(e.key);

          // remove N:N relationship
          await Xrm.WebApi.retrieveMultipleRecords("extreme_caseline_caseasset", `?$filter=_extreme_caseline_value eq ${e.key}`).then(
            async function success(results) {
              // console.log(results);
              for (var i = 0; i < results.entities.length; i++) {
                var result = results.entities[i];
                // Columns
                var extreme_caseline_caseassetid = result["extreme_caseline_caseassetid"]; // Guid

                await Xrm.WebApi.deleteRecord("extreme_caseline_caseasset", `${extreme_caseline_caseassetid}`).then(
                  function success(result) {
                    // console.log(result);
                  },
                  function (error) {
                    Xrm.Navigation.openErrorDialog({
                      details: error,
                      errorCode: 400,
                      message: error.message
                    });
                  }
                );

              }
            },
            function (error) {
              Xrm.Navigation.openErrorDialog({
                details: error,
                errorCode: 400,
                message: error.message
              });
            }
          );

          if (e.data.extreme_producttypecode == 3) {
            // Create time entry on another web resource
            await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.deleteTimeEntry(e.key);
            setTimeout(async () => {
              await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
            }, 1000)
          }
          await Xrm.WebApi.deleteRecord("extreme_caseline", `${e.key}`).then(
            async function success(result) {
              // console.log(result);
              await getCaseLines(caseIdForm);
              dataGrid.refresh();
            },
            function (error) {
              Xrm.Navigation.openErrorDialog({
                details: error,
                errorCode: 400,
                message: error.message
              });
            }
          );

          // remove N:N relationship
          // await Xrm.WebApi.retrieveMultipleRecords("extreme_caseline_caseasset", `?$filter=(_extreme_caseline_value eq ${e.key} and _extreme_caseasset_value eq ${e.data.extreme_asset})`).then(
          //   async function success(results) {
          //     // console.log(results);
          //     for (var i = 0; i < results.entities.length; i++) {
          //       var result = results.entities[i];
          //       // Columns
          //       var extreme_caseline_caseassetid = result["extreme_caseline_caseassetid"]; // Guid

          //       await Xrm.WebApi.deleteRecord("extreme_caseline_caseasset", `${extreme_caseline_caseassetid}`).then(
          //         function success(result) {
          //           // console.log(result);
          //         },
          //         function (error) {
          //         Xrm.Navigation.openErrorDialog({
          //   details: error,
          //   errorCode: 400,
          //   message: error.message
          // });
          //         }
          //       );

          //     }
          //   },
          //   function (error) {
          //  Xrm.Navigation.openErrorDialog({
          //   details: error,
          //   errorCode: 400,
          //   message: error.message
          // });
          //   }
          // );
          // Check case assets after removing
          await formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.checkAssetsAfterDelete(e.data.extreme_asset, caseIdForm);
          // Refresh grid for case assets
          await formContext.getControl('WebResource_caseAssets').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);

          await getCaseLines(caseIdForm);
          dataGrid.refresh();
          Xrm.Utility.closeProgressIndicator();
        },
        onRowRemoved: (e) => {
          // console.log('RowRemoved');
          // console.log(caseLinesData._array);
        },
        onSaving() {
          // console.log('Saving');
        },
        onSaved() {
          // console.log('Saved');
        },
        onEditCanceling() {
          // console.log('EditCanceling');
        },
        onEditCanceled() {
          // console.log('EditCanceled');
        }
      }).dxDataGrid('instance');
    });

    // const assetsStore = new DevExpress.data.DataSource({
    //   onLoadError: function (error) {
    //     Xrm.Navigation.openErrorDialog({
    //       details: error,
    //       errorCode: 400,
    //       message: error.message
    //     });
    //   },
    //   store: new DevExpress.data.ArrayStore({
    //     key: 'id',
    //     data: assetsArray,
    //   })
    // });

    // Lookup drowpdown template dxDropDownBox editor
    function dropDownBoxEditorTemplate(cellElement, cellInfo) {

      // console.log('cellElement');
      // console.log(cellElement);
      // console.log('cellInfo');
      // console.log(cellInfo);

      return $("<div>").dxDropDownBox({
        onValueChanged: function (e) {
          // console.log('onValueChanged');
          // console.log(e);

          if (!e.value || !assetsArray.find(item => item.id === e.value)) {
            // console.log("RETURNED");
            return;
          }
          else {
            // console.log("NOT RETURNED");
            cellInfo.setValue(e.value);
            e.component.option("value", e.value);
            e.component.close();
            e.component.focus();
          }
        },
        value: cellInfo.value ? cellInfo.value : null,
        showClearButton: false,
        errorRowEnabled: false,
        acceptCustomValue: true,
        openOnFieldClick: true,
        valueChangeEvent: "input",
        hoverStateEnabled: true,
        focusedRowIndex: 0,
        height: "100%",
        width: '100%',
        keyExpr: "id",
        valueExpr: "id",
        dataSource: assetsArray,
        displayExpr: function (item) {
          return item.name;
        },
        onInput: function (e) {
          // console.log('onInput');
          // console.log(e);

          let ddbInstance = e.component;
          if (!ddbInstance.option("opened")) ddbInstance.open();
          let text = ddbInstance.option("text");
          let value = ddbInstance.option("value");
          if (typeof value === "string") {
            treeList.option("searchPanel.text", text);
          };
        },
        onOpened: function (e) {
          heightAuto = false;
          if (heightAuto === false) {
            const iframeCorrentHeight = wrControl.getObject().offsetHeight;
            wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
          };
          e.component._popup.option('width', 500);
          setTimeout(() => {
            e.component.focus();
          });
        },
        onClosed: function (e) {
          heightAuto = true;
        },
        onDisposing: function (e) {
          heightAuto = true;
        },
        onKeyDown: function (e) {
          let ddbInstance = e.component;
          if (e.event.keyCode !== 40) return;
          if (!ddbInstance.option("opened")) {
            ddbInstance.open();
          } else {
            let treeListInstance = treeList.instance();
            let focusedIndex = treeListInstance.option("focusedRowIndex");
            let visibleRows = treeListInstance.getVisibleRows().length - 1;
            if (focusedIndex === -1 || visibleRows < focusedIndex) focusedIndex = 0;
            treeList.focus(treeListInstance.getRowElement(focusedIndex));
            // treeList.focus(treeListInstance.getRowElement(0));
          }
        },
        contentTemplate: function (e, container) {
          let ddbInstance = e.component;
          let treeListContainer = $("<div>").dxTreeList({
            dataSource: assetsArray,
            keyExpr: "id",
            parentIdExpr: "extreme_parentasset",
            columnAutoWidth: true,
            wordWrapEnabled: true,
            showBorders: true,
            height: "100%",
            width: '100%',
            focusedRowEnabled: true,
            searchPanel: {
              highlightSearchText: false,
            },
            selection: {
              mode: "single"
            },
            columns: [
              {
                dataField: "sn",
                caption: "S/N"
              }, {
                dataField: "name",
                caption: "Name"
              }
            ],
            onSelectionChanged: function (e) {
              // console.log('onSelectionChanged');
              // console.log(e);

              let keys = e.selectedRowKeys,
                hasSelection = keys.length;

              // console.log(keys);
              // console.log(hasSelection);

              // cellInfo.setValue(hasSelection ? keys[0] : null);
              ddbInstance.option("value", hasSelection ? keys[0] : null);
            }
          });
          container.append(treeListContainer);
          treeList = treeListContainer.dxTreeList("instance");
          return container;
        }
      });
    }

  }


  // Select the gridContainer element
  let gridContainer;

  const wrControl = formContext.getControl('WebResource_caseLines');
  wrControl.getContentWindow().then(function (contentWindow) {
    // console.log('HEIGHT MAIN CONTAINER:');
    // console.log(contentWindow.document.getElementById('gridContainer').offsetHeight);
    gridContainer = contentWindow.document.getElementById('gridContainer');
    // console.log(gridContainer);

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

  // Function to strectch web resource container for date picker
  function datePickerTrigger(state) {
    const wrControl = formContext.getControl('WebResource_caseLines');
    wrControl.getContentWindow().then(function (contentWindow) {
      // console.log('HEIGHT MAIN CONTAINER:');
      // console.log(contentWindow.document.getElementById('gridContainer').offsetHeight);
      gridContainer = contentWindow.document.getElementById('gridContainer');
      // console.log(gridContainer);

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
  //   // console.log('HEIGHT MAIN CONTAINER:');
  //   // console.log(contentWindow.document.getElementById('caseLinesMainContainer').offsetHeight);
  //   wrControl.getObject().style.minHeight = `${contentWindow.document.getElementById('caseLinesMainContainer').offsetHeight}px`;
  // });

  // Xrm.Utility.closeProgressIndicator();

  formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.setWebResourceLoaded("WebResource_caseLines");

}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}

// Delete case line
async function deleteCaseLine(caseLineId) {
  await Xrm.WebApi.deleteRecord("extreme_caseline", `${caseLineId}`).then(
    function success(result) {
      // console.log(result);
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message
      });
    }
  );
}