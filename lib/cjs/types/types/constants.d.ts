import { KiteConfig } from '.';
export declare const MAX_NUMBER_OF_BROKERS = 50;
export declare const MAX_NUMBER_OF_ZOOKEEPERS = 1000;
declare const defaultCfg: KiteConfig;
export declare enum KiteState {
    Init = "Init",
    Configured = "Configured",
    Running = "Running",
    Paused = "Paused",
    Shutdown = "Shutdown"
}
export declare enum KiteServerState {
    Disconnected = "Disconnected",
    Connected = "Connected"
}
export declare const configFilePath: string;
export default defaultCfg;
//# sourceMappingURL=constants.d.ts.map