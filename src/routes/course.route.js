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
    updateStudentCourseProgress,
    getStudentCourses,
    getCourseProgressByCourseSlug
} from "../controllers/course.controller.js"
import { createImageUpload } from "../middleware/cloud.upload/image.upload.js"

const courseRouter = express.Router()
const courseUpload = createImageUpload("LMS_PROJECT/courses", "course");


courseRouter.post("/add", verifyToken,courseUpload.single("thumbnail"), addCourse)
courseRouter.post("/enroll",verifyToken, enrollStudentInCourse)

courseRouter.patch("/update/:slug", verifyToken, updateCourse)
courseRouter.patch("/update-course-progress/:slug", verifyToken, updateStudentCourseProgress)
courseRouter.delete("/delete/:slug", verifyToken, deleteCourse)


courseRouter.get("/get",getCourses)
courseRouter.get("/get/:slug",getCourseBySlug)
courseRouter.get("/courses/:slug", getCoursesByCategorySlug)
courseRouter.get("/active-courses",verifyToken, getActiveCourses)
courseRouter.get("/mycourses/:slug",verifyToken, getStudentCourses)
courseRouter.get("/check-course-progress/:slug",  getCourseProgressByCourseSlug)

export default courseRouter