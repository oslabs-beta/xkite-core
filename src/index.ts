import path from 'path';
import fs from 'fs-extra';
import compose from 'docker-compose';
import ymlGenerator from './yml.js';
const fetch = require('node-fetch');
const zipper = require('zip-local');
import type {
  KiteConfig,
  KiteConfigFile,
  KiteState,
  KiteServerState,
  KiteClass,
  KiteKafkaCfg,
  dbCfg,
  KiteSetup,
  KafkaSetup,
} from './types/index.js';
import * as consts from './constants/kite.js';
const { defaultCfg } = consts;
import * as yml from './constants/yml.js';
const { _ports_, downloadDir } = yml;
import getAvailablePorts from './getPorts.js';
const configPath = path.join(downloadDir, 'docker-compose.yml');
const zipPath = path.join(downloadDir, 'pipeline.zip');

import store from './state/store.js';
import * as slice from './state/slice.js';
const {
  setPackageBuild,
  setConfig,
  setServer,
  setSetup,
  setState,
  setServerState,
  setServiceState,
  setConfigFile,
} = slice;

function KiteCreator(): KiteClass {
  //Private Variable / Methods:
  let selectedPorts = new Set<number>([
    // initalized with broker listeners to prevent overlap
    _ports_.kafka.metrics,
    _ports_.kafka.spring,
    _ports_.kafka.ksql,
    _ports_.kafka.connect_src,
    _ports_.kafka.connect_sink,
  ]);
  /**
   * Gets the remote server link configuration.
   * @param {string} server
   * the server string of a remote Kite
   * instance for connection.
   */
  async function configServer(server: string) {
    store.dispatch(setServer(server));
    store.dispatch(setState(<KiteState>'Init'));
    store.dispatch(setServerState(<KiteServerState>'Disconnected'));
    try {
      let res = await fetch(`${server}/api/kite/getConfig`);
      store.dispatch(setConfig(await res.json()));
      res = await fetch(`${server}/api/kite/getSetup`);
      store.dispatch(setConfig(await res.json()));
      res = await fetch(`${server}/api/kite/getConfigFile`);
      store.dispatch(setConfig(await res.json()));
      store.dispatch(setServerState(<KiteServerState>'Connected'));
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
      const retPorts: number[] = [];
      for (const port of args) {
        let notFound = true;
        let candidatePort = port;
        while (notFound) {
          // find an unused port
          while (selectedPorts.has(candidatePort)) {
            candidatePort++;
          }
          const avport = await getAvailablePorts(port, 1);
          if (!selectedPorts.has(avport[0])) {
            selectedPorts.add(avport[0]); //add to set
            retPorts.push(avport[0]);
            notFound = false; //exit
          }
        }
      }
      return retPorts;
    } catch (error) {
      console.error('Error occurred while checking available ports!', error);
    }
  }

  async function checkPort(port: number) {
    try {
      const avPort = await getAvailablePorts(port, 1);
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
  async function checkConfigPorts(config: KiteConfig): Promise<KiteConfig> {
    try {
      selectedPorts = new Set<number>([
        // initalized with broker listeners to prevent overlap
        _ports_.kafka.metrics,
        _ports_.kafka.spring,
        _ports_.kafka.ksql,
        _ports_.kafka.connect_src,
        _ports_.kafka.connect_sink,
      ]);
      let cfg = Object.assign({}, config);

      let kafka: KiteKafkaCfg = {
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
          },
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
            ),
          },
        },
      };

      if (cfg.kafka.jmx !== undefined) {
        // default JMX ports in case the input does not provide all of the elements....
        const jPorts: number[] = [];

        for (let i = 0; i < cfg.kafka.brokers.size; i++) {
          if (
            cfg.kafka.jmx?.ports !== undefined &&
            i < cfg.kafka.jmx?.ports.length
          )
            jPorts.push(cfg.kafka.jmx.ports[i]);
          else jPorts.push(_ports_.jmx.external + i);
        }

        kafka = {
          ...kafka,
          jmx: {
            ...cfg.kafka.jmx,
            ports: await checkPorts(jPorts),
          },
        };
      }

      if (cfg.kafka.spring !== undefined) {
        kafka = {
          ...kafka,
          spring: {
            ...kafka.spring,
            port: await checkPort(
              cfg.kafka.spring.port ?? _ports_.spring.external
            ),
          },
        };
      }
      // assign the parameters
      cfg = { ...cfg, kafka: { ...cfg.kafka, ...kafka } };
      if (cfg.db !== undefined) {
        let db = Object.assign({}, cfg.db);
        if (db.kafkaconnect !== undefined) {
          db = {
            ...db,
            kafkaconnect: {
              ...db.kafkaconnect,
              port: await checkPort(
                db.kafkaconnect?.port ?? _ports_.kafkaconnect_src.external
              ),
            },
          };
        } else {
          db = {
            ...db,
            kafkaconnect: {
              port: await checkPort(_ports_.kafkaconnect_src.external),
            },
          };
        }
        db = {
          ...db,
          port: await checkPort(
            db.port ??
              (db.name === 'ksql'
                ? _ports_.ksql.external
                : _ports_.postgresql.external)
          ),
        };
        if (db.ksql !== undefined) {
          db = {
            ...db,
            ksql: {
              ...db.ksql,
              schema_port: await checkPort(
                db.ksql.schema_port ?? _ports_.ksql_schema.external
              ),
            },
          };
        }
        // assign the parameters
        cfg = { ...cfg, db: { ...cfg.db, ...db } };
      }

      if (cfg.sink !== undefined) {
        let sink = Object.assign({}, cfg.sink);
        if (sink.kafkaconnect !== undefined) {
          sink = {
            ...sink,
            kafkaconnect: {
              ...sink.kafkaconnect,
              port: await checkPort(
                sink.kafkaconnect.port ?? _ports_.kafkaconnect_sink.external
              ),
            },
          };
        } else {
          sink = {
            ...sink,
            kafkaconnect: {
              port: await checkPort(_ports_.kafkaconnect_sink.external),
            },
          };
        }
        if (sink.name === 'jupyter') {
          sink = {
            ...sink,
            port: await checkPort(sink?.port ?? _ports_.jupyter.external),
          };
        } else {
          // spark
          sink = {
            ...sink,
            port: await checkPort(sink?.port ?? _ports_.spark.webui.external),
            rpc_port: await checkPort(
              sink?.rpc_port ?? _ports_.spark.rpc.external
            ),
          };
        }
        // assign the parameters
        cfg = { ...cfg, sink: { ...cfg.sink, ...sink } };
      }
      if (cfg.grafana !== undefined) {
        const grafana = {
          ...cfg.grafana,
          port: await checkPort(cfg.grafana.port ?? _ports_.grafana.external),
        };
        // assign the parameters
        cfg = { ...cfg, grafana: { ...cfg.grafana, ...grafana } };
      }
      if (cfg.prometheus !== undefined) {
        const prometheus = {
          ...cfg.prometheus,
          port: await checkPort(
            cfg.prometheus.port ?? _ports_.prometheus.external
          ),
        };
        // assign the parameters
        cfg = { ...cfg, prometheus: { ...cfg.prometheus, ...prometheus } };
      }
      return cfg;
    } catch (error) {
      console.error('Error occurred while checking config ports!', error);
      return config;
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
    const cfg = await checkConfigPorts(config);
    store.dispatch(setState(<KiteState>'Init'));
    store.dispatch(setServerState(<KiteServerState>'Disconnected'));
    // create config + setup
    try {
      // generate the docker config
      const generate: Function = ymlGenerator();
      store.dispatch(setConfig(cfg));
      store.dispatch(setSetup(generate(cfg)));
      // package the download, comment out or make optional fro time optimization
      store.dispatch(setPackageBuild(zipPath));
      const header = {
        'Content-Type': 'text/yml',
        'Content-Length': fs.statSync(configPath).size,
      };
      const fileStream = fs.readFileSync(configPath, 'utf-8');
      store.dispatch(setConfigFile({ header, fileStream }));
      store.dispatch(setState(<KiteState>'Configured'));
      console.log('yaml configuration complete...');
    } catch (err) {
      console.error(`KITE failed to initialize: ${err}\nConfiguration ${cfg}`);
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
      store.dispatch(setState(<KiteState>'Running'));
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
        log: true,
        // commandOptions: '', // TBD set the name of container
      });
      store.dispatch(setState(<KiteState>'Running'));
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
          Accept: 'application/json',
        },
        body: JSON.stringify({ service }),
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
          log: true,
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
          Accept: 'application/json',
        },
        body: JSON.stringify({ service }),
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
          log: true,
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
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
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
        commandOptions: ['--remove-orphans', '--volumes'], //force stop and delete volumes.
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
          Accept: 'application/json',
        },
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
        commandOptions: ['--remove-orphans', '--volumes'], //force stop and delete volumes.
      });
    } catch (err) {
      console.error(`Could not disconnect docker instances on local:\n${err}`);
    }
  }

  async function getPackageBuildServer(): Promise<KiteConfigFile | Error> {
    try {
      const { server } = store.getState();
      const res = await fetch(`${server}/api/kite/getPackageBuild`, {
        method: 'GET',
        headers: {
          Accept: 'application/zip',
        },
      });
      return { fileStream: await res.arrayBuffer() };
    } catch (err) {
      console.error(`Could not retrieve package.zip from server:\n${err}`);
      throw err;
    }
  }

  function getPackageBuildLocal(): Promise<KiteConfigFile> {
    fs.removeSync(zipPath);
    zipper.sync.zip(downloadDir).compress().save(zipPath);

    return new Promise((res, rej) => {
      try {
        const header = {
          'Content-Type': 'application/zip',
          'Content-Length': fs.statSync(zipPath).size,
        };
        const fileStream = fs.readFileSync(zipPath);
        res({ header, fileStream });
      } catch (err) {
        rej(err);
      }
    });
  }

  async function getKiteStateServer(): Promise<KiteState> {
    const { server } = store.getState();
    const res = await fetch(`${server}/api/kite/getKiteState`, {
      method: 'GET',
      headers: {
        Accept: 'application/text',
      },
    });
    return await res.text();
  }

  async function getConfigFileServer(): Promise<any> {
    const { server } = store.getState();
    const res = await fetch(`${server}/api/kite/getConfigFile`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    return await res.json();
  }

  async function getConfigServer(): Promise<KiteConfig> {
    const { server } = store.getState();
    const res = await fetch(`${server}/api/kite/getConfig`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    return (await res.json()) as KiteConfig;
  }

  async function getDBSetupServer(): Promise<dbCfg | undefined> {
    const { dBSetup } = await getSetupServer();
    return dBSetup;
  }

  async function getKafkaSetupServer(): Promise<KafkaSetup> {
    const { kafkaSetup } = await getSetupServer();
    return kafkaSetup;
  }

  async function getSetupServer(): Promise<KiteSetup> {
    const { server } = store.getState();
    const res = await fetch(`${server}/api/kite/getSetup`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    return (await res.json()) as KiteSetup;
  }

  return {
    //Public Variables / Methods:

    defaultCfg: defaultCfg,

    /**
     * @param {string | KiteConfig} arg
     * either the configuration object or
     * the address of kite server instance
     * for remote or local setup.
     */
    configure: async function (arg?: string | KiteConfig) {
      console.log('Configuring docker instances...');
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
      console.log('Deploying docker instances...');
      if (serverState === <KiteServerState>'Connected') {
        await deployServer();
      } else {
        await deployLocal();
      }
    },

    /**
     * @returns {KiteSetup}
     * setup to be used for connecting
     * to a kafka instance and/or database.
     */
    getSetup: function (): KiteSetup | Promise<KiteSetup> {
      const { serverState } = store.getState();
      if (serverState === <KiteServerState>'Connected') return getSetupServer();
      else return store.getState().setup as KiteSetup;
    },

    /**
     * @returns {KafkaSetup}
     * setup to be used for connecting
     * to a kafka instance.
     */
    getKafkaSetup: function (): KafkaSetup | Promise<KafkaSetup> {
      const { serverState } = store.getState();
      if (serverState === <KiteServerState>'Connected')
        return getKafkaSetupServer();
      else return store.getState().kafkaSetup as KafkaSetup;
    },

    /**
     * @returns {dbCfg}
     * setup to be used for connecting
     * to a database.
     */
    getDBSetup: function (): dbCfg | Promise<dbCfg | undefined> {
      const { serverState } = store.getState();
      if (serverState === <KiteServerState>'Connected')
        return getDBSetupServer();
      else return store.getState().dBSetup as dbCfg;
    },

    /**
     * If connected to kite server, gets the config from the server.
     *
     * @returns {KiteConfig}
     *
     */
    getConfig: function (): KiteConfig | Promise<KiteConfig> {
      const { serverState } = store.getState();
      if (serverState === <KiteServerState>'Connected')
        return getConfigServer();
      else return store.getState().config as KiteConfig;
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
    getConfigFile: function (): KiteConfigFile | Promise<KiteConfigFile> {
      const { serverState } = store.getState();
      if (serverState === <KiteServerState>'Connected')
        return getConfigFileServer();
      else return store.getState().configFile as KiteConfigFile;
    },

    /**
     *
     * @returns state of the Kite Application
     */
    getKiteState: function (): KiteState | Promise<KiteState> {
      const { serverState } = store.getState();
      if (serverState === <KiteServerState>'Connected')
        return getKiteStateServer();
      else return store.getState().state as KiteState;
    },

    /**
     *
     * @returns state of Kite Server
     */
    getKiteServerState: function (): KiteServerState {
      return store.getState().serverState;
    },

    getPackageBuild: function (): Promise<KiteConfigFile | Error> {
      const { serverState } = store.getState();
      console.log('Getting package build zip...');
      if (serverState === <KiteServerState>'Connected') {
        return getPackageBuildServer();
      } else {
        return getPackageBuildLocal();
      }
    },
    /**
     * If the kite server isn't running
     * invokes the docker-compose
     * down method directly. Otherwise
     * makes a request to shutdown remotely.
     */
    disconnect: async function (): Promise<any> {
      const { serverState } = store.getState();
      console.log('Disconnecting from docker instances...');
      if (serverState === <KiteServerState>'Connected') {
        store.dispatch(setServerState(<KiteServerState>'Disconnected'));
        disconnectServer();
      } else {
        disconnectLocal();
      }
      store.dispatch(setState(<KiteState>'Shutdown'));
    },

    /**
     * If the kite server isn't running
     * invokes the docker-compose
     * down method directly. Otherwise
     * makes a request to shutdown remotely.
     */
    shutdown: async function (): Promise<any> {
      const { serverState } = store.getState();
      console.log('Shutting down docker instances and removing volumes...');
      if ((serverState as KiteServerState) === 'Connected') {
        store.dispatch(setServerState(<KiteServerState>'Disconnected'));
        await shutdownServer();
      } else {
        await shutdownLocal();
      }
      store.dispatch(setState(<KiteState>'Shutdown'));
    },
    /**
     *
     */
    pause: async function (service?: string[]): Promise<any> {
      const { serverState, services } = store.getState();
      if (service === undefined || service.length === 0 || service[0] === '') {
        // default to use all.
        console.log('Pausing all docker instances...');
        service = services;
      } else {
        console.log('Pausing docker instance(s): ' + JSON.stringify(service));
      }
      if (serverState === <KiteServerState>'Connected') {
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
      if (service === undefined || service.length === 0 || service[0] === '') {
        // default to use all.
        service = services;
        console.log('Unpausing all docker instances...');
      } else {
        console.log('Unpausing docker instance(s): ' + JSON.stringify(service));
      }
      if (serverState === <KiteServerState>'Connected') {
        await unpauseServer(service);
      } else {
        await unpauseLocal(service);
      }
      store.dispatch(setServiceState({ type: 'unpause', service }));
    },
  };
}
export const Kite = KiteCreator();
export const default_ports = _ports_;
