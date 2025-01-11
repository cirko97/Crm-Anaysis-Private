//using Microsoft.Xrm.Sdk;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Text;
//using System.Threading.Tasks;

//namespace AnalysisWF
//{
//    public class Helper
//    {
//        internal static object GetLookupFieldValue(EntityReference lookup, string fieldName, IOrganizationService service)
//        {
//            if (lookup == null)
//                return string.Empty;

//            var entity = service.Retrieve(lookup.LogicalName, lookup.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(fieldName));
//            return entity.GetAttributeValue<string>(fieldName);
//        }
//    }
//}
using Microsoft.Xrm.Sdk;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AnalysisWF
{
    public class Helper
    {
        internal static object GetLookupFieldValue(EntityReference lookup, string fieldName, IOrganizationService service)
        {
            if (lookup == null)
                return string.Empty;

            var entity = service.Retrieve(lookup.LogicalName, lookup.Id, new Microsoft.Xrm.Sdk.Query.ColumnSet(fieldName));
            return entity.Attributes.Contains(fieldName) ? entity[fieldName] : null;
        }
        internal static string GetConfigurationValue(string key, IOrganizationService service)
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

