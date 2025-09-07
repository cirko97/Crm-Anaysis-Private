// quoteGrid3.js - TreeList sa svim logikama i UX iz quoteGrid.js i popup/multi-delete iz quoteGrid2.js

let heightAuto = true;
let jsonForConverting = {};
let selectedDescriptionItem = null;
let primaryDefaultUnit = "KOM";
let defaultMargin = 0;
let productTypesArray = [];
let vatSettingsArray = [];
let taxPercentOfAccount = { extreme_tax: 20 };
let isAddingSet = null;

// Helper: Provera GUID-a
function isGuid(value) {
    return typeof value === "string" &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

// Helper: Popup za opis proizvoda
function showDescriptionPopup(rowData, onSave) {
    const popupContent = $('<div>').append(
        $('<textarea>')
        .attr('id', 'productDescription')
        .addClass('form-control')
        .css({ width: '100%', height: '80px', resize: 'none' })
        .val(rowData.extreme_productdescription || '')
    );
    const popup = $('<div>').dxPopup({
        title: `Description for ${rowData.extreme_customproductname || ''}`,
        contentTemplate: () => popupContent,
        width: 500,
        height: 200,
        showTitle: true,
        visible: true,
        dragEnabled: false,
        hideOnOutsideClick: true,
        showCloseButton: true,
        toolbarItems: [
            {
                widget: 'dxButton',
                toolbar: 'bottom',
                location: 'before',
                options: {
                    icon: 'save',
                    text: 'Save',
                    onClick: async function() {
                        if (typeof onSave === 'function') {
                            await onSave($('#productDescription').val());
                        }
                        popup.dxPopup('instance').hide();
                    }
                }
            },
            {
                widget: 'dxButton',
                toolbar: 'bottom',
                location: 'after',
                options: {
                    text: 'Close',
                    onClick: function() {
                        popup.dxPopup('instance').hide();
                    }
                }
            }
        ]
    });
    popup.appendTo('body');
}

// Helper: Floating delete ikonica
function showDeleteIcon(onDelete) {
    // Prikaz custom floating ikone, pozovi onDelete() na klik
    // (implementacija po potrebi, ili koristi default DevExtreme delete)
    if (typeof onDelete === 'function') onDelete();
}

// Helper: Rekalkulacija (stub, koristi svoju implementaciju)
function recalculateAmounts(args) {
    // Ova funkcija treba da vrati objekat sa svim recalculated vrednostima
    // Primer:
    return {
        margin: args.margin,
        quantity: args.quantity,
        supplierPricePerUnit: args.supplierPricePerUnit,
        supplierBaseAmount: args.supplierPricePerUnit * args.quantity,
        pricePerUnit: args.supplierPricePerUnit * (1 + (args.margin || 0) / 100),
        baseAmount: args.supplierPricePerUnit * args.quantity * (1 + (args.margin || 0) / 100),
        fullPriceWithDiscount: args.supplierPricePerUnit * args.quantity * (1 - (args.discount || 0) / 100),
        manualDiscountAmount: args.supplierPricePerUnit * args.quantity * (args.discount || 0) / 100,
        tax: args.supplierPricePerUnit * args.quantity * (args.TaxPercent || 0) / 100,
        extendedAmount: args.supplierPricePerUnit * args.quantity * (1 + (args.TaxPercent || 0) / 100),
        pdPerUnit: 0,
        fullPd: 0,
        discountPercentage: args.discount || 0,
        supplierDiscountPercentage: args.supplierDiscount || 0
    };
}

// Helper: Sabiranje child vrednosti na parent (lokalno, bez CRM update-a)
function updateParentSumsLocal(treeList, parentKey) {
    const children = treeList.getVisibleRows()
        .filter(r => r.data && r.data._extreme_parentquoteline_value === parentKey);
    if (!children.length) return;
    let sumBaseAmount = 0,
        sumExtendedAmount = 0,
        sumFullPd = 0,
        sumFullPriceWithDiscount = 0,
        sumManualDiscount = 0,
        sumSupplierBaseAmount = 0,
        sumTax = 0;
    children.forEach(child => {
        sumBaseAmount += child.data.baseamount || 0;
        sumExtendedAmount += child.data.extendedamount || 0;
        sumFullPd += child.data.extreme_fullpd || 0;
        sumFullPriceWithDiscount += child.data.extreme_fullpricewithdiscount || 0;
        sumManualDiscount += child.data.manualdiscountamount || 0;
        sumSupplierBaseAmount += child.data.extreme_supplierbaseamount || 0;
        sumTax += child.data.tax || 0;
    });
    let avgDiscount = sumBaseAmount ? ((sumBaseAmount - sumFullPriceWithDiscount) / sumBaseAmount) * 100 : 0;
    treeList.cellValue(parentKey, "baseamount", sumBaseAmount);
    treeList.cellValue(parentKey, "extendedamount", sumExtendedAmount);
    treeList.cellValue(parentKey, "extreme_fullpd", sumFullPd);
    treeList.cellValue(parentKey, "extreme_fullpricewithdiscount", sumFullPriceWithDiscount);
    treeList.cellValue(parentKey, "manualdiscountamount", sumManualDiscount);
    treeList.cellValue(parentKey, "extreme_supplierbaseamount", sumSupplierBaseAmount);
    treeList.cellValue(parentKey, "tax", sumTax);
    treeList.cellValue(parentKey, "extreme_discount", avgDiscount);
}

// Nastavak: inicijalizacija TreeList-a, kolone, toolbar, eventi...
// (nastavi na sledeći deo)

$(async function() {
    async function distributeParentToChildrenAndUpdateCRM(treeList, parentKey, field, newValue) {
        const children = treeList.getVisibleRows()
            .filter(r => r.data && r.data._extreme_parentquoteline_value === parentKey);
        if (!children.length) return;
        const oldSum = children.reduce((sum, c) => sum + (c.data[field] || 0), 0);
        if (oldSum === 0) return;
        for (const child of children) {
            const proportion = (child.data[field] || 0) / oldSum;
            const updatedValue = newValue * proportion;
            treeList.cellValue(child.key, field, updatedValue);
            // CRM update za child
            let record = {};
            record[field] = updatedValue;
            await Xrm.WebApi.updateRecord("quotedetail", child.key, record);
        }
    }
    // Pretpostavljamo da su svi OData store-ovi i data source-ovi već definisani u quoteGridODataStores.js

    // Inicijalizuj TreeList
    const treeList = $("#treeList").dxTreeList({
        dataSource: quoteDetailsDataSource,
        keyExpr: "quotedetailid",
        parentIdExpr: "_extreme_parentquoteline_value",
        showRowLines: true,
        showBorders: true,
        autoExpandAll: false,
        selection: { mode: "multiple" },
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
        allowColumnReordering: true,
        allowColumnResizing: true,
        rowDragging: {
            allowDropInsideItem: true,
            allowReordering: true,
            onReorder: async function(e) {
                // Opciono: ažuriraj sequencenumber lokalno
                // (implementiraj po potrebi)
            },
        },
        toolbar: {
            items: [
                {
                    location: "before",
                    widget: "dxButton",
                    options: {
                        icon: "plus",
                        text: "Add new",
                        onClick() { treeList.addRow(); }
                    }
                },
                {
                    location: "before",
                    widget: "dxButton",
                    options: {
                        icon: "trash",
                        text: "Delete selected",
                        onClick() {
                            const selected = treeList.getSelectedRowKeys();
                            selected.forEach(key => treeList.deleteRow(treeList.getRowIndexByKey(key)));
                        }
                    }
                }
            ]
        },
        columns: [
            {
                dataField: "sequencenumber",
                caption: "Order",
                dataType: "number",
                sortOrder: "asc",
                visible: false
            },
            {
                dataField: "productid",
                caption: "Product ID",
                width: 150,
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
                    itemTemplate: function(data, index, container) {
                        var row = $("<div>").addClass("row text-wrap");
                        var containerFluid = $("<div>").addClass("container-fluid");
                        $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
                        $("<div>").addClass("col-9").text(data["name"]).appendTo(row);
                        row.appendTo(containerFluid);
                        container.append(containerFluid);
                    }
                },
                setCellValue: async function(newData, value, currentRowData) {
                    // Ovdje ide kompletna logika iz quoteGrid.js za setovanje producta
                    // (možeš koristiti recalculateAmounts i lookup-ove kao u starom gridu)
                    // Primer:
                    newData.productid = value;
                    // ... (pozovi recalculateAmounts i popuni ostala polja kao u quoteGrid.js)
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
                dataField: "extreme_productdescription",
                caption: "Description",
                dataType: "string",
                visible: false
            },
            {
                dataField: "quantity",
                caption: "Qty",
                dataType: "number",
                width: 44,
                setCellValue: async function(newData, value, currentRowData) {
                    newData.quantity = value;
                    // Pozovi recalculateAmounts i popuni ostala polja kao u quoteGrid.js
                    if (
                        currentRowData.extreme_margin !== null &&
                            currentRowData.extreme_supplierpriceperunit !== null &&
                            currentRowData.extreme_supplierdiscount !== null &&
                            currentRowData.extreme_discount !== null &&
                            currentRowData.extreme_tax !== null &&
                            currentRowData.priceperunit !== null &&
                            value !== null
                    ) {
                        const recalcResult = recalculateAmounts({
                            quantity: value,
                            supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                            supplierDiscount: currentRowData.extreme_supplierdiscount,
                            margin: currentRowData.extreme_margin,
                            discount: currentRowData.extreme_discount,
                            TaxPercent: currentRowData.extreme_tax
                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;
                    }
                }
            },
            {
                dataField: "uomid",
                caption: "Unit",
                width: 60,
                lookup: {
                    dataSource: uomDataSource,
                    displayExpr: "name",
                    valueExpr: "uomid"
                },
                editorOptions: {
                    acceptCustomValue: true,
                    searchEnabled: true
                }
            },
            {
                dataField: "extreme_pricelistpriceperunit",
                caption: "Original PPU",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "extreme_pricelistcurrency",
                caption: "Original Currency",
                dataType: "string",
                allowEditing: false
            },
            {
                dataField: "extreme_supplierpriceperunit",
                caption: "PPU",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                setCellValue: async function(newData, value, currentRowData) {
                    // Pozovi recalculateAmounts i popuni ostala polja kao u quoteGrid.js
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
                            TaxPercent: currentRowData.extreme_tax
                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;
                    }
                }
            },
            {
                dataField: "extreme_supplierbaseamount",
                caption: "Base Amount",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "extreme_supplierdiscount",
                caption: "Supplier Disc. %",
                dataType: "number",
                width: 70,
                format: { type: "fixedPoint", precision: 2 },
                setCellValue: async function(newData, value, currentRowData) {
                    // Pozovi recalculateAmounts i popuni ostala polja kao u quoteGrid.js
 
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
                                TaxPercent: currentRowData.extreme_tax
                            });

                            newData.extreme_margin = recalcResult.margin;
                            newData.quantity = recalcResult.quantity;
                            newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                            newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                            newData.priceperunit = recalcResult.pricePerUnit;
                            newData.baseamount = recalcResult.baseAmount;
                            newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                            newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                            newData.tax = recalcResult.tax;
                            newData.extendedamount = recalcResult.extendedAmount;
                            newData.extreme_pd = recalcResult.pdPerUnit;
                            newData.extreme_fullpd = recalcResult.fullPd;
                            newData.extreme_discount = recalcResult.discountPercentage;
                            newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;
                        }
                    }
                
            },
            {
                dataField: "extreme_margin",
                caption: "Margin",
                dataType: "number",
                width: 64,
                format: { type: "fixedPoint", precision: 2 },
                setCellValue: async function(newData, value, currentRowData) {
                    // Pozovi recalculateAmounts i popuni ostala polja kao u quoteGrid.js
                    newData.extreme_margin = value;
                    if (
                        currentRowData.extreme_supplierpriceperunit !== null &&
                            currentRowData.priceperunit !== null &&
                            currentRowData.quantity !== null &&
                            currentRowData.extreme_discount !== null &&
                            currentRowData.extreme_tax !== null
                    ) {
                        const recalcResult = recalculateAmounts({
                            quantity: currentRowData.quantity,
                            supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                            supplierDiscount: currentRowData.extreme_supplierdiscount,
                            margin: value,
                            discount: currentRowData.extreme_discount,
                            TaxPercent: currentRowData.extreme_tax
                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;
                    }
                }
            },
            {
                dataField: "priceperunit",
                caption: "Sales PPU",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                setCellValue: async function(newData, value, currentRowData) {
                    // Pozovi recalculateAmounts i popuni ostala polja kao u quoteGrid.js
                    if (
                        currentRowData.quantity !== null &&
                            currentRowData.extreme_discount !== null &&
                            currentRowData.extreme_tax !== null &&
                            currentRowData.extreme_margin
                    ) {
                        const recalcResult = recalculateAmounts({
                            quantity: currentRowData.quantity,
                            supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                            supplierDiscount: currentRowData.extreme_supplierdiscount,
                            margin: currentRowData.extreme_margin,
                            discount: currentRowData.extreme_discount,
                            TaxPercent: currentRowData.extreme_tax,
                            pricePerUnit: value
                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;
                    }
                }
            },
            {
                dataField: "baseamount",
                caption: "Sales Amount",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "extreme_discount",
                caption: "Disc. %",
                dataType: "number",
                width: 62,
                format: { type: "fixedPoint", precision: 2 },
                setCellValue: async function(newData, value, currentRowData) {
                    // Pozovi recalculateAmounts i popuni ostala polja kao u quoteGrid.js
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
                                TaxPercent: currentRowData.extreme_tax
                            });

                            newData.extreme_margin = recalcResult.margin;
                            newData.quantity = recalcResult.quantity;
                            newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                            newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                            newData.priceperunit = recalcResult.pricePerUnit;
                            newData.baseamount = recalcResult.baseAmount;
                            newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                            newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                            newData.tax = recalcResult.tax;
                            newData.extendedamount = recalcResult.extendedAmount;
                            newData.extreme_pd = recalcResult.pdPerUnit;
                            newData.extreme_fullpd = recalcResult.fullPd;
                            newData.extreme_discount = recalcResult.discountPercentage;
                            newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;
                        }
                    } else {
                        newData.extreme_discount = value;
                    }
                }
            },
            {
                dataField: "manualdiscountamount",
                caption: "Discount Amount",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "extreme_fullpricewithdiscount",
                caption: "Amount",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                setCellValue: async function(newData, value, currentRowData) {
                    // Pozovi recalculateAmounts i popuni ostala polja kao u quoteGrid.js
                    newData.extreme_fullpricewithdiscount = value;
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
                            fullPriceWithDiscount: value
                        });

                        newData.extreme_margin = recalcResult.margin;
                        newData.quantity = recalcResult.quantity;
                        newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                        newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        newData.priceperunit = recalcResult.pricePerUnit;
                        newData.baseamount = recalcResult.baseAmount;
                        newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                        newData.tax = recalcResult.tax;
                        newData.extendedamount = recalcResult.extendedAmount;
                        newData.extreme_pd = recalcResult.pdPerUnit;
                        newData.extreme_fullpd = recalcResult.fullPd;
                        newData.extreme_discount = recalcResult.discountPercentage;
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;
                    }
                }
            },
            {
                dataField: "extreme_vatsetting",
                caption: "VAT %",
                width: 60,
                lookup: {
                    dataSource: customVatSettingStore,
                    displayExpr: "varPercentFormat", // ili "extreme_vat" ako nemaš varPercentFormat
                    valueExpr: "extreme_vatsettingid"
                },
                setCellValue: async function(newData, value, currentRowData) {
                    newData.extreme_vatsetting = value;

                    // Učitaj podatke o VAT settingu iz OData store-a (ako već nemaš u memoriji)
                    let vatObj = null;
                    if (Array.isArray(vatSettingsArray) && vatSettingsArray.length > 0) {
                        vatObj =
                            vatSettingsArray.find(item => item.id === value || item.extreme_vatsettingid === value);
                    }
                    if (!vatObj && customVatSettingStore) {
                        // fallback: pokušaj da učitaš iz OData store-a
                        try {
                            vatObj = await customVatSettingStore.byKey(value);
                        } catch (e) {
                        }
                    }

                    if (vatObj) {
                        newData.extreme_producttype = vatObj.productTypeCode || vatObj.extreme_producttype;
                        newData.extreme_tax = vatObj.vat || vatObj.extreme_vat;
                        const defaultTax = vatObj.vat || vatObj.extreme_vat;

                        if (
                            currentRowData.extreme_margin !== null &&
                                currentRowData.extreme_supplierpriceperunit !== null &&
                                currentRowData.extreme_discount !== null
                        ) {
                            const recalcResult = recalculateAmounts({
                                quantity: currentRowData.quantity,
                                supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                                supplierDiscount: currentRowData.extreme_supplierdiscount,
                                margin: currentRowData.extreme_margin,
                                discount: currentRowData.extreme_discount,
                                TaxPercent: defaultTax
                            });

                            newData.extreme_margin = recalcResult.margin;
                            newData.quantity = recalcResult.quantity;
                            newData.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                            newData.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                            newData.priceperunit = recalcResult.pricePerUnit;
                            newData.baseamount = recalcResult.baseAmount;
                            newData.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                            newData.manualdiscountamount = recalcResult.manualDiscountAmount;
                            newData.tax = recalcResult.tax;
                            newData.extendedamount = recalcResult.extendedAmount;
                            newData.extreme_pd = recalcResult.pdPerUnit;
                            newData.extreme_fullpd = recalcResult.fullPd;
                            newData.extreme_discount = recalcResult.discountPercentage;
                            newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;
                        }
                    }
                }
            },
            {
                dataField: "extreme_tax",
                caption: "VAT % calc",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "tax",
                caption: "VAT Amount",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "extreme_pd",
                caption: "Profit Per Unit",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "extreme_fullpd",
                caption: "Gross Profit",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "extendedamount",
                caption: "Total Amount",
                dataType: "number",
                format: { type: "fixedPoint", precision: 2 },
                allowEditing: false
            },
            {
                dataField: "extreme_pricelist",
                caption: "Price list",
                width: 130,
                lookup: {
                    dataSource: productPriceLevelDataSource(),
                    displayExpr: "amount",
                    valueExpr: "productpricelevelid"
                }
            },
            {
                dataField: "_extreme_parentquoteline_value",
                caption: "Parent QL",
                dataType: "string",
                visible: false
            },
            {
                dataField: "extreme_isparentitem",
                caption: "Is Parent",
                dataType: "boolean",
                visible: false
            },
            {
                dataField: "extreme_producttype",
                caption: "Type",
                lookup: {
                    dataSource: productTypesArray,
                    displayExpr: "name",
                    valueExpr: "id"
                },
                visible: false
            },
            {
                dataField: "_extreme_area_value",
                caption: "Area",
                lookup: {
                    dataSource: extremeAreaDataSource,
                    displayExpr: "extreme_name",
                    valueExpr: "extreme_areaid"
                }
            },
            {
                dataField: "_extreme_technology_value",
                caption: "Technology",
                lookup: {
                    dataSource: extremeTechnologyDataSource,
                    displayExpr: "extreme_name",
                    valueExpr: "extreme_technologyid"
                }
            },
            {
                dataField: "_extreme_vendorsupplier_value",
                caption: "Vendor/Supplier",
                lookup: {
                    dataSource: vendorSupplierDataSource,
                    displayExpr: "name",
                    valueExpr: "accountid"
                }
            },
            {
                dataField: "extreme_createasset",
                caption: "Asset?",
                width: 60,
                dataType: "boolean"
            },
            {
                type: "buttons",
                width: 70,
                buttons: [
                    {
                        hint: "Opis",
                        icon: "edit",
                        onClick(e) {
                            showDescriptionPopup(e.row.data,
                                async (desc) => {
                                    e.row.data.extreme_productdescription = desc;
                                    treeList.refresh();
                                });
                        }
                    },
                    "delete"
                ]
            }
        ],
        onRowUpdated: async function(e) {
            // Ako je child, saberi na parentu (lokalno)
            if (e.data._extreme_parentquoteline_value) {
                updateParentSumsLocal(treeList, e.data._extreme_parentquoteline_value);
            }
            // Ako je parent i menja se sabirana kolona, raspodeli na decu i update-uj CRM
            if (!e.data._extreme_parentquoteline_value) {
                // Proveri koje polje je menjano i raspodeli na decu
                // Primer za "baseamount", proširi za ostale sabirane kolone po potrebi
                if (typeof e.data.baseamount !== "undefined") {
                    await distributeParentToChildrenAndUpdateCRM(treeList, e.key, "baseamount", e.data.baseamount);
                }
                // Dodaj i za extendedamount, extreme_fullpd, itd. ako želiš
            }
        },
        onRowInserted: function(e) {
            if (e.data._extreme_parentquoteline_value) {
                updateParentSumsLocal(treeList, e.data._extreme_parentquoteline_value);
            }
        },
        onRowRemoved: function(e) {
            if (e.data._extreme_parentquoteline_value) {
                updateParentSumsLocal(treeList, e.data._extreme_parentquoteline_value);
            }
        },
        onSelectionChanged: function(e) {
            if (e.selectedRowKeys.length > 0) {
                showDeleteIcon(() => {
                    e.selectedRowKeys.forEach(key => treeList.deleteRow(treeList.getRowIndexByKey(key)));
                });
            }
        }
    }).dxTreeList("instance");

    // Opciono: dodatna inicijalizacija, helperi, itd.
});

