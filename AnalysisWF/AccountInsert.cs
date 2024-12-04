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

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"procedures\": [");
            sb.Append("{");
            sb.Append("\"procname\": \"usp_DEVC_AA_CreateSubject\",");
            sb.Append("\"procparams\": {");
            sb.AppendFormat("\"acSubject\": \"{0}\",", account.GetAttributeValue<string>("name"));
            sb.AppendFormat("\"acName2\": \"{0}\",", account.GetAttributeValue<string>("extreme_name2"));
            sb.AppendFormat("\"acAddress\": \"{0}\",", account.GetAttributeValue<string>("address1_line1"));
            sb.AppendFormat("\"acEmail\": \"{0}\",", account.GetAttributeValue<string>("emailaddress1"));
            sb.AppendFormat("\"acPhone\": \"{0}\",", account.GetAttributeValue<string>("telephone1"));
            sb.AppendFormat("\"acPost\": \"{0}\",", acPost);
            sb.AppendFormat("\"acCity\": \"{0}\",", account.GetAttributeValue<string>("extreme_city"));
            sb.AppendFormat("\"acCountry\": \"{0}\",", account.GetAttributeValue<string>("extreme_country"));
            sb.AppendFormat("\"acCode\": \"{0}\",", account.GetAttributeValue<string>("extreme_vatnumber"));
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

        //private string GetLookupFieldValue(EntityReference lookup, string fieldName, IOrganizationService service)
        //{
        //    if (lookup == null)
        //        return string.Empty;

        //    var entity = service.Retrieve(lookup.LogicalName, lookup.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(fieldName));
        //    return entity.GetAttributeValue<string>(fieldName);
        //}

        //private async Task<string> GetAuthToken(ITracingService tracingService, IOrganizationService service)
        //{
        //    using (var client = new HttpClient())
        //    {
        //        // Preuzimanje konfiguracionih vrednosti
        //        var url = GetConfigurationValue("PAWS_AUTHENDPOINT", service);
        //        var username = GetConfigurationValue("PAWS_username", service);
        //        var password = GetConfigurationValue("PAWS_password", service);
        //        var companyDB = GetConfigurationValue("PAWS_companyDB", service);

        //        var body = new
        //        {
        //            Username = username,
        //            Password = password,
        //            companyDB = companyDB
        //        };

        //        var json = Newtonsoft.Json.JsonConvert.SerializeObject(body);
        //        var content = new StringContent(json, Encoding.UTF8, "application/json");

        //        tracingService.Trace("Šaljem zahtev za autentifikaciju...");

        //        var response = await client.PostAsync(url, content);

        //        if (!response.IsSuccessStatusCode)
        //        {
        //            var error = await response.Content.ReadAsStringAsync();
        //            throw new Exception($"Greška prilikom autentifikacije: {error}");
        //        }

        //        var responseData = await response.Content.ReadAsStringAsync();
        //        dynamic result = Newtonsoft.Json.JsonConvert.DeserializeObject(responseData);

        //        tracingService.Trace("Token uspešno preuzet.");
        //        return result.token.ToString();  // Iz odgovora uzimamo polje 'token'
        //    }
        //}

        //private string GetConfigurationValue(string key, IOrganizationService service)
        //{
        //    var query = new Microsoft.Xrm.Sdk.Query.QueryExpression("extreme_configuration")
        //    {
        //        ColumnSet = new Microsoft.Xrm.Sdk.Query.ColumnSet("extreme_value")
        //    };
        //    query.Criteria.AddCondition("extreme_key", Microsoft.Xrm.Sdk.Query.ConditionOperator.Equal, key);

        //    var configRecord = service.RetrieveMultiple(query).Entities.FirstOrDefault();

        //    if (configRecord != null)
        //    {
        //        return configRecord.GetAttributeValue<string>("extreme_value");
        //    }
        //    else
        //    {
        //        throw new InvalidPluginExecutionException($"Konfiguracioni ključ '{key}' nije pronađen.");
        //    }
        //}

    }
}
