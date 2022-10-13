# Typedotnet

Run CSharp code, and access to any type/object in .NET 6 and .NET Framework/Mono

## Why? 

- For fun
- Win32 configuration easy to do with .NET Framework, hard with Node.js
- Explore .NET 6 (.NET Core)

## Features

- Access any .NET component: Type / Class / Object
- Load dinamycally .NET DLLs
- Call any method, property directly like any function in javascript/typescript
- Access to static members, including Structs, Enums, Generics, etc.
- Compile C# code at run time
- Supports past javascript objects as ```dynamic``` (ExpandoObject) to C#.

## Differences with edge.js

- Edge execute .NET/Mono/.NET Framework in same process, ```typedotnet``` create a separated process. 
- Due to in-process execution, Edge can be faster in some cases. 
- ```typedotnet``` supports multiple .NET Core and .NET Framework simultaneously. 
- ```typedotnet``` can call (almost?) any existing function without compile C# code, Edge needs ```Methods``` with specific signature to call. This means, Edge needs pre-compilation or dynamic compilation, giving some overhead to initialization, with ```typedotnet``` this can be avoided. 
- ```typedotnet``` doesn't require any native dependency, good for restricted environments or small operations. 


## How works?

```typedotnet``` creates another process with .NET Core or .NET Framework/Mono, and comunicate between stdio pipes, using JSON serialization. This makes slower than Edge.js but, also means that is not required native dependencies, nor development environment to install. Also, at least for .NET Core, you can execute on any architecture where can be installed. 

```typedotnet``` can also access to private properties or methods, using the prefix: ```hidden_```

