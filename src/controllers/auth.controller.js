import db from "../config/db.config.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createSlug } from "../services/service.slug.generator.js";
import generatePassword from "../services/service.genratePassword.js";
import { enqueueEmail } from "../services/service.mail/sendmail.js";
import { generateOTP } from "../services/service.otp.js";
import logger from "../utils/logger.js";
import { error, success } from "../utils/response.js";


//admin

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

// user

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
      `INSERT INTO users (first_name, last_name, email, password, mobile, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, temPassword, mobile || null, "inactive"]
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
    }

    await db.execute(
      `INSERT INTO approval_requests(user_email) VALUES (?)`,
      [email]
    );

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

export const loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role)
    return error(res, "Email, Password and Role are required", 400);

  try {
    logger.info({ email }, "User login attempt");

    const [rows] = await db.execute(
      `SELECT 
        u.id, u.first_name, u.last_name, u.email, u.password,
        r.id AS role_id, r.role_name,
        c.slug AS company_slug
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       LEFT JOIN companies c 
           ON c.email = u.email AND r.role_name = 'corporate'
       WHERE u.email = ?
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) return error(res, "Invalid Email", 401);

    const user = rows[0];

    if (user.role_name !== role) {
      return error(res, "Invalid role selected.", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return error(res, "Invalid Password", 401);

    if (!process.env.JWT_SECRET)
      return error(res, "JWT_SECRET missing in env", 500);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Strict",
      maxAge: 24 * 60 * 60 * 1000
    });

    logger.info(
      { userId: user.id, role: user.role_name },
      "User logged in successfully"
    );

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
    logger.error(err, "User login failed");
    return error(res, "Internal server error.", 500);
  }
};

//students

export const studentRegister = async (req, res) => {
  const { first_name, last_name, mobile, email, password } = req.body;

  if (!first_name || !last_name || !mobile || !email || !password) {
    return error(res, "All fields are required", 400);
  }

  try {
    logger.info({ email }, "Student registration attempt");

    const [existing] = await db.execute("SELECT id FROM students WHERE email = ?", [email]);
    if (existing.length > 0) return error(res, "Email already registered", 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const slug = createSlug(last_name);

    const [result] = await db.execute(
      "INSERT INTO students (first_name, last_name, mobile, email, password, slug) VALUES (?, ?, ?, ?, ?, ?)",
      [first_name, last_name, mobile, email, hashedPassword, slug]
    );

    logger.info({ studentId: result.insertId }, "Student registered successfully");
    return success(res, "Student Registered Successfully.", { userId: result.insertId }, 201);

  } catch (err) {
    logger.error(err, "Student registration failed");
    return error(res, "Server Error", 500);
  }
};

export const studentLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return error(res, "Email and Password are required", 400);

  try {
    logger.info({ email }, "Student login attempt");

    const [rows] = await db.execute("SELECT * FROM students WHERE email = ?", [email]);
    if (rows.length === 0) return error(res, "Invalid Email", 401);

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return error(res, "Invalid Password", 401);

    if (!process.env.JWT_SECRET) return error(res, "JWT_SECRET missing in env", 500);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    logger.info({ studentId: user.id }, "Student logged in successfully");
    return success(res, "Login Successful", { token, user: { id: user.id, slug: user.slug, first_name: user.first_name, email: user.email, role: "student" } });

  } catch (err) {
    logger.error(err, "Student login failed");
    return error(res, "Server Error", 500);
  }
};

//common logout + reset password 

