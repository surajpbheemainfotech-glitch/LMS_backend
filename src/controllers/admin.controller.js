import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import db from "../config/db.config.js";
import logger from "../utils/logger.js";
import { error, success } from "../utils/response.js";
import { enqueueEmail } from "../services/service.mail/sendmail.js";
import generatePassword from "../services/service.genratePassword.js";

dotenv.config();

export const getApprovalRequests = async (req, res) => {

  try {

    const adminId = req.user?.id

    logger.info({ adminId }, "Fetching approval requests")

    if (!adminId) {
      logger.warn("Unauthorized approval request access")
      return error(res, "Unauthorized.", 401)
    }

    const [requests] = await db.execute(`
  SELECT 
    ar.approval_id AS request_id,
    ar.approval_status AS request_status,

    u.id AS user_id, 
    u.first_name, 
    u.last_name,
    u.email, 
    u.mobile, 
    u.created_at AS user_created_at,

    r.role_name,

    c.company_id,
    c.company_name,
    c.industry,
    c.location

  FROM approval_requests ar
  JOIN users u ON ar.user_email = u.email
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  LEFT JOIN companies c 
       ON u.email = c.email AND r.role_name = 'corporate'

  WHERE ar.approval_status != 'Approved'

  ORDER BY ar.approval_id DESC
`);

    logger.info({ total: requests.length }, "Approval requests fetched")
    return success(res, { requests }, 200)

  } catch (err) {

    logger.error(err, "Fetch approval requests failed")
    return error(res, "Internal server error", 500)

  }
}

export const approveUserRequests = async (req, res) => {

  const { approval_status, remarks, user_email } = req.body

  try {
    const adminId = req.user?.id

    logger.info({ user_email, adminId }, "User approval update")

    if (!adminId) {
      logger.warn("Unauthorized approval update attempt")
      return error(res, "Unauthorized.", 401)
    }

    if (!approval_status || !remarks || !user_email) {
      logger.warn("Missing approval fields")
      return error(res, "All fields are required.", 400)
    }

    await db.execute(
      `UPDATE approval_requests
       SET approval_status = ?, approved_by = ?, approved_date = ?, remarks = ?
       WHERE user_email = ?`,
      [approval_status, adminId, new Date(), remarks, user_email]
    )

    const [userRows] = await db.execute(
      `SELECT first_name, last_name FROM users WHERE email = ?`,
      [user_email]
    )

    const user = userRows[0]

    if (!user) {
      return error(res, "User not found", 404)
    }

    if (approval_status === "Approved") {

      const plainPassword = generatePassword()
      const hashedPassword = await bcrypt.hash(plainPassword, 10)

      await db.execute(
        `UPDATE users SET password = ?, status = ? WHERE email = ?`,
        [hashedPassword, "active" , user_email]
      )

      await enqueueEmail({
        type: "RESET_PASSWORD",
        to: user_email,
        name: `${user.first_name} ${user.last_name}`,
        email: user_email,
        loginUrl: `${process.env.FRONTEND_URL}/recoverpassword`,
        password: plainPassword
      })
    }else{
       
      await db.execute(
        `DELETE FROM users WHERE email = ?`,[user_email]
      )
    }

    logger.info({ user_email, approval_status }, "User approval updated")
    return success(res, "Status updated successfully.", 200)

  } catch (err) {

    logger.error(err, "Approval update failed")
    return error(res, "Internal server error", 500)

  }
}

export const removeUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.execute("SELECT first_name FROM users WHERE id = ?", [id]);
    if (!existing.length) return error(res, "Unauthorized.", 402);

    await db.execute("DELETE FROM users WHERE id = ?", [id]);

    logger.info({ userId: id }, "User removed successfully");
    return success(res, "Admin removed successfully.", 200);

  } catch (err) {
    logger.error(err, "User admin failed");
    return error(res, "Internal server error.", 500);
  }
};
