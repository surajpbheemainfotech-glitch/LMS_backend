import { buildAdminNewRequestEmail } from "./buildAdminNewRequestEmail.js";
import { buildUserPasswordEmail } from "./buildUserPasswordEmail.js";
import { buildOtpEmail } from "./otpEmailBuilder.js";

const emailBuilders = {
  ADMIN_NEW_REQUEST: buildAdminNewRequestEmail,
  OTP_VERIFICATION: buildOtpEmail,
  RESET_PASSWORD: buildUserPasswordEmail,
};

export const buildEmail = (type, payload) => {

  const builder = emailBuilders[type];

  if (!builder) {
    throw new Error(`No email builder found for type: ${type}`);
  }

  return builder(payload);
};