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
    public class ClassifAreaInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Area")]
        [ReferenceTarget("extreme_area")]
        public InArgument<EntityReference> Area { get; set; }

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
                // Retrieve Area record
                var areaRef = Area.Get(context);
                if (areaRef == null)
                {
                    throw new InvalidPluginExecutionException("Area must be provided.");
                }

                var area = service.Retrieve("extreme_area", areaRef.Id, new ColumnSet("extreme_name"));
                tracingService.Trace("Preuzet Area zapis sa ID: {0}", area.Id);

                var jsonData = PrepareClassifData(area, "P");
                tracingService.Trace("JSON podaci za slanje (Area): {0}", jsonData);

                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();
                var responseMessage = CallPantheonApi(token, jsonData).GetAwaiter().GetResult();
                tracingService.Trace("API Response (Area): {0}", responseMessage);

                // Parsiranje odgovora i postavljanje PantheonID-a
                var cleanedResponse = responseMessage.Replace("\\r", "").Replace("\\n", "");
                string cleanedJson = cleanedResponse.Replace("\\\"", "\"").Trim('\"'); // Uklanjamo spoljašnje navodnike
                tracingService.Trace("Cleaned API Response: {0}", cleanedJson);

                // Set output parameter for the full API response
                string formattedJson = JsonConvert.SerializeObject(JsonConvert.DeserializeObject(cleanedJson), Formatting.Indented);
                ApiResponse.Set(context, formattedJson);

                dynamic response = JsonConvert.DeserializeObject(cleanedJson);
                var responseOut = JsonConvert.DeserializeObject<Dictionary<string, object>>(response["usp_DEVC_AA_CreateClassif_out"].ToString());
                string pantheonId = responseOut.ContainsKey("@anQId") ? responseOut["@anQId"].ToString() : string.Empty;
                tracingService.Trace("Pantheon ID: {0}", pantheonId);

                PantheonID.Set(context, pantheonId);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja Area zapisa: {ex.Message}");
            }
        }

        private string PrepareClassifData(Entity entity, string acType)
        {
            var entityName = entity.GetAttributeValue<string>("extreme_name");

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"procedures\": [");
            sb.Append("{");
            sb.Append("\"procname\": \"usp_DEVC_AA_CreateClassif\",");
            sb.Append("\"procparams\": {");
            sb.AppendFormat("\"acClassif\": \"{0}\",", entityName);
            sb.AppendFormat("\"acName\": \"{0}\",", entityName);
            sb.AppendFormat("\"acType\": \"{0}\"", acType);
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

