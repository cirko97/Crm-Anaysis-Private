const Xrm = parent.window.Xrm;
const quoteId = Xrm.Page.data.entity.getId().slice(1, -1);

const quotedetailODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: true,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/quotedetails",
  key: "quotedetailid",
  keyType: "Guid",
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
});

const productPriceLevelODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: true,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/productpricelevels",
  key: "productpricelevelid",
  keyType: "Guid",
  select: [
    "amount",
    "_transactioncurrencyid_value",
    "_pricelevelid_value",
    "_productid_value",
  ],
  expand: ["pricelevelid($select=enddate,statuscode)"],
});

const uomODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: true,
  url: Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/uoms",
  key: "uomid",
  keyType: "Guid",
  select: ["uomid", "name"],
});

const transactionCurrencyODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: true,
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
  filterToLower: true,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/extreme_areas",
  key: "extreme_areaid",
  keyType: "Guid",
  select: ["extreme_areaid", "extreme_name"],
});

const extremeTechnologyODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: true,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/extreme_technologies",
  key: "extreme_technologyid",
  keyType: "Guid",
  select: ["extreme_technologyid", "extreme_name"],
});

const vatSettingODataStore = new DevExpress.data.ODataStore({
  version: 4,
  filterToLower: true,
  url:
    Xrm.Utility.getGlobalContext().getClientUrl() +
    "/api/data/v9.2/extreme_vatsettings",
  key: "extreme_vatsettingid",
  keyType: "Guid",
  select: ["extreme_vatsettingid", "extreme_producttype"],
  expand: [
    "extreme_VATGroup($select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat)",
  ],
});

const vendorSupplierODataStore = new DevExpress.data.ODataStore({
  // type: "odata",
  version: 4,
  filterToLower: true,
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
  filterToLower: true,
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
