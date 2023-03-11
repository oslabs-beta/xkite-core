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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setConfigFile = exports.setServiceState = exports.setServerState = exports.setState = exports.setSetup = exports.setServer = exports.setConfig = exports.setPackageBuild = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const kite_1 = require("../constants/kite");
const kite_2 = __importStar(require("../constants/kite"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const initialState = readConfigFromFile();
const kiteSlice = (0, toolkit_1.createSlice)({
    name: 'kite',
    initialState,
    reducers: {
        setPackageBuild: (state, action) => {
            console.log(`setting packageBuild: ${action.payload}`);
            state.packageBuild = action.payload;
            writeConfigToFile(state);
        },
        setConfig: (state, action) => {
            state.config = Object.assign(action.payload);
            state.init = false;
            writeConfigToFile(state);
        },
        setServer: (state, action) => {
            state.server = action.payload;
            writeConfigToFile(state);
        },
        setServiceState: (state, action) => {
            let running = true;
            if (action.payload.type === 'pause')
                running = false;
            const service = action.payload.service;
            for (let i = 0; i < state.services.length; i++) {
                if (service.includes(state.services[i]))
                    state.serviceState[i] = running;
            }
            if (state.serviceState.every((el) => el))
                state.state = kite_1.KiteState.Running;
            else
                state.state = kite_1.KiteState.Paused;
            writeConfigToFile(state);
        },
        setSetup: (state, action) => {
            var _a, _b, _c;
            state.setup = Object.assign(action.payload);
            state.kafkaSetup = Object.assign((_a = action.payload.kafkaSetup) !== null && _a !== void 0 ? _a : {});
            state.dBSetup = Object.assign((_b = action.payload.dataSetup) !== null && _b !== void 0 ? _b : {});
            state.services = (_c = action.payload.docker.services) !== null && _c !== void 0 ? _c : [];
            state.serviceState = [];
            for (const i in state.services) {
                state.serviceState[i] = true;
            }
            writeConfigToFile(state);
        },
        setState: (state, action) => {
            state.state = action.payload;
            writeConfigToFile(state);
        },
        setServerState: (state, action) => {
            state.serverState = action.payload;
            writeConfigToFile(state);
        },
        setConfigFile: (state, action) => {
            state.configFile = Object.assign(action.payload);
            writeConfigToFile(state);
        },
    },
});
const { setPackageBuild, setConfig, setServer, setSetup, setState, setServerState, setServiceState, setConfigFile, } = kiteSlice.actions;
exports.setPackageBuild = setPackageBuild;
exports.setConfig = setConfig;
exports.setServer = setServer;
exports.setSetup = setSetup;
exports.setState = setState;
exports.setServerState = setServerState;
exports.setServiceState = setServiceState;
exports.setConfigFile = setConfigFile;
exports.default = kiteSlice.reducer;
function readConfigFromFile() {
    const defaultState = {
        init: true,
        packageBuild: false,
        config: kite_2.default,
        server: 'localhost:6661',
        services: [''],
        serviceState: [false],
        setup: {},
        kafkaSetup: {},
        dBSetup: {},
        state: kite_1.KiteState.Init,
        serverState: kite_1.KiteServerState.Disconnected,
        configFile: {},
    };
    try {
        fs_extra_1.default.mkdirSync(path_1.default.resolve(kite_2.configFilePath), { recursive: true });
        const state = fs_extra_1.default.readFileSync(path_1.default.resolve(kite_2.configFilePath, 'cfg.json'), 'utf-8');
        if (state !== undefined && Object.keys(state).length !== 0) {
            return JSON.parse(state);
        }
        else {
            console.log('return default');
            return defaultState;
        }
    }
    catch (err) {
        console.log(`Error reading Kite configFile: ${err}`);
        return defaultState;
    }
}
function writeConfigToFile(state) {
    try {
        console.log('writing to file...');
        fs_extra_1.default.writeFileSync(path_1.default.resolve(kite_2.configFilePath, 'cfg.json'), JSON.stringify(state));
    }
    catch (err) {
        console.log(`Error writing Kite configFile ${err}`);
    }
}
