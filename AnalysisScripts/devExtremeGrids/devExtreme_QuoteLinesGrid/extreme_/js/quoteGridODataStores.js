const Xrm = parent.window.Xrm;
const formContext = Xrm.Page._ui._formContext;
const quoteId = Xrm.Page.data.entity.getId().slice(1, -1);

const quotedetailODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/quotedetails",
  key: "quotedetailid",
  keyType: "Guid",
  beforeSend: function (e) {
    if (e.method.toLowerCase() == "get") {
      e.headers = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Prefer: "odata.include-annotations=*",
      };
    }
    console.log(e);
    if (e.method === "PATCH" || e.method === "POST") {
      if (e.payload?.productid?._value || isGuid(e.payload?.productid)) {
        const productId = e.payload.productid._value || e.payload.productid;
        delete e.payload.productid; // remove old format
        e.payload["productid@odata.bind"] = `/products(${productId})`;
      }

      if (
        e.payload?._extreme_vatsetting_value?._value ||
        isGuid(e.payload?._extreme_vatsetting_value)
      ) {
        const vatSettingId =
          e.payload._extreme_vatsetting_value._value ||
          e.payload._extreme_vatsetting_value;
        delete e.payload._extreme_vatsetting_value;
        e.payload[
          "extreme_VATSetting@odata.bind"
        ] = `/extreme_vatsettings(${vatSettingId})`;
      }

      if (e.payload?._uomid_value?._value || isGuid(e.payload?._uomid_value)) {
        const uomId = e.payload._uomid_value._value || e.payload._uomid_value;
        delete e.payload._uomid_value;
        e.payload["uomid@odata.bind"] = `/uoms(${uomId})`;
      }

      if (
        e.payload?._extreme_pricelist_value?._value ||
        isGuid(e.payload?._extreme_pricelist_value)
      ) {
        const priceListId =
          e.payload._extreme_pricelist_value._value ||
          e.payload._extreme_pricelist_value;
        delete e.payload._extreme_pricelist_value;
        e.payload[
          "extreme_pricelist@odata.bind"
        ] = `/pricelevels(${priceListId})`;
      }

      if (
        e.payload?._extreme_area_value?._value ||
        isGuid(e.payload?._extreme_area_value)
      ) {
        const areaId =
          e.payload._extreme_area_value._value || e.payload._extreme_area_value;
        delete e.payload._extreme_area_value;
        e.payload["extreme_Area@odata.bind"] = `/extreme_areas(${areaId})`;
      }

      if (
        e.payload?._extreme_technology_value?._value ||
        isGuid(e.payload?._extreme_technology_value)
      ) {
        const techId =
          e.payload._extreme_technology_value._value ||
          e.payload._extreme_technology_value;
        delete e.payload._extreme_technology_value;
        e.payload[
          "extreme_Technology@odata.bind"
        ] = `/extreme_technologies(${techId})`;
      }

      if (
        e.payload?._extreme_vendorsupplier_value?._value ||
        isGuid(e.payload?._extreme_vendorsupplier_value)
      ) {
        const accId =
          e.payload._extreme_vendorsupplier_value._value ||
          e.payload._extreme_vendorsupplier_value;
        delete e.payload._extreme_vendorsupplier_value;
        e.payload["extreme_VendorSupplier@odata.bind"] = `/accounts(${accId})`;
      }

      if (
        e.payload?._extreme_parentquoteline_value?._value ||
        isGuid(e.payload?._extreme_parentquoteline_value)
      ) {
        const parentQuoteLineId =
          e.payload._extreme_parentquoteline_value._value ||
          e.payload._extreme_parentquoteline_value;
        delete e.payload._extreme_parentquoteline_value;
        e.payload[
          "extreme_ParentQuoteLine@odata.bind"
        ] = `/quotedetails(${parentQuoteLineId})`;
      } else if (e.payload.hasOwnProperty("_extreme_parentquoteline_value")) {
        if (e.payload._extreme_parentquoteline_value == null) {
          delete e.payload._extreme_parentquoteline_value;
          e.payload["extreme_ParentQuoteLine@odata.bind"] = null;
        }
      }

      e.payload["quoteid@odata.bind"] = `/quotes(${quoteId})`;
    }
  },
});
const quoteDetailsDataSource = {
  store: quotedetailODataStore,
  filter: ["_quoteid_value", "=", quoteId],
  select: [
    "_extreme_vatsetting_value",
    "_extreme_vatgroup_value",
    "extreme_producttype",
    "extreme_createasset",
    "_extreme_area_value",
    "_extreme_technology_value",
    "_extreme_vendorsupplier_value",
    "manualdiscountamount",
    "extreme_isparentitem",
    "_extreme_parentquoteline_value",
    "extreme_supplierbaseamount",
    "extreme_supplierpriceperunit",
    "quotedetailid",
    "baseamount",
    "extreme_tax",
    "extendedamount",
    "extreme_discount",
    "_productid_value",
    "_uomid_value",
    "extreme_fullpd",
    "extreme_fullprice",
    "extreme_fullpricewithdiscount",
    "extreme_fullpricerounded",
    "extreme_margin",
    "extreme_customproductname",
    "extreme_pd",
    "_extreme_pricelist_value",
    "extreme_pricelistcurrency",
    "priceperunit",
    "extreme_pricelistpriceperunit",
    "extreme_pricewithdiscount",
    "extreme_customproductid",
    "quantity",
    "extreme_supplierdiscount",
    "tax",
    "isproductoverridden",
    "extreme_productdescription",
    "extreme_uomid",
    "sequencenumber",
    "_quoteid_value",
  ],
  expand: ["productid($select=productnumber)"],
};

