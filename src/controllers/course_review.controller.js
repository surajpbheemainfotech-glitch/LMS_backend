import db from "../config/db.js"
import { error, success } from "../utils/response.js"

export const addReview = async (req, res) => {
    try {
        const { id } = req.params
        const { rating, review_text } = req.body
        const userId = req.user.id

        if (!id) {
            return error(res, "Select course first.", 400)
        }

        if (!rating || !review_text) {
            return error(res, "Rating and description required.", 400)
        }

        const [course] = await db.execute(
            `SELECT title FROM courses WHERE id = ?`,
            [id]
        )

        if (course.length === 0) {
            return error(res, "Course not available.", 404)
        }

        const [existingReview] = await db.execute(
            `SELECT id FROM course_reviews WHERE course_id = ? AND user_id = ?`,
            [id, userId]
        )

        if (existingReview.length > 0) {
            return error(res, "You have already reviewed this course.", 400)
        }

        const now = new Date()

        await db.execute(
            `INSERT INTO course_reviews 
            (course_id, user_id, rating, review_text, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id, userId, rating, review_text, now, now]
        )

        return success(res, "Review added successfully.", 200)

    } catch (err) {
        return error(res, "Internal server error ", 500)
    }
}

export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params

        if (!id) {
            return error(res, "Review not available", 404)
        }

        const [existingReview] = await db.execute(`
            SELECT rating FROM course_reviews 
            WHERE id = ?`,
            [id]
        )

        if (existingReview.length == 0) {
            return error(res, "Review not available", 404)
        }

        await db.execute(`DELETE FROM course_reviews WHERE id = ?`, [id])

        return success(res, "Review removed successfully .", 200)

    } catch (error) {
        return error(res, "Internal server error ", 500)
    }
}

export const getCourseReviewByCourseId = async (req, res) => {
    try {
        const courseId = req.params.id;

        if (!courseId) {
            return error(res, "Course not available.", 400)
        }

        const [avgResult] = await db.execute(
            `SELECT AVG(rating) AS avgRating 
             FROM course_reviews 
             WHERE course_id = ?`,
            [courseId]
        );

        const [reviews] = await db.execute(
            `SELECT rating, review_text, created_at 
             FROM course_reviews 
             WHERE course_id = ?
             ORDER BY created_at DESC
             LIMIT 5`,
            [courseId]
        );

        if (reviews.length === 0) {
            return error(res, "No reviews found.", 404)
        }

        return success(
            res,
            {
                avgRating: avgResult[0].avgRating || 0,
                totalReviews: reviews.length,
                reviews: reviews
            },
            200)

    } catch (err) {
        return error(res, "Internal server error ", 500)
    }
};