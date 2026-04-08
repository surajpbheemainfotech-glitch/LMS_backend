import db from '../config/db.js'
import { createSlug } from '../services/service.slug.generator.js'
import bcrypt from 'bcryptjs'
import { error, success } from '../utils/response.js'
import cloudinary from "../config/cloudinaryConfig.js";

export const addCompany = async (req, res) => {

    const { company_name, industry, email, phone, location, first_name, last_name, password, role, description } = req.body

    if (!company_name || !industry || !email || !phone || !location) {
        return error(res, "All fields are required .", 400)

    } else {
        if (!first_name || !last_name || !password || !role || !description) {
            return error(res, "Personal Details are required .", 400)
        }
    }

    try {
        const [existingComapany] = await db.execute(
            `SELECT * FROM companies WHERE company_name = ? `,
            [company_name]
        )

        if (existingComapany.length > 0) {
            return error(res, "Company already registered .", 400)
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            "INSERT INTO users (first_name, last_name, mobile, email, password) VALUES (?, ?, ?, ?, ?)",
            [first_name, last_name, phone, email, hashedPassword]
        )

        const [roles] = await db.execute(
            `INSERT INTO roles (role_name, description) VALUES (?, ?)`,
            [role, description]
        )

        await db.execute(
            `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
            [result.insertId, roles.insertId]
        )

        const companySlug = createSlug(company_name)

        const [newCompany] = await db.execute(
            `INSERT INTO companies (company_name, slug, industry, email, phone, location) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [company_name, companySlug, industry, email, phone, location]
        )


        await db.execute(
            `INSERT INTO company_approvals (company_id) VALUES (?)`,
            [newCompany.insertId]
        )
        return success(res, "Request received for approval .", 201)

    } catch (error) {
        return error(res, "Internal server error ", 500)
    }
}

export const getCompanies = async (req, res) => {

    const user = req.user.id

    if (!user) {
        return error(res, "Unauthorized .", 402)
    }

    try {

        const [companies] = await db.execute(`
            SELECT 
             c.id, c.company_name, c.industry, c.email,
             c.phone, c.location
            FROM companies c
            JOIN company_approvals ca 
            ON c.id = ca.company_id
            WHERE ca.approval_status = 'Approved'
        `);

        return success(res, { comapnies: companies }, 200)

    } catch (error) {
        return error(res, "Internal server error ", 500)
    }
}

export const getCompanyApprovalRequests = async (req, res) => {
    try {

        const adminId = req.user.id

        if (!adminId) {
            return error(res, "Unauhtorized .", 402)
        }

        const [requests] = await db.execute(`
            SELECT 
             cp.company_id,
             c.company_name, c.industry, c.email,
             c.phone, c.location, c.created_at
            FROM company_approval cp
            JOIN companies c ON cp.company_id = c.company_id
            `);

        return success(res, { requests: requests }, 200)

    } catch (error) {
        return error(res, "Internal server error ", 500)
    }
}

export const approveCompanyRequests = async (req, res) => {

    const { approval_status, remarks, company_id } = req.body

    if (!approval_status || !remarks || !company_id) {
        return error(res, "All fields are required .", 400)
    }
    try {

        const adminId = req.user.id

        if (!adminId) {
            return error(res, "Unauthorized .", 402)
        }

        await db.execute(
            `UPDATE company_approvals
        SET approval_status = ?, approved_by = ?, approved_date = ?, remarks = ?
        WHERE company_id = ?`,
            [approval_status, adminId, new Date(), remarks, company_id]
        )

        return success(res, "Status updated successfully .", 200)

    } catch (error) {
        return error(res, "Internal server error ", 500)
    }
}

export const postJob = async (req, res) => {

    const company_slug = req.params.slug
    const { job_title, type, description, location, salary, duration, posted_date, last_date } = req.body

    if (!company_slug || company_slug === undefined) {
        return error(res, "Please login .", 400)
    }

    if (!job_title || !type || !description || !location || !salary || !duration || !posted_date || !last_date) {
        return error(res, "All feilds are required .", 400)
    }

    try {

        const [validCompany] = await db.execute(
            `SELECT company_id FROM companies WHERE slug = ?`, [company_slug]
        )

        const company_id = validCompany[0].company_id
        const job_slug = createSlug(job_title)

        await db.execute(
            `INSERT INTO opportunities 
            (company_id, job_title, slug, type, description, location, salary, duration, posted_date, last_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [company_id, job_title, job_slug, type, description, location, salary, duration, posted_date, last_date]
        )

        return success(res, "Job posted successfully .", 200)

    } catch (err) {
        console.log(err)
        return error(res, "Internal server error ", 500)
    }
}

export const getJobs = async (req, res) => {

    let company_slug = req.params.slug

    if (!company_slug) {
        return error(res, "Please login .", 500)
    }

    try {

        const [checkCompany] = await db.execute(
            `SELECT company_id FROM companies WHERE slug = ? `, [company_slug]
        )

        const [jobs] = await db.execute(
            `SELECT  job_title, slug, type, description, location, salary, duration, posted_date, last_date
            FROM opportunities
            WHERE company_id = ?`, [checkCompany[0].company_id]
        )

        return success(res, { jobs: jobs }, 200)

    } catch (err) {
        console.log(err)
        return error(res, "Internal server error ", 500)
    }
}

export const updateJobDetails = async (req, res) => {
    const job_slug = req.params.slug

    if (!job_slug || job_slug === undefined) {
        return error(res, "Select job first .", 400)
    }
    try {

        const [checkJob] = await db.execute(
            `SELECT job_title FROM opportunities WHERE slug = ?`, [job_slug]
        )

        if (checkJob.length === 0) {
            return error(res, "Job not avaiable .", 404)
        }

        await db.execute(
            `DELETE FROM opportunities WHERE slug = ?`, [job_slug]
        )

        return success(res, "Job post removed successfully .", 200)

    } catch (err) {
        return error(res, "Internal server error ", 500)
    }
}

export const updateStudentJobApplication = async(req, res) =>{
    
}