import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp(config);

app.listen(config.API_PORT, () => {
  console.log(`Minstrøm API listening on http://localhost:${config.API_PORT}`);
});
