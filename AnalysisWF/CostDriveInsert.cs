using System;
using System.Activities;
using System.Linq;
using System.Net.Http;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Workflow;
using Newtonsoft.Json;

namespace AnalysisWF
{
    public class CostDriveInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Opportunity")]
        [ReferenceTarget("opportunity")]
        public InArgument<EntityReference> Opportunity { get; set; }

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
                // Preuzimanje Opportunity zapisa
                var opportunityRef = Opportunity.Get(context);
                var opportunity = service.Retrieve("opportunity", opportunityRef.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(true));
                tracingService.Trace("Preuzet Opportunity zapis sa ID: {0}", opportunity.Id);

                // Poziv API-ja za autentifikaciju i pribavljanje tokena
                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();

                // Priprema podataka za slanje
                var jsonData = PrepareCostDriveData(opportunity, service);
                tracingService.Trace("JSON podaci za slanje: {0}", jsonData);

                // Poziv API-ja za slanje CostDrive zapisa
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
                string pantheonId = response.usp_DEVC_AA_CreateCostDrv_out["@anQId"].ToString();
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                string errorMessage = response.usp_DEVC_AA_CreateCostDrv_out["@acErrorMessage"].ToString();

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja CostDrive zapisa: {ex.Message}");
            }
        }

        private string PrepareCostDriveData(Entity opportunity, IOrganizationService service)
        {
            var acCostDrv = opportunity.GetAttributeValue<string>("extreme_costprofitcentercode");
            var acName = opportunity.GetAttributeValue<string>("name");
            var acConsignee = "";
            var acConsigneeSynced = (bool)Helper.GetLookupFieldValue(opportunity.GetAttributeValue<EntityReference>("customerid"), "extreme_synchronized", service);

            if (acConsigneeSynced)
            {
                acConsignee = (string)Helper.GetLookupFieldValue(opportunity.GetAttributeValue<EntityReference>("customerid"), "name", service);
            }

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"procedures\": [");
            sb.Append("{");
            sb.Append("\"procname\": \"usp_DEVC_AA_CreateCostDrv\",");
            sb.Append("\"procparams\": {");
            sb.AppendFormat("\"acCostDrv\": \"{0}\",", acCostDrv);
            sb.AppendFormat("\"acName\": \"{0}\",", acName);
            sb.AppendFormat("\"acClassif\": \"{0}\",", "");
            sb.AppendFormat("\"acConsignee\": \"{0}\",", acConsignee);
            sb.AppendFormat("\"acDept\": \"{0}\"", "");
            sb.Append("}");
            sb.Append("}");
            sb.Append("]");
            sb.Append("}");

            return sb.ToString();
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
