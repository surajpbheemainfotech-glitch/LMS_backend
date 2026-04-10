import express from "express"
import {
    addCompany,
    deleteJob,
    getCompanies,
    postJob,
} from "../controllers/company.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { allJobs } from "../controllers/student.controller.js";


const companyRouter = express.Router();


companyRouter.post("/register_company", verifyToken, addCompany)
companyRouter.post("/post_job/:slug", verifyToken,postJob)

companyRouter.get("/approved_companies", getCompanies)
companyRouter.get("/get_jobs/:slug", allJobs)

companyRouter.delete("/remove_post/:slug",deleteJob)

export default companyRouter