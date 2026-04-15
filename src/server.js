
import app from "./app.js";
import { connectDB } from "./config/db.config.js";
import logger from "./utils/logger.js";
import { connectRabbitMQ, getChannel } from "./config/rabbitmq.config.js";
import { startWorker } from "./workers/emailWorker.js";


const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST  ;

const startServer = async () => {

  try {

  await connectDB()
  await connectRabbitMQ();
  await getChannel();
  await startWorker();

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
  });

  const server = app.listen(PORT, HOST, () => {
      logger.info(
        { host: HOST || "localhost", port: PORT },
        "Server started"
      );
    });

    process.on("SIGINT", () => server.close(() => process.exit(0)));
    process.on("SIGTERM", () => server.close(() => process.exit(0)));
    
  } catch (err) {
    logger.fatal({ err }, "Startup failed");
    process.exit(1);
  }
}
  


startServer();