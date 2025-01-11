using System;
using System.Activities;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Workflow;
using Newtonsoft.Json;

namespace AnalysisWF
{
    public class ProductInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Product")]
        [ReferenceTarget("product")]
        public InArgument<EntityReference> Product { get; set; }

        [RequiredArgument]
        [Input("Price")]
        public InArgument<decimal> Price { get; set; }

        #endregion

        #region Output Properties

        [Output("PantheonID")]
        public OutArgument<string> PantheonID { get; set; }

        [Output("Shortened Product ID")]
        public OutArgument<string> ShortenedProductID { get; set; }

        [Output("API Response")]
        public OutArgument<string> ApiResponse { get; set; }
        #endregion

        protected override void Execute(CodeActivityContext context)
        {
            var tracingService = context.GetExtension<ITracingService>();
            var serviceFactory = context.GetExtension<IOrganizationServiceFactory>();
            var service = serviceFactory.CreateOrganizationService(null);
            var execprocendpoint = Helper.GetConfigurationValue("PAWS_EXECPROCENDPOINT", service);

            try
            {
                // Retrieve Product record
                var productRef = Product.Get(context);
                var product = service.Retrieve("product", productRef.Id, new ColumnSet(true));
                tracingService.Trace("Retrieved Product record with ID: {0}", product.Id);

                // Check if product is a parent
                var isParent = product.GetAttributeValue<bool>("extreme_isparent");
                string jsonData;

                if (isParent)
                {
                    tracingService.Trace("Product is marked as a parent.");

                    // Retrieve child products
                    var query = new QueryExpression("product")
                    {
                        ColumnSet = new ColumnSet("productnumber", "name", "defaultuomid", "extreme_parentproduct", "extreme_quantityforparent"),
                        Criteria = new FilterExpression()
                    };
                    query.Criteria.AddCondition("extreme_parentproduct", ConditionOperator.Equal, product.Id);

                    var childProducts = service.RetrieveMultiple(query).Entities;
                    tracingService.Trace("Retrieved {0} child products.", childProducts.Count);

                    jsonData = PrepareComposedProductData(product, childProducts, service, context);
                }
                else
                {
                    tracingService.Trace("Product is not a parent.");
                    jsonData = PrepareProductData(product, service, context);
                }

                tracingService.Trace("JSON data for submission: {0}", jsonData);

                // Call Pantheon API
                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();
                var responseMessage = CallPantheonApi(token, jsonData, execprocendpoint).GetAwaiter().GetResult();

                tracingService.Trace("API Response: {0}", responseMessage);

                // Parse response and set output parameters
                var cleanedResponse = responseMessage.Replace("\\r", "").Replace("\\n", "");
                string cleanedJson = cleanedResponse.Replace("\\\"", "\"").Trim('"'); // Remove outer quotes
                tracingService.Trace("Cleaned API Response: {0}", cleanedJson);

                string formattedJson = JsonConvert.SerializeObject(JsonConvert.DeserializeObject(cleanedJson), Formatting.Indented);
                ApiResponse.Set(context, formattedJson);

                dynamic response = JsonConvert.DeserializeObject(cleanedJson);
                string pantheonId = response.usp_DEVC_AA_CreateIdent_out?["@anQId"].ToString() ?? response.usp_DEVC_AA_CreateComposedIdent_out?["@anQId"].ToString();
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                string errorMessage = response.usp_DEVC_AA_CreateIdent_out?["@acErrorMessage"].ToString() ?? response.usp_DEVC_AA_CreateComposedIdent_out?["@acErrorMessage"].ToString();

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Error: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Error while sending Product record: {ex.Message}");
            }
        }

