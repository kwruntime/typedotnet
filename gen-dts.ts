import * as ts from 'npm://typescript@4.8.4'
import Path from 'path'
import fs from 'fs'


export class Program {


    static compile(fileNames: string[], options: ts.CompilerOptions): {[key: string]: string} {
        // Create a Program with an in-memory emit
        
        const createdFiles = {}
        const host = ts.createCompilerHost(options);
        host.writeFile = (fileName: string, contents: string) => {
            // concatenate in one unique file 
            createdFiles[fileName] = contents
        }
        
        // Prepare and emit the d.ts files
        const program = ts.createProgram(fileNames, options, host);
        program.emit();
        
        return createdFiles
    }

    static async main(){


        let names = await fs.promises.readdir(Path.join(__dirname, "src"))
        names = names.filter((a) => a.endsWith(".ts"))

        var files = this.compile(names.map((a)=> Path.join(__dirname,"src",a)), {
            "resolveJsonModule": true,
            "moduleResolution": ts.ModuleResolutionKind.NodeJs,
            "module": ts.ModuleKind.ES2020,
            "target": ts.ScriptTarget.ESNext,
            "outDir": "out",
            "lib": [
                "es6",
                "dom"
            ],
            "esModuleInterop": true,
            "sourceMap": true,
            "paths": {
                "*.ts": ["*"]
            },
            declaration: true,
            emitDeclarationOnly: true
        })

        for(let id in files){
            let name = id.substring(4)
            let tsname = name.replace(".d.ts", ".ts")
            let outfile = Path.join(__dirname, "src", "types", tsname)
            let content = files[id]
            for(let name of names){
                content = content.replace(name, name.substring(0, name.length-3))    
            }
            await fs.promises.writeFile(outfile, content)
        }

        
    }
}

