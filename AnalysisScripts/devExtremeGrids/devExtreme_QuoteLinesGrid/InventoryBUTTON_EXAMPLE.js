async function inventoryInfo(product) {
    const pageInput = {
        pageType: "webresource",
        webresourceName: "extreme_InventoryInfo.html",
        data: JSON.stringify({
            baseUrl: Xrm.Utility.getGlobalContext().getClientUrl(),
            entityId: formContext.data.entity.getId().slice(1, -1),
            product: product,
        }),
    };

    const navigationOptions = {
        target: 2,
        height: { value: 500, unit: "px" },
        width: { value: 800, unit: "px" },
        position: 1,
        title: "Inventory Info for " + product.name,
    };

    Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
        function success() {
            // Run code on success
            console.log("Success");
        },
        function error() {
            // Handle errors
            console.log("Error");
        }
    );
}