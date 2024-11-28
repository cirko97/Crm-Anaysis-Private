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
    public class PaymentMethodInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Payment Term")]
        [ReferenceTarget("extreme_paymentterms")]
        public InArgument<EntityReference> PaymentTerm { get; set; }

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
                // Preuzimanje Payment Term zapisa
                var paymentTermRef = PaymentTerm.Get(context);
                var paymentTerm = service.Retrieve("extreme_paymentterms", paymentTermRef.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(true));
                tracingService.Trace("Preuzet Payment Term zapis sa ID: {0}", paymentTerm.Id);

                // Poziv API-ja za autentifikaciju i pribavljanje tokena
                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();

                // Priprema podataka za slanje
                var jsonData = PreparePaymentMethodData(paymentTerm);
                tracingService.Trace("JSON podaci za slanje: {0}", jsonData);

                // Poziv API-ja za slanje Payment Method zapisa
                var responseMessage = CallPantheonApi(token, jsonData).GetAwaiter().GetResult();

                tracingService.Trace("API Response: {0}", responseMessage);

                // Parsiranje odgovora i postavljanje PantheonID-a
                var cleanedResponse = responseMessage.Replace("\r", "").Replace("\n", "");
                string cleanedJson = cleanedResponse.Replace("\"", "\"").Trim('"'); // Uklanjamo spoljašnje navodnike
                tracingService.Trace("Cleaned API Response: {0}", cleanedJson);

                dynamic response = JsonConvert.DeserializeObject(cleanedJson);
                string pantheonId = response.usp_DEVC_AA_CreatePayMet_out["@anQId"].ToString();
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                string errorMessage = response.usp_DEVC_AA_CreatePayMet_out["@acErrorMessage"].ToString();

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja Payment Method zapisa: {ex.Message}");
            }
        }

        private string PreparePaymentMethodData(Entity paymentTerm)
        {
            var acPayMethod = paymentTerm.GetAttributeValue<string>("extreme_code");
            var acName = paymentTerm.GetAttributeValue<string>("extreme_name");

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"procedures\": [");
            sb.Append("{");
            sb.Append("\"procname\": \"usp_DEVC_AA_CreatePayMet\",");
            sb.Append("\"procparams\": {");
            sb.AppendFormat("\"acPayMethod\": \"{0}\",", acPayMethod);
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
