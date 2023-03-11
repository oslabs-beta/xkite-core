"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_NUMBER_OF_ZOOKEEPERS = exports.MAX_NUMBER_OF_BROKERS = exports._ports_ = exports.downloadDir = exports.ymlGenerator = exports.configFilePath = exports.KiteServerState = exports.KiteState = exports.defaultCfg = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const docker_compose_1 = __importDefault(require("docker-compose"));
const yml_1 = __importDefault(require("./yml"));
exports.ymlGenerator = yml_1.default;
const zipper = require('zip-local');
const kite_1 = require("./constants/kite");
Object.defineProperty(exports, "KiteState", { enumerable: true, get: function () { return kite_1.KiteState; } });
Object.defineProperty(exports, "KiteServerState", { enumerable: true, get: function () { return kite_1.KiteServerState; } });
Object.defineProperty(exports, "MAX_NUMBER_OF_BROKERS", { enumerable: true, get: function () { return kite_1.MAX_NUMBER_OF_BROKERS; } });
Object.defineProperty(exports, "MAX_NUMBER_OF_ZOOKEEPERS", { enumerable: true, get: function () { return kite_1.MAX_NUMBER_OF_ZOOKEEPERS; } });
const kite_2 = __importStar(require("./constants/kite"));
exports.defaultCfg = kite_2.default;
Object.defineProperty(exports, "configFilePath", { enumerable: true, get: function () { return kite_2.configFilePath; } });
const getPorts_1 = require("./getPorts");
const yml_2 = require("./constants/yml");
Object.defineProperty(exports, "_ports_", { enumerable: true, get: function () { return yml_2._ports_; } });
Object.defineProperty(exports, "downloadDir", { enumerable: true, get: function () { return yml_2.downloadDir; } });
const configPath = path_1.default.join(yml_2.downloadDir, 'docker-compose.yml');
const zipPath = path_1.default.join(yml_2.downloadDir, 'pipeline.zip');
const store_1 = __importDefault(require("./state/store"));
const slice_1 = require("./state/slice");
function KiteCreator() {
    const selectedPorts = new Set();
    function configServer(server) {
        return __awaiter(this, void 0, void 0, function* () {
            store_1.default.dispatch((0, slice_1.setServer)(server));
            store_1.default.dispatch((0, slice_1.setState)(kite_1.KiteState.Init));
            store_1.default.dispatch((0, slice_1.setServerState)(kite_1.KiteServerState.Disconnected));
            try {
                const res = [
                    fetch(`${server}/api/kite/getConfig`),
                    fetch(`${server}/api/kite/getSetup`),
                    fetch(`${server}/api/kite/getConfigFile`),
                    fetch(`${server}/api/kite/getPackageBuild`),
                ];
                store_1.default.dispatch((0, slice_1.setConfig)((yield res[0]).json()));
                store_1.default.dispatch((0, slice_1.setSetup)((yield res[1]).json()));
                store_1.default.dispatch((0, slice_1.setConfigFile)((yield res[2]).json()));
                store_1.default.dispatch((0, slice_1.setPackageBuild)((yield res[3]).json()));
                store_1.default.dispatch((0, slice_1.setServerState)(kite_1.KiteServerState.Connected));
            }
            catch (err) {
                console.error(`error fetching from ${server}/api/:\n${err}`);
            }
        });
    }
    function checkPorts(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(args);
                const retPorts = [];
                for (const port of args) {
                    const avPort = yield (0, getPorts_1.getPorts)(port, 1);
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
                        throw Error(`No available ports found range: ${port} - ${port + 200}`);
                }
                return retPorts;
            }
            catch (error) {
                console.error('Error occurred while checking available ports!', error);
            }
        });
    }
    function checkPort(port) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const avPort = yield (0, getPorts_1.getPorts)(port, 1);
                return avPort[0];
            }
            catch (error) {
                console.error('Error occurred while checking available ports!', error);
            }
        });
    }
    function checkConfigPorts(cfg) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                cfg.kafka = Object.assign(Object.assign({}, cfg.kafka), { brokers: Object.assign(Object.assign({}, cfg.kafka.brokers), { ports: Object.assign(Object.assign({}, cfg.kafka.brokers.ports), { brokers: yield checkPorts((_c = (_b = (_a = cfg.kafka.brokers) === null || _a === void 0 ? void 0 : _a.ports) === null || _b === void 0 ? void 0 : _b.brokers) !== null && _c !== void 0 ? _c : new Array(cfg.kafka.brokers.size).fill(yml_2._ports_.kafka.broker.external)), jmx: yield checkPorts((_f = (_e = (_d = cfg.kafka.brokers) === null || _d === void 0 ? void 0 : _d.ports) === null || _e === void 0 ? void 0 : _e.jmx) !== null && _f !== void 0 ? _f : new Array(cfg.kafka.brokers.size).fill(yml_2._ports_.kafka.jmx)) }) }), zookeepers: Object.assign(Object.assign({}, cfg.kafka.zookeepers), { ports: Object.assign(Object.assign({}, cfg.kafka.zookeepers.ports), { client: yield checkPorts((_j = (_h = (_g = cfg.kafka.zookeepers) === null || _g === void 0 ? void 0 : _g.ports) === null || _h === void 0 ? void 0 : _h.client) !== null && _j !== void 0 ? _j : new Array(cfg.kafka.zookeepers.size).fill(yml_2._ports_.zookeeper.client.external)) }) }) });
                if (cfg.kafka.jmx !== undefined) {
                    cfg.kafka.jmx = Object.assign(Object.assign({}, cfg.kafka.jmx), { ports: yield checkPorts((_k = cfg.kafka.jmx.ports) !== null && _k !== void 0 ? _k : new Array(cfg.kafka.zookeepers.size).fill(yml_2._ports_.jmx.external)) });
                }
                if (cfg.kafka.spring !== undefined) {
                    cfg.kafka.spring = Object.assign(Object.assign({}, cfg.kafka.spring), { port: yield checkPort((_l = cfg.kafka.spring.port) !== null && _l !== void 0 ? _l : yml_2._ports_.spring.external) });
                }
                if (cfg.db !== undefined) {
                    if (cfg.db.kafkaconnect !== undefined) {
                        cfg.db.kafkaconnect = Object.assign(Object.assign({}, cfg.db.kafkaconnect), { port: yield checkPort((_o = (_m = cfg.db.kafkaconnect) === null || _m === void 0 ? void 0 : _m.port) !== null && _o !== void 0 ? _o : yml_2._ports_.kafkaconnect_src.external) });
                    }
                    else {
                        cfg.db.kafkaconnect = {
                            port: yield checkPort(yml_2._ports_.kafkaconnect_src.external),
                        };
                    }
                    cfg.db = Object.assign(Object.assign({}, cfg.db), { port: yield checkPort((_p = cfg.db.port) !== null && _p !== void 0 ? _p : (cfg.db.name === 'ksql'
                            ? yml_2._ports_.ksql.external
                            : yml_2._ports_.postgresql.external)) });
                    if (cfg.db.ksql !== undefined) {
                        cfg.db.ksql = Object.assign(Object.assign({}, cfg.db.ksql), { schema_port: yield checkPort((_q = cfg.db.ksql.schema_port) !== null && _q !== void 0 ? _q : yml_2._ports_.ksql_schema.external) });
                    }
                }
                if (cfg.sink !== undefined) {
                    if (cfg.sink.kafkaconnect !== undefined) {
                        cfg.sink.kafkaconnect = Object.assign(Object.assign({}, cfg.sink.kafkaconnect), { port: yield checkPort((_r = cfg.sink.kafkaconnect.port) !== null && _r !== void 0 ? _r : yml_2._ports_.kafkaconnect_sink.external) });
                    }
                    else {
                        cfg.sink = Object.assign(Object.assign({}, cfg.sink), { kafkaconnect: {
                                port: yield checkPort(yml_2._ports_.kafkaconnect_sink.external),
                            } });
                    }
                    if (cfg.sink.name === 'jupyter') {
                        cfg.sink = Object.assign(Object.assign({}, cfg.sink), { port: yield checkPort((_t = (_s = cfg.sink) === null || _s === void 0 ? void 0 : _s.port) !== null && _t !== void 0 ? _t : yml_2._ports_.jupyter.external) });
                    }
                    else {
                        cfg.sink = Object.assign(Object.assign({}, cfg.sink), { port: yield checkPort((_v = (_u = cfg.sink) === null || _u === void 0 ? void 0 : _u.port) !== null && _v !== void 0 ? _v : yml_2._ports_.spark.webui.external), rpc_port: yield checkPort((_x = (_w = cfg.sink) === null || _w === void 0 ? void 0 : _w.rpc_port) !== null && _x !== void 0 ? _x : yml_2._ports_.spark.rpc.external) });
                    }
                }
                if (cfg.grafana !== undefined) {
                    cfg.grafana = Object.assign(Object.assign({}, cfg.grafana), { port: yield checkPort((_y = cfg.grafana.port) !== null && _y !== void 0 ? _y : yml_2._ports_.grafana.external) });
                }
                if (cfg.prometheus !== undefined) {
                    cfg.prometheus = Object.assign(Object.assign({}, cfg.prometheus), { port: yield checkPort((_z = cfg.prometheus.port) !== null && _z !== void 0 ? _z : yml_2._ports_.prometheus.external) });
                }
            }
            catch (error) {
                console.error('Error occurred while checking config ports!', error);
            }
        });
    }
    function configLocal(config) {
        return __awaiter(this, void 0, void 0, function* () {
            yield checkConfigPorts(config);
            store_1.default.dispatch((0, slice_1.setState)(kite_1.KiteState.Init));
            store_1.default.dispatch((0, slice_1.setServerState)(kite_1.KiteServerState.Disconnected));
            try {
                const generate = (0, yml_1.default)();
                store_1.default.dispatch((0, slice_1.setConfig)(config));
                store_1.default.dispatch((0, slice_1.setSetup)(generate(config)));
                store_1.default.dispatch((0, slice_1.setPackageBuild)(zipPath));
                const header = {
                    'Content-Type': 'text/yml',
                    'Content-Length': fs_extra_1.default.statSync(configPath).size,
                };
                const fileStream = fs_extra_1.default.readFileSync(configPath, 'utf-8');
                store_1.default.dispatch((0, slice_1.setConfigFile)({ header, fileStream }));
                store_1.default.dispatch((0, slice_1.setState)(kite_1.KiteState.Configured));
                console.log('yaml configuration complete...');
            }
            catch (err) {
                console.error(`KITE failed to initialize: ${err}\nConfiguration ${config}`);
            }
        });
    }
    function deployServer() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { server } = store_1.default.getState();
                yield fetch(`${server}/api/kite/deploy`);
                store_1.default.dispatch((0, slice_1.setState)(kite_1.KiteState.Running));
            }
            catch (err) {
                console.error(`Kite deployment failed:\n${JSON.stringify(err)}`);
            }
        });
    }
    function deployLocal() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('deploying docker containers...');
                yield docker_compose_1.default.upAll({
                    cwd: yml_2.downloadDir,
                    log: true,
                });
                store_1.default.dispatch((0, slice_1.setState)(kite_1.KiteState.Running));
                console.log('docker deployment successful');
            }
            catch (err) {
                console.error(`Kite deployment failed:\n${JSON.stringify(err)}`);
            }
        });
    }
    function pauseServer(service) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { server } = store_1.default.getState();
                yield fetch(`${server}/api/kite/pause`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ service }),
                });
            }
            catch (err) {
                console.error(`Could not pause docker instances on server:\n${err}`);
            }
        });
    }
    function pauseLocal(service) {
        return __awaiter(this, void 0, void 0, function* () {
            if (service === undefined)
                return;
            for (const name of service) {
                try {
                    yield docker_compose_1.default.pauseOne(name, {
                        cwd: yml_2.downloadDir,
                        log: true,
                    });
                }
                catch (err) {
                    console.error(`Could not pause docker instances on local:\n${err}`);
                }
            }
        });
    }
    function unpauseServer(service) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { server } = store_1.default.getState();
                yield fetch(`${server}/api/kite/unpause`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ service }),
                });
            }
            catch (err) {
                console.error(`Could not unpause docker instances on server:\n${err}`);
            }
        });
    }
    function unpauseLocal(service) {
        return __awaiter(this, void 0, void 0, function* () {
            if (service === undefined)
                return;
            for (const name of service) {
                try {
                    yield docker_compose_1.default.unpauseOne(name, {
                        cwd: yml_2.downloadDir,
                        log: true,
                    });
                }
                catch (err) {
                    console.error(`Could not unpause docker instances on local:\n${err}`);
                }
            }
        });
    }
    function shutdownServer() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { server } = store_1.default.getState();
                yield fetch(`${server}/api/kite/shutdown`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                    },
                });
            }
            catch (err) {
                console.error(`Could not shutdown docker instances on server:\n${err}`);
            }
        });
    }
    function shutdownLocal() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield docker_compose_1.default.down({
                    cwd: yml_2.downloadDir,
                    log: true,
                    commandOptions: ['--remove-orphans', '--volumes'],
                });
            }
            catch (err) {
                console.error(`Could not shutdown docker instances on local:\n${err}`);
            }
        });
    }
    function disconnectServer() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { server } = store_1.default.getState();
                yield fetch(`${server}/api/kite/disconnect`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                    },
                });
            }
            catch (err) {
                console.error(`Could not disconnect docker instances on server:\n${err}`);
            }
        });
    }
    function disconnectLocal() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield docker_compose_1.default.down({
                    cwd: yml_2.downloadDir,
                    log: true,
                    commandOptions: ['--remove-orphans', '--volumes'],
                });
            }
            catch (err) {
                console.error(`Could not disconnect docker instances on local:\n${err}`);
            }
        });
    }
    return {
        defaultCfg: kite_2.default,
        configure: function (arg) {
            return __awaiter(this, void 0, void 0, function* () {
                if (arg === undefined) {
                    yield configLocal(kite_2.default);
                }
                else {
                    switch (typeof arg) {
                        case 'string':
                            yield configServer(arg);
                            break;
                        default:
                            yield configLocal(arg);
                            break;
                    }
                }
            });
        },
        deploy: function (arg) {
            return __awaiter(this, void 0, void 0, function* () {
                const { serverState } = store_1.default.getState();
                if (serverState === kite_1.KiteServerState.Connected) {
                    yield deployServer();
                }
                else {
                    yield deployLocal();
                }
            });
        },
        getSetup: function () {
            return store_1.default.getState().setup;
        },
        getKafkaSetup: function () {
            return store_1.default.getState().kafkaSetup;
        },
        getDBSetup: function () {
            return store_1.default.getState().dBSetup;
        },
        getConfig: function () {
            return store_1.default.getState().config;
        },
        getConfigFile: function () {
            return store_1.default.getState().configFile;
        },
        getKiteState: function () {
            return store_1.default.getState().state;
        },
        getKiteServerState: function () {
            return store_1.default.getState().serverState;
        },
        getPackageBuild: function () {
            fs_extra_1.default.removeSync(zipPath);
            zipper.sync.zip(yml_2.downloadDir).compress().save(zipPath);
            return new Promise((res, rej) => {
                try {
                    const header = {
                        'Content-Type': 'application/zip',
                        'Content-Length': fs_extra_1.default.statSync(zipPath).size,
                    };
                    const fileStream = fs_extra_1.default.readFileSync(zipPath);
                    res({ header, fileStream });
                }
                catch (err) {
                    rej(err);
                }
            });
        },
        disconnect: function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { serverState } = store_1.default.getState();
                if (serverState === kite_1.KiteServerState.Connected) {
                    store_1.default.dispatch((0, slice_1.setServerState)(kite_1.KiteServerState.Disconnected));
                    disconnectServer();
                }
                else {
                    disconnectLocal();
                }
                store_1.default.dispatch((0, slice_1.setState)(kite_1.KiteState.Shutdown));
            });
        },
        shutdown: function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { serverState } = store_1.default.getState();
                if (serverState === kite_1.KiteServerState.Connected) {
                    store_1.default.dispatch((0, slice_1.setServerState)(kite_1.KiteServerState.Disconnected));
                    yield shutdownServer();
                }
                else {
                    yield shutdownLocal();
                }
                store_1.default.dispatch((0, slice_1.setState)(kite_1.KiteState.Shutdown));
            });
        },
        pause: function (service) {
            return __awaiter(this, void 0, void 0, function* () {
                const { serverState, services } = store_1.default.getState();
                if (service === undefined)
                    service = services;
                if (serverState === kite_1.KiteServerState.Connected) {
                    store_1.default.dispatch((0, slice_1.setServerState)(kite_1.KiteServerState.Disconnected));
                    yield pauseServer(service);
                }
                else {
                    yield pauseLocal(service);
                }
                store_1.default.dispatch((0, slice_1.setServiceState)({ type: 'pause', service }));
            });
        },
        unpause: function (service) {
            return __awaiter(this, void 0, void 0, function* () {
                const { serverState, services } = store_1.default.getState();
                if (service === undefined)
                    service = services;
                if (serverState === kite_1.KiteServerState.Connected) {
                    store_1.default.dispatch((0, slice_1.setServerState)(kite_1.KiteServerState.Disconnected));
                    yield unpauseServer(service);
                }
                else {
                    yield unpauseLocal(service);
                }
                store_1.default.dispatch((0, slice_1.setServiceState)({ type: 'unpause', service }));
            });
        },
    };
}
const Kite = KiteCreator();
exports.default = Kite;
