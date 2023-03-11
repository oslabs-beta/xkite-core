import path from 'path';
import { _ports_ } from './ymlgenerator/constants';
export const MAX_NUMBER_OF_BROKERS = 50;
export const MAX_NUMBER_OF_ZOOKEEPERS = 1000;
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
            ports: [_ports_.jmx.external, _ports_.jmx.external + 1],
        },
        spring: {
            port: _ports_.spring.external,
        },
    },
    db: {
        name: 'postgresql',
        port: _ports_.postgresql.external,
        kafkaconnect: { port: _ports_.kafkaconnect_src.external },
    },
    sink: {
        name: 'spark',
        port: _ports_.spark.webui.external,
        rpc_port: _ports_.spark.rpc.external,
        kafkaconnect: { port: _ports_.kafkaconnect_sink.external },
    },
    grafana: {
        port: _ports_.grafana.external,
    },
    prometheus: {
        scrape_interval: 5,
        evaluation_interval: 2,
        port: _ports_.prometheus.external,
    },
};
export var KiteState;
(function (KiteState) {
    KiteState["Init"] = "Init";
    KiteState["Configured"] = "Configured";
    KiteState["Running"] = "Running";
    KiteState["Paused"] = "Paused";
    KiteState["Shutdown"] = "Shutdown";
})(KiteState || (KiteState = {}));
export var KiteServerState;
(function (KiteServerState) {
    KiteServerState["Disconnected"] = "Disconnected";
    KiteServerState["Connected"] = "Connected";
})(KiteServerState || (KiteServerState = {}));
export const configFilePath = path.join(process.cwd(), 'src/common/kite/download/config');
export default defaultCfg;
