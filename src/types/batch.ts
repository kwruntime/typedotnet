import { Dotnet } from './dotnet';
export interface CompileOptions {
    source: string;
    typename?: string;
    static?: boolean;
}
export declare class Batch {
    #private;
    actions: any[];
    uid: string;
    count: number;
    taskcount: number;
    asyncmode: boolean;
    dotnet: Dotnet;
    /**
     * varnames saved in .NET side
     */
    varnames: Set<string>;
    static(type: string): any;
    constructor(dotnet: any);
    /**
     * kodnet object from .NET
     * See this project: https://github.com/FoxShell/KodnetLib/tree/main/kodnet
     */
    get kodnet(): any;
    /**
     * utils object from .NET for some operations
     * See this project: https://github.com/kwruntime/typedotnet/tree/main/src/CSharp/net4.5/KodnetTs
     */
    get utils(): any;
    /**
     * Get a value from .NET in nodejs. This serialize the .NET object or value, to Javascript object/value
     *
     * @param value any .NET object
     * @returns a javascript object or value
     */
    wait(value: any): Promise<any>;
    /**
     * Compile C# source code, and get the class/instance Proxy
     * @param options Configuration for compile
     * @returns class/instance Proxy
     */
    compile(options: CompileOptions): Promise<any>;
    /**
     * Converts a javascript object, to a specified System.Type name in .NET
     * @param typename typename of .NET System.Type
     * @param object a javascript object
     * @returns a .NET object
     */
    convertObject(typename: string, object: any): any;
    /**
     * Execute all pending actions without wait for a value
     */
    execute(): Promise<void>;
    /**
     * Execute all pending actions without wait for a value, and free all current varnames used from .NET side
     */
    finish(): Promise<any>;
    private static createFunction;
    static get(target: object, prop: string | symbol, receiver: any): any;
    static set(target: object, prop: string | symbol, value: any): any;
}
export declare class ClrObject {
    batch: Batch;
    target: any;
    funcs: {
        [key: string]: any;
    };
    proxified(): this;
    toJSON(): any;
}
export declare class StaticType extends ClrObject {
    constructor(batch: Batch, type: string);
}
export declare class InstanceObject extends ClrObject {
    constructor(batch: Batch, varname: string);
}
