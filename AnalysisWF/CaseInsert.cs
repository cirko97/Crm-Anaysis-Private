using System;
using System.Activities;
using System.Activities.Expressions;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Workflow;
using Newtonsoft.Json;

namespace AnalysisWF
{
    public class CaseInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Case")]
        [ReferenceTarget("extreme_case")]
        public InArgument<EntityReference> Case { get; set; }

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
                // Retrieve Case record
                var caseRef = Case.Get(context);
                var caseRecord = service.Retrieve("extreme_case", caseRef.Id, new ColumnSet(true));
                tracingService.Trace("Retrieved Case record with ID: {0}", caseRecord.Id);

                var caseType = caseRecord.GetAttributeValue<OptionSetValue>("extreme_casetype")?.Value;
                var isWarrantyService = caseType == 2;


                // Retrieve Pantheon Document Type from extreme_configuration
                var configQuery = new QueryExpression("extreme_configuration")
                {
                    ColumnSet = new ColumnSet("extreme_value")
                };

                if (isWarrantyService)
                {
                    configQuery.Criteria.AddCondition("extreme_key", ConditionOperator.Equal, "PA_SRWARR_DOC_TYPE");
                }
                else
                {
                    configQuery.Criteria.AddCondition("extreme_key", ConditionOperator.Equal, "PA_SRNOWARR_DOC_TYPE");
                }

                var configResult = service.RetrieveMultiple(configQuery);
                if (configResult.Entities.Count == 0)
                {
                    throw new InvalidPluginExecutionException("Configuration with key 'PA_***_DOC_TYPE' not found.");
                }
                var pantheonDocType = configResult.Entities[0].GetAttributeValue<string>("extreme_value");

                // Prepare data for submission
                var jsonData = PrepareCaseData(caseRecord, pantheonDocType, service); 
                tracingService.Trace("JSON data for submission: {0}", jsonData);

                // Call Pantheon API
                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();
                var responseMessage = CallPantheonApi(token, jsonData, execprocendpoint).GetAwaiter().GetResult();

                tracingService.Trace("API Response: {0}", responseMessage);

                // Parse response and set output parameters
                var cleanedResponse = responseMessage.Replace("\\r", "").Replace("\\n", "");
                string cleanedJson = cleanedResponse.Replace("\\\"", "\"").Trim('"');
                tracingService.Trace("Cleaned API Response: {0}", cleanedJson);

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
                tracingService.Trace("Error: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Error while sending Case record: {ex.Message}");
            }
        }

        private string PrepareCaseData(Entity caseRecord, string pantheonDocType, IOrganizationService service)
        {
            var acDocType = pantheonDocType;
            var acCrmNO = caseRecord.GetAttributeValue<string>("extreme_casenumber");
            var anNoteClerk = Helper.GetLookupFieldValue(caseRecord.GetAttributeValue<EntityReference>("ownerid"), "extreme_pantheonid", service);
            var anClerk = Helper.GetLookupFieldValue(caseRecord.GetAttributeValue<EntityReference>("ownerid"), "extreme_pantheonid", service);
            var adDate = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var adDeliveryDate = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var acReceiver = Helper.GetLookupFieldValue(caseRecord.GetAttributeValue<EntityReference>("extreme_account"), "extreme_paname30characters", service);
            var acCurrency = caseRecord.GetAttributeValue<EntityReference>("transactioncurrencyid")?.Name;
            var acNote = caseRecord.GetAttributeValue<string>("extreme_description") ?? "";
            var acPayMethod = Helper.GetLookupFieldValue(caseRecord.GetAttributeValue<EntityReference>("extreme_paymentterms"), "extreme_code", service);
            var acDelivery = Helper.GetLookupFieldValue(caseRecord.GetAttributeValue<EntityReference>("extreme_deliverymethod"), "extreme_code", service);
            var anDaysForPayment = Helper.GetLookupFieldValue(caseRecord.GetAttributeValue<EntityReference>("extreme_paymentterms"), "extreme_numberofdays", service);
            var anDaysForDelivery = Helper.GetLookupFieldValue(caseRecord.GetAttributeValue<EntityReference>("extreme_deliverymethod"), "extreme_numberofdays", service);
            var acStatement = Helper.GetLookupFieldValue(caseRecord.GetAttributeValue<EntityReference>("extreme_statement"), "extreme_id", service);

            // Retrieve child Case Details records
            var query = new QueryExpression("extreme_caseline")
            {
                ColumnSet = new ColumnSet("extreme_product", "extreme_quantity", "extreme_unit"),
                Criteria = new FilterExpression()
            };
            query.Criteria.AddCondition("extreme_case", ConditionOperator.Equal, caseRecord.Id);

            var caseDetails = service.RetrieveMultiple(query);
            var lineItems = caseDetails.Entities.Select(detail => new
            {
                acIdent = Helper.GetLookupFieldValue(detail.GetAttributeValue<EntityReference>("extreme_product"), "extreme_productid16characters", service),
                acName = detail.GetAttributeValue<EntityReference>("extreme_product")?.Name,
                anQty = detail.GetAttributeValue<decimal>("extreme_quantity"),
                acUM = detail.GetAttributeValue<EntityReference>("extreme_unit")?.Name,
                anPrice = 0,
                acCostDrv = "",
                acVatCode = "",
                anRebate1 = 0,
                acNote = "",
                adDeliveryDeadline = ""
            }).ToList();

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
                            anDaysForValid = "1",
                            anDaysForPayment,
                            anDaysForDelivery,
                            adDeliveryDate,
                            acPayMethod,
                            acDelivery,
                            acStatement,
                            acNote,
                            anNoteClerk,
                            anClerk,
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
