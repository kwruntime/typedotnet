export {Dotnet, RuntimeInfo} from './dotnet.ts'
export {Batch,CompileOptions} from './batch.ts'
import Path from 'path'

export class Program{
    static get typeDefinition(){
        return Path.join(__dirname, "types", "mod")
    }
    static main(){
        console.info("This is a library, not a program. Use with import in your 'ts' files with @kwruntime/core")
    }
}