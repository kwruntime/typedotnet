# Typedotnet

Run CSharp code, and access to any type/object in .NET 6 and .NET Framework/Mono

Supports (no tested on Mac but should work): 

- .NET 6 or superior (called before .NET Core), on Windows/Linux/Mac
- .NET Framework 4.5 or superior on Windows
- Mono on Linux/Mac

## Build module 

This module was created using [@kwruntime/core](https://github.com/kwruntime/core).

For build: 

```bash 
kwrun build.ts
```

This will generate an ```npm``` folder with generate ```js``` main file and ```.d.ts``` file declarations

## Why? 

- For fun
- Win32 stuff, easy to do with .NET Framework (installed on all machines), hard with Node.js (maybe Registry for example)
- Explore .NET 6 (.NET Core)
- Any other solution 

## Features

- Access any .NET component: Type / Class / Object
- Load dinamycally .NET DLLs
- Call any method, property directly like any function in javascript/typescript
- Access to static members, including Structs, Enums, Generics, etc.
- Compile C# code at run time
- Supports pass javascript objects as ```dynamic``` (ExpandoObject) to C#.

## Differences with edge.js

- Edge execute .NET/Mono/.NET Framework in same process, ```typedotnet``` create a separated process. 
- Due to in-process execution, Edge can be faster in some cases.
- ```typedotnet``` allows start many instances of Inter-process comunication, for example running .NET 6 and .NET Framework simultaneously.
- ```typedotnet``` can call (almost?) all existing function without compile C# code, Edge needs ```Methods``` with specific signature to call. This means, Edge needs pre-compilation or dynamic compilation, giving some overhead to initialization, with ```typedotnet``` this can be avoided. 
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


The idea with  ```typedotnet``` is create a "```Batch```" execution, and finish after the operations you need do. 

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
sb.AppendLine("L??nea 1")
sb.AppendLine("L??nea 2")
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

- [Dotnet class](./src//types/dotnet.ts)
- [Batch class](./src//types/batch.ts)