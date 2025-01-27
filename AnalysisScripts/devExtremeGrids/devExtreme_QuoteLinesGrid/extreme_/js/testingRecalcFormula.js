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



// Recalculate amounts for each row
function recalculateAmounts(supplierPricePerUnit, margin, discount, supplierDiscount, defaultTax) {
    const taxRate = defaultTax / 100;
    const supplierBaseAmount = supplierPricePerUnit * 1; // Assuming quantity is always 1
    const pricePerUnit = Math.ceil(margin * supplierPricePerUnit);
    const baseAmount = pricePerUnit * 1; // Assuming quantity is always 1
    const fullPriceWithDiscount = pricePerUnit * (1 - discount / 100) * 1; // Assuming quantity is always 1
    const manualDiscountAmount = baseAmount - fullPriceWithDiscount;
    const tax = fullPriceWithDiscount * (1 + taxRate) - fullPriceWithDiscount;
    const extendedAmount = fullPriceWithDiscount + tax;
    const supplierDiscountAmount = supplierPricePerUnit * (supplierDiscount / 100);
    const pricePerUnitWithSupplierDiscount = supplierPricePerUnit - supplierDiscountAmount;
    const customDiscountAmount = pricePerUnit * (discount / 100);
    const pricePerUnitWithCustomDiscount = pricePerUnit - customDiscountAmount;
    const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;
    const fullPd = pdPerUnit * 1; // Assuming quantity is always 1

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
