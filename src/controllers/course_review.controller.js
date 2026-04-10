import db from "../config/db.config.js";
import logger from "../utils/logger.js";
import { error, success } from "../utils/response.js";

export const addReview = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { rating, review_text } = req.body;
    const userId = req.user.id;

    if (!courseId) {
      logger.warn({ userId }, "Attempt to add review without courseId");
      return error(res, "Select course first.", 400);
    }

    if (!rating || !review_text) {
      return error(res, "Rating and description required.", 400);
    }

    const [course] = await db.execute(
      `SELECT title FROM courses WHERE id = ?`,
      [courseId]
    );

    if (course.length === 0) {
      return error(res, "Course not available.", 404);
    }

    const [existingReview] = await db.execute(
      `SELECT id FROM course_reviews WHERE course_id = ? AND user_id = ?`,
      [courseId, userId]
    );

    if (existingReview.length > 0) {
      return error(res, "You have already reviewed this course.", 400);
    }

    const now = new Date();

    await db.execute(
      `INSERT INTO course_reviews 
       (course_id, user_id, rating, review_text, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, userId, rating, review_text, now, now]
    );

    logger.info({ userId, courseId, rating }, "Review added successfully");
    return success(res, "Review added successfully.", 200);

  } catch (err) {
    logger.error(err, "Add review failed");
    return error(res, "Internal server error", 500);
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id: reviewId } = req.params;

    if (!reviewId) {
      return error(res, "Review not available.", 404);
    }

    const [existingReview] = await db.execute(
      `SELECT id, rating FROM course_reviews WHERE id = ?`,
      [reviewId]
    );

    if (existingReview.length === 0) {
      return error(res, "Review not available.", 404);
    }

    await db.execute(`DELETE FROM course_reviews WHERE id = ?`, [reviewId]);

    logger.info({ reviewId }, "Review deleted successfully");
    return success(res, "Review removed successfully.", 200);

  } catch (err) {
    logger.error(err, "Delete review failed");
    return error(res, "Internal server error", 500);
  }
};

export const getCourseReviewByCourseId = async (req, res) => {
  try {
    const { id: courseId } = req.params;

    if (!courseId) {
      return error(res, "Course not available.", 400);
    }

    const [avgResult] = await db.execute(
      `SELECT AVG(rating) AS avgRating, COUNT(*) AS totalReviews 
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
      return error(res, "No reviews found.", 404);
    }

    logger.info({ courseId, totalReviews: avgResult[0].totalReviews }, "Fetched course reviews");
    return success(res, {
      avgRating: parseFloat(avgResult[0].avgRating) || 0,
      totalReviews: avgResult[0].totalReviews || 0,
      reviews
    }, 200);

  } catch (err) {
    logger.error(err, "Fetch course reviews failed");
    return error(res, "Internal server error", 500);
  }
};