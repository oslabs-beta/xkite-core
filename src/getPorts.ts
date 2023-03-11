import * as consts from './constants/yml.js';
const { _ports_ } = consts;

//@ts-ignore
import { portNumbers } from './deps.bundle.js';
//@ts-ignore
const getPorts = require('./deps.bundle.js').default;

export function getDefaultPorts(type: string, count: number) {
  return _ports_;
}

export default async function getAvailablePorts(
  firstPort: number,
  count: number
): Promise<number[]> {
  const availablePorts: number[] = [];
  // Arbitrary cap to try to keep port numbers in a relatively sane range
  const maxPort = firstPort + 200;

  for (count; count > 0; count--) {
    const newPort = await getPorts({ port: portNumbers(firstPort, maxPort) });
    firstPort = newPort;
    availablePorts.push(newPort);
  }
  return availablePorts;
}
