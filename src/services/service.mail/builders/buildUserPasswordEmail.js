import generatePassword from "../../service.genratePassword.js";
import { renderTemplate } from "../renderTemplate/renderTemplate.js";

export const buildUserPasswordEmail = ({ name, email, loginUrl , password}) => {

  const html = renderTemplate("user_password.html", {
    name,
    email,
    password,
    loginUrl
  });

  return {
    subject: "Your LMS Account Password",
    html,
    password
  };
};