// Global variables
let heightAuto = true;
let jsonForConverting = {};
let treeList = null;
let quoteLinesArray = [];
let customProductsArray = [];
let customUnitsArray = [];
let newIdForCustomProducts = 100001;
let newIdForCustomUnits = 200001;
let isAddingSet = null;
let isDraftStatus = true;
let classifyNeededRows = 0;
let selectedDescriptionItem = null;
let newCreateId = '';
let newCreatedProductId = '';

// Configuration variables
let primaryDefaultUnit = "KOM";
let defaultMargin = 0;
let taxPercentOfAccount = { extreme_tax: 20 };
let ROUNDING_PRICE_PER_UNIT_CONFIG = 2;
let productTypesArray = [];
let vatSettingsArray = [];

// Exchange rates
let quoteCurrency = null;
let quoteCurrencySymbol = null;

// TreeList instance reference
let quoteTreeList = null;

// Main initialization function
async function setClientApiContext(Xrm, formContext) {
  // Set global variables
  window.Xrm = Xrm;
  window._formContext = formContext;
  
  if (!formContext || !formContext.data) return;
  
  Xrm.Utility.showProgressIndicator('Loading... Please wait...');

  const quoteIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
  const userId = replaceCurlyBrackets(Xrm.Utility.getGlobalContext().userSettings.userId, "");
  
  // Check draft status
  await checkQuoteStatus(quoteIdForm);
  
  // Load configuration
  await loadConfiguration();
  
  // Load lookup data
  await loadLookupData();
  
  // Load quote products
  await getQuoteProducts(quoteIdForm);
  
  // Initialize TreeList
  await initTreeList(quoteIdForm, userId);

  Xrm.Utility.closeProgressIndicator();
}

// Check quote status for editing permissions
async function checkQuoteStatus(quoteIdForm) {
  await Xrm.WebApi.retrieveRecord("quote", `${quoteIdForm}`, "?$select=statecode").then(
    function success(result) {
      isDraftStatus = result.statecode === 0;
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

// Load configuration settings
async function loadConfiguration() {
  const formContext = window._formContext;
  
  // Load default margin
  await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_key,extreme_value&$filter=extreme_key eq 'QUOTE_MARGIN'").then(
    function success(results) {
      if (results.entities.length > 0) {
        defaultMargin = parseFloat(results.entities[0]["extreme_value"]);
      }
    },
    function (error) {
      console.log(error.message);
    }
  );

  // Load primary default unit
  await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'PrimaryDefaultUnit'").then(
    function success(results) {
      if (results.entities.length > 0) {
        primaryDefaultUnit = results.entities[0]["extreme_value"];
      }
    },
    function (error) {
      console.log(error.message);
    }
  );

  // Load rounding configuration
  const roundInfo = await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'salesAmountRounding'");
  if (roundInfo.entities.length > 0) {
    ROUNDING_PRICE_PER_UNIT_CONFIG = parseInt(roundInfo.entities[0]["extreme_value"]);
  }

  // Load tax percentage of account
  if (formContext && formContext.getAttribute('customerid') && formContext.getAttribute('customerid').getValue()) {
    const accountId = replaceCurlyBrackets(formContext.getAttribute('customerid').getValue()[0].id, '');
    await Xrm.WebApi.retrieveRecord("account", accountId, "?$select=extreme_tax").then(
      function success(result) {
        taxPercentOfAccount = result;
      },
      function (error) {
        console.log(error.message);
      }
    );
  }

  // Load currency information
  if (formContext && formContext.getAttribute('transactioncurrencyid') && formContext.getAttribute('transactioncurrencyid').getValue()) {
    const currencyId = replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '');
    await Xrm.WebApi.retrieveRecord("transactioncurrency", currencyId, "?$select=isocurrencycode,currencysymbol").then(
      function success(result) {
        quoteCurrency = result.isocurrencycode;
        quoteCurrencySymbol = result.currencysymbol;
      },
      function (error) {
        console.log(error.message);
      }
    );

    // Load exchange rates
    await loadExchangeRates();
  }

  // Set up currency change handler
  if (formContext && formContext.getAttribute('transactioncurrencyid')) {
    formContext.getAttribute('transactioncurrencyid').addOnChange(async () => {
      // Reset exchange rates when currency changes
      const quoteIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
      var record = {};
      record.extreme_chfexchangerate = null;
      record.extreme_dollarexchangerate = null;
      record.extreme_euroexchangerate = null;
      record.extreme_gbpexchangerate = null;
      record.extreme_macedoniandenarexchangerate = null;
      record.extreme_rsdexchangerate = null;

      await Xrm.WebApi.updateRecord("quote", quoteIdForm, record).then(
        function success(result) {
          console.log('Exchange rates reset');
        },
        function (error) {
          console.log('Error resetting exchange rates:', error);
        }
      );
    });
  }
}

