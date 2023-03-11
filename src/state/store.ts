import { configureStore } from '@reduxjs/toolkit';
import kiteReducer from './slice.js';
const store = configureStore({
  reducer: kiteReducer,
});

export default store;
