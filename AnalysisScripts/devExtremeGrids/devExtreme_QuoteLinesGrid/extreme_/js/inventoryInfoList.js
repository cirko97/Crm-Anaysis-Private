$(async () => {

    var executeWorkflowRequest = {
        entity: { entityType: "workflow", id: "1738674e-adf9-ef11-bae2-6045bd9d91cf" },
        EntityId: { guid: queryParams.quoteDetailGuid }, //guid quotedetaila

        getMetadata: function () {
            return {
                boundParameter: "entity",
                parameterTypes: {
                    entity: { typeName: "mscrm.workflow", structuralProperty: 5 },
                    EntityId: { typeName: "Edm.Guid", structuralProperty: 1 }
                },
                operationType: 0,
                operationName: "ExecuteWorkflow"
            };
        }
    };

    // Execute workflow
    await parent.Xrm.WebApi.execute(executeWorkflowRequest).then(
        function success(response) {
            if (response.ok) {
                console.log("Workflow executed successfully.");

                // Now retrieve the API response from the quotedetail record
                var recordId = queryParams.quoteDetailGuid;  // Replace with dynamic ID
                return parent.Xrm.WebApi.retrieveRecord("quotedetail", recordId, "?$select=extreme_apiresponse");
            }
        }
    ).then(function (retrievedRecord) {
        if (retrievedRecord && retrievedRecord.extreme_apiresponse) {
            console.log("API Response:", retrievedRecord.extreme_apiresponse);

            const apiResponse = JSON.parse(retrievedRecord.extreme_apiresponse);
            console.log(apiResponse[0]["tHE_Stock"]);

            if (apiResponse[0]["tHE_Stock"].length === 0 || apiResponse[0]["tHE_Stock"] === null || apiResponse[0]["tHE_Stock"] === undefined) {
                console.log("No stock found for this item.");
            }
            else {
                console.log("Stock found for this item.");

                for (let i = 0; i < apiResponse[0]["tHE_Stock"].length; i++) {
                    const stockItem = apiResponse[0]["tHE_Stock"][i];
                    console.log(stockItem);

                    // Add stock item to the table
                    $("#inventoryInfoList").append(`
                        <tr>
                            <td>${stockItem["acWarehouse"]}</td>
                            <td>${stockItem["anStock"]}</td>
                            <td>${stockItem["anReserved"]}</td>
                        </tr>
                    `);

                }

            }
        } else {
            console.log("No API response found on record.");
        }
    }).catch(function (error) {
        console.log("Error:", error.message);
    });

    $("#loadingOverlay").hide();

    $("#ok-btn").on("click", function () {
        window.close();
    });

});