// Load exchange rates
async function loadExchangeRates() {
  const formContext = window._formContext;
  const quoteIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
  
  const exchangeRatesForm = await Xrm.WebApi.retrieveRecord(
    "quote",
    quoteIdForm,
    "?$select=extreme_chfexchangerate,extreme_dollarexchangerate,extreme_euroexchangerate,exchangerate,extreme_gbpexchangerate,extreme_macedoniandenarexchangerate,extreme_rsdexchangerate"
  );

  if (quoteCurrency && exchangeRatesForm.extreme_chfexchangerate) {
    jsonForConverting = {
      "EUR": exchangeRatesForm.extreme_euroexchangerate,
      "USD": exchangeRatesForm.extreme_dollarexchangerate,
      "CHF": exchangeRatesForm.extreme_chfexchangerate,
      "RSD": exchangeRatesForm.extreme_rsdexchangerate,
      "MKD": exchangeRatesForm.extreme_macedoniandenarexchangerate,
      "GBP": exchangeRatesForm.extreme_gbpexchangerate
    }
  } else if (quoteCurrency) {
    // Load from configuration if not set on quote
    await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", `?$select=extreme_value,extreme_key&$filter=extreme_key eq '${quoteCurrency}'`).then(
      async function success(results) {
        if (results.entities.length > 0) {
          const result = results.entities[0];
          jsonForConverting = JSON.parse(result.extreme_value);

          // Update quote with exchange rates
          var record = {};
          record.extreme_euroexchangerate = jsonForConverting["EUR"];
          record.extreme_dollarexchangerate = jsonForConverting["USD"];
          record.extreme_chfexchangerate = jsonForConverting["CHF"];
          record.extreme_rsdexchangerate = jsonForConverting["RSD"];
          record.extreme_macedoniandenarexchangerate = jsonForConverting["MKD"];
          record.extreme_gbpexchangerate = jsonForConverting["GBP"];

          await Xrm.WebApi.updateRecord("quote", quoteIdForm, record);
        }
      },
      function (error) {
        console.log('Error loading exchange rates:', error);
      }
    );
  }
}

// Load lookup data
async function loadLookupData() {
  await Promise.all([
    getProductTypes(),
    getVatGroups()
  ]);
}

// Get product types from metadata
async function getProductTypes() {
  productTypesArray = [];
  
  try {
    const productTypeDefs = await Xrm.Utility.getEntityMetadata('quotedetail', ['extreme_producttype']);
    const objOfObjs = productTypeDefs.Attributes._collection.extreme_producttype.OptionSet;
    const arrayOfObjs = Object.keys(objOfObjs).map(key => objOfObjs[key]);

    arrayOfObjs.forEach(elm => {
      productTypesArray.push({
        "id": elm.Value,
        "name": elm.Label.UserLocalizedLabel.Label
      });
    });
  } catch (error) {
    console.log('Error loading product types:', error);
  }
}

// Get VAT groups
async function getVatGroups() {
  vatSettingsArray = [];
  
  await Xrm.WebApi.retrieveMultipleRecords("extreme_vatsetting", "?$select=extreme_vatsettingid,extreme_producttype&$expand=extreme_VATGroup($select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat)").then(
    function success(results) {
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        var extreme_vatsettingid = result["extreme_vatsettingid"];
        var extreme_producttype = result["extreme_producttype"];
        
        if (result.hasOwnProperty("extreme_VATGroup") && result["extreme_VATGroup"] !== null) {
          var extreme_VATGroup_extreme_vatgroupid = result["extreme_VATGroup"]["extreme_vatgroupid"];
          var extreme_VATGroup_extreme_code = result["extreme_VATGroup"]["extreme_code"];
          var extreme_VATGroup_extreme_description = result["extreme_VATGroup"]["extreme_description"];
          var extreme_VATGroup_extreme_vat = result["extreme_VATGroup"]["extreme_vat"];

          vatSettingsArray.push({
            "id": extreme_vatsettingid,
            "extreme_vatsettingid": extreme_vatsettingid,
            "productTypeCode": extreme_producttype,
            "extreme_producttype": extreme_producttype,
            "vatGroupId": extreme_VATGroup_extreme_vatgroupid,
            "vatCode": extreme_VATGroup_extreme_code,
            "vatDescription": extreme_VATGroup_extreme_description,
            "vat": extreme_VATGroup_extreme_vat,
            "extreme_vat": extreme_VATGroup_extreme_vat,
            "vatPercentName": extreme_VATGroup_extreme_code + ' | ' + extreme_VATGroup_extreme_description + ' | ' + extreme_VATGroup_extreme_vat + '%',
            "varPercentFormat": extreme_VATGroup_extreme_vat + '%'
          });
        }
      }
    },
    function (error) {
      console.log(error.message);
    }
  );
}

