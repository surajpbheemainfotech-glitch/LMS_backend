import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from '../config/db.js';

dotenv.config();

export const adminLogin = async (req, res) => {
  try {
 
    const { email, password } = req.body;

 
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const [rows] = await db.execute(
      "SELECT * FROM admin WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    const admin = rows[0];

    const isPasswordMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: false, 
      sameSite: "Lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Admin Login Successful",
      token, 
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {
    console.error("Admin Login Error:", error);

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