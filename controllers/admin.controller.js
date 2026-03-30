import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from '../config/db.js';

dotenv.config();

export const adminLogin = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

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

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email",
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET missing in env",
      });
    }

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

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        email: user.email,
        role: user.role_name,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const adminLogout = (req, res) => {
  try {
    res.clearCookie("adminToken", {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    });

    return res.status(200).json({
      success: true,
      message: "Logged Out Successfully",
    });

  } catch (error) {
    console.error(" Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};