$(async function () {
  $("#treeList").dxTreeList({
    // Configuration goes here
    dataSource: quotedetailODataStore,
    rootValue: -1,
    keyExpr: "quotedetailid",
    parentIdExpr: "_extreme_parentquoteline_value",
    autoExpandAll: true,
    editing: {
      mode: "cell",
      allowUpdating: true,
      allowDeleting: true,
      allowAdding: true,
    },
    columns: [
      "extreme_customproductname",
      "quantity",
      "extreme_uomid",
      "extreme_supplierpriceperunit",
      "extreme_supplierbaseamount",
      "extreme_margin",
      "priceperunit",
      "baseamount",
      "extreme_discount",
      "extreme_fullpricewithdiscount",
      "_extreme_vatsetting_value",
      "extendedamount",
    ],
    allowColumnReordering: true,
    allowColumnResizing: true,
    columnAutoWidth: true,
    filterRow: { visible: true },
    searchPanel: { visible: true },
  });
});
