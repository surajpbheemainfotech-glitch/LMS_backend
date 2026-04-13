import crypto from "crypto";

export const generateOTP = (length = 6) => {
  const max = 10 ** length;
  const min = 10 ** (length - 1);

  return crypto.randomInt(min, max).toString();
};