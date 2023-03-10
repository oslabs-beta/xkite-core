import { configureStore } from '@reduxjs/toolkit';
import kiteReducer from './slice';
const store = configureStore({
  reducer: kiteReducer,
});

export default store;
