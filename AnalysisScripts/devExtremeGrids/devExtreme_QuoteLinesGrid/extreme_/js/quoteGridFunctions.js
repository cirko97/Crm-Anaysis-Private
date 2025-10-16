let primaryDefaultUnit;
let defaultMargin;
let taxPercentOfAccount;
let ROUNDING_PRICE_PER_UNIT_CONFIG;
let productTypesArray = [];
let customerId = [];
let formContext;

// Reference to Xrm - will be set when available
// let Xrm;

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

async function loadProductTypes() {
  try {
    const productTypeDefs = await Xrm.Utility.getEntityMetadata("quotedetail", [
      "extreme_producttype",
    ]);

    const objOfObjs =
      productTypeDefs.Attributes._collection.extreme_producttype.OptionSet;
    const arrayOfObjs = Object.keys(objOfObjs).map((key) => objOfObjs[key]);

    const productTypesArray = arrayOfObjs.map((elm) => ({
      id: elm.value,
      name: elm.text,
    }));

    console.log(productTypesArray);
    return productTypesArray;
  } catch (error) {
    console.error("Failed to load product types:", error);
    return [];
  }
}

// Usage
loadProductTypes().then((productTypesArrayResult) => {
  // Do something with the array
  productTypesArray = productTypesArrayResult;
});

function showModal() {
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
    <textarea id="descInput" style="width:100%;height:100px;padding:10px;margin-top:10px;margin-bottom:20px;box-sizing:border-box;font-size:14px;border:1px solid #ccc;border-radius:4px;"></textarea>
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
    if (style && style.parentNode) style.parentNode.removeChild(style);
  };

  cancelBtn.onclick = cleanup;

  saveBtn.onclick = () => {
    const value = textarea.value;
    console.log("Saved description:", value);
    cleanup();
  };
}

function showDeleteModal(onConfirm) {
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
    max-width: 400px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    padding: 20px;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
    animation: fadeIn 0.2s ease-in-out;
  `;

  modal.innerHTML = `
    <h3 style="margin-top:0; font-size: 18px;">Confirm Deletion</h3>
    <p style="font-size: 14px; color: #333;">Are you sure you want to delete this item?</p>
    <div style="text-align: right; margin-top: 20px;">
      <button id="noBtn" style="
        background:#6c757d;
        color:white;
        border:none;
        padding:8px 16px;
        margin-right:10px;
        border-radius:4px;
        cursor:pointer;
      ">No</button>
      <button id="yesBtn" style="
        background:#dc3545;
        color:white;
        border:none;
        padding:8px 16px;
        border-radius:4px;
        cursor:pointer;
      ">Yes</button>
    </div>
  `;

  // Optional keyframes
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

  const cleanup = () => {
    parentDoc.body.removeChild(overlay);
    if (style && style.parentNode) style.parentNode.removeChild(style);
  };

  // Button events
  modal.querySelector("#noBtn").onclick = cleanup;

  modal.querySelector("#yesBtn").onclick = () => {
    cleanup();
    if (typeof onConfirm === "function") {
      onConfirm(); // Call your delete handler here
    }
  };
}

// Inject the floating delete icon
function createFloatingDeleteIcon(onConfirmDelete) {
  const parentDoc = parent.document;

  if (parentDoc.getElementById("floating-delete-icon")) return;

  // Container button
  const icon = parentDoc.createElement("div");
  icon.id = "floating-delete-icon";
  icon.title = "Delete";
  icon.style.cssText = `
    position: fixed;
    width: 50px;
    height: 50px;
    bottom: 30px;
    right: 30px;
    background-color: #dc3545;
    color: white;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    cursor: pointer;
    z-index: 9999;
    transition: transform 0.2s;
  `;
  icon.onmouseover = () => (icon.style.transform = "scale(1.1)");
  icon.onmouseout = () => (icon.style.transform = "scale(1.0)");

  // SVG icon inside
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 24 24">
      <path d="M3 6h18v2H3V6zm2 3h14l-1.4 12.6c-.1.8-.8 1.4-1.6 1.4H8c-.8 0-1.5-.6-1.6-1.4L5 9zm5 2v8h2v-8H10zm4 0v8h2v-8h-2zM9 4V3c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v1h5v2H4V4h5z"/>
    </svg>
  `;

  icon.onclick = () => {
    showDeleteModal(onConfirmDelete);
  };

  parentDoc.body.appendChild(icon);
}

// Show the icon
function showDeleteIcon(onConfirmDelete) {
  const icon = parent.document.getElementById("floating-delete-icon");
  if (icon) {
    icon.style.display = "flex";
  } else {
    createFloatingDeleteIcon(onConfirmDelete);
  }
}

// Hide the icon
function hideDeleteIcon() {
  const icon = parent.document.getElementById("floating-delete-icon");
  if (icon) {
    icon.style.display = "none";
  }
}