// Data from DV - Xrm Web Api
async function getQuoteProducts(quoteId) {
  quoteLinesArray = [];
  customProductsArray = [];
  customUnitsArray = [];

  await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=_extreme_vatsetting_value,_extreme_vatgroup_value,extreme_producttype,extreme_createasset,_extreme_area_value,_extreme_technology_value,_extreme_vendorsupplier_value,manualdiscountamount,extreme_isparentitem,_extreme_parentquoteline_value,extreme_supplierbaseamount,extreme_supplierpriceperunit,quotedetailid,baseamount,extreme_tax,extendedamount,extreme_discount,_productid_value,_uomid_value,extreme_fullpd,extreme_fullprice,extreme_fullpricewithdiscount,extreme_fullpricerounded,extreme_margin,extreme_customproductname,extreme_pd,_extreme_pricelist_value,extreme_pricelistcurrency,priceperunit,extreme_pricelistpriceperunit,extreme_pricewithdiscount,extreme_customproductid,quantity,extreme_supplierdiscount,tax,isproductoverridden,extreme_productdescription,extreme_uomid,sequencenumber&$expand=productid($select=productnumber)&$filter=_quoteid_value eq ${quoteId}`).then(
    async function success(results) {
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        
        var extreme_isparentitem = result["extreme_isparentitem"];
        var quotedetailid = result["quotedetailid"];
        var extreme_parentquoteline = result["_extreme_parentquoteline_value"];
        
        // Process parent items
        if (extreme_isparentitem === true) {
          await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=baseamount,extendedamount,extreme_fullpd,extreme_fullpricewithdiscount,manualdiscountamount,extreme_supplierbaseamount,tax&$filter=_extreme_parentquoteline_value eq ${quotedetailid}`).then(
            function success(childResults) {
              let sumBaseAmount = 0;
              let sumExtendedAmount = 0;
              let sumFullPd = 0;
              let sumFullPriceWithDiscount = 0;
              let sumManualDiscount = 0;
              let sumSupplierBaseAmount = 0;
              let sumTax = 0;

              for (var j = 0; j < childResults.entities.length; j++) {
                var childResult = childResults.entities[j];
                sumBaseAmount += childResult["baseamount"] || 0;
                sumExtendedAmount += childResult["extendedamount"] || 0;
                sumFullPd += childResult["extreme_fullpd"] || 0;
                sumFullPriceWithDiscount += childResult["extreme_fullpricewithdiscount"] || 0;
                sumManualDiscount += childResult["manualdiscountamount"] || 0;
                sumSupplierBaseAmount += childResult["extreme_supplierbaseamount"] || 0;
                sumTax += childResult["tax"] || 0;
              }

              result["baseamount"] = sumBaseAmount;
              result["extendedamount"] = sumExtendedAmount;
              result["extreme_fullpd"] = sumFullPd;
              result["extreme_fullpricewithdiscount"] = sumFullPriceWithDiscount;
              result["manualdiscountamount"] = sumManualDiscount;
              result["extreme_supplierbaseamount"] = sumSupplierBaseAmount;
              result["tax"] = sumTax;
              
              // Calculate average discount
              if (sumBaseAmount > 0) {
                result["extreme_discount"] = ((sumBaseAmount - sumFullPriceWithDiscount) / sumBaseAmount) * 100;
              }
            },
            function (error) {
              console.log(error.message);
            }
          );
        }

        // Build quote line object
        var quoteLine = {
          "quotedetailid": result["quotedetailid"],
          "sequencenumber": result["sequencenumber"],
          "baseamount": result["baseamount"],
          "extreme_tax": result["extreme_tax"],
          "extendedamount": result["extendedamount"],
          "extreme_discount": result["extreme_discount"],
          "productid": result["_productid_value"],
          "uomid": result["_uomid_value"],
          "extreme_fullpd": result["extreme_fullpd"],
          "extreme_fullprice": result["extreme_fullprice"],
          "extreme_fullpricewithdiscount": result["extreme_fullpricewithdiscount"],
          "extreme_fullpricerounded": result["extreme_fullpricerounded"],
          "extreme_margin": result["extreme_margin"],
          "extreme_customproductname": result["extreme_customproductname"],
          "extreme_pd": result["extreme_pd"],
          "extreme_pricelist": result["_extreme_pricelist_value"],
          "extreme_pricelistcurrency": result["extreme_pricelistcurrency"],
          "priceperunit": result["priceperunit"],
          "extreme_pricelistpriceperunit": result["extreme_pricelistpriceperunit"],
          "extreme_pricewithdiscount": result["extreme_pricewithdiscount"],
          "extreme_customproductid": result["extreme_customproductid"],
          "quantity": result["quantity"],
          "extreme_supplierdiscount": result["extreme_supplierdiscount"],
          "tax": result["tax"],
          "isproductoverridden": result["isproductoverridden"],
          "extreme_productdescription": result["extreme_productdescription"],
          "extreme_uomid": result["extreme_uomid"],
          "extreme_isparentitem": result["extreme_isparentitem"],
          "_extreme_parentquoteline_value": result["_extreme_parentquoteline_value"],
          "extreme_parentquoteline": result["_extreme_parentquoteline_value"],
          "extreme_supplierbaseamount": result["extreme_supplierbaseamount"],
          "extreme_supplierpriceperunit": result["extreme_supplierpriceperunit"],
          "manualdiscountamount": result["manualdiscountamount"],
          "_extreme_vatsetting_value": result["_extreme_vatsetting_value"],
          "_extreme_vatgroup_value": result["_extreme_vatgroup_value"],
          "extreme_producttype": result["extreme_producttype"],
          "extreme_createasset": result["extreme_createasset"],
          "_extreme_area_value": result["_extreme_area_value"],
          "_extreme_technology_value": result["_extreme_technology_value"],
          "_extreme_vendorsupplier_value": result["_extreme_vendorsupplier_value"]
        };

        // Add product number if available
        if (result.hasOwnProperty("productid") && result["productid"] !== null) {
          quoteLine["productnumber"] = result["productid"]["productnumber"];
        }

        quoteLinesArray.push(quoteLine);

        // Handle custom products
        if (result["isproductoverridden"] === true) {
          customProductsArray.push({
            "productid": result["extreme_customproductid"],
            "name": result["extreme_customproductname"],
            "productId": result["extreme_customproductid"],
            "defaultUnit": result["extreme_uomid"]
          });
        }
      }
    },
    function (error) {
      console.log(error.message);
    }
  );
}

