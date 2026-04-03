import db from '../config/db.js'
import { createSlug } from '../services/service.slug.generator.js'

export const addCompany = async (req, res) => {

    const { company_name, industry, email, phone, location } = req.body

    if (!company_name || !industry || email || phone || location) {

        return res.status(400).json({
            success: false,
            message: "All fields are required ."
        })
    }

    try {
        const [existingComapany] = await db.execute(
            `SELECT * FROM companies WHERE company_name = ? `,
            [company_name]
        )

        if (existingComapany.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Company already registered ."
            })
        }

        const companySlug = createSlug(company_name)

        const [newCompany] = await db.execute(
            `INSERT INTO companies (company_name, slug, industry, email, phone, location) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [company_name, companySlug, industry, email, phone, location]
        )

        const companyDetails = newCompany[0]

        await db.execute(
            `INSERT INTO company_approvals (company_id) VALUES (?)`,
            [companyDetails.id]
        )

        return res.status(201).json({
            success: true,
            message: "Request received for approval ."
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}

export const getCompanies = async (req, res) => {

    const user = req.user.id

    if (!user) {
        return res.status(402).json({
            success: false,
            message: "Unauthorized ."
        })
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

        return res.status(200).json({
            success: true,
            comapnies: companies
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}

export const getCompanyApprovalRequests = async (req, res) => {
    try {

        const adminId = req.user.id

        if (!adminId) {
            return res.status(404).json({
                success: false,
                message: "Unauhtorized ."
            })
        }

        const [requests] = await db.execute(`
            SELECT 
             cp.company_id,
             c.company_name, c.industry, c.email,
             c.phone, c.location, c.created_at
            FROM company_approval cp
            JOIN companies c ON cp.company_id = c.company_id
            `);

        return res.status(200).json({
            success: true,
            requests: requests
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}

export const approveCompanyRequests = async (req, res) => {

    const { approval_status, remarks, company_id } = req.body

    if (!approval_status || !remarks || company_id) {
        return res.status(400).json({
            success: false,
            message: "All fields are required ."
        })
    }
    try {

        const adminId = req.user.id

        if (!adminId) {
            return res.status(402).json({
                success: false,
                message: "Unauthorized ."
            })
        }

        await db.execute(
            `UPDATE company_approvals
        SET approval_status = ?, approved_by = ?, approved_date = ?, remarks = ?
        WHERE company_id = ?`,
            [approval_status, adminId, new Date(), remarks, company_id]
        )

        return res.status(200).json({
            success: true,
            message: "Status updated successfully ."
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}