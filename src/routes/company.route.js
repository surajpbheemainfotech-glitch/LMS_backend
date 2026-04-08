import express from "express"
import {
    addCompany,
    approveCompanyRequests,
    getCompanies,
    getCompanyApprovalRequests,
    getJobs,
    postJob,
    updateJobDetails
} from "../controllers/company.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";


const companyRouter = express.Router();


companyRouter.post("/register_company", verifyToken, addCompany)
companyRouter.post("/get_companyReqs",verifyToken, getCompanyApprovalRequests)
companyRouter.post("/post_job/:slug", verifyToken,postJob)

companyRouter.get("/approved_companies", getCompanies)
companyRouter.get("/get_jobs/:slug", getJobs)

companyRouter.patch("/update_req_status", approveCompanyRequests)

companyRouter.delete("/remove_post/:slug",updateJobDetails)

export default companyRouter