import express from 'express'
import { 
    addCourseMaterial,
     deleteCourseById, 
     getCourseMaterialByCourseId, 
     updateCourseMaterialById
     } from '../controllers/course_material.controller.js'
import { verifyToken } from '../middleware/verifyToken.js'
import { createPdfUpload } from '../middleware/cloud.upload/pdf.upload.js';


const materialRouter = express.Router()
const uploadPdf = createPdfUpload("LMS_PROJECT/course_materials", "pdf");

materialRouter.post("/new",verifyToken,uploadPdf.single("pdf"), addCourseMaterial)
materialRouter.get("/:id",verifyToken, getCourseMaterialByCourseId)
materialRouter.patch("/update/:id",verifyToken,updateCourseMaterialById)
materialRouter.delete("/remove/:id",verifyToken,deleteCourseById)

export default materialRouter