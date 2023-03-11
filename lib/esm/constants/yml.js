import path from 'path';
export const downloadDir = path.join(__dirname, '../../download');
export const network = 'localhost';
export const _ports_ = {
    postgresql: { internal: 5432, external: 5432 },
    ksql: { internal: 8088, external: 8088 },
    ksql_schema: { internal: 8085, external: 8085 },
    spark: {
        webui: { internal: 8080, external: 8090 },
        rpc: { internal: 7077, external: 7077 },
    },
    spring: { internal: 8080, external: 8080 },
    prometheus: { internal: 9090, external: 9099 },
    grafana: { internal: 3000, external: 3050 },
    jupyter: { internal: 8000, external: 8000 },
    kafkaconnect_src: { internal: 8083, external: 8083 },
    kafkaconnect_sink: { internal: 8083, external: 8084 },
    zookeeper: {
        client: { internal: 2182, external: 2182 },
        peer: { internal: 2888, external: 3888 },
    },
    kafka: {
        jmx: 9991,
        broker: { internal: 9092, external: 9092 },
        spring: 9095,
        metrics: 29092,
        ksql: 9096,
        connect: 9097,
    },
    jmx: { internal: 5556, external: 5566 },
    docker: { internal: 9323, external: 9323 },
};
export const PROMCONFIG = {
    global: {
        scrape_interval: '5s',
        evaluation_interval: '2s',
        scrape_timeout: '4s',
    },
    rule_files: [null],
    scrape_configs: [
        {
            job_name: 'xkite',
            static_configs: [
                {
                    targets: [],
                },
            ],
        },
        {
            job_name: 'docker',
            static_configs: [
                {
                    targets: [],
                },
            ],
        },
    ],
};
export const JMX = {
    image: 'bitnami/jmx-exporter:latest',
    environment: { SERVICE_PORT: _ports_.jmx.internal },
    ports: [],
    volumes: [],
    container_name: '',
    depends_on: [],
};
export const KAFKA_CONNECT_SRC = {
    image: 'xkite/kafka-connector:latest',
    ports: [
        `${_ports_.kafkaconnect_src.external}:${_ports_.kafkaconnect_src.internal}`,
    ],
    environment: {
        CONNECT_BOOTSTRAP_SERVERS: '',
        CONNECT_REST_PORT: _ports_.kafkaconnect_src.internal,
        CONNECT_GROUP_ID: 'quickstart',
        CONNECT_CONFIG_STORAGE_TOPIC: 'quickstart-config',
        CONNECT_OFFSET_STORAGE_TOPIC: 'quickstart-offsets',
        CONNECT_STATUS_STORAGE_TOPIC: 'quickstart-status',
        CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 1,
        CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 1,
        CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 1,
        CONNECT_KEY_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter',
        CONNECT_VALUE_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter',
        CONNECT_INTERNAL_KEY_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter',
        CONNECT_INTERNAL_VALUE_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter',
        CONNECT_REST_ADVERTISED_HOST_NAME: network,
    },
    container_name: 'kafka-connect-source',
    depends_on: [],
};
export const KAFKA_CONNECT_SINK = {
    image: 'xkite/kafka-connector:latest',
    ports: [
        `${_ports_.kafkaconnect_sink.external}:${_ports_.kafkaconnect_sink.internal}`,
    ],
    environment: {
        CONNECT_BOOTSTRAP_SERVERS: '',
        CONNECT_REST_PORT: _ports_.kafkaconnect_sink.internal,
        CONNECT_GROUP_ID: 'quickstart',
        CONNECT_CONFIG_STORAGE_TOPIC: 'quickstart-config',
        CONNECT_OFFSET_STORAGE_TOPIC: 'quickstart-offsets',
        CONNECT_STATUS_STORAGE_TOPIC: 'quickstart-status',
        CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 1,
        CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 1,
        CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 1,
        CONNECT_KEY_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter',
        CONNECT_VALUE_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter',
        CONNECT_INTERNAL_KEY_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter',
        CONNECT_INTERNAL_VALUE_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter',
        CONNECT_REST_ADVERTISED_HOST_NAME: network,
    },
    container_name: 'kafka-connect-sink',
    depends_on: [],
};
export const KAFKA_BROKER = {
    image: 'confluentinc/cp-kafka',
    restart: 'always',
    environment: {
        KAFKA_ZOOKEEPER_CONNECT: `zookeeper:${_ports_.zookeeper.peer.external}`,
        KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'METRICS:PLAINTEXT,INTERNAL:PLAINTEXT,PLAINTEXT:PLAINTEXT,KSQL:PLAINTEXT,CONNECT:PLAINTEXT',
        KAFKA_INTER_BROKER_LISTENER_NAME: 'INTERNAL',
        CONFLUENT_METRICS_REPORTER_ZOOKEEPER_CONNECT: `zookeeper:${_ports_.zookeeper.peer.external}`,
        CONFLUENT_METRICS_REPORTER_TOPIC_REPLICAS: 1,
        CONFLUENT_METRICS_ENABLE: 'false',
        KAFKA_HEAP_OPTS: '-Xmx512M -Xms512M',
        KAFKA_BROKER_ID: 101,
        KAFKA_JMX_PORT: _ports_.kafka.jmx,
        KAFKA_LISTENERS: `METRICS://:${_ports_.kafka.metrics},PLAINTEXT://:${_ports_.kafka.broker.external},INTERNAL://:${_ports_.kafka.spring},KSQL://kafka:${_ports_.kafka.ksql},CONNECT://kafka:${_ports_.kafka.connect}`,
        KAFKA_ADVERTISED_LISTENERS: `METRICS://kafka:${_ports_.kafka.metrics},PLAINTEXT://${network}:${_ports_.kafka.broker.external},INTERNAL://kafka:${_ports_.kafka.spring},KSQL://kafka:${_ports_.kafka.ksql},CONNECT://kafka:${_ports_.kafka.connect}`,
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1,
        KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1,
        CONFLUENT_METRICS_REPORTER_BOOTSTRAP_SERVERS: `kafka:${_ports_.kafka.metrics}`,
        KAFKA_DELETE_TOPIC_ENABLE: 'true',
    },
    ports: [`${_ports_.kafka.broker.external}:${_ports_.kafka.broker.internal}`],
    volumes: [],
    container_name: '',
    depends_on: ['zookeeper', 'postgres'],
};
export const ZOOKEEPER = {
    image: 'confluentinc/cp-zookeeper',
    environment: {
        ZOOKEEPER_CLIENT_PORT: _ports_.zookeeper.client.external,
        ZOOKEEPER_TICK_TIME: 2000,
        ZOOKEEPER_INIT_LIMIT: 5,
        ZOOKEEPER_SYNC_LIMIT: 2,
        ZOOKEEPER_SERVERS: '',
    },
    ports: [
        `${_ports_.zookeeper.client.external}:${_ports_.zookeeper.client.internal}`,
    ],
    container_name: 'zookeeper',
};
export const PROMETHEUS = {
    image: 'prom/prometheus',
    ports: [`${_ports_.prometheus.external}:${_ports_.prometheus.internal}`],
    volumes: [
        `${path.join(downloadDir, 'prometheus/prometheus.yml')}:/etc/prometheus/prometheus.yml`,
    ],
    container_name: 'prometheus',
};
export const GRAFANA = {
    image: 'grafana/grafana-oss',
    ports: [`${_ports_.grafana.external}:${_ports_.grafana.internal}`],
    restart: 'always',
    environment: {
        GF_PATHS_DATA: '/var/lib/grafana',
        GF_SECURITY_ALLOW_EMBEDDING: 'true',
        GF_AUTH_ANONYMOUS_ENABLED: 'true',
        GF_SMTP_ENABLED: 'true',
        GF_SECURITY_ADMIN_PASSWORD: 'xkite',
    },
    volumes: [
        'provisioning:/etc/grafana/provisioning',
        'dashboards:/var/lib/grafana/dashboards',
    ],
    container_name: 'grafana',
    depends_on: ['prometheus'],
};
export const POSTGRES = {
    image: 'postgres',
    restart: 'unless-stopped',
    environment: {
        POSTGRES_PASSWORD: 'admin',
        POSTGRES_USER: 'admin',
        POSTGRES_DB: 'xkiteDB',
        PGDATA: '/data/postgres',
    },
    volumes: [
        'postgresql:/var/lib/postgresql/data',
        `${path.join(downloadDir, 'postgresql/init.sql')}:/docker-entrypoint-initdb.d/init.sql`,
    ],
    ports: [`${_ports_.postgresql.internal}:${_ports_.postgresql.internal}`],
    container_name: 'postgresql',
};
export const KSQL = {
    image: 'confluentinc/ksqldb-server',
    environment: {
        KSQL_LISTENERS: `http://0.0.0.0:${_ports_.ksql.external}`,
        KSQL_BOOTSTRAP_SERVERS: '',
        KSQL_KSQL_OUTPUT_TOPIC_NAME_PREFIX: 'ksql_',
        KSQL_KSQL_SCHEMA_REGISTRY_URL: `http://schema-registry:${_ports_.ksql_schema.internal}`,
        KSQL_KSQL_SINK_REPLICAS: 1,
        KSQL_KSQL_STREAMS_REPLICATION_FACTOR: 1,
        KSQL_KSQL_INTERNAL_TOPIC_REPLICAS: 1,
        KSQL_KSQL_LOGGING_PROCESSING_STREAM_AUTO_CREATE: 'true',
        KSQL_KSQL_LOGGING_PROCESSING_TOPIC_AUTO_CREATE: 'true',
        KSQL_STREAMS_AUTO_OFFSET_RESET: 'latest',
        KSQL_STREAMS_PRODUCER_CONFLUENT_BATCH_EXPIRY_MS: 9223372036854775807,
        KSQL_STREAMS_PRODUCER_MAX_BLOCK_MS: 9223372036854775807,
        KSQL_STREAMS_PRODUCER_RETRIES: 2147483647,
        KSQL_STREAMS_PRODUCER_REQUEST_TIMEOUT_MS: 300000,
        KSQL_ACCESS_CONTROL_ALLOW_ORIGIN: '*',
        KSQL_ACCESS_CONTROL_ALLOW_METHODS: 'GET,POST,HEAD',
        KSQL_ACCESS_CONTROL_ALLOW_HEADERS: 'X-Requested-With,Content-Type,Accept,Origin,Authorization',
    },
    ports: [`${_ports_.ksql.external}:${_ports_.ksql.internal}`],
    container_name: 'ksql',
    depends_on: [],
};
export const KSQL_CLI = {
    image: `confluentinc/ksqldb-cli`,
    container_name: `ksqldb-cli`,
    entrypoint: '/bin/sh',
    ports: [],
    volumes: [`${path.join(downloadDir, 'ksql/testscript.sql')}:/tmp/test.sql`],
    tty: true,
};
export const KSQL_SCHEMA = {
    image: 'confluentinc/cp-schema-registry',
    restart: 'always',
    depends_on: [],
    environment: {
        SCHEMA_REGISTRY_KAFKASTORE_CONNECTION_URL: '',
        SCHEMA_REGISTRY_HOST_NAME: 'schema-registry',
        SCHEMA_REGISTRY_LISTENERS: `${network}:${_ports_.ksql_schema.external}`,
    },
    ports: [`${_ports_.ksql_schema.external}:${_ports_.ksql_schema.internal}`],
    container_name: 'ksql-schema',
};
export const JUPYTER = {
    image: 'jupyterhub/jupyterhub',
    environment: {
        JUPYTER_TOKEN: 'jupyter',
        USERNAME: 'jupyter',
        PASSWORD: 'jupyter',
        JUPYTERHUB_ADMIN: 'admin',
    },
    ports: [`${_ports_.jupyter.external}:${_ports_.jupyter.internal}`],
    volumes: [
        'jupyterhub_data:/data',
    ],
    container_name: 'jupyterhub',
};
export const SPARK = {
    image: 'bitnami/spark',
    ports: [
        `${_ports_.spark.webui.external}:${_ports_.spark.webui.internal}`,
        `${_ports_.spark.rpc.external}:${_ports_.spark.rpc.internal}`,
    ],
    container_name: 'spark',
    environment: {
        SPARK_MODE: 'master',
        SPARK_DAEMON_USER: 'spark',
    },
    volumes: [],
};
export const SPRING = {
    image: 'eclipse-temurin',
    restart: 'always',
    ports: [`${_ports_.spring.external}:${_ports_.spring.internal}`],
    environment: {
        JAVA_OPTS: '',
        SPRING_CONFIG_LOCATION: '/etc/myconfig.yml',
        'SPRING_KAFKA_BOOTSTRAP-SERVERS': `kafka:${_ports_.kafka.spring}`,
        'SPRING_KAFKA_CONSUMER_BOOTSTRAP-SERVERS': `kafka:${_ports_.kafka.spring}`,
        'SPRING_KAFKA_PRODUCER_BOOTSTRAP-SERVERS': `kafka:${_ports_.kafka.spring}`,
    },
    command: 'java -jar /app.jar',
    volumes: [
        `${path.join(downloadDir, 'spring/app.jar')}:/app.jar`,
        `${path.join(downloadDir, 'spring/application.yml')}:/etc/myconfig.yml`,
    ],
    container_name: 'spring',
    depends_on: ['kafka'],
};
export const YAML = {
    services: {},
    volumes: {
        jupyterhub_data: {
            driver: 'local',
        },
        dashboards: {
            driver: 'local',
            driver_opts: {
                o: 'bind',
                type: 'none',
                device: `${path.join(downloadDir, 'grafana/dashboards')}`,
            },
        },
        provisioning: {
            driver: 'local',
            driver_opts: {
                o: 'bind',
                type: 'none',
                device: `${path.join(downloadDir, 'grafana/provisioning')}`,
            },
        },
    },
};