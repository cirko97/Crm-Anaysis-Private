let heightAuto = true;
let jsonForConverting = {};
let treeList = null;
let isAddingSet = false;
let selectedDescriptionItem = null;
let gridContainer;
let currenciesArray = [];
const wrControl = Xrm.Page.getControl("WebResource_quoteLinesGrid2");

$(async function () {
  // Load currencies
  await Xrm.WebApi.retrieveMultipleRecords(
    "transactioncurrency",
    "?$select=transactioncurrencyid,isocurrencycode,currencyname,currencysymbol"
  ).then(
    function success(results) {
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        currenciesArray.push({
          transactioncurrencyid: result.transactioncurrencyid,
          isocurrencycode: result.isocurrencycode,
          currencyname: result.currencyname,
          currencysymbol: result.currencysymbol,
        });
      }
    },
    function (error) {
      console.error("Error loading currencies:", error);
    }
  );

  const exchangeRatesForm = await Xrm.WebApi.retrieveRecord(
    "quote",
    `${quoteId}`,
    "?$select=extreme_chfexchangerate,extreme_dollarexchangerate,extreme_euroexchangerate,exchangerate,extreme_gbpexchangerate,extreme_macedoniandenarexchangerate,extreme_rsdexchangerate"
  );
  await transactionCurrencyNotNull(exchangeRatesForm);

  treeList = $("#treeList")
    .dxTreeList({
      // Configuration goes here
      dataSource: quoteDetailsDataSource,
      showRowLines: true,
      showBorders: true,
      rootValue: null,
      keyExpr: "quotedetailid",
      parentIdExpr: "_extreme_parentquoteline_value",
      sort: { selector: "sequencenumber", desc: false },
      autoExpandAll: false,
      focusedRowEnabled: true,
      selection: {
        mode: "multiple",
      },
      scrolling: {
        mode: "standard",
        scrollByContent: true,
        scrollByThumb: true,
      },
      editing: {
        mode: "cell",
        allowUpdating: true,
        allowDeleting: true,
        allowAdding: true,
        useIcons: true,
      },
      rowDragging: {
        allowDropInsideItem: true,
        allowReordering: true,
        onDragChange(e) {
          const visibleRows = treeList.getVisibleRows();
          const sourceNode = treeList.getNodeByKey(e.itemData.quotedetailid);
          let targetNode = visibleRows[e.toIndex].node;

          while (targetNode && targetNode.data) {
            if (
              targetNode.data.quotedetailid === sourceNode.data.quotedetailid ||
              targetNode.data._extreme_parentquoteline_value
            ) {
              e.cancel = true;
              break;
            }
            targetNode = targetNode.parent;
          }
        },
        onReorder: async function (e) {
          Xrm.Utility.showProgressIndicator("");
          const store = quotedetailODataStore;
          const treeList = e.component;
          const visibleRows = treeList.getVisibleRows();
          const sourceData = e.itemData;
          const sourceId = sourceData.quotedetailid;

          let parentId = null;

          if (e.dropInsideItem) {
            // Dropped inside an item — make it a child
            parentId = visibleRows[e.toIndex].key;
          } else {
            // Dropped between items
            const toIndex = e.fromIndex > e.toIndex ? e.toIndex - 1 : e.toIndex;
            let targetData =
              toIndex >= 0 ? visibleRows[toIndex].node.data : null;

            if (
              targetData &&
              treeList.isRowExpanded(targetData.quotedetailid)
            ) {
              // Treat as child of expanded item
              parentId = targetData.quotedetailid;
            } else {
              // Stay at same parent level as target
              parentId = targetData?._extreme_parentquoteline_value || null;
            }
          }

          try {
            await store.update(sourceId, {
              _extreme_parentquoteline_value: parentId,
            });
            await treeList.refresh();
            Xrm.Utility.closeProgressIndicator();
          } catch (err) {
            Xrm.Utility.closeProgressIndicator();
            console.error("Reorder update failed", err);
          }
        },
      },
      columns: [
        {
          dataField: "sequencenumber",
          caption: "Order",
          dataType: "number",
          sortOrder: "asc",
          visible: false,
        },
        {
          dataField: "productid",
          caption: "Product ID",
          width: 150,
          calculateDisplayValue: "productid.productnumber",
          lookup: {
            dataSource(options) {
              let filterQuery = null;

              if (options.data) {
                if (options.data.extreme_isparentitem === true) {
                  filterQuery = [
                    ["extreme_isparent", "=", true],
                    "and",
                    ["statecode", "=", 0],
                  ];
                } else {
                  filterQuery = [
                    ["extreme_isparent", "<>", true],
                    "and",
                    ["statecode", "=", 0],
                  ];
                }
              }

              return {
                store: productsODataStore,
                searchExpr: ["productnumber", "name"],
                paginate: true,
                pageSize: 100,
                loadMode: "raw",
                filter:
                  filterQuery === null ? ["statecode", "=", 0] : filterQuery,
              };
            },
            displayExpr: "productnumber",
            valueExpr: "productid",
          },
          editorOptions: {
            acceptCustomValue: true,
            searchEnabled: true,
            searchExpr: ["productnumber", "name"],
            itemTemplate: function (data, index, container) {
              var row = $("<div>").addClass("row text-wrap");
              var containerFluid = $("<div>").addClass("container-fluid");
              $("<div>")
                .addClass("col-3")
                .text(data["productnumber"])
                .appendTo(row);
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
            },
            onOpened: function (e) {
              heightAuto = false;
              if (heightAuto === false) {
                const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                if (iframeCorrentHeight < 450) {
                  wrControl.getObject().style.minHeight = "600px";
                }
              }
              e.component._popup.option("width", 400);
            },
            onClosed: function (e) {
              heightAuto = true;
            },
            onFocusOut: function (e) {
              heightAuto = true;
            },
          },
          setCellValue: async function (newData, value, currentRowData) {
            newData.productid = value;

            if (
              typeof value === "number" &&
              currentRowData.extreme_isparentitem !== true
            ) {
              const recalcResult = recalculateAmounts({
                quantity: 1,
                supplierPricePerUnit: 0,
                supplierDiscount: 0,
                margin: defaultMargin,
                discount: 0,
                TaxPercent: 0,
              });

              newData._uomid_value = primaryDefaultUnit;
              newData.extreme_margin = recalcResult.margin;
              newData.quantity = recalcResult.quantity;
              newData.extreme_supplierpriceperunit =
                recalcResult.supplierPricePerUnit;
              newData.extreme_supplierbaseamount =
                recalcResult.supplierBaseAmount;
              newData.priceperunit = recalcResult.pricePerUnit;
              newData.baseamount = recalcResult.baseAmount;
              newData.extreme_fullpricewithdiscount =
                recalcResult.fullPriceWithDiscount;
              newData.manualdiscountamount = recalcResult.manualDiscountAmount;
              newData.tax = recalcResult.tax;
              newData.extendedamount = recalcResult.extendedAmount;
              newData.extreme_pd = recalcResult.pdPerUnit;
              newData.extreme_fullpd = recalcResult.fullPd;
              newData.extreme_discount = recalcResult.discountPercentage;
              newData.extreme_supplierdiscount =
                recalcResult.supplierDiscountPercentage;

              return;
            } else if (
              typeof value === "number" &&
              currentRowData.extreme_isparentitem === true
            ) {
              newData.productid = value;
              newData._uomid_value = primaryDefaultUnit;
              newData.quantity = 1;

              return;
            }
            // Product types
            let productType = null;
            let defaultVatSetting = null;
            let defaultTax = null;

            // const productTypeCode = 1;
            // const serviceTypeCode = 3;

            if (isGuid(value?._value)) {
              if (value?._value !== null) {
                productType = await Xrm.WebApi.retrieveRecord(
                  "product",
                  `${value?._value}`,
                  "?$select=producttypecode"
                );
                newData.extreme_producttype = productType.producttypecode;
                defaultVatSetting = await Xrm.WebApi.retrieveMultipleRecords(
                  "extreme_vatsetting",
                  `?$select=extreme_vatsettingid&$filter=(extreme_producttype eq ${productType.producttypecode} and extreme_customertaxpercentage eq ${taxPercentOfAccount.extreme_tax})`
                );
                defaultVatSetting =
                  defaultVatSetting.entities.length > 0
                    ? defaultVatSetting.entities[0].extreme_vatsettingid
                    : null;
              }
            }

            let priceListItemInfo = [];
            let classifyLookupsInfo = null;
            let supplierPricePerUnit = 0;

            const productInfo = await Xrm.WebApi.retrieveRecord(
              "product",
              `${value?._value}`,
              "?$select=_pricelevelid_value,_defaultuomid_value,name"
            );
            if (productInfo._pricelevelid_value) {
              if (value?._value !== null && isGuid(value?._value)) {
                const priceListInfo = await Xrm.WebApi.retrieveRecord(
                  "pricelevel",
                  `${productInfo._pricelevelid_value}`,
                  "?$select=enddate,statuscode"
                );

                if (
                  (new Date(priceListInfo.enddate) > new Date() ||
                    priceListInfo.enddate === null) &&
                  priceListInfo.statuscode === 100001
                ) {
                  priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords(
                    "productpricelevel",
                    `?$select=amount,_transactioncurrencyid_value&$expand=pricelevelid($select=extreme_defaultsalesmargin),transactioncurrencyid($select=isocurrencycode,currencysymbol)&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${value?._value})`
                  );
                } else {
                  var alertStrings = {
                    confirmButtonLabel: "OK",
                    text: "Price list for this product expired or is no longer active.",
                    title: "Price list",
                  };
                  var alertOptions = { height: 120, width: 260 };
                  Xrm.Navigation.openAlertDialog(
                    alertStrings,
                    alertOptions
                  ).then(
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
            if (value?._value !== null && isGuid(value?._value)) {
              classifyLookupsInfo = await Xrm.WebApi.retrieveRecord(
                "product",
                `${value?._value}`,
                "?$select=producttypecode,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value"
              );
            }

            if (classifyLookupsInfo !== null) {
              if (classifyLookupsInfo.producttypecode)
                newData.extreme_producttype =
                  classifyLookupsInfo.producttypecode;
              if (classifyLookupsInfo._extreme_area_value)
                newData._extreme_area_value = classifyLookupsInfo._extreme_area_value;
              if (classifyLookupsInfo._extreme_technology_value)
                newData._extreme_technology_value = classifyLookupsInfo._extreme_technology_value;
              if (classifyLookupsInfo._extreme_supplier_value)
                newData._extreme_vendorsupplier_value = classifyLookupsInfo._extreme_supplier_value;
            }

            // set create asset to false
            newData.extreme_createasset = false;

            const priceListMargin = priceListItemInfo.entities
              ? priceListItemInfo.entities[0]["pricelevelid"][
                "extreme_defaultsalesmargin"
              ] !== null
                ? priceListItemInfo.entities[0]["pricelevelid"][
                "extreme_defaultsalesmargin"
                ]
                : currentRowData.extreme_margin
              : currentRowData.extreme_margin;
            const priceListItemAmount = priceListItemInfo.entities
              ? priceListItemInfo.entities[0].amount
              : 0;
            const priceListItemCurrency = priceListItemInfo.entities
              ? priceListItemInfo.entities[0].transactioncurrencyid?.currencysymbol
              : null;
            const priceListItemCurrencyCode = priceListItemInfo.entities
              ? priceListItemInfo.entities[0].transactioncurrencyid?.isocurrencycode
              : null;

            newData.productid = value;
            // if (!isAddingSet) {
            //   newData.extreme_tax =
            //     defaultVatSetting === null
            //       ? 0
            //       : vatSettingsArray.find((item) => item.id === defaultVatSetting)
            //           .vat;
            //   defaultTax =
            //     defaultVatSetting === null
            //       ? 0
            //       : vatSettingsArray.find((item) => item.id === defaultVatSetting)
            //           .vat;
            // }
            // if (!isAddingSet && defaultVatSetting !== null) {
            //   newData.extreme_vatsetting = defaultVatSetting;
            //   newData.extreme_vatgroup = vatSettingsArray.find(
            //     (item) => item.id === defaultVatSetting
            //   ).idVatGroup;
            // }
            newData.extreme_customproductname = productInfo.name;
            if (productInfo._defaultuomid_value !== null)
              newData._uomid_value = productInfo._defaultuomid_value;
            // if (productInfo._pricelevelid_value && !isAddingSet) {
            if (productInfo._pricelevelid_value) {
              if (priceListItemInfo.entities)
                newData._extreme_pricelist_value = productInfo._pricelevelid_value;
              if (priceListItemInfo.entities)
                newData.extreme_pricelistpriceperunit = priceListItemAmount;
              if (priceListItemInfo.entities)
                newData.extreme_pricelistcurrency = priceListItemCurrency;
              
              // Apply currency conversion
              if (priceListItemInfo.entities && priceListItemCurrencyCode) {
                const currencyValue = jsonForConverting[priceListItemCurrencyCode] || 1;
                newData.extreme_supplierpriceperunit = priceListItemAmount * currencyValue;
                supplierPricePerUnit = priceListItemAmount * currencyValue;
              } else {
                newData.extreme_supplierpriceperunit = priceListItemAmount;
                supplierPricePerUnit = priceListItemAmount;
              }
            }

            // isAddingSet negative
            if (
              priceListMargin !== null &&
              supplierPricePerUnit !== null &&
              currentRowData.extreme_supplierdiscount !== null &&
              currentRowData.extreme_discount !== null
            ) {
              const recalcResult = recalculateAmounts({
                quantity: 1,
                supplierPricePerUnit: supplierPricePerUnit,
                supplierDiscount: currentRowData.extreme_supplierdiscount,
                margin: priceListMargin,
                discount: currentRowData.extreme_discount,
                TaxPercent: currentRowData.extreme_tax || 0,
              });

              newData.extreme_margin = recalcResult.margin;
              newData.quantity = recalcResult.quantity;
              newData.extreme_supplierpriceperunit =
                recalcResult.supplierPricePerUnit;
              newData.extreme_supplierbaseamount =
                recalcResult.supplierBaseAmount;
              newData.priceperunit = recalcResult.pricePerUnit;
              newData.baseamount = recalcResult.baseAmount;
              newData.extreme_fullpricewithdiscount =
                recalcResult.fullPriceWithDiscount;
              newData.manualdiscountamount = recalcResult.manualDiscountAmount;
              newData.tax = recalcResult.tax;
              newData.extendedamount = recalcResult.extendedAmount;
              newData.extreme_pd = recalcResult.pdPerUnit;
              newData.extreme_fullpd = recalcResult.fullPd;
              newData.extreme_discount = recalcResult.discountPercentage;
              newData.extreme_supplierdiscount =
                recalcResult.supplierDiscountPercentage;
            }
          },
          validationRules: [
            { type: "required" },
            {
              type: "custom",
              message: "Must be at least 3 characters",
              validationCallback(params) {
                if (params.value) {
                  if (params.value < 3 && typeof params.value == "number") {
                    return false;
                  } else {
                    return true;
                  }
                } else {
                  return true;
                }
              },
            },
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
          dataField: "quantity",
          caption: "Qty",
          dataType: "number",
          width: 44,
          setCellValue: async function (newData, value, currentRowData) {
            if (
              currentRowData.extreme_margin !== null &&
              currentRowData.extreme_supplierpriceperunit !== null &&
              currentRowData.extreme_supplierdiscount !== null &&
              currentRowData.extreme_discount !== null &&
              currentRowData.extreme_tax !== null
            ) {
              const recalcResult = recalculateAmounts({
                quantity: value,
                supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                supplierDiscount: currentRowData.extreme_supplierdiscount,
                margin: currentRowData.extreme_margin,
                discount: currentRowData.extreme_discount,
                TaxPercent: currentRowData.extreme_tax,
              });

              newData.extreme_margin = recalcResult.margin;
              newData.quantity = recalcResult.quantity;
              newData.extreme_supplierpriceperunit =
                recalcResult.supplierPricePerUnit;
              newData.extreme_supplierbaseamount =
                recalcResult.supplierBaseAmount;
              newData.priceperunit = recalcResult.pricePerUnit;
              newData.baseamount = recalcResult.baseAmount;
              newData.extreme_fullpricewithdiscount =
                recalcResult.fullPriceWithDiscount;
              newData.manualdiscountamount = recalcResult.manualDiscountAmount;
              newData.tax = recalcResult.tax;
              newData.extendedamount = recalcResult.extendedAmount;
              newData.extreme_pd = recalcResult.pdPerUnit;
              newData.extreme_fullpd = recalcResult.fullPd;
              newData.extreme_discount = recalcResult.discountPercentage;
              newData.extreme_supplierdiscount =
                recalcResult.supplierDiscountPercentage;
            }
          },
        },
        {
          dataField: "_uomid_value",
          caption: "Unit",
          width: 60,
          lookup: {
            dataSource: uomDataSource,
            displayExpr: "name",
            valueExpr: "uomid",
          },
        },
        {
          dataField: "extreme_pricelistpriceperunit",
          caption: "Original PPU",
          dataType: "number",
          cellTemplate(container, info) {
            return info.data.extreme_pricelistpriceperunit !== null &&
              info.data.extreme_pricelistpriceperunit
              ? $("<div>").text(
                info.data.extreme_pricelistpriceperunit +
                ` ${info.data.extreme_pricelistcurrency}`
              )
              : null;
          },
          visible: false,
          allowEditing: false,
        },
        {
          dataField: "extreme_pricelistcurrency",
          caption: "Original Currency",
          dataType: "string",
          visible: false,
          allowEditing: false,
        },
        {
          dataField: "extreme_supplierpriceperunit",
          caption: "PPU",
          dataType: "number",
          setCellValue: async function (newData, value, currentRowData) {
            if (
              currentRowData.extreme_margin !== null &&
              currentRowData.extreme_supplierdiscount !== null &&
              currentRowData.quantity !== null
            ) {
              const recalcResult = recalculateAmounts({
                quantity: currentRowData.quantity,
                supplierPricePerUnit: value,
                supplierDiscount: currentRowData.extreme_supplierdiscount,
                margin: currentRowData.extreme_margin,
                discount: currentRowData.extreme_discount,
                TaxPercent: currentRowData.extreme_tax,
              });

              newData.extreme_margin = recalcResult.margin;
              newData.quantity = recalcResult.quantity;
              newData.extreme_supplierpriceperunit =
                recalcResult.supplierPricePerUnit;
              newData.extreme_supplierbaseamount =
                recalcResult.supplierBaseAmount;
              newData.priceperunit = recalcResult.pricePerUnit;
              newData.baseamount = recalcResult.baseAmount;
              newData.extreme_fullpricewithdiscount =
                recalcResult.fullPriceWithDiscount;
              newData.manualdiscountamount = recalcResult.manualDiscountAmount;
              newData.tax = recalcResult.tax;
              newData.extendedamount = recalcResult.extendedAmount;
              newData.extreme_pd = recalcResult.pdPerUnit;
              newData.extreme_fullpd = recalcResult.fullPd;
              newData.extreme_discount = recalcResult.discountPercentage;
              newData.extreme_supplierdiscount =
                recalcResult.supplierDiscountPercentage;
            }
            if (typeof currentRowData.productid === "number") {
              newData.extreme_pricelistpriceperunit = value;
            }
          },
        },
        {
          dataField: "extreme_supplierbaseamount",
          caption: "Base Amount",
          dataType: "number",
          allowEditing: false,
        },
        {
          dataField: "extreme_supplierdiscount",
          caption: "Supplier Disc. %",
          dataType: "number",
          width: 70,
          visible: false,
          setCellValue: async function (newData, value, currentRowData) {
            if (
              currentRowData.priceperunit !== null &&
              currentRowData.extreme_supplierpriceperunit !== null &&
              currentRowData.quantity !== null
            ) {
              const recalcResult = recalculateAmounts({
                quantity: currentRowData.quantity,
                supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                supplierDiscount: value,
                margin: currentRowData.extreme_margin,
                discount: currentRowData.extreme_discount,
                TaxPercent: currentRowData.extreme_tax,
              });

              newData.extreme_margin = recalcResult.margin;
              newData.quantity = recalcResult.quantity;
              newData.extreme_supplierpriceperunit =
                recalcResult.supplierPricePerUnit;
              newData.extreme_supplierbaseamount =
                recalcResult.supplierBaseAmount;
              newData.priceperunit = recalcResult.pricePerUnit;
              newData.baseamount = recalcResult.baseAmount;
              newData.extreme_fullpricewithdiscount =
                recalcResult.fullPriceWithDiscount;
              newData.manualdiscountamount = recalcResult.manualDiscountAmount;
              newData.tax = recalcResult.tax;
              newData.extendedamount = recalcResult.extendedAmount;
              newData.extreme_pd = recalcResult.pdPerUnit;
              newData.extreme_fullpd = recalcResult.fullPd;
              newData.extreme_discount = recalcResult.discountPercentage;
              newData.extreme_supplierdiscount =
                recalcResult.supplierDiscountPercentage;
            }
          },
        },
        {
          dataField: "extreme_margin",
          caption: "Margin",
          dataType: "number",
          width: 64,
          setCellValue: async function (newData, value, currentRowData) {
            newData.extreme_margin = value;
            if (
              currentRowData.extreme_supplierpriceperunit !== null &&
              currentRowData.priceperunit !== null &&
              currentRowData.quantity !== null &&
              currentRowData.extreme_discount !== null &&
              currentRowData.extreme_tax !== null &&
              currentRowData.extreme_discount !== null
            ) {
              const recalcResult = recalculateAmounts({
                quantity: currentRowData.quantity,
                supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                supplierDiscount: currentRowData.extreme_supplierdiscount,
                margin: value,
                discount: currentRowData.extreme_discount,
                TaxPercent: currentRowData.extreme_tax,
              });

              newData.extreme_margin = recalcResult.margin;
              newData.quantity = recalcResult.quantity;
              newData.extreme_supplierpriceperunit =
                recalcResult.supplierPricePerUnit;
              newData.extreme_supplierbaseamount =
                recalcResult.supplierBaseAmount;
              newData.priceperunit = recalcResult.pricePerUnit;
              newData.baseamount = recalcResult.baseAmount;
              newData.extreme_fullpricewithdiscount =
                recalcResult.fullPriceWithDiscount;
              newData.manualdiscountamount = recalcResult.manualDiscountAmount;
              newData.tax = recalcResult.tax;
              newData.extendedamount = recalcResult.extendedAmount;
              newData.extreme_pd = recalcResult.pdPerUnit;
              newData.extreme_fullpd = recalcResult.fullPd;
              newData.extreme_discount = recalcResult.discountPercentage;
              newData.extreme_supplierdiscount =
                recalcResult.supplierDiscountPercentage;
            }
          },
        },
        {
          dataField: "priceperunit",
          caption: "Sales PPU",
          dataType: "number",
          cssClass: "cell-highlighted",
          allowEditing: true,
          setCellValue: async function (newData, value, currentRowData) {
            if (
              currentRowData.quantity !== null &&
              currentRowData.extreme_discount !== null &&
              currentRowData.extreme_tax !== null &&
              currentRowData.extreme_discount !== null &&
              currentRowData.extreme_margin
            ) {
              if (
                (currentRowData.extreme_supplierpriceperunit === null ||
                  currentRowData.extreme_supplierpriceperunit === undefined ||
                  currentRowData.extreme_supplierpriceperunit === 0) &&
                currentRowData.extreme_margin !== null
              ) {
                newData.extreme_supplierpriceperunit =
                  value / currentRowData.extreme_margin;

                const recalcResult = recalculateAmounts({
                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: value / currentRowData.extreme_margin,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: currentRowData.extreme_margin,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: currentRowData.extreme_tax,
                  pricePerUnit: value,
                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit =
                  recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount =
                  recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount =
                  recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount =
                  recalcResult.supplierDiscountPercentage;
              } else {
                const recalcResult = recalculateAmounts({
                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: currentRowData.extreme_margin,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: currentRowData.extreme_tax,
                  pricePerUnit: value,
                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit =
                  recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount =
                  recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount =
                  recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount =
                  recalcResult.supplierDiscountPercentage;
              }
            }
          },
        },
        {
          dataField: "baseamount",
          caption: "Sales Amount",
          dataType: "number",
          allowEditing: true,
        },
        {
          dataField: "extreme_discount",
          caption: "Disc. %",
          dataType: "number",
          width: 62,
          setCellValue: async function (newData, value, currentRowData) {
            // Do so only if it is not parent item (SET)
            if (currentRowData.extreme_isparentitem !== true) {
              if (
                currentRowData.priceperunit !== null &&
                currentRowData.quantity !== null &&
                currentRowData.extreme_tax !== null
              ) {
                const recalcResult = recalculateAmounts({
                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: currentRowData.extreme_margin,
                  discount: value,
                  TaxPercent: currentRowData.extreme_tax,
                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit =
                  recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount =
                  recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount =
                  recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount =
                  recalcResult.supplierDiscountPercentage;
              }
              if (currentRowData.extreme_tax !== null) {
                newData.tax =
                  currentRowData.priceperunit *
                    (1 - value / 100) *
                    currentRowData.quantity *
                    (1 + currentRowData.extreme_tax / 100) -
                  currentRowData.priceperunit *
                    (1 - value / 100) *
                    currentRowData.quantity;
                newData.extendedamount =
                  (currentRowData.priceperunit *
                    (1 - value / 100) *
                    currentRowData.quantity *
                    (1 + currentRowData.extreme_tax / 100) -
                    currentRowData.priceperunit *
                      (1 - value / 100) *
                      currentRowData.quantity) +
                  currentRowData.priceperunit *
                    (1 - value / 100) *
                    currentRowData.quantity;
              }
            } else {
              newData.extreme_discount = value;
            }
          },
        },
        {
          dataField: "manualdiscountamount",
          caption: "Discount Amount",
          dataType: "number",
          allowEditing: false,
          visible: false,
        },
        {
          dataField: "extreme_fullpricewithdiscount",
          caption: "Amount",
          dataType: "number",
          setCellValue: async function (newData, value, currentRowData) {
            // Do so only if it is not parent item (SET)
            if (currentRowData.extreme_isparentitem !== true) {
              if (
                currentRowData.priceperunit !== null &&
                currentRowData.quantity !== null &&
                currentRowData.extreme_tax !== null
              ) {
                const recalcResult = recalculateAmounts({
                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: currentRowData.extreme_margin,
                  discount: currentRowData.extreme_discount,
                  TaxPercent: currentRowData.extreme_tax,
                  fullPriceWithDiscount: value,
                });

                newData.extreme_margin = recalcResult.margin;
                newData.quantity = recalcResult.quantity;
                newData.extreme_supplierpriceperunit =
                  recalcResult.supplierPricePerUnit;
                newData.extreme_supplierbaseamount =
                  recalcResult.supplierBaseAmount;
                newData.priceperunit = recalcResult.pricePerUnit;
                newData.baseamount = recalcResult.baseAmount;
                newData.extreme_fullpricewithdiscount =
                  recalcResult.fullPriceWithDiscount;
                newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                newData.tax = recalcResult.tax;
                newData.extendedamount = recalcResult.extendedAmount;
                newData.extreme_pd = recalcResult.pdPerUnit;
                newData.extreme_fullpd = recalcResult.fullPd;
                newData.extreme_discount = recalcResult.discountPercentage;
                newData.extreme_supplierdiscount =
                  recalcResult.supplierDiscountPercentage;
              }
            } else {
              newData.extreme_fullpricewithdiscount = value;
            }
          },
        },
        {
          dataField: "_extreme_vatsetting_value",
          caption: "VAT %",
          width: 60,
          calculateDisplayValue: "extreme_tax",
          lookup: {
            dataSource: customVatSettingStore(),
            displayExpr: "extreme_vat",
            valueExpr: "extreme_vatsettingid",
          },
          setCellValue: async function (newData, value, currentRowData) {
            newData._extreme_vatsetting_value = value;
            
            // Fetch VAT details from the value
            if (isGuid(value?._value || value)) {
              const vatId = value?._value || value;
              const vatSetting = await Xrm.WebApi.retrieveRecord(
                "extreme_vatsetting",
                vatId,
                "?$select=_extreme_vatgroup_value&$expand=extreme_VATGroup($select=extreme_vat)"
              );
              
              if (vatSetting && vatSetting.extreme_VATGroup) {
                newData.extreme_tax = vatSetting.extreme_VATGroup.extreme_vat;
                newData._extreme_vatgroup_value = vatSetting._extreme_vatgroup_value;

                // Recalculate with new tax
                if (
                  currentRowData.priceperunit !== null &&
                  currentRowData.quantity !== null &&
                  currentRowData.extreme_fullpricewithdiscount !== null
                ) {
                  const recalcResult = recalculateAmounts({
                    quantity: currentRowData.quantity,
                    supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                    supplierDiscount: currentRowData.extreme_supplierdiscount,
                    margin: currentRowData.extreme_margin,
                    discount: currentRowData.extreme_discount,
                    TaxPercent: vatSetting.extreme_VATGroup.extreme_vat,
                  });

                  newData.tax = recalcResult.tax;
                  newData.extendedamount = recalcResult.extendedAmount;
                }
              }
            }
          },
          editorOptions: {
            acceptCustomValue: false,
            searchEnabled: true,
            searchExpr: ["extreme_description", "extreme_code", "extreme_vat"],
            itemTemplate: function (data, index, container) {
              console.log(data);
              var containerFluid = $("<div>").addClass("container-fluid");
              var row = $("<div>").addClass("row text-wrap");
              $("<div>")
                .addClass("col-2")
                .text(
                  productTypesArray.find(
                    (item) => item.id === data["extreme_producttype"]
                  ).name
                )
                .appendTo(row);
              $("<div>")
                .addClass("col-6")
                .text(data["extreme_description"])
                .appendTo(row);
              $("<div>")
                .addClass("col-2")
                .text(data["extreme_code"])
                .appendTo(row);
              $("<div>")
                .addClass("col-2")
                .text(
                  `${data["extreme_vat"] || data["extreme_vat"] == 0
                    ? data["extreme_vat"] + " %"
                    : ""
                  }`
                )
                .appendTo(row);
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
              e.component._popup.option("width", 400);
            },
            onClosed: function (e) {
              heightAuto = true;
            },
            onFocusOut: function (e) {
              heightAuto = true;
            },
          },
        },
        {
          dataField: "extreme_tax",
          caption: "VAT % calc",
          dataType: "number",
          allowEditing: false,
          visible: false,
        },
        {
          dataField: "tax",
          caption: "VAT Amount",
          dataType: "number",
          allowEditing: false,
          visible: false,
        },
        {
          dataField: "extreme_pd",
          caption: "Profit Per Unit",
          dataType: "number",
          allowEditing: false,
          visible: false,
        },
        {
          dataField: "extreme_fullpd",
          caption: "Gross Profit",
          dataType: "number",
          allowEditing: false,
          visible: false,
        },
        {
          dataField: "extendedamount",
          caption: "Total Amount",
          dataType: "number",
          allowEditing: false,
        },
        {
          dataField: "_extreme_pricelist_value",
          caption: "Price list",
          width: 130,
          wordWrapEnabled: false,
          lookup: {
            dataSource: productPriceLevelDataSource(),
            displayExpr: "name",
            valueExpr: "_pricelevelid_value",
          },
          setCellValue: async function (newData, value, currentRowData) {
            newData._extreme_pricelist_value = value;

            // Fetch the price list item details
            if (
              isGuid(value?._value || value) &&
              isGuid(currentRowData.productid?._value || currentRowData._productid_value)
            ) {
              const priceListId = value?._value || value;
              const productId =
                currentRowData.productid?._value || currentRowData._productid_value;

              try {
                const priceListItems = await Xrm.WebApi.retrieveMultipleRecords(
                  "productpricelevel",
                  `?$select=amount,_transactioncurrencyid_value&$expand=pricelevelid($select=extreme_defaultsalesmargin),transactioncurrencyid($select=isocurrencycode,currencysymbol)&$filter=(_pricelevelid_value eq ${priceListId} and _productid_value eq ${productId})`
                );

                if (
                  priceListItems.entities &&
                  priceListItems.entities.length > 0
                ) {
                  const priceListItem = priceListItems.entities[0];
                  const newOrgPrice = priceListItem.amount;
                  const newOrgCurrency =
                    priceListItem.transactioncurrencyid?.isocurrencycode;
                  const newOrgCurrencySymbol =
                    priceListItem.transactioncurrencyid?.currencysymbol;
                  const newOrgCurrencyValue =
                    jsonForConverting[newOrgCurrency] || 1;
                  const priceListMargin =
                    priceListItem.pricelevelid?.extreme_defaultsalesmargin ||
                    currentRowData.extreme_margin;

                  newData.extreme_pricelistpriceperunit = newOrgPrice;
                  newData.extreme_pricelistcurrency = newOrgCurrencySymbol;

                  const pricePerUnit =
                    newOrgPrice * newOrgCurrencyValue * priceListMargin;
                  const recalcResult = recalculateAmounts({
                    quantity: currentRowData.quantity,
                    supplierPricePerUnit: newOrgPrice * newOrgCurrencyValue,
                    supplierDiscount: currentRowData.extreme_supplierdiscount,
                    margin: priceListMargin,
                    discount: currentRowData.extreme_discount,
                    TaxPercent: currentRowData.extreme_tax,
                    pricePerUnit: pricePerUnit,
                  });

                  newData.extreme_margin = recalcResult.margin;
                  newData.quantity = recalcResult.quantity;
                  newData.extreme_supplierpriceperunit =
                    recalcResult.supplierPricePerUnit;
                  newData.extreme_supplierbaseamount =
                    recalcResult.supplierBaseAmount;
                  newData.priceperunit = recalcResult.pricePerUnit;
                  newData.baseamount = recalcResult.baseAmount;
                  newData.extreme_fullpricewithdiscount =
                    recalcResult.fullPriceWithDiscount;
                  newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                  newData.tax = recalcResult.tax;
                  newData.extendedamount = recalcResult.extendedAmount;
                  newData.extreme_pd = recalcResult.pdPerUnit;
                  newData.extreme_fullpd = recalcResult.fullPd;
                  newData.extreme_discount = recalcResult.discountPercentage;
                  newData.extreme_supplierdiscount =
                    recalcResult.supplierDiscountPercentage;
                }
              } catch (error) {
                console.error("Error fetching price list item:", error);
              }
            }
          },
          editorOptions: {
            acceptCustomValue: false,
            searchEnabled: false,
            // searchExpr: ["productId", "_productid_value@OData.Community.Display.V1.FormattedValue"],
            itemTemplate: function (data, index, container) {
              var containerFluid = $("<div>").addClass("container-fluid");
              var row = $("<div>").addClass("row text-wrap");
              $("<div>").addClass("col-6").text(data["name"]).appendTo(row);
              $("<div>")
                .addClass("col-6")
                .text(data["amount@OData.Community.Display.V1.FormattedValue"])
                .appendTo(row);
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
              e.component._popup.option("width", 400);
            },
            onClosed: function (e) {
              heightAuto = true;
            },
            onFocusOut: function (e) {
              heightAuto = true;
            },
          },
        },
        {
          dataField: "_extreme_parentquoteline_value",
          caption: "Parent QL",
          lookup: {
            dataSource: quoteDetailsDataSource,
            displayExpr: "extreme_customproductname",
            valueExpr: "quotedetailid",
          },
          visible: false,
        },
        {
          dataField: "extreme_isparentitem",
          caption: "Is Parent",
          dataType: "boolean",
          visible: false,
        },
        {
          dataField: "extreme_producttype",
          caption: "Type",
          lookup: {
            dataSource(options) {
              return {
                store: {
                  type: "array",
                  data: productTypesArray,
                  key: "id",
                },
                // paginate: true,
                // pageSize: 20,
              };
            },
            displayExpr: "name",
            valueExpr: "id",
          },
          visible: false,
        },
        {
          dataField: "_extreme_area_value",
          caption: "Area",
          lookup: {
            dataSource: extremeAreaDataSource,
            displayExpr: "extreme_name",
            valueExpr: "extreme_areaid",
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
            },
          },
          visible: false,
        },
        {
          dataField: "_extreme_technology_value",
          caption: "Technology",
          lookup: {
            dataSource: extremeTechnologyDataSource,
            displayExpr: "extreme_name",
            valueExpr: "extreme_technologyid",
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
            },
          },
          visible: false,
        },
        {
          dataField: "_extreme_vendorsupplier_value",
          caption: "Vendor/Supplier",
          lookup: {
            dataSource: vendorSupplierDataSource,
            displayExpr: "name",
            valueExpr: "accountid",
          },
          editorOptions: {
            acceptCustomValue: false,
            searchEnabled: true,
            searchExpr: ["extreme_paname30characters", "name"],
            itemTemplate: function (data, index, container) {
              var row = $("<div>").addClass("row text-wrap");
              var containerFluid = $("<div>").addClass("container-fluid");
              $("<div>")
                .addClass("col-4")
                .text(data["extreme_paname30characters"])
                .appendTo(row);
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
              e.component._popup.option("width", 400);
            },
            onClosed: function (e) {
              heightAuto = true;
            },
            onFocusOut: function (e) {
              heightAuto = true;
            },
          },
          visible: false,
        },
        {
          dataField: "extreme_createasset",
          caption: "Asset?",
          width: 60,
          dataType: "boolean",
        },
        {
          dataField: "extreme_productdescription",
          caption: "Description",
          dataType: "string",
          visible: false,
        },
        {
          type: "buttons",
          width: 70,
          buttons: [
            {
              hint: "Description",
              icon: "edit",
              visible: true,
              disabled: false,
              onClick(e) {
                selectedDescriptionItem = e.row.data;
                const parentDoc = parent.document;

                if (parentDoc.getElementById("custom-modal-overlay")) return;

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
                  <textarea id="descInput" style="width:100%;height:100px;padding:10px;margin-top:10px;margin-bottom:20px;box-sizing:border-box;font-size:14px;border:1px solid #ccc;border-radius:4px;">${
                    e.row.data.extreme_productdescription || ""
                  }</textarea>
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
                  if (style && style.parentNode)
                    style.parentNode.removeChild(style);
                  selectedDescriptionItem = null;
                };

                cancelBtn.onclick = cleanup;

                saveBtn.onclick = async () => {
                  const value = textarea.value.trim();
                  console.log("Saved description:", value);

                  if (e.row.data.quotedetailid) {
                    await Xrm.WebApi.updateRecord(
                      "quotedetail",
                      e.row.data.quotedetailid,
                      { extreme_productdescription: value }
                    );
                    await treeList.refresh();
                  }

                  cleanup();
                };
              },
            },
            {
              hint: "Delete",
              icon: "trash",
              visible: true,
              disabled: false,
              onClick(e) {
                console.log(e);
                showDeleteModal(async () => {
                  Xrm.Utility.showProgressIndicator(`Deleting...`);
                  if (e.row.isNewRow == true) {
                    treeList.cancelEditData();
                  } else {
                    const keyToDelete = e.row.key?._value || e.row.key || e.row.data.quotedetailid;
                    if (keyToDelete) {
                      await quotedetailODataStore.remove(keyToDelete);
                    }
                  }
                  Xrm.Utility.closeProgressIndicator();
                  await treeList.refresh();
                });
              },
            },
          ],
        },
      ],
      toolbar: {
        items: [
          {
            location: "before",
            widget: "dxButton",
            locateInMenu: "auto",
            options: {
              icon: "bulletlist",
              text: "Add existing",
              width: "auto",
              disabled: false,
              onClick(e) {
                isAddingSet = false;
                
                treeList.columnOption("productid", "editorOptions", {
                  acceptCustomValue: false,
                  searchEnabled: true,
                  searchExpr: ["productnumber", "name"],
                  itemTemplate: function (data, index, container) {
                    var row = $("<div>").addClass("row text-wrap");
                    var containerFluid = $("<div>").addClass("container-fluid");
                    $("<div>")
                      .addClass("col-3")
                      .text(data["productnumber"])
                      .appendTo(row);
                    $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
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
                    e.component._popup.option("width", 400);
                  },
                  onClosed: function (e) {
                    heightAuto = true;
                  },
                  onFocusOut: function (e) {
                    heightAuto = true;
                  },
                });

                treeList.addRow();
              },
            },
          },
          {
            location: "before",
            locateInMenu: "auto",
            template() {
              return $("<div>").addClass("spacer").text("");
            },
          },
          {
            location: "before",
            widget: "dxButton",
            locateInMenu: "auto",
            options: {
              icon: "plus",
              text: "Add new",
              width: "auto",
              disabled: false,
              onClick(e) {
                isAddingSet = false;
                
                treeList.columnOption("productid", "editorOptions", {
                  acceptCustomValue: true,
                  searchEnabled: true,
                  searchExpr: ["productnumber", "name"],
                  itemTemplate: function (data, index, container) {
                    var row = $("<div>").addClass("row text-wrap");
                    var containerFluid = $("<div>").addClass("container-fluid");
                    $("<div>")
                      .addClass("col-3")
                      .text(data["productnumber"])
                      .appendTo(row);
                    $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
                    row.appendTo(containerFluid);
                    container.append(containerFluid);
                  },
                  onCustomItemCreating: function (args) {
                    if (!args.text) {
                      args.customItem = null;
                      return;
                    }
                  },
                  onOpened: function (e) {
                    heightAuto = false;
                    if (heightAuto === false) {
                      const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                      if (iframeCorrentHeight < 450) {
                        wrControl.getObject().style.minHeight = "600px";
                      }
                    }
                    e.component._popup.option("width", 400);
                  },
                  onClosed: function (e) {
                    heightAuto = true;
                  },
                  onFocusOut: function (e) {
                    heightAuto = true;
                  },
                });

                treeList.addRow();
              },
            },
          },
          {
            location: "before",
            locateInMenu: "auto",
            template() {
              return $("<div>").addClass("spacer").text("");
            },
          },
          {
            location: "before",
            widget: "dxButton",
            locateInMenu: "auto",
            options: {
              icon: "group",
              text: "Add set",
              width: "auto",
              disabled: false,
              onClick(e) {
                isAddingSet = true;
                treeList.addRow();
              },
            },
          },
          {
            location: "before",
            locateInMenu: "auto",
            template() {
              return $("<div>").addClass("spacer").text("");
            },
          },
          {
            location: "before",
            widget: "dxButton",
            locateInMenu: "auto",
            options: {
              icon: "triangledown",
              text: "Compact",
              width: "auto",
              elementAttr: {
                id: "compactBtn",
              },
              disabled: true,
              onClick(e) {
                console.log(e);
                treeList.columnOption(
                  "extreme_pricelistpriceperunit",
                  "visible",
                  false
                );
                treeList.columnOption(
                  "extreme_supplierdiscount",
                  "visible",
                  false
                );
                treeList.columnOption("extreme_pd", "visible", false);
                treeList.columnOption("extreme_fullpd", "visible", false);
                treeList.columnOption("manualdiscountamount", "visible", false);
                treeList.columnOption("tax", "visible", false);

                // reset all columns after classify
                if (
                  $("#classifyBtn").dxButton("instance").option("disabled") ===
                  true
                ) {
                  treeList.option("columns").forEach((col) => {
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
                      col.dataField !== "_extreme_parentquoteline_value" &&
                      col.dataField !== "extreme_isparentitem" &&
                      col.dataField !== "extreme_producttype"
                    ) {
                      treeList.columnOption(col.dataField, "visible", true);
                    }
                  });

                  treeList.option("filterValue", null);

                  treeList.columnOption(
                    "_extreme_area_value",
                    "visible",
                    false
                  );
                  treeList.columnOption(
                    "_extreme_technology_value",
                    "visible",
                    false
                  );
                  treeList.columnOption(
                    "_extreme_vendorsupplier_value",
                    "visible",
                    false
                  );
                }

                $("#extendedBtn")
                  .dxButton("instance")
                  .option("disabled", false);
                $("#classifyBtn")
                  .dxButton("instance")
                  .option("disabled", false);
                e.component.option("disabled", true);
              },
            },
          },
          {
            location: "before",
            locateInMenu: "auto",
            template() {
              return $("<div>").addClass("spacer").text("");
            },
          },
          {
            location: "before",
            widget: "dxButton",
            locateInMenu: "auto",
            options: {
              icon: "expandform",
              text: "Extended",
              width: "auto",
              elementAttr: {
                id: "extendedBtn",
              },
              disabled: false,
              onClick(e) {
                console.log(e);
                treeList.columnOption(
                  "extreme_pricelistpriceperunit",
                  "visible",
                  true
                );
                treeList.columnOption(
                  "extreme_supplierdiscount",
                  "visible",
                  true
                );
                treeList.columnOption("extreme_pd", "visible", true);
                treeList.columnOption("extreme_fullpd", "visible", true);
                treeList.columnOption("manualdiscountamount", "visible", true);
                treeList.columnOption("tax", "visible", true);
                // reset all columns after classify
                if (
                  $("#classifyBtn").dxButton("instance").option("disabled") ===
                  true
                ) {
                  // console.log('ALL COLUMNS');
                  // console.log(treeList.option('columns'));
                  treeList.option("columns").forEach((col) => {
                    if (
                      col.dataField !== "extreme_productdescription" &&
                      // other columns
                      col.dataField !== "sequencenumber" &&
                      col.dataField !== "extreme_pricelistcurrency" &&
                      col.dataField !== "extreme_tax" &&
                      col.dataField !== "_extreme_parentquoteline_value" &&
                      col.dataField !== "extreme_isparentitem" &&
                      col.dataField !== "extreme_producttype"
                    ) {
                      treeList.columnOption(col.dataField, "visible", true);
                    }
                  });

                  treeList.option("filterValue", null);

                  treeList.columnOption(
                    "_extreme_area_value",
                    "visible",
                    false
                  );
                  treeList.columnOption(
                    "_extreme_technology_value",
                    "visible",
                    false
                  );
                  treeList.columnOption(
                    "_extreme_vendorsupplier_value",
                    "visible",
                    false
                  );
                }

                $("#compactBtn").dxButton("instance").option("disabled", false);
                $("#classifyBtn")
                  .dxButton("instance")
                  .option("disabled", false);
                e.component.option("disabled", true);
              },
            },
          },
          {
            location: "before",
            locateInMenu: "auto",
            template() {
              return $("<div>").addClass("spacer").text("");
            },
          },
          {
            location: "before",
            widget: "dxButton",
            locateInMenu: "auto",
            options: {
              text: "Classify",
              width: "auto",
              elementAttr: {
                id: "classifyBtn",
              },
              disabled: false,
              onClick(e) {
                console.log(e);
                treeList.getVisibleColumns().forEach((col) => {
                  if (
                    col.dataField !== "productid" &&
                    col.dataField !== "extreme_customproductname" &&
                    col.dataType !== "detailExpand" &&
                    col.dataType !== "drag"
                  ) {
                    treeList.columnOption(col.dataField, "visible", false);
                  }
                });

                treeList.option("filterValue", [
                  [
                    ["_extreme_area_value", "=", null],
                    "or",
                    ["_extreme_technology_value", "=", null],
                    "or",
                    ["_extreme_vendorsupplier_value", "=", null],
                  ],
                ]);

                treeList.columnOption("_extreme_area_value", "visible", true);
                treeList.columnOption(
                  "_extreme_technology_value",
                  "visible",
                  true
                );
                treeList.columnOption(
                  "_extreme_vendorsupplier_value",
                  "visible",
                  true
                );

                $("#compactBtn").dxButton("instance").option("disabled", false);
                $("#extendedBtn")
                  .dxButton("instance")
                  .option("disabled", false);
                e.component.option("disabled", true);
              },
            },
          },
          {
            location: "before",
            locateInMenu: "auto",
            template() {
              return $("<div>").addClass("spacer").text("");
            },
          },
          {
            location: "before",
            widget: "dxButton",
            locateInMenu: "auto",
            options: {
              icon: "refresh",
              text: "",
              width: "auto",
              elementAttr: {
                id: "refreshBtn",
              },
              disabled: false,
              onClick(e) {
                treeList.refresh();
              },
            },
          },

          // BEFORE AND AFTER

          {
            location: "after",
            locateInMenu: "auto",
            template() {
              console.log(jsonForConverting);

              const $div = $("<div>").addClass("exchange-rates");
              const $ul = $("<ul>").css({
                "list-style-type": "none",
                padding: "0",
                margin: "0",
                display: "flex",
                "flex-wrap": "wrap",
                "justify-content": "center",
              });

              $.each(jsonForConverting, function (currency, rate) {
                console.log(currency);
                console.log(rate);

                if (rate !== 1) {
                  const $input = $("<input>")
                    .attr({
                      type: "number",
                      id: currency,
                      class: "currencyRates",
                      value: rate,
                      disabled: false,
                    })
                    .css({
                      "max-width": "50px",
                      height: "28px",
                      margin: "0 5px",
                      padding: "0 5px",
                      border: "none",
                      "border-radius": "3px",
                      "background-color": "#fff",
                      "-webkit-appearance": "none",
                      "-moz-appearance": "textfield;",
                    })
                    .on("change", async function () {
                      Xrm.Utility.showProgressIndicator(
                        `Changing exchange rate for ${currency}`
                      );
                      const newValue = $(this).val();
                      // console.log(`New value for ${currency}: ${newValue} ${typeof (newValue)}`);
                      switch (currency) {
                        case "EUR":
                          await Xrm.WebApi.updateRecord(
                            "quote",
                            `${quoteId}`,
                            { extreme_euroexchangerate: parseFloat(newValue) }
                          );
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "USD":
                          await Xrm.WebApi.updateRecord(
                            "quote",
                            `${quoteId}`,
                            { extreme_dollarexchangerate: parseFloat(newValue) }
                          );
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "CHF":
                          await Xrm.WebApi.updateRecord(
                            "quote",
                            `${quoteId}`,
                            { extreme_chfexchangerate: parseFloat(newValue) }
                          );
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "RSD":
                          await Xrm.WebApi.updateRecord(
                            "quote",
                            `${quoteId}`,
                            { extreme_rsdexchangerate: parseFloat(newValue) }
                          );
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "MKD":
                          await Xrm.WebApi.updateRecord(
                            "quote",
                            `${quoteId}`,
                            {
                              extreme_macedoniandenarexchangerate:
                                parseFloat(newValue),
                            }
                          );
                          await exchangeRateChange(currency, newValue);

                          break;
                        case "GBP":
                          await Xrm.WebApi.updateRecord(
                            "quote",
                            `${quoteId}`,
                            { extreme_gbpexchangerate: parseFloat(newValue) }
                          );
                          await exchangeRateChange(currency, newValue);

                          break;
                        default:
                          break;
                      }
                      Xrm.Utility.closeProgressIndicator();
                    });

                  const $li = $("<li>")
                    .append(`${currency}: `)
                    .append($input)
                    .css({
                      margin: "0 10px",
                      padding: "0 0 0 5px",
                      border: "1px solid #eee",
                      "border-radius": "3px",
                      "background-color": "#fff",
                      "box-shadow": "0 4px 8px rgba(0, 0, 0, 0.1)",
                    });

                  $ul.append($li);
                }
              });

              $div.append($ul);
              return $div;
            },
          },
        ],
      },
      allowColumnReordering: true,
      allowColumnResizing: true,
      onEditorPreparing: function (e) {
        console.log(e);
        
        // Handle pricelist datasource based on selected product
        if (e.dataField == "_extreme_pricelist_value") {
          const productId = 
            e?.row?.data?._productid_value || 
            e?.row?.data?.productid?.productid?._value ||
            e?.row?.data?.productid?._value;
            
          if (productId && isGuid(productId)) {
            e.editorOptions.dataSource = productPriceLevelDataSource(productId);
          }
        }
        
        // Handle VAT setting datasource based on product type
        if (e.dataField == "_extreme_vatsetting_value") {
          if (e?.row?.data?.extreme_producttype) {
            e.editorOptions.dataSource = customVatSettingStore(
              e.row.data.extreme_producttype
            );
          }
        }
        
        // Safety check - ensure row and data exist before checking parent item status
        if (!e.row || !e.row.data) {
          return;
        }
        
        // Disable most fields for parent items (sets), except specific ones
        if (
          (e.row.data.extreme_isparentitem === true || (isAddingSet && e.row.isNewRow)) &&
          e.dataField !== "productid" &&
          e.dataField !== "extreme_customproductname" &&
          e.dataField !== "extreme_productdescription" &&
          e.dataField !== "_uomid_value" &&
          e.dataField !== "quantity" &&
          e.dataField !== "extreme_createasset" &&
          e.dataField !== "_extreme_area_value" &&
          e.dataField !== "_extreme_technology_value" &&
          e.dataField !== "_extreme_vendorsupplier_value" &&
          e.dataField !== "baseamount" &&
          e.dataField !== "extreme_discount"
        ) {
          e.editorOptions.disabled = true;
        }
        
        // Disable baseamount for non-parent items (it's calculated)
        // But enable it for parent items (so they can distribute to children)
        if (e.row.data.extreme_isparentitem !== true && e.dataField == "baseamount") {
          e.editorOptions.disabled = true;
        }
      },
      onInitNewRow: async (e) => {
        // console.log('InitNewRow');
        // console.log(e);

        // Check if there's a focused row that is a parent item
        // If so, make this new row a child of that parent
        const focusedRowKey = treeList.option("focusedRowKey");
        if (focusedRowKey && !isAddingSet) {
          const focusedNode = treeList.getNodeByKey(focusedRowKey);
          if (focusedNode && focusedNode.data && focusedNode.data.extreme_isparentitem === true) {
            // Make this new row a child of the focused parent
            e.data._extreme_parentquoteline_value = focusedRowKey;
          }
        }

        if (!isAddingSet) {
          e.data.extreme_isparentitem = false;
          e.data.extreme_margin = defaultMargin;
          e.data.extreme_discount = 0;
          e.data.extreme_supplierdiscount = 0;
          treeList.columnOption("_extreme_vatsetting_value", "validationRules", [
            { type: "required" },
          ]);
        } else {
          e.data.extreme_isparentitem = true;
          treeList.columnOption(
            "_extreme_vatsetting_value",
            "validationRules",
            null
          );
        }
      },
      onRowInserted: async function (e) {
        console.log("onRowInserted called");
        console.log("e.data:", e.data);
        console.log("e.key:", e.key);
        console.log("extreme_isparentitem:", e.data.extreme_isparentitem);
        console.log("_productid_value:", e.data._productid_value);
        console.log("productid:", e.data.productid);

        // If inserting parent item (set) with existing product, create child items
        // Check both _productid_value and productid fields
        const productId = e.data._productid_value || e.data.productid;
        
        if (
          e.data.extreme_isparentitem === true &&
          productId &&
          isGuid(productId)
        ) {
          console.log("Creating child items for product:", productId);
          Xrm.Utility.showProgressIndicator("Creating child items...");

          try {
            // Retrieve child products from the product entity
            const childProducts = await Xrm.WebApi.retrieveMultipleRecords(
              "product",
              `?$select=productid,description,_pricelevelid_value,_defaultuomid_value,name,productnumber&$filter=_extreme_parentproduct_value eq ${productId}`
            );

            console.log("Found child products:", childProducts.entities.length);

            // Create quote detail for each child product
            for (let i = 0; i < childProducts.entities.length; i++) {
              const childProduct = childProducts.entities[i];
              const childProductId = childProduct.productid;

              // Get product type and VAT setting
              let productType = null;
              let defaultVatSetting = null;
              let defaultTax = 0;

              const productTypeResult = await Xrm.WebApi.retrieveRecord(
                "product",
                childProductId,
                "?$select=producttypecode"
              );
              productType = productTypeResult.producttypecode;

              if (productType !== null && productType !== undefined && taxPercentOfAccount) {
                const vatSettingResults = await Xrm.WebApi.retrieveMultipleRecords(
                  "extreme_vatsetting",
                  `?$select=extreme_vatsettingid,_extreme_vatgroup_value&$expand=extreme_VATGroup($select=extreme_vat)&$filter=(extreme_producttype eq ${productType} and extreme_customertaxpercentage eq ${taxPercentOfAccount.extreme_tax})`
                );
                if (vatSettingResults.entities.length > 0) {
                  defaultVatSetting = vatSettingResults.entities[0].extreme_vatsettingid;
                  defaultTax = vatSettingResults.entities[0].extreme_VATGroup?.extreme_vat || 0;
                }
              }

              // Get price list and product info
              const productInfo = await Xrm.WebApi.retrieveRecord(
                "product",
                childProductId,
                "?$select=_pricelevelid_value,_defaultuomid_value,name"
              );

              let priceListItemInfo = { entities: [] };
              let classifyLookupsInfo = null;
              let supplierPricePerUnit = 0;

              if (productInfo._pricelevelid_value) {
                priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords(
                  "productpricelevel",
                  `?$select=amount,_transactioncurrencyid_value&$expand=pricelevelid($select=extreme_defaultsalesmargin),transactioncurrencyid($select=isocurrencycode,currencysymbol)&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${childProductId})`
                );

                classifyLookupsInfo = await Xrm.WebApi.retrieveRecord(
                  "product",
                  childProductId,
                  "?$select=producttypecode,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value"
                );
              }

              const priceListMargin =
                priceListItemInfo.entities.length > 0 &&
                priceListItemInfo.entities[0].pricelevelid?.extreme_defaultsalesmargin
                  ? priceListItemInfo.entities[0].pricelevelid.extreme_defaultsalesmargin
                  : defaultMargin;

              const priceListItemAmount =
                priceListItemInfo.entities.length > 0
                  ? priceListItemInfo.entities[0].amount
                  : 0;

              const priceListItemCurrency =
                priceListItemInfo.entities.length > 0
                  ? priceListItemInfo.entities[0].transactioncurrencyid?.currencysymbol
                  : null;

              const priceListItemCurrencyCode =
                priceListItemInfo.entities.length > 0
                  ? priceListItemInfo.entities[0].transactioncurrencyid?.isocurrencycode
                  : null;

              // Apply currency conversion
              if (priceListItemCurrencyCode) {
                const currencyValue = jsonForConverting[priceListItemCurrencyCode] || 1;
                supplierPricePerUnit = priceListItemAmount * currencyValue;
              } else {
                supplierPricePerUnit = priceListItemAmount;
              }

              // Calculate amounts
              const recalcResult = recalculateAmounts({
                quantity: 1,
                supplierPricePerUnit: supplierPricePerUnit,
                supplierDiscount: 0,
                margin: priceListMargin,
                discount: 0,
                TaxPercent: defaultTax || 0,
              });

              // Build record for child quote detail
              const record = {
                "quoteid@odata.bind": `/quotes(${quoteId})`,
                "productid@odata.bind": `/products(${childProductId})`,
                "extreme_ParentQuoteLine@odata.bind": `/quotedetails(${e.key})`,
                extreme_customproductname: childProduct.name,
                extreme_isparentitem: false,
                ispriceoverridden: true,
                quantity: recalcResult.quantity,
                extreme_margin: recalcResult.margin,
                extreme_discount: 0,
                extreme_supplierdiscount: 0,
              };

              if (productInfo._defaultuomid_value) {
                record["uomid@odata.bind"] = `/uoms(${productInfo._defaultuomid_value})`;
              }

              if (productType) record.extreme_producttype = productType;
              if (defaultVatSetting) {
                record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${defaultVatSetting})`;
              }
              if (defaultTax) record.extreme_tax = defaultTax;
              if (classifyLookupsInfo?._extreme_area_value) {
                record["extreme_Area@odata.bind"] = `/extreme_areas(${classifyLookupsInfo._extreme_area_value})`;
              }
              if (classifyLookupsInfo?._extreme_technology_value) {
                record["extreme_Technology@odata.bind"] = `/extreme_technologies(${classifyLookupsInfo._extreme_technology_value})`;
              }
              if (classifyLookupsInfo?._extreme_supplier_value) {
                record["extreme_VendorSupplier@odata.bind"] = `/accounts(${classifyLookupsInfo._extreme_supplier_value})`;
              }
              if (productInfo._pricelevelid_value) {
                record["extreme_pricelist@odata.bind"] = `/pricelevels(${productInfo._pricelevelid_value})`;
              }
              if (priceListItemAmount) {
                record.extreme_pricelistpriceperunit = priceListItemAmount;
              }
              if (priceListItemCurrency) {
                record.extreme_pricelistcurrency = priceListItemCurrency;
              }
              if (supplierPricePerUnit) {
                record.extreme_supplierpriceperunit = supplierPricePerUnit;
              }
              if (recalcResult.pricePerUnit) {
                record.priceperunit = recalcResult.pricePerUnit;
              }
              if (recalcResult.supplierBaseAmount) {
                record.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
              }
              if (recalcResult.pdPerUnit) record.extreme_pd = recalcResult.pdPerUnit;
              if (recalcResult.fullPd) record.extreme_fullpd = recalcResult.fullPd;
              if (recalcResult.fullPriceWithDiscount) {
                record.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
              }
              if (childProduct.description) {
                record.extreme_productdescription = childProduct.description;
              }

              // Create the child quote detail
              console.log("Creating child record:", record);
              const childResult = await Xrm.WebApi.createRecord("quotedetail", record);
              console.log("Child created with ID:", childResult.id);

              // Update with calculated amounts (some fields can't be set on create)
              if (recalcResult.baseAmount || recalcResult.extendedAmount) {
                const updateRecord = {};
                if (recalcResult.baseAmount) {
                  updateRecord.baseamount = parseFloat(recalcResult.baseAmount.toFixed(4));
                }
                if (recalcResult.extendedAmount) {
                  updateRecord.extendedamount = parseFloat(recalcResult.extendedAmount.toFixed(4));
                }
                await Xrm.WebApi.updateRecord("quotedetail", childResult.id, updateRecord);
              }
            }

            Xrm.Utility.closeProgressIndicator();
            
            // Refresh tree list to show new children
            console.log("Refreshing tree list...");
            await treeList.refresh();
          } catch (error) {
            Xrm.Utility.closeProgressIndicator();
            console.error("Error creating child items:", error);
            Xrm.Navigation.openErrorDialog({
              message: "Error creating child items: " + error.message,
            });
          }
        } else {
          console.log("Not creating children - conditions not met");
        }
      },
      onRowUpdated: async function (e) {
        console.log(e);
        
        // Check if this row has a parent - if so, aggregate child values to parent
        const currentRow = treeList.getNodeByKey(e.key);
        if (currentRow && currentRow.parent && currentRow.parent.key) {
          const parentKey = currentRow.parent.key;
          
          // Get all children of the parent
          const parentNode = treeList.getNodeByKey(parentKey);
          const children = parentNode.children;
          
          if (children && children.length > 0) {
            let baseamount_sum = 0;
            let extendedamount_sum = 0;
            let extreme_fullpd_sum = 0;
            let extreme_fullpricewithdiscount_sum = 0;
            let manualdiscountamount_sum = 0;
            let extreme_supplierbaseamount_sum = 0;
            let tax_sum = 0;
            
            children.forEach((child) => {
              const childData = child.data;
              baseamount_sum += childData.baseamount || 0;
              extendedamount_sum += childData.extendedamount || 0;
              extreme_fullpd_sum += childData.extreme_fullpd || 0;
              extreme_fullpricewithdiscount_sum += childData.extreme_fullpricewithdiscount || 0;
              manualdiscountamount_sum += childData.manualdiscountamount || 0;
              extreme_supplierbaseamount_sum += childData.extreme_supplierbaseamount || 0;
              tax_sum += childData.tax || 0;
            });
            
            const avarageDiscountPercent = 
              baseamount_sum > 0 
                ? ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100 
                : 0;
            
            // Update the parent row
            await quotedetailODataStore.update(parentKey, {
              baseamount: parseFloat(baseamount_sum.toFixed(2)),
              extendedamount: parseFloat(extendedamount_sum.toFixed(2)),
              extreme_fullpd: parseFloat(extreme_fullpd_sum.toFixed(2)),
              extreme_fullpricewithdiscount: parseFloat(extreme_fullpricewithdiscount_sum.toFixed(2)),
              manualdiscountamount: parseFloat(manualdiscountamount_sum.toFixed(2)),
              extreme_supplierbaseamount: parseFloat(extreme_supplierbaseamount_sum.toFixed(2)),
              tax: parseFloat(tax_sum.toFixed(2)),
              extreme_discount: parseFloat(avarageDiscountPercent.toFixed(2))
            });
            
            // Refresh to show updated values
            await treeList.refresh();
          }
        }
        
        setTimeout(() => {
          let dataFields = Object.keys(e.data);
          const rowIndex = treeList.getRowIndexByKey(e.key);

          for (let dataField of dataFields) {
            console.log(dataField);
            const cellElement =
              treeList.getCellElement(rowIndex, dataField) == undefined ||
                treeList.getCellElement(rowIndex, dataField) == null
                ? null
                : treeList.getCellElement(rowIndex, dataField)[0];
            console.log(cellElement);
            if (cellElement !== null && cellElement !== undefined) {
              cellElement.style.transition = "font-weight 0.3s ease";
              cellElement.style.fontWeight = "750";
              setTimeout(() => {
                cellElement.style.fontWeight = "400";
              }, 2000);
            }
          }

          const rowElement = treeList.getRowElement(rowIndex)[0];
          const originalBg = rowElement.style.backgroundColor || "";
          rowElement.style.transition = "background-color 0.3s ease";
          rowElement.style.backgroundColor = "#d4edda"; // light green
          setTimeout(() => {
            rowElement.style.backgroundColor = originalBg;
          }, 1000);
        }, 100);
      },
      onSelectionChanged: function (e) {
        console.log(e);
        if (e.selectedRowKeys.length > 0) {
          showDeleteIcon(async () => {
            const selectedKeys = treeList.getSelectedRowKeys();
            if (selectedKeys.length == 0) return;
            for (const [index, key] of selectedKeys.entries()) {
              Xrm.Utility.showProgressIndicator(
                `Deleting ${index + 1} / ${selectedKeys.length}`
              );
              await quotedetailODataStore.remove(key);
            }
            hideDeleteIcon();
            Xrm.Utility.closeProgressIndicator();
            await treeList.refresh();
          });
        } else {
          hideDeleteIcon();
        }
      },
      onContentReady: function (e) {
        console.log(e);
        replaceLoader();
        const parentDoc = parent.document;
        if (parentDoc.getElementById("floating-delete-icon"))
          parentDoc.getElementById("floating-delete-icon").remove();
      },
    })
    .dxTreeList("instance");
});

// Select the gridContainer element and observe changes
wrControl.getContentWindow().then(function (contentWindow) {
  gridContainer = contentWindow.document.getElementById("treeList");
  // Create a MutationObserver instance
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "style" || mutation.type === "childList") {
        // Get the current height of the gridContainer
        const gridContainerHeight = gridContainer.offsetHeight;
        // Set the min-height of the iframe based on the gridContainer's height if it exceeds 200px
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

  // Configuration of the observer
  const config = { attributes: true, childList: true, subtree: true };

  // Start observing the gridContainer for changes
  observer.observe(gridContainer, config);
});

async function transactionCurrencyNotNull(exchangeRatesForm) {
  await Xrm.WebApi.retrieveMultipleRecords(
    "extreme_configuration",
    `?$select=extreme_value,extreme_key&$filter=extreme_key eq 'RSD'`
  ).then(
    async function success(results) {
      // console.log(results);
      var result = results.entities[0];
      // Columns
      var extreme_configurationid = result["extreme_configurationid"]; // Guid
      var extreme_value = result["extreme_value"]; // Text
      var extreme_key = result["extreme_key"]; // Text

      if (exchangeRatesForm.extreme_chfexchangerate) {
        jsonForConverting = {
          EUR: exchangeRatesForm.extreme_euroexchangerate,
          USD: exchangeRatesForm.extreme_dollarexchangerate,
          CHF: exchangeRatesForm.extreme_chfexchangerate,
          RSD: exchangeRatesForm.extreme_rsdexchangerate,
          MKD: exchangeRatesForm.extreme_macedoniandenarexchangerate,
          GBP: exchangeRatesForm.extreme_gbpexchangerate,
        };
      } else {
        jsonForConverting = JSON.parse(extreme_value);

        var record = {};
        record.extreme_euroexchangerate = jsonForConverting["EUR"]; // Decimal
        record.extreme_dollarexchangerate = jsonForConverting["USD"]; // Decimal
        record.extreme_chfexchangerate = jsonForConverting["CHF"]; // Decimal
        record.extreme_rsdexchangerate = jsonForConverting["RSD"]; // Decimal
        record.extreme_macedoniandenarexchangerate = jsonForConverting["MKD"]; // Decimal
        record.extreme_gbpexchangerate = jsonForConverting["GBP"]; // Decimal

        await Xrm.WebApi.updateRecord("quote", `${quoteId}`, record);
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