// Initialize TreeList
async function initTreeList(quoteIdForm, userId) {
  DevExpress.localization.locale("de");

  quoteTreeList = $("#treeList").dxTreeList({
    dataSource: quoteDetailsDataSource,
    keyExpr: "quotedetailid",
    parentIdExpr: "_extreme_parentquoteline_value",
    showRowLines: true,
    showBorders: true,
    autoExpandAll: false,
    rootValue: null,
    
    selection: {
      mode: "multiple",
    },
    
    editing: {
      mode: "cell",
      allowUpdating: isDraftStatus,
      allowAdding: isDraftStatus,
      allowDeleting: isDraftStatus,
      useIcons: true,
    },
    
    allowColumnReordering: true,
    allowColumnResizing: true,
    
    scrolling: {
      mode: "standard",
      scrollByContent: true,
      scrollByThumb: true,
    },
    
    rowDragging: {
      allowDropInsideItem: true,
      allowReordering: isDraftStatus,
      onReorder: async function(e) {
        if (!isDraftStatus) {
          Xrm.Navigation.openAlertDialog({ 
            confirmButtonLabel: "Close", 
            text: "Grid is in read-only mode.", 
            title: "Cannot do that" 
          });
          return;
        }
        
        // Update sequence numbers after reordering
        await updateSequenceNumbers();
        e.component.refresh();
      },
    },
    
    toolbar: {
      items: [
        {
          location: "before",
          widget: "dxButton",
          options: {
            icon: "plus",
            text: "Add New",
            onClick() {
              quoteTreeList.addRow();
            }
          }
        },
        {
          location: "before",
          widget: "dxButton",
          options: {
            icon: "trash",
            text: "Delete Selected",
            onClick() {
              const selected = quoteTreeList.getSelectedRowKeys();
              if (selected.length > 0) {
                showDeleteModal(() => {
                  selected.forEach(key => {
                    const rowIndex = quoteTreeList.getRowIndexByKey(key);
                    quoteTreeList.deleteRow(rowIndex);
                  });
                });
              }
            }
          }
        },
        {
          location: "before",
          widget: "dxButton",
          options: {
            text: "Normal",
            onClick(e) {
              // Reset column visibility for normal view
              quoteTreeList.beginUpdate();
              
              const normalColumns = [
                "sequencenumber", "productid", "extreme_customproductname", 
                "quantity", "uomid", "extreme_supplierpriceperunit", 
                "extreme_margin", "priceperunit", "baseamount", 
                "extreme_discount", "extreme_fullpricewithdiscount", 
                "tax", "extendedamount"
              ];
              
              quoteTreeList.option('columns').forEach(col => {
                if (col.dataField && normalColumns.includes(col.dataField)) {
                  quoteTreeList.columnOption(col.dataField, 'visible', true);
                } else if (col.dataField) {
                  quoteTreeList.columnOption(col.dataField, 'visible', false);
                }
              });
              
              quoteTreeList.endUpdate();
            }
          }
        },
        {
          location: "before",
          widget: "dxButton",
          options: {
            text: "Classify",
            onClick(e) {
              // Show classify columns
              quoteTreeList.beginUpdate();
              
              const classifyColumns = [
                "extreme_customproductname", "extreme_createasset", 
                "_extreme_area_value", "_extreme_technology_value", 
                "_extreme_vendorsupplier_value", "extreme_producttype"
              ];
              
              quoteTreeList.option('columns').forEach(col => {
                if (col.dataField && classifyColumns.includes(col.dataField)) {
                  quoteTreeList.columnOption(col.dataField, 'visible', true);
                } else if (col.dataField) {
                  quoteTreeList.columnOption(col.dataField, 'visible', false);
                }
              });
              
              quoteTreeList.endUpdate();
              checkClassifyRows();
            }
          }
        }
      ],
    },
    
    columns: [
      {
        dataField: "sequencenumber",
        caption: "Order",
        dataType: "number",
        sortOrder: "asc",
        visible: false,
        allowEditing: false
      },
      {
        dataField: "productid",
        caption: "Product ID",
        width: 150,
        calculateDisplayValue: "productnumber",
        lookup: {
          dataSource: productsDataSource,
          displayExpr: "productnumber",
          valueExpr: "productid",
        },
        editorOptions: {
          acceptCustomValue: true,
          searchEnabled: true,
          searchExpr: ["productnumber", "name"],
          itemTemplate: function(data, index, container) {
            var row = $("<div>").addClass("row text-wrap");
            var containerFluid = $("<div>").addClass("container-fluid");
            $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
            $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
            row.appendTo(containerFluid);
            container.append(containerFluid);
          },
          onCustomItemCreating: function(args) {
            // Handle custom product creation
            if (!isGuid(args.text)) {
              const customProduct = {
                productid: newIdForCustomProducts++,
                name: args.text,
                productnumber: args.text,
                extreme_isparent: false,
                statecode: 0
              };
              
              // Add to custom products array
              customProductsArray.push({
                productid: customProduct.productid,
                name: customProduct.name,
                productId: customProduct.productnumber,
                defaultUnit: primaryDefaultUnit
              });
              
              args.customItem = customProduct;
            }
          }
        },
        setCellValue: async function(newData, value, currentRowData) {
          newData.productid = value;
          
          if (value && isGuid(value)) {
            // Load product details and recalculate
            try {
              const product = await Xrm.WebApi.retrieveRecord("product", value, "?$select=name,productnumber,_defaultuomid_value");
              newData.extreme_customproductname = product.name;
              newData.uomid = product._defaultuomid_value;
              newData.productnumber = product.productnumber;
              
              // Load price list information and recalculate amounts
              await loadPriceListForProduct(newData, value);
            } catch (error) {
              console.log("Error loading product details:", error);
            }
          }
        },
        validationRules: [
          { type: "required" }
        ],
      },
      {
        dataField: "extreme_customproductname",
        caption: "Name",
        dataType: "string",
        width: 180,
        validationRules: [{ type: "required" }],
        wordWrapEnabled: true,
      },
      {
        dataField: "extreme_productdescription",
        caption: "Description",
        dataType: "string",
        visible: false
      },
      {
        dataField: "quantity",
        caption: "Qty",
        dataType: "number",
        width: 44,
        setCellValue: async function(newData, value, currentRowData) {
          newData.quantity = value;
          await recalculateRowAmounts(newData, currentRowData);
        }
      },
      {
        dataField: "uomid",
        caption: "Unit",
        width: 60,
        lookup: {
          dataSource: uomDataSource,
          displayExpr: "name",
          valueExpr: "uomid"
        },
        editorOptions: {
          acceptCustomValue: true,
          searchEnabled: true
        }
      },
      {
        dataField: "extreme_pricelistpriceperunit",
        caption: "Original PPU",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "extreme_pricelistcurrency",
        caption: "Original Currency",
        dataType: "string",
        allowEditing: false
      },
      {
        dataField: "extreme_supplierpriceperunit",
        caption: "PPU",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        setCellValue: async function(newData, value, currentRowData) {
          newData.extreme_supplierpriceperunit = value;
          await recalculateRowAmounts(newData, currentRowData);
        }
      },
      {
        dataField: "extreme_supplierbaseamount",
        caption: "Base Amount",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "extreme_supplierdiscount",
        caption: "Supplier Disc. %",
        dataType: "number",
        width: 70,
        format: { type: "fixedPoint", precision: 2 },
        setCellValue: async function(newData, value, currentRowData) {
          newData.extreme_supplierdiscount = value;
          await recalculateRowAmounts(newData, currentRowData);
        }
      },
      {
        dataField: "extreme_margin",
        caption: "Margin",
        dataType: "number",
        width: 64,
        format: { type: "fixedPoint", precision: 2 },
        setCellValue: async function(newData, value, currentRowData) {
          newData.extreme_margin = value;
          await recalculateRowAmounts(newData, currentRowData);
        }
      },
      {
        dataField: "priceperunit",
        caption: "Sales PPU",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        setCellValue: async function(newData, value, currentRowData) {
          newData.priceperunit = value;
          await recalculateRowAmounts(newData, currentRowData);
        }
      },
      {
        dataField: "baseamount",
        caption: "Sales Amount",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "extreme_discount",
        caption: "Disc. %",
        dataType: "number",
        width: 62,
        format: { type: "fixedPoint", precision: 2 },
        setCellValue: async function(newData, value, currentRowData) {
          if (currentRowData.extreme_isparentitem !== true) {
            newData.extreme_discount = value;
            await recalculateRowAmounts(newData, currentRowData);
          } else {
            newData.extreme_discount = value;
            // For parent items, distribute to children
            await distributeParentDiscountToChildren(newData, value);
          }
        }
      },
      {
        dataField: "manualdiscountamount",
        caption: "Discount Amount",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "extreme_fullpricewithdiscount",
        caption: "Amount",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        setCellValue: async function(newData, value, currentRowData) {
          newData.extreme_fullpricewithdiscount = value;
          await recalculateRowAmounts(newData, currentRowData);
        }
      },
      {
        dataField: "_extreme_vatsetting_value",
        caption: "VAT %",
        width: 60,
        lookup: {
          dataSource: customVatSettingStore(),
          displayExpr: "varPercentFormat",
          valueExpr: "extreme_vatsettingid"
        },
        setCellValue: async function(newData, value, currentRowData) {
          newData._extreme_vatsetting_value = value;
          
          // Find VAT setting and update tax
          const vatSetting = vatSettingsArray.find(item => item.extreme_vatsettingid === value);
          if (vatSetting) {
            newData.extreme_producttype = vatSetting.extreme_producttype;
            newData.extreme_tax = vatSetting.extreme_vat;
            await recalculateRowAmounts(newData, currentRowData);
          }
        }
      },
      {
        dataField: "extreme_tax",
        caption: "VAT % calc",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "tax",
        caption: "VAT Amount",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "extreme_pd",
        caption: "Profit Per Unit",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "extreme_fullpd",
        caption: "Gross Profit",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "extendedamount",
        caption: "Total Amount",
        dataType: "number",
        format: { type: "fixedPoint", precision: 2 },
        allowEditing: false
      },
      {
        dataField: "_extreme_pricelist_value",
        caption: "Price list",
        width: 130,
        lookup: {
          dataSource: productPriceLevelDataSource(),
          displayExpr: "amount",
          valueExpr: "productpricelevelid"
        }
      },
      {
        dataField: "_extreme_parentquoteline_value",
        caption: "Parent QL",
        dataType: "string",
        visible: false
      },
      {
        dataField: "extreme_isparentitem",
        caption: "Is Parent",
        dataType: "boolean",
        visible: false
      },
      {
        dataField: "extreme_producttype",
        caption: "Type",
        lookup: {
          dataSource: productTypesArray,
          displayExpr: "name",
          valueExpr: "id"
        },
        visible: false
      },
      {
        dataField: "_extreme_area_value",
        caption: "Area",
        lookup: {
          dataSource: extremeAreaDataSource,
          displayExpr: "extreme_name",
          valueExpr: "extreme_areaid"
        }
      },
      {
        dataField: "_extreme_technology_value",
        caption: "Technology",
        lookup: {
          dataSource: extremeTechnologyDataSource,
          displayExpr: "extreme_name",
          valueExpr: "extreme_technologyid"
        }
      },
      {
        dataField: "_extreme_vendorsupplier_value",
        caption: "Vendor/Supplier",
        lookup: {
          dataSource: vendorSupplierDataSource,
          displayExpr: "name",
          valueExpr: "accountid"
        }
      },
      {
        dataField: "extreme_createasset",
        caption: "Create Asset?",
        width: 60,
        dataType: "boolean"
      },
      {
        type: "buttons",
        width: 110,
        buttons: [
          {
            hint: "Description",
            icon: "edit",
            onClick(e) {
              showModal(e.row.data.extreme_productdescription || '', async (desc) => {
                e.row.data.extreme_productdescription = desc;
                // Update in CRM
                await Xrm.WebApi.updateRecord("quotedetail", e.row.data.quotedetailid, {
                  extreme_productdescription: desc
                });
                quoteTreeList.refresh();
              });
            }
          },
          {
            hint: "Inventory Info",
            icon: "info",
            onClick(e) {
              if (e.row.data.productid) {
                inventoryInfo(e.row.data.productid, e.row.data.quotedetailid);
              }
            }
          },
          "delete"
        ]
      }
    ],
    
    onRowUpdated: async function(e) {
      // Update parent sums if this is a child
      if (e.data._extreme_parentquoteline_value) {
        await updateParentSums(e.data._extreme_parentquoteline_value);
      }
    },
    
    onRowInserted: async function(e) {
      // Set default values for new rows
      e.data.extreme_margin = e.data.extreme_margin || defaultMargin;
      e.data.extreme_tax = e.data.extreme_tax || taxPercentOfAccount.extreme_tax;
      e.data.quantity = e.data.quantity || 1;
      
      // Update parent sums if this is a child
      if (e.data._extreme_parentquoteline_value) {
        await updateParentSums(e.data._extreme_parentquoteline_value);
      }
    },
    
    onRowRemoved: async function(e) {
      // Update parent sums if this was a child
      if (e.data._extreme_parentquoteline_value) {
        await updateParentSums(e.data._extreme_parentquoteline_value);
      }
    },
    
    onSelectionChanged: function(e) {
      if (e.selectedRowKeys.length > 0) {
        showDeleteIcon(() => {
          const selected = quoteTreeList.getSelectedRowKeys();
          showDeleteModal(() => {
            selected.forEach(key => {
              const rowIndex = quoteTreeList.getRowIndexByKey(key);
              quoteTreeList.deleteRow(rowIndex);
            });
          });
        });
      } else {
        hideDeleteIcon();
      }
    },
    
    onContentReady: function(e) {
      checkClassifyRows();
      replaceLoader();
    }
    
  }).dxTreeList("instance");
}

