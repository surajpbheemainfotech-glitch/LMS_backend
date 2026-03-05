import express from "express"

import { verifyToken } from "../middleware/verifyToken.js"
import { upload } from "../middleware/upload.js"

import {
    addCourse,
    getCourses,
    updateCourse,
    deleteCourse,
    getCoursesByCategoryId,
    getActiveCourses
} from "../controllers/course.controller.js"

const courseRouter = express.Router()


courseRouter.post("/add", verifyToken,upload.single("thumbnail"), addCourse)
courseRouter.get("/get",  getCourses)
courseRouter.patch("/update/:id", verifyToken, updateCourse)
courseRouter.delete("/delete/:id", verifyToken, deleteCourse)
courseRouter.get("/courses/:id",getCoursesByCategoryId)
courseRouter.get("/active-courses",getActiveCourses)

export default courseRouter