import ymlGenerator from './yml';
import { KiteState, KiteServerState, MAX_NUMBER_OF_BROKERS, MAX_NUMBER_OF_ZOOKEEPERS } from './constants/kite';
import defaultCfg, { configFilePath } from './constants/kite';
import { _ports_, downloadDir } from './constants/yml';
import { KiteConfig, KiteConfigFile } from './types/kite';
declare const Kite: {
    defaultCfg: KiteConfig;
    configure: (arg?: string | KiteConfig) => Promise<void>;
    deploy: (arg?: any) => Promise<void>;
    getSetup: () => any;
    getKafkaSetup: () => any;
    getDBSetup: () => any;
    getConfig: () => any;
    getConfigFile: () => any;
    getKiteState: () => KiteState;
    getKiteServerState: () => KiteServerState;
    getPackageBuild: () => Promise<KiteConfigFile>;
    disconnect: () => Promise<any>;
    shutdown: () => Promise<any>;
    pause: (service?: string[]) => Promise<any>;
    unpause: (service?: string[]) => Promise<any>;
};
export default Kite;
import { dbCfg, sinkCfg, grafanaCfg, prometheusCfg, KiteKafkaCfg, KiteSetup, KafkaSetup } from './types/kite';
import { YAMLConfig, YAMLServicesDefaultSetup } from './types/yml';
export { KiteConfig, dbCfg, sinkCfg, grafanaCfg, prometheusCfg, KiteKafkaCfg, KiteSetup, KiteConfigFile, KafkaSetup, defaultCfg, KiteState, KiteServerState, configFilePath, YAMLConfig, ymlGenerator, downloadDir, YAMLServicesDefaultSetup, _ports_, MAX_NUMBER_OF_BROKERS, MAX_NUMBER_OF_ZOOKEEPERS, };
//# sourceMappingURL=index.d.ts.map