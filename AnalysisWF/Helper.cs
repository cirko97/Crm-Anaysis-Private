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
    }
}
