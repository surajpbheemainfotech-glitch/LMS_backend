import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";
import { createSlug, generateApplicationSlug } from "../services/service.slug.generator.js";
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

export const applyForJob = async (req, res) => {

    const { application_type } = req.body
    const job_slug = req.params.slug
    const student_id = req.user.id
    const resume = req.file?.path || null;
    const resume_public_id = req.file?.filename || null;

    if (!application_type || !job_slug) {
        return error(res, "All fields are required .", 400)
    }

    if (!student_id) {
        return error(res, " Pleas Login .", 400)
    }

    if (!resume) {
        return error(res, "Please select file .")
    }

    try {

        if ( !application_type) {
            if (resume_public_id) {
                await cloudinary.uploader.destroy(resume_public_id);
            }

            return error(res, "Required fields missing", 400)
        }

        const [checkJob] = await db.execute(
            `SELECT opportunity_id FROM opportunities WHERE slug = ?`,
            [job_slug]
        )

        if (checkJob.length === 0) {
            return error(res, "Hiring are closed .", 400)
        }

        const job_id = checkJob[0].opportunity_id
        const jobSlug = generateApplicationSlug(application_type, student_id, job_id)

        await db.execute(
            `INSERT INTO student_applications 
            (student_id, job_id, application_type, resume_url , resume_public_id, slug applied_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, job_id, application_type, resume, resume_public_id, jobSlug,  new Date(), new Date()]
        )

        return success(
            res,
            "Applied successfully .",
            {
                data: {
                    application_type,
                    resume,
                }
            }, 200)

    } catch (err) {
        if (req.file?.filename) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (destroyError) {
                console.error("Cloudinary cleanup error:", destroyError.message);
            }
        }

        console.error("Add job Error:", err);
        return error(res, "Internal server error ", 500)

    }
}

export const allJobs = async (req, res) => {

    try {

        const [jobs] = await db.execute(
         `SELECT 
            op.company_id, op.job_title, op.slug, op.type, op.description, 
            op.location, op.salary, op.duration, op.posted_date, op.last_date,
            c.company_name AS company
         FROM opportunities op
         LEFT JOIN companies c 
         ON op.company_id = c.company_id`
        );

        return success(res, { jobs: jobs }, 200)

    } catch (err) {
        console.log(err)
        return error(res, "Internal server error ", 500)
    }
}
