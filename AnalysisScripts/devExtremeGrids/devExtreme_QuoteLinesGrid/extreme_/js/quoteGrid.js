// VARS
let quoteLinesArray = [];
let productsArray = [];
let customProductsArray = [];
let customUnitsArray = [];
let filterForPriceListsQuery = '';
let priceListsArray = [];
let unitsArray = [];
let currenciesArray = [];
let areasArray = [];
let techsArray = [];
// let vensSupsArray = [];
let vatSettingsArray = [];
let productTypesArray = [];
let defaultMargin = 0;
let newCreateId = '';
let newCreatedProductId = '';
let newIdForCustomProducts = 100001;
let newIdForCustomUnits = 200001;
let heightAuto = true;
let isAddingSet = null;
let isDraftStatus = true;
let classifyNeededRows = 0;
let selectedDescriptionItem = null;
let primaryDefaultUnit = "KOM";
let defaultDiscount = 0;

// Track IDs that are currently being deleted to prevent double deletion attempts
let deletingIds = new Set();

// Cache for product info to avoid repeated API calls
const productInfoCache = new Map();
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes cache expiry

// Cache for price list info to avoid repeated API calls
const priceListCache = new Map();

// VAT Settings lookup map for instant access (built from vatSettingsArray)
// Key format: "productType_taxPercent" -> vatSettingId
let vatSettingsLookupMap = new Map();

// Helper function to get cached product info
async function getCachedProductInfo(Xrm, productId, selectFields) {
  const cacheKey = `${productId}_${selectFields}`;
  const cached = productInfoCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY_MS) {
    return cached.data;
  }
  
  const data = await Xrm.WebApi.retrieveRecord("product", `${productId}`, `?$select=${selectFields}`);
  productInfoCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

// Helper function to get cached price list info
async function getCachedPriceListInfo(Xrm, priceListId) {
  const cacheKey = priceListId;
  const cached = priceListCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY_MS) {
    return cached.data;
  }
  
  const data = await Xrm.WebApi.retrieveRecord("pricelevel", `${priceListId}`, "?$select=enddate,statuscode");
  priceListCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

// Get VAT setting instantly from pre-built map (no API call needed)
function getVatSettingFromMap(productType, taxPercent) {
  // Find VAT setting matching BOTH productType AND customerTaxPercentage
  const setting = vatSettingsArray.find(item => 
    item.productTypeCode === productType && item.customerTaxPercentage === taxPercent
  );
  return setting ? setting.id : null;
}

// Build VAT settings lookup map from array for instant access
// Key format: "productType_customerTaxPercentage" -> vatSettingId
function buildVatSettingsLookupMap(taxPercent) {
  vatSettingsLookupMap.clear();
  vatSettingsArray.forEach(item => {
    const key = `${item.productTypeCode}_${item.customerTaxPercentage}`;
    if (!vatSettingsLookupMap.has(key)) {
      vatSettingsLookupMap.set(key, item.id);
    }
  });
}

// Clear all caches when needed (e.g., on form refresh)
function clearAllCaches() {
  productInfoCache.clear();
  priceListCache.clear();
}

