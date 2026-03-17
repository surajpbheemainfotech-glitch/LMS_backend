import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";

export const signup = async (req, res) => {
  try {
    const { first_name, last_name, mobile, email, password } = req.body;

    if (!first_name || !last_name || !mobile || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      "INSERT INTO users (first_name, last_name, mobile, email, password) VALUES (?, ?, ?, ?, ?)",
      [first_name, last_name, mobile, email, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: "User Registered Successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const login = async (req, res) => {

  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

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

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        email: user.email,
        role: user.role,
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

export const logout = (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === "production";

    res.clearCookie("userToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged Out Successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAllUser = async (req, res) => {
  try {

    const [userRows] = await db.execute(`
      SELECT 
      id, first_name, last_name, mobile, email, password, role, 
      created_at, updated_at
       FROM users`
    );

    if (userRows.length == 0) {
      return res.status(400).json({
        success: false,
        message: "Users are not avaiable ."
      });
    }

    const users = userRows;

    return res.status(200).json({ success: true, users: users })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error !"
    });
  }
}

export const updateUserProfileById = async (req, res) => {
  try {
    const userId = req.params.id;
    const { first_name, last_name, mobile, domain } = req.body;

    const pdf_path = req.file?.path || null;
    const pdf_url = req.file?.filename || null;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Please select domain.",
      });
    }

    if (!pdf_url || !pdf_path) {
      return res.status(400).json({
        success: false,
        message: "Please upload resume.",
      });
    }

    const [user] = await db.execute(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (user.length === 0) {
      if (pdf_url) {
        await cloudinary.uploader.destroy(pdf_url);
      }

      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const [existingUser] = await db.execute(
      "SELECT pdf_url FROM users WHERE id = ?",
      [userId]
    );

    if (existingUser[0]?.pdf_url) {
      await cloudinary.uploader.destroy(existingUser[0].pdf_url);
    }

    await db.execute(
      `UPDATE users 
       SET first_name = ?, last_name = ?, mobile = ?, domain = ?, pdf_url = ?
       WHERE id = ?`,
      [first_name, last_name, mobile, domain, pdf_url, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Updated successfully.",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getUserById  = async(req,res) =>{
  try {

    const {id}  = req.params

     if(!id){
      return res.status(404).json({
        success: false, 
        message: "Login please ."
      })
     }

  const [user] = await db.execute(
    `SELECT first_name, last_name, mobile, email FROM users
     WHERE id = ?`,
     [id]
    );

    if(user.length == 0){
       return res.status(404).json({
        success: false, 
        message: "Login please ."
      })
    }

    return res.status(200).json({
      success: true, 
      user: user
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
       message: "Internal server error ."
      })
  }
}

