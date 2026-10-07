import app from "./index";
import { env } from "./config/env.js";
import { logger } from "./config/logger";
app.listen(env.PORT, () => {
  logger.info(`Servidor rodando em http://localhost:${env.PORT}`);
});
