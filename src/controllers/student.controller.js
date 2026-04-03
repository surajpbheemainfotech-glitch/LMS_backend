import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";
import { createSlug } from "../services/service.slug.generator.js";


export const studentRegister = async (req, res) => {

    const { first_name, last_name, mobile, email, password } = req.body;

    if (!first_name || !last_name || !mobile || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    try {
        const [existing] = await db.execute("SELECT id FROM students WHERE email = ?", [
            email,
        ]);

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already registered",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const slug = createSlug(last_name)

        const [result] = await db.execute(
            "INSERT INTO students (first_name, last_name, mobile, email, password, slug) VALUES (?, ?, ?, ?, ?, ?)",
            [first_name, last_name, mobile, email, hashedPassword, slug]
        );

        return res.status(201).json({
            success: true,
            message: "Student Registered Successfully .",
            userId: result.insertId,
        });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
}

export const studentLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and Password are required",
        });
    }

    try {

        const [rows] = await db.execute("SELECT * FROM students WHERE email = ?", [
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
                slug:user.slug,
                first_name: user.first_name,
                email: user.email,
                role: "student",
            },
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
}

export const studentLogout = (req, res) => {
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

export const updateStudentProfileBySlug = async (req, res) => {

    const slug = req.params.slug;
    const { first_name, last_name, mobile, domain } = req.body;

    const pdf_path = req.file?.path || null;
    const pdf_url = req.file?.filename || null;

    try {
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
            "SELECT id FROM students WHERE slug = ? LIMIT 1",
            [slug]
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
            "SELECT pdf_url FROM students WHERE slug = ?",
            [slug]
        );

        if (existingUser[0]?.pdf_url) {
            await cloudinary.uploader.destroy(existingUser[0].pdf_url);
        }

        await db.execute(
            `UPDATE students 
             SET first_name = ?, last_name = ?, mobile = ?, domain = ?, pdf_url = ?
             WHERE slug = ?`,
            [first_name, last_name, mobile, domain, pdf_url, slug]
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                slug,
                first_name,
                last_name,
                mobile,
                domain,
                pdf_url,
                pdf_path,
            },
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });

    }
}

export const getStudentBySlug = async (req, res) => {
    try {
        const slug  = req.params.slug

        if (!slug) {
            return res.status(404).json({
                success: false,
                message: "Login please ."
            })
        }

        const [userRows] = await db.execute(
            `SELECT first_name, last_name, mobile, email, domain, pdf_url  FROM students
             WHERE slug = ?`,
            [slug]
        );

        if (userRows.length == 0) {
            return res.status(404).json({
                success: false,
                message: "Login please ."
            })
        }
        const user = userRows[0]
        const cloud_path = "https://res.cloudinary.com/dmcqwhfzi/image/upload/v1/";

        return res.status(200).json({
            success: true,
            user: {
                first_name: user.first_name,
                last_name: user.last_name,
                mobile: user.mobile,
                email: user.email,
                domain: user.domain || null,
                resume: `${cloud_path}${user.pdf_url}`
            }
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}

export const getAllStudents = async (req, res) => {
    try {

        const [userRows] = await db.execute(`
      SELECT 
      id, first_name, last_name, mobile, email, password, role, 
      created_at, updated_at
       FROM students`
        );

        if (userRows.length == 0) {
            return res.status(400).json({
                success: false,
                message: "Users are not avaiable ."
            });
        }

        const students = userRows;

        return res.status(200).json({ success: true, students: students })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error !"
        });
    }
}
