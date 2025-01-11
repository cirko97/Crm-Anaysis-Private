using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Workflow;
using Microsoft.Xrm.Sdk;
using Newtonsoft.Json;
using System.Activities;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System;

namespace AnalysisWF
{
    public class ClassifTechnologyInsert : CodeActivity
    {
        #region Input Properties

        [RequiredArgument]
        [Input("Technology")]
        [ReferenceTarget("extreme_technology")]
        public InArgument<EntityReference> Technology { get; set; }

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
                // Retrieve Technology record
                var technologyRef = Technology.Get(context);
                if (technologyRef == null)
                {
                    throw new InvalidPluginExecutionException("Technology must be provided.");
                }

                var technology = service.Retrieve("extreme_technology", technologyRef.Id, new ColumnSet("extreme_name"));
                tracingService.Trace("Preuzet Technology zapis sa ID: {0}", technology.Id);

                var jsonData = PrepareClassifData(technology, "S");
                tracingService.Trace("JSON podaci za slanje (Technology): {0}", jsonData);

                var token = AuthHelper.GetAuthToken(tracingService, service).GetAwaiter().GetResult();
                var responseMessage = CallPantheonApi(token, jsonData, execprocendpoint).GetAwaiter().GetResult();
                tracingService.Trace("API Response (Technology): {0}", responseMessage);

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
                throw new InvalidPluginExecutionException($"Greška prilikom slanja Technology zapisa: {ex.Message}");
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
