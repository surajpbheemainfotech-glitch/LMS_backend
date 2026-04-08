import db from "../config/db.js";
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

        if (!course_id) {
            return error(res, "Select course first", 400)
        }

        if (!assessment_data || assessment_data.length === 0) {
            return error(res, "No questions provided", 400)
        }

        const randomNumber = Math.floor(Math.random() * 100) + 1;
        const assessmentSlug = `assessment_${randomNumber}`

        const values = assessment_data.map(q => [
            course_id,
            req.user.id,
            q.question,
            JSON.stringify(q.options),
            JSON.stringify(q.correct_options),
            q.duration_second,
            assessmentSlug
        ]);

        const query = `
        INSERT INTO assessments 
        (course_id, created_by, question, options, correct_options, duration_seconds, slug)
        VALUES ?
    `;

        const result = await db.query(query, [values], (err, result) => {
            if (err) {
                console.error(err);
                return error(res, "DB Error", 500)
            }
        });

        return success(res, "Questions added successfully", { inserted: result.affectedRows }, 200)
    } catch (error) {
        return error(res, "Internal server Error", 500)
    }
}

export const getCourseAssessment = async (req, res) => {

    try {
        const course_slug = req.params.slug

        if (!course_slug) {
            return error(res, "Select course first", 400)
        }

        const [course] = await db.execute(
            `SELECT id FROM courses WHERE slug = ?`, [course_slug]
        )

        let assessment

        const query = `
        SELECT id, question, options, duration_seconds, slug
        FROM assessments
        WHERE course_id = ?
    `;

        assessment = await db.query(query, [course[0].id], (err, results) => {
            if (err) {
                return res.status(500).json({ message: "DB Error" });
            }
            assessment = results.map(q => ({
                ...q,
                options: JSON.parse(q.options)
            }));
        });

        if (!assessment.length === 0) {
            return error(res, "Assestement not avaiable .", 404)
        }

        return success(res, { assessment: assessment }, 200)

    } catch (error) {
        return error(res, "Internal server error .", 500)
    }
}

export const submitAssesmentTest = async (req, res) => {
    try {
        const { assessment_ids, answers } = req.body;
        const course_slug = req.params.slug
        const student_id = req.user?.id;

        if (!student_id) {
            return error(res, "Unauthorized.", 400)
        }

        if (!assessment_ids || assessment_ids.length === 0) {
            return error(res, "No questions submitted", 400)
        }

        const attempts = await checkAttemptLimit(student_id);

        if (attempts >= 2) {
            return error(res, "Max 2 attempts per day reached", 403)
        }

        const [existingCourse] = await db.execute(
            `SELECT id FROM courses WHERE slug = ?`, [course_slug]
        )

        const course_id = existingCourse[0].id
        const questions = await getQuestions(assessment_ids);

        if (questions.length === 0) {
            return error(res, "Invalid questions", 404)
        }

        const score = calculateScore(questions, assessment_ids, answers);

        const percentage = Math.round((score / questions.length) * 100);
        const status = percentage >= 75 ? "PASS" : "FAIL";


        await saveAttempt(student_id, assessment_ids[0], percentage, status);

        await handleCertificate(student_id, course_id, percentage);

        return success(
            res,
            {
                score: percentage,
                total: questions.length,
                status
            }, 200)

    } catch (err) {
        return error(res, "Internal server error .", 500)
    }
};

export const getScoreAndAttempt = async (req, res) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
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
    console.error(err);
    return error(res, "Internal server error", 500);
  }
};

export const getCertificateByUserId = async (req, res) => {

    const userId = req.params.id || 12

    if (!userId) {
        return error( res, "Unauthorized.", 400 );
    }

    try {

        const [certificateDetails] = await db.execute(
            `SELECT 
               cs.course_name, cs.score, cs.certificate_no, cs.issued_at,
               u.first_name, u.last_name
             FROM certified_students cs
             JOIN users u ON cs.user_id = u.id
             WHERE cs.user_id = ?`,
            [userId]
        );

        if (certificateDetails.length === 0) {
            return error(res, "No records are avaible .", 404 )
        };

        return success(res, {userData: certificateDetails}, 200)

    } catch (err) {
        return error(res, "Internal server error .", 500)
    }
}