"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configFilePath = exports.KiteServerState = exports.KiteState = exports.MAX_NUMBER_OF_ZOOKEEPERS = exports.MAX_NUMBER_OF_BROKERS = void 0;
const path_1 = __importDefault(require("path"));
const yml_1 = require("./yml");
exports.MAX_NUMBER_OF_BROKERS = 50;
exports.MAX_NUMBER_OF_ZOOKEEPERS = 1000;
const defaultCfg = {
    kafka: {
        brokers: {
            size: 2,
            replicas: 2,
        },
        zookeepers: {
            size: 2,
        },
        jmx: {
            ports: [yml_1._ports_.jmx.external, yml_1._ports_.jmx.external + 1],
        },
        spring: {
            port: yml_1._ports_.spring.external,
        },
    },
    db: {
        name: 'postgresql',
        port: yml_1._ports_.postgresql.external,
        kafkaconnect: { port: yml_1._ports_.kafkaconnect_src.external },
    },
    sink: {
        name: 'spark',
        port: yml_1._ports_.spark.webui.external,
        rpc_port: yml_1._ports_.spark.rpc.external,
        kafkaconnect: { port: yml_1._ports_.kafkaconnect_sink.external },
    },
    grafana: {
        port: yml_1._ports_.grafana.external,
    },
    prometheus: {
        scrape_interval: 5,
        evaluation_interval: 2,
        port: yml_1._ports_.prometheus.external,
    },
};
var KiteState;
(function (KiteState) {
    KiteState["Init"] = "Init";
    KiteState["Configured"] = "Configured";
    KiteState["Running"] = "Running";
    KiteState["Paused"] = "Paused";
    KiteState["Shutdown"] = "Shutdown";
})(KiteState = exports.KiteState || (exports.KiteState = {}));
var KiteServerState;
(function (KiteServerState) {
    KiteServerState["Disconnected"] = "Disconnected";
    KiteServerState["Connected"] = "Connected";
})(KiteServerState = exports.KiteServerState || (exports.KiteServerState = {}));
exports.configFilePath = path_1.default.join(__dirname, '../download/config');
exports.default = defaultCfg;
