import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../config/db.config.js";
import logger from "../utils/logger.js";
import { error, success } from "../utils/response.js";
import { enqueueEmail } from "../services/service.mail/sendmail.js";
import generatePassword from "../services/service.genratePassword.js";

dotenv.config();

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info("Admin login attempt");

    if (!email || !password) {
      logger.warn("Login failed - email or password missing");
      return error(res, "Email and Password are required", 400);
    }

    logger.debug({ email }, "Checking user in database");

    const [rows] = await db.execute(
      `SELECT 
          u.id, u.first_name, u.last_name, u.email, u.password,
          r.id AS role_id, r.role_name
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (!rows.length) {
      logger.warn({ email }, "Login failed - email not found");
      return error(res, "Invalid Email", 401);
    }

    const user = rows[0];

    logger.debug({ userId: user.id }, "User found, verifying password");

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logger.warn({ userId: user.id }, "Login failed - invalid password");
      return error(res, "Invalid Password", 401);
    }

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET missing in environment variables");
      return error(res, "JWT_SECRET missing in env", 500);
    }

    logger.debug({ userId: user.id }, "Generating JWT token");

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role_name,
        role_id: user.role_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    logger.info({ userId: user.id, role: user.role_name }, "Admin login successful");

    return success(
      res,
      "Login Successful",
      {
        token,
        user: {
          id: user.id,
          first_name: user.first_name,
          email: user.email,
          role: user.role_name,
          role_id: user.role_id,
        },
      },
      200
    );
  } catch (err) {
    logger.error(err, "Admin login error");
    return error(res, "Internal server error", 500);
  }
};

export const adminLogout = (req, res) => {
  try {

    logger.info("Admin logout request received");

    res.clearCookie("userToken", {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    });

    logger.info("Admin logged out successfully");

    return success(res, "Logged Out Successfully", 200);

  } catch (err) {

    logger.error(err, "Logout error");

    return error(res, "Internal server error", 500);
  }
};

export const getApprovalRequests = async (req, res) => {

  try {

    const adminId = req.user?.id

    logger.info({ adminId }, "Fetching company approval requests")

    if (!adminId) {
      logger.warn("Unauthorized approval request access")
      return error(res, "Unauthorized.", 401)
    }

    const [requests] = await db.execute(`
  SELECT 
    ar.approval_id AS request_id,
    ar.approval_status AS request_status,

    u.id AS user_id, u.first_name, u.last_name,
    u.email, u.mobile, u.created_at AS user_created_at,

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
        `UPDATE users SET password = ? WHERE email = ?`,
        [hashedPassword, user_email]
      )
      await enqueueEmail({
        type: "RESET_PASSWORD",
        to: user_email,
        name: `${user.first_name} ${user.last_name}`,
        email: user_email,
        loginUrl: `${process.env.FRONTEND_UR}/recoverpassword`,
        password: plainPassword
      })
    }

    logger.info({ user_email, approval_status }, "User approval updated")
    return success(res, "Status updated successfully.", 200)

  } catch (err) {

    logger.error(err, "Approval update failed")
    return error(res, "Internal server error", 500)

  }
}

