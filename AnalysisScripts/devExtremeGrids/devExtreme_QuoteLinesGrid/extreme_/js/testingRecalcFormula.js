const margin = currentRowData.extreme_margin;
const discount = currentRowData.extreme_discount / 100;
const supplierDiscount = currentRowData.extreme_supplierdiscount / 100;
const taxRate = defaultTax / 100;

const supplierBaseAmount = supplierPricePerUnit * 1; // Assuming quantity is always 1

const pricePerUnit = Math.ceil(margin * supplierPricePerUnit);

const baseAmount = pricePerUnit * 1; // Assuming quantity is always 1

const fullPriceWithDiscount = pricePerUnit * (1 - discount) * 1; // Assuming quantity is always 1

const manualDiscountAmount = baseAmount - fullPriceWithDiscount;

const tax = fullPriceWithDiscount * (1 + taxRate) - fullPriceWithDiscount;

const extendedAmount = fullPriceWithDiscount + tax;

const supplierDiscountAmount = supplierPricePerUnit * supplierDiscount;
const pricePerUnitWithSupplierDiscount = supplierPricePerUnit - supplierDiscountAmount;

const customDiscountAmount = pricePerUnit * discount;
const pricePerUnitWithCustomDiscount = pricePerUnit - customDiscountAmount;

const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;

const fullPd = pdPerUnit * 1; // Assuming quantity is always 1



// Recalculate amounts for each row based on changed value
function recalculateAmounts({
    quantity = 1,
    supplierPricePerUnit,
    supplierDiscount,
    margin,
    pricePerUnit = null,
    discount,
    fullPriceWithDiscount = null,
    TaxPercent
}) {
    const taxRate = TaxPercent / 100;
    const supplierBaseAmount = supplierPricePerUnit * quantity;

    // Calculate pricePerUnit if not provided
    if (pricePerUnit === null) {
        pricePerUnit = Math.ceil(margin * supplierPricePerUnit);
    }

    const baseAmount = pricePerUnit * quantity;

    // Calculate fullPriceWithDiscount if not provided
    if (fullPriceWithDiscount === null) {
        fullPriceWithDiscount = pricePerUnit * (1 - discount / 100) * quantity;
    }

    const manualDiscountAmount = baseAmount - fullPriceWithDiscount;
    const tax = fullPriceWithDiscount * taxRate;
    const extendedAmount = fullPriceWithDiscount + tax;
    const supplierDiscountAmount = supplierPricePerUnit * (supplierDiscount / 100);
    const pricePerUnitWithSupplierDiscount = supplierPricePerUnit - supplierDiscountAmount;
    const customDiscountAmount = pricePerUnit * (discount / 100);
    const pricePerUnitWithCustomDiscount = pricePerUnit - customDiscountAmount;
    const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;
    const fullPd = pdPerUnit * quantity;

    return {
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
        fullPd
    };
}

// Example call to the function
const result = recalculateAmounts({
    quantity: 10,
    supplierPricePerUnit: 50,
    supplierDiscount: 5,
    margin: 1.2,
    discount: 10,
    TaxPercent: 20
});

// Manipulate results
console.log(result);
console.log('Extended Amount:', result.extendedAmount);
console.log('Price Per Unit with Custom Discount:', result.pricePerUnitWithCustomDiscount);