// Helper: Proporcionalna raspodela iznosa sa parenta na decu (lokalno)
function distributeParentToChildren(treeList, parentKey, field, newValue) {
    const children = treeList.getVisibleRows()
        .filter(r => r.data && r.data._extreme_parentquoteline_value === parentKey);
    if (!children.length) return;
    const oldSum = children.reduce((sum, c) => sum + (c.data[field] || 0), 0);
    if (oldSum === 0) return;
    children.forEach(child => {
        const proportion = (child.data[field] || 0) / oldSum;
        const updatedValue = newValue * proportion;
        treeList.cellValue(child.key, field, updatedValue);
    });
}

// Reordering logika (lokalno, ažurira sequencenumber)
function reorderRows(treeList) {
    const rows = treeList.getVisibleRows();
    let seq = 100;
    rows.forEach(row => {
        treeList.cellValue(row.key, "sequencenumber", seq);
        seq += 100;
    });
}

// Automatsko podešavanje visine iframe-a na osnovu visine grida
function autoResizeIframe() {
    try {
        const wrControl = Xrm.Page.getControl("WebResource_quoteLinesGrid2");
        wrControl.getContentWindow().then(function(contentWindow) {
            const gridContainer = contentWindow.document.getElementById("treeList");
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === "style" || mutation.type === "childList") {
                        const gridContainerHeight = gridContainer.offsetHeight;
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
            const config = { attributes: true, childList: true, subtree: true };
            observer.observe(gridContainer, config);
        });
    } catch (e) {
    }
}

// Pozovi automatsko podešavanje visine na load
autoResizeIframe();

// Dodatni eventi za parent-child logiku i reordering
function setupTreeListEvents(treeList) {
    // Parent-to-child proporcionalna raspodela na izmenu parenta
    treeList.on("cellValueChanged",
        function(e) {
            // Ako je parent i menja se sabirana kolona, raspodeli na decu
            if (e.column &&
            [
                "baseamount", "extendedamount", "extreme_fullpd", "extreme_fullpricewithdiscount",
                "manualdiscountamount", "extreme_supplierbaseamount", "tax"
            ].includes(e.column.dataField)) {
                const row = treeList.getRowByKey(e.key);
                if (row && !row.data._extreme_parentquoteline_value) {
                    distributeParentToChildren(treeList, e.key, e.column.dataField, e.value);
                }
            }
        });

    // Reordering na drag&drop
    treeList.on("rowReordered",
        function() {
            reorderRows(treeList);
        });
}

// Inicijalizuj evente nakon što je TreeList spreman
$(function() {
    const treeList = $("#treeList").dxTreeList("instance");
    if (treeList) {
        setupTreeListEvents(treeList);
    }
});

// --- KRAJ FAJLA ---