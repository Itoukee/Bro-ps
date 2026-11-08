// The task must be defined at module scope, before the UI, so it also exists
// when Android restarts the JS runtime without opening the screen.
import './src/locationTask';

import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
