(globalThis as any).Buffer ??= require("buffer").Buffer;
import { registerRootComponent } from 'expo';
import App from '../App';

registerRootComponent(App);
