using System;
using System.Activities;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Workflow;
using Newtonsoft.Json;

namespace AnalysisWF
{
    public class GetIdent : CodeActivity
    {
        #region Input Properties
        [RequiredArgument]
        [Input("Product ID")]
        public InArgument<string> ProductID { get; set; }
        #endregion

        #region Output Properties

        [Output("API Response")]
        public OutArgument<string> ApiResponse { get; set; }
        #endregion
        protected override void Execute(CodeActivityContext context)
        {
            var tracingService = context.GetExtension<ITracingService>();
            var serviceFactory = context.GetExtension<IOrganizationServiceFactory>();
            var service = serviceFactory.CreateOrganizationService(null);

            try
            {
                var productId = ProductID.Get(context);
                if (string.IsNullOrEmpty(productId))
                {
                    throw new InvalidPluginExecutionException("Product ID cannot be null or empty.");
                }

                // 🔹 Get the quotedetail record GUID from the workflow execution context
                var target = context.GetExtension<IWorkflowContext>().PrimaryEntityId;
                tracingService.Trace("Quotedetail Record ID: {0}", target);

                var execprocendpoint = Helper.GetConfigurationValue("PAWS_IDENTRETRIEVE", service);
                var jsonData = PrepareRequestBody(productId);

                tracingService.Trace("Sending request to Pantheon API: {0}", jsonData);

                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();
                var responseMessage = CallPantheonApi(token, jsonData, execprocendpoint).GetAwaiter().GetResult();

                tracingService.Trace("API Response: {0}", responseMessage);

                // Parse response
                var cleanedResponse = responseMessage.Replace("\\r", "").Replace("\\n", "").Trim();
                ApiResponse.Set(context, cleanedResponse);

                var parsedResponse = JsonConvert.DeserializeObject<List<dynamic>>(cleanedResponse);
                if (parsedResponse == null || parsedResponse.Count == 0)
                {
                    throw new InvalidPluginExecutionException($"No product found for Product ID: {productId}");
                }

                var productData = parsedResponse.First();
                tracingService.Trace("Parsed Product Data: {0}", JsonConvert.SerializeObject(productData, Formatting.Indented));

                // 🔹 Store API response in the quotedetail entity
                var quotedetailRef = new Entity("quotedetail", target); // Now correctly referencing the quotedetail record
                quotedetailRef["extreme_apiresponse"] = cleanedResponse;  // Ensure this field exists in CRM

                service.Update(quotedetailRef);
                tracingService.Trace("Updated quotedetail record with API response.");
            }
            catch (Exception ex)
            {
                tracingService.Trace("Error: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Error while retrieving Product Ident: {ex.Message}");
            }
        }

        private string PrepareRequestBody(string productId)
        {
            return JsonConvert.SerializeObject(new
            {
                start = 0,
                length = 0,
                fieldsToReturn = "items.acIdent, max(items.acName) as acName, sum(tHE_Stock.anStock - tHE_Stock.anReserved) as anStock, max(items.anPrice) as anPrice, max(items.acUM) as acUM, max(items.acVATCode) as acVATCode, max(items.acCostDrv) as acCostDrv, max(acClassif) as acClassif, max(acClassif2) as acClassif2, max(acSetOfItem) as acSetOfItem, max(items.acSupplier) as acSupplier",
                tableFKs = new[]
                {
                    new { table = "tHE_SetProdSt", join = "AcSetProdSt.acIdent = items.acIdent", alias = "AcSetProdSt", fieldsToReturn = "acIdentchild, anNo, anQty" },
                    new { table = "tHE_Stock", join = "tHE_Stock.acIdent = items.acIdent", alias = "tHE_Stock", fieldsToReturn = "acWarehouse, anStock, anReserved" },
                    new { table = "tHE_SetItemExtItemSubj", join = "tHE_SetItemExtItemSubj.acIdent = items.acIdent", alias = "tHE_SetItemExtItemSubj", fieldsToReturn = "acSubject, acCode, acType, acDefault" }
                },
                customConditions = new
                {
                    condition = "items.acIdent like @param1 group by items.acIdent",
                    @params = new[] { $"{productId}" }
                },
                sortColumn = "items.acIdent",
                sortOrder = "items.acIdent",
                WithSubSelects = 1,
                tempTables = new string[] { }
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
    }
}
