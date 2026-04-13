import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import { createPdfUpload } from '../middleware/cloud.upload/pdf.upload.js'
import {
    allJobs,
    applyForJob,
    getAllStudents,
    getStudentBySlug,
    updateStudentProfileBySlug
} from '../controllers/student.controller.js'

const studentRouter = express.Router()

const uploadPdf = createPdfUpload("LMS_PROJECT/user-resumes", "pdf");
const jobupdateUpload = createPdfUpload("LMS_PROJECT/job_resumes", "job");


studentRouter.post("/apply_job/:slug", verifyToken,jobupdateUpload.single("resume"), applyForJob)

studentRouter.patch("/update-student-profile/:slug", verifyToken, uploadPdf.single("pdf"), updateStudentProfileBySlug)

studentRouter.get("/all-students", getAllStudents)
studentRouter.get("/student-profile/:slug", verifyToken,getStudentBySlug)
studentRouter.get("/get_hiring", allJobs)

export default studentRouter

