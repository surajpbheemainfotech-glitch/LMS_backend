import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";
import { createSlug } from "../services/service.slug.generator.js";
import { error, success } from "../utils/response.js";

export const studentRegister = async (req, res) => {
    const { first_name, last_name, mobile, email, password } = req.body;

    if (!first_name || !last_name || !mobile || !email || !password) {
        return error(res, "All fields are required", 400);
    }

    try {
        const [existing] = await db.execute(
            "SELECT id FROM students WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return error(res, "Email already registered", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const slug = createSlug(last_name);

        const [result] = await db.execute(
            "INSERT INTO students (first_name, last_name, mobile, email, password, slug) VALUES (?, ?, ?, ?, ?, ?)",
            [first_name, last_name, mobile, email, hashedPassword, slug]
        );

        return success(res, "Student Registered Successfully.", {
            userId: result.insertId,
        }, 201);

    } catch (err) {
        console.error("Signup Error:", err);
        return error(res, "Server Error", 500);
    }
};

export const studentLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return error(res, "Email and Password are required", 400);
    }

    try {
        const [rows] = await db.execute(
            "SELECT * FROM students WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return error(res, "Invalid Email", 401);
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return error(res, "Invalid Password", 401);
        }

        if (!process.env.JWT_SECRET) {
            return error(res, "JWT_SECRET missing in env", 500);
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
                slug: user.slug,
                first_name: user.first_name,
                email: user.email,
                role: "student",
            },
        });

    } catch (err) {
        console.error("Login Error:", err);
        return error(res, "Server Error", 500);
    }
};

export const studentLogout = (req, res) => {
    try {
        const isProd = process.env.NODE_ENV === "production";

        res.clearCookie("userToken", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "None" : "Strict",
        });

        return success(res, "Logged Out Successfully", {}, 200);

    } catch (err) {
        console.error("Logout Error:", err);
        return error(res, "Server Error", 500);
    }
};

export const updateStudentProfileBySlug = async (req, res) => {
    const slug = req.params.slug;
    const { first_name, last_name, mobile, domain } = req.body;

    const pdf_path = req.file?.path || null;
    const pdf_url = req.file?.filename || null;

    try {
        if (!domain) {
            return error(res, "Please select domain.", 400);
        }

        if (!pdf_url || !pdf_path) {
            return error(res, "Please upload resume.", 400);
        }

        const [user] = await db.execute(
            "SELECT id FROM students WHERE slug = ? LIMIT 1",
            [slug]
        );

        if (user.length === 0) {
            if (pdf_url) {
                await cloudinary.uploader.destroy(pdf_url);
            }

            return error(res, "User not found.", 404);
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

        return success(res, "Profile updated successfully", {
            slug,
            first_name,
            last_name,
            mobile,
            domain,
            pdf_url,
            pdf_path,
        });

    } catch (err) {
        console.error(err);
        return error(res, "Internal server error.", 500);
    }
};

export const getStudentBySlug = async (req, res) => {
    try {
        const slug = req.params.slug;

        if (!slug) {
            return error(res, "Login please.", 400);
        }

        const [userRows] = await db.execute(
            `SELECT first_name, last_name, mobile, email, domain, pdf_url 
       FROM students WHERE slug = ?`,
            [slug]
        );

        if (userRows.length === 0) {
            return error(res, "Login please.", 404);
        }

        const user = userRows[0];
        const cloud_path = "https://res.cloudinary.com/dmcqwhfzi/image/upload/v1/";

        return success(res, "Student fetched successfully", {
            user: {
                first_name: user.first_name,
                last_name: user.last_name,
                mobile: user.mobile,
                email: user.email,
                domain: user.domain || null,
                resume: `${cloud_path}${user.pdf_url}`,
            },
        });

    } catch (err) {
        console.log(err.message);
        return error(res, "Internal server error.", 500);
    }
};

export const getAllStudents = async (req, res) => {
    try {
        const [userRows] = await db.execute(`
      SELECT 
      id, first_name, last_name, mobile, email, password, role,
      created_at, updated_at
      FROM students
    `);

        if (userRows.length === 0) {
            return error(res, "Users are not available.", 404);
        }

        return success(res, "Students fetched successfully", {
            students: userRows,
        });

    } catch (err) {
        return error(res, "Internal server error!", 500);
    }
};
