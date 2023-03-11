import { _ports_ } from './constants/yml';
const DEFAULT_BROKER_PORT = 7771;
const DEFAULT_BROKER_JMX_PORT = 9992;
const DEFAULT_ZOOKEEPER_PORT = 8881;
const DEFAULT_JMX_PORT = 5951;
const DEFAULT_SPRING_PORT = 8030;
export function getDefaultPorts(type, count) {
    return _ports_;
}
export async function getPorts(firstPort, count) {
    const availablePorts = [];
    const maxPort = firstPort + 200;
    const gp = await import('get-port');
    const getPort = gp.default;
    const portNumbers = gp.portNumbers;
    for (count; count > 0; count--) {
        const newPort = await getPort({ port: portNumbers(firstPort, maxPort) });
        firstPort = newPort;
        availablePorts.push(newPort);
    }
    return availablePorts;
}
