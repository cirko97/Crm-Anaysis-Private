using System.Linq;
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Newtonsoft.Json;

namespace AnalysisWF
{
    public static class AuthHelper
    {
        public static async Task<string> GetAuthToken(ITracingService tracingService, IOrganizationService service)
        {
            using (var client = new HttpClient())
            {
                // Preuzimanje konfiguracionih vrednosti
                var url = GetConfigurationValue("PAWS_AUTHENDPOINT", service);
                var username = GetConfigurationValue("PAWS_username", service);
                var password = GetConfigurationValue("PAWS_password", service);
                var companyDB = GetConfigurationValue("PAWS_companyDB", service);

                var body = new
                {
                    Username = username,
                    Password = password,
                    companyDB = companyDB
                };

                var json = JsonConvert.SerializeObject(body);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                tracingService.Trace("Šaljem zahtev za autentifikaciju...");

                var response = await client.PostAsync(url, content);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    throw new Exception($"Greška prilikom autentifikacije: {error}");
                }

                var responseData = await response.Content.ReadAsStringAsync();
                dynamic result = JsonConvert.DeserializeObject(responseData);

                tracingService.Trace("Token uspešno preuzet.");
                return result.token.ToString();  // Iz odgovora uzimamo polje 'token'
            }
        }

        private static string GetConfigurationValue(string key, IOrganizationService service)
        {
            var query = new Microsoft.Xrm.Sdk.Query.QueryExpression("extreme_configuration")
            {
                ColumnSet = new Microsoft.Xrm.Sdk.Query.ColumnSet("extreme_value")
            };
            query.Criteria.AddCondition("extreme_key", Microsoft.Xrm.Sdk.Query.ConditionOperator.Equal, key);

            var configRecord = service.RetrieveMultiple(query).Entities.FirstOrDefault();

            if (configRecord != null)
            {
                return configRecord.GetAttributeValue<string>("extreme_value");
            }
            else
            {
                throw new InvalidPluginExecutionException($"Konfiguracioni ključ '{key}' nije pronađen.");
            }
        }
    }
}
