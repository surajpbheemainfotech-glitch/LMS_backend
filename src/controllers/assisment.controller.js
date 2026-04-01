import db from "../config/db.js";
import {
    calculateScore,
    checkAttemptLimit,
    getQuestions,
    handleCertificate,
    saveAttempt
} from "../services/service.assessment.js";

export const insertAssesment = async (req, res) => {
    try {

        const { assessment_data } = req.body;
        const course_id = req.params.id;

        if (!course_id) {
            return res.status(400).json({
                success: false,
                message: "Select course first"
            });
        }

        if (!assessment_data || assessment_data.length === 0) {
            return res.status(400).json({ message: "No questions provided" });
        }

        const values = assessment_data.map(q => [
            course_id,
            req.user.id,
            q.question,
            JSON.stringify(q.options),
            JSON.stringify(q.correct_options)
        ]);

        const query = `
        INSERT INTO assessments 
        (course_id, user_id, question, options, correct_options)
        VALUES ?
    `;

        const result = await db.query(query, [values], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    success: false,
                    message: "DB Error"
                });
            }
        });

        return res.json({
            success: true,
            message: "Questions added successfully",
            inserted: result.affectedRows
        });

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}

export const getCourseAssessment = async (req, res) => {

    try {
        const course_slug = req.params.slug

        if (!course_slug) {
            return res.status(400).json({
                success: false,
                message: "Select course first"
            });
        }

        const [course] = await db.execute(
            `SELECT id FROM courses slug = ?`,[course_slug]
        )

        let assessment

        const query = `
        SELECT assessment_id, question, options, duration_seconds
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
            return res.status(404).json({
                success: false,
                message: "Assestement not avaiable ."
            })
        }

        return res.status(200).json({
            success: true,
            assessment: assessment
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}

export const submitAssesmentTest = async (req, res) => {
    try {
        const { assessment_ids, answers } = req.body;
        const course_id = req.params.id
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(400).json({ success: false, message: "Unauthorized." });
        }

        if (!assessment_ids || assessment_ids.length === 0) {
            return res.status(400).json({ success: false, message: "No questions submitted" });
        }

        const attempts = await checkAttemptLimit(user_id);

        if (attempts >= 2) {
            return res.status(403).json({
                success: false,
                message: "Max 2 attempts per day reached"
            });
        }

        const questions = await getQuestions(assessment_ids);

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Invalid questions"
            });
        }

        const score = calculateScore(questions, assessment_ids, answers);

        const percentage = Math.round((score / questions.length) * 100);
        const status = percentage >= 75 ? "PASS" : "FAIL";


        await saveAttempt(user_id, assessment_ids[0], percentage, status);

        await handleCertificate(user_id, course_id, percentage);

        return res.status(200).json({
            success: true,
            score: percentage,
            total: questions.length,
            status
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

export const getScoreAndAttemp = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Login please."
            });
        }

        const [countResult] = await db.execute(
            `SELECT COUNT(*) as count 
             FROM test_attempts 
             WHERE user_id = ? AND attempt_date = CURRENT_DATE`,
            [userId]
        );

        const attemptsToday = countResult[0].count;

        const [highScoreResult] = await db.execute(
            `SELECT MAX(score) as maxScore 
             FROM test_attempts 
             WHERE user_id = ?`,
            [userId]
        );

        const maxScore = highScoreResult[0].maxScore || 0;

        const isBlocked = maxScore >= 75;

        return res.status(200).json({
            success: true,
            attempts: attemptsToday,
            maxScore,
            isBlocked,
            message: isBlocked
                ? "You already scored 75%+. Further attempts are blocked."
                : "You can attempt the test."
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

export const getCertificateByUserId = async (req, res) => {

    const userId = req.params.id || 12

    if (!userId) {
        return res.status(400).json({ success: false, message: "Unauthorized." });
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
            return res.status(404).json({
                success: false,
                message: "No records are avaible ."
            })
        };

        return res.status(200).json({
            success: true,
            userData: certificateDetails
        })


    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error ."
        })
    }
}