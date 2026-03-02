import express from "express"
import {
    addCourse,
    getCourses,
    updateCourse,
    deleteCourse
} from "../controllers/course.controller.js"
import { verifyToken } from "../middleware/verifyToken.js"
import { upload } from "../middleware/upload.js"
const courseRouter = express.Router()


courseRouter.post("/add", verifyToken,upload.single("thumbnail"), addCourse)
courseRouter.get("/get",  getCourses)
courseRouter.patch("/update/:id", verifyToken, updateCourse)
courseRouter.delete("/delete/:id", verifyToken, deleteCourse)

export default courseRouter