// VARS
let quoteLinesArray = [];
let productsArray = [];
let customProductsArray = [];
let customUnitsArray = [];
let filterForPriceListsQuery = '';
let priceListsArray = [];
let unitsArray = [];
let currenciesArray = [];
let areasArray = [];
let techsArray = [];
// let vensSupsArray = [];
let vatSettingsArray = [];
let productTypesArray = [];
let defaultMargin = 0;
let newCreateId = '';
let newCreatedProductId = '';
let newIdForCustomProducts = 100001;
let newIdForCustomUnits = 200001;
let heightAuto = true;
let isAddingSet = null;
let isDraftStatus = true;
let classifyNeededRows = 0;
let selectedDescriptionItem = null;
let primaryDefaultUnit = "KOM";
let defaultDiscount = 0;

async function setClientApiContext(Xrm, formContext) {

  // Optionally set Xrm and formContext as global variables on the page.
  window.Xrm = Xrm;
  window._formContext = formContext;

  // Check if string is guid or not
  function isGuid(value) {
    const guidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return guidPattern.test(value);
  }

  Xrm.Utility.showProgressIndicator('Loading... Please wait...');

  const quoteIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
  const userId = replaceCurlyBrackets(Xrm.Utility.getGlobalContext().userSettings.userId, "");
  const taxPercentOfAccount = await Xrm.WebApi.retrieveRecord("account", `${replaceCurlyBrackets(formContext.getAttribute('customerid').getValue()[0].id, '')}`, "?$select=extreme_tax");
  const exchangeRatesForm = await Xrm.WebApi.retrieveRecord("quote", `${quoteIdForm}`, "?$select=extreme_chfexchangerate,extreme_dollarexchangerate,extreme_euroexchangerate,exchangerate,extreme_gbpexchangerate,extreme_macedoniandenarexchangerate,extreme_rsdexchangerate");

  const roundInfo = await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'salesAmountRounding'");
  const ROUNDING_PRICE_PER_UNIT_CONFIG = roundInfo.entities[0]["extreme_value"];

  await Xrm.WebApi.retrieveRecord("quote", `${quoteIdForm}`, "?$select=statecode").then(
    function success(result) {
      // // console.log(result);
      // Columns
      var quoteid = result["quoteid"]; // Guid
      var statecode = result["statecode"]; // State
      var statecode_formatted = result["statecode@OData.Community.Display.V1.FormattedValue"];

      isDraftStatus = statecode === 0 ? true : false;

    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message
      });
    }
  );

  formContext.getAttribute('transactioncurrencyid').addOnChange(async () => {
    var record = {};
    record.extreme_chfexchangerate = null; // Decimal
    record.extreme_dollarexchangerate = null; // Decimal
    record.extreme_euroexchangerate = null; // Decimal
    record.extreme_gbpexchangerate = null; // Decimal
    record.extreme_macedoniandenarexchangerate = null; // Decimal
    record.extreme_rsdexchangerate = null; // Decimal

    await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, record).then(
      function success(result) {
        var updatedId = result.id;
        // // console.log(updatedId);
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

  let quoteCurrency = null;
  let quoteCurrencySymbol = null;
  let jsonForConverting = null;
  if (replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '') !== null) {
    await Xrm.WebApi.retrieveRecord("transactioncurrency", `${replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '')}`, "?$select=isocurrencycode,currencysymbol").then(
      function success(result) {
        // // console.log(result);
        // Columns
        var transactioncurrencyid = result["transactioncurrencyid"]; // Guid
        var isocurrencycode = result["isocurrencycode"]; // Text
        var currencysymbol = result["currencysymbol"]; // Text

        quoteCurrency = isocurrencycode;
        quoteCurrencySymbol = currencysymbol;

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

  await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'PrimaryDefaultUnit'").then(
    function success(results) {
      console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var extreme_configurationid = result["extreme_configurationid"]; // Guid
        var extreme_value = result["extreme_value"]; // Text
        primaryDefaultUnit = extreme_value;
      }
    },
    function (error) {
      console.log(error.message);
    }
  );

  await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_key,extreme_value&$filter=extreme_key eq 'QUOTE_MARGIN'").then(
    function success(results) {
      // console.log(results);
      defaultMargin = parseFloat(results.entities[0]["extreme_value"]); // Text
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message
      });
    }
  );

  if (replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '') !== null) {
    await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", `?$select=extreme_value,extreme_key&$filter=extreme_key eq '${quoteCurrency}'`).then(
      async function success(results) {
        // console.log(results);
        var result = results.entities[0];
        // Columns
        var extreme_configurationid = result["extreme_configurationid"]; // Guid
        var extreme_value = result["extreme_value"]; // Text
        var extreme_key = result["extreme_key"]; // Text

        if (exchangeRatesForm.extreme_chfexchangerate) {
          jsonForConverting = {
            "EUR": exchangeRatesForm.extreme_euroexchangerate,
            "USD": exchangeRatesForm.extreme_dollarexchangerate,
            "CHF": exchangeRatesForm.extreme_chfexchangerate,
            "RSD": exchangeRatesForm.extreme_rsdexchangerate,
            "MKD": exchangeRatesForm.extreme_macedoniandenarexchangerate,
            "GBP": exchangeRatesForm.extreme_gbpexchangerate
          }
        }
        else {
          jsonForConverting = JSON.parse(extreme_value);

          var record = {};
          record.extreme_euroexchangerate = jsonForConverting["EUR"]; // Decimal
          record.extreme_dollarexchangerate = jsonForConverting["USD"]; // Decimal
          record.extreme_chfexchangerate = jsonForConverting["CHF"]; // Decimal
          record.extreme_rsdexchangerate = jsonForConverting["RSD"]; // Decimal
          record.extreme_macedoniandenarexchangerate = jsonForConverting["MKD"]; // Decimal
          record.extreme_gbpexchangerate = jsonForConverting["GBP"]; // Decimal

          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, record).then(
            function success(result) {
              var updatedId = result.id;
              // console.log(updatedId);
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


        // console.log('jsonForConverting');
        // console.log(jsonForConverting);

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

  await getProductTypes();
  await getUnits();
  await getCurrencies();
  await getAreas();
  await getTechs();
  await getVatGroups();
  await getQuoteProducts(quoteIdForm);
  await getPriceLists();

  DevExpress.localization.locale("de");

  initDataGrid(quoteIdForm, userId);

  // Set title for grid inside header
  const quoteLinesDisplayName = await Xrm.Utility.getEntityMetadata('quotedetail').then(
    result => result._displayName,
    error => Xrm.Navigation.openErrorDialog({ details: error, errorCode: 400, message: error.message })
  );
  // setTimeout(() => {
  //   const toolbarBefore = Xrm.Page.getControl("WebResource_quoteLines").getObject().contentWindow.window.document.querySelector('div.dx-toolbar-before');
  //   // console.log('dx toolbar before: ', toolbarBefore);
  //   toolbarBefore.innerHTML = `<span style='font-weight: 500; position: absolute; width: 100px; bottom: 30%; left: 0;'>${quoteLinesDisplayName}</span>`;
  //   // console.log(formContext.data.entity);
  // }, 1000); // Adjust the timeout as needed





  // Optionset values for product types
  async function getProductTypes() {
    productTypesArray = [];

    const productTypeDefs = await Xrm.Utility.getEntityMetadata('quotedetail', ['extreme_producttype']);
    const objOfObjs = productTypeDefs.Attributes._collection.extreme_producttype.OptionSet;
    const arrayOfObjs = Object.keys(objOfObjs).map(key => {
      return objOfObjs[key];
    });

    // console.log(arrayOfObjs);

    arrayOfObjs.forEach(elm => {
      productTypesArray.push({
        "id": elm.value,
        "name": elm.text
      });
    })

    // console.log('PRODUCT TYPES ARRAY');
    // console.log(productTypesArray)
  }

  // Data from DV - Xrm Web Api
  async function getQuoteProducts(quoteId) {

    quoteLinesArray = [];
    customProductsArray = [];
    customUnitsArray = [];
    filterForPriceListsQuery = '';

    await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=_extreme_vatsetting_value,_extreme_vatgroup_value,extreme_producttype,extreme_createasset,_extreme_area_value,_extreme_technology_value,_extreme_vendorsupplier_value,manualdiscountamount,extreme_isparentitem,_extreme_parentquoteline_value,extreme_supplierbaseamount,extreme_supplierpriceperunit,quotedetailid,baseamount,extreme_tax,extendedamount,extreme_discount,_productid_value,_uomid_value,extreme_fullpd,extreme_fullprice,extreme_fullpricewithdiscount,extreme_fullpricerounded,extreme_margin,extreme_customproductname,extreme_pd,_extreme_pricelist_value,extreme_pricelistcurrency,priceperunit,extreme_pricelistpriceperunit,extreme_pricewithdiscount,extreme_customproductid,quantity,extreme_supplierdiscount,tax,isproductoverridden,extreme_productdescription,extreme_uomid,sequencenumber&$expand=productid($select=productnumber)&$filter=_quoteid_value eq ${quoteId}`).then(
      async function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];

          let baseamount_sum = 0;
          let extendedamount_sum = 0;
          let extreme_fullpd_sum = 0;
          let extreme_fullpricewithdiscount_sum = 0;
          let manualdiscountamount_sum = 0;
          let extreme_supplierbaseamount_sum = 0;
          let tax_sum = 0;
          let avarageDiscountPercent = 0;

          var extreme_isparentitem = result["extreme_isparentitem"]; // Boolean
          var quotedetailid = result["quotedetailid"]; // Guid

          if (extreme_isparentitem === true) {
            await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=baseamount,extendedamount,extreme_fullpd,extreme_fullpricewithdiscount,manualdiscountamount,extreme_supplierbaseamount,tax&$filter=_extreme_parentquoteline_value eq ${quotedetailid}`).then(
              function success(results) {
                // console.log(results);
                for (var i = 0; i < results.entities.length; i++) {
                  var result = results.entities[i];
                  // Columns
                  var quotedetailid = result["quotedetailid"]; // Guid
                  var baseamount = result["baseamount"]; // Currency
                  var extendedamount = result["extendedamount"]; // Currency
                  var extreme_fullpd = result["extreme_fullpd"]; // Decimal
                  var extreme_fullpd_formatted = result["extreme_fullpd@OData.Community.Display.V1.FormattedValue"];
                  var extreme_fullpricewithdiscount = result["extreme_fullpricewithdiscount"]; // Decimal
                  var extreme_fullpricewithdiscount_formatted = result["extreme_fullpricewithdiscount@OData.Community.Display.V1.FormattedValue"];
                  var manualdiscountamount = result["manualdiscountamount"]; // Currency
                  var extreme_supplierbaseamount = result["extreme_supplierbaseamount"]; // Decimal
                  var extreme_supplierbaseamount_formatted = result["extreme_supplierbaseamount@OData.Community.Display.V1.FormattedValue"];
                  var tax = result["tax"]; // Currency

                  baseamount_sum += baseamount;
                  extendedamount_sum += extendedamount;
                  extreme_fullpd_sum += extreme_fullpd;
                  extreme_fullpricewithdiscount_sum += extreme_fullpricewithdiscount;
                  manualdiscountamount_sum += manualdiscountamount;
                  extreme_supplierbaseamount_sum += extreme_supplierbaseamount;
                  tax_sum += tax;

                }

                avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;
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

          // Columns
          var baseamount = result["baseamount"]; // Currency
          var extreme_discount = result["extreme_discount"]; // Decimal
          var extreme_discount_formatted = result["extreme_discount@OData.Community.Display.V1.FormattedValue"];
          var productid = result["_productid_value"]; // Lookup
          var productid_formatted = result["_productid_value@OData.Community.Display.V1.FormattedValue"];
          var productid_lookuplogicalname = result["_productid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_fullpd = result["extreme_fullpd"]; // Decimal
          var extreme_fullpd_formatted = result["extreme_fullpd@OData.Community.Display.V1.FormattedValue"];
          var extreme_fullprice = result["extreme_fullprice"]; // Decimal
          var extreme_fullprice_formatted = result["extreme_fullprice@OData.Community.Display.V1.FormattedValue"];
          var extreme_fullpricewithdiscount = result["extreme_fullpricewithdiscount"]; // Decimal
          var extreme_fullpricewithdiscount_formatted = result["extreme_fullpricewithdiscount@OData.Community.Display.V1.FormattedValue"];
          var extreme_fullpricerounded = result["extreme_fullpricerounded"]; // Decimal
          var extreme_fullpricerounded_formatted = result["extreme_fullpricerounded@OData.Community.Display.V1.FormattedValue"];
          var extreme_margin = result["extreme_margin"]; // Decimal
          var extreme_margin_formatted = result["extreme_margin@OData.Community.Display.V1.FormattedValue"];
          var extreme_customproductname = result["extreme_customproductname"]; // Text
          var extreme_pd = result["extreme_pd"]; // Decimal
          var extreme_pd_formatted = result["extreme_pd@OData.Community.Display.V1.FormattedValue"];
          var extreme_pricelist = result["_extreme_pricelist_value"]; // Lookup
          var extreme_pricelist_formatted = result["_extreme_pricelist_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_pricelist_lookuplogicalname = result["_extreme_pricelist_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_pricelistcurrency = result["extreme_pricelistcurrency"]; // Text
          var priceperunit = result["priceperunit"]; // Currency
          var extreme_pricelistpriceperunit = result["extreme_pricelistpriceperunit"]; // Decimal
          var extreme_pricelistpriceperunit_formatted = result["extreme_pricelistpriceperunit@OData.Community.Display.V1.FormattedValue"];
          var extreme_pricewithdiscount = result["extreme_pricewithdiscount"]; // Decimal
          var extreme_pricewithdiscount_formatted = result["extreme_pricewithdiscount@OData.Community.Display.V1.FormattedValue"];
          var extreme_customproductid = result["extreme_customproductid"]; // Text
          var quantity = result["quantity"]; // Decimal
          var quantity_formatted = result["quantity@OData.Community.Display.V1.FormattedValue"];
          var extreme_supplierdiscount = result["extreme_supplierdiscount"]; // Decimal
          var extreme_supplierdiscount_formatted = result["extreme_supplierdiscount@OData.Community.Display.V1.FormattedValue"];
          var tax = result["tax"]; // Currency
          var isproductoverridden = result["isproductoverridden"]; // Boolean
          var isproductoverridden_formatted = result["isproductoverridden@OData.Community.Display.V1.FormattedValue"];
          var extreme_productdescription = result["extreme_productdescription"]; // Multiline Text
          var uomid = result["_uomid_value"]; // Lookup
          var uomid_formatted = result["_uomid_value@OData.Community.Display.V1.FormattedValue"];
          var uomid_lookuplogicalname = result["_uomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_uomid = result["extreme_uomid"]; // Text
          var sequencenumber = result["sequencenumber"]; // Whole Number
          var extendedamount = result["extendedamount"]; // Currency
          var extreme_tax = result["extreme_tax"]; // Decimal
          var extreme_tax_formatted = result["extreme_tax@OData.Community.Display.V1.FormattedValue"];
          var manualdiscountamount = result["manualdiscountamount"]; // Currency
          var extreme_supplierbaseamount = result["extreme_supplierbaseamount"]; // Decimal
          var extreme_supplierbaseamount_formatted = result["extreme_supplierbaseamount@OData.Community.Display.V1.FormattedValue"];
          var extreme_supplierpriceperunit = result["extreme_supplierpriceperunit"]; // Decimal
          var extreme_supplierpriceperunit_formatted = result["extreme_supplierpriceperunit@OData.Community.Display.V1.FormattedValue"];
          var extreme_isparentitem_formatted = result["extreme_isparentitem@OData.Community.Display.V1.FormattedValue"];
          var extreme_parentquoteline = result["_extreme_parentquoteline_value"]; // Lookup
          var extreme_parentquoteline_formatted = result["_extreme_parentquoteline_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_parentquoteline_lookuplogicalname = result["_extreme_parentquoteline_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_area = result["_extreme_area_value"]; // Lookup
          var extreme_area_formatted = result["_extreme_area_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_area_lookuplogicalname = result["_extreme_area_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_technology = result["_extreme_technology_value"]; // Lookup
          var extreme_technology_formatted = result["_extreme_technology_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_technology_lookuplogicalname = result["_extreme_technology_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_vendorsupplier = result["_extreme_vendorsupplier_value"]; // Lookup
          var extreme_vendorsupplier_formatted = result["_extreme_vendorsupplier_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_vendorsupplier_lookuplogicalname = result["_extreme_vendorsupplier_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_createasset = result["extreme_createasset"]; // Boolean
          var extreme_vatgroup = result["_extreme_vatgroup_value"]; // Lookup
          var extreme_vatgroup_formatted = result["_extreme_vatgroup_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_vatgroup_lookuplogicalname = result["_extreme_vatgroup_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_vatsetting = result["_extreme_vatsetting_value"]; // Lookup
          var extreme_vatsetting_formatted = result["_extreme_vatsetting_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_vatsetting_lookuplogicalname = result["_extreme_vatsetting_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_producttype = result["extreme_producttype"]; // Choice

          if (result.hasOwnProperty("productid") && result["productid"] !== null) {
            var productid_productnumber = result["productid"]["productnumber"]; // Text
          }

          let newCustomIdForUnit = 0;
          if (!uomid && extreme_uomid && !unitsArray.find((item) => item.name === extreme_uomid)) {
            newCustomIdForUnit = newIdForCustomUnits++;
          }

          let varForUomid = null;
          if (uomid) {
            varForUomid = uomid
          }
          else if (unitsArray.find((item) => item.name === extreme_uomid)) {
            varForUomid = unitsArray.find((item) => item.name === extreme_uomid).id
          }
          else {
            varForUomid = newCustomIdForUnit
          }

          quoteLinesArray.push({
            "quotedetailid": quotedetailid,
            "productid": extreme_customproductid ? extreme_customproductid : productid,
            "productnumber": extreme_customproductid ? extreme_customproductid : productid_productnumber,
            "extreme_customproductid": extreme_customproductid,
            "extreme_productdescription": extreme_productdescription,
            "isproductoverridden": isproductoverridden,
            "uomid": varForUomid,
            "extreme_uomid": extreme_uomid,
            "extreme_customproductname": extreme_customproductname,
            "extreme_pricelistpriceperunit": extreme_pricelistpriceperunit,
            "extreme_pricelistcurrency": extreme_pricelistcurrency,
            "priceperunit": extreme_isparentitem === true ? '' : priceperunit,
            "extreme_supplierbaseamount": extreme_isparentitem === true ? extreme_supplierbaseamount_sum.toFixed(2) : extreme_supplierbaseamount,
            "extreme_supplierpriceperunit": extreme_supplierpriceperunit,
            "quantity": quantity,
            "baseamount": extreme_isparentitem === true ? baseamount_sum.toFixed(2) : baseamount,
            "extreme_supplierdiscount": extreme_supplierdiscount,
            "extreme_margin": extreme_margin,
            "extreme_fullpricerounded": extreme_fullpricerounded,
            "extreme_fullprice": extreme_fullprice,
            "extreme_discount": extreme_isparentitem === true ? avarageDiscountPercent.toFixed(2) : extreme_discount,
            "manualdiscountamount": extreme_isparentitem === true ? manualdiscountamount_sum.toFixed(2) : manualdiscountamount,
            "extreme_pricewithdiscount": extreme_pricewithdiscount,
            "extreme_fullpricewithdiscount": extreme_isparentitem === true ? extreme_fullpricewithdiscount_sum.toFixed(2) : extreme_fullpricewithdiscount,
            "extreme_tax": extreme_tax,
            "tax": extreme_isparentitem === true ? tax_sum.toFixed(2) : tax,
            "extreme_pd": extreme_pd,
            "extreme_fullpd": extreme_isparentitem === true ? extreme_fullpd_sum.toFixed(2) : extreme_fullpd,
            "extendedamount": extreme_isparentitem === true ? extendedamount_sum.toFixed(2) : extendedamount,
            "extreme_pricelist": extreme_pricelist,
            "sequencenumber": sequencenumber,
            "extreme_isparentitem": extreme_isparentitem,
            "extreme_parentquoteline": extreme_parentquoteline,
            "extreme_area": extreme_area,
            "extreme_technology": extreme_technology,
            "extreme_vendorsupplier": extreme_vendorsupplier,
            "extreme_createasset": extreme_createasset,
            "extreme_vatsetting": extreme_vatsetting,
            "extreme_producttype": extreme_producttype
          });

          if (formContext.getAttribute('revisionnumber').getValue() > 0) {
            quoteLinesArray.filter(item => item.extreme_parentquoteline).forEach(async elm => {

              if (!quoteLinesArray.find(item => item.quotedetailid === elm.extreme_parentquoteline)) {

                const nameOfParentQL = await Xrm.WebApi.retrieveRecord("quotedetail", `${elm.extreme_parentquoteline}`, "?$select=extreme_customproductname");
                const currentQLParentId = await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=quotedetailid&$filter=(extreme_customproductname eq '${nameOfParentQL.extreme_customproductname}' and _quoteid_value eq ${quoteIdForm})`);

                var record = {};
                record["extreme_ParentQuoteLine@odata.bind"] = `/quotedetails(${currentQLParentId.entities[0].quotedetailid})`; // Lookup
                await Xrm.WebApi.updateRecord("quotedetail", `${elm.quotedetailid}`, record);

                elm.extreme_parentquoteline = currentQLParentId.entities[0].quotedetailid;

              }

            });
          }

          if (!productid) {
            customProductsArray.push({
              "productid": extreme_customproductid,
              "name": extreme_customproductid,
              "productName": extreme_customproductname,
              "productnumber": extreme_customproductid
            });
          }

          if (!uomid && extreme_uomid && !unitsArray.find((item) => item.name === extreme_uomid)) {
            customUnitsArray.push({
              "id": newCustomIdForUnit,
              "name": extreme_uomid
            });
          }

        }

        // console.log('QuoteLinesWithGoodProductId');
        // console.log(quoteLinesArray.filter((item) => isGuid(item.productid)));

        const productIdsForFilter = new Set(quoteLinesArray.filter((item) => isGuid(item.productid)).map(item => item.productid));

        filterForPriceListsQuery = Array.from(productIdsForFilter).map(id => `productid/productid eq ${id}`).join(' or ');

        // console.log(`(${filterForPriceListsQuery})`);


        // console.log('productIdsForFilter');
        // console.log(productIdsForFilter);
        // console.log('filterForPriceListsQuery');
        // console.log(filterForPriceListsQuery);

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
  //     await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,extreme_isparent,producttypecode,_pricelevelid_value,_defaultuomid_value,name,productnumber${skipToken !== '' ? '&$skiptoken=' + skipToken : ''}`).then(
  //       async function success(results) {
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
  //           var defaultuomid = result["_defaultuomid_value"]; // Lookup
  //           var defaultuomid_formatted = result["_defaultuomid_value@OData.Community.Display.V1.FormattedValue"];
  //           var defaultuomid_lookuplogicalname = result["_defaultuomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
  //           var pricelevelid = result["_pricelevelid_value"]; // Lookup
  //           var pricelevelid_formatted = result["_pricelevelid_value@OData.Community.Display.V1.FormattedValue"];
  //           var pricelevelid_lookuplogicalname = result["_pricelevelid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
  //           var producttypecode = result["producttypecode"]; // Choice
  //           var extreme_isparent = result["extreme_isparent"]; // Boolean

  //           // const priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$filter=(_pricelevelid_value eq ${pricelevelid} and _productid_value eq ${productid})`);

  //           productsArray.push({
  //             "id": productid,
  //             "name": productnumber ? productnumber + ' - ' + name : name,
  //             "productName": name,
  //             "productId": productnumber,
  //             "productDefaultUnit": defaultuomid,
  //             "pricelevelid": pricelevelid,
  //             "producttypecode": producttypecode,
  //             "extreme_isparent": extreme_isparent
  //           });
  //         }
  //         if (skipToken === '') {
  //           skipTokenExists = false;
  //         }
  //         // console.log(productsArray);
  //       },
  //       function (error) {
  //         Xrm.Navigation.openErrorDialog({
  //           details: error,
  //           errorCode: 400,
  //           message: error.message
  //         });
  //       }
  //     );
  //   }
  // }

  async function getPriceLists() {

    priceListsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value,_pricelevelid_value,_productid_value&$expand=pricelevelid($select=enddate,statuscode)${filterForPriceListsQuery === '' ? '' : `&$filter=(${filterForPriceListsQuery})`}`).then(
      function success(results) {

        // results.nextLink ? skipToken = results.nextLink.split('$skiptoken=')[1] : skipToken = ''
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var productpricelevelid = result["productpricelevelid"]; // Guid
          var amount = result["amount@OData.Community.Display.V1.FormattedValue"]; // Currency
          var amount_num = result["amount"]; // Currency
          var pricelevelid = result["_pricelevelid_value"]; // Lookup
          var pricelevelid_formatted = result["_pricelevelid_value@OData.Community.Display.V1.FormattedValue"];
          var pricelevelid_lookuplogicalname = result["_pricelevelid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var productid = result["_productid_value"]; // Lookup
          var productid_formatted = result["_productid_value@OData.Community.Display.V1.FormattedValue"];
          var productid_lookuplogicalname = result["_productid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var transactioncurrencyid = result["_transactioncurrencyid_value"]; // Lookup
          var transactioncurrencyid_formatted = result["_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue"];
          var transactioncurrencyid_lookuplogicalname = result["_transactioncurrencyid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

          // Many To One Relationships
          if (result.hasOwnProperty("pricelevelid") && result["pricelevelid"] !== null) {
            var pricelevelid_enddate = result["pricelevelid"]["enddate"]; // Date Time
            var pricelevelid_enddate_formatted = result["pricelevelid"]["enddate@OData.Community.Display.V1.FormattedValue"];
            var pricelevelid_statuscode = result["pricelevelid"]["statuscode"]; // Status
            var pricelevelid_statuscode_formatted = result["pricelevelid"]["statuscode@OData.Community.Display.V1.FormattedValue"];

            priceListsArray.push({
              "id": pricelevelid,
              "name": pricelevelid_formatted,
              "amount": amount,
              "amount_num": amount_num,
              "currency_code": transactioncurrencyid_formatted,
              "productid": productid,
              "statuscode": pricelevelid_statuscode
            });

          }

        }

        // console.log('priceListsArray');
        // console.log(priceListsArray);

      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }

    );

    // await Xrm.WebApi.retrieveMultipleRecords("pricelevel", "?$select=pricelevelid,name").then(
    //   function success(results) {
    //     // console.log(results);
    //     for (var i = 0; i < results.entities.length; i++) {
    //       var result = results.entities[i];
    //       // Columns
    //       var pricelevelid = result["pricelevelid"]; // Guid
    //       var name = result["name"]; // Text

    //       priceListsArray.push({
    //         "id": pricelevelid,
    //         "name": name
    //       });

    //     }
    //   },
    //   function (error) {
    //     Xrm.Navigation.openErrorDialog({
    //   details: error,
    //     errorCode: 400,
    //       message: error.message
    // });
    //   }
    // );
  }

  async function getUnits() {

    unitsArray = [];

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

  async function getCurrencies() {

    currenciesArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("transactioncurrency", "?$select=transactioncurrencyid,isocurrencycode,currencyname,currencyprecision,currencysymbol").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var transactioncurrencyid = result["transactioncurrencyid"]; // Guid
          var isocurrencycode = result["isocurrencycode"]; // Text
          var currencyname = result["currencyname"]; // Text
          var currencyprecision = result["currencyprecision"]; // Whole Number
          var currencyprecision_formatted = result["currencyprecision@OData.Community.Display.V1.FormattedValue"];
          var currencysymbol = result["currencysymbol"]; // Text

          currenciesArray.push({
            transactioncurrencyid: transactioncurrencyid,
            isocurrencycode: isocurrencycode,
            currencyname: currencyname,
            currencyprecision: currencyprecision,
            currencyprecision_formatted: currencyprecision_formatted,
            currencysymbol: currencysymbol
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

  // get areas
  async function getAreas() {

    areasArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_area", "?$select=extreme_areaid,extreme_name").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_areaid = result["extreme_areaid"]; // Guid
          var extreme_name = result["extreme_name"]; // Text

          areasArray.push({
            "id": extreme_areaid,
            "name": extreme_name
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

  // get technologies
  async function getTechs() {

    techsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_technology", "?$select=extreme_technologyid,extreme_name").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_technologyid = result["extreme_technologyid"]; // Guid
          var extreme_name = result["extreme_name"]; // Text

          techsArray.push({
            "id": extreme_technologyid,
            "name": extreme_name
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

  // get vat groups
  async function getVatGroups() {

    vatSettingsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_vatsetting", "?$select=extreme_vatsettingid,extreme_producttype&$expand=extreme_VATGroup($select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat)").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_vatsettingid = result["extreme_vatsettingid"]; // Guid
          var extreme_producttype = result["extreme_producttype"]; // Choice
          var extreme_producttype_formatted = result["extreme_producttype@OData.Community.Display.V1.FormattedValue"];

          // Many To One Relationships
          if (result.hasOwnProperty("extreme_VATGroup") && result["extreme_VATGroup"] !== null) {
            var extreme_VATGroup_extreme_vatgroupid = result["extreme_VATGroup"]["extreme_vatgroupid"]; // Guid
            var extreme_VATGroup_extreme_code = result["extreme_VATGroup"]["extreme_code"]; // Text
            var extreme_VATGroup_extreme_description = result["extreme_VATGroup"]["extreme_description"]; // Text
            var extreme_VATGroup_extreme_vat = result["extreme_VATGroup"]["extreme_vat"]; // Decimal
            var extreme_VATGroup_extreme_vat_formatted = result["extreme_VATGroup"]["extreme_vat@OData.Community.Display.V1.FormattedValue"];

            vatSettingsArray.push({
              "id": extreme_vatsettingid,
              "idVatGroup": extreme_VATGroup_extreme_vatgroupid,
              "name": extreme_VATGroup_extreme_description,
              "code": extreme_VATGroup_extreme_code,
              "vat": extreme_VATGroup_extreme_vat,
              "varPercentFormat": extreme_VATGroup_extreme_vat + " %",
              "productTypeCode": extreme_producttype
            });

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

    // await Xrm.WebApi.retrieveMultipleRecords("extreme_vatgroup", "?$select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat").then(
    //   function success(results) {
    //     // console.log(results);
    //     for (var i = 0; i < results.entities.length; i++) {
    //       var result = results.entities[i];
    //       // Columns
    //       var extreme_vatgroupid = result["extreme_vatgroupid"]; // Guid
    //       var extreme_code = result["extreme_code"]; // Text
    //       var extreme_description = result["extreme_description"]; // Text
    //       var extreme_vat = result["extreme_vat"]; // Decimal
    //       var extreme_vat_formatted = result["extreme_vat@OData.Community.Display.V1.FormattedValue"];

    //       vatGroupsArray.push({
    //         "id": extreme_vatgroupid,
    //         "name": extreme_description,
    //         "code": extreme_code,
    //         "vat": extreme_vat,
    //         "varPercentFormat": extreme_vat + " %"
    //       });

    //     }
    //   },
    //   function (error) {
    //     Xrm.Navigation.openErrorDialog({
    //   details: error,
    //     errorCode: 400,
    //       message: error.message
    // });
    //   }
    // );

  }

  // Function to initialize data grid for case lines
  function initDataGrid(quoteIdForm, userId) {
    $(() => {
      const quoteLinesData = new DevExpress.data.ArrayStore({
        key: 'quotedetailid',
        data: [...new Map(quoteLinesArray.map(item => [item.quotedetailid, item])).values()],
      });

      const vendorSupplierODataStore = new DevExpress.data.ODataStore({
        // type: "odata",
        version: 4,
        filterToLower: false,
        url: Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/accounts",
        key: "accountid",
        keyType: "Guid",
        select: [
          'accountid',
          'name',
          'extreme_paname30characters',
          'extreme_relationshiptypeext'
        ],
      });

      const productsODataStore = new DevExpress.data.ODataStore({
        // type: "odata",
        version: 4,
        filterToLower: false,
        url: Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/products",
        key: "productid",
        keyType: "Guid",
        select: [
          'productid',
          'name',
          'productnumber',
          '_defaultuomid_value',
          '_pricelevelid_value',
          'producttypecode',
          'extreme_isparent',
          'statecode'
        ],
      });

      const customProductsStore = new DevExpress.data.ArrayStore({
        key: "productid",
        data: customProductsArray
      });

      // newIdForCustomProducts = 100001
      // // add custom products on init table to lookup field of products if exists
      // if (customProductsArray.length > 0) {
      //   customProductsArray.forEach((e) => {
      //     var newItem = {};
      //     newItem.productid = newIdForCustomProducts++;
      //     newItem.name = e.name;
      //     newItem.productnumber = e.productId
      //     productsODataStore.insert(newItem);
      //   })
      // }

      var unitsStore = new DevExpress.data.ArrayStore({
        key: "id",
        data: unitsArray
      });
      newIdForCustomUnits = 200001;
      if (customUnitsArray.length > 0) {
        customUnitsArray.forEach((e) => {
          var newItem = {};
          newItem.id = newIdForCustomUnits++;
          newItem.name = e.name;
          unitsStore.insert(newItem);
        })
      }

      // let productCurrency = '';

      const dataGrid = $('#gridContainer').dxDataGrid({
        dataSource: {
          store: quoteLinesData,
          reshapeOnPush: true,
          sort: { selector: "sequencenumber", desc: false }
        },

        filterValue: [
          [
            ["extreme_parentquoteline", "=", null],
            "and",
            ["extreme_isparentitem", "=", false]
          ],
          "or",
          [
            ["extreme_parentquoteline", "=", null],
            "and",
            ["extreme_isparentitem", "=", true]
          ],
        ],

        width: "100%",
        wordWrapEnabled: false,
        showColumnLines: true,
        showRowLines: true,
        rowAlternationEnabled: false,
        showBorders: true,
        // headerFilter: {
        //   visible: true,
        //   height: 200
        // },
        paging: {
          pageSize: 100,
        },
        editing: {
          mode: 'cell',
          allowUpdating: isDraftStatus,
          allowAdding: isDraftStatus,
          allowDeleting: isDraftStatus,
          useIcons: true
        },
        sorting: {
          mode: 'none',
        },
        // selection: {
        //   mode: 'multiple',
        // },
        allowColumnResizing: true,
        allowColumnReordering: true,
        columnResizingMode: "mode",
        columnMinWidth: 10,
        columnAutoWidth: false,
        columnHidingEnabled: false,
        scrolling: {
          mode: "standard",
          scrollByContent: true,
          scrollByThumb: true
        },
        rowDragging: {
          allowReordering: isDraftStatus,
          allowDropInsideItem: false,
          showDragIcons: true,
          async onReorder(e) {
            // console.log("reodrering e");
            // console.log(e);

            if (!isDraftStatus) {
              Xrm.Navigation.openAlertDialog({ confirmButtonLabel: "Close", text: "Grid is in read-only mode.", title: "Cannot do that" });
              return;
            }

            const visibleRows = e.component.getVisibleRows();
            const toIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === visibleRows[e.toIndex].data.quotedetailid);
            const fromIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === e.itemData.quotedetailid);

            quoteLinesData._array.splice(fromIndex, 1);
            quoteLinesData._array.splice(toIndex, 0, e.itemData);

            for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length; i++) {
              Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].quotedetailid}`, { sequencenumber: parseInt((i + 1) + "00") });
              quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].sequencenumber = parseInt((i + 1) + "00");
            }

            for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null).length; i++) {
              Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].quotedetailid}`, { sequencenumber: quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1) });
              quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].sequencenumber = quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1);
            }

            await getQuoteProducts(quoteIdForm);
            e.component.refresh();
          },
          data: "root",
          group: 'QuoteLines',
          onAdd
        },
        masterDetail: {
          enabled: true,
          async template(container, options) {
            const productsData = options.data;
            // console.log('productsData');
            // console.log(productsData);
            // console.log(productsData.sequencenumber);

            // container.css('padding', '0 0 10px 10px');
            container.css('background', '#e5edfe');
            container.css('padding', 0);


            $(`<div id="${productsData.quotedetailid}" class="child-grid">`).css({
              // "padding-bottom": "15px",
              "border-bottom": "1rem solid #b6bdca",
              "border-top": "3px solid #b6bdca",
            }).addClass("internal-grid")
              .dxDataGrid({

                // dataSource: new DevExpress.data.DataSource({
                //   store: new DevExpress.data.ArrayStore({
                //     key: 'quotedetailid',
                //     data: childDataArray,
                //   }),
                //   reshapeOnPush: true
                // }),

                // Hide column headers
                showColumnHeaders: false,

                dataSource: {
                  store: quoteLinesData,
                  reshapeOnPush: true
                },

                // filterValue: ["extreme_parentquoteline", "=", productsData.quotedetailid],
                filterValue: [
                  ["extreme_isparentitem", "=", false],
                  "and",
                  ["extreme_parentquoteline", "=", productsData.quotedetailid]
                ],

                width: "100%",
                wordWrapEnabled: false,
                showColumnLines: true,
                showRowLines: true,
                rowAlternationEnabled: false,
                showBorders: true,
                // headerFilter: {
                //   visible: true,
                //   height: 200
                // },
                paging: {
                  pageSize: 100,
                },
                editing: {
                  mode: 'cell',
                  allowUpdating: isDraftStatus,
                  allowAdding: false,
                  allowDeleting: isDraftStatus,
                  useIcons: true
                },
                sorting: {
                  mode: 'none',
                },
                // selection: {
                //   mode: 'multiple',
                // },
                allowColumnResizing: true,
                allowColumnReordering: true,
                columnResizingMode: "mode",
                columnMinWidth: 10,
                columnAutoWidth: false,
                columnHidingEnabled: false,
                scrolling: {
                  mode: "standard",
                  scrollByContent: true,
                  scrollByThumb: true
                },
                rowDragging: {
                  allowReordering: isDraftStatus,
                  allowDropInsideItem: false,
                  showDragIcons: true,
                  async onReorder(e) {
                    // console.log("reodrering e");
                    // console.log(e);

                    if (!isDraftStatus) {
                      Xrm.Navigation.openAlertDialog({ confirmButtonLabel: "Close", text: "Grid is in read-only mode.", title: "Cannot do that" });
                      return;
                    }

                    if (e.fromData === e.toData) {
                      // console.log('inside the same child - reordering');
                    }

                    const visibleRows = e.component.getVisibleRows();
                    const toIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === visibleRows[e.toIndex].data.quotedetailid);
                    const fromIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === e.itemData.quotedetailid);

                    quoteLinesData._array.splice(fromIndex, 1);
                    quoteLinesData._array.splice(toIndex, 0, e.itemData);

                    for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length; i++) {
                      Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].quotedetailid}`, { sequencenumber: parseInt((i + 1) + "00") });
                      quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].sequencenumber = parseInt((i + 1) + "00");
                    }

                    for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null).length; i++) {
                      Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].quotedetailid}`, { sequencenumber: quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1) });
                      quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].sequencenumber = quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1);
                    }

                    await getQuoteProducts(quoteIdForm);
                    e.component.refresh();
                  },
                  data: productsData.quotedetailid,
                  group: 'QuoteLines',
                  onAdd
                },
                columns: [
                  {
                    dataField: 'sequencenumber',
                    caption: 'Order',
                    dataType: 'number',
                    sortOrder: 'asc',
                    visible: dataGrid.columnOption("sequencenumber", "visible")
                  },
                  {
                    dataField: 'productid',
                    caption: 'Product ID',
                    width: 150,
                    calculateDisplayValue: "productnumber",
                    lookup: {
                      dataSource(options) {

                        let filterQuery = null;

                        if (options.data) {
                          if (options.data.extreme_isparentitem === true) {
                            filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]]
                          }
                          else {
                            filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]]
                          };
                        }

                        return {
                          store: productsODataStore,
                          searchExpr: ["productnumber", "name"],
                          paginate: true,
                          pageSize: 100,
                          loadMode: 'raw',
                          filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery,
                        }
                      },
                      displayExpr: 'productnumber',
                      valueExpr: 'productid',
                    },
                    editorOptions: {
                      acceptCustomValue: true,
                      // popupWidth: 600,
                      searchEnabled: true,
                      // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                      searchExpr: ["productnumber", "name"],
                      itemTemplate: function (data, index, container) {
                        var row = $("<div>").addClass("row text-wrap");
                        var containerFluid = $("<div>").addClass("container-fluid");
                        $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
                        $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
                        // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
                        row.appendTo(containerFluid);
                        container.append(containerFluid);
                      },
                      onCustomItemCreating: function (args) {
                        if (!args.text) {
                          args.customItem = null;
                          return;
                        }

                        var newItem = {};
                        newItem.productid = newIdForCustomProducts++;
                        newItem.name = args.text;
                        newItem.productnumber = args.text;
                        customProductsStore.insert(newItem);
                        args.customItem = newItem;
                      },
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
                    // editCellTemplate: dropDownBoxEditorTemplateProducts,
                    setCellValue: async function (newData, value, currentRowData) {

                      if (typeof (value) === 'number' && currentRowData.extreme_isparentitem !== true) {
                        newData.productid = value;

                        const recalcResult = recalculateAmounts({

                          quantity: 1,
                          supplierPricePerUnit: 0,
                          supplierDiscount: 0,
                          margin: defaultMargin,
                          discount: 0,
                          TaxPercent: 0

                        });

                        newData.uomid = unitsStore._array.find(item => item.name.toLowerCase() === primaryDefaultUnit.toLowerCase()).id;

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                        return;
                      }
                      else if (typeof (value) === 'number' && currentRowData.extreme_isparentitem === true) {
                        newData.productid = value;
                        newData.uomid = unitsStore._array.find(item => item.name.toLowerCase() === primaryDefaultUnit.toLowerCase()).id;
                        newData.quantity = 1;

                        return;
                      }

                      // Product types
                      let productType = null;
                      let defaultVatSetting = null;
                      let defaultTax = null;

                      // const productTypeCode = 1;
                      // const serviceTypeCode = 3;

                      if (isGuid(value)) {
                        if (value !== null) {
                          productType = await Xrm.WebApi.retrieveRecord("product", `${value}`, "?$select=producttypecode");
                          newData.extreme_producttype = productType.producttypecode;
                          defaultVatSetting = await Xrm.WebApi.retrieveMultipleRecords("extreme_vatsetting", `?$select=extreme_vatsettingid&$filter=(extreme_producttype eq ${productType.producttypecode} and extreme_customertaxpercentage eq ${taxPercentOfAccount.extreme_tax})`);
                          defaultVatSetting = defaultVatSetting.entities.length > 0 ? defaultVatSetting.entities[0].extreme_vatsettingid : null;
                        }
                      }

                      let priceListItemInfo = [];
                      let classifyLookupsInfo = null;
                      let supplierPricePerUnit = 0;

                      const productInfo = await Xrm.WebApi.retrieveRecord("product", `${value}`, "?$select=_pricelevelid_value,_defaultuomid_value,name");
                      if (productInfo._pricelevelid_value) {
                        if (value !== null && isGuid(value)) {
                          const priceListInfo = await Xrm.WebApi.retrieveRecord("pricelevel", `${productInfo._pricelevelid_value}`, "?$select=enddate,statuscode");

                          if ((new Date(priceListInfo.enddate) > new Date() || priceListInfo.enddate === null) && priceListInfo.statuscode === 100001) {
                            priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$expand=pricelevelid($select=extreme_defaultsalesmargin)&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${value})`);
                          }
                          else {
                            var alertStrings = {
                              confirmButtonLabel: "OK",
                              text: "Price list for this product expired or is no longer active.",
                              title: "Price list"
                            };
                            var alertOptions = { height: 120, width: 260 };
                            Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
                              function (success) {
                                // console.log("Alert dialog closed");
                              },
                              function (error) {
                                console.log(error.message);
                              }
                            );

                            priceListItemInfo = [];
                          }
                        }
                      }
                      if (value !== null && isGuid(value)) {
                        classifyLookupsInfo = await Xrm.WebApi.retrieveRecord("product", `${value}`, "?$select=producttypecode,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");
                      }

                      if (classifyLookupsInfo !== null) {
                        if (classifyLookupsInfo.producttypecode) newData.extreme_producttype = classifyLookupsInfo.producttypecode;
                        if (classifyLookupsInfo._extreme_area_value) newData.extreme_area = classifyLookupsInfo._extreme_area_value;
                        if (classifyLookupsInfo._extreme_technology_value) newData.extreme_technology = classifyLookupsInfo._extreme_technology_value;
                        if (classifyLookupsInfo._extreme_supplier_value) newData.extreme_vendorsupplier = classifyLookupsInfo._extreme_supplier_value;
                      }

                      // set create asset to false
                      newData.extreme_createasset = false;

                      // console.log('priceListItemInfo');
                      // console.log(priceListItemInfo);

                      const priceListMargin = priceListItemInfo.entities ? priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] !== null ? priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] : currentRowData.extreme_margin : currentRowData.extreme_margin;
                      const priceListItemAmount = priceListItemInfo.entities ? priceListItemInfo.entities[0].amount : 0;
                      const priceListItemAmountFormatted = priceListItemInfo.entities ? priceListItemInfo.entities[0]["amount@OData.Community.Display.V1.FormattedValue"] : null;
                      const priceListItemCurrency = priceListItemInfo.entities ? currenciesArray.find((item) => item.transactioncurrencyid === priceListItemInfo.entities[0]._transactioncurrencyid_value).currencysymbol : null;

                      // console.log('SET CELL VALUES');
                      // console.log(priceListItemAmount);
                      // console.log(priceListItemCurrency);
                      // console.log(productInfo._pricelevelid_value);

                      // console.log('newData: ');
                      // console.log(newData);
                      // console.log('value: ');
                      // console.log(value);
                      // console.log('currentRowDataa: ');
                      // console.log(currentRowData);
                      newData.productid = value;
                      if (!isAddingSet) {
                        newData.extreme_tax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
                        defaultTax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
                      };
                      if (!isAddingSet && defaultVatSetting !== null) {
                        newData.extreme_vatsetting = defaultVatSetting;
                        newData.extreme_vatgroup = vatSettingsArray.find(item => item.id === defaultVatSetting).idVatGroup;
                      }
                      newData.extreme_customproductname = productInfo.name;
                      if (productInfo._defaultuomid_value !== null) newData.uomid = productInfo._defaultuomid_value;
                      if (productInfo._pricelevelid_value && !isAddingSet) {
                        if (priceListItemInfo.entities) newData.extreme_pricelist = productInfo._pricelevelid_value;
                        if (priceListItemInfo.entities) newData.extreme_pricelistpriceperunit = priceListItemAmount;
                        if (priceListItemInfo.entities) newData.extreme_pricelistcurrency = priceListItemCurrency;
                        if (quoteCurrencySymbol !== priceListItemCurrency && priceListItemInfo.entities) {
                          newData.extreme_supplierpriceperunit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                          supplierPricePerUnit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                        } else {
                          newData.extreme_supplierpriceperunit = priceListItemAmount;
                          supplierPricePerUnit = priceListItemAmount;
                        }
                      };

                      if (currentRowData.extreme_margin !== null &&
                        supplierPricePerUnit !== null &&
                        currentRowData.extreme_supplierdiscount !== null &&
                        currentRowData.extreme_discount !== null &&
                        !isAddingSet) {
                        // console.log("NEW DATA FROM SELECTING PRODUCT");
                        // console.log(currentRowData.extreme_margin);
                        // console.log(supplierPricePerUnit);
                        // console.log(currentRowData.extreme_discount);
                        // console.log(1);

                        const recalcResult = recalculateAmounts({

                          quantity: 1,
                          supplierPricePerUnit: supplierPricePerUnit,
                          supplierDiscount: currentRowData.extreme_supplierdiscount,
                          margin: priceListMargin,
                          discount: currentRowData.extreme_discount,
                          TaxPercent: defaultTax

                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      }
                    },
                    customizeText: function (cellInfo) {
                      if (cellInfo.valueText) {
                        // // console.log(productsStore._array.find((item) => item.name === cellInfo.valueText))
                        return cellInfo.valueText;
                        // return productsStore._array.find((item) => item.name === cellInfo.valueText)["productId"]
                      }
                      else {
                        return cellInfo.valueText;
                      }
                    },
                    validationRules: [
                      { type: 'required' },
                      {
                        type: 'custom',
                        message: 'Must be at least 3 characters',
                        validationCallback(params) {
                          return params.value.length < 3 && typeof (params.value) == 'number' ? false : true;
                        },
                      }
                    ],
                    visible: dataGrid.columnOption("productid", "visible")
                  },
                  {
                    dataField: 'extreme_customproductname',
                    caption: 'Name',
                    dataType: 'string',
                    wordWrapEnabled: true,
                    width: 180,
                    validationRules: [{ type: 'required' }],
                    visible: dataGrid.columnOption("extreme_customproductname", "visible")
                  },
                  {
                    dataField: 'extreme_productdescription',
                    caption: 'Description',
                    dataType: 'string',
                    visible: dataGrid.columnOption("extreme_productdescription", "visible")
                  },
                  {
                    dataField: 'quantity',
                    caption: 'Qty',
                    dataType: 'number',
                    width: 44,
                    setCellValue: async function (newData, value, currentRowData) {

                      // console.log('currentRowData');
                      // console.log(currentRowData);

                      newData.quantity = value;
                      if (!isAddingSet) {
                        if (
                          currentRowData.extreme_margin !== null &&
                          currentRowData.extreme_supplierpriceperunit !== null &&
                          currentRowData.extreme_supplierdiscount !== null &&
                          currentRowData.extreme_discount !== null &&
                          currentRowData.extreme_tax !== null &&
                          currentRowData.extreme_supplierpriceperunit !== null &&
                          currentRowData.priceperunit !== null &&
                          value !== null
                        ) {
                          const recalcResult = recalculateAmounts({

                            quantity: value,
                            supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                            supplierDiscount: currentRowData.extreme_supplierdiscount,
                            margin: currentRowData.extreme_margin,
                            discount: currentRowData.extreme_discount,
                            TaxPercent: currentRowData.extreme_tax

                          });

                          newData.extreme_margin = recalcResult.margin;
                          newData.quantity = recalcResult.quantity;
                          newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                          newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                          newData.priceperunit = recalcResult.pricePerUnit;
                          newData.baseamount = recalcResult.baseAmount;
                          newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                          newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                          newData.tax = recalcResult.tax;
                          newData.extendedamount = recalcResult.extendedAmount;
                          newData.extreme_pd = recalcResult.pdPerUnit;
                          newData.extreme_fullpd = recalcResult.fullPd;
                          newData.extreme_discount = recalcResult.discountPercentage;
                          newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                        }
                        // else {
                        //   if (currentRowData.priceperunit !== null && value !== null && currentRowData.extreme_discount !== null) {
                        //     newData.extreme_fullpricewithdiscount = (currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value;
                        //     newData.manualdiscountamount = (value * currentRowData.priceperunit) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                        //   };
                        //   if (currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                        //     newData.tax = (((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                        //     newData.extendedamount = ((((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value)) + ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                        //   }
                        // }
                      }
                    },
                    visible: dataGrid.columnOption("quantity", "visible")
                  },
                  {
                    dataField: 'uomid',
                    caption: 'Unit',
                    width: 60,
                    lookup: {
                      dataSource: {
                        store: unitsStore,
                        paginate: true,
                        pageSize: 20,
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
                    },
                    editorOptions: {
                      acceptCustomValue: true,
                      searchEnabled: true,
                      onCustomItemCreating: function (args) {
                        if (!args.text) {
                          args.customItem = null;
                          return;
                        }

                        if (args.customItem = unitsStore._array.find(item => item.name.toLowerCase().trim().startsWith(args.text.toLowerCase().trim()))) {
                          args.customItem = unitsStore._array.find(item => item.name.toLowerCase().trim().startsWith(args.text.toLowerCase().trim()));
                        }
                      }
                    },
                    // validationRules: [{ type: 'required' }],
                    visible: dataGrid.columnOption("uomid", "visible")
                  },
                  {
                    dataField: 'extreme_pricelistpriceperunit',
                    caption: 'Original PPU',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    cellTemplate(container, info) {
                      // console.log(container, info);
                      return info.data.extreme_pricelistpriceperunit !== null && info.data.extreme_pricelistpriceperunit !== undefined ? $('<div>').text(info.data.extreme_pricelistpriceperunit + ` ${info.data.extreme_pricelistcurrency}`) : null;
                    },
                    visible: dataGrid.columnOption("extreme_pricelistpriceperunit", "visible"),
                    allowEditing: false
                  },
                  {
                    dataField: 'extreme_pricelistcurrency',
                    caption: 'Original Currency',
                    dataType: 'string',
                    visible: dataGrid.columnOption("extreme_pricelistcurrency", "visible"),
                    allowEditing: false
                  },
                  {
                    dataField: 'extreme_supplierpriceperunit',
                    caption: 'PPU',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      if (currentRowData.extreme_margin !== null && currentRowData.extreme_supplierdiscount !== null && currentRowData.quantity !== null) {
                        const recalcResult = recalculateAmounts({

                          quantity: currentRowData.quantity,
                          supplierPricePerUnit: value,
                          supplierDiscount: currentRowData.extreme_supplierdiscount,
                          margin: currentRowData.extreme_margin,
                          discount: currentRowData.extreme_discount,
                          TaxPercent: currentRowData.extreme_tax

                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      };
                      if (typeof (currentRowData.productid) === 'number') {
                        newData.extreme_pricelistpriceperunit = value;
                      }
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_supplierpriceperunit", "visible")
                  },
                  {
                    dataField: 'extreme_supplierbaseamount',
                    caption: 'Base Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_supplierbaseamount", "visible")
                  },
                  {
                    dataField: 'extreme_supplierdiscount',
                    caption: 'Supplier Disc. %',
                    dataType: 'number',
                    width: 70,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      if (currentRowData.priceperunit !== null && currentRowData.extreme_supplierpriceperunit !== null && currentRowData.quantity !== null) {
                        const recalcResult = recalculateAmounts({

                          quantity: currentRowData.quantity,
                          supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                          supplierDiscount: value,
                          margin: currentRowData.extreme_margin,
                          discount: currentRowData.extreme_discount,
                          TaxPercent: currentRowData.extreme_tax

                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      }
                    },
                    visible: dataGrid.columnOption("extreme_supplierdiscount", "visible")
                  },
                  {
                    dataField: 'extreme_margin',
                    caption: 'Margin',
                    dataType: 'number',
                    width: 64,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_margin = value;
                      if (currentRowData.extreme_supplierpriceperunit !== null && currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                        const recalcResult = recalculateAmounts({

                          quantity: currentRowData.quantity,
                          supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                          supplierDiscount: currentRowData.extreme_supplierdiscount,
                          margin: value,
                          discount: currentRowData.extreme_discount,
                          TaxPercent: currentRowData.extreme_tax

                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      };
                    },
                    visible: dataGrid.columnOption("extreme_margin", "visible")
                  },
                  {
                    dataField: 'priceperunit',
                    caption: 'Sales PPU',
                    dataType: 'number',
                    cssClass: "cell-highlighted",
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: true,
                    setCellValue: async function (newData, value, currentRowData) {
                      if (currentRowData.quantity !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_margin) {
                        if ((currentRowData.extreme_supplierpriceperunit === null || currentRowData.extreme_supplierpriceperunit === undefined || currentRowData.extreme_supplierpriceperunit === 0) && currentRowData.extreme_margin !== null) {
                          newData.extreme_supplierpriceperunit = value / currentRowData.extreme_margin;

                          const recalcResult = recalculateAmounts({

                            quantity: currentRowData.quantity,
                            supplierPricePerUnit: value / currentRowData.extreme_margin,
                            supplierDiscount: currentRowData.extreme_supplierdiscount,
                            margin: currentRowData.extreme_margin,
                            discount: currentRowData.extreme_discount,
                            TaxPercent: currentRowData.extreme_tax,
                            pricePerUnit: value

                          });

                          newData.extreme_margin = recalcResult.margin;
                          newData.quantity = recalcResult.quantity;
                          newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                          newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                          newData.priceperunit = recalcResult.pricePerUnit;
                          newData.baseamount = recalcResult.baseAmount;
                          newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                          newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                          newData.tax = recalcResult.tax;
                          newData.extendedamount = recalcResult.extendedAmount;
                          newData.extreme_pd = recalcResult.pdPerUnit;
                          newData.extreme_fullpd = recalcResult.fullPd;
                          newData.extreme_discount = recalcResult.discountPercentage;
                          newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                        }
                        else {
                          const recalcResult = recalculateAmounts({

                            quantity: currentRowData.quantity,
                            supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                            supplierDiscount: currentRowData.extreme_supplierdiscount,
                            margin: currentRowData.extreme_margin,
                            discount: currentRowData.extreme_discount,
                            TaxPercent: currentRowData.extreme_tax,
                            pricePerUnit: value

                          });

                          newData.extreme_margin = recalcResult.margin;
                          newData.quantity = recalcResult.quantity;
                          newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                          newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                          newData.priceperunit = recalcResult.pricePerUnit;
                          newData.baseamount = recalcResult.baseAmount;
                          newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                          newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                          newData.tax = recalcResult.tax;
                          newData.extendedamount = recalcResult.extendedAmount;
                          newData.extreme_pd = recalcResult.pdPerUnit;
                          newData.extreme_fullpd = recalcResult.fullPd;
                          newData.extreme_discount = recalcResult.discountPercentage;
                          newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                        }
                      };
                    },
                    customizeText: function (cellInfo) {

                      // console.log('CELL INFO CHILD');
                      // console.log(cellInfo);

                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("priceperunit", "visible")
                  },
                  {
                    dataField: 'baseamount',
                    caption: 'Sales Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("baseamount", "visible")
                  },
                  {
                    dataField: 'extreme_discount',
                    caption: 'Disc. %',
                    dataType: 'number',
                    width: 62,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      // Do so only if it is not parent item (SET)

                      if (currentRowData.extreme_isparentitem !== true) {
                        if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_tax !== null) {
                          const recalcResult = recalculateAmounts({

                            quantity: currentRowData.quantity,
                            supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                            supplierDiscount: currentRowData.extreme_supplierdiscount,
                            margin: currentRowData.extreme_margin,
                            discount: value,
                            TaxPercent: currentRowData.extreme_tax

                          });

                          newData.extreme_margin = recalcResult.margin;
                          newData.quantity = recalcResult.quantity;
                          newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                          newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                          newData.priceperunit = recalcResult.pricePerUnit;
                          newData.baseamount = recalcResult.baseAmount;
                          newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                          newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                          newData.tax = recalcResult.tax;
                          newData.extendedamount = recalcResult.extendedAmount;
                          newData.extreme_pd = recalcResult.pdPerUnit;
                          newData.extreme_fullpd = recalcResult.fullPd;
                          newData.extreme_discount = recalcResult.discountPercentage;
                          newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                        };
                        if (currentRowData.extreme_tax !== null) {
                          newData.tax = (((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                          newData.extendedamount = ((((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity)) + ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                        };
                      }
                      else {
                        newData.extreme_discount = value;
                      }
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    },
                    visible: dataGrid.columnOption("extreme_discount", "visible")
                  },
                  {
                    dataField: 'manualdiscountamount',
                    caption: 'Discount Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    visible: dataGrid.columnOption("manualdiscountamount", "visible"),
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                  },
                  // {
                  //   dataField: 'extreme_pricewithdiscount',
                  //   caption: 'Price w/discount',
                  //   dataType: 'number',
                  //   allowEditing: false,
                  //   customizeText: function (cellInfo) {
                  //     return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " \u20AC";
                  //   }
                  // },
                  {
                    dataField: 'extreme_fullpricewithdiscount',
                    caption: 'Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_fullpricewithdiscount = value;
                      if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_tax !== null) {

                        const recalcResult = recalculateAmounts({

                          quantity: currentRowData.quantity,
                          supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                          supplierDiscount: currentRowData.extreme_supplierdiscount,
                          margin: currentRowData.extreme_margin,
                          discount: currentRowData.extreme_discount,
                          TaxPercent: currentRowData.extreme_tax,
                          fullPriceWithDiscount: value

                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                      };
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_fullpricewithdiscount", "visible")
                  },
                  {
                    dataField: 'extreme_vatsetting',
                    caption: 'VAT %',
                    width: 60,
                    lookup: {
                      dataSource(options) {
                        // console.log('OPTIONS FROM VAT GROUP LOOKUP');
                        // console.log(options);

                        let filterQuery = null;
                        if (options.data && options.data.productid && isGuid(options.data.productid)) {
                          const productInfo = Xrm.WebApi.retrieveRecord("product", `${options.data.productid}`, "?$select=producttypecode");
                          if (options.isNewRow !== true) {
                            if (productInfo.producttypecode) {
                              filterQuery = ["productTypeCode", "=", productInfo.producttypecode]
                            }
                            else if (quoteLinesData._array.find(item => item.quotedetailid === options.data.quotedetailid).extreme_producttype) {
                              filterQuery = ["productTypeCode", "=", quoteLinesData._array.find(item => item.quotedetailid === options.data.quotedetailid).extreme_producttype]
                            }
                          }
                        }

                        return {
                          store: {
                            type: "array",
                            data: vatSettingsArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                          filter: filterQuery
                        }
                      },
                      displayExpr: "varPercentFormat",
                      valueExpr: 'id'
                    },
                    editorOptions: {
                      acceptCustomValue: false,
                      // popupWidth: 600,
                      searchEnabled: true,
                      searchExpr: ["name", "code", "varPercentFormat"],
                      itemTemplate: function (data, index, container) {
                        var containerFluid = $("<div>").addClass("container-fluid");
                        var row = $("<div>").addClass("row text-wrap");
                        $("<div>").addClass("col-2").text(productTypesArray.find(item => item.id === data["productTypeCode"]).name).appendTo(row);
                        $("<div>").addClass("col-6").text(data["name"]).appendTo(row);
                        $("<div>").addClass("col-2").text(data["code"]).appendTo(row);
                        $("<div>").addClass("col-2").text(data["varPercentFormat"]).appendTo(row);
                        row.appendTo(containerFluid);
                        container.append(containerFluid);
                      },
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
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_vatsetting = value;
                      newData.extreme_producttype = vatSettingsArray.find(item => item.id === value).productTypeCode;
                      newData.extreme_tax = vatSettingsArray.find(item => item.id === value).vat;
                      const defaultTax = vatSettingsArray.find(item => item.id === value).vat;

                      if (
                        currentRowData.extreme_margin !== null &&
                        currentRowData.extreme_supplierpriceperunit !== null &&
                        currentRowData.extreme_discount !== null
                      ) {
                        const recalcResult = recalculateAmounts({

                          quantity: currentRowData.quantity,
                          supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                          supplierDiscount: currentRowData.extreme_supplierdiscount,
                          margin: currentRowData.extreme_margin,
                          discount: currentRowData.extreme_discount,
                          TaxPercent: defaultTax

                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      }

                    },
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: isDraftStatus,
                    visible: dataGrid.columnOption("extreme_vatgroup", "visible")
                  },
                  {
                    dataField: 'extreme_tax',
                    caption: 'VAT % calc',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      // console.log('cellInfo');
                      // console.log(cellInfo);
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    },
                    visible: dataGrid.columnOption("extreme_tax", "visible")
                  },
                  {
                    dataField: 'tax',
                    caption: 'VAT Amount',
                    //width: 100,
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("tax", "visible")
                  },
                  {
                    dataField: 'extreme_pd',
                    caption: 'Profit Per Unit',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_pd", "visible")
                  },
                  {
                    dataField: 'extreme_fullpd',
                    caption: 'Gross Profit',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_fullpd", "visible")
                  },
                  {
                    dataField: 'extendedamount',
                    caption: 'Total Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extendedamount", "visible")
                  },
                  {
                    dataField: 'extreme_pricelist',
                    caption: 'Price list',
                    width: 130,
                    wordWrapEnabled: false,
                    lookup: {
                      dataSource(options) {
                        return {
                          store: {
                            type: "array",
                            data: priceListsArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                          filter: options.data ? [['productid', '=', options.data.productid], "and", ['statuscode', '=', 100001]] : null,
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
                    },
                    editorOptions: {
                      acceptCustomValue: false,
                      // popupWidth: 600,
                      searchEnabled: true,
                      searchExpr: ["productId", "productName"],
                      itemTemplate: function (data, index, container) {
                        var containerFluid = $("<div>").addClass("container-fluid");
                        var row = $("<div>").addClass("row text-wrap");
                        $("<div>").addClass("col-6").text(data["name"]).appendTo(row);
                        $("<div>").addClass("col-6").text(data["amount"]).appendTo(row);
                        row.appendTo(containerFluid);
                        container.append(containerFluid);
                      },
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
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_pricelist = value;
                      // console.log('NEW PRICE FROM PRICE LIST CHANGE');

                      const newOrgPrice = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).amount_num;
                      const newOrgCurrency = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).currency_code;
                      const newOrgCurrencyValue = $(`#${newOrgCurrency}`).val() ? parseFloat($(`#${newOrgCurrency}`).val()) : 1;
                      const newOrgCurrencySymbol = currenciesArray.find((item) => item.isocurrencycode == newOrgCurrency).currencysymbol;

                      // console.log(newOrgPrice);
                      // console.log(newOrgCurrency);
                      // console.log(newOrgCurrencyValue);
                      // console.log(newOrgCurrencySymbol);

                      newData.extreme_pricelistpriceperunit = newOrgPrice;
                      newData.extreme_pricelistcurrency = newOrgCurrencySymbol;


                      var pricePerUnit = (newOrgPrice * newOrgCurrencyValue) * currentRowData.extreme_margin;
                      const recalcResult = recalculateAmounts({

                        quantity: currentRowData.quantity,
                        supplierPricePerUnit: (newOrgPrice * newOrgCurrencyValue),
                        supplierDiscount: currentRowData.extreme_supplierdiscount,
                        margin: currentRowData.extreme_margin,
                        discount: currentRowData.extreme_discount,
                        TaxPercent: currentRowData.extreme_tax,
                        pricePerUnit: pricePerUnit

                      });

                      newData.extreme_margin = recalcResult.margin;
                      newData.quantity = recalcResult.quantity;
                      newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                      newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                      newData.priceperunit = recalcResult.pricePerUnit;
                      newData.baseamount = recalcResult.baseAmount;
                      newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                      newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                      newData.tax = recalcResult.tax;
                      newData.extendedamount = recalcResult.extendedAmount;
                      newData.extreme_pd = recalcResult.pdPerUnit;
                      newData.extreme_fullpd = recalcResult.fullPd;
                      newData.extreme_discount = recalcResult.discountPercentage;
                      newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                    },
                    visible: dataGrid.columnOption("extreme_pricelist", "visible")
                  },
                  {
                    dataField: 'extreme_parentquoteline',
                    caption: 'Parent QL',
                    dataType: 'string',
                    visible: dataGrid.columnOption("extreme_parentquoteline", "visible")
                  },
                  {
                    dataField: 'extreme_isparentitem',
                    caption: 'Is Parent',
                    dataType: 'boolean',
                    visible: dataGrid.columnOption("extreme_isparentitem", "visible")
                  },
                  {
                    dataField: 'extreme_producttype',
                    caption: 'Type',
                    lookup: {
                      dataSource(options) {
                        return {
                          store: {
                            type: "array",
                            data: productTypesArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
                    },
                    visible: false
                  },
                  {
                    dataField: 'extreme_area',
                    caption: 'Area',
                    lookup: {
                      dataSource(options) {
                        return {
                          store: {
                            type: "array",
                            data: areasArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
                    },
                    editorOptions: {
                      acceptCustomValue: false,
                      searchEnabled: true,
                      onOpened: function (e) {
                        heightAuto = false;
                        if (heightAuto === false) {
                          const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                          if (iframeCorrentHeight < 450) {
                            wrControl.getObject().style.minHeight = "600px";
                          }
                        }
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_area = value;
                      checkClassifyRows();
                    },
                    visible: dataGrid.columnOption("extreme_area", "visible")
                  },
                  {
                    dataField: 'extreme_technology',
                    caption: 'Technology',
                    lookup: {
                      dataSource(options) {
                        return {
                          store: {
                            type: "array",
                            data: techsArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
                    },
                    editorOptions: {
                      acceptCustomValue: false,
                      searchEnabled: true,
                      onOpened: function (e) {
                        heightAuto = false;
                        if (heightAuto === false) {
                          const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                          if (iframeCorrentHeight < 450) {
                            wrControl.getObject().style.minHeight = "600px";
                          }
                        }
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_technology = value;
                      checkClassifyRows();
                    },
                    visible: dataGrid.columnOption("extreme_technology", "visible")
                  },
                  {
                    dataField: 'extreme_vendorsupplier',
                    caption: 'Vendor/Supplier',
                    calculateDisplayValue: "name",
                    lookup: {
                      dataSource: {
                        store: vendorSupplierODataStore,
                        paginate: true,
                        pageSize: 100,
                        loadMode: 'raw',
                        filter: [["extreme_relationshiptypeext", "=", 424000000], "or", ["extreme_relationshiptypeext", "=", 424000003]]
                      },
                      displayExpr: 'name',
                      valueExpr: 'accountid'
                    },
                    editorOptions: {
                      acceptCustomValue: false,
                      searchEnabled: true,
                      searchExpr: ["extreme_paname30characters", "name"],
                      itemTemplate: function (data, index, container) {
                        var row = $("<div>").addClass("row text-wrap");
                        var containerFluid = $("<div>").addClass("container-fluid");
                        $("<div>").addClass("col-4").text(data["extreme_paname30characters"]).appendTo(row);
                        $("<div>").addClass("col-8").text(data["name"]).appendTo(row);
                        row.appendTo(containerFluid);
                        container.append(containerFluid);
                      },
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
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_vendorsupplier = value;
                      checkClassifyRows();
                    },
                    visible: dataGrid.columnOption("extreme_vendorsupplier", "visible")
                  },
                  {
                    dataField: 'extreme_createasset',
                    caption: 'Asset?',
                    width: 60,
                    dataType: 'boolean',
                    visible: dataGrid.columnOption("extreme_createasset", "visible")
                  },
                  {
                    type: 'buttons',
                    width: 70,
                    buttons: [
                      {
                        hint: 'Description',
                        icon: 'edit',
                        visible(e) {
                          return true;
                        },
                        disabled(e) {
                          return false;
                        },
                        onClick(e) {
                          // console.log(e);

                          const popupContentTemplate = function (item) {

                            if (isDraftStatus) {
                              return $('<div data-mdb-input-init class="form-outline">')
                                .append($(`<textarea class="form-control" id="productDescription" rows="4" style="resize: none;">${item.extreme_productdescription ? item.extreme_productdescription.trim() : ''}</textarea>`))
                            }
                            else {
                              return $('<div class="overflow-auto" style="max-height: 100px;">')
                                .append($(`<p>${item.extreme_productdescription ? item.extreme_productdescription.trim() : ''}</p>`))
                            }

                            return $('<div>').append(
                              $(`<p>Birth Date: <span>${item.extreme_productdescription}</span></p>`)
                            );
                          };
                          const popup = $('#popup').dxPopup({
                            contentTemplate: popupContentTemplate,
                            width: 500,
                            height: 200,
                            container: '.dx-viewport',
                            showTitle: true,
                            title: `Description for ${e.row.data.extreme_customproductname ? e.row.data.extreme_customproductname.length > 20 ? e.row.data.extreme_customproductname.substring(0, 17) + '...' : e.row.data.extreme_customproductname : ''}`,
                            visible: false,
                            dragEnabled: false,
                            hideOnOutsideClick: true,
                            showCloseButton: false,
                            position: {
                              at: 'center',
                              my: 'center',
                              collision: 'fit',
                            },
                            toolbarItems: [{
                              widget: 'dxButton',
                              toolbar: 'bottom',
                              location: 'before',
                              options: {
                                icon: 'save',
                                stylingMode: 'contained',
                                text: 'Save',
                                disabled: !isDraftStatus,
                                async onClick() {
                                  // console.log($('#productDescription').val().trim());

                                  var record = {};
                                  record.extreme_productdescription = "test"; // Multiline Text

                                  await Xrm.WebApi.updateRecord("quotedetail", `${e.row.data.quotedetailid}`, { extreme_productdescription: $('#productDescription').val().trim() });
                                  quoteLinesData.update(e.row.data.quotedetailid, { extreme_productdescription: $('#productDescription').val().trim() });
                                  dataGrid.refresh();

                                  popup.hide();

                                },
                              },
                            }, {
                              widget: 'dxButton',
                              toolbar: 'bottom',
                              location: 'after',
                              options: {
                                text: 'Close',
                                stylingMode: 'outlined',
                                type: 'normal',
                                onClick() {
                                  popup.hide();
                                },
                              },
                            }],
                            onHiding: (e) => {
                              // console.log('Hidding popup event');
                              // console.log(e);
                              selectedDescriptionItem = null;
                            }
                          }).dxPopup('instance');

                          selectedDescriptionItem = e.row.data;
                          popup.option({
                            contentTemplate: () => popupContentTemplate(e.row.data)
                          });
                          popup.show();

                        },
                      },
                      'delete'
                    ],
                  }
                ],
                onEditorPreparing: async (e) => {
                  // console.log('Editor Preparing');
                  // console.log(e);

                  // if (e.dataField == "uomid" && typeof (e.row.data.productid) !== 'number') e.editorOptions.disabled = true;

                  if (e.dataField == "extreme_supplierdiscount" || e.dataField == "extreme_discount" || e.dataField == "extreme_tax") {
                    e.editorOptions.min = 0;
                    e.editorOptions.max = 100;
                  }

                  if (e.dataField == 'extreme_pricelist' && (!e.row.data.productid || typeof (e.row.data.productid) === 'number') || e.row.isNewRow) {
                    e.editorOptions.disabled = true;
                  }
                  if (e.dataField == 'baseamount') {
                    e.editorOptions.disabled = true;
                  }

                },
                onRowPrepared: async (e) => {
                  // console.log('ROW PREPARED');
                  // console.log(e);

                  if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && (e.data.extreme_isparentitem === true || e.data.extreme_isparentitem === false) &&
                    (
                      // (e.data.extreme_producttype === null || e.data.extreme_producttype === undefined) ||
                      (e.data.extreme_area === null || e.data.extreme_area === undefined) ||
                      (e.data.extreme_technology === null || e.data.extreme_technology === undefined) ||
                      (e.data.extreme_vendorsupplier === null || e.data.extreme_vendorsupplier === undefined)
                    )
                  ) {
                    e.rowElement[0].style.backgroundColor = "#fce3c2";
                  }
                  else if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && e.data.extreme_isparentitem === true && quoteLinesData._array.find(item =>
                    // (item.extreme_producttype === null || item.extreme_producttype === undefined) ||
                    (item.extreme_area === null || item.extreme_area === undefined) ||
                    (item.extreme_technology === null || item.extreme_technology === undefined) ||
                    (item.extreme_vendorsupplier === null || item.extreme_vendorsupplier === undefined)
                  )) {
                    e.cells[1].cellElement[0].style.backgroundColor = "#fce3c2";
                  }
                  else {
                    e.rowElement[0].style.backgroundColor = "#fafafa";
                  }

                },
                onFocusedCellChanged: (e) => {
                  // console.log(e);
                },
                onEditingStart: (e) => {
                  // console.log('EditingStart');
                  // console.log(e);
                },
                onEditCanceling: (e) => {
                  // console.log('EditCanceling');
                  // console.log(e);
                },
                onInitNewRow: async (e) => {
                  // console.log('InitNewRow');
                  // console.log(e);
                },
                onRowInserting: async (e) => {
                  // console.log('RowInserting');
                  // console.log(e);
                },
                onRowInserted: async (e) => {
                  // console.log('RowInserted');
                  // console.log(e);
                },
                onRowUpdating: async (e) => {
                  // console.log('RowUpdating');
                  // console.log(e);

                  var record = {};
                  if (e.newData.productid) record["productid@odata.bind"] = `/products(${e.newData.productid})`; // Lookup
                  if (e.newData.extreme_customproductname) record.extreme_customproductname = e.newData.extreme_customproductname; // Text
                  if (e.newData.extreme_productdescription) record.extreme_productdescription = e.newData.extreme_productdescription; // Text
                  if (e.newData.extreme_pricelistpriceperunit || e.newData.extreme_pricelistpriceperunit === 0) record.extreme_pricelistpriceperunit = e.newData.extreme_pricelistpriceperunit; // Decimal
                  if (e.newData.extreme_pricelistcurrency) record.extreme_pricelistcurrency = e.newData.extreme_pricelistcurrency; // Text
                  if (e.newData.extreme_supplierpriceperunit || e.newData.extreme_supplierpriceperunit === 0) record.extreme_supplierpriceperunit = Number(parseFloat(e.newData.extreme_supplierpriceperunit).toFixed(4)); // Currency
                  if (e.newData.quantity || e.newData.quantity === 0) record.quantity = e.newData.quantity; // Decimal
                  if (e.newData.extreme_supplierbaseamount || e.newData.extreme_supplierbaseamount === 0) record.extreme_supplierbaseamount = Number(parseFloat(e.newData.extreme_supplierbaseamount).toFixed(4)); // Currency
                  if (e.newData.extreme_supplierdiscount || e.newData.extreme_supplierdiscount === 0) record.extreme_supplierdiscount = e.newData.extreme_supplierdiscount; // Decimal
                  if (e.newData.extreme_margin || e.newData.extreme_margin === 0) record.extreme_margin = e.newData.extreme_margin; // Decimal
                  if (e.newData.priceperunit || e.newData.priceperunit === 0) record.priceperunit = e.newData.priceperunit; // Decimal
                  if (e.newData.baseamount || e.newData.baseamount === 0) record.baseamount = e.newData.baseamount; // Decimal
                  if (e.newData.extreme_discount || e.newData.extreme_discount === 0) record.extreme_discount = e.newData.extreme_discount; // Decimal
                  if (e.newData.manualdiscountamount || e.newData.manualdiscountamount === 0) record.manualdiscountamount = Number(parseFloat(e.newData.manualdiscountamount).toFixed(4)); // Currency
                  if (e.newData.extreme_pricewithdiscount || e.newData.extreme_pricewithdiscount === 0) record.extreme_pricewithdiscount = e.newData.extreme_pricewithdiscount; // Decimal
                  if (e.newData.extreme_fullpricewithdiscount || e.newData.extreme_fullpricewithdiscount === 0) record.extreme_fullpricewithdiscount = e.newData.extreme_fullpricewithdiscount; // Decimal
                  if (e.newData.extreme_tax || e.newData.extreme_tax === 0) record.extreme_tax = e.newData.extreme_tax; // Decimal
                  if (e.newData.tax || e.newData.tax === 0) record.tax = Number(parseFloat(e.newData.tax).toFixed(4)); // Currency
                  if (e.newData.extreme_pd || e.newData.extreme_pd === 0) record.extreme_pd = e.newData.extreme_pd; // Decimal
                  if (e.newData.extreme_fullpd || e.newData.extreme_fullpd === 0) record.extreme_fullpd = e.newData.extreme_fullpd; // Decimal
                  if (e.newData.extendedamount || e.newData.extendedamount === 0) record.extendedamount = e.newData.extendedamount; // New total amount
                  if (typeof e.newData.extreme_createasset === "boolean") record.extreme_createasset = e.newData.extreme_createasset; // Boolean
                  if (e.newData.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.newData.extreme_pricelist})`; // Lookup
                  if (e.newData.extreme_vatsetting) {
                    record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${e.newData.extreme_vatsetting})`; // Lookup
                    record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatSettingsArray.find(item => item.id === e.newData.extreme_vatsetting).idVatGroup})`; // Lookup
                  }
                  if (e.newData.extreme_producttype) record.extreme_producttype = e.newData.extreme_producttype; // Chooice

                  if (!typeof (e.oldData.productid) === 'number') {
                    if (e.newData.uomid) record["uomid@odata.bind"] = `/uoms(${e.newData.uomid})`; // Lookup
                  }

                  await Xrm.WebApi.updateRecord("quotedetail", `${e.key}`, record).then(
                    async function success(result) {
                      var updatedId = result.id;
                      // console.log(updatedId);
                      // await getQuoteProducts(quoteIdForm);
                      // dataGrid.refresh();
                    },
                    function (error) {
                      Xrm.Navigation.openErrorDialog({
                        details: error,
                        errorCode: 400,
                        message: error.message
                      });
                    }
                  );

                  // console.log("PARENT QUOTE LINE");
                  // console.log(e.oldData.extreme_parentquoteline);
                  if (e.oldData.extreme_parentquoteline) {

                    // console.log("CHILD UPDATED WITH PARENT QUOTE LINE");

                    let baseamount_sum = 0;
                    let extendedamount_sum = 0;
                    let extreme_fullpd_sum = 0;
                    let extreme_fullpricewithdiscount_sum = 0;
                    let manualdiscountamount_sum = 0;
                    let extreme_supplierbaseamount_sum = 0;
                    let tax_sum = 0;
                    let avarageDiscountPercent = 0;

                    quoteLinesData._array.filter((item) => item.extreme_parentquoteline === e.oldData.extreme_parentquoteline).forEach((e) => {
                      baseamount_sum += e.baseamount;
                      extendedamount_sum += e.extendedamount;
                      extreme_fullpd_sum += e.extreme_fullpd;
                      extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
                      manualdiscountamount_sum += e.manualdiscountamount;
                      extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
                      tax_sum += e.tax;
                    });

                    avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;

                    quoteLinesData.update(e.oldData.extreme_parentquoteline, {
                      baseamount: baseamount_sum.toFixed(2),
                      extendedamount: extendedamount_sum.toFixed(2),
                      extreme_fullpd: extreme_fullpd_sum.toFixed(2),
                      extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum.toFixed(2),
                      manualdiscountamount: manualdiscountamount_sum.toFixed(2),
                      extreme_supplierbaseamount: extreme_supplierbaseamount_sum.toFixed(2),
                      tax: tax_sum.toFixed(2),
                      extreme_discount: avarageDiscountPercent.toFixed(2)
                    });

                    dataGrid.getController('data').updateItems({
                      changeType: 'update',
                      rowIndices: [dataGrid.getRowIndexByKey(e.oldData.extreme_parentquoteline)]
                    });

                  }

                  formContext.data.refresh(true);

                },
                onRowUpdated(e) {
                  // console.log('RowUpdated');
                  // console.log(e);
                },
                onRowRemoving: async (e) => {
                  // console.log('RowRemoving');
                  // console.log(e);

                  Xrm.Utility.showProgressIndicator('Deleting... Please wait...');

                  quoteLinesData.remove(e.key);
                  await Xrm.WebApi.deleteRecord("quotedetail", `${e.key}`).then(
                    async function success(result) {
                      // console.log(result);
                      await getQuoteProducts(quoteIdForm);
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

                  if (e.data.extreme_parentquoteline) {
                    // console.log("CHILD UPDATED WITH PARENT QUOTE LINE");
                    const parentQuoteLineGUID = e.data.extreme_parentquoteline;

                    let baseamount_sum = 0;
                    let extendedamount_sum = 0;
                    let extreme_fullpd_sum = 0;
                    let extreme_fullpricewithdiscount_sum = 0;
                    let manualdiscountamount_sum = 0;
                    let extreme_supplierbaseamount_sum = 0;
                    let tax_sum = 0;
                    let avarageDiscountPercent = 0;

                    quoteLinesData._array.filter((item) => item.extreme_parentquoteline === parentQuoteLineGUID).forEach((e) => {
                      baseamount_sum += e.baseamount;
                      extendedamount_sum += e.extendedamount;
                      extreme_fullpd_sum += e.extreme_fullpd;
                      extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
                      manualdiscountamount_sum += e.manualdiscountamount;
                      extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
                      tax_sum += e.tax;
                    });

                    avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;

                    quoteLinesData.update(parentQuoteLineGUID, {
                      baseamount: baseamount_sum.toFixed(2),
                      extendedamount: extendedamount_sum.toFixed(2),
                      extreme_fullpd: extreme_fullpd_sum.toFixed(2),
                      extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum.toFixed(2),
                      manualdiscountamount: manualdiscountamount_sum.toFixed(2),
                      extreme_supplierbaseamount: extreme_supplierbaseamount_sum.toFixed(2),
                      tax: tax_sum.toFixed(2),
                      extreme_discount: avarageDiscountPercent.toFixed(2)
                    });

                    dataGrid.getController('data').updateItems({
                      changeType: 'update',
                      rowIndices: [dataGrid.getRowIndexByKey(parentQuoteLineGUID)]
                    });
                  }

                  // reodred grid
                  for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length; i++) {
                    Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].quotedetailid}`, { sequencenumber: parseInt((i + 1) + "00") });
                    quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].sequencenumber = parseInt((i + 1) + "00");
                  }

                  for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null).length; i++) {
                    Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].quotedetailid}`, { sequencenumber: quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1) });
                    quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].sequencenumber = quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1);
                  }

                  formContext.data.refresh(true);

                  Xrm.Utility.closeProgressIndicator();

                },
                onRowRemoved: (e) => {
                  // console.log('RowRemoved');
                },
                onSaving() {
                  // console.log('Saving');
                },
                onSaved() {
                  // console.log('Saved');
                },
                onCellDblClick(e) {
                  // console.log('CELL DOUBLE CLICK');
                  // console.log(e);

                  if (e.column.dataField === "productid" && isGuid(e.data.productid) && e.data.productid) {
                    // Create an anchor element
                    const globalContext = Xrm.Utility.getGlobalContext();
                    globalContext.getCurrentAppUrl();

                    // console.log('CLIENT URL');
                    // console.log(globalContext.getCurrentAppUrl());

                    const link = document.createElement('a');
                    link.href = `${globalContext.getCurrentAppUrl()}&pagetype=entityrecord&etn=product&id=${e.data.productid}`;
                    link.target = "_blank";

                    // Append the anchor to the body (required for Firefox)
                    document.body.appendChild(link);

                    // Trigger a click event on the anchor
                    link.click();

                    // Remove the anchor from the body
                    document.body.removeChild(link);
                  }

                  if (e.column.dataField === "extreme_customproductname" && isGuid(e.data.productid)) {

                    inventoryInfo(e.data.productid, e.data.quotedetailid);

                  }

                },
                onEditCanceling() {
                  // console.log('EditCanceling');
                },
                onEditCanceled() {
                  // console.log('EditCanceled');
                },
                onContentReady: function (e) {
                  e.component.columnOption("command:select", "visibleIndex", 999);
                }
              }).appendTo(container);
          },
        },
        columns: [
          {
            dataField: 'sequencenumber',
            caption: 'Order',
            dataType: 'number',
            sortOrder: 'asc',
            visible: false
          },
          {
            dataField: 'productid',
            caption: 'Product ID',
            width: 120,
            calculateDisplayValue: "productnumber",
            lookup: {
              dataSource(options) {

                let filterQuery = null;

                if (options.data) {
                  if (options.data.extreme_isparentitem === true) {
                    filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]]
                  }
                  else {
                    filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]]
                  };
                }

                return {
                  store: productsODataStore,
                  searchExpr: ["productnumber", "name"],
                  paginate: true,
                  pageSize: 100,
                  loadMode: 'raw',
                  filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery,
                }
              },
              displayExpr: 'productnumber',
              valueExpr: 'productid',
            },
            editorOptions: {
              acceptCustomValue: true,
              // popupWidth: 600,
              searchEnabled: true,
              // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
              searchExpr: ["productnumber", "name"],
              itemTemplate: function (data, index, container) {
                var row = $("<div>").addClass("row text-wrap");
                var containerFluid = $("<div>").addClass("container-fluid");
                $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
                $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
                // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
                row.appendTo(containerFluid);
                container.append(containerFluid);
              },
              onCustomItemCreating: function (args) {
                if (!args.text) {
                  args.customItem = null;
                  return;
                }

                var newItem = {};
                newItem.productid = newIdForCustomProducts++;
                newItem.name = args.text;
                newItem.productnumber = args.text;
                customProductsStore.insert(newItem);
                args.customItem = newItem;
              },
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
            // editCellTemplate: dropDownBoxEditorTemplateProducts,
            setCellValue: async function (newData, value, currentRowData) {

              if (typeof (value) === 'number' && currentRowData.extreme_isparentitem !== true) {
                newData.productid = value;

                const discountValue = parseFloat($('#discountInput').val()) || 0;
                const recalcResult = recalculateAmounts({

                  quantity: 1,
                  supplierPricePerUnit: 0,
                  supplierDiscount: 0,
                  margin: defaultMargin,
                  discount: discountValue,
                  TaxPercent: 0

                });

                newData.uomid = unitsStore._array.find(item => item.name.toLowerCase() === primaryDefaultUnit.toLowerCase()).id;

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                return;
              }
              else if (typeof (value) === 'number' && currentRowData.extreme_isparentitem === true) {
                newData.productid = value;
                newData.uomid = unitsStore._array.find(item => item.name.toLowerCase() === primaryDefaultUnit.toLowerCase()).id;
                newData.quantity = 1;

                return;
              }

              // Product types
              let productType = null;
              let defaultVatSetting = null;
              let defaultTax = null;

              // const productTypeCode = 1;
              // const serviceTypeCode = 3;

              if (isGuid(value)) {
                if (value !== null) {
                  productType = await Xrm.WebApi.retrieveRecord("product", `${value}`, "?$select=producttypecode");
                  newData.extreme_producttype = productType.producttypecode;
                  defaultVatSetting = await Xrm.WebApi.retrieveMultipleRecords("extreme_vatsetting", `?$select=extreme_vatsettingid&$filter=(extreme_producttype eq ${productType.producttypecode} and extreme_customertaxpercentage eq ${taxPercentOfAccount.extreme_tax})`);
                  defaultVatSetting = defaultVatSetting.entities.length > 0 ? defaultVatSetting.entities[0].extreme_vatsettingid : null;
                }
              }

              let priceListItemInfo = [];
              let classifyLookupsInfo = null;
              let supplierPricePerUnit = 0;

              const productInfo = await Xrm.WebApi.retrieveRecord("product", `${value}`, "?$select=_pricelevelid_value,_defaultuomid_value,name");
              if (productInfo._pricelevelid_value) {
                if (value !== null && isGuid(value)) {
                  const priceListInfo = await Xrm.WebApi.retrieveRecord("pricelevel", `${productInfo._pricelevelid_value}`, "?$select=enddate,statuscode");

                  if ((new Date(priceListInfo.enddate) > new Date() || priceListInfo.enddate === null) && priceListInfo.statuscode === 100001) {
                    priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$expand=pricelevelid($select=extreme_defaultsalesmargin)&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${value})`);
                  }
                  else {
                    var alertStrings = {
                      confirmButtonLabel: "OK",
                      text: "Price list for this product expired or is no longer active.",
                      title: "Price list"
                    };
                    var alertOptions = { height: 120, width: 260 };
                    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
                      function (success) {
                        // console.log("Alert dialog closed");
                      },
                      function (error) {
                        console.log(error.message);
                      }
                    );

                    priceListItemInfo = [];
                  }
                }
              }
              if (value !== null && isGuid(value)) {
                classifyLookupsInfo = await Xrm.WebApi.retrieveRecord("product", `${value}`, "?$select=producttypecode,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");
              }

              if (classifyLookupsInfo !== null) {
                if (classifyLookupsInfo.producttypecode) newData.extreme_producttype = classifyLookupsInfo.producttypecode;
                if (classifyLookupsInfo._extreme_area_value) newData.extreme_area = classifyLookupsInfo._extreme_area_value;
                if (classifyLookupsInfo._extreme_technology_value) newData.extreme_technology = classifyLookupsInfo._extreme_technology_value;
                if (classifyLookupsInfo._extreme_supplier_value) newData.extreme_vendorsupplier = classifyLookupsInfo._extreme_supplier_value;
              }

              // set create asset to false
              newData.extreme_createasset = false;

              // console.log('priceListItemInfo');
              // console.log(priceListItemInfo);

              const priceListMargin = priceListItemInfo.entities ? priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] !== null ? priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] : currentRowData.extreme_margin : currentRowData.extreme_margin;
              const priceListItemAmount = priceListItemInfo.entities ? priceListItemInfo.entities[0].amount : 0;
              const priceListItemAmountFormatted = priceListItemInfo.entities ? priceListItemInfo.entities[0]["amount@OData.Community.Display.V1.FormattedValue"] : null;
              const priceListItemCurrency = priceListItemInfo.entities ? currenciesArray.find((item) => item.transactioncurrencyid === priceListItemInfo.entities[0]._transactioncurrencyid_value).currencysymbol : null;

              // console.log('SET CELL VALUES');
              // console.log(priceListItemAmount);
              // console.log(priceListItemCurrency);
              // console.log(productInfo._pricelevelid_value);

              // console.log('newData: ');
              // console.log(newData);
              // console.log('value: ');
              // console.log(value);
              // console.log('currentRowDataa: ');
              // console.log(currentRowData);
              newData.productid = value;
              if (!isAddingSet) {
                newData.extreme_tax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
                defaultTax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
              };
              if (!isAddingSet && defaultVatSetting !== null) {
                newData.extreme_vatsetting = defaultVatSetting;
                newData.extreme_vatgroup = vatSettingsArray.find(item => item.id === defaultVatSetting).idVatGroup;
              }
              newData.extreme_customproductname = productInfo.name;
              if (productInfo._defaultuomid_value !== null) newData.uomid = productInfo._defaultuomid_value;
              if (productInfo._pricelevelid_value && !isAddingSet) {
                if (priceListItemInfo.entities) newData.extreme_pricelist = productInfo._pricelevelid_value;
                if (priceListItemInfo.entities) newData.extreme_pricelistpriceperunit = priceListItemAmount;
                if (priceListItemInfo.entities) newData.extreme_pricelistcurrency = priceListItemCurrency;
                if (quoteCurrencySymbol !== priceListItemCurrency && priceListItemInfo.entities) {
                  newData.extreme_supplierpriceperunit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                  supplierPricePerUnit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                } else {
                  newData.extreme_supplierpriceperunit = priceListItemAmount;
                  supplierPricePerUnit = priceListItemAmount;
                }
              };

              if (currentRowData.extreme_margin !== null &&
                supplierPricePerUnit !== null &&
                currentRowData.extreme_supplierdiscount !== null &&
                currentRowData.extreme_discount !== null &&
                !isAddingSet) {
                // console.log("NEW DATA FROM SELECTING PRODUCT");
                // console.log(currentRowData.extreme_margin);
                // console.log(supplierPricePerUnit);
                // console.log(currentRowData.extreme_discount);
                // console.log(1);

                const recalcResult = recalculateAmounts({

                  quantity: 1,
                  supplierPricePerUnit: supplierPricePerUnit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: priceListMargin,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: defaultTax

                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              }
            },
            customizeText: function (cellInfo) {
              if (cellInfo.valueText) {
                // // console.log(productsStore._array.find((item) => item.name === cellInfo.valueText))
                return cellInfo.valueText;
                // return productsStore._array.find((item) => item.name === cellInfo.valueText)["productId"]
              }
              else {
                return cellInfo.valueText;
              }
            },
            validationRules: [
              { type: 'required' },
              {
                type: 'custom',
                message: 'Must be at least 3 characters',
                validationCallback(params) {
                  if (params.value) {
                    if (params.value < 3 && typeof (params.value) == 'number') {
                      return false;
                    }
                    else {
                      return true;
                    }
                  }
                  else {
                    return true;
                  }
                },
              }
            ]
          },
          {
            dataField: 'extreme_customproductname',
            caption: 'Name',
            dataType: 'string',
            width: 180,
            validationRules: [{ type: 'required' }],
            wordWrapEnabled: true,
          },
          {
            dataField: 'extreme_productdescription',
            caption: 'Description',
            dataType: 'string',
            visible: false
          },
          {
            dataField: 'quantity',
            caption: 'Qty',
            dataType: 'number',
            width: 44,
            setCellValue: async function (newData, value, currentRowData) {

              // console.log('currentRowData');
              // console.log(currentRowData);

              newData.quantity = value;
              if (!isAddingSet) {
                if (
                  currentRowData.extreme_margin !== null &&
                  currentRowData.extreme_supplierpriceperunit !== null &&
                  currentRowData.extreme_supplierdiscount !== null &&
                  currentRowData.extreme_discount !== null &&
                  currentRowData.extreme_tax !== null &&
                  currentRowData.extreme_supplierpriceperunit !== null &&
                  currentRowData.priceperunit !== null &&
                  value !== null
                ) {
                  const recalcResult = recalculateAmounts({

                    quantity: value,
                    supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                    supplierDiscount: currentRowData.extreme_supplierdiscount,
                    margin: currentRowData.extreme_margin,
                    discount: currentRowData.extreme_discount,
                    TaxPercent: currentRowData.extreme_tax

                  });

                  newData.extreme_margin = recalcResult.margin;
                  newData.quantity = recalcResult.quantity;
                  newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                  newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                  newData.priceperunit = recalcResult.pricePerUnit;
                  newData.baseamount = recalcResult.baseAmount;
                  newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                  newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                  newData.tax = recalcResult.tax;
                  newData.extendedamount = recalcResult.extendedAmount;
                  newData.extreme_pd = recalcResult.pdPerUnit;
                  newData.extreme_fullpd = recalcResult.fullPd;
                  newData.extreme_discount = recalcResult.discountPercentage;
                  newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                }
                // else {
                //   if (currentRowData.priceperunit !== null && value !== null && currentRowData.extreme_discount !== null) {
                //     newData.extreme_fullpricewithdiscount = (currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value;
                //     newData.manualdiscountamount = (value * currentRowData.priceperunit) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                //   };
                //   if (currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                //     newData.tax = (((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                //     newData.extendedamount = ((((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value)) + ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                //   }
                // }
              }
            }
          },
          {
            dataField: 'uomid',
            caption: 'Unit',
            width: 60,
            lookup: {
              dataSource: {
                store: unitsStore,
                paginate: true,
                pageSize: 20,
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            editorOptions: {
              acceptCustomValue: true,
              searchEnabled: true,
              onCustomItemCreating: function (args) {
                if (!args.text) {
                  args.customItem = null;
                  return;
                }

                if (unitsStore._array.find(item => item.name.toLowerCase().trim().startsWith(args.text.toLowerCase().trim()))) {
                  args.customItem = unitsStore._array.find(item => item.name.toLowerCase().trim().startsWith(args.text.toLowerCase().trim()));
                }

              }
            },
            // validationRules: [{ type: 'required' }],
          },
          {
            dataField: 'extreme_pricelistpriceperunit',
            caption: 'Original PPU',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            cellTemplate(container, info) {
              // console.log(container, info);
              return info.data.extreme_pricelistpriceperunit !== null && info.data.extreme_pricelistpriceperunit ? $('<div>').text(info.data.extreme_pricelistpriceperunit + ` ${info.data.extreme_pricelistcurrency}`) : null;
            },
            visible: false,
            allowEditing: false
          },
          {
            dataField: 'extreme_pricelistcurrency',
            caption: 'Original Currency',
            dataType: 'string',
            visible: false,
            allowEditing: false
          },
          {
            dataField: 'extreme_supplierpriceperunit',
            caption: 'PPU',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              if (currentRowData.extreme_margin !== null && currentRowData.extreme_supplierdiscount !== null && currentRowData.quantity !== null) {
                const recalcResult = recalculateAmounts({

                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: value,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: currentRowData.extreme_margin,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: currentRowData.extreme_tax

                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              };
              if (typeof (currentRowData.productid) === 'number') {
                newData.extreme_pricelistpriceperunit = value;
              }
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_supplierbaseamount',
            caption: 'Base Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_supplierdiscount',
            caption: 'Supplier Disc. %',
            dataType: 'number',
            width: 70,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            },
            setCellValue: async function (newData, value, currentRowData) {
              if (currentRowData.priceperunit !== null && currentRowData.extreme_supplierpriceperunit !== null && currentRowData.quantity !== null) {
                const recalcResult = recalculateAmounts({

                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: value,
                  margin: currentRowData.extreme_margin,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: currentRowData.extreme_tax

                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              }
            },
            visible: false
          },
          {
            dataField: 'extreme_margin',
            caption: 'Margin',
            dataType: 'number',
            width: 64,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_margin = value;
              if (currentRowData.extreme_supplierpriceperunit !== null && currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                const recalcResult = recalculateAmounts({

                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: value,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: currentRowData.extreme_tax

                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              };
            }
          },
          {
            dataField: 'priceperunit',
            caption: 'Sales PPU',
            dataType: 'number',
            cssClass: "cell-highlighted",
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: true,
            setCellValue: async function (newData, value, currentRowData) {
              if (currentRowData.quantity !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_margin) {
                if ((currentRowData.extreme_supplierpriceperunit === null || currentRowData.extreme_supplierpriceperunit === undefined || currentRowData.extreme_supplierpriceperunit === 0) && currentRowData.extreme_margin !== null) {
                  newData.extreme_supplierpriceperunit = value / currentRowData.extreme_margin;

                  const recalcResult = recalculateAmounts({

                    quantity: currentRowData.quantity,
                    supplierPricePerUnit: value / currentRowData.extreme_margin,
                    supplierDiscount: currentRowData.extreme_supplierdiscount,
                    margin: currentRowData.extreme_margin,
                    discount: currentRowData.extreme_discount,
                    TaxPercent: currentRowData.extreme_tax,
                    pricePerUnit: value

                  });

                  newData.extreme_margin = recalcResult.margin;
                  newData.quantity = recalcResult.quantity;
                  newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                  newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                  newData.priceperunit = recalcResult.pricePerUnit;
                  newData.baseamount = recalcResult.baseAmount;
                  newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                  newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                  newData.tax = recalcResult.tax;
                  newData.extendedamount = recalcResult.extendedAmount;
                  newData.extreme_pd = recalcResult.pdPerUnit;
                  newData.extreme_fullpd = recalcResult.fullPd;
                  newData.extreme_discount = recalcResult.discountPercentage;
                  newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                }
                else {
                  const recalcResult = recalculateAmounts({

                    quantity: currentRowData.quantity,
                    supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                    supplierDiscount: currentRowData.extreme_supplierdiscount,
                    margin: currentRowData.extreme_margin,
                    discount: currentRowData.extreme_discount,
                    TaxPercent: currentRowData.extreme_tax,
                    pricePerUnit: value

                  });

                  newData.extreme_margin = recalcResult.margin;
                  newData.quantity = recalcResult.quantity;
                  newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                  newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                  newData.priceperunit = recalcResult.pricePerUnit;
                  newData.baseamount = recalcResult.baseAmount;
                  newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                  newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                  newData.tax = recalcResult.tax;
                  newData.extendedamount = recalcResult.extendedAmount;
                  newData.extreme_pd = recalcResult.pdPerUnit;
                  newData.extreme_fullpd = recalcResult.fullPd;
                  newData.extreme_discount = recalcResult.discountPercentage;
                  newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                }
              };
            },
            customizeText: function (cellInfo) {

              // console.log('CELL INFO CHILD');
              // console.log(cellInfo);

              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'baseamount',
            caption: 'Sales Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: true,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_discount',
            caption: 'Disc. %',
            dataType: 'number',
            width: 62,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              // Do so only if it is not parent item (SET)

              if (currentRowData.extreme_isparentitem !== true) {
                if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_tax !== null) {
                  const recalcResult = recalculateAmounts({

                    quantity: currentRowData.quantity,
                    supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                    supplierDiscount: currentRowData.extreme_supplierdiscount,
                    margin: currentRowData.extreme_margin,
                    discount: value,
                    TaxPercent: currentRowData.extreme_tax

                  });

                  newData.extreme_margin = recalcResult.margin;
                  newData.quantity = recalcResult.quantity;
                  newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                  newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                  newData.priceperunit = recalcResult.pricePerUnit;
                  newData.baseamount = recalcResult.baseAmount;
                  newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                  newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                  newData.tax = recalcResult.tax;
                  newData.extendedamount = recalcResult.extendedAmount;
                  newData.extreme_pd = recalcResult.pdPerUnit;
                  newData.extreme_fullpd = recalcResult.fullPd;
                  newData.extreme_discount = recalcResult.discountPercentage;
                  newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                };
                if (currentRowData.extreme_tax !== null) {
                  newData.tax = (((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                  newData.extendedamount = ((((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity)) + ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                };
              }
              else {
                newData.extreme_discount = value;
              }
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            }
          },
          {
            dataField: 'manualdiscountamount',
            caption: 'Discount Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            visible: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
          },
          // {
          //   dataField: 'extreme_pricewithdiscount',
          //   caption: 'Price w/discount',
          //   dataType: 'number',
          //   allowEditing: false,
          //   customizeText: function (cellInfo) {
          //     return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " \u20AC";
          //   }
          // },
          {
            dataField: 'extreme_fullpricewithdiscount',
            caption: 'Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_fullpricewithdiscount = value;
              if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_tax !== null) {

                const recalcResult = recalculateAmounts({

                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: currentRowData.extreme_margin,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: currentRowData.extreme_tax,
                  fullPriceWithDiscount: value

                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

              };
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_vatsetting',
            caption: 'VAT %',
            width: 60,
            lookup: {
              dataSource(options) {
                // console.log('OPTIONS FROM VAT GROUP LOOKUP');
                // console.log(options);

                let filterQuery = null;
                if (options.data && options.data.productid && options.data.productid && isGuid(options.data.productid)) {
                  const productInfo = Xrm.WebApi.retrieveRecord("product", `${options.data.productid}`, "?$select=producttypecode");
                  if (options.isNewRow !== true) {
                    if (productInfo.producttypecode) {
                      filterQuery = ["productTypeCode", "=", productInfo.producttypecode]
                    }
                    else if (quoteLinesData._array.find(item => item.quotedetailid === options.data.quotedetailid).extreme_producttype) {
                      filterQuery = ["productTypeCode", "=", quoteLinesData._array.find(item => item.quotedetailid === options.data.quotedetailid).extreme_producttype]
                    }
                  }
                }

                return {
                  store: {
                    type: "array",
                    data: vatSettingsArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                  filter: filterQuery
                }
              },
              displayExpr: "varPercentFormat",
              valueExpr: 'id'
            },
            editorOptions: {
              acceptCustomValue: false,
              // popupWidth: 600,
              searchEnabled: true,
              searchExpr: ["name", "code", "varPercentFormat"],
              itemTemplate: function (data, index, container) {
                var containerFluid = $("<div>").addClass("container-fluid");
                var row = $("<div>").addClass("row text-wrap");
                $("<div>").addClass("col-2").text(productTypesArray.find(item => item.id === data["productTypeCode"]).name).appendTo(row);
                $("<div>").addClass("col-6").text(data["name"]).appendTo(row);
                $("<div>").addClass("col-2").text(data["code"]).appendTo(row);
                $("<div>").addClass("col-2").text(data["varPercentFormat"]).appendTo(row);
                row.appendTo(containerFluid);
                container.append(containerFluid);
              },
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
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_vatsetting = value;
              newData.extreme_producttype = vatSettingsArray.find(item => item.id === value).productTypeCode;
              newData.extreme_tax = vatSettingsArray.find(item => item.id === value).vat;
              const defaultTax = vatSettingsArray.find(item => item.id === value).vat;

              if (
                currentRowData.extreme_margin !== null &&
                currentRowData.extreme_supplierpriceperunit !== null &&
                currentRowData.extreme_discount !== null
              ) {
                const recalcResult = recalculateAmounts({

                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: currentRowData.extreme_margin,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: defaultTax

                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              }

            },
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: isDraftStatus
          },
          {
            dataField: 'extreme_tax',
            caption: 'VAT % calc',
            dataType: 'number',
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              // console.log('cellInfo');
              // console.log(cellInfo);
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            },
            visible: false
          },
          {
            dataField: 'tax',
            caption: 'VAT Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
            visible: false
          },
          {
            dataField: 'extreme_pd',
            caption: 'Profit Per Unit',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
            visible: false
          },
          {
            dataField: 'extreme_fullpd',
            caption: 'Gross Profit',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
            visible: false
          },
          {
            dataField: 'extendedamount',
            caption: 'Total Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
          },
          {
            dataField: 'extreme_pricelist',
            caption: 'Price list',
            width: 130,
            wordWrapEnabled: false,
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: priceListsArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                  filter: options.data ? [['productid', '=', options.data.productid], "and", ['statuscode', '=', 100001]] : null,
                  postProcess: function (data) {
                    // data.unshift({ name: "Price list", amount: "Price", disabled: true });
                    return data;
                  }
                }
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            editorOptions: {
              acceptCustomValue: false,
              // popupWidth: 600,
              searchEnabled: true,
              searchExpr: ["productId", "productName"],
              itemTemplate: function (data, index, container) {
                var containerFluid = $("<div>").addClass("container-fluid");
                var row = $("<div>").addClass("row text-wrap");
                $("<div>").addClass("col-6").text(data["name"]).appendTo(row);
                $("<div>").addClass("col-6").text(data["amount"]).appendTo(row);
                row.appendTo(containerFluid);
                container.append(containerFluid);
              },
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
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_pricelist = value;
              // console.log('NEW PRICE FROM PRICE LIST CHANGE');

              const newOrgPrice = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).amount_num;
              const newOrgCurrency = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).currency_code;
              const newOrgCurrencyValue = $(`#${newOrgCurrency}`).val() ? parseFloat($(`#${newOrgCurrency}`).val()) : 1;
              const newOrgCurrencySymbol = currenciesArray.find((item) => item.isocurrencycode == newOrgCurrency).currencysymbol;

              // console.log(newOrgPrice);
              // console.log(newOrgCurrency);
              // console.log(newOrgCurrencyValue);
              // console.log(newOrgCurrencySymbol);

              newData.extreme_pricelistpriceperunit = newOrgPrice;
              newData.extreme_pricelistcurrency = newOrgCurrencySymbol;


              var pricePerUnit = (newOrgPrice * newOrgCurrencyValue) * currentRowData.extreme_margin;
              const recalcResult = recalculateAmounts({

                quantity: currentRowData.quantity,
                supplierPricePerUnit: (newOrgPrice * newOrgCurrencyValue),
                supplierDiscount: currentRowData.extreme_supplierdiscount,
                margin: currentRowData.extreme_margin,
                discount: currentRowData.extreme_discount,
                TaxPercent: currentRowData.extreme_tax,
                pricePerUnit: pricePerUnit

              });

              newData.extreme_margin = recalcResult.margin;
              newData.quantity = recalcResult.quantity;
              newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
              newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
              newData.priceperunit = recalcResult.pricePerUnit;
              newData.baseamount = recalcResult.baseAmount;
              newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
              newData.manualdiscountamount = recalcResult.manualDiscountAmount;
              newData.tax = recalcResult.tax;
              newData.extendedamount = recalcResult.extendedAmount;
              newData.extreme_pd = recalcResult.pdPerUnit;
              newData.extreme_fullpd = recalcResult.fullPd;
              newData.extreme_discount = recalcResult.discountPercentage;
              newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

            }
          },
          {
            dataField: 'extreme_parentquoteline',
            caption: 'Parent QL',
            dataType: 'string',
            visible: false
          },
          {
            dataField: 'extreme_isparentitem',
            caption: 'Is Parent',
            dataType: 'boolean',
            visible: false
          },
          {
            dataField: 'extreme_producttype',
            caption: 'Type',
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: productTypesArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                }
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            visible: false
          },
          {
            dataField: 'extreme_area',
            caption: 'Area',
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: areasArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                }
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            editorOptions: {
              acceptCustomValue: false,
              searchEnabled: true,
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  if (iframeCorrentHeight < 450) {
                    wrControl.getObject().style.minHeight = "600px";
                  }
                }
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_area = value;
              checkClassifyRows();
            },
            visible: false
          },
          {
            dataField: 'extreme_technology',
            caption: 'Technology',
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: techsArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                }
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            editorOptions: {
              acceptCustomValue: false,
              searchEnabled: true,
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  if (iframeCorrentHeight < 450) {
                    wrControl.getObject().style.minHeight = "600px";
                  }
                }
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_technology = value;
              checkClassifyRows();
            },
            visible: false
          },
          {
            dataField: 'extreme_vendorsupplier',
            caption: 'Vendor/Supplier',
            calculateDisplayValue: "name",
            lookup: {
              dataSource: {
                store: vendorSupplierODataStore,
                paginate: true,
                pageSize: 100,
                loadMode: 'raw',
                filter: [["extreme_relationshiptypeext", "=", 424000000], "or", ["extreme_relationshiptypeext", "=", 424000003]]
              },
              displayExpr: 'name',
              valueExpr: 'accountid'
            },
            editorOptions: {
              acceptCustomValue: false,
              searchEnabled: true,
              searchExpr: ["extreme_paname30characters", "name"],
              itemTemplate: function (data, index, container) {
                var row = $("<div>").addClass("row text-wrap");
                var containerFluid = $("<div>").addClass("container-fluid");
                $("<div>").addClass("col-4").text(data["extreme_paname30characters"]).appendTo(row);
                $("<div>").addClass("col-8").text(data["name"]).appendTo(row);
                row.appendTo(containerFluid);
                container.append(containerFluid);
              },
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
            // editorOptions: {
            //   acceptCustomValue: false,
            //   searchEnabled: true,
            //   onOpened: function (e) {
            //     heightAuto = false;
            //     if (heightAuto === false) {
            //       const iframeCorrentHeight = wrControl.getObject().offsetHeight;
            //       if (iframeCorrentHeight < 450) {
            //         wrControl.getObject().style.minHeight = "600px";
            //       }
            //     }
            //   },
            //   onClosed: function (e) {
            //     heightAuto = true;
            //   },
            //   onFocusOut: function (e) {
            //     heightAuto = true;
            //   }
            // },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_vendorsupplier = value;
              checkClassifyRows();
            },
            visible: false
          },
          {
            dataField: 'extreme_createasset',
            caption: 'Asset?',
            width: 60,
            dataType: 'boolean',
            setCellValue: async function (newData, value, currentRowData) {
              if (typeof (value) === 'boolean') {
                if (currentRowData.extreme_isparentitem === true && value === true) {
                  quoteLinesData._array.filter(item => item.extreme_parentquoteline === currentRowData.quotedetailid).forEach(elm => {
                    Xrm.WebApi.updateRecord("quotedetail", `${elm.quotedetailid}`, { extreme_createasset: value })
                    elm.extreme_createasset = value;
                  })
                }
                newData.extreme_createasset = value;
              }
            }
          },
          {
            type: 'buttons',
            width: 70,
            buttons: [
              {
                hint: 'Description',
                icon: 'edit',
                visible(e) {
                  return true;
                },
                disabled(e) {
                  return false;
                },
                onClick(e) {
                  // console.log(e);

                  const popupContentTemplate = function (item) {

                    if (isDraftStatus) {
                      return $('<div data-mdb-input-init class="form-outline">')
                        .append($(`<textarea class="form-control" id="productDescription" rows="4" style="resize: none;">${item.extreme_productdescription ? item.extreme_productdescription.trim() : ''}</textarea>`))
                    }
                    else {
                      return $('<div class="overflow-auto" style="max-height: 100px;">')
                        .append($(`<p>${item.extreme_productdescription ? item.extreme_productdescription.trim() : ''}</p>`))
                    }

                    return $('<div>').append(
                      $(`<p>Birth Date: <span>${item.extreme_productdescription}</span></p>`)
                    );
                  };
                  const popup = $('#popup').dxPopup({
                    contentTemplate: popupContentTemplate,
                    width: 500,
                    height: 200,
                    container: '.dx-viewport',
                    showTitle: true,
                    title: `Description for ${e.row.data.extreme_customproductname ? e.row.data.extreme_customproductname.length > 20 ? e.row.data.extreme_customproductname.substring(0, 17) + '...' : e.row.data.extreme_customproductname : ''}`,
                    visible: false,
                    dragEnabled: false,
                    hideOnOutsideClick: true,
                    showCloseButton: false,
                    position: {
                      at: 'center',
                      my: 'center',
                      collision: 'fit',
                    },
                    toolbarItems: [{
                      widget: 'dxButton',
                      toolbar: 'bottom',
                      location: 'before',
                      options: {
                        icon: 'save',
                        stylingMode: 'contained',
                        text: 'Save',
                        disabled: !isDraftStatus,
                        async onClick() {
                          // console.log($('#productDescription').val().trim());

                          // var record = {};
                          // record.extreme_productdescription = "test"; // Multiline Text

                          await Xrm.WebApi.updateRecord("quotedetail", `${e.row.data.quotedetailid}`, { extreme_productdescription: $('#productDescription').val().trim() });
                          quoteLinesData.update(e.row.data.quotedetailid, { extreme_productdescription: $('#productDescription').val().trim() });
                          dataGrid.refresh();

                          popup.hide();

                        },
                      },
                    }, {
                      widget: 'dxButton',
                      toolbar: 'bottom',
                      location: 'after',
                      options: {
                        text: 'Close',
                        stylingMode: 'outlined',
                        type: 'normal',
                        onClick() {
                          popup.hide();
                        },
                      },
                    }],
                    onHiding: (e) => {
                      // console.log('Hidding popup event');
                      // console.log(e);
                      selectedDescriptionItem = null;
                    }
                  }).dxPopup('instance');

                  selectedDescriptionItem = e.row.data;
                  popup.option({
                    contentTemplate: () => popupContentTemplate(e.row.data)
                  });
                  popup.show();

                },
              },
              'delete'
            ],
          }
        ],
        toolbar: {
          items: [
            // {
            //   location: 'before',
            //   template() {
            //     return $('<div>')
            //       .addClass('grid-title')
            //       .text(`${quoteLinesDisplayName}`)
            //   },
            // },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: 'bulletlist',
                text: 'Add existing',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);

                  isAddingSet = false;
                  // console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("productid", "editorOptions", {
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
                      // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
                      row.appendTo(containerFluid);
                      container.append(containerFluid);
                    },
                    onCustomItemCreating: function (args) {
                      if (!args.text) {
                        args.customItem = null;
                        return;
                      }

                      var newItem = {};
                      newItem.productid = newIdForCustomProducts++;
                      newItem.name = args.text;
                      newItem.productnumber = args.text;
                      customProductsStore.insert(newItem);
                      args.customItem = newItem;
                    },
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
                  });

                  dataGrid.columnOption("productid", "lookup", {
                    dataSource(options) {

                      let filterQuery = null;

                      if (options.data) {
                        options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
                      }

                      return {
                        store: productsODataStore,
                        // searchExpr: ["productnumber", "name"],
                        paginate: true,
                        pageSize: 100,
                        loadMode: 'raw',
                        filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
                      }
                    },
                    displayExpr: 'productnumber',
                    valueExpr: 'productid',
                  });

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
                  dataGrid.columnOption("uomid", "allowEditing", true);
                  dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_margin", "allowEditing", true);
                  dataGrid.columnOption("priceperunit", "allowEditing", true);
                  dataGrid.columnOption("baseamount", "allowEditing", true);
                  dataGrid.columnOption("extreme_discount", "allowEditing", true);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
                  dataGrid.columnOption("extreme_createasset", "allowEditing", true);
                  dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);

                  dataGrid.addRow();

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
                icon: 'plus',
                text: 'Add new',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);

                  isAddingSet = false;
                  // console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("productid", "editorOptions", {
                    acceptCustomValue: true,
                    // popupWidth: 600,
                    searchEnabled: true,
                    // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                    searchExpr: ["productnumber", "name"],
                    itemTemplate: function (data, index, container) {
                      var row = $("<div>").addClass("row text-wrap");
                      var containerFluid = $("<div>").addClass("container-fluid");
                      $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
                      $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
                      // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
                      row.appendTo(containerFluid);
                      container.append(containerFluid);
                    },
                    onCustomItemCreating: function (args) {
                      if (!args.text) {
                        args.customItem = null;
                        return;
                      }

                      var newItem = {};
                      newItem.productid = newIdForCustomProducts++;
                      newItem.name = args.text;
                      newItem.productnumber = args.text;
                      customProductsStore.insert(newItem);
                      args.customItem = newItem;
                    },
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
                  });

                  dataGrid.columnOption("productid", "lookup", {
                    dataSource: {
                      store: customProductsStore,
                    },
                    displayExpr: 'productnumber',
                    valueExpr: 'productid',
                  });

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
                  dataGrid.columnOption("uomid", "allowEditing", true);
                  dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_margin", "allowEditing", true);
                  dataGrid.columnOption("priceperunit", "allowEditing", true);
                  dataGrid.columnOption("baseamount", "allowEditing", true);
                  dataGrid.columnOption("extreme_discount", "allowEditing", true);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
                  dataGrid.columnOption("extreme_createasset", "allowEditing", true);
                  dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);

                  dataGrid.addRow();

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
                icon: 'increaseindent',
                text: 'Add existing set',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);

                  isAddingSet = true;
                  // console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("productid", "editorOptions", {
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
                      // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
                      row.appendTo(containerFluid);
                      container.append(containerFluid);
                    },
                    onCustomItemCreating: function (args) {
                      if (!args.text) {
                        args.customItem = null;
                        return;
                      }

                      var newItem = {};
                      newItem.productid = newIdForCustomProducts++;
                      newItem.name = args.text;
                      newItem.productnumber = args.text;
                      customProductsStore.insert(newItem);
                      args.customItem = newItem;
                    },
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
                  });

                  dataGrid.columnOption("productid", "lookup", {
                    dataSource(options) {

                      let filterQuery = null;

                      if (options.data) {
                        options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
                      }

                      return {
                        store: productsODataStore,
                        // searchExpr: ["productnumber", "name"],
                        paginate: true,
                        pageSize: 100,
                        loadMode: 'raw',
                        filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
                      }
                    },
                    displayExpr: 'productnumber',
                    valueExpr: 'productid',
                  });

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", false);
                  // dataGrid.columnOption("uomid", "allowEditing", false);
                  // dataGrid.columnOption("uomid", "validationRules", null);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_margin", "allowEditing", false);
                  dataGrid.columnOption("priceperunit", "allowEditing", false);
                  dataGrid.columnOption("baseamount", "allowEditing", false);
                  dataGrid.columnOption("extreme_discount", "allowEditing", false);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", false);
                  dataGrid.columnOption("extreme_createasset", "allowEditing", false);
                  dataGrid.columnOption("extreme_vatsetting", "allowEditing", false);

                  dataGrid.addRow();

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
                icon: 'plus',
                text: 'Add new set',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);

                  isAddingSet = true;
                  // console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("productid", "editorOptions", {
                    acceptCustomValue: true,
                    // popupWidth: 600,
                    searchEnabled: true,
                    // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                    searchExpr: ["productnumber", "name"],
                    itemTemplate: function (data, index, container) {
                      var row = $("<div>").addClass("row text-wrap");
                      var containerFluid = $("<div>").addClass("container-fluid");
                      $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
                      $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
                      // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
                      row.appendTo(containerFluid);
                      container.append(containerFluid);
                    },
                    onCustomItemCreating: function (args) {
                      if (!args.text) {
                        args.customItem = null;
                        return;
                      }

                      var newItem = {};
                      newItem.productid = newIdForCustomProducts++;
                      newItem.name = args.text;
                      newItem.productnumber = args.text;
                      customProductsStore.insert(newItem);
                      args.customItem = newItem;
                    },
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
                  });

                  dataGrid.columnOption("productid", "lookup", {
                    dataSource: {
                      store: customProductsStore,
                    },
                    displayExpr: 'productnumber',
                    valueExpr: 'productid',
                  });

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", false);
                  // dataGrid.columnOption("uomid", "allowEditing", false);
                  // dataGrid.columnOption("uomid", "validationRules", null);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_margin", "allowEditing", false);
                  dataGrid.columnOption("priceperunit", "allowEditing", false);
                  dataGrid.columnOption("baseamount", "allowEditing", false);
                  dataGrid.columnOption("extreme_discount", "allowEditing", false);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", false);
                  dataGrid.columnOption("extreme_createasset", "allowEditing", false);
                  dataGrid.columnOption("extreme_vatsetting", "allowEditing", false);

                  dataGrid.addRow();

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
                icon: "triangledown",
                text: 'Compact',
                width: 'auto',
                elementAttr: {
                  id: "compactBtn",
                },
                disabled: true,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);
                  dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible', false);
                  // dataGrid.columnOption('extreme_pricelistcurrency', 'visible', !dataGrid.columnOption('extreme_pricelistcurrency', 'visible'));
                  dataGrid.columnOption('extreme_supplierdiscount', 'visible', false);
                  dataGrid.columnOption('extreme_pd', 'visible', false);
                  dataGrid.columnOption('extreme_fullpd', 'visible', false);
                  dataGrid.columnOption('manualdiscountamount', 'visible', false);
                  dataGrid.columnOption('tax', 'visible', false);
                  // e.component.option('text', dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? 'Extended' : 'Compact');

                  // reset all columns after classify
                  if ($('#classifyBtn').dxButton('instance').option('disabled') === true) {
                    // console.log('ALL COLUMNS');
                    // console.log(dataGrid.option('columns'));
                    dataGrid.option('columns').forEach(col => {
                      if (
                        col.dataField !== "extreme_pricelistpriceperunit" &&
                        col.dataField !== "extreme_supplierdiscount" &&
                        col.dataField !== "extreme_pd" &&
                        col.dataField !== "extreme_fullpd" &&
                        col.dataField !== "manualdiscountamount" &&
                        col.dataField !== "extreme_productdescription" &&
                        // other columns
                        col.dataField !== "sequencenumber" &&
                        col.dataField !== "extreme_pricelistcurrency" &&
                        col.dataField !== "extreme_tax" &&
                        col.dataField !== "extreme_parentquoteline" &&
                        col.dataField !== "extreme_isparentitem" &&
                        col.dataField !== "extreme_producttype"
                      ) {
                        dataGrid.columnOption(col.dataField, 'visible', true);
                      }
                    });

                    dataGrid.option('filterValue', [
                      [
                        ["extreme_parentquoteline", "=", null],
                        "and",
                        ["extreme_isparentitem", "=", false]
                      ],
                      "or",
                      [
                        ["extreme_parentquoteline", "=", null],
                        "and",
                        ["extreme_isparentitem", "=", true]
                      ],
                    ]);

                    // dataGrid.columnOption('extreme_producttype', 'visible', false);
                    dataGrid.columnOption('extreme_area', 'visible', false);
                    dataGrid.columnOption('extreme_technology', 'visible', false);
                    dataGrid.columnOption('extreme_vendorsupplier', 'visible', false);

                  }

                  $('#extendedBtn').dxButton('instance').option('disabled', false);
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
                icon: "expandform",
                text: 'Extended',
                width: 'auto',
                elementAttr: {
                  id: "extendedBtn",
                },
                disabled: false,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);
                  dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible', true);
                  // dataGrid.columnOption('extreme_pricelistcurrency', 'visible', !dataGrid.columnOption('extreme_pricelistcurrency', 'visible'));
                  dataGrid.columnOption('extreme_supplierdiscount', 'visible', true);
                  dataGrid.columnOption('extreme_pd', 'visible', true);
                  dataGrid.columnOption('extreme_fullpd', 'visible', true);
                  dataGrid.columnOption('manualdiscountamount', 'visible', true);
                  dataGrid.columnOption('tax', 'visible', true);
                  // e.component.option('text', dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? 'Extended' : 'Compact');

                  // reset all columns after classify
                  if ($('#classifyBtn').dxButton('instance').option('disabled') === true) {
                    // console.log('ALL COLUMNS');
                    // console.log(dataGrid.option('columns'));
                    dataGrid.option('columns').forEach(col => {
                      if (
                        // col.dataField !== "extreme_pricelistpriceperunit" &&
                        // col.dataField !== "extreme_supplierdiscount" &&
                        // col.dataField !== "extreme_pd" &&
                        // col.dataField !== "extreme_fullpd" &&
                        // col.dataField !== "manualdiscountamount" &&
                        col.dataField !== "extreme_productdescription" &&
                        // other columns
                        col.dataField !== "sequencenumber" &&
                        col.dataField !== "extreme_pricelistcurrency" &&
                        col.dataField !== "extreme_tax" &&
                        col.dataField !== "extreme_parentquoteline" &&
                        col.dataField !== "extreme_isparentitem" &&
                        col.dataField !== "extreme_producttype"
                      ) {
                        dataGrid.columnOption(col.dataField, 'visible', true);
                      }
                    });

                    dataGrid.option('filterValue', [
                      [
                        ["extreme_parentquoteline", "=", null],
                        "and",
                        ["extreme_isparentitem", "=", false]
                      ],
                      "or",
                      [
                        ["extreme_parentquoteline", "=", null],
                        "and",
                        ["extreme_isparentitem", "=", true]
                      ],
                    ]);

                    // dataGrid.columnOption('extreme_producttype', 'visible', false);
                    dataGrid.columnOption('extreme_area', 'visible', false);
                    dataGrid.columnOption('extreme_technology', 'visible', false);
                    dataGrid.columnOption('extreme_vendorsupplier', 'visible', false);

                  }

                  $('#compactBtn').dxButton('instance').option('disabled', false);
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
                  // console.log(e);
                  // console.log(dataGrid);
                  // console.log('GET VISIBLE COLUMNS');
                  // console.log(dataGrid.getVisibleColumns());
                  dataGrid.getVisibleColumns().forEach(col => {
                    if (col.dataField !== 'productid' &&
                      col.dataField !== 'extreme_customproductname' &&
                      // col.dataField !== 'extreme_productdescription' &&
                      col.dataType !== 'detailExpand' &&
                      col.dataType !== 'drag') {
                      // // console.log(col);
                      dataGrid.columnOption(col.dataField, 'visible', false);
                    }
                  });

                  quoteLinesData._array.filter(item => item.extreme_isparentitem === true).forEach(elm => {
                    dataGrid.collapseRow(elm.quotedetailid);
                  });

                  dataGrid.option('filterValue', [
                    // [
                    //   ["extreme_area", "=", null], "or", ["extreme_area", "=", undefined], "or",
                    //   ["extreme_technology", "=", null], "or", ["extreme_technology", "=", undefined], "or",
                    //   ["extreme_vendorsupplier", "=", null], "or", ["extreme_vendorsupplier", "=", undefined]
                    // ], "and", ["extreme_isparentitem", "=", false]
                    [
                      // ["extreme_producttype", "=", null], "or", ["extreme_producttype", "=", undefined], "or",
                      ["extreme_area", "=", null], "or", ["extreme_area", "=", undefined], "or",
                      ["extreme_technology", "=", null], "or", ["extreme_technology", "=", undefined], "or",
                      ["extreme_vendorsupplier", "=", null], "or", ["extreme_vendorsupplier", "=", undefined]
                    ]
                  ]);

                  // dataGrid.columnOption('extreme_producttype', 'visible', true);
                  dataGrid.columnOption('extreme_area', 'visible', true);
                  dataGrid.columnOption('extreme_technology', 'visible', true);
                  dataGrid.columnOption('extreme_vendorsupplier', 'visible', true);

                  $('#compactBtn').dxButton('instance').option('disabled', false);
                  $('#extendedBtn').dxButton('instance').option('disabled', false);
                  e.component.option('disabled', true);
                },
              },
            },

            // BEFORE AND AFTER

            {
              location: 'after',
              locateInMenu: "auto",
              template() {
                const $div = $('<div>').addClass('exchange-rates');
                const $ul = $('<ul>').css({
                  'list-style-type': 'none',
                  'padding': '0',
                  'margin': '0',
                  'display': 'flex',
                  'flex-wrap': 'wrap',
                  'justify-content': 'center'
                });

                // Dodaj input za osnovni popust
                const $input = $('<input>').attr({
                  type: 'number',
                  id: 'discountInput',
                  class: 'currencyRates',
                  value: defaultDiscount !== 0 ? defaultDiscount : '',
                  disabled: !isDraftStatus,
                  min: 0,
                  max: 100
                }).css({
                  'max-width': '50px',
                  'height': '28px',
                  'margin': '0 5px',
                  'padding': '0 5px',
                  'border': 'none',
                  'border-radius': '3px',
                  'background-color': '#fff',
                  '-webkit-appearance': 'none',
                  '-moz-appearance': 'textfield;'
                }).on('change', async function () {
                  const discountValue = parseFloat($(this).val());
                  if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
                    alert("Please enter a discount percent between 0 and 100.");
                    $(this).val(defaultDiscount !== 0 ? defaultDiscount : '');
                    return;
                  }
                  console.log(`New value for discount: ${discountValue}`);
                  defaultDiscount = discountValue;
                  console.log(`Default discount updated to: ${defaultDiscount}`);
                  var confirmStrings = {
                    text: `Do you want to update all existing rows with the entered discount percent (${discountValue}%)?`,
                    title: "Update Discount",
                    cancelButtonLabel: "No",
                    confirmButtonLabel: "Yes"
                  };
                  var confirmOptions = { height: 200, width: 450 };
                  if (quoteLinesData._array.length > 0) {
                    await Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
                      function (success) {
                        if (success.confirmed) {
                          console.log("Dialog closed using OK button.");
                          Xrm.Utility.showProgressIndicator('Updating discount... Please wait...');
                          const updatePromises = [];
                          quoteLinesData._array.forEach(row => {
                            row.extreme_discount = discountValue;
                            // Recalculate amounts for each row
                            const recalcResult = recalculateAmounts({
                              quantity: row.quantity,
                              supplierPricePerUnit: row.extreme_supplierpriceperunit,
                              supplierDiscount: row.extreme_supplierdiscount,
                              margin: row.extreme_margin,
                              discount: discountValue,
                              TaxPercent: row.extreme_tax
                            });
                            row.extreme_margin = recalcResult.margin;
                            row.quantity = recalcResult.quantity;
                            row.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                            row.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                            row.priceperunit = recalcResult.pricePerUnit;
                            row.baseamount = recalcResult.baseAmount;
                            row.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                            row.manualdiscountamount = recalcResult.manualDiscountAmount;
                            row.tax = recalcResult.tax;
                            row.extendedamount = recalcResult.extendedAmount;
                            row.extreme_pd = recalcResult.pdPerUnit;
                            row.extreme_fullpd = recalcResult.fullPd;
                            row.extreme_discount = recalcResult.discountPercentage;
                            row.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;

                            // Prepare record for update
                            const record = {
                              extreme_discount: discountValue,
                              priceperunit: row.priceperunit,
                              baseamount: row.baseamount,
                              extreme_fullpricewithdiscount: row.extreme_fullpricewithdiscount,
                              manualdiscountamount: row.manualdiscountamount,
                              tax: row.tax,
                              extendedamount: row.extendedamount,
                              extreme_pd: row.extreme_pd,
                              extreme_fullpd: row.extreme_fullpd,
                              extreme_margin: row.extreme_margin,
                              extreme_supplierpriceperunit: row.extreme_supplierpriceperunit,
                              extreme_supplierbaseamount: row.extreme_supplierbaseamount,
                              extreme_supplierdiscount: row.extreme_supplierdiscount
                            };
                            updatePromises.push(Xrm.WebApi.updateRecord("quotedetail", row.quotedetailid, record));
                          });
                          Promise.all(updatePromises).then(() => {
                            dataGrid.refresh();
                            Xrm.Utility.closeProgressIndicator();
                            formContext.data.refresh(true);
                          });
                        } else {
                          console.log("Dialog closed using Cancel button or X.");
                        }
                      });
                  }
                });

                const $li = $('<li>').append(`Disc(%): `).append($input).css({
                  'margin': '0 10px',
                  'padding': '0 0 0 5px',
                  'border': '1px solid #eee',
                  'border-radius': '3px',
                  'background-color': '#fff',
                  'box-shadow': '0 4px 8px rgba(0, 0, 0, 0.1)'
                });

                $ul.append($li);

                $.each(jsonForConverting, function (currency, rate) {
                  if (rate !== 1) {
                    const $input = $('<input>').attr({
                      type: 'number',
                      id: currency,
                      class: 'currencyRates',
                      value: rate,
                      disabled: !isDraftStatus,
                    }).css({
                      'max-width': '50px',
                      'height': '28px',
                      'margin': '0 5px',
                      'padding': '0 5px',
                      'border': 'none',
                      'border-radius': '3px',
                      'background-color': '#fff',
                      '-webkit-appearance': 'none',
                      '-moz-appearance': 'textfield;'
                    }).on('change', async function () {
                      Xrm.Utility.showProgressIndicator(`Changing exchange rate for ${currency}`);
                      const newValue = $(this).val();
                      // console.log(`New value for ${currency}: ${newValue} ${typeof (newValue)}`);
                      switch (currency) {
                        case "EUR":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_euroexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "USD":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_dollarexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "CHF":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_chfexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "RSD":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_rsdexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "MKD":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_macedoniandenarexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "GBP":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_gbpexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);

                          break;
                        default:

                          break;
                      }
                      Xrm.Utility.closeProgressIndicator();
                    });

                    const $li = $('<li>').append(`${currency}: `).append($input).css({
                      'margin': '0 10px',
                      'padding': '0 0 0 5px',
                      'border': '1px solid #eee',
                      'border-radius': '3px',
                      'background-color': '#fff',
                      'box-shadow': '0 4px 8px rgba(0, 0, 0, 0.1)'
                    });

                    $ul.append($li);
                  }
                });

                $div.append($ul);
                return $div;
              },
            }
          ],
        },
        onSelectionChanged(data) {
          dataGrid.option('toolbar.items[1].options.disabled', !data.selectedRowsData.length);
        },
        onRowPrepared: async (e) => {
          // console.log('ROW PREPARED');
          // console.log(e);

          if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && (e.data.extreme_isparentitem === true || e.data.extreme_isparentitem === false) &&
            (
              // (e.data.extreme_producttype === null || e.data.extreme_producttype === undefined) ||
              (e.data.extreme_area === null || e.data.extreme_area === undefined) ||
              (e.data.extreme_technology === null || e.data.extreme_technology === undefined) ||
              (e.data.extreme_vendorsupplier === null || e.data.extreme_vendorsupplier === undefined)
            )
          ) {
            e.rowElement[0].style.backgroundColor = "#fce3c2";
          }
          // else if (e.rowType === "data" && e.data.extreme_isparentitem === true &&
          //   (
          //     (e.data.extreme_area === null || e.data.extreme_area === undefined) ||
          //     (e.data.extreme_technology === null || e.data.extreme_technology === undefined) ||
          //     (e.data.extreme_vendorsupplier === null || e.data.extreme_vendorsupplier === undefined)
          //   )) {
          //     e.rowElement[0].style.backgroundColor = "#fce3c2";
          // }
          else if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && e.data.extreme_isparentitem === true && quoteLinesData._array.find(item =>
            item.extreme_parentquoteline === e.data.quotedetailid &&
            (
              // (item.extreme_producttype === null || item.extreme_producttype === undefined) ||
              (item.extreme_area === null || item.extreme_area === undefined) ||
              (item.extreme_technology === null || item.extreme_technology === undefined) ||
              (item.extreme_vendorsupplier === null || item.extreme_vendorsupplier === undefined)
            )
          )) {
            e.cells[1].cellElement[0].style.backgroundColor = "#fce3c2";
          }
          else {
            e.rowElement[0].style.backgroundColor = "#fff";
          }

          if (e.rowType === 'data' && !e.data.extreme_isparentitem && e.data.quotedetailid) {
            // console.log('REMOVED EXPAND FOR ', e.data.quotedetailid);
            // console.log(dataGrid.hasEditData());
            // console.log(e.cells[1].cellElement[0]);
            e.cells[1].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
            e.cells[1].cellElement[0].classList.remove('dx-datagrid-expand');
            // e.cells[1].cellElement[0].style.display = "none";
            // e.cells[2]?.cellElement?.[0].setAttribute('colspan', '2');
          }
          else if (e.rowType === 'data' && $('#classifyBtn').dxButton('instance').option('disabled') === true) {
            e.cells[1].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
            e.cells[1].cellElement[0].classList.remove('dx-datagrid-expand');
          }

        },
        onEditorPreparing: async (e) => {
          // console.log('Editor Preparing');
          // console.log(e);

          // if (e.dataField == "productid" && e.row.data.extreme_isparentitem === false) {
          //   // console.log('e.editorElement');
          //   // console.log(e.editorElement);
          //   e.editorElement[0].parentElement.setAttribute('colspan', '2');
          // }

          // if ((e.dataField == "uomid" && typeof (e.row.data.productid) !== 'number')) e.editorOptions.disabled = true;

          if (e.dataField == "extreme_supplierdiscount" || e.dataField == "extreme_discount" || e.dataField == "extreme_tax") {
            e.editorOptions.min = 0;
            e.editorOptions.max = 100;
          };

          if (e.dataField == 'extreme_pricelist' && (!e.row.data.productid || typeof (e.row.data.productid) === 'number' || e.row.isNewRow)) {
            e.editorOptions.disabled = true;
          }

          if (
            (e.row.data.extreme_isparentitem === true || (isAddingSet && e.row.isNewRow)) &&
            e.dataField !== "productid" &&
            e.dataField !== "extreme_customproductname" &&
            e.dataField !== "extreme_productdescription" &&
            e.dataField !== "uomid" &&
            e.dataField !== "quantity" &&
            // e.dataField !== "extreme_vatsetting" &&
            // e.dataField !== "extreme_producttype" &&
            e.dataField !== "extreme_createasset" &&
            e.dataField !== "extreme_area" &&
            e.dataField !== "extreme_technology" &&
            e.dataField !== "extreme_vendorsupplier" &&
            e.dataField !== "baseamount" &&
            e.dataField !== "extreme_discount"
          ) {
            e.editorOptions.disabled = true;
          }

          if (e.row.data.extreme_isparentitem !== true && e.dataField == "baseamount") {
            e.editorOptions.disabled = true;
          }

        },
        onFocusedCellChanged: (e) => {
          // console.log(e);
        },
        onEditingStart: (e) => {
          // console.log('EditingStart');
          // console.log(e);
        },
        onEditCanceling: (e) => {
          // console.log('EditCanceling');
          // console.log(e);
        },
        onInitNewRow: async (e) => {
          // console.log('InitNewRow');
          // console.log(e);

          if (!isAddingSet) {
            e.data.extreme_isparentitem = false;
            e.data.extreme_margin = defaultMargin;
            e.data.extreme_discount = parseFloat($('#discountInput').val()) || 0;
            e.data.extreme_supplierdiscount = 0;
            dataGrid.columnOption("extreme_vatsetting", "validationRules", [{ type: 'required' }]);
          }
          else {
            e.data.extreme_isparentitem = true;
            dataGrid.columnOption("extreme_vatsetting", "validationRules", null);
          }

        },
        onRowInserting: async (e) => {
          // console.log('RowInserting');
          // console.log(e);

          Xrm.Utility.showProgressIndicator('Loading... Please wait...');

          var record = {};
          record["quoteid@odata.bind"] = `/quotes(${quoteIdForm})`; // Lookup
          if (e.data.extreme_customproductname) record.extreme_customproductname = e.data.extreme_customproductname; // Text
          if (e.data.extreme_pricelistpriceperunit || e.data.extreme_pricelistpriceperunit === 0) record.extreme_pricelistpriceperunit = e.data.extreme_pricelistpriceperunit; // Decimal
          if (e.data.extreme_pricelistcurrency) record.extreme_pricelistcurrency = e.data.extreme_pricelistcurrency; // Text
          if (e.data.extreme_supplierpriceperunit || e.data.extreme_supplierpriceperunit === 0) record.extreme_supplierpriceperunit = Number(parseFloat(e.data.extreme_supplierpriceperunit).toFixed(4)); // Currency
          if (e.data.quantity || e.data.quantity === 0) record.quantity = e.data.quantity; // Decimal
          if (e.data.extreme_supplierbaseamount || e.data.extreme_supplierbaseamount === 0) record.extreme_supplierbaseamount = Number(parseFloat(e.data.extreme_supplierbaseamount).toFixed(4)); // Currency
          if (e.data.extreme_supplierdiscount || e.data.extreme_supplierdiscount === 0) record.extreme_supplierdiscount = e.data.extreme_supplierdiscount; // Decimal
          if (e.data.extreme_margin || e.data.extreme_margin === 0) record.extreme_margin = e.data.extreme_margin; // Decimal
          if (e.data.priceperunit || e.data.priceperunit === 0) record.priceperunit = e.data.priceperunit; // Decimal
          if (e.data.baseamount || e.data.baseamount === 0) record.baseamount = e.data.baseamount; // Decimal
          if (e.data.extreme_discount || e.data.extreme_discount === 0) record.extreme_discount = e.data.extreme_discount; // Decimal
          if (e.data.manualdiscountamount || e.data.manualdiscountamount === 0) record.manualdiscountamount = Number(parseFloat(e.data.manualdiscountamount).toFixed(4)); // Currency
          if (e.data.extreme_pricewithdiscount || e.data.extreme_pricewithdiscount === 0) record.extreme_pricewithdiscount = e.data.extreme_pricewithdiscount; // Decimal
          if (e.data.extreme_fullpricewithdiscount || e.data.extreme_fullpricewithdiscount === 0) record.extreme_fullpricewithdiscount = e.data.extreme_fullpricewithdiscount; // Decimal
          if (e.data.extreme_tax || e.data.extreme_tax === 0) record.extreme_tax = e.data.extreme_tax; // Decimal
          if (e.data.tax || e.data.tax === 0) record.tax = Number(parseFloat(e.data.tax).toFixed(4)); // Currency
          if (e.data.extreme_pd || e.data.extreme_pd === 0) record.extreme_pd = e.data.extreme_pd; // Decimal
          if (e.data.extreme_fullpd || e.data.extreme_fullpd === 0) record.extreme_fullpd = e.data.extreme_fullpd; // Decimal
          if (typeof e.data.extreme_createasset === "boolean") record.extreme_createasset = e.data.extreme_createasset; // Boolean
          if (e.data.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.data.extreme_pricelist})`; // Lookup
          if (e.data.extreme_producttype) record.extreme_producttype = e.data.extreme_producttype; // Choice
          if (e.data.extreme_area) record["extreme_Area@odata.bind"] = `/extreme_areas(${e.data.extreme_area})`; // Lookup
          if (e.data.extreme_technology) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${e.data.extreme_technology})`; // Lookup
          if (e.data.extreme_vendorsupplier) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${e.data.extreme_vendorsupplier})`; // Lookup
          if (e.data.extreme_vatsetting) {
            record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${e.data.extreme_vatsetting})`; // Lookup
            record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatSettingsArray.find(item => item.id === e.data.extreme_vatsetting).idVatGroup})`; // Lookup
          }

          // Is Price Overriden boolean to true
          record.ispriceoverridden = true; // Boolean

          isAddingSet ? record.extreme_isparentitem = true : record.extreme_isparentitem = false;

          if (e.data.productid) {
            if (typeof (e.data.productid) === 'number') {
              record.extreme_customproductid = customProductsStore._array.find((item) => item.productid === e.data.productid).name;
              if (e.data.uomid) {
                if (typeof (e.data.uomid) === 'number') {
                  record.extreme_uomid = unitsStore._array.find((item) => item.id === e.data.uomid).name;
                }
                else {
                  record.extreme_uomid = unitsStore._array.find((item) => item.id === e.data.uomid).name;
                }
              }
            }
            else {
              record["productid@odata.bind"] = `/products(${e.data.productid})`;

              const existingProductLookups = await Xrm.WebApi.retrieveRecord("product", `${e.data.productid}`, "?$select=description,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");
              // console.log('EXISTING PRODUCT LOOKUPS');
              // console.log(existingProductLookups);
              if (existingProductLookups._extreme_area_value) record["extreme_Area@odata.bind"] = `/extreme_areas(${existingProductLookups._extreme_area_value})`; // Lookup
              if (existingProductLookups._extreme_technology_value) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${existingProductLookups._extreme_technology_value})`; // Lookup
              if (existingProductLookups._extreme_vendorsupplier_value) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${existingProductLookups._extreme_vendorsupplier_value})`; // Lookup
              if (e.data.extreme_productdescription) {
                record.extreme_productdescription = e.data.extreme_productdescription;
              }
              else {
                record.extreme_productdescription = existingProductLookups.description;
              }; // Text

              record["uomid@odata.bind"] = `/uoms(${e.data.uomid})`; // Lookup UNIT
            }
          }; // Lookup / Custom Text


          // console.log('RECORD AFTER SET PROPERTIES:');
          // console.log(record);

          await Xrm.WebApi.createRecord("quotedetail", record).then(
            async function success(result) {
              var newId = result.id;
              if (quoteLinesData._array.length > 0) {
                // console.log(dataGrid.getDataSource());
                // console.log(quoteLinesData._array);
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1]);
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid);
                quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid = newId;
                quoteLinesData._array[quoteLinesData._array.length - 1].extreme_productdescription = record.extreme_productdescription;

                if (quoteLinesData._array._dataByKeyMap) {
                  const keys = Object.keys(quoteLinesData._array._dataByKeyMap);
                  const lastKey = keys[keys.length - 1];

                  // Update the key and quotedetailid
                  if (quoteLinesData._array._dataByKeyMap[lastKey]) {
                    // Create a new key with the new ID and update quotedetailid
                    quoteLinesData._array._dataByKeyMap[`"${newId}"`] = { ...quoteLinesData._array._dataByKeyMap[lastKey], quotedetailid: newId };

                    // Delete the old key
                    delete quoteLinesData._array._dataByKeyMap[lastKey];
                  }
                }

                // console.log(quoteLinesData._array);

                await Xrm.WebApi.updateRecord("quotedetail", `${newId}`, { sequencenumber: parseInt((quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length + 1) + "00") });
                quoteLinesData._array[quoteLinesData._array.length - 1].sequencenumber = parseInt((quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length + 1) + "00");
                quoteLinesData._array[quoteLinesData._array.length - 1].extreme_parentquoteline = null;
                quoteLinesData._array[quoteLinesData._array.length - 1].extreme_isparentitem = isAddingSet;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].baseamount) quoteLinesData._array[quoteLinesData._array.length - 1].baseamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extendedamount) quoteLinesData._array[quoteLinesData._array.length - 1].extendedamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpd) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpd = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpricewithdiscount) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpricewithdiscount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].manualdiscountamount) quoteLinesData._array[quoteLinesData._array.length - 1].manualdiscountamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_supplierbaseamount) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_supplierbaseamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].tax) quoteLinesData._array[quoteLinesData._array.length - 1].tax = 0;
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid);
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1].extreme_parentquoteline);
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1].extreme_isparentitem);

                await Xrm.WebApi.updateRecord("quotedetail", `${newId}`, { extendedamount: Number(parseFloat(e.data.extendedamount).toFixed(4)) });

                await Xrm.WebApi.updateRecord("quotedetail", `${newId}`, { baseamount: Number(parseFloat(e.data.baseamount).toFixed(4)) });


                // If inserting parent item with existing child items
                if (e.data.extreme_isparentitem === true && isGuid(e.data.productid)) {

                  // console.log('quoteLinesData before parent created');
                  // console.log(quoteLinesData);

                  await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,description,_pricelevelid_value,_defaultuomid_value,extreme_isparent,name,_extreme_parentproduct_value,productnumber&$filter=_extreme_parentproduct_value eq ${e.data.productid}`).then(
                    async function success(results) {
                      // console.log(results);
                      for (var i = 0; i < results.entities.length; i++) {
                        var result = results.entities[i];
                        // Columns
                        var productid = result["productid"]; // Guid
                        var pricelevelid = result["_pricelevelid_value"]; // Lookup
                        var pricelevelid_formatted = result["_pricelevelid_value@OData.Community.Display.V1.FormattedValue"];
                        var pricelevelid_lookuplogicalname = result["_pricelevelid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        var defaultuomid = result["_defaultuomid_value"]; // Lookup
                        var defaultuomid_formatted = result["_defaultuomid_value@OData.Community.Display.V1.FormattedValue"];
                        var defaultuomid_lookuplogicalname = result["_defaultuomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        var extreme_isparent = result["extreme_isparent"]; // Boolean
                        var extreme_isparent_formatted = result["extreme_isparent@OData.Community.Display.V1.FormattedValue"];
                        var name = result["name"]; // Text
                        var extreme_parentproduct = result["_extreme_parentproduct_value"]; // Lookup
                        var extreme_parentproduct_formatted = result["_extreme_parentproduct_value@OData.Community.Display.V1.FormattedValue"];
                        var extreme_parentproduct_lookuplogicalname = result["_extreme_parentproduct_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        var productnumber = result["productnumber"]; // Text
                        var producttypecode = result["producttypecode"]; // Choice
                        var producttypecode_formatted = result["producttypecode@OData.Community.Display.V1.FormattedValue"];
                        var description = result["description"]; // Multiline Text

                        let productType = null;
                        let defaultVatSetting = null;
                        let defaultTax = null;

                        if (isGuid(productid)) {
                          if (productid !== null) {
                            productType = await Xrm.WebApi.retrieveRecord("product", `${productid}`, "?$select=producttypecode");
                            productType = productType.producttypecode;

                            // console.log('PRODUCT TYPE CHILD');
                            // console.log(productType);
                            // console.log(taxPercentOfAccount.extreme_tax);

                            defaultVatSetting = await Xrm.WebApi.retrieveMultipleRecords("extreme_vatsetting", `?$select=extreme_vatsettingid&$filter=(extreme_producttype eq ${productType} and extreme_customertaxpercentage eq ${taxPercentOfAccount.extreme_tax})`);
                            defaultVatSetting = defaultVatSetting.entities.length > 0 ? defaultVatSetting.entities[0].extreme_vatsettingid : null;
                          }
                        }

                        let priceListItemInfo = [];
                        let classifyLookupsInfo = null;
                        let supplierPricePerUnit = 0;

                        const productInfo = await Xrm.WebApi.retrieveRecord("product", `${productid}`, "?$select=_pricelevelid_value,_defaultuomid_value,name");
                        if (productInfo._pricelevelid_value) {
                          if (productid !== null) {
                            priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${productid})&$expand=pricelevelid($select=extreme_defaultsalesmargin)`);
                            classifyLookupsInfo = await Xrm.WebApi.retrieveRecord("product", `${productid}`, "?$select=producttypecode,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");
                          }
                        }

                        let area = null;
                        let technology = null;
                        let vendorSupplier = null;
                        let vatGroup = null;
                        let defaultUomid = null;
                        let priceList = null;
                        let priceListPPU = null;
                        let priceListCurrecy = null;
                        let taxAmount = null;
                        let discountAmount = null;
                        let extendedAmount = null;
                        let pd = null;
                        let fullPD = null;
                        let PPU = null;
                        let baseAmount = null;
                        let supplierBaseAmount = null;
                        let quantity = null;
                        let fullPriceWithDiscount = null;
                        let vatSetting = null;

                        if (classifyLookupsInfo !== null) {
                          if (classifyLookupsInfo.producttypecode) productType = classifyLookupsInfo.producttypecode;
                          if (classifyLookupsInfo._extreme_area_value) area = classifyLookupsInfo._extreme_area_value;
                          if (classifyLookupsInfo._extreme_technology_value) technology = classifyLookupsInfo._extreme_technology_value;
                          if (classifyLookupsInfo._extreme_supplier_value) vendorSupplier = classifyLookupsInfo._extreme_supplier_value;
                        }

                        const priceListMargin = priceListItemInfo.length !== 0 && priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] ? priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] : defaultMargin;
                        const priceListItemAmount = priceListItemInfo.length !== 0 ? priceListItemInfo.entities[0].amount : null;
                        const priceListItemAmountFormatted = priceListItemInfo.length !== 0 ? priceListItemInfo.entities[0]["amount@OData.Community.Display.V1.FormattedValue"] : null;
                        const priceListItemCurrency = priceListItemInfo.length !== 0 ? currenciesArray.find((item) => item.transactioncurrencyid === priceListItemInfo.entities[0]._transactioncurrencyid_value).currencysymbol : null;

                        defaultTax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
                        if (defaultVatSetting !== null) {
                          vatSetting = defaultVatSetting;
                          vatGroup = vatSettingsArray.find(item => item.id === defaultVatSetting).idVatGroup;
                        };

                        if (productInfo._defaultuomid_value !== null) defaultUomid = productInfo._defaultuomid_value;
                        if (productInfo._pricelevelid_value) {
                          priceList = productInfo._pricelevelid_value;
                          priceListPPU = priceListItemAmount;
                          priceListCurrecy = priceListItemCurrency;
                          if (quoteCurrencySymbol !== priceListItemCurrency) {
                            // newData.extreme_supplierpriceperunit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                            supplierPricePerUnit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                          } else {
                            // newData.extreme_supplierpriceperunit = priceListItemAmount;
                            supplierPricePerUnit = priceListItemAmount;
                          }
                        };

                        if (priceListMargin !== null &&
                          supplierPricePerUnit !== null) {

                          // TO DO: Odraditi recalc funkciju ovde umesto ovoga dole ispod

                          const recalcResult = recalculateAmounts({
                            quantity: 1,
                            supplierPricePerUnit: supplierPricePerUnit,
                            supplierDiscount: 0,
                            margin: priceListMargin,
                            discount: 0,
                            TaxPercent: 0
                          });

                          quantity = recalcResult.quantity;
                          supplierBaseAmount = recalcResult.supplierBaseAmount;
                          PPU = recalcResult.pricePerUnit;
                          baseAmount = recalcResult.baseAmount;
                          fullPriceWithDiscount = recalcResult.fullPriceWithDiscount;
                          discountAmount = recalcResult.customDiscountAmount;
                          taxAmount = recalcResult.tax;
                          extendedAmount = recalcResult.extendedAmount;
                          pd = recalcResult.pdPerUnit;
                          fullPD = recalcResult.fullPd;
                        }

                        // console.log(area,
                        // technology,
                        // vendorSupplier,
                        // vatGroup,
                        // defaultUomid,
                        // priceList,
                        // priceListPPU,
                        // priceListCurrecy,
                        // taxAmount,
                        // discountAmount,
                        // extendedAmount,
                        // pd,
                        // fullPD,
                        // PPU,
                        // baseAmount,
                        // supplierBaseAmount,
                        // quantity,
                        // fullPriceWithDiscount,
                        // vatSetting,
                        // description)


                        var record = {};
                        record.sequencenumber = parseInt((quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length) + "00") + (i + 1); // Whole Number
                        record["productid@odata.bind"] = `/products(${productid})`;
                        record["extreme_ParentQuoteLine@odata.bind"] = `/quotedetails(${newId})`;
                        record.extreme_customproductname = name; // Text
                        record["uomid@odata.bind"] = `/uoms(${defaultuomid})`;
                        // Override Price
                        record.ispriceoverridden = true; // Boolean

                        // additional fields
                        if (productType) record.extreme_producttype = productType; // Choice
                        if (vatSetting) record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${vatSetting})`; // Lookup
                        if (taxAmount) record.tax = Number(parseFloat(taxAmount).toFixed(4)); // Currency
                        if (defaultTax) record.extreme_tax = defaultTax; // Decimal
                        if (area) record["extreme_Area@odata.bind"] = `/extreme_areas(${area})`; // Lookup
                        if (technology) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${technology})`; // Lookup
                        if (vendorSupplier) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${vendorSupplier})`; // Lookup
                        if (vatGroup) record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatGroup})`; // Lookup
                        if (priceList) record["extreme_pricelist@odata.bind"] = `/pricelevels(${priceList})`; // Lookup
                        if (priceListPPU) record.extreme_pricelistpriceperunit = priceListPPU; // Decimal
                        if (priceListCurrecy) record.extreme_pricelistcurrency = priceListCurrecy; // Text
                        if (discountAmount) Number(parseFloat(discountAmount).toFixed(4)); // Currency
                        if (pd) record.extreme_pd = pd; // Decimal
                        if (fullPD) record.extreme_fullpd = fullPD; // Decimal
                        if (supplierBaseAmount) record.extreme_supplierbaseamount = supplierBaseAmount; // Decimal
                        if (quantity) record.quantity = quantity; // Decimal
                        if (fullPriceWithDiscount) record.extreme_fullpricewithdiscount = fullPriceWithDiscount; // Decimal
                        if (PPU) record.priceperunit = Number(parseFloat(PPU).toFixed(4)); // Currency
                        record.extreme_discount = 0; // Decimal
                        record.extreme_supplierdiscount = 0; // Decimal
                        if (priceListMargin) record.extreme_margin = priceListMargin; // Decimal
                        if (supplierPricePerUnit) record.extreme_supplierpriceperunit = supplierPricePerUnit; // Decimal
                        if (description) record.extreme_productdescription = description; // Multi-line Text

                        record["quoteid@odata.bind"] = `/quotes(${quoteIdForm})`; // Lookup
                        record.extreme_isparentitem = false; // Boolean

                        // console.log("RECORD AFTER SETTING PROPERTIES");
                        // console.log(record);

                        let newIdChild = '';
                        await Xrm.WebApi.createRecord("quotedetail", record).then(
                          async function success(result) {
                            var newId = result.id;
                            newIdChild = result.id;

                            var record = {};
                            if (baseAmount) record.baseamount = Number(parseFloat(baseAmount).toFixed(4)); // Currency
                            if (extendedAmount) record.extendedamount = Number(parseFloat(extendedAmount).toFixed(4)); // Currency

                            await Xrm.WebApi.updateRecord("quotedetail", `${result.id}`, record).then(
                              function success(result) {
                                var updatedId = result.id;
                                // console.log(updatedId);
                              },
                              function (error) {
                                Xrm.Navigation.openErrorDialog({
                                  details: error,
                                  errorCode: 400,
                                  message: error.message
                                });
                              }
                            );

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

                        var recordForStore = {};
                        recordForStore.quotedetailid = newIdChild;
                        recordForStore.sequencenumber = parseInt((quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length) + "00") + (i + 1); // Whole Number
                        recordForStore.extreme_customproductname = name;
                        recordForStore.productid = productid;
                        recordForStore.extreme_parentquoteline = newId;
                        recordForStore.uomid = defaultuomid;

                        // additional fields
                        if (productType) recordForStore.extreme_producttype = productType; // Choice
                        if (vatSetting) recordForStore.extreme_vatsetting = vatSetting; // Lookup
                        if (taxAmount) recordForStore.tax = taxAmount; // Currency
                        if (defaultTax) recordForStore.extreme_tax = defaultTax; // Decimal
                        if (area) recordForStore.extreme_area = area; // Lookup
                        if (technology) recordForStore.extreme_technology = technology; // Lookup
                        if (vendorSupplier) recordForStore.extreme_vendorsupplier = vendorSupplier; // Lookup
                        if (vatGroup) recordForStore.extreme_vatgroup = vatGroup; // Lookup
                        if (priceList) recordForStore.extreme_pricelist = priceList; // Lookup
                        if (priceListPPU) recordForStore.extreme_pricelistpriceperunit = priceListPPU; // Decimal
                        if (priceListCurrecy) recordForStore.extreme_pricelistcurrency = priceListCurrecy; // Text
                        if (discountAmount) recordForStore.manualdiscountamount = discountAmount; // Currency
                        if (pd) recordForStore.extreme_pd = pd; // Decimal
                        if (fullPD) recordForStore.extreme_fullpd = fullPD; // Decimal
                        if (supplierBaseAmount) recordForStore.extreme_supplierbaseamount = supplierBaseAmount; // Decimal
                        if (quantity) recordForStore.quantity = quantity; // Decimal
                        if (fullPriceWithDiscount) recordForStore.extreme_fullpricewithdiscount = fullPriceWithDiscount; // Decimal
                        if (PPU) recordForStore.priceperunit = PPU; // Currency
                        recordForStore.extreme_discount = 0; // Decimal
                        recordForStore.extreme_supplierdiscount = 0; // Decimal
                        if (priceListMargin) recordForStore.extreme_margin = priceListMargin; // Decimal
                        if (baseAmount) recordForStore.baseamount = baseAmount; // Currency
                        if (extendedAmount) recordForStore.extendedamount = extendedAmount; // Currency
                        if (supplierPricePerUnit) recordForStore.extreme_supplierpriceperunit = supplierPricePerUnit; // Decimal
                        if (description) recordForStore.extreme_productdescription = description; // Multi-line text

                        recordForStore.extreme_isparentitem = false; // Boolean
                        recordForStore.extreme_createasset = false; // Boolean

                        quoteLinesData.insert(recordForStore)
                          .done(function (dataObj, key) {
                            // Process the key and data object here
                            // console.log(key);
                          })
                          .fail(function (error) {
                            // Handle the "error" here
                            // console.log(error);
                          });

                        // recalculate parent item
                        if (baseAmount) quoteLinesData._array.find((item) => item.quotedetailid === newId).baseamount += baseAmount;
                        if (extendedAmount) quoteLinesData._array.find((item) => item.quotedetailid === newId).extendedamount += extendedAmount;
                        if (fullPD) quoteLinesData._array.find((item) => item.quotedetailid === newId).extreme_fullpd += fullPD;
                        if (fullPriceWithDiscount) quoteLinesData._array.find((item) => item.quotedetailid === newId).extreme_fullpricewithdiscount += fullPriceWithDiscount;
                        if (discountAmount) quoteLinesData._array.find((item) => item.quotedetailid === newId).manualdiscountamount += discountAmount;
                        if (supplierBaseAmount) quoteLinesData._array.find((item) => item.quotedetailid === newId).extreme_supplierbaseamount += supplierBaseAmount;
                        if (taxAmount) quoteLinesData._array.find((item) => item.quotedetailid === newId).tax += taxAmount;

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


                // console.log('quoteLinesData after parent created');
                // console.log(quoteLinesData);

              }
              else {
                // console.log('quoteLinesData._array is empty');
              }

              isAddingSet = null;
              dataGrid.columnOption("productid", "lookup", {
                dataSource(options) {

                  let filterQuery = null;

                  if (options.data) {
                    options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
                  }

                  return {
                    store: productsODataStore,
                    // searchExpr: ["productnumber", "name"],
                    paginate: true,
                    pageSize: 100,
                    loadMode: 'raw',
                    filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
                  }
                },
                displayExpr: 'productnumber',
                valueExpr: 'productid',
              });

            },
            function (error) {
              Xrm.Navigation.openErrorDialog({
                details: error,
                errorCode: 400,
                message: error.message
              });
            }
          );

          isAddingSet = null;
          // console.log("isAddingSet: ", isAddingSet);
          dataGrid.columnOption("productid", "lookup", {
            dataSource(options) {

              let filterQuery = null;

              if (options.data) {
                options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
              }

              return {
                store: productsODataStore,
                // searchExpr: ["productnumber", "name"],
                paginate: true,
                pageSize: 100,
                loadMode: 'raw',
                filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
              }
            },
            displayExpr: 'productnumber',
            valueExpr: 'productid',
          });

          dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
          dataGrid.columnOption("uomid", "allowEditing", true);
          dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
          dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
          dataGrid.columnOption("extreme_margin", "allowEditing", true);
          dataGrid.columnOption("priceperunit", "allowEditing", true);
          dataGrid.columnOption("baseamount", "allowEditing", true);
          dataGrid.columnOption("extreme_discount", "allowEditing", true);
          dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
          dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
          dataGrid.columnOption("extreme_createasset", "allowEditing", true);
          dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);
          dataGrid.columnOption("extreme_vatsetting", "validationRules", null);

          await this.setClientApiContext(Xrm, formContext);
          formContext.data.refresh(true);

          Xrm.Utility.closeProgressIndicator();

        },
        onRowInserted: async (e) => {
          // console.log('RowInserted');
          // console.log(e);

          // await getQuoteProducts(quoteIdForm);
          // dataGrid.refresh();
        },
        onRowUpdating: async (e) => {
          // console.log('RowUpdating');
          // console.log(e);

          var record = {};
          if (e.newData.productid) record["productid@odata.bind"] = `/products(${e.newData.productid})`; // Lookup
          if (e.newData.extreme_customproductname) record.extreme_customproductname = e.newData.extreme_customproductname; // Text
          if (e.newData.extreme_productdescription) record.extreme_productdescription = e.newData.extreme_productdescription; // Text
          if (e.newData.extreme_pricelistpriceperunit || e.newData.extreme_pricelistpriceperunit === 0) record.extreme_pricelistpriceperunit = e.newData.extreme_pricelistpriceperunit; // Decimal
          if (e.newData.extreme_pricelistcurrency || e.newData.extreme_pricelistcurrency === 0) record.extreme_pricelistcurrency = e.newData.extreme_pricelistcurrency; // Text
          if (e.newData.extreme_supplierpriceperunit || e.newData.extreme_supplierpriceperunit === 0) record.extreme_supplierpriceperunit = Number(parseFloat(e.newData.extreme_supplierpriceperunit).toFixed(4)); // Currency
          if (e.newData.quantity || e.newData.quantity === 0) record.quantity = e.newData.quantity; // Decimal
          if (e.newData.extreme_supplierbaseamount || e.newData.extreme_supplierbaseamount === 0) record.extreme_supplierbaseamount = Number(parseFloat(e.newData.extreme_supplierbaseamount).toFixed(4)); // Currency
          if (e.newData.extreme_supplierdiscount || e.newData.extreme_supplierdiscount === 0) record.extreme_supplierdiscount = e.newData.extreme_supplierdiscount; // Decimal
          if (e.newData.extreme_margin || e.newData.extreme_margin === 0) record.extreme_margin = e.newData.extreme_margin; // Decimal
          if (e.newData.priceperunit || e.newData.priceperunit === 0) record.priceperunit = e.newData.priceperunit; // Decimal
          if ((e.newData.baseamount || e.newData.baseamount === 0) && e.oldData.extreme_isparentitem !== true) record.baseamount = e.newData.baseamount; // Decimal
          if (e.newData.manualdiscountamount || e.newData.manualdiscountamount === 0) record.manualdiscountamount = Number(parseFloat(e.newData.manualdiscountamount).toFixed(4)); // Currency
          if (e.newData.extreme_pricewithdiscount || e.newData.extreme_pricewithdiscount === 0) record.extreme_pricewithdiscount = e.newData.extreme_pricewithdiscount; // Decimal
          if (e.newData.extreme_fullpricewithdiscount || e.newData.extreme_fullpricewithdiscount === 0) record.extreme_fullpricewithdiscount = e.newData.extreme_fullpricewithdiscount; // Decimal
          if (e.newData.extreme_tax || e.newData.extreme_tax === 0) record.extreme_tax = e.newData.extreme_tax; // Decimal
          if (e.newData.tax || e.newData.tax === 0) record.tax = Number(parseFloat(e.newData.tax).toFixed(4)); // Currency
          if (e.newData.extreme_pd || e.newData.extreme_pd === 0) record.extreme_pd = e.newData.extreme_pd; // Decimal
          if (e.newData.extreme_fullpd || e.newData.extreme_fullpd === 0) record.extreme_fullpd = e.newData.extreme_fullpd; // Decimal
          if (e.newData.extendedamount || e.newData.extendedamount === 0) record.extendedamount = e.newData.extendedamount; // New total amount
          if (typeof e.newData.extreme_createasset === "boolean") record.extreme_createasset = e.newData.extreme_createasset; // Boolean
          if (e.newData.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.newData.extreme_pricelist})`; // Lookup
          if (e.newData.extreme_producttype) record.extreme_producttype = e.newData.extreme_producttype; // Chooice
          if (e.newData.extreme_area) record["extreme_Area@odata.bind"] = `/extreme_areas(${e.newData.extreme_area})`; // Lookup
          if (e.newData.extreme_technology) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${e.newData.extreme_technology})`; // Lookup
          if (e.newData.extreme_vendorsupplier) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${e.newData.extreme_vendorsupplier})`; // Lookup
          if (e.newData.extreme_vatsetting) {
            record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${e.newData.extreme_vatsetting})`; // Lookup
            record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatSettingsArray.find(item => item.id === e.newData.extreme_vatsetting).idVatGroup})`; // Lookup
          }

          if (isGuid(e.oldData.productid)) {
            if (e.newData.uomid) record["uomid@odata.bind"] = `/uoms(${e.newData.uomid})`; // Lookup
          }

          let promises = [];

          if (isGuid(e.oldData.productid) && (e.newData.extreme_area || e.newData.extreme_technology || e.newData.extreme_vendorsupplier)) {

            var recordForLookups = {};
            if (e.newData.extreme_area) recordForLookups["extreme_Area@odata.bind"] = `/extreme_areas(${e.newData.extreme_area})`; // Lookup
            if (e.newData.extreme_technology) recordForLookups["extreme_Technology@odata.bind"] = `/extreme_technologies(${e.newData.extreme_technology})`; // Lookup
            if (e.newData.extreme_vendorsupplier) recordForLookups["extreme_Supplier@odata.bind"] = `/accounts(${e.newData.extreme_vendorsupplier})`; // Lookup

            promises.push(Xrm.WebApi.updateRecord("product", `${e.oldData.productid}`, recordForLookups));

          }

          // Unified logic for updating parent item changes
          if ((e.newData.baseamount || e.newData.extreme_discount || e.newData.extreme_discount === 0) && e.oldData.extreme_isparentitem === true) {
            Xrm.Utility.showProgressIndicator("Recalculating... Please wait...");
            // console.log("ALL CHILD FOR UPDATE PROPORTION!");
            // console.log(
            //   quoteLinesData._array.filter(
            //     item => item.extreme_parentquoteline === e.oldData.quotedetailid
            //   )
            // );

            // Function to adjust amounts proportionally and ensure the total matches
            function adjustProportionalAmounts(newTotal, amounts) {
              const currentTotal = amounts.reduce((sum, a) => sum + a, 0);
              const scaleFactor = newTotal / currentTotal;

              // Handle case where all amounts are 0
              if (currentTotal === 0) {
                return amounts.map(() => 0);
              }

              let adjustedAmounts = amounts.map(amount => Math.round(amount * scaleFactor * 100) / 100);
              let adjustedSum = adjustedAmounts.reduce((sum, a) => sum + a, 0);
              let difference = Math.round((newTotal - adjustedSum) * 100) / 100;

              if (difference !== 0) {
                const numChildren = amounts.length;
                const fractionalAdjustment = Math.round((difference / numChildren) * 100) / 100;

                adjustedAmounts = adjustedAmounts.map(amount => Math.round((amount + fractionalAdjustment) * 100) / 100);

                adjustedSum = adjustedAmounts.reduce((sum, a) => sum + a, 0);
                difference = Math.round((newTotal - adjustedSum) * 100) / 100;

                if (Math.abs(difference) > 0) {
                  const smallestIndex = adjustedAmounts.findIndex(amount => amount === Math.min(...adjustedAmounts));
                  adjustedAmounts[smallestIndex] = Math.round((adjustedAmounts[smallestIndex] + difference) * 100) / 100;
                }
              }

              return adjustedAmounts;
            }

            // Use the parent's current or updated discount value
            const parentDiscountPercent = e.newData.extreme_discount !== undefined ? e.newData.extreme_discount : e.oldData.extreme_discount;
            const parentBaseAmount = e.newData.baseamount || e.oldData.baseamount;
            const parentFullPriceWDiscount = parentBaseAmount * (1 - parentDiscountPercent / 100);
            const parentManualDiscountAmount = parentBaseAmount * (parentDiscountPercent / 100);

            const parentTax = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .reduce((sum, child) => {
                const discountedPrice = child.priceperunit * (1 - parentDiscountPercent / 100) * child.quantity;
                return sum + (discountedPrice * (child.extreme_tax / 100));
              }, 0);

            // Collect child values
            const childBaseAmounts = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .map(child => child.baseamount);

            const childFullPrices = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .map(child => (child.priceperunit * (1 - parentDiscountPercent / 100)) * child.quantity);

            const childManualDiscountAmounts = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .map(child => child.manualdiscountamount || (child.baseamount * (parentDiscountPercent / 100)));

            const childTaxAmounts = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .map(child => {
                const discountedPrice = child.priceperunit * (1 - parentDiscountPercent / 100) * child.quantity;
                return discountedPrice * (child.extreme_tax / 100);
              });

            // Adjust child values proportionally
            const adjustedBaseAmounts = adjustProportionalAmounts(parentBaseAmount, childBaseAmounts);
            const adjustedChildFullPrices = adjustProportionalAmounts(parentFullPriceWDiscount, childFullPrices);
            const adjustedChildManualDiscountAmounts = adjustProportionalAmounts(parentManualDiscountAmount, childManualDiscountAmounts);
            const adjustedChildTaxAmounts = adjustProportionalAmounts(parentTax, childTaxAmounts);

            // Apply recalculations to each child
            quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .forEach((child, index) => {
                const newBaseAmount = adjustedBaseAmounts[index];
                const newFullPriceWDiscount = adjustedChildFullPrices[index];
                const newManualDiscountAmount = adjustedChildManualDiscountAmounts[index];
                const newTaxAmount = adjustedChildTaxAmounts[index];
                const newTotalAmount = newFullPriceWDiscount + newTaxAmount;

                const supplierDiscountAmount = child.extreme_supplierpriceperunit * (child.extreme_supplierdiscount / 100);
                const pricePerUnitWithSupplierDiscount = child.extreme_supplierpriceperunit - supplierDiscountAmount;
                const pricePerUnit = newBaseAmount / child.quantity;
                const pricePerUnitWithCustomDiscount = pricePerUnit - newManualDiscountAmount / child.quantity;
                const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;

                // Calculate the updated margin
                const margin = child.extreme_supplierpriceperunit !== 0
                  ? pricePerUnit / child.extreme_supplierpriceperunit
                  : 0;

                let childRecord = {};
                child.baseamount = newBaseAmount;
                childRecord.baseamount = newBaseAmount;

                if (child.extreme_supplierpriceperunit !== null) {
                  child.priceperunit = pricePerUnit;
                  childRecord.priceperunit = pricePerUnit;
                  child.extreme_margin = margin; // Update margin
                  childRecord.extreme_margin = margin; // Update margin in record
                  child.extreme_pd = pdPerUnit;
                  childRecord.extreme_pd = pdPerUnit;
                  child.extreme_fullpd = pdPerUnit * child.quantity;
                  childRecord.extreme_fullpd = pdPerUnit * child.quantity;
                }

                if (child.priceperunit !== null && child.quantity !== null) {
                  child.extreme_fullpricewithdiscount = newFullPriceWDiscount;
                  childRecord.extreme_fullpricewithdiscount = newFullPriceWDiscount;
                  child.manualdiscountamount = newManualDiscountAmount;
                  childRecord.manualdiscountamount = newManualDiscountAmount;
                  child.extreme_discount = e.newData.extreme_discount !== undefined ? e.newData.extreme_discount : child.extreme_discount;
                  childRecord.extreme_discount = e.newData.extreme_discount !== undefined ? e.newData.extreme_discount : child.extreme_discount;
                }

                if (child.extreme_tax !== null) {
                  child.tax = newTaxAmount;
                  childRecord.tax = newTaxAmount;
                  child.extendedamount = newTotalAmount;
                  childRecord.extendedamount = newTotalAmount;
                }

                promises.push(
                  Xrm.WebApi.updateRecord("quotedetail", `${child.quotedetailid}`, childRecord)
                );
              });
          }



          else {
            // console.log("ONLY ONE FOR UPDATE DISCOUNT!");
            if (e.newData.extreme_discount || e.newData.extreme_discount === 0) record.extreme_discount = e.newData.extreme_discount; // Decimal
          }

          // console.log('RECORD AFTER UPDATING RECORD IS CREATED');
          // console.log(record);

          promises.push(Xrm.WebApi.updateRecord("quotedetail", `${e.key}`, record));

          try {
            await Promise.all(promises);
            // console.log('All updates completed successfully.');

            if (e.oldData.extreme_isparentitem === true) {
              const parentQuoteLineGUID = e.key;

              let baseamount_sum = 0;
              let extendedamount_sum = 0;
              let extreme_fullpd_sum = 0;
              let extreme_fullpricewithdiscount_sum = 0;
              let manualdiscountamount_sum = 0;
              let extreme_supplierbaseamount_sum = 0;
              let tax_sum = 0;
              avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;

              quoteLinesData._array.filter((item) => item.extreme_parentquoteline === parentQuoteLineGUID).forEach((e) => {
                baseamount_sum += e.baseamount;
                extendedamount_sum += e.extendedamount;
                extreme_fullpd_sum += e.extreme_fullpd;
                extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
                manualdiscountamount_sum += e.manualdiscountamount;
                extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
                tax_sum += e.tax;
              });

              avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;

              quoteLinesData.update(parentQuoteLineGUID, {
                baseamount: baseamount_sum.toFixed(2),
                extendedamount: extendedamount_sum.toFixed(2),
                extreme_fullpd: extreme_fullpd_sum.toFixed(2),
                extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum.toFixed(2),
                manualdiscountamount: manualdiscountamount_sum.toFixed(2),
                extreme_supplierbaseamount: extreme_supplierbaseamount_sum.toFixed(2),
                tax: tax_sum.toFixed(2),
                extreme_discount: avarageDiscountPercent.toFixed(2)
              });

              dataGrid.getController('data').updateItems({
                changeType: 'update',
                rowIndices: [dataGrid.getRowIndexByKey(parentQuoteLineGUID)]
              });
            }

            // await getQuoteProducts(quoteIdForm);
            // dataGrid.refresh();

            Xrm.Utility.closeProgressIndicator();

            formContext.data.refresh(true);
          } catch (error) {
            // console.log('Error during updates:', error.message);
          }

        },
        onRowUpdated(e) {
          // console.log('RowUpdated');
          // console.log(e);
        },
        onRowRemoving: async (e) => {
          // console.log('RowRemoving');
          // console.log(e);

          Xrm.Utility.showProgressIndicator('Deleting... Please wait...');

          try {
            // Delete the main quotedetail record
            quoteLinesData.remove(e.key);
            await Xrm.WebApi.deleteRecord("quotedetail", `${e.key}`);
            // console.log('Main record deleted');

            // Check if the item is a parent item
            if (e.data.extreme_isparentitem === true) {
              // console.log("CHILD UPDATED WITH PARENT QUOTE LINE");

              // Filter and delete child items
              const childItems = quoteLinesData._array.filter((item) => item.extreme_parentquoteline === e.key);
              for (const childItem of childItems) {
                quoteLinesData.remove(childItem.quotedetailid);
                await Xrm.WebApi.deleteRecord("quotedetail", `${childItem.quotedetailid}`);
                // console.log(`Child record ${childItem.quotedetailid} deleted`);
              }
            }

            // reorder grid
            for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length; i++) {
              Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].quotedetailid}`, { sequencenumber: parseInt((i + 1) + "00") });
              quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].sequencenumber = parseInt((i + 1) + "00");
            }

            for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null).length; i++) {
              Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].quotedetailid}`, { sequencenumber: quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1) });
              quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].sequencenumber = quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1);
            }

            // Refresh the form and data grid
            formContext.data.refresh(true);
            await getQuoteProducts(quoteIdForm);
            dataGrid.refresh();

            Xrm.Utility.closeProgressIndicator();
          } catch (error) {
            Xrm.Navigation.openErrorDialog({
              details: error,
              errorCode: 400,
              message: error.message
            });
          }
        },
        onRowRemoved: (e) => {
          // console.log('RowRemoved');
        },
        onSaving() {
          // console.log('Saving');
        },
        onSaved(e) {
          // console.log('Saved');
          // console.log(e);

          if (e.changes.length == 0) {
            isAddingSet = null;
            // console.log("isAddingSet: ", isAddingSet);
            dataGrid.columnOption("productid", "lookup", {
              dataSource(options) {

                let filterQuery = null;

                if (options.data) {
                  options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
                }

                return {
                  store: productsODataStore,
                  // searchExpr: ["productnumber", "name"],
                  paginate: true,
                  pageSize: 100,
                  loadMode: 'raw',
                  filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
                }
              },
              displayExpr: 'productnumber',
              valueExpr: 'productid',
            });

            dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
            dataGrid.columnOption("uomid", "allowEditing", true);
            dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
            dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
            dataGrid.columnOption("extreme_margin", "allowEditing", true);
            dataGrid.columnOption("priceperunit", "allowEditing", true);
            dataGrid.columnOption("baseamount", "allowEditing", true);
            dataGrid.columnOption("extreme_discount", "allowEditing", true);
            dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
            dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
            dataGrid.columnOption("extreme_createasset", "allowEditing", true);
            dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);
            dataGrid.columnOption("extreme_vatsetting", "validationRules", null);
          }
        },
        onCellDblClick(e) {
          // console.log('CELL DOUBLE CLICK');
          // console.log(e);

          if (e.column.dataField === "productid" && isGuid(e.data.productid) && e.data.productid) {
            // Create an anchor element
            const globalContext = Xrm.Utility.getGlobalContext();
            globalContext.getCurrentAppUrl();

            // console.log('CLIENT URL');
            // console.log(globalContext.getCurrentAppUrl());

            const link = document.createElement('a');
            link.href = `${globalContext.getCurrentAppUrl()}&pagetype=entityrecord&etn=product&id=${e.data.productid}`;
            link.target = "_blank";

            // Append the anchor to the body (required for Firefox)
            document.body.appendChild(link);

            // Trigger a click event on the anchor
            link.click();

            // Remove the anchor from the body
            document.body.removeChild(link);
          }

          if (e.column.dataField === "extreme_customproductname" && isGuid(e.data.productid)) {
            inventoryInfo(e.data.productid, e.data.quotedetailid);
          }
          else if (e.column.dataField === "extreme_customproductname" && !isGuid(e.data.productid)) {
            Xrm.Navigation.openAlertDialog({
              title: "Warning",
              text: "You cannot call the inventory information for a custom product."
            });
          }

        },
        onEditCanceling() {
          // console.log('EditCanceling');
        },
        onEditCanceled() {
          // console.log('EditCanceled');
        },
        onContentReady(e) {
          e.component.columnOption("command:select", "visibleIndex", 999);
          e.component.getView("columnHeadersView").resizeCompleted.remove(masterGridColumnResized);
          e.component.getView("columnHeadersView").resizeCompleted.add(masterGridColumnResized);
          masterGridColumnResized();
          checkClassifyRows();
        }
      }).dxDataGrid('instance');

      // resize child columns
      function masterGridColumnResized() {
        var detailContainers = dataGrid.element().find('.internal-grid');
        // console.log(detailContainers);
        if (detailContainers.length) {
          for (var j = 0; j < detailContainers.length; j++) {
            var detailGridInstance = $(detailContainers.get(j)).dxDataGrid('instance');
            detailGridInstance.beginUpdate();
            for (var i = 0; i < dataGrid.columnCount(); i++) {
              // console.log("columnOption dataField");
              // console.log(dataGrid.columnOption(i, "dataField"));
              if (detailGridInstance.columnOption(i, "dataField") === "productid") {
                detailGridInstance.columnOption(i, 'width', dataGrid.columnOption(i, 'width') + 30);
                detailGridInstance.columnOption(i, 'visibleWidth', dataGrid.columnOption(i, 'visibleWidth') + 30);
              }
              else {
                detailGridInstance.columnOption(i, 'width', dataGrid.columnOption(i, 'width'));
                detailGridInstance.columnOption(i, 'visibleWidth', dataGrid.columnOption(i, 'visibleWidth'));
              }
            }
            detailGridInstance.endUpdate();
          }
        }

      }

      // Recalculate amounts for each row based on changed value
      const recalculateAmounts = ({
        quantity = 1,
        supplierPricePerUnit,
        supplierDiscount,
        margin,
        pricePerUnit = null,
        discount,
        fullPriceWithDiscount = null,
        TaxPercent
      }) => {
        const taxRate = TaxPercent / 100;
        const supplierBaseAmount = supplierPricePerUnit * quantity;

        // Calculate pricePerUnit if not provided
        if (pricePerUnit === null) {
          if (ROUNDING_PRICE_PER_UNIT_CONFIG === "true") {
            pricePerUnit = Math.ceil(margin * supplierPricePerUnit);
          }
          else {
            pricePerUnit = parseFloat((margin * supplierPricePerUnit).toFixed(4));
          }
        } else {
          // Calculate new margin based on supplierBaseAmount
          margin = pricePerUnit / supplierPricePerUnit;
        }

        const baseAmount = pricePerUnit * quantity;

        // Calculate fullPriceWithDiscount if not provided
        if (fullPriceWithDiscount === null) {
          fullPriceWithDiscount = pricePerUnit * (1 - discount / 100) * quantity;
        } else {
          // Calculate new discount and discount percentage based on baseAmount
          discount = ((baseAmount - fullPriceWithDiscount) / baseAmount) * 100;
        }

        const manualDiscountAmount = baseAmount - fullPriceWithDiscount;
        const tax = fullPriceWithDiscount * taxRate;
        const extendedAmount = fullPriceWithDiscount + tax;
        const supplierDiscountAmount = supplierPricePerUnit * (supplierDiscount / 100);
        const pricePerUnitWithSupplierDiscount = supplierPricePerUnit - supplierDiscountAmount;
        const customDiscountAmount = pricePerUnit * (discount / 100);
        const pricePerUnitWithCustomDiscount = pricePerUnit - customDiscountAmount;
        const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;
        const fullPd = pdPerUnit * quantity;

        return {
          quantity,
          supplierBaseAmount,
          pricePerUnit,
          baseAmount,
          fullPriceWithDiscount,
          manualDiscountAmount,
          tax,
          extendedAmount,
          supplierDiscountAmount,
          pricePerUnitWithSupplierDiscount,
          customDiscountAmount,
          pricePerUnitWithCustomDiscount,
          pdPerUnit,
          fullPd,
          discountPercentage: discount,
          supplierDiscountPercentage: supplierDiscount,
          margin,
          supplierPricePerUnit
        };
      }


      // function for changing exchange rates
      const exchangeRateChange = async (currency, newValue) => {
        await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=extreme_supplierdiscount,extreme_pd,extreme_fullpd,quotedetailid,extreme_tax,extreme_discount,extreme_margin,extreme_pricelistpriceperunit,quantity&$filter=(_quoteid_value eq ${quoteIdForm} and extreme_pricelistcurrency eq '${currenciesArray.find((item) => item.isocurrencycode === currency).currencysymbol}')`).then(
          async function success(results) {
            // console.log(results);
            for (var i = 0; i < results.entities.length; i++) {
              var result = results.entities[i];
              // Columns
              var quotedetailid = result["quotedetailid"]; // Guid
              var quantity = result["quantity"]; // Decimal
              var extreme_pricelistpriceperunit = result["extreme_pricelistpriceperunit"]; // Decimal
              var extreme_margin = result["extreme_margin"]; // Decimal
              var extreme_discount = result["extreme_discount"]; // Decimal
              var extreme_supplierdiscount = result["extreme_supplierdiscount"]; // Decimal
              var extreme_tax = result["extreme_tax"]; // Decimal

              var pricePerUnit = (extreme_pricelistpriceperunit * parseFloat(newValue)) * extreme_margin;
              var baseAmount = pricePerUnit * quantity;
              var manualDiscountAmount = baseAmount - (baseAmount * (1 - extreme_discount / 100));
              var fullPriceWithDiscount = pricePerUnit * (1 - extreme_discount / 100) * quantity;
              var tax = ((pricePerUnit * (1 - extreme_discount / 100)) * quantity * (1 + extreme_tax / 100)) - (pricePerUnit * (1 - extreme_discount / 100) * quantity);
              var extendedAmount = tax + (pricePerUnit * (1 - extreme_discount / 100) * quantity);

              const supplierDiscountAmount = extreme_pricelistpriceperunit * parseFloat(newValue) * (extreme_supplierdiscount / 100);
              const pricePerUnitWithSupplierDiscount = extreme_pricelistpriceperunit * parseFloat(newValue) - supplierDiscountAmount;
              const customDiscountAmount = pricePerUnit * (extreme_discount / 100);
              const pricePerUnitWithCustomDiscount = pricePerUnit - customDiscountAmount;
              const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;
              var newPd = pdPerUnit;
              var newFullPd = newPd * quantity;

              await Xrm.WebApi.updateRecord("quotedetail", `${quotedetailid}`, {
                extreme_supplierpriceperunit: extreme_pricelistpriceperunit * parseFloat(newValue),
                extreme_supplierbaseamount: (extreme_pricelistpriceperunit * parseFloat(newValue)) * quantity,
                priceperunit: pricePerUnit,
                baseamount: baseAmount,
                manualdiscountamount: manualDiscountAmount,
                extreme_fullpricewithdiscount: fullPriceWithDiscount,
                tax: tax,
                extendedamount: extendedAmount,
                extreme_pd: newPd,
                extreme_fullpd: newFullPd
              });

              quoteLinesData.update(quotedetailid, {
                extreme_supplierpriceperunit: extreme_pricelistpriceperunit * parseFloat(newValue),
                extreme_supplierbaseamount: (extreme_pricelistpriceperunit * parseFloat(newValue)) * quantity,
                priceperunit: pricePerUnit,
                baseamount: baseAmount,
                manualdiscountamount: manualDiscountAmount,
                extreme_fullpricewithdiscount: fullPriceWithDiscount,
                tax: tax,
                extendedamount: extendedAmount,
                extreme_pd: newPd,
                extreme_fullpd: newFullPd
              });

              if (quoteLinesData._array.find((item) => item.quotedetailid === quotedetailid).extreme_parentquoteline) {
                // // console.log("CHILD UPDATED WITH PARENT QUOTE LINE");
                const parentQuoteLineGUID = quoteLinesData._array.find((item) => item.quotedetailid === quotedetailid).extreme_parentquoteline;

                let baseamount_sum = 0;
                let extendedamount_sum = 0;
                let extreme_fullpd_sum = 0;
                let extreme_fullpricewithdiscount_sum = 0;
                let manualdiscountamount_sum = 0;
                let extreme_supplierbaseamount_sum = 0;
                let tax_sum = 0;
                let avarageDiscountPercent = 0;

                quoteLinesData._array.filter((item) => item.extreme_parentquoteline === parentQuoteLineGUID).forEach((e) => {
                  baseamount_sum += e.baseamount;
                  extendedamount_sum += e.extendedamount;
                  extreme_fullpd_sum += e.extreme_fullpd;
                  extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
                  manualdiscountamount_sum += e.manualdiscountamount;
                  extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
                  tax_sum += e.tax;
                });

                avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;

                quoteLinesData.update(parentQuoteLineGUID, {
                  baseamount: baseamount_sum.toFixed(2),
                  extendedamount: extendedamount_sum.toFixed(2),
                  extreme_fullpd: extreme_fullpd_sum.toFixed(2),
                  extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum.toFixed(2),
                  manualdiscountamount: manualdiscountamount_sum.toFixed(2),
                  extreme_supplierbaseamount: extreme_supplierbaseamount_sum.toFixed(2),
                  tax: tax_sum.toFixed(2),
                  extreme_discount: avarageDiscountPercent.toFixed(2)
                });

                dataGrid.getController('data').updateItems({
                  changeType: 'update',
                  rowIndices: [dataGrid.getRowIndexByKey(parentQuoteLineGUID)]
                });
              }

              // dataGrid.getController('data').updateItems({
              //   changeType: 'update',
              //   rowIndices: [dataGrid.getRowIndexByKey(quotedetailid)]
              // });

            }

            await getQuoteProducts(quoteIdForm);
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

        formContext.data.refresh(true);

        // quoteLinesData._array.filter((item) => item.extreme_pricelistcurrency === currenciesArray.find((item) => item.isocurrencycode === currency).currencysymbol).forEach((e) => {

        //   quoteLinesData.update(e.quotedetailid, {
        //     extreme_supplierpriceperunit: e.extreme_pricelistpriceperunit * parseFloat(newValue),
        //     extreme_supplierbaseamount: (e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.quantity,
        //     priceperunit: (e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin,
        //     baseamount: ((e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin) * e.quantity,
        //     manualdiscountamount: (((e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin) * e.quantity) - ((((e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin) * (1 - e.extreme_discount / 100) * e.quantity)),
        //     extreme_fullpricewithdiscount: (((e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin) * (1 - e.extreme_discount / 100)) * e.quantity,
        //     tax: (((e.priceperunit * (1 - e.extreme_discount / 100)) * e.quantity) * (1 + e.extreme_tax / 100)) - ((e.priceperunit * (1 - e.extreme_discount / 100)) * e.quantity),
        //     extendedamount: e.tax + ((e.priceperunit * (1 - e.extreme_discount / 100)) * e.quantity)
        //   });

        //   dataGrid.getController('data').updateItems({
        //     changeType: 'update',
        //     rowIndices: [dataGrid.getRowIndexByKey(e.quotedetailid)]
        //   });

        // });

      }

      // onAdd Drag and Drop function
      async function onAdd(e) {

        if (!isDraftStatus) {
          Xrm.Navigation.openAlertDialog({ confirmButtonLabel: "Close", text: "Grid is in read-only mode.", title: "Cannot do that" });
          return;
        }

        Xrm.Utility.showProgressIndicator('');

        // // console.log('onAdd TRIGGERED!');
        // // console.log(e);

        let key = '';
        let values = {};

        if (e.fromData === 'root' && e.itemData.extreme_isparentitem === false) {
          // // console.log('from root to child, no parent item');

          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount) + e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount) + e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd) + e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount) + e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount) + e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount) + e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax) + e.itemData.tax;
          const newBaseAmountSum = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount);
          const newFullPriceWithDiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount);
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_discount = ((newBaseAmountSum - newFullPriceWithDiscount) / newBaseAmountSum) * 100;

          key = e.itemData.quotedetailid;
          values = { extreme_parentquoteline: e.toData };

          await Xrm.WebApi.updateRecord("quotedetail", `${e.itemData.quotedetailid}`, { "extreme_ParentQuoteLine@odata.bind": `/quotedetails(${e.toData})` });

          quoteLinesData.update(key, values).then(() => {
            quoteLinesData.push([{
              type: 'update', key, data: values,
            }]);
          });

        }
        else if (e.fromData !== 'root' && e.toData === 'root') {
          // // console.log('from child to parent');

          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount) - e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount) - e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd) - e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount) - e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount) - e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount) - e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax) - e.itemData.tax;
          const newBaseAmountSum = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount);
          const newFullPriceWithDiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount);
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_discount = ((newBaseAmountSum - newFullPriceWithDiscount) / newBaseAmountSum) * 100;

          key = e.itemData.quotedetailid;
          values = { extreme_parentquoteline: null };

          await Xrm.WebApi.updateRecord("quotedetail", `${e.itemData.quotedetailid}`, { "extreme_ParentQuoteLine@odata.bind": null });

          quoteLinesData.update(key, values).then(() => {
            quoteLinesData.push([{
              type: 'update', key, data: values,
            }]);
          });

        }
        else if (e.fromData !== 'root' && e.toData !== 'root' && e.fromData !== e.toData) {
          // // console.log('from child to another child');

          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount) - e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount) - e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd) - e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount) - e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount) - e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount) - e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax) - e.itemData.tax;
          const newBaseAmountSumFrom = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount);
          const newFullPriceWithDiscountFrom = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount);
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_discount = ((newBaseAmountSumFrom - newFullPriceWithDiscountFrom) / newBaseAmountSumFrom) * 100;

          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount) + e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount) + e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd) + e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount) + e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount) + e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount) + e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax) + e.itemData.tax;
          const newBaseAmountSumTo = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount);
          const newFullPriceWithDiscountTo = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount);
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_discount = ((newBaseAmountSumTo - newFullPriceWithDiscountTo) / newBaseAmountSumTo) * 100;

          key = e.itemData.quotedetailid;
          values = { extreme_parentquoteline: e.toData };

          await Xrm.WebApi.updateRecord("quotedetail", `${e.itemData.quotedetailid}`, { "extreme_ParentQuoteLine@odata.bind": `/quotedetails(${e.toData})` });

          quoteLinesData.update(key, values).then(() => {
            quoteLinesData.push([{
              type: 'update', key, data: values,
            }]);
          });

        }

        // // console.log(key);
        // // console.log(values);

        for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length; i++) {
          Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].quotedetailid}`, { sequencenumber: parseInt((i + 1) + "00") });
          quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].sequencenumber = parseInt((i + 1) + "00");
        }

        for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null).length; i++) {
          Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].quotedetailid}`, { sequencenumber: quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1) });
          quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].sequencenumber = quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1);
        }

        Xrm.Utility.closeProgressIndicator();

        // store.update(key, values).then(() => {
        //   store.push([{
        //     type: 'update', key, data: values,
        //   }]);
        // });
      }

      // function for checking classify needed rows
      const checkClassifyRows = () => {

        classifyNeededRows = 0;

        if (quoteLinesData._array.length > 0) {
          quoteLinesData._array.filter((item) =>
          // item.extreme_isparentitem === false &&
          (
            (item.extreme_area === null || item.extreme_area === undefined) ||
            (item.extreme_technology === null || item.extreme_technology === undefined) ||
            (item.extreme_vendorsupplier === null || item.extreme_vendorsupplier === undefined)
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

        // // console.log('CLASSIFY NEEDED ROWS');
        // // console.log(classifyNeededRows);

      }

      // Dropdown template cell editor
      function dropDownBoxEditorTemplateProducts(cellElement, cellInfo) {
        return $('<div>').dxLookup({
          dataSource: {
            store: productsStore,
            postProcess: function (data) {
              // data.unshift({ productId: "productId", productName: "productName", productDefaultUnit: "productDefaultUnit", disabled: true });
              return data;
            }
          },
          searchEnabled: true,
          displayExpr: function (item) {
            if (item)
              return item.productId + " " + item.productName;
          },
          valueExpr: "productId",
          searchExpr: ["productId", "productName", "productDefaultUnit"],
          width: 500,
          popupWidth: 500,
          itemTemplate: function (data, index, container) {
            var row = $("<div>").addClass("row-fluid");
            $("<div>").addClass("col-xs-4").text(data["productId"]).appendTo(row);
            $("<div>").addClass("col-xs-4").text(data["productName"]).appendTo(row);
            $("<div>").addClass("col-xs-4").text(data["productDefaultUnit"]).appendTo(row);
            container.append(row);
          }

        });
      }

      // Function to get Inventory Info and display it as pop-up dialog
      async function inventoryInfo(productGuid, quoteDetailGuid) {
        const globalContext = Xrm.Utility.getGlobalContext();
        const productName = await Xrm.WebApi.retrieveRecord("product", productGuid, "?$select=name,productnumber");


        const pageInput = {
          pageType: "webresource",
          webresourceName: "extreme_InventoryInfo.html",
          data: JSON.stringify({
            baseUrl: Xrm.Utility.getGlobalContext().getClientUrl(),
            baseUrlWithApp: globalContext.getCurrentAppUrl(),
            entityId: formContext.data.entity.getId().slice(1, -1),
            quoteDetailGuid: quoteDetailGuid,
            productGuid: productGuid,
            productName: productName.name,
          }),
        };

        const navigationOptions = {
          target: 2,
          height: { value: 500, unit: "px" },
          width: { value: 800, unit: "px" },
          position: 1,
          title: productName.productnumber + " | " + productName.name,
        };

        Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
          function success() {
            // Run code on success
            // // console.log("Success");
          },
          function error(error) {
            // Handle errors
            Xrm.Navigation.openErrorDialog({
              details: error,
              errorCode: 400,
              message: error.message
            });
          }
        );
      }

    });
  }


  // Select the gridContainer element
  let gridContainer;

  const wrControl = formContext.getControl('WebResource_quoteLines');
  wrControl.getContentWindow().then(function (contentWindow) {
    // // console.log('HEIGHT MAIN CONTAINER:');
    // // console.log(contentWindow.document.getElementById('gridContainer').offsetHeight);
    gridContainer = contentWindow.document.getElementById('gridContainer');
    // // console.log(gridContainer);

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
              iframe.style.minHeight = '255px';
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


  Xrm.Utility.closeProgressIndicator();

}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}

// Delete case line
async function deleteCaseLine(caseLineId) {
  await Xrm.WebApi.deleteRecord("extreme_caseline", `${caseLineId}`).then(
    function success(result) {
      // // console.log(result);
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