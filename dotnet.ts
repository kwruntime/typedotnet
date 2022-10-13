import {ChildProcess, spawn} from "child_process"
import Path from 'path'
import readline, { ReadLine } from 'readline'
import * as async from "gh+/kwruntime/std@1.1.19/util/async.ts"
import {Exception} from "gh+/kwruntime/std@1.1.19/util/exception.ts"
import { Batch, ClrObject } from "./batch.ts"
import Os from 'os'
import fs from 'fs'

export interface RuntimeInfo{
    arch: string 
    os: string 
    platform: string 
    path: string 
    executable: string 
    version: string 
    versionNumber?: number
}

export class Dotnet{

    #p: ChildProcess
    #liner: ReadLine
    #deferreds : {[key: string] : async.Deferred<any>} = {}    
    #dotnetInfo: any
    
    #service = "netcore"
    
    lastException: any 
    divideParams = false 
    workingMode = "normal"

    /*
    get runtime(){
        return this.#service
    }

    set runtime(name: string){
        if(name == "net6") name = "netcore"
        if(name == "net6.0") name = "netcore"
        if(name == "net4.5") name = "netframework"
        if(name == "net.framework") name = "netframework"
        if(["net6","net.framework"].indexOf(name) < 0){
            throw Exception.create(`${name} not valid option`).putCode("INVALID_OPTION")
        }
        this.#service = name
    }
    */



    static async availableRuntimes(): Promise<Array<RuntimeInfo>>{
        let exe = "dotnet"
        let available = new Array<any>()


        if(Os.platform() == "win32"){

            
            let paths = [
                Path.join(process.env.WINDIR, "Microsoft.NET", "Framework", "v4.0.30319"),
                Path.join(process.env.WINDIR, "Microsoft.NET", "Framework64", "v4.0.30319"),
            ]

            if(fs.existsSync(paths[0])){
                available.push({
                    arch: "x86",
                    os: "win32",
                    path: paths[0],
                    executable: '',
                    platform: "netframework",
                    version: "v4.0.30319"
                })
            }

            if(fs.existsSync(paths[1])){
                available.push({
                    arch: "x64",
                    os: "win32",
                    path: paths[1],
                    executable: '',
                    platform: "netframework",
                    version: "v4.0.30319"
                })
            }
        
            paths = [
                Path.join(process.env.PROGRAMFILES, "dotnet", "shared", "Microsoft.NETCore.App"),
                Path.join(process.env["PROGRAMFILES(X86)"], "dotnet", "shared", "Microsoft.NETCore.App")
            ]

            for(let path of paths){
                if(fs.existsSync(path)){
                    let arch = "x86"
                    if(path == paths[0]){
                        arch = Os.arch() == "ia32" ? "x86" : "x64"
                    }

                    let folders = await fs.promises.readdir(path)
                    for(let file of folders){
                        if(/\d+\.\d+\.\d+/.test(file)){
                            let parts = file.split(".")
                            let num = (Number(parts[0]) * 1000000) + (Number(parts[1]) * 10000) + (Number(parts[2]))
                            available.push({
                                arch,
                                os: "win32",
                                path: Path.join(path, file),
                                executable: Path.join(path, "..", "..", "dotnet.exe"),
                                platform: "netcore",
                                version: file,
                                versionNumber: num
                            })
                        }
                    }

                }
            }
            

        }
        else{


            let upaths = process.env.PATH.split(Path.delimiter)
            let paths = [], pathsMono = []
            for(let path of upaths){
                let file = Path.join(path, "dotnet")
                if(fs.existsSync(file)){
                    paths.push(file)
                }

                file = Path.join(path, "mono")
                if(fs.existsSync(file)){
                    pathsMono.push(file)
                }
            }
            let added:{[key:string] : boolean} = {}

            for(let executable of paths){
                let def = new async.Deferred<void>()
                let bytes = Buffer.allocUnsafe(0)
                let p = spawn(executable, ["--list-runtimes"])
                p.once("error", def.resolve)
                p.once("exit", def.resolve)
                p.stdout.on("data", function(buffer){
                    bytes = Buffer.concat([bytes, buffer])
                })  

                await def.promise
                let str = bytes.toString()

                let lines = str.split("\n")
                let reg = /Microsoft\.NETCore\.App\s+(\d+.\d+.\d+)\s+\[(.*)\]\s*$/

                for(let line of lines){

                    let match = line.match(reg)
                    if(match?.length){
                        let parts = match[1].split(".")
                        let num = (Number(parts[0]) * 1000000) + (Number(parts[1]) * 10000) + (Number(parts[2]))
                        
                        let path = Path.join(match[2], match[1])
                        if(added[path]){
                            continue
                        }

                        available.push({
                            arch:Os.arch(),
                            os: Os.platform(),
                            path,
                            executable,
                            platform: "netcore",
                            version: match[1],
                            versionNumber: num
                        })
                        added[path] = true
                    }
                }

            }


            for(let executable of pathsMono){
                let def = new async.Deferred<void>()
                let bytes = Buffer.allocUnsafe(0)
                let p = spawn(executable, ["--version"])
                p.once("error", def.resolve)
                p.once("exit", def.resolve)
                p.stdout.on("data", function(buffer){
                    bytes = Buffer.concat([bytes, buffer])
                })  

                await def.promise
                let str = bytes.toString()
                let reg = /version\s+(\d+.\d+.\d+(\.\d+)?)\s+/

                

                let match = str.match(reg)
                if(match?.length){
                    let parts = match[1].split(".")
                    let num =  (Number(parts[0]) * 100000000) + (Number(parts[1]) * 1000000) + (Number(parts[2]) * 10000) + (Number(parts[3]))
                    
                    let path = Path.join(Path.dirname(executable), "..", "lib", "mono")
                    let id = "mono-" + match[1]
                    if(added[id]){
                        continue
                    }

                    available.push({
                        arch:Os.arch(),
                        os: Os.platform(),
                        path,
                        executable,
                        platform: "netframework",
                        version: match[1],
                        versionNumber: num
                    })
                    added[id] = true
                }
                

            }
            



        }


        available.sort((a,b) => {
            let one = a.versionNumber > b.versionNumber ? -1 : (a.versionNumber < b.versionNumber ? 1 : 0)
            let two = ((a.arch == "x64") && (b.arch != a.arch)) ? 1 : ((b.arch == "x64") && (b.arch != a.arch) ? -1 : 0)
            let three = (a.platform > b.platform) ? 1: ((a.platform < b.platform) ? -1 : 0)
            return (three != 0) ? three : ((two != 0) ? two : one)
        })
        return available

    }

