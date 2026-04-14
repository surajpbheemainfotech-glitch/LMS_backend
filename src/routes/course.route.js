import express from "express"

import { verifyToken } from "../middleware/verifyToken.js"
import {
    addCourse,
    getCourses,
    updateCourse,
    deleteCourse,
    getActiveCourses,
    getCoursesByCategorySlug,
    getCourseBySlug,
    enrollStudentInCourse,
    getStudentCourses,
    getCourseProgress,
    completeMaterial,
} from "../controllers/course.controller.js"
import { createImageUpload } from "../middleware/cloud.upload/image.upload.js"

const courseRouter = express.Router()
const courseUpload = createImageUpload("LMS_PROJECT/courses", "course");


courseRouter.post("/add", verifyToken,courseUpload.single("thumbnail"), addCourse)
courseRouter.post("/enroll",verifyToken, enrollStudentInCourse)
courseRouter.post("/:slug/complete_material", verifyToken, completeMaterial)

courseRouter.patch("/update/:slug", verifyToken, updateCourse)  
courseRouter.delete("/delete/:slug", verifyToken, deleteCourse)

courseRouter.get("/get",getCourses)
courseRouter.get("/get/:slug",getCourseBySlug)
courseRouter.get("/courses/:slug", getCoursesByCategorySlug)
courseRouter.get("/active-courses",verifyToken, getActiveCourses)
courseRouter.get("/mycourses/:slug",verifyToken, getStudentCourses)
courseRouter.get("/:slug/progress",verifyToken,  getCourseProgress)

export default courseRouter