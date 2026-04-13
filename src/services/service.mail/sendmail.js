import transporter from "../../config/mail.config.js";
import { getChannel } from "../../config/rabbitmq.config.js";
import logger from "../../utils/logger.js";

const EMAIL_QUEUE = "email_queue";

export const sendMail = async ({ to, subject, html }) => {

  try {

    if (!to || !subject || !html) {
      throw new Error("Invalid email payload: missing to/subject/html");
    }

    logger.info(
      { to, subject },
      "Attempting to send email"
    );

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html
    });

    logger.info(
      { messageId: info.messageId, to },
      "Email sent successfully"
    );

    return info;

  } catch (err) {

    logger.error(
      { error: err.message, to },
      "Email sending failed"
    );

    throw err;
  }
};


export const enqueueEmail = async (payload) => {

  try {

    const channel = getChannel();

    if (!channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    if (!payload?.type || !payload?.to) {
      throw new Error("Invalid email payload");
    }

    await channel.assertQueue(EMAIL_QUEUE, {
      durable: true
    });

    const sent = channel.sendToQueue(
      EMAIL_QUEUE,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );

    if (!sent) {
      throw new Error("Failed to push email job to queue");
    }

    logger.info(
      { type: payload.type, to: payload.to },
      "Email job pushed to queue"
    );

    return true;

  } catch (err) {

    logger.error(
      { error: err.message, payload },
      "Failed to enqueue email"
    );

    throw err;
  }
};