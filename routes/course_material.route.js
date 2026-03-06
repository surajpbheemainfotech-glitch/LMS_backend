import express from 'express'
import { 
    addCourseMaterial,
     deleteCourseById, 
     getCourseMaterialBy, 
     updateCourseMaterialById
     } from '../controllers/course_material.controller.js'
import { verifyToken } from '../middleware/verifyToken.js'
import { upload } from '../middleware/upload.js'

const materialRouter = express.Router()

materialRouter.post("/new",verifyToken,upload.single("file"), addCourseMaterial)
materialRouter.get("/:id",verifyToken, getCourseMaterialBy)
materialRouter.patch("/update/:id",verifyToken,updateCourseMaterialById)
materialRouter.delete("/remove/:id",verifyToken,deleteCourseById)

export default materialRouter