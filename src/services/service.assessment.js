import db from "../config/db.js";


export const checkAttemptLimit = async (user_id) => {
    const [result] = await db.execute(
        `SELECT COUNT(*) as count 
         FROM test_attempts 
         WHERE user_id = ? AND attempt_date = CURRENT_DATE`,
        [user_id]
    );

    return result[0].count;
};

export const getQuestions = async (assessment_ids) => {

    const placeholders = assessment_ids.map(() => '?').join(',');

    const [questions] = await db.execute(
        `SELECT assessment_id, correct_options 
         FROM assessments 
         WHERE assessment_id IN (${placeholders})`,
        assessment_ids.map(Number)
    );

    return questions;
};

export const calculateScore = (questions, assessment_ids, answers) => {

    const answerMap = new Map();
    assessment_ids.forEach((id, index) => {
        answerMap.set(Number(id), answers[index]);
    });

    let score = 0;

    questions.forEach((q) => {

        let correct;

        try {
            correct = typeof q.correct_options === "string"
                ? JSON.parse(q.correct_options)
                : q.correct_options;
        } catch {
            correct = q.correct_options;
        }

        if (!Array.isArray(correct)) {
            correct = [correct];
        }

        correct = correct.map(Number);

        let userAns = answerMap.get(q.assessment_id);
        if (userAns === undefined) return;

        if (!Array.isArray(userAns)) {
            userAns = [userAns];
        }

        userAns = userAns.map(Number);

        const isCorrect =
            userAns.length === correct.length &&
            userAns.every(ans => correct.includes(ans));

        if (isCorrect) score++;
    });

    return score;
};

export const saveAttempt = async (user_id, assessment_id, percentage, status) => {
    await db.execute(
        `INSERT INTO test_attempts 
        (user_id, assessment_id, attempt_date, score, status)
        VALUES (?, ?, CURRENT_DATE, ?, ?)`,
        [user_id, assessment_id, percentage, status]
    );
};

export const handleCertificate = async (user_id, course_id, percentage) => {
  console.log(user_id,course_id, percentage )
    if (percentage < 75) return;

    const [existingCert] = await db.execute(
        `SELECT id FROM certified_students 
         WHERE user_id = ? AND course_id = ?`,
        [user_id, course_id]
    );

    if (existingCert.length > 0) return;

    const [courseResult] = await db.execute(
        `SELECT c.title 
         FROM purchased_courses pc
         JOIN courses c ON pc.course_id = c.id
         WHERE pc.user_id = ? AND pc.course_id = ?`,
        [user_id, course_id]
    );

    const course_name = courseResult.length > 0
        ? courseResult[0].title
        : "Unknown Course";

    const certificate_no = `CERT-${course_id}-${user_id}-${Date.now()}`;

    await db.execute(
        `INSERT INTO certified_students 
        (user_id, course_id, course_name, score, certificate_no)
        VALUES (?, ?, ?, ?, ?)`,
        [user_id, course_id, course_name, percentage, certificate_no]
    );
};