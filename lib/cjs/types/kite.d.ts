// types/common/kite.d.ts

export interface KiteConfig {
  kafka: KiteKafkaCfg;
  db?: dbCfg;
  sink?: sinkCfg;
  grafana?: grafanaCfg;
  prometheus?: prometheusCfg;
}

export interface dbCfg {
  name: 'postgresql' | 'ksql';
  port?: number | undefined;
  postgresql?: {
    username: string;
    password: string;
    dbname: string;
  };
  ksql?: {
    schema_port?: number | undefined;
  };
  kafkaconnect?: {
    port?: number | undefined;
  };
}

export interface sinkCfg {
  name: 'jupyter' | 'spark';
  port?: number;
  rpc_port?: number;
  kafkaconnect?: {
    port?: number | undefined;
  };
}

export interface grafanaCfg {
  port?: number | undefined;
}

export interface prometheusCfg {
  port?: number | undefined;
  scrape_interval?: number; //seconds
  evaluation_interval?: number; //seconds
}

export interface KiteKafkaCfg {
  brokers: {
    size: number;
    id?: number[]; // [101, 102,...]
    replicas?: number; // must be less than size
    ports?: {
      brokers?: number[] | undefined; // external ports to access brokers
      metrics?: number | undefined; // confluent metric interface on docker net
      jmx?: number[] | undefined; // broker interface with jmx on docker net
    };
  };
  zookeepers: {
    size: number;
    ports?: {
      peer?: {
        //does not need to be configurable, docker net only
        internal: number; // 2888
        external: number; // 3888
      };
      client?: number[] | undefined; // [2181, 2182] //external
    };
  };
  jmx?: {
    ports?: number[] | undefined; // external host port to interface with port
  };
  spring?: {
    port?: number | undefined; // external host port to interface with 8080
  };
}

export interface KiteSetup {
  dBSetup?: dbCfg;
  kafkaSetup: KafkaSetup;
  spring?: { port: number };
  prometheus?: { port: number };
  grafana?: { port: number };
  zookeeper?: { ports: number[] };
  jmx?: { ports: number[] };
  jupyter?: { port: number };
  spark?: { port: number[] };
  docker?: { services: string[] };
}

export interface KiteConfigFile {
  header?: any;
  fileStream: Buffer;
}

export interface KafkaSetup {
  clientId: string;
  brokers: Array<string>;
  ssl?: boolean;
}
