import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";

export const addAdmins = async (req, res) => {

   const { first_name, last_name, mobile, email, password , role, description} = req.body;

    if (!first_name || !last_name || !mobile || !email || !password || !role || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
  try {
   
    const [existing] = await db.execute("SELECT first_name, last_name FROM users WHERE email = ?", [
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

   const [role] =  await db.execute(
      `INSERT INTO roles (role_name, description) VALUES (?, ?)`,
      [role, description]
    )

    await db.execute(
      `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
      [result.insertId, role.insertId]
    )

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

export const adminLogin = async (req, res) => {

   const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

  try {
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

