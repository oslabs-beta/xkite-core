import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

import * as yml from './constants/yml.js';
const {
  YAML,
  SPRING,
  SPARK,
  JUPYTER,
  KSQL_SCHEMA,
  KSQL_CLI,
  KSQL,
  POSTGRES,
  GRAFANA,
  PROMETHEUS,
  ZOOKEEPER,
  KAFKA_BROKER,
  JMX,
  PROMCONFIG,
  downloadDir,
  network,
  _ports_,
  KAFKA_CONNECT_SRC,
  KAFKA_CONNECT_SINK,
} = yml;
import {
  dbCfg,
  KiteConfig,
  KiteKafkaCfg,
  KiteSetup,
  sinkCfg,
} from './types/index.js';

// const ipAddress = Object.values(os.networkInterfaces())
//   .flat()
//   .filter((obj) => obj !== undefined && obj.family === 'IPv4' && !obj.internal)
//   .map((obj) => obj?.address)[0];
/**
 * creates the pertinent yml configuration for docker
 * based on the input config
 * @returns a yaml generator function
 */
const ymlGenerator: () => (c: KiteConfig) => KiteSetup = () => {
  const dependencies: string[] = [];
  let setup: KiteSetup = {
    kafkaSetup: {
      clientId: '',
      brokers: [],
      ssl: false,
    },
  };
  /**
   * creates the pertinent yml configuration for docker
   * based on the input config
   * @param config
   * @returns KiteSetup for use in Kite instance.
   */
  return (config: KiteConfig): KiteSetup => {
    console.log('creating Kite Config yml...');
    const { kafka, db, sink, grafana, prometheus } = config;

    try {
      // database
      const dBSetup = createDB(db);
      if (dBSetup !== undefined) setup = { ...setup, dBSetup };
      createSink(config);

      // prometheus
      if (prometheus !== undefined) {
        const extPromPort = prometheus.port ?? _ports_.prometheus.external;
        YAML.services.prometheus = {
          ...PROMETHEUS,
          ports: [`${extPromPort}:${_ports_.prometheus.internal}`],
        };
        setup = {
          ...setup,
          prometheus: { port: extPromPort },
        };
        fs.ensureDirSync(path.resolve(downloadDir, 'prometheus'));
      }

      // grafana
      if (grafana !== undefined) {
        const extGrafPort = grafana?.port ?? _ports_.grafana.external;
        YAML.services.grafana = {
          ...GRAFANA,
          ports: [`${extGrafPort}:${_ports_.grafana.internal}`],
        };
        setup = { ...setup, grafana: { port: extGrafPort } };
      }

      // Checks if directories download, prometheus and jmx exist, if not, then it creates all of them
      // fs.ensureDirSync(downloadDir);

      const servers = createZooKeepers(kafka);
      createBrokers(config, servers);

      fs.writeFileSync(
        path.resolve(downloadDir, 'docker-compose.yml'),
        yaml.dump(YAML, { noRefs: true })
      );

      if (prometheus !== undefined) {
        PROMCONFIG.global.scrape_interval = `${prometheus.scrape_interval}s`;
        PROMCONFIG.global.scrape_timeout =
          prometheus.scrape_interval !== undefined
            ? prometheus.scrape_interval - 1 <= 0
              ? '1s'
              : `${prometheus.scrape_interval - 1}s`
            : '10s';
        PROMCONFIG.global.evaluation_interval = `${prometheus.evaluation_interval}s`;

        fs.writeFileSync(
          path.resolve(downloadDir, 'prometheus/prometheus.yml'),
          yaml.dump(PROMCONFIG, { noRefs: true })
        );

        PROMCONFIG.scrape_configs[0].static_configs[0].targets = [];
        // PROMCONFIG.scrape_configs[1].static_configs[0].targets = [];
      }
    } catch (error) {
      console.error(error);
    } finally {
      for (const service in YAML.services) {
        if ('docker' in setup) {
          if (setup.docker?.services !== undefined) {
            setup = {
              ...setup,
              docker: {
                services: [...setup.docker.services, service],
              },
            };
          }
        } else {
          setup = { ...setup, docker: { services: [service] } };
        }
      }
      return setup;
    }
  };

  /**
   * creates either a PSQL or KSQL database containers
   * based on the db config passed in.
   * @param db
   * @returns the database configuration if one is
   * configured from the yamlGeneration.
   */
  function createDB(db?: dbCfg): dbCfg | undefined {
    if (db?.name === 'postgresql') {
      // dependencies.push(db.name);
      YAML.services.postgresql = {
        ...POSTGRES,
        ports: [
          `${db.port ?? _ports_.postgresql.external}:${
            _ports_.postgresql.internal
          }`,
        ],
        environment: {
          ...POSTGRES.environment,
          POSTGRES_USER: db.postgresql?.username ?? 'admin',
          POSTGRES_PASSWORD: db.postgresql?.password ?? 'admin',
          POSTGRES_DB: db.postgresql?.dbname ?? 'xkiteDB',
        },
      };
      YAML.volumes = {
        ...YAML.volumes,
        postgresql: {
          driver: 'local',
        },
      };
      // kafka-connect source
      // TODO: Set connector for PSQL
      YAML.services.kafka_connect_src = KAFKA_CONNECT_SRC;
    } else if (db?.name === 'ksql') {
      YAML.services.ksql = {
        ...KSQL,
        ports: [`${db.port ?? _ports_.ksql.external}:${_ports_.ksql.internal}`],
        environment: {
          ...KSQL.environment,
          KSQL_LISTENERS: `http://0.0.0.0:${db.port ?? _ports_.ksql.external}`,
          KSQL_KSQL_SCHEMA_REGISTRY_URL: `http://schema-registry:${
            db.ksql?.schema_port ?? _ports_.ksql_schema.internal //TODO revisit/test
          }`,
        },
      };
      YAML.services.ksql_schema = {
        ...KSQL_SCHEMA,
        ports: [
          `${db.ksql?.schema_port ?? _ports_.ksql_schema.external}:${
            _ports_.ksql_schema.internal
          }`,
        ],
      };
      YAML.services.ksql_cli = {
        ...KSQL_CLI,
        depends_on: [YAML.services.ksql.container_name],
      };
      // kafka-connect source
      YAML.services.kafka_connect_src = KAFKA_CONNECT_SRC;
      // TODO: Set connector for KSQL
    }
    return db;
  }

  /**
   * Create YAML services for Sink input
   * @param config
   */
  function createSink(config: KiteConfig) {
    if (config.sink !== undefined) {
      YAML.services.kafka_connect_sink = {
        ...KAFKA_CONNECT_SINK,
        ports: [
          `${
            config.sink?.kafkaconnect?.port ??
            _ports_.kafkaconnect_sink.external
          }:${_ports_.kafkaconnect_sink.internal}`,
        ],
      };
      if (config.sink?.name === 'jupyter') {
        YAML.services.jupyter = {
          ...JUPYTER,
          ports: [
            `${config.sink?.port ?? _ports_.jupyter.external}:${
              _ports_.jupyter.internal
            }`,
          ],
        };
        setup = {
          ...setup,
          jupyter: { port: config.sink?.port ?? _ports_.jupyter.external },
        };
        //TODO set connector for sink
      } else if (config.sink?.name === 'spark') {
        YAML.services.spark = {
          ...SPARK,
          ports: [
            `${config.sink?.port ?? _ports_.spark.webui.external}:${
              _ports_.spark.webui.internal
            }`,
            `${config.sink?.rpc_port ?? _ports_.spark.rpc.external}:${
              _ports_.spark.rpc.internal
            }`,
          ],
        };
        setup = {
          ...setup,
          spark: {
            port: [
              config.sink?.port ?? _ports_.spark.webui.external,
              config.sink?.rpc_port ?? _ports_.spark.rpc.external,
            ],
          },
        };
        //TODO set connector for sink
      } // TODO add psql ksql as sink options...
    }
  }

  /**
   * Creates the zookeeper configurations
   * and updates ksql config which relies
   * on the zookeeper.
   *
   * @param kafka
   * @returns object which contains the
   * zookeeper server and client ports
   * for use in other setups reliant on
   * zookeeper (kafka).
   */
  function createZooKeepers(kafka: KiteKafkaCfg): {
    zkClients: string;
    zkPeers: string;
  } {
    console.log('creating zookeepers...');
    const numOfZKs = kafka.zookeepers.size > 1 ? kafka.zookeepers.size : 1;
    // get server list
    const name = (x: number) => `zookeeper${x}`;

    const getZKServerPorts: () => {
      zkClients: string;
      zkPeers: string;
    } = () => {
      let zkClients: string = '';
      let zkPeers: string = '';
      const getPeerPort: (x: number) => string = (x) => {
        if (
          kafka.zookeepers.ports !== undefined &&
          kafka.zookeepers.ports.peer !== undefined
        )
          return `${kafka.zookeepers.ports.peer.external}:${kafka.zookeepers.ports.peer.internal};`;
        return `${x + 1}${_ports_.zookeeper.peer.external}:${x + 1}${
          _ports_.zookeeper.peer.internal
        };`;
      };
      const getClientPort: (x: number) => string = (x) => {
        if (
          kafka.zookeepers.ports !== undefined &&
          kafka.zookeepers.ports?.client !== undefined
        )
          return kafka.zookeepers.ports?.client[x] + ',';
        return `${x + 1}${_ports_.zookeeper.client.external},`;
      };
      for (let i: number = 0; i < numOfZKs; i++) {
        zkClients += `${name(i + 1)}:${getClientPort(i)}`;
        zkPeers += `${name(i + 1)}:${getPeerPort(i)}`;
      }
      zkClients = zkClients.slice(0, -1);
      zkPeers = zkPeers.slice(0, -1);
      return { zkClients, zkPeers };
    };

    const servers = getZKServerPorts();
    setup = { ...setup, zookeeper: { ports: [] } };
    // construct zookeepers
    for (let i = 0; i < numOfZKs; i++) {
      const n = i + 1;
      const name = `zookeeper${n}`;
      let cport = 10000 * n + _ports_.zookeeper.client.external;
      if (
        kafka.zookeepers.ports?.client !== undefined &&
        kafka.zookeepers.ports.client[i] !== undefined
      ) {
        cport = kafka.zookeepers.ports.client[i];
      }

      YAML.services[name] = {
        ...ZOOKEEPER,
        environment: {
          ...ZOOKEEPER.environment,
          ZOOKEEPER_SERVER_ID: n,
          ZOOKEEPER_CLIENT_PORT: cport,
          ZOOKEEPER_SERVERS: servers.zkPeers,
        },
        ports: [`${cport}:${_ports_.zookeeper.client.internal}`],
        container_name: name,
      };
      if (setup.zookeeper !== undefined)
        setup = {
          ...setup,
          zookeeper: { ports: [...setup.zookeeper.ports, cport] },
        };
      // update the schema with the zk info
      if (YAML.services.ksql_schema !== undefined) {
        YAML.services.ksql_schema.environment.SCHEMA_REGISTRY_KAFKASTORE_CONNECTION_URL += `${name}:${_ports_.zookeeper.client.internal},`; //last comma may be an issue?
      }
      dependencies.push(name);
    }
    return servers;
  }

  /**
   * Create docker configs for broker related images
   * updates the ksql and spring containers which
   * depend on the kafka brokers.
   * Creates the kafka and JMX configurations.
   * @param config
   * @param servers
   *
   */
  function createBrokers(
    config: KiteConfig,
    servers: { zkClients: string; zkPeers: string }
  ) {
    const { kafka } = config;
    console.log('creating brokers...');
    // console.log(JSON.stringify(kafka));
    // console.log(JSON.stringify(servers));
    let jmxExporterConfig: any;
    // console.log(`JMX = ${kafka.jmx}`);
    if (kafka.jmx !== undefined) {
      fs.ensureDirSync(path.resolve(downloadDir, 'jmx'));
      jmxExporterConfig = yaml.load(
        fs.readFileSync(
          path.resolve(downloadDir, 'jmx/exporter/template.yml'),
          'utf8'
        )
      );
      setup = { ...setup, jmx: { ports: [] } };
    }

    const springBSServers: string[] = [];
    const springDeps: string[] = [];
    for (let i = 0; i < kafka.brokers.size; i++) {
      const n = i + 1;
      // Kafka Config:
      const brokerName = `kafka${n}`;
      // broker ports
      let extPort = _ports_.kafka.broker.external + i;
      if (
        kafka.brokers.ports !== undefined &&
        kafka.brokers.ports.brokers !== undefined &&
        kafka.brokers.ports.brokers[i] !== undefined
      )
        extPort = kafka.brokers.ports.brokers[i];
      // metrics reporter port
      let metricsPort = _ports_.kafka.metrics;
      if (
        kafka.brokers.ports !== undefined &&
        kafka.brokers.ports.metrics !== undefined
      )
        metricsPort = kafka.brokers.ports.metrics;
      springBSServers.push(`${brokerName}:${_ports_.kafka.spring}`);
      // jmx host port
      let jmxHostPort = _ports_.kafka.jmx + i;
      if (
        kafka.brokers.ports !== undefined &&
        kafka.brokers.ports.jmx !== undefined &&
        kafka.brokers.ports.jmx[i] !== undefined
      )
        jmxHostPort = kafka.brokers.ports.jmx[i];
      // broker id
      let brokerID = 101 + i;
      if (kafka.brokers.id !== undefined && kafka.brokers.id[i] !== undefined)
        brokerID = kafka.brokers.id[i];
      // update YAML service
      YAML.services[brokerName] = {
        ...KAFKA_BROKER,
        ports: [`${extPort}:${_ports_.kafka.broker.internal}`],
        container_name: brokerName,
        depends_on: dependencies,
        environment: {
          ...KAFKA_BROKER.environment,
          KAFKA_BROKER_ID: brokerID,
          KAFKA_JMX_PORT: jmxHostPort,
          KAFKA_LISTENERS: `METRICS://:${metricsPort},PLAINTEXT://:${extPort},INTERNAL://:${_ports_.kafka.spring},KSQL://${brokerName}:${_ports_.kafka.ksql},CONNECT_SRC://${brokerName}:${_ports_.kafka.connect_src},CONNECT_SINK://${brokerName}:${_ports_.kafka.connect_sink}`,
          KAFKA_ADVERTISED_LISTENERS: `METRICS://${brokerName}:${metricsPort},PLAINTEXT://${network}:${extPort},INTERNAL://${brokerName}:${_ports_.kafka.spring},KSQL://${brokerName}:${_ports_.kafka.ksql},CONNECT_SRC://${brokerName}:${_ports_.kafka.connect_src},CONNECT_SINK://${brokerName}:${_ports_.kafka.connect_sink}`,
          KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR:
            (kafka.brokers.replicas ?? 1) > kafka.brokers.size
              ? kafka.brokers.size
              : kafka.brokers.replicas ?? 1,
          KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR:
            (kafka.brokers.replicas ?? 1) > kafka.brokers.size
              ? kafka.brokers.size
              : kafka.brokers.replicas ?? 1,
          CONFLUENT_METRICS_REPORTER_BOOTSTRAP_SERVERS: `${brokerName}:${metricsPort}`,
          KAFKA_ZOOKEEPER_CONNECT: servers.zkClients,
          CONFLUENT_METRICS_REPORTER_ZOOKEEPER_CONNECT: servers.zkClients,
        },
      };
      // requires port forwarding on host computer
      setup = {
        ...setup,
        kafkaSetup: {
          ...setup.kafkaSetup,
          brokers: [...setup.kafkaSetup.brokers, `${network}:${extPort}`],
        },
      };
      springDeps.push(brokerName);

      // JMX Config:
      if (kafka.jmx !== undefined) {
        let jmxPort = _ports_.jmx.external + n;
        const jmxName = `jmx-kafka${n}`;
        if (kafka.jmx !== undefined && kafka.jmx?.ports !== undefined) {
          jmxPort = kafka.jmx?.ports[i] ?? jmxPort;
        }
        // update YAML service
        YAML.services[jmxName] = {
          ...JMX,
          command: [`${_ports_.jmx.internal}`, '/etc/myconfig.yml'], // set the port for the service
          ports: [`${jmxPort}:${_ports_.jmx.internal}`],
          environment: {
            ...JMX.environment,
            SERVICE_PORT: _ports_.jmx.internal,
          },
          container_name: jmxName,
          volumes: [
            `${path.join(
              downloadDir,
              `/jmx/jmxConfigKafka${n}.yml`
            )}:/etc/myconfig.yml`,
          ],
          depends_on: [`kafka${n}`],
        };
        let jmxArr = [jmxPort];
        if (setup.jmx?.ports !== undefined)
          jmxArr = [...setup.jmx?.ports, jmxPort];
        setup = {
          ...setup,
          jmx: { ports: jmxArr },
        };
        jmxExporterConfig.hostPort = `kafka${n}:${jmxHostPort}`;
        fs.writeFileSync(
          path.resolve(downloadDir, `jmx/jmxConfigKafka${n}.yml`),
          yaml.dump(jmxExporterConfig, { noRefs: true })
        );

        if (config.prometheus !== undefined) {
          PROMCONFIG.scrape_configs[0].static_configs[0].targets.push(
            `${jmxName}:${_ports_.jmx.internal}`
          );
          // PROMCONFIG.scrape_configs[1].static_configs[0].targets.push(
          //   `${ipAddress}:${_ports_.docker.internal}`
          // ); //TO DO: IK: configure the port
        }
      }

      // set kqsl bootstrap servers
      if (YAML.services.ksql !== undefined) {
        // update the schema with the zk info
        if (YAML.services.ksql_schema !== undefined) {
          YAML.services.ksql_schema.environment = {
            ...YAML.services.ksql_schema.environment,
            SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS:
              YAML.services.ksql_schema.environment
                .SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS +
              `PLAINTEXT://${brokerName}:9092,`,
          };
        }

        YAML.services.ksql = {
          ...YAML.services.ksql,
          environment: {
            ...YAML.services.ksql.environment,
            KSQL_BOOTSTRAP_SERVERS:
              YAML.services.ksql.environment.KSQL_BOOTSTRAP_SERVERS +
              `${brokerName}:${_ports_.kafka.ksql},`,
          },
        };
        if (YAML.services.ksql_cli !== undefined) {
          const deps = YAML.services.ksql_cli.depends_on ?? [
            YAML.services.ksql.container_name,
          ];
          deps.push(`${brokerName}`);
          YAML.services.ksql_cli = {
            ...YAML.services.ksql_cli,
            depends_on: deps,
          };
        }
      }
      // kafka-connect
      if (YAML.services.kafka_connect_src !== undefined) {
        const kcenv = YAML.services.kafka_connect_src.environment;
        const kcdeps =
          YAML.services.kafka_connect_src.depends_on === undefined ||
          YAML.services.kafka_connect_src.depends_on?.length === 0
            ? [brokerName]
            : [...YAML.services.kafka_connect_src.depends_on, brokerName];
        YAML.services.kafka_connect_src = {
          ...YAML.services.kafka_connect_src,
          environment: {
            ...kcenv,
            CONNECT_BOOTSTRAP_SERVERS:
              kcenv.CONNECT_BOOTSTRAP_SERVERS !== ''
                ? `${kcenv.CONNECT_BOOTSTRAP_SERVERS},${brokerName}:${_ports_.kafka.connect_src}`
                : `${brokerName}:${_ports_.kafka.connect_src}`,
          },
          depends_on: kcdeps,
        };
      }
      if (YAML.services.kafka_connect_sink !== undefined) {
        const kcenv = YAML.services.kafka_connect_sink.environment;
        const kcdeps =
          YAML.services.kafka_connect_sink.depends_on === undefined ||
          YAML.services.kafka_connect_sink.depends_on?.length === 0
            ? [brokerName]
            : [...YAML.services.kafka_connect_sink.depends_on, brokerName];
        YAML.services.kafka_connect_sink = {
          ...YAML.services.kafka_connect_sink,
          environment: {
            ...kcenv,
            CONNECT_BOOTSTRAP_SERVERS:
              kcenv.CONNECT_BOOTSTRAP_SERVERS !== ''
                ? `${kcenv.CONNECT_BOOTSTRAP_SERVERS},${brokerName}:${_ports_.kafka.connect_sink}`
                : `${brokerName}:${_ports_.kafka.connect_sink}`,
          },
          depends_on: kcdeps,
        };
      }
    }

    if (kafka.spring !== undefined) {
      // build dependencies
      const springPort = kafka.spring?.port ?? _ports_.spring.external;
      YAML.services.spring = {
        ...SPRING,
        ports: [`${springPort}:${_ports_.spring.external}`],
        environment: {
          ...SPRING.environment,
          'SPRING_KAFKA_BOOTSTRAP-SERVERS': springBSServers.join(','),
          'SPRING_KAFKA_CONSUMER_BOOTSTRAP-SERVERS': springBSServers.join(','),
          'SPRING_KAFKA_PRODUCER_BOOTSTRAP-SERVERS': springBSServers.join(','),
        },
        depends_on: springDeps,
      };
      setup = {
        ...setup,
        spring: { port: springPort },
      };
    }
    if (YAML.services.ksql_schema !== undefined) {
      YAML.services.ksql_schema.depends_on = [...dependencies, ...springDeps];
    }
  }
};
export default ymlGenerator;
