using System;
using System.Collections.Generic;
using FoxShell;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Threading.Tasks;

//using Jil;

namespace FoxShell.TypeScript{


    

    public class CommandManager{


        internal static System.Collections.Generic.Dictionary<string, object> vars = new System.Collections.Generic.Dictionary<string, object>();
        internal Kodnet kodnet;

        public Exception lastException = null;

        public Command current;
        public List<Command> cmds = new List<Command>();
        public int argsOffset = 0;
        JsonSerializerSettings js;

        //public JsonInt32Converter converter =  new JsonInt32Converter();

        public CommandManager(){
            js = new JsonSerializerSettings();
            js.Error = new EventHandler<Newtonsoft.Json.Serialization.ErrorEventArgs>((object sender, Newtonsoft.Json.Serialization.ErrorEventArgs args) =>
            {
                args.ErrorContext.Handled = true;
            });
            js.ReferenceLoopHandling= ReferenceLoopHandling.Ignore;
            js.MaxDepth = 512;
            //js.PreserveReferencesHandling = PreserveReferencesHandling.Objects;
        }
        public void StartReadCommandLine(){

            Console.WriteLine("#started");
            while(true){

                try{

                    string line = Console.ReadLine();
                    //Console.WriteLine("Line readed: "  + line);
                    if(line.StartsWith("#cmd")){
                        argsOffset = 0;
                        current = new Command();
                        current.ParseFields(line.Substring(4).Trim());
                        cmds.Add(current);
                    }

                    else if(line.StartsWith("#json")){
                        //, new JsonInt32Converter()
                        var obj = JsonConvert.DeserializeObject<System.Dynamic.ExpandoObject>(line.Substring(5));
                        var dict = (IDictionary<string, object>) obj;

                        if(dict.ContainsKey("actions")){
                            List<object> actions = (List<object>) dict["actions"];

                            string taskid = (string)dict["taskid"];
                            foreach(var action in actions){
                                var dict1 = (IDictionary<string,object>) action;
                                var cmd = IDictionaryToCommand(dict1);
                                cmd.taskid = taskid;
                                cmds.Add(cmd);
                            }
                        }
                        else{
                            cmds.Add(IDictionaryToCommand(dict));
                        }

                        var arr = cmds.ToArray();
                        cmds.Clear();

                        this.ExecuteMany(arr);

                    }

                    else if(line.StartsWith("#arg-len")){
                        current.args = new object[int.Parse(line.Substring(8))];
                    }


                    else if(line.StartsWith("#arg-d")){
                        current.args[argsOffset++] = double.Parse(line.Substring(6));
                    }
                    else if(line.StartsWith("#arg-n")){
                        argsOffset++;
                    }
                    else if(line.StartsWith("#arg-i")){
                        current.args[argsOffset++] = int.Parse(line.Substring(6));
                    }
                    else if(line.StartsWith("#arg-b")){
                        current.args[argsOffset++] = line.Substring(6).Trim() == "1";
                    }
                    else if(line.StartsWith("#arg-l")){
                        current.args[argsOffset++] = long.Parse(line.Substring(6));
                    }
                    else if(line.StartsWith("#arg-s")){
                        current.args[argsOffset++] = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(line.Substring(6).Trim()));
                    }
                    else if(line.StartsWith("#arg-o")){
                        var obj = JsonConvert.DeserializeObject<System.Dynamic.ExpandoObject>(line.Substring(6));
                        var dict = (IDictionary<string, object>) obj;
                        current.args[argsOffset++] = GetArgument(dict["v"]);
                    }

                    else if(line.StartsWith("#args")){
                        var obj = JsonConvert.DeserializeObject<System.Dynamic.ExpandoObject>(line.Substring(5));
                        var dict = (IDictionary<string, object>) obj;
                        var list = (List<object>) dict["params"] ;
                        current.args = GetArguments(list);
                        
                    }


                    else if(line.StartsWith("#execute")){
                        if(cmds.Count < 1) continue;

                        var arr = cmds.ToArray();
                        cmds.Clear();
                        this.ExecuteMany(arr);
                        

                    }
                }catch(Exception e){
                    Console.WriteLine("Failed parse commands:" + e.ToString());
                }

            }

        }

