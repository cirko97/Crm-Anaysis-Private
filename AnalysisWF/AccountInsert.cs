using System;
using System.Activities;
using System.Activities.Expressions;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Workflow;
using Newtonsoft.Json;

namespace AnalysisWF
{
    public class AccountInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Account")]
        [ReferenceTarget("account")]
        public InArgument<EntityReference> Account { get; set; }

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
            var execprocendpoint = Helper.GetConfigurationValue("PAWS_EXECPROCENDPOINT", service);

            try
            {
                // Preuzimanje Account zapisa
                var accountRef = Account.Get(context);
                var account = service.Retrieve("account", accountRef.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(true));
                tracingService.Trace("Preuzet Account zapis sa ID: {0}", account.Id);

                // Poziv API-ja za autentifikaciju i pribavljanje tokena
                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();

                // Priprema podataka za slanje
                var jsonData = PrepareAccountData(account, service);
                tracingService.Trace("JSON podaci za slanje: {0}", jsonData);

                // Poziv API-ja za slanje Account zapisa
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
                string pantheonId = response.usp_DEVC_AA_CreateSubject_out["@anQId"].ToString();
                tracingService.Trace("Pantheon ID: {0}", pantheonId);
                
                string errorMessage = response.usp_DEVC_AA_CreateSubject_out["@acErrorMessage"].ToString();

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja Account zapisa: {ex.Message}");
            }
        }

        private string PrepareAccountData(Entity account, IOrganizationService service)
        {
            var acBuyer = account.GetAttributeValue<OptionSetValue>("extreme_relationshiptypeext")?.Value == 424000001 ? "T" : "F";
            var acSupplier = account.GetAttributeValue<OptionSetValue>("extreme_relationshiptypeext")?.Value == 424000000 ? "T" : "F";
            var acWayOfSale = account.GetAttributeValue<decimal>("extreme_tax") == 20 ? "Z" : "I";
            var acCurrency = Helper.GetLookupFieldValue(account.GetAttributeValue<EntityReference>("transactioncurrencyid"), "isocurrencycode", service);
            var acPost = Helper.GetLookupFieldValue(account.GetAttributeValue<EntityReference>("extreme_postalcode"), "extreme_postalcode", service);

            // Read configuration that indicates which field to sync VAT into (expected values: "acPin" or "acCode")
            string vatSyncSchema;
            try
            {
                vatSyncSchema = Helper.GetConfigurationValue("vatSyncSchema", service);
            }
            catch
            {
                // If config missing or unreadable, default to acPin to preserve previous behavior
                vatSyncSchema = "acCode";
            }

            var vatNumber = account.GetAttributeValue<string>("extreme_vatnumber") ?? string.Empty;

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"procedures\": [");
            sb.Append("{");
            sb.Append("\"procname\": \"usp_DEVC_AA_CreateSubject\",");
            sb.Append("\"procparams\": {");
            sb.AppendFormat("\"acSubject\": \"{0}\",", account.GetAttributeValue<string>("extreme_paname30characters"));
            sb.AppendFormat("\"acName2\": \"{0}\",", account.GetAttributeValue<string>("name"));
            sb.AppendFormat("\"acAddress\": \"{0}\",", account.GetAttributeValue<string>("address1_line1"));
            sb.AppendFormat("\"acEmail\": \"{0}\",", account.GetAttributeValue<string>("emailaddress1"));
            sb.AppendFormat("\"acPhone\": \"{0}\",", account.GetAttributeValue<string>("telephone1"));
            sb.AppendFormat("\"acPost\": \"{0}\",", acPost);
            sb.AppendFormat("\"acCity\": \"{0}\",", account.GetAttributeValue<string>("extreme_city"));
            sb.AppendFormat("\"acCountry\": \"{0}\",", account.GetAttributeValue<string>("extreme_country"));
            // Conditionally populate either acCode or acPin based on configuration value
            if (string.Equals(vatSyncSchema, "acCode", StringComparison.OrdinalIgnoreCase))
            {
                sb.AppendFormat("\"acCode\": \"{0}\",", vatNumber);
            }
            else
            {
                sb.AppendFormat("\"acPin\": \"{0}\",", vatNumber);
            }

            sb.AppendFormat("\"acRegNo\": \"{0}\",", account.GetAttributeValue<string>("extreme_registrationnumber"));
            sb.AppendFormat("\"acBuyer\": \"{0}\",", acBuyer);
            sb.AppendFormat("\"acSupplier\": \"{0}\",", acSupplier);
            sb.AppendFormat("\"acWayOfSale\": \"{0}\",", acWayOfSale);
            sb.AppendFormat("\"acCurrency\": \"{0}\",", acCurrency);
            sb.Append("\"acSuppSaleMet\": \"D\",");
            sb.AppendFormat("\"acSuppCurr\": \"{0}\"", acCurrency);
            sb.Append("}");
            sb.Append("}");
            sb.Append("]");
            sb.Append("}");

            return sb.ToString();
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