export const generateUserPassword = async (req, res) => {

  const { email, password, newPassword } = req.body;

  logger.info({ email }, "Password generation request");

  if (!email || !password || !newPassword) {
    return error(res, "All fields are required.", 400);
  }

  try {

    let user;
    let table = "";

    const [userRows] = await db.execute(
      `SELECT password FROM users WHERE email = ?`,
      [email]
    );

    if (userRows.length > 0) {
      user = userRows[0];
      table = "users";
    } else {

      const [studentRows] = await db.execute(
        `SELECT password FROM students WHERE email = ?`,
        [email]
      );

      if (studentRows.length === 0) {
        return error(res, "User not found.", 404);
      }

      user = studentRows[0];
      table = "students";
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return error(res, "Invalid current password.", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute(
      `UPDATE ${table} SET password = ? WHERE email = ?`,
      [hashedPassword, email]
    );

    logger.info({ email, table }, "Password updated successfully");
    return success(res, "Password updated successfully.", 200);

  } catch (err) {

    logger.error(err, "User password generation failed");
    return error(res, "Internal server error.", 500);
  }
};

export const forgetPassword = async (req, res) => {

  const { email } = req.body;

  if (!email) {
    return error(res, "Email is required.", 400);
  }

  try {

    let userName = "";
    let role = "";

    const [userRow] = await db.execute(
      `SELECT 
      u.first_name,
      u.last_name,
      r.role_name AS role
   FROM users u
   JOIN user_roles ur ON u.id = ur.user_id
   JOIN roles r ON ur.role_id = r.id
   WHERE u.email = ?`,
      [email]
    );

    if (userRow.length > 0) {

      const user = userRow[0];
      userName = `${user.first_name} ${user.last_name}`;
      role = user.role;

    } else {

      const [studentRow] = await db.execute(
        `SELECT first_name, last_name, role FROM students WHERE email = ?`,
        [email]
      );

      if (studentRow.length === 0) {
        return error(res, "Invalid email.", 400);
      }

      const student = studentRow[0];
      userName = `${student.first_name} ${student.last_name}`;
      role = student.role;
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await db.execute(
      `INSERT INTO password_otps (email, otp, expires_at)
       VALUES (?, ?, ?)`,
      [email, otp, expiry]
    );

    await enqueueEmail({
      type: "OTP_VERIFICATION",
      to: email,
      name: userName,
      otp
    });

    logger.info({ email }, "Password reset OTP sent");
    return success(res, "OTP sent to your email.", 200);

  } catch (err) {

    logger.error(err, "Forgot password failed");
    return error(res, "Internal server error.", 500);
  }
};

export const verifyOtp = async (req, res) => {

  const { email, otp } = req.body;

  if (!email || !otp) {
    return error(res, "Email and OTP are required.", 400);
  }

  try {

    const [rows] = await db.execute(
      `SELECT id, otp, attempts, max_attempts, expires_at
       FROM password_otps
       WHERE email = ?
       ORDER BY id DESC
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return error(res, "OTP not found.", 400);
    }

    const record = rows[0];

    if (record.attempts >= record.max_attempts) {
      return error(res, "Too many attempts. Please request a new OTP.", 400);
    }

    if (new Date() > new Date(record.expires_at)) {
      return error(res, "OTP expired.", 400);
    }

   if (String(record.otp) !== String(otp)) {

      await db.execute(
        `UPDATE password_otps
         SET attempts = attempts + 1
         WHERE id = ?`,
        [record.id]
      );

      return error(res, "Invalid OTP.", 400);
    }

    await db.execute(
      `DELETE FROM password_otps WHERE id = ?`,
      [record.id]
    );

    logger.info({ email }, "OTP verified successfully")
    return success(res, "OTP verified successfully.", 200);

  } catch (err) {

    logger.error(err, "OTP verification failed");
    return error(res, "Internal server error.", 500);
  }
};

export const logout = (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("userToken", { httpOnly: true, secure: isProd, sameSite: isProd ? "None" : "Strict" });

    logger.info( ` ${req.user.role} logged out successfully`);
    return success(res, ` ${req.user.role} Logged Out Successfully`, {}, 200);

  } catch (err) {
    logger.error(err, ` ${req.user.role} logout failed`);
    return error(res, "Internal server error.", 500);
  }
};

export const resetPassword = async (req, res) =>{

   const { email, password } = req.body;

  logger.info({ email }, "Password reset request");

  if (!email || !password ) {
    return error(res, "All fields are required.", 400);
  }

  try {

    let user;
    let table = "";

    const [userRows] = await db.execute(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    );

    if (userRows.length > 0) {
      user = userRows[0];
      table = "users";
    } else {

      const [studentRows] = await db.execute(
        `SELECT id FROM students WHERE email = ?`,
        [email]
      );

      if (studentRows.length === 0) {
        return error(res, "User not found.", 404);
      }

      user = studentRows[0];
      table = "students";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `UPDATE ${table} SET password = ? WHERE email = ?`,
      [hashedPassword, email]
    );

    logger.info({ email, table }, "Password reset successfully");
    return success(res, "Password reset successfully.", 200);

  } catch (err) {

    logger.error(err, "User password reset failed");
    return error(res, "Internal server error.", 500);
  }
}

