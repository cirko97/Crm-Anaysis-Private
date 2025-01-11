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

        [Output("PantheonNo")]
        public OutArgument<string> PantheonNo { get; set; }

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
                var responseMessage = CallPantheonApi(token, jsonData, execprocendpoint).GetAwaiter().GetResult();

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
                string pantheonNo = response.usp_DEVC_AA_CreateOrder_out["@acKeyView"].ToString();
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                string errorMessage = response.usp_DEVC_AA_CreateOrder_out["@acErrorMessage"].ToString();

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);
                PantheonNo.Set(context, pantheonNo);
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
            var anDaysForPayment = Helper.GetLookupFieldValue(quote.GetAttributeValue<EntityReference>("extreme_paymentterms"), "extreme_numberofdays", service);
            var anDaysForDelivery = Helper.GetLookupFieldValue(quote.GetAttributeValue<EntityReference>("extreme_deliverymethod"), "extreme_numberofdays", service);
            // Calculate number of days between effectivefrom and effectiveto
            var effectiveFrom = quote.GetAttributeValue<DateTime?>("effectivefrom");
            var effectiveTo = quote.GetAttributeValue<DateTime?>("effectiveto");
            int anDaysForValid = 0;
            if (effectiveFrom.HasValue && effectiveTo.HasValue)
            {
                anDaysForValid = (effectiveTo.Value - effectiveFrom.Value).Days;
            }
            var acNote = quote.GetAttributeValue<string>("extreme_detailedprintoutdescription") ?? "";
            var acPayMethod = Helper.GetLookupFieldValue(quote.GetAttributeValue<EntityReference>("extreme_paymentterms"), "extreme_code", service);
            var acDelivery = Helper.GetLookupFieldValue(quote.GetAttributeValue<EntityReference>("extreme_deliverymethod"), "extreme_code", service);

            // Retrieve child QuoteDetail records
            var query = new QueryExpression("quotedetail")
            {
                ColumnSet = new ColumnSet("productid", "quantity", "priceperunit", "extreme_fullpricewithdiscount", "uomid", "extreme_discount", "extreme_productdescription", "extreme_vatgroup", "extreme_parentquoteline", "extreme_isparentitem"),
                Criteria = new FilterExpression()
            };
            query.Criteria.AddCondition("quoteid", ConditionOperator.Equal, quote.Id);

            var quoteDetails = service.RetrieveMultiple(query);
            var lineItems = new List<object>();
            var groupedDetails = new Dictionary<Guid, List<Entity>>();

            foreach (var detail in quoteDetails.Entities)
            {
                var parentQuoteLine = detail.GetAttributeValue<EntityReference>("extreme_parentquoteline");
                if (parentQuoteLine != null)
                {
                    if (!groupedDetails.ContainsKey(parentQuoteLine.Id))
                    {
                        groupedDetails[parentQuoteLine.Id] = new List<Entity>();
                    }
                    groupedDetails[parentQuoteLine.Id].Add(detail);
                    continue;
                }
                var isParent = detail.GetAttributeValue<bool>("extreme_isparentitem");
                if (isParent)
                {
                    continue;
                }

                var product = Helper.GetLookupFieldValue(detail.GetAttributeValue<EntityReference>("productid"), "extreme_productid16characters", service);
                var name = detail.GetAttributeValue<string>("quotedetailname");
                var quantity = detail.GetAttributeValue<decimal>("quantity");
                var salesPPU = detail.GetAttributeValue<Money>("priceperunit")?.Value;
                var discountPerc = detail.GetAttributeValue<decimal>("extreme_discount");
                //var salesPPUwDisc = salesPPU - (salesPPU * discountPerc);
                var uom = detail.GetAttributeValue<EntityReference>("uomid")?.Name;
                var note = detail.GetAttributeValue<string>("extreme_productdescription") ?? "";
                var vatCode = Helper.GetLookupFieldValue(detail.GetAttributeValue<EntityReference>("extreme_vatgroup"), "extreme_code", service);

                lineItems.Add(new
                {
                    acIdent = product,
                    acName = name,
                    anQty = quantity,
                    acUM = uom,
                    anPrice = salesPPU,
                    anRebate1 = discountPerc,
                    acNote = note,
                    acCostDrv = acCostDrive,
                    acVatCode = vatCode,
                    adDeliveryDeadline = ""
                });
            }

            foreach (var parent in quoteDetails.Entities.Where(e => e.GetAttributeValue<bool>("extreme_isparentitem")))
            {
                if (!groupedDetails.ContainsKey(parent.Id)) continue;

                var product = Helper.GetLookupFieldValue(parent.GetAttributeValue<EntityReference>("productid"), "extreme_productid16characters", service);
                var name = parent.GetAttributeValue<string>("quotedetailname");
                var uom = parent.GetAttributeValue<EntityReference>("uomid")?.Name;
                var note = parent.GetAttributeValue<string>("extreme_productdescription") ?? "";
                var vatCode = Helper.GetLookupFieldValue(parent.GetAttributeValue<EntityReference>("extreme_vatgroup"), "extreme_code", service);
                var childDetails = groupedDetails[parent.Id];
                var totalPPU = childDetails.Sum(c => c.GetAttributeValue<Money>("priceperunit")?.Value * c.GetAttributeValue<decimal>("quantity") ?? 0);
                var totalAmount = childDetails.Sum(c => c.GetAttributeValue<decimal>("extreme_fullpricewithdiscount"));
                var discountPerc = (totalPPU - totalAmount) / totalPPU * 100;

                lineItems.Add(new
                {
                    acIdent = product,
                    acName = name,
                    anQty = 1,
                    acUM = uom,
                    anPrice = totalPPU,
                    anRebate1 = discountPerc,
                    acNote = note,
                    acCostDrv = acCostDrive,
                    acVatCode = vatCode,
                    adDeliveryDeadline = ""
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
                            anDaysForValid,
                            anDaysForPayment,
                            adDeliveryDate,
                            anDaysForDelivery,
                            acPayMethod,
                            acDelivery,
                            acNote,
                            acLinesJSON = lineItems
                        }
                    }
                }
            };

            return JsonConvert.SerializeObject(data);
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