        public object ConvertJSON(Type type, string json){
            return JsonConvert.DeserializeObject(json, type);
            
        }

        public object ConvertJSON(string type, string o){
            return ConvertJSON(kodnet.GetTypeFromString(type), o);
        }

        public bool IsNull(object value){
            return value == null;
        }

        public void FreeVariables(IEnumerable<object> varnames){
            foreach(var name in varnames){
                if(vars.ContainsKey(name.ToString())){
                    vars.Remove(name.ToString());
                }
            }
        }

        public static object GetArgument(object item){
            object value = item;
            if(item is System.Dynamic.ExpandoObject){
                var dict1 = (IDictionary<string, object>) item;
                if(dict1.ContainsKey("$c")){
                    var cl = (string)dict1["$c"];
                    if(cl == "target"){
                        var target = new Command.Target();
                        value = target;
                        object value1 = null;
                        if(dict1.TryGetValue("type", out value1)){
                            target.type = (string)value1;
                        }
                        if(dict1.TryGetValue("varname", out value1)){
                            target.varname = (string)value1;
                        }
                        if(dict1.TryGetValue("instance", out value1)){
                            target.instance = (bool)value1;
                        }
                    }
                }
            }
            return value;
        }

        public object Cast(object value, Type type){
            return System.Convert.ChangeType(value, type);
        }

        public object Cast(object value, string typename){
            var type = kodnet.GetTypeFromString(typename);
            return System.Convert.ChangeType(value, type);
        }

        public static object[] GetArguments(List<object> list){
            object[] args = new object[list.Count];
            for(var i=0;i < list.Count;i++){
                var item = list[i];
                args[i] = GetArgument(item);
            }
            return args;
        }

        public static Command IDictionaryToCommand(IDictionary<string,object> dict){
            Command cmd = new Command();

            object value = null;
            if(dict.TryGetValue("taskid", out value)){
                cmd.taskid = (string)value;
            }
            if(dict.TryGetValue("method", out value)){
                cmd.method = (string)value;
            }
            if(dict.TryGetValue("var", out value)){
                cmd.var = (string)value;
            }
            if(dict.TryGetValue("serialize", out value)){
                cmd.serialize = (bool)value;
            }
            if(dict.TryGetValue("asyncmode", out value)){
                cmd.asyncmode = (bool)value;
            }

            if(dict.TryGetValue("target", out value)){
                var dictTarget = (IDictionary<string,object>)value;
                var target = new Command.Target();

                if(dictTarget.TryGetValue("type", out value)){
                    target.type = (string)value;
                }
                if(dictTarget.TryGetValue("varname", out value)){
                    target.varname = (string)value;
                }
                if(dictTarget.TryGetValue("instance", out value)){
                    target.instance = (bool)value;
                }
                cmd.target = target;
            }


            if(dict.TryGetValue("params", out value)){
                List<object> params1 = (List<object>) value;
                cmd.args = GetArguments(params1);
            }

            return cmd;

        }

        public async Task ExecuteMany(Command[] cmds){
            Result result= new Result();
            
            try{
                object result0 = null;
                var lastcmd = cmds[cmds.Length-1];
                result.taskid = lastcmd.taskid;

                foreach(var action in cmds){
                    result0 = await this.Execute(action);
                }

                result.status = "ok";
                result.result = result0;
                

            }catch(Exception e){
                result.result = e;
                result.status = "error";
            }   


            
            //js.TypeNameHandling = TypeNameHandling.Auto;
            


            try{                
                var sjson = JsonConvert.SerializeObject(result, js);
                Console.WriteLine("#json " + sjson);
            }catch(Exception e){
                


                try{
                    result.result = e;
                    result.status = "error";
                    var sjson = JsonConvert.SerializeObject(result, js);
                    Console.WriteLine("#json " + sjson);
                }
                catch(Exception f){
                    Console.WriteLine("Failed send result: ", f.ToString());
                }

            }
        }


