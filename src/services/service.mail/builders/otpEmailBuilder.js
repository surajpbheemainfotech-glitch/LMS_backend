import { renderTemplate } from "../renderTemplate/renderTemplate.js";

export const buildOtpEmail = ({ name, otp }) => {

  const html = renderTemplate("otp.html", {
    name,
    otp
  });

  return {
    subject: "Your OTP Code",
    html
  };

};