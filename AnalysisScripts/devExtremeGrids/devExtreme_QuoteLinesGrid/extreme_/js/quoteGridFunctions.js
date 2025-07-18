const Xrm = parent.window.Xrm;

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

// Dropdown template cell editor
function dropDownBoxEditorTemplateProducts(cellElement, cellInfo) {
  return $("<div>").dxLookup({
    dataSource: {
      store: productsStore,
      postProcess: function (data) {
        // data.unshift({ productId: "productId", productName: "productName", productDefaultUnit: "productDefaultUnit", disabled: true });
        return data;
      },
    },
    searchEnabled: true,
    displayExpr: function (item) {
      if (item) return item.productId + " " + item.productName;
    },
    valueExpr: "productId",
    searchExpr: ["productId", "productName", "productDefaultUnit"],
    width: 500,
    popupWidth: 500,
    itemTemplate: function (data, index, container) {
      var row = $("<div>").addClass("row-fluid");
      $("<div>").addClass("col-xs-4").text(data["productId"]).appendTo(row);
      $("<div>").addClass("col-xs-4").text(data["productName"]).appendTo(row);
      $("<div>")
        .addClass("col-xs-4")
        .text(data["productDefaultUnit"])
        .appendTo(row);
      container.append(row);
    },
  });
}

// Function to get Inventory Info and display it as pop-up dialog
async function inventoryInfo(productGuid, quoteDetailGuid) {
  const globalContext = Xrm.Utility.getGlobalContext();
  const productName = await Xrm.WebApi.retrieveRecord(
    "product",
    productGuid,
    "?$select=name,productnumber"
  );

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
        message: error.message,
      });
    }
  );
}

// Check if string is guid or not
function isGuid(value) {
  const guidPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return guidPattern.test(value);
}

async function transactionCurrencyNotNull() {
  await Xrm.WebApi.retrieveMultipleRecords(
    "extreme_configuration",
    `?$select=extreme_value,extreme_key&$filter=extreme_key eq '${quoteCurrency}'`
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

        await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, record);
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

// Resize web resource as needed
const wrControl = formContext.getControl("WebResource_quoteLines");
wrControl.getContentWindow().then(function (contentWindow) {
  // // console.log('HEIGHT MAIN CONTAINER:');
  // // console.log(contentWindow.document.getElementById('gridContainer').offsetHeight);
  gridContainer = contentWindow.document.getElementById("gridContainer");
  // // console.log(gridContainer);

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
