using System;
using System.Activities;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Workflow;
using Newtonsoft.Json;

namespace AnalysisWF
{
    public class UomInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Unit of Measure")]
        [ReferenceTarget("uom")]
        public InArgument<EntityReference> UnitOfMeasure { get; set; }

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
                // Preuzimanje UoM zapisa
                var uomRef = UnitOfMeasure.Get(context);
                var uom = service.Retrieve("uom", uomRef.Id, new ColumnSet("name"));
                tracingService.Trace("Preuzet UoM zapis sa ID: {0}", uom.Id);

                // Priprema podataka za slanje
                var jsonData = PrepareUomData(uom);
                tracingService.Trace("JSON podaci za slanje: {0}", jsonData);

                // Poziv API-ja za slanje UoM zapisa
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
                var responseOut = JsonConvert.DeserializeObject<Dictionary<string, object>>(response["usp_DEVC_AA_CreateUM_out"].ToString());
                string pantheonId = responseOut.ContainsKey("@anQId") ? responseOut["@anQId"].ToString() : string.Empty;
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                string errorMessage = responseOut.ContainsKey("@acErrorMessage") ? responseOut["@acErrorMessage"].ToString() : string.Empty;

                if (!string.IsNullOrEmpty(errorMessage))
                {
                    throw new Exception($"Pantheon API Error: {errorMessage}");
                }

                PantheonID.Set(context, pantheonId);

                // Update UoM record with sync details
                uom["extreme_synchronized"] = true;
                uom["extreme_lastsyncresponse"] = formattedJson;
                uom["extreme_lastsyncdate"] = DateTime.UtcNow;
                uom["extreme_pantheonid"] = pantheonId;
                service.Update(uom);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja UoM zapisa: {ex.Message}");
            }
        }

        private string PrepareUomData(Entity uom)
        {
            var uomName = uom.GetAttributeValue<string>("name");
            if (uomName.Length > 3)
            {
                uomName = uomName.Substring(0, 3);
            }
            

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"procedures\": [");
            sb.Append("{");
            sb.Append("\"procname\": \"usp_DEVC_AA_CreateUM\",");
            sb.Append("\"procparams\": {");
            sb.AppendFormat("\"acUM\": \"{0}\",", uomName);
            sb.AppendFormat("\"acName\": \"{0}\"", uomName);
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
