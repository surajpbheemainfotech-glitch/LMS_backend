import db from "../config/db.config.js";
import cloudinary from "../config/cloudinary.config.js";
import { createSlug, generateApplicationSlug } from "../services/service.slug.generator.js";
import { error, success } from "../utils/response.js";
import logger from "../utils/logger.js";

const cleanupCloudinary = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`Cloudinary resource deleted: ${publicId}`);
    } catch (err) {
      logger.error(`Cloudinary cleanup error: ${err.message}`);
    }
  }
};

export const updateStudentProfileBySlug = async (req, res) => {
  const slug = req.params.slug;
  const { first_name, last_name, mobile, domain } = req.body;
  const pdf_path = req.file?.path || null;
  const pdf_url = req.file?.filename || null;

  try {
    logger.info({ slug }, "Student profile update attempt");

    if (!domain) return error(res, "Please select domain.", 400);
    if (!pdf_url || !pdf_path) return error(res, "Please upload resume.", 400);

    const [user] = await db.execute("SELECT id FROM students WHERE slug = ? LIMIT 1", [slug]);
    if (!user.length) {
      await cleanupCloudinary(pdf_url);
      return error(res, "User not found.", 404);
    }

    const [existingUser] = await db.execute("SELECT pdf_url FROM students WHERE slug = ?", [slug]);
    if (existingUser[0]?.pdf_url) await cleanupCloudinary(existingUser[0].pdf_url);

    await db.execute(
      `UPDATE students SET first_name = ?, last_name = ?, mobile = ?, domain = ?, pdf_url = ? WHERE slug = ?`,
      [first_name, last_name, mobile, domain, pdf_url, slug]
    );

    logger.info({ slug }, "Student profile updated successfully");
    return success(res, "Profile updated successfully", { slug, first_name, last_name, mobile, domain, pdf_url, pdf_path });

  } catch (err) {
    logger.error(err, "Update student profile failed");
    return error(res, "Internal server error.", 500);
  }
};

export const getStudentBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug) return error(res, "Login please.", 400);

    const [userRows] = await db.execute("SELECT first_name, last_name, mobile, email, domain, pdf_url FROM students WHERE slug = ?", [slug]);
    if (!userRows.length) return error(res, "Login please.", 404);

    const user = userRows[0];
    const cloud_path = "https://res.cloudinary.com/dmcqwhfzi/image/upload/v1/";

    logger.info({ slug }, "Fetched student profile");
    return success(res, "Student fetched successfully", { user: { first_name: user.first_name, last_name: user.last_name, mobile: user.mobile, email: user.email, domain: user.domain || null, resume: `${cloud_path}${user.pdf_url}` } });

  } catch (err) {
    logger.error(err, "Fetching student by slug failed");
    return error(res, "Internal server error.", 500);
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const [students] = await db.execute("SELECT id, first_name, last_name, mobile, email, password, role, created_at, updated_at FROM students");
    if (!students.length) return error(res, "Users are not available.", 404);

    logger.info({ count: students.length }, "Fetched all students");
    return success(res, "Students fetched successfully", { students });

  } catch (err) {
    logger.error(err, "Fetching all students failed");
    return error(res, "Internal server error!", 500);
  }
};

export const applyForJob = async (req, res) => {
  const { application_type } = req.body;
  const job_slug = req.params.slug;
  const student_id = req.user.id;
  const resume = req.file?.path || null;
  const resume_public_id = req.file?.filename || null;

  if (!application_type || !job_slug) return error(res, "All fields are required.", 400);
  if (!student_id) return error(res, "Please login.", 400);
  if (!resume) return error(res, "Please select file.", 400);

  try {
    logger.info({ student_id, job_slug }, "Job application attempt");

    const [checkJob] = await db.execute("SELECT opportunity_id FROM opportunities WHERE slug = ?", [job_slug]);
    if (!checkJob.length) {
      await cleanupCloudinary(resume_public_id);
      return error(res, "Hiring is closed.", 400);
    }

    const job_id = checkJob[0].opportunity_id;
    const jobSlug = generateApplicationSlug(application_type, student_id, job_id);

    await db.execute(
      `INSERT INTO student_applications (student_id, job_id, application_type, resume_url, resume_public_id, slug, applied_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, job_id, application_type, resume, resume_public_id, jobSlug, new Date(), new Date()]
    );

    logger.info({ student_id, job_id }, "Job applied successfully");
    return success(res, "Applied successfully.", { data: { application_type, resume } }, 200);

  } catch (err) {
    await cleanupCloudinary(resume_public_id);
    logger.error(err, "Job application failed");
    return error(res, "Internal server error", 500);
  }
};

export const allJobs = async (req, res) => {
  try {
    const [jobs] = await db.execute(`
      SELECT op.company_id, op.job_title, op.slug, op.type, op.description, op.location, op.salary, op.duration, op.posted_date, op.last_date,
             c.company_name AS company
      FROM opportunities op
      LEFT JOIN companies c ON op.company_id = c.company_id
    `);

    logger.info({ count: jobs.length }, "Fetched all jobs");
    return success(res, { jobs }, 200);

  } catch (err) {
    logger.error(err, "Fetching jobs failed");
    return error(res, "Internal server error", 500);
  }
};