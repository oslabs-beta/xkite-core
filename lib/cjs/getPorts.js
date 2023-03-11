"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPorts = exports.getDefaultPorts = void 0;
const constants_1 = require("./types/yml/constants");
// I made up the second number for all of these... it's the start port +200
const DEFAULT_BROKER_PORT = 7771;
const DEFAULT_BROKER_JMX_PORT = 9992;
const DEFAULT_ZOOKEEPER_PORT = 8881;
const DEFAULT_JMX_PORT = 5951;
const DEFAULT_SPRING_PORT = 8030;
function getDefaultPorts(type, count) {
    return constants_1._ports_;
}
exports.getDefaultPorts = getDefaultPorts;
function getPorts(firstPort, count) {
    return __awaiter(this, void 0, void 0, function* () {
        const availablePorts = [];
        // Arbitrary cap to try to keep port numbers in a relatively sane range
        const maxPort = firstPort + 200;
        const gp = yield Promise.resolve().then(() => __importStar(require('get-port')));
        const getPort = gp.default;
        const portNumbers = gp.portNumbers;
        for (count; count > 0; count--) {
            const newPort = yield getPort({ port: portNumbers(firstPort, maxPort) });
            firstPort = newPort;
            availablePorts.push(newPort);
        }
        return availablePorts;
    });
}
exports.getPorts = getPorts;