    async start(runtime: string |  ((value: RuntimeInfo, index: number, array: RuntimeInfo[]) => value is RuntimeInfo) = "netcore"){
        let runtimeInfo : RuntimeInfo
        
        let runtimesAvailable = await Dotnet.availableRuntimes()
        if(typeof runtime == "function"){
            let runtimes = runtimesAvailable.filter(runtime)
            runtimeInfo = runtimes[0]
        }
        else {
            let parts = runtime.split("-")
            let runtimes = runtimesAvailable.filter((a) => (a.platform == parts[0]) && (parts[1] ? (a.arch == parts[1]) : true))
            runtimeInfo = runtimes[0]
        }
        

        if(!runtimeInfo){
            let strParams = ''
            if(typeof runtime == "string")
                strParams = `: ${runtime}`
            throw Exception.create("Failed find runtime available for your parameters"+strParams).putCode("RUNTIME_NOT_FOUND")
        }

        

        let debug = false, net45 = false
        let  dll = Path.join(__dirname, "prod", "net6", "KodnetTs.dll")        
        if(runtimeInfo.platform == "netframework"){
            dll = Path.join(__dirname, "prod", "net4.5", "KodnetTs.exe")
            net45 = true
        }

        if(Os.platform() == "win32" && !fs.existsSync(dll)){
            dll = Path.join(__dirname, "CSharp", net45 ? "net4.5" : "net6", "KodnetTs", "bin","Release")
            if(!net45){
                dll = Path.join(dll, "net6.0", "KodnetTs.dll")
            }
            else{
                dll = Path.join(dll, "KodnetTs.exe")
            }
        }
        if(!runtimeInfo.executable){
            this.#p = spawn(dll)
        }
        else{
            this.#p = spawn(runtimeInfo.executable, [dll])
        }
        
        this.#liner = readline.createInterface({
            input: this.#p.stdout
        })
        this.#liner.on("line", this.#cmdRead.bind(this))

        let def = new async.Deferred<void>()
        let ondata = function(bytes){
            if(debug)
                process.stdout.write(bytes)
            if(def){
                let str = bytes.toString()
                if(str.indexOf("#started") >= 0){
                    def.resolve()
                }
            }
        }
        
        let onerror:any = function(){}
        if(debug)
            onerror = ondata 

        this.#p.stdout.on("data", ondata)
        this.#p.stderr.on("data", onerror)
        this.#p.once("error", def.reject)
        this.#p.once("exit", function(){
            if(def)
                def.reject(Exception.create("Process closed unexpected").putCode("PROCESS_CLOSED"))
        })
        
        await def.promise
        def = null
        
        if(!debug)
            this.#p.stdout.removeListener("data", ondata)
    }   


    close(){
        this.#p?.kill()
    }

    batch(){
        return new Batch(this)
    }


    #cmdRead(line: string){

        try{
            if(!line.startsWith("#json")) return 

            line = line.substring(5)
            let cmd = JSON.parse(line)
            
            if(cmd.taskid){
                let def = this.#deferreds[cmd.taskid]
                if(def) delete this.#deferreds[cmd.taskid]

                if(cmd.status == "error"){
                    this.lastException = cmd.result
                    let trace = cmd.result.StackTrace = cmd.result.StackTrace || cmd.result.StackTraceString 
                    let name = cmd.result.Name = cmd.result.Name|| cmd.result.ClassName
                    let e = Exception.create(cmd.result.Message).putCode("Dotnet:" + name)
                    e.putStack("From dotnet:\n" + trace  + "\n" + e.stack)
                    e["dotnetStackTrace"] = trace 
                    if(cmd.result.InnerException)
                        e.innerException =  cmd.result.InnerException
                        
                    def.reject(e)
                }
                else{
                    def.resolve(cmd.result)
                }
            }

        }catch(e){
            console.error("Failed to parse: ", e)
        }

    }

    #parse(cmd:any){
        if(cmd.actions ){
            cmd.actions = cmd.actions.map((a) => this.#parse(a))
        }
        else{
            if(cmd.params?.length){
                cmd.arguments = cmd.params.map((value) => {
                    let type = typeof value
                    return {
                        type,
                        value
                    }
                })
                cmd.params = null 
            }
        }
        return cmd
    }


    #includeCmd(arr: Array<string>, action: any){
        let target = action.target
        let targetStr = ''
        if(target){
            if(target instanceof ClrObject)
                target = (target["$internal"] || target ).target
            targetStr = [target.type||'',target.varname||'',target.instance ? "1" : "0"].join(",")
        }

        arr.push(`#cmd ${action.taskid || ''}|${action.method||''}|${action.var||''}|${action.serialize?1:0}|${action.asyncmode?1:0}|${targetStr}`)

        if(action.params?.length){

            if(this.divideParams){
                arr.push("#arg-len " + action.params.length)
                for(let param of action.params){

                    var type = typeof param 
                    if(param === null || param === undefined){
                        arr.push("#arg-n")
                    }
                    else if(type == "number"){
                        if(Math.floor(param) == param){
                            if(param > 2147483647 || param < -2147483648){
                                arr.push("#arg-l", param)
                            }
                            else{
                                arr.push("#arg-i", param)
                            }
                        }
                        else{
                            arr.push("#arg-d", param)
                        }
                    }
                    else if(type == "string"){
                        arr.push("#arg-s" + Buffer.from(param).toString('base64'))
                    }
                    else if(type == "boolean"){
                        arr.push("#arg-b" + String(param ? 1 : 0))
                    }
                    else{
                        arr.push("#arg-o" + JSON.stringify({v: param}))
                    }
                }
            }
            else{
                arr.push("#args " + JSON.stringify({
                    params: action.params
                }))
            }
            
        }
    }

    send(cmd: any){

        let taskid = cmd.taskid
        let def: async.Deferred<any>
        if(taskid){
            def = new async.Deferred<any>()
            this.#deferreds[taskid] = def;
        }
        let str = ''
        if(this.workingMode == "split"){
            let arr = []
            if(cmd.actions){
                for(let action of cmd.actions){
                    action.taskid = action.taskid || cmd.taskid
                    this.#includeCmd(arr, action)
                }
            }
            else{
                this.#includeCmd(arr, cmd)
            }
            arr.push("#execute")

            str = arr.join("\n") + "\n"
        }
        else{
            let json = JSON.stringify(cmd)
            str = "#json " + json + "\n"
        }

        this.#p.stdin.write(str)
        if(def){
            return def.promise
        }
    }
}