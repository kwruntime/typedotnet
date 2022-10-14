
import {Packager} from '/data/projects/Kodhe/kwruntime/std/package/compiler/pack.ts'
import {Builder} from '/data/projects/Kodhe/kwruntime/std/package/compiler/build.ts'
import fs from 'fs'
import Path from 'path'


export class Program{
    static async main(){

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


        let filesToCopy = [
            "src/package.json",
            "src/.npmignore"  ,
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


        await packer.add([
            Path.join(root,  "prod")
        ])
        await packer.addSourceFile(Path.join(root, "mod.ts"), "mod.js")
        await packer.writeTo(Path.join(workingFolder, "com.kodhe.typedotnet.kwb"))


        let builder = new Builder({
            target: 'node'
        })
        await builder.compile(Path.join(root, "mod.ts"))
        await builder.writeTo(Path.join(npmModuleFolder, "main.js"))

    }
}