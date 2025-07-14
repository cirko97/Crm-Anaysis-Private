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