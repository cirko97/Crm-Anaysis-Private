$(() => {

    let pawsConfig = {};

    $.ajax({
        type: "GET",
        url: queryParams.baseUrl + "/api/data/v9.2/extreme_configurations?$select=extreme_key,extreme_value&$filter=startswith(extreme_key,'PAWS')",
        async: true,
        headers: {
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json",
            "Prefer": "odata.include-annotations=*"
        },
        success: function (data, textStatus, xhr) {
            var results = data;
            console.log(results);
            for (var i = 0; i < results.value.length; i++) {
                var result = results.value[i];
                // Columns
                var extreme_configurationid = result["extreme_configurationid"]; // Guid
                var extreme_key = result["extreme_key"]; // Text
                var extreme_value = result["extreme_value"]; // Text

                pawsConfig[extreme_key] = extreme_value;
            }
        },
        error: function (xhr, textStatus, errorThrown) {
            console.log(xhr);
        }
    }).done(function () {

        $.ajax({
            type: "POST",
            url: pawsConfig['PAWS_AUTHENDPOINT'],
            async: true,
            headers: {
                "Content-Type": "application/json"
            },
            success: function (data, textStatus, xhr) {
                var results = data;
                console.log(results);
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log(xhr);
            }
        }).done(function () {

            $.ajax({
                type: "POST",
                url: pawsConfig['PAWS_IDENTRETRIEVE'],
                async: true,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "start": 0,
                    "length": 0,
                    "fieldsToReturn": "items.acIdent, max(items.acName) as acName, sum(tHE_Stock.anStock - tHE_Stock.anReserved) as anStock, max(items.anPrice) as anPrice, max(items.acUM) as acUM, max(items.acVATCode) as acVATCode, max(items.acCostDrv) as acCostDrv, max(acClassif) as acClassif, max(acClassif2) as acClassif2, max(acSetOfItem) as acSetOfItem, max(items.acSupplier) as acSupplier",
                    "tableFKs": [
                        {
                            "table": "tHE_SetProdSt",
                            "join": "AcSetProdSt.acIdent = items.acIdent",
                            "alias": "AcSetProdSt",
                            "fieldsToReturn": "acIdentchild, anNo, anQty"
                        },
                        {
                            "table": "tHE_Stock",
                            "join": "tHE_Stock.acIdent = items.acIdent",
                            "alias": "tHE_Stock",
                            "fieldsToReturn": "acWarehouse, anStock, anReserved"
                        },
                        {
                            "table": "tHE_SetItemExtItemSubj",
                            "join": "tHE_SetItemExtItemSubj.acIdent = items.acIdent",
                            "alias": "tHE_SetItemExtItemSubj",
                            "fieldsToReturn": "acSubject, acCode, acType, acDefault"
                        }
                    ],
                    "customConditions": {
                        "condition": " items.acIdent like @param1 group by items.acident",
                        "params": [
                            "%TEST%"
                        ]
                    },
                    "sortColumn": "items.acIdent",
                    "sortOrder": "items.acIdent",
                    "WithSubSelects": 1,
                    "tempTables": []
                }),
                success: function (data, textStatus, xhr) {
                    var results = data;
                    console.log(results);
                },
                error: function (xhr, textStatus, errorThrown) {
                    console.log(xhr);
                }
            })


            $('#ok-btn').on("click", function () {
                window.close();
            });

        });

    });

});
