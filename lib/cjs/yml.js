"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const yml_1 = require("./constants/yml");
const dependencies = [];
const setup = {
    kafkaSetup: {
        clientId: '',
        brokers: [],
        ssl: false,
    },
};
const ipAddress = Object.values(os_1.default.networkInterfaces())
    .flat()
    .filter((obj) => obj !== undefined && obj.family === 'IPv4' && !obj.internal)
    .map((obj) => obj === null || obj === void 0 ? void 0 : obj.address)[0];
const ymlGenerator = () => {
    return (config) => {
        var _a, _b, _c;
        console.log('creating Kite Config yml...');
        const { kafka, db, sink, grafana, prometheus } = config;
        try {
            const dBSetup = createDB(db);
            if (dBSetup !== undefined)
                setup.dBSetup = dBSetup;
            createSink(config);
            if (prometheus !== undefined) {
                const extPromPort = (_a = prometheus.port) !== null && _a !== void 0 ? _a : yml_1._ports_.prometheus.external;
                yml_1.YAML.services.prometheus = Object.assign(Object.assign({}, yml_1.PROMETHEUS), { ports: [`${extPromPort}:${yml_1._ports_.prometheus.internal}`] });
                setup.prometheus = { port: extPromPort };
                fs_extra_1.default.ensureDirSync(path_1.default.resolve(yml_1.downloadDir, 'prometheus'));
            }
            if (grafana !== undefined) {
                const extGrafPort = (_b = grafana === null || grafana === void 0 ? void 0 : grafana.port) !== null && _b !== void 0 ? _b : yml_1._ports_.grafana.external;
                yml_1.YAML.services.grafana = Object.assign(Object.assign({}, yml_1.GRAFANA), { ports: [`${extGrafPort}:${yml_1._ports_.grafana.internal}`] });
                setup.grafana = { port: extGrafPort };
            }
            const servers = createZooKeepers(kafka);
            createBrokers(config, servers);
            fs_extra_1.default.writeFileSync(path_1.default.resolve(yml_1.downloadDir, 'docker-compose.yml'), js_yaml_1.default.dump(yml_1.YAML, { noRefs: true }));
            if (prometheus !== undefined) {
                yml_1.PROMCONFIG.global.scrape_interval = `${prometheus.scrape_interval}s`;
                yml_1.PROMCONFIG.global.scrape_timeout =
                    prometheus.scrape_interval !== undefined
                        ? prometheus.scrape_interval - 1 <= 0
                            ? '1s'
                            : `${prometheus.scrape_interval - 1}s`
                        : '4s';
                yml_1.PROMCONFIG.global.evaluation_interval = `${prometheus.evaluation_interval}s`;
                fs_extra_1.default.writeFileSync(path_1.default.resolve(yml_1.downloadDir, 'prometheus/prometheus.yml'), js_yaml_1.default.dump(yml_1.PROMCONFIG, { noRefs: true }));
                yml_1.PROMCONFIG.scrape_configs[0].static_configs[0].targets = [];
                yml_1.PROMCONFIG.scrape_configs[1].static_configs[0].targets = [];
            }
        }
        catch (error) {
            console.log(error);
        }
        finally {
            for (const service in yml_1.YAML.services) {
                if ('docker' in setup) {
                    (_c = setup.docker) === null || _c === void 0 ? void 0 : _c.services.push(service);
                }
                else {
                    setup.docker = { services: [service] };
                }
            }
            return setup;
        }
    };
    function createDB(db) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        if ((db === null || db === void 0 ? void 0 : db.name) === 'postgresql') {
            dependencies.push(db.name);
            yml_1.YAML.services.postgresql = Object.assign(Object.assign({}, yml_1.POSTGRES), { ports: [
                    `${(_a = db.port) !== null && _a !== void 0 ? _a : yml_1._ports_.postgresql.external}:${yml_1._ports_.postgresql.internal}`,
                ], environment: Object.assign(Object.assign({}, yml_1.POSTGRES.environment), { POSTGRES_USER: (_c = (_b = db.postgresql) === null || _b === void 0 ? void 0 : _b.username) !== null && _c !== void 0 ? _c : 'admin', POSTGRES_PASSWORD: (_e = (_d = db.postgresql) === null || _d === void 0 ? void 0 : _d.password) !== null && _e !== void 0 ? _e : 'admin', POSTGRES_DB: (_g = (_f = db.postgresql) === null || _f === void 0 ? void 0 : _f.dbname) !== null && _g !== void 0 ? _g : 'xkiteDB' }) });
            yml_1.YAML.volumes = Object.assign(Object.assign({}, yml_1.YAML.volumes), { postgresql: {
                    driver: 'local',
                } });
            yml_1.YAML.services.kafka_connect_src = yml_1.KAFKA_CONNECT_SRC;
        }
        else if ((db === null || db === void 0 ? void 0 : db.name) === 'ksql') {
            yml_1.YAML.services.ksql = Object.assign(Object.assign({}, yml_1.KSQL), { ports: [`${(_h = db.port) !== null && _h !== void 0 ? _h : yml_1._ports_.ksql.external}:${yml_1._ports_.ksql.internal}`], environment: Object.assign(Object.assign({}, yml_1.KSQL.environment), { KSQL_LISTENERS: `http://0.0.0.0:${(_j = db.port) !== null && _j !== void 0 ? _j : yml_1._ports_.ksql.external}`, KSQL_KSQL_SCHEMA_REGISTRY_URL: `http://schema-registry:${(_l = (_k = db.ksql) === null || _k === void 0 ? void 0 : _k.schema_port) !== null && _l !== void 0 ? _l : yml_1._ports_.ksql_schema.internal}` }) });
            yml_1.YAML.services.ksql_schema = Object.assign(Object.assign({}, yml_1.KSQL_SCHEMA), { ports: [
                    `${(_o = (_m = db.ksql) === null || _m === void 0 ? void 0 : _m.schema_port) !== null && _o !== void 0 ? _o : yml_1._ports_.ksql_schema.external}:${yml_1._ports_.ksql_schema.internal}`,
                ] });
            yml_1.YAML.services.ksql_cli = Object.assign(Object.assign({}, yml_1.KSQL_CLI), { depends_on: [yml_1.YAML.services.ksql.container_name] });
            yml_1.YAML.services.kafka_connect_src = yml_1.KAFKA_CONNECT_SRC;
        }
        return db;
    }
    function createSink(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        if (config.sink !== undefined) {
            yml_1.YAML.services.kafka_connect_sink = Object.assign(Object.assign({}, yml_1.KAFKA_CONNECT_SINK), { ports: [
                    `${(_c = (_b = (_a = config.sink) === null || _a === void 0 ? void 0 : _a.kafkaconnect) === null || _b === void 0 ? void 0 : _b.port) !== null && _c !== void 0 ? _c : yml_1._ports_.kafkaconnect_sink.external}:${yml_1._ports_.kafkaconnect_sink.internal}`,
                ] });
            if (((_d = config.sink) === null || _d === void 0 ? void 0 : _d.name) === 'jupyter') {
                yml_1.YAML.services.jupyter = Object.assign(Object.assign({}, yml_1.JUPYTER), { ports: [
                        `${(_f = (_e = config.sink) === null || _e === void 0 ? void 0 : _e.port) !== null && _f !== void 0 ? _f : yml_1._ports_.jupyter.external}:${yml_1._ports_.jupyter.internal}`,
                    ] });
                setup.jupyter = { port: (_h = (_g = config.sink) === null || _g === void 0 ? void 0 : _g.port) !== null && _h !== void 0 ? _h : yml_1._ports_.jupyter.external };
            }
            else if (((_j = config.sink) === null || _j === void 0 ? void 0 : _j.name) === 'spark') {
                yml_1.YAML.services.spark = Object.assign(Object.assign({}, yml_1.SPARK), { ports: [
                        `${(_l = (_k = config.sink) === null || _k === void 0 ? void 0 : _k.port) !== null && _l !== void 0 ? _l : yml_1._ports_.spark.webui.external}:${yml_1._ports_.spark.webui.internal}`,
                        `${(_o = (_m = config.sink) === null || _m === void 0 ? void 0 : _m.rpc_port) !== null && _o !== void 0 ? _o : yml_1._ports_.spark.rpc.external}:${yml_1._ports_.spark.rpc.internal}`,
                    ] });
                setup.spark = {
                    port: [
                        (_q = (_p = config.sink) === null || _p === void 0 ? void 0 : _p.port) !== null && _q !== void 0 ? _q : yml_1._ports_.spark.webui.external,
                        (_s = (_r = config.sink) === null || _r === void 0 ? void 0 : _r.rpc_port) !== null && _s !== void 0 ? _s : yml_1._ports_.spark.rpc.external,
                    ],
                };
            }
        }
    }
    function createZooKeepers(kafka) {
        var _a, _b;
        console.log('creating zookeepers...');
        const numOfZKs = kafka.zookeepers.size > 1 ? kafka.zookeepers.size : 1;
        const name = (x) => `zookeeper${x}`;
        const getZKServerPorts = () => {
            let zkClients = '';
            let zkPeers = '';
            const getPeerPort = (x) => {
                if (kafka.zookeepers.ports !== undefined &&
                    kafka.zookeepers.ports.peer !== undefined)
                    return `${kafka.zookeepers.ports.peer.external}:${kafka.zookeepers.ports.peer.internal};`;
                return `${x + 1}${yml_1._ports_.zookeeper.peer.external}:${x + 1}${yml_1._ports_.zookeeper.peer.internal};`;
            };
            const getClientPort = (x) => {
                var _a, _b;
                if (kafka.zookeepers.ports !== undefined &&
                    ((_a = kafka.zookeepers.ports) === null || _a === void 0 ? void 0 : _a.client) !== undefined)
                    return ((_b = kafka.zookeepers.ports) === null || _b === void 0 ? void 0 : _b.client[x]) + ',';
                return `${x + 1}${yml_1._ports_.zookeeper.client.external},`;
            };
            for (let i = 0; i < numOfZKs; i++) {
                zkClients += `${name(i + 1)}:${getClientPort(i)}`;
                zkPeers += `${name(i + 1)}:${getPeerPort(i)}`;
            }
            zkClients = zkClients.slice(0, -1);
            zkPeers = zkPeers.slice(0, -1);
            return { zkClients, zkPeers };
        };
        const servers = getZKServerPorts();
        setup.zookeeper = { ports: [] };
        for (let i = 0; i < numOfZKs; i++) {
            const n = i + 1;
            const name = `zookeeper${n}`;
            let cport = 10000 * n + yml_1._ports_.zookeeper.client.external;
            if (((_a = kafka.zookeepers.ports) === null || _a === void 0 ? void 0 : _a.client) !== undefined &&
                kafka.zookeepers.ports.client[i] !== undefined) {
                cport = kafka.zookeepers.ports.client[i];
            }
            yml_1.YAML.services[name] = Object.assign(Object.assign({}, yml_1.ZOOKEEPER), { environment: Object.assign(Object.assign({}, yml_1.ZOOKEEPER.environment), { ZOOKEEPER_SERVER_ID: n, ZOOKEEPER_CLIENT_PORT: cport, ZOOKEEPER_SERVERS: servers.zkPeers }), ports: [`${cport}:${yml_1._ports_.zookeeper.client.internal}`], container_name: name });
            setup.zookeeper.ports.push(cport);
            if (yml_1.YAML.services.ksql_schema !== undefined) {
                (_b = yml_1.YAML.services.ksql_schema.depends_on) === null || _b === void 0 ? void 0 : _b.push(name);
                yml_1.YAML.services.ksql_schema.environment.SCHEMA_REGISTRY_KAFKASTORE_CONNECTION_URL += `${name}:${yml_1._ports_.zookeeper.client.internal},`;
            }
            dependencies.push(name);
        }
        return servers;
    }
    function createBrokers(config, servers) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const { kafka } = config;
        console.log('creating brokers...');
        let jmxExporterConfig;
        console.log(`JMX = ${kafka.jmx}`);
        if (kafka.jmx !== undefined) {
            fs_extra_1.default.ensureDirSync(path_1.default.resolve(yml_1.downloadDir, 'jmx'));
            jmxExporterConfig = js_yaml_1.default.load(fs_extra_1.default.readFileSync(path_1.default.resolve(yml_1.downloadDir, 'jmx/exporter/template.yml'), 'utf8'));
            setup.jmx = { ports: [] };
        }
        const springBSServers = [];
        const springDeps = [];
        for (let i = 0; i < kafka.brokers.size; i++) {
            const n = i + 1;
            const brokerName = `kafka${n}`;
            let extPort = yml_1._ports_.kafka.broker.external + i;
            if (kafka.brokers.ports !== undefined &&
                kafka.brokers.ports.brokers !== undefined &&
                kafka.brokers.ports.brokers[i] !== undefined)
                extPort = kafka.brokers.ports.brokers[i];
            let metricsPort = yml_1._ports_.kafka.metrics;
            if (kafka.brokers.ports !== undefined &&
                kafka.brokers.ports.metrics !== undefined)
                metricsPort = kafka.brokers.ports.metrics;
            springBSServers.push(`${brokerName}:${yml_1._ports_.kafka.spring}`);
            let jmxHostPort = yml_1._ports_.kafka.jmx + i;
            if (kafka.brokers.ports !== undefined &&
                kafka.brokers.ports.jmx !== undefined &&
                kafka.brokers.ports.jmx[i] !== undefined)
                jmxHostPort = kafka.brokers.ports.jmx[i];
            let brokerID = 101 + i;
            if (kafka.brokers.id !== undefined && kafka.brokers.id[i] !== undefined)
                brokerID = kafka.brokers.id[i];
            yml_1.YAML.services[brokerName] = Object.assign(Object.assign({}, yml_1.KAFKA_BROKER), { ports: [`${extPort}:${yml_1._ports_.kafka.broker.internal}`], container_name: brokerName, depends_on: dependencies, environment: Object.assign(Object.assign({}, yml_1.KAFKA_BROKER.environment), { KAFKA_BROKER_ID: brokerID, KAFKA_JMX_PORT: jmxHostPort, KAFKA_LISTENERS: `METRICS://:${metricsPort},PLAINTEXT://:${extPort},INTERNAL://:${yml_1._ports_.kafka.spring},KSQL://${brokerName}:${yml_1._ports_.kafka.ksql},CONNECT://${brokerName}:${yml_1._ports_.kafka.connect}`, KAFKA_ADVERTISED_LISTENERS: `METRICS://${brokerName}:${metricsPort},PLAINTEXT://${yml_1.network}:${extPort},INTERNAL://${brokerName}:${yml_1._ports_.kafka.spring},KSQL://${brokerName}:${yml_1._ports_.kafka.ksql},CONNECT://${brokerName}:${yml_1._ports_.kafka.connect}`, KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: ((_a = kafka.brokers.replicas) !== null && _a !== void 0 ? _a : 1) > kafka.brokers.size
                        ? kafka.brokers.size
                        : (_b = kafka.brokers.replicas) !== null && _b !== void 0 ? _b : 1, KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: ((_c = kafka.brokers.replicas) !== null && _c !== void 0 ? _c : 1) > kafka.brokers.size
                        ? kafka.brokers.size
                        : (_d = kafka.brokers.replicas) !== null && _d !== void 0 ? _d : 1, CONFLUENT_METRICS_REPORTER_BOOTSTRAP_SERVERS: `${brokerName}:${metricsPort}`, KAFKA_ZOOKEEPER_CONNECT: servers.zkClients, CONFLUENT_METRICS_REPORTER_ZOOKEEPER_CONNECT: servers.zkClients }) });
            setup.kafkaSetup.brokers.push(`${yml_1.network}:${extPort}`);
            springDeps.push(brokerName);
            if (kafka.jmx !== undefined) {
                let jmxPort = yml_1._ports_.jmx.internal + n;
                const jmxName = `jmx-kafka${n}`;
                if (kafka.jmx !== undefined && ((_e = kafka.jmx) === null || _e === void 0 ? void 0 : _e.ports) !== undefined) {
                    jmxPort = (_f = kafka.jmx) === null || _f === void 0 ? void 0 : _f.ports[i];
                }
                yml_1.YAML.services[jmxName] = Object.assign(Object.assign({}, yml_1.JMX), { command: [`${yml_1._ports_.jmx.internal}`, '/etc/myconfig.yml'], ports: [`${jmxPort}:${yml_1._ports_.jmx.internal}`], environment: Object.assign(Object.assign({}, yml_1.JMX.environment), { SERVICE_PORT: yml_1._ports_.jmx.internal }), container_name: jmxName, volumes: [
                        `${path_1.default.join(yml_1.downloadDir, `/jmx/jmxConfigKafka${n}.yml`)}:/etc/myconfig.yml`,
                    ], depends_on: [`kafka${n}`] });
                (_h = (_g = setup.jmx) === null || _g === void 0 ? void 0 : _g.ports) === null || _h === void 0 ? void 0 : _h.push(jmxPort);
                jmxExporterConfig.hostPort = `kafka${n}:${jmxHostPort}`;
                fs_extra_1.default.writeFileSync(path_1.default.resolve(yml_1.downloadDir, `jmx/jmxConfigKafka${n}.yml`), js_yaml_1.default.dump(jmxExporterConfig, { noRefs: true }));
                if (config.prometheus !== undefined) {
                    yml_1.PROMCONFIG.scrape_configs[0].static_configs[0].targets.push(`${jmxName}:${yml_1._ports_.jmx.internal}`);
                    yml_1.PROMCONFIG.scrape_configs[1].static_configs[0].targets.push(`${ipAddress}:${yml_1._ports_.docker.internal}`);
                }
            }
            if (yml_1.YAML.services.ksql !== undefined) {
                yml_1.YAML.services.ksql = Object.assign(Object.assign({}, yml_1.YAML.services.ksql), { environment: Object.assign(Object.assign({}, yml_1.YAML.services.ksql.environment), { KSQL_BOOTSTRAP_SERVERS: yml_1.YAML.services.ksql.environment.KSQL_BOOTSTRAP_SERVERS +
                            `${brokerName}:${yml_1._ports_.kafka.ksql},` }) });
                if (yml_1.YAML.services.ksql_cli !== undefined) {
                    const deps = (_j = yml_1.YAML.services.ksql_cli.depends_on) !== null && _j !== void 0 ? _j : [
                        yml_1.YAML.services.ksql.container_name,
                    ];
                    deps.push(`${brokerName}`);
                    yml_1.YAML.services.ksql_cli = Object.assign(Object.assign({}, yml_1.YAML.services.ksql_cli), { depends_on: deps });
                }
            }
            if (yml_1.YAML.services.kafka_connect_src !== undefined) {
                const kcenv = yml_1.YAML.services.kafka_connect_src.environment;
                const kcdeps = yml_1.YAML.services.kafka_connect_src.depends_on === undefined ||
                    ((_k = yml_1.YAML.services.kafka_connect_src.depends_on) === null || _k === void 0 ? void 0 : _k.length) === 0
                    ? [brokerName]
                    : [...yml_1.YAML.services.kafka_connect_src.depends_on, brokerName];
                yml_1.YAML.services.kafka_connect_src = Object.assign(Object.assign({}, yml_1.YAML.services.kafka_connect_src), { environment: Object.assign(Object.assign({}, kcenv), { CONNECT_BOOTSTRAP_SERVERS: kcenv.CONNECT_BOOTSTRAP_SERVERS !== ''
                            ? `${kcenv.CONNECT_BOOTSTRAP_SERVERS},${brokerName}:${yml_1._ports_.kafka.connect}`
                            : `${brokerName}:${yml_1._ports_.kafka.connect}` }), depends_on: kcdeps });
            }
            if (yml_1.YAML.services.kafka_connect_sink !== undefined) {
                const kcenv = yml_1.YAML.services.kafka_connect_sink.environment;
                const kcdeps = yml_1.YAML.services.kafka_connect_sink.depends_on === undefined ||
                    ((_l = yml_1.YAML.services.kafka_connect_sink.depends_on) === null || _l === void 0 ? void 0 : _l.length) === 0
                    ? [brokerName]
                    : [...yml_1.YAML.services.kafka_connect_sink.depends_on, brokerName];
                yml_1.YAML.services.kafka_connect_sink = Object.assign(Object.assign({}, yml_1.YAML.services.kafka_connect_sink), { environment: Object.assign(Object.assign({}, kcenv), { CONNECT_BOOTSTRAP_SERVERS: kcenv.CONNECT_BOOTSTRAP_SERVERS !== ''
                            ? `${kcenv.CONNECT_BOOTSTRAP_SERVERS},${brokerName}:${yml_1._ports_.kafka.connect}`
                            : `${brokerName}:${yml_1._ports_.kafka.connect}` }), depends_on: kcdeps });
            }
        }
        if (kafka.spring !== undefined) {
            const springPort = (_o = (_m = kafka.spring) === null || _m === void 0 ? void 0 : _m.port) !== null && _o !== void 0 ? _o : yml_1._ports_.spring.external;
            yml_1.YAML.services.spring = Object.assign(Object.assign({}, yml_1.SPRING), { ports: [`${springPort}:${yml_1._ports_.spring.external}`], environment: Object.assign(Object.assign({}, yml_1.SPRING.environment), { 'SPRING_KAFKA_BOOTSTRAP-SERVERS': springBSServers.join(','), 'SPRING_KAFKA_CONSUMER_BOOTSTRAP-SERVERS': springBSServers.join(','), 'SPRING_KAFKA_PRODUCER_BOOTSTRAP-SERVERS': springBSServers.join(',') }), depends_on: springDeps });
            setup.spring = { port: springPort };
        }
    }
};
exports.default = ymlGenerator;