        private string PrepareProductData(Entity product, IOrganizationService service, CodeActivityContext context)
        {
            var acIdent = product.GetAttributeValue<string>("productnumber");
            var acIdentLong = "";
            if (acIdent != null && acIdent.Length > 16)
            {
                acIdentLong = acIdent;
                acIdent = acIdent.Substring(0, 16);
            }
            ShortenedProductID.Set(context, acIdent);

            var acName = product.GetAttributeValue<string>("name");
            var acUM = GetLookupFieldValue<string>(product.GetAttributeValue<EntityReference>("defaultuomid"), "name", service)?.Substring(0, 3);
            var acType = product.GetAttributeValue<OptionSetValue>("producttypecode")?.Value == 1 ? "P" : "U";
            var acClassif = GetLookupFieldValue<string>(product.GetAttributeValue<EntityReference>("extreme_technology"), "extreme_name", service) ?? "";
            var acClassif2 = GetLookupFieldValue<string>(product.GetAttributeValue<EntityReference>("extreme_area"), "extreme_name", service) ?? "";
            var anVATCode = GetLookupFieldValue<string>(product.GetAttributeValue<EntityReference>("extreme_vatgroup"), "extreme_code", service) ?? "";
            var anVat = GetLookupFieldValue<decimal>(product.GetAttributeValue<EntityReference>("extreme_vatgroup"), "extreme_vat", service);

            var anPrice = Price.Get(context);

            return JsonConvert.SerializeObject(new
            {
                procedures = new[]
                {
                    new
                    {
                        procname = "usp_DEVC_AA_CreateIdent",
                        procparams = new
                        {
                            acIdent,
                            acName,
                            acUM,
                            acClassif,
                            acClassif2,
                            anPrice,
                            acVATCode = anVATCode,
                            anVat,
                            acCostDrv = "",
                            acCode = acIdentLong,
                            acType
                        }
                    }
                }
            });
        }

        private string PrepareComposedProductData(Entity parentProduct, IEnumerable<Entity> childProducts, IOrganizationService service, CodeActivityContext context)
        {

            var acIdent = parentProduct.GetAttributeValue<string>("productnumber");
            var acIdentLong = "";
            if (acIdent != null && acIdent.Length > 16)
            {
                acIdentLong = acIdent;
                acIdent = acIdent.Substring(0, 16);
            }
            ShortenedProductID.Set(context, acIdent);

            var acName = parentProduct.GetAttributeValue<string>("name");
            var acUM = GetLookupFieldValue<string>(parentProduct.GetAttributeValue<EntityReference>("defaultuomid"), "name", service)?.Substring(0, 3);
            var acClassif = GetLookupFieldValue<string>(parentProduct.GetAttributeValue<EntityReference>("extreme_technology"), "extreme_name", service) ?? "";
            var acClassif2 = GetLookupFieldValue<string>(parentProduct.GetAttributeValue<EntityReference>("extreme_area"), "extreme_name", service) ?? "";
            var acVATCode = GetLookupFieldValue<string>(parentProduct.GetAttributeValue<EntityReference>("extreme_vatgroup"), "extreme_code", service) ?? "";
            var anVat = GetLookupFieldValue<decimal>(parentProduct.GetAttributeValue<EntityReference>("extreme_vatgroup"), "extreme_vat", service);

            var anPrice = Price.Get(context);

            var acComponentsJSON = childProducts.Select(child => new
            {
                code = child.GetAttributeValue<string>("productnumber"),
                name = child.GetAttributeValue<string>("name"),
                quantity = child.GetAttributeValue<decimal>("extreme_quantityforparent")
            });

            return JsonConvert.SerializeObject(new
            {
                procedures = new[]
                {
                    new
                    {
                        procname = "usp_DEVC_AA_CreateComposedIdent",
                        procparams = new
                        {
                            acIdent,
                            acName,
                            acComponentsJSON,
                            acUM,
                            acClassif,
                            acClassif2,
                            anPrice,
                            acVATCode,
                            anVat
                        }
                    }
                }
            });
        }

        private async Task<string> CallPantheonApi(string token, string jsonData, string execprocendpoint)
        {
            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
                client.DefaultRequestHeaders.Add("Accept", "application/json");

                var content = new StringContent(jsonData, Encoding.UTF8, "application/json");


                var response = await client.PostAsync(execprocendpoint, content);

                response.EnsureSuccessStatusCode();
                return await response.Content.ReadAsStringAsync();
            }
        }

        private T GetLookupFieldValue<T>(EntityReference lookup, string fieldName, IOrganizationService service)
        {
            if (lookup == null)
                return default;

            var entity = service.Retrieve(lookup.LogicalName, lookup.Id, new ColumnSet(fieldName));

            if (entity.Contains(fieldName) && entity[fieldName] is T value)
            {
                return value;
            }

            return default;
        }
    }
}
