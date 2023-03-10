import path from 'path';
import fs from 'fs-extra';
import compose from 'docker-compose';
import ymlGenerator from 'kite/src/ymlgenerator';
const zipper = require('zip-local');
// import Monitor from '@/common/monitor/monitor';
import { KiteState, KiteServerState } from './constants';
import defaultCfg, { configFilePath } from './constants';
import { getPorts } from './getPorts';
import { _ports_ } from 'kite/src/ymlgenerator/constants';
const downloadDir = path.join(process.cwd(), './download');
const configPath = path.join(downloadDir, 'docker-compose.yml');
const zipPath = path.join(downloadDir, 'pipeline.zip');

import store from './store';
import {
  setPackageBuild,
  setConfig,
  setServer,
  setSetup,
  setState,
  setServerState,
  setServiceState,
  setConfigFile
} from './slice';
import { KiteConfig, KiteConfigFile } from './types';

function KiteCreator() {
  //Private Variable / Methods:
  const selectedPorts = new Set<number>();
  /**
   * Gets the remote server link configuration.
   * @param {string} server
   * the server string of a remote Kite
   * instance for connection.
   */
  async function configServer(server: string) {
    store.dispatch(setServer(server));
    store.dispatch(setState(KiteState.Init));
    store.dispatch(setServerState(KiteServerState.Disconnected));
    try {
      const res = [
        fetch(`${server}/api/kite/getConfig`),
        fetch(`${server}/api/kite/getSetup`),
        fetch(`${server}/api/kite/getConfigFile`),
        fetch(`${server}/api/kite/getPackageBuild`)
      ];
      store.dispatch(setConfig((await res[0]).json()));
      store.dispatch(setSetup((await res[1]).json()));
      store.dispatch(setConfigFile((await res[2]).json()));
      store.dispatch(setPackageBuild((await res[3]).json()));
      store.dispatch(setServerState(KiteServerState.Connected));
    } catch (err) {
      console.error(`error fetching from ${server}/api/:\n${err}`);
    }
  }

  /**
   *
   * @param args
   * @returns
   */
  async function checkPorts(args: number[]) {
    try {
      console.log(args);
      const retPorts = [];
      for (const port of args) {
        const avPort = await getPorts(port, 1);
        let j = 0;
        while (j < avPort.length) {
          if (!selectedPorts.has(avPort[j])) {
            selectedPorts.add(avPort[j]);
            retPorts.push(avPort[j]);
            break;
          }
          j++;
        }
        if (j === avPort.length)
          throw Error(
            `No available ports found range: ${port} - ${port + 200}`
          );
      }
      return retPorts;
    } catch (error) {
      console.error('Error occurred while checking available ports!', error);
    }
  }

  async function checkPort(port: number) {
    try {
      const avPort = await getPorts(port, 1);
      return avPort[0];
    } catch (error) {
      console.error('Error occurred while checking available ports!', error);
    }
  }

  /**
   * check ports of input config file
   * if ports in use modify
   * @param cfg
   */
  async function checkConfigPorts(cfg: KiteConfig) {
    try {

      cfg.kafka = {
        ...cfg.kafka,
        brokers: {
          ...cfg.kafka.brokers,
          ports: {
            ...cfg.kafka.brokers.ports,
            brokers: await checkPorts(
              cfg.kafka.brokers?.ports?.brokers ??
                new Array(cfg.kafka.brokers.size).fill(
                  _ports_.kafka.broker.external
                )
            ),
            jmx: await checkPorts(
              cfg.kafka.brokers?.ports?.jmx ??
                new Array(cfg.kafka.brokers.size).fill(_ports_.kafka.jmx)
            )
          }
        },
        zookeepers: {
          ...cfg.kafka.zookeepers,
          ports: {
            ...cfg.kafka.zookeepers.ports,
            client: await checkPorts(
              cfg.kafka.zookeepers?.ports?.client ??
                new Array(cfg.kafka.zookeepers.size).fill(
                  _ports_.zookeeper.client.external
                )
            )
          }
        }
      };

      if (cfg.kafka.jmx !== undefined) {
        cfg.kafka.jmx = {
          ...cfg.kafka.jmx,
          ports: await checkPorts(
            cfg.kafka.jmx.ports ??
              new Array(cfg.kafka.zookeepers.size).fill(_ports_.jmx.external)
          )
        };
      }
      if (cfg.kafka.spring !== undefined) {
        cfg.kafka.spring = {
          ...cfg.kafka.spring,
          port: 
            await checkPort(cfg.kafka.spring.port ?? _ports_.spring.external)
        };
      }

      if (cfg.db !== undefined) {
        if (cfg.db.kafkaconnect !== undefined) {
          cfg.db.kafkaconnect = {
            ...cfg.db.kafkaconnect,
            port: 
              await checkPort(
                cfg.db.kafkaconnect?.port ?? _ports_.kafkaconnect_src.external
              )
          };
        } else {
          cfg.db.kafkaconnect = {
            port: await checkPort(_ports_.kafkaconnect_src.external)
          };
        }
        cfg.db = {
          ...cfg.db,
          port: 
            await checkPort(
              cfg.db.port ??
                  (cfg.db.name === 'ksql'
                    ? _ports_.ksql.external
                    : _ports_.postgresql.external)
            )
        };
        if (cfg.db.ksql !== undefined) {
          cfg.db.ksql = {
            ...cfg.db.ksql,
            schema_port: 
              await checkPort(
                cfg.db.ksql.schema_port ?? _ports_.ksql_schema.external
              )
          };
        }
      }
      if (cfg.sink !== undefined) {
        if (cfg.sink.kafkaconnect !== undefined) {
          cfg.sink.kafkaconnect = {
            ...cfg.sink.kafkaconnect,
            port:
              await checkPort(
                cfg.sink.kafkaconnect.port ?? _ports_.kafkaconnect_sink.external
              )
          };
        } else {
          cfg.sink = {
            ...cfg.sink,
            kafkaconnect: {
            port: await checkPort(_ports_.kafkaconnect_sink.external)
          }};
        }
        if (cfg.sink.name === 'jupyter') {
          cfg.sink = {
            ...cfg.sink,
            port: 
              await checkPort(cfg.sink?.port ?? _ports_.jupyter.external)
          };
        } else {
          // spark
          cfg.sink = {
            ...cfg.sink,
            port:
              await checkPort(cfg.sink?.port ?? _ports_.spark.webui.external),
            rpc_port:
              await checkPort(cfg.sink?.rpc_port ?? _ports_.spark.rpc.external)
          };
        }
      }
      if (cfg.grafana !== undefined) {
        cfg.grafana = {
          ...cfg.grafana,
          port:
            await checkPort(cfg.grafana.port ?? _ports_.grafana.external)
        };
      }
      if (cfg.prometheus !== undefined) {
        cfg.prometheus = {
          ...cfg.prometheus,
          port: 
            await checkPort(cfg.prometheus.port ?? _ports_.prometheus.external)
        };
      }
    } catch (error) {
      console.error('Error occurred while checking config ports!', error);
    }
  }
  /**
   * @param {KiteConfig} config
   * takes the configuration
   * for KITE standalone servers
   * and generates the YAML configuration
   * file locally.
   */
  async function configLocal(config: KiteConfig) {
    await checkConfigPorts(config);
    store.dispatch(setState(KiteState.Init));
    store.dispatch(setServerState(KiteServerState.Disconnected));
    // create config + setup
    try {
      // generate the docker config
      const generate: Function = ymlGenerator();
      store.dispatch(setConfig(config));
      store.dispatch(setSetup(generate(config)));
      // package the download, comment out or make optional fro time optimization
      store.dispatch(setPackageBuild(zipPath));
      const header = {
        'Content-Type': 'text/yml',
        'Content-Length': fs.statSync(configPath).size
      };
      const fileStream = fs.readFileSync(configPath, 'utf-8');
      store.dispatch(setConfigFile({ header, fileStream }));
      store.dispatch(setState(KiteState.Configured));
      console.log('yaml configuration complete...');
    } catch (err) {
      console.error(
        `KITE failed to initialize: ${err}\nConfiguration ${config}`
      );
    }
  }

  /**
   * requests the remote server
   * to deploy docker.
   */
  async function deployServer() {
    try {
      const { server } = store.getState();
      await fetch(`${server}/api/kite/deploy`);
      store.dispatch(setState(KiteState.Running));
    } catch (err) {
      console.error(`Kite deployment failed:\n${JSON.stringify(err)}`);
    }
  }

  /**
   * deploys docker locally
   */
  async function deployLocal() {
    try {
      console.log('deploying docker containers...');
      await compose.upAll({
        cwd: downloadDir,
        log: true
        // commandOptions: '', // TBD set the name of container
        // callback: (chunk: Buffer) => { //TODO remove
        //   //progress report
        //   console.log('job in progress: ', chunk.toString());
        // },
      });
      store.dispatch(setState(KiteState.Running));
      console.log('docker deployment successful');
    } catch (err) {
      console.error(`Kite deployment failed:\n${JSON.stringify(err)}`);
    }
  }

  async function pauseServer(service?: string[]) {
    try {
      const { server } = store.getState();
      await fetch(`${server}/api/kite/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ service })
      });
    } catch (err) {
      console.error(`Could not pause docker instances on server:\n${err}`);
    }
  }

  async function pauseLocal(service?: string[]) {
    if (service === undefined) return;
    for (const name of service) {
      try {
        await compose.pauseOne(name, {
          cwd: downloadDir,
          log: true
        });
      } catch (err) {
        console.error(`Could not pause docker instances on local:\n${err}`);
      }
    }
  }

  async function unpauseServer(service?: string[]) {
    try {
      const { server } = store.getState();
      await fetch(`${server}/api/kite/unpause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ service })
      });
    } catch (err) {
      console.error(`Could not unpause docker instances on server:\n${err}`);
    }
  }

  async function unpauseLocal(service?: string[]) {
    if (service === undefined) return;
    for (const name of service) {
      try {
        await compose.unpauseOne(name, {
          cwd: downloadDir,
          log: true
        });
      } catch (err) {
        console.error(`Could not unpause docker instances on local:\n${err}`);
      }
    }
  }

  async function shutdownServer() {
    try {
      const { server } = store.getState();
      await fetch(`${server}/api/kite/shutdown`, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        }
      });
    } catch (err) {
      console.error(`Could not shutdown docker instances on server:\n${err}`);
    }
  }

  async function shutdownLocal() {
    try {
      await compose.down({
        cwd: downloadDir,
        log: true,
        commandOptions: ['--remove-orphans', '--volumes'] //force stop and delete volumes.
      });
    } catch (err) {
      console.error(`Could not shutdown docker instances on local:\n${err}`);
    }
  }
  /**
   * disconnects from the remote server instance
   */
  async function disconnectServer() {
    try {
      const { server } = store.getState();
      await fetch(`${server}/api/kite/disconnect`, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        }
      });
    } catch (err) {
      console.error(`Could not disconnect docker instances on server:\n${err}`);
    }
  }

  /**
   * disconnects from the local instance
   */
  async function disconnectLocal() {
    try {
      // await compose.kill({
      //   cwd: downloadDir,
      //   log: true,
      // });
      await compose.down({
        cwd: downloadDir,
        log: true,
        commandOptions: ['--remove-orphans', '--volumes'] //force stop and delete volumes.
      });
    } catch (err) {
      console.error(`Could not disconnect docker instances on local:\n${err}`);
    }
  }

  return {
    //Public Variables / Methods:

    defaultCfg,

    /**
     * @param {string | KiteConfig} arg
     * either the configuration object or
     * the address of kite server instance
     * for remote or local setup.
     */
    configure: async function (arg?: string | KiteConfig) {
      if (arg === undefined) {
        await configLocal(defaultCfg);
      } else {
        switch (typeof arg) {
          case 'string':
            await configServer(arg);
            break;
          default:
            await configLocal(arg);
            break;
        }
      }
    },

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
    deploy: async function (arg?: any) {
      // if server active deployment happens there...
      const { serverState } = store.getState();
      if (serverState === KiteServerState.Connected) {
        await deployServer();
      } else {
        await deployLocal();
        // Monitor.initiate();
      }
    },

    /**
     * @returns {KiteSetup}
     * setup to be used for connecting
     * to a kafka instance and/or database.
     */
    getSetup: function (): any {
      return store.getState().setup;
    },

    /**
     * @returns {KafkaSetup}
     * setup to be used for connecting
     * to a kafka instance.
     */
    getKafkaSetup: function (): any {
      return store.getState().kafkaSetup;
    },

    /**
     * @returns {dbCfg}
     * setup to be used for connecting
     * to a database.
     */
    getDBSetup: function (): any {
      return store.getState().dBSetup;
    },

    /**
     * If connected to kite server, gets the config from the server.
     *
     * @returns {KiteConfig}
     *
     */
    getConfig: function (): any {
      return store.getState().config;
    },

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
    getConfigFile: function (): any {
      return store.getState().configFile;
    },

    /**
     *
     * @returns state of the Kite Application
     */
    getKiteState: function (): KiteState {
      return store.getState().state;
    },

    /**
     *
     * @returns state of Kite Server
     */
    getKiteServerState: function (): KiteServerState {
      return store.getState().serverState;
    },

    getPackageBuild: function (): Promise<KiteConfigFile> {
      fs.removeSync(zipPath);
      zipper.sync.zip(downloadDir).compress().save(zipPath);

      return new Promise((res, rej) => {
        try {
          const header = {
            'Content-Type': 'application/zip',
            'Content-Length': fs.statSync(zipPath).size
          };
          const fileStream = fs.readFileSync(zipPath);
          res({ header, fileStream });
        } catch (err) {
          rej(err);
        }
      });
    },
    /**
     * If the kite server isn't running
     * invokes the docker-compose
     * down method directly. Otherwise
     * makes a request to shutdown remotely.
     */
    disconnect: async function (): Promise<any> {
      const { serverState } = store.getState();
      if (serverState === KiteServerState.Connected) {
        store.dispatch(setServerState(KiteServerState.Disconnected));
        disconnectServer();
      } else {
        disconnectLocal();
      }
      store.dispatch(setState(KiteState.Shutdown));
    },

    /**
     * If the kite server isn't running
     * invokes the docker-compose
     * down method directly. Otherwise
     * makes a request to shutdown remotely.
     */
    shutdown: async function (): Promise<any> {
      const { serverState } = store.getState();
      if (serverState === KiteServerState.Connected) {
        store.dispatch(setServerState(KiteServerState.Disconnected));
        await shutdownServer();
      } else {
        await shutdownLocal();
      }
      store.dispatch(setState(KiteState.Shutdown));
    },
    /**
     *
     */
    pause: async function (service?: string[]): Promise<any> {
      const { serverState, services } = store.getState();
      if (service === undefined) service = services; // default to use all.
      if (serverState === KiteServerState.Connected) {
        store.dispatch(setServerState(KiteServerState.Disconnected));
        await pauseServer(service);
      } else {
        await pauseLocal(service);
      }
      store.dispatch(setServiceState({ type: 'pause', service }));
    },
    /**
     *
     */
    unpause: async function (service?: string[]): Promise<any> {
      const { serverState, services } = store.getState();
      if (service === undefined) service = services; // default to use all.
      if (serverState === KiteServerState.Connected) {
        store.dispatch(setServerState(KiteServerState.Disconnected));
        await unpauseServer(service);
      } else {
        await unpauseLocal(service);
      }
      store.dispatch(setServiceState({ type: 'unpause', service }));
    }
  };
}
const Kite = KiteCreator();
export default Kite;