// Helper functions
async function recalculateRowAmounts(newData, currentRowData) {
  if (!newData.quantity || !newData.extreme_supplierpriceperunit) return;
  
  const recalcResult = recalculateAmounts({
    quantity: newData.quantity || currentRowData.quantity,
    supplierPricePerUnit: newData.extreme_supplierpriceperunit || currentRowData.extreme_supplierpriceperunit,
    supplierDiscount: newData.extreme_supplierdiscount || currentRowData.extreme_supplierdiscount,
    margin: newData.extreme_margin || currentRowData.extreme_margin,
    pricePerUnit: newData.priceperunit || currentRowData.priceperunit,
    discount: newData.extreme_discount || currentRowData.extreme_discount,
    fullPriceWithDiscount: newData.extreme_fullpricewithdiscount || currentRowData.extreme_fullpricewithdiscount,
    TaxPercent: newData.extreme_tax || currentRowData.extreme_tax
  });

  // Apply calculated values
  Object.keys(recalcResult).forEach(key => {
    newData[key] = recalcResult[key];
  });
}

async function loadPriceListForProduct(newData, productId) {
  // Load price list information for the product
  try {
    const priceList = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", 
      `?$select=amount,_transactioncurrencyid_value&$filter=_productid_value eq ${productId}`);
    
    if (priceList.entities.length > 0) {
      newData.extreme_pricelistpriceperunit = priceList.entities[0].amount;
      newData.extreme_supplierpriceperunit = priceList.entities[0].amount;
    }
  } catch (error) {
    console.log("Error loading price list:", error);
  }
}

