// ---- MUST BE FIRST ----
if (global.ErrorUtils) {
  const origError = global.ErrorUtils.getGlobalHandler();

  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log("🔥 GLOBAL ERROR:", error);
    console.log("🔥 STACK TRACE:", error?.stack);
    origError(error, isFatal);
  });
}
// -------------------------

// After error handler → import the rest
import { registerRootComponent } from 'expo';

import App from './App';
import './utility/firebase-messaging';

registerRootComponent(App);
