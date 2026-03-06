import express from "express"

import { verifyToken } from "../middleware/verifyToken.js"
import { upload } from "../middleware/upload.js"

import {
    addCourse,
    getCourses,
    updateCourse,
    deleteCourse,
    getCoursesByCategoryId,
    getActiveCourses,
    enrollCourse,
    getCoursesByUserId
} from "../controllers/course.controller.js"

const courseRouter = express.Router()


courseRouter.post("/add", verifyToken,upload.single("thumbnail"), addCourse)
courseRouter.post("/enroll",enrollCourse)

courseRouter.patch("/update/:id", verifyToken, updateCourse)
courseRouter.delete("/delete/:id", verifyToken, deleteCourse)


courseRouter.get("/get",getCourses)
courseRouter.get("/courses/:id",verifyToken, getCoursesByCategoryId)
courseRouter.get("/active-courses",verifyToken, getActiveCourses)
courseRouter.get("/mycourses/:id",verifyToken, getCoursesByUserId)

export default courseRouter