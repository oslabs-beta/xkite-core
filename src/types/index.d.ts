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

export type MAX_NUMBER_OF_BROKERS = 50;
export type MAX_NUMBER_OF_ZOOKEEPERS = 1000;

export type KiteState =
  | 'Unknown'
  | 'Init'
  | 'Configured'
  | 'Running'
  | 'Paused'
  | 'Shutdown';
export type KiteServerState = 'Disconnected' | 'Connected';

export interface KiteClass {
  defaultCfg: KiteConfig;
  configure: (arg?: string | KiteConfig | undefined) => Promise<void>;
  deploy: (arg?: any) => Promise<void>;
  getSetup: () => KiteSetup | Promise<KiteSetup>;
  getKafkaSetup: () => KafkaSetup | Promise<KafkaSetup>;
  getDBSetup: () => dbCfg | Promise<dbCfg | undefined>;
  getConfig: () => KiteConfig | Promise<KiteConfig>;
  getConfigFile: () => KiteConfigFile | Promise<KiteConfigFile>;
  getKiteState: () => KiteState | Promise<KiteState>;
  getKiteServerState: () => KiteServerState;
  getPackageBuild: () => Promise<KiteConfigFile | Error>;
  disconnect: () => Promise<any>;
  shutdown: () => Promise<any>;
  pause: (service?: string[] | undefined) => Promise<any>;
  unpause: (service?: string[] | undefined) => Promise<any>;
}
// types/yaml.d.ts

export type YAMLGenerator = (k: KiteConfig) => KiteSetup;

export interface YAMLConfig {
  services: {
    [k: string]: BaseCfg | KafkaBrokerCfg | ZooKeeperCfg | JMXConfg | undefined;
    postgresql?: PGConfig;
    ksql?: KSQLConfig;
    ksql_cli?: BaseCfg;
    ksql_schema?: KSQLSchemaCfg;
    spark?: BaseCfg;
    spring?: SpringCfg;
    prometheus?: PrometheusConfig;
    grafana?: GrafanaCfg;
    jupyter?: BaseCfg;
    kafka_connect_src?: KafkaConnectCfg;
    kafka_connect_sink?: KafkaConnectCfg;
  };
  volumes?: {
    [k: string]: VolumeCfg;
  };
}

export interface VolumeCfg {
  driver: 'local' | 'global';
  external?: 'true' | 'false';
  labels?: {};
  mountpoint?: string;
  name?: string;
  options?: {};
  scope?: 'local' | 'global';
  driver_opts?: {
    o?: string;
    type?: string;
    device?: string;
  };
}

export interface YAMLServicesDefaultSetup {
  postgresql: PortForward;
  ksql: PortForward;
  ksql_schema: PortForward;
  spark: { webui: PortForward; rpc: PortForward };
  spring: PortForward;
  prometheus: PortForward;
  grafana: PortForward;
  jupyter: PortForward;
  zookeeper: { client: PortForward; peer: PortForward };
  kafkaconnect_src: PortForward;
  kafkaconnect_sink: PortForward;
  kafka: {
    jmx: number;
    broker: PortForward;
    spring: number;
    metrics: number;
    ksql: number;
    connect_src: number;
    connect_sink: number;
  };
  jmx: PortForward;
  docker: PortForward;
}
export type PortForward = {
  internal: number;
  external: number;
};

export interface YAMLDataSetup {
  dbSrc: string;
  env: YAMLDataEnv;
}

export interface YAMLDataEnv {
  username: string;
  password: string;
  dbName: string;
  URI: string;
}

export interface PROMConfig {
  global: {
    scrape_interval: string;
    evaluation_interval: string;
    scrape_timeout: string;
  };
  rule_files: Array<null>;
  scrape_configs: [
    {
      job_name: string;
      static_configs: [{ targets: Array<string> }];
    }
    // {
    //   job_name: string;
    //   static_configs: [{ targets: Array<string> }];
    // }
  ];
}

