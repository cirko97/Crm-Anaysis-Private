let caseAssetsArray = [];
let usersArray = [];
let timeEntryTypesArray = [];
let preventiveCycleTypesArray = [];
let newCreateId;
let isEditable = true;
let heightAuto = true;
let caseImportInfo = null;
let isImportingFromQuote = false;
let selectedDescriptionItem = null;

// Custom popup functions for description and solution
function createCustomPopup(title, initialValue, fieldName, rowData, dataGrid, caseAssetsData) {
  const parentDoc = parent.window.document;
  
  // Create overlay
  const overlay = parentDoc.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // Create popup container
  const popupContainer = parentDoc.createElement('div');
  popupContainer.style.cssText = `
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: auto;
    min-width: 400px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;
  `;
  
  // Create header
  const header = parentDoc.createElement('div');
  header.style.cssText = `
    background: #0078d4;
    color: white;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 16px;
  `;
  header.innerHTML = `
    <span>${title}</span>
    <button id="closeBtn" style="
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
    ">×</button>
  `;
  
  // Create content area
  const content = parentDoc.createElement('div');
  content.style.cssText = `
    padding: 20px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  `;
  
  // Create textarea
  const textarea = parentDoc.createElement('textarea');
  const maxWidth = Math.floor(parentDoc.documentElement.clientWidth * 0.9);
  const maxHeight = Math.floor(parentDoc.documentElement.clientHeight * 0.9);
  
  textarea.style.cssText = `
    width: 100%;
    min-width: 300px;
    max-width: ${maxWidth - 80}px;
    min-height: 120px;
    max-height: ${maxHeight - 200}px;
    padding: 12px;
    border: 2px solid #e1e5e9;
    border-radius: 4px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    resize: both;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s ease;
  `;
  textarea.value = initialValue || '';
  textarea.placeholder = `Enter ${title.toLowerCase()}...`;
  
  // Add focus styles
  textarea.addEventListener('focus', () => {
    textarea.style.borderColor = '#0078d4';
  });
  textarea.addEventListener('blur', () => {
    textarea.style.borderColor = '#e1e5e9';
  });
  
  // Add resize listener to adjust popup container
  const adjustPopupSize = () => {
    const textareaRect = textarea.getBoundingClientRect();
    const headerHeight = header.offsetHeight;
    const buttonsHeight = 80; // Estimate for buttons and padding
    const totalWidth = Math.max(400, textareaRect.width + 40); // 40px for padding
    const totalHeight = headerHeight + textareaRect.height + buttonsHeight + 40; // 40px for padding
    
    popupContainer.style.width = `${Math.min(totalWidth, parentDoc.documentElement.clientWidth * 0.9)}px`;
    popupContainer.style.height = `${Math.min(totalHeight, parentDoc.documentElement.clientHeight * 0.9)}px`;
  };
  
  // Listen for textarea resize
  let resizeObserver;
  if ('ResizeObserver' in parentDoc.defaultView) {
    resizeObserver = new parentDoc.defaultView.ResizeObserver(adjustPopupSize);
    resizeObserver.observe(textarea);
  }
  
  // Create buttons container
  const buttonsContainer = parentDoc.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
    flex-shrink: 0;
  `;
  
  // Create Save button
  const saveBtn = parentDoc.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.disabled = !isEditable;
  saveBtn.style.cssText = `
    background: ${isEditable ? '#0078d4' : '#ccc'};
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: ${isEditable ? 'pointer' : 'not-allowed'};
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s ease;
  `;
  
  if (isEditable) {
    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.background = '#106ebe';
    });
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.background = '#0078d4';
    });
  }
  
  // Create Cancel button
  const cancelBtn = parentDoc.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    background: transparent;
    color: #323130;
    border: 1px solid #8a8886;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  `;
  
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#f3f2f1';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = 'transparent';
  });
  
  // Assemble popup
  content.appendChild(textarea);
  buttonsContainer.appendChild(cancelBtn);
  buttonsContainer.appendChild(saveBtn);
  content.appendChild(buttonsContainer);
  
  popupContainer.appendChild(header);
  popupContainer.appendChild(content);
  overlay.appendChild(popupContainer);
  
  // Add event listeners
  const closePopup = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    parentDoc.body.removeChild(overlay);
  };
  
  header.querySelector('#closeBtn').addEventListener('click', closePopup);
  cancelBtn.addEventListener('click', closePopup);
  
  // Save functionality
  saveBtn.addEventListener('click', async () => {
    if (!isEditable) return;
    
    const trimmedValue = textarea.value.trim();
    
    try {
      const updateRecord = {};
      updateRecord[`extreme_${fieldName}`] = trimmedValue;
      
      await Xrm.WebApi.updateRecord("extreme_caseasset", rowData.extreme_caseassetid, updateRecord);
      
      const updateData = {};
      updateData[`extreme_${fieldName}`] = trimmedValue;
      caseAssetsData.update(rowData.extreme_caseassetid, updateData);
      dataGrid.refresh();
      
      closePopup();
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error saving data. Please try again.');
    }
  });
  
  // Prevent closing on overlay click - removed this functionality
  
  // Close on Escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closePopup();
      parentDoc.removeEventListener('keydown', handleKeyDown);
    }
  };
  parentDoc.addEventListener('keydown', handleKeyDown);
  
  // Add to parent document and focus textarea
  parentDoc.body.appendChild(overlay);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    adjustPopupSize(); // Initial size adjustment
  }, 100);
}

// Add hours to Date method
Date.prototype.addMinutes = function (h) {
  this.setTime(this.getTime() + (h * 60 * 60 * 1000));
  return this;
}
// Add minutes to Date method
Date.prototype.addMinutes = function (m) {
  this.setTime(this.getTime() + (m * 60 * 1000));
  return this;
}