async function updateParentSums(parentId) {
  if (!parentId) return;
  
  // Get all children
  const children = quoteTreeList.getVisibleRows()
    .filter(r => r.data && r.data._extreme_parentquoteline_value === parentId);
  
  if (!children.length) return;
  
  // Calculate sums
  let sumBaseAmount = 0,
      sumExtendedAmount = 0,
      sumFullPd = 0,
      sumFullPriceWithDiscount = 0,
      sumManualDiscount = 0,
      sumSupplierBaseAmount = 0,
      sumTax = 0;
      
  children.forEach(child => {
    sumBaseAmount += child.data.baseamount || 0;
    sumExtendedAmount += child.data.extendedamount || 0;
    sumFullPd += child.data.extreme_fullpd || 0;
    sumFullPriceWithDiscount += child.data.extreme_fullpricewithdiscount || 0;
    sumManualDiscount += child.data.manualdiscountamount || 0;
    sumSupplierBaseAmount += child.data.extreme_supplierbaseamount || 0;
    sumTax += child.data.tax || 0;
  });
  
  // Calculate average discount
  const avgDiscount = sumBaseAmount ? ((sumBaseAmount - sumFullPriceWithDiscount) / sumBaseAmount) * 100 : 0;
  
  // Update parent row
  quoteTreeList.cellValue(parentId, "baseamount", sumBaseAmount);
  quoteTreeList.cellValue(parentId, "extendedamount", sumExtendedAmount);
  quoteTreeList.cellValue(parentId, "extreme_fullpd", sumFullPd);
  quoteTreeList.cellValue(parentId, "extreme_fullpricewithdiscount", sumFullPriceWithDiscount);
  quoteTreeList.cellValue(parentId, "manualdiscountamount", sumManualDiscount);
  quoteTreeList.cellValue(parentId, "extreme_supplierbaseamount", sumSupplierBaseAmount);
  quoteTreeList.cellValue(parentId, "tax", sumTax);
  quoteTreeList.cellValue(parentId, "extreme_discount", avgDiscount);
  
  // Update in CRM
  await Xrm.WebApi.updateRecord("quotedetail", parentId, {
    baseamount: sumBaseAmount,
    extendedamount: sumExtendedAmount,
    extreme_fullpd: sumFullPd,
    extreme_fullpricewithdiscount: sumFullPriceWithDiscount,
    manualdiscountamount: sumManualDiscount,
    extreme_supplierbaseamount: sumSupplierBaseAmount,
    tax: sumTax,
    extreme_discount: avgDiscount
  });
}