        public static object GetValueTarget(Command.Target target){
            if(!string.IsNullOrEmpty(target.type)){
                return Kodnet.current.GetTypeFromString(target.type);
            }
            if(!string.IsNullOrEmpty(target.varname)){
                object value2 = null;
                if(!vars.TryGetValue(target.varname, out value2)){
                    throw new Exception("Variable with name: " + target.varname + " not found");
                }
                return value2;
            }
            return null;
        }


        public static object GetObjectValue(object value){
            var target = value as Command.Target;
            if(target != null){
                return GetValueTarget(target);
            }
            return value;
        }


        public async Task<object> Execute(Command cmd){
            object value = null;
            if(cmd.target !=null){
                value = GetValueTarget(cmd.target);
            }


            if(cmd.args != null){
                for(var i=0;i<cmd.args.Length;i++){
                    cmd.args[i] = GetObjectValue(cmd.args[i]);
                }
            }else{
                cmd.args = new object[]{};
            }


            if(cmd.method == ".get.var"){
                return value;
            }
            if(cmd.method == "Dispose")
            {
                cmd.method = ".dispose";
            }

            object result = null;

            Type t = value as Type;
            TypeDescriptor td = null; 
            Func<object,object> callable = null;
            bool instanceCall = false;
            if(t == null){
                instanceCall = true;
            }
            if(cmd.target != null){
                instanceCall = cmd.target.instance;
            }

            if(instanceCall){
                if(value == null){
                    throw new NullReferenceException();
                }
                t = value.GetType();
                if(t == typeof(Func<object,object>) && (cmd.method == "Invoke")){
                    callable = (Func<object,object>) value;
                }
                else{
                    td = TypeDescriptor.Get(t);
                }                
            }
            else{
                td = TypeDescriptor.Get(t);
            }

            Func<object, object[], object> func = null;
            object funcObject = null;

            if(callable == null){
                
                if(instanceCall){
                    td.instance.TryGetValue(cmd.method, out funcObject);
                }
                else{
                    td.noninstance.TryGetValue(cmd.method, out funcObject);
                }
                func = funcObject as Func<object, object[], object>;
                if(func == null){
                    throw new  NullReferenceException("Method '" + cmd.method + "' was not found in specified target");
                }
                if(instanceCall){
                    result = func.Invoke(value, cmd.args);
                }
                else{
                    result = func.Invoke(null, cmd.args);
                }            
            }
            else{
                result = callable.Invoke(cmd.args[0]);
            }
            

            if(cmd.asyncmode){
                if(result != null ){
                    var task = result as Task;
                    if(task != null){
                        await task; 

                        TypeDescriptor td1 = TypeDescriptor.Get(task.GetType());
                        if(td1.instance.TryGetValue("Result", out funcObject)){
                            func = funcObject as Func<object, object[], object>;
                            if(func != null){
                                result = func.Invoke(task, new object[]{});
                            }
                        }
                        else{
                            result = null;
                        }
                    }
                }
            }

            
            if(!string.IsNullOrEmpty(cmd.var)){
                vars[cmd.var] = result;
            }           

            return result;

        }

    }


    public class Program{
        public static int Main(string[] args){
            

            var kodnetTs = new CommandManager();
            kodnetTs.kodnet = new Kodnet();
            kodnetTs.kodnet.LoadAssembly(typeof(Program).Assembly);            

            var assemNames = System.Reflection.Assembly.GetExecutingAssembly().GetReferencedAssemblies();
            foreach(var aname in assemNames){
                kodnetTs.kodnet.LoadAssembly(aname.FullName);
            }

            //kodnetTs.kodnet.LoadAssembly(typeof(Microsoft.CSharp.RuntimeBinder.CSharpArgumentInfo).Assembly);
            //kodnetTs.kodnet.LoadAssembly(typeof(System.Runtime.CompilerServices.DynamicAttribute).Assembly);

            

            
            CommandManager.vars["$0"] = kodnetTs.kodnet;
            CommandManager.vars["$1"] = kodnetTs;
        
            kodnetTs.StartReadCommandLine();
            return 0;

        }
    }

}