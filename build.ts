
import {Packager} from '/data/projects/Kodhe/kwruntime/std/package/compiler/pack.ts'
import {Builder} from '/data/projects/Kodhe/kwruntime/std/package/compiler/build.ts'
import fs from 'fs'
import Path from 'path'


export class Program{
    static async main(){


        let workingFolder = Path.join(__dirname, "dist")
        let npmModuleFolder = Path.join(__dirname, "npm")
	    if(!fs.existsSync(workingFolder)) fs.mkdirSync(workingFolder)
        if(!fs.existsSync(npmModuleFolder)){

            await fs.promises.mkdir(npmModuleFolder)
            await fs.promises.symlink("../prod", Path.join(npmModuleFolder,"prod"))
        }

        let filesToCopy = [
            "package.json",
            ".npmignore"  ,
            "README.md"
        ]
        for(let file of filesToCopy){
            let src = Path.join(__dirname, file)
            let dest = Path.join(npmModuleFolder, file)
            if(fs.existsSync(src)){
                await fs.promises.cp(src, dest, {
                    recursive: true 
                })
            }
        }

        let root = __dirname

        let packer = new Packager({
            workingFolder,
            root,
            follow: true,
            hash: "com.kodhe.typedotnet",
            useDataFolder: true,
            main: "dotnet.ts",
            buildOptions: {
                npmExternalModules: [
                ]
            }
        })


        await packer.add([
            Path.join(root, "prod")
        ])   
        await packer.addSourceFile(Path.join(root, "dotnet.ts"))
        await packer.writeTo(Path.join(workingFolder, "com.kodhe.typedotnet.kwb"))


        let builder = new Builder({
            target: 'node'
        })
        await builder.compile(Path.join(root, "dotnet.ts"))
        await builder.writeTo(Path.join(npmModuleFolder, "main.js"))


    }
}