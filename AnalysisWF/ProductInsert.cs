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
    public class ProductInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Product")]
        [ReferenceTarget("product")]
        public InArgument<EntityReference> Product { get; set; }

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
                // Preuzimanje Product zapisa
                var productRef = Product.Get(context);
                var product = service.Retrieve("product", productRef.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(true));
                tracingService.Trace("Preuzet Product zapis sa ID: {0}", product.Id);

                // Poziv API-ja za autentifikaciju i pribavljanje tokena
                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();

                // Priprema podataka za slanje
                var jsonData = PrepareProductData(product, service);
                tracingService.Trace("JSON podaci za slanje: {0}", jsonData);

                // Poziv API-ja za slanje Product zapisa
                var responseMessage = CallPantheonApi(token, jsonData).GetAwaiter().GetResult();

                tracingService.Trace("API Response: {0}", responseMessage);

                // Parsiranje odgovora i postavljanje PantheonID-a
                var cleanedResponse = responseMessage.Replace("\r", "").Replace("\n", "");
                string cleanedJson = cleanedResponse.Replace("\"", "\"").Trim('"'); // Uklanjamo spoljašnje navodnike
                tracingService.Trace("Cleaned API Response: {0}", cleanedJson);

                dynamic response = JsonConvert.DeserializeObject(cleanedJson);
                string pantheonId = response.usp_DEVC_AA_CreateIdent_out["@anQId"].ToString();
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                string errorMessage = response.usp_DEVC_AA_CreateIdent_out["@acErrorMessage"].ToString();

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja Product zapisa: {ex.Message}");
            }
        }

        private string PrepareProductData(Entity product, IOrganizationService service)
        {
            var acIdent = product.GetAttributeValue<string>("productnumber");
            var acName = product.GetAttributeValue<string>("name");
            var acUM = GetLookupFieldValue(product.GetAttributeValue<EntityReference>("defaultuomid"), "name", service);
            var acClassif = GetLookupFieldValue(product.GetAttributeValue<EntityReference>("extreme_primaryclassification"), "name", service);
            var acClassif2 = GetLookupFieldValue(product.GetAttributeValue<EntityReference>("extreme_secondaryclassification"), "name", service);

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"procedures\": [");
            sb.Append("{");
            sb.Append("\"procname\": \"usp_DEVC_AA_CreateIdent\",");
            sb.Append("\"procparams\": {");
            sb.AppendFormat("\"acIdent\": \"{0}\",", acIdent);
            sb.AppendFormat("\"acName\": \"{0}\",", acName);
            sb.AppendFormat("\"acUM\": \"{0}\",", acUM);
            sb.AppendFormat("\"acClassif\": \"{0}\",", acClassif);
            sb.AppendFormat("\"acClassif2\": \"{0}\",", acClassif2);
            sb.AppendFormat("\"anPrice\": {0},", 1300.22); // Hardkodovana vrednost cene kao primer
            sb.AppendFormat("\"acVATCode\": \"{0}\",", "NN");
            sb.AppendFormat("\"anVat\": \"{0}\",", "0");
            sb.AppendFormat("\"acCostDrv\": \"{0}\"", "");
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

        private string GetLookupFieldValue(EntityReference lookup, string fieldName, IOrganizationService service)
        {
            if (lookup == null)
                return string.Empty;

            var entity = service.Retrieve(lookup.LogicalName, lookup.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(fieldName));
            return entity.GetAttributeValue<string>(fieldName);
        }
    }
}
