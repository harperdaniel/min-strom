import { createIncrementalSyncWindow } from "./sync-window.js";

const window = createIncrementalSyncWindow({
  lastSuccessfulSyncAt: null
});

console.log("Minstrøm worker ready", {
  firstSyncFrom: window.from.toISOString(),
  firstSyncTo: window.to.toISOString()
});
