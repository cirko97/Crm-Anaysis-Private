async function inventoryInfo(formContext, setStatusValue) {
    console.log(formContext);

    let statusCodesArray = [];
    const statusCodesDefs = await Xrm.Utility.getEntityMetadata('extreme_opportunity', ['statuscode']);
    const objOfObjs = statusCodesDefs.Attributes._collection.statuscode.OptionSet;
    const arrayOfObjs = Object.keys(objOfObjs).map(key => {
      return objOfObjs[key];
    });
    arrayOfObjs.forEach(elm => {
        statusCodesArray.push({
            "id": elm.value,
            "name": elm.text
        })
    });

    const pageInput = {
        pageType: "webresource",
        webresourceName: "extreme_WonLostForm.html",
        data: JSON.stringify({
            baseUrl: Xrm.Utility.getGlobalContext().getClientUrl(),
            entityId: formContext.data.entity.getId().slice(1, -1),
            statusCodesArray: statusCodesArray,
            setStatus: setStatusValue // ID of status "WON"
        }),
    };

    const navigationOptions = {
        target: 2,
        height: { value: 800, unit: "px" },
        width: { value: 500, unit: "px" },
        position: 1,
        title: "Zatvori priliku za poslovanje"
    };

    Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
        function success() {
            // Run code on success
            console.log("Success");

            // Refresh the form
            formContext.data.refresh(true);

        },
        function error() {
            // Handle errors
            console.log("Error");
        }
    );
}

function enableRule(formContext) {
    console.log(formContext);
}