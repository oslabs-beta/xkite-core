![xkite-core](./xkite-core-banner.svg)
<br> ![version](https://img.shields.io/badge/version-1.0.28-blue.svg) ![license](https://img.shields.io/badge/license-MIT-blue.svg) <span><a href="https://xkite.io/"><img src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social" /></a></span>

### Core Library for xkite, a Kafka Integrated Testing Environment

xkite-core provides a comprehensive prototyping, testing, and monitoring toolset for Apache Kafka. Use xkite to bootstrap your next project, or install our library into an existing project. Built by developers, for developers.

## Dependencies

The latest stable versions of:

- <a href="https://nodejs.org/en/">Node.js and NPM</a>
- <a href="https://docs.docker.com/compose/install/">docker-compose</a>

## Installation

1. Clone this Repository <br>
   <code>git clone https://github.com/oslabs-beta/xkite-core.git</code>

2. Install Dependencies <br>
   <code>cd</code> into the cloned repository and run <code>npm install</code>

## Who Uses xkite-core

- <a href="https://github.com/oslabs-beta/xkite">xkite GUI</a>
- <a href="https://github.com/oslabs-beta/xkite-cli">xkite CLI</a>

## How It Works

The xkite-core library is, as the name suggests, the core library for xkite.

To interface with xkite-core, simply import the <code>Kite</code> class into your project.

In xkite, <code>Kite</code> provides the underlying functionality for configuring a Docker Compose YAML configuration, managing docker containers (configure, run, pause and shutdown), interfacing with remote xkite servers, and providing configuration settings for developers to easily connect to Kafka instances.

## Kite Class Data Types

Click to expand details.

<details><summary><b>KiteState</b></summary>

Overall state of Kite, provided by Kite.getState().

```
type KiteState =
  | 'Unknown'
  | 'Init'
  | 'Configured'
  | 'Running'
  | 'Paused'
  | 'Shutdown';
```

</details>

<details><summary><b>KiteServerState</b></summary>

State of remote Kite connection, provided by Kite.getServerState().

```
type KiteServerState = 'Disconnected' | 'Connected';
```

</details>

<details><summary><b>KiteConfig</b></summary>

Input object to create a docker instances. Used for Kite.configure().

```
interface KiteConfig {
  kafka: KiteKafkaCfg;
  db?: dbCfg;
  sink?: sinkCfg;
  grafana?: grafanaCfg;
  prometheus?: prometheusCfg;
}
```

</details>

<details><summary><b>KiteSetup</b></summary>
 
Response object from Kite.getSetup() available after Kite is configured.

```
interface KiteSetup {
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
```

</details>

<details><summary><b>KafkaSetup</b></summary>

Response object from Kite.getKafkaSetup() available after Kite is configured.

```
interface KafkaSetup {
  clientId: string;
  brokers: Array<string>;
  ssl?: boolean;
}
```

</details>

<details><summary><b>KiteConfigFile</b></summary>

Format of the configuration file object provided by Kite.getConfigFile().

Note: the fileStream object is a stream of the docker-compose.yml file generated from Kite.configure()

```
interface KiteConfigFile {
  header?: any;
  fileStream: Buffer;
}
```

</details>

<details><summary><b>dbCfg</b></summary>

Configuration object as a part of the KiteConfig object. It defines which data source the user wants configured.

```
interface dbCfg {
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
```

</details>

<details><summary><b>sinkCfg</b></summary>

Configuration object as a part of the KiteConfig object. It defines which data sink the user wants configured

```
interface sinkCfg {
  name: 'jupyter' | 'spark';
  port?: number;
  rpc_port?: number;
  kafkaconnect?: {
    port?: number | undefined;
  };
}
```

</details>

<details><summary><b>grafanaCfg</b></summary>

Configuration object as a part of the KiteConfig object. It defines which port the user wants their grafana interface to be configured on

```
interface grafanaCfg {
  port?: number | undefined;
}
```

</details>

<details><summary><b>prometheusCfg</b></summary>

Configuration object as a part of the KiteConfig object. It defines prometheus settings the user wants configured such as port, scrape and evaluation intervals

```
interface prometheusCfg {
  port?: number | undefined;
  scrape_interval?: number; //seconds
  evaluation_interval?: number; //seconds
}
```

</details>

# Kite Class Methods

Click to expand details.

<details><summary><b>configure()</b></summary>
configures the Kite class for either a local or remote docker session using a KiteConfig object or a server string pointing to a configured Kite server instance such as "http://localhost:3000".

Note: If no input is give a default configuration will be used.

<b>Type Definition:</b>

```
configure: (arg?: string | KiteConfig | undefined) => Promise<'void'>;
```

<b>Example:</b>

```
const { Kite } = require('xkite-core');

await Kite.configure(); // configure local default
// or
await Kite.configure('http://localhost:3000'); // configure remote
// or

```

</details>

<details><summary><b>deploy()</b></summary>

deploys all configured docker instances from Kite.configure(). If the Kite serverState === "Connected" then this deployment will happen on the remote server.

<b>Type Definition:</b>

```
deploy: () => Promise<void>;
```

<b>Example:</b>

```
const { Kite } = require('xkite-core');

await Kite.deploy();
```

</details>

<details><summary><b>pause()</b></summary>

pauses any/all running docker instances. If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
pause: (service?: string[] | undefined) => Promise<any>;
```

<b>Example:</b>

```
const { Kite } = require('xkite-core');

await Kite.pause(['kafka1', 'kafka2']); // pauses kafka1 and kafka2 docker services

await Kite.pause(); // pauses all docker instances
```

</details>

<details><summary><b>unpause()</b></summary>

Unpauses any/all running docker instances. If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
unpause: (service?: string[] | undefined) => Promise<any>;
```

<b>Example:</b>

```
const { Kite } = require('xkite-core');

await Kite.unpause(['kafka1', 'kafka2']); // unpauses kafka1 and kafka2 docker services

await Kite.unpause(); // unpauses all docker instances
```

</details>

<details><summary><b>shutdown()</b></summary>

Shuts down all running or paused docker instances and removes all configured volumes. If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
shutdown: () => Promise<any>;
```

<b>Example:</b>

```
const { Kite } = require('xkite-core');

await Kite.shutdown();
```

</details>

<details><summary><b>getSetup()</b></summary>

Retrieves the KiteSetup object created after Kite.configure(). If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
getSetup: () => KiteSetup | Promise<KiteSetup>;
```

<b>Example:</b>

```
const { Kite } = require('xkite-core');

const setup = await Kite.getSetup();
```

</details>

<details><summary><b>getKafkaSetup()</b></summary>

Retrieves the KafkaSetup object created after Kite.configure(). If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
getSetup: () => KiteSetup | Promise<KiteSetup>;
```

<b>Example:</b>

```
const { Kafka } = require('kafkajs')
const { Kite } = require('xkite-core');
const kafkaSetup = await Kite.getKafkaSetup();

const kafka = new Kafka({
  ...kafkaSetup,
  clientId: 'myapp'
})
...
```

</details>

<details><summary><b>getDBSetup()</b></summary>

Retrieves the dBCfg object created after Kite.configure(). If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
getDBSetup: () => dbCfg | Promise<dbCfg | undefined>;
```

<b>Example:</b>

```
const { Kite } = require('xkite-core');
const dBSetup = await Kite.getDBSetup();
```

</details>

<details><summary><b>getConfig()</b></summary>

Retrieves the KiteConfig object created after Kite.configure(). If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
getConfig: () => KiteConfig | Promise<KiteConfig>;

```

<b>Example:</b>

```
const { Kite } = require('xkite-core');
const config = await Kite.getConfig();
```

</details>

<details><summary><b>getConfigFile()</b></summary>

Retrieves the KiteConfig object created after Kite.configure(). If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
getConfig: () => KiteConfig | Promise<KiteConfig>;

```

<b>Example:</b>

```
const { Kite } = require('xkite-core');
const config = await Kite.getConfig();
```

</details>

<details><summary><b>getKiteState()</b></summary>

Retrieves the current KiteState. If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
getKiteState: () => KiteState | Promise<KiteState>;

```

<b>Example:</b>

```
const { Kite } = require('xkite-core');
const state = await Kite.getState();
```

</details>

<details><summary><b>getKiteServerState()</b></summary>

Retrieves the state of remote connection with the Kite server.

<b>Type Definition:</b>

```
getKiteServerState: () => KiteServerState;

```

<b>Example:</b>

```
const { Kite } = require('xkite-core');
const serverState = await Kite.getServerState();
```

</details>

<details><summary><b>getPackageBuild()</b></summary>

Retrieves the current package.zip file from Kite. This file contains the full set of dependencies to replicate the docker ecosystem sans xkite-core. If the Kite serverState === "Connected" then this command will be initiated on the remote server.

<b>Type Definition:</b>

```
getPackageBuild: () => Promise<KiteConfigFile | Error>;

```

<b>Example:</b>

```
const { Kite } = require('xkite-core');
const fs = require('fs');

const pkg = await Kite.getPackageBuild();
fs.writeFileSync(
        path.resolve(__dirname, 'package.zip'),
        Buffer.from(pkg.fileStream)
      );
```

</details>

## Docker Images

xkite uses the following docker images to provide their associated services:

- <a href="https://hub.docker.com/r/xkite/kafka-connector">xkite/kafka-connector</a>
- <a href="https://hub.docker.com/r/bitnami/jmx-exporter">bitnami/jmx-exporter</a>
- <a href="https://hub.docker.com/r/confluentinc/cp-kafka">confluentinc/cp-kafka</a>
- <a href="https://hub.docker.com/r/confluentinc/cp-zookeeper">confluentinc/cp-zookeeper</a>
- <a href="https://hub.docker.com/r/prom/prometheus">prom/prometheus</a>
- <a href="https://hub.docker.com/r/grafana/grafana-oss">grafana/grafana-oss</a>
- <a href="https://hub.docker.com/r/_/postgres">postgres</a>
- <a href="https://hub.docker.com/r/confluentinc/ksqldb-server">confluentinc/ksqldb-server</a>
- <a href="https://hub.docker.com/r/confluentinc/ksqldb-cli">confluentinc/ksqldb-cli</a>
- <a href="https://hub.docker.com/r/confluentinc/cp-schema-registry">confluentinc/cp-schema-registry</a>
- <a href="https://hub.docker.com/r/jupyterhub/jupyterhub">jupyterhub/jupyterhub</a>
- <a href="https://hub.docker.com/r/bitnami/spark">bitnami/spark</a>
- <a href="https://hub.docker.com/r/_/eclipse-temurin">eclipse-temurin</a>
