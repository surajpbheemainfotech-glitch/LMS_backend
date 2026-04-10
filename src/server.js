
import app from "./app.js";
import { connectDB } from "./config/db.config.js";
import logger from "./utils/logger.js";
import { connectRabbitMQ , getChannel} from "./config/rabbitmq.config.js";
import { startWorker } from "./workers/emailWorker.js";

const PORT = process.env.PORT || 5000;


const startServer = async () => {

  await connectDB()
  await connectRabbitMQ();
  await getChannel();
  await startWorker();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};


startServer();