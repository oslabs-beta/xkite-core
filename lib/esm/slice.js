import { createSlice } from '@reduxjs/toolkit';
import { KiteState, KiteServerState } from './constants';
import defaultCfg, { configFilePath } from './constants';
import path from 'path';
import fs from 'fs-extra';
const initialState = readConfigFromFile();
const kiteSlice = createSlice({
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
                state.state = KiteState.Running;
            else
                state.state = KiteState.Paused;
            writeConfigToFile(state);
        },
        setSetup: (state, action) => {
            state.setup = Object.assign(action.payload);
            state.kafkaSetup = Object.assign(action.payload.kafkaSetup ?? {});
            state.dBSetup = Object.assign(action.payload.dataSetup ?? {});
            state.services = action.payload.docker.services ?? [];
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
        }
    }
});
const { setPackageBuild, setConfig, setServer, setSetup, setState, setServerState, setServiceState, setConfigFile } = kiteSlice.actions;
export { setPackageBuild, setConfig, setServer, setSetup, setState, setServerState, setServiceState, setConfigFile };
export default kiteSlice.reducer;
function readConfigFromFile() {
    const defaultState = {
        init: true,
        packageBuild: false,
        config: defaultCfg,
        server: 'localhost:6661',
        services: [''],
        serviceState: [false],
        setup: {},
        kafkaSetup: {},
        dBSetup: {},
        state: KiteState.Init,
        serverState: KiteServerState.Disconnected,
        configFile: {} //Promise<KiteConfigFile> | KiteConfigFile;
    };
    try {
        fs.mkdirSync(path.resolve(configFilePath), { recursive: true });
        const state = fs.readFileSync(path.resolve(configFilePath, 'cfg.json'), 'utf-8');
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
        fs.writeFileSync(path.resolve(configFilePath, 'cfg.json'), JSON.stringify(state));
    }
    catch (err) {
        console.log(`Error writing Kite configFile ${err}`);
    }
}
