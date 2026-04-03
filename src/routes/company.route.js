import express from "express"
import {
    addCompany,
    approveCompanyRequests,
    getCompanies,
    getCompanyApprovalRequests
} from "../controllers/company.controller.js";


const companyRouter = express.Router();

companyRouter.post("/register_company", addCompany)
companyRouter.post("/get_companyReqs", getCompanyApprovalRequests)

companyRouter.get("/approved_companies", getCompanies)

companyRouter.patch("/update_req_status", approveCompanyRequests)

export default companyRouter