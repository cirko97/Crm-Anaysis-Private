using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;

namespace AnalysisWF
{ 
    public class QuoteDetailPreOperationPlugin : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            // Obtain execution context
            IPluginExecutionContext context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

            // Ensure it's triggered on 'Create' for 'quotedetail' and runs in Pre-operation (Stage 20)
            if (context.MessageName.ToLower() != "create" || context.PrimaryEntityName.ToLower() != "quotedetail" || context.Stage != 20)
                return;

            // Get the Target entity (quotedetail)
            if (!context.InputParameters.Contains("Target") || !(context.InputParameters["Target"] is Entity))
                return;

            Entity quoteDetail = (Entity)context.InputParameters["Target"];

            // Retrieve field values with safe checks
            decimal pricePerUnit = quoteDetail.GetAttributeValue<Money>("priceperunit")?.Value ?? 0m;
            decimal baseAmount = quoteDetail.GetAttributeValue<Money>("baseamount")?.Value ?? 0m;
            EntityReference productId = quoteDetail.GetAttributeValue<EntityReference>("productid");

            // Apply logic only if conditions are met
            if (pricePerUnit > 0 && baseAmount == 0 && productId == null)
            {
                // Retrieve quantity (defaulting to 1 if missing)
                decimal quantity = quoteDetail.GetAttributeValue<decimal?>("quantity") ?? 1m;
                decimal extreme_fullpricewithdiscount = quoteDetail.GetAttributeValue<decimal>("extreme_fullpricewithdiscount");
                decimal tax = quoteDetail.GetAttributeValue<Money>("tax")?.Value ?? 0m;

                // Calculate baseamount (Example: baseamount = priceperunit * quantity)
                quoteDetail["baseamount"] = new Money(pricePerUnit * quantity);
                // Calculate extended amount
                quoteDetail["extendedamount"] = new Money(extreme_fullpricewithdiscount + tax);

                // Placeholder for additional fields (Add logic as needed)
                // quoteDetail["custom_field"] = someCalculatedValue;
            }
        }
    }


}