async function setClientApiContext(Xrm, formContext) {
  // Optionally set Xrm and formContext as global variables on the page.
  window.Xrm = Xrm;
  window._formContext = formContext;

  if (formContext.getAttribute('extreme_account').getValue() == null) return;

  Xrm.Utility.showProgressIndicator('Loading... Please wait...');

  if (
    formContext.getAttribute("statuscode").getValue() === 1 ||
    formContext.getAttribute("statuscode").getValue() === 934670001
  ) {
    isEditable = true;
  }
  else {
    isEditable = false;
  }

  const preventiveCycleTypes = await Xrm.Utility.getEntityMetadata('extreme_asset', ['extreme_preventiveservicecycle']).then(
    result => result.Attributes._collection.extreme_preventiveservicecycle.OptionSet,
    error => console.log(error)
  );
  preventiveCycleTypesArray = Object.keys(preventiveCycleTypes).map(key => {
    return preventiveCycleTypes[key];
  });

  // console.log('preventiveCycleTypesArray');
  // console.log(preventiveCycleTypesArray);

  const caseIdForm = replaceCurlyBrackets(formContext.data.entity.getId(), "");
  const accountIdForm = replaceCurlyBrackets(formContext.getAttribute('extreme_account').getValue()[0].id, "");
  const userId = replaceCurlyBrackets(Xrm.Utility.getGlobalContext().userSettings.userId, "");

  caseImportInfo = await Xrm.WebApi.retrieveRecord("extreme_case", `${caseIdForm}`, "?$select=extreme_importingfromquote");
  isImportingFromQuote = caseImportInfo.extreme_importingfromquote;


  await getCaseAssets(caseIdForm);
  initDataGrid(caseIdForm, userId);


  // Set title for grid inside header
  const caseAssetsDisplayName = await Xrm.Utility.getEntityMetadata('extreme_caseasset').then(
    result => result._displayName,
    error => console.log(error)
  );
  // console.log('CaseAssets: ', caseAssetsDisplayName);
  // setTimeout(() => {
  //   const toolbarBefore = formContext.getControl("WebResource_caseAssets").getObject().contentWindow.window.document.querySelector('div.dx-toolbar-before');
  //   // console.log('dx toolbar before: ', toolbarBefore);
  //   toolbarBefore.innerHTML = `<span style='font-weight: 500; position: absolute; width: 100px; bottom: 30%; left: 0;'>${caseAssetsDisplayName}</span>`;
  //   // console.log(formContext.data.entity);
  // }, 1000); // Adjust the timeout as needed








  // Data from DV - Xrm Web Api
  async function getCaseAssets(caseId) {

    caseAssetsArray = [];

    await Xrm.WebApi.retrieveMultipleRecords("extreme_caseasset", `?$select=extreme_warranty,extreme_isparent,_extreme_parentcaseasset_value,extreme_caseassetid,extreme_description,extreme_solution&$expand=extreme_Asset($select=extreme_productid,extreme_inventoryno,extreme_preventiveservicecycle,extreme_assetid,extreme_location,extreme_serialnumber,extreme_warrantyend,extreme_warrantyenddatevendor,extreme_warrantystartdate,extreme_assetcode,extreme_lastactivitydate,extreme_name,extreme_serialnumber,extreme_warrantyend,extreme_warrantyenddatevendor)&$filter=_extreme_case_value eq ${caseId}`).then(
      function success(results) {
        // console.log(results);
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          // Columns
          var extreme_caseassetid = result["extreme_caseassetid"]; // Guid

          // Many To One Relationships
          if (result.hasOwnProperty("extreme_Asset") && result["extreme_Asset"] !== null) {
            var extreme_Asset_extreme_assetid = result["extreme_Asset"]["extreme_assetid"]; // Guid
            var extreme_Asset_extreme_assetcode = result["extreme_Asset"]["extreme_assetcode"]; // Text
            var extreme_Asset_extreme_lastactivitydate = result["extreme_Asset"]["extreme_lastactivitydate"]; // Date Time
            var extreme_Asset_extreme_lastactivitydate_formatted = result["extreme_Asset"]["extreme_lastactivitydate@OData.Community.Display.V1.FormattedValue"];
            var extreme_Asset_extreme_name = result["extreme_Asset"]["extreme_name"]; // Text
            var extreme_Asset_extreme_serialnumber = result["extreme_Asset"]["extreme_serialnumber"]; // Text
            var extreme_Asset_extreme_warrantyend = result["extreme_Asset"]["extreme_warrantyend"]; // Date Time
            var extreme_Asset_extreme_warrantyend_formatted = result["extreme_Asset"]["extreme_warrantyend@OData.Community.Display.V1.FormattedValue"];
            var extreme_Asset_extreme_warrantyenddatevendor = result["extreme_Asset"]["extreme_warrantyenddatevendor"]; // Date Time
            var extreme_Asset_extreme_warrantyenddatevendor_formatted = result["extreme_Asset"]["extreme_warrantyenddatevendor@OData.Community.Display.V1.FormattedValue"];
            var extreme_warranty = result["extreme_warranty"]; // Boolean
            var extreme_description = result["extreme_description"]; // Multiline Text
            var extreme_solution = result["extreme_solution"]; // Multiline Text
            var extreme_isparent = result["extreme_isparent"]; // Boolean
            var extreme_parentcaseasset = result["_extreme_parentcaseasset_value"]; // Lookup
            var extreme_Asset_extreme_location = result["extreme_Asset"]["extreme_location"]; // Text
            var extreme_Asset_extreme_warrantystartdate = result["extreme_Asset"]["extreme_warrantystartdate"]; // Date Time
            var extreme_Asset_extreme_warrantystartdate_formatted = result["extreme_Asset"]["extreme_warrantystartdate@OData.Community.Display.V1.FormattedValue"];
            var extreme_Asset_extreme_preventiveservicecycle = result["extreme_Asset"]["extreme_preventiveservicecycle"]; // Choice
            var extreme_Asset_extreme_inventoryno = result["extreme_Asset"]["extreme_inventoryno"]; // Text
            var extreme_Asset_extreme_productid = result["extreme_Asset"]["extreme_productid"]; // Text

            caseAssetsArray.push({
              "extreme_caseassetid": extreme_caseassetid,
              "extreme_assetid": extreme_Asset_extreme_assetid,
              "extreme_name": extreme_Asset_extreme_name,
              "extreme_assetcode": extreme_Asset_extreme_assetcode,
              "extreme_lastactivitydate": extreme_Asset_extreme_lastactivitydate,
              "extreme_serialnumber": extreme_Asset_extreme_serialnumber,
              "extreme_location": extreme_Asset_extreme_location,
              "extreme_warrantystartdate": extreme_Asset_extreme_warrantystartdate,
              "extreme_warrantyend": extreme_Asset_extreme_warrantyend,
              "extreme_warrantyenddatevendor": extreme_Asset_extreme_warrantyenddatevendor,
              "extreme_warranty": extreme_warranty,
              "extreme_description": extreme_description,
              "extreme_solution": extreme_solution,
              "extreme_isparent": extreme_isparent,
              "extreme_parentcaseasset": extreme_parentcaseasset,
              "extreme_preventiveservicecycle": extreme_Asset_extreme_preventiveservicecycle,
              "extreme_inventoryno": extreme_Asset_extreme_inventoryno,
              "extreme_productid": extreme_Asset_extreme_productid
            });
          }

        }

        // console.log('caseAssetsArray');
        // console.log(caseAssetsArray);

      },
      function (error) {
        console.log(error.message);
      }
    );

  }

  // Function to initialize data grid for case lines
  function initDataGrid(caseIdForm, userId) {
    $(() => {
      const now = new Date();

      const caseAssetsData = new DevExpress.data.ArrayStore({
        key: 'extreme_caseassetid',
        data: caseAssetsArray,
      });

      const dataGrid = $('#gridContainer').dxDataGrid({
        dataSource: caseAssetsData,
        filterValue: [
          [
            ["extreme_parentcaseasset", "=", null],
            "and",
            [["extreme_isparent", "=", false], "or", ["extreme_isparent", "=", null]]
          ],
          "or",
          [
            ["extreme_parentcaseasset", "=", null],
            "and",
            ["extreme_isparent", "=", true]
          ],
        ],
        width: "100%",
        wordWrapEnabled: true,
        showColumnLines: true,
        showRowLines: true,
        rowAlternationEnabled: false,
        showBorders: true,
        // headerFilter: {
        //   visible: true,
        //   height: 200
        // },
        paging: {
          pageSize: 5,
        },
        editing: {
          mode: 'cell',
          allowUpdating: isEditable,
          allowAdding: false,
          allowDeleting: false,
          useIcons: true
        },
        // selection: {
        //   mode: 'multiple',
        // },
        allowColumnResizing: true,
        columnResizingMode: "mode",
        columnMinWidth: 10,
        columnAutoWidth: false,
        columnHidingEnabled: false,
        scrolling: {
          mode: "standard",
          scrollByContent: true,
          scrollByThumb: true
        },
        masterDetail: {
          enabled: true,
          async template(container, options) {
            const assetData = options.data;

            container.css('background', '#e5edfe');
            container.css('padding', 0);

            $(`<div id="${assetData.extreme_caseassetid}" class="child-grid">`).css({
              "border-bottom": "1rem solid #b6bdca",
              "border-top": "3px solid #b6bdca",
            }).addClass("internal-grid")
              .dxDataGrid({
                dataSource: caseAssetsData,
                filterValue: [
                  [["extreme_isparent", "=", false], "or", ["extreme_isparent", "=", null]],
                  "and",
                  ["extreme_parentcaseasset", "=", assetData.extreme_caseassetid]
                ],
                showColumnHeaders: false,
                width: "100%",
                wordWrapEnabled: true,
                showColumnLines: true,
                showRowLines: true,
                rowAlternationEnabled: false,
                showBorders: true,
                // headerFilter: {
                //   visible: true,
                //   height: 200
                // },
                paging: {
                  pageSize: 5,
                },
                editing: {
                  mode: 'cell',
                  allowUpdating: isEditable,
                  allowAdding: false,
                  allowDeleting: false,
                  useIcons: true
                },
                // selection: {
                //   mode: 'multiple',
                // },
                allowColumnResizing: true,
                columnResizingMode: "mode",
                columnMinWidth: 10,
                columnAutoWidth: false,
                columnHidingEnabled: false,
                scrolling: {
                  mode: "standard",
                  scrollByContent: true,
                  scrollByThumb: true
                },
                columns: [
                  {
                    dataField: 'extreme_assetcode',
                    caption: 'Code',
                    dataType: 'string',
                    allowEditing: false,
                    width: 115,
                    visible: dataGrid.columnOption('extreme_assetcode', 'visible')
                  },
                  {
                    dataField: 'extreme_name',
                    caption: 'Name',
                    dataType: 'string',
                    width: 130,
                    allowEditing: false,
                    visible: dataGrid.columnOption('extreme_name', 'visible')
                  },
                  {
                    dataField: 'extreme_lastactivitydate',
                    caption: 'Last Activity',
                    dataType: 'datetime',
                    width: 150,
                    pickerType: 'rollers',
                    value: now,
                    inputAttr: { 'aria-label': 'Date and time picker' },
                    format: "dd.MM.yyyy HH:mm",
                    allowEditing: false,
                    visible: dataGrid.columnOption('extreme_lastactivitydate', 'visible')
                  },
                  {
                    dataField: 'extreme_serialnumber',
                    caption: 'S/N',
                    dataType: 'string',
                    width: 130,
                    allowEditing: false,
                    validationRules: [
                      {
                        type: 'custom',
                        message: 'Required',
                        validationCallback(params) {
                          // console.log('VALIDATION PARAMS');
                          // console.log(params);

                          return params.data.extreme_isparent !== true && (params.value === null || params.value.trim() === '') ? false : true;

                        },
                      }
                    ],
                    visible: dataGrid.columnOption('extreme_serialnumber', 'visible')
                  },
                  {
                    dataField: 'extreme_inventoryno',
                    caption: 'Inventory No.',
                    dataType: 'string',
                    width: 130,
                    allowEditing: false,
                    visible: dataGrid.columnOption('extreme_inventoryno', 'visible')
                  },
                  {
                    dataField: 'extreme_location',
                    caption: 'Location',
                    dataType: 'string',
                    width: 150,
                    allowEditing: false,
                    visible: dataGrid.columnOption('extreme_location', 'visible')
                  },
                  {
                    dataField: 'extreme_warrantystartdate',
                    caption: 'Warranty start',
                    dataType: 'date',
                    width: 150,
                    value: now,
                    inputAttr: { 'aria-label': 'Date and time picker' },
                    format: "dd.MM.yyyy",
                    allowEditing: false,
                    visible: dataGrid.columnOption('extreme_warrantystartdate', 'visible'),
                    editorOptions: {
                      onOpened: function (e) {
                        heightAuto = false;
                        if (heightAuto === false) {
                          const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                          wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                        }
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    // setuj warranty end 1 godinu unapred
                    setCellValue: async function (newData, value, currentRowData) {
                      newData.extreme_warrantystartdate = value;
                      const yearAfter = new Date(value);
                      yearAfter.setFullYear(yearAfter.getFullYear() + 1);
                      newData.extreme_warrantyend = yearAfter;
                    }
                  },
                  {
                    dataField: 'extreme_warrantyend',
                    caption: 'Warranty end',
                    dataType: 'date',
                    width: 150,
                    value: now,
                    inputAttr: { 'aria-label': 'Date and time picker' },
                    format: "dd.MM.yyyy",
                    allowEditing: false,
                    editorOptions: {
                      onOpened: function (e) {
                        heightAuto = false;
                        if (heightAuto === false) {
                          const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                          wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                        }
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    visible: dataGrid.columnOption('extreme_warrantyend', 'visible')
                  },
                  {
                    dataField: 'extreme_warrantyenddatevendor',
                    caption: 'Warranty end (vendor)',
                    dataType: 'date',
                    width: 150,
                    value: now,
                    inputAttr: { 'aria-label': 'Date and time picker' },
                    format: "dd.MM.yyyy",
                    allowEditing: false,
                    editorOptions: {
                      onOpened: function (e) {
                        heightAuto = false;
                        if (heightAuto === false) {
                          const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                          wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                        }
                      },
                      onClosed: function (e) {
                        heightAuto = true;
                      },
                      onFocusOut: function (e) {
                        heightAuto = true;
                      }
                    },
                    visible: dataGrid.columnOption('extreme_warrantyenddatevendor', 'visible')
                  },
                  {
                    dataField: 'extreme_preventiveservicecycle',
                    caption: 'PSC Duration',
                    width: 130,
                    wordWrapEnabled: false,
                    visible: dataGrid.columnOption('extreme_preventiveservicecycle', 'visible')
                  },
                  {
                    dataField: 'extreme_warranty',
                    caption: 'Warranty?',
                    width: 50,
                    dataType: 'boolean',
                    visible: dataGrid.columnOption('extreme_warranty', 'visible')
                  },
                  {
                    dataField: 'extreme_description',
                    caption: 'Description',
                    dataType: 'string',
                    cssClass: 'textarea-fields',
                    width: 300,
                    allowEditing: true,
                    visible: dataGrid.columnOption('extreme_description', 'visible')
                  },
                  {
                    dataField: 'extreme_solution',
                    caption: 'Solution',
                    dataType: 'string',
                    cssClass: 'textarea-fields',
                    // width: 300,
                    allowEditing: true,
                    visible: dataGrid.columnOption('extreme_solution', 'visible')
                  },
                  {
                    dataField: 'extreme_parentcaseasset',
                    caption: 'Parent CA',
                    dataType: 'string',
                    visible: dataGrid.columnOption('extreme_parentcaseasset', 'visible')
                  },
                  {
                    dataField: 'extreme_isparent',
                    caption: 'Is Parent',
                    dataType: 'boolean',
                    visible: dataGrid.columnOption('extreme_isparent', 'visible')
                  },
                  {
                    dataField: 'extreme_productid',
                    caption: 'ID',
                    dataType: 'string',
                    allowEditing: false,
                    visible: dataGrid.columnOption('extreme_productid', 'visible')
                  },
                ],
                onSelectionChanged(data) {
                  dataGrid.option('toolbar.items[1].options.disabled', !data.selectedRowsData.length);
                },
                onRowPrepared: async (e) => {
                  // console.log('ROW PREPARED');
                  // console.log(e);

                  // Check calssify
                  if (typeof (e.isNewRow) === 'undefined' && e.rowType === 'data' && e.data.extreme_isparent === false && (
                    (e.data.extreme_serialnumber === null || e.data.extreme_serialnumber === undefined) ||
                    (e.data.extreme_inventoryno === null || e.data.extreme_inventoryno === undefined) ||
                    // (e.data.extreme_location === null || e.data.extreme_location === undefined) ||
                    (e.data.extreme_warrantystartdate === null || e.data.extreme_warrantystartdate === undefined) ||
                    (e.data.extreme_warrantyend === null || e.data.extreme_warrantyend === undefined) ||
                    (e.data.extreme_warrantyenddatevendor === null || e.data.extreme_warrantyenddatevendor === undefined) ||
                    (e.data.extreme_preventiveservicecycle === null || e.data.extreme_preventiveservicecycle === undefined)
                  )) {
                    // promeniti bg color za classify
                    e.rowElement[0].style.backgroundColor = "#fce3c2";
                  }
                  else {
                    e.rowElement[0].style.backgroundColor = "#fafafa";
                  }

                },
                onCellDblClick(e) {
                  // console.log('CELL DOUBLE CLICK');
                  // console.log(e);

                  if (e.column.dataField === "extreme_productid" || e.column.dataField === "extreme_name") {
                    // Create an anchor element
                    const globalContext = Xrm.Utility.getGlobalContext();
                    globalContext.getCurrentAppUrl();

                    // console.log('CLIENT URL');
                    // console.log(globalContext.getCurrentAppUrl());

                    const link = document.createElement('a');
                    link.href = `${globalContext.getCurrentAppUrl()}&pagetype=entityrecord&etn=extreme_asset&id=${e.data.extreme_assetid}`;
                    link.target = "_blank";

                    // Append the anchor to the body (required for Firefox)
                    document.body.appendChild(link);

                    // Trigger a click event on the anchor
                    link.click();

                    // Remove the anchor from the body
                    document.body.removeChild(link);
                  }

                },
                onEditorPreparing: async (e) => {
                  // console.log('Editor Preparing');
                  // console.log(e);

                  if (e.dataField === "extreme_description" || e.dataField === "extreme_solution") {
                    e.editorName = "dxTextArea";
                    e.editorOptions.autoResizeEnabled = true;
                  }
                },
                onEditingStart: (e) => {
                  // console.log('EditingStart');
                  // console.log(e);
                },
                onInitNewRow: async (e) => {
                  // console.log('InitNewRow');
                  // console.log(e);
                  // e.data.owner = usersArray.find(item => item.id === userId.toLowerCase()).id;
                  // e.data.extreme_return = false;
                  // e.data.scheduledstart = new Date().toISOString();
                  // e.data.scheduledend = new Date().toISOString();
                  // e.data.extreme_type = timeEntryTypesArray.find(item => item.value == 424000001).value;
                  // if (oneAssetId !== undefined && oneAssetId !== 'none') e.data.extreme_asset = assetsArray.find(item => item.id === oneAssetId).id
                },
                onRowInserting: async (e) => {

                  // console.log('RowInserting');
                  // console.log(e);

                  // Xrm.Utility.showProgressIndicator('Loading... Please wait...');

                  // newCreateId = '';
                  // var record = {};
                  // record["regardingobjectid_extreme_case_extreme_timeentry@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
                  // record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${e.data.owner})`; // Owner
                  // record.scheduledstart = e.data.scheduledstart; // Date Time
                  // record.scheduledend = e.data.scheduledend; // Date Time
                  // record.extreme_type = e.data.extreme_type; // Choice
                  // record.scheduleddurationminutes = e.data.scheduleddurationminutes; // Decimal
                  // record.extreme_comuteinkm = e.data.extreme_comuteinkm; // Decimal
                  // record.extreme_return = e.data.extreme_return; // Boolean
                  // record.extreme_expences = e.data.extreme_expences; // Decimal

                  // await Xrm.WebApi.createRecord("extreme_timeentry", record).then(
                  //   function success(result) {
                  //     var newId = result.id;
                  //     newCreateId = newId;
                  //     // console.log('NEW CREATED ID: ' + newCreateId);
                  //   },
                  //   function (error) {
                  //     console.log(error.message);
                  //   }
                  // );
                },
                onRowInserted: async (e) => {

                  // setTimeout(async () => {

                  //   // console.log('RowInserted');
                  //   // console.log(e);

                  //   if (timeEntriesData._array.length > 0) {
                  //     // console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
                  //     timeEntriesData._array[timeEntriesData._array.length - 1].activityid = newCreateId;
                  //     // console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
                  //     await getTimeEntries(caseIdForm);
                  //     dataGrid.refresh();
                  //   } else {
                  //     // console.log('timeEntriesData._array is empty');
                  //   }

                  //   Xrm.Utility.closeProgressIndicator();

                  // }, 1000);


                },
                onRowUpdating: async (e) => {
                  // console.log('RowUpdating');
                  // console.log(e);

                  var record = {};
                  if (typeof (e.newData.extreme_warranty) === 'boolean') record.extreme_warranty = e.newData.extreme_warranty;
                  if (e.newData.extreme_description) record.extreme_description = e.newData.extreme_description; // Multiline Text
                  if (e.newData.extreme_solution) record.extreme_solution = e.newData.extreme_solution; // Multiline Text

                  await Xrm.WebApi.updateRecord("extreme_caseasset", `${e.key}`, record).then(
                    async function success(result) {
                      var updatedId = result.id;
                      // console.log(updatedId);
                      await getCaseAssets();
                      dataGrid.refresh();
                    },
                    function (error) {
                      console.log(error.message);
                    }
                  );

                  // var record = {};
                  // if (e.newData.owner) record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${e.newData.owner})`; // Owner
                  // if (e.newData.scheduledstart) record.scheduledstart = e.newData.scheduledstart; // Date Time
                  // if (e.newData.scheduledend) record.scheduledend = e.newData.scheduledend; // Date Time
                  // if (e.newData.extreme_type) record.extreme_type = e.newData.extreme_type; // Choice
                  // if (e.newData.scheduleddurationminutes) record.scheduleddurationminutes = e.newData.scheduleddurationminutes; // Decimal
                  // if (e.newData.extreme_comuteinkm) record.extreme_comuteinkm = e.newData.extreme_comuteinkm; // Decimal
                  // if (typeof e.newData.extreme_return === "boolean") record.extreme_return = e.newData.extreme_return; // Boolean
                  // if (e.newData.extreme_expences) record.extreme_expences = e.newData.extreme_expences; // Decimal

                  // await Xrm.WebApi.updateRecord("extreme_timeentry", `${e.key}`, record).then(
                  //   async function success(result) {
                  //     var updatedId = result.id;
                  //     // console.log(record);
                  //     await getTimeEntries(caseIdForm);
                  //     dataGrid.refresh();
                  //   },
                  //   function (error) {
                  //     console.log(error.message);
                  //   }
                  // );
                },
                onRowUpdated() {
                  // console.log('RowUpdated');
                },
                onRowRemoving: async (e) => {
                  // console.log('RowRemoving');
                  // console.log(e);
                  // Delete case line on another web resource
                  // await formContext.getControl('WebResource_new_2').getObject().contentWindow.window.createTimeEntry(e.data.extreme_caseline);
                  // Refresh grid for case lines
                  // await formContext.getControl('WebResource_new_2').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
                  await Xrm.WebApi.deleteRecord("extreme_caseasset", `${e.key}`).then(
                    function success(result) {
                      // console.log(result);
                    },
                    function (error) {
                      console.log(error.message);
                    }
                  );
                },
                onRowRemoved: (e) => {
                  // console.log('RowRemoved');
                  // console.log(e);
                },
                onSaving() {
                  // console.log('Saving');
                },
                onSaved() {
                  // console.log('Saved');
                },
                onEditCanceling() {
                  // console.log('EditCanceling');
                },
                onEditCanceled() {
                  // console.log('EditCanceled');
                },
                onContentReady(e) {
                  e.component.columnOption("command:select", "visibleIndex", 999);
                }
              }).appendTo(container);
          },
        },
        columns: [
          {
            dataField: 'extreme_assetcode',
            caption: 'Code',
            dataType: 'string',
            width: 115,
            allowEditing: false
          },
          {
            dataField: 'extreme_name',
            caption: 'Name',
            dataType: 'string',
            width: 130,
            allowEditing: false
          },
          {
            dataField: 'extreme_lastactivitydate',
            caption: 'Last Activity',
            dataType: 'datetime',
            width: 150,
            pickerType: 'rollers',
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy HH:mm",
            allowEditing: false,
            visible: false
          },
          {
            dataField: 'extreme_serialnumber',
            caption: 'S/N',
            dataType: 'string',
            width: 130,
            allowEditing: false,
            validationRules: [
              {
                type: 'custom',
                message: 'Required',
                validationCallback(params) {
                  // console.log('VALIDATION PARAMS');
                  // console.log(params);

                  return params.data.extreme_isparent !== true && (params.value === null || params.value.trim() === '') ? false : true;

                },
              }
            ]
          },
          {
            dataField: 'extreme_inventoryno',
            caption: 'Inventory No.',
            dataType: 'string',
            width: 130,
            allowEditing: false,
            // validationRules: [
            //   {
            //     type: 'custom',
            //     message: 'Required',
            //     validationCallback(params) {
            //       // console.log('VALIDATION PARAMS');
            //       // console.log(params);

            //       if (params.data.extreme_isparent === true && (params.value === null || params.value.trim() === '')) {
            //         return true;
            //       }
            //       else if (params.value === null || params.value.trim() === '') {
            //         return false;
            //       }
            //       else {
            //         return true;
            //       }
            //       // else if (params.data.extreme_isparent === false && params.extreme_parentcaseasset) {
            //       //   return true;
            //       // }

            //     },
            //   }
            // ]
          },
          {
            dataField: 'extreme_location',
            caption: 'Location',
            dataType: 'string',
            width: 150,
            allowEditing: false,
            visible: false
          },
          {
            dataField: 'extreme_warrantystartdate',
            caption: 'Warranty start',
            dataType: 'date',
            width: 150,
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy",
            allowEditing: false,
            visible: false,
            editorOptions: {
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                }
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            // setuj warranty end 1 godinu unapred
            setCellValue: async function (newData, value, currentRowData) {
              newData.extreme_warrantystartdate = value;
              const yearAfter = new Date(value);
              yearAfter.setFullYear(yearAfter.getFullYear() + 1);
              newData.extreme_warrantyend = yearAfter;
            }
          },
          {
            dataField: 'extreme_warrantyend',
            caption: 'Warranty end',
            dataType: 'date',
            width: 150,
            value: now,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy",
            allowEditing: false,
            editorOptions: {
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                }
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            visible: false
          },
          {
            dataField: 'extreme_warrantyenddatevendor',
            caption: 'Warranty end (vendor)',
            dataType: 'date',
            value: now,
            width: 150,
            inputAttr: { 'aria-label': 'Date and time picker' },
            format: "dd.MM.yyyy",
            allowEditing: false,
            editorOptions: {
              onOpened: function (e) {
                heightAuto = false;
                if (heightAuto === false) {
                  const iframeCorrentHeight = wrControl.getObject().offsetHeight;
                  wrControl.getObject().style.minHeight = `${iframeCorrentHeight + 320}px`;
                }
              },
              onClosed: function (e) {
                heightAuto = true;
              },
              onFocusOut: function (e) {
                heightAuto = true;
              }
            },
            visible: false
          },
          {
            dataField: 'extreme_preventiveservicecycle',
            caption: 'PSC Duration',
            width: 130,
            wordWrapEnabled: false,
            lookup: {
              dataSource(options) {
                return {
                  store: {
                    type: "array",
                    data: preventiveCycleTypesArray,
                    key: "value"
                  },
                  paginate: true,
                  pageSize: 20,
                  postProcess: function (data) {
                    // data.unshift({ name: "Price list", amount: "Price", disabled: true });
                    return data;
                  }
                }
              },
              displayExpr: 'text',
              valueExpr: 'value'
            },
            editorOptions: {
              acceptCustomValue: false,
              // popupWidth: 600,
              searchEnabled: true,
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
            visible: false
          },
          {
            dataField: 'extreme_warranty',
            caption: 'Warranty?',
            width: 50,
            dataType: 'boolean'
          },
          {
            dataField: 'extreme_description',
            caption: 'Description',
            dataType: 'string',
            cssClass: 'textarea-fields',
            width: 300,
            allowEditing: false,
          },
          {
            name: 'Edit description',
            type: 'buttons',
            width: 50,
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
                  createCustomPopup(
                    'Description', 
                    e.row.data.extreme_description, 
                    'description', 
                    e.row.data, 
                    dataGrid, 
                    caseAssetsData
                  );
                },
              }
            ],
          },
          {
            dataField: 'extreme_solution',
            caption: 'Solution',
            dataType: 'string',
            cssClass: 'textarea-fields',
            // width: 250,
            allowEditing: false
          },
          {
            name: 'Edit solution',
            type: 'buttons',
            width: 50,
            buttons: [
              {
                hint: 'Solution',
                icon: 'edit',
                visible(e) {
                  return true;
                },
                disabled(e) {
                  return false;
                },
                onClick(e) {
                  createCustomPopup(
                    'Solution', 
                    e.row.data.extreme_solution, 
                    'solution', 
                    e.row.data, 
                    dataGrid, 
                    caseAssetsData
                  );
                },
              }
            ],
          },
          {
            dataField: 'extreme_parentcaseasset',
            caption: 'Parent CA',
            dataType: 'string',
            visible: false
          },
          {
            dataField: 'extreme_isparent',
            caption: 'Is Parent',
            dataType: 'boolean',
            visible: false
          },
          {
            dataField: 'extreme_productid',
            caption: 'ID',
            dataType: 'string',
            allowEditing: false,
            visible: false
          }
        ],
        toolbar: {
          items: [
            {
              location: 'before',
              template() {
                return $('<div>')
                  .addClass('grid-title')
                  .text(`${caseAssetsDisplayName}`)
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
                text: 'Normal',
                width: 'auto',
                elementAttr: {
                  id: "normalBtn",
                },
                disabled: true,
                onClick(e) {
                  // console.log(e);
                  // console.log(dataGrid);
                  // reset visible for all columns - classify
                  // console.log('ALL COLUMNS');
                  // console.log(dataGrid.option('columns'));
                  dataGrid.option('columnAutoWidth', false);
                  dataGrid.option('columns').forEach(col => {
                    if (
                      // col.dataField == "extreme_productid" ||
                      col.dataField == "extreme_name" ||
                      col.dataField == "extreme_assetcode" ||
                      // col.dataField == "extreme_lastactivitydate" ||
                      col.dataField == "extreme_serialnumber" ||
                      col.dataField == "extreme_inventoryno" ||
                      // col.dataField == "extreme_warrantyend" ||
                      // col.dataField == "extreme_warrantyenddatevendor" ||
                      col.dataField == "extreme_warranty" ||
                      col.dataField == "extreme_description" ||
                      col.dataField == "extreme_solution"
                    ) {
                      dataGrid.columnOption(col.dataField, 'visible', true);
                      if (col.dataField == "extreme_description" || col.dataField == "extreme_solution" || col.dataField == "extreme_warranty") {
                        dataGrid.columnOption(col.dataField, 'allowEditing', true);
                      }
                      else {
                        dataGrid.columnOption(col.dataField, 'allowEditing', false);
                      }
                    }
                    else {
                      dataGrid.columnOption(col.dataField, 'visible', false);
                      dataGrid.columnOption(col.dataField, 'allowEditing', false);
                    }
                  });

                  dataGrid.option('filterValue', [
                    [
                      ["extreme_parentcaseasset", "=", null],
                      "and",
                      [["extreme_isparent", "=", false], "or", ["extreme_isparent", "=", null]]
                    ],
                    "or",
                    [
                      ["extreme_parentcaseasset", "=", null],
                      "and",
                      ["extreme_isparent", "=", true]
                    ],
                  ]);

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
                  // reset visible for all columns - classify
                  // console.log('ALL COLUMNS');
                  // console.log(dataGrid.option('columns'));
                  dataGrid.option('columnAutoWidth', true);
                  dataGrid.option('columns').forEach(col => {
                    if (
                      // col.dataField == "extreme_productid" ||
                      col.dataField == "extreme_name" ||
                      col.dataField == "extreme_serialnumber" ||
                      col.dataField == "extreme_inventoryno" ||
                      col.dataField == "extreme_location" ||
                      col.dataField == "extreme_warrantystartdate" ||
                      col.dataField == "extreme_warrantyend" ||
                      col.dataField == "extreme_warrantyenddatevendor" ||
                      col.dataField == "extreme_preventiveservicecycle"
                    ) {
                      dataGrid.columnOption(col.dataField, 'visible', true);
                      if (col.dataField !== "extreme_name" && col.dataField !== "extreme_productid") {
                        dataGrid.columnOption(col.dataField, 'allowEditing', true);
                      }
                      else {
                        dataGrid.columnOption(col.dataField, 'allowEditing', false);
                      };
                    }
                    else {
                      dataGrid.columnOption(col.dataField, 'visible', false);
                      dataGrid.columnOption(col.dataField, 'allowEditing', false);
                    }
                  });

                  caseAssetsData._array.filter(item => item.extreme_isparent === true).forEach(elm => {
                    dataGrid.collapseRow(elm.extreme_caseassetid);
                  });

                  dataGrid.option('filterValue', null);

                  $('#normalBtn').dxButton('instance').option('disabled', false);
                  e.component.option('disabled', true);
                },
              },
            }
          ],
        },
        onSelectionChanged(data) {
          dataGrid.option('toolbar.items[1].options.disabled', !data.selectedRowsData.length);
        },
        onRowPrepared: async (e) => {
          // console.log('ROW PREPARED');
          // console.log(e);

          if (e.rowType === 'header') {
            e.cells[6].cellElement[0].colSpan = 2;
            e.cells[7].cellElement[0].style.display = "none";
            e.cells[8].cellElement[0].colSpan = 2;
            e.cells[9].cellElement[0].style.display = "none";
          }

          if (e.rowType === 'data' && !e.data.extreme_isparent && e.data.extreme_caseassetid) {
            // // console.log('REMOVED EXPAND FOR ', e.data.extreme_caseassetid);
            // // console.log(dataGrid.hasEditData());
            // // console.log(e.cells[1].cellElement[0]);
            e.cells[0].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
            e.cells[0].cellElement[0].classList.remove('dx-datagrid-expand');
            // e.cells[1].cellElement[0].style.display = "none";
            // e.cells[2]?.cellElement?.[0].setAttribute('colspan', '2');
          }
          else if (e.rowType === 'data' && $('#classifyBtn').dxButton('instance').option('disabled') === true) {
            e.cells[0].cellElement[0].childNodes[0].classList.remove('dx-datagrid-group-closed');
            e.cells[0].cellElement[0].classList.remove('dx-datagrid-expand');
          }


          // Check calssify
          if (typeof (e.isNewRow) === 'undefined' && e.rowType === 'data' && e.data.extreme_isparent === false && (
            (e.data.extreme_serialnumber === null || e.data.extreme_serialnumber === undefined) ||
            (e.data.extreme_inventoryno === null || e.data.extreme_inventoryno === undefined) ||
            // (e.data.extreme_location === null || e.data.extreme_location === undefined) ||
            (e.data.extreme_warrantystartdate === null || e.data.extreme_warrantystartdate === undefined) ||
            (e.data.extreme_warrantyend === null || e.data.extreme_warrantyend === undefined) ||
            (e.data.extreme_warrantyenddatevendor === null || e.data.extreme_warrantyenddatevendor === undefined) ||
            (e.data.extreme_preventiveservicecycle === null || e.data.extreme_preventiveservicecycle === undefined)
          )) {
            // promeniti bg color za classify
            e.rowElement[0].style.backgroundColor = "#fce3c2";
          }
          else if (typeof (e.isNewRow) === 'undefined' && e.rowType === 'data' && e.data.extreme_isparent === true && (
            // (e.data.extreme_serialnumber === null || e.data.extreme_serialnumber === undefined) ||
            (e.data.extreme_inventoryno === null || e.data.extreme_inventoryno === undefined) ||
            // (e.data.extreme_location === null || e.data.extreme_location === undefined) ||
            (e.data.extreme_warrantystartdate === null || e.data.extreme_warrantystartdate === undefined) ||
            (e.data.extreme_warrantyend === null || e.data.extreme_warrantyend === undefined) ||
            (e.data.extreme_warrantyenddatevendor === null || e.data.extreme_warrantyenddatevendor === undefined) ||
            (e.data.extreme_preventiveservicecycle === null || e.data.extreme_preventiveservicecycle === undefined)
          )) {
            // promeniti bg color za classify
            e.rowElement[0].style.backgroundColor = "#fce3c2";
          }
          else if (typeof (e.isNewRow) === 'undefined' && e.rowType === "data" && e.data.extreme_isparent === true && caseAssetsData._array.find(item =>
            item.extreme_parentcaseasset === e.data.extreme_caseassetid &&
            ((item.extreme_serialnumber === null || item.extreme_serialnumber === undefined) ||
              (item.extreme_inventoryno === null || item.extreme_inventoryno === undefined) ||
              // (item.extreme_location === null || item.extreme_location === undefined) ||
              (item.extreme_warrantystartdate === null || item.extreme_warrantystartdate === undefined) ||
              (item.extreme_warrantyend === null || item.extreme_warrantyend === undefined) ||
              (item.extreme_warrantyenddatevendor === null || item.extreme_warrantyenddatevendor === undefined) ||
              (item.extreme_preventiveservicecycle === null || item.extreme_preventiveservicecycle === undefined))
          )) {
            // promeniti bg color za classify
            e.cells[0].cellElement[0].style.backgroundColor = "#fce3c2";
          }
          else {
            e.rowElement[0].style.backgroundColor = "#fff";
          }

        },
        onCellDblClick(e) {
          // console.log('CELL DOUBLE CLICK');
          // console.log(e);

          if (e.column.dataField === "extreme_productid" || e.column.dataField === "extreme_name") {
            // Create an anchor element
            const globalContext = Xrm.Utility.getGlobalContext();
            globalContext.getCurrentAppUrl();

            // console.log('CLIENT URL');
            // console.log(globalContext.getCurrentAppUrl());

            const link = document.createElement('a');
            link.href = `${globalContext.getCurrentAppUrl()}&pagetype=entityrecord&etn=extreme_asset&id=${e.data.extreme_assetid}`;
            link.target = "_blank";

            // Append the anchor to the body (required for Firefox)
            document.body.appendChild(link);

            // Trigger a click event on the anchor
            link.click();

            // Remove the anchor from the body
            document.body.removeChild(link);
          }

        },
        onEditorPreparing: async (e) => {
          // console.log('Editor Preparing');
          // console.log(e);

          if (e.dataField === "extreme_description" || e.dataField === "extreme_solution") {
            e.editorName = "dxTextArea";
            e.editorOptions.autoResizeEnabled = true;
          }
        },
        onEditingStart: (e) => {
          // console.log('EditingStart');
          // console.log(e);
        },
        onInitNewRow: async (e) => {
          // console.log('InitNewRow');
          // console.log(e);
          // e.data.owner = usersArray.find(item => item.id === userId.toLowerCase()).id;
          // e.data.extreme_return = false;
          // e.data.scheduledstart = new Date().toISOString();
          // e.data.scheduledend = new Date().toISOString();
          // e.data.extreme_type = timeEntryTypesArray.find(item => item.value == 424000001).value;
          // if (oneAssetId !== undefined && oneAssetId !== 'none') e.data.extreme_asset = assetsArray.find(item => item.id === oneAssetId).id
        },
        onRowInserting: async (e) => {

          // console.log('RowInserting');
          // console.log(e);

          // Xrm.Utility.showProgressIndicator('Loading... Please wait...');

          // newCreateId = '';
          // var record = {};
          // record["regardingobjectid_extreme_case_extreme_timeentry@odata.bind"] = `/extreme_cases(${caseIdForm})`; // Lookup
          // record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${e.data.owner})`; // Owner
          // record.scheduledstart = e.data.scheduledstart; // Date Time
          // record.scheduledend = e.data.scheduledend; // Date Time
          // record.extreme_type = e.data.extreme_type; // Choice
          // record.scheduleddurationminutes = e.data.scheduleddurationminutes; // Decimal
          // record.extreme_comuteinkm = e.data.extreme_comuteinkm; // Decimal
          // record.extreme_return = e.data.extreme_return; // Boolean
          // record.extreme_expences = e.data.extreme_expences; // Decimal

          // await Xrm.WebApi.createRecord("extreme_timeentry", record).then(
          //   function success(result) {
          //     var newId = result.id;
          //     newCreateId = newId;
          //     // console.log('NEW CREATED ID: ' + newCreateId);
          //   },
          //   function (error) {
          //     console.log(error.message);
          //   }
          // );
        },
        onRowInserted: async (e) => {

          // setTimeout(async () => {

          //   // console.log('RowInserted');
          //   // console.log(e);

          //   if (timeEntriesData._array.length > 0) {
          //     // console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
          //     timeEntriesData._array[timeEntriesData._array.length - 1].activityid = newCreateId;
          //     // console.log(timeEntriesData._array[timeEntriesData._array.length - 1].activityid);
          //     await getTimeEntries(caseIdForm);
          //     dataGrid.refresh();
          //   } else {
          //     // console.log('timeEntriesData._array is empty');
          //   }

          //   Xrm.Utility.closeProgressIndicator();

          // }, 1000);


        },
        onRowUpdating: async (e) => {
          // console.log('RowUpdating');
          // console.log(e);

          var record = {};
          var assetRecord = {};
          if (typeof (e.newData.extreme_warranty) === 'boolean') record.extreme_warranty = e.newData.extreme_warranty;
          if (typeof (e.newData.extreme_description) === 'string') record.extreme_description = e.newData.extreme_description.trim() === '' ? null : e.newData.extreme_description; // Multiline Text
          if (typeof (e.newData.extreme_solution) === 'string') record.extreme_solution = e.newData.extreme_solution.trim() === '' ? null : e.newData.extreme_solution; // Multiline Text

          if (typeof (e.newData.extreme_serialnumber) === 'string') assetRecord.extreme_serialnumber = e.newData.extreme_serialnumber.trim() === '' ? null : e.newData.extreme_serialnumber.trim(); // Text
          if (typeof (e.newData.extreme_inventoryno) === 'string') assetRecord.extreme_inventoryno = e.newData.extreme_inventoryno.trim() === '' ? null : e.newData.extreme_inventoryno.trim(); // Text
          if (typeof (e.newData.extreme_location) === 'string') assetRecord.extreme_location = e.newData.extreme_location.trim() === '' ? null : e.newData.extreme_location.trim(); // Text
          if (e.newData.extreme_warrantystartdate) assetRecord.extreme_warrantystartdate = e.newData.extreme_warrantystartdate; // Date Time
          if (e.newData.extreme_warrantyend) assetRecord.extreme_warrantyend = e.newData.extreme_warrantyend; // Date Time
          if (e.newData.extreme_warrantyenddatevendor) assetRecord.extreme_warrantyenddatevendor = e.newData.extreme_warrantyenddatevendor; // Date Time
          if (e.newData.extreme_preventiveservicecycle) assetRecord.extreme_preventiveservicecycle = e.newData.extreme_preventiveservicecycle; // Choice

          await Xrm.WebApi.updateRecord("extreme_asset", `${e.oldData.extreme_assetid}`, assetRecord).then(
            function success(result) {
              var updatedId = result.id;
              // console.log(updatedId);
            },
            function (error) {
              console.log(error.message);
            }
          );

          await Xrm.WebApi.updateRecord("extreme_caseasset", `${e.key}`, record).then(
            async function success(result) {
              var updatedId = result.id;
              // console.log(updatedId);
            },
            function (error) {
              console.log(error.message);
            }
          );

          await getCaseAssets(caseIdForm);
          dataGrid.refresh();

          // var record = {};
          // if (e.newData.owner) record["ownerid_extreme_timeentry@odata.bind"] = `/systemusers(${e.newData.owner})`; // Owner
          // if (e.newData.scheduledstart) record.scheduledstart = e.newData.scheduledstart; // Date Time
          // if (e.newData.scheduledend) record.scheduledend = e.newData.scheduledend; // Date Time
          // if (e.newData.extreme_type) record.extreme_type = e.newData.extreme_type; // Choice
          // if (e.newData.scheduleddurationminutes) record.scheduleddurationminutes = e.newData.scheduleddurationminutes; // Decimal
          // if (e.newData.extreme_comuteinkm) record.extreme_comuteinkm = e.newData.extreme_comuteinkm; // Decimal
          // if (typeof e.newData.extreme_return === "boolean") record.extreme_return = e.newData.extreme_return; // Boolean
          // if (e.newData.extreme_expences) record.extreme_expences = e.newData.extreme_expences; // Decimal

          // await Xrm.WebApi.updateRecord("extreme_timeentry", `${e.key}`, record).then(
          //   async function success(result) {
          //     var updatedId = result.id;
          //     // console.log(record);
          //     await getTimeEntries(caseIdForm);
          //     dataGrid.refresh();
          //   },
          //   function (error) {
          //     console.log(error.message);
          //   }
          // );
        },
        onRowUpdated() {
          // console.log('RowUpdated');
        },
        onRowRemoving: async (e) => {
          // console.log('RowRemoving');
          // console.log(e);
          // // Delete case line on another web resource
          // await formContext.getControl('WebResource_new_2').getObject().contentWindow.window.createTimeEntry(e.data.extreme_caseline);
          // // Refresh grid for case lines
          // await formContext.getControl('WebResource_new_2').getObject().contentWindow.window.setClientApiContext(Xrm, formContext);
          await Xrm.WebApi.deleteRecord("extreme_caseasset", `${e.key}`).then(
            function success(result) {
              // console.log(result);
            },
            function (error) {
              console.log(error.message);
            }
          );
        },
        onRowRemoved: (e) => {
          // console.log('RowRemoved');
          // console.log(e);
        },
        onSaving() {
          // console.log('Saving');
        },
        onSaved() {
          // console.log('Saved');
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
              if (dataGrid.columnOption(i, "dataField") == "extreme_assetcode") {
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


      // function for checking classify needed rows
      const checkClassifyRows = () => {

        let classifyNeededRows = 0;

        if (caseAssetsData._array.length > 0) {
          caseAssetsData._array.filter((item) =>
          // item.extreme_isparentitem === false &&
          (
            (item.extreme_serialnumber === null || item.extreme_serialnumber === undefined) ||
            (item.extreme_inventoryno === null || item.extreme_inventoryno === undefined) ||
            (item.extreme_location === null || item.extreme_location === undefined) ||
            (item.extreme_warrantystartdate === null || item.extreme_warrantystartdate === undefined) ||
            (item.extreme_warrantyend === null || item.extreme_warrantyend === undefined) ||
            (item.extreme_warrantyenddatevendor === null || item.extreme_warrantyenddatevendor === undefined) ||
            (item.extreme_preventiveservicecycle === null || item.extreme_preventiveservicecycle === undefined)
          )
          ).forEach((item) => {
            classifyNeededRows += 1;
          })
        }

        if (classifyNeededRows > 0) {
          // $('#classifyBtn')[0].style.backgroundColor = '#fff';
          $('#classifyBtn')[0].style.display = 'inline-flex';
        }
        else {
          // $('#classifyBtn')[0].style.backgroundColor = '#fff';
          $('#classifyBtn')[0].style.display = 'inline-flex';
        }

        // console.log('CLASSIFY NEEDED ROWS');
        // console.log(classifyNeededRows);

      }

    });

  }

  // Select the gridContainer element
  let gridContainer;

  const wrControl = formContext.getControl('WebResource_caseAssets');
  wrControl.getContentWindow().then(function (contentWindow) {
    // console.log('HEIGHT MAIN CONTAINER:');
    // console.log(contentWindow.document.getElementById('gridContainer').offsetHeight);
    gridContainer = contentWindow.document.getElementById('gridContainer');
    // console.log(gridContainer);

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
              iframe.style.minHeight = '250px';
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

  // Xrm.Utility.closeProgressIndicator();

  formContext.getControl('WebResource_timeEntries').getObject().contentWindow.window.setWebResourceLoaded("WebResource_caseAssets", caseIdForm);

}

// Function to replace curly brackets from IDs
function replaceCurlyBrackets(inputString, replacement) {
  return inputString.replace(/^{|}$/g, replacement);
}