export interface PrometheusConfig extends BaseCfg {}

export interface KafkaConnectCfg extends BaseCfg {
  environment: {
    CONNECT_BOOTSTRAP_SERVERS: string;
    CONNECT_REST_PORT: number;
    CONNECT_GROUP_ID: string;
    CONNECT_CONFIG_STORAGE_TOPIC: string;
    CONNECT_OFFSET_STORAGE_TOPIC: string;
    CONNECT_STATUS_STORAGE_TOPIC: string;
    CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: number;
    CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: number;
    CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: number;
    CONNECT_KEY_CONVERTER: string; //org.apache.kafka.connect.json.JsonConverter
    CONNECT_VALUE_CONVERTER: string; //org.apache.kafka.connect.json.JsonConverter
    CONNECT_INTERNAL_KEY_CONVERTER: string; //org.apache.kafka.connect.json.JsonConverter
    CONNECT_INTERNAL_VALUE_CONVERTER: string; //org.apache.kafka.connect.json.JsonConverter
    CONNECT_REST_ADVERTISED_HOST_NAME: string; //localhost
  };
}

export interface KafkaBrokerCfg extends BaseCfg {
  environment: {
    KAFKA_ZOOKEEPER_CONNECT?: string;
    KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: string;
    KAFKA_INTER_BROKER_LISTENER_NAME: string;
    CONFLUENT_METRICS_REPORTER_ZOOKEEPER_CONNECT?: string;
    CONFLUENT_METRICS_REPORTER_TOPIC_REPLICAS: number;
    CONFLUENT_METRICS_ENABLE: string;
    KAFKA_HEAP_OPTS: string;
    KAFKA_BROKER_ID: number;
    KAFKA_JMX_PORT: number;
    KAFKA_LISTENERS: string;
    KAFKA_ADVERTISED_LISTENERS: string;
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: number;
    KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: number;
    CONFLUENT_METRICS_REPORTER_BOOTSTRAP_SERVERS: string;
    KAFKA_AUTO_CREATE_TOPICS_ENABLE?: string;
    KAFKA_DELETE_TOPIC_ENABLE?: string;
    KAFKA_CREATE_TOPICS?: string;
  };
}

export interface ZooKeeperCfg extends BaseCfg {
  environment: {
    ZOOKEEPER_SERVER_ID?: number;
    ZOOKEEPER_CLIENT_PORT: number;
    ZOOKEEPER_TICK_TIME: number;
    ZOOKEEPER_INIT_LIMIT: number;
    ZOOKEEPER_SYNC_LIMIT: number;
    ZOOKEEPER_SERVERS: string;
  };
}

export interface GrafanaCfg extends BaseCfg {
  environment: {
    GF_PATHS_DATA: string;
    GF_SECURITY_ALLOW_EMBEDDING: string;
    GF_AUTH_ANONYMOUS_ENABLED: string;
    GF_SMTP_ENABLED: string;
    GF_SECURITY_ADMIN_PASSWORD: string;
  };
}

export interface PGConfig extends BaseCfg {
  environment: {
    POSTGRES_PASSWORD: string;
    POSTGRES_USER: string;
    POSTGRES_DB: string;
    PGDATA: string;
  };
}

