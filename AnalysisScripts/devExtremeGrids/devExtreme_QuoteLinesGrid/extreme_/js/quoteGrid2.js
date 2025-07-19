let heightAuto = true;

$(async function () {
  const treeList = $("#treeList").dxTreeList({
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
          setCellValue: async function (newData, value, currentRowData) {
            await Xrm.WebApi.updateRecord("quotedetail", quoteId, {
              "productid@odata.bind": `/products(${value})`,
            });
          },
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
        dataField: "extreme_vatsetting",
        caption: "VAT %",
        width: 60,
        lookup: {
          dataSource: vatSettingDataSource,
          displayExpr: "extreme_VATGroup.extreme_vat",
          valueExpr: "extreme_vatsettingid",
        },
        editorOptions: {
          acceptCustomValue: false,
          searchEnabled: true,
          searchExpr: [
            "extreme_VATGroup.extreme_description",
            "extreme_VATGroup.extreme_code",
            "extreme_VATGroup.extreme_vat",
          ],
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
              .text(data["extreme_VATGroup"]["extreme_description"])
              .appendTo(row);
            $("<div>")
              .addClass("col-2")
              .text(data["extreme_VATGroup"]["extreme_code"])
              .appendTo(row);
            $("<div>")
              .addClass("col-2")
              .text(data["extreme_VATGroup"]["extreme_vat"])
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
        dataField: "extreme_pricelist",
        caption: "Price list",
        width: 130,
        wordWrapEnabled: false,
        lookup: {
          dataSource: productPriceLevelDataSource(),
          displayExpr: "name",
          valueExpr: "id",
        },
        editorOptions: {
          acceptCustomValue: false,
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
        dataField: "extreme_area",
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
        dataField: "extreme_technology",
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
        dataField: "extreme_vendorsupplier",
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
    allowColumnReordering: true,
    allowColumnResizing: true,
    onEditorPreparing: function (e) {
      console.log(e);
      console.log(e.editorOptions.dataSource);
      console.log(e.row.data.productid.productid._value);
      if (e.dataField == "extreme_pricelist") {
        e.editorOptions.dataSource = productPriceLevelDataSource(
          e.row.data.productid.productid._value
        );
      }
    },
  });
});

let gridContainer = null;
// Resize web resource as needed
// const wrControl = Xrm.Page.getControl("WebResource_quoteLinesGrid2");
// wrControl.getContentWindow().then(function (contentWindow) {
//   gridContainer = contentWindow.document.getElementById("treeList");
//   // Create a MutationObserver instance
//   const observer = new MutationObserver((mutations) => {
//     mutations.forEach((mutation) => {
//       if (mutation.attributeName === "style" || mutation.type === "childList") {
//         // Get the current height of the gridContainer
//         const gridContainerHeight = gridContainer.offsetHeight;

//         console.log("gridContainerHeight");
//         console.log(gridContainerHeight);
//         // Set the min-height of the iframe based on the gridContainer's height if it exceeds 200px
//         const iframe = wrControl.getObject();
//         if (heightAuto === true) {
//           if (gridContainerHeight > 250) {
//             iframe.style.minHeight = `${gridContainerHeight + 20}px`;
//           } else {
//             iframe.style.minHeight = "255px";
//           }
//         }
//       }
//     });
//   });

//   // Configuration of the observer
//   const config = { attributes: true, childList: true, subtree: true };

//   // Start observing the gridContainer for changes
//   observer.observe(gridContainer, config);
// });
