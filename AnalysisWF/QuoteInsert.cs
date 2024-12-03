using System;
using System.Activities;
using System.Collections.Generic;
using System.Globalization;
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
    public class QuoteInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Quote")]
        [ReferenceTarget("quote")]
        public InArgument<EntityReference> Quote { get; set; }

        #endregion

        #region Output Properties

        [Output("PantheonID")]
        public OutArgument<string> PantheonID { get; set; }

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
                // Preuzimanje Quote zapisa
                var quoteRef = Quote.Get(context);
                // Retrieve Pantheon Document Type from extreme_configuration
                var configQuery = new QueryExpression("extreme_configuration")
                {
                    ColumnSet = new ColumnSet("extreme_value")
                };
                configQuery.Criteria.AddCondition("extreme_key", ConditionOperator.Equal, "PA_DOC_TYPE");
                var configResult = service.RetrieveMultiple(configQuery);
                if (configResult.Entities.Count == 0)
                {
                    throw new InvalidPluginExecutionException("Configuration with key 'PA_DOC_TYPE' not found.");
                }
                var pantheonDocType = configResult.Entities[0].GetAttributeValue<string>("extreme_value");
                var quote = service.Retrieve("quote", quoteRef.Id, new ColumnSet(true));
                tracingService.Trace("Preuzet Quote zapis sa ID: {0}", quote.Id);

                // Priprema podataka za slanje
                var jsonData = PrepareQuoteData(quote, pantheonDocType, service);
                tracingService.Trace("JSON podaci za slanje: {0}", jsonData);

                // Poziv API-ja za slanje Quote zapisa
                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();
                var responseMessage = CallPantheonApi(token, jsonData).GetAwaiter().GetResult();

                tracingService.Trace("API Response: {0}", responseMessage);

                // Parsiranje odgovora i postavljanje PantheonID-a
                var cleanedResponse = responseMessage.Replace("\\r", "").Replace("\\n", "");
                string cleanedJson = cleanedResponse.Replace("\\\"", "\"").Trim('\"'); // Uklanjamo spoljašnje navodnike
                tracingService.Trace("Cleaned API Response: {0}", cleanedJson);

                // Set output parameter for the full API response
                string formattedJson = JsonConvert.SerializeObject(JsonConvert.DeserializeObject(cleanedJson), Formatting.Indented);
                ApiResponse.Set(context, formattedJson);

                dynamic response = JsonConvert.DeserializeObject(cleanedJson);
                string pantheonId = response.usp_DEVC_AA_CreateOrder_out["@anQId"].ToString();
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                string errorMessage = response.usp_DEVC_AA_CreateOrder_out["@acErrorMessage"].ToString();

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja Quote zapisa: {ex.Message}");
            }
        }

        private string PrepareQuoteData(Entity quote, string pantheonDocType, IOrganizationService service)
        {
            var acDocType = pantheonDocType;
            var acCrmNO = quote.GetAttributeValue<string>("quotenumber");
            var revisionNumber = quote.GetAttributeValue<int>("revisionnumber");
            if (revisionNumber > 0)
            {
                acCrmNO = $"{acCrmNO}/{revisionNumber}";
            }
            var adDate = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var adDeliveryDate = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var acReceiver = quote.GetAttributeValue<EntityReference>("customerid")?.Name;
            var acCurrency = quote.GetAttributeValue<EntityReference>("transactioncurrencyid")?.Name;
            var acCostDrive = Helper.GetLookupFieldValue(quote.GetAttributeValue<EntityReference>("opportunityid"), "extreme_costprofitcentercode", service);

            // Retrieve child QuoteDetail records
            var query = new QueryExpression("quotedetail")
            {
                ColumnSet = new ColumnSet("productid", "quantity", "priceperunit", "uomid"),
                Criteria = new FilterExpression()
            };
            query.Criteria.AddCondition("quoteid", ConditionOperator.Equal, quote.Id);

            var quoteDetails = service.RetrieveMultiple(query);
            var lineItems = new List<object>();

            foreach (var detail in quoteDetails.Entities)
            {
                var product = Helper.GetLookupFieldValue(detail.GetAttributeValue<EntityReference>("productid"), "extreme_productid16characters", service);
                var quantity = detail.GetAttributeValue<decimal>("quantity");
                var salesPPU = detail.GetAttributeValue<Money>("priceperunit")?.Value;
                var discountPerc = detail.GetAttributeValue<decimal>("extreme_discount") / 100;
                var salesPPUwDisc = salesPPU - (salesPPU * discountPerc);
                var uom = detail.GetAttributeValue<EntityReference>("uomid")?.Name;

                lineItems.Add(new
                {
                    acIdent = product,
                    anQty = quantity,
                    acUM = uom,
                    anPrice = salesPPUwDisc,
                    acCostDrv = acCostDrive,
                    acVatCode = "NN"
                });
            }

            var data = new
            {
                procedures = new[]
                {
                    new
                    {
                        procname = "usp_DEVC_AA_CreateOrder",
                        procparams = new
                        {
                            acDocType,
                            acCrmNO,
                            adDate,
                            acReceiver,
                            acCurrency,
                            anFXRate = "1",
                            anDaysForValid = "14",
                            anDaysForPayment = "21",
                            adDeliveryDate,
                            anDaysForDelivery = "28",
                            acStatement = "",
                            acLinesJSON = lineItems
                        }
                    }
                }
            };

            return JsonConvert.SerializeObject(data);
        }

        private async Task<string> CallPantheonApi(string token, string jsonData)
        {
            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
                client.DefaultRequestHeaders.Add("Accept", "application/json");

                var content = new StringContent(jsonData, Encoding.UTF8, "application/json");
                var response = await client.PostAsync("https://paws.telekom.si/api/DBObjects/execproc", content);

                response.EnsureSuccessStatusCode();
                return await response.Content.ReadAsStringAsync();
            }
        }
    }
}
