import amqp from "amqplib";
import logger from "../utils/logger.js";

let channel;

export const connectRabbitMQ = async () => {
  try {

    logger.info("Connecting to RabbitMQ...");

    const connection = await amqp.connect(process.env.RABBITMQ_URL);

    channel = await connection.createChannel();

    logger.info("RabbitMQ Connected");

  } catch (error) {

    logger.error(
      { err: error },
      "RabbitMQ connection failed"
    );

    process.exit(1);
  }
};

export const getChannel = () => {

  if (!channel) {
    logger.error("RabbitMQ channel not initialized");
    throw new Error("RabbitMQ channel not initialized");
  }

  return channel;
};