let heightAuto = true;

$(async function () {
  const treeList = $("#treeList")
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
        onReorder: async function (e) {
          console.log(e);
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
          width: 120,
          calculateDisplayValue: "productid.productnumber",
          lookup: {
            dataSource: productsDataSource,
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

              newData._uomid_value = { _value: primaryDefaultUnit };
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
              newData._uomid_value = { _value: primaryDefaultUnit };
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
                    `?$select=amount,_transactioncurrencyid_value&$expand=pricelevelid($select=extreme_defaultsalesmargin)&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${value?._value})`
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
                newData._extreme_area_value = {
                  _value: classifyLookupsInfo._extreme_area_value,
                };
              if (classifyLookupsInfo._extreme_technology_value)
                newData._extreme_technology_value = {
                  _value: classifyLookupsInfo._extreme_technology_value,
                };
              if (classifyLookupsInfo._extreme_supplier_value)
                newData._extreme_vendorsupplier_value = {
                  _value: classifyLookupsInfo._extreme_supplier_value,
                };
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
            const priceListItemCurrency = null;

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
              newData._uomid_value = {
                _value: productInfo._defaultuomid_value,
              };
            // if (productInfo._pricelevelid_value && !isAddingSet) {
            if (productInfo._pricelevelid_value) {
              if (priceListItemInfo.entities)
                newData._extreme_pricelist_value = {
                  _value: productInfo._pricelevelid_value,
                };
              if (priceListItemInfo.entities)
                newData.extreme_pricelistpriceperunit = priceListItemAmount;
              if (priceListItemInfo.entities)
                newData.extreme_pricelistcurrency = priceListItemCurrency;
              // if (
              //   quoteCurrencySymbol !== priceListItemCurrency &&
              //   priceListItemInfo.entities
              // ) {
              //   newData.extreme_supplierpriceperunit =
              //     priceListItemAmount *
              //     $(
              //       `#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`
              //     ).val();
              //   supplierPricePerUnit =
              //     priceListItemAmount *
              //     $(
              //       `#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`
              //     ).val();
              // } else {
              //   newData.extreme_supplierpriceperunit = priceListItemAmount;
              //   supplierPricePerUnit = priceListItemAmount;
              // }
              newData.extreme_supplierpriceperunit = priceListItemAmount;
              supplierPricePerUnit = priceListItemAmount;
            }

            // isAddingSet negative
            if (
              currentRowData.extreme_margin !== null &&
              currentRowData.extreme_supplierpriceperunit !== null &&
              currentRowData.extreme_supplierdiscount !== null &&
              currentRowData.extreme_discount !== null
            ) {
              const recalcResult = recalculateAmounts({
                quantity: 1,
                supplierPricePerUnit:
                  currentRowData.extreme_supplierpriceperunit,
                supplierDiscount: currentRowData.extreme_supplierdiscount,
                margin: priceListMargin,
                discount: currentRowData.extreme_discount,
                TaxPercent: 20,
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
        },
        {
          dataField: "extreme_margin",
          caption: "Margin",
          dataType: "number",
          width: 64,
        },
        {
          dataField: "priceperunit",
          caption: "Sales PPU",
          dataType: "number",
          cssClass: "cell-highlighted",
          allowEditing: true,
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
        },
        {
          dataField: "_extreme_vatsetting_value",
          caption: "VAT %",
          width: 60,
          lookup: {
            dataSource: customVatSettingStore,
            displayExpr: "extreme_vat",
            valueExpr: "extreme_vatsettingid",
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
                  `${data["extreme_vat"] || data["extreme_vat"] == 0 ? data["extreme_vat"] + " %" : ""}`
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
          calculateDisplayValue:
            "_extreme_pricelist_value@OData.Community.Display.V1.FormattedValue",
          lookup: {
            dataSource: productPriceLevelDataSource(),
            displayExpr:
              "_pricelevelid_value@OData.Community.Display.V1.FormattedValue",
            valueExpr: "_pricelevelid_value",
          },
          editorOptions: {
            acceptCustomValue: false,
            searchEnabled: false,
            // searchExpr: ["productId", "_productid_value@OData.Community.Display.V1.FormattedValue"],
            itemTemplate: function (data, index, container) {
              var containerFluid = $("<div>").addClass("container-fluid");
              var row = $("<div>").addClass("row text-wrap");
              $("<div>")
                .addClass("col-6")
                .text(
                  data[
                    "_pricelevelid_value@OData.Community.Display.V1.FormattedValue"
                  ]
                )
                .appendTo(row);
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
          dataField: "extreme_parentquoteline",
          caption: "Parent QL",
          dataType: "string",
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
            displayExpr: "name",
            valueExpr: "id",
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
            displayExpr: "name",
            valueExpr: "id",
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
            location: "before",
            widget: "dxButton",
            locateInMenu: "auto",
            options: {
              icon: "bulletlist",
              text: "Add existing",
              width: "auto",
              disabled: false,
              // onClick(e) {
              //   // console.log(e);
              //   // console.log(dataGrid);

              //   isAddingSet = false;
              //   // console.log("isAddingSet: ", isAddingSet);

              //   dataGrid.columnOption("productid", "editorOptions", {
              //     acceptCustomValue: false,
              //     // popupWidth: 600,
              //     searchEnabled: true,
              //     // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
              //     searchExpr: ["productnumber", "name"],
              //     itemTemplate: function (data, index, container) {
              //       var row = $("<div>").addClass("row text-wrap");
              //       var containerFluid = $("<div>").addClass("container-fluid");
              //       $("<div>")
              //         .addClass("col-3")
              //         .text(data["productnumber"])
              //         .appendTo(row);
              //       $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
              //       // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
              //       row.appendTo(containerFluid);
              //       container.append(containerFluid);
              //     },
              //     onCustomItemCreating: function (args) {
              //       if (!args.text) {
              //         args.customItem = null;
              //         return;
              //       }

              //       var newItem = {};
              //       newItem.productid = newIdForCustomProducts++;
              //       newItem.name = args.text;
              //       newItem.productnumber = args.text;
              //       customProductsStore.insert(newItem);
              //       args.customItem = newItem;
              //     },
              //     onOpened: function (e) {
              //       heightAuto = false;
              //       if (heightAuto === false) {
              //         const iframeCorrentHeight =
              //           wrControl.getObject().offsetHeight;
              //         if (iframeCorrentHeight < 450) {
              //           wrControl.getObject().style.minHeight = "600px";
              //         }
              //       }
              //       e.component._popup.option("width", 400);
              //     },
              //     onClosed: function (e) {
              //       heightAuto = true;
              //     },
              //     onFocusOut: function (e) {
              //       heightAuto = true;
              //     },
              //   });

              //   dataGrid.columnOption("productid", "lookup", {
              //     dataSource(options) {
              //       let filterQuery = null;

              //       if (options.data) {
              //         options.data.extreme_isparentitem === true
              //           ? (filterQuery = [
              //               ["extreme_isparent", "=", true],
              //               "and",
              //               ["statecode", "=", 0],
              //             ])
              //           : (filterQuery = [
              //               ["extreme_isparent", "<>", true],
              //               "and",
              //               ["statecode", "=", 0],
              //             ]);
              //       }

              //       return {
              //         store: productsODataStore,
              //         // searchExpr: ["productnumber", "name"],
              //         paginate: true,
              //         pageSize: 100,
              //         loadMode: "raw",
              //         filter:
              //           filterQuery === null
              //             ? ["statecode", "=", 0]
              //             : filterQuery,
              //       };
              //     },
              //     displayExpr: "productnumber",
              //     valueExpr: "productid",
              //   });

              //   dataGrid.columnOption(
              //     "extreme_supplierpriceperunit",
              //     "allowEditing",
              //     true
              //   );
              //   dataGrid.columnOption("uomid", "allowEditing", true);
              //   dataGrid.columnOption("uomid", "validationRules", [
              //     { type: "required" },
              //   ]);
              //   dataGrid.columnOption(
              //     "extreme_supplierdiscount",
              //     "allowEditing",
              //     true
              //   );
              //   dataGrid.columnOption("extreme_margin", "allowEditing", true);
              //   dataGrid.columnOption("priceperunit", "allowEditing", true);
              //   dataGrid.columnOption("baseamount", "allowEditing", true);
              //   dataGrid.columnOption("extreme_discount", "allowEditing", true);
              //   dataGrid.columnOption(
              //     "extreme_fullpricewithdiscount",
              //     "allowEditing",
              //     true
              //   );
              //   dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
              //   dataGrid.columnOption(
              //     "extreme_createasset",
              //     "allowEditing",
              //     true
              //   );
              //   dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);

              //   dataGrid.addRow();
              // },
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
                console.log(e);
                treeList.addRow();
              },
              // onClick(e) {
              //   // console.log(e);
              //   // console.log(dataGrid);

              //   isAddingSet = false;
              //   // console.log("isAddingSet: ", isAddingSet);

              //   dataGrid.columnOption("productid", "editorOptions", {
              //     acceptCustomValue: true,
              //     // popupWidth: 600,
              //     searchEnabled: true,
              //     // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
              //     searchExpr: ["productnumber", "name"],
              //     itemTemplate: function (data, index, container) {
              //       var row = $("<div>").addClass("row text-wrap");
              //       var containerFluid = $("<div>").addClass("container-fluid");
              //       $("<div>")
              //         .addClass("col-3")
              //         .text(data["productnumber"])
              //         .appendTo(row);
              //       $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
              //       // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
              //       row.appendTo(containerFluid);
              //       container.append(containerFluid);
              //     },
              //     onCustomItemCreating: function (args) {
              //       if (!args.text) {
              //         args.customItem = null;
              //         return;
              //       }

              //       var newItem = {};
              //       newItem.productid = newIdForCustomProducts++;
              //       newItem.name = args.text;
              //       newItem.productnumber = args.text;
              //       customProductsStore.insert(newItem);
              //       args.customItem = newItem;
              //     },
              //     onOpened: function (e) {
              //       heightAuto = false;
              //       if (heightAuto === false) {
              //         const iframeCorrentHeight =
              //           wrControl.getObject().offsetHeight;
              //         if (iframeCorrentHeight < 450) {
              //           wrControl.getObject().style.minHeight = "600px";
              //         }
              //       }
              //       e.component._popup.option("width", 400);
              //     },
              //     onClosed: function (e) {
              //       heightAuto = true;
              //     },
              //     onFocusOut: function (e) {
              //       heightAuto = true;
              //     },
              //   });

              //   dataGrid.columnOption("productid", "lookup", {
              //     dataSource: {
              //       store: customProductsStore,
              //     },
              //     displayExpr: "productnumber",
              //     valueExpr: "productid",
              //   });

              //   dataGrid.columnOption(
              //     "extreme_supplierpriceperunit",
              //     "allowEditing",
              //     true
              //   );
              //   dataGrid.columnOption("uomid", "allowEditing", true);
              //   dataGrid.columnOption("uomid", "validationRules", [
              //     { type: "required" },
              //   ]);
              //   dataGrid.columnOption(
              //     "extreme_supplierdiscount",
              //     "allowEditing",
              //     true
              //   );
              //   dataGrid.columnOption("extreme_margin", "allowEditing", true);
              //   dataGrid.columnOption("priceperunit", "allowEditing", true);
              //   dataGrid.columnOption("baseamount", "allowEditing", true);
              //   dataGrid.columnOption("extreme_discount", "allowEditing", true);
              //   dataGrid.columnOption(
              //     "extreme_fullpricewithdiscount",
              //     "allowEditing",
              //     true
              //   );
              //   dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
              //   dataGrid.columnOption(
              //     "extreme_createasset",
              //     "allowEditing",
              //     true
              //   );
              //   dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);

              //   dataGrid.addRow();
              // },
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
              icon: "increaseindent",
              text: "Add existing set",
              width: "auto",
              disabled: false,
              // onClick(e) {
              //   // console.log(e);
              //   // console.log(dataGrid);

              //   isAddingSet = true;
              //   // console.log("isAddingSet: ", isAddingSet);

              //   dataGrid.columnOption("productid", "editorOptions", {
              //     acceptCustomValue: false,
              //     // popupWidth: 600,
              //     searchEnabled: true,
              //     // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
              //     searchExpr: ["productnumber", "name"],
              //     itemTemplate: function (data, index, container) {
              //       var row = $("<div>").addClass("row text-wrap");
              //       var containerFluid = $("<div>").addClass("container-fluid");
              //       $("<div>")
              //         .addClass("col-3")
              //         .text(data["productnumber"])
              //         .appendTo(row);
              //       $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
              //       // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
              //       row.appendTo(containerFluid);
              //       container.append(containerFluid);
              //     },
              //     onCustomItemCreating: function (args) {
              //       if (!args.text) {
              //         args.customItem = null;
              //         return;
              //       }

              //       var newItem = {};
              //       newItem.productid = newIdForCustomProducts++;
              //       newItem.name = args.text;
              //       newItem.productnumber = args.text;
              //       customProductsStore.insert(newItem);
              //       args.customItem = newItem;
              //     },
              //     onOpened: function (e) {
              //       heightAuto = false;
              //       if (heightAuto === false) {
              //         const iframeCorrentHeight =
              //           wrControl.getObject().offsetHeight;
              //         if (iframeCorrentHeight < 450) {
              //           wrControl.getObject().style.minHeight = "600px";
              //         }
              //       }
              //       e.component._popup.option("width", 400);
              //     },
              //     onClosed: function (e) {
              //       heightAuto = true;
              //     },
              //     onFocusOut: function (e) {
              //       heightAuto = true;
              //     },
              //   });

              //   dataGrid.columnOption("productid", "lookup", {
              //     dataSource(options) {
              //       let filterQuery = null;

              //       if (options.data) {
              //         options.data.extreme_isparentitem === true
              //           ? (filterQuery = [
              //               ["extreme_isparent", "=", true],
              //               "and",
              //               ["statecode", "=", 0],
              //             ])
              //           : (filterQuery = [
              //               ["extreme_isparent", "<>", true],
              //               "and",
              //               ["statecode", "=", 0],
              //             ]);
              //       }

              //       return {
              //         store: productsODataStore,
              //         // searchExpr: ["productnumber", "name"],
              //         paginate: true,
              //         pageSize: 100,
              //         loadMode: "raw",
              //         filter:
              //           filterQuery === null
              //             ? ["statecode", "=", 0]
              //             : filterQuery,
              //       };
              //     },
              //     displayExpr: "productnumber",
              //     valueExpr: "productid",
              //   });

              //   dataGrid.columnOption(
              //     "extreme_supplierpriceperunit",
              //     "allowEditing",
              //     false
              //   );
              //   // dataGrid.columnOption("uomid", "allowEditing", false);
              //   // dataGrid.columnOption("uomid", "validationRules", null);
              //   dataGrid.columnOption(
              //     "extreme_supplierdiscount",
              //     "allowEditing",
              //     false
              //   );
              //   dataGrid.columnOption("extreme_margin", "allowEditing", false);
              //   dataGrid.columnOption("priceperunit", "allowEditing", false);
              //   dataGrid.columnOption("baseamount", "allowEditing", false);
              //   dataGrid.columnOption("extreme_discount", "allowEditing", false);
              //   dataGrid.columnOption(
              //     "extreme_fullpricewithdiscount",
              //     "allowEditing",
              //     false
              //   );
              //   dataGrid.columnOption("extreme_pricelist", "allowEditing", false);
              //   dataGrid.columnOption(
              //     "extreme_createasset",
              //     "allowEditing",
              //     false
              //   );
              //   dataGrid.columnOption(
              //     "extreme_vatsetting",
              //     "allowEditing",
              //     false
              //   );

              //   dataGrid.addRow();
              // },
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
              text: "Add new set",
              width: "auto",
              disabled: false,
              // onClick(e) {
              //   // console.log(e);
              //   // console.log(dataGrid);

              //   isAddingSet = true;
              //   // console.log("isAddingSet: ", isAddingSet);

              //   dataGrid.columnOption("productid", "editorOptions", {
              //     acceptCustomValue: true,
              //     // popupWidth: 600,
              //     searchEnabled: true,
              //     // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
              //     searchExpr: ["productnumber", "name"],
              //     itemTemplate: function (data, index, container) {
              //       var row = $("<div>").addClass("row text-wrap");
              //       var containerFluid = $("<div>").addClass("container-fluid");
              //       $("<div>")
              //         .addClass("col-3")
              //         .text(data["productnumber"])
              //         .appendTo(row);
              //       $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
              //       // $("<div>").addClass("col-4").text(data["priceListItemAmountFormatted"]).appendTo(row);
              //       row.appendTo(containerFluid);
              //       container.append(containerFluid);
              //     },
              //     onCustomItemCreating: function (args) {
              //       if (!args.text) {
              //         args.customItem = null;
              //         return;
              //       }

              //       var newItem = {};
              //       newItem.productid = newIdForCustomProducts++;
              //       newItem.name = args.text;
              //       newItem.productnumber = args.text;
              //       customProductsStore.insert(newItem);
              //       args.customItem = newItem;
              //     },
              //     onOpened: function (e) {
              //       heightAuto = false;
              //       if (heightAuto === false) {
              //         const iframeCorrentHeight =
              //           wrControl.getObject().offsetHeight;
              //         if (iframeCorrentHeight < 450) {
              //           wrControl.getObject().style.minHeight = "600px";
              //         }
              //       }
              //       e.component._popup.option("width", 400);
              //     },
              //     onClosed: function (e) {
              //       heightAuto = true;
              //     },
              //     onFocusOut: function (e) {
              //       heightAuto = true;
              //     },
              //   });

              //   dataGrid.columnOption("productid", "lookup", {
              //     dataSource: {
              //       store: customProductsStore,
              //     },
              //     displayExpr: "productnumber",
              //     valueExpr: "productid",
              //   });

              //   dataGrid.columnOption(
              //     "extreme_supplierpriceperunit",
              //     "allowEditing",
              //     false
              //   );
              //   // dataGrid.columnOption("uomid", "allowEditing", false);
              //   // dataGrid.columnOption("uomid", "validationRules", null);
              //   dataGrid.columnOption(
              //     "extreme_supplierdiscount",
              //     "allowEditing",
              //     false
              //   );
              //   dataGrid.columnOption("extreme_margin", "allowEditing", false);
              //   dataGrid.columnOption("priceperunit", "allowEditing", false);
              //   dataGrid.columnOption("baseamount", "allowEditing", false);
              //   dataGrid.columnOption("extreme_discount", "allowEditing", false);
              //   dataGrid.columnOption(
              //     "extreme_fullpricewithdiscount",
              //     "allowEditing",
              //     false
              //   );
              //   dataGrid.columnOption("extreme_pricelist", "allowEditing", false);
              //   dataGrid.columnOption(
              //     "extreme_createasset",
              //     "allowEditing",
              //     false
              //   );
              //   dataGrid.columnOption(
              //     "extreme_vatsetting",
              //     "allowEditing",
              //     false
              //   );

              //   dataGrid.addRow();
              // },
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
              // onClick(e) {
              //   // console.log(e);
              //   // console.log(dataGrid);
              //   dataGrid.columnOption(
              //     "extreme_pricelistpriceperunit",
              //     "visible",
              //     false
              //   );
              //   // dataGrid.columnOption('extreme_pricelistcurrency', 'visible', !dataGrid.columnOption('extreme_pricelistcurrency', 'visible'));
              //   dataGrid.columnOption(
              //     "extreme_supplierdiscount",
              //     "visible",
              //     false
              //   );
              //   dataGrid.columnOption("extreme_pd", "visible", false);
              //   dataGrid.columnOption("extreme_fullpd", "visible", false);
              //   dataGrid.columnOption("manualdiscountamount", "visible", false);
              //   dataGrid.columnOption("tax", "visible", false);
              //   // e.component.option('text', dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? 'Extended' : 'Compact');

              //   // reset all columns after classify
              //   if (
              //     $("#classifyBtn").dxButton("instance").option("disabled") ===
              //     true
              //   ) {
              //     // console.log('ALL COLUMNS');
              //     // console.log(dataGrid.option('columns'));
              //     dataGrid.option("columns").forEach((col) => {
              //       if (
              //         col.dataField !== "extreme_pricelistpriceperunit" &&
              //         col.dataField !== "extreme_supplierdiscount" &&
              //         col.dataField !== "extreme_pd" &&
              //         col.dataField !== "extreme_fullpd" &&
              //         col.dataField !== "manualdiscountamount" &&
              //         col.dataField !== "extreme_productdescription" &&
              //         // other columns
              //         col.dataField !== "sequencenumber" &&
              //         col.dataField !== "extreme_pricelistcurrency" &&
              //         col.dataField !== "extreme_tax" &&
              //         col.dataField !== "extreme_parentquoteline" &&
              //         col.dataField !== "extreme_isparentitem" &&
              //         col.dataField !== "extreme_producttype"
              //       ) {
              //         dataGrid.columnOption(col.dataField, "visible", true);
              //       }
              //     });

              //     dataGrid.option("filterValue", [
              //       [
              //         ["extreme_parentquoteline", "=", null],
              //         "and",
              //         ["extreme_isparentitem", "=", false],
              //       ],
              //       "or",
              //       [
              //         ["extreme_parentquoteline", "=", null],
              //         "and",
              //         ["extreme_isparentitem", "=", true],
              //       ],
              //     ]);

              //     // dataGrid.columnOption('extreme_producttype', 'visible', false);
              //     dataGrid.columnOption("extreme_area", "visible", false);
              //     dataGrid.columnOption("extreme_technology", "visible", false);
              //     dataGrid.columnOption(
              //       "extreme_vendorsupplier",
              //       "visible",
              //       false
              //     );
              //   }

              //   $("#extendedBtn").dxButton("instance").option("disabled", false);
              //   $("#classifyBtn").dxButton("instance").option("disabled", false);
              //   e.component.option("disabled", true);
              // },
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
              // onClick(e) {
              //   // console.log(e);
              //   // console.log(dataGrid);
              //   dataGrid.columnOption(
              //     "extreme_pricelistpriceperunit",
              //     "visible",
              //     true
              //   );
              //   // dataGrid.columnOption('extreme_pricelistcurrency', 'visible', !dataGrid.columnOption('extreme_pricelistcurrency', 'visible'));
              //   dataGrid.columnOption(
              //     "extreme_supplierdiscount",
              //     "visible",
              //     true
              //   );
              //   dataGrid.columnOption("extreme_pd", "visible", true);
              //   dataGrid.columnOption("extreme_fullpd", "visible", true);
              //   dataGrid.columnOption("manualdiscountamount", "visible", true);
              //   dataGrid.columnOption("tax", "visible", true);
              //   // e.component.option('text', dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? 'Extended' : 'Compact');

              //   // reset all columns after classify
              //   if (
              //     $("#classifyBtn").dxButton("instance").option("disabled") ===
              //     true
              //   ) {
              //     // console.log('ALL COLUMNS');
              //     // console.log(dataGrid.option('columns'));
              //     dataGrid.option("columns").forEach((col) => {
              //       if (
              //         // col.dataField !== "extreme_pricelistpriceperunit" &&
              //         // col.dataField !== "extreme_supplierdiscount" &&
              //         // col.dataField !== "extreme_pd" &&
              //         // col.dataField !== "extreme_fullpd" &&
              //         // col.dataField !== "manualdiscountamount" &&
              //         col.dataField !== "extreme_productdescription" &&
              //         // other columns
              //         col.dataField !== "sequencenumber" &&
              //         col.dataField !== "extreme_pricelistcurrency" &&
              //         col.dataField !== "extreme_tax" &&
              //         col.dataField !== "extreme_parentquoteline" &&
              //         col.dataField !== "extreme_isparentitem" &&
              //         col.dataField !== "extreme_producttype"
              //       ) {
              //         dataGrid.columnOption(col.dataField, "visible", true);
              //       }
              //     });

              //     dataGrid.option("filterValue", [
              //       [
              //         ["extreme_parentquoteline", "=", null],
              //         "and",
              //         ["extreme_isparentitem", "=", false],
              //       ],
              //       "or",
              //       [
              //         ["extreme_parentquoteline", "=", null],
              //         "and",
              //         ["extreme_isparentitem", "=", true],
              //       ],
              //     ]);

              //     // dataGrid.columnOption('extreme_producttype', 'visible', false);
              //     dataGrid.columnOption("extreme_area", "visible", false);
              //     dataGrid.columnOption("extreme_technology", "visible", false);
              //     dataGrid.columnOption(
              //       "extreme_vendorsupplier",
              //       "visible",
              //       false
              //     );
              //   }

              //   $("#compactBtn").dxButton("instance").option("disabled", false);
              //   $("#classifyBtn").dxButton("instance").option("disabled", false);
              //   e.component.option("disabled", true);
              // },
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
              // onClick(e) {
              //   // console.log(e);
              //   // console.log(dataGrid);
              //   // console.log('GET VISIBLE COLUMNS');
              //   // console.log(dataGrid.getVisibleColumns());
              //   dataGrid.getVisibleColumns().forEach((col) => {
              //     if (
              //       col.dataField !== "productid" &&
              //       col.dataField !== "extreme_customproductname" &&
              //       // col.dataField !== 'extreme_productdescription' &&
              //       col.dataType !== "detailExpand" &&
              //       col.dataType !== "drag"
              //     ) {
              //       // // console.log(col);
              //       dataGrid.columnOption(col.dataField, "visible", false);
              //     }
              //   });

              //   quoteLinesData._array
              //     .filter((item) => item.extreme_isparentitem === true)
              //     .forEach((elm) => {
              //       dataGrid.collapseRow(elm.quotedetailid);
              //     });

              //   dataGrid.option("filterValue", [
              //     // [
              //     //   ["extreme_area", "=", null], "or", ["extreme_area", "=", undefined], "or",
              //     //   ["extreme_technology", "=", null], "or", ["extreme_technology", "=", undefined], "or",
              //     //   ["extreme_vendorsupplier", "=", null], "or", ["extreme_vendorsupplier", "=", undefined]
              //     // ], "and", ["extreme_isparentitem", "=", false]
              //     [
              //       // ["extreme_producttype", "=", null], "or", ["extreme_producttype", "=", undefined], "or",
              //       ["extreme_area", "=", null],
              //       "or",
              //       ["extreme_area", "=", undefined],
              //       "or",
              //       ["extreme_technology", "=", null],
              //       "or",
              //       ["extreme_technology", "=", undefined],
              //       "or",
              //       ["extreme_vendorsupplier", "=", null],
              //       "or",
              //       ["extreme_vendorsupplier", "=", undefined],
              //     ],
              //   ]);

              //   // dataGrid.columnOption('extreme_producttype', 'visible', true);
              //   dataGrid.columnOption("extreme_area", "visible", true);
              //   dataGrid.columnOption("extreme_technology", "visible", true);
              //   dataGrid.columnOption("extreme_vendorsupplier", "visible", true);

              //   $("#compactBtn").dxButton("instance").option("disabled", false);
              //   $("#extendedBtn").dxButton("instance").option("disabled", false);
              //   e.component.option("disabled", true);
              // },
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
                      disabled: !isDraftStatus,
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
                    });
                  // .on("change", async function () {
                  //   Xrm.Utility.showProgressIndicator(
                  //     `Changing exchange rate for ${currency}`
                  //   );
                  //   const newValue = $(this).val();
                  //   // console.log(`New value for ${currency}: ${newValue} ${typeof (newValue)}`);
                  //   switch (currency) {
                  //     case "EUR":
                  //       await Xrm.WebApi.updateRecord(
                  //         "quote",
                  //         `${quoteIdForm}`,
                  //         { extreme_euroexchangerate: parseFloat(newValue) }
                  //       );
                  //       await exchangeRateChange(currency, newValue);

                  //       break;
                  //     case "USD":
                  //       await Xrm.WebApi.updateRecord(
                  //         "quote",
                  //         `${quoteIdForm}`,
                  //         { extreme_dollarexchangerate: parseFloat(newValue) }
                  //       );
                  //       await exchangeRateChange(currency, newValue);

                  //       break;
                  //     case "CHF":
                  //       await Xrm.WebApi.updateRecord(
                  //         "quote",
                  //         `${quoteIdForm}`,
                  //         { extreme_chfexchangerate: parseFloat(newValue) }
                  //       );
                  //       await exchangeRateChange(currency, newValue);

                  //       break;
                  //     case "RSD":
                  //       await Xrm.WebApi.updateRecord(
                  //         "quote",
                  //         `${quoteIdForm}`,
                  //         { extreme_rsdexchangerate: parseFloat(newValue) }
                  //       );
                  //       await exchangeRateChange(currency, newValue);

                  //       break;
                  //     case "MKD":
                  //       await Xrm.WebApi.updateRecord(
                  //         "quote",
                  //         `${quoteIdForm}`,
                  //         {
                  //           extreme_macedoniandenarexchangerate:
                  //             parseFloat(newValue),
                  //         }
                  //       );
                  //       await exchangeRateChange(currency, newValue);

                  //       break;
                  //     case "GBP":
                  //       await Xrm.WebApi.updateRecord(
                  //         "quote",
                  //         `${quoteIdForm}`,
                  //         { extreme_gbpexchangerate: parseFloat(newValue) }
                  //       );
                  //       await exchangeRateChange(currency, newValue);

                  //       break;
                  //     default:
                  //       break;
                  //   }
                  //   Xrm.Utility.closeProgressIndicator();
                  // });

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
        if (e.row.data?.productid?.productid?._value) {
          if (e.dataField == "_extreme_pricelist_value") {
            e.editorOptions.dataSource = productPriceLevelDataSource(
              e.row.data.productid.productid._value
            );
          }
        }
      },
    })
    .dxTreeList("instance");
});

// Select the gridContainer element
let gridContainer;

const wrControl = Xrm.Page.getControl("WebResource_quoteLinesGrid2");
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
