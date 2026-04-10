import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.config.js";
import { error, success } from "../utils/response.js";
import logger from "../utils/logger.js";
import generatePassword from "../services/service.genratePassword.js";
import { enqueueEmail } from "../services/service.mail/sendmail.js";
import { createSlug } from "../services/service.slug.generator.js";

export const addAdmins = async (req, res) => {
  const { first_name, last_name, mobile, email, password, role, description } = req.body;

  if (!first_name || !last_name || !mobile || !email || !password || !role || !description) {
    return error(res, "All fields are required", 400);
  }

  try {
    logger.info({ email }, "Add admin attempt");

    const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) return error(res, "Email already registered", 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await db.execute(
      "INSERT INTO users (first_name, last_name, mobile, email, password) VALUES (?, ?, ?, ?, ?)",
      [first_name, last_name, mobile, email, hashedPassword]
    );

    const [roleResult] = await db.execute(
      "INSERT INTO roles (role_name, description) VALUES (?, ?)",
      [role, description]
    );

    await db.execute(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userResult.insertId, roleResult.insertId]
    );

    logger.info({ userId: userResult.insertId }, "Admin added successfully");
    return success(res, "User Registered Successfully", { userId: userResult.insertId }, 201);

  } catch (err) {
    logger.error(err, "Add admin failed");
    return error(res, "Internal server error.", 500);
  }
};

export const registerUser = async (req, res) => {
  const {
    first_name,
    last_name,
    mobile,
    email,
    role,
    description,
    company_name,
    industry,
    location
  } = req.body;

  try {

    logger.info({ email, role }, "User registration request");

    if (!first_name || !last_name || !email || !role) {
      return error(res, "Required fields missing.", 400);
    }

    let roleDescription = description;
    if (!roleDescription) {
      if (role.toLowerCase() === "teacher") {
        roleDescription = "Teacher role with academic management permissions";
      } else if (role.toLowerCase() === "corporate") {
        roleDescription = "Corporate role with company management permissions";
      } else {
        roleDescription = "System user role";
      }
    }

    const temPassword = generatePassword()
    const [existingUser] = await db.execute(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    );

    if (existingUser.length > 0) {
      return error(res, "Email already registered", 400);
    }


    const [userResult] = await db.execute(
      `INSERT INTO users (first_name, last_name, email, password, mobile)
       VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, email, temPassword, mobile || null ]
    );

    const [roleResult] = await db.execute(
      `INSERT INTO roles (role_name, description)
       VALUES (?, ?)`,
      [role, roleDescription]
    );

    await db.execute(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES (?, ?)`,
      [userResult.insertId, roleResult.insertId]
    );

    let companyId = null;

    if (role.toLowerCase() === "corporate") {

      if (!company_name || !industry || !location) {
        return error(res, "Company details required for corporate role.", 400);
      }

      const [existingCompany] = await db.execute(
        `SELECT company_id FROM companies WHERE company_name = ?`,
        [company_name]
      );

      if (existingCompany.length > 0) {
        return error(res, "Company already registered.", 400);
      }

      const companySlug = createSlug(company_name);

      const [company] = await db.execute(
        `INSERT INTO companies (company_name, slug, industry, email, phone, location)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [company_name, companySlug, industry, email, mobile, location]
      );

      companyId = company.insertId;

      await db.execute(
        `INSERT INTO approval_requests(user_email) VALUES (?)`,
        [email]
      );
    }

    await enqueueEmail({
      type: "ADMIN_NEW_REQUEST",
      to: process.env.MAIL_ADMIN,
      name: `${first_name} ${last_name}`,
      email,
      role,
      phone: mobile,
      message: "New user registration request"
    });

    logger.info({ userId: userResult.insertId }, "User registered successfully");

    return success(res, "User registered successfully", {
      userId: userResult.insertId,
      companyId
    }, 201);

  } catch (err) {
    logger.error(err, "User registration failed");
    return error(res, "Internal server error", 500);
  }
};

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return error(res, "Email and Password are required", 400);

  try {
    logger.info({ email }, "Admin login attempt");

    const [rows] = await db.execute(
      `SELECT 
        u.id, u.first_name, u.last_name, u.email, u.password,
        r.id AS role_id, r.role_name,
        c.slug AS company_slug
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       LEFT JOIN companies c ON c.email = u.email
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) return error(res, "Invalid Email", 401);

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return error(res, "Invalid Password", 401);

    if (!process.env.JWT_SECRET) return error(res, "JWT_SECRET missing in env", 500);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role_name }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("userToken", token, { httpOnly: true, secure: isProd, sameSite: isProd ? "None" : "Strict", maxAge: 24 * 60 * 60 * 1000 });

    logger.info({ userId: user.id }, "Admin logged in successfully");
    return success(res, "Login Successful", {
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        email: user.email,
        role: user.role_name,
        companySlug: user.company_slug
      }
    });

  } catch (err) {
    logger.error(err, "Admin login failed");
    return error(res, "Internal server error.", 500);
  }
};

export const adminLogout = (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("userToken", { httpOnly: true, secure: isProd, sameSite: isProd ? "None" : "Strict" });

    logger.info("Admin logged out successfully");
    return success(res, "Logged Out Successfully", {}, 200);

  } catch (err) {
    logger.error(err, "Admin logout failed");
    return error(res, "Internal server error.", 500);
  }
};

export const getAllUser = async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT 
        u.id, u.first_name, u.last_name, u.mobile, u.email, u.password,
        r.role_name AS role, r.description AS role_description,
        u.created_at, u.updated_at
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE r.role_name != 'super admin'
    `);

    if (!users.length) return error(res, "Users are not available.", 400);

    logger.info({ count: users.length }, "Fetched all users");
    return success(res, { users }, 200);

  } catch (err) {
    logger.error(err, "Fetching all users failed");
    return error(res, "Internal server error!", 500);
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  if (!id) return error(res, "Login please.", 404);

  try {
    const [user] = await db.execute("SELECT first_name, last_name, mobile, email FROM users WHERE id = ?", [id]);
    if (!user.length) return error(res, "User not found.", 404);

    logger.info({ userId: id }, "Fetched user by ID");
    return success(res, { user: user[0] }, 200);

  } catch (err) {
    logger.error(err, "Fetching user by ID failed");
    return error(res, "Internal server error.", 500);
  }
};

export const removeAdmins = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.execute("SELECT first_name FROM users WHERE id = ?", [id]);
    if (!existing.length) return error(res, "Unauthorized.", 402);

    await db.execute("DELETE FROM users WHERE id = ?", [id]);

    logger.info({ userId: id }, "Admin removed successfully");
    return success(res, "Admin removed successfully.", 200);

  } catch (err) {
    logger.error(err, "Remove admin failed");
    return error(res, "Internal server error.", 500);
  }
};