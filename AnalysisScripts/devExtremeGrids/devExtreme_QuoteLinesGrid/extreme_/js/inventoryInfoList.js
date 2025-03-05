$(() => {

    let pawsConfig = {};

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
    Xrm.WebApi.execute(executeWorkflowRequest).then(
        function success(response) {
            if (response.ok) {
                console.log("Workflow executed successfully.");

                // Now retrieve the API response from the quotedetail record
                var recordId = queryParams.quoteDetailGuid;  // Replace with dynamic ID
                return Xrm.WebApi.retrieveRecord("quotedetail", recordId, "?$select=extreme_apiresponse");
            }
        }
    ).then(function (retrievedRecord) {
        if (retrievedRecord && retrievedRecord.extreme_apiresponse) {
            console.log("API Response:", retrievedRecord.extreme_apiresponse);
        } else {
            console.log("No API response found on record.");
        }
    }).catch(function (error) {
        console.log("Error:", error.message);
    });

});
