import { Dotnet } from './dotnet.ts'
import {Exception} from 'gh+/kwruntime/std@1.1.19/util/exception.ts'


export interface CompileOptions{
    source: string 
    typename?: string 
    static?: boolean
}
export class Batch{

    actions = new Array<any>()
    uid = Date.now().toString(28)
    count = 0
    taskcount= 0
    //#kodnet: any
    #dotnet: any
    asyncmode = true
    dotnet: Dotnet

    #clrKodnet = null 
    #clrUtils = null


    varnames = new Set<string>()
    
    static(type: string){
        let types = new StaticType(this, type)
        return new Proxy(types.proxified(), Batch)
    }

    constructor(dotnet: any){
        this.#dotnet = dotnet
    }
    
    get kodnet(){
        if(!this.#clrKodnet){
            let kod = new InstanceObject(this, "$0")
            this.#clrKodnet = new Proxy(kod.proxified(), Batch)
        }
        return this.#clrKodnet
    }
    

    get utils(){
        if(!this.#clrUtils){
            let kod = new InstanceObject(this, "$1")
            this.#clrUtils = new Proxy(kod.proxified(), Batch)
        }
        return this.#clrUtils
    }

    async wait(value: ClrObject){

        var actions = this.actions

        this.actions = []
        let taskid = "Task" + this.uid + (this.taskcount++)

        let cmd = {
            taskid,
            target: value,
            params: [],
            method: ".get.var",
            var: "",
            asyncmode: this.asyncmode
        }
        actions.push(cmd)

        
        // send to dotnet process
        return await this.#dotnet.send({
            taskid,
            actions,
            serialize: true
        })


    }


    async compile(options: CompileOptions){
        let csharp = this.static("jxshell.csharplanguage").construct()
        csharp.RunScript(options.source)
        let asem = csharp.GetCompiledAssembly()
        this.kodnet.LoadAssembly(asem)

        let obj: any 
        if(options.typename){
            obj = asem.GetType(options.typename)
            obj.$internal.target.instance = false 
            if(!options.static){
                obj = obj.construct()
            }
        }
        await this.execute()
        return obj
    }


    convertObject(typename: string, object: any){
        let str = JSON.stringify(object)
        return this.utils.ConvertJSON(typename, str)
    }



    async execute(){

        var actions = this.actions
        if(actions.length){
            this.actions = []
            let taskid = "Task" + this.uid + (this.taskcount++)
            // send to dotnet process
            await this.#dotnet.send({
                taskid,
                actions
            })
        }

    }


    async finish(){
        // free variables
        let taskid = "Task" + this.uid + (this.taskcount++)
        let cmd = {
            taskid,
            target: {
                $c: "target",
                varname: "$1",
                instance: true
            },
            params: [[...this.varnames]],
            method: "FreeVariables",
            var: "",
            asyncmode: this.asyncmode
        }
        await this.#dotnet.send(cmd)
    }

   

    /*
    get kodnet(){
        if(!this.#kodnet){
            this.#kodnet = Batch.#newobject(this, "$0")
        }
        return this.#kodnet
    }*/





    static #newobject(batch: Batch, varname: string){
        let obj = new InstanceObject(batch, varname)
        return new Proxy(obj.proxified(), Batch)
    }


    static createFunction(thisRef: ClrObject, prop: string){
        let batch = thisRef.batch
        let voidCall = prop.startsWith("$")
        let rprop = prop 
        if(voidCall){
            rprop = prop.substring(1)
        }
        return thisRef.funcs[prop] = function(){

            let uid =  ""
            if(!voidCall){
                uid = batch.uid + String(++batch.count)
                batch.varnames.add(uid)
            }

            let params = [...arguments]
            batch.actions.push({
                
                target: thisRef.target, 
                method: rprop,
                params,
                asyncmode: batch.asyncmode,
                var: uid
            })


            return Batch.#newobject(batch, uid)

        }
    }

    static get(target: object, prop: string | symbol, receiver: any){

        let self = target as ClrObject // target["self"] as ClrObject
        if(typeof prop == "symbol"){
            return self[prop]
        }
       
        let batch = self.batch
        if(prop == "$internal"){
            return self 
        }
        if(prop == "then" || prop == "catch"){
            return null 
        }

        if(["toJSON"].indexOf(prop) >= 0){
            return self [prop]
        }
        if(self.funcs[prop] === undefined){
            this.createFunction(self, prop)   
        }
        return self.funcs[prop]

    }

    static set(target: object, prop: string | symbol, value: any){

        let self = target as ClrObject //  target["self"] as ClrObject
        if(typeof prop == "symbol"){
            return self[prop] = value
        }

        
        if(prop == "$internal"){
            return 
        }
        if(["toJSON"].indexOf(prop) >= 0){
            return 
        }


        let fname = ".set." + prop 
        if(self.funcs[fname] === undefined){
            this.createFunction(self, fname)   
        }
        return self.funcs[fname](value)

    }




}

export class ClrObject{
    batch: Batch 
    target: any 
    funcs: {[key: string]: any} = {}


    proxified(){

        return this 

        /*
        var f = function(){}
        f["self"] = this 
        //f["toJSON"] = this.toJSON.bind(this)
        return f 
        */

    }

    toJSON(){
        if(this["$internal"]){
            return this["$internal"].target
        }
        return this.target
    }

}   

export class StaticType  extends ClrObject{

    


    constructor(batch :Batch, type: string){
        super()
        this.batch = batch
        this.target = {
            $c: "target",
            type 
        }
        
    }

    

}


export class InstanceObject extends ClrObject {

    

    constructor(batch:Batch, varname: string){
        super()
        this.batch = batch 
        this.target = {
            $c: "target",
            instance: true,
            varname
        }
    }

}




