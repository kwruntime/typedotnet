using System.Collections.Generic;
using System;
using Newtonsoft.Json;
namespace FoxShell.TypeScript
{

    public class JsonInt32Converter : JsonConverter
    {
        #region Overrides of JsonConverter

        /// <summary>
        /// Only want to deserialize
        /// </summary>
        public override bool CanWrite { get { return false; } }

        /// <summary>
        /// Placeholder for inheritance -- not called because <see cref="CanWrite"/> returns false
        /// </summary>
        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            // since CanWrite returns false, we don't need to implement this
            throw new NotImplementedException();
        }

        /// <summary>
        /// Reads the JSON representation of the object.
        /// </summary>
        /// <param name="reader">The <see cref="T:Newtonsoft.Json.JsonReader"/> to read from.</param><param name="objectType">Type of the object.</param><param name="existingValue">The existing value of object being read.</param><param name="serializer">The calling serializer.</param>
        /// <returns>
        /// The object value.
        /// </returns>
        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            return (reader.TokenType == JsonToken.Integer)
                ? Convert.ToInt32(reader.Value)     // convert to Int32 instead of Int64
                : serializer.Deserialize(reader);   // default to regular deserialization
        }

        public override bool CanConvert(Type objectType)
        {

            return objectType == typeof(Int32) ||
                    objectType == typeof(Int64) ||
                    // need this last one in case we "weren't given" the type
                    // and this will be accounted for by `ReadJson` checking tokentype
                    objectType == typeof(object)
                ;
        }
        #endregion
    }


    public class Result
    {
        public string taskid;
        public object result;
        public string status;
    }


    public class Command
    {

        public Command[] actions;

        // fields = taskid, method, var, serialize, asyncmode
        public string taskid { get; set; }
        public string method { get; set; }
        public string var { get; set; }
        public bool serialize { get; set; }
        public bool asyncmode { get; set; }

        public Target target { get; set; }
        public object[] args { get; set; }

        public void ParseFields(string fields)
        {
            string[] parts = fields.Split('|');
            System.Array.Resize(ref parts, 6);
            taskid = parts[0];
            method = parts[1];
            var = parts[2];
            serialize = parts[3] == "1";
            asyncmode = parts[4] == "1";

            if (!string.IsNullOrEmpty(parts[5]))
            {
                target = new Target();
                target.ParseFields(parts[5]);
            }

            /*
            if(!string.IsNullOrEmpty(parts[6])){
                
                var items = parts[6].Split(':');
                var len = int.Parse(items[0]);
                args = new object[len];
            } */

        }

        /*
        public static object Parse(string content){
            var items = content.Split(':');
            if(items[0] == "A"){
                List<object> list = new List<object>();
                for(var i=1;i<items.Length;i++){
                    string s = System.Text.Encoding.UTF8.GetString(System.Convert.FromBase64String(items[i]));
                    list.Add(Parse(s));
                }
                return list; 
            }

            if(items[0] == "O"){
                List<string> props = (List<string>)   
            }
        }
        */

        public class Target
        {
            public string type;
            public string varname;
            public bool instance;

            public void ParseFields(string fields)
            {
                string[] parts = fields.Split(',');
                type = parts[0];
                varname = parts[1];
                instance = parts[2] == "1";
            }

        }


    }


}