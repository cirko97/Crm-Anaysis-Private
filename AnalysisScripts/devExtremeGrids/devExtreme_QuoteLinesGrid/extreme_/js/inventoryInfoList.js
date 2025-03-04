$(() => {

    DevExpress.localization.locale('sr-Latn-RS');

    $('#alertModal').modal({ show: false });

    const accountsODataStore = new DevExpress.data.ODataStore({
        type: "odata",
        version: 4,
        filterToLower: false,
        url: queryParams.baseUrl + "/api/data/v9.2/extreme_competitors",
        key: "extreme_competitorid",
        keyType: "Guid",
        select: [
            'extreme_competitorid',
            'extreme_name'
        ],
    });

    $('#lookup-status').dxLookup({
        dataSource: new DevExpress.data.DataSource({
            store: new DevExpress.data.ArrayStore({
                data: queryParams.statusCodesArray,
                key: 'id'
            }),
            filter: ['id', '=', queryParams.setStatus]
        }),
        dropDownOptions: {
            hideOnOutsideClick: true,
            showTitle: false,
        },
        displayExpr: 'name',
        inputAttr: {
            'aria-label': 'Status lookup',
        },
        isplayExpr: 'name',
        valueExpr: 'id',
        value: queryParams.setStatus,
        disabled: false,
        validationRules: [{ type: 'required' }]
    }).dxValidator({
        validationRules: [{
            type: "required"
        }]
    });

    $("#currency").dxNumberBox({
        value: 0,
        format: "RSD #,##0.##"
    }).dxValidator({
        validationRules: [{
            type: "required"
        }]
    });

    const now = new Date();
    $("#date").dxDateBox({
        type: "date",
        displayFormat: 'dd.MM.yyyy',
        value: now,
        validationRules: [{ type: 'required' }]
    }).dxValidator({
        validationRules: [{
            type: "required"
        }]
    });

    $('#lookup-competitor').dxLookup({
        value: null,
        placeholder: "Izaberite konkurenta...",
        dataSource: {
            store: accountsODataStore,
            paginate: true,
            pageSize: 100,
            loadMode: 'raw'
        },
        showClearButton: true,
        dropDownOptions: {
            hideOnOutsideClick: true,
            showTitle: false,
        },
        inputAttr: {
            'aria-label': 'Competitor lookup',
        },
        displayExpr: 'extreme_name',
        valueExpr: 'extreme_competitorid',
        validationRules: [{ type: 'required' }]
    });

    $('#description').dxTextArea({
        value: '',
        height: 90,
        inputAttr: { 'aria-label': 'Description' },
        placeholder: "Opis..."
    });






    $('#cancel-btn').dxButton({
        stylingMode: 'contained',
        text: 'Otkaži',
        type: 'normal',
        width: 120,
        onClick() {
            window.close();
        },
    });

    $('#submit-btn').dxButton({
        stylingMode: 'contained',
        text: 'U redu',
        type: 'default',
        width: 120,
        async onClick(params) {
            const isValid = params.validationGroup.validate().isValid;

            console.log('OPTIONS FROM SUBMIT');

            console.log($('#lookup-status').dxLookup('option', 'value'));
            console.log($('#currency').dxNumberBox('option', 'value'));
            console.log($('#date').dxDateBox('option', 'value'));
            console.log($('#lookup-competitor').dxLookup('option', 'value'));
            console.log($('#description').dxTextArea('option', 'value'));

            if (isValid) {

                var record = {};
                record.statecode = 1; // State Inactive
                record.statuscode = queryParams.setStatus; // Status WON / LOST
                record.extreme_actualvalue = $('#currency').dxNumberBox('option', 'value'); // Currency
                if($('#lookup-competitor').dxLookup('option', 'value') !== null) record["extreme_Competitor@odata.bind"] = `/extreme_competitors(${$('#lookup-competitor').dxLookup('option', 'value')})`; // Lookup
                record.extreme_closedate = $('#date').dxDateBox('option', 'value'); // Date Time
                if($('#description').dxTextArea('option', 'value') !== null && $('#description').dxTextArea('option', 'value').trim() !== '') record.extreme_description = $('#description').dxTextArea('option', 'value'); // Multiline Text

                $.ajax({
                    type: "PATCH",
                    url: queryParams.baseUrl + `/api/data/v9.2/extreme_opportunities(${queryParams.entityId})`,
                    async: true,
                    headers: {
                        "OData-MaxVersion": "4.0",
                        "OData-Version": "4.0",
                        "Content-Type": "application/json; charset=utf-8",
                        "Accept": "application/json",
                        "Prefer": "odata.include-annotations=*"
                    },
                    data: JSON.stringify(record),
                    success: function (data, textStatus, xhr) {
                        console.log("Record updated");
                        window.close();
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        console.log(xhr);
                    }
                });
            } else {
                $('#alertModal').modal('show');
            }

        },
    });

});