// Show toast notification in parent window document
// type: 'success' | 'warning' | 'error' | 'info'
function showParentToast(message, type = 'success', durationMs = 3000) {
  const parentDoc = window.parent.document;
  
  // Remove existing toast if any
  const existingToast = parentDoc.getElementById('customParentToast');
  if (existingToast) existingToast.remove();
  
  // Define colors based on type
  const colors = {
    success: { bg: '#28a745', icon: '✓' },
    warning: { bg: '#ffc107', icon: '⚠', textColor: '#333' },
    error: { bg: '#dc3545', icon: '✕' },
    info: { bg: '#17a2b8', icon: 'ℹ' }
  };
  const config = colors[type] || colors.info;
  
  // Create toast container
  const toast = parentDoc.createElement('div');
  toast.id = 'customParentToast';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${config.bg};
    color: ${config.textColor || '#fff'};
    padding: 14px 20px 14px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    z-index: 9999999;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 400px;
    animation: slideInToast 0.3s ease-out;
  `;
  
  // Add animation styles if not exists
  if (!parentDoc.getElementById('toastAnimationStyles')) {
    const styleEl = parentDoc.createElement('style');
    styleEl.id = 'toastAnimationStyles';
    styleEl.textContent = `
      @keyframes slideInToast {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutToast {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    parentDoc.head.appendChild(styleEl);
  }
  
  // Icon
  const iconSpan = parentDoc.createElement('span');
  iconSpan.textContent = config.icon;
  iconSpan.style.cssText = 'font-size: 18px;';
  
  // Message
  const msgSpan = parentDoc.createElement('span');
  msgSpan.textContent = message;
  msgSpan.style.cssText = 'flex: 1;';
  
  // Close button
  const closeBtn = parentDoc.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = 'cursor: pointer; font-size: 20px; opacity: 0.8; margin-left: 8px;';
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';
  closeBtn.onclick = () => {
    toast.style.animation = 'slideOutToast 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  };
  
  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  toast.appendChild(closeBtn);
  parentDoc.body.appendChild(toast);
  
  // Auto remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideOutToast 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, durationMs);
}

// Show help popup with grid instructions in parent window document
function showHelpPopup() {
  const parentDoc = window.parent.document;
  
  // Language translations
  const translations = {
    srb: {
      title: 'Uputstvo za rad sa Quote Lines gridom',
      closeBtn: 'Zatvori',
      sections: [
        {
          icon: '➕',
          title: 'Dodavanje stavki',
          items: [
            '<strong>Add existing</strong> - Dodaj postojeći proizvod iz kataloga',
            '<strong>Add new</strong> - Kreiraj novu stavku sa prilagođenim nazivom',
            '<strong>Add existing set</strong> - Dodaj postojeći SET proizvod (grupu proizvoda)',
            '<strong>Add new set</strong> - Kreiraj novi SET sa child stavkama',
            '<strong>Batch Add</strong> - Masovno dodavanje više proizvoda odjednom'
          ]
        },
        {
          icon: '✏️',
          title: 'Uređivanje stavki',
          items: [
            'Kliknite na bilo koju ćeliju da je direktno izmenite',
            'Možete menjati: količinu, cenu, popust, maržu, itd.',
            'Kod SET-ova: promena na parent-u se automatski propagira na child stavke',
            'Ikonica <strong>✎</strong> otvara detaljan opis proizvoda',
            'Ikonica <strong>🗑️</strong> briše stavku'
          ]
        },
        {
          icon: '📊',
          title: 'Prikazi grida',
          items: [
            '<strong>Compact</strong> - Prikazuje samo osnovne kolone (ID, Naziv, Količina, Cena, Iznos)',
            '<strong>Extended</strong> - Prikazuje sve kolone uključujući maržu, profit, PDV, itd.',
            '<strong>Classify</strong> - Pomaže u klasifikaciji proizvoda (Area, Technology, Vendor)'
          ]
        },
        {
          icon: '💰',
          title: 'Popust i Exchange Rates',
          items: [
            '<strong>Disc(%)</strong> - Default popust koji se primenjuje na nove stavke',
            'Možete promeniti popust i primeniti ga na sve postojeće stavke',
            '<strong>Exchange Rates</strong> - Postavite kurseve za konverziju cena iz price lista'
          ]
        },
        {
          icon: '🔄',
          title: 'Drag & Drop',
          items: [
            'Prevucite stavke da promenite redosled',
            'Možete prevući stavku u SET da je dodate kao child',
            'Prevucite child iz SET-a van da je učinite samostalnom'
          ]
        },
        {
          icon: '☑️',
          title: 'Selekcija i masovne akcije',
          items: [
            'Koristite checkbox-ove za selekciju više stavki',
            '<strong>Delete Selected</strong> dugme se pojavljuje kada selektujete stavke',
            'Možete selektovati sve pomoću checkbox-a u header-u'
          ]
        },
        {
          icon: '📦',
          title: 'SET-ovi (Grupe proizvoda)',
          items: [
            'SET je parent stavka koja grupiše više child stavki',
            'Kliknite na strelicu levo da proširite/skupite SET',
            'Vrednosti SET-a su automatski zbir child stavki',
            'Promena popusta na SET-u se primenjuje na sve child-ove'
          ]
        }
      ]
    },
    eng: {
      title: 'Guide for working with Quote Lines grid',
      closeBtn: 'Close',
      sections: [
        {
          icon: '➕',
          title: 'Adding items',
          items: [
            '<strong>Add existing</strong> - Add an existing product from the catalog',
            '<strong>Add new</strong> - Create a new item with a custom name',
            '<strong>Add existing set</strong> - Add an existing SET product (product group)',
            '<strong>Add new set</strong> - Create a new SET with child items',
            '<strong>Batch Add</strong> - Bulk add multiple products at once'
          ]
        },
        {
          icon: '✏️',
          title: 'Editing items',
          items: [
            'Click on any cell to edit it directly',
            'You can change: quantity, price, discount, margin, etc.',
            'For SETs: changes on parent automatically propagate to child items',
            'Icon <strong>✎</strong> opens detailed product description',
            'Icon <strong>🗑️</strong> deletes the item'
          ]
        },
        {
          icon: '📊',
          title: 'Grid views',
          items: [
            '<strong>Compact</strong> - Shows only basic columns (ID, Name, Quantity, Price, Amount)',
            '<strong>Extended</strong> - Shows all columns including margin, profit, VAT, etc.',
            '<strong>Classify</strong> - Helps with product classification (Area, Technology, Vendor)'
          ]
        },
        {
          icon: '💰',
          title: 'Discount and Exchange Rates',
          items: [
            '<strong>Disc(%)</strong> - Default discount applied to new items',
            'You can change the discount and apply it to all existing items',
            '<strong>Exchange Rates</strong> - Set exchange rates for price conversion from price lists'
          ]
        },
        {
          icon: '🔄',
          title: 'Drag & Drop',
          items: [
            'Drag items to change their order',
            'You can drag an item into a SET to add it as a child',
            'Drag a child out of a SET to make it standalone'
          ]
        },
        {
          icon: '☑️',
          title: 'Selection and bulk actions',
          items: [
            'Use checkboxes to select multiple items',
            '<strong>Delete Selected</strong> button appears when you select items',
            'You can select all using the checkbox in the header'
          ]
        },
        {
          icon: '📦',
          title: 'SETs (Product groups)',
          items: [
            'SET is a parent item that groups multiple child items',
            'Click on the arrow on the left to expand/collapse SET',
            'SET values are automatically the sum of child items',
            'Changing discount on SET applies to all children'
          ]
        }
      ]
    }
  };
  
  let currentLang = 'srb';
  
  // Remove existing popup if any
  const existingPopup = parentDoc.getElementById('helpPopupOverlay');
  if (existingPopup) existingPopup.remove();
  
  // Create overlay
  const overlay = parentDoc.createElement('div');
  overlay.id = 'helpPopupOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999998;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  `;
  
  // Add animation styles if not exists
  if (!parentDoc.getElementById('helpPopupStyles')) {
    const styleEl = parentDoc.createElement('style');
    styleEl.id = 'helpPopupStyles';
    styleEl.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .help-section { margin-bottom: 16px; }
      .help-section:last-child { margin-bottom: 0; }
      .help-section h4 { 
        margin: 0 0 8px 0; 
        color: #2196F3; 
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .help-section ul { 
        margin: 0; 
        padding-left: 20px;
        color: #555;
        font-size: 13px;
        line-height: 1.6;
      }
      .help-section li { margin-bottom: 4px; }
      .help-icon { font-size: 16px; }
      .lang-toggle {
        display: flex;
        gap: 0;
        margin-right: 15px;
      }
      .lang-btn {
        padding: 4px 10px;
        border: 1px solid rgba(255,255,255,0.5);
        background: transparent;
        color: rgba(255,255,255,0.7);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .lang-btn:first-child {
        border-radius: 4px 0 0 4px;
        border-right: none;
      }
      .lang-btn:last-child {
        border-radius: 0 4px 4px 0;
      }
      .lang-btn.active {
        background: rgba(255,255,255,0.2);
        color: #fff;
        border-color: rgba(255,255,255,0.8);
      }
      .lang-btn:hover:not(.active) {
        background: rgba(255,255,255,0.1);
        color: #fff;
      }
    `;
    parentDoc.head.appendChild(styleEl);
  }
  
  // Create popup
  const popup = parentDoc.createElement('div');
  popup.style.cssText = `
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    width: 600px;
    max-width: 90vw;
    max-height: 85vh;
    overflow: hidden;
    animation: slideUp 0.3s ease-out;
    display: flex;
    flex-direction: column;
  `;
  
  // Header
  const header = parentDoc.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
    color: #fff;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  // Header left side with icon and title
  const headerLeft = parentDoc.createElement('div');
  headerLeft.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  headerLeft.innerHTML = '<span style="font-size: 22px;">📋</span>';
  
  const titleSpan = parentDoc.createElement('span');
  titleSpan.id = 'helpPopupTitle';
  titleSpan.style.cssText = 'font-size: 18px; font-weight: 600;';
  titleSpan.textContent = translations[currentLang].title;
  headerLeft.appendChild(titleSpan);
  
  // Header right side with language toggle and close button
  const headerRight = parentDoc.createElement('div');
  headerRight.style.cssText = 'display: flex; align-items: center;';
  
  // Language toggle
  const langToggle = parentDoc.createElement('div');
  langToggle.className = 'lang-toggle';
  
  const srbBtn = parentDoc.createElement('button');
  srbBtn.className = 'lang-btn active';
  srbBtn.textContent = 'SRB';
  srbBtn.onclick = () => switchLanguage('srb');
  
  const engBtn = parentDoc.createElement('button');
  engBtn.className = 'lang-btn';
  engBtn.textContent = 'ENG';
  engBtn.onclick = () => switchLanguage('eng');
  
  langToggle.appendChild(srbBtn);
  langToggle.appendChild(engBtn);
  headerRight.appendChild(langToggle);
  
  // Close button in header
  const closeBtn = parentDoc.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    font-size: 28px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';
  closeBtn.onclick = () => overlay.remove();
  headerRight.appendChild(closeBtn);
  
  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  
  // Body with scrollable content
  const body = parentDoc.createElement('div');
  body.id = 'helpPopupBody';
  body.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  `;
  
  // Function to render body content
  function renderBody(lang) {
    const t = translations[lang];
    let html = '';
    t.sections.forEach(section => {
      html += `
        <div class="help-section">
          <h4><span class="help-icon">${section.icon}</span> ${section.title}</h4>
          <ul>
            ${section.items.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    });
    return html;
  }
  
  body.innerHTML = renderBody(currentLang);
  
  // Footer
  const footer = parentDoc.createElement('div');
  footer.style.cssText = `
    padding: 12px 20px;
    background: #f8f9fa;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
  `;
  
  const closeFooterBtn = parentDoc.createElement('button');
  closeFooterBtn.id = 'helpPopupCloseBtn';
  closeFooterBtn.textContent = translations[currentLang].closeBtn;
  closeFooterBtn.style.cssText = `
    padding: 10px 24px;
    background: #17a2b8;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  `;
  closeFooterBtn.onmouseover = () => closeFooterBtn.style.background = '#138496';
  closeFooterBtn.onmouseout = () => closeFooterBtn.style.background = '#17a2b8';
  closeFooterBtn.onclick = () => overlay.remove();
  footer.appendChild(closeFooterBtn);
  
  // Function to switch language
  function switchLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    
    // Update title
    parentDoc.getElementById('helpPopupTitle').textContent = t.title;
    
    // Update body
    parentDoc.getElementById('helpPopupBody').innerHTML = renderBody(lang);
    
    // Update close button
    parentDoc.getElementById('helpPopupCloseBtn').textContent = t.closeBtn;
    
    // Update toggle buttons
    srbBtn.className = lang === 'srb' ? 'lang-btn active' : 'lang-btn';
    engBtn.className = lang === 'eng' ? 'lang-btn active' : 'lang-btn';
  }
  
  popup.appendChild(header);
  popup.appendChild(body);
  popup.appendChild(footer);
  overlay.appendChild(popup);
  parentDoc.body.appendChild(overlay);
  
  // Close on Escape key
  const escHandler = (evt) => {
    if (evt.key === 'Escape') {
      overlay.remove();
      parentDoc.removeEventListener('keydown', escHandler);
    }
  };
  parentDoc.addEventListener('keydown', escHandler);
}

// Highlight updated cells/rows for visual feedback
// Usage: highlightUpdatedCells(dataGrid, rowKey, ['fieldName1', 'fieldName2']) - highlights specific cells
// Usage: highlightUpdatedCells(dataGrid, rowKey) - highlights entire row
function highlightUpdatedCells(dataGrid, rowKey, fieldNames = null, durationMs = 2000) {
  try {
    const rowIndex = dataGrid.getRowIndexByKey(rowKey);
    if (rowIndex < 0) return;
    
    const rowElement = dataGrid.getRowElement(rowIndex);
    if (!rowElement || !rowElement[0]) return;
    
    if (fieldNames && fieldNames.length > 0) {
      // Highlight specific cells
      fieldNames.forEach(fieldName => {
        const columnIndex = dataGrid.getVisibleColumnIndex(fieldName);
        if (columnIndex >= 0) {
          const cellElement = dataGrid.getCellElement(rowIndex, columnIndex);
          // getCellElement returns jQuery-like object, access [0] for DOM element
          if (cellElement && cellElement[0]) {
            cellElement[0].classList.add('cell-update-highlight');
            setTimeout(() => {
              if (cellElement[0]) {
                cellElement[0].classList.remove('cell-update-highlight');
              }
            }, durationMs);
          }
        }
      });
    } else {
      // Highlight entire row
      rowElement[0].classList.add('row-update-highlight');
      setTimeout(() => {
        if (rowElement[0]) {
          rowElement[0].classList.remove('row-update-highlight');
        }
      }, durationMs);
    }
  } catch (e) {
    console.log('Highlight error:', e);
  }
}

// Highlight multiple rows at once (for batch operations)
function highlightMultipleRows(dataGrid, rowKeys, fieldNames = null, durationMs = 2000) {
  rowKeys.forEach(rowKey => {
    highlightUpdatedCells(dataGrid, rowKey, fieldNames, durationMs);
  });
}

// Debounce helper function to prevent excessive API calls during typing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Search timeout configuration for lookup fields (ms)
const SEARCH_TIMEOUT_MS = 300;

// Batch processing configuration
const BATCH_SIZE = 25; // Number of parallel API calls per batch

// Helper function to process items in batches with parallel execution
async function processBatchesInParallel(items, asyncOperation, batchSize = BATCH_SIZE) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(asyncOperation));
    results.push(...batchResults);
  }
  return results;
}

async function setClientApiContext(Xrm, formContext) {

  // Optionally set Xrm and formContext as global variables on the page.
  window.Xrm = Xrm;
  window._formContext = formContext;

  // Check if string is guid or not
  function isGuid(value) {
    const guidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return guidPattern.test(value);
  }

  Xrm.Utility.showProgressIndicator('Loading... Please wait...');

  const quoteIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
  const userId = replaceCurlyBrackets(Xrm.Utility.getGlobalContext().userSettings.userId, "");
  
  // Parallel fetch of initial data for better performance
  const [taxPercentOfAccount, quoteInfo, roundInfo] = await Promise.all([
    Xrm.WebApi.retrieveRecord("account", `${replaceCurlyBrackets(formContext.getAttribute('customerid').getValue()[0].id, '')}`, "?$select=extreme_tax"),
    Xrm.WebApi.retrieveRecord("quote", `${quoteIdForm}`, "?$select=statecode,extreme_chfexchangerate,extreme_dollarexchangerate,extreme_euroexchangerate,exchangerate,extreme_gbpexchangerate,extreme_macedoniandenarexchangerate,extreme_rsdexchangerate"),
    Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'salesAmountRounding'")
  ]);
  
  const exchangeRatesForm = quoteInfo;
  const ROUNDING_PRICE_PER_UNIT_CONFIG = roundInfo.entities[0]["extreme_value"];
  isDraftStatus = quoteInfo.statecode === 0 ? true : false;

  formContext.getAttribute('transactioncurrencyid').addOnChange(async () => {
    var record = {};
    record.extreme_chfexchangerate = null; // Decimal
    record.extreme_dollarexchangerate = null; // Decimal
    record.extreme_euroexchangerate = null; // Decimal
    record.extreme_gbpexchangerate = null; // Decimal
    record.extreme_macedoniandenarexchangerate = null; // Decimal
    record.extreme_rsdexchangerate = null; // Decimal

    await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, record).then(
      function success(result) {
        var updatedId = result.id;
        // // console.log(updatedId);
      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  });

  let quoteCurrency = null;
  let quoteCurrencySymbol = null;
  let jsonForConverting = null;
  if (replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '') !== null) {
    await Xrm.WebApi.retrieveRecord("transactioncurrency", `${replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '')}`, "?$select=isocurrencycode,currencysymbol").then(
      function success(result) {
        // // console.log(result);
        // Columns
        var transactioncurrencyid = result["transactioncurrencyid"]; // Guid
        var isocurrencycode = result["isocurrencycode"]; // Text
        var currencysymbol = result["currencysymbol"]; // Text

        quoteCurrency = isocurrencycode;
        quoteCurrencySymbol = currencysymbol;

      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  }

  await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_value&$filter=extreme_key eq 'PrimaryDefaultUnit'").then(
    function success(results) {
      // console.log(results);
      for (var i = 0; i < results.entities.length; i++) {
        var result = results.entities[i];
        // Columns
        var extreme_configurationid = result["extreme_configurationid"]; // Guid
        var extreme_value = result["extreme_value"]; // Text
        primaryDefaultUnit = extreme_value;
      }
    },
    function (error) {
      console.log(error.message);
    }
  );

  await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", "?$select=extreme_key,extreme_value&$filter=extreme_key eq 'QUOTE_MARGIN'").then(
    function success(results) {
      // console.log(results);
      defaultMargin = parseFloat(results.entities[0]["extreme_value"]); // Text
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message
      });
    }
  );

  if (replaceCurlyBrackets(formContext.getAttribute('transactioncurrencyid').getValue()[0].id, '') !== null) {
    await Xrm.WebApi.retrieveMultipleRecords("extreme_configuration", `?$select=extreme_value,extreme_key&$filter=extreme_key eq '${quoteCurrency}'`).then(
      async function success(results) {
        // console.log(results);
        var result = results.entities[0];
        // Columns
        var extreme_configurationid = result["extreme_configurationid"]; // Guid
        var extreme_value = result["extreme_value"]; // Text
        var extreme_key = result["extreme_key"]; // Text

        if (exchangeRatesForm.extreme_chfexchangerate) {
          jsonForConverting = {
            "EUR": exchangeRatesForm.extreme_euroexchangerate,
            "USD": exchangeRatesForm.extreme_dollarexchangerate,
            "CHF": exchangeRatesForm.extreme_chfexchangerate,
            "RSD": exchangeRatesForm.extreme_rsdexchangerate,
            "MKD": exchangeRatesForm.extreme_macedoniandenarexchangerate,
            "GBP": exchangeRatesForm.extreme_gbpexchangerate
          }
        }
        else {
          jsonForConverting = JSON.parse(extreme_value);

          var record = {};
          record.extreme_euroexchangerate = jsonForConverting["EUR"]; // Decimal
          record.extreme_dollarexchangerate = jsonForConverting["USD"]; // Decimal
          record.extreme_chfexchangerate = jsonForConverting["CHF"]; // Decimal
          record.extreme_rsdexchangerate = jsonForConverting["RSD"]; // Decimal
          record.extreme_macedoniandenarexchangerate = jsonForConverting["MKD"]; // Decimal
          record.extreme_gbpexchangerate = jsonForConverting["GBP"]; // Decimal

          await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, record).then(
            function success(result) {
              var updatedId = result.id;
              // console.log(updatedId);
            },
            function (error) {
              Xrm.Navigation.openErrorDialog({
                details: error,
                errorCode: 400,
                message: error.message
              });
            }
          );
        }


        // console.log('jsonForConverting');
        // console.log(jsonForConverting);

      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  }

  // Parallel loading of initial data for better performance
  await Promise.all([
    getProductTypes(),
    getUnits(),
    getCurrencies(),
    getAreas(),
    getTechs(),
    getVatGroups()
  ]);
  
  // Build VAT settings lookup map for instant access (eliminates API calls)
  buildVatSettingsLookupMap(taxPercentOfAccount.extreme_tax);
  
  // These depend on data loaded above
  await getQuoteProducts(quoteIdForm);
  await getPriceLists();

  DevExpress.localization.locale("de");

  initDataGrid(quoteIdForm, userId);

  // Set title for grid inside header
  const quoteLinesDisplayName = await Xrm.Utility.getEntityMetadata('quotedetail').then(
    result => result._displayName,
    error => Xrm.Navigation.openErrorDialog({ details: error, errorCode: 400, message: error.message })
  );
  // setTimeout(() => {
  //   const toolbarBefore = Xrm.Page.getControl("WebResource_quoteLines").getObject().contentWindow.window.document.querySelector('div.dx-toolbar-before');
  //   // console.log('dx toolbar before: ', toolbarBefore);
  //   toolbarBefore.innerHTML = `<span style='font-weight: 500; position: absolute; width: 100px; bottom: 30%; left: 0;'>${quoteLinesDisplayName}</span>`;
  //   // console.log(formContext.data.entity);
  // }, 1000); // Adjust the timeout as needed





  // Optionset values for product types
  async function getProductTypes() {
    productTypesArray = [];

    const productTypeDefs = await Xrm.Utility.getEntityMetadata('quotedetail', ['extreme_producttype']);
    const objOfObjs = productTypeDefs.Attributes._collection.extreme_producttype.OptionSet;
    const arrayOfObjs = Object.keys(objOfObjs).map(key => {
      return objOfObjs[key];
    });

    // console.log(arrayOfObjs);

    arrayOfObjs.forEach(elm => {
      productTypesArray.push({
        "id": elm.value,
        "name": elm.text
      });
    })

    // console.log('PRODUCT TYPES ARRAY');
    // console.log(productTypesArray)
  }

  // Data from DV - Xrm Web Api
  async function getQuoteProducts(quoteId) {

    quoteLinesArray = [];
    customProductsArray = [];
    customUnitsArray = [];
    filterForPriceListsQuery = '';

    await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=_extreme_vatsetting_value,_extreme_vatgroup_value,extreme_producttype,extreme_createasset,_extreme_area_value,_extreme_technology_value,_extreme_vendorsupplier_value,manualdiscountamount,extreme_isparentitem,_extreme_parentquoteline_value,extreme_supplierbaseamount,extreme_supplierpriceperunit,quotedetailid,baseamount,extreme_tax,extendedamount,extreme_discount,_productid_value,_uomid_value,extreme_fullpd,extreme_fullprice,extreme_fullpricewithdiscount,extreme_fullpricerounded,extreme_margin,extreme_customproductname,extreme_pd,_extreme_pricelist_value,extreme_pricelistcurrency,priceperunit,extreme_pricelistpriceperunit,extreme_pricewithdiscount,extreme_customproductid,quantity,extreme_supplierdiscount,tax,isproductoverridden,extreme_productdescription,extreme_uomid,sequencenumber&$expand=productid($select=productnumber)&$filter=_quoteid_value eq ${quoteId}`).then(
      async function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];

          let baseamount_sum = 0;
          let extendedamount_sum = 0;
          let extreme_fullpd_sum = 0;
          let extreme_fullpricewithdiscount_sum = 0;
          let manualdiscountamount_sum = 0;
          let extreme_supplierbaseamount_sum = 0;
          let tax_sum = 0;
          let avarageDiscountPercent = 0;

          var extreme_isparentitem = result["extreme_isparentitem"]; // Boolean
          var quotedetailid = result["quotedetailid"]; // Guid

          if (extreme_isparentitem === true) {
            await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=baseamount,extendedamount,extreme_fullpd,extreme_fullpricewithdiscount,manualdiscountamount,extreme_supplierbaseamount,tax&$filter=_extreme_parentquoteline_value eq ${quotedetailid}`).then(
              function success(results) {
                // console.log(results);
                for (var i = 0; i < results.entities.length; i++) {
                  var result = results.entities[i];
                  // Columns
                  var quotedetailid = result["quotedetailid"]; // Guid
                  var baseamount = result["baseamount"]; // Currency
                  var extendedamount = result["extendedamount"]; // Currency
                  var extreme_fullpd = result["extreme_fullpd"]; // Decimal
                  var extreme_fullpd_formatted = result["extreme_fullpd@OData.Community.Display.V1.FormattedValue"];
                  var extreme_fullpricewithdiscount = result["extreme_fullpricewithdiscount"]; // Decimal
                  var extreme_fullpricewithdiscount_formatted = result["extreme_fullpricewithdiscount@OData.Community.Display.V1.FormattedValue"];
                  var manualdiscountamount = result["manualdiscountamount"]; // Currency
                  var extreme_supplierbaseamount = result["extreme_supplierbaseamount"]; // Decimal
                  var extreme_supplierbaseamount_formatted = result["extreme_supplierbaseamount@OData.Community.Display.V1.FormattedValue"];
                  var tax = result["tax"]; // Currency

                  baseamount_sum += baseamount;
                  extendedamount_sum += extendedamount;
                  extreme_fullpd_sum += extreme_fullpd;
                  extreme_fullpricewithdiscount_sum += extreme_fullpricewithdiscount;
                  manualdiscountamount_sum += manualdiscountamount;
                  extreme_supplierbaseamount_sum += extreme_supplierbaseamount;
                  tax_sum += tax;

                }

                avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;
              },
              function (error) {
                Xrm.Navigation.openErrorDialog({
                  details: error,
                  errorCode: 400,
                  message: error.message
                });
              }
            );
          }

          // Columns
          var baseamount = result["baseamount"]; // Currency
          var extreme_discount = result["extreme_discount"]; // Decimal
          var extreme_discount_formatted = result["extreme_discount@OData.Community.Display.V1.FormattedValue"];
          var productid = result["_productid_value"]; // Lookup
          var productid_formatted = result["_productid_value@OData.Community.Display.V1.FormattedValue"];
          var productid_lookuplogicalname = result["_productid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_fullpd = result["extreme_fullpd"]; // Decimal
          var extreme_fullpd_formatted = result["extreme_fullpd@OData.Community.Display.V1.FormattedValue"];
          var extreme_fullprice = result["extreme_fullprice"]; // Decimal
          var extreme_fullprice_formatted = result["extreme_fullprice@OData.Community.Display.V1.FormattedValue"];
          var extreme_fullpricewithdiscount = result["extreme_fullpricewithdiscount"]; // Decimal
          var extreme_fullpricewithdiscount_formatted = result["extreme_fullpricewithdiscount@OData.Community.Display.V1.FormattedValue"];
          var extreme_fullpricerounded = result["extreme_fullpricerounded"]; // Decimal
          var extreme_fullpricerounded_formatted = result["extreme_fullpricerounded@OData.Community.Display.V1.FormattedValue"];
          var extreme_margin = result["extreme_margin"]; // Decimal
          var extreme_margin_formatted = result["extreme_margin@OData.Community.Display.V1.FormattedValue"];
          var extreme_customproductname = result["extreme_customproductname"]; // Text
          var extreme_pd = result["extreme_pd"]; // Decimal
          var extreme_pd_formatted = result["extreme_pd@OData.Community.Display.V1.FormattedValue"];
          var extreme_pricelist = result["_extreme_pricelist_value"]; // Lookup
          var extreme_pricelist_formatted = result["_extreme_pricelist_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_pricelist_lookuplogicalname = result["_extreme_pricelist_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_pricelistcurrency = result["extreme_pricelistcurrency"]; // Text
          var priceperunit = result["priceperunit"]; // Currency
          var extreme_pricelistpriceperunit = result["extreme_pricelistpriceperunit"]; // Decimal
          var extreme_pricelistpriceperunit_formatted = result["extreme_pricelistpriceperunit@OData.Community.Display.V1.FormattedValue"];
          var extreme_pricewithdiscount = result["extreme_pricewithdiscount"]; // Decimal
          var extreme_pricewithdiscount_formatted = result["extreme_pricewithdiscount@OData.Community.Display.V1.FormattedValue"];
          var extreme_customproductid = result["extreme_customproductid"]; // Text
          var quantity = result["quantity"]; // Decimal
          var quantity_formatted = result["quantity@OData.Community.Display.V1.FormattedValue"];
          var extreme_supplierdiscount = result["extreme_supplierdiscount"]; // Decimal
          var extreme_supplierdiscount_formatted = result["extreme_supplierdiscount@OData.Community.Display.V1.FormattedValue"];
          var tax = result["tax"]; // Currency
          var isproductoverridden = result["isproductoverridden"]; // Boolean
          var isproductoverridden_formatted = result["isproductoverridden@OData.Community.Display.V1.FormattedValue"];
          var extreme_productdescription = result["extreme_productdescription"]; // Multiline Text
          var uomid = result["_uomid_value"]; // Lookup
          var uomid_formatted = result["_uomid_value@OData.Community.Display.V1.FormattedValue"];
          var uomid_lookuplogicalname = result["_uomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_uomid = result["extreme_uomid"]; // Text
          var sequencenumber = result["sequencenumber"]; // Whole Number
          var extendedamount = result["extendedamount"]; // Currency
          var extreme_tax = result["extreme_tax"]; // Decimal
          var extreme_tax_formatted = result["extreme_tax@OData.Community.Display.V1.FormattedValue"];
          var manualdiscountamount = result["manualdiscountamount"]; // Currency
          var extreme_supplierbaseamount = result["extreme_supplierbaseamount"]; // Decimal
          var extreme_supplierbaseamount_formatted = result["extreme_supplierbaseamount@OData.Community.Display.V1.FormattedValue"];
          var extreme_supplierpriceperunit = result["extreme_supplierpriceperunit"]; // Decimal
          var extreme_supplierpriceperunit_formatted = result["extreme_supplierpriceperunit@OData.Community.Display.V1.FormattedValue"];
          var extreme_isparentitem_formatted = result["extreme_isparentitem@OData.Community.Display.V1.FormattedValue"];
          var extreme_parentquoteline = result["_extreme_parentquoteline_value"]; // Lookup
          var extreme_parentquoteline_formatted = result["_extreme_parentquoteline_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_parentquoteline_lookuplogicalname = result["_extreme_parentquoteline_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_area = result["_extreme_area_value"]; // Lookup
          var extreme_area_formatted = result["_extreme_area_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_area_lookuplogicalname = result["_extreme_area_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_technology = result["_extreme_technology_value"]; // Lookup
          var extreme_technology_formatted = result["_extreme_technology_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_technology_lookuplogicalname = result["_extreme_technology_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_vendorsupplier = result["_extreme_vendorsupplier_value"]; // Lookup
          var extreme_vendorsupplier_formatted = result["_extreme_vendorsupplier_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_vendorsupplier_lookuplogicalname = result["_extreme_vendorsupplier_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_createasset = result["extreme_createasset"]; // Boolean
          var extreme_vatgroup = result["_extreme_vatgroup_value"]; // Lookup
          var extreme_vatgroup_formatted = result["_extreme_vatgroup_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_vatgroup_lookuplogicalname = result["_extreme_vatgroup_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_vatsetting = result["_extreme_vatsetting_value"]; // Lookup
          var extreme_vatsetting_formatted = result["_extreme_vatsetting_value@OData.Community.Display.V1.FormattedValue"];
          var extreme_vatsetting_lookuplogicalname = result["_extreme_vatsetting_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var extreme_producttype = result["extreme_producttype"]; // Choice

          if (result.hasOwnProperty("productid") && result["productid"] !== null) {
            var productid_productnumber = result["productid"]["productnumber"]; // Text
          }

          let newCustomIdForUnit = 0;
          if (!uomid && extreme_uomid && !unitsArray.find((item) => item.name === extreme_uomid)) {
            newCustomIdForUnit = newIdForCustomUnits++;
          }

          let varForUomid = null;
          if (uomid) {
            varForUomid = uomid
          }
          else if (unitsArray.find((item) => item.name === extreme_uomid)) {
            varForUomid = unitsArray.find((item) => item.name === extreme_uomid).id
          }
          else {
            varForUomid = newCustomIdForUnit
          }

          quoteLinesArray.push({
            "quotedetailid": quotedetailid,
            "productid": extreme_customproductid ? extreme_customproductid : productid,
            "productnumber": extreme_customproductid ? extreme_customproductid : productid_productnumber,
            "extreme_customproductid": extreme_customproductid,
            "extreme_productdescription": extreme_productdescription,
            "isproductoverridden": isproductoverridden,
            "uomid": varForUomid,
            "extreme_uomid": extreme_uomid,
            "extreme_customproductname": extreme_customproductname,
            "extreme_pricelistpriceperunit": extreme_pricelistpriceperunit,
            "extreme_pricelistcurrency": extreme_pricelistcurrency,
            "priceperunit": extreme_isparentitem === true ? '' : priceperunit,
            "extreme_supplierbaseamount": extreme_isparentitem === true ? extreme_supplierbaseamount_sum.toFixed(2) : extreme_supplierbaseamount,
            "extreme_supplierpriceperunit": extreme_supplierpriceperunit,
            "quantity": quantity,
            "baseamount": extreme_isparentitem === true ? baseamount_sum.toFixed(2) : baseamount,
            "extreme_supplierdiscount": extreme_supplierdiscount,
            "extreme_margin": extreme_margin,
            "extreme_fullpricerounded": extreme_fullpricerounded,
            "extreme_fullprice": extreme_fullprice,
            "extreme_discount": extreme_isparentitem === true ? avarageDiscountPercent.toFixed(2) : extreme_discount,
            "manualdiscountamount": extreme_isparentitem === true ? manualdiscountamount_sum.toFixed(2) : manualdiscountamount,
            "extreme_pricewithdiscount": extreme_pricewithdiscount,
            "extreme_fullpricewithdiscount": extreme_isparentitem === true ? extreme_fullpricewithdiscount_sum.toFixed(2) : extreme_fullpricewithdiscount,
            "extreme_tax": extreme_tax,
            "tax": extreme_isparentitem === true ? tax_sum.toFixed(2) : tax,
            "extreme_pd": extreme_pd,
            "extreme_fullpd": extreme_isparentitem === true ? extreme_fullpd_sum.toFixed(2) : extreme_fullpd,
            "extendedamount": extreme_isparentitem === true ? extendedamount_sum.toFixed(2) : extendedamount,
            "extreme_pricelist": extreme_pricelist,
            "sequencenumber": sequencenumber,
            "extreme_isparentitem": extreme_isparentitem,
            "extreme_parentquoteline": extreme_parentquoteline,
            "extreme_area": extreme_area,
            "extreme_technology": extreme_technology,
            "extreme_vendorsupplier": extreme_vendorsupplier,
            "extreme_createasset": extreme_createasset,
            "extreme_vatsetting": extreme_vatsetting,
            "extreme_producttype": extreme_producttype
          });

          if (formContext.getAttribute('revisionnumber').getValue() > 0) {
            quoteLinesArray.filter(item => item.extreme_parentquoteline).forEach(async elm => {

              if (!quoteLinesArray.find(item => item.quotedetailid === elm.extreme_parentquoteline)) {

                const nameOfParentQL = await Xrm.WebApi.retrieveRecord("quotedetail", `${elm.extreme_parentquoteline}`, "?$select=extreme_customproductname");
                const currentQLParentId = await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=quotedetailid&$filter=(extreme_customproductname eq '${nameOfParentQL.extreme_customproductname}' and _quoteid_value eq ${quoteIdForm})`);

                var record = {};
                record["extreme_ParentQuoteLine@odata.bind"] = `/quotedetails(${currentQLParentId.entities[0].quotedetailid})`; // Lookup
                await Xrm.WebApi.updateRecord("quotedetail", `${elm.quotedetailid}`, record);

                elm.extreme_parentquoteline = currentQLParentId.entities[0].quotedetailid;

              }

            });
          }

          if (!productid) {
            customProductsArray.push({
              "productid": extreme_customproductid,
              "name": extreme_customproductid,
              "productName": extreme_customproductname,
              "productnumber": extreme_customproductid
            });
          }

          if (!uomid && extreme_uomid && !unitsArray.find((item) => item.name === extreme_uomid)) {
            customUnitsArray.push({
              "id": newCustomIdForUnit,
              "name": extreme_uomid
            });
          }

        }

        // console.log('QuoteLinesWithGoodProductId');
        // console.log(quoteLinesArray.filter((item) => isGuid(item.productid)));

        const productIdsForFilter = new Set(quoteLinesArray.filter((item) => isGuid(item.productid)).map(item => item.productid));

        filterForPriceListsQuery = Array.from(productIdsForFilter).map(id => `productid/productid eq ${id}`).join(' or ');

        // console.log(`(${filterForPriceListsQuery})`);


        // console.log('productIdsForFilter');
        // console.log(productIdsForFilter);
        // console.log('filterForPriceListsQuery');
        // console.log(filterForPriceListsQuery);

      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );

  }

  // async function getProductsLookUp() {

  //   let skipTokenExists = true;
  //   let skipToken = '';
  //   productsArray = [];

  //   while (skipTokenExists) {
  //     await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,extreme_isparent,producttypecode,_pricelevelid_value,_defaultuomid_value,name,productnumber${skipToken !== '' ? '&$skiptoken=' + skipToken : ''}`).then(
  //       async function success(results) {
  //         // console.log(results);
  //         results.nextLink ? skipToken = results.nextLink.split('$skiptoken=')[1] : skipToken = ''

  //         // console.log("SKIPTOKEN HERE!!!!");
  //         // console.log(skipToken);
  //         for (var i = 0; i < results.entities.length; i++) {
  //           var result = results.entities[i];
  //           // Columns
  //           var productid = result["productid"]; // Guid
  //           var name = result["name"]; // Text
  //           var productnumber = result["productnumber"]; // Text
  //           var defaultuomid = result["_defaultuomid_value"]; // Lookup
  //           var defaultuomid_formatted = result["_defaultuomid_value@OData.Community.Display.V1.FormattedValue"];
  //           var defaultuomid_lookuplogicalname = result["_defaultuomid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
  //           var pricelevelid = result["_pricelevelid_value"]; // Lookup
  //           var pricelevelid_formatted = result["_pricelevelid_value@OData.Community.Display.V1.FormattedValue"];
  //           var pricelevelid_lookuplogicalname = result["_pricelevelid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
  //           var producttypecode = result["producttypecode"]; // Choice
  //           var extreme_isparent = result["extreme_isparent"]; // Boolean

  //           // const priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$filter=(_pricelevelid_value eq ${pricelevelid} and _productid_value eq ${productid})`);

  //           productsArray.push({
  //             "id": productid,
  //             "name": productnumber ? productnumber + ' - ' + name : name,
  //             "productName": name,
  //             "productId": productnumber,
  //             "productDefaultUnit": defaultuomid,
  //             "pricelevelid": pricelevelid,
  //             "producttypecode": producttypecode,
  //             "extreme_isparent": extreme_isparent
  //           });
  //         }
  //         if (skipToken === '') {
  //           skipTokenExists = false;
  //         }
  //         // console.log(productsArray);
  //       },
  //       function (error) {
  //         Xrm.Navigation.openErrorDialog({
  //           details: error,
  //           errorCode: 400,
  //           message: error.message
  //         });
  //       }
  //     );
  //   }
  // }

  async function getPriceLists() {

    priceListsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value,_pricelevelid_value,_productid_value&$expand=pricelevelid($select=enddate,statuscode)${filterForPriceListsQuery === '' ? '' : `&$filter=(${filterForPriceListsQuery})`}`).then(
      function success(results) {

        // results.nextLink ? skipToken = results.nextLink.split('$skiptoken=')[1] : skipToken = ''
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var productpricelevelid = result["productpricelevelid"]; // Guid
          var amount = result["amount@OData.Community.Display.V1.FormattedValue"]; // Currency
          var amount_num = result["amount"]; // Currency
          var pricelevelid = result["_pricelevelid_value"]; // Lookup
          var pricelevelid_formatted = result["_pricelevelid_value@OData.Community.Display.V1.FormattedValue"];
          var pricelevelid_lookuplogicalname = result["_pricelevelid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var productid = result["_productid_value"]; // Lookup
          var productid_formatted = result["_productid_value@OData.Community.Display.V1.FormattedValue"];
          var productid_lookuplogicalname = result["_productid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
          var transactioncurrencyid = result["_transactioncurrencyid_value"]; // Lookup
          var transactioncurrencyid_formatted = result["_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue"];
          var transactioncurrencyid_lookuplogicalname = result["_transactioncurrencyid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

          // Many To One Relationships
          if (result.hasOwnProperty("pricelevelid") && result["pricelevelid"] !== null) {
            var pricelevelid_enddate = result["pricelevelid"]["enddate"]; // Date Time
            var pricelevelid_enddate_formatted = result["pricelevelid"]["enddate@OData.Community.Display.V1.FormattedValue"];
            var pricelevelid_statuscode = result["pricelevelid"]["statuscode"]; // Status
            var pricelevelid_statuscode_formatted = result["pricelevelid"]["statuscode@OData.Community.Display.V1.FormattedValue"];

            priceListsArray.push({
              "id": pricelevelid,
              "name": pricelevelid_formatted,
              "amount": amount,
              "amount_num": amount_num,
              "currency_code": transactioncurrencyid_formatted,
              "productid": productid,
              "statuscode": pricelevelid_statuscode
            });

          }

        }

        // console.log('priceListsArray');
        // console.log(priceListsArray);

      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }

    );

    // await Xrm.WebApi.retrieveMultipleRecords("pricelevel", "?$select=pricelevelid,name").then(
    //   function success(results) {
    //     // console.log(results);
    //     for (var i = 0; i < results.entities.length; i++) {
    //       var result = results.entities[i];
    //       // Columns
    //       var pricelevelid = result["pricelevelid"]; // Guid
    //       var name = result["name"]; // Text

    //       priceListsArray.push({
    //         "id": pricelevelid,
    //         "name": name
    //       });

    //     }
    //   },
    //   function (error) {
    //     Xrm.Navigation.openErrorDialog({
    //   details: error,
    //     errorCode: 400,
    //       message: error.message
    // });
    //   }
    // );
  }

  async function getUnits() {

    unitsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("uom", "?$select=uomid,name").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var uomid = result["uomid"]; // Guid
          var name = result["name"]; // Text

          unitsArray.push({
            "id": uomid,
            "name": name
          });

        }
      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  }

  async function getCurrencies() {

    currenciesArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("transactioncurrency", "?$select=transactioncurrencyid,isocurrencycode,currencyname,currencyprecision,currencysymbol").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var transactioncurrencyid = result["transactioncurrencyid"]; // Guid
          var isocurrencycode = result["isocurrencycode"]; // Text
          var currencyname = result["currencyname"]; // Text
          var currencyprecision = result["currencyprecision"]; // Whole Number
          var currencyprecision_formatted = result["currencyprecision@OData.Community.Display.V1.FormattedValue"];
          var currencysymbol = result["currencysymbol"]; // Text

          currenciesArray.push({
            transactioncurrencyid: transactioncurrencyid,
            isocurrencycode: isocurrencycode,
            currencyname: currencyname,
            currencyprecision: currencyprecision,
            currencyprecision_formatted: currencyprecision_formatted,
            currencysymbol: currencysymbol
          })

        }
      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  }

  // get areas
  async function getAreas() {

    areasArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_area", "?$select=extreme_areaid,extreme_name").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_areaid = result["extreme_areaid"]; // Guid
          var extreme_name = result["extreme_name"]; // Text

          areasArray.push({
            "id": extreme_areaid,
            "name": extreme_name
          });

        }
      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  }

  // get technologies
  async function getTechs() {

    techsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_technology", "?$select=extreme_technologyid,extreme_name").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_technologyid = result["extreme_technologyid"]; // Guid
          var extreme_name = result["extreme_name"]; // Text

          techsArray.push({
            "id": extreme_technologyid,
            "name": extreme_name
          });

        }
      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );
  }

  // get vat groups
  async function getVatGroups() {

    vatSettingsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_vatsetting", "?$select=extreme_vatsettingid,extreme_producttype,extreme_customertaxpercentage&$expand=extreme_VATGroup($select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat)").then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_vatsettingid = result["extreme_vatsettingid"]; // Guid
          var extreme_producttype = result["extreme_producttype"]; // Choice
          var extreme_producttype_formatted = result["extreme_producttype@OData.Community.Display.V1.FormattedValue"];

          // Many To One Relationships
          if (result.hasOwnProperty("extreme_VATGroup") && result["extreme_VATGroup"] !== null) {
            var extreme_VATGroup_extreme_vatgroupid = result["extreme_VATGroup"]["extreme_vatgroupid"]; // Guid
            var extreme_VATGroup_extreme_code = result["extreme_VATGroup"]["extreme_code"]; // Text
            var extreme_VATGroup_extreme_description = result["extreme_VATGroup"]["extreme_description"]; // Text
            var extreme_VATGroup_extreme_vat = result["extreme_VATGroup"]["extreme_vat"]; // Decimal
            var extreme_VATGroup_extreme_vat_formatted = result["extreme_VATGroup"]["extreme_vat@OData.Community.Display.V1.FormattedValue"];

            vatSettingsArray.push({
              "id": extreme_vatsettingid,
              "idVatGroup": extreme_VATGroup_extreme_vatgroupid,
              "name": extreme_VATGroup_extreme_description,
              "code": extreme_VATGroup_extreme_code,
              "vat": extreme_VATGroup_extreme_vat,
              "varPercentFormat": extreme_VATGroup_extreme_vat + " %",
              "productTypeCode": extreme_producttype,
              "customerTaxPercentage": result["extreme_customertaxpercentage"]
            });

          }
        }
      },
      function (error) {
        Xrm.Navigation.openErrorDialog({
          details: error,
          errorCode: 400,
          message: error.message
        });
      }
    );

    // await Xrm.WebApi.retrieveMultipleRecords("extreme_vatgroup", "?$select=extreme_vatgroupid,extreme_code,extreme_description,extreme_vat").then(
    //   function success(results) {
    //     // console.log(results);
    //     for (var i = 0; i < results.entities.length; i++) {
    //       var result = results.entities[i];
    //       // Columns
    //       var extreme_vatgroupid = result["extreme_vatgroupid"]; // Guid
    //       var extreme_code = result["extreme_code"]; // Text
    //       var extreme_description = result["extreme_description"]; // Text
    //       var extreme_vat = result["extreme_vat"]; // Decimal
    //       var extreme_vat_formatted = result["extreme_vat@OData.Community.Display.V1.FormattedValue"];

    //       vatGroupsArray.push({
    //         "id": extreme_vatgroupid,
    //         "name": extreme_description,
    //         "code": extreme_code,
    //         "vat": extreme_vat,
    //         "varPercentFormat": extreme_vat + " %"
    //       });

    //     }
    //   },
    //   function (error) {
    //     Xrm.Navigation.openErrorDialog({
    //   details: error,
    //     errorCode: 400,
    //       message: error.message
    // });
    //   }
    // );

  }

  // Function to initialize data grid for case lines
  function initDataGrid(quoteIdForm, userId) {
    $(() => {
      const quoteLinesData = new DevExpress.data.ArrayStore({
        key: 'quotedetailid',
        data: [...new Map(quoteLinesArray.map(item => [item.quotedetailid, item])).values()],
      });

      const vendorSupplierODataStore = new DevExpress.data.ODataStore({
        // type: "odata",
        version: 4,
        filterToLower: false,
        url: Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/accounts",
        key: "accountid",
        keyType: "Guid",
        select: [
          'accountid',
          'name',
          'extreme_paname30characters',
          'extreme_relationshiptypeext'
        ],
      });

      const productsODataStore = new DevExpress.data.ODataStore({
        // type: "odata",
        version: 4,
        filterToLower: false,
        url: Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/products",
        key: "productid",
        keyType: "Guid",
        select: [
          'productid',
          'name',
          'productnumber',
          '_defaultuomid_value',
          '_pricelevelid_value',
          'producttypecode',
          'extreme_isparent',
          'statecode'
        ],
      });

      const customProductsStore = new DevExpress.data.ArrayStore({
        key: "productid",
        data: customProductsArray
      });

      // newIdForCustomProducts = 100001
      // // add custom products on init table to lookup field of products if exists
      // if (customProductsArray.length > 0) {
      //   customProductsArray.forEach((e) => {
      //     var newItem = {};
      //     newItem.productid = newIdForCustomProducts++;
      //     newItem.name = e.name;
      //     newItem.productnumber = e.productId
      //     productsODataStore.insert(newItem);
      //   })
      // }

      var unitsStore = new DevExpress.data.ArrayStore({
        key: "id",
        data: unitsArray
      });
      newIdForCustomUnits = 200001;
      if (customUnitsArray.length > 0) {
        customUnitsArray.forEach((e) => {
          var newItem = {};
          newItem.id = newIdForCustomUnits++;
          newItem.name = e.name;
          unitsStore.insert(newItem);
        })
      }

      // let productCurrency = '';

      const dataGrid = $('#gridContainer').dxDataGrid({
        dataSource: {
          store: quoteLinesData,
          reshapeOnPush: true,
          sort: { selector: "sequencenumber", desc: false }
        },

        filterValue: [
          [
            ["extreme_parentquoteline", "=", null],
            "and",
            ["extreme_isparentitem", "=", false]
          ],
          "or",
          [
            ["extreme_parentquoteline", "=", null],
            "and",
            ["extreme_isparentitem", "=", true]
          ],
        ],

        width: "100%",
        wordWrapEnabled: false,
        showColumnLines: true,
        showRowLines: true,
        rowAlternationEnabled: false,
        showBorders: true,
        // headerFilter: {
        //   visible: true,
        //   height: 200
        // },
        paging: {
          pageSize: 100,
        },
        editing: {
          mode: 'cell',
          allowUpdating: isDraftStatus,
          allowAdding: isDraftStatus,
          allowDeleting: isDraftStatus,
          useIcons: true
        },
        sorting: {
          mode: 'none',
        },
        selection: {
          mode: 'multiple',
          showCheckBoxesMode: 'always',
          allowSelectAll: true
        },
        allowColumnResizing: true,
        allowColumnReordering: true,
        columnResizingMode: "mode",
        columnMinWidth: 10,
        columnAutoWidth: false,
        columnHidingEnabled: false,
        scrolling: {
          mode: "standard",
          scrollByContent: true,
          scrollByThumb: true
        },
        rowDragging: {
          allowReordering: isDraftStatus,
          allowDropInsideItem: false,
          showDragIcons: true,
          async onReorder(e) {
            // console.log("reodrering e");
            // console.log(e);

            if (!isDraftStatus) {
              Xrm.Navigation.openAlertDialog({ confirmButtonLabel: "Close", text: "Grid is in read-only mode.", title: "Cannot do that" });
              return;
            }

            const visibleRows = e.component.getVisibleRows();
            const toIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === visibleRows[e.toIndex].data.quotedetailid);
            const fromIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === e.itemData.quotedetailid);

            quoteLinesData._array.splice(fromIndex, 1);
            quoteLinesData._array.splice(toIndex, 0, e.itemData);

            // Batch reorder with Promise.all for performance
            const reorderPromises = [];
            const parentItems = quoteLinesData._array.filter(item => item.extreme_parentquoteline === null);
            const childItems = quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null);

            parentItems.forEach((item, i) => {
              const newSeq = parseInt((i + 1) + "00");
              reorderPromises.push(Xrm.WebApi.updateRecord("quotedetail", `${item.quotedetailid}`, { sequencenumber: newSeq }));
              item.sequencenumber = newSeq;
            });

            childItems.forEach((item, i) => {
              const parentSeq = quoteLinesData._array.find(p => p.quotedetailid === item.extreme_parentquoteline)?.sequencenumber || 0;
              const newSeq = parentSeq + (i + 1);
              reorderPromises.push(Xrm.WebApi.updateRecord("quotedetail", `${item.quotedetailid}`, { sequencenumber: newSeq }));
              item.sequencenumber = newSeq;
            });

            // Execute all reorders in parallel (fire and forget)
            Promise.all(reorderPromises).catch(err => console.warn('Reorder warning:', err));
            e.component.refresh();
          },
          data: "root",
          group: 'QuoteLines',
          onAdd
        },
        masterDetail: {
          enabled: true,
          async template(container, options) {
            const productsData = options.data;
            // console.log('productsData');
            // console.log(productsData);
            // console.log(productsData.sequencenumber);

            // container.css('padding', '0 0 10px 10px');
            container.css('background', '#e5edfe');
            container.css('padding', 0);


            $(`<div id="${productsData.quotedetailid}" class="child-grid">`).css({
              // "padding-bottom": "15px",
              "border-bottom": "1rem solid #b6bdca",
              "border-top": "3px solid #b6bdca",
            }).addClass("internal-grid")
              .dxDataGrid({

                // dataSource: new DevExpress.data.DataSource({
                //   store: new DevExpress.data.ArrayStore({
                //     key: 'quotedetailid',
                //     data: childDataArray,
                //   }),
                //   reshapeOnPush: true
                // }),

                // Hide column headers
                showColumnHeaders: false,

                dataSource: {
                  store: quoteLinesData,
                  reshapeOnPush: true
                },

                // filterValue: ["extreme_parentquoteline", "=", productsData.quotedetailid],
                filterValue: [
                  ["extreme_isparentitem", "=", false],
                  "and",
                  ["extreme_parentquoteline", "=", productsData.quotedetailid]
                ],

                width: "100%",
                wordWrapEnabled: false,
                showColumnLines: true,
                showRowLines: true,
                rowAlternationEnabled: false,
                showBorders: true,
                // headerFilter: {
                //   visible: true,
                //   height: 200
                // },
                paging: {
                  pageSize: 100,
                },
                editing: {
                  mode: 'cell',
                  allowUpdating: isDraftStatus,
                  allowAdding: false,
                  allowDeleting: isDraftStatus,
                  useIcons: true
                },
                sorting: {
                  mode: 'none',
                },
                // selection: {
                //   mode: 'multiple',
                // },
                allowColumnResizing: true,
                allowColumnReordering: true,
                columnResizingMode: "mode",
                columnMinWidth: 10,
                columnAutoWidth: false,
                columnHidingEnabled: false,
                scrolling: {
                  mode: "standard",
                  scrollByContent: true,
                  scrollByThumb: true
                },
                rowDragging: {
                  allowReordering: isDraftStatus,
                  allowDropInsideItem: false,
                  showDragIcons: true,
                  async onReorder(e) {
                    // console.log("reodrering e");
                    // console.log(e);

                    if (!isDraftStatus) {
                      Xrm.Navigation.openAlertDialog({ confirmButtonLabel: "Close", text: "Grid is in read-only mode.", title: "Cannot do that" });
                      return;
                    }

                    if (e.fromData === e.toData) {
                      // console.log('inside the same child - reordering');
                    }

                    const visibleRows = e.component.getVisibleRows();
                    const toIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === visibleRows[e.toIndex].data.quotedetailid);
                    const fromIndex = quoteLinesData._array.findIndex((item) => item.quotedetailid === e.itemData.quotedetailid);

                    quoteLinesData._array.splice(fromIndex, 1);
                    quoteLinesData._array.splice(toIndex, 0, e.itemData);

                    for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length; i++) {
                      Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].quotedetailid}`, { sequencenumber: parseInt((i + 1) + "00") });
                      quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].sequencenumber = parseInt((i + 1) + "00");
                    }

                    for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null).length; i++) {
                      Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].quotedetailid}`, { sequencenumber: quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1) });
                      quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].sequencenumber = quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1);
                    }

                    await getQuoteProducts(quoteIdForm);
                    e.component.refresh();
                  },
                  data: productsData.quotedetailid,
                  group: 'QuoteLines',
                  onAdd
                },
                columns: [
                  {
                    dataField: 'sequencenumber',
                    caption: 'Order',
                    dataType: 'number',
                    sortOrder: 'asc',
                    visible: dataGrid.columnOption("sequencenumber", "visible")
                  },
                  {
                    dataField: 'productid',
                    caption: 'Product ID',
                    width: 150,
                    calculateDisplayValue: "productnumber",
                    lookup: {
                      dataSource(options) {

                        let filterQuery = null;

                        if (options.data) {
                          if (options.data.extreme_isparentitem === true) {
                            filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]]
                          }
                          else {
                            filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]]
                          };
                        }

                        return {
                          store: productsODataStore,
                          searchExpr: ["productnumber", "name"],
                          paginate: true,
                          pageSize: 100,
                          loadMode: 'raw',
                          filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery,
                        }
                      },
                      displayExpr: 'productnumber',
                      valueExpr: 'productid',
                    },
                    editorOptions: {
                      acceptCustomValue: true,
                      // popupWidth: 600,
                      searchEnabled: true,
                      searchTimeout: SEARCH_TIMEOUT_MS, // Debounce search for better performance
                      minSearchLength: 2, // Only search after 2 characters
                      // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                      searchExpr: ["productnumber", "name"],
                      itemTemplate: function (data, index, container) {
                        var row = $("<div>").addClass("row text-wrap");
                        var containerFluid = $("<div>").addClass("container-fluid");
                        $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
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

                        var newItem = {};
                        newItem.productid = newIdForCustomProducts++;
                        newItem.name = args.text;
                        newItem.productnumber = args.text;
                        customProductsStore.insert(newItem);
                        args.customItem = newItem;
                      },
                      onOpened: function (e) {
                        heightAuto = false;
                        if (heightAuto === false) {
                          const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                          if (iframeCorrentHeight < 450) {
                            wrControl.getObject().style.minHeight = "600px";
                          }
                        }
                        e.component._popup.option('width', 400);
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    // editCellTemplate: dropDownBoxEditorTemplateProducts,
                    setCellValue: async function (newData, value, currentRowData) {

                      if (typeof (value) === 'number' && currentRowData.extreme_isparentitem !== true) {
                        newData.productid = value;

                        const recalcResult = recalculateAmounts({

                          quantity: 1,
                          supplierPricePerUnit: 0,
                          supplierDiscount: 0,
                          margin: defaultMargin,
                          discount: 0,
                          TaxPercent: 0

                        });

                        newData.uomid = unitsStore._array.find(item => item.name.toLowerCase() === primaryDefaultUnit.toLowerCase()).id;

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
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                        return;
                      }
                      else if (typeof (value) === 'number' && currentRowData.extreme_isparentitem === true) {
                        newData.productid = value;
                        newData.uomid = unitsStore._array.find(item => item.name.toLowerCase() === primaryDefaultUnit.toLowerCase()).id;
                        newData.quantity = 1;

                        return;
                      }

                      // Product types
                      let productType = null;
                      let defaultVatSetting = null;
                      let defaultTax = null;
                      let priceListItemInfo = [];
                      let classifyLookupsInfo = null;
                      let supplierPricePerUnit = 0;

                      // Parallel fetch all product-related data in one go (using cache)
                      if (isGuid(value) && value !== null) {
                        // Fetch all product info in a single call with all needed fields
                        const productInfoData = await getCachedProductInfo(Xrm, value, "producttypecode,_pricelevelid_value,_defaultuomid_value,name,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");

                        productType = productInfoData.producttypecode;
                        newData.extreme_producttype = productType;
                        classifyLookupsInfo = productInfoData;

                        // Get VAT setting instantly from pre-loaded array (NO API call needed!)
                        // Must match BOTH productTypeCode AND customerTaxPercentage
                        const vatSettingFromArray = vatSettingsArray.find(item => 
                          item.productTypeCode === productType && item.customerTaxPercentage === taxPercentOfAccount.extreme_tax
                        );
                        defaultVatSetting = vatSettingFromArray ? vatSettingFromArray.id : null;
                        
                        // Fetch price list info using cache
                        if (productInfoData._pricelevelid_value) {
                          const priceListInfo = await getCachedPriceListInfo(Xrm, productInfoData._pricelevelid_value);

                          // Fetch price list item info if price list is valid
                          if ((new Date(priceListInfo.enddate) > new Date() || priceListInfo.enddate === null) && priceListInfo.statuscode === 100001) {
                            priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$expand=pricelevelid($select=extreme_defaultsalesmargin)&$filter=(_pricelevelid_value eq ${productInfoData._pricelevelid_value} and _productid_value eq ${value})`);
                          } else {
                            Xrm.Navigation.openAlertDialog({
                              confirmButtonLabel: "OK",
                              text: "Price list for this product expired or is no longer active.",
                              title: "Price list"
                            }, { height: 120, width: 260 });
                            priceListItemInfo = [];
                          }
                        }

                        // Use already-fetched classifyLookupsInfo
                        if (classifyLookupsInfo.producttypecode) newData.extreme_producttype = classifyLookupsInfo.producttypecode;
                        if (classifyLookupsInfo._extreme_area_value) newData.extreme_area = classifyLookupsInfo._extreme_area_value;
                        if (classifyLookupsInfo._extreme_technology_value) newData.extreme_technology = classifyLookupsInfo._extreme_technology_value;
                        if (classifyLookupsInfo._extreme_supplier_value) newData.extreme_vendorsupplier = classifyLookupsInfo._extreme_supplier_value;
                      }

                      // set create asset to false
                      newData.extreme_createasset = false;

                      // console.log('priceListItemInfo');
                      // console.log(priceListItemInfo);

                      const productInfo = classifyLookupsInfo || {};
                      const priceListMargin = priceListItemInfo.entities ? priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] !== null ? priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] : currentRowData.extreme_margin : currentRowData.extreme_margin;
                      const priceListItemAmount = priceListItemInfo.entities ? priceListItemInfo.entities[0].amount : 0;
                      const priceListItemAmountFormatted = priceListItemInfo.entities ? priceListItemInfo.entities[0]["amount@OData.Community.Display.V1.FormattedValue"] : null;
                      const priceListItemCurrency = priceListItemInfo.entities ? currenciesArray.find((item) => item.transactioncurrencyid === priceListItemInfo.entities[0]._transactioncurrencyid_value).currencysymbol : null;

                      // console.log('SET CELL VALUES');
                      // console.log(priceListItemAmount);
                      // console.log(priceListItemCurrency);
                      // console.log(productInfo._pricelevelid_value);

                      // console.log('newData: ');
                      // console.log(newData);
                      // console.log('value: ');
                      // console.log(value);
                      // console.log('currentRowDataa: ');
                      // console.log(currentRowData);
                      newData.productid = value;
                      if (!isAddingSet) {
                        newData.extreme_tax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
                        defaultTax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
                      };
                      if (!isAddingSet && defaultVatSetting !== null) {
                        newData.extreme_vatsetting = defaultVatSetting;
                        newData.extreme_vatgroup = vatSettingsArray.find(item => item.id === defaultVatSetting).idVatGroup;
                      }
                      newData.extreme_customproductname = productInfo.name;
                      if (productInfo._defaultuomid_value !== null) newData.uomid = productInfo._defaultuomid_value;
                      if (productInfo._pricelevelid_value && !isAddingSet) {
                        if (priceListItemInfo.entities) newData.extreme_pricelist = productInfo._pricelevelid_value;
                        if (priceListItemInfo.entities) newData.extreme_pricelistpriceperunit = priceListItemAmount;
                        if (priceListItemInfo.entities) newData.extreme_pricelistcurrency = priceListItemCurrency;
                        if (quoteCurrencySymbol !== priceListItemCurrency && priceListItemInfo.entities) {
                          newData.extreme_supplierpriceperunit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                          supplierPricePerUnit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                        } else {
                          newData.extreme_supplierpriceperunit = priceListItemAmount;
                          supplierPricePerUnit = priceListItemAmount;
                        }
                      };

                      if (currentRowData.extreme_margin !== null &&
                        supplierPricePerUnit !== null &&
                        currentRowData.extreme_supplierdiscount !== null &&
                        currentRowData.extreme_discount !== null &&
                        !isAddingSet) {
                        // console.log("NEW DATA FROM SELECTING PRODUCT");
                        // console.log(currentRowData.extreme_margin);
                        // console.log(supplierPricePerUnit);
                        // console.log(currentRowData.extreme_discount);
                        // console.log(1);

                        const recalcResult = recalculateAmounts({

                          quantity: 1,
                          supplierPricePerUnit: supplierPricePerUnit,
                          supplierDiscount: currentRowData.extreme_supplierdiscount,
                          margin: priceListMargin,
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
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      }
                    },
                    customizeText: function (cellInfo) {
                      if (cellInfo.valueText) {
                        // // console.log(productsStore._array.find((item) => item.name === cellInfo.valueText))
                        return cellInfo.valueText;
                        // return productsStore._array.find((item) => item.name === cellInfo.valueText)["productId"]
                      }
                      else {
                        return cellInfo.valueText;
                      }
                    },
                    validationRules: [
                      { type: 'required' },
                      {
                        type: 'custom',
                        message: 'Must be at least 3 characters',
                        validationCallback(params) {
                          return params.value.length < 3 && typeof (params.value) == 'number' ? false : true;
                        },
                      }
                    ],
                    visible: dataGrid.columnOption("productid", "visible")
                  },
                  {
                    dataField: 'extreme_customproductname',
                    caption: 'Name',
                    dataType: 'string',
                    wordWrapEnabled: true,
                    width: 180,
                    validationRules: [{ type: 'required' }],
                    visible: dataGrid.columnOption("extreme_customproductname", "visible")
                  },
                  {
                    dataField: 'extreme_productdescription',
                    caption: 'Description',
                    dataType: 'string',
                    visible: dataGrid.columnOption("extreme_productdescription", "visible")
                  },
                  {
                    dataField: 'quantity',
                    caption: 'Qty',
                    dataType: 'number',
                    width: 44,
                    setCellValue: async function (newData, value, currentRowData) {

                      // console.log('currentRowData');
                      // console.log(currentRowData);

                      newData.quantity = value;
                      if (!isAddingSet) {
                        if (
                          currentRowData.extreme_margin !== null &&
                          currentRowData.extreme_supplierpriceperunit !== null &&
                          currentRowData.extreme_supplierdiscount !== null &&
                          currentRowData.extreme_discount !== null &&
                          currentRowData.extreme_tax !== null &&
                          currentRowData.extreme_supplierpriceperunit !== null &&
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
                          newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                        }
                        // else {
                        //   if (currentRowData.priceperunit !== null && value !== null && currentRowData.extreme_discount !== null) {
                        //     newData.extreme_fullpricewithdiscount = (currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value;
                        //     newData.manualdiscountamount = (value * currentRowData.priceperunit) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                        //   };
                        //   if (currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                        //     newData.tax = (((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                        //     newData.extendedamount = ((((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value)) + ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                        //   }
                        // }
                      }
                    },
                    visible: dataGrid.columnOption("quantity", "visible")
                  },
                  {
                    dataField: 'uomid',
                    caption: 'Unit',
                    width: 60,
                    lookup: {
                      dataSource: {
                        store: unitsStore,
                        paginate: true,
                        pageSize: 20,
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
                    },
                    editorOptions: {
                      acceptCustomValue: true,
                      searchEnabled: true,
                      onCustomItemCreating: function (args) {
                        if (!args.text) {
                          args.customItem = null;
                          return;
                        }

                        if (args.customItem = unitsStore._array.find(item => item.name.toLowerCase().trim().startsWith(args.text.toLowerCase().trim()))) {
                          args.customItem = unitsStore._array.find(item => item.name.toLowerCase().trim().startsWith(args.text.toLowerCase().trim()));
                        }
                      }
                    },
                    // validationRules: [{ type: 'required' }],
                    visible: dataGrid.columnOption("uomid", "visible")
                  },
                  {
                    dataField: 'extreme_pricelistpriceperunit',
                    caption: 'Original PPU',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    cellTemplate(container, info) {
                      // console.log(container, info);
                      return info.data.extreme_pricelistpriceperunit !== null && info.data.extreme_pricelistpriceperunit !== undefined ? $('<div>').text(info.data.extreme_pricelistpriceperunit + ` ${info.data.extreme_pricelistcurrency}`) : null;
                    },
                    visible: dataGrid.columnOption("extreme_pricelistpriceperunit", "visible"),
                    allowEditing: false
                  },
                  {
                    dataField: 'extreme_pricelistcurrency',
                    caption: 'Original Currency',
                    dataType: 'string',
                    visible: dataGrid.columnOption("extreme_pricelistcurrency", "visible"),
                    allowEditing: false
                  },
                  {
                    dataField: 'extreme_supplierpriceperunit',
                    caption: 'PPU',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      if (currentRowData.extreme_margin !== null && currentRowData.extreme_supplierdiscount !== null && currentRowData.quantity !== null) {
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
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      };
                      if (typeof (currentRowData.productid) === 'number') {
                        newData.extreme_pricelistpriceperunit = value;
                      }
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_supplierpriceperunit", "visible")
                  },
                  {
                    dataField: 'extreme_supplierbaseamount',
                    caption: 'Base Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_supplierbaseamount", "visible")
                  },
                  {
                    dataField: 'extreme_supplierdiscount',
                    caption: 'Supplier Disc. %',
                    dataType: 'number',
                    width: 70,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      if (currentRowData.priceperunit !== null && currentRowData.extreme_supplierpriceperunit !== null && currentRowData.quantity !== null) {
                        const recalcResult = recalculateAmounts({

                          quantity: currentRowData.quantity,
                          supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                          supplierDiscount: value,
                          pricePerUnit: currentRowData.priceperunit ? currentRowData.priceperunit : null,
                          baseAmount: currentRowData.baseamount ? currentRowData.baseamount : null,
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
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      }
                    },
                    visible: dataGrid.columnOption("extreme_supplierdiscount", "visible")
                  },
                  {
                    dataField: 'extreme_margin',
                    caption: 'Margin',
                    dataType: 'number',
                    width: 64,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_margin = value;
                      if (currentRowData.extreme_supplierpriceperunit !== null && currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
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
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      };
                    },
                    visible: dataGrid.columnOption("extreme_margin", "visible")
                  },
                  {
                    dataField: 'priceperunit',
                    caption: 'Sales PPU',
                    dataType: 'number',
                    cssClass: "cell-highlighted",
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: true,
                    setCellValue: async function (newData, value, currentRowData) {
                      if (currentRowData.quantity !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_margin) {
                        if ((currentRowData.extreme_supplierpriceperunit === null || currentRowData.extreme_supplierpriceperunit === undefined || currentRowData.extreme_supplierpriceperunit === 0) && currentRowData.extreme_margin !== null) {
                          newData.extreme_supplierpriceperunit = value / currentRowData.extreme_margin;

                          const recalcResult = recalculateAmounts({

                            quantity: currentRowData.quantity,
                            supplierPricePerUnit: value / currentRowData.extreme_margin,
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
                          newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                        }
                        else {
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
                          newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                        }
                      };
                    },
                    customizeText: function (cellInfo) {

                      // console.log('CELL INFO CHILD');
                      // console.log(cellInfo);

                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("priceperunit", "visible")
                  },
                  {
                    dataField: 'baseamount',
                    caption: 'Sales Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("baseamount", "visible")
                  },
                  {
                    dataField: 'extreme_discount',
                    caption: 'Disc. %',
                    dataType: 'number',
                    width: 62,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      // Do so only if it is not parent item (SET)

                      if (currentRowData.extreme_isparentitem !== true) {
                        // Always set the discount value for child elements
                        newData.extreme_discount = value;
                        
                        if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_tax !== null) {
                          const recalcResult = recalculateAmounts({

                            quantity: currentRowData.quantity,
                            supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                            supplierDiscount: currentRowData.extreme_supplierdiscount,
                            pricePerUnit: currentRowData.priceperunit ? currentRowData.priceperunit : null,
                            baseAmount: currentRowData.baseamount ? currentRowData.baseamount : null,
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
                          newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                        };
                        if (currentRowData.extreme_tax !== null) {
                          newData.tax = (((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                          newData.extendedamount = ((((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity)) + ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                        };
                      }
                      else {
                        newData.extreme_discount = value;
                      }
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    },
                    visible: dataGrid.columnOption("extreme_discount", "visible")
                  },
                  {
                    dataField: 'manualdiscountamount',
                    caption: 'Discount Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    visible: dataGrid.columnOption("manualdiscountamount", "visible"),
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                  },
                  // {
                  //   dataField: 'extreme_pricewithdiscount',
                  //   caption: 'Price w/discount',
                  //   dataType: 'number',
                  //   allowEditing: false,
                  //   customizeText: function (cellInfo) {
                  //     return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " \u20AC";
                  //   }
                  // },
                  {
                    dataField: 'extreme_fullpricewithdiscount',
                    caption: 'Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_fullpricewithdiscount = value;
                      if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_tax !== null) {

                        const recalcResult = recalculateAmounts({

                          quantity: currentRowData.quantity,
                          supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                          supplierDiscount: currentRowData.extreme_supplierdiscount,
                          pricePerUnit: currentRowData.priceperunit ? currentRowData.priceperunit : null,
                          baseAmount: currentRowData.baseamount ? currentRowData.baseamount : null,
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
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                      };
                    },
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_fullpricewithdiscount", "visible")
                  },
                  {
                    dataField: 'extreme_vatsetting',
                    caption: 'VAT %',
                    width: 60,
                    lookup: {
                      dataSource(options) {
                        // console.log('OPTIONS FROM VAT GROUP LOOKUP');
                        // console.log(options);

                        let filterQuery = null;
                        if (options.data && options.data.productid && isGuid(options.data.productid)) {
                          const productInfo = Xrm.WebApi.retrieveRecord("product", `${options.data.productid}`, "?$select=producttypecode");
                          if (options.isNewRow !== true) {
                            if (productInfo.producttypecode) {
                              filterQuery = ["productTypeCode", "=", productInfo.producttypecode]
                            }
                            else if (quoteLinesData._array.find(item => item.quotedetailid === options.data.quotedetailid).extreme_producttype) {
                              filterQuery = ["productTypeCode", "=", quoteLinesData._array.find(item => item.quotedetailid === options.data.quotedetailid).extreme_producttype]
                            }
                          }
                        }

                        return {
                          store: {
                            type: "array",
                            data: vatSettingsArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                          filter: filterQuery
                        }
                      },
                      displayExpr: "varPercentFormat",
                      valueExpr: 'id'
                    },
                    editorOptions: {
                      acceptCustomValue: false,
                      // popupWidth: 600,
                      searchEnabled: true,
                      searchExpr: ["name", "code", "varPercentFormat"],
                      itemTemplate: function (data, index, container) {
                        var containerFluid = $("<div>").addClass("container-fluid");
                        var row = $("<div>").addClass("row text-wrap");
                        $("<div>").addClass("col-2").text(productTypesArray.find(item => item.id === data["productTypeCode"]).name).appendTo(row);
                        $("<div>").addClass("col-6").text(data["name"]).appendTo(row);
                        $("<div>").addClass("col-2").text(data["code"]).appendTo(row);
                        $("<div>").addClass("col-2").text(data["varPercentFormat"]).appendTo(row);
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
                        e.component._popup.option('width', 400);
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_vatsetting = value;
                      newData.extreme_producttype = vatSettingsArray.find(item => item.id === value).productTypeCode;
                      newData.extreme_tax = vatSettingsArray.find(item => item.id === value).vat;
                      const defaultTax = vatSettingsArray.find(item => item.id === value).vat;

                      if (
                        currentRowData.extreme_margin !== null &&
                        currentRowData.extreme_supplierpriceperunit !== null &&
                        currentRowData.extreme_discount !== null
                      ) {
                        const recalcResult = recalculateAmounts({

                          quantity: currentRowData.quantity,
                          supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                          supplierDiscount: currentRowData.extreme_supplierdiscount,
                          pricePerUnit: currentRowData.priceperunit ? currentRowData.priceperunit : null,
                          baseAmount: currentRowData.baseamount ? currentRowData.baseamount : null,
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
                        newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                      }

                    },
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: isDraftStatus,
                    visible: dataGrid.columnOption("extreme_vatgroup", "visible")
                  },
                  {
                    dataField: 'extreme_tax',
                    caption: 'VAT % calc',
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      // console.log('cellInfo');
                      // console.log(cellInfo);
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
                    },
                    visible: dataGrid.columnOption("extreme_tax", "visible")
                  },
                  {
                    dataField: 'tax',
                    caption: 'VAT Amount',
                    //width: 100,
                    dataType: 'number',
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("tax", "visible")
                  },
                  {
                    dataField: 'extreme_pd',
                    caption: 'Profit Per Unit',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_pd", "visible")
                  },
                  {
                    dataField: 'extreme_fullpd',
                    caption: 'Gross Profit',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extreme_fullpd", "visible")
                  },
                  {
                    dataField: 'extendedamount',
                    caption: 'Total Amount',
                    dataType: 'number',
                    //width: 100,
                    format: {
                      type: "fixedPoint",
                      precision: 2
                    },
                    allowEditing: false,
                    customizeText: function (cellInfo) {
                      return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
                    },
                    visible: dataGrid.columnOption("extendedamount", "visible")
                  },
                  {
                    dataField: 'extreme_pricelist',
                    caption: 'Price list',
                    width: 130,
                    wordWrapEnabled: false,
                    lookup: {
                      dataSource(options) {
                        return {
                          store: {
                            type: "array",
                            data: priceListsArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                          filter: options.data ? [['productid', '=', options.data.productid], "and", ['statuscode', '=', 100001]] : null,
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
                    },
                    editorOptions: {
                      acceptCustomValue: false,
                      // popupWidth: 600,
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
                        e.component._popup.option('width', 400);
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_pricelist = value;
                      // console.log('NEW PRICE FROM PRICE LIST CHANGE');

                      const newOrgPrice = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).amount_num;
                      const newOrgCurrency = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).currency_code;
                      const newOrgCurrencyValue = $(`#${newOrgCurrency}`).val() ? parseFloat($(`#${newOrgCurrency}`).val()) : 1;
                      const newOrgCurrencySymbol = currenciesArray.find((item) => item.isocurrencycode == newOrgCurrency).currencysymbol;

                      // console.log(newOrgPrice);
                      // console.log(newOrgCurrency);
                      // console.log(newOrgCurrencyValue);
                      // console.log(newOrgCurrencySymbol);

                      newData.extreme_pricelistpriceperunit = newOrgPrice;
                      newData.extreme_pricelistcurrency = newOrgCurrencySymbol;


                      var pricePerUnit = (newOrgPrice * newOrgCurrencyValue) * currentRowData.extreme_margin;
                      const recalcResult = recalculateAmounts({

                        quantity: currentRowData.quantity,
                        supplierPricePerUnit: (newOrgPrice * newOrgCurrencyValue),
                        supplierDiscount: currentRowData.extreme_supplierdiscount,
                        margin: currentRowData.extreme_margin,
                        discount: currentRowData.extreme_discount,
                        TaxPercent: currentRowData.extreme_tax,
                        pricePerUnit: pricePerUnit

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
                      newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                    },
                    visible: dataGrid.columnOption("extreme_pricelist", "visible")
                  },
                  {
                    dataField: 'extreme_parentquoteline',
                    caption: 'Parent QL',
                    dataType: 'string',
                    visible: dataGrid.columnOption("extreme_parentquoteline", "visible")
                  },
                  {
                    dataField: 'extreme_isparentitem',
                    caption: 'Is Parent',
                    dataType: 'boolean',
                    visible: dataGrid.columnOption("extreme_isparentitem", "visible")
                  },
                  {
                    dataField: 'extreme_producttype',
                    caption: 'Type',
                    lookup: {
                      dataSource(options) {
                        return {
                          store: {
                            type: "array",
                            data: productTypesArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
                    },
                    visible: false
                  },
                  {
                    dataField: 'extreme_area',
                    caption: 'Area',
                    lookup: {
                      dataSource(options) {
                        return {
                          store: {
                            type: "array",
                            data: areasArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
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
                      }
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_area = value;
                      checkClassifyRows();
                    },
                    visible: dataGrid.columnOption("extreme_area", "visible")
                  },
                  {
                    dataField: 'extreme_technology',
                    caption: 'Technology',
                    lookup: {
                      dataSource(options) {
                        return {
                          store: {
                            type: "array",
                            data: techsArray,
                            key: "id"
                          },
                          paginate: true,
                          pageSize: 20,
                        }
                      },
                      displayExpr: 'name',
                      valueExpr: 'id'
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
                      }
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_technology = value;
                      checkClassifyRows();
                    },
                    visible: dataGrid.columnOption("extreme_technology", "visible")
                  },
                  {
                    dataField: 'extreme_vendorsupplier',
                    caption: 'Vendor/Supplier',
                    calculateDisplayValue: "name",
                    lookup: {
                      dataSource: {
                        store: vendorSupplierODataStore,
                        paginate: true,
                        pageSize: 100,
                        loadMode: 'raw',
                        filter: [["extreme_relationshiptypeext", "=", 424000000], "or", ["extreme_relationshiptypeext", "=", 424000003]]
                      },
                      displayExpr: 'name',
                      valueExpr: 'accountid'
                    },
                    editorOptions: {
                      acceptCustomValue: false,
                      searchEnabled: true,
                      searchTimeout: SEARCH_TIMEOUT_MS, // Debounce search for better performance
                      searchExpr: ["extreme_paname30characters", "name"],
                      itemTemplate: function (data, index, container) {
                        var row = $("<div>").addClass("row text-wrap");
                        var containerFluid = $("<div>").addClass("container-fluid");
                        $("<div>").addClass("col-4").text(data["extreme_paname30characters"]).appendTo(row);
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
                        e.component._popup.option('width', 400);
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_vendorsupplier = value;
                      checkClassifyRows();
                    },
                    visible: dataGrid.columnOption("extreme_vendorsupplier", "visible")
                  },
                  {
                    dataField: 'extreme_createasset',
                    caption: 'Asset?',
                    width: 60,
                    dataType: 'boolean',
                    visible: dataGrid.columnOption("extreme_createasset", "visible")
                  },
                  {
                    type: 'buttons',
                    width: 70,
                    buttons: [
                      {
                        hint: 'Description',
                        icon: 'edit',
                        visible(e) {
                          return true;
                        },
                        disabled(e) {
                          return false;
                        },
                        onClick(e) {
                          // console.log(e);

                          const popupContentTemplate = function (item) {

                            if (isDraftStatus) {
                              return $('<div data-mdb-input-init class="form-outline">')
                                .append($(`<textarea class="form-control" id="productDescription" rows="4" style="resize: none;">${item.extreme_productdescription ? item.extreme_productdescription.trim() : ''}</textarea>`))
                            }
                            else {
                              return $('<div class="overflow-auto" style="max-height: 100px;">')
                                .append($(`<p>${item.extreme_productdescription ? item.extreme_productdescription.trim() : ''}</p>`))
                            }

                            return $('<div>').append(
                              $(`<p>Birth Date: <span>${item.extreme_productdescription}</span></p>`)
                            );
                          };
                          const popup = $('#popup').dxPopup({
                            contentTemplate: popupContentTemplate,
                            width: 500,
                            height: 200,
                            container: '.dx-viewport',
                            showTitle: true,
                            title: `Description for ${e.row.data.extreme_customproductname ? e.row.data.extreme_customproductname.length > 20 ? e.row.data.extreme_customproductname.substring(0, 17) + '...' : e.row.data.extreme_customproductname : ''}`,
                            visible: false,
                            dragEnabled: false,
                            hideOnOutsideClick: true,
                            showCloseButton: false,
                            position: {
                              at: 'center',
                              my: 'center',
                              collision: 'fit',
                            },
                            toolbarItems: [{
                              widget: 'dxButton',
                              toolbar: 'bottom',
                              location: 'before',
                              options: {
                                icon: 'save',
                                stylingMode: 'contained',
                                text: 'Save',
                                disabled: !isDraftStatus,
                                async onClick() {
                                  // console.log($('#productDescription').val().trim());

                                  var record = {};
                                  record.extreme_productdescription = "test"; // Multiline Text

                                  await Xrm.WebApi.updateRecord("quotedetail", `${e.row.data.quotedetailid}`, { extreme_productdescription: $('#productDescription').val().trim() });
                                  quoteLinesData.update(e.row.data.quotedetailid, { extreme_productdescription: $('#productDescription').val().trim() });
                                  dataGrid.refresh();

                                  popup.hide();

                                },
                              },
                            }, {
                              widget: 'dxButton',
                              toolbar: 'bottom',
                              location: 'after',
                              options: {
                                text: 'Close',
                                stylingMode: 'outlined',
                                type: 'normal',
                                onClick() {
                                  popup.hide();
                                },
                              },
                            }],
                            onHiding: (e) => {
                              // console.log('Hidding popup event');
                              // console.log(e);
                              selectedDescriptionItem = null;
                            }
                          }).dxPopup('instance');

                          selectedDescriptionItem = e.row.data;
                          popup.option({
                            contentTemplate: () => popupContentTemplate(e.row.data)
                          });
                          popup.show();

                        },
                      },
                      'delete'
                    ],
                  }
                ],
                onEditorPreparing: async (e) => {
                  // console.log('Editor Preparing');
                  // console.log(e);

                  // if (e.dataField == "uomid" && typeof (e.row.data.productid) !== 'number') e.editorOptions.disabled = true;

                  if (e.dataField == "extreme_supplierdiscount" || e.dataField == "extreme_discount" || e.dataField == "extreme_tax") {
                    e.editorOptions.min = 0;
                    e.editorOptions.max = 100;
                  }

                  if (e.dataField == 'extreme_pricelist' && (!e.row.data.productid || typeof (e.row.data.productid) === 'number') || e.row.isNewRow) {
                    e.editorOptions.disabled = true;
                  }
                  if (e.dataField == 'baseamount') {
                    e.editorOptions.disabled = true;
                  }

                },
                onRowPrepared: async (e) => {
                  // console.log('ROW PREPARED');
                  // console.log(e);

                  if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && (e.data.extreme_isparentitem === true || e.data.extreme_isparentitem === false) &&
                    (
                      // (e.data.extreme_producttype === null || e.data.extreme_producttype === undefined) ||
                      (e.data.extreme_area === null || e.data.extreme_area === undefined) ||
                      (e.data.extreme_technology === null || e.data.extreme_technology === undefined) ||
                      (e.data.extreme_vendorsupplier === null || e.data.extreme_vendorsupplier === undefined)
                    )
                  ) {
                    e.rowElement[0].style.backgroundColor = "#fce3c2";
                  }
                  else if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && e.data.extreme_isparentitem === true && quoteLinesData._array.find(item =>
                    // (item.extreme_producttype === null || item.extreme_producttype === undefined) ||
                    (item.extreme_area === null || item.extreme_area === undefined) ||
                    (item.extreme_technology === null || item.extreme_technology === undefined) ||
                    (item.extreme_vendorsupplier === null || item.extreme_vendorsupplier === undefined)
                  )) {
                    e.cells[1].cellElement[0].style.backgroundColor = "#fce3c2";
                  }
                  else {
                    e.rowElement[0].style.backgroundColor = "#fafafa";
                  }

                },
                onFocusedCellChanged: (e) => {
                  // console.log(e);
                },
                onEditingStart: (e) => {
                  // console.log('EditingStart');
                  // console.log(e);
                },
                onEditCanceling: (e) => {
                  // console.log('EditCanceling');
                  // console.log(e);
                },
                onInitNewRow: async (e) => {
                  // console.log('InitNewRow');
                  // console.log(e);
                },
                onRowInserting: async (e) => {
                  // console.log('RowInserting');
                  // console.log(e);
                },
                onRowInserted: async (e) => {
                  // console.log('RowInserted');
                  // console.log(e);
                },
                onRowUpdating: async (e) => {
                  // console.log('RowUpdating');
                  // console.log(e);

                  var record = {};
                  if (e.newData.productid) record["productid@odata.bind"] = `/products(${e.newData.productid})`; // Lookup
                  if (e.newData.extreme_customproductname) record.extreme_customproductname = e.newData.extreme_customproductname; // Text
                  if (e.newData.extreme_productdescription) record.extreme_productdescription = e.newData.extreme_productdescription; // Text
                  if (e.newData.extreme_pricelistpriceperunit || e.newData.extreme_pricelistpriceperunit === 0) record.extreme_pricelistpriceperunit = e.newData.extreme_pricelistpriceperunit; // Decimal
                  if (e.newData.extreme_pricelistcurrency) record.extreme_pricelistcurrency = e.newData.extreme_pricelistcurrency; // Text
                  if (e.newData.extreme_supplierpriceperunit || e.newData.extreme_supplierpriceperunit === 0) record.extreme_supplierpriceperunit = Number(parseFloat(e.newData.extreme_supplierpriceperunit).toFixed(4)); // Currency
                  if (e.newData.quantity || e.newData.quantity === 0) record.quantity = e.newData.quantity; // Decimal
                  if (e.newData.extreme_supplierbaseamount || e.newData.extreme_supplierbaseamount === 0) record.extreme_supplierbaseamount = Number(parseFloat(e.newData.extreme_supplierbaseamount).toFixed(4)); // Currency
                  if (e.newData.extreme_supplierdiscount || e.newData.extreme_supplierdiscount === 0) record.extreme_supplierdiscount = e.newData.extreme_supplierdiscount; // Decimal
                  if (e.newData.extreme_margin || e.newData.extreme_margin === 0) record.extreme_margin = e.newData.extreme_margin; // Decimal
                  if (e.newData.priceperunit || e.newData.priceperunit === 0) record.priceperunit = e.newData.priceperunit; // Decimal
                  if (e.newData.baseamount || e.newData.baseamount === 0) record.baseamount = e.newData.baseamount; // Decimal
                  if (e.newData.extreme_discount || e.newData.extreme_discount === 0) record.extreme_discount = e.newData.extreme_discount; // Decimal
                  if (e.newData.manualdiscountamount || e.newData.manualdiscountamount === 0) record.manualdiscountamount = Number(parseFloat(e.newData.manualdiscountamount).toFixed(4)); // Currency
                  if (e.newData.extreme_pricewithdiscount || e.newData.extreme_pricewithdiscount === 0) record.extreme_pricewithdiscount = e.newData.extreme_pricewithdiscount; // Decimal
                  if (e.newData.extreme_fullpricewithdiscount || e.newData.extreme_fullpricewithdiscount === 0) record.extreme_fullpricewithdiscount = e.newData.extreme_fullpricewithdiscount; // Decimal
                  if (e.newData.extreme_tax || e.newData.extreme_tax === 0) record.extreme_tax = e.newData.extreme_tax; // Decimal
                  if (e.newData.tax || e.newData.tax === 0) record.tax = Number(parseFloat(e.newData.tax).toFixed(4)); // Currency
                  if (e.newData.extreme_pd || e.newData.extreme_pd === 0) record.extreme_pd = e.newData.extreme_pd; // Decimal
                  if (e.newData.extreme_fullpd || e.newData.extreme_fullpd === 0) record.extreme_fullpd = e.newData.extreme_fullpd; // Decimal
                  if (e.newData.extendedamount || e.newData.extendedamount === 0) record.extendedamount = e.newData.extendedamount; // New total amount
                  if (typeof e.newData.extreme_createasset === "boolean") record.extreme_createasset = e.newData.extreme_createasset; // Boolean
                  if (e.newData.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.newData.extreme_pricelist})`; // Lookup
                  if (e.newData.extreme_vatsetting) {
                    record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${e.newData.extreme_vatsetting})`; // Lookup
                    record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatSettingsArray.find(item => item.id === e.newData.extreme_vatsetting).idVatGroup})`; // Lookup
                  }
                  if (e.newData.extreme_producttype) record.extreme_producttype = e.newData.extreme_producttype; // Chooice

                  if (!typeof (e.oldData.productid) === 'number') {
                    if (e.newData.uomid) record["uomid@odata.bind"] = `/uoms(${e.newData.uomid})`; // Lookup
                  }

                  await Xrm.WebApi.updateRecord("quotedetail", `${e.key}`, record).then(
                    async function success(result) {
                      var updatedId = result.id;
                      // console.log(updatedId);
                      // await getQuoteProducts(quoteIdForm);
                      // dataGrid.refresh();
                    },
                    function (error) {
                      Xrm.Navigation.openErrorDialog({
                        details: error,
                        errorCode: 400,
                        message: error.message
                      });
                    }
                  );

                  // console.log("PARENT QUOTE LINE");
                  // console.log(e.oldData.extreme_parentquoteline);
                  if (e.oldData.extreme_parentquoteline) {

                    // console.log("CHILD UPDATED WITH PARENT QUOTE LINE");
                    
                    // First, update the child's data in quoteLinesData with the new values
                    // This ensures the parent totals calculation uses the updated values
                    const childUpdateData = {};
                    if (e.newData.baseamount !== undefined) childUpdateData.baseamount = parseFloat(e.newData.baseamount) || 0;
                    if (e.newData.extendedamount !== undefined) childUpdateData.extendedamount = parseFloat(e.newData.extendedamount) || 0;
                    if (e.newData.extreme_fullpd !== undefined) childUpdateData.extreme_fullpd = parseFloat(e.newData.extreme_fullpd) || 0;
                    if (e.newData.extreme_fullpricewithdiscount !== undefined) childUpdateData.extreme_fullpricewithdiscount = parseFloat(e.newData.extreme_fullpricewithdiscount) || 0;
                    if (e.newData.manualdiscountamount !== undefined) childUpdateData.manualdiscountamount = parseFloat(e.newData.manualdiscountamount) || 0;
                    if (e.newData.extreme_supplierbaseamount !== undefined) childUpdateData.extreme_supplierbaseamount = parseFloat(e.newData.extreme_supplierbaseamount) || 0;
                    if (e.newData.tax !== undefined) childUpdateData.tax = parseFloat(e.newData.tax) || 0;
                    if (e.newData.extreme_discount !== undefined) childUpdateData.extreme_discount = parseFloat(e.newData.extreme_discount) || 0;
                    if (e.newData.priceperunit !== undefined) childUpdateData.priceperunit = parseFloat(e.newData.priceperunit) || 0;
                    if (e.newData.extreme_margin !== undefined) childUpdateData.extreme_margin = parseFloat(e.newData.extreme_margin) || 0;
                    if (e.newData.extreme_pd !== undefined) childUpdateData.extreme_pd = parseFloat(e.newData.extreme_pd) || 0;
                    
                    // Update the child in the local store FIRST
                    if (Object.keys(childUpdateData).length > 0) {
                      quoteLinesData.update(e.key, childUpdateData);
                    }

                    let baseamount_sum = 0;
                    let extendedamount_sum = 0;
                    let extreme_fullpd_sum = 0;
                    let extreme_fullpricewithdiscount_sum = 0;
                    let manualdiscountamount_sum = 0;
                    let extreme_supplierbaseamount_sum = 0;
                    let tax_sum = 0;
                    let avarageDiscountPercent = 0;

                    // Now calculate parent totals - the child's data is already updated in the array
                    quoteLinesData._array.filter((item) => item.extreme_parentquoteline === e.oldData.extreme_parentquoteline).forEach((child) => {
                      baseamount_sum += parseFloat(child.baseamount) || 0;
                      extendedamount_sum += parseFloat(child.extendedamount) || 0;
                      extreme_fullpd_sum += parseFloat(child.extreme_fullpd) || 0;
                      extreme_fullpricewithdiscount_sum += parseFloat(child.extreme_fullpricewithdiscount) || 0;
                      manualdiscountamount_sum += parseFloat(child.manualdiscountamount) || 0;
                      extreme_supplierbaseamount_sum += parseFloat(child.extreme_supplierbaseamount) || 0;
                      tax_sum += parseFloat(child.tax) || 0;
                    });

                    avarageDiscountPercent = baseamount_sum > 0 ? ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100 : 0;

                    // Update parent in local store only (SETs don't save to database)
                    quoteLinesData.update(e.oldData.extreme_parentquoteline, {
                      baseamount: parseFloat(baseamount_sum.toFixed(2)),
                      extendedamount: parseFloat(extendedamount_sum.toFixed(2)),
                      extreme_fullpd: parseFloat(extreme_fullpd_sum.toFixed(2)),
                      extreme_fullpricewithdiscount: parseFloat(extreme_fullpricewithdiscount_sum.toFixed(2)),
                      manualdiscountamount: parseFloat(manualdiscountamount_sum.toFixed(2)),
                      extreme_supplierbaseamount: parseFloat(extreme_supplierbaseamount_sum.toFixed(2)),
                      tax: parseFloat(tax_sum.toFixed(2)),
                      extreme_discount: parseFloat(avarageDiscountPercent.toFixed(2))
                    });

                    dataGrid.getController('data').updateItems({
                      changeType: 'update',
                      rowIndices: [dataGrid.getRowIndexByKey(e.oldData.extreme_parentquoteline)]
                    });

                  }

                  formContext.data.refresh(true);

                },
                onRowUpdated(e) {
                  // console.log('RowUpdated');
                  // console.log(e);
                },
                onRowRemoving: async (e) => {
                  // console.log('RowRemoving');
                  // console.log(e);

                  Xrm.Utility.showProgressIndicator('Deleting... Please wait...');

                  quoteLinesData.remove(e.key);
                  await Xrm.WebApi.deleteRecord("quotedetail", `${e.key}`).then(
                    async function success(result) {
                      // console.log(result);
                      await getQuoteProducts(quoteIdForm);
                      dataGrid.refresh();
                    },
                    function (error) {
                      Xrm.Navigation.openErrorDialog({
                        details: error,
                        errorCode: 400,
                        message: error.message
                      });
                    }
                  );

                  if (e.data.extreme_parentquoteline) {
                    // console.log("CHILD UPDATED WITH PARENT QUOTE LINE");
                    const parentQuoteLineGUID = e.data.extreme_parentquoteline;

                    let baseamount_sum = 0;
                    let extendedamount_sum = 0;
                    let extreme_fullpd_sum = 0;
                    let extreme_fullpricewithdiscount_sum = 0;
                    let manualdiscountamount_sum = 0;
                    let extreme_supplierbaseamount_sum = 0;
                    let tax_sum = 0;
                    let avarageDiscountPercent = 0;

                    quoteLinesData._array.filter((item) => item.extreme_parentquoteline === parentQuoteLineGUID).forEach((e) => {
                      baseamount_sum += e.baseamount;
                      extendedamount_sum += e.extendedamount;
                      extreme_fullpd_sum += e.extreme_fullpd;
                      extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
                      manualdiscountamount_sum += e.manualdiscountamount;
                      extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
                      tax_sum += e.tax;
                    });

                    avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;

                    quoteLinesData.update(parentQuoteLineGUID, {
                      baseamount: baseamount_sum.toFixed(2),
                      extendedamount: extendedamount_sum.toFixed(2),
                      extreme_fullpd: extreme_fullpd_sum.toFixed(2),
                      extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum.toFixed(2),
                      manualdiscountamount: manualdiscountamount_sum.toFixed(2),
                      extreme_supplierbaseamount: extreme_supplierbaseamount_sum.toFixed(2),
                      tax: tax_sum.toFixed(2),
                      extreme_discount: avarageDiscountPercent.toFixed(2)
                    });

                    dataGrid.getController('data').updateItems({
                      changeType: 'update',
                      rowIndices: [dataGrid.getRowIndexByKey(parentQuoteLineGUID)]
                    });
                  }

                  // reodred grid
                  for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length; i++) {
                    Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].quotedetailid}`, { sequencenumber: parseInt((i + 1) + "00") });
                    quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].sequencenumber = parseInt((i + 1) + "00");
                  }

                  for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null).length; i++) {
                    Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].quotedetailid}`, { sequencenumber: quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1) });
                    quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].sequencenumber = quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1);
                  }

                  formContext.data.refresh(true);

                  Xrm.Utility.closeProgressIndicator();

                },
                onRowRemoved: (e) => {
                  // console.log('RowRemoved');
                },
                onSaving() {
                  // console.log('Saving');
                },
                onSaved() {
                  // console.log('Saved');
                },
                onCellDblClick(e) {
                  // console.log('CELL DOUBLE CLICK');
                  // console.log(e);

                  if (e.column.dataField === "productid" && isGuid(e.data.productid) && e.data.productid) {
                    // Create an anchor element
                    const globalContext = Xrm.Utility.getGlobalContext();
                    globalContext.getCurrentAppUrl();

                    // console.log('CLIENT URL');
                    // console.log(globalContext.getCurrentAppUrl());

                    const link = document.createElement('a');
                    link.href = `${globalContext.getCurrentAppUrl()}&pagetype=entityrecord&etn=product&id=${e.data.productid}`;
                    link.target = "_blank";

                    // Append the anchor to the body (required for Firefox)
                    document.body.appendChild(link);

                    // Trigger a click event on the anchor
                    link.click();

                    // Remove the anchor from the body
                    document.body.removeChild(link);
                  }

                  if (e.column.dataField === "extreme_customproductname" && isGuid(e.data.productid)) {

                    inventoryInfo(e.data.productid, e.data.quotedetailid);

                  }

                },
                onEditCanceling() {
                  // console.log('EditCanceling');
                },
                onEditCanceled() {
                  // console.log('EditCanceled');
                },
                onContentReady: function (e) {
                  e.component.columnOption("command:select", "visibleIndex", 999);
                }
              }).appendTo(container);
          },
        },
        columns: [
          {
            dataField: 'sequencenumber',
            caption: 'Order',
            dataType: 'number',
            sortOrder: 'asc',
            visible: false
          },
          {
            dataField: 'productid',
            caption: 'Product ID',
            width: 120,
            calculateDisplayValue: "productnumber",
            lookup: {
              dataSource(options) {

                let filterQuery = null;

                if (options.data) {
                  if (options.data.extreme_isparentitem === true) {
                    filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]]
                  }
                  else {
                    filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]]
                  };
                }

                return {
                  store: productsODataStore,
                  searchExpr: ["productnumber", "name"],
                  paginate: true,
                  pageSize: 100,
                  loadMode: 'raw',
                  filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery,
                }
              },
              displayExpr: 'productnumber',
              valueExpr: 'productid',
            },
            editorOptions: {
              acceptCustomValue: true,
              // popupWidth: 600,
              searchEnabled: true,
              searchTimeout: SEARCH_TIMEOUT_MS, // Debounce search for better performance
              minSearchLength: 2, // Only search after 2 characters
              // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
              searchExpr: ["productnumber", "name"],
              itemTemplate: function (data, index, container) {
                var row = $("<div>").addClass("row text-wrap");
                var containerFluid = $("<div>").addClass("container-fluid");
                $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
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

                var newItem = {};
                newItem.productid = newIdForCustomProducts++;
                newItem.name = args.text;
                newItem.productnumber = args.text;
                customProductsStore.insert(newItem);
                args.customItem = newItem;
              },
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  if (iframeCorrentHeight < 450) {
                    wrControl.getObject().style.minHeight = "600px";
                  }
                }
                e.component._popup.option('width', 400);
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            // editCellTemplate: dropDownBoxEditorTemplateProducts,
            setCellValue: async function (newData, value, currentRowData) {

              if (typeof (value) === 'number' && currentRowData.extreme_isparentitem !== true) {
                newData.productid = value;

                const discountValue = parseFloat($('#discountInput').val()) || 0;
                const recalcResult = recalculateAmounts({

                  quantity: 1,
                  supplierPricePerUnit: 0,
                  supplierDiscount: 0,
                  margin: defaultMargin,
                  discount: discountValue,
                  TaxPercent: 0

                });

                newData.uomid = unitsStore._array.find(item => item.name.toLowerCase() === primaryDefaultUnit.toLowerCase()).id;

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
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

                return;
              }
              else if (typeof (value) === 'number' && currentRowData.extreme_isparentitem === true) {
                newData.productid = value;
                newData.uomid = unitsStore._array.find(item => item.name.toLowerCase() === primaryDefaultUnit.toLowerCase()).id;
                newData.quantity = 1;

                return;
              }

              // Product types
              let productType = null;
              let defaultVatSetting = null;
              let defaultTax = null;
              let priceListItemInfo = [];
              let classifyLookupsInfo = null;
              let supplierPricePerUnit = 0;
              let productInfo = null;

              // Parallel fetch all product-related data in one go
              if (isGuid(value) && value !== null) {
                // Fetch all product info in a single call with all needed fields (using cache)
                productInfo = await getCachedProductInfo(Xrm, value, "producttypecode,_pricelevelid_value,_defaultuomid_value,name,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");

                productType = productInfo.producttypecode;
                newData.extreme_producttype = productType;
                classifyLookupsInfo = productInfo;

                // Get VAT setting instantly from pre-loaded array (NO API call needed!)
                // Must match BOTH productTypeCode AND customerTaxPercentage
                const vatSettingFromArray = vatSettingsArray.find(item => 
                  item.productTypeCode === productType && item.customerTaxPercentage === taxPercentOfAccount.extreme_tax
                );
                defaultVatSetting = vatSettingFromArray ? vatSettingFromArray.id : null;
                
                // Fetch price list info using cache
                if (productInfo._pricelevelid_value) {
                  const priceListInfo = await getCachedPriceListInfo(Xrm, productInfo._pricelevelid_value);

                  // Fetch price list item info if price list is valid
                  if ((new Date(priceListInfo.enddate) > new Date() || priceListInfo.enddate === null) && priceListInfo.statuscode === 100001) {
                    priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$expand=pricelevelid($select=extreme_defaultsalesmargin)&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${value})`);
                  } else {
                    Xrm.Navigation.openAlertDialog({
                      confirmButtonLabel: "OK",
                      text: "Price list for this product expired or is no longer active.",
                      title: "Price list"
                    }, { height: 120, width: 260 });
                    priceListItemInfo = [];
                  }
                }

                // Use the already-fetched classifyLookupsInfo (same as productInfo)
                if (classifyLookupsInfo.producttypecode) newData.extreme_producttype = classifyLookupsInfo.producttypecode;
                if (classifyLookupsInfo._extreme_area_value) newData.extreme_area = classifyLookupsInfo._extreme_area_value;
                if (classifyLookupsInfo._extreme_technology_value) newData.extreme_technology = classifyLookupsInfo._extreme_technology_value;
                if (classifyLookupsInfo._extreme_supplier_value) newData.extreme_vendorsupplier = classifyLookupsInfo._extreme_supplier_value;
              }

              // set create asset to false
              newData.extreme_createasset = false;

              // console.log('priceListItemInfo');
              // console.log(priceListItemInfo);

              // Ensure productInfo has a fallback if not fetched
              if (!productInfo) productInfo = {};
              
              // Check if priceListItemInfo has valid entities (not empty array)
              const hasPriceListItem = priceListItemInfo.entities && priceListItemInfo.entities.length > 0;
              
              const priceListMargin = hasPriceListItem ? (priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] !== null ? priceListItemInfo.entities[0]["pricelevelid"]["extreme_defaultsalesmargin"] : defaultMargin) : defaultMargin;
              const priceListItemAmount = hasPriceListItem ? priceListItemInfo.entities[0].amount : 0;
              const priceListItemAmountFormatted = hasPriceListItem ? priceListItemInfo.entities[0]["amount@OData.Community.Display.V1.FormattedValue"] : null;
              const priceListItemCurrency = hasPriceListItem ? currenciesArray.find((item) => item.transactioncurrencyid === priceListItemInfo.entities[0]._transactioncurrencyid_value)?.currencysymbol : null;

              // console.log('SET CELL VALUES');
              // console.log(priceListItemAmount);
              // console.log(priceListItemCurrency);
              // console.log(productInfo._pricelevelid_value);

              // console.log('newData: ');
              // console.log(newData);
              // console.log('value: ');
              // console.log(value);
              // console.log('currentRowDataa: ');
              // console.log(currentRowData);
              newData.productid = value;
              if (!isAddingSet) {
                newData.extreme_tax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
                defaultTax = defaultVatSetting === null ? 0 : vatSettingsArray.find(item => item.id === defaultVatSetting).vat
              };
              if (!isAddingSet && defaultVatSetting !== null) {
                newData.extreme_vatsetting = defaultVatSetting;
                newData.extreme_vatgroup = vatSettingsArray.find(item => item.id === defaultVatSetting).idVatGroup;
              }
              newData.extreme_customproductname = productInfo.name;
              if (productInfo._defaultuomid_value !== null) newData.uomid = productInfo._defaultuomid_value;
              if (productInfo._pricelevelid_value && !isAddingSet && hasPriceListItem) {
                newData.extreme_pricelist = productInfo._pricelevelid_value;
                newData.extreme_pricelistpriceperunit = priceListItemAmount;
                newData.extreme_pricelistcurrency = priceListItemCurrency;
                if (quoteCurrencySymbol !== priceListItemCurrency && priceListItemCurrency) {
                  newData.extreme_supplierpriceperunit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                  supplierPricePerUnit = priceListItemAmount * $(`#${currenciesArray.find((item) => item.currencysymbol == priceListItemCurrency).isocurrencycode}`).val();
                } else {
                  newData.extreme_supplierpriceperunit = priceListItemAmount;
                  supplierPricePerUnit = priceListItemAmount;
                }
              }

              // If no price list item exists, set default values with quantity 1 and prices 0
              if (!hasPriceListItem && !isAddingSet) {
                supplierPricePerUnit = 0;
                newData.extreme_supplierpriceperunit = 0;
              }

              if (currentRowData.extreme_margin !== null &&
                supplierPricePerUnit !== null &&
                currentRowData.extreme_supplierdiscount !== null &&
                currentRowData.extreme_discount !== null &&
                !isAddingSet) {
                // console.log("NEW DATA FROM SELECTING PRODUCT");
                // console.log(currentRowData.extreme_margin);
                // console.log(supplierPricePerUnit);
                // console.log(currentRowData.extreme_discount);
                // console.log(1);

                const recalcResult = recalculateAmounts({

                  quantity: 1,
                  supplierPricePerUnit: supplierPricePerUnit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  margin: priceListMargin,
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
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              }
            },
            customizeText: function (cellInfo) {
              if (cellInfo.valueText) {
                // // console.log(productsStore._array.find((item) => item.name === cellInfo.valueText))
                return cellInfo.valueText;
                // return productsStore._array.find((item) => item.name === cellInfo.valueText)["productId"]
              }
              else {
                return cellInfo.valueText;
              }
            },
            validationRules: [
              { type: 'required' },
              {
                type: 'custom',
                message: 'Must be at least 3 characters',
                validationCallback(params) {
                  if (params.value) {
                    if (params.value < 3 && typeof (params.value) == 'number') {
                      return false;
                    }
                    else {
                      return true;
                    }
                  }
                  else {
                    return true;
                  }
                },
              }
            ]
          },
          {
            dataField: 'extreme_customproductname',
            caption: 'Name',
            dataType: 'string',
            width: 180,
            validationRules: [{ type: 'required' }],
            wordWrapEnabled: true,
          },
          {
            dataField: 'extreme_productdescription',
            caption: 'Description',
            dataType: 'string',
            visible: false
          },
          {
            dataField: 'quantity',
            caption: 'Qty',
            dataType: 'number',
            width: 44,
            setCellValue: async function (newData, value, currentRowData) {

              // console.log('currentRowData');
              // console.log(currentRowData);

              newData.quantity = value;
              if (!isAddingSet) {
                if (
                  currentRowData.extreme_margin !== null &&
                  currentRowData.extreme_supplierpriceperunit !== null &&
                  currentRowData.extreme_supplierdiscount !== null &&
                  currentRowData.extreme_discount !== null &&
                  currentRowData.extreme_tax !== null &&
                  currentRowData.extreme_supplierpriceperunit !== null &&
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
                  newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                }
                // else {
                //   if (currentRowData.priceperunit !== null && value !== null && currentRowData.extreme_discount !== null) {
                //     newData.extreme_fullpricewithdiscount = (currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value;
                //     newData.manualdiscountamount = (value * currentRowData.priceperunit) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                //   };
                //   if (currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
                //     newData.tax = (((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                //     newData.extendedamount = ((((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value)) + ((currentRowData.priceperunit * (1 - currentRowData.extreme_discount / 100)) * value);
                //   }
                // }
              }
            }
          },
          {
            dataField: 'uomid',
            caption: 'Unit',
            width: 60,
            lookup: {
              dataSource: {
                store: unitsStore,
                paginate: true,
                pageSize: 20,
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            editorOptions: {
              acceptCustomValue: true,
              searchEnabled: true,
              onCustomItemCreating: function (args) {
                if (!args.text) {
                  args.customItem = null;
                  return;
                }

                if (unitsStore._array.find(item => item.name.toLowerCase().trim().startsWith(args.text.toLowerCase().trim()))) {
                  args.customItem = unitsStore._array.find(item => item.name.toLowerCase().trim().startsWith(args.text.toLowerCase().trim()));
                }

              }
            },
            // validationRules: [{ type: 'required' }],
          },
          {
            dataField: 'extreme_pricelistpriceperunit',
            caption: 'Original PPU',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            cellTemplate(container, info) {
              // console.log(container, info);
              return info.data.extreme_pricelistpriceperunit !== null && info.data.extreme_pricelistpriceperunit ? $('<div>').text(info.data.extreme_pricelistpriceperunit + ` ${info.data.extreme_pricelistcurrency}`) : null;
            },
            visible: false,
            allowEditing: false
          },
          {
            dataField: 'extreme_pricelistcurrency',
            caption: 'Original Currency',
            dataType: 'string',
            visible: false,
            allowEditing: false
          },
          {
            dataField: 'extreme_supplierpriceperunit',
            caption: 'PPU',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              if (currentRowData.extreme_margin !== null && currentRowData.extreme_supplierdiscount !== null && currentRowData.quantity !== null) {
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
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              };
              if (typeof (currentRowData.productid) === 'number') {
                newData.extreme_pricelistpriceperunit = value;
              }
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_supplierbaseamount',
            caption: 'Base Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_supplierdiscount',
            caption: 'Supplier Disc. %',
            dataType: 'number',
            width: 70,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            },
            setCellValue: async function (newData, value, currentRowData) {
              if (currentRowData.priceperunit !== null && currentRowData.extreme_supplierpriceperunit !== null && currentRowData.quantity !== null) {
                const recalcResult = recalculateAmounts({

                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: value,
                  pricePerUnit: currentRowData.priceperunit ? currentRowData.priceperunit : null,
                  baseAmount: currentRowData.baseamount ? currentRowData.baseamount : null,
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
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              }
            },
            visible: false
          },
          {
            dataField: 'extreme_margin',
            caption: 'Margin',
            dataType: 'number',
            width: 64,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_margin = value;
              if (currentRowData.extreme_supplierpriceperunit !== null && currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null) {
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
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              };
            }
          },
          {
            dataField: 'priceperunit',
            caption: 'Sales PPU',
            dataType: 'number',
            cssClass: "cell-highlighted",
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: true,
            setCellValue: async function (newData, value, currentRowData) {
              if (currentRowData.quantity !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_tax !== null && currentRowData.extreme_discount !== null && currentRowData.extreme_margin) {
                if ((currentRowData.extreme_supplierpriceperunit === null || currentRowData.extreme_supplierpriceperunit === undefined || currentRowData.extreme_supplierpriceperunit === 0) && currentRowData.extreme_margin !== null) {
                  newData.extreme_supplierpriceperunit = value / currentRowData.extreme_margin;

                  const recalcResult = recalculateAmounts({

                    quantity: currentRowData.quantity,
                    supplierPricePerUnit: value / currentRowData.extreme_margin,
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
                  newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                }
                else {
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
                  newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                }
              };
            },
            customizeText: function (cellInfo) {

              // console.log('CELL INFO CHILD');
              // console.log(cellInfo);

              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'baseamount',
            caption: 'Sales Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: true,
            setCellValue: async function (newData, value, currentRowData) {
              // Check if this is a parent SET
              if (currentRowData.extreme_isparentitem === true) {
                // This is a parent SET - distribute the new baseamount proportionally to children
                newData.baseamount = value;
                
                const parentId = currentRowData.quotedetailid;
                const childItems = quoteLinesData._array.filter(item => item.extreme_parentquoteline === parentId);
                
                if (childItems.length > 0) {
                  // Calculate current total baseamount from children
                  const currentTotalBaseAmount = childItems.reduce((sum, child) => sum + (parseFloat(child.baseamount) || 0), 0);
                  
                  // Calculate ratio for proportional distribution
                  const ratio = currentTotalBaseAmount > 0 ? value / currentTotalBaseAmount : 1 / childItems.length;
                  
                  // Initialize parent totals
                  let totalExtendedAmount = 0;
                  let totalFullPriceWithDiscount = 0;
                  let totalFullPd = 0;
                  let totalManualdiscountamount = 0;
                  let totalSupplierBaseAmount = 0;
                  let totalTax = 0;
                  
                  // Recalculate each child with proportional baseamount
                  childItems.forEach(child => {
                    // Calculate new baseamount for this child
                    let newChildBaseAmount;
                    if (currentTotalBaseAmount > 0) {
                      newChildBaseAmount = (parseFloat(child.baseamount) || 0) * ratio;
                    } else {
                      newChildBaseAmount = value / childItems.length;
                    }
                    
                    // Calculate new priceperunit based on new baseamount
                    const quantity = child.quantity || 1;
                    const newPricePerUnit = newChildBaseAmount / quantity;
                    
                    // Recalculate with new values
                    const childRecalc = recalculateAmounts({
                      quantity: quantity,
                      supplierPricePerUnit: child.extreme_supplierpriceperunit || 0,
                      supplierDiscount: child.extreme_supplierdiscount || 0,
                      margin: child.extreme_margin || defaultMargin,
                      pricePerUnit: newPricePerUnit,
                      baseAmount: newChildBaseAmount,
                      discount: child.extreme_discount || 0,
                      TaxPercent: child.extreme_tax || 0
                    });
                    
                    // Update child in local store
                    quoteLinesData.update(child.quotedetailid, {
                      priceperunit: newPricePerUnit,
                      baseamount: newChildBaseAmount,
                      extreme_fullpricewithdiscount: childRecalc.fullPriceWithDiscount,
                      manualdiscountamount: childRecalc.manualDiscountAmount || childRecalc.customDiscountAmount,
                      tax: childRecalc.tax,
                      extendedamount: childRecalc.extendedAmount,
                      extreme_pd: childRecalc.pdPerUnit,
                      extreme_fullpd: childRecalc.fullPd,
                      extreme_margin: childRecalc.margin
                    });
                    
                    // Accumulate totals
                    totalExtendedAmount += parseFloat(childRecalc.extendedAmount) || 0;
                    totalFullPriceWithDiscount += parseFloat(childRecalc.fullPriceWithDiscount) || 0;
                    totalFullPd += parseFloat(childRecalc.fullPd) || 0;
                    totalManualdiscountamount += parseFloat(childRecalc.manualDiscountAmount || childRecalc.customDiscountAmount) || 0;
                    totalSupplierBaseAmount += parseFloat(child.extreme_supplierbaseamount) || 0;
                    totalTax += parseFloat(childRecalc.tax) || 0;
                  });
                  
                  // Set parent totals
                  newData.extendedamount = parseFloat(totalExtendedAmount.toFixed(2));
                  newData.extreme_fullpricewithdiscount = parseFloat(totalFullPriceWithDiscount.toFixed(2));
                  newData.extreme_fullpd = parseFloat(totalFullPd.toFixed(2));
                  newData.manualdiscountamount = parseFloat(totalManualdiscountamount.toFixed(2));
                  newData.extreme_supplierbaseamount = parseFloat(totalSupplierBaseAmount.toFixed(2));
                  newData.tax = parseFloat(totalTax.toFixed(2));
                }
              } else {
                // Regular item - just set the value
                newData.baseamount = value;
              }
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_discount',
            caption: 'Disc. %',
            dataType: 'number',
            width: 62,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              // Do so only if it is not parent item (SET)

              if (currentRowData.extreme_isparentitem !== true) {
                if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_tax !== null) {
                  const recalcResult = recalculateAmounts({

                    quantity: currentRowData.quantity,
                    supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                    supplierDiscount: currentRowData.extreme_supplierdiscount,
                    pricePerUnit: currentRowData.priceperunit ? currentRowData.priceperunit : null,
                    baseAmount: currentRowData.baseamount ? currentRowData.baseamount : null,
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
                  newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
                };
                if (currentRowData.extreme_tax !== null) {
                  newData.tax = (((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                  newData.extendedamount = ((((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity) * (1 + currentRowData.extreme_tax / 100)) - ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity)) + ((currentRowData.priceperunit * (1 - value / 100)) * currentRowData.quantity);
                };
              }
              else {
                // This is a parent SET - propagate discount to children and recalculate totals
                newData.extreme_discount = value;
                
                // Get all child items for this parent SET
                const parentId = currentRowData.quotedetailid;
                const childItems = quoteLinesData._array.filter(item => item.extreme_parentquoteline === parentId);
                
                if (childItems.length > 0) {
                  // Initialize parent totals
                  let totalBaseAmount = 0;
                  let totalExtendedAmount = 0;
                  let totalFullPriceWithDiscount = 0;
                  let totalFullPd = 0;
                  let totalManualdiscountamount = 0;
                  let totalSupplierBaseAmount = 0;
                  let totalTax = 0;
                  
                  // Recalculate each child with new discount
                  childItems.forEach(child => {
                    const childRecalc = recalculateAmounts({
                      quantity: child.quantity || 1,
                      supplierPricePerUnit: child.extreme_supplierpriceperunit || 0,
                      supplierDiscount: child.extreme_supplierdiscount || 0,
                      margin: child.extreme_margin || defaultMargin,
                      pricePerUnit: child.priceperunit || null,
                      baseAmount: child.baseamount || null,
                      discount: value,
                      TaxPercent: child.extreme_tax || 0
                    });
                    
                    // Update child in local store
                    quoteLinesData.update(child.quotedetailid, {
                      extreme_discount: value,
                      extreme_fullpricewithdiscount: childRecalc.fullPriceWithDiscount,
                      manualdiscountamount: childRecalc.manualDiscountAmount || childRecalc.customDiscountAmount,
                      tax: childRecalc.tax,
                      extendedamount: childRecalc.extendedAmount,
                      extreme_pd: childRecalc.pdPerUnit,
                      extreme_fullpd: childRecalc.fullPd
                    });
                    
                    // Accumulate totals from recalculated child
                    totalBaseAmount += parseFloat(child.baseamount) || 0;
                    totalExtendedAmount += parseFloat(childRecalc.extendedAmount) || 0;
                    totalFullPriceWithDiscount += parseFloat(childRecalc.fullPriceWithDiscount) || 0;
                    totalFullPd += parseFloat(childRecalc.fullPd) || 0;
                    totalManualdiscountamount += parseFloat(childRecalc.manualDiscountAmount || childRecalc.customDiscountAmount) || 0;
                    totalSupplierBaseAmount += parseFloat(child.extreme_supplierbaseamount) || 0;
                    totalTax += parseFloat(childRecalc.tax) || 0;
                  });
                  
                  // Set parent totals
                  newData.baseamount = parseFloat(totalBaseAmount.toFixed(2));
                  newData.extendedamount = parseFloat(totalExtendedAmount.toFixed(2));
                  newData.extreme_fullpricewithdiscount = parseFloat(totalFullPriceWithDiscount.toFixed(2));
                  newData.extreme_fullpd = parseFloat(totalFullPd.toFixed(2));
                  newData.manualdiscountamount = parseFloat(totalManualdiscountamount.toFixed(2));
                  newData.extreme_supplierbaseamount = parseFloat(totalSupplierBaseAmount.toFixed(2));
                  newData.tax = parseFloat(totalTax.toFixed(2));
                }
              }
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            }
          },
          {
            dataField: 'manualdiscountamount',
            caption: 'Discount Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            visible: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
          },
          // {
          //   dataField: 'extreme_pricewithdiscount',
          //   caption: 'Price w/discount',
          //   dataType: 'number',
          //   allowEditing: false,
          //   customizeText: function (cellInfo) {
          //     return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " \u20AC";
          //   }
          // },
          {
            dataField: 'extreme_fullpricewithdiscount',
            caption: 'Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_fullpricewithdiscount = value;
              if (currentRowData.priceperunit !== null && currentRowData.quantity !== null && currentRowData.extreme_tax !== null) {

                const recalcResult = recalculateAmounts({

                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  pricePerUnit: currentRowData.priceperunit ? currentRowData.priceperunit : null,
                  baseAmount: currentRowData.baseamount ? currentRowData.baseamount : null,
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
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

              };
            },
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            }
          },
          {
            dataField: 'extreme_vatsetting',
            caption: 'VAT %',
            width: 60,
            lookup: {
              dataSource(options) {
                // console.log('OPTIONS FROM VAT GROUP LOOKUP');
                // console.log(options);

                let filterQuery = null;
                if (options.data && options.data.productid && options.data.productid && isGuid(options.data.productid)) {
                  const productInfo = Xrm.WebApi.retrieveRecord("product", `${options.data.productid}`, "?$select=producttypecode");
                  if (options.isNewRow !== true) {
                    if (productInfo.producttypecode) {
                      filterQuery = ["productTypeCode", "=", productInfo.producttypecode]
                    }
                    else if (quoteLinesData._array.find(item => item.quotedetailid === options.data.quotedetailid).extreme_producttype) {
                      filterQuery = ["productTypeCode", "=", quoteLinesData._array.find(item => item.quotedetailid === options.data.quotedetailid).extreme_producttype]
                    }
                  }
                }

                return {
                  store: {
                    type: "array",
                    data: vatSettingsArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                  filter: filterQuery
                }
              },
              displayExpr: "varPercentFormat",
              valueExpr: 'id'
            },
            editorOptions: {
              acceptCustomValue: false,
              // popupWidth: 600,
              searchEnabled: true,
              searchExpr: ["name", "code", "varPercentFormat"],
              itemTemplate: function (data, index, container) {
                var containerFluid = $("<div>").addClass("container-fluid");
                var row = $("<div>").addClass("row text-wrap");
                $("<div>").addClass("col-2").text(productTypesArray.find(item => item.id === data["productTypeCode"]).name).appendTo(row);
                $("<div>").addClass("col-6").text(data["name"]).appendTo(row);
                $("<div>").addClass("col-2").text(data["code"]).appendTo(row);
                $("<div>").addClass("col-2").text(data["varPercentFormat"]).appendTo(row);
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
                e.component._popup.option('width', 400);
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_vatsetting = value;
              newData.extreme_producttype = vatSettingsArray.find(item => item.id === value).productTypeCode;
              newData.extreme_tax = vatSettingsArray.find(item => item.id === value).vat;
              const defaultTax = vatSettingsArray.find(item => item.id === value).vat;

              if (
                currentRowData.extreme_margin !== null &&
                currentRowData.extreme_supplierpriceperunit !== null &&
                currentRowData.extreme_discount !== null
              ) {
                const recalcResult = recalculateAmounts({

                  quantity: currentRowData.quantity,
                  supplierPricePerUnit: currentRowData.extreme_supplierpriceperunit,
                  supplierDiscount: currentRowData.extreme_supplierdiscount,
                  pricePerUnit: currentRowData.priceperunit ? currentRowData.priceperunit : null,
                  baseAmount: currentRowData.baseamount ? currentRowData.baseamount : null,
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
                newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage
              }

            },
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: isDraftStatus
          },
          {
            dataField: 'extreme_tax',
            caption: 'VAT % calc',
            dataType: 'number',
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              // console.log('cellInfo');
              // console.log(cellInfo);
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + " %";
            },
            visible: false
          },
          {
            dataField: 'tax',
            caption: 'VAT Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
            visible: false
          },
          {
            dataField: 'extreme_pd',
            caption: 'Profit Per Unit',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
            visible: false
          },
          {
            dataField: 'extreme_fullpd',
            caption: 'Gross Profit',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
            visible: false
          },
          {
            dataField: 'extendedamount',
            caption: 'Total Amount',
            dataType: 'number',
            //width: 100,
            format: {
              type: "fixedPoint",
              precision: 2
            },
            allowEditing: false,
            customizeText: function (cellInfo) {
              return cellInfo.valueText === "" || cellInfo.valueText === null ? cellInfo.valueText : cellInfo.valueText + ` ${quoteCurrencySymbol}`;
            },
          },
          {
            dataField: 'extreme_pricelist',
            caption: 'Price list',
            width: 130,
            wordWrapEnabled: false,
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: priceListsArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                  filter: options.data ? [['productid', '=', options.data.productid], "and", ['statuscode', '=', 100001]] : null,
                  postProcess: function (data) {
                    // data.unshift({ name: "Price list", amount: "Price", disabled: true });
                    return data;
                  }
                }
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            editorOptions: {
              acceptCustomValue: false,
              // popupWidth: 600,
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
                e.component._popup.option('width', 400);
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_pricelist = value;
              // console.log('NEW PRICE FROM PRICE LIST CHANGE');

              const newOrgPrice = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).amount_num;
              const newOrgCurrency = priceListsArray.find((item) => item.productid === currentRowData.productid && item.id === value).currency_code;
              const newOrgCurrencyValue = $(`#${newOrgCurrency}`).val() ? parseFloat($(`#${newOrgCurrency}`).val()) : 1;
              const newOrgCurrencySymbol = currenciesArray.find((item) => item.isocurrencycode == newOrgCurrency).currencysymbol;

              // console.log(newOrgPrice);
              // console.log(newOrgCurrency);
              // console.log(newOrgCurrencyValue);
              // console.log(newOrgCurrencySymbol);

              newData.extreme_pricelistpriceperunit = newOrgPrice;
              newData.extreme_pricelistcurrency = newOrgCurrencySymbol;


              var pricePerUnit = (newOrgPrice * newOrgCurrencyValue) * currentRowData.extreme_margin;
              const recalcResult = recalculateAmounts({

                quantity: currentRowData.quantity,
                supplierPricePerUnit: (newOrgPrice * newOrgCurrencyValue),
                supplierDiscount: currentRowData.extreme_supplierdiscount,
                margin: currentRowData.extreme_margin,
                discount: currentRowData.extreme_discount,
                TaxPercent: currentRowData.extreme_tax,
                pricePerUnit: pricePerUnit

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
              newData.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage

            }
          },
          {
            dataField: 'extreme_parentquoteline',
            caption: 'Parent QL',
            dataType: 'string',
            visible: false
          },
          {
            dataField: 'extreme_isparentitem',
            caption: 'Is Parent',
            dataType: 'boolean',
            visible: false
          },
          {
            dataField: 'extreme_producttype',
            caption: 'Type',
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: productTypesArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                }
              },
              displayExpr: 'name',
              valueExpr: 'id'
            },
            visible: false
          },
          {
            dataField: 'extreme_area',
            caption: 'Area',
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: areasArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                }
              },
              displayExpr: 'name',
              valueExpr: 'id'
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
              }
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_area = value;
              checkClassifyRows();
            },
            visible: false
          },
          {
            dataField: 'extreme_technology',
            caption: 'Technology',
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: techsArray,
                    key: "id"
                  },
                  paginate: true,
                  pageSize: 20,
                }
              },
              displayExpr: 'name',
              valueExpr: 'id'
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
              }
            },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_technology = value;
              checkClassifyRows();
            },
            visible: false
          },
          {
            dataField: 'extreme_vendorsupplier',
            caption: 'Vendor/Supplier',
            calculateDisplayValue: "name",
            lookup: {
              dataSource: {
                store: vendorSupplierODataStore,
                paginate: true,
                pageSize: 100,
                loadMode: 'raw',
                filter: [["extreme_relationshiptypeext", "=", 424000000], "or", ["extreme_relationshiptypeext", "=", 424000003]]
              },
              displayExpr: 'name',
              valueExpr: 'accountid'
            },
            editorOptions: {
              acceptCustomValue: false,
              searchEnabled: true,
              searchTimeout: SEARCH_TIMEOUT_MS, // Debounce search for better performance
              searchExpr: ["extreme_paname30characters", "name"],
              itemTemplate: function (data, index, container) {
                var row = $("<div>").addClass("row text-wrap");
                var containerFluid = $("<div>").addClass("container-fluid");
                $("<div>").addClass("col-4").text(data["extreme_paname30characters"]).appendTo(row);
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
                e.component._popup.option('width', 400);
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            // editorOptions: {
            //   acceptCustomValue: false,
            //   searchEnabled: true,
            //   onOpened: function (e) {
            //     heightAuto = false;
            //     if (heightAuto === false) {
            //       const iframeCorrentHeight = wrControl.getObject().offsetHeight;
            //       if (iframeCorrentHeight < 450) {
            //         wrControl.getObject().style.minHeight = "600px";
            //       }
            //     }
            //   },
            //   onClosed: function (e) {
            //     heightAuto = true;
            //   },
            //   onFocusOut: function (e) {
            //     heightAuto = true;
            //   }
            // },
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_vendorsupplier = value;
              checkClassifyRows();
            },
            visible: false
          },
          {
            dataField: 'extreme_createasset',
            caption: 'Asset?',
            width: 60,
            dataType: 'boolean',
            setCellValue: async function (newData, value, currentRowData) {
              if (typeof (value) === 'boolean') {
                if (currentRowData.extreme_isparentitem === true && value === true) {
                  quoteLinesData._array.filter(item => item.extreme_parentquoteline === currentRowData.quotedetailid).forEach(elm => {
                    Xrm.WebApi.updateRecord("quotedetail", `${elm.quotedetailid}`, { extreme_createasset: value })
                    elm.extreme_createasset = value;
                  })
                }
                newData.extreme_createasset = value;
              }
            }
          },
          {
            type: 'buttons',
            width: 70,
            buttons: [
              {
                hint: 'Description',
                icon: 'edit',
                visible(e) {
                  return true;
                },
                disabled(e) {
                  return false;
                },
                async onClick(e) {
                  const rowData = e.row.data;
                  const productName = rowData.extreme_customproductname || 'Product';
                  const currentDescription = rowData.extreme_productdescription || '';
                  const isReadOnly = !isDraftStatus;
                  
                  // Create custom popup in parent window document
                  const parentDoc = window.parent.document;
                  
                  // Remove existing popup if any
                  const existingPopup = parentDoc.getElementById('descriptionPopupOverlay');
                  if (existingPopup) existingPopup.remove();
                  
                  // Create overlay
                  const overlay = parentDoc.createElement('div');
                  overlay.id = 'descriptionPopupOverlay';
                  overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 999999;
                  `;
                  
                  // Create popup container
                  const popup = parentDoc.createElement('div');
                  popup.style.cssText = `
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    width: 500px;
                    max-width: 90%;
                    max-height: 80%;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  `;
                  
                  // Create header
                  const header = parentDoc.createElement('div');
                  header.style.cssText = `
                    padding: 16px 20px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  `;
                  
                  const title = parentDoc.createElement('span');
                  title.style.cssText = 'font-size: 16px; font-weight: 600; color: #333;';
                  title.textContent = productName.length > 35 ? productName.substring(0, 32) + '...' : productName;
                  
                  const closeBtn = parentDoc.createElement('button');
                  closeBtn.innerHTML = '&times;';
                  closeBtn.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    line-height: 1;
                  `;
                  closeBtn.onmouseover = () => closeBtn.style.color = '#333';
                  closeBtn.onmouseout = () => closeBtn.style.color = '#666';
                  
                  header.appendChild(title);
                  header.appendChild(closeBtn);
                  
                  // Create body with textarea
                  const body = parentDoc.createElement('div');
                  body.style.cssText = 'padding: 20px; flex: 1;';
                  
                  const label = parentDoc.createElement('label');
                  label.style.cssText = 'display: block; margin-bottom: 8px; font-size: 14px; color: #555;';
                  label.textContent = 'Description:';
                  
                  const textarea = parentDoc.createElement('textarea');
                  textarea.id = 'descriptionTextarea';
                  textarea.value = currentDescription;
                  textarea.readOnly = isReadOnly;
                  textarea.style.cssText = `
                    width: 100%;
                    height: 150px;
                    padding: 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 14px;
                    font-family: inherit;
                    resize: vertical;
                    box-sizing: border-box;
                    ${isReadOnly ? 'background: #f5f5f5; color: #666;' : ''}
                  `;
                  textarea.placeholder = 'Enter product description...';
                  
                  body.appendChild(label);
                  body.appendChild(textarea);
                  
                  // Create footer with buttons
                  const footer = parentDoc.createElement('div');
                  footer.style.cssText = `
                    padding: 16px 20px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                  `;
                  
                  const cancelBtn = parentDoc.createElement('button');
                  cancelBtn.textContent = isReadOnly ? 'Close' : 'Cancel';
                  cancelBtn.style.cssText = `
                    padding: 8px 20px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    font-size: 14px;
                    color: #333;
                  `;
                  cancelBtn.onmouseover = () => cancelBtn.style.background = '#f5f5f5';
                  cancelBtn.onmouseout = () => cancelBtn.style.background = 'white';
                  
                  footer.appendChild(cancelBtn);
                  
                  if (!isReadOnly) {
                    const saveBtn = parentDoc.createElement('button');
                    saveBtn.textContent = 'Save';
                    saveBtn.style.cssText = `
                      padding: 8px 20px;
                      border: none;
                      border-radius: 4px;
                      background: #0078d4;
                      color: white;
                      cursor: pointer;
                      font-size: 14px;
                    `;
                    saveBtn.onmouseover = () => saveBtn.style.background = '#106ebe';
                    saveBtn.onmouseout = () => saveBtn.style.background = '#0078d4';
                    
                    saveBtn.onclick = async () => {
                      const newDescription = textarea.value.trim();
                      saveBtn.disabled = true;
                      saveBtn.textContent = 'Saving...';
                      
                      try {
                        await Xrm.WebApi.updateRecord("quotedetail", `${rowData.quotedetailid}`, { 
                          extreme_productdescription: newDescription 
                        });
                        quoteLinesData.update(rowData.quotedetailid, { 
                          extreme_productdescription: newDescription 
                        });
                        dataGrid.refresh();
                        overlay.remove();
                      } catch (error) {
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Save';
                        Xrm.Navigation.openErrorDialog({
                          details: error,
                          errorCode: 400,
                          message: error.message
                        });
                      }
                    };
                    
                    footer.appendChild(saveBtn);
                  }
                  
                  // Close handlers
                  const closePopup = () => overlay.remove();
                  closeBtn.onclick = closePopup;
                  cancelBtn.onclick = closePopup;
                  
                  // ESC key to close
                  const escHandler = (evt) => {
                    if (evt.key === 'Escape') {
                      closePopup();
                      parentDoc.removeEventListener('keydown', escHandler);
                    }
                  };
                  parentDoc.addEventListener('keydown', escHandler);
                  
                  // Assemble popup
                  popup.appendChild(header);
                  popup.appendChild(body);
                  popup.appendChild(footer);
                  overlay.appendChild(popup);
                  parentDoc.body.appendChild(overlay);
                  
                  // Focus textarea
                  setTimeout(() => textarea.focus(), 100);
                },
              },
              // {
              //   hint: 'Duplicate',
              //   icon: 'copy',
              //   visible: isDraftStatus,
              //   async onClick(e) {
              //     const rowData = e.row.data;
              //     const productName = rowData.extreme_customproductname || 'this row';
                  
              //     // Don't allow duplicating parent items (sets)
              //     if (rowData.extreme_isparentitem === true) {
              //       await Xrm.Navigation.openAlertDialog({
              //         title: "Cannot Duplicate",
              //         text: "Cannot duplicate a set (parent item). Please duplicate individual items instead."
              //       });
              //       return;
              //     }
                  
              //     Xrm.Utility.showProgressIndicator('Duplicating... Please wait...');
                  
              //     try {
              //       // Build record for new quotedetail
              //       const record = {};
              //       record["quoteid@odata.bind"] = `/quotes(${quoteIdForm})`;
                    
              //       // Copy all relevant fields
              //       if (rowData.extreme_customproductname) record.extreme_customproductname = rowData.extreme_customproductname + " (Copy)";
              //       if (rowData.extreme_productdescription) record.extreme_productdescription = rowData.extreme_productdescription;
              //       if (rowData.extreme_pricelistpriceperunit || rowData.extreme_pricelistpriceperunit === 0) record.extreme_pricelistpriceperunit = rowData.extreme_pricelistpriceperunit;
              //       if (rowData.extreme_pricelistcurrency) record.extreme_pricelistcurrency = rowData.extreme_pricelistcurrency;
              //       if (rowData.extreme_supplierpriceperunit || rowData.extreme_supplierpriceperunit === 0) record.extreme_supplierpriceperunit = Number(parseFloat(rowData.extreme_supplierpriceperunit).toFixed(4));
              //       if (rowData.quantity || rowData.quantity === 0) record.quantity = rowData.quantity;
              //       if (rowData.extreme_supplierbaseamount || rowData.extreme_supplierbaseamount === 0) record.extreme_supplierbaseamount = Number(parseFloat(rowData.extreme_supplierbaseamount).toFixed(4));
              //       if (rowData.extreme_supplierdiscount || rowData.extreme_supplierdiscount === 0) record.extreme_supplierdiscount = rowData.extreme_supplierdiscount;
              //       if (rowData.extreme_margin || rowData.extreme_margin === 0) record.extreme_margin = rowData.extreme_margin;
              //       if (rowData.priceperunit || rowData.priceperunit === 0) record.priceperunit = rowData.priceperunit;
              //       if (rowData.baseamount || rowData.baseamount === 0) record.baseamount = Number(parseFloat(rowData.baseamount).toFixed(4));
              //       if (rowData.extreme_discount || rowData.extreme_discount === 0) record.extreme_discount = rowData.extreme_discount;
              //       if (rowData.manualdiscountamount || rowData.manualdiscountamount === 0) record.manualdiscountamount = Number(parseFloat(rowData.manualdiscountamount).toFixed(4));
              //       if (rowData.extreme_pricewithdiscount || rowData.extreme_pricewithdiscount === 0) record.extreme_pricewithdiscount = rowData.extreme_pricewithdiscount;
              //       if (rowData.extreme_fullpricewithdiscount || rowData.extreme_fullpricewithdiscount === 0) record.extreme_fullpricewithdiscount = rowData.extreme_fullpricewithdiscount;
              //       if (rowData.extreme_tax || rowData.extreme_tax === 0) record.extreme_tax = rowData.extreme_tax;
              //       if (rowData.tax || rowData.tax === 0) record.tax = Number(parseFloat(rowData.tax).toFixed(4));
              //       if (rowData.extreme_pd || rowData.extreme_pd === 0) record.extreme_pd = rowData.extreme_pd;
              //       if (rowData.extreme_fullpd || rowData.extreme_fullpd === 0) record.extreme_fullpd = rowData.extreme_fullpd;
              //       if (rowData.extendedamount || rowData.extendedamount === 0) record.extendedamount = Number(parseFloat(rowData.extendedamount).toFixed(4));
              //       if (typeof rowData.extreme_createasset === "boolean") record.extreme_createasset = rowData.extreme_createasset;
              //       if (rowData.extreme_producttype) record.extreme_producttype = rowData.extreme_producttype;
                    
              //       // Lookups
              //       if (rowData.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${rowData.extreme_pricelist})`;
              //       if (rowData.extreme_area) record["extreme_Area@odata.bind"] = `/extreme_areas(${rowData.extreme_area})`;
              //       if (rowData.extreme_technology) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${rowData.extreme_technology})`;
              //       if (rowData.extreme_vendorsupplier) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${rowData.extreme_vendorsupplier})`;
              //       if (rowData.extreme_vatsetting) {
              //         record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${rowData.extreme_vatsetting})`;
              //         const vatSetting = vatSettingsArray.find(item => item.id === rowData.extreme_vatsetting);
              //         if (vatSetting) record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatSetting.idVatGroup})`;
              //       }
                    
              //       // Product or custom product
              //       if (rowData.productid && rowData.extreme_customproductid) {
              //         // Custom product
              //         record.extreme_customproductid = rowData.extreme_customproductid;
              //         if (rowData.extreme_uomid) record.extreme_uomid = rowData.extreme_uomid;
              //       } else if (rowData.productid) {
              //         // Real product
              //         record["productid@odata.bind"] = `/products(${rowData.productid})`;
              //         if (rowData.uomid) record["uomid@odata.bind"] = `/uoms(${rowData.uomid})`;
              //       }
                    
              //       record.ispriceoverridden = true;
              //       record.extreme_isparentitem = false;
                    
              //       // If original row is a child of a set, copy to same parent
              //       if (rowData.extreme_parentquoteline) {
              //         record["extreme_ParentQuoteLine@odata.bind"] = `/quotedetails(${rowData.extreme_parentquoteline})`;
              //         // Sequence after siblings
              //         const siblings = quoteLinesData._array.filter(item => item.extreme_parentquoteline === rowData.extreme_parentquoteline);
              //         const parentSeq = quoteLinesData._array.find(p => p.quotedetailid === rowData.extreme_parentquoteline)?.sequencenumber || 0;
              //         record.sequencenumber = parentSeq + siblings.length + 1;
              //       } else {
              //         // New parent-level item
              //         record.sequencenumber = parseInt((quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length + 1) + "00");
              //       }
                    
              //       const result = await Xrm.WebApi.createRecord("quotedetail", record);
              //       const newId = result.id;
                    
              //       // Add to local store
              //       const newRowData = {
              //         ...rowData,
              //         quotedetailid: newId,
              //         extreme_customproductname: rowData.extreme_customproductname + " (Copy)",
              //         sequencenumber: record.sequencenumber,
              //         productnumber: rowData.extreme_customproductid || rowData.productnumber
              //       };
                    
              //       quoteLinesData.insert(newRowData);
              //       dataGrid.refresh();
                    
              //       Xrm.Utility.closeProgressIndicator();
                    
              //       // Refresh form in background
              //       formContext.data.refresh(false);
                    
              //     } catch (error) {
              //       Xrm.Utility.closeProgressIndicator();
              //       Xrm.Navigation.openErrorDialog({
              //         details: error,
              //         errorCode: 400,
              //         message: error.message
              //       });
              //     }
              //   }
              // },
              {
                name: 'delete',
                hint: 'Delete',
                icon: 'trash',
                visible: isDraftStatus,
                async onClick(e) {
                  const rowData = e.row.data;
                  const productName = rowData.extreme_customproductname || 'this row';
                  const isParent = rowData.extreme_isparentitem === true;
                  
                  // Check if this is a new unsaved row (no valid GUID)
                  const isNewUnsavedRow = !rowData.quotedetailid || !isGuid(rowData.quotedetailid);
                  
                  if (isNewUnsavedRow) {
                    // For new unsaved rows, just cancel the edit mode without any API calls
                    dataGrid.cancelEditData();
                    dataGrid.refresh();
                    return;
                  }
                  
                  // Check if already being deleted
                  if (deletingIds.has(rowData.quotedetailid)) {
                    return; // Already being deleted, skip
                  }
                  
                  // Count children if parent
                  let childCount = 0;
                  let childItems = [];
                  if (isParent) {
                    childItems = quoteLinesData._array.filter(
                      item => item.extreme_parentquoteline === rowData.quotedetailid
                    );
                    childCount = childItems.length;
                  }
                  
                  const confirmMessage = isParent && childCount > 0
                    ? `Are you sure you want to delete "${productName}" and its ${childCount} child item(s)?`
                    : `Are you sure you want to delete "${productName}"?`;
                  
                  const confirmResult = await Xrm.Navigation.openConfirmDialog({
                    title: "Confirm Delete",
                    text: confirmMessage,
                    confirmButtonLabel: "Delete",
                    cancelButtonLabel: "Cancel"
                  });
                  
                  if (!confirmResult.confirmed) return;
                  
                  Xrm.Utility.showProgressIndicator('Deleting... Please wait...');
                  
                  try {
                    const idsToRemove = [rowData.quotedetailid];
                    
                    // If parent, collect children IDs
                    if (isParent && childItems.length > 0) {
                      childItems.forEach(child => idsToRemove.push(child.quotedetailid));
                    }
                    
                    // Mark all IDs as being deleted to prevent onRowRemoving from re-deleting
                    idsToRemove.forEach(id => deletingIds.add(id));
                    
                    // Delete children first, then parent (to avoid FK issues)
                    if (isParent && childItems.length > 0) {
                      const childDeletePromises = childItems.map(child => 
                        Xrm.WebApi.deleteRecord("quotedetail", `${child.quotedetailid}`)
                          .catch(err => {
                            // Ignore 404 errors (already deleted)
                            if (!err.message?.includes('does not exist') && !err.message?.includes('ObjectDoesNotExist')) {
                              throw err;
                            }
                          })
                      );
                      await Promise.all(childDeletePromises);
                      
                      // Remove children from local store
                      childItems.forEach(child => quoteLinesData.remove(child.quotedetailid));
                    }
                    
                    // Now delete the parent/item itself
                    await Xrm.WebApi.deleteRecord("quotedetail", `${rowData.quotedetailid}`)
                      .catch(err => {
                        if (!err.message?.includes('does not exist') && !err.message?.includes('ObjectDoesNotExist')) {
                          throw err;
                        }
                      });
                    
                    // Remove from local store
                    quoteLinesData.remove(rowData.quotedetailid);
                    
                    // Reorder remaining parent items (fire-and-forget)
                    setTimeout(() => {
                      const reorderPromises = [];
                      const parentItems = quoteLinesData._array.filter(item => item.extreme_parentquoteline === null);
                      parentItems.forEach((item, i) => {
                        const newSeq = parseInt((i + 1) + "00");
                        if (item.sequencenumber !== newSeq) {
                          reorderPromises.push(Xrm.WebApi.updateRecord("quotedetail", `${item.quotedetailid}`, { sequencenumber: newSeq }));
                          item.sequencenumber = newSeq;
                        }
                      });
                      if (reorderPromises.length > 0) {
                        Promise.all(reorderPromises).catch(err => console.warn('Reorder warning:', err));
                      }
                    }, 100);
                    
                    dataGrid.refresh();
                    Xrm.Utility.closeProgressIndicator();
                    
                    // Clear deletingIds after a delay
                    setTimeout(() => {
                      idsToRemove.forEach(id => deletingIds.delete(id));
                    }, 2000);
                    
                    // Refresh form in background (don't await)
                    formContext.data.refresh(false);
                  } catch (error) {
                    // Clear deletingIds on error
                    deletingIds.clear();
                    Xrm.Utility.closeProgressIndicator();
                    Xrm.Navigation.openErrorDialog({
                      details: error,
                      errorCode: 400,
                      message: error.message
                    });
                  }
                }
              }
            ],
          }
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
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: 'trash',
                text: 'Delete Selected',
                width: 'auto',
                disabled: !isDraftStatus,
                visible: false,  // Hidden by default, shown when rows are selected
                elementAttr: {
                  id: "deleteSelectedBtn",
                },
                async onClick(e) {
                  const selectedRows = dataGrid.getSelectedRowsData();
                  
                  if (selectedRows.length === 0) {
                    Xrm.Navigation.openAlertDialog({
                      title: "No Selection",
                      text: "Please select rows to delete."
                    });
                    return;
                  }

                  const confirmResult = await Xrm.Navigation.openConfirmDialog({
                    title: "Confirm Delete",
                    text: `Are you sure you want to delete ${selectedRows.length} selected row(s)? This will also delete any child items of selected sets.`,
                    confirmButtonLabel: "Delete",
                    cancelButtonLabel: "Cancel"
                  });

                  if (!confirmResult.confirmed) return;

                  Xrm.Utility.showProgressIndicator(`Deleting ${selectedRows.length} rows... Please wait...`);

                  try {
                    // Separate parent items and regular items
                    const parentRows = selectedRows.filter(row => row.extreme_isparentitem === true);
                    const regularRows = selectedRows.filter(row => row.extreme_isparentitem !== true);
                    
                    // Collect all child IDs for parent items
                    const allChildIds = [];
                    parentRows.forEach(parent => {
                      const children = quoteLinesData._array.filter(
                        item => item.extreme_parentquoteline === parent.quotedetailid
                      );
                      children.forEach(child => allChildIds.push(child.quotedetailid));
                    });
                    
                    // Collect all IDs to delete
                    const allIdsToDelete = new Set();
                    allChildIds.forEach(id => allIdsToDelete.add(id));
                    regularRows.forEach(row => allIdsToDelete.add(row.quotedetailid));
                    parentRows.forEach(row => allIdsToDelete.add(row.quotedetailid));
                    
                    // Mark all IDs as being deleted
                    allIdsToDelete.forEach(id => deletingIds.add(id));
                    
                    // Delete in order: 1) child items of sets, 2) regular items and children in selection, 3) parent items
                    // This ensures we don't have FK constraint issues
                    
                    // Step 1: Delete all child items first (children of parent items)
                    if (allChildIds.length > 0) {
                      await processBatchesInParallel(allChildIds, async (id) => {
                        try {
                          await Xrm.WebApi.deleteRecord("quotedetail", `${id}`);
                        } catch (err) {
                          // Ignore 404 errors
                          if (!err.message?.includes('does not exist') && !err.message?.includes('ObjectDoesNotExist')) {
                            console.warn('Delete child warning:', err);
                          }
                        }
                        quoteLinesData.remove(id);
                        return id;
                      });
                    }
                    
                    // Step 2: Delete regular items (non-parent)
                    if (regularRows.length > 0) {
                      await processBatchesInParallel(regularRows.map(r => r.quotedetailid), async (id) => {
                        try {
                          await Xrm.WebApi.deleteRecord("quotedetail", `${id}`);
                        } catch (err) {
                          if (!err.message?.includes('does not exist') && !err.message?.includes('ObjectDoesNotExist')) {
                            console.warn('Delete item warning:', err);
                          }
                        }
                        quoteLinesData.remove(id);
                        return id;
                      });
                    }
                    
                    // Step 3: Delete parent items last
                    if (parentRows.length > 0) {
                      await processBatchesInParallel(parentRows.map(r => r.quotedetailid), async (id) => {
                        try {
                          await Xrm.WebApi.deleteRecord("quotedetail", `${id}`);
                        } catch (err) {
                          if (!err.message?.includes('does not exist') && !err.message?.includes('ObjectDoesNotExist')) {
                            console.warn('Delete parent warning:', err);
                          }
                        }
                        quoteLinesData.remove(id);
                        return id;
                      });
                    }

                    // Clear selection and refresh grid immediately
                    dataGrid.clearSelection();
                    dataGrid.refresh();
                    Xrm.Utility.closeProgressIndicator();
                    
                    // Clear deletingIds after a delay
                    setTimeout(() => {
                      allIdsToDelete.forEach(id => deletingIds.delete(id));
                    }, 2000);
                    
                    // Refresh form in background (don't block UI)
                    formContext.data.refresh(false);

                    // Lazy reorder in background (fire-and-forget)
                    setTimeout(async () => {
                      try {
                        const parentItems = quoteLinesData._array
                          .filter(item => item.extreme_parentquoteline === null)
                          .sort((a, b) => a.sequencenumber - b.sequencenumber);
                        
                        const reorderUpdates = [];
                        parentItems.forEach((item, i) => {
                          const newSeq = parseInt((i + 1) + "00");
                          if (item.sequencenumber !== newSeq) {
                            reorderUpdates.push({ id: item.quotedetailid, seq: newSeq });
                            item.sequencenumber = newSeq;
                          }
                        });

                        // Also fix child items
                        const childItems = quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null);
                        childItems.forEach((item) => {
                          const parent = quoteLinesData._array.find(p => p.quotedetailid === item.extreme_parentquoteline);
                          if (parent) {
                            const siblings = childItems.filter(c => c.extreme_parentquoteline === parent.quotedetailid)
                              .sort((a, b) => a.sequencenumber - b.sequencenumber);
                            const idx = siblings.findIndex(s => s.quotedetailid === item.quotedetailid);
                            const newSeq = parent.sequencenumber + (idx + 1);
                            if (item.sequencenumber !== newSeq) {
                              reorderUpdates.push({ id: item.quotedetailid, seq: newSeq });
                              item.sequencenumber = newSeq;
                            }
                          }
                        });

                        if (reorderUpdates.length > 0) {
                          await processBatchesInParallel(reorderUpdates, async ({ id, seq }) => {
                            return Xrm.WebApi.updateRecord("quotedetail", `${id}`, { sequencenumber: seq });
                          });
                        }
                      } catch (err) {
                        console.warn('Background reorder warning:', err);
                      }
                    }, 500);

                  } catch (error) {
                    // Clear deletingIds on error
                    deletingIds.clear();
                    Xrm.Utility.closeProgressIndicator();
                    Xrm.Navigation.openErrorDialog({
                      details: error,
                      errorCode: 400,
                      message: error.message
                    });
                  }
                }
              },
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: 'bulletlist',
                text: 'Add existing',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);

                  isAddingSet = false;
                  // console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("productid", "editorOptions", {
                    acceptCustomValue: false,
                    // popupWidth: 600,
                    searchEnabled: true,
                    // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                    searchExpr: ["productnumber", "name"],
                    itemTemplate: function (data, index, container) {
                      var row = $("<div>").addClass("row text-wrap");
                      var containerFluid = $("<div>").addClass("container-fluid");
                      $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
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

                      var newItem = {};
                      newItem.productid = newIdForCustomProducts++;
                      newItem.name = args.text;
                      newItem.productnumber = args.text;
                      customProductsStore.insert(newItem);
                      args.customItem = newItem;
                    },
                    onOpened: function (e) {
                      heightAuto = false;
                      if (heightAuto === false) {
                        const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                        if (iframeCorrentHeight < 450) {
                          wrControl.getObject().style.minHeight = "600px";
                        }
                      }
                      e.component._popup.option('width', 400);
                    },
                    onClosed: function (e) {
                      heightAuto = true;
                    },
                    onFocusOut: function (e) {
                      heightAuto = true;
                    }
                  });

                  dataGrid.columnOption("productid", "lookup", {
                    dataSource(options) {

                      let filterQuery = null;

                      if (options.data) {
                        options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
                      }

                      return {
                        store: productsODataStore,
                        // searchExpr: ["productnumber", "name"],
                        paginate: true,
                        pageSize: 100,
                        loadMode: 'raw',
                        filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
                      }
                    },
                    displayExpr: 'productnumber',
                    valueExpr: 'productid',
                  });

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
                  dataGrid.columnOption("uomid", "allowEditing", true);
                  dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_margin", "allowEditing", true);
                  dataGrid.columnOption("priceperunit", "allowEditing", true);
                  dataGrid.columnOption("baseamount", "allowEditing", true);
                  dataGrid.columnOption("extreme_discount", "allowEditing", true);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
                  dataGrid.columnOption("extreme_createasset", "allowEditing", true);
                  dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);

                  dataGrid.addRow();

                },
              },
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: 'plus',
                text: 'Add new',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);

                  isAddingSet = false;
                  // console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("productid", "editorOptions", {
                    acceptCustomValue: true,
                    // popupWidth: 600,
                    searchEnabled: true,
                    // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                    searchExpr: ["productnumber", "name"],
                    itemTemplate: function (data, index, container) {
                      var row = $("<div>").addClass("row text-wrap");
                      var containerFluid = $("<div>").addClass("container-fluid");
                      $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
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

                      var newItem = {};
                      newItem.productid = newIdForCustomProducts++;
                      newItem.name = args.text;
                      newItem.productnumber = args.text;
                      customProductsStore.insert(newItem);
                      args.customItem = newItem;
                    },
                    onOpened: function (e) {
                      heightAuto = false;
                      if (heightAuto === false) {
                        const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                        if (iframeCorrentHeight < 450) {
                          wrControl.getObject().style.minHeight = "600px";
                        }
                      }
                      e.component._popup.option('width', 400);
                    },
                    onClosed: function (e) {
                      heightAuto = true;
                    },
                    onFocusOut: function (e) {
                      heightAuto = true;
                    }
                  });

                  dataGrid.columnOption("productid", "lookup", {
                    dataSource: {
                      store: customProductsStore,
                    },
                    displayExpr: 'productnumber',
                    valueExpr: 'productid',
                  });

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
                  dataGrid.columnOption("uomid", "allowEditing", true);
                  dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_margin", "allowEditing", true);
                  dataGrid.columnOption("priceperunit", "allowEditing", true);
                  dataGrid.columnOption("baseamount", "allowEditing", true);
                  dataGrid.columnOption("extreme_discount", "allowEditing", true);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
                  dataGrid.columnOption("extreme_createasset", "allowEditing", true);
                  dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);

                  dataGrid.addRow();

                },
              },
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: 'increaseindent',
                text: 'Add existing set',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);

                  isAddingSet = true;
                  // console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("productid", "editorOptions", {
                    acceptCustomValue: false,
                    // popupWidth: 600,
                    searchEnabled: true,
                    // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                    searchExpr: ["productnumber", "name"],
                    itemTemplate: function (data, index, container) {
                      var row = $("<div>").addClass("row text-wrap");
                      var containerFluid = $("<div>").addClass("container-fluid");
                      $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
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

                      var newItem = {};
                      newItem.productid = newIdForCustomProducts++;
                      newItem.name = args.text;
                      newItem.productnumber = args.text;
                      customProductsStore.insert(newItem);
                      args.customItem = newItem;
                    },
                    onOpened: function (e) {
                      heightAuto = false;
                      if (heightAuto === false) {
                        const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                        if (iframeCorrentHeight < 450) {
                          wrControl.getObject().style.minHeight = "600px";
                        }
                      }
                      e.component._popup.option('width', 400);
                    },
                    onClosed: function (e) {
                      heightAuto = true;
                    },
                    onFocusOut: function (e) {
                      heightAuto = true;
                    }
                  });

                  dataGrid.columnOption("productid", "lookup", {
                    dataSource(options) {

                      let filterQuery = null;

                      if (options.data) {
                        options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
                      }

                      return {
                        store: productsODataStore,
                        // searchExpr: ["productnumber", "name"],
                        paginate: true,
                        pageSize: 100,
                        loadMode: 'raw',
                        filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
                      }
                    },
                    displayExpr: 'productnumber',
                    valueExpr: 'productid',
                  });

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", false);
                  // dataGrid.columnOption("uomid", "allowEditing", false);
                  // dataGrid.columnOption("uomid", "validationRules", null);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_margin", "allowEditing", false);
                  dataGrid.columnOption("priceperunit", "allowEditing", false);
                  dataGrid.columnOption("baseamount", "allowEditing", false);
                  dataGrid.columnOption("extreme_discount", "allowEditing", false);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", false);
                  dataGrid.columnOption("extreme_createasset", "allowEditing", false);
                  dataGrid.columnOption("extreme_vatsetting", "allowEditing", false);

                  dataGrid.addRow();

                },
              },
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: 'plus',
                text: 'Add new set',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);

                  isAddingSet = true;
                  // console.log("isAddingSet: ", isAddingSet);

                  dataGrid.columnOption("productid", "editorOptions", {
                    acceptCustomValue: true,
                    // popupWidth: 600,
                    searchEnabled: true,
                    // searchExpr: ["productId", "productName", "priceListItemAmountFormatted"],
                    searchExpr: ["productnumber", "name"],
                    itemTemplate: function (data, index, container) {
                      var row = $("<div>").addClass("row text-wrap");
                      var containerFluid = $("<div>").addClass("container-fluid");
                      $("<div>").addClass("col-3").text(data["productnumber"]).appendTo(row);
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

                      var newItem = {};
                      newItem.productid = newIdForCustomProducts++;
                      newItem.name = args.text;
                      newItem.productnumber = args.text;
                      customProductsStore.insert(newItem);
                      args.customItem = newItem;
                    },
                    onOpened: function (e) {
                      heightAuto = false;
                      if (heightAuto === false) {
                        const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                        if (iframeCorrentHeight < 450) {
                          wrControl.getObject().style.minHeight = "600px";
                        }
                      }
                      e.component._popup.option('width', 400);
                    },
                    onClosed: function (e) {
                      heightAuto = true;
                    },
                    onFocusOut: function (e) {
                      heightAuto = true;
                    }
                  });

                  dataGrid.columnOption("productid", "lookup", {
                    dataSource: {
                      store: customProductsStore,
                    },
                    displayExpr: 'productnumber',
                    valueExpr: 'productid',
                  });

                  dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", false);
                  // dataGrid.columnOption("uomid", "allowEditing", false);
                  // dataGrid.columnOption("uomid", "validationRules", null);
                  dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_margin", "allowEditing", false);
                  dataGrid.columnOption("priceperunit", "allowEditing", false);
                  dataGrid.columnOption("baseamount", "allowEditing", false);
                  dataGrid.columnOption("extreme_discount", "allowEditing", false);
                  dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", false);
                  dataGrid.columnOption("extreme_pricelist", "allowEditing", false);
                  dataGrid.columnOption("extreme_createasset", "allowEditing", false);
                  dataGrid.columnOption("extreme_vatsetting", "allowEditing", false);

                  dataGrid.addRow();

                },
              },
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: 'selectall',
                text: 'Batch Add',
                width: 'auto',
                disabled: !isDraftStatus,
                onClick: async function(e) {
                  // Array to store selected items for batch add
                  let selectedItemsForBatch = [];

                  // Create custom popup in parent window document (like description popup)
                  const parentDoc = window.parent.document;
                  
                  // Remove existing popup if any
                  const existingPopup = parentDoc.getElementById('batchAddPopupOverlay');
                  if (existingPopup) existingPopup.remove();
                  
                  // Create overlay
                  const overlay = parentDoc.createElement('div');
                  overlay.id = 'batchAddPopupOverlay';
                  overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 999999;
                  `;
                  
                  // Create popup container
                  const popup = parentDoc.createElement('div');
                  popup.style.cssText = `
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    width: 900px;
                    max-width: 90%;
                    height: 700px;
                    max-height: 90%;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  `;
                  
                  // Create header
                  const header = parentDoc.createElement('div');
                  header.style.cssText = `
                    padding: 16px 20px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
                    border-radius: 8px 8px 0 0;
                  `;
                  
                  const title = parentDoc.createElement('span');
                  title.style.cssText = 'font-size: 16px; font-weight: 600; color: #fff;';
                  title.textContent = 'Batch Add Products & Sets';
                  
                  const closeBtn = parentDoc.createElement('button');
                  closeBtn.innerHTML = '&times;';
                  closeBtn.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #fff;
                    padding: 0;
                    line-height: 1;
                  `;
                  closeBtn.onmouseover = () => closeBtn.style.opacity = '0.7';
                  closeBtn.onmouseout = () => closeBtn.style.opacity = '1';
                  closeBtn.onclick = () => overlay.remove();
                  
                  header.appendChild(title);
                  header.appendChild(closeBtn);
                  
                  // Create body with two panels
                  const body = parentDoc.createElement('div');
                  body.style.cssText = 'display: flex; flex: 1; overflow: hidden;';
                  
                  // Left panel - Search
                  const leftPanel = parentDoc.createElement('div');
                  leftPanel.style.cssText = `
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid #e0e0e0;
                    padding: 15px;
                  `;
                  
                  const searchTitle = parentDoc.createElement('h4');
                  searchTitle.textContent = 'Search Products & Sets';
                  searchTitle.style.cssText = 'margin: 0 0 10px 0; color: #333; font-size: 14px;';
                  
                  const searchInput = parentDoc.createElement('input');
                  searchInput.type = 'text';
                  searchInput.placeholder = 'Type to search products or sets...';
                  searchInput.style.cssText = `
                    width: 100%;
                    height: 36px;
                    padding: 0 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    box-sizing: border-box;
                  `;
                  
                  const searchResultsList = parentDoc.createElement('div');
                  searchResultsList.style.cssText = `
                    flex: 1;
                    overflow-y: auto;
                    margin-top: 10px;
                    border: 1px solid #eee;
                    border-radius: 4px;
                  `;
                  searchResultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Type at least 2 characters to search...</div>';
                  
                  leftPanel.appendChild(searchTitle);
                  leftPanel.appendChild(searchInput);
                  leftPanel.appendChild(searchResultsList);
                  
                  // Right panel - Selected items
                  const rightPanel = parentDoc.createElement('div');
                  rightPanel.style.cssText = `
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 15px;
                  `;
                  
                  const selectedTitle = parentDoc.createElement('h4');
                  selectedTitle.textContent = 'Selected Items';
                  selectedTitle.style.cssText = 'margin: 0 0 5px 0; color: #333; font-size: 14px;';
                  
                  const selectedCount = parentDoc.createElement('span');
                  selectedCount.textContent = '0 item(s) selected';
                  selectedCount.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 10px; display: block;';
                  
                  const selectedItemsList = parentDoc.createElement('div');
                  selectedItemsList.style.cssText = `
                    flex: 1;
                    overflow-y: auto;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 5px;
                  `;
                  selectedItemsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No items selected</div>';
                  
                  rightPanel.appendChild(selectedTitle);
                  rightPanel.appendChild(selectedCount);
                  rightPanel.appendChild(selectedItemsList);
                  
                  body.appendChild(leftPanel);
                  body.appendChild(rightPanel);
                  
                  // Create footer with buttons
                  const footer = parentDoc.createElement('div');
                  footer.style.cssText = `
                    padding: 12px 20px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    background: #f9f9f9;
                    border-radius: 0 0 8px 8px;
                  `;
                  
                  const cancelBtn = parentDoc.createElement('button');
                  cancelBtn.textContent = 'Cancel';
                  cancelBtn.style.cssText = `
                    padding: 8px 20px;
                    border: 1px solid #ddd;
                    background: #fff;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                  `;
                  cancelBtn.onclick = () => overlay.remove();
                  
                  const addBtn = parentDoc.createElement('button');
                  addBtn.textContent = 'Add Selected';
                  addBtn.style.cssText = `
                    padding: 8px 20px;
                    border: none;
                    background: #28a745;
                    color: #fff;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                  `;
                  addBtn.onmouseover = () => addBtn.style.background = '#218838';
                  addBtn.onmouseout = () => addBtn.style.background = '#28a745';
                  addBtn.onclick = async () => {
                    if (selectedItemsForBatch.length === 0) {
                      showParentToast('Please select at least one item to add.', 'warning', 3000);
                      return;
                    }
                    
                    overlay.remove();
                    const totalItems = selectedItemsForBatch.length;
                    
                    for (let i = 0; i < selectedItemsForBatch.length; i++) {
                      const item = selectedItemsForBatch[i];
                      Xrm.Utility.showProgressIndicator(`Adding product ${i + 1}/${totalItems}... Please wait...`);
                      
                      try {
                        await addBatchItem(item, quoteIdForm, quoteLinesData, dataGrid, Xrm, formContext, recalculateAmounts, currenciesArray, quoteCurrencySymbol, vatSettingsArray, defaultMargin, taxPercentOfAccount.extreme_tax);
                      } catch (error) {
                        console.error(`Error adding item ${item.name}:`, error);
                      }
                    }
                    
                    Xrm.Utility.closeProgressIndicator();
                    
                    // Refresh the grid and form
                    await setClientApiContext(Xrm, formContext);
                    formContext.data.refresh(true);
                    
                    showParentToast(`Successfully added ${totalItems} item(s).`, 'success', 3000);
                  };
                  
                  footer.appendChild(cancelBtn);
                  footer.appendChild(addBtn);
                  
                  popup.appendChild(header);
                  popup.appendChild(body);
                  popup.appendChild(footer);
                  overlay.appendChild(popup);
                  parentDoc.body.appendChild(overlay);
                  
                  // Focus on search input
                  searchInput.focus();
                  
                  // Function to update selected items list display
                  const updateSelectedList = () => {
                    selectedCount.textContent = `${selectedItemsForBatch.length} item(s) selected`;
                    if (selectedItemsForBatch.length === 0) {
                      selectedItemsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No items selected</div>';
                      return;
                    }
                    
                    selectedItemsList.innerHTML = '';
                    selectedItemsForBatch.forEach((item, idx) => {
                      const itemDiv = parentDoc.createElement('div');
                      itemDiv.style.cssText = 'display: flex; align-items: center; padding: 6px 8px; border-bottom: 1px solid #eee;';
                      
                      // Determine icon based on type
                      let selIcon, selColor;
                      if (item.isSet) {
                        selIcon = '&#128193;'; // 📁 folder
                        selColor = '#ff6b35';
                      } else if (!item.isSet && item.producttypecode === 3) {
                        selIcon = '&#128295;'; // 🔧 wrench
                        selColor = '#7b1fa2';
                      } else {
                        selIcon = '&#128230;'; // 📦 package
                        selColor = '#0078d4';
                      }
                      
                      const icon = parentDoc.createElement('span');
                      icon.innerHTML = selIcon;
                      icon.style.cssText = `margin-right: 10px; font-size: 15px; color: ${selColor};`;
                      
                      const info = parentDoc.createElement('div');
                      info.style.cssText = 'flex: 1; overflow: hidden;';
                      info.innerHTML = `
                        <div style="font-weight: 600; font-size: 12px;">${item.productnumber}</div>
                        <div style="font-size: 11px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                      `;
                      
                      const removeBtn = parentDoc.createElement('span');
                      removeBtn.innerHTML = '&times;';
                      removeBtn.style.cssText = 'cursor: pointer; color: #d32f2f; font-size: 18px; padding: 5px;';
                      removeBtn.onclick = () => {
                        selectedItemsForBatch.splice(idx, 1);
                        updateSelectedList();
                        // Update search results to show Add button again and re-attach onclick
                        const existingBtn = searchResultsList.querySelector(`[data-productid="${item.productid}"] .add-item-btn`);
                        if (existingBtn) {
                          existingBtn.textContent = 'Add';
                          existingBtn.style.backgroundColor = '#0078d4';
                          existingBtn.style.cursor = 'pointer';
                          existingBtn.onclick = (evt) => {
                            evt.stopPropagation();
                            selectedItemsForBatch.push(item);
                            existingBtn.textContent = 'Added';
                            existingBtn.style.backgroundColor = '#ccc';
                            existingBtn.style.cursor = 'default';
                            existingBtn.onclick = null;
                            updateSelectedList();
                          };
                        }
                      };
                      
                      itemDiv.appendChild(icon);
                      itemDiv.appendChild(info);
                      itemDiv.appendChild(removeBtn);
                      selectedItemsList.appendChild(itemDiv);
                    });
                  };
                  
                  // Debounced search function
                  let searchTimeout;
                  searchInput.oninput = () => {
                    clearTimeout(searchTimeout);
                    const searchValue = searchInput.value.trim();
                    
                    if (searchValue.length < 2) {
                      searchResultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Type at least 2 characters to search...</div>';
                      return;
                    }
                    
                    searchResultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Searching...</div>';
                    
                    searchTimeout = setTimeout(async () => {
                      try {
                        const filter = `$filter=(contains(productnumber,'${searchValue}') or contains(name,'${searchValue}')) and statecode eq 0`;
                        const results = await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,name,productnumber,extreme_isparent,_defaultuomid_value,_pricelevelid_value,producttypecode&${filter}&$top=50`);
                        
                        if (results.entities.length === 0) {
                          searchResultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No results found</div>';
                          return;
                        }
                        
                        searchResultsList.innerHTML = '';
                        results.entities.forEach(item => {
                          const isSet = item.extreme_isparent === true;
                          const isService = !isSet && item.producttypecode === 3;
                          const isSelected = selectedItemsForBatch.some(s => s.productid === item.productid);
                          
                          // Determine icon, color and label based on type
                          let itemIcon, itemColor, itemBgColor, itemLabel;
                          if (isSet) {
                            itemIcon = '&#128193;'; // 📁 folder
                            itemColor = '#ff6b35';
                            itemBgColor = '#fff3e0';
                            itemLabel = 'Set';
                          } else if (isService) {
                            itemIcon = '&#128295;'; // 🔧 wrench
                            itemColor = '#7b1fa2';
                            itemBgColor = '#f3e5f5';
                            itemLabel = 'Service';
                          } else {
                            itemIcon = '&#128230;'; // 📦 package
                            itemColor = '#0078d4';
                            itemBgColor = '#e3f2fd';
                            itemLabel = 'Product';
                          }
                          
                          const itemDiv = parentDoc.createElement('div');
                          itemDiv.setAttribute('data-productid', item.productid);
                          itemDiv.style.cssText = 'display: flex; align-items: center; padding: 6px 10px; border-bottom: 1px solid #eee; cursor: pointer;';
                          itemDiv.onmouseover = () => itemDiv.style.backgroundColor = '#f5f5f5';
                          itemDiv.onmouseout = () => itemDiv.style.backgroundColor = '';
                          
                          const icon = parentDoc.createElement('span');
                          icon.innerHTML = itemIcon;
                          icon.style.cssText = `margin-right: 10px; font-size: 17px; color: ${itemColor};`;
                          
                          const info = parentDoc.createElement('div');
                          info.style.cssText = 'flex: 1; overflow: hidden;';
                          info.innerHTML = `
                            <div style="font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.productnumber} <span style="font-weight: 400; color: #666;">- ${item.name}</span></div>
                            <span style="font-size: 10px; padding: 1px 6px; border-radius: 3px; background-color: ${itemBgColor}; color: ${itemColor}; display: inline-block;">${itemLabel}</span>
                          `;
                          
                          const addItemBtn = parentDoc.createElement('button');
                          addItemBtn.className = 'add-item-btn';
                          addItemBtn.textContent = isSelected ? 'Added' : 'Add';
                          addItemBtn.style.cssText = `
                            padding: 5px 15px;
                            background-color: ${isSelected ? '#ccc' : '#0078d4'};
                            color: #fff;
                            border: none;
                            border-radius: 4px;
                            cursor: ${isSelected ? 'default' : 'pointer'};
                            font-size: 12px;
                          `;
                          
                          if (!isSelected) {
                            addItemBtn.onclick = (evt) => {
                              evt.stopPropagation();
                              
                              selectedItemsForBatch.push({
                                productid: item.productid,
                                name: item.name,
                                productnumber: item.productnumber,
                                isSet: isSet,
                                defaultuomid: item._defaultuomid_value,
                                pricelevelid: item._pricelevelid_value,
                                producttypecode: item.producttypecode
                              });
                              
                              addItemBtn.textContent = 'Added';
                              addItemBtn.style.backgroundColor = '#ccc';
                              addItemBtn.style.cursor = 'default';
                              addItemBtn.onclick = null;
                              
                              updateSelectedList();
                            };
                          }
                          
                          itemDiv.appendChild(icon);
                          itemDiv.appendChild(info);
                          itemDiv.appendChild(addItemBtn);
                          searchResultsList.appendChild(itemDiv);
                        });
                      } catch (error) {
                        console.error('Search error:', error);
                        searchResultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #d32f2f;">Search error. Please try again.</div>';
                      }
                    }, SEARCH_TIMEOUT_MS);
                  };
                  
                  // Close on Escape key
                  const escHandler = (evt) => {
                    if (evt.key === 'Escape') {
                      overlay.remove();
                      parentDoc.removeEventListener('keydown', escHandler);
                    }
                  };
                  parentDoc.addEventListener('keydown', escHandler);
                }
              }
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: "triangledown",
                text: 'Compact',
                width: 'auto',
                elementAttr: {
                  id: "compactBtn",
                },
                disabled: true,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);
                  dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible', false);
                  // dataGrid.columnOption('extreme_pricelistcurrency', 'visible', !dataGrid.columnOption('extreme_pricelistcurrency', 'visible'));
                  dataGrid.columnOption('extreme_supplierdiscount', 'visible', false);
                  dataGrid.columnOption('extreme_pd', 'visible', false);
                  dataGrid.columnOption('extreme_fullpd', 'visible', false);
                  dataGrid.columnOption('manualdiscountamount', 'visible', false);
                  dataGrid.columnOption('tax', 'visible', false);
                  // e.component.option('text', dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? 'Extended' : 'Compact');

                  // reset all columns after classify
                  if ($('#classifyBtn').dxButton('instance').option('disabled') === true) {
                    // console.log('ALL COLUMNS');
                    // console.log(dataGrid.option('columns'));
                    dataGrid.option('columns').forEach(col => {
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
                        col.dataField !== "extreme_parentquoteline" &&
                        col.dataField !== "extreme_isparentitem" &&
                        col.dataField !== "extreme_producttype"
                      ) {
                        dataGrid.columnOption(col.dataField, 'visible', true);
                      }
                    });

                    dataGrid.option('filterValue', [
                      [
                        ["extreme_parentquoteline", "=", null],
                        "and",
                        ["extreme_isparentitem", "=", false]
                      ],
                      "or",
                      [
                        ["extreme_parentquoteline", "=", null],
                        "and",
                        ["extreme_isparentitem", "=", true]
                      ],
                    ]);

                    // dataGrid.columnOption('extreme_producttype', 'visible', false);
                    dataGrid.columnOption('extreme_area', 'visible', false);
                    dataGrid.columnOption('extreme_technology', 'visible', false);
                    dataGrid.columnOption('extreme_vendorsupplier', 'visible', false);

                  }

                  $('#extendedBtn').dxButton('instance').option('disabled', false);
                  $('#classifyBtn').dxButton('instance').option('disabled', false);
                  e.component.option('disabled', true);
                },
              },
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                icon: "expandform",
                text: 'Extended',
                width: 'auto',
                elementAttr: {
                  id: "extendedBtn",
                },
                disabled: false,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);
                  dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible', true);
                  // dataGrid.columnOption('extreme_pricelistcurrency', 'visible', !dataGrid.columnOption('extreme_pricelistcurrency', 'visible'));
                  dataGrid.columnOption('extreme_supplierdiscount', 'visible', true);
                  dataGrid.columnOption('extreme_pd', 'visible', true);
                  dataGrid.columnOption('extreme_fullpd', 'visible', true);
                  dataGrid.columnOption('manualdiscountamount', 'visible', true);
                  dataGrid.columnOption('tax', 'visible', true);
                  // e.component.option('text', dataGrid.columnOption('extreme_pricelistpriceperunit', 'visible') ? 'Extended' : 'Compact');

                  // reset all columns after classify
                  if ($('#classifyBtn').dxButton('instance').option('disabled') === true) {
                    // console.log('ALL COLUMNS');
                    // console.log(dataGrid.option('columns'));
                    dataGrid.option('columns').forEach(col => {
                      if (
                        // col.dataField !== "extreme_pricelistpriceperunit" &&
                        // col.dataField !== "extreme_supplierdiscount" &&
                        // col.dataField !== "extreme_pd" &&
                        // col.dataField !== "extreme_fullpd" &&
                        // col.dataField !== "manualdiscountamount" &&
                        col.dataField !== "extreme_productdescription" &&
                        // other columns
                        col.dataField !== "sequencenumber" &&
                        col.dataField !== "extreme_pricelistcurrency" &&
                        col.dataField !== "extreme_tax" &&
                        col.dataField !== "extreme_parentquoteline" &&
                        col.dataField !== "extreme_isparentitem" &&
                        col.dataField !== "extreme_producttype"
                      ) {
                        dataGrid.columnOption(col.dataField, 'visible', true);
                      }
                    });

                    dataGrid.option('filterValue', [
                      [
                        ["extreme_parentquoteline", "=", null],
                        "and",
                        ["extreme_isparentitem", "=", false]
                      ],
                      "or",
                      [
                        ["extreme_parentquoteline", "=", null],
                        "and",
                        ["extreme_isparentitem", "=", true]
                      ],
                    ]);

                    // dataGrid.columnOption('extreme_producttype', 'visible', false);
                    dataGrid.columnOption('extreme_area', 'visible', false);
                    dataGrid.columnOption('extreme_technology', 'visible', false);
                    dataGrid.columnOption('extreme_vendorsupplier', 'visible', false);

                  }

                  $('#compactBtn').dxButton('instance').option('disabled', false);
                  $('#classifyBtn').dxButton('instance').option('disabled', false);
                  e.component.option('disabled', true);
                },
              },
            },
            {
              location: 'before',
              locateInMenu: "auto",
              template() {
                return $('<div>')
                  .addClass('spacer')
                  .text('')
              },
            },
            {
              location: 'before',
              widget: 'dxButton',
              locateInMenu: "auto",
              options: {
                text: 'Classify',
                width: 'auto',
                elementAttr: {
                  id: "classifyBtn",
                },
                disabled: false,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);
                  // console.log('GET VISIBLE COLUMNS');
                  // console.log(dataGrid.getVisibleColumns());
                  dataGrid.getVisibleColumns().forEach(col => {
                    if (col.dataField !== 'productid' &&
                      col.dataField !== 'extreme_customproductname' &&
                      // col.dataField !== 'extreme_productdescription' &&
                      col.dataType !== 'detailExpand' &&
                      col.dataType !== 'drag') {
                      // // console.log(col);
                      dataGrid.columnOption(col.dataField, 'visible', false);
                    }
                  });

                  quoteLinesData._array.filter(item => item.extreme_isparentitem === true).forEach(elm => {
                    dataGrid.collapseRow(elm.quotedetailid);
                  });

                  dataGrid.option('filterValue', [
                    // [
                    //   ["extreme_area", "=", null], "or", ["extreme_area", "=", undefined], "or",
                    //   ["extreme_technology", "=", null], "or", ["extreme_technology", "=", undefined], "or",
                    //   ["extreme_vendorsupplier", "=", null], "or", ["extreme_vendorsupplier", "=", undefined]
                    // ], "and", ["extreme_isparentitem", "=", false]
                    [
                      // ["extreme_producttype", "=", null], "or", ["extreme_producttype", "=", undefined], "or",
                      ["extreme_area", "=", null], "or", ["extreme_area", "=", undefined], "or",
                      ["extreme_technology", "=", null], "or", ["extreme_technology", "=", undefined], "or",
                      ["extreme_vendorsupplier", "=", null], "or", ["extreme_vendorsupplier", "=", undefined]
                    ]
                  ]);

                  // dataGrid.columnOption('extreme_producttype', 'visible', true);
                  dataGrid.columnOption('extreme_area', 'visible', true);
                  dataGrid.columnOption('extreme_technology', 'visible', true);
                  dataGrid.columnOption('extreme_vendorsupplier', 'visible', true);

                  $('#compactBtn').dxButton('instance').option('disabled', false);
                  $('#extendedBtn').dxButton('instance').option('disabled', false);
                  e.component.option('disabled', true);
                },
              },
            },

            // BEFORE AND AFTER

            {
              location: 'after',
              locateInMenu: "auto",
              template() {
                const $div = $('<div>').addClass('exchange-rates').css({
                  'display': 'flex',
                  'align-items': 'center',
                  'gap': '10px'
                });

                // Help button with question mark icon
                const $helpBtn = $('<div>').addClass('help-btn').css({
                  'display': 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  'width': '26px',
                  'height': '26px',
                  'border-radius': '50%',
                  'background-color': '#17a2b8',
                  'color': '#fff',
                  'font-size': '14px',
                  'font-weight': 'bold',
                  'cursor': 'pointer',
                  'box-shadow': '0 2px 4px rgba(0, 0, 0, 0.15)',
                  'transition': 'all 0.2s ease'
                }).text('?').on('mouseenter', function() {
                  $(this).css({
                    'background-color': '#138496',
                    'transform': 'scale(1.1)'
                  });
                }).on('mouseleave', function() {
                  $(this).css({
                    'background-color': '#17a2b8',
                    'transform': 'scale(1)'
                  });
                }).on('click', function() {
                  showHelpPopup();
                });

                // Discount input container
                const $discountContainer = $('<div>').addClass('discount-container').css({
                  'display': 'flex',
                  'align-items': 'center',
                  'padding': '4px 10px',
                  'border': '1px solid #e0e0e0',
                  'border-radius': '4px',
                  'background-color': '#fff',
                  'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.08)'
                });

                const $discountLabel = $('<span>').text('Disc(%):').css({
                  'font-size': '12px',
                  'font-weight': '500',
                  'color': '#555',
                  'margin-right': '6px'
                });

                const $discountInput = $('<input>').attr({
                  type: 'number',
                  id: 'discountInput',
                  class: 'currencyRates',
                  value: defaultDiscount !== 0 ? defaultDiscount : '',
                  disabled: !isDraftStatus,
                  min: 0,
                  max: 100
                }).css({
                  'width': '55px',
                  'height': '26px',
                  'padding': '0 6px',
                  'border': '1px solid #ddd',
                  'border-radius': '3px',
                  'background-color': '#fafafa',
                  'font-size': '12px',
                  'text-align': 'center',
                  '-webkit-appearance': 'none',
                  '-moz-appearance': 'textfield'
                }).on('change', async function () {
                  const discountValue = parseFloat($(this).val());
                  if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
                    alert("Please enter a discount percent between 0 and 100.");
                    $(this).val(defaultDiscount !== 0 ? defaultDiscount : '');
                    return;
                  }
                  defaultDiscount = discountValue;
                  var confirmStrings = {
                    text: `Do you want to update all existing rows with the entered discount percent (${discountValue}%)?`,
                    title: "Update Discount",
                    cancelButtonLabel: "No",
                    confirmButtonLabel: "Yes"
                  };
                  var confirmOptions = { height: 200, width: 450 };
                  if (quoteLinesData._array.length > 0) {
                    await Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
                      async function (success) {
                        if (success.confirmed) {
                          Xrm.Utility.showProgressIndicator('Updating discount... Please wait...');
                          const allRecords = [];
                          
                          quoteLinesData._array.forEach(row => {
                            if (!row.extreme_isparentitem) {
                              row.extreme_discount = discountValue;
                              const recalcResult = recalculateAmounts({
                                quantity: row.quantity,
                                supplierPricePerUnit: row.extreme_supplierpriceperunit,
                                supplierDiscount: row.extreme_supplierdiscount,
                                pricePerUnit: row.priceperunit ? row.priceperunit : null,
                                baseAmount: row.baseamount ? row.baseamount : null,
                                margin: row.extreme_margin,
                                discount: discountValue,
                                TaxPercent: row.extreme_tax
                              });
                              row.extreme_margin = recalcResult.margin;
                              row.quantity = recalcResult.quantity;
                              row.extreme_supplierpriceperunit = recalcResult.supplierPricePerUnit;
                              row.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                              row.priceperunit = recalcResult.pricePerUnit;
                              row.baseamount = recalcResult.baseAmount;
                              row.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                              row.manualdiscountamount = recalcResult.manualDiscountAmount;
                              row.tax = recalcResult.tax;
                              row.extendedamount = recalcResult.extendedAmount;
                              row.extreme_pd = recalcResult.pdPerUnit;
                              row.extreme_fullpd = recalcResult.fullPd;
                              row.extreme_discount = recalcResult.discountPercentage;
                              row.extreme_supplierdiscount = recalcResult.supplierDiscountPercentage;

                              allRecords.push({
                                id: row.quotedetailid,
                                record: {
                                  extreme_discount: discountValue,
                                  priceperunit: row.priceperunit,
                                  baseamount: row.baseamount,
                                  extreme_fullpricewithdiscount: row.extreme_fullpricewithdiscount,
                                  manualdiscountamount: row.manualdiscountamount,
                                  tax: row.tax,
                                  extendedamount: row.extendedamount,
                                  extreme_pd: row.extreme_pd,
                                  extreme_fullpd: row.extreme_fullpd,
                                  extreme_margin: row.extreme_margin,
                                  extreme_supplierpriceperunit: row.extreme_supplierpriceperunit,
                                  extreme_supplierbaseamount: row.extreme_supplierbaseamount,
                                  extreme_supplierdiscount: row.extreme_supplierdiscount
                                }
                              });
                            }
                          });

                          quoteLinesData._array.filter(row => row.extreme_isparentitem).forEach(parentRow => {
                            const children = quoteLinesData._array.filter(child => child.extreme_parentquoteline === parentRow.quotedetailid);
                            let baseamount_sum = 0;
                            let extendedamount_sum = 0;
                            let extreme_fullpd_sum = 0;
                            let extreme_fullpricewithdiscount_sum = 0;
                            let manualdiscountamount_sum = 0;
                            let extreme_supplierbaseamount_sum = 0;
                            let tax_sum = 0;
                            children.forEach(child => {
                              baseamount_sum += child.baseamount || 0;
                              extendedamount_sum += child.extendedamount || 0;
                              extreme_fullpd_sum += child.extreme_fullpd || 0;
                              extreme_fullpricewithdiscount_sum += child.extreme_fullpricewithdiscount || 0;
                              manualdiscountamount_sum += child.manualdiscountamount || 0;
                              extreme_supplierbaseamount_sum += child.extreme_supplierbaseamount || 0;
                              tax_sum += child.tax || 0;
                            });
                            let avarageDiscountPercent = 0;
                            if (baseamount_sum !== 0) {
                              avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;
                            }
                            parentRow.baseamount = parseFloat(baseamount_sum.toFixed(2));
                            parentRow.extendedamount = parseFloat(extendedamount_sum.toFixed(2));
                            parentRow.extreme_fullpd = parseFloat(extreme_fullpd_sum.toFixed(2));
                            parentRow.extreme_fullpricewithdiscount = parseFloat(extreme_fullpricewithdiscount_sum.toFixed(2));
                            parentRow.manualdiscountamount = parseFloat(manualdiscountamount_sum.toFixed(2));
                            parentRow.extreme_supplierbaseamount = parseFloat(extreme_supplierbaseamount_sum.toFixed(2));
                            parentRow.tax = parseFloat(tax_sum.toFixed(2));
                            parentRow.extreme_discount = parseFloat(avarageDiscountPercent.toFixed(2));
                            allRecords.push({
                              id: parentRow.quotedetailid,
                              record: {
                                baseamount: parentRow.baseamount,
                                extendedamount: parentRow.extendedamount,
                                extreme_fullpd: parentRow.extreme_fullpd,
                                extreme_fullpricewithdiscount: parentRow.extreme_fullpricewithdiscount,
                                manualdiscountamount: parentRow.manualdiscountamount,
                                extreme_supplierbaseamount: parentRow.extreme_supplierbaseamount,
                                tax: parentRow.tax,
                                extreme_discount: parentRow.extreme_discount
                              }
                            });
                          });

                          await processBatchesInParallel(allRecords, async ({ id, record }) => {
                            return Xrm.WebApi.updateRecord("quotedetail", id, record);
                          });

                          dataGrid.refresh();
                          Xrm.Utility.closeProgressIndicator();
                          
                          const updatedRowKeys = allRecords.map(r => r.id);
                          const discountFields = ['extreme_discount', 'extreme_fullpricewithdiscount', 'manualdiscountamount', 'extendedamount', 'baseamount', 'extreme_margin'];
                          setTimeout(() => {
                            highlightMultipleRows(dataGrid, updatedRowKeys, discountFields, 2500);
                          }, 300);
                          
                          formContext.data.refresh(false);
                        }
                      });
                  }
                });

                $discountContainer.append($discountLabel, $discountInput);

                // Exchange Rate Button
                const $exchangeRateBtn = $('<div>').attr('id', 'exchangeRateBtn');
                
                setTimeout(() => {
                  $('#exchangeRateBtn').dxButton({
                    icon: 'money',
                    text: 'Exchange Rates',
                    stylingMode: 'outlined',
                    type: 'normal',
                    disabled: !isDraftStatus,
                    onClick: function() {
                      // Store original values to detect changes
                      const originalRates = {};
                      $.each(jsonForConverting, function(currency, rate) {
                        if (rate !== 1) {
                          originalRates[currency] = rate;
                        }
                      });

                      const currencyColors = {
                        'EUR': '#0052cc',
                        'USD': '#28a745',
                        'CHF': '#dc3545',
                        'RSD': '#6f42c1',
                        'MKD': '#fd7e14',
                        'GBP': '#17a2b8'
                      };

                      // Create custom popup in parent window document (like description popup)
                      const parentDoc = window.parent.document;
                      
                      // Remove existing popup if any
                      const existingPopup = parentDoc.getElementById('exchangeRatePopupOverlay');
                      if (existingPopup) existingPopup.remove();
                      
                      // Create overlay
                      const overlay = parentDoc.createElement('div');
                      overlay.id = 'exchangeRatePopupOverlay';
                      overlay.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 999999;
                      `;
                      
                      // Create popup container
                      const popup = parentDoc.createElement('div');
                      popup.style.cssText = `
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                        width: 500px;
                        max-width: 90%;
                        display: flex;
                        flex-direction: column;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                      `;
                      
                      // Create header
                      const header = parentDoc.createElement('div');
                      header.style.cssText = `
                        padding: 16px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 8px 8px 0 0;
                      `;
                      
                      const titleContainer = parentDoc.createElement('div');
                      const title = parentDoc.createElement('div');
                      title.style.cssText = 'font-size: 16px; font-weight: 600; color: #fff;';
                      title.textContent = 'Currency Exchange Rates';
                      const subtitle = parentDoc.createElement('div');
                      subtitle.style.cssText = 'font-size: 11px; color: rgba(255,255,255,0.9); margin-top: 2px;';
                      subtitle.textContent = 'Adjust exchange rates relative to the quote currency';
                      titleContainer.appendChild(title);
                      titleContainer.appendChild(subtitle);
                      
                      const closeBtn = parentDoc.createElement('button');
                      closeBtn.innerHTML = '&times;';
                      closeBtn.style.cssText = `
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #fff;
                        padding: 0;
                        line-height: 1;
                      `;
                      closeBtn.onmouseover = () => closeBtn.style.opacity = '0.7';
                      closeBtn.onmouseout = () => closeBtn.style.opacity = '1';
                      closeBtn.onclick = () => overlay.remove();
                      
                      header.appendChild(titleContainer);
                      header.appendChild(closeBtn);
                      
                      // Create body with currency inputs
                      const body = parentDoc.createElement('div');
                      body.style.cssText = 'padding: 20px;';
                      
                      const ratesGrid = parentDoc.createElement('div');
                      ratesGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;';
                      
                      // Store input references for saving
                      const inputRefs = {};
                      
                      // Create input for each currency
                      Object.entries(jsonForConverting).forEach(([currency, rate]) => {
                        if (rate !== 1) {
                          const rateItem = parentDoc.createElement('div');
                          rateItem.style.cssText = `
                            background-color: #f8f9fa;
                            border: 1px solid #e9ecef;
                            border-radius: 8px;
                            padding: 12px 15px;
                          `;
                          
                          const currencyHeader = parentDoc.createElement('div');
                          currencyHeader.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;';
                          
                          const badge = parentDoc.createElement('span');
                          badge.textContent = currency;
                          badge.style.cssText = `
                            background-color: ${currencyColors[currency] || '#6c757d'};
                            color: #fff;
                            padding: 3px 10px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: 600;
                            letter-spacing: 0.5px;
                          `;
                          
                          const currencyName = parentDoc.createElement('span');
                          currencyName.textContent = getCurrencyFullName(currency);
                          currencyName.style.cssText = 'margin-left: 10px; font-size: 11px; color: #6c757d;';
                          
                          currencyHeader.appendChild(badge);
                          currencyHeader.appendChild(currencyName);
                          
                          const rateInput = parentDoc.createElement('input');
                          rateInput.type = 'number';
                          rateInput.step = '0.0001';
                          rateInput.value = rate;
                          rateInput.dataset.currency = currency;
                          rateInput.style.cssText = `
                            width: 100%;
                            height: 36px;
                            padding: 0 12px;
                            border: 1px solid #ced4da;
                            border-radius: 6px;
                            font-size: 14px;
                            font-weight: 500;
                            text-align: right;
                            background-color: #fff;
                            box-sizing: border-box;
                          `;
                          rateInput.onfocus = () => {
                            rateInput.style.borderColor = currencyColors[currency] || '#0078d4';
                            rateInput.style.boxShadow = `0 0 0 3px ${currencyColors[currency] || '#0078d4'}20`;
                          };
                          rateInput.onblur = () => {
                            rateInput.style.borderColor = '#ced4da';
                            rateInput.style.boxShadow = 'none';
                          };
                          
                          inputRefs[currency] = rateInput;
                          
                          rateItem.appendChild(currencyHeader);
                          rateItem.appendChild(rateInput);
                          ratesGrid.appendChild(rateItem);
                        }
                      });
                      
                      body.appendChild(ratesGrid);
                      
                      // Create footer with buttons
                      const footer = parentDoc.createElement('div');
                      footer.style.cssText = `
                        padding: 12px 20px;
                        border-top: 1px solid #e0e0e0;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        background: #f9f9f9;
                        border-radius: 0 0 8px 8px;
                      `;
                      
                      const cancelBtn = parentDoc.createElement('button');
                      cancelBtn.textContent = 'Cancel';
                      cancelBtn.style.cssText = `
                        padding: 8px 20px;
                        border: 1px solid #ddd;
                        background: #fff;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                      `;
                      cancelBtn.onclick = () => overlay.remove();
                      
                      const saveBtn = parentDoc.createElement('button');
                      saveBtn.textContent = 'Save Changes';
                      saveBtn.style.cssText = `
                        padding: 8px 20px;
                        border: none;
                        background: #28a745;
                        color: #fff;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                      `;
                      saveBtn.onmouseover = () => saveBtn.style.background = '#218838';
                      saveBtn.onmouseout = () => saveBtn.style.background = '#28a745';
                      saveBtn.onclick = async () => {
                        // Check for changes and apply them
                        const changedRates = [];
                        
                        Object.entries(originalRates).forEach(([currency, originalRate]) => {
                          const newValue = parseFloat(inputRefs[currency].value);
                          if (!isNaN(newValue) && newValue !== originalRate) {
                            changedRates.push({ currency, newValue, originalRate });
                          }
                        });
                        
                        if (changedRates.length === 0) {
                          DevExpress.ui.notify('No changes detected.', 'info', 2000);
                          overlay.remove();
                          return;
                        }
                        
                        overlay.remove();
                        
                        // Apply changes
                        for (const { currency, newValue } of changedRates) {
                          Xrm.Utility.showProgressIndicator(`Updating ${currency} exchange rate...`);
                          
                          // Update the hidden input value for calculations
                          $(`#${currency}`).val(newValue);
                          jsonForConverting[currency] = newValue;
                          
                          // Update quote record
                          switch (currency) {
                            case "EUR":
                              await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_euroexchangerate: newValue });
                              break;
                            case "USD":
                              await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_dollarexchangerate: newValue });
                              break;
                            case "CHF":
                              await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_chfexchangerate: newValue });
                              break;
                            case "RSD":
                              await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_rsdexchangerate: newValue });
                              break;
                            case "MKD":
                              await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_macedoniandenarexchangerate: newValue });
                              break;
                            case "GBP":
                              await Xrm.WebApi.updateRecord("quote", `${quoteIdForm}`, { extreme_gbpexchangerate: newValue });
                              break;
                          }
                          
                          // Apply exchange rate change to quote lines
                          await exchangeRateChange(currency, newValue);
                        }
                        
                        Xrm.Utility.closeProgressIndicator();
                        showParentToast(`Successfully updated ${changedRates.length} exchange rate(s).`, 'success', 3000);
                      };
                      
                      footer.appendChild(cancelBtn);
                      footer.appendChild(saveBtn);
                      
                      popup.appendChild(header);
                      popup.appendChild(body);
                      popup.appendChild(footer);
                      overlay.appendChild(popup);
                      parentDoc.body.appendChild(overlay);
                      
                      // Close on Escape key
                      const escHandler = (evt) => {
                        if (evt.key === 'Escape') {
                          overlay.remove();
                          parentDoc.removeEventListener('keydown', escHandler);
                        }
                      };
                      parentDoc.addEventListener('keydown', escHandler);
                    }
                  });
                }, 100);

                // Hidden inputs for storing current rates (needed for calculations)
                const $hiddenRates = $('<div>').css({ 'display': 'none' });
                $.each(jsonForConverting, function(currency, rate) {
                  if (rate !== 1) {
                    $hiddenRates.append(
                      $('<input>').attr({
                        type: 'hidden',
                        id: currency,
                        value: rate
                      })
                    );
                  }
                });

                $div.append($helpBtn, $discountContainer, $exchangeRateBtn, $hiddenRates);
                return $div;
              },
            }
          ],
        },
        onSelectionChanged(data) {
          // Show/hide Delete Selected button based on selection
          dataGrid.option('toolbar.items[0].options.visible', data.selectedRowsData.length > 0 && isDraftStatus);
        },
        onRowPrepared: async (e) => {
          // console.log('ROW PREPARED');
          // console.log(e);

          // Safety check for cells array
          const hasCell1 = e.cells && e.cells[1] && e.cells[1].cellElement && e.cells[1].cellElement[0];

          if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && (e.data.extreme_isparentitem === true || e.data.extreme_isparentitem === false) &&
            (
              // (e.data.extreme_producttype === null || e.data.extreme_producttype === undefined) ||
              (e.data.extreme_area === null || e.data.extreme_area === undefined) ||
              (e.data.extreme_technology === null || e.data.extreme_technology === undefined) ||
              (e.data.extreme_vendorsupplier === null || e.data.extreme_vendorsupplier === undefined)
            )
          ) {
            if (e.rowElement && e.rowElement[0]) e.rowElement[0].style.backgroundColor = "#fce3c2";
          }
          // else if (e.rowType === "data" && e.data.extreme_isparentitem === true &&
          //   (
          //     (e.data.extreme_area === null || e.data.extreme_area === undefined) ||
          //     (e.data.extreme_technology === null || e.data.extreme_technology === undefined) ||
          //     (e.data.extreme_vendorsupplier === null || e.data.extreme_vendorsupplier === undefined)
          //   )) {
          //     e.rowElement[0].style.backgroundColor = "#fce3c2";
          // }
          else if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && e.data.extreme_isparentitem === true && quoteLinesData._array.find(item =>
            item.extreme_parentquoteline === e.data.quotedetailid &&
            (
              // (item.extreme_producttype === null || item.extreme_producttype === undefined) ||
              (item.extreme_area === null || item.extreme_area === undefined) ||
              (item.extreme_technology === null || item.extreme_technology === undefined) ||
              (item.extreme_vendorsupplier === null || item.extreme_vendorsupplier === undefined)
            )
          )) {
            if (hasCell1) e.cells[1].cellElement[0].style.backgroundColor = "#fce3c2";
          }
          else {
            if (e.rowElement && e.rowElement[0]) e.rowElement[0].style.backgroundColor = "#fff";
          }

          if (e.rowType === 'data' && !e.data.extreme_isparentitem && e.data.quotedetailid) {
            // console.log('REMOVED EXPAND FOR ', e.data.quotedetailid);
            // console.log(dataGrid.hasEditData());
            // console.log(e.cells[1].cellElement[0]);
            if (hasCell1 && e.cells[1].cellElement[0].childNodes[0]) {
              e.cells[1].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
              e.cells[1].cellElement[0].classList.remove('dx-datagrid-expand');
            }
            // e.cells[1].cellElement[0].style.display = "none";
            // e.cells[2]?.cellElement?.[0].setAttribute('colspan', '2');
          }
          else if (e.rowType === 'data' && $('#classifyBtn').dxButton('instance').option('disabled') === true) {
            if (hasCell1 && e.cells[1].cellElement[0].childNodes[0]) {
              e.cells[1].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
              e.cells[1].cellElement[0].classList.remove('dx-datagrid-expand');
            }
          }

        },
        onEditorPreparing: async (e) => {
          // console.log('Editor Preparing');
          // console.log(e);

          if(!e.row || !e.row.data) return;

          // if (e.dataField == "productid" && e.row.data.extreme_isparentitem === false) {
          //   // console.log('e.editorElement');
          //   // console.log(e.editorElement);
          //   e.editorElement[0].parentElement.setAttribute('colspan', '2');
          // }

          // if ((e.dataField == "uomid" && typeof (e.row.data.productid) !== 'number')) e.editorOptions.disabled = true;

          if (e.dataField == "extreme_supplierdiscount" || e.dataField == "extreme_discount" || e.dataField == "extreme_tax") {
            e.editorOptions.min = 0;
            e.editorOptions.max = 100;
          };

          if (e.dataField == 'extreme_pricelist' && (!e.row.data.productid || typeof (e.row.data.productid) === 'number' || e.row.isNewRow)) {
            e.editorOptions.disabled = true;
          }

          if (
            (e.row.data.extreme_isparentitem === true || (isAddingSet && e.row.isNewRow)) &&
            e.dataField !== "productid" &&
            e.dataField !== "extreme_customproductname" &&
            e.dataField !== "extreme_productdescription" &&
            e.dataField !== "uomid" &&
            e.dataField !== "quantity" &&
            // e.dataField !== "extreme_vatsetting" &&
            // e.dataField !== "extreme_producttype" &&
            e.dataField !== "extreme_createasset" &&
            e.dataField !== "extreme_area" &&
            e.dataField !== "extreme_technology" &&
            e.dataField !== "extreme_vendorsupplier" &&
            e.dataField !== "baseamount" &&
            e.dataField !== "extreme_discount"
          ) {
            e.editorOptions.disabled = true;
          }

          if (e.row.data.extreme_isparentitem !== true && e.dataField == "baseamount") {
            e.editorOptions.disabled = true;
          }

        },
        onFocusedCellChanged: (e) => {
          // console.log(e);
        },
        onEditingStart: (e) => {
          // console.log('EditingStart');
          // console.log(e);
        },
        onEditCanceling: (e) => {
          // console.log('EditCanceling');
          // console.log(e);
        },
        onInitNewRow: async (e) => {
          // console.log('InitNewRow');
          // console.log(e);

          if (!isAddingSet) {
            e.data.extreme_isparentitem = false;
            e.data.extreme_margin = defaultMargin;
            e.data.extreme_discount = parseFloat($('#discountInput').val()) || 0;
            e.data.extreme_supplierdiscount = 0;
            dataGrid.columnOption("extreme_vatsetting", "validationRules", [{ type: 'required' }]);
          }
          else {
            e.data.extreme_isparentitem = true;
            dataGrid.columnOption("extreme_vatsetting", "validationRules", null);
          }

        },
        onRowInserting: async (e) => {
          // console.log('RowInserting');
          // console.log(e);

          Xrm.Utility.showProgressIndicator('Loading... Please wait...');

          var record = {};
          record["quoteid@odata.bind"] = `/quotes(${quoteIdForm})`; // Lookup
          if (e.data.extreme_customproductname) record.extreme_customproductname = e.data.extreme_customproductname; // Text
          if (e.data.extreme_pricelistpriceperunit || e.data.extreme_pricelistpriceperunit === 0) record.extreme_pricelistpriceperunit = e.data.extreme_pricelistpriceperunit; // Decimal
          if (e.data.extreme_pricelistcurrency) record.extreme_pricelistcurrency = e.data.extreme_pricelistcurrency; // Text
          if (e.data.extreme_supplierpriceperunit || e.data.extreme_supplierpriceperunit === 0) record.extreme_supplierpriceperunit = Number(parseFloat(e.data.extreme_supplierpriceperunit).toFixed(4)); // Currency
          if (e.data.quantity || e.data.quantity === 0) record.quantity = e.data.quantity; // Decimal
          if (e.data.extreme_supplierbaseamount || e.data.extreme_supplierbaseamount === 0) record.extreme_supplierbaseamount = Number(parseFloat(e.data.extreme_supplierbaseamount).toFixed(4)); // Currency
          if (e.data.extreme_supplierdiscount || e.data.extreme_supplierdiscount === 0) record.extreme_supplierdiscount = e.data.extreme_supplierdiscount; // Decimal
          if (e.data.extreme_margin || e.data.extreme_margin === 0) record.extreme_margin = e.data.extreme_margin; // Decimal
          if (e.data.priceperunit || e.data.priceperunit === 0) record.priceperunit = e.data.priceperunit; // Decimal
          if (e.data.baseamount || e.data.baseamount === 0) record.baseamount = e.data.baseamount; // Decimal
          if (e.data.extreme_discount || e.data.extreme_discount === 0) record.extreme_discount = e.data.extreme_discount; // Decimal
          if (e.data.manualdiscountamount || e.data.manualdiscountamount === 0) record.manualdiscountamount = Number(parseFloat(e.data.manualdiscountamount).toFixed(4)); // Currency
          if (e.data.extreme_pricewithdiscount || e.data.extreme_pricewithdiscount === 0) record.extreme_pricewithdiscount = e.data.extreme_pricewithdiscount; // Decimal
          if (e.data.extreme_fullpricewithdiscount || e.data.extreme_fullpricewithdiscount === 0) record.extreme_fullpricewithdiscount = e.data.extreme_fullpricewithdiscount; // Decimal
          if (e.data.extreme_tax || e.data.extreme_tax === 0) record.extreme_tax = e.data.extreme_tax; // Decimal
          if (e.data.tax || e.data.tax === 0) record.tax = Number(parseFloat(e.data.tax).toFixed(4)); // Currency
          if (e.data.extreme_pd || e.data.extreme_pd === 0) record.extreme_pd = e.data.extreme_pd; // Decimal
          if (e.data.extreme_fullpd || e.data.extreme_fullpd === 0) record.extreme_fullpd = e.data.extreme_fullpd; // Decimal
          if (typeof e.data.extreme_createasset === "boolean") record.extreme_createasset = e.data.extreme_createasset; // Boolean
          if (e.data.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.data.extreme_pricelist})`; // Lookup
          if (e.data.extreme_producttype) record.extreme_producttype = e.data.extreme_producttype; // Choice
          if (e.data.extreme_area) record["extreme_Area@odata.bind"] = `/extreme_areas(${e.data.extreme_area})`; // Lookup
          if (e.data.extreme_technology) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${e.data.extreme_technology})`; // Lookup
          if (e.data.extreme_vendorsupplier) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${e.data.extreme_vendorsupplier})`; // Lookup
          if (e.data.extreme_vatsetting) {
            record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${e.data.extreme_vatsetting})`; // Lookup
            record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatSettingsArray.find(item => item.id === e.data.extreme_vatsetting).idVatGroup})`; // Lookup
          }

          // Is Price Overriden boolean to true
          record.ispriceoverridden = true; // Boolean

          isAddingSet ? record.extreme_isparentitem = true : record.extreme_isparentitem = false;

          // Pre-calculate sequencenumber to include in initial create (avoids extra updateRecord call)
          record.sequencenumber = parseInt((quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length + 1) + "00");
          record.extendedamount = Number(parseFloat(e.data.extendedamount || 0).toFixed(4));
          record.baseamount = Number(parseFloat(e.data.baseamount || 0).toFixed(4));

          if (e.data.productid) {
            if (typeof (e.data.productid) === 'number') {
              record.extreme_customproductid = customProductsStore._array.find((item) => item.productid === e.data.productid).name;
              if (e.data.uomid) {
                if (typeof (e.data.uomid) === 'number') {
                  record.extreme_uomid = unitsStore._array.find((item) => item.id === e.data.uomid).name;
                }
                else {
                  record.extreme_uomid = unitsStore._array.find((item) => item.id === e.data.uomid).name;
                }
              }
            }
            else {
              record["productid@odata.bind"] = `/products(${e.data.productid})`;

              // Use cached product info for better performance
              const existingProductLookups = await getCachedProductInfo(Xrm, e.data.productid, "description,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");
              // console.log('EXISTING PRODUCT LOOKUPS');
              // console.log(existingProductLookups);
              if (existingProductLookups._extreme_area_value) record["extreme_Area@odata.bind"] = `/extreme_areas(${existingProductLookups._extreme_area_value})`; // Lookup
              if (existingProductLookups._extreme_technology_value) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${existingProductLookups._extreme_technology_value})`; // Lookup
              if (existingProductLookups._extreme_supplier_value) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${existingProductLookups._extreme_supplier_value})`; // Lookup
              if (e.data.extreme_productdescription) {
                record.extreme_productdescription = e.data.extreme_productdescription;
              }
              else {
                record.extreme_productdescription = existingProductLookups.description;
              }; // Text

              record["uomid@odata.bind"] = `/uoms(${e.data.uomid})`; // Lookup UNIT
            }
          }; // Lookup / Custom Text


          // console.log('RECORD AFTER SET PROPERTIES:');
          // console.log(record);

          await Xrm.WebApi.createRecord("quotedetail", record).then(
            async function success(result) {
              var newId = result.id;
              if (quoteLinesData._array.length > 0) {
                // console.log(dataGrid.getDataSource());
                // console.log(quoteLinesData._array);
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1]);
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid);
                quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid = newId;
                quoteLinesData._array[quoteLinesData._array.length - 1].extreme_productdescription = record.extreme_productdescription;

                if (quoteLinesData._array._dataByKeyMap) {
                  const keys = Object.keys(quoteLinesData._array._dataByKeyMap);
                  const lastKey = keys[keys.length - 1];

                  // Update the key and quotedetailid
                  if (quoteLinesData._array._dataByKeyMap[lastKey]) {
                    // Create a new key with the new ID and update quotedetailid
                    quoteLinesData._array._dataByKeyMap[`"${newId}"`] = { ...quoteLinesData._array._dataByKeyMap[lastKey], quotedetailid: newId };

                    // Delete the old key
                    delete quoteLinesData._array._dataByKeyMap[lastKey];
                  }
                }

                // console.log(quoteLinesData._array);

                // sequencenumber, extendedamount, baseamount already set in createRecord - no extra updateRecord needed
                quoteLinesData._array[quoteLinesData._array.length - 1].sequencenumber = record.sequencenumber;
                quoteLinesData._array[quoteLinesData._array.length - 1].extreme_parentquoteline = null;
                quoteLinesData._array[quoteLinesData._array.length - 1].extreme_isparentitem = isAddingSet;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].baseamount) quoteLinesData._array[quoteLinesData._array.length - 1].baseamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extendedamount) quoteLinesData._array[quoteLinesData._array.length - 1].extendedamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpd) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpd = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpricewithdiscount) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_fullpricewithdiscount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].manualdiscountamount) quoteLinesData._array[quoteLinesData._array.length - 1].manualdiscountamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].extreme_supplierbaseamount) quoteLinesData._array[quoteLinesData._array.length - 1].extreme_supplierbaseamount = 0;
                if (!quoteLinesData._array[quoteLinesData._array.length - 1].tax) quoteLinesData._array[quoteLinesData._array.length - 1].tax = 0;
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1].quotedetailid);
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1].extreme_parentquoteline);
                // console.log(quoteLinesData._array[quoteLinesData._array.length - 1].extreme_isparentitem);


                // If inserting parent item with existing child items
                if (e.data.extreme_isparentitem === true && isGuid(e.data.productid)) {

                  // console.log('quoteLinesData before parent created');
                  // console.log(quoteLinesData);

                  try {
                    const childProducts = await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,description,_pricelevelid_value,_defaultuomid_value,extreme_isparent,name,_extreme_parentproduct_value,productnumber,producttypecode&$filter=_extreme_parentproduct_value eq ${e.data.productid}`);
                    
                    if (childProducts.entities.length === 0) {
                      // No child products, skip
                    } else {
                      // Collect all product IDs for batch fetching
                      const productIds = childProducts.entities.map(p => p.productid);
                      
                      // Batch fetch all product info, price list items, and classify lookups in parallel
                      const batchPromises = productIds.map(async (pid, index) => {
                        const childProduct = childProducts.entities[index];
                        
                        // Use cached product info for better performance
                        const productInfo = await getCachedProductInfo(Xrm, pid, "_pricelevelid_value,_defaultuomid_value,name,producttypecode,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");
                        
                        // Get VAT setting instantly from pre-loaded array matching BOTH productTypeCode AND customerTaxPercentage (NO API call needed!)
                        const vatSettingFromArray = childProduct.producttypecode ? 
                          vatSettingsArray.find(item => item.productTypeCode === childProduct.producttypecode && item.customerTaxPercentage === taxPercentOfAccount.extreme_tax) : null;
                        const vatSettingResult = { 
                          entities: vatSettingFromArray ? [{ extreme_vatsettingid: vatSettingFromArray.id }] : [] 
                        };

                        let priceListItemInfo = null;
                        if (productInfo._pricelevelid_value) {
                          priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${pid})&$expand=pricelevelid($select=extreme_defaultsalesmargin)`);
                        }

                        return {
                          index,
                          childProduct,
                          productInfo,
                          vatSettingResult,
                          priceListItemInfo
                        };
                      });

                      const batchResults = await Promise.all(batchPromises);

                      // Now create all child quote details in parallel
                      const createPromises = [];
                      const childRecordsData = [];

                      batchResults.forEach(({ index, childProduct, productInfo, vatSettingResult, priceListItemInfo }) => {
                        const productid = childProduct.productid;
                        const name = childProduct.name;
                        const defaultuomid = childProduct._defaultuomid_value;
                        const description = childProduct.description;

                        let productType = productInfo.producttypecode;
                        let defaultVatSetting = vatSettingResult.entities.length > 0 ? vatSettingResult.entities[0].extreme_vatsettingid : null;
                        let defaultTax = defaultVatSetting ? vatSettingsArray.find(item => item.id === defaultVatSetting)?.vat || 0 : 0;

                        let area = productInfo._extreme_area_value;
                        let technology = productInfo._extreme_technology_value;
                        let vendorSupplier = productInfo._extreme_supplier_value;
                        let vatGroup = defaultVatSetting ? vatSettingsArray.find(item => item.id === defaultVatSetting)?.idVatGroup : null;
                        let vatSetting = defaultVatSetting;

                        const priceListMargin = priceListItemInfo?.entities?.[0]?.pricelevelid?.extreme_defaultsalesmargin ?? defaultMargin;
                        const priceListItemAmount = priceListItemInfo?.entities?.[0]?.amount ?? null;
                        const priceListItemCurrency = priceListItemInfo?.entities?.[0]?._transactioncurrencyid_value ? 
                          currenciesArray.find(item => item.transactioncurrencyid === priceListItemInfo.entities[0]._transactioncurrencyid_value)?.currencysymbol : null;

                        let supplierPricePerUnit = 0;
                        let priceList = null;
                        let priceListPPU = null;
                        let priceListCurrency = null;

                        if (productInfo._pricelevelid_value && priceListItemAmount !== null) {
                          priceList = productInfo._pricelevelid_value;
                          priceListPPU = priceListItemAmount;
                          priceListCurrency = priceListItemCurrency;
                          if (quoteCurrencySymbol !== priceListItemCurrency && priceListItemCurrency) {
                            const currencyInfo = currenciesArray.find(item => item.currencysymbol === priceListItemCurrency);
                            supplierPricePerUnit = priceListItemAmount * ($(`#${currencyInfo?.isocurrencycode}`).val() || 1);
                          } else {
                            supplierPricePerUnit = priceListItemAmount;
                          }
                        }

                        let recalcResult = { quantity: 1, supplierBaseAmount: 0, pricePerUnit: 0, baseAmount: 0, fullPriceWithDiscount: 0, customDiscountAmount: 0, tax: 0, extendedAmount: 0, pdPerUnit: 0, fullPd: 0 };
                        if (priceListMargin !== null && supplierPricePerUnit !== null) {
                          recalcResult = recalculateAmounts({
                            quantity: 1,
                            supplierPricePerUnit: supplierPricePerUnit,
                            supplierDiscount: 0,
                            margin: priceListMargin,
                            discount: parseFloat($('#discountInput').val()) || 0,
                            TaxPercent: defaultTax
                          });
                        }

                        const record = {};
                        record.sequencenumber = parseInt((quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length) + "00") + (index + 1);
                        record["productid@odata.bind"] = `/products(${productid})`;
                        record["extreme_ParentQuoteLine@odata.bind"] = `/quotedetails(${newId})`;
                        record.extreme_customproductname = name;
                        if (defaultuomid) record["uomid@odata.bind"] = `/uoms(${defaultuomid})`;
                        record.ispriceoverridden = true;
                        record["quoteid@odata.bind"] = `/quotes(${quoteIdForm})`;
                        record.extreme_isparentitem = false;

                        if (productType) record.extreme_producttype = productType;
                        if (vatSetting) record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${vatSetting})`;
                        if (recalcResult.tax) record.tax = Number(parseFloat(recalcResult.tax).toFixed(4));
                        if (defaultTax) record.extreme_tax = defaultTax;
                        if (area) record["extreme_Area@odata.bind"] = `/extreme_areas(${area})`;
                        if (technology) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${technology})`;
                        if (vendorSupplier) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${vendorSupplier})`;
                        if (vatGroup) record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatGroup})`;
                        if (priceList) record["extreme_pricelist@odata.bind"] = `/pricelevels(${priceList})`;
                        if (priceListPPU) record.extreme_pricelistpriceperunit = priceListPPU;
                        if (priceListCurrency) record.extreme_pricelistcurrency = priceListCurrency;
                        if (recalcResult.pdPerUnit) record.extreme_pd = recalcResult.pdPerUnit;
                        if (recalcResult.fullPd) record.extreme_fullpd = recalcResult.fullPd;
                        if (recalcResult.supplierBaseAmount) record.extreme_supplierbaseamount = recalcResult.supplierBaseAmount;
                        record.quantity = recalcResult.quantity || 1;
                        if (recalcResult.fullPriceWithDiscount) record.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
                        if (recalcResult.pricePerUnit) record.priceperunit = Number(parseFloat(recalcResult.pricePerUnit).toFixed(4));
                        record.extreme_discount = parseFloat($('#discountInput').val()) || 0;
                        record.extreme_supplierdiscount = 0;
                        if (priceListMargin) record.extreme_margin = priceListMargin;
                        if (supplierPricePerUnit) record.extreme_supplierpriceperunit = supplierPricePerUnit;
                        if (description) record.extreme_productdescription = description;

                        // Store data for later store update
                        childRecordsData.push({
                          record,
                          productid,
                          name,
                          defaultuomid,
                          productType,
                          vatSetting,
                          defaultTax,
                          area,
                          technology,
                          vendorSupplier,
                          vatGroup,
                          priceList,
                          priceListPPU,
                          priceListCurrency,
                          recalcResult,
                          priceListMargin,
                          supplierPricePerUnit,
                          description,
                          index
                        });

                        createPromises.push(Xrm.WebApi.createRecord("quotedetail", record));
                      });

                      // Create all children in parallel
                      const createResults = await Promise.all(createPromises);

                      // Now batch update baseamount and extendedamount for all children
                      const updatePromises = [];
                      let parentBaseAmountSum = 0;
                      let parentExtendedAmountSum = 0;
                      let parentFullPdSum = 0;
                      let parentFullPriceWithDiscountSum = 0;
                      let parentDiscountAmountSum = 0;
                      let parentSupplierBaseAmountSum = 0;
                      let parentTaxSum = 0;

                      createResults.forEach((result, idx) => {
                        const childData = childRecordsData[idx];
                        const newChildId = result.id;

                        // Update record with baseamount and extendedamount
                        const updateRecord = {};
                        if (childData.recalcResult.baseAmount) updateRecord.baseamount = Number(parseFloat(childData.recalcResult.baseAmount).toFixed(4));
                        if (childData.recalcResult.extendedAmount) updateRecord.extendedamount = Number(parseFloat(childData.recalcResult.extendedAmount).toFixed(4));
                        
                        if (Object.keys(updateRecord).length > 0) {
                          updatePromises.push(Xrm.WebApi.updateRecord("quotedetail", `${newChildId}`, updateRecord));
                        }

                        // Add to store
                        const recordForStore = {
                          quotedetailid: newChildId,
                          sequencenumber: childData.record.sequencenumber,
                          extreme_customproductname: childData.name,
                          productid: childData.productid,
                          extreme_parentquoteline: newId,
                          uomid: childData.defaultuomid,
                          extreme_producttype: childData.productType,
                          extreme_vatsetting: childData.vatSetting,
                          tax: childData.recalcResult.tax || 0,
                          extreme_tax: childData.defaultTax || 0,
                          extreme_area: childData.area,
                          extreme_technology: childData.technology,
                          extreme_vendorsupplier: childData.vendorSupplier,
                          extreme_vatgroup: childData.vatGroup,
                          extreme_pricelist: childData.priceList,
                          extreme_pricelistpriceperunit: childData.priceListPPU,
                          extreme_pricelistcurrency: childData.priceListCurrency,
                          manualdiscountamount: childData.recalcResult.customDiscountAmount || 0,
                          extreme_pd: childData.recalcResult.pdPerUnit || 0,
                          extreme_fullpd: childData.recalcResult.fullPd || 0,
                          extreme_supplierbaseamount: childData.recalcResult.supplierBaseAmount || 0,
                          quantity: childData.recalcResult.quantity || 1,
                          extreme_fullpricewithdiscount: childData.recalcResult.fullPriceWithDiscount || 0,
                          priceperunit: childData.recalcResult.pricePerUnit || 0,
                          extreme_discount: parseFloat($('#discountInput').val()) || 0,
                          extreme_supplierdiscount: 0,
                          extreme_margin: childData.priceListMargin || defaultMargin,
                          baseamount: childData.recalcResult.baseAmount || 0,
                          extendedamount: childData.recalcResult.extendedAmount || 0,
                          extreme_supplierpriceperunit: childData.supplierPricePerUnit || 0,
                          extreme_productdescription: childData.description,
                          extreme_isparentitem: false,
                          extreme_createasset: false
                        };

                        quoteLinesData.insert(recordForStore);

                        // Sum up parent values
                        parentBaseAmountSum += childData.recalcResult.baseAmount || 0;
                        parentExtendedAmountSum += childData.recalcResult.extendedAmount || 0;
                        parentFullPdSum += childData.recalcResult.fullPd || 0;
                        parentFullPriceWithDiscountSum += childData.recalcResult.fullPriceWithDiscount || 0;
                        parentDiscountAmountSum += childData.recalcResult.customDiscountAmount || 0;
                        parentSupplierBaseAmountSum += childData.recalcResult.supplierBaseAmount || 0;
                        parentTaxSum += childData.recalcResult.tax || 0;
                      });

                      // Execute all updates in parallel (fire and forget for speed)
                      if (updatePromises.length > 0) {
                        Promise.all(updatePromises).catch(err => console.warn('Child update warning:', err));
                      }

                      // Update parent item sums
                      const parentItem = quoteLinesData._array.find(item => item.quotedetailid === newId);
                      if (parentItem) {
                        parentItem.baseamount = (parentItem.baseamount || 0) + parentBaseAmountSum;
                        parentItem.extendedamount = (parentItem.extendedamount || 0) + parentExtendedAmountSum;
                        parentItem.extreme_fullpd = (parentItem.extreme_fullpd || 0) + parentFullPdSum;
                        parentItem.extreme_fullpricewithdiscount = (parentItem.extreme_fullpricewithdiscount || 0) + parentFullPriceWithDiscountSum;
                        parentItem.manualdiscountamount = (parentItem.manualdiscountamount || 0) + parentDiscountAmountSum;
                        parentItem.extreme_supplierbaseamount = (parentItem.extreme_supplierbaseamount || 0) + parentSupplierBaseAmountSum;
                        parentItem.tax = (parentItem.tax || 0) + parentTaxSum;
                      }
                    }
                  } catch (error) {
                    console.error('Error creating child items:', error);
                    Xrm.Navigation.openErrorDialog({
                      details: error,
                      errorCode: 400,
                      message: error.message
                    });
                  }
                }


                // console.log('quoteLinesData after parent created');
                // console.log(quoteLinesData);

              }
              else {
                // console.log('quoteLinesData._array is empty');
              }

              isAddingSet = null;
              dataGrid.columnOption("productid", "lookup", {
                dataSource(options) {

                  let filterQuery = null;

                  if (options.data) {
                    options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
                  }

                  return {
                    store: productsODataStore,
                    // searchExpr: ["productnumber", "name"],
                    paginate: true,
                    pageSize: 100,
                    loadMode: 'raw',
                    filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
                  }
                },
                displayExpr: 'productnumber',
                valueExpr: 'productid',
              });

            },
            function (error) {
              Xrm.Navigation.openErrorDialog({
                details: error,
                errorCode: 400,
                message: error.message
              });
            }
          );

          isAddingSet = null;
          // console.log("isAddingSet: ", isAddingSet);
          dataGrid.columnOption("productid", "lookup", {
            dataSource(options) {

              let filterQuery = null;

              if (options.data) {
                options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
              }

              return {
                store: productsODataStore,
                // searchExpr: ["productnumber", "name"],
                paginate: true,
                pageSize: 100,
                loadMode: 'raw',
                filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
              }
            },
            displayExpr: 'productnumber',
            valueExpr: 'productid',
          });

          dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
          dataGrid.columnOption("uomid", "allowEditing", true);
          dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
          dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
          dataGrid.columnOption("extreme_margin", "allowEditing", true);
          dataGrid.columnOption("priceperunit", "allowEditing", true);
          dataGrid.columnOption("baseamount", "allowEditing", true);
          dataGrid.columnOption("extreme_discount", "allowEditing", true);
          dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
          dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
          dataGrid.columnOption("extreme_createasset", "allowEditing", true);
          dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);
          dataGrid.columnOption("extreme_vatsetting", "validationRules", null);

          await this.setClientApiContext(Xrm, formContext);
          formContext.data.refresh(true);

          Xrm.Utility.closeProgressIndicator();

        },
        onRowInserted: async (e) => {
          // console.log('RowInserted');
          // console.log(e);

          // await getQuoteProducts(quoteIdForm);
          // dataGrid.refresh();
        },
        onRowUpdating: async (e) => {
          // console.log('RowUpdating');
          // console.log(e);

          var record = {};
          if (e.newData.productid) record["productid@odata.bind"] = `/products(${e.newData.productid})`; // Lookup
          if (e.newData.extreme_customproductname) record.extreme_customproductname = e.newData.extreme_customproductname; // Text
          if (e.newData.extreme_productdescription) record.extreme_productdescription = e.newData.extreme_productdescription; // Text
          if (e.newData.extreme_pricelistpriceperunit || e.newData.extreme_pricelistpriceperunit === 0) record.extreme_pricelistpriceperunit = e.newData.extreme_pricelistpriceperunit; // Decimal
          if (e.newData.extreme_pricelistcurrency || e.newData.extreme_pricelistcurrency === 0) record.extreme_pricelistcurrency = e.newData.extreme_pricelistcurrency; // Text
          if (e.newData.extreme_supplierpriceperunit || e.newData.extreme_supplierpriceperunit === 0) record.extreme_supplierpriceperunit = Number(parseFloat(e.newData.extreme_supplierpriceperunit).toFixed(4)); // Currency
          if (e.newData.quantity || e.newData.quantity === 0) record.quantity = e.newData.quantity; // Decimal
          if (e.newData.extreme_supplierbaseamount || e.newData.extreme_supplierbaseamount === 0) record.extreme_supplierbaseamount = Number(parseFloat(e.newData.extreme_supplierbaseamount).toFixed(4)); // Currency
          if (e.newData.extreme_supplierdiscount || e.newData.extreme_supplierdiscount === 0) record.extreme_supplierdiscount = e.newData.extreme_supplierdiscount; // Decimal
          if (e.newData.extreme_margin || e.newData.extreme_margin === 0) record.extreme_margin = e.newData.extreme_margin; // Decimal
          if (e.newData.priceperunit || e.newData.priceperunit === 0) record.priceperunit = e.newData.priceperunit; // Decimal
          if ((e.newData.baseamount || e.newData.baseamount === 0) && e.oldData.extreme_isparentitem !== true) record.baseamount = e.newData.baseamount; // Decimal
          if (e.newData.manualdiscountamount || e.newData.manualdiscountamount === 0) record.manualdiscountamount = Number(parseFloat(e.newData.manualdiscountamount).toFixed(4)); // Currency
          if (e.newData.extreme_pricewithdiscount || e.newData.extreme_pricewithdiscount === 0) record.extreme_pricewithdiscount = e.newData.extreme_pricewithdiscount; // Decimal
          if (e.newData.extreme_fullpricewithdiscount || e.newData.extreme_fullpricewithdiscount === 0) record.extreme_fullpricewithdiscount = e.newData.extreme_fullpricewithdiscount; // Decimal
          if (e.newData.extreme_tax || e.newData.extreme_tax === 0) record.extreme_tax = e.newData.extreme_tax; // Decimal
          if (e.newData.tax || e.newData.tax === 0) record.tax = Number(parseFloat(e.newData.tax).toFixed(4)); // Currency
          if (e.newData.extreme_pd || e.newData.extreme_pd === 0) record.extreme_pd = e.newData.extreme_pd; // Decimal
          if (e.newData.extreme_fullpd || e.newData.extreme_fullpd === 0) record.extreme_fullpd = e.newData.extreme_fullpd; // Decimal
          if (e.newData.extendedamount || e.newData.extendedamount === 0) record.extendedamount = e.newData.extendedamount; // New total amount
          if (typeof e.newData.extreme_createasset === "boolean") record.extreme_createasset = e.newData.extreme_createasset; // Boolean
          if (e.newData.extreme_pricelist) record["extreme_pricelist@odata.bind"] = `/pricelevels(${e.newData.extreme_pricelist})`; // Lookup
          if (e.newData.extreme_producttype) record.extreme_producttype = e.newData.extreme_producttype; // Chooice
          if (e.newData.extreme_area) record["extreme_Area@odata.bind"] = `/extreme_areas(${e.newData.extreme_area})`; // Lookup
          if (e.newData.extreme_technology) record["extreme_Technology@odata.bind"] = `/extreme_technologies(${e.newData.extreme_technology})`; // Lookup
          if (e.newData.extreme_vendorsupplier) record["extreme_VendorSupplier@odata.bind"] = `/accounts(${e.newData.extreme_vendorsupplier})`; // Lookup
          if (e.newData.extreme_vatsetting) {
            record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${e.newData.extreme_vatsetting})`; // Lookup
            record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatSettingsArray.find(item => item.id === e.newData.extreme_vatsetting).idVatGroup})`; // Lookup
          }

          if (isGuid(e.oldData.productid)) {
            if (e.newData.uomid) record["uomid@odata.bind"] = `/uoms(${e.newData.uomid})`; // Lookup
          }

          let promises = [];

          if (isGuid(e.oldData.productid) && (e.newData.extreme_area || e.newData.extreme_technology || e.newData.extreme_vendorsupplier)) {

            var recordForLookups = {};
            if (e.newData.extreme_area) recordForLookups["extreme_Area@odata.bind"] = `/extreme_areas(${e.newData.extreme_area})`; // Lookup
            if (e.newData.extreme_technology) recordForLookups["extreme_Technology@odata.bind"] = `/extreme_technologies(${e.newData.extreme_technology})`; // Lookup
            if (e.newData.extreme_vendorsupplier) recordForLookups["extreme_Supplier@odata.bind"] = `/accounts(${e.newData.extreme_vendorsupplier})`; // Lookup

            promises.push(Xrm.WebApi.updateRecord("product", `${e.oldData.productid}`, recordForLookups));

          }

          // Unified logic for updating parent item changes
          if ((e.newData.baseamount || e.newData.extreme_discount || e.newData.extreme_discount === 0) && e.oldData.extreme_isparentitem === true) {
            Xrm.Utility.showProgressIndicator("Recalculating... Please wait...");
            // console.log("ALL CHILD FOR UPDATE PROPORTION!");
            // console.log(
            //   quoteLinesData._array.filter(
            //     item => item.extreme_parentquoteline === e.oldData.quotedetailid
            //   )
            // );

            // Function to adjust amounts proportionally and ensure the total matches
            function adjustProportionalAmounts(newTotal, amounts) {
              const currentTotal = amounts.reduce((sum, a) => sum + a, 0);
              const scaleFactor = newTotal / currentTotal;

              // Handle case where all amounts are 0
              if (currentTotal === 0) {
                return amounts.map(() => 0);
              }

              let adjustedAmounts = amounts.map(amount => Math.round(amount * scaleFactor * 100) / 100);
              let adjustedSum = adjustedAmounts.reduce((sum, a) => sum + a, 0);
              let difference = Math.round((newTotal - adjustedSum) * 100) / 100;

              if (difference !== 0) {
                const numChildren = amounts.length;
                const fractionalAdjustment = Math.round((difference / numChildren) * 100) / 100;

                adjustedAmounts = adjustedAmounts.map(amount => Math.round((amount + fractionalAdjustment) * 100) / 100);

                adjustedSum = adjustedAmounts.reduce((sum, a) => sum + a, 0);
                difference = Math.round((newTotal - adjustedSum) * 100) / 100;

                if (Math.abs(difference) > 0) {
                  const smallestIndex = adjustedAmounts.findIndex(amount => amount === Math.min(...adjustedAmounts));
                  adjustedAmounts[smallestIndex] = Math.round((adjustedAmounts[smallestIndex] + difference) * 100) / 100;
                }
              }

              return adjustedAmounts;
            }

            // Use the parent's current or updated discount value
            const parentDiscountPercent = e.newData.extreme_discount !== undefined ? e.newData.extreme_discount : e.oldData.extreme_discount;
            const parentBaseAmount = e.newData.baseamount || e.oldData.baseamount;
            const parentFullPriceWDiscount = parentBaseAmount * (1 - parentDiscountPercent / 100);
            const parentManualDiscountAmount = parentBaseAmount * (parentDiscountPercent / 100);

            const parentTax = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .reduce((sum, child) => {
                const discountedPrice = child.priceperunit * (1 - parentDiscountPercent / 100) * child.quantity;
                return sum + (discountedPrice * (child.extreme_tax / 100));
              }, 0);

            // Collect child values
            const childBaseAmounts = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .map(child => child.baseamount);

            const childFullPrices = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .map(child => (child.priceperunit * (1 - parentDiscountPercent / 100)) * child.quantity);

            const childManualDiscountAmounts = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .map(child => child.manualdiscountamount || (child.baseamount * (parentDiscountPercent / 100)));

            const childTaxAmounts = quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .map(child => {
                const discountedPrice = child.priceperunit * (1 - parentDiscountPercent / 100) * child.quantity;
                return discountedPrice * (child.extreme_tax / 100);
              });

            // Adjust child values proportionally
            const adjustedBaseAmounts = adjustProportionalAmounts(parentBaseAmount, childBaseAmounts);
            const adjustedChildFullPrices = adjustProportionalAmounts(parentFullPriceWDiscount, childFullPrices);
            const adjustedChildManualDiscountAmounts = adjustProportionalAmounts(parentManualDiscountAmount, childManualDiscountAmounts);
            const adjustedChildTaxAmounts = adjustProportionalAmounts(parentTax, childTaxAmounts);

            // Apply recalculations to each child
            quoteLinesData._array
              .filter(item => item.extreme_parentquoteline === e.oldData.quotedetailid)
              .forEach((child, index) => {
                const newBaseAmount = adjustedBaseAmounts[index];
                const newFullPriceWDiscount = adjustedChildFullPrices[index];
                const newManualDiscountAmount = adjustedChildManualDiscountAmounts[index];
                const newTaxAmount = adjustedChildTaxAmounts[index];
                const newTotalAmount = newFullPriceWDiscount + newTaxAmount;

                const supplierDiscountAmount = child.extreme_supplierpriceperunit * (child.extreme_supplierdiscount / 100);
                const pricePerUnitWithSupplierDiscount = child.extreme_supplierpriceperunit - supplierDiscountAmount;
                const pricePerUnit = newBaseAmount / child.quantity;
                const pricePerUnitWithCustomDiscount = pricePerUnit - newManualDiscountAmount / child.quantity;
                const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;

                // Calculate the updated margin
                const margin = child.extreme_supplierpriceperunit !== 0
                  ? pricePerUnit / child.extreme_supplierpriceperunit
                  : 0;

                let childRecord = {};
                child.baseamount = newBaseAmount;
                childRecord.baseamount = newBaseAmount;

                if (child.extreme_supplierpriceperunit !== null) {
                  child.priceperunit = pricePerUnit;
                  childRecord.priceperunit = pricePerUnit;
                  child.extreme_margin = margin; // Update margin
                  childRecord.extreme_margin = margin; // Update margin in record
                  child.extreme_pd = pdPerUnit;
                  childRecord.extreme_pd = pdPerUnit;
                  child.extreme_fullpd = pdPerUnit * child.quantity;
                  childRecord.extreme_fullpd = pdPerUnit * child.quantity;
                }

                if (child.priceperunit !== null && child.quantity !== null) {
                  child.extreme_fullpricewithdiscount = newFullPriceWDiscount;
                  childRecord.extreme_fullpricewithdiscount = newFullPriceWDiscount;
                  child.manualdiscountamount = newManualDiscountAmount;
                  childRecord.manualdiscountamount = newManualDiscountAmount;
                  child.extreme_discount = e.newData.extreme_discount !== undefined ? e.newData.extreme_discount : child.extreme_discount;
                  childRecord.extreme_discount = e.newData.extreme_discount !== undefined ? e.newData.extreme_discount : child.extreme_discount;
                }

                if (child.extreme_tax !== null) {
                  child.tax = newTaxAmount;
                  childRecord.tax = newTaxAmount;
                  child.extendedamount = newTotalAmount;
                  childRecord.extendedamount = newTotalAmount;
                }

                promises.push(
                  Xrm.WebApi.updateRecord("quotedetail", `${child.quotedetailid}`, childRecord)
                );
              });
          }



          else {
            // console.log("ONLY ONE FOR UPDATE DISCOUNT!");
            if (e.newData.extreme_discount || e.newData.extreme_discount === 0) record.extreme_discount = e.newData.extreme_discount; // Decimal
          }

          // console.log('RECORD AFTER UPDATING RECORD IS CREATED');
          // console.log(record);

          promises.push(Xrm.WebApi.updateRecord("quotedetail", `${e.key}`, record));

          try {
            await Promise.all(promises);
            // console.log('All updates completed successfully.');

            if (e.oldData.extreme_isparentitem === true) {
              const parentQuoteLineGUID = e.key;

              let baseamount_sum = 0;
              let extendedamount_sum = 0;
              let extreme_fullpd_sum = 0;
              let extreme_fullpricewithdiscount_sum = 0;
              let manualdiscountamount_sum = 0;
              let extreme_supplierbaseamount_sum = 0;
              let tax_sum = 0;
              let avarageDiscountPercent = 0;

              quoteLinesData._array.filter((item) => item.extreme_parentquoteline === parentQuoteLineGUID).forEach((child) => {
                baseamount_sum += parseFloat(child.baseamount) || 0;
                extendedamount_sum += parseFloat(child.extendedamount) || 0;
                extreme_fullpd_sum += parseFloat(child.extreme_fullpd) || 0;
                extreme_fullpricewithdiscount_sum += parseFloat(child.extreme_fullpricewithdiscount) || 0;
                manualdiscountamount_sum += parseFloat(child.manualdiscountamount) || 0;
                extreme_supplierbaseamount_sum += parseFloat(child.extreme_supplierbaseamount) || 0;
                tax_sum += parseFloat(child.tax) || 0;
              });

              avarageDiscountPercent = baseamount_sum > 0 ? ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100 : 0;

              // Update parent in local store
              quoteLinesData.update(parentQuoteLineGUID, {
                baseamount: parseFloat(baseamount_sum.toFixed(2)),
                extendedamount: parseFloat(extendedamount_sum.toFixed(2)),
                extreme_fullpd: parseFloat(extreme_fullpd_sum.toFixed(2)),
                extreme_fullpricewithdiscount: parseFloat(extreme_fullpricewithdiscount_sum.toFixed(2)),
                manualdiscountamount: parseFloat(manualdiscountamount_sum.toFixed(2)),
                extreme_supplierbaseamount: parseFloat(extreme_supplierbaseamount_sum.toFixed(2)),
                tax: parseFloat(tax_sum.toFixed(2)),
                extreme_discount: parseFloat(avarageDiscountPercent.toFixed(2))
              });

              // Parent SET only updates locally - no database save needed

              dataGrid.getController('data').updateItems({
                changeType: 'update',
                rowIndices: [dataGrid.getRowIndexByKey(parentQuoteLineGUID)]
              });
              
              // Highlight parent and all its children after batch recalculation
              const childRowKeys = quoteLinesData._array
                .filter(item => item.extreme_parentquoteline === parentQuoteLineGUID)
                .map(item => item.quotedetailid);
              const fieldsToHighlight = ['baseamount', 'priceperunit', 'extreme_margin', 'extreme_discount', 'extreme_fullpricewithdiscount', 'extendedamount', 'tax'];
              setTimeout(() => {
                highlightUpdatedCells(dataGrid, parentQuoteLineGUID, fieldsToHighlight, 2500);
                highlightMultipleRows(dataGrid, childRowKeys, fieldsToHighlight, 2500);
              }, 200);
            }

            // await getQuoteProducts(quoteIdForm);
            // dataGrid.refresh();

            Xrm.Utility.closeProgressIndicator();

            formContext.data.refresh(true);
          } catch (error) {
            // console.log('Error during updates:', error.message);
          }

        },
        onRowUpdated(e) {
          // console.log('RowUpdated');
          // console.log(e);
        },
        onRowRemoving: async (e) => {
          // console.log('RowRemoving');
          // console.log(e);

          // Check if this is a new unsaved row (no valid GUID)
          const isNewUnsavedRow = !e.key || !isGuid(e.key);
          
          if (isNewUnsavedRow) {
            // For new unsaved rows, just skip the API delete - grid will handle removal
            return;
          }
          
          // Check if already being deleted by another process (single delete button or Delete Selected)
          if (deletingIds.has(e.key)) {
            // Already being deleted, just remove from local store and skip API call
            quoteLinesData.remove(e.key);
            return;
          }
          
          // Mark as deleting to prevent double deletion
          deletingIds.add(e.key);

          Xrm.Utility.showProgressIndicator('Deleting... Please wait...');

          try {
            const idsToRemove = [e.key];
            let childItems = [];

            // Check if the item is a parent item - collect all child IDs
            if (e.data.extreme_isparentitem === true) {
              childItems = quoteLinesData._array.filter((item) => item.extreme_parentquoteline === e.key);
              childItems.forEach(child => {
                idsToRemove.push(child.quotedetailid);
                deletingIds.add(child.quotedetailid);
              });
            }

            // Delete children first, then parent (to avoid FK constraint issues)
            if (childItems.length > 0) {
              const childDeletePromises = childItems.map(child => 
                Xrm.WebApi.deleteRecord("quotedetail", `${child.quotedetailid}`)
                  .catch(err => {
                    // Ignore 404/ObjectDoesNotExist errors (already deleted)
                    if (!err.message?.includes('does not exist') && !err.message?.includes('ObjectDoesNotExist')) {
                      throw err;
                    }
                  })
              );
              await Promise.all(childDeletePromises);
              
              // Remove children from local store
              childItems.forEach(child => quoteLinesData.remove(child.quotedetailid));
            }
            
            // Now delete the parent/item itself
            await Xrm.WebApi.deleteRecord("quotedetail", `${e.key}`)
              .catch(err => {
                // Ignore 404/ObjectDoesNotExist errors (already deleted)
                if (!err.message?.includes('does not exist') && !err.message?.includes('ObjectDoesNotExist')) {
                  throw err;
                }
              });
            
            // Remove from local store
            quoteLinesData.remove(e.key);

            // Batch reorder in background (fire and forget)
            setTimeout(() => {
              try {
                const reorderPromises = [];
                const parentItems = quoteLinesData._array.filter(item => item.extreme_parentquoteline === null);
                const remainingChildItems = quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null);

                parentItems.forEach((item, i) => {
                  const newSeq = parseInt((i + 1) + "00");
                  if (item.sequencenumber !== newSeq) {
                    reorderPromises.push(Xrm.WebApi.updateRecord("quotedetail", `${item.quotedetailid}`, { sequencenumber: newSeq }));
                    item.sequencenumber = newSeq;
                  }
                });

                remainingChildItems.forEach((item, i) => {
                  const parentSeq = quoteLinesData._array.find(p => p.quotedetailid === item.extreme_parentquoteline)?.sequencenumber || 0;
                  const newSeq = parentSeq + (i + 1);
                  if (item.sequencenumber !== newSeq) {
                    reorderPromises.push(Xrm.WebApi.updateRecord("quotedetail", `${item.quotedetailid}`, { sequencenumber: newSeq }));
                    item.sequencenumber = newSeq;
                  }
                });

                if (reorderPromises.length > 0) {
                  Promise.all(reorderPromises).catch(err => console.warn('Reorder warning:', err));
                }
              } catch (reorderError) {
                console.warn('Reorder error:', reorderError);
              }
            }, 100);

            dataGrid.refresh();
            Xrm.Utility.closeProgressIndicator();
            
            // Clear deletingIds after a delay
            setTimeout(() => {
              idsToRemove.forEach(id => deletingIds.delete(id));
            }, 2000);
            
            // Refresh form in background (don't block UI)
            formContext.data.refresh(false);
          } catch (error) {
            // Clear deletingIds on error
            deletingIds.clear();
            Xrm.Utility.closeProgressIndicator();
            Xrm.Navigation.openErrorDialog({
              details: error,
              errorCode: 400,
              message: error.message
            });
          }
        },
        onRowRemoved: (e) => {
          // console.log('RowRemoved');
        },
        onSaving() {
          // console.log('Saving');
        },
        onSaved(e) {
          // console.log('Saved');
          // console.log(e);

          if (e.changes.length == 0) {
            isAddingSet = null;
            // console.log("isAddingSet: ", isAddingSet);
            dataGrid.columnOption("productid", "lookup", {
              dataSource(options) {

                let filterQuery = null;

                if (options.data) {
                  options.data.extreme_isparentitem === true ? filterQuery = [['extreme_isparent', '=', true], "and", ["statecode", "=", 0]] : filterQuery = [['extreme_isparent', '<>', true], "and", ["statecode", "=", 0]];
                }

                return {
                  store: productsODataStore,
                  // searchExpr: ["productnumber", "name"],
                  paginate: true,
                  pageSize: 100,
                  loadMode: 'raw',
                  filter: filterQuery === null ? ["statecode", "=", 0] : filterQuery
                }
              },
              displayExpr: 'productnumber',
              valueExpr: 'productid',
            });

            dataGrid.columnOption("extreme_supplierpriceperunit", "allowEditing", true);
            dataGrid.columnOption("uomid", "allowEditing", true);
            dataGrid.columnOption("uomid", "validationRules", [{ type: 'required' }]);
            dataGrid.columnOption("extreme_supplierdiscount", "allowEditing", true);
            dataGrid.columnOption("extreme_margin", "allowEditing", true);
            dataGrid.columnOption("priceperunit", "allowEditing", true);
            dataGrid.columnOption("baseamount", "allowEditing", true);
            dataGrid.columnOption("extreme_discount", "allowEditing", true);
            dataGrid.columnOption("extreme_fullpricewithdiscount", "allowEditing", true);
            dataGrid.columnOption("extreme_pricelist", "allowEditing", true);
            dataGrid.columnOption("extreme_createasset", "allowEditing", true);
            dataGrid.columnOption("extreme_vatsetting", "allowEditing", true);
            dataGrid.columnOption("extreme_vatsetting", "validationRules", null);
          }
        },
        onCellDblClick(e) {
          // console.log('CELL DOUBLE CLICK');
          // console.log(e);

          if (e.column.dataField === "productid" && isGuid(e.data.productid) && e.data.productid) {
            // Create an anchor element
            const globalContext = Xrm.Utility.getGlobalContext();
            globalContext.getCurrentAppUrl();

            // console.log('CLIENT URL');
            // console.log(globalContext.getCurrentAppUrl());

            const link = document.createElement('a');
            link.href = `${globalContext.getCurrentAppUrl()}&pagetype=entityrecord&etn=product&id=${e.data.productid}`;
            link.target = "_blank";

            // Append the anchor to the body (required for Firefox)
            document.body.appendChild(link);

            // Trigger a click event on the anchor
            link.click();

            // Remove the anchor from the body
            document.body.removeChild(link);
          }

          if (e.column.dataField === "extreme_customproductname" && isGuid(e.data.productid)) {
            inventoryInfo(e.data.productid, e.data.quotedetailid);
          }
          else if (e.column.dataField === "extreme_customproductname" && !isGuid(e.data.productid)) {
            Xrm.Navigation.openAlertDialog({
              title: "Warning",
              text: "You cannot call the inventory information for a custom product."
            });
          }

        },
        onEditCanceling() {
          // console.log('EditCanceling');
        },
        onEditCanceled() {
          // console.log('EditCanceled');
        },
        onContentReady(e) {
          e.component.columnOption("command:select", "visibleIndex", 999);
          e.component.getView("columnHeadersView").resizeCompleted.remove(masterGridColumnResized);
          e.component.getView("columnHeadersView").resizeCompleted.add(masterGridColumnResized);
          masterGridColumnResized();
          checkClassifyRows();
        }
      }).dxDataGrid('instance');

      // resize child columns
      function masterGridColumnResized() {
        var detailContainers = dataGrid.element().find('.internal-grid');
        // console.log(detailContainers);
        if (detailContainers.length) {
          for (var j = 0; j < detailContainers.length; j++) {
            var detailGridInstance = $(detailContainers.get(j)).dxDataGrid('instance');
            detailGridInstance.beginUpdate();
            for (var i = 0; i < dataGrid.columnCount(); i++) {
              // console.log("columnOption dataField");
              // console.log(dataGrid.columnOption(i, "dataField"));
              if (detailGridInstance.columnOption(i, "dataField") === "productid") {
                detailGridInstance.columnOption(i, 'width', dataGrid.columnOption(i, 'width') + 30);
                detailGridInstance.columnOption(i, 'visibleWidth', dataGrid.columnOption(i, 'visibleWidth') + 30);
              }
              else {
                detailGridInstance.columnOption(i, 'width', dataGrid.columnOption(i, 'width'));
                detailGridInstance.columnOption(i, 'visibleWidth', dataGrid.columnOption(i, 'visibleWidth'));
              }
            }
            detailGridInstance.endUpdate();
          }
        }

      }

      // Recalculate amounts for each row based on changed value
      const recalculateAmounts = ({
        quantity = 1,
        supplierPricePerUnit,
        supplierDiscount,
        margin,
        pricePerUnit = null,
        baseAmount = null,
        discount,
        fullPriceWithDiscount = null,
        TaxPercent
      }) => {
        const taxRate = TaxPercent / 100;
        const supplierBaseAmount = supplierPricePerUnit * quantity;

        // If baseAmount is passed, recalculate margin using baseAmount and pricePerUnit, but do not change baseAmount or pricePerUnit
        if (baseAmount !== null && pricePerUnit !== null) {
          // margin = pricePerUnit / supplierPricePerUnit; // original logic
          margin = pricePerUnit / supplierPricePerUnit;
          // baseAmount and pricePerUnit remain as passed
        } else {
          // Calculate pricePerUnit if not provided
          if (pricePerUnit === null) {
            if (ROUNDING_PRICE_PER_UNIT_CONFIG === "true") {
              pricePerUnit = Math.ceil(margin * supplierPricePerUnit);
            }
            else {
              pricePerUnit = parseFloat((margin * supplierPricePerUnit).toFixed(4));
            }
          } else {
            // Calculate new margin based on supplierPricePerUnit
            margin = pricePerUnit / supplierPricePerUnit;
          }
          baseAmount = pricePerUnit * quantity;
        }

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
        const supplierDiscountAmount = supplierPricePerUnit * (supplierDiscount / 100);
        const pricePerUnitWithSupplierDiscount = supplierPricePerUnit - supplierDiscountAmount;
        const customDiscountAmount = pricePerUnit * (discount / 100);
        const pricePerUnitWithCustomDiscount = pricePerUnit - customDiscountAmount;
        const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;
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
          supplierPricePerUnit
        };
      }


      // function for changing exchange rates - OPTIMIZED with batch processing
      const exchangeRateChange = async (currency, newValue) => {
        try {
          const currencySymbol = currenciesArray.find((item) => item.isocurrencycode === currency)?.currencysymbol;
          if (!currencySymbol) return;

          const results = await Xrm.WebApi.retrieveMultipleRecords("quotedetail", `?$select=extreme_supplierdiscount,extreme_pd,extreme_fullpd,quotedetailid,extreme_tax,extreme_discount,extreme_margin,extreme_pricelistpriceperunit,quantity&$filter=(_quoteid_value eq ${quoteIdForm} and extreme_pricelistcurrency eq '${currencySymbol}')`);
          
          if (results.entities.length === 0) return;

          Xrm.Utility.showProgressIndicator(`Updating ${results.entities.length} items... Please wait...`);

          // Prepare all updates with calculated values
          const updatesWithData = results.entities.map(result => {
            const quotedetailid = result["quotedetailid"];
            const quantity = result["quantity"];
            const extreme_pricelistpriceperunit = result["extreme_pricelistpriceperunit"];
            const extreme_margin = result["extreme_margin"];
            const extreme_discount = result["extreme_discount"];
            const extreme_supplierdiscount = result["extreme_supplierdiscount"];
            const extreme_tax = result["extreme_tax"];

            const pricePerUnit = (extreme_pricelistpriceperunit * parseFloat(newValue)) * extreme_margin;
            const baseAmount = pricePerUnit * quantity;
            const manualDiscountAmount = baseAmount - (baseAmount * (1 - extreme_discount / 100));
            const fullPriceWithDiscount = pricePerUnit * (1 - extreme_discount / 100) * quantity;
            const tax = ((pricePerUnit * (1 - extreme_discount / 100)) * quantity * (1 + extreme_tax / 100)) - (pricePerUnit * (1 - extreme_discount / 100) * quantity);
            const extendedAmount = tax + (pricePerUnit * (1 - extreme_discount / 100) * quantity);

            const supplierDiscountAmount = extreme_pricelistpriceperunit * parseFloat(newValue) * (extreme_supplierdiscount / 100);
            const pricePerUnitWithSupplierDiscount = extreme_pricelistpriceperunit * parseFloat(newValue) - supplierDiscountAmount;
            const customDiscountAmount = pricePerUnit * (extreme_discount / 100);
            const pricePerUnitWithCustomDiscount = pricePerUnit - customDiscountAmount;
            const pdPerUnit = pricePerUnitWithCustomDiscount - pricePerUnitWithSupplierDiscount;
            const newPd = pdPerUnit;
            const newFullPd = newPd * quantity;

            const updateData = {
              extreme_supplierpriceperunit: extreme_pricelistpriceperunit * parseFloat(newValue),
              extreme_supplierbaseamount: (extreme_pricelistpriceperunit * parseFloat(newValue)) * quantity,
              priceperunit: pricePerUnit,
              baseamount: baseAmount,
              manualdiscountamount: manualDiscountAmount,
              extreme_fullpricewithdiscount: fullPriceWithDiscount,
              tax: tax,
              extendedamount: extendedAmount,
              extreme_pd: newPd,
              extreme_fullpd: newFullPd
            };

            return { quotedetailid, updateData };
          });

          // Execute all API updates in parallel batches
          await processBatchesInParallel(updatesWithData, async ({ quotedetailid, updateData }) => {
            await Xrm.WebApi.updateRecord("quotedetail", `${quotedetailid}`, updateData);
            quoteLinesData.update(quotedetailid, updateData);
            return quotedetailid;
          });

          // Collect unique parent IDs that need updating
          const parentIdsToUpdate = new Set();
          updatesWithData.forEach(({ quotedetailid }) => {
            const item = quoteLinesData._array.find((item) => item.quotedetailid === quotedetailid);
            if (item?.extreme_parentquoteline) {
              parentIdsToUpdate.add(item.extreme_parentquoteline);
            }
          });

          // Update all parent items in one pass (instead of after each child)
          parentIdsToUpdate.forEach(parentQuoteLineGUID => {
            let baseamount_sum = 0;
            let extendedamount_sum = 0;
            let extreme_fullpd_sum = 0;
            let extreme_fullpricewithdiscount_sum = 0;
            let manualdiscountamount_sum = 0;
            let extreme_supplierbaseamount_sum = 0;
            let tax_sum = 0;

            quoteLinesData._array.filter((item) => item.extreme_parentquoteline === parentQuoteLineGUID).forEach((e) => {
              baseamount_sum += e.baseamount;
              extendedamount_sum += e.extendedamount;
              extreme_fullpd_sum += e.extreme_fullpd;
              extreme_fullpricewithdiscount_sum += e.extreme_fullpricewithdiscount;
              manualdiscountamount_sum += e.manualdiscountamount;
              extreme_supplierbaseamount_sum += e.extreme_supplierbaseamount;
              tax_sum += e.tax;
            });

            const avarageDiscountPercent = ((baseamount_sum - extreme_fullpricewithdiscount_sum) / baseamount_sum) * 100;

            quoteLinesData.update(parentQuoteLineGUID, {
              baseamount: baseamount_sum.toFixed(2),
              extendedamount: extendedamount_sum.toFixed(2),
              extreme_fullpd: extreme_fullpd_sum.toFixed(2),
              extreme_fullpricewithdiscount: extreme_fullpricewithdiscount_sum.toFixed(2),
              manualdiscountamount: manualdiscountamount_sum.toFixed(2),
              extreme_supplierbaseamount: extreme_supplierbaseamount_sum.toFixed(2),
              tax: tax_sum.toFixed(2),
              extreme_discount: avarageDiscountPercent.toFixed(2)
            });
          });

          // Refresh grid data
          await getQuoteProducts(quoteIdForm);
          dataGrid.refresh();
          
          // Highlight all updated rows after refresh
          setTimeout(() => {
            const updatedRowKeys = updatesWithData.map(u => u.quotedetailid);
            const fieldsToHighlight = ['extreme_supplierpriceperunit', 'extreme_supplierbaseamount', 'priceperunit', 'baseamount', 'extreme_fullpricewithdiscount', 'extendedamount'];
            highlightMultipleRows(dataGrid, updatedRowKeys, fieldsToHighlight, 2500);
            // Also highlight parent rows
            highlightMultipleRows(dataGrid, Array.from(parentIdsToUpdate), fieldsToHighlight, 2500);
          }, 300);
          
          Xrm.Utility.closeProgressIndicator();

        } catch (error) {
          Xrm.Utility.closeProgressIndicator();
          Xrm.Navigation.openErrorDialog({
            details: error,
            errorCode: 400,
            message: error.message
          });
        }

        formContext.data.refresh(false);

        // quoteLinesData._array.filter((item) => item.extreme_pricelistcurrency === currenciesArray.find((item) => item.isocurrencycode === currency).currencysymbol).forEach((e) => {

        //   quoteLinesData.update(e.quotedetailid, {
        //     extreme_supplierpriceperunit: e.extreme_pricelistpriceperunit * parseFloat(newValue),
        //     extreme_supplierbaseamount: (e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.quantity,
        //     priceperunit: (e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin,
        //     baseamount: ((e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin) * e.quantity,
        //     manualdiscountamount: (((e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin) * e.quantity) - ((((e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin) * (1 - e.extreme_discount / 100) * e.quantity)),
        //     extreme_fullpricewithdiscount: (((e.extreme_pricelistpriceperunit * parseFloat(newValue)) * e.extreme_margin) * (1 - e.extreme_discount / 100)) * e.quantity,
        //     tax: (((e.priceperunit * (1 - e.extreme_discount / 100)) * e.quantity) * (1 + e.extreme_tax / 100)) - ((e.priceperunit * (1 - e.extreme_discount / 100)) * e.quantity),
        //     extendedamount: e.tax + ((e.priceperunit * (1 - e.extreme_discount / 100)) * e.quantity)
        //   });

        //   dataGrid.getController('data').updateItems({
        //     changeType: 'update',
        //     rowIndices: [dataGrid.getRowIndexByKey(e.quotedetailid)]
        //   });

        // });

      }

      // onAdd Drag and Drop function
      async function onAdd(e) {

        if (!isDraftStatus) {
          Xrm.Navigation.openAlertDialog({ confirmButtonLabel: "Close", text: "Grid is in read-only mode.", title: "Cannot do that" });
          return;
        }

        Xrm.Utility.showProgressIndicator('');

        // // console.log('onAdd TRIGGERED!');
        // // console.log(e);

        let key = '';
        let values = {};

        if (e.fromData === 'root' && e.itemData.extreme_isparentitem === false) {
          // // console.log('from root to child, no parent item');

          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount) + e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount) + e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd) + e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount) + e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount) + e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount) + e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax) + e.itemData.tax;
          const newBaseAmountSum = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount);
          const newFullPriceWithDiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount);
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_discount = ((newBaseAmountSum - newFullPriceWithDiscount) / newBaseAmountSum) * 100;

          key = e.itemData.quotedetailid;
          values = { extreme_parentquoteline: e.toData };

          await Xrm.WebApi.updateRecord("quotedetail", `${e.itemData.quotedetailid}`, { "extreme_ParentQuoteLine@odata.bind": `/quotedetails(${e.toData})` });

          quoteLinesData.update(key, values).then(() => {
            quoteLinesData.push([{
              type: 'update', key, data: values,
            }]);
          });

        }
        else if (e.fromData !== 'root' && e.toData === 'root') {
          // // console.log('from child to parent');

          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount) - e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount) - e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd) - e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount) - e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount) - e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount) - e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax) - e.itemData.tax;
          const newBaseAmountSum = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount);
          const newFullPriceWithDiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount);
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_discount = ((newBaseAmountSum - newFullPriceWithDiscount) / newBaseAmountSum) * 100;

          key = e.itemData.quotedetailid;
          values = { extreme_parentquoteline: null };

          await Xrm.WebApi.updateRecord("quotedetail", `${e.itemData.quotedetailid}`, { "extreme_ParentQuoteLine@odata.bind": null });

          quoteLinesData.update(key, values).then(() => {
            quoteLinesData.push([{
              type: 'update', key, data: values,
            }]);
          });

        }
        else if (e.fromData !== 'root' && e.toData !== 'root' && e.fromData !== e.toData) {
          // // console.log('from child to another child');

          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount) - e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extendedamount) - e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpd) - e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount) - e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).manualdiscountamount) - e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_supplierbaseamount) - e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).tax) - e.itemData.tax;
          const newBaseAmountSumFrom = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).baseamount);
          const newFullPriceWithDiscountFrom = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_fullpricewithdiscount);
          quoteLinesData._array.find((item) => item.quotedetailid === e.fromData).extreme_discount = ((newBaseAmountSumFrom - newFullPriceWithDiscountFrom) / newBaseAmountSumFrom) * 100;

          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount) + e.itemData.baseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extendedamount) + e.itemData.extendedamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpd) + e.itemData.extreme_fullpd;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount) + e.itemData.extreme_fullpricewithdiscount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).manualdiscountamount) + e.itemData.manualdiscountamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_supplierbaseamount) + e.itemData.extreme_supplierbaseamount;
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).tax) + e.itemData.tax;
          const newBaseAmountSumTo = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).baseamount);
          const newFullPriceWithDiscountTo = parseFloat(quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_fullpricewithdiscount);
          quoteLinesData._array.find((item) => item.quotedetailid === e.toData).extreme_discount = ((newBaseAmountSumTo - newFullPriceWithDiscountTo) / newBaseAmountSumTo) * 100;

          key = e.itemData.quotedetailid;
          values = { extreme_parentquoteline: e.toData };

          await Xrm.WebApi.updateRecord("quotedetail", `${e.itemData.quotedetailid}`, { "extreme_ParentQuoteLine@odata.bind": `/quotedetails(${e.toData})` });

          quoteLinesData.update(key, values).then(() => {
            quoteLinesData.push([{
              type: 'update', key, data: values,
            }]);
          });

        }

        // // console.log(key);
        // // console.log(values);

        for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline === null).length; i++) {
          Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].quotedetailid}`, { sequencenumber: parseInt((i + 1) + "00") });
          quoteLinesData._array.filter(item => item.extreme_parentquoteline === null)[i].sequencenumber = parseInt((i + 1) + "00");
        }

        for (let i = 0; i < quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null).length; i++) {
          Xrm.WebApi.updateRecord("quotedetail", `${quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].quotedetailid}`, { sequencenumber: quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1) });
          quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].sequencenumber = quoteLinesData._array.find(item => item.quotedetailid === quoteLinesData._array.filter(item => item.extreme_parentquoteline !== null)[i].extreme_parentquoteline).sequencenumber + (i + 1);
        }

        Xrm.Utility.closeProgressIndicator();

        // store.update(key, values).then(() => {
        //   store.push([{
        //     type: 'update', key, data: values,
        //   }]);
        // });
      }

      // function for checking classify needed rows
      const checkClassifyRows = () => {

        classifyNeededRows = 0;

        if (quoteLinesData._array.length > 0) {
          quoteLinesData._array.filter((item) =>
          // item.extreme_isparentitem === false &&
          (
            (item.extreme_area === null || item.extreme_area === undefined) ||
            (item.extreme_technology === null || item.extreme_technology === undefined) ||
            (item.extreme_vendorsupplier === null || item.extreme_vendorsupplier === undefined)
          )
          ).forEach((item) => {
            classifyNeededRows += 1;
          })
        }

        if (classifyNeededRows > 0) {
          $('#classifyBtn')[0].style.backgroundColor = '#fce3c2';
          $('#classifyBtn')[0].style.display = 'inline-flex';
        }
        else {
          $('#classifyBtn')[0].style.backgroundColor = '#fff';
          $('#classifyBtn')[0].style.display = 'none';
        }

        // // console.log('CLASSIFY NEEDED ROWS');
        // // console.log(classifyNeededRows);

      }

      // Dropdown template cell editor
      function dropDownBoxEditorTemplateProducts(cellElement, cellInfo) {
        return $('<div>').dxLookup({
          dataSource: {
            store: productsStore,
            postProcess: function (data) {
              // data.unshift({ productId: "productId", productName: "productName", productDefaultUnit: "productDefaultUnit", disabled: true });
              return data;
            }
          },
          searchEnabled: true,
          displayExpr: function (item) {
            if (item)
              return item.productId + " " + item.productName;
          },
          valueExpr: "productId",
          searchExpr: ["productId", "productName", "productDefaultUnit"],
          width: 500,
          popupWidth: 500,
          itemTemplate: function (data, index, container) {
            var row = $("<div>").addClass("row-fluid");
            $("<div>").addClass("col-xs-4").text(data["productId"]).appendTo(row);
            $("<div>").addClass("col-xs-4").text(data["productName"]).appendTo(row);
            $("<div>").addClass("col-xs-4").text(data["productDefaultUnit"]).appendTo(row);
            container.append(row);
          }

        });
      }

      // Function to get Inventory Info and display it as pop-up dialog
      async function inventoryInfo(productGuid, quoteDetailGuid) {
        const globalContext = Xrm.Utility.getGlobalContext();
        const productName = await Xrm.WebApi.retrieveRecord("product", productGuid, "?$select=name,productnumber");


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
              message: error.message
            });
          }
        );
      }

    });
  }


  // Select the gridContainer element
  let gridContainer;

  const wrControl = formContext.getControl('WebResource_quoteLines');
  wrControl.getContentWindow().then(function (contentWindow) {
    // // console.log('HEIGHT MAIN CONTAINER:');
    // // console.log(contentWindow.document.getElementById('gridContainer').offsetHeight);
    gridContainer = contentWindow.document.getElementById('gridContainer');
    // // console.log(gridContainer);

    // Create a MutationObserver instance
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style' || mutation.type === 'childList') {
          // Get the current height of the gridContainer
          const gridContainerHeight = gridContainer.offsetHeight;
          // Set the min-height of the iframe based on the gridContainer's height if it exceeds 200px
          const iframe = wrControl.getObject();
          if (heightAuto === true) {
            if (gridContainerHeight > 250) {
              iframe.style.minHeight = `${gridContainerHeight + 20}px`;
            } else {
              iframe.style.minHeight = '255px';
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


  Xrm.Utility.closeProgressIndicator();

}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}

// Delete case line
async function deleteCaseLine(caseLineId) {
  await Xrm.WebApi.deleteRecord("extreme_caseline", `${caseLineId}`).then(
    function success(result) {
      // // console.log(result);
    },
    function (error) {
      Xrm.Navigation.openErrorDialog({
        details: error,
        errorCode: 400,
        message: error.message
      });
    }
  );
}

// Batch add item function - adds a single product or set to the quote
async function addBatchItem(item, quoteIdForm, quoteLinesData, dataGrid, Xrm, formContext, recalculateAmounts, currenciesArray, quoteCurrencySymbol, vatSettingsArray, defaultMargin, customerTaxPercentage) {
  const isSet = item.isSet;
  
  // Get product details
  const productInfo = await getCachedProductInfo(Xrm, item.productid, "description,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value,_pricelevelid_value,_defaultuomid_value,producttypecode");
  
  // Get VAT setting from array matching BOTH productTypeCode AND customerTaxPercentage (no API call)
  const vatSettingFromArray = productInfo.producttypecode ? 
    vatSettingsArray.find(vs => vs.productTypeCode === productInfo.producttypecode && vs.customerTaxPercentage === customerTaxPercentage) : null;
  const vatSetting = vatSettingFromArray ? vatSettingFromArray.id : null;
  const vatGroup = vatSettingFromArray ? vatSettingFromArray.idVatGroup : null;
  const defaultTax = vatSettingFromArray ? vatSettingFromArray.vat : 0;

  // Get price list info if available
  let supplierPricePerUnit = 0;
  let priceListPPU = null;
  let priceListCurrency = null;
  let priceListMargin = defaultMargin;

  if (productInfo._pricelevelid_value) {
    try {
      const priceListItemInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$filter=(_pricelevelid_value eq ${productInfo._pricelevelid_value} and _productid_value eq ${item.productid})&$expand=pricelevelid($select=extreme_defaultsalesmargin)`);
      
      if (priceListItemInfo.entities.length > 0) {
        priceListPPU = priceListItemInfo.entities[0].amount;
        priceListMargin = priceListItemInfo.entities[0].pricelevelid?.extreme_defaultsalesmargin ?? defaultMargin;
        
        const currencyId = priceListItemInfo.entities[0]._transactioncurrencyid_value;
        const currencyInfo = currenciesArray.find(c => c.transactioncurrencyid === currencyId);
        priceListCurrency = currencyInfo?.currencysymbol;

        if (quoteCurrencySymbol !== priceListCurrency && priceListCurrency) {
          const currencyRate = currencyInfo?.isocurrencycode ? ($(`#${currencyInfo.isocurrencycode}`).val() || 1) : 1;
          supplierPricePerUnit = priceListPPU * currencyRate;
        } else {
          supplierPricePerUnit = priceListPPU;
        }
      }
    } catch (e) {
      console.warn('Price list lookup failed:', e);
    }
  }

  // Get default discount from UI
  const discountInputVal = parseFloat($('#discountInput').val()) || 0;

  // Calculate amounts
  let recalcResult = { quantity: 1, supplierBaseAmount: 0, pricePerUnit: 0, baseAmount: 0, fullPriceWithDiscount: 0, customDiscountAmount: 0, tax: 0, extendedAmount: 0, pdPerUnit: 0, fullPd: 0 };
  
  if (!isSet && supplierPricePerUnit > 0) {
    recalcResult = recalculateAmounts({
      quantity: 1,
      supplierPricePerUnit: supplierPricePerUnit,
      supplierDiscount: 0,
      margin: priceListMargin,
      discount: discountInputVal,
      TaxPercent: defaultTax
    });
  }

  // Build the record
  const record = {};
  record["quoteid@odata.bind"] = `/quotes(${quoteIdForm})`;
  record.extreme_customproductname = item.name;
  record["productid@odata.bind"] = `/products(${item.productid})`;
  record.ispriceoverridden = true;
  record.extreme_isparentitem = isSet;
  record.sequencenumber = parseInt((quoteLinesData._array.filter(i => i.extreme_parentquoteline === null).length + 1) + "00");

  if (productInfo._defaultuomid_value) {
    record["uomid@odata.bind"] = `/uoms(${productInfo._defaultuomid_value})`;
  }

  if (productInfo.description) {
    record.extreme_productdescription = productInfo.description;
  }

  if (productInfo._extreme_area_value) {
    record["extreme_Area@odata.bind"] = `/extreme_areas(${productInfo._extreme_area_value})`;
  }
  if (productInfo._extreme_technology_value) {
    record["extreme_Technology@odata.bind"] = `/extreme_technologies(${productInfo._extreme_technology_value})`;
  }
  if (productInfo._extreme_supplier_value) {
    record["extreme_VendorSupplier@odata.bind"] = `/accounts(${productInfo._extreme_supplier_value})`;
  }

  if (!isSet) {
    if (productInfo.producttypecode) record.extreme_producttype = productInfo.producttypecode;
    if (vatSetting) record["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${vatSetting})`;
    if (vatGroup) record["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${vatGroup})`;
    if (productInfo._pricelevelid_value) record["extreme_pricelist@odata.bind"] = `/pricelevels(${productInfo._pricelevelid_value})`;
    if (priceListPPU) record.extreme_pricelistpriceperunit = priceListPPU;
    if (priceListCurrency) record.extreme_pricelistcurrency = priceListCurrency;
    
    record.quantity = 1;
    record.extreme_margin = priceListMargin;
    record.extreme_discount = discountInputVal;
    record.extreme_supplierdiscount = 0;
    
    if (supplierPricePerUnit) record.extreme_supplierpriceperunit = Number(parseFloat(supplierPricePerUnit).toFixed(4));
    if (recalcResult.supplierBaseAmount) record.extreme_supplierbaseamount = Number(parseFloat(recalcResult.supplierBaseAmount).toFixed(4));
    if (recalcResult.pricePerUnit) record.priceperunit = Number(parseFloat(recalcResult.pricePerUnit).toFixed(4));
    if (recalcResult.baseAmount) record.baseamount = Number(parseFloat(recalcResult.baseAmount).toFixed(4));
    if (recalcResult.fullPriceWithDiscount) record.extreme_fullpricewithdiscount = recalcResult.fullPriceWithDiscount;
    if (recalcResult.customDiscountAmount) record.manualdiscountamount = Number(parseFloat(recalcResult.customDiscountAmount).toFixed(4));
    if (recalcResult.tax) record.tax = Number(parseFloat(recalcResult.tax).toFixed(4));
    if (defaultTax) record.extreme_tax = defaultTax;
    if (recalcResult.extendedAmount) record.extendedamount = Number(parseFloat(recalcResult.extendedAmount).toFixed(4));
    if (recalcResult.pdPerUnit) record.extreme_pd = recalcResult.pdPerUnit;
    if (recalcResult.fullPd) record.extreme_fullpd = recalcResult.fullPd;
  }

  // Create the quote detail
  const createResult = await Xrm.WebApi.createRecord("quotedetail", record);
  const newQuoteDetailId = createResult.id;

  // Add to local store
  const storeRecord = {
    quotedetailid: newQuoteDetailId,
    productid: item.productid,
    productnumber: item.productnumber,
    extreme_customproductname: item.name,
    extreme_productdescription: productInfo.description || '',
    uomid: productInfo._defaultuomid_value,
    quantity: 1,
    extreme_isparentitem: isSet,
    extreme_parentquoteline: null,
    sequencenumber: record.sequencenumber,
    extreme_area: productInfo._extreme_area_value,
    extreme_technology: productInfo._extreme_technology_value,
    extreme_vendorsupplier: productInfo._extreme_supplier_value,
    extreme_producttype: productInfo.producttypecode,
    extreme_vatsetting: vatSetting,
    extreme_tax: defaultTax,
    extreme_pricelist: productInfo._pricelevelid_value,
    extreme_pricelistpriceperunit: priceListPPU || 0,
    extreme_pricelistcurrency: priceListCurrency || '',
    extreme_supplierpriceperunit: supplierPricePerUnit || 0,
    extreme_supplierbaseamount: recalcResult.supplierBaseAmount || 0,
    extreme_supplierdiscount: 0,
    extreme_margin: priceListMargin,
    priceperunit: recalcResult.pricePerUnit || 0,
    baseamount: recalcResult.baseAmount || 0,
    extreme_discount: discountInputVal,
    manualdiscountamount: recalcResult.customDiscountAmount || 0,
    extreme_fullpricewithdiscount: recalcResult.fullPriceWithDiscount || 0,
    tax: recalcResult.tax || 0,
    extreme_pd: recalcResult.pdPerUnit || 0,
    extreme_fullpd: recalcResult.fullPd || 0,
    extendedamount: recalcResult.extendedAmount || 0,
    extreme_createasset: false
  };

  quoteLinesData.insert(storeRecord);

  // If it's a set, add child products
  if (isSet) {
    try {
      const childProducts = await Xrm.WebApi.retrieveMultipleRecords("product", `?$select=productid,description,_pricelevelid_value,_defaultuomid_value,extreme_isparent,name,_extreme_parentproduct_value,productnumber,producttypecode&$filter=_extreme_parentproduct_value eq ${item.productid}`);
      
      if (childProducts.entities.length > 0) {
        let parentBaseAmountSum = 0;
        let parentExtendedAmountSum = 0;
        let parentFullPdSum = 0;
        let parentFullPriceWithDiscountSum = 0;
        let parentDiscountAmountSum = 0;
        let parentSupplierBaseAmountSum = 0;
        let parentTaxSum = 0;

        for (let idx = 0; idx < childProducts.entities.length; idx++) {
          const childProduct = childProducts.entities[idx];
          
          // Get child product info
          const childInfo = await getCachedProductInfo(Xrm, childProduct.productid, "_pricelevelid_value,_defaultuomid_value,name,producttypecode,_extreme_area_value,_extreme_supplier_value,_extreme_technology_value");
          
          const childVatSetting = childInfo.producttypecode ? vatSettingsArray.find(vs => vs.productTypeCode === childInfo.producttypecode && vs.customerTaxPercentage === customerTaxPercentage) : null;
          const childVatSettingId = childVatSetting ? childVatSetting.id : null;
          const childVatGroupId = childVatSetting ? childVatSetting.idVatGroup : null;
          const childTax = childVatSetting ? childVatSetting.vat : 0;

          let childSupplierPPU = 0;
          let childPriceListPPU = null;
          let childPriceListCurrency = null;
          let childPriceListMargin = defaultMargin;

          if (childInfo._pricelevelid_value) {
            try {
              const childPriceListInfo = await Xrm.WebApi.retrieveMultipleRecords("productpricelevel", `?$select=amount,_transactioncurrencyid_value&$filter=(_pricelevelid_value eq ${childInfo._pricelevelid_value} and _productid_value eq ${childProduct.productid})&$expand=pricelevelid($select=extreme_defaultsalesmargin)`);
              
              if (childPriceListInfo.entities.length > 0) {
                childPriceListPPU = childPriceListInfo.entities[0].amount;
                childPriceListMargin = childPriceListInfo.entities[0].pricelevelid?.extreme_defaultsalesmargin ?? defaultMargin;
                
                const childCurrencyId = childPriceListInfo.entities[0]._transactioncurrencyid_value;
                const childCurrencyInfo = currenciesArray.find(c => c.transactioncurrencyid === childCurrencyId);
                childPriceListCurrency = childCurrencyInfo?.currencysymbol;

                if (quoteCurrencySymbol !== childPriceListCurrency && childPriceListCurrency) {
                  const childCurrencyRate = childCurrencyInfo?.isocurrencycode ? ($(`#${childCurrencyInfo.isocurrencycode}`).val() || 1) : 1;
                  childSupplierPPU = childPriceListPPU * childCurrencyRate;
                } else {
                  childSupplierPPU = childPriceListPPU;
                }
              }
            } catch (e) {
              console.warn('Child price list lookup failed:', e);
            }
          }

          let childRecalcResult = { quantity: 1, supplierBaseAmount: 0, pricePerUnit: 0, baseAmount: 0, fullPriceWithDiscount: 0, customDiscountAmount: 0, tax: 0, extendedAmount: 0, pdPerUnit: 0, fullPd: 0 };
          
          if (childSupplierPPU > 0) {
            childRecalcResult = recalculateAmounts({
              quantity: 1,
              supplierPricePerUnit: childSupplierPPU,
              supplierDiscount: 0,
              margin: childPriceListMargin,
              discount: discountInputVal,
              TaxPercent: childTax
            });
          }

          // Create child record
          const childRecord = {};
          childRecord["quoteid@odata.bind"] = `/quotes(${quoteIdForm})`;
          childRecord["productid@odata.bind"] = `/products(${childProduct.productid})`;
          childRecord["extreme_ParentQuoteLine@odata.bind"] = `/quotedetails(${newQuoteDetailId})`;
          childRecord.extreme_customproductname = childProduct.name;
          childRecord.ispriceoverridden = true;
          childRecord.extreme_isparentitem = false;
          childRecord.sequencenumber = parseInt((quoteLinesData._array.filter(i => i.extreme_parentquoteline === null).length) + "00") + (idx + 1);

          if (childInfo._defaultuomid_value) childRecord["uomid@odata.bind"] = `/uoms(${childInfo._defaultuomid_value})`;
          if (childProduct.description) childRecord.extreme_productdescription = childProduct.description;
          if (childInfo.producttypecode) childRecord.extreme_producttype = childInfo.producttypecode;
          if (childVatSettingId) childRecord["extreme_VATSetting@odata.bind"] = `/extreme_vatsettings(${childVatSettingId})`;
          if (childVatGroupId) childRecord["extreme_VATGroup@odata.bind"] = `/extreme_vatgroups(${childVatGroupId})`;
          if (childInfo._extreme_area_value) childRecord["extreme_Area@odata.bind"] = `/extreme_areas(${childInfo._extreme_area_value})`;
          if (childInfo._extreme_technology_value) childRecord["extreme_Technology@odata.bind"] = `/extreme_technologies(${childInfo._extreme_technology_value})`;
          if (childInfo._extreme_supplier_value) childRecord["extreme_VendorSupplier@odata.bind"] = `/accounts(${childInfo._extreme_supplier_value})`;
          if (childInfo._pricelevelid_value) childRecord["extreme_pricelist@odata.bind"] = `/pricelevels(${childInfo._pricelevelid_value})`;
          if (childPriceListPPU) childRecord.extreme_pricelistpriceperunit = childPriceListPPU;
          if (childPriceListCurrency) childRecord.extreme_pricelistcurrency = childPriceListCurrency;

          childRecord.quantity = 1;
          childRecord.extreme_margin = childPriceListMargin;
          childRecord.extreme_discount = discountInputVal;
          childRecord.extreme_supplierdiscount = 0;
          if (childSupplierPPU) childRecord.extreme_supplierpriceperunit = Number(parseFloat(childSupplierPPU).toFixed(4));
          if (childRecalcResult.supplierBaseAmount) childRecord.extreme_supplierbaseamount = Number(parseFloat(childRecalcResult.supplierBaseAmount).toFixed(4));
          if (childRecalcResult.pricePerUnit) childRecord.priceperunit = Number(parseFloat(childRecalcResult.pricePerUnit).toFixed(4));
          if (childRecalcResult.baseAmount) childRecord.baseamount = Number(parseFloat(childRecalcResult.baseAmount).toFixed(4));
          if (childRecalcResult.fullPriceWithDiscount) childRecord.extreme_fullpricewithdiscount = childRecalcResult.fullPriceWithDiscount;
          if (childRecalcResult.customDiscountAmount) childRecord.manualdiscountamount = Number(parseFloat(childRecalcResult.customDiscountAmount).toFixed(4));
          if (childRecalcResult.tax) childRecord.tax = Number(parseFloat(childRecalcResult.tax).toFixed(4));
          if (childTax) childRecord.extreme_tax = childTax;
          if (childRecalcResult.extendedAmount) childRecord.extendedamount = Number(parseFloat(childRecalcResult.extendedAmount).toFixed(4));
          if (childRecalcResult.pdPerUnit) childRecord.extreme_pd = childRecalcResult.pdPerUnit;
          if (childRecalcResult.fullPd) childRecord.extreme_fullpd = childRecalcResult.fullPd;

          const childCreateResult = await Xrm.WebApi.createRecord("quotedetail", childRecord);

          // Add child to store
          const childStoreRecord = {
            quotedetailid: childCreateResult.id,
            productid: childProduct.productid,
            productnumber: childProduct.productnumber,
            extreme_customproductname: childProduct.name,
            extreme_productdescription: childProduct.description || '',
            uomid: childInfo._defaultuomid_value,
            quantity: 1,
            extreme_isparentitem: false,
            extreme_parentquoteline: newQuoteDetailId,
            sequencenumber: childRecord.sequencenumber,
            extreme_area: childInfo._extreme_area_value,
            extreme_technology: childInfo._extreme_technology_value,
            extreme_vendorsupplier: childInfo._extreme_supplier_value,
            extreme_producttype: childInfo.producttypecode,
            extreme_vatsetting: childVatSettingId,
            extreme_tax: childTax,
            extreme_pricelist: childInfo._pricelevelid_value,
            extreme_pricelistpriceperunit: childPriceListPPU || 0,
            extreme_pricelistcurrency: childPriceListCurrency || '',
            extreme_supplierpriceperunit: childSupplierPPU || 0,
            extreme_supplierbaseamount: childRecalcResult.supplierBaseAmount || 0,
            extreme_supplierdiscount: 0,
            extreme_margin: childPriceListMargin,
            priceperunit: childRecalcResult.pricePerUnit || 0,
            baseamount: childRecalcResult.baseAmount || 0,
            extreme_discount: discountInputVal,
            manualdiscountamount: childRecalcResult.customDiscountAmount || 0,
            extreme_fullpricewithdiscount: childRecalcResult.fullPriceWithDiscount || 0,
            tax: childRecalcResult.tax || 0,
            extreme_pd: childRecalcResult.pdPerUnit || 0,
            extreme_fullpd: childRecalcResult.fullPd || 0,
            extendedamount: childRecalcResult.extendedAmount || 0,
            extreme_createasset: false
          };

          quoteLinesData.insert(childStoreRecord);

          // Sum up for parent
          parentBaseAmountSum += childRecalcResult.baseAmount || 0;
          parentExtendedAmountSum += childRecalcResult.extendedAmount || 0;
          parentFullPdSum += childRecalcResult.fullPd || 0;
          parentFullPriceWithDiscountSum += childRecalcResult.fullPriceWithDiscount || 0;
          parentDiscountAmountSum += childRecalcResult.customDiscountAmount || 0;
          parentSupplierBaseAmountSum += childRecalcResult.supplierBaseAmount || 0;
          parentTaxSum += childRecalcResult.tax || 0;
        }

        // Update parent with sums
        quoteLinesData.update(newQuoteDetailId, {
          baseamount: parentBaseAmountSum,
          extendedamount: parentExtendedAmountSum,
          extreme_fullpd: parentFullPdSum,
          extreme_fullpricewithdiscount: parentFullPriceWithDiscountSum,
          manualdiscountamount: parentDiscountAmountSum,
          extreme_supplierbaseamount: parentSupplierBaseAmountSum,
          tax: parentTaxSum
        });
      }
    } catch (error) {
      console.error('Error adding child products:', error);
    }
  }
}

// Helper function to get full currency name from code
function getCurrencyFullName(currencyCode) {
  const currencyNames = {
    'EUR': 'Euro',
    'USD': 'US Dollar',
    'CHF': 'Swiss Franc',
    'RSD': 'Serbian Dinar',
    'MKD': 'Macedonian Denar',
    'GBP': 'British Pound'
  };
  return currencyNames[currencyCode] || currencyCode;
}