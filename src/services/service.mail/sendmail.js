import transporter from "../../config/mail.config.js";
import { getChannel } from "../../config/rabbitmq.config.js";
import logger from "../../utils/logger.js";
console.log(process.env.MAIL_FROM)

export const sendMail = async ({ to, subject, html }) => {
  try {

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

  } catch (error) {

    logger.error(
      { err: error, to },
      "Email sending failed"
    );

    throw error;
  }
};

export const enqueueEmail = async (payload) => {

  const channel = getChannel();

  channel.sendToQueue(
    "email_queue",
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );

};