Execute existing methods or accessing to existing types/classes is possible thanks to [kodnet project](https://github.com/FoxShell/kodnetlib). 

```typedotnet``` exposes a ```Dotnet``` class from what you can do anything: 

```typescript
import {Dotnet} from '@kwruntime/typedotnet'
async function main(){
    let dot = new Dotnet()

    // start with .NET Core
    await dot.start("netcore")

    // or start with .NET Framework/Mono 
    await dot.start("netframework")
}
``` 


The idea with  ```typedotnet``` is create a "````Batch```" execution, and finish after the operations you need do. 

```typescript
import {Dotnet} from '@kwruntime/typedotnet'
async function main(){
    let dot = new Dotnet()

    // start with .NET Core
    await dot.start("netcore")
    
    
    for(let i=0;i<1000;i++){
        await executeSomeOperation()
    }

    // finish dotnet instance if all work finished
    dot.close()
}


async function executeSomeOperation(dot){

    let batch = dot.batch()

    // execute all your stuff 
    ...

    // finish and free al memory used
    await batch.finish()

}
```


Access to existing types/classes: 

```typescript
const dot = new Dotnet()
// start with .NET Core
await dot.start("netcore")
    
const scope = dot.batch()
let sbStatic = scope.static("System.Text.StringBuilder")

// Contructors are construct method 
let sb = sbStatic.construct()
sb.AppendLine("Línea 1")
sb.AppendLine("Línea 2")
sb.Append("Prueba1,")
sb.Append("Prueba2,")
sb.Append("Prueba3")

// typedotnet selects the best overload call to method automatically
sb.AppendLine()

// if you need get the value in javascript use batch.wait 
console.info(await scope.wait(sb.ToString()))

// properties can be accessed like any other method
console.info(await scope.wait(sb.Length()))


// finish scope 
await batch.finish()
```


Compiling C# code it's possible:

```typescript
const dot = new Dotnet()
// start with .NET Core
await dot.start("netcore")

let batch = dot.batch()

let startup = await batch.compile({
    source: `
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;


    class Startup{
        public object Invoke(dynamic person){
            return new {
                Text = "Welcomes from .NET " + (string )person.name + " Your age is: " + person.age.ToString()
            };
        }
    }

    `,
    // doesn't matter if is private
    typename: "Startup"
})

let person = {
    name:"James",
    age: 28
}     
// javascript objects are sent as dynamic ExpandoObjects
let result = await batch.wait(startup.Invoke(person))

// this will shows something like this: Result: { '$id': '2', Text: 'Welcomes from .NET James Your age is: 28' }
console.info("Result:", result)

await batch.finish()

```

If you are only executing ```void``` actions, you need call ```batch.execute()``` instead of ```batch.wait``` for get result.


```typescript
const dot = new Dotnet()
// start with .NET Core
await dot.start("netcore")

let batch = dot.batch()

// your stuff 
... 

try{
    // no need to get any value from execution, so call .execute() instead of .wait 
    await batch.execute()

}catch(e){
    // control exceptions

    // full stack trace 
    console.error(e)

    // only dotnet stacktrace if available
    console.error(e.dotnetStackTrace)
}

await batch.finish()

```

You can set properties like any other javascript object. Consider this example similar to ```compile``` example:

```typescript
const dot = new Dotnet()
// start with .NET Core
await dot.start("netcore")

let batch = dot.batch()

let startup = await batch.compile({
    source: `
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;

    public class Person{
        public string name {get;set;}
        public int age {get;set;}
    }

    class Startup{
        public object Invoke(Person person){
            return new {
                Text = "Welcomes from .NET " + person.name + " Your age is: " + person.age.ToString()
            };
        }
    }

    `,
    // doesn't matter if is private
    typename: "Startup"
})

let person = batch.static("Person").construct()
person.name = "James"
// this is needed because JSON.NET convert javascript numbers to long instead of int
person.age = batch.utils.Cast(28, "System.Int32")

let result = await batch.wait(startup.Invoke(person))

// this will shows something like this: Result: { '$id': '2', Text: 'Welcomes from .NET James Your age is: 28' }
console.info("Result:", result)

await batch.finish()

```

## API Reference

````typescript 
export interface RuntimeInfo{
    arch: string 
    os: string 
    platform: string 
    path: string 
    executable: string 
    version: string 
    versionNumber?: number
}


export interface CompileOptions{
    source: string 
    typename?: string 
    static?: boolean
}


export class Dotnet {

    // returns available runtimes
    // for example: 
    /*
    [
        {
            arch: 'x64',
            os: 'linux',
            path: '/usr/share/dotnet/shared/Microsoft.NETCore.App/6.0.9',
            executable: '/usr/bin/dotnet',
            platform: 'netcore',
            version: '6.0.9',
            versionNumber: 6000009
        },
        {
            arch: 'x64',
            os: 'linux',
            path: '/usr/lib/mono',
            executable: '/usr/bin/mono',
            platform: 'netframework',
            version: '6.12.0.182',
            versionNumber: 612000182
        }
    ]
    */
    static async availableRuntimes(): Promise<Array<RuntimeInfo>>{}


    // start the rumtime 
    // parameter can be string or a function to filter the runtime
    async start(runtime: string |  ((value: RuntimeInfo, index: number, array: RuntimeInfo[]) => value is RuntimeInfo) = "netcore"){}


    // finish the NETCore or NETFramework process
    close(){}

    // create a Batch object
    batch(){}



}


export class Batch {

    // Returns a Proxy (ClrObject) representing a .NET static type
    // with object returned you can call any static method or constructor
    static(typename: string): ClrObject{}


    // Returns a Kodnet Proxy object. For see the Kodnet object, see the project: https://github.com/FoxShell/kodnetlib
    get kodnet(): Kodnet{}


    // Returns a KodnetTs_Utils object.  
    get utils(): KodnetTs_Utils{}

    // Compile a c# code, and returns an instance from typename specificed
    async compile(options: CompileOptions): Promise<ClrObject>{}

    // param typename: .NET type to get
    // param object: Any javascript object to get converted
    convertObject(typename: string, object: any): ClrObject{}


    // Execute the current "pipeline", but no wait any value, returns nothing
    async execute(): Promise<void> {}

    // Execute the current "pipeline", and get the value from .NET variable/value
    async wait(obj: ClrObject): Promise<any> {}


    // Execute the current "pipeline" (if required), and free all the .NET objects used in this "Batch" execution
    async finish(): Promise<any>{}

}

// basically a Proxy to .NET Object, used for some util operations
export class KodnetTs_Utils{

    // this methods executes from .NET side

    // converts any object to a specified .NET Type
    Cast(value: any, type: System.Type): System.Object{}
    Cast(value: any, typename: string): System.Object{}


    // converts a JSON string to a specificied .NET Type
    ConvertJSON(type: System.Type, json: string): System.Object{}
    ConvertJSON(typename: string, json: string): System.Object{}

}

```