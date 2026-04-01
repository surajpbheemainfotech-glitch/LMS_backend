import express from 'express'
import { 
    addCourseMaterial,
     deleteCourseBySlug, 
     getCourseMaterialByCourseSlug, 
     updateCourseMaterialBySlug
     } from '../controllers/course_material.controller.js'
import { verifyToken } from '../middleware/verifyToken.js'
import { createPdfUpload } from '../middleware/cloud.upload/pdf.upload.js';


const materialRouter = express.Router()
const uploadPdf = createPdfUpload("LMS_PROJECT/course_materials", "pdf");

materialRouter.post("/new",verifyToken,uploadPdf.single("pdf"), addCourseMaterial)
materialRouter.get("/:slug",verifyToken, getCourseMaterialByCourseSlug)
materialRouter.patch("/update/:slug",verifyToken,updateCourseMaterialBySlug)
materialRouter.delete("/remove/:slug",verifyToken,deleteCourseBySlug)

export default materialRouter