//https://docs.ksqldb.io/en/latest/operate-and-deploy/installation/install-ksqldb-with-docker/
//https://docs.confluent.io/5.2.0/ksql/docs/installation/server-config/config-reference.html
export interface KSQLConfig extends BaseCfg {
  environment: {
    KSQL_BOOTSTRAP_SERVERS: string; //kafka1:9092,kafka2:9093, ...
    KSQL_LISTENERS: string; //localhost:8090
    KSQL_KSQL_OUTPUT_TOPIC_NAME_PREFIX?: string; //ksql_
    KSQL_KSQL_SERVICE_ID?: string; //default_
    KSQL_KSQL_SCHEMA_REGISTRY_URL: string; //http://schema-registry:8081
    KSQL_KSQL_SINK_REPLICAS: number; //ex: 3, should be # of brokers
    KSQL_KSQL_STREAMS_REPLICATION_FACTOR: number; //ex: 3, should be # of brokers
    KSQL_KSQL_INTERNAL_TOPIC_REPLICAS: number; //ex: 3, should be # of brokers
    KSQL_KSQL_LOGGING_PROCESSING_STREAM_AUTO_CREATE?: 'true' | 'false';
    KSQL_KSQL_LOGGING_PROCESSING_TOPIC_AUTO_CREATE?: 'true' | 'false';
    KSQL_STREAMS_AUTO_OFFSET_RESET?: 'latest' | 'earliest';
    KSQL_STREAMS_PRODUCER_CONFLUENT_BATCH_EXPIRY_MS?: number; //9223372036854775807
    KSQL_STREAMS_PRODUCER_MAX_BLOCK_MS?: number; //9223372036854775807
    KSQL_STREAMS_PRODUCER_RETRIES?: number; //2147483647
    KSQL_STREAMS_PRODUCER_REQUEST_TIMEOUT_MS?: number; //300000
    KSQL_ACCESS_CONTROL_ALLOW_ORIGIN?: string;
    KSQL_ACCESS_CONTROL_ALLOW_METHODS?: string;
    KSQL_ACCESS_CONTROL_ALLOW_HEADERS?: string;
    KSQL_ALLOW_AUTO_CREATE_TOPICS?: 'true' | 'false';
    KSQL_OPTS?: string;
    // Growth:
    // KSQL_SECURITY_PROTOCOL:SASL_SSL
    // KSQL_SASL_MECHANISM:PLAIN
    // KSQL_SASL_JAAS_CONFIG="
  };
}

//https://github.com/confluentinc/schema-registry-workshop/blob/master/docker-compose.yml
// https://github.com/confluentinc/cp-demo/blob/7.2.1-post/docker-compose.yml
export interface KSQLSchemaCfg extends BaseCfg {
  environment: {
    SCHEMA_REGISTRY_KAFKASTORE_CONNECTION_URL: string;
    SCHEMA_REGISTRY_HOST_NAME: string; //schemaregistry
    SCHEMA_REGISTRY_LISTENERS: string; //localhost:8085
    SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: string;
  };
}

export interface SpringCfg extends BaseCfg {
  command: string;
  environment: {
    JAVA_OPTS: string;
    SPRING_CONFIG_LOCATION: string;
    'SPRING_KAFKA_BOOTSTRAP-SERVERS': string;
    'SPRING_KAFKA_CONSUMER_BOOTSTRAP-SERVERS': string;
    'SPRING_KAFKA_PRODUCER_BOOTSTRAP-SERVERS': string;
  };
}

export interface Juypter extends BaseCfg {
  environment: {
    PASSWORD: string;
    USERNAME: string;
    JUPYTER_TOKEN: string;
    JUPYTERHUB_ADMIN: string;
  };
}

//https://hub.docker.com/r/bitnami/spark/
// https://dev.to/mvillarrealb/creating-a-spark-standalone-cluster-with-docker-and-docker-compose-2021-update-6l4
export interface SparkCfg extends BaseCfg {
  environment: {
    SPARK_LOCAL_IP?: string;
    SPARK_MODE: 'master' | 'worker';
    SPARK_DAEMON_USER: string;
  };
}

// https://hub.docker.com/r/sscaling/jmx-prometheus-exporter
export interface JMXConfg extends BaseCfg {
  environment: {
    SERVICE_PORT: number;
    JVM_OPTS?: string;
    CONFIG_YML?: string;
  };
}

export interface BaseCfg {
  command?: Array<string> | string;
  restart?: string;
  image: string;
  ports: Array<string>;
  volumes?: Array<string>;
  depends_on?: Array<string>;
  container_name: string;
  entrypoint?: string;
  tty?: boolean;
}
