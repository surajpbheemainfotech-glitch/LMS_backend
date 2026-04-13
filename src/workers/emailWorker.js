import dotenv from "dotenv";
dotenv.config();

import { connectRabbitMQ, getChannel } from "../config/rabbitmq.config.js";
import { sendMail } from "../services/service.mail/sendmail.js";
import { buildEmail } from "../services/service.mail/builders/index.js";
import logger from "../utils/logger.js";

export const startWorker = async () => {
  const channel = getChannel();


  await connectRabbitMQ();
  await channel.assertQueue("email_queue", { durable: true });

  logger.info("Email Worker started");

  channel.consume("email_queue", async (msg) => {

    if (!msg) return;

    const data = JSON.parse(msg.content.toString());

    logger.info(data, "Email job received");

    try {

      const emailContent = buildEmail(data.type, data);

      await sendMail({
        to: data.to,  
        subject: emailContent.subject,
        html: emailContent.html
      });

      channel.ack(msg);

    } catch (error) {

      logger.error(error, "Email sending failed");

      channel.nack(msg);

    }

  });

};