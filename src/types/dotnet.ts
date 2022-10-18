/// <reference types="node" />
import { ChildProcess } from "child_process";
import { Batch } from "./batch";
export interface RuntimeInfo {
    arch: string;
    os: string;
    platform: string;
    path: string;
    executable: string;
    version: string;
    versionNumber?: number;
}
export declare class Dotnet {
    #private;
    id: string;
    lastException: any;
    divideParams: boolean;
    workingMode: string;
    constructor(id?: string);
    /**
     * Returns a Dotnet instance with specified id previously created, or create if not exists. Usefull for reuse instances
     * @param id string
     * @returns a Dotnet instance object
     */
    static getWithId(id: string): Dotnet;
    /**
     * Returns available runtimes in machine
     * This is an example response:
     * [
     *     {
     *         arch: 'x64',
     *         os: 'linux',
     *         path: '/usr/share/dotnet/shared/Microsoft.NETCore.App/6.0.9',
     *         executable: '/usr/bin/dotnet',
     *         platform: 'netcore',
     *         version: '6.0.9',
     *         versionNumber: 6000009
     *     },
     *     {
     *         arch: 'x64',
     *         os: 'linux',
     *         path: '/usr/lib/mono',
     *         executable: '/usr/bin/mono',
     *         platform: 'netframework',
     *         version: '6.12.0.182',
     *         versionNumber: 612000182
     *     }
     * ]
     *
     * @returns array of RuntimeInfo
     */
    static availableRuntimes(): Promise<Array<RuntimeInfo>>;
    get innerProcess(): ChildProcess;
    get started(): boolean;
    /**
     * Start the rumtime
     * @param runtime : can be string or a function to filter the runtime
     */
    start(runtime?: string | ((value: RuntimeInfo, index?: number, array?: RuntimeInfo[]) => boolean)): Promise<void>;
    /**
     * finish the NETCore or NETFramework process
     */
    close(): void;
    /**
     * Create a new "scope" to interact
     * @returns Batch object
     */
    batch(): Batch;
    send(cmd: any): Promise<any>;
}