async function distributeParentDiscountToChildren(parentData, discountPercentage) {
  const children = quoteTreeList.getVisibleRows()
    .filter(r => r.data && r.data._extreme_parentquoteline_value === parentData.quotedetailid);
  
  for (const child of children) {
    quoteTreeList.cellValue(child.key, "extreme_discount", discountPercentage);
    
    // Recalculate child amounts
    const childNewData = { ...child.data, extreme_discount: discountPercentage };
    await recalculateRowAmounts(childNewData, child.data);
    
    // Update child in TreeList
    Object.keys(childNewData).forEach(key => {
      quoteTreeList.cellValue(child.key, key, childNewData[key]);
    });
    
    // Update in CRM
    await Xrm.WebApi.updateRecord("quotedetail", child.key, childNewData);
  }
}

async function updateSequenceNumbers() {
  const rows = quoteTreeList.getVisibleRows();
  let seq = 100;
  
  for (const row of rows) {
    if (!row.data._extreme_parentquoteline_value) { // Parent items
      quoteTreeList.cellValue(row.key, "sequencenumber", seq);
      await Xrm.WebApi.updateRecord("quotedetail", row.key, { sequencenumber: seq });
      seq += 100;
    }
  }
}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}

// Check if string is guid or not
function isGuid(value) {
  const guidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return guidPattern.test(value);
}

// Additional helper functions

// Function for checking classify needed rows
const checkClassifyRows = () => {
  classifyNeededRows = 0;

  if (quoteLinesArray.length > 0) {
    quoteLinesArray.filter((item) =>
      item.extreme_isparentitem === false &&
      (
        (!item._extreme_area_value) ||
        (!item._extreme_technology_value) ||
        (!item._extreme_vendorsupplier_value) ||
        (!item.extreme_producttype)
      )
    ).forEach((item) => {
      classifyNeededRows += 1;
    });
  }

  // Update classify button visibility or style based on needed rows
  if (classifyNeededRows > 0) {
    console.log(`${classifyNeededRows} rows need classification`);
  }
};

