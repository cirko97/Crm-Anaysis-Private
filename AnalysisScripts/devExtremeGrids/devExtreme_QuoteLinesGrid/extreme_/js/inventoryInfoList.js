$(() => {

    const token = api('getToken');
    console.log("TOKEN CALL");
    console.log(token);

    const inventoryInfo = api('getInventory');
    console.log("INVENTORY CALL");
    console.log(inventoryInfo);


    $('#ok-btn').on("click", function () {
        window.close();
    });

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
    });


    function api(name) {

        let settings = {};

        if (name == 'getToken') {
            settings = {
                "url": "https://paws.telekom.si/api/Users/authwithtoken",
                "method": "POST",
                "timeout": 0,
                "headers": {
                    "Content-Type": "application/json"
                },
                "data": JSON.stringify({
                    "Username": "ANAL_PAWS",
                    "Password": "pawsaa123!",
                    "companyDB": "ANALYSISADRIA_TEST"
                }),
            };
        }

        if (name == 'getInventory') {
            settings = {
                "url": "https://paws.telekom.si/api/Ident/retrieve",
                "method": "POST",
                "timeout": 0,
                "headers": {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIyMzAiLCJwYXdzL1VzZXJJZCI6IjIzMCIsInVuaXF1ZV9uYW1lIjoiQU5BTF9QQVdTIiwiQ29ublN0ciI6IkFRQUFBTkNNbmQ4QkZkRVJqSG9Bd0UvQ2wrc0JBQUFBOGo4WW9Lc0tjMEdzc3pvTjBBS215QUFBQUFBQ0FBQUFBQUFEWmdBQXdBQUFBQkFBQUFCUjEyTDdUMXV6Nld5ckZUUERQeDMxQUFBQUFBU0FBQUNnQUFBQUVBQUFBRmdhZnFkZlZudHY5em1KZXBDbmtLUUFBUUFBVkVMancvRWZPMTFXWUdBMTk0SmJBOFJLNm1BcmRUNE5hSWovTm9VSzhKQzZTYllSOVBlR1Q0dlFGY24zeUpQUzBRVlRpbW9GTmVnNTJqZFJheHpNbkhmR2xFZlY2TFVYMlN5VkcreWx3c0RCYkswOS9wSDNIcXAzQUZpUlhUR3p0TUJXRnh1MzF5akdCSk9CMDdmL0VaK252YjlTK1owSDNYVlNmVS8vL0lxckVXbmszNUlZT1VJYmpNWmhwaW1EdExlTVU0NkwweVgzSytQeXNWSDR6a3ZzZHovbXRkQWdPTHNDOEErdmFKR1IvaWY2aEpHWkNpQzloTDJTWnMxZEhUSTdBWDFLVmFnNVZ0eTVRRzMzQlpZS29neDlNUVdjbjhZME9WTGZET1NaRnFiVHF3b3lvVU1qMUFqS3JpZ1VHNVdYdFA0N2xneTRCUVVJQjlValNSUUFBQUM4TmtreUxJKys0QzlaNkZ0OUlhNTJUVE9OQUE9PSIsIklWcyI6IiIsIkR0RXhwIjoiMTQuIDAyLiAyMDI1IDA5OjI1OjAwIiwibmJmIjoxNzM5NTI0OTIwLCJleHAiOjE3Mzk1MjUxMDAsImlhdCI6MTczOTUyNDkyMH0.jHiv-E2-Qrp9gSb73iyr-1Wt2RuVQGHVkdD7l4Axc4M"
                },
                "data": JSON.stringify({
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
            };
        }


        $.ajax(settings).done(function (response) {
            console.log('response');
            console.log(response);

            return response;
        });

    }

});
