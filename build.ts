
import {Packager} from '/data/projects/Kodhe/kwruntime/std/package/compiler/pack.ts'
import {Builder} from '/data/projects/Kodhe/kwruntime/std/package/compiler/build.ts'
import fs from 'fs'
import Path from 'path'
import { Program as GenDts } from './gen-dts.ts'

export class Program{
    static async main(){

        await GenDts .main()

        let root = Path.join(__dirname, "src")
        let workingFolder = Path.join(__dirname, "dist")
        let npmModuleFolder = Path.join(__dirname, "npm")
	    if(!fs.existsSync(workingFolder)) fs.mkdirSync(workingFolder)
        if(!fs.existsSync(npmModuleFolder)){
            await fs.promises.mkdir(npmModuleFolder)
        }

        let prodFolder = Path.join(npmModuleFolder, "prod")
        if(fs.existsSync(prodFolder)){
            await fs.promises.rm(prodFolder,{
                recursive: true
            })
        }

        await fs.promises.mkdir(prodFolder)
        await fs.promises.cp(Path.join(root,  "CSharp", "net4.5", "KodnetTs", "bin", "Release"), Path.join(prodFolder, "net4.5"), {
            recursive: true,
            dereference: true
        })
        await fs.promises.cp(Path.join(root, "CSharp", "net6", "KodnetTs", "bin", "Release", "net6.0"), Path.join(prodFolder, "net6"), {
            recursive: true,
            dereference: true
        })

        await fs.promises.rm(Path.join(npmModuleFolder, "types"),{
            recursive: true
        })
        await fs.promises.cp(Path.join(root,"types"), Path.join(npmModuleFolder, "types"), {
            recursive: true
        })

        let files = await fs.promises.readdir(Path.join(npmModuleFolder, "types"))
        for(let file of files){
            if(file.endsWith(".ts")){
                await fs.promises.rename(Path.join(npmModuleFolder, "types", file), Path.join(npmModuleFolder, "types", file.substring(0,file.length-3) + ".d.ts"))
            }
        }


        let filesToCopy = {
            "src/package.json": "package.json",
            "src/.npmignore":   ".npmignore",
            "README.md": "README.md"
        }
        for(let [id, file] of Object.entries<string>(filesToCopy)){
            let src = Path.join(__dirname, id)
            let dest = Path.join(npmModuleFolder, file)
            if(fs.existsSync(src)){
                await fs.promises.cp(src, dest)
            }
        }

        

        let packer = new Packager({
            workingFolder,
            root,
            follow: true,
            hash: "com.kodhe.typedotnet-0",
            useDataFolder: true,
            main: "mod.js",
            buildOptions: {
                npmExternalModules: [
                ]
            }
        })


        
        await packer.addSourceFile(Path.join(root, "mod.ts"), "mod.js")
        await packer.add([
            Path.join(root, "prod")
        ])
        await packer.add([
            Path.join(npmModuleFolder, "types")
        ], npmModuleFolder)
        
        
        

        
        await packer.writeTo(Path.join(workingFolder, "com.kodhe.typedotnet.kwb"))


        let builder = new Builder({
            target: 'node'
        })
        await builder.compile(Path.join(root, "mod.ts"))
        await builder.writeTo(Path.join(npmModuleFolder, "main.js"))

    }
}