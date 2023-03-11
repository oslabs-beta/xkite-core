import ymlGenerator from './yml';
import { KiteState, KiteServerState, MAX_NUMBER_OF_BROKERS, MAX_NUMBER_OF_ZOOKEEPERS } from './types/constants';
import defaultCfg, { configFilePath } from './types/constants';
import { _ports_, downloadDir } from './types/yml/constants';
import { KiteConfig, KiteConfigFile } from './types';
declare const Kite: {
    defaultCfg: KiteConfig;
    /**
     * @param {string | KiteConfig} arg
     * either the configuration object or
     * the address of kite server instance
     * for remote or local setup.
     */
    configure: (arg?: string | KiteConfig) => Promise<void>;
    /**
     * invokes docker-compose
     * locally or on remote server
     *
     * @param {any} arg
     * either the configuration object or
     * the address of kite server instance
     * for remote or local setup.
     *
     */
    deploy: (arg?: any) => Promise<void>;
    /**
     * @returns {KiteSetup}
     * setup to be used for connecting
     * to a kafka instance and/or database.
     */
    getSetup: () => any;
    /**
     * @returns {KafkaSetup}
     * setup to be used for connecting
     * to a kafka instance.
     */
    getKafkaSetup: () => any;
    /**
     * @returns {dbCfg}
     * setup to be used for connecting
     * to a database.
     */
    getDBSetup: () => any;
    /**
     * If connected to kite server, gets the config from the server.
     *
     * @returns {KiteConfig}
     *
     */
    getConfig: () => any;
    /**
     * If connected to kite server, gets the config from the server.
     *
     * @returns {KiteConfigFile}
     *
     * the header content and the
     * file stream for transmission.
     * Use case: const kite = new Kite();
     * const configObj = getConfig();
     * res.writeHead(200, configObj.header);
     * configObj.fileStream.pipe(res);
     */
    getConfigFile: () => any;
    /**
     *
     * @returns state of the Kite Application
     */
    getKiteState: () => KiteState;
    /**
     *
     * @returns state of Kite Server
     */
    getKiteServerState: () => KiteServerState;
    getPackageBuild: () => Promise<KiteConfigFile>;
    /**
     * If the kite server isn't running
     * invokes the docker-compose
     * down method directly. Otherwise
     * makes a request to shutdown remotely.
     */
    disconnect: () => Promise<any>;
    /**
     * If the kite server isn't running
     * invokes the docker-compose
     * down method directly. Otherwise
     * makes a request to shutdown remotely.
     */
    shutdown: () => Promise<any>;
    /**
     *
     */
    pause: (service?: string[]) => Promise<any>;
    /**
     *
     */
    unpause: (service?: string[]) => Promise<any>;
};
export default Kite;
import { dbCfg, sinkCfg, grafanaCfg, prometheusCfg, KiteKafkaCfg, KiteSetup, KafkaSetup } from './types';
import { YAMLConfig, YAMLServicesDefaultSetup } from './types/yml';
export { KiteConfig, dbCfg, sinkCfg, grafanaCfg, prometheusCfg, KiteKafkaCfg, KiteSetup, KiteConfigFile, KafkaSetup, defaultCfg, KiteState, KiteServerState, configFilePath, YAMLConfig, ymlGenerator, downloadDir, YAMLServicesDefaultSetup, _ports_, MAX_NUMBER_OF_BROKERS, MAX_NUMBER_OF_ZOOKEEPERS, };
//# sourceMappingURL=index.d.ts.map