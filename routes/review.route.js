import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import {
    addReview,
    deleteReview,
    getCourseReviewByCourseId
} from '../controllers/course_review.controller.js'

const reviewRouter = express.Router()

reviewRouter.post("/add-review/:id", verifyToken, addReview)
reviewRouter.get("/get-course-review/:id", verifyToken, getCourseReviewByCourseId)
reviewRouter.delete("/delete-review/:id", verifyToken, deleteReview)

export default reviewRouter
