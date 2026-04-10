import db from '../config/db.config.js'
import { createSlug } from '../services/service.slug.generator.js'
import bcrypt from 'bcryptjs'
import logger from '../utils/logger.js'
import { error, success } from '../utils/response.js'

export const addCompany = async (req, res) => {

  const {
    company_name, industry, email, phone, location,
    first_name, last_name, password, role, description
  } = req.body

  try {

    logger.info({ company_name, email }, "Company registration request")

    if (!company_name || !industry || !email || !phone || !location) {
      logger.warn("Missing company details")
      return error(res, "All fields are required.", 400)
    }

    if (!first_name || !last_name || !password || !role || !description) {
      logger.warn("Missing personal details")
      return error(res, "Personal Details are required.", 400)
    }

    const [existingCompany] = await db.execute(
      `SELECT id FROM companies WHERE company_name = ?`,
      [company_name]
    )

    if (existingCompany.length > 0) {
      logger.warn({ company_name }, "Duplicate company registration attempt")
      return error(res, "Company already registered.", 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const [user] = await db.execute(
      `INSERT INTO users (first_name, last_name, mobile, email, password)
       VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, phone, email, hashedPassword]
    )

    const [roleInsert] = await db.execute(
      `INSERT INTO roles (role_name, description)
       VALUES (?, ?)`,
      [role, description]
    )

    await db.execute(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES (?, ?)`,
      [user.insertId, roleInsert.insertId]
    )

    const companySlug = createSlug(company_name)

    const [company] = await db.execute(
      `INSERT INTO companies (company_name, slug, industry, email, phone, location)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [company_name, companySlug, industry, email, phone, location]
    )

    await db.execute(
      `INSERT INTO company_approvals (company_id) VALUES (?)`,
      [company.insertId]
    )

    logger.info({ companyId: company.insertId }, "Company registered successfully")

    return success(res, "Request received for approval.", 201)

  } catch (err) {

    logger.error(err, "Company registration failed")

    return error(res, "Internal server error", 500)
  }
}

export const getCompanies = async (req, res) => {

  try {

    const user = req.user?.id

    logger.info({ user }, "Fetch approved companies")

    if (!user) {
      logger.warn("Unauthorized company fetch attempt")
      return error(res, "Unauthorized.", 401)
    }

    const [companies] = await db.execute(`
      SELECT 
        c.id, c.company_name, c.industry,
        c.email, c.phone, c.location
      FROM companies c
      JOIN company_approvals ca 
      ON c.id = ca.company_id
      WHERE ca.approval_status = 'Approved'
    `)

    logger.info({ total: companies.length }, "Companies fetched")

    return success(res, { companies }, 200)

  } catch (err) {

    logger.error(err, "Fetch companies failed")

    return error(res, "Internal server error", 500)
  }
}

export const postJob = async (req, res) => {

  const company_slug = req.params.slug
  const { job_title, type, description, location, salary, duration, posted_date, last_date } = req.body

  try {

    logger.info({ company_slug, job_title }, "Job posting request")

    if (!company_slug) {
      logger.warn("Company slug missing")
      return error(res, "Please login.", 400)
    }

    if (!job_title || !type || !description || !location || !salary || !duration || !posted_date || !last_date) {
      logger.warn("Missing job fields")
      return error(res, "All fields are required.", 400)
    }

    const [validCompany] = await db.execute(
      `SELECT id FROM companies WHERE slug = ?`,
      [company_slug]
    )

    if (validCompany.length === 0) {
      logger.warn({ company_slug }, "Invalid company slug")
      return error(res, "Company not found.", 404)
    }

    const company_id = validCompany[0].id
    const job_slug = createSlug(job_title)

    await db.execute(
      `INSERT INTO opportunities
      (company_id, job_title, slug, type, description, location, salary, duration, posted_date, last_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_id, job_title, job_slug, type, description, location, salary, duration, posted_date, last_date]
    )

    logger.info({ job_slug }, "Job posted successfully")

    return success(res, "Job posted successfully.", 200)

  } catch (err) {

    logger.error(err, "Job posting failed")

    return error(res, "Internal server error", 500)
  }
}

export const deleteJob = async (req, res) => {
  const job_slug = req.params.slug;

  if (!job_slug) {
    logger.warn("Job deletion attempted without slug");
    return error(res, "Select job first.", 400);
  }

  try {
    logger.info({ job_slug }, "Job delete request received");

    const [checkJob] = await db.execute(
      `SELECT opportunity_id, job_title FROM opportunities WHERE slug = ?`,
      [job_slug]
    );

    if (checkJob.length === 0) {
      logger.warn({ job_slug }, "Job not available for deletion");
      return error(res, "Job not available.", 404);
    }

    await db.execute(
      `DELETE FROM opportunities WHERE slug = ?`,
      [job_slug]
    );

    logger.info({ job_slug, job_title: checkJob[0].job_title }, "Job deleted successfully");

    return success(res, "Job post removed successfully.", 200);

  } catch (err) {
    logger.error(err, "Job deletion failed");
    return error(res, "Internal server error.", 500);
  }
};

export const getJobs = async (req, res) => {
  const company_slug = req.params.slug

  req.log.info({ company_slug }, "Fetching jobs for company")

  if (!company_slug) {
    req.log.warn("Company slug missing in request")
    return error(res, "Please login .", 500)
  }

  try {

    const [checkCompany] = await db.execute(
      `SELECT company_id FROM companies WHERE slug = ?`,
      [company_slug]
    )

    if (!checkCompany.length) {
      req.log.warn({ company_slug }, "Company not found")
      return error(res, "Company not found", 404)
    }

    req.log.info(
      { company_id: checkCompany[0].company_id },
      "Company found, fetching jobs"
    )

    const [jobs] = await db.execute(
      `SELECT job_title, slug, type, description, location, salary, duration, posted_date, last_date
             FROM opportunities
             WHERE company_id = ?`,
      [checkCompany[0].company_id]
    )

    req.log.info(
      { company_id: checkCompany[0].company_id, jobs_count: jobs.length },
      "Jobs fetched successfully"
    )

    return success(res, { jobs: jobs }, 200)

  } catch (err) {

    req.log.error(
      { err, company_slug },
      "Error while fetching jobs"
    )

    return error(res, "Internal server error", 500)
  }
}