const productsODataStore = new DevExpress.data.ODataStore({
  // type: "odata",
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/products",
  key: "productid",
  keyType: "Guid",
  beforeSend: function (e) {
    if (e.method.toLowerCase() == "get") {
      e.headers = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Prefer: "odata.include-annotations=*",
      };
    }
  },
});
const productsDataSource = {
  store: productsODataStore,
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
  paginate: true,
  pageSize: 20,
};

const productPriceLevelODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/productpricelevels",
  key: "productpricelevelid",
  keyType: "Guid",
  beforeSend: function (e) {
    if (e.method.toLowerCase() == "get") {
      e.headers = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Prefer: "odata.include-annotations=*",
      };
    }
  },
});
// const customPriceLevelStore = new DevExpress.data.CustomStore({
//   byKey: (key) => productPriceLevelODataStore.byKey(key),
//   load: (options) => {
//     return productPriceLevelODataStore
//       .load({
//         select: [
//           "amount",
//           "_transactioncurrencyid_value",
//           "_pricelevelid_value",
//           "_productid_value",
//         ],
//         expand: ["pricelevelid($select=enddate,name,statuscode)"],
//         filter: productId == null ? null : ["_productid_value", "=", productId],
//       })
//       .then((response) => {
//         console.log(response);
//         const flatData = response.map((item) => ({
//           ...item,
//           ...item.pricelevelid,
//           pricelevelid: null,
//         }));
//         console.log(flatData);

//         return flatData;
//       });
//   },
// });
const productPriceLevelDataSource = (productId = null) => {
  return new DevExpress.data.CustomStore({
    byKey: (key) => productPriceLevelODataStore.byKey(key),
    load: (options) => {
      return productPriceLevelODataStore
        .load({
          select: [
            "amount",
            "_transactioncurrencyid_value",
            "_pricelevelid_value",
            "_productid_value",
          ],
          expand: ["pricelevelid($select=enddate,name,statuscode)"],
          filter:
            productId == null ? null : ["_productid_value", "=", productId],
        })
        .then((response) => {
          console.log(response);
          const flatData = response.map((item) => ({
            ...item,
            ...item.pricelevelid,
            pricelevelid: null,
          }));
          console.log(flatData);

          return flatData;
        });
    },
  });
};

const uomODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: false,
  url: Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/uoms",
  key: "uomid",
  keyType: "Guid",
  beforeSend: function (e) {
    if (e.method.toLowerCase() == "get") {
      e.headers = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Prefer: "odata.include-annotations=*",
      };
    }
  },
});
const uomDataSource = { store: uomODataStore, select: ["uomid", "name"] };

const transactionCurrencyODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/transactioncurrencies",
  key: "transactioncurrencyid",
  keyType: "Guid",
  select: [
    "transactioncurrencyid",
    "isocurrencycode",
    "currencyname",
    "currencyprecision",
    "currencysymbol",
  ],
});

const extremeAreaODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/extreme_areas",
  key: "extreme_areaid",
  keyType: "Guid",
  beforeSend: function (e) {
    if (e.method.toLowerCase() == "get") {
      e.headers = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Prefer: "odata.include-annotations=*",
      };
    }
  },
});
const extremeAreaDataSource = {
  store: extremeAreaODataStore,
  select: ["extreme_areaid", "extreme_name"],
};

const extremeTechnologyODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/extreme_technologies",
  key: "extreme_technologyid",
  keyType: "Guid",
  beforeSend: function (e) {
    if (e.method.toLowerCase() == "get") {
      e.headers = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Prefer: "odata.include-annotations=*",
      };
    }
  },
});
const extremeTechnologyDataSource = {
  store: extremeTechnologyODataStore,
  select: ["extreme_technologyid", "extreme_name"],
};

const vatSettingODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/extreme_vatsettings",
  key: "extreme_vatsettingid",
  keyType: "Guid",
  beforeSend: function (e) {
    if (e.method.toLowerCase() == "get") {
      e.headers = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Prefer: "odata.include-annotations=*",
      };
    }
  },
});
const customVatSettingStore = (productType = null) => {
  return new DevExpress.data.CustomStore({
    byKey: (key) => vatSettingODataStore.byKey(key),
    load: (options) => {
      return vatSettingODataStore
        .load({
          select: ["extreme_vatsettingid", "extreme_producttype"],
          expand: [
            "extreme_VATGroup($select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat)",
          ],
          filter:
            productType == null
              ? null
              : ["extreme_producttype", "=", productType],
        })
        .then((response) => {
          console.log(response);
          const flatData = response.map((item) => ({
            ...item,
            ...item.extreme_VATGroup,
            extreme_VATGroup: null,
          }));
          console.log(flatData);

          return flatData;
        });
    },
  });
};
// const vatSettingDataSource = {
//   store: customVatSettingsStore,
//   select: ["extreme_vatsettingid", "extreme_producttype"],
//   expand: [
//     "extreme_VATGroup($select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat)",
//   ],
// };

const vendorSupplierODataStore = new DevExpress.data.ODataStore({
  // type: "odata",
  version: 4,
  filterToLower: false,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/accounts",
  key: "accountid",
  keyType: "Guid",
  beforeSend: function (e) {
    if (e.method.toLowerCase() == "get") {
      e.headers = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Prefer: "odata.include-annotations=*",
      };
    }
  },
});
const vendorSupplierDataSource = {
  store: vendorSupplierODataStore,
  select: [
    "accountid",
    "name",
    "extreme_paname30characters",
    "extreme_relationshiptypeext",
  ],
};
