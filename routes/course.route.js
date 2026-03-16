import express from "express"

import { verifyToken } from "../middleware/verifyToken.js"
import {
    addCourse,
    getCourses,
    updateCourse,
    deleteCourse,
    getCoursesByCategoryId,
    getActiveCourses,
    enrollCourse,
    getCoursesByUserId,
    getCourseById,
    updateCourseProgress
} from "../controllers/course.controller.js"
import { createImageUpload } from "../middleware/cloud.upload/image.upload.js"

const courseRouter = express.Router()
const courseUpload = createImageUpload("LMS_PROJECT/courses", "course");


courseRouter.post("/add", verifyToken,courseUpload.single("thumbnail"), addCourse)
courseRouter.post("/enroll",enrollCourse)

courseRouter.patch("/update/:id", verifyToken, updateCourse)
courseRouter.patch("/update-course-progress/:id", verifyToken, updateCourseProgress)
courseRouter.delete("/delete/:id", verifyToken, deleteCourse)


courseRouter.get("/get",getCourses)
courseRouter.get("/get/:id",getCourseById)
courseRouter.get("/courses/:id", getCoursesByCategoryId)
courseRouter.get("/active-courses",verifyToken, getActiveCourses)
courseRouter.get("/mycourses/:id",verifyToken, getCoursesByUserId)

export default courseRouter