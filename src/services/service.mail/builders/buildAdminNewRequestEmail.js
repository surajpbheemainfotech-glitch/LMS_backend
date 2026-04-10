import { renderTemplate } from "../renderTemplate/renderTemplate.js";

export const buildAdminNewRequestEmail = (data) => {

  const html = renderTemplate(
    "admin-new-request.html",
    {
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone,
      message: data.message,
      admin_url: `${process.env.FRONTEND_URL}/admin/login`
    }
  );

  return {
    subject: `New LMS Join Request - ${data.role || "User"}`,
    html
  };

};