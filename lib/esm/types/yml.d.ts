import { KiteConfig, KiteSetup } from './types';
/**
 * creates the pertinent yml configuration for docker
 * based on the input config
 * @returns a yaml generator function
 */
declare const ymlGenerator: () => (c: KiteConfig) => KiteSetup;
export default ymlGenerator;
//# sourceMappingURL=yml.d.ts.map