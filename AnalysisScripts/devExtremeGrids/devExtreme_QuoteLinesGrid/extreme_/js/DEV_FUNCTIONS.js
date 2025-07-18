// Data from DV - Xrm Web Api
async function getQuoteProducts(quoteId) {
  quoteLinesArray = [];
  customProductsArray = [];
  customUnitsArray = [];
  filterForPriceListsQuery = "";

  await Xrm.WebApi.retrieveMultipleRecords(
    "quotedetail",
    `?$select=_extreme_vatsetting_value,_extreme_vatgroup_value,extreme_producttype,extreme_createasset,_extreme_area_value,_extreme_technology_value,_extreme_vendorsupplier_value,manualdiscountamount,extreme_isparentitem,_extreme_parentquoteline_value,extreme_supplierbaseamount,extreme_supplierpriceperunit,quotedetailid,baseamount,extreme_tax,extendedamount,extreme_discount,_productid_value,_uomid_value,extreme_fullpd,extreme_fullprice,extreme_fullpricewithdiscount,extreme_fullpricerounded,extreme_margin,extreme_customproductname,extreme_pd,_extreme_pricelist_value,extreme_pricelistcurrency,priceperunit,extreme_pricelistpriceperunit,extreme_pricewithdiscount,extreme_customproductid,quantity,extreme_supplierdiscount,tax,isproductoverridden,extreme_productdescription,extreme_uomid,sequencenumber&$expand=productid($select=productnumber)&$filter=_quoteid_value eq ${quoteId}`
  ).then(
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
          await Xrm.WebApi.retrieveMultipleRecords(
            "quotedetail",
            `?$select=baseamount,extendedamount,extreme_fullpd,extreme_fullpricewithdiscount,manualdiscountamount,extreme_supplierbaseamount,tax&$filter=_extreme_parentquoteline_value eq ${quotedetailid}`
          ).then(
            function success(results) {
              // console.log(results);
              for (var i = 0; i < results.entities.length; i++) {
                var result = results.entities[i];
                // Columns
                var quotedetailid = result["quotedetailid"]; // Guid
                var baseamount = result["baseamount"]; // Currency
                var extendedamount = result["extendedamount"]; // Currency
                var extreme_fullpd = result["extreme_fullpd"]; // Decimal
                var extreme_fullpd_formatted =
                  result[
                    "extreme_fullpd@OData.Community.Display.V1.FormattedValue"
                  ];
                var extreme_fullpricewithdiscount =
                  result["extreme_fullpricewithdiscount"]; // Decimal
                var extreme_fullpricewithdiscount_formatted =
                  result[
                    "extreme_fullpricewithdiscount@OData.Community.Display.V1.FormattedValue"
                  ];
                var manualdiscountamount = result["manualdiscountamount"]; // Currency
                var extreme_supplierbaseamount =
                  result["extreme_supplierbaseamount"]; // Decimal
                var extreme_supplierbaseamount_formatted =
                  result[
                    "extreme_supplierbaseamount@OData.Community.Display.V1.FormattedValue"
                  ];
                var tax = result["tax"]; // Currency

                baseamount_sum += baseamount;
                extendedamount_sum += extendedamount;
                extreme_fullpd_sum += extreme_fullpd;
                extreme_fullpricewithdiscount_sum +=
                  extreme_fullpricewithdiscount;
                manualdiscountamount_sum += manualdiscountamount;
                extreme_supplierbaseamount_sum += extreme_supplierbaseamount;
                tax_sum += tax;
              }

              avarageDiscountPercent =
                ((baseamount_sum - extreme_fullpricewithdiscount_sum) /
                  baseamount_sum) *
                100;
            },
            function (error) {
              Xrm.Navigation.openErrorDialog({
                details: error,
                errorCode: 400,
                message: error.message,
              });
            }
          );
        }

        // Columns
        var baseamount = result["baseamount"]; // Currency
        var extreme_discount = result["extreme_discount"]; // Decimal
        var extreme_discount_formatted =
          result["extreme_discount@OData.Community.Display.V1.FormattedValue"];
        var productid = result["_productid_value"]; // Lookup
        var productid_formatted =
          result["_productid_value@OData.Community.Display.V1.FormattedValue"];
        var productid_lookuplogicalname =
          result["_productid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
        var extreme_fullpd = result["extreme_fullpd"]; // Decimal
        var extreme_fullpd_formatted =
          result["extreme_fullpd@OData.Community.Display.V1.FormattedValue"];
        var extreme_fullprice = result["extreme_fullprice"]; // Decimal
        var extreme_fullprice_formatted =
          result["extreme_fullprice@OData.Community.Display.V1.FormattedValue"];
        var extreme_fullpricewithdiscount =
          result["extreme_fullpricewithdiscount"]; // Decimal
        var extreme_fullpricewithdiscount_formatted =
          result[
            "extreme_fullpricewithdiscount@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_fullpricerounded = result["extreme_fullpricerounded"]; // Decimal
        var extreme_fullpricerounded_formatted =
          result[
            "extreme_fullpricerounded@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_margin = result["extreme_margin"]; // Decimal
        var extreme_margin_formatted =
          result["extreme_margin@OData.Community.Display.V1.FormattedValue"];
        var extreme_customproductname = result["extreme_customproductname"]; // Text
        var extreme_pd = result["extreme_pd"]; // Decimal
        var extreme_pd_formatted =
          result["extreme_pd@OData.Community.Display.V1.FormattedValue"];
        var extreme_pricelist = result["_extreme_pricelist_value"]; // Lookup
        var extreme_pricelist_formatted =
          result[
            "_extreme_pricelist_value@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_pricelist_lookuplogicalname =
          result[
            "_extreme_pricelist_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];
        var extreme_pricelistcurrency = result["extreme_pricelistcurrency"]; // Text
        var priceperunit = result["priceperunit"]; // Currency
        var extreme_pricelistpriceperunit =
          result["extreme_pricelistpriceperunit"]; // Decimal
        var extreme_pricelistpriceperunit_formatted =
          result[
            "extreme_pricelistpriceperunit@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_pricewithdiscount = result["extreme_pricewithdiscount"]; // Decimal
        var extreme_pricewithdiscount_formatted =
          result[
            "extreme_pricewithdiscount@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_customproductid = result["extreme_customproductid"]; // Text
        var quantity = result["quantity"]; // Decimal
        var quantity_formatted =
          result["quantity@OData.Community.Display.V1.FormattedValue"];
        var extreme_supplierdiscount = result["extreme_supplierdiscount"]; // Decimal
        var extreme_supplierdiscount_formatted =
          result[
            "extreme_supplierdiscount@OData.Community.Display.V1.FormattedValue"
          ];
        var tax = result["tax"]; // Currency
        var isproductoverridden = result["isproductoverridden"]; // Boolean
        var isproductoverridden_formatted =
          result[
            "isproductoverridden@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_productdescription = result["extreme_productdescription"]; // Multiline Text
        var uomid = result["_uomid_value"]; // Lookup
        var uomid_formatted =
          result["_uomid_value@OData.Community.Display.V1.FormattedValue"];
        var uomid_lookuplogicalname =
          result["_uomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
        var extreme_uomid = result["extreme_uomid"]; // Text
        var sequencenumber = result["sequencenumber"]; // Whole Number
        var extendedamount = result["extendedamount"]; // Currency
        var extreme_tax = result["extreme_tax"]; // Decimal
        var extreme_tax_formatted =
          result["extreme_tax@OData.Community.Display.V1.FormattedValue"];
        var manualdiscountamount = result["manualdiscountamount"]; // Currency
        var extreme_supplierbaseamount = result["extreme_supplierbaseamount"]; // Decimal
        var extreme_supplierbaseamount_formatted =
          result[
            "extreme_supplierbaseamount@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_supplierpriceperunit =
          result["extreme_supplierpriceperunit"]; // Decimal
        var extreme_supplierpriceperunit_formatted =
          result[
            "extreme_supplierpriceperunit@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_isparentitem_formatted =
          result[
            "extreme_isparentitem@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_parentquoteline = result["_extreme_parentquoteline_value"]; // Lookup
        var extreme_parentquoteline_formatted =
          result[
            "_extreme_parentquoteline_value@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_parentquoteline_lookuplogicalname =
          result[
            "_extreme_parentquoteline_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];
        var extreme_area = result["_extreme_area_value"]; // Lookup
        var extreme_area_formatted =
          result[
            "_extreme_area_value@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_area_lookuplogicalname =
          result[
            "_extreme_area_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];
        var extreme_technology = result["_extreme_technology_value"]; // Lookup
        var extreme_technology_formatted =
          result[
            "_extreme_technology_value@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_technology_lookuplogicalname =
          result[
            "_extreme_technology_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];
        var extreme_vendorsupplier = result["_extreme_vendorsupplier_value"]; // Lookup
        var extreme_vendorsupplier_formatted =
          result[
            "_extreme_vendorsupplier_value@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_vendorsupplier_lookuplogicalname =
          result[
            "_extreme_vendorsupplier_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];
        var extreme_createasset = result["extreme_createasset"]; // Boolean
        var extreme_vatgroup = result["_extreme_vatgroup_value"]; // Lookup
        var extreme_vatgroup_formatted =
          result[
            "_extreme_vatgroup_value@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_vatgroup_lookuplogicalname =
          result[
            "_extreme_vatgroup_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];
        var extreme_vatsetting = result["_extreme_vatsetting_value"]; // Lookup
        var extreme_vatsetting_formatted =
          result[
            "_extreme_vatsetting_value@OData.Community.Display.V1.FormattedValue"
          ];
        var extreme_vatsetting_lookuplogicalname =
          result[
            "_extreme_vatsetting_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];
        var extreme_producttype = result["extreme_producttype"]; // Choice

        if (
          result.hasOwnProperty("productid") &&
          result["productid"] !== null
        ) {
          var productid_productnumber = result["productid"]["productnumber"]; // Text
        }

        let newCustomIdForUnit = 0;
        if (
          !uomid &&
          extreme_uomid &&
          !unitsArray.find((item) => item.name === extreme_uomid)
        ) {
          newCustomIdForUnit = newIdForCustomUnits++;
        }

        let varForUomid = null;
        if (uomid) {
          varForUomid = uomid;
        } else if (unitsArray.find((item) => item.name === extreme_uomid)) {
          varForUomid = unitsArray.find(
            (item) => item.name === extreme_uomid
          ).id;
        } else {
          varForUomid = newCustomIdForUnit;
        }

        quoteLinesArray.push({
          quotedetailid: quotedetailid,
          productid: extreme_customproductid
            ? extreme_customproductid
            : productid,
          productnumber: extreme_customproductid
            ? extreme_customproductid
            : productid_productnumber,
          extreme_customproductid: extreme_customproductid,
          extreme_productdescription: extreme_productdescription,
          isproductoverridden: isproductoverridden,
          uomid: varForUomid,
          extreme_uomid: extreme_uomid,
          extreme_customproductname: extreme_customproductname,
          extreme_pricelistpriceperunit: extreme_pricelistpriceperunit,
          extreme_pricelistcurrency: extreme_pricelistcurrency,
          priceperunit: extreme_isparentitem === true ? "" : priceperunit,
          extreme_supplierbaseamount:
            extreme_isparentitem === true
              ? extreme_supplierbaseamount_sum.toFixed(2)
              : extreme_supplierbaseamount,
          extreme_supplierpriceperunit: extreme_supplierpriceperunit,
          quantity: quantity,
          baseamount:
            extreme_isparentitem === true
              ? baseamount_sum.toFixed(2)
              : baseamount,
          extreme_supplierdiscount: extreme_supplierdiscount,
          extreme_margin: extreme_margin,
          extreme_fullpricerounded: extreme_fullpricerounded,
          extreme_fullprice: extreme_fullprice,
          extreme_discount:
            extreme_isparentitem === true
              ? avarageDiscountPercent.toFixed(2)
              : extreme_discount,
          manualdiscountamount:
            extreme_isparentitem === true
              ? manualdiscountamount_sum.toFixed(2)
              : manualdiscountamount,
          extreme_pricewithdiscount: extreme_pricewithdiscount,
          extreme_fullpricewithdiscount:
            extreme_isparentitem === true
              ? extreme_fullpricewithdiscount_sum.toFixed(2)
              : extreme_fullpricewithdiscount,
          extreme_tax: extreme_tax,
          tax: extreme_isparentitem === true ? tax_sum.toFixed(2) : tax,
          extreme_pd: extreme_pd,
          extreme_fullpd:
            extreme_isparentitem === true
              ? extreme_fullpd_sum.toFixed(2)
              : extreme_fullpd,
          extendedamount:
            extreme_isparentitem === true
              ? extendedamount_sum.toFixed(2)
              : extendedamount,
          extreme_pricelist: extreme_pricelist,
          sequencenumber: sequencenumber,
          extreme_isparentitem: extreme_isparentitem,
          extreme_parentquoteline: extreme_parentquoteline,
          extreme_area: extreme_area,
          extreme_technology: extreme_technology,
          extreme_vendorsupplier: extreme_vendorsupplier,
          extreme_createasset: extreme_createasset,
          extreme_vatsetting: extreme_vatsetting,
          extreme_producttype: extreme_producttype,
        });

        if (formContext.getAttribute("revisionnumber").getValue() > 0) {
          quoteLinesArray
            .filter((item) => item.extreme_parentquoteline)
            .forEach(async (elm) => {
              if (
                !quoteLinesArray.find(
                  (item) => item.quotedetailid === elm.extreme_parentquoteline
                )
              ) {
                const nameOfParentQL = await Xrm.WebApi.retrieveRecord(
                  "quotedetail",
                  `${elm.extreme_parentquoteline}`,
                  "?$select=extreme_customproductname"
                );
                const currentQLParentId =
                  await Xrm.WebApi.retrieveMultipleRecords(
                    "quotedetail",
                    `?$select=quotedetailid&$filter=(extreme_customproductname eq '${nameOfParentQL.extreme_customproductname}' and _quoteid_value eq ${quoteIdForm})`
                  );

                var record = {};
                record[
                  "extreme_ParentQuoteLine@odata.bind"
                ] = `/quotedetails(${currentQLParentId.entities[0].quotedetailid})`; // Lookup
                await Xrm.WebApi.updateRecord(
                  "quotedetail",
                  `${elm.quotedetailid}`,
                  record
                );

                elm.extreme_parentquoteline =
                  currentQLParentId.entities[0].quotedetailid;
              }
            });
        }

        if (!productid) {
          customProductsArray.push({
            productid: extreme_customproductid,
            name: extreme_customproductid,
            productName: extreme_customproductname,
            productnumber: extreme_customproductid,
          });
        }

        if (
          !uomid &&
          extreme_uomid &&
          !unitsArray.find((item) => item.name === extreme_uomid)
        ) {
          customUnitsArray.push({
            id: newCustomIdForUnit,
            name: extreme_uomid,
          });
        }
      }

      // console.log('QuoteLinesWithGoodProductId');
      // console.log(quoteLinesArray.filter((item) => isGuid(item.productid)));

      const productIdsForFilter = new Set(
        quoteLinesArray
          .filter((item) => isGuid(item.productid))
          .map((item) => item.productid)
      );

      filterForPriceListsQuery = Array.from(productIdsForFilter)
        .map((id) => `productid/productid eq ${id}`)
        .join(" or ");

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
        message: error.message,
      });
    }
  );
}

async function getPriceLists() {
  priceListsArray = [];

  await Xrm.WebApi.retrieveMultipleRecords(
    "productpricelevel",
    `?$select=amount,_transactioncurrencyid_value,_pricelevelid_value,_productid_value&$expand=pricelevelid($select=enddate,statuscode)${
      filterForPriceListsQuery === ""
        ? ""
        : `&$filter=(${filterForPriceListsQuery})`
    }`
  ).then(
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
        var pricelevelid_formatted =
          result[
            "_pricelevelid_value@OData.Community.Display.V1.FormattedValue"
          ];
        var pricelevelid_lookuplogicalname =
          result[
            "_pricelevelid_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];
        var productid = result["_productid_value"]; // Lookup
        var productid_formatted =
          result["_productid_value@OData.Community.Display.V1.FormattedValue"];
        var productid_lookuplogicalname =
          result["_productid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
        var transactioncurrencyid = result["_transactioncurrencyid_value"]; // Lookup
        var transactioncurrencyid_formatted =
          result[
            "_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue"
          ];
        var transactioncurrencyid_lookuplogicalname =
          result[
            "_transactioncurrencyid_value@Microsoft.Dynamics.CRM.lookuplogicalname"
          ];

        // Many To One Relationships
        if (
          result.hasOwnProperty("pricelevelid") &&
          result["pricelevelid"] !== null
        ) {
          var pricelevelid_enddate = result["pricelevelid"]["enddate"]; // Date Time
          var pricelevelid_enddate_formatted =
            result["pricelevelid"][
              "enddate@OData.Community.Display.V1.FormattedValue"
            ];
          var pricelevelid_statuscode = result["pricelevelid"]["statuscode"]; // Status
          var pricelevelid_statuscode_formatted =
            result["pricelevelid"][
              "statuscode@OData.Community.Display.V1.FormattedValue"
            ];

          priceListsArray.push({
            id: pricelevelid,
            name: pricelevelid_formatted,
            amount: amount,
            amount_num: amount_num,
            currency_code: transactioncurrencyid_formatted,
            productid: productid,
            statuscode: pricelevelid_statuscode,
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
        message: error.message,
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
          id: uomid,
          name: name,
        });
      }
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message,
      });
    }
  );
}

async function getCurrencies() {
  currenciesArray = [];

  await Xrm.WebApi.retrieveMultipleRecords(
    "transactioncurrency",
    "?$select=transactioncurrencyid,isocurrencycode,currencyname,currencyprecision,currencysymbol"
  ).then(
    function success(results) {
      // console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var transactioncurrencyid = result["transactioncurrencyid"]; // Guid
        var isocurrencycode = result["isocurrencycode"]; // Text
        var currencyname = result["currencyname"]; // Text
        var currencyprecision = result["currencyprecision"]; // Whole Number
        var currencyprecision_formatted =
          result["currencyprecision@OData.Community.Display.V1.FormattedValue"];
        var currencysymbol = result["currencysymbol"]; // Text

        currenciesArray.push({
          transactioncurrencyid: transactioncurrencyid,
          isocurrencycode: isocurrencycode,
          currencyname: currencyname,
          currencyprecision: currencyprecision,
          currencyprecision_formatted: currencyprecision_formatted,
          currencysymbol: currencysymbol,
        });
      }
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message,
      });
    }
  );
}

// get areas
async function getAreas() {
  areasArray = [];

  await Xrm.WebApi.retrieveMultipleRecords(
    "extreme_area",
    "?$select=extreme_areaid,extreme_name"
  ).then(
    function success(results) {
      // console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var extreme_areaid = result["extreme_areaid"]; // Guid
        var extreme_name = result["extreme_name"]; // Text

        areasArray.push({
          id: extreme_areaid,
          name: extreme_name,
        });
      }
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message,
      });
    }
  );
}

async function getTechs() {
  techsArray = [];

  await Xrm.WebApi.retrieveMultipleRecords(
    "extreme_technology",
    "?$select=extreme_technologyid,extreme_name"
  ).then(
    function success(results) {
      // console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var extreme_technologyid = result["extreme_technologyid"]; // Guid
        var extreme_name = result["extreme_name"]; // Text

        techsArray.push({
          id: extreme_technologyid,
          name: extreme_name,
        });
      }
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message,
      });
    }
  );
}

async function getVatGroups() {
  vatSettingsArray = [];

  await Xrm.WebApi.retrieveMultipleRecords(
    "extreme_vatsetting",
    "?$select=extreme_vatsettingid,extreme_producttype&$expand=extreme_VATGroup($select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat)"
  ).then(
    function success(results) {
      // console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var extreme_vatsettingid = result["extreme_vatsettingid"]; // Guid
        var extreme_producttype = result["extreme_producttype"]; // Choice
        var extreme_producttype_formatted =
          result[
            "extreme_producttype@OData.Community.Display.V1.FormattedValue"
          ];

        // Many To One Relationships
        if (
          result.hasOwnProperty("extreme_VATGroup") &&
          result["extreme_VATGroup"] !== null
        ) {
          var extreme_VATGroup_extreme_vatgroupid =
            result["extreme_VATGroup"]["extreme_vatgroupid"]; // Guid
          var extreme_VATGroup_extreme_code =
            result["extreme_VATGroup"]["extreme_code"]; // Text
          var extreme_VATGroup_extreme_description =
            result["extreme_VATGroup"]["extreme_description"]; // Text
          var extreme_VATGroup_extreme_vat =
            result["extreme_VATGroup"]["extreme_vat"]; // Decimal
          var extreme_VATGroup_extreme_vat_formatted =
            result["extreme_VATGroup"][
              "extreme_vat@OData.Community.Display.V1.FormattedValue"
            ];

          vatSettingsArray.push({
            id: extreme_vatsettingid,
            idVatGroup: extreme_VATGroup_extreme_vatgroupid,
            name: extreme_VATGroup_extreme_description,
            code: extreme_VATGroup_extreme_code,
            vat: extreme_VATGroup_extreme_vat,
            varPercentFormat: extreme_VATGroup_extreme_vat + " %",
            productTypeCode: extreme_producttype,
          });
        }
      }
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message,
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

const vendorSupplierODataStore = new DevExpress.data.ODataStore({
  // type: "odata",
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/accounts",
  key: "accountid",
  keyType: "Guid",
  select: [
    "accountid",
    "name",
    "extreme_paname30characters",
    "extreme_relationshiptypeext",
  ],
});

const productsODataStore = new DevExpress.data.ODataStore({
  // type: "odata",
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/products",
  key: "productid",
  keyType: "Guid",
  select: [
    "productid",
    "name",
    "productnumber",
    "_defaultuomid_value",
    "_pricelevelid_value",
    "producttypecode",
    "extreme_isparent",
    "statecode",
  ],
});

const quoteLinesData = new DevExpress.data.ArrayStore({
  key: "quotedetailid",
  data: [
    ...new Map(
      quoteLinesArray.map((item) => [item.quotedetailid, item])
    ).values(),
  ],
});

const customProductsStore = new DevExpress.data.ArrayStore({
  key: "productid",
  data: customProductsArray,
});

var unitsStore = new DevExpress.data.ArrayStore({
  key: "id",
  data: unitsArray,
});
newIdForCustomUnits = 200001;
if (customUnitsArray.length > 0) {
  customUnitsArray.forEach((e) => {
    var newItem = {};
    newItem.id = newIdForCustomUnits++;
    newItem.name = e.name;
    unitsStore.insert(newItem);
  });
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
  TaxPercent,
}) => {
  const taxRate = TaxPercent / 100;
  const supplierBaseAmount = supplierPricePerUnit * quantity;

  // Calculate pricePerUnit if not provided
  if (pricePerUnit === null) {
    if (ROUNDING_PRICE_PER_UNIT_CONFIG === "true") {
      pricePerUnit = Math.ceil(margin * supplierPricePerUnit);
    } else {
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
  const supplierDiscountAmount =
    supplierPricePerUnit * (supplierDiscount / 100);
  const pricePerUnitWithSupplierDiscount =
    supplierPricePerUnit - supplierDiscountAmount;
  const customDiscountAmount = pricePerUnit * (discount / 100);
  const pricePerUnitWithCustomDiscount = pricePerUnit - customDiscountAmount;
  const pdPerUnit =
    pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;
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
    supplierPricePerUnit,
  };
};

// function for changing exchange rates
const exchangeRateChange = async (currency, newValue) => {
  await Xrm.WebApi.retrieveMultipleRecords(
    "quotedetail",
    `?$select=extreme_supplierdiscount,extreme_pd,extreme_fullpd,quotedetailid,extreme_tax,extreme_discount,extreme_margin,extreme_pricelistpriceperunit,quantity&$filter=(_quoteid_value eq ${quoteIdForm} and extreme_pricelistcurrency eq '${
      currenciesArray.find((item) => item.isocurrencycode === currency)
        .currencysymbol
    }')`
  ).then(
    async function success(results) {
      // console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var quotedetailid = result["quotedetailid"]; // Guid
        var quantity = result["quantity"]; // Decimal
        var extreme_pricelistpriceperunit =
          result["extreme_pricelistpriceperunit"]; // Decimal
        var extreme_margin = result["extreme_margin"]; // Decimal
        var extreme_discount = result["extreme_discount"]; // Decimal
        var extreme_supplierdiscount = result["extreme_supplierdiscount"]; // Decimal
        var extreme_tax = result["extreme_tax"]; // Decimal

        var pricePerUnit =
          extreme_pricelistpriceperunit * parseFloat(newValue) * extreme_margin;
        var baseAmount = pricePerUnit * quantity;
        var manualDiscountAmount =
          baseAmount - baseAmount * (1 - extreme_discount / 100);
        var fullPriceWithDiscount =
          pricePerUnit * (1 - extreme_discount / 100) * quantity;
        var tax =
          pricePerUnit *
            (1 - extreme_discount / 100) *
            quantity *
            (1 + extreme_tax / 100) -
          pricePerUnit * (1 - extreme_discount / 100) * quantity;
        var extendedAmount =
          tax + pricePerUnit * (1 - extreme_discount / 100) * quantity;

        const supplierDiscountAmount =
          extreme_pricelistpriceperunit *
          parseFloat(newValue) *
          (extreme_supplierdiscount / 100);
        const pricePerUnitWithSupplierDiscount =
          extreme_pricelistpriceperunit * parseFloat(newValue) -
          supplierDiscountAmount;
        const customDiscountAmount = pricePerUnit * (extreme_discount / 100);
        const pricePerUnitWithCustomDiscount =
          pricePerUnit - customDiscountAmount;
        const pdPerUnit =
          pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;
        var newPd = pdPerUnit;
        var newFullPd = newPd * quantity;

        await Xrm.WebApi.updateRecord("quotedetail", `${quotedetailid}`, {
          extreme_supplierpriceperunit:
            extreme_pricelistpriceperunit * parseFloat(newValue),
          extreme_supplierbaseamount:
            extreme_pricelistpriceperunit * parseFloat(newValue) * quantity,
          priceperunit: pricePerUnit,
          baseamount: baseAmount,
          manualdiscountamount: manualDiscountAmount,
          extreme_fullpricewithdiscount: fullPriceWithDiscount,
          tax: tax,
          extendedamount: extendedAmount,
          extreme_pd: newPd,
          extreme_fullpd: newFullPd,
        });

        quoteLinesData.update(quotedetailid, {
          extreme_supplierpriceperunit:
            extreme_pricelistpriceperunit * parseFloat(newValue),
          extreme_supplierbaseamount:
            extreme_pricelistpriceperunit * parseFloat(newValue) * quantity,
          priceperunit: pricePerUnit,
          baseamount: baseAmount,
          manualdiscountamount: manualDiscountAmount,
          extreme_fullpricewithdiscount: fullPriceWithDiscount,
          tax: tax,
          extendedamount: extendedAmount,
          extreme_pd: newPd,
          extreme_fullpd: newFullPd,
        });

        if (
          quoteLinesData._array.find(
            (item) => item.quotedetailid === quotedetailid
          ).extreme_parentquoteline
        ) {
          // // console.log("CHILD UPDATED WITH PARENT QUOTE LINE");
          const parentQuoteLineGUID = quoteLinesData._array.find(
            (item) => item.quotedetailid === quotedetailid
          ).extreme_parentquoteline;

          let baseamount_sum = 0;
          let extendedamount_sum = 0;
          let extreme_fullpd_sum = 0;
          let extreme_fullpricewithdiscount_sum = 0;
          let manualdiscountamount_sum = 0;
          let extreme_supplierbaseamount_sum = 0;
          let tax_sum = 0;
          let avarageDiscountPercent = 0;

          quoteLinesData._array
            .filter(
              (item) => item.extreme_parentquoteline === parentQuoteLineGUID
            )
            .forEach((e) => {
              baseamount_sum += e.baseamount;
              extendedamount_sum += e.extendedamount;
              extreme_fullpd_sum += e.extreme_fullpd;
              extreme_fullpricewithdiscount_sum +=
                e.extreme_fullpricewithdiscount;
              manualdiscountamount_sum += e.manualdiscountamount;
              extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
              tax_sum += e.tax;
            });

          avarageDiscountPercent =
            ((baseamount_sum - extreme_fullpricewithdiscount_sum) /
              baseamount_sum) *
            100;

          quoteLinesData.update(parentQuoteLineGUID, {
            baseamount: baseamount_sum.toFixed(2),
            extendedamount: extendedamount_sum.toFixed(2),
            extreme_fullpd: extreme_fullpd_sum.toFixed(2),
            extreme_fullpricewithdiscount:
              extreme_fullpricewithdiscount_sum.toFixed(2),
            manualdiscountamount: manualdiscountamount_sum.toFixed(2),
            extreme_supplierbaseamount:
              extreme_supplierbaseamount_sum.toFixed(2),
            tax: tax_sum.toFixed(2),
            extreme_discount: avarageDiscountPercent.toFixed(2),
          });

          dataGrid.getController("data").updateItems({
            changeType: "update",
            rowIndices: [dataGrid.getRowIndexByKey(parentQuoteLineGUID)],
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
        message: error.message,
      });
    }
  );

  formContext.data.refresh(true);
};

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





  // Check if string is guid or not
  function isGuid(value) {
    const guidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return guidPattern.test(value);
  }

  async function transactionCurrencyIdChanged() {
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
  }

  async function transactionCurrencyNotNull() {
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

          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, record);
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