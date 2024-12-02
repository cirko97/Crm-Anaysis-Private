let quoteLinesArray = [];
let productsArray = [];
let customProductsArray = [];
let customUnitsArray = [];
let filterForPriceListsQuery = '';
let priceListsArray = [];
let unitsArray = [];
let currenciesArray = [];
let defaultMargin = 0;
let newCreateId = '';
let newCreatedProductId = '';
let newIdForCustomProducts = 100001;
let newIdForCustomUnits = 200001;
let heightAuto = true;
let isAddingSet = null;

async function setClientApiContext(Xrm, formContext) {
  // Optionally set Xrm and formContext as global variables on the page.
  window.Xrm = Xrm;
  window._formContext = formContext;

  Xrm.Utility.showProgressIndicator('Loading... Please wait...');



  const quoteIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
  const userId = replaceCurlyBrackets(Xrm.Utility.getGlobalContext().userSettings.userId, "");
  const taxPercentOfAccount = await Xrm.WebApi.retrieveRecord("account", `${replaceCurlyBrackets(formContext.getAttribute('customerid').getValue()[0].id, '')}`, "?$select=extreme_tax");
  const exchangeRatesForm = await Xrm.WebApi.retrieveRecord("quote", `${quoteIdForm}`, "?$select=extreme_chfexchangerate,extreme_dollarexchangerate,extreme_euroexchangerate,exchangerate,extreme_gbpexchangerate,extreme_macedoniandenarexchangerate,extreme_rsdexchangerate");


  let quoteCurrency = null;
  let quoteCurrencySymbol = null;
  let jsonForConverting = null;
  if (replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '') !== null) {
    await Xrm.WebApi.retrieveRecord("transactioncurrency", `${replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '')}`, "?$select=isocurrencycode,currencysymbol").then(
      function success(result) {
        console.log(result);
        // Columns
        var transactioncurrencyid = result["transactioncurrencyid"]; // Guid
        var isocurrencycode = result["isocurrencycode"]; // Text
        var currencysymbol = result["currencysymbol"]; // Text

        quoteCurrency = isocurrencycode;
        quoteCurrencySymbol = currencysymbol;

      },
      function (error) {
        console.log(error.message);
      }
    );
  }


  await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_key,extreme_value&$filter=extreme_key eq 'QUOTE_MARGIN'").then(
    function success(results) {
      console.log(results);
      defaultMargin = parseFloat(results.entities[0]["extreme_value"]); // Text
    },
    function (error) {
      console.log(error.message);
    }
  );

  if (replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '') !== null) {
    await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", `?$select=extreme_value,extreme_key&$filter=extreme_key eq '${quoteCurrency}'`).then(
      async function success(results) {
        console.log(results);
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
              console.log(updatedId);
            },
            function (error) {
              console.log(error.message);
            }
          );
        }


        console.log('jsonForConverting');
        console.log(jsonForConverting);

      },
      function (error) {
        console.log(error.message);
      }
    );
  }


  await getUnits();
  await getCurrencies();
  await getProductsLookUp();
  await getQuoteProducts(quoteIdForm);
  await getPriceLists();


  initDataGrid(quoteIdForm, userId);

  // Set title for grid inside header
  const quoteLinesDisplayName = await Xrm.Utility.getEntityMetadata('quotedetail').then(
    result => result._displayName,
    error => console.log(error)
  );
  // setTimeout(() => {
  //   const toolbarBefore = Xrm.Page.getControl("WebResource_quoteLines").getObject().contentWindow.window.document.querySelector('div.dx-toolbar-before');
  //   console.log('dx toolbar before: ', toolbarBefore);
  //   toolbarBefore.innerHTML = `<span style='font-weight: 500; position: absolute; width: 100px; bottom: 30%; left: 0;'>${quoteLinesDisplayName}</span>`;
  //   console.log(formContext.data.entity);
  // }, 1000); // Adjust the timeout as needed








  // Data from DV - Xrm Web Api
  async function getQuoteProducts(quoteId) {

    quoteLinesArray = [];
    customProductsArray = [];
    customUnitsArray = [];
    filterForPriceListsQuery = '';

    await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=manualdiscountamount,extreme_isparentitem,_extreme_parentquoteline_value,extreme_supplierbaseamount,extreme_supplierpriceperunit,quotedetailid,baseamount,extreme_tax,extendedamount,extreme_discount,_productid_value,_uomid_value,extreme_fullpd,extreme_fullprice,extreme_fullpricewithdiscount,extreme_fullpricerounded,extreme_margin,quotedetailname,extreme_pd,_extreme_pricelist_value,extreme_pricelistcurrency,priceperunit,extreme_pricelistpriceperunit,extreme_pricewithdiscount,extreme_customproductid,quantity,extreme_supplierdiscount,tax,isproductoverridden,extreme_productdescription,extreme_uomid,sequencenumber&$filter=_quoteid_value eq ${quoteIdForm}`).then(
      async function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];

          let baseamount_sum = 0;
          let extendedamount_sum = 0;
          let extreme_fullpd_sum = 0;
          let extreme_fullpricewithdiscount_sum = 0;
          let manualdiscountamount_sum = 0;
          let extreme_supplierbaseamount_sum = 0;
          let tax_sum = 0;

          var extreme_isparentitem = result["extreme_isparentitem"]; // Boolean
          var quotedetailid = result["quotedetailid"]; // Guid

          if (extreme_isparentitem === true) {
            await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=baseamount,extendedamount,extreme_fullpd,extreme_fullpricewithdiscount,manualdiscountamount,extreme_supplierbaseamount,tax&$filter=_extreme_parentquoteline_value eq ${quotedetailid}`).then(
              function success(results) {
                console.log(results);
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
              },
              function (error) {
                console.log(error.message);
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
          var quotedetailname = result["quotedetailname"]; // Text
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
            "productid": productid ? productid : newIdForCustomProducts++,
            "extreme_customproductid": extreme_customproductid,
            "extreme_productdescription": extreme_productdescription,
            "isproductoverridden": isproductoverridden,
            "uomid": varForUomid,
            "extreme_uomid": extreme_uomid,
            "quotedetailname": quotedetailname,
            "extreme_pricelistpriceperunit": extreme_pricelistpriceperunit,
            "extreme_pricelistcurrency": extreme_pricelistcurrency,
            "priceperunit": priceperunit,
            "extreme_supplierbaseamount": extreme_isparentitem === true ? extreme_supplierbaseamount_sum : extreme_supplierbaseamount,
            "extreme_supplierpriceperunit": extreme_supplierpriceperunit,
            "quantity": quantity,
            "baseamount": extreme_isparentitem === true ? baseamount_sum : baseamount,
            "extreme_supplierdiscount": extreme_supplierdiscount,
            "extreme_margin": extreme_margin,
            "extreme_fullpricerounded": extreme_fullpricerounded,
            "extreme_fullprice": extreme_fullprice,
            "extreme_discount": extreme_discount,
            "manualdiscountamount": extreme_isparentitem === true ? manualdiscountamount_sum : manualdiscountamount,
            "extreme_pricewithdiscount": extreme_pricewithdiscount,
            "extreme_fullpricewithdiscount": extreme_isparentitem === true ? extreme_fullpricewithdiscount_sum : extreme_fullpricewithdiscount,
            "extreme_tax": extreme_tax,
            "tax": extreme_isparentitem === true ? tax_sum : tax,
            "extreme_pd": extreme_pd,
            "extreme_fullpd": extreme_isparentitem === true ? extreme_fullpd_sum : extreme_fullpd,
            "extendedamount": extreme_isparentitem === true ? extendedamount_sum : extendedamount,
            "extreme_pricelist": extreme_pricelist,
            "sequencenumber": sequencenumber,
            "extreme_isparentitem": extreme_isparentitem,
            "extreme_parentquoteline": extreme_parentquoteline
          });

          if (!productid) {
            customProductsArray.push({
              "id": extreme_customproductid,
              "name": extreme_customproductid,
              "productName": quotedetailname,
              "productId": extreme_customproductid
            });
          }

          if (!uomid && extreme_uomid && !unitsArray.find((item) => item.name === extreme_uomid)) {
            customUnitsArray.push({
              "id": newCustomIdForUnit,
              "name": extreme_uomid
            });
          }

        }

        console.log('QuoteLinesWithGoodProductId');
        console.log(quoteLinesArray.filter((item) => typeof (item.productid) !== 'number'));
        const productIdsForFilter = quoteLinesArray.filter((item) => typeof (item.productid) !== 'number');
        if (productIdsForFilter.length === 1) {
          filterForPriceListsQuery = `productid/productid eq ${quoteLinesArray.find((item) => typeof (item.productid) !== 'number').productid}`;
        }
        else if (productIdsForFilter.length > 1) {
          for (let i = 0; i < productIdsForFilter.length; i++) {
            if (i === productIdsForFilter.length - 1) {
              filterForPriceListsQuery += `productid/productid eq ${productIdsForFilter[i].productid}`
            }
            else {
              filterForPriceListsQuery += `productid/productid eq ${productIdsForFilter[i].productid} or `
            }
          }
        }
        console.log(filterForPriceListsQuery);

        console.log(customProductsArray);
        console.log(customUnitsArray);

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
      await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,_pricelevelid_value,_defaultuomid_value,name,productnumber${skipToken !== '' ? '&$skiptoken=' + skipToken : ''}`).then(
        async function success(results) {
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
            var defaultuomid = result["_defaultuomid_value"]; // Lookup
            var defaultuomid_formatted = result["_defaultuomid_value@OData.Community.Display.V1.FormattedValue"];
            var defaultuomid_lookuplogicalname = result["_defaultuomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
            var pricelevelid = result["_pricelevelid_value"]; // Lookup
            var pricelevelid_formatted = result["_pricelevelid_value@OData.Community.Display.V1.FormattedValue"];
            var pricelevelid_lookuplogicalname = result["_pricelevelid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

            // const priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$filter=(_pricelevelid_value eq ${pricelevelid} and _productid_value eq ${productid})`);

            productsArray.push({
              "id": productid,
              "name": productnumber ? productnumber + ' - ' + name : name,
              "productName": name,
              "productId": productnumber,
              "productDefaultUnit": defaultuomid,
              "pricelevelid": pricelevelid,
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

  async function getPriceLists() {

    priceListsArray = [];
    console.log('filterForPriceListsQuery');
    console.log(filterForPriceListsQuery);

    await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value,_pricelevelid_value,_productid_value${filterForPriceListsQuery === '' ? '' : `&$filter=(${filterForPriceListsQuery})`}`).then(
      function success(results) {
        console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columnsd
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

          priceListsArray.push({
            "id": pricelevelid,
            "name": pricelevelid_formatted,
            "amount": amount,
            "amount_num": amount_num,
            "currency_code": transactioncurrencyid_formatted,
            "productid": productid
          });

        }
      },
      function (error) {
        console.log(error.message);
      }
    );

    // await Xrm.WebApi.retrieveMultipleRecords("pricelevel", "?$select=pricelevelid,name").then(
    //   function success(results) {
    //     console.log(results);
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
    //     console.log(error.message);
    //   }
    // );
  }

  async function getUnits() {

    unitsArray = [];

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
          });

        }
      },
      function (error) {
        console.log(error.message);
      }
    );
  }

  async function getCurrencies() {

    currenciesArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("transactioncurrency", "?$select=transactioncurrencyid,isocurrencycode,currencyname,currencyprecision,currencysymbol").then(
      function success(results) {
        console.log(results);
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
        console.log(error.message);
      }
    );
  }




  // Function to initialize data grid for case lines
  function initDataGrid(quoteIdForm, userId) {
    $(() => {
      const quoteLinesData = new DevExpress.data.ArrayStore({
        key: 'quotedetailid',
        data: quoteLinesArray,
      });

      var productsStore = new DevExpress.data.ArrayStore({
        key: "id",
        data: productsArray
      });
      newIdForCustomProducts = 100001
      // add custom products on init table to lookup field of products if exists
      if (customProductsArray.length > 0) {
        customProductsArray.forEach((e) => {
          var newItem = {};
          newItem.id = newIdForCustomProducts++;
          newItem.name = e.name;
          newItem.productId = e.productId
          productsStore.insert(newItem);
        })
      }

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
          reshapeOnPush: true
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
          // "or",
          // [
          //   ["extreme_parentquoteline", "=", null],
          //   "and",
          //   ["extreme_isparentitem", "=", null]
          // ]
        ],

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
        // paging: {
        //   pageSize: 5,
        // },
        editing: {
          mode: 'cell',
          allowUpdating: true,
          allowAdding: true,
          allowDeleting: true,
          useIcons: true
        },
        // selection: {
        //   mode: 'multiple',
        // },
        allowColumnResizing: true,
        allowColumnReordering: true,
        columnResizingMode: "mode",
        columnMinWidth: 10,
        columnAutoWidth: true,
        columnHidingEnabled: false,
        scrolling: {
          mode: "standard",
          scrollByContent: true,
          scrollByThumb: true
        },
        rowDragging: {
          allowReordering: true,
          allowDropInsideItem: false,
          showDragIcons: true,
          onReorder(e) {
            console.log("reodrering e");
            console.log(e);
            const visibleRows = e.component.getVisibleRows();
            const toIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === visibleRows[e.toIndex].data.quotedetailid);
            const fromIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === e.itemData.quotedetailid);

            quoteLinesData._array.splice(fromIndex, 1);
            quoteLinesData._array.splice(toIndex, 0, e.itemData);

            for (let i = 0; i < quoteLinesData._array.length; i++) {
              Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array[i].quotedetailid}`, { sequencenumber: i + 1 })
              quoteLinesData._array[i].sequencenumber = i + 1;
            }

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
            console.log('productsData');
            console.log(productsData);
            console.log(productsData.sequencenumber);

            container.css('padding', '0 0 10px 10px');
            container.css('background', '#e5edfe');

            $(`<div id="${productsData.quotedetailid}" class="child-grid">`)
              .dxDataGrid({

                // dataSource: new DevExpress.data.DataSource({
                //   store: new DevExpress.data.ArrayStore({
                //     key: 'quotedetailid',
                //     data: childDataArray,
                //   }),
                //   reshapeOnPush: true
                // }),

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
                wordWrapEnabled: true,
                showColumnLines: true,
                showRowLines: true,
                rowAlternationEnabled: false,
                showBorders: true,
                // headerFilter: {
                //   visible: true,
                //   height: 200
                // },
                // paging: {
                //   pageSize: 5,
                // },
                editing: {
                  mode: 'cell',
                  allowUpdating: true,
                  allowAdding: false,
                  allowDeleting: true,
                  useIcons: true
                },
                // selection: {
                //   mode: 'multiple',
                // },
                allowColumnResizing: true,
                allowColumnReordering: true,
                columnResizingMode: "mode",
                columnMinWidth: 10,
                columnAutoWidth: true,
                columnHidingEnabled: false,
                scrolling: {
                  mode: "standard",
                  scrollByContent: true,
                  scrollByThumb: true
                },
                rowDragging: {
                  allowReordering: true,
                  allowDropInsideItem: false,
                  showDragIcons: true,
                  onReorder(e) {
                    console.log("reodrering e");
                    console.log(e);

                    if (e.fromData === e.toData) {
                      console.log('inside the same child - reordering');
                    }

                    const visibleRows = e.component.getVisibleRows();
                    const toIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === visibleRows[e.toIndex].data.quotedetailid);
                    const fromIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === e.itemData.quotedetailid);

                    quoteLinesData._array.splice(fromIndex, 1);
                    quoteLinesData._array.splice(toIndex, 0, e.itemData);

                    for (let i = 0; i < quoteLinesData._array.length; i++) {
                      Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array[i].quotedetailid}`, { sequencenumber: i + 1 });
                      quoteLinesData._array[i].sequencenumber = i + 1;
                    }

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
                    visible: false
                  },
                  {
                    dataField: 'productid',
                    caption: 'Product ID',
                    lookup: {
                      dataSource: {
                        store: productsStore,
                        paginate: true,
                        pageSize: 20,
                        postProcess: function (data) {
                          // data.unshift({ productId: "ID", productName: "Name", priceListItemAmountFormatted: "Price", disabled: true });
                          return data;
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id',
                    },
                    editorOptions: {
                      acceptCustomValue: true,
                      // popupWidth: 600,
                      searchEnabled: true,
                      searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                      itemTemplate: function (data, index, container) {
                        var row = $("<div>").addClass("row text-wrap");
                        var containerFluid = $("<div>").addClass("container-fluid");
                        $("<div>").addClass("col-4").text(data["productId"]).appendTo(row);
                        $("<div>").addClass("col-4").text(data["productName"]).appendTo(row);
                        $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
                        row.appendTo(containerFluid);
                        container.append(containerFluid);
                      },
                      onCustomItemCreating: function (args) {
                        if (!args.text) {
                          args.customItem = null;
                          return;
                        }

                        var newItem = {};
                        newItem.id = newIdForCustomProducts++;
                        newItem.name = args.text;
                        newItem.productId = args.text;
                        productsStore.insert(newItem);
                        setTimeout(function () {
                          dataGrid.columnOption("productid", "lookup", {
                            dataSource: {
                              store: productsStore,
                              paginate: true,
                              pageSize: 20,
                            },
                            displayExpr: "name",
                            valueExpr: "id"
                          });
                        });
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
                      console.log('newData: ');
                      console.log(newData);
                      console.log('value: ');
                      console.log(value);
                      console.log('currentRowDataa: ');
                      console.log(currentRowData);
                      newData.productid = value;
                      if (!isAddingSet) newData.extreme_tax = taxPercentOfAccount.extreme_tax;
                      newData.quotedetailname = productsStore._array.find((item) => item.id === value).productName;
                      if (productsStore._array.find((item) => item.id === value).productDefaultUnit !== null) newData.uomid = productsStore._array.find((item) => item.id === value).productDefaultUnit;
                      if (productsStore._array.find((item) => item.id === value).pricelevelid && !isAddingSet) {
                        newData.extreme_pricelist = productsStore._array.find((item) => item.id === value).pricelevelid;
                        newData.extreme_pricelistpriceperunit = productsStore._array.find((item) => item.id === value).priceListItemAmount;
                        newData.extreme_pricelistcurrency = productsStore._array.find((item) => item.id === value).priceListItemCurrency;
                        if (quoteCurrencySymbol !== productsStore._array.find((item) => item.id === value).priceListItemCurrency) {
                          console.log(productsStore._array.find((item) => item.id === value).priceListItemAmount);
                          console.log(currenciesArray.find((item) => item.currencysymbol == productsStore._array.find((item) => item.id === value).priceListItemCurrency).isocurrencycode);
                          newData.extreme_supplierpriceperunit = productsStore._array.find((item) => item.id === value).priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == productsStore._array.find((item) => item.id === value).priceListItemCurrency).isocurrencycode}`).val();
                        } else {
                          newData.extreme_supplierpriceperunit = productsStore._array.find((item) => item.id === value).priceListItemAmount;
                        }
                      };
                    },
                    customizeText: function (cellInfo) {
                      if (cellInfo.valueText) {
                        // console.log(productsStore._array.find((item) => item.name === cellInfo.valueText))
                        return productsStore._array.find((item) => item.name === cellInfo.valueText)["productId"]
                      }
                      else {
                        return cellInfo.valueText;
                      }
                    },
                    validationRules: [{ type: 'required' }]
                  },
                  {
                    dataField: 'quotedetailname',
                    caption: 'Name',
                    dataType: 'string'
                  },
                  {
                    dataField: 'extreme_productdescription',
                    caption: 'Description',
                    dataType: 'string'
                  },
                  {
                    dataField: 'quantity',
                    caption: 'Qty',
                    dataType: 'number',
                    setCellValue: async function (newData, value, currentRowData) {

                      console.log('currentRowData');
                      console.log(currentRowData);

                      newData.quantity = value;
                      if (currentRowData.extreme_supplierpriceperunit !== null) newData.extreme_supplierbaseamount = currentRowData.extreme_supplierpriceperunit * value;
                      if (currentRowData.priceperunit !== null) newData.baseamount = value * currentRowData.priceperunit;
                      if (currentRowData.extreme_margin !== null &&
                        currentRowData.extreme_supplierpriceperunit !== null &&
                        currentRowData.extreme_supplierdiscount !== null &&
                        currentRowData.extreme_discount !== null &&
                        currentRowData.extreme_tax !== null) {
                        newData.priceperunit = Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit);
                        newData.baseamount = Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit) * value;
                        newData.extreme_fullpricewithdiscount = ((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value;
                        newData.manualdiscountamount = (value * (Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit))) - (((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value);
                        newData.tax = ((((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - (((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value);
                        newData.extendedamount = (((((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - (((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value)) + (((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value);
                        newData.extreme_pd = (Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) - (currentRowData.extreme_supplierpriceperunit - (currentRowData.extreme_supplierpriceperunit * (1 - currentRowData.extreme_supplierdiscount / 100)));
                        newData.extreme_fullpd = ((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) - (currentRowData.extreme_supplierpriceperunit - (currentRowData.extreme_supplierpriceperunit * (1 - currentRowData.extreme_supplierdiscount / 100)))) * value
                      }
                      else {
                        if (currentRowData.priceperunit !== null && value !== null && currentRowData.extreme_discount !== null) {
                          newData.extreme_fullpricewithdiscount = (currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value;
                          newData.manualdiscountamount = (value * currentRowData.priceperunit) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                        };
                        if (currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                          newData.tax = (((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                          newData.extendedamount = ((((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value)) + ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                        }
                      }
                    }
                  },
                  {
                    dataField: 'uomid',
                    caption: 'Unit',
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

                        var newItem = {};
                        newItem.id = newIdForCustomUnits++;
                        newItem.name = args.text;
                        unitsStore.insert(newItem);
                        setTimeout(function () {
                          dataGrid.columnOption("uomid", "lookup", {
                            dataSource: {
                              store: unitsStore,
                              paginate: true,
                              pageSize: 20,
                            },
                            displayExpr: "name",
                            valueExpr: "id"
                          });
                        });
                        args.customItem = newItem;
                      }
                    },
                    // validationRules: [{ type: 'required' }],
                  },
                  {
                    dataField: 'extreme_pricelistpriceperunit',
                    caption: 'Original PPU',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    cellTemplate(container, info) {
                      console.log(container, info);
                      return info.data.extreme_pricelistpriceperunit !== null ? $('<div>').text(info.data.extreme_pricelistpriceperunit + ` ${info.data.extreme_pricelistcurrency}`) : null;
                    },
                    visible: dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? true : false,
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
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_supplierpriceperunit = value;
                      if (currentRowData.quantity !== null) newData.extreme_supplierbaseamount = value * currentRowData.quantity;
                      if (currentRowData.extreme_margin !== null) newData.priceperunit = Math.ceil(value * currentRowData.extreme_margin);
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    }
                  },
                  {
                    dataField: 'extreme_supplierbaseamount',
                    caption: 'Base Amount',
                    dataType: 'number',
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
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_supplierdiscount = value;
                      if (currentRowData.priceperunit !== null && currentRowData.extreme_supplierpriceperunit !== null && currentRowData.quantity !== null) {
                        newData.extreme_pd = currentRowData.priceperunit - (currentRowData.extreme_supplierpriceperunit - (currentRowData.extreme_supplierpriceperunit * (1 - value / 100)));
                        newData.extreme_fullpd = (currentRowData.priceperunit - (currentRowData.extreme_supplierpriceperunit - (currentRowData.extreme_supplierpriceperunit * (1 - value / 100)))) * currentRowData.quantity;
                      }
                    },
                    visible: dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? true : false
                  },
                  {
                    dataField: 'extreme_margin',
                    caption: 'Margin',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 1
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_margin = value;
                      if (currentRowData.extreme_supplierpriceperunit !== null) {
                        newData.priceperunit = Math.ceil(value * currentRowData.extreme_supplierpriceperunit);
                        newData.baseamount = Math.ceil(value * currentRowData.extreme_supplierpriceperunit) * currentRowData.quantity;
                      };
                      if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_discount !== null) {
                        newData.extreme_fullpricewithdiscount = ((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity;
                        newData.manualdiscountamount = (currentRowData.quantity * (Math.ceil(value * currentRowData.extreme_supplierpriceperunit))) - (((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity);
                      };
                      if (currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                        newData.tax = ((((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - (((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity);
                        newData.extendedamount = (((((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - (((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity)) + (((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity);
                      };
                    }
                  },
                  {
                    dataField: 'priceperunit',
                    caption: 'Sales PPU',
                    dataType: 'number',
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
                    dataField: 'baseamount',
                    caption: 'Sales Amount',
                    dataType: 'number',
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
                    dataField: 'extreme_discount',
                    caption: 'Disc. %',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_discount = value;
                      if (currentRowData.priceperunit !== null && currentRowData.quantity !== null) {
                        // newData.extreme_pricewithdiscount = currentRowData.priceperunit * (1 - value / 100);
                        newData.extreme_fullpricewithdiscount = (currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity;
                        newData.manualdiscountamount = currentRowData.baseamount - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                      };
                      if (currentRowData.extreme_tax !== null) {
                        newData.tax = (((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                        newData.extendedamount = ((((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity)) + ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                      };

                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    }
                  },
                  {
                    dataField: 'manualdiscountamount',
                    caption: 'Discount Amount',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    visible: dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? true : false,
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
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_fullpricewithdiscount = value;
                      if (currentRowData.priceperunit !== null && currentRowData.quantity !== null) {
                        newData.extreme_discount = 100 * (1 - (value / (currentRowData.priceperunit * currentRowData.quantity)));
                        newData.manualdiscountamount = currentRowData.baseamount - ((currentRowData.priceperunit * (1 - (100 * (1 - (value / (currentRowData.priceperunit * currentRowData.quantity)))) / 100)) * currentRowData.quantity);
                      };
                      if (currentRowData.extreme_tax !== null) {
                        newData.tax = value * (1 + currentRowData.extreme_tax / 100) - value;
                        newData.extendedamount = (value * (1 + currentRowData.extreme_tax / 100) - value) + value;
                      };
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    }
                  },
                  {
                    dataField: 'extreme_tax',
                    caption: 'VAT %',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    },
                  },
                  {
                    dataField: 'tax',
                    caption: 'VAT Amount',
                    dataType: 'number',
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
                    dataField: 'extreme_pd',
                    caption: 'Profit Per Unit',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? true : false
                  },
                  {
                    dataField: 'extreme_fullpd',
                    caption: 'Gross Profit',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? true : false
                  },
                  {
                    dataField: 'extendedamount',
                    caption: 'Total Amount',
                    dataType: 'number',
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
                          filter: options.data ? ['productid', '=', options.data.productid] : null,
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
                  }
                ],
                onEditorPreparing: async (e) => {
                  console.log('Editor Preparing');
                  console.log(e);

                  if (e.dataField == "uomid" && typeof (e.row.data.productid) !== 'number') e.editorOptions.disabled = true;

                  if (e.dataField == "extreme_supplierdiscount" || e.dataField == "extreme_discount" || e.dataField == "extreme_tax") {
                    e.editorOptions.min = 0;
                    e.editorOptions.max = 100;
                  }

                  if (e.dataField == 'extreme_pricelist' && (!e.row.data.productid || typeof (e.row.data.productid) === 'number') || e.row.isNewRow) {
                    e.editorOptions.disabled = true;
                  }

                },
                onFocusedCellChanged: (e) => {
                  console.log(e);
                },
                onEditingStart: (e) => {
                  console.log('EditingStart');
                  console.log(e);
                },
                onEditCanceling: (e) => {
                  console.log('EditCanceling');
                  console.log(e);
                },
                onInitNewRow: async (e) => {
                  console.log('InitNewRow');
                  console.log(e);
                },
                onRowInserting: async (e) => {
                  console.log('RowInserting');
                  console.log(e);
                },
                onRowInserted: async (e) => {
                  console.log('RowInserted');
                  console.log(e);
                },
                onRowUpdating: async (e) => {
                  console.log('RowUpdating');
                  console.log(e);

                  var record = {};
                  if (e.newData.productid) record["productid@odata.bind"] = `/products(${e.newData.productid})`; // Lookup
                  if (e.newData.quotedetailname) record.quotedetailname = e.newData.quotedetailname; // Text
                  if (e.newData.extreme_productdescription) record.extreme_productdescription = e.newData.extreme_productdescription; // Text
                  if (e.newData.extreme_pricelistpriceperunit) record.extreme_pricelistpriceperunit = e.newData.extreme_pricelistpriceperunit; // Decimal
                  if (e.newData.extreme_pricelistcurrency) record.extreme_pricelistcurrency = e.newData.extreme_pricelistcurrency; // Text
                  if (e.newData.extreme_supplierpriceperunit) record.extreme_supplierpriceperunit = Number(parseFloat(e.newData.extreme_supplierpriceperunit).toFixed(4)); // Currency
                  if (e.newData.quantity) record.quantity = e.newData.quantity; // Decimal
                  if (e.newData.extreme_supplierbaseamount) record.extreme_supplierbaseamount = Number(parseFloat(e.newData.extreme_supplierbaseamount).toFixed(4)); // Currency
                  if (e.newData.extreme_supplierdiscount) record.extreme_supplierdiscount = e.newData.extreme_supplierdiscount; // Decimal
                  if (e.newData.extreme_margin) record.extreme_margin = e.newData.extreme_margin; // Decimal
                  if (e.newData.priceperunit) record.priceperunit = e.newData.priceperunit; // Decimal
                  if (e.newData.baseamount) record.baseamount = e.newData.baseamount; // Decimal
                  if (e.newData.extreme_discount) record.extreme_discount = e.newData.extreme_discount; // Decimal
                  if (e.newData.manualdiscountamount) record.manualdiscountamount = Number(parseFloat(e.newData.manualdiscountamount).toFixed(4)); // Currency
                  if (e.newData.extreme_pricewithdiscount) record.extreme_pricewithdiscount = e.newData.extreme_pricewithdiscount; // Decimal
                  if (e.newData.extreme_fullpricewithdiscount) record.extreme_fullpricewithdiscount = e.newData.extreme_fullpricewithdiscount; // Decimal
                  if (e.newData.extreme_tax) record.extreme_tax = e.newData.extreme_tax; // Decimal
                  if (e.newData.tax) record.tax = Number(parseFloat(e.newData.tax).toFixed(4)); // Currency
                  if (e.newData.extreme_pd) record.extreme_pd = e.newData.extreme_pd; // Decimal
                  if (e.newData.extreme_fullpd) record.extreme_fullpd = e.newData.extreme_fullpd; // Decimal
                  if (e.newData.extendedamount) record.extendedamount = e.newData.extendedamount; // New total amount
                  if (e.newData.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.newData.extreme_pricelist})`; // Lookup

                  if (!typeof (e.oldData.productid) === 'number') {
                    if (e.newData.uomid) record["uomid@odata.bind"] = `/uoms(${e.newData.uomid})`; // Lookup
                  }

                  await Xrm.WebApi.updateRecord("quotedetail", `${e.key}`, record).then(
                    async function success(result) {
                      var updatedId = result.id;
                      console.log(updatedId);
                      // await getQuoteProducts(quoteIdForm);
                      // dataGrid.refresh();
                    },
                    function (error) {
                      console.log(error.message);
                    }
                  );

                  console.log("PARENT QUOTE LINE");
                  console.log(e.oldData.extreme_parentquoteline);
                  if (e.oldData.extreme_parentquoteline) {

                    console.log("CHILD UPDATED WITH PARENT QUOTE LINE");

                    let baseamount_sum = 0;
                    let extendedamount_sum = 0;
                    let extreme_fullpd_sum = 0;
                    let extreme_fullpricewithdiscount_sum = 0;
                    let manualdiscountamount_sum = 0;
                    let extreme_supplierbaseamount_sum = 0;
                    let tax_sum = 0;

                    quoteLinesData._array.filter((item) => item.extreme_parentquoteline === e.oldData.extreme_parentquoteline).forEach((e) => {
                      baseamount_sum += e.baseamount;
                      extendedamount_sum += e.extendedamount;
                      extreme_fullpd_sum += e.extreme_fullpd;
                      extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
                      manualdiscountamount_sum += e.manualdiscountamount;
                      extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
                      tax_sum += e.tax;
                    });

                    quoteLinesData.update(e.oldData.extreme_parentquoteline, {
                      baseamount: baseamount_sum,
                      extendedamount: extendedamount_sum,
                      extreme_fullpd: extreme_fullpd_sum,
                      extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum,
                      manualdiscountamount: manualdiscountamount_sum,
                      extreme_supplierbaseamount: extreme_supplierbaseamount_sum,
                      tax: tax_sum
                    });

                    dataGrid.getController('data').updateItems({
                      changeType: 'update',
                      rowIndices: [dataGrid.getRowIndexByKey(e.oldData.extreme_parentquoteline)]
                    });

                  }

                  formContext.data.refresh(true);

                },
                onRowUpdated(e) {
                  console.log('RowUpdated');
                  console.log(e);
                },
                onRowRemoving: async (e) => {
                  console.log('RowRemoving');
                  console.log(e);

                  Xrm.Utility.showProgressIndicator('Deleting... Please wait...');

                  await Xrm.WebApi.deleteRecord("quotedetail", `${e.key}`).then(
                    async function success(result) {
                      console.log(result);
                      await getQuoteProducts(quoteIdForm);
                      dataGrid.refresh();
                    },
                    function (error) {
                      console.log(error.message);
                    }
                  );

                  if (e.data.extreme_parentquoteline) {
                    console.log("CHILD UPDATED WITH PARENT QUOTE LINE");
                    const parentQuoteLineGUID = e.data.extreme_parentquoteline;

                    let baseamount_sum = 0;
                    let extendedamount_sum = 0;
                    let extreme_fullpd_sum = 0;
                    let extreme_fullpricewithdiscount_sum = 0;
                    let manualdiscountamount_sum = 0;
                    let extreme_supplierbaseamount_sum = 0;
                    let tax_sum = 0;

                    quoteLinesData._array.filter((item) => item.extreme_parentquoteline === parentQuoteLineGUID).forEach((e) => {
                      baseamount_sum += e.baseamount;
                      extendedamount_sum += e.extendedamount;
                      extreme_fullpd_sum += e.extreme_fullpd;
                      extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
                      manualdiscountamount_sum += e.manualdiscountamount;
                      extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
                      tax_sum += e.tax;
                    });

                    quoteLinesData.update(parentQuoteLineGUID, {
                      baseamount: baseamount_sum,
                      extendedamount: extendedamount_sum,
                      extreme_fullpd: extreme_fullpd_sum,
                      extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum,
                      manualdiscountamount: manualdiscountamount_sum,
                      extreme_supplierbaseamount: extreme_supplierbaseamount_sum,
                      tax: tax_sum
                    });

                    dataGrid.getController('data').updateItems({
                      changeType: 'update',
                      rowIndices: [dataGrid.getRowIndexByKey(parentQuoteLineGUID)]
                    });
                  }

                  formContext.data.refresh(true);

                  Xrm.Utility.closeProgressIndicator();

                },
                onRowRemoved: (e) => {
                  console.log('RowRemoved');
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
            dataField: 'sequencenumber',
            caption: 'Order',
            dataType: 'number',
            sortOrder: 'asc',
            visible: false
          },
          {
            dataField: 'productid',
            caption: 'Product ID',
            lookup: {
              dataSource: {
                store: productsStore,
                paginate: true,
                pageSize: 20,
                postProcess: function (data) {
                  // data.unshift({ productId: "ID", productName: "Name", priceListItemAmountFormatted: "Price", disabled: true });
                  // data.unshift({ productId: "ID", productName: "Name", disabled: true });
                  return data;
                }
              },
              displayExpr: 'name',
              valueExpr: 'id',
            },
            editorOptions: {
              acceptCustomValue: true,
              // popupWidth: 600,
              searchEnabled: true,
              // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
              searchExpr: ["productId", "productName"],
              itemTemplate: function (data, index, container) {
                var row = $("<div>").addClass("row text-wrap");
                var containerFluid = $("<div>").addClass("container-fluid");
                $("<div>").addClass("col-6").text(data["productId"]).appendTo(row);
                $("<div>").addClass("col-6").text(data["productName"]).appendTo(row);
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
                newItem.id = newIdForCustomProducts++;
                newItem.name = args.text;
                newItem.productId = args.text;
                productsStore.insert(newItem);
                setTimeout(function () {
                  dataGrid.columnOption("productid", "lookup", {
                    dataSource: {
                      store: productsStore,
                      paginate: true,
                      pageSize: 20,
                    },
                    displayExpr: "name",
                    valueExpr: "id"
                  });
                });
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

              let priceListItemInfo = [];

              if (productsStore._array.find((item) => item.id === value).pricelevelid) {
                if (value !== null) {
                  priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$filter=(_pricelevelid_value eq ${productsStore._array.find((item) => item.id === value).pricelevelid} and _productid_value eq ${value})`);
                }
              }

              console.log('priceListItemInfo');
              console.log(priceListItemInfo);

              const priceListItemAmount = priceListItemInfo.length !== 0 ? priceListItemInfo.entities[0].amount : null;
              const priceListItemAmountFormatted = priceListItemInfo.length !== 0 ? priceListItemInfo.entities[0]["amount@OData.Community.Display.V1.FormattedValue"] : null;
              const priceListItemCurrency = priceListItemInfo.length !== 0 ? currenciesArray.find((item) => item.transactioncurrencyid === priceListItemInfo.entities[0]._transactioncurrencyid_value).currencysymbol : null;

              console.log('SET CELL VALUES');
              console.log(priceListItemAmount);
              console.log(priceListItemCurrency);
              console.log(productsStore._array.find((item) => item.id === value).pricelevelid);

              console.log('newData: ');
              console.log(newData);
              console.log('value: ');
              console.log(value);
              console.log('currentRowDataa: ');
              console.log(currentRowData);
              newData.productid = value;
              if (!isAddingSet) newData.extreme_tax = taxPercentOfAccount.extreme_tax;
              newData.quotedetailname = productsStore._array.find((item) => item.id === value).productName;
              if (productsStore._array.find((item) => item.id === value).productDefaultUnit !== null) newData.uomid = productsStore._array.find((item) => item.id === value).productDefaultUnit;
              if (productsStore._array.find((item) => item.id === value).pricelevelid && !isAddingSet) {
                newData.extreme_pricelist = productsStore._array.find((item) => item.id === value).pricelevelid;
                newData.extreme_pricelistpriceperunit = priceListItemAmount;
                newData.extreme_pricelistcurrency = priceListItemCurrency;
                if (quoteCurrencySymbol !== priceListItemCurrency) {
                  console.log(productsStore._array.find((item) => item.id === value).priceListItemAmount);
                  console.log(currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode);
                  newData.extreme_supplierpriceperunit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                } else {
                  newData.extreme_supplierpriceperunit = priceListItemAmount;
                }
              };
              
              newData.quantity = 1;
            },
            customizeText: function (cellInfo) {
              if (cellInfo.valueText) {
                // console.log(productsStore._array.find((item) => item.name === cellInfo.valueText))
                return productsStore._array.find((item) => item.name === cellInfo.valueText)["productId"]
              }
              else {
                return cellInfo.valueText;
              }
            },
            validationRules: [{ type: 'required' }]
          },
          {
            dataField: 'quotedetailname',
            caption: 'Name',
            dataType: 'string'
          },
          {
            dataField: 'extreme_productdescription',
            caption: 'Description',
            dataType: 'string'
          },
          {
            dataField: 'quantity',
            caption: 'Qty',
            dataType: 'number',
            setCellValue: async function (newData, value, currentRowData) {

              console.log('currentRowData');
              console.log(currentRowData);

              newData.quantity = value;
              if (currentRowData.extreme_supplierpriceperunit !== null) newData.extreme_supplierbaseamount = currentRowData.extreme_supplierpriceperunit * value;
              if (currentRowData.priceperunit !== null) newData.baseamount = value * currentRowData.priceperunit;
              if (currentRowData.extreme_margin !== null &&
                currentRowData.extreme_supplierpriceperunit !== null &&
                currentRowData.extreme_supplierdiscount !== null &&
                currentRowData.extreme_discount !== null &&
                currentRowData.extreme_tax !== null) {
                newData.priceperunit = Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit);
                newData.baseamount = Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit) * value;
                newData.extreme_fullpricewithdiscount = ((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value;
                newData.manualdiscountamount = (value * (Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit))) - (((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value);
                newData.tax = ((((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - (((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value);
                newData.extendedamount = (((((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - (((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value)) + (((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * value);
                newData.extreme_pd = (Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) - (currentRowData.extreme_supplierpriceperunit - (currentRowData.extreme_supplierpriceperunit * (1 - currentRowData.extreme_supplierdiscount / 100)));
                newData.extreme_fullpd = ((Math.ceil(currentRowData.extreme_margin * currentRowData.extreme_supplierpriceperunit)) - (currentRowData.extreme_supplierpriceperunit - (currentRowData.extreme_supplierpriceperunit * (1 - currentRowData.extreme_supplierdiscount / 100)))) * value
              }
              else {
                if (currentRowData.priceperunit !== null && value !== null && currentRowData.extreme_discount !== null) {
                  newData.extreme_fullpricewithdiscount = (currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value;
                  newData.manualdiscountamount = (value * currentRowData.priceperunit) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                };
                if (currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                  newData.tax = (((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                  newData.extendedamount = ((((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value)) + ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                }
              }
            }
          },
          {
            dataField: 'uomid',
            caption: 'Unit',
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

                var newItem = {};
                newItem.id = newIdForCustomUnits++;
                newItem.name = args.text;
                unitsStore.insert(newItem);
                setTimeout(function () {
                  dataGrid.columnOption("uomid", "lookup", {
                    dataSource: {
                      store: unitsStore,
                      paginate: true,
                      pageSize: 20,
                    },
                    displayExpr: "name",
                    valueExpr: "id"
                  });
                });
                args.customItem = newItem;
              }
            },
            // validationRules: [{ type: 'required' }],
          },
          {
            dataField: 'extreme_pricelistpriceperunit',
            caption: 'Original PPU',
            dataType: 'number',
            format: {
              type: "fixedPoint",
              precision: 2
            },
            cellTemplate(container, info) {
              console.log(container, info);
              return info.data.extreme_pricelistpriceperunit !== null ? $('<div>').text(info.data.extreme_pricelistpriceperunit + ` ${info.data.extreme_pricelistcurrency}`) : null;
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
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_supplierpriceperunit = value;
              if (currentRowData.quantity !== null) newData.extreme_supplierbaseamount = value * currentRowData.quantity;
              if (currentRowData.extreme_margin !== null) newData.priceperunit = Math.ceil(value * currentRowData.extreme_margin);
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_supplierbaseamount',
            caption: 'Base Amount',
            dataType: 'number',
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
            format: {
              type: "fixedPoint",
              precision: 2
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_supplierdiscount = value;
              if (currentRowData.priceperunit !== null && currentRowData.extreme_supplierpriceperunit !== null && currentRowData.quantity !== null) {
                newData.extreme_pd = currentRowData.priceperunit - (currentRowData.extreme_supplierpriceperunit - (currentRowData.extreme_supplierpriceperunit * (1 - value / 100)));
                newData.extreme_fullpd = (currentRowData.priceperunit - (currentRowData.extreme_supplierpriceperunit - (currentRowData.extreme_supplierpriceperunit * (1 - value / 100)))) * currentRowData.quantity;
              }
            },
            visible: false
          },
          {
            dataField: 'extreme_margin',
            caption: 'Margin',
            dataType: 'number',
            format: {
              type: "fixedPoint",
              precision: 1
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_margin = value;
              if (currentRowData.extreme_supplierpriceperunit !== null) {
                newData.priceperunit = Math.ceil(value * currentRowData.extreme_supplierpriceperunit);
                newData.baseamount = Math.ceil(value * currentRowData.extreme_supplierpriceperunit) * currentRowData.quantity;
              };
              if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_discount !== null) {
                newData.extreme_fullpricewithdiscount = ((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity;
                newData.manualdiscountamount = (currentRowData.quantity * (Math.ceil(value * currentRowData.extreme_supplierpriceperunit))) - (((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity);
              };
              if (currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                newData.tax = ((((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - (((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity);
                newData.extendedamount = (((((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - (((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity)) + (((Math.ceil(value * currentRowData.extreme_supplierpriceperunit)) * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity);
              };
            }
          },
          {
            dataField: 'priceperunit',
            caption: 'Sales PPU',
            dataType: 'number',
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
            dataField: 'baseamount',
            caption: 'Sales Amount',
            dataType: 'number',
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
            dataField: 'extreme_discount',
            caption: 'Disc. %',
            dataType: 'number',
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_discount = value;
              if (currentRowData.priceperunit !== null && currentRowData.quantity !== null) {
                // newData.extreme_pricewithdiscount = currentRowData.priceperunit * (1 - value / 100);
                newData.extreme_fullpricewithdiscount = (currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity;
                newData.manualdiscountamount = currentRowData.baseamount - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
              };
              if (currentRowData.extreme_tax !== null) {
                newData.tax = (((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                newData.extendedamount = ((((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity)) + ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
              };

            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            }
          },
          {
            dataField: 'manualdiscountamount',
            caption: 'Discount Amount',
            dataType: 'number',
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
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_fullpricewithdiscount = value;
              if (currentRowData.priceperunit !== null && currentRowData.quantity !== null) {
                newData.extreme_discount = 100 * (1 - (value / (currentRowData.priceperunit * currentRowData.quantity)));
                newData.manualdiscountamount = currentRowData.baseamount - ((currentRowData.priceperunit * (1 - (100 * (1 - (value / (currentRowData.priceperunit * currentRowData.quantity)))) / 100)) * currentRowData.quantity);
              };
              if (currentRowData.extreme_tax !== null) {
                newData.tax = value * (1 + currentRowData.extreme_tax / 100) - value;
                newData.extendedamount = (value * (1 + currentRowData.extreme_tax / 100) - value) + value;
              };
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_tax',
            caption: 'VAT %',
            dataType: 'number',
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            },
          },
          {
            dataField: 'tax',
            caption: 'VAT Amount',
            dataType: 'number',
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
            dataField: 'extreme_pd',
            caption: 'Profit Per Unit',
            dataType: 'number',
            format: {
              type: "fixedPoint",
              precision: 2
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
            visible: false
          },
          {
            dataField: 'extreme_fullpd',
            caption: 'Gross Profit',
            dataType: 'number',
            format: {
              type: "fixedPoint",
              precision: 2
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
            visible: false
          },
          {
            dataField: 'extendedamount',
            caption: 'Total Amount',
            dataType: 'number',
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
                  filter: options.data ? ['productid', '=', options.data.productid] : null,
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
              console.log('NEW PRICE FROM PRICE LIST CHANGE');

              const newOrgPrice = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).amount_num;
              const newOrgCurrency = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).currency_code;
              const newOrgCurrencyValue = parseFloat($(`#${newOrgCurrency}`).val());
              const newOrgCurrencySymbol = currenciesArray.find((item) => item.isocurrencycode == newOrgCurrency).currencysymbol;

              console.log(newOrgPrice);
              console.log(newOrgCurrency);
              console.log(newOrgCurrencyValue);
              console.log(newOrgCurrencySymbol);

              newData.extreme_pricelistpriceperunit = newOrgPrice;
              newData.extreme_pricelistcurrency = newOrgCurrencySymbol;


              var pricePerUnit = (newOrgPrice * newOrgCurrencyValue) * currentRowData.extreme_margin;
              var baseAmount = pricePerUnit * currentRowData.quantity;
              var manualDiscountAmount = baseAmount - (baseAmount * (1 - currentRowData.extreme_discount / 100));
              var fullPriceWithDiscount = pricePerUnit * (1 - currentRowData.extreme_discount / 100) * currentRowData.quantity;
              var tax = ((pricePerUnit * (1 - currentRowData.extreme_discount / 100)) * currentRowData.quantity * (1 + currentRowData.extreme_tax / 100)) - (pricePerUnit * (1 - currentRowData.extreme_discount / 100) * currentRowData.quantity);
              var extendedAmount = tax + (pricePerUnit * (1 - currentRowData.extreme_discount / 100) * currentRowData.quantity);

              newData.extreme_supplierpriceperunit = newOrgPrice * newOrgCurrencyValue;
              newData.extreme_supplierbaseamount = (newOrgPrice * newOrgCurrencyValue) * currentRowData.quantity;
              newData.priceperunit = pricePerUnit;
              newData.baseamount = baseAmount;
              newData.manualdiscountamount = manualDiscountAmount;
              newData.extreme_fullpricewithdiscount = fullPriceWithDiscount;
              newData.tax = tax;
              newData.extendedamount = extendedAmount;

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
              options: {
                icon: 'plus',
                text: 'Add a row',
                width: 'auto',
                onClick(e) {
                  console.log(e);
                  console.log(dataGrid);

                  isAddingSet = false;
                  console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
                  dataGrid.columnOption("uomid", "allowEditing", true);
                  dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_margin", "allowEditing", true);
                  dataGrid.columnOption("extreme_discount", "allowEditing", true);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", true);

                  dataGrid.addRow();

                },
              },
            },
            {
              location: 'before',
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              options: {
                icon: 'plus',
                text: 'Add new set',
                width: 'auto',
                onClick(e) {
                  console.log(e);
                  console.log(dataGrid);

                  isAddingSet = true;
                  console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", false);
                  dataGrid.columnOption("uomid", "allowEditing", false);
                  dataGrid.columnOption("uomid", "validationRules", null);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_margin", "allowEditing", false);
                  dataGrid.columnOption("extreme_discount", "allowEditing", false);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", false);

                  dataGrid.addRow();

                },
              },
            },
            {
              location: 'before',
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              options: {
                text: 'Compact',
                width: 'auto',
                onClick(e) {
                  console.log(e);
                  console.log(dataGrid);
                  dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible', !dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible'));
                  // dataGrid.columnOption('extreme_pricelistcurrency', 'visible', !dataGrid.columnOption('extreme_pricelistcurrency', 'visible'));
                  dataGrid.columnOption('extreme_supplierdiscount', 'visible', !dataGrid.columnOption('extreme_supplierdiscount', 'visible'));
                  dataGrid.columnOption('extreme_pd', 'visible', !dataGrid.columnOption('extreme_pd', 'visible'));
                  dataGrid.columnOption('extreme_fullpd', 'visible', !dataGrid.columnOption('extreme_fullpd', 'visible'));
                  dataGrid.columnOption('manualdiscountamount', 'visible', !dataGrid.columnOption('manualdiscountamount', 'visible'));
                  e.component.option('text', dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? 'Extended' : 'Compact');
                },
              },
            },
            {
              location: 'after',
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

                $.each(jsonForConverting, function (currency, rate) {
                  if (rate !== 1) {
                    const $input = $('<input>').attr({
                      type: 'number',
                      id: currency,
                      class: 'currencyRates',
                      value: rate
                    }).css({
                      'max-width': '80px',
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
                      console.log(`New value for ${currency}: ${newValue} ${typeof (newValue)}`);
                      switch (currency) {
                        case "EUR":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_euroexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);
                          // await getQuoteProducts(quoteIdForm);
                          // dataGrid.refresh();

                          break;
                        case "USD":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_dollarexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);
                          // await getQuoteProducts(quoteIdForm);
                          // dataGrid.refresh();

                          break;
                        case "CHF":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_chfexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);
                          // await getQuoteProducts(quoteIdForm);
                          // dataGrid.refresh();

                          break;
                        case "RSD":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_rsdexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);
                          // await getQuoteProducts(quoteIdForm);
                          // dataGrid.refresh();

                          break;
                        case "MKD":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_macedoniandenarexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);
                          // await getQuoteProducts(quoteIdForm);
                          // dataGrid.refresh();

                          break;
                        case "GBP":
                          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_gbpexchangerate: parseFloat(newValue) });
                          await exchangeRateChange(currency, newValue);
                          await getQuoteProducts(quoteIdForm);
                          dataGrid.refresh();
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
          console.log('ROW PREPARED');
          console.log(e);

          if (e.rowType === 'data' && !e.data.extreme_isparentitem && e.data.quotedetailid) {
            console.log('REMOVED EXPAND FOR ', e.data.quotedetailid);
            e.cells[1].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
            e.cells[1].cellElement[0].classList.remove('dx-datagrid-expand');
          }

        },
        onEditorPreparing: async (e) => {
          console.log('Editor Preparing');
          console.log(e);

          if ((e.dataField == "uomid" && typeof (e.row.data.productid) !== 'number')) e.editorOptions.disabled = true;

          if (e.dataField == "extreme_supplierdiscount" || e.dataField == "extreme_discount" || e.dataField == "extreme_tax") {
            e.editorOptions.min = 0;
            e.editorOptions.max = 100;
          };

          if (e.dataField == 'extreme_pricelist' && (!e.row.data.productid || typeof (e.row.data.productid) === 'number' || e.row.isNewRow)) {
            e.editorOptions.disabled = true;
          }

          if ((e.row.data.extreme_isparentitem === true || (isAddingSet && e.row.isNewRow)) && e.dataField !== "productid" && e.dataField !== "quotedetailname" && e.dataField !== "extreme_productdescription") {
            e.editorOptions.disabled = true;
          }

        },
        onFocusedCellChanged: (e) => {
          console.log(e);
        },
        onEditingStart: (e) => {
          console.log('EditingStart');
          console.log(e);
        },
        onEditCanceling: (e) => {
          console.log('EditCanceling');
          console.log(e);
        },
        onInitNewRow: async (e) => {
          console.log('InitNewRow');
          console.log(e);

          if (!isAddingSet) {
            e.data.extreme_margin = defaultMargin;
            e.data.extreme_discount = 0;
            e.data.extreme_supplierdiscount = 0;
          }

        },
        onRowInserting: async (e) => {
          console.log('RowInserting');
          console.log(e);

          Xrm.Utility.showProgressIndicator('Loading... Please wait...');

          var record = {};
          record["quoteid@odata.bind"] = `/quotes(${quoteIdForm})`; // Lookup
          if (e.data.quotedetailname) record.quotedetailname = e.data.quotedetailname; // Text
          if (e.data.extreme_productdescription) record.extreme_productdescription = e.data.extreme_productdescription; // Text
          if (e.data.extreme_pricelistpriceperunit) record.extreme_pricelistpriceperunit = e.data.extreme_pricelistpriceperunit; // Decimal
          if (e.data.extreme_pricelistcurrency) record.extreme_pricelistcurrency = e.data.extreme_pricelistcurrency; // Text
          if (e.data.extreme_supplierpriceperunit) record.extreme_supplierpriceperunit = Number(parseFloat(e.data.extreme_supplierpriceperunit).toFixed(4)); // Currency
          if (e.data.quantity) record.quantity = e.data.quantity; // Decimal
          if (e.data.extreme_supplierbaseamount) record.extreme_supplierbaseamount = Number(parseFloat(e.data.extreme_supplierbaseamount).toFixed(4)); // Currency
          if (e.data.extreme_supplierdiscount) record.extreme_supplierdiscount = e.data.extreme_supplierdiscount; // Decimal
          if (e.data.extreme_margin) record.extreme_margin = e.data.extreme_margin; // Decimal
          if (e.data.priceperunit) record.priceperunit = e.data.priceperunit; // Decimal
          if (e.data.baseamount) record.baseamount = e.data.baseamount; // Decimal
          if (e.data.extreme_discount) record.extreme_discount = e.data.extreme_discount; // Decimal
          if (e.data.manualdiscountamount) record.manualdiscountamount = Number(parseFloat(e.data.manualdiscountamount).toFixed(4)); // Currency
          if (e.data.extreme_pricewithdiscount) record.extreme_pricewithdiscount = e.data.extreme_pricewithdiscount; // Decimal
          if (e.data.extreme_fullpricewithdiscount) record.extreme_fullpricewithdiscount = e.data.extreme_fullpricewithdiscount; // Decimal
          if (e.data.extreme_tax) record.extreme_tax = e.data.extreme_tax; // Decimal
          if (e.data.tax) record.tax = Number(parseFloat(e.data.tax).toFixed(4)); // Currency
          if (e.data.extreme_pd) record.extreme_pd = e.data.extreme_pd; // Decimal
          if (e.data.extreme_fullpd) record.extreme_fullpd = e.data.extreme_fullpd; // Decimal
          if (e.data.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.data.extreme_pricelist})`; // Lookup

          isAddingSet ? record.extreme_isparentitem = true : record.extreme_isparentitem = false;

          if (e.data.productid) {
            if (typeof (e.data.productid) === 'number') {
              record.extreme_customproductid = productsStore._array.find((item) => item.id === e.data.productid).name;
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
              record["uomid@odata.bind"] = `/uoms(${e.data.uomid})`; // Lookup UNIT
            }
          }; // Lookup / Custom Text


          console.log('RECORD AFTER SET PROPERTIES:');
          console.log(record);

          await Xrm.WebApi.createRecord("quotedetail", record).then(
            async function success(result) {
              var newId = result.id;
              if (quoteLinesData._array.length > 0) {
                console.log(dataGrid.getDataSource());
                console.log(quoteLinesData._array);
                console.log(quoteLinesData._array[quoteLinesData._array.length - 1]);
                console.log(quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid);
                quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid = newId;

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

                console.log(quoteLinesData._array);

                await Xrm.WebApi.updateRecord("quotedetail", `${newId}`, { sequencenumber: quoteLinesData._array.length });
                quoteLinesData._array[quoteLinesData._array.length - 1].sequencenumber = quoteLinesData._array.length;
                quoteLinesData._array[quoteLinesData._array.length - 1].extreme_parentquoteline = null;
                quoteLinesData._array[quoteLinesData._array.length - 1].extreme_isparentitem = isAddingSet;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].baseamount) quoteLinesData._array[quoteLinesData._array.length - 1].baseamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extendedamount) quoteLinesData._array[quoteLinesData._array.length - 1].extendedamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpd) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpd = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpricewithdiscount) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpricewithdiscount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].manualdiscountamount) quoteLinesData._array[quoteLinesData._array.length - 1].manualdiscountamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_supplierbaseamount) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_supplierbaseamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].tax) quoteLinesData._array[quoteLinesData._array.length - 1].tax = 0;
                console.log(quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid);
                console.log(quoteLinesData._array[quoteLinesData._array.length - 1].extreme_parentquoteline);
                console.log(quoteLinesData._array[quoteLinesData._array.length - 1].extreme_isparentitem);

                await Xrm.WebApi.updateRecord("quotedetail", `${newId}`, { extendedamount: Number(parseFloat(e.data.extendedamount).toFixed(4)) });

                await Xrm.WebApi.updateRecord("quotedetail", `${newId}`, { baseamount: Number(parseFloat(e.data.baseamount).toFixed(4)) });

                await getQuoteProducts(quoteIdForm);
                await getPriceLists();
                dataGrid.refresh();

              }
              else {
                console.log('quoteLinesData._array is empty');
              }

              isAddingSet = null;

              Xrm.Utility.closeProgressIndicator();
            },
            function (error) {
              console.log(error.message);
            }
          );

          formContext.data.refresh(true);

        },
        onRowInserted: async (e) => {
          console.log('RowInserted');
          console.log(e);

          await getQuoteProducts(quoteIdForm);
          dataGrid.refresh();
        },
        onRowUpdating: async (e) => {
          console.log('RowUpdating');
          console.log(e);

          var record = {};
          if (e.newData.productid) record["productid@odata.bind"] = `/products(${e.newData.productid})`; // Lookup
          if (e.newData.quotedetailname) record.quotedetailname = e.newData.quotedetailname; // Text
          if (e.newData.extreme_productdescription) record.extreme_productdescription = e.newData.extreme_productdescription; // Text
          if (e.newData.extreme_pricelistpriceperunit) record.extreme_pricelistpriceperunit = e.newData.extreme_pricelistpriceperunit; // Decimal
          if (e.newData.extreme_pricelistcurrency) record.extreme_pricelistcurrency = e.newData.extreme_pricelistcurrency; // Text
          if (e.newData.extreme_supplierpriceperunit) record.extreme_supplierpriceperunit = Number(parseFloat(e.newData.extreme_supplierpriceperunit).toFixed(4)); // Currency
          if (e.newData.quantity) record.quantity = e.newData.quantity; // Decimal
          if (e.newData.extreme_supplierbaseamount) record.extreme_supplierbaseamount = Number(parseFloat(e.newData.extreme_supplierbaseamount).toFixed(4)); // Currency
          if (e.newData.extreme_supplierdiscount) record.extreme_supplierdiscount = e.newData.extreme_supplierdiscount; // Decimal
          if (e.newData.extreme_margin) record.extreme_margin = e.newData.extreme_margin; // Decimal
          if (e.newData.priceperunit) record.priceperunit = e.newData.priceperunit; // Decimal
          if (e.newData.baseamount) record.baseamount = e.newData.baseamount; // Decimal
          if (e.newData.extreme_discount) record.extreme_discount = e.newData.extreme_discount; // Decimal
          if (e.newData.manualdiscountamount) record.manualdiscountamount = Number(parseFloat(e.newData.manualdiscountamount).toFixed(4)); // Currency
          if (e.newData.extreme_pricewithdiscount) record.extreme_pricewithdiscount = e.newData.extreme_pricewithdiscount; // Decimal
          if (e.newData.extreme_fullpricewithdiscount) record.extreme_fullpricewithdiscount = e.newData.extreme_fullpricewithdiscount; // Decimal
          if (e.newData.extreme_tax) record.extreme_tax = e.newData.extreme_tax; // Decimal
          if (e.newData.tax) record.tax = Number(parseFloat(e.newData.tax).toFixed(4)); // Currency
          if (e.newData.extreme_pd) record.extreme_pd = e.newData.extreme_pd; // Decimal
          if (e.newData.extreme_fullpd) record.extreme_fullpd = e.newData.extreme_fullpd; // Decimal
          if (e.newData.extendedamount) record.extendedamount = e.newData.extendedamount; // New total amount
          if (e.newData.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.newData.extreme_pricelist})`; // Lookup

          if (!typeof (e.oldData.productid) === 'number') {
            if (e.newData.uomid) record["uomid@odata.bind"] = `/uoms(${e.newData.uomid})`; // Lookup
          }

          await Xrm.WebApi.updateRecord("quotedetail", `${e.key}`, record).then(
            async function success(result) {
              var updatedId = result.id;
              console.log(updatedId);
              // await getQuoteProducts(quoteIdForm);
              // dataGrid.refresh();
            },
            function (error) {
              console.log(error.message);
            }
          );

          formContext.data.refresh(true);

        },
        onRowUpdated(e) {
          console.log('RowUpdated');
          console.log(e);
        },
        onRowRemoving: async (e) => {
          console.log('RowRemoving');
          console.log(e);

          Xrm.Utility.showProgressIndicator('Deleting... Please wait...');

          try {
            // Delete the main quotedetail record
            await Xrm.WebApi.deleteRecord("quotedetail", `${e.key}`);
            console.log('Main record deleted');

            // Check if the item is a parent item
            if (e.data.extreme_isparentitem === true) {
              console.log("CHILD UPDATED WITH PARENT QUOTE LINE");

              // Filter and delete child items
              const childItems = quoteLinesData._array.filter((item) => item.extreme_parentquoteline === e.key);
              for (const childItem of childItems) {
                await Xrm.WebApi.deleteRecord("quotedetail", `${childItem.quotedetailid}`);
                console.log(`Child record ${childItem.quotedetailid} deleted`);
              }
            }

            // Refresh the form and data grid
            formContext.data.refresh(true);
            await getQuoteProducts(quoteIdForm);
            dataGrid.refresh();

            Xrm.Utility.closeProgressIndicator();
          } catch (error) {
            console.log(error.message);
          }
        },
        onRowRemoved: (e) => {
          console.log('RowRemoved');
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


      // function for changing exchange rates
      const exchangeRateChange = async (currency, newValue) => {
        await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=quotedetailid,extreme_tax,extreme_discount,extreme_margin,extreme_pricelistpriceperunit,quantity&$filter=(_quoteid_value eq ${quoteIdForm} and extreme_pricelistcurrency eq '${currenciesArray.find((item) => item.isocurrencycode === currency).currencysymbol}')`).then(
          async function success(results) {
            console.log(results);
            for (var i = 0; i < results.entities.length; i++) {
              var result = results.entities[i];
              // Columns
              var quotedetailid = result["quotedetailid"]; // Guid
              var quantity = result["quantity"]; // Decimal
              var extreme_pricelistpriceperunit = result["extreme_pricelistpriceperunit"]; // Decimal
              var extreme_margin = result["extreme_margin"]; // Decimal
              var extreme_discount = result["extreme_discount"]; // Decimal
              var extreme_tax = result["extreme_tax"]; // Decimal

              var pricePerUnit = (extreme_pricelistpriceperunit * parseFloat(newValue)) * extreme_margin;
              var baseAmount = pricePerUnit * quantity;
              var manualDiscountAmount = baseAmount - (baseAmount * (1 - extreme_discount / 100));
              var fullPriceWithDiscount = pricePerUnit * (1 - extreme_discount / 100) * quantity;
              var tax = ((pricePerUnit * (1 - extreme_discount / 100)) * quantity * (1 + extreme_tax / 100)) - (pricePerUnit * (1 - extreme_discount / 100) * quantity);
              var extendedAmount = tax + (pricePerUnit * (1 - extreme_discount / 100) * quantity);

              await Xrm.WebApi.updateRecord("quotedetail", `${quotedetailid}`, {
                extreme_supplierpriceperunit: extreme_pricelistpriceperunit * parseFloat(newValue),
                extreme_supplierbaseamount: (extreme_pricelistpriceperunit * parseFloat(newValue)) * quantity,
                priceperunit: pricePerUnit,
                baseamount: baseAmount,
                manualdiscountamount: manualDiscountAmount,
                extreme_fullpricewithdiscount: fullPriceWithDiscount,
                tax: tax,
                extendedamount: extendedAmount
              });

              quoteLinesData.update(quotedetailid, {
                extreme_supplierpriceperunit: extreme_pricelistpriceperunit * parseFloat(newValue),
                extreme_supplierbaseamount: (extreme_pricelistpriceperunit * parseFloat(newValue)) * quantity,
                priceperunit: pricePerUnit,
                baseamount: baseAmount,
                manualdiscountamount: manualDiscountAmount,
                extreme_fullpricewithdiscount: fullPriceWithDiscount,
                tax: tax,
                extendedamount: extendedAmount
              });

              if (quoteLinesData._array.find((item) => item.quotedetailid === quotedetailid).extreme_parentquoteline) {
                console.log("CHILD UPDATED WITH PARENT QUOTE LINE");
                const parentQuoteLineGUID = quoteLinesData._array.find((item) => item.quotedetailid === quotedetailid).extreme_parentquoteline;

                let baseamount_sum = 0;
                let extendedamount_sum = 0;
                let extreme_fullpd_sum = 0;
                let extreme_fullpricewithdiscount_sum = 0;
                let manualdiscountamount_sum = 0;
                let extreme_supplierbaseamount_sum = 0;
                let tax_sum = 0;

                quoteLinesData._array.filter((item) => item.extreme_parentquoteline === parentQuoteLineGUID).forEach((e) => {
                  baseamount_sum += e.baseamount;
                  extendedamount_sum += e.extendedamount;
                  extreme_fullpd_sum += e.extreme_fullpd;
                  extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
                  manualdiscountamount_sum += e.manualdiscountamount;
                  extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
                  tax_sum += e.tax;
                });

                quoteLinesData.update(parentQuoteLineGUID, {
                  baseamount: baseamount_sum,
                  extendedamount: extendedamount_sum,
                  extreme_fullpd: extreme_fullpd_sum,
                  extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum,
                  manualdiscountamount: manualdiscountamount_sum,
                  extreme_supplierbaseamount: extreme_supplierbaseamount_sum,
                  tax: tax_sum
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
            console.log(error.message);
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

        Xrm.Utility.showProgressIndicator('');

        console.log('onAdd TRIGGERED!');
        console.log(e);

        let key = '';
        let values = {};

        if (e.fromData === 'root' && e.itemData.extreme_isparentitem === false) {
          console.log('from root to child, no parent item');

          console.log(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).quotedetailname);
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount += e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount += e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd += e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount += e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount += e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount += e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax += e.itemData.tax;

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
          console.log('from child to parent');

          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount -= e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount -= e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd -= e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount -= e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount -= e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount -= e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax -= e.itemData.tax;

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
          console.log('from child to another child');

          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount -= e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount -= e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd -= e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount -= e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount -= e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount -= e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax -= e.itemData.tax;

          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount += e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount += e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd += e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount += e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount += e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount += e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax += e.itemData.tax;

          key = e.itemData.quotedetailid;
          values = { extreme_parentquoteline: e.toData };

          await Xrm.WebApi.updateRecord("quotedetail", `${e.itemData.quotedetailid}`, { "extreme_ParentQuoteLine@odata.bind": `/quotedetails(${e.toData})` });

          quoteLinesData.update(key, values).then(() => {
            quoteLinesData.push([{
              type: 'update', key, data: values,
            }]);
          });

        }

        console.log(key);
        console.log(values);

        Xrm.Utility.closeProgressIndicator();

        // store.update(key, values).then(() => {
        //   store.push([{
        //     type: 'update', key, data: values,
        //   }]);
        // });
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

    });
  }


  // Select the gridContainer element
  let gridContainer;

  const wrControl = formContext.getControl('WebResource_quoteLines');
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
      console.log(result);
    },
    function (error) {
      console.log(error.message);
    }
  );
}