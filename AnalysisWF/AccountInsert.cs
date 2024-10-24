using System;
using System.Activities;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Workflow;

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

        [Output("Poruka")]
        public OutArgument<string> Poruka { get; set; }

        #endregion

        protected override void Execute(CodeActivityContext context)
        {
            var tracingService = context.GetExtension<ITracingService>();
            var serviceFactory = context.GetExtension<IOrganizationServiceFactory>();
            var service = serviceFactory.CreateOrganizationService(null);


            try
            {
                // Preuzimanje Account zapisa
                var accountRef = Account.Get(context);
                var account = service.Retrieve("account", accountRef.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(true));
                tracingService.Trace("Preuzet Account zapis sa ID: {0}", account.Id);

                // Poziv API-ja za autentifikaciju i pribavljanje tokena
                var token = GetAuthToken(tracingService, service).GetAwaiter().GetResult();

                // Priprema podataka za slanje
                var jsonData = PrepareAccountData(account);

                // Poziv API-ja za slanje Account zapisa
                //var responseMessage = CallPantheonApi(token, jsonData).GetAwaiter().GetResult();

                //tracingService.Trace("API Response: {0}", responseMessage);

                // Postavljanje poruke o uspehu
                //Poruka.Set(context, $"Uspešno poslato: {responseMessage}");
                Poruka.Set(context, $"Uspešno poslato: {token}");
            }
            catch (Exception ex)
            {
                tracingService.Trace("Greška: {0}", ex.Message);
                throw new InvalidPluginExecutionException($"Greška prilikom slanja Account zapisa: {ex.Message}");
            }
        }

        private async Task<string> GetAuthToken(ITracingService tracingService, IOrganizationService service)
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

                var json = Newtonsoft.Json.JsonConvert.SerializeObject(body);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                tracingService.Trace("Šaljem zahtev za autentifikaciju...");

                var response = await client.PostAsync(url, content);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    throw new Exception($"Greška prilikom autentifikacije: {error}");
                }

                var responseData = await response.Content.ReadAsStringAsync();
                dynamic result = Newtonsoft.Json.JsonConvert.DeserializeObject(responseData);

                tracingService.Trace("Token uspešno preuzet.");
                return result.token.ToString();  // Iz odgovora uzimamo polje 'token'
            }
        }



        private string PrepareAccountData(Entity account)
        {
            return $@"
            {{
                ""AccountId"": ""{account.Id}"",
                ""Name"": ""{account.GetAttributeValue<string>("name")}"",
                ""VatNo"": ""{account.GetAttributeValue<string>("extreme_vatnumber")}""
            }}";
        }

        private async Task<string> CallPantheonApi(string token, string jsonData)
        {
            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
                client.DefaultRequestHeaders.Add("Accept", "application/json");

                var content = new StringContent(jsonData, Encoding.UTF8, "application/json");
                var response = await client.PostAsync("https://pantheon.example.com/api/accounts", content);

                response.EnsureSuccessStatusCode();
                return await response.Content.ReadAsStringAsync();
            }
        }

        private string GetConfigurationValue(string key, IOrganizationService service)
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
