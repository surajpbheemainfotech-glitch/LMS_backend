import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { error, success } from "../utils/response.js";

export const addAdmins = async (req, res) => {

  const { first_name, last_name, mobile, email, password, role, description } = req.body;

  if (!first_name || !last_name || !mobile || !email || !password || !role || !description) {
    return error(res, "All fields are required", 400)
  }
  try {

    const [existing] = await db.execute("SELECT first_name, last_name FROM users WHERE email = ?", [
      email,
    ]);

    if (existing.length > 0) {
      return error(res, "Email already registered", 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      "INSERT INTO users (first_name, last_name, mobile, email, password) VALUES (?, ?, ?, ?, ?)",
      [first_name, last_name, mobile, email, hashedPassword]
    );

    const [roles] = await db.execute(
      `INSERT INTO roles (role_name, description) VALUES (?, ?)`,
      [role, description]
    )

    await db.execute(
      `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
      [result.insertId, roles.insertId]
    )
    return success(res, "User Registered Successfully", { userId: result.insertId }, 201)
  } catch (error) {
    return error(res, "Internal server error .", 500)
  }
};

export const adminLogin = async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return error(res, "Email and Password are required", 400)
  }

  try {
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

    if (rows.length === 0) {
      return error(res, "Invalid Email", 401)
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return error(res, "Invalid Password", 401)
    }

    if (!process.env.JWT_SECRET) {
      return error(res, "JWT_SECRET missing in env", 500)
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
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

    return success(res, "Login Successful", {
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        email: user.email,
        role: user.role_name,
        companySlug: user.company_slug, 
      }
    });
  } catch (error) {
    return error(res, "Internal server error .", 500)
  }
};

export const adminLogout = (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === "production";

    res.clearCookie("userToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Strict",
    });

    return success(res, "Logged Out Successfully", 200)
  } catch (error) {
    return error(res, "Internal server error .", 500)
  }
};

export const getAllUser = async (req, res) => {
  try {

    const [userRows] = await db.execute(`
  SELECT 
    u.id, u.first_name, u.last_name, u.mobile, u.email, u.password,
    r.role_name AS role, r.description AS role_description,
    u.created_at, u.updated_at
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE r.role_name != 'super admin'
`);

    if (userRows.length == 0) {
      return error(res, "Users are not avaiable .", 400)
    }

    const users = userRows;
    return success(res, { users: users }, 200)

  } catch (error) {
    return error(res, "Internal server error !", 500)
  }
}

export const getUserById = async (req, res) => {
  try {

    const { id } = req.params

    if (!id) {
      return error(res, "Login please .", 404)
    }

    const [user] = await db.execute(
      `SELECT first_name, last_name, mobile, email FROM users
     WHERE id = ?`,
      [id]
    );

    if (user.length == 0) {
      return error(res, "Login please .", 404)
    }

    return success(res, { user: user }, 200)

  } catch (error) {
    return error(res, "Internal server error .", 500)
  }
}

export const removeAdmins = async (req, res) => {
  try {
    const { id } = req.params

    const [existing] = await db.execute(`
          SELECT first_name FROM users WHERE id = ?`,
      [id])

    if (existing.length === 0) {
      return error(res, "Unauthorized .", 402)
    }

    await db.execute(`DELETE FROM users WHERE id = ?`,
      [id])

    return success(res, "Admin remove successfully .", 200)

  } catch (error) {
    return error(res, "Internal server error .", 500)
  }
}

