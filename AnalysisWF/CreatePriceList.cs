using System;
using System.Activities;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Workflow;

namespace AnalysisWF
{
    public class CreatePriceList : CodeActivity
    {
        [Input("Price List Name")]
        [RequiredArgument]
        public InArgument<string> PriceListName { get; set; }

        [Input("Currency (Transaction Currency)")]
        [ReferenceTarget("transactioncurrency")]
        [RequiredArgument]
        public InArgument<EntityReference> Currency { get; set; }

        [Input("Default Sales Margin")]
        [RequiredArgument]
        public InArgument<decimal> Margin { get; set; }

        [Output("Created Price List")]
        [ReferenceTarget("pricelevel")]
        public OutArgument<EntityReference> CreatedPriceListEntity { get; set; }

        protected override void Execute(CodeActivityContext executionContext)
        {
            // Create the context service
            IWorkflowContext context = executionContext.GetExtension<IWorkflowContext>();
            IOrganizationServiceFactory serviceFactory = executionContext.GetExtension<IOrganizationServiceFactory>();
            IOrganizationService service = serviceFactory.CreateOrganizationService(context.UserId);

            try
            {
                // Retrieve input parameters
                string name = PriceListName.Get(executionContext);
                EntityReference currency = Currency.Get(executionContext);
                decimal margin = Margin.Get(executionContext);

                // Validate input parameters
                if (string.IsNullOrWhiteSpace(name))
                {
                    throw new InvalidPluginExecutionException("Price List Name cannot be empty.");
                }

                if (currency == null)
                {
                    throw new InvalidPluginExecutionException("Currency is required.");
                }

                // Create a new Price List entity (PriceLevel in Dynamics)
                Entity priceList = new Entity("pricelevel");
                priceList["name"] = name;
                priceList["transactioncurrencyid"] = currency;
                
                if (margin > 0)
                {
                    priceList["extreme_defaultsalesmargin"] = margin;
                }

                // Create the Price List record
                Guid priceListId = service.Create(priceList);

                // Retrieve the newly created entity
                EntityReference createdPriceListRef = new EntityReference("pricelevel", priceListId);

                // Set output parameter
                CreatedPriceListEntity.Set(executionContext, createdPriceListRef);
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException($"An error occurred in CreatePriceList: {ex.Message}", ex);
            }
        }
    }
}
