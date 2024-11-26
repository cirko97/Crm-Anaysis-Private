using System;
using System.Activities;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Workflow;

namespace AnalysisWF
{
    public class CreatePriceListItem : CodeActivity
    {
        [Input("Price List")]
        [ReferenceTarget("pricelevel")]
        [RequiredArgument]
        public InArgument<EntityReference> PriceList { get; set; }

        [Input("Product ID")]
        [RequiredArgument]
        public InArgument<string> ProductId { get; set; }

        [Input("Product Name")]
        [RequiredArgument]
        public InArgument<string> ProductName { get; set; }

        [Input("Product Description")]
        public InArgument<string> ProductDescription { get; set; }

        [Input("Unit of Measure (UoM) Name")]
        [RequiredArgument]
        public InArgument<string> UnitName { get; set; }

        [Input("Currency")]
        [ReferenceTarget("transactioncurrency")]
        [RequiredArgument]
        public InArgument<EntityReference> Currency { get; set; }

        [Input("Amount")]
        [RequiredArgument]
        public InArgument<Money> Amount { get; set; }

        [Input("Supplier")]
        [ReferenceTarget("account")]
        public InArgument<EntityReference> Supplier { get; set; }

        [Input("Technology")]
        [ReferenceTarget("extreme_technology")]
        public InArgument<EntityReference> Technology { get; set; }
        [Input("Area")]
        [ReferenceTarget("extreme_area")]
        public InArgument<EntityReference> Area { get; set; }

        [Output("Created Price List Item Id")]
        public OutArgument<string> CreatedPriceListItemId { get; set; }

        [Output("Created Price List Item URL")]
        public OutArgument<string> CreatedPriceListItemUrl { get; set; }

        [Output("Error Message")]
        public OutArgument<string> ErrorMessage { get; set; }

        protected override void Execute(CodeActivityContext executionContext)
        {
            // Create the context service
            IWorkflowContext context = executionContext.GetExtension<IWorkflowContext>();
            IOrganizationServiceFactory serviceFactory = executionContext.GetExtension<IOrganizationServiceFactory>();
            IOrganizationService service = serviceFactory.CreateOrganizationService(context.UserId);

            try
            {
                // Retrieve input parameters
                EntityReference priceList = PriceList.Get(executionContext);
                string productId = ProductId.Get(executionContext);
                string productName = ProductName.Get(executionContext);
                string productDescription = ProductDescription.Get(executionContext);
                string unitName = UnitName.Get(executionContext);
                EntityReference currency = Currency.Get(executionContext);
                Money amount = Amount.Get(executionContext);
                EntityReference supplier = Supplier.Get(executionContext);
                EntityReference technology = Technology.Get(executionContext);
                EntityReference area = Area.Get(executionContext);

                // Validate input parameters
                if (priceList == null)
                {
                    ErrorMessage.Set(executionContext, "Price List is required.");
                    return;
                }

                if (string.IsNullOrWhiteSpace(productId))
                {
                    ErrorMessage.Set(executionContext, "Product ID cannot be empty.");
                    return;
                }

                if (string.IsNullOrWhiteSpace(productName))
                {
                    ErrorMessage.Set(executionContext, "Product Name cannot be empty.");
                    return;
                }

                if (string.IsNullOrWhiteSpace(unitName))
                {
                    ErrorMessage.Set(executionContext, "Unit of Measure (UoM) Name is required.");
                    return;
                }

                if (currency == null)
                {
                    ErrorMessage.Set(executionContext, "Currency is required.");
                    return;
                }

                // Retrieve the UoM entity based on the name
                QueryExpression uomQuery = new QueryExpression("uom")
                {
                    ColumnSet = new ColumnSet(true)
                };
                uomQuery.Criteria.AddCondition("name", ConditionOperator.Equal, unitName);
                EntityCollection uoms = service.RetrieveMultiple(uomQuery);

                if (uoms.Entities.Count == 0)
                {
                    ErrorMessage.Set(executionContext, "Unit of Measure (UoM) not found.");
                    return;
                }
                EntityReference uom = uoms.Entities[0].ToEntityReference();

                // Check if the product already exists
                Entity product = null;
                QueryExpression productQuery = new QueryExpression("product")
                {
                    ColumnSet = new ColumnSet(true)
                };
                productQuery.Criteria.AddCondition("productnumber", ConditionOperator.Equal, productId);

                EntityCollection products = service.RetrieveMultiple(productQuery);
                if (products.Entities.Count > 0)
                {
                    product = products.Entities[0];
                }
                else
                {
                    // Retrieve the default UoM Schedule
                    QueryExpression uomScheduleQuery = new QueryExpression("uomschedule")
                    {
                        ColumnSet = new ColumnSet(true)
                    };
                    uomScheduleQuery.Criteria.AddCondition("name", ConditionOperator.Equal, "Default Unit");
                    EntityCollection uomSchedules = service.RetrieveMultiple(uomScheduleQuery);

                    if (uomSchedules.Entities.Count == 0)
                    {
                        ErrorMessage.Set(executionContext, "Default UoM Schedule not found.");
                        return;
                    }
                    EntityReference defaultUoMSchedule = uomSchedules.Entities[0].ToEntityReference();

                    // Create a new Product entity if it doesn't exist
                    product = new Entity("product");
                    product["name"] = productName;
                    product["productnumber"] = productId;
                    product["description"] = productDescription;
                    product["defaultuomid"] = uom;
                    product["defaultuomscheduleid"] = defaultUoMSchedule;
                    product["transactioncurrencyid"] = currency;
                    product["quantitydecimal"] = 2;
                    product["pricelevelid"] = priceList;
                    product["extreme_supplier"] = supplier;
                    product["extreme_technology"] = technology;
                    product["extreme_area"] = area;

                    // Create the Product record
                    product.Id = service.Create(product);
                }

                // Create a new Price List Item (ProductPriceLevel) entity
                Entity priceListItem = new Entity("productpricelevel");
                priceListItem["pricelevelid"] = priceList;
                priceListItem["productid"] = product.ToEntityReference();
                priceListItem["uomid"] = uom;
                priceListItem["amount"] = amount;
                priceListItem["transactioncurrencyid"] = currency;

                // Create the Price List Item record
                Guid priceListItemId = service.Create(priceListItem);

                // Set output parameters
                CreatedPriceListItemId.Set(executionContext, priceListItemId.ToString());
                // Retrieve base URL from extreme_configuration
                QueryExpression configQuery = new QueryExpression("extreme_configuration")
                {
                    ColumnSet = new ColumnSet("extreme_value")
                };
                configQuery.Criteria.AddCondition("extreme_key", ConditionOperator.Equal, "baseurl");
                EntityCollection configResults = service.RetrieveMultiple(configQuery);

                if (configResults.Entities.Count == 0)
                {
                    ErrorMessage.Set(executionContext, "Configuration with key 'baseurl' not found.");
                    return;
                }
                string baseUrl = configResults.Entities[0].GetAttributeValue<string>("extreme_value");
                string itemUrl = $"{baseUrl}/main.aspx?etn=productpricelevel&id={priceListItemId}&pagetype=entityrecord";
                CreatedPriceListItemUrl.Set(executionContext, itemUrl);
            }
            catch (Exception ex)
            {
                ErrorMessage.Set(executionContext, ex.Message);
            }
        }
    }
}
