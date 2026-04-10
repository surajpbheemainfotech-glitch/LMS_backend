import db from "../config/db.config.js";
import logger from "../utils/logger.js";
import {
  calculateScore,
  checkAttemptLimit,
  getQuestions,
  handleCertificate,
  saveAttempt
} from "../services/service.assessment.js";
import { error, success } from "../utils/response.js";

export const insertAssesment = async (req, res) => {
  try {

    const { assessment_data } = req.body;
    const course_id = req.params.id;
    const user_id = req.user?.id;

    logger.info({ course_id, user_id }, "Insert assessment request received");

    if (!course_id) {
      logger.warn("Course id missing");
      return error(res, "Select course first", 400);
    }

    if (!Array.isArray(assessment_data) || assessment_data.length === 0) {
      logger.warn("No questions provided");
      return error(res, "No questions provided", 400);
    }

    const assessmentSlug = `assessment_${Date.now()}`;

    const values = assessment_data.map((q) => {

      if (
        !q.question ||
        !Array.isArray(q.options) ||
        !Array.isArray(q.correct_options)
      ) {
        logger.warn("Invalid question format detected");
        throw new Error("Invalid question format");
      }

      return [
        course_id,
        user_id,
        q.question,
        JSON.stringify(q.options),
        JSON.stringify(q.correct_options),
        q.duration_second || 0,
        assessmentSlug
      ];
    });

    const query = `
      INSERT INTO assessments
      (course_id, created_by, question, options, correct_options, duration_seconds, slug)
      VALUES ?
    `;

    const [result] = await db.query(query, [values]);

    logger.info(
      { inserted: result.affectedRows, slug: assessmentSlug },
      "Assessment questions inserted"
    );

    return success(
      res,
      "Questions added successfully",
      { inserted: result.affectedRows, slug: assessmentSlug },
      200
    );

  } catch (err) {
    logger.error(err, "Insert assessment failed");
    return error(res, "Internal Server Error", 500);
  }
};

export const getCourseAssessment = async (req, res) => {

  try {

    const course_slug = req.params.slug;

    logger.info({ course_slug }, "Fetch course assessment");

    if (!course_slug) {
      logger.warn("Course slug missing");
      return error(res, "Select course first", 400);
    }

    const [course] = await db.execute(
      `SELECT id FROM courses WHERE slug = ?`,
      [course_slug]
    );

    if (!course.length) {
      logger.warn({ course_slug }, "Course not found");
      return error(res, "Course not found", 404);
    }

    const course_id = course[0].id;

    const [assessment] = await db.query(
      `
      SELECT id, question, options, duration_seconds, slug
      FROM assessments
      WHERE course_id = ?
      `,
      [course_id]
    );

    const parsed = assessment.map((q) => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    if (parsed.length === 0) {
      logger.warn({ course_id }, "No assessment available");
      return error(res, "Assessment not available", 404);
    }

    logger.info({ course_id, total: parsed.length }, "Assessment fetched");

    return success(res, { assessment: parsed }, 200);

  } catch (err) {
    logger.error(err, "Get course assessment failed");
    return error(res, "Internal server error", 500);
  }
};

export const submitAssesmentTest = async (req, res) => {

  try {

    const { assessment_ids, answers } = req.body;
    const course_slug = req.params.slug;
    const student_id = req.user?.id;

    logger.info({ student_id, course_slug }, "Assessment submission started");

    if (!student_id) {
      logger.warn("Unauthorized assessment attempt");
      return error(res, "Unauthorized.", 400);
    }

    if (!assessment_ids || assessment_ids.length === 0) {
      logger.warn("No questions submitted");
      return error(res, "No questions submitted", 400);
    }

    const attempts = await checkAttemptLimit(student_id);

    if (attempts >= 2) {
      logger.warn({ student_id }, "Attempt limit reached");
      return error(res, "Max 2 attempts per day reached", 403);
    }

    const [existingCourse] = await db.execute(
      `SELECT id FROM courses WHERE slug = ?`,
      [course_slug]
    );

    const course_id = existingCourse[0].id;

    const questions = await getQuestions(assessment_ids);

    if (questions.length === 0) {
      logger.warn("Invalid questions submitted");
      return error(res, "Invalid questions", 404);
    }

    const score = calculateScore(questions, assessment_ids, answers);

    const percentage = Math.round((score / questions.length) * 100);
    const status = percentage >= 75 ? "PASS" : "FAIL";

    await saveAttempt(student_id, assessment_ids[0], percentage, status);

    await handleCertificate(student_id, course_id, percentage);

    logger.info(
      { student_id, percentage, status },
      "Assessment evaluated"
    );

    return success(
      res,
      {
        score: percentage,
        total: questions.length,
        status
      },
      200
    );

  } catch (err) {
    logger.error(err, "Assessment submission failed");
    return error(res, "Internal server error", 500);
  }
};

export const getScoreAndAttempt = async (req, res) => {

  try {

    const studentId = req.user?.id;

    logger.info({ studentId }, "Fetching score and attempts");

    if (!studentId) {
      logger.warn("User not logged in");
      return error(res, "Login please.", 400);
    }

    const [[result]] = await db.execute(
      `
      SELECT 
        COUNT(CASE WHEN attempt_date = CURRENT_DATE THEN 1 END) AS attemptsToday,
        COALESCE(MAX(score), 0) AS maxScore
      FROM test_attempts
      WHERE student_id = ?
      `,
      [studentId]
    );

    const { attemptsToday, maxScore } = result;

    const isBlocked = maxScore >= 75;

    logger.info({ studentId, attemptsToday, maxScore }, "Score fetched");

    return success(
      res,
      isBlocked
        ? "You already scored 75%+. Further attempts are blocked."
        : "You can attempt the test.",
      {
        attempts: attemptsToday,
        maxScore,
        isBlocked
      },
      200
    );

  } catch (err) {
    logger.error(err, "Fetching score failed");
    return error(res, "Internal server error", 500);
  }
};

export const getCertificateByUserId = async (req, res) => {

  const userId = req.params.id;

  try {

    logger.info({ userId }, "Fetching certificate");

    if (!userId) {
      logger.warn("User id missing");
      return error(res, "Unauthorized.", 400);
    }

    const [certificateDetails] = await db.execute(
      `
      SELECT 
        cs.course_name, cs.score, cs.certificate_no, cs.issued_at,
        u.first_name, u.last_name
      FROM certified_students cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.user_id = ?
      `,
      [userId]
    );

    if (certificateDetails.length === 0) {
      logger.warn({ userId }, "Certificate not found");
      return error(res, "No records available.", 404);
    }

    logger.info({ userId }, "Certificate fetched");

    return success(res, { userData: certificateDetails }, 200);

  } catch (err) {
    logger.error(err, "Fetch certificate failed");
    return error(res, "Internal server error", 500);
  }
};