// Show modal for description editing
function showModal(currentDescription = '', onSave = null) {
  const parentDoc = parent.document;

  if (parentDoc.getElementById("custom-modal-overlay")) {
    parentDoc.getElementById("custom-modal-overlay").remove();
  }

  // Create overlay
  const overlay = parentDoc.createElement("div");
  overlay.id = "custom-modal-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;

  // Create modal box
  const modal = parentDoc.createElement("div");
  modal.style.cssText = `
    background: #fff;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    padding: 20px;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
    animation: fadeIn 0.2s ease-in-out;
  `;

  modal.innerHTML = `
    <h2 style="margin-top:0; font-size: 20px;">Enter Description</h2>
    <textarea id="descInput" style="width:100%;height:100px;padding:10px;margin-top:10px;margin-bottom:20px;box-sizing:border-box;font-size:14px;border:1px solid #ccc;border-radius:4px;">${currentDescription}</textarea>
    <div style="text-align: right;">
      <button id="cancelBtn" style="
        background:#6c757d;
        color:white;
        border:none;
        padding:8px 16px;
        margin-right:10px;
        border-radius:4px;
        cursor:pointer;
      ">Cancel</button>
      <button id="saveBtn" style="
        background:#007bff;
        color:white;
        border:none;
        padding:8px 16px;
        border-radius:4px;
        cursor:pointer;
      ">Save</button>
    </div>
  `;

  // Optional keyframes for fade in
  const style = parentDoc.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  parentDoc.head.appendChild(style);

  overlay.appendChild(modal);
  parentDoc.body.appendChild(overlay);

  // Events
  const cancelBtn = modal.querySelector("#cancelBtn");
  const saveBtn = modal.querySelector("#saveBtn");
  const textarea = modal.querySelector("#descInput");

  const cleanup = () => {
    parentDoc.body.removeChild(overlay);
  };

  cancelBtn.onclick = cleanup;

  saveBtn.onclick = () => {
    if (typeof onSave === 'function') {
      onSave(textarea.value);
    }
    cleanup();
  };
}

// Exchange rate change function
const exchangeRateChange = async (currency, newValue) => {
  const formContext = window._formContext;
  const quoteIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
  
  await Xrm.WebApi.retrieveMultipleRecords(
    "quotedetail",
    `?$select=extreme_supplierdiscount,extreme_pd,extreme_fullpd,quotedetailid,extreme_tax,extreme_discount,extreme_margin,extreme_pricelistpriceperunit,quantity&$filter=(_quoteid_value eq ${quoteIdForm} and extreme_pricelistcurrency eq '${currency}')`
  ).then(
    async function success(results) {
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        var quotedetailid = result["quotedetailid"];
        var extreme_pricelistpriceperunit = result["extreme_pricelistpriceperunit"];
        var quantity = result["quantity"];
        var extreme_margin = result["extreme_margin"];
        var extreme_discount = result["extreme_discount"];
        var extreme_tax = result["extreme_tax"];
        var extreme_supplierdiscount = result["extreme_supplierdiscount"];

        // Convert price with new exchange rate
        var convertedPrice = extreme_pricelistpriceperunit * newValue;
        
        // Recalculate amounts
        const recalcResult = recalculateAmounts({
          quantity: quantity,
          supplierPricePerUnit: convertedPrice,
          supplierDiscount: extreme_supplierdiscount,
          margin: extreme_margin,
          discount: extreme_discount,
          TaxPercent: extreme_tax
        });

        // Update in CRM
        var record = {};
        record.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
        record.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
        record.priceperunit = recalcResult.pricePerUnit;
        record.baseamount = recalcResult.baseAmount;
        record.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
        record.manualdiscountamount = recalcResult.manualDiscountAmount;
        record.tax = recalcResult.tax;
        record.extendedamount = recalcResult.extendedAmount;
        record.extreme_pd = recalcResult.pdPerUnit;
        record.extreme_fullpd = recalcResult.fullPd;

        await Xrm.WebApi.updateRecord("quotedetail", quotedetailid, record);
      }
    },
    function (error) {
      console.log('Error updating exchange rates:', error);
    }
  );

  // Refresh form
  if (formContext && formContext.data && formContext.data.refresh) {
    formContext.data.refresh(true);
  }
};

// Auto-resize iframe functionality
$(document).ready(function() {
  try {
    const wrControl = Xrm.Page.getControl("WebResource_quoteLinesGrid2");
    if (wrControl) {
      wrControl.getContentWindow().then(function (contentWindow) {
        const gridContainer = contentWindow.document.getElementById("treeList");
        if (gridContainer) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === "style" || mutation.type === "childList") {
                const gridContainerHeight = gridContainer.offsetHeight;
                const iframe = wrControl.getObject();
                if (heightAuto === true) {
                  if (gridContainerHeight > 250) {
                    iframe.style.minHeight = `${gridContainerHeight + 20}px`;
                  } else {
                    iframe.style.minHeight = "255px";
                  }
                }
              }
            });
          });
          const config = { attributes: true, childList: true, subtree: true };
          observer.observe(gridContainer, config);
        }
      });
    }
  } catch (error) {
    console.log('Auto-resize setup error:', error);
  }
});