var AccountRibbon = window.AccountRibbon || {};
(function () {
	this.SyncAccountButton = function (formContext) {
		// DDBFFDDD-0328-4F96-8A3C-E9235550F347  -  SYNC Insert Workflow
		var workflowId = 'DDBFFDDD-0328-4F96-8A3C-E9235550F347';
		var accountId = formContext.data.entity.getId().slice(1,-1);

		var confirmStrings = { text:"This action will synchronize this account to Pantheon. \nAre you sure you want to continue?", title:"Pantheon Synchronization" };
		var confirmOptions = { height: 300, width: 450 };
		Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
		function (success) {    
			if (success.confirmed){
				

				var executeWorkflowRequest = {
					entity: { entityType: "workflow", id: `${workflowId}` },
					EntityId: { guid: `${accountId}` },

					getMetadata: function () {
						return {
							boundParameter: "entity",
							parameterTypes: {
								entity: { typeName: "mscrm.workflow", structuralProperty: 5 },
								EntityId: { typeName: "Edm.Guid", structuralProperty: 1 }
							},
							operationType: 0, operationName: "ExecuteWorkflow"
						};
					}
				};
				Xrm.Utility.showProgressIndicator('Synchronizing data... Please wait.')
				Xrm.WebApi.execute(executeWorkflowRequest).then(
					function success(response) {
						if (response.ok) { /*return response.json(); */}
					}
				).then(function (responseBody) {
					var result = responseBody;
					formContext.data.refresh(true);
					Xrm.Utility.closeProgressIndicator('Success!')
					//console.log(result);
				}).catch(function (error) {
					console.log(error.message);
				});
			}
		});
	}

	this.SyncAccountButtonEnableRule = function (formContext) {
		const FORM_NEW = 1;
		const formType = formContext.ui.getFormType();
		if (formType !== FORM_NEW /*&& formContext.getAttribute("extreme_synchronized").getValue() === false*/) {
			return true;
		}
		return false;
	}
    
}).call(AccountRibbon);

