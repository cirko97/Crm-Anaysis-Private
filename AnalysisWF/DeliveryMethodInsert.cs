using System;
using System.Activities;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Workflow;
using Newtonsoft.Json;

namespace AnalysisWF
{
    public class DeliveryMethodInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Delivery Method")]
        [ReferenceTarget("extreme_deliverymethod")]
        public InArgument<EntityReference> DeliveryMethod { get; set; }

        #endregion

        #region Output Properties

        [Output("PantheonID")]
        public OutArgument<string> PantheonID { get; set; }

        #endregion

        protected override void Execute(CodeActivityContext context)
        {
            var tracingService = context.GetExtension<ITracingService>();
            var serviceFactory = context.GetExtension<IOrganizationServiceFactory>();
            var service = serviceFactory.CreateOrganizationService(null);

            try
            {
                // Preuzimanje Delivery Method zapisa
                var deliveryMethodRef = DeliveryMethod.Get(context);
                var deliveryMethod = service.Retrieve("extreme_deliverymethod", deliveryMethodRef.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(true));
                tracingService.Trace("Preuzet Delivery Method zapis sa ID: {0}", deliveryMethod.Id);

                // Poziv API-ja za autentifikaciju i pribavljanje tokena
                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();

                // Priprema podataka za slanje
                var jsonData = PrepareDeliveryMethodData(deliveryMethod);
                tracingService.Trace("JSON podaci za slanje: {0}", jsonData);

                // Poziv API-ja za slanje Delivery Method zapisa
                var responseMessage = CallPantheonApi(token, jsonData).GetAwaiter().GetResult();

                tracingService.Trace("API Response: {0}", responseMessage);

                // Parsiranje odgovora i postavljanje PantheonID-a
                var cleanedResponse = responseMessage.Replace("\r", "").Replace("\n", "");
                string cleanedJson = cleanedResponse.Replace("\"", "\"").Trim('"'); // Uklanjamo spoljašnje navodnike
                tracingService.Trace("Cleaned API Response: {0}", cleanedJson);

                dynamic response = JsonConvert.DeserializeObject(cleanedJson);
                string pantheonId = response.usp_DEVC_AA_CreateDelMet_out["@anQId"].ToString();
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                string errorMessage = response.usp_DEVC_AA_CreateDelMet_out["@acErrorMessage"].ToString();

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja Delivery Method zapisa: {ex.Message}");
            }
        }

        private string PrepareDeliveryMethodData(Entity deliveryMethod)
        {
            var acDelivery = deliveryMethod.GetAttributeValue<string>("extreme_id");
            var acName = deliveryMethod.GetAttributeValue<string>("extreme_name");

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"procedures\": [");
            sb.Append("{");
            sb.Append("\"procname\": \"usp_DEVC_AA_CreateDelMet\",");
            sb.Append("\"procparams\": {");
            sb.AppendFormat("\"acDelivery\": \"{0}\",", acDelivery);
            sb.AppendFormat("\"acName\": \"{0}\"", acName);
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
