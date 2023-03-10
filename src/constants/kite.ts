import path from 'path';
import { KiteConfig } from '../types/index.js';
import * as yml from './yml.js';
const { downloadDir, _ports_ } = yml;

export const defaultCfg: KiteConfig = {
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
    scrape_interval: 10,
    evaluation_interval: 5,
    port: _ports_.prometheus.external,
  },
};

export const configFilePath = path.resolve(downloadDir, 'config');
