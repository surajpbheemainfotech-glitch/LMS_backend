import db from "../config/db"

export const addReview = async (req, res) => {
    try {
        const { id } = req.params
        const { rating, review_text } = req.body
        const userId = req.user.id

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Select course first."
            })
        }

        if (!rating || !review_text) {
            return res.status(400).json({
                success: false,
                message: "Rating and description required."
            })
        }

        const [course] = await db.execute(
            `SELECT name FROM courses WHERE id = ?`,
            [id]
        )

        if (course.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Course not available."
            })
        }

        const [existingReview] = await db.execute(
            `SELECT id FROM course_reviews WHERE course_id = ? AND user_id = ?`,
            [id, userId]
        )

        if (existingReview.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this course."
            })
        }

        const now = new Date()

        await db.execute(
            `INSERT INTO course_reviews 
            (course_id, user_id, rating, review_text, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id, userId, rating, review_text, now, now]
        )

        return res.status(201).json({
            success: true,
            message: "Review added successfully."
        })

    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,
            message: "Server error."
        })
    }
}

export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(404).json({
                success: false,
                message: "Review not available"
            })
        }

        const [existingReview] = await db.execute(`
            SELECT rating FROM course_reviews 
            WHERE id = ?`,
            [id]
        )

        if (existingReview.length == 0) {
            return res.status(404).json({
                success: false,
                message: "Review not available"
            })
        }

        await db.execute(`DELETE FROM course_reviews WHERE id = ?`, [id])

        return res.status(200).json({
            success: true,
            message: "REview removed successfully ."
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}

// export const getCourseReviewByCourseId = async(req,res) =>{
//     try {
        
//     } catch (error) {
        
//     }
// }