function replaceLoader() {
  const wrappers = document.querySelectorAll(".dx-loadpanel-content-wrapper");

  wrappers.forEach((wrapper) => {
    // Clear existing content
    wrapper.innerHTML = "";

    // Create spinner container
    const spinnerContainer = document.createElement("div");
    spinnerContainer.style.display = "flex";
    spinnerContainer.style.flexDirection = "column";
    spinnerContainer.style.alignItems = "center";
    spinnerContainer.style.justifyContent = "center";
    spinnerContainer.style.height = "100%";

    // Create spinner element
    const spinner = document.createElement("div");
    spinner.style.width = "40px";
    spinner.style.height = "40px";
    spinner.style.border = "4px solid #ccc";
    spinner.style.borderTop = "4px solid #0078d4"; // Office blue
    spinner.style.borderRadius = "50%";
    spinner.style.animation = "spin 1s linear infinite";

    // Create label
    const label = document.createElement("div");
    label.textContent = "Loading...";
    label.style.marginTop = "10px";
    label.style.fontSize = "14px";
    label.style.color = "#444";

    // Append elements
    spinnerContainer.appendChild(spinner);
    spinnerContainer.appendChild(label);
    wrapper.appendChild(spinnerContainer);
  });

  // Add CSS keyframes if not already defined
  const style = document.createElement("style");
  style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
  document.head.appendChild(style);
}

// function for checking classify needed rows
const checkClassifyRows = () => {
  classifyNeededRows = 0;

  if (quoteLinesData._array.length > 0) {
    quoteLinesData._array
      .filter(
        (item) =>
          // item.extreme_isparentitem === false &&
          item.extreme_area === null ||
          item.extreme_area === undefined ||
          item.extreme_technology === null ||
          item.extreme_technology === undefined ||
          item.extreme_vendorsupplier === null ||
          item.extreme_vendorsupplier === undefined
      )
      .forEach((item) => {
        classifyNeededRows += 1;
      });
  }

  if (classifyNeededRows > 0) {
    $("#classifyBtn")[0].style.backgroundColor = "#fce3c2";
    $("#classifyBtn")[0].style.display = "inline-flex";
  } else {
    $("#classifyBtn")[0].style.backgroundColor = "#fff";
    $("#classifyBtn")[0].style.display = "none";
  }

  // // console.log('CLASSIFY NEEDED ROWS');
  // // console.log(classifyNeededRows);
};

(async () => {
  // Wait for Xrm to be available
  while (!parent.window.Xrm || !parent.window.Xrm.Page || !parent.window.Xrm.Page._ui || !parent.window.Xrm.Page._ui._formContext) {
    console.log('Waiting for Xrm to be fully loaded...');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Initialize references
  Xrm = parent.window.Xrm;
  formContext = parent.window.Xrm.Page._ui._formContext;
  
  const customerResponse = await Xrm.WebApi.retrieveRecord(
    "quote",
    quoteId,
    "?$select=_customerid_value"
  );
  customerId = customerResponse._customerid_value;
  taxPercentOfAccount = await Xrm.WebApi.retrieveRecord(
    "account",
    customerId,
    "?$select=extreme_tax"
  );
  const responsePrimaryDefaultUnit = await Xrm.WebApi.retrieveMultipleRecords(
    "extreme_configuration",
    "?$select=extreme_value&$filter=extreme_key eq 'PrimaryDefaultUnit'"
  );
  const responseDefaultUomId = await Xrm.WebApi.retrieveMultipleRecords(
    "uom",
    "?$select=uomid&$filter=name eq 'KOM'&$top=1"
  );
  primaryDefaultUnit = responseDefaultUomId.entities[0].uomid;

  const responseDefaultMargin = await Xrm.WebApi.retrieveMultipleRecords(
    "extreme_configuration",
    "?$select=extreme_key,extreme_value&$filter=extreme_key eq 'QUOTE_MARGIN'"
  );
  defaultMargin = parseFloat(
    responseDefaultMargin.entities[0]["extreme_value"]
  );

  const roundInfo = await Xrm.WebApi.retrieveMultipleRecords(
    "extreme_configuration",
    "?$select=extreme_value&$filter=extreme_key eq 'salesAmountRounding'"
  );
  ROUNDING_PRICE_PER_UNIT_CONFIG = roundInfo.entities[0]["extreme_value"];

  const exchangeRatesForm = await Xrm.WebApi.retrieveRecord(
    "quote",
    `${quoteId}`,
    "?$select=extreme_chfexchangerate,extreme_dollarexchangerate,extreme_euroexchangerate,exchangerate,extreme_gbpexchangerate,extreme_macedoniandenarexchangerate,extreme_rsdexchangerate"
  );
  await transactionCurrencyNotNull(exchangeRatesForm);

  console.log(jsonForConverting);
})();
