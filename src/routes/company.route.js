import express from "express"
import {
    addCompany,
    applyForJob,
    approveCompanyRequests,
    getCompanies,
    getCompanyApprovalRequests,
    getJobs,
    postJob,
    showJobs,
    updateJobDetails
} from "../controllers/company.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { createPdfUpload } from "../middleware/cloud.upload/pdf.upload.js";


const companyRouter = express.Router();
const jobupdateUpload = createPdfUpload("LMS_PROJECT/job_resumes", "job");

companyRouter.post("/register_company", verifyToken, addCompany)
companyRouter.post("/get_companyReqs",verifyToken, getCompanyApprovalRequests)
companyRouter.post("/post_job/:slug", verifyToken,postJob)
companyRouter.post("/apply_job/:slug", verifyToken,jobupdateUpload.single("resume"), applyForJob)

companyRouter.get("/approved_companies", getCompanies)
companyRouter.get("/get_jobs/:slug", getJobs)
companyRouter.get("/get_hiring", showJobs)

companyRouter.patch("/update_req_status", approveCompanyRequests)

companyRouter.delete("/remove_post/:slug",updateJobDetails)

export default companyRouter