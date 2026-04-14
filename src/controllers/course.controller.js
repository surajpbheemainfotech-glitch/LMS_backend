import db from "../config/db.config.js";
import cloudinary from "../config/cloudinary.config.js";
import { createSlug } from "../services/service.slug.generator.js";
import { error, success } from "../utils/response.js";
import logger from "../utils/logger.js";

const cleanupCloudinary = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`Cloudinary image deleted: ${publicId}`);
    } catch (err) {
      logger.error(`Cloudinary cleanup error: ${err.message}`);
    }
  }
};

export const addCourse = async (req, res) => {
  try {
    logger.info({ body: req.body, user: req.user.id }, "Add course request received");

    const { title, description, short_description, price, level, language, duration, total_lectures, category_id } = req.body;
    const thumbnail = req.file?.path;
    const thumbnail_public_id = req.file?.filename;

    if (!thumbnail) return error(res, "Please select image", 400);
    if (!title || !description || !price || !category_id) {
      await cleanupCloudinary(thumbnail_public_id);
      return error(res, "Required fields missing", 400);
    }

    const [category] = await db.execute("SELECT id FROM categories WHERE id = ? LIMIT 1", [category_id]);
    if (!category.length) {
      await cleanupCloudinary(thumbnail_public_id);
      return error(res, "Category not found", 404);
    }

    const courseSlug = createSlug(title);
    await db.execute(
      `INSERT INTO courses 
        (title, description, short_description, price, thumbnail, thumbnail_public_id,
         level, language, duration, total_lectures, category_id, created_by, slug) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, short_description || null, price, thumbnail, thumbnail_public_id, level || "Beginner", language || "English", duration || null, total_lectures || 0, category_id, req.user.id, courseSlug]
    );

    logger.info({ title, slug: courseSlug }, "Course added successfully");
    return success(res, "Course added successfully", { data: { title, courseSlug, thumbnail, thumbnail_public_id } }, 200);

  } catch (err) {
    logger.error(err, "Add course failed");
    if (req.file?.filename) await cleanupCloudinary(req.file.filename);
    return error(res, "Internal server error", 500);
  }
};

export const getCourses = async (req, res) => {
  try {
    const [courses] = await db.execute(`
      SELECT 
        courses.id, courses.title, courses.description, courses.short_description, courses.price, 
        courses.thumbnail, courses.level, courses.language, courses.duration,
        courses.total_lectures, courses.is_published, courses.slug, categories.name AS category_name,
        courses.created_at
      FROM courses
      JOIN categories ON courses.category_id = categories.id
      ORDER BY courses.created_at DESC
    `);

    logger.info({ count: courses.length }, "Fetched all courses");
    return success(res, { courses }, 200);

  } catch (err) {
    logger.error(err, "Fetching courses failed");
    return error(res, "Internal server error", 500);
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, description, short_description, price, level, language, duration, total_lectures, category_name } = req.body;

    if (!title || !description || !short_description || !price || !level || !language || !duration || !total_lectures || !category_name) {
      return error(res, "All fields are required", 400);
    }

    const [existing] = await db.execute("SELECT id FROM courses WHERE slug = ? LIMIT 1", [slug]);
    if (!existing.length) return error(res, "Course not found", 404);

    const [category] = await db.execute("SELECT id FROM categories WHERE name = ? LIMIT 1", [category_name]);
    if (!category.length) return error(res, "Category not found", 404);

    await db.execute(
      `UPDATE courses SET
        title = ?, description = ?, short_description = ?, price = ?, 
        level = ?, language = ?, duration = ?, total_lectures = ?, category_id = ?
       WHERE slug = ?`,
      [title, description, short_description, price, level, language, duration, total_lectures, category[0].id, slug]
    );

    logger.info({ slug, updatedFields: req.body }, "Course updated successfully");
    return success(res, "Course updated successfully", 200);

  } catch (err) {
    logger.error(err, "Update course failed");
    return error(res, "Internal server error", 500);
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { slug } = req.params;

    const [existing] = await db.execute("SELECT thumbnail_public_id FROM courses WHERE slug = ? LIMIT 1", [slug]);
    if (!existing.length) return error(res, "Course not found", 404);

    await cleanupCloudinary(existing[0].thumbnail_public_id);
    await db.execute("DELETE FROM courses WHERE slug = ?", [slug]);

    logger.info({ slug }, "Course deleted successfully");
    return success(res, "Course deleted successfully", 200);

  } catch (err) {
    logger.error(err, "Delete course failed");
    return error(res, "Internal server error", 500);
  }
};

export const getCoursesByCategorySlug = async (req, res) => {
  try {
    const category_slug = req.params.slug;
    if (!category_slug) return error(res, "Please select category", 400);

    const [category] = await db.execute("SELECT id FROM categories WHERE slug = ? LIMIT 1", [category_slug]);
    if (!category.length) return error(res, "Category not found", 404);

    const [courses] = await db.execute(`
      SELECT c.id, c.title, c.description, c.short_description, c.price,
             c.thumbnail, c.level, c.language, c.slug, c.duration, c.total_lectures, c.category_id,
             cat.name AS category_name, c.is_published, c.created_at, c.updated_at
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.category_id = ?`, [category[0].id]
    );

    if (!courses.length) return error(res, "No courses available for this category", 404);

    logger.info({ category_slug, count: courses.length }, "Fetched courses by category");
    return success(res, { courses });

  } catch (err) {
    logger.error(err, "Fetching courses by category failed");
    return error(res, "Internal server error", 500);
  }
};

export const getActiveCourses = async (req, res) => {
  try {
    const [courses] = await db.execute(`
      SELECT id, title, description, short_description, price, thumbnail, level, language, duration, total_lectures, category_id, created_at, updated_at
      FROM courses
      WHERE is_published = 1
    `);

    if (!courses.length) return error(res, "No active courses available", 404);

    logger.info({ count: courses.length }, "Fetched active courses");
    return success(res, { activeCourses: courses });

  } catch (err) {
    logger.error(err, "Fetching active courses failed");
    return error(res, "Internal server error", 500);
  }
};

export const enrollStudentInCourse = async (req, res) => {
  try {
    const { course_id, amount } = req.body;
    const student_id = req.user.id;

    if (!student_id) return error(res, "Login to enroll course", 400);
    if (!course_id) return error(res, "Please select course", 400);
    if (!amount) return error(res, "Try again later", 400);

    const [course] = await db.execute("SELECT total_lectures FROM courses WHERE id = ? LIMIT 1", [course_id]);
    if (!course.length) return error(res, "Course not found", 404);

    const [existing] = await db.execute("SELECT id FROM student_courses WHERE student_id = ? AND course_id = ?", [student_id, course_id]);
    if (existing.length) return error(res, "Already enrolled in this course", 400);

    await db.execute("INSERT INTO student_courses (student_id, course_id, amount, payment_status, enrolled_at) VALUES (?, ?, ?, ?, ?)",
      [student_id, course_id, amount, "paid", new Date()]
    );

    await db.execute("INSERT INTO course_progress (student_id, course_id, completed_lectures, total_lectures, progress_percentage, last_accessed) VALUES (?, ?, ?, ?, ?, ?)",
      [student_id, course_id, JSON.stringify([]), course[0].total_lectures, 0, new Date()]
    );

    logger.info({ student_id, course_id }, "Student enrolled in course successfully");
    return success(res, "Enrolled successfully", 201);

  } catch (err) {
    logger.error(err, "Enroll student failed");
    return error(res, "Internal server error", 500);
  }
};

export const getStudentCourses = async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug) return error(res, "Please login first", 400);

    const [student] = await db.execute("SELECT id FROM students WHERE slug = ? LIMIT 1", [slug]);
    if (!student.length) return error(res, "Unauthorized", 404);

    const [courses] = await db.execute(`
      SELECT c.* 
      FROM courses c
      JOIN student_courses sc ON sc.course_id = c.id
      WHERE sc.student_id = ?`, [student[0].id]
    );

    if (!courses.length) return error(res, "No course enrolled by user", 404);

    logger.info({ student_slug: slug, count: courses.length }, "Fetched student courses");
    return success(res, { courses }, 200);

  } catch (err) {
    logger.error(err, "Fetching student courses failed");
    return error(res, "Internal server error", 500);
  }
};

export const getCourseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return error(res, "Selected course is not available", 400);

    const [course] = await db.execute(`
      SELECT c.id, c.title, c.description, c.short_description, c.price, c.thumbnail, c.level, c.language, c.duration, c.total_lectures, c.slug,
             cat.name AS category_name,
             GROUP_CONCAT(cm.title ORDER BY cm.created_at ASC) AS material_titles
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN course_materials cm ON cm.course_id = c.id
      WHERE c.slug = ?
      GROUP BY c.id
    `, [slug]);

    if (!course.length) return error(res, "Course not found", 404);

    const [avgResult] = await db.execute("SELECT AVG(rating) AS avgRating FROM course_reviews WHERE course_id = ?", [course[0].id]);
    const [reviews] = await db.execute("SELECT rating, review_text, created_at FROM course_reviews WHERE course_id = ? ORDER BY created_at DESC LIMIT 5", [course[0].id]);

    logger.info({ slug }, "Fetched course details");
    return success(res, "Course fetched successfully", {
      course: course[0],
      avgRating: avgResult[0]?.avgRating || 0,
      totalReviews: reviews.length,
      reviews
    }, 200);

  } catch (err) {
    logger.error(err, "Fetching course by slug failed");
    return error(res, "Internal server error", 500);
  }
};

export const completeMaterial = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { material_id } = req.body;

    if (!material_id) return error(res, "Material id required", 400);

    await db.execute(
      `INSERT INTO lecture_completions (student_id, material_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE completed_at = NOW()`,
      [studentId, material_id]
    );

    return success(res, "Material marked completed");

  } catch (err) {
    return error(res, "Server error", 500);
  }
};

export const getCourseProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { slug } = req.params;

    const [course] = await db.execute(
      "SELECT id, total_lectures FROM courses WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (!course.length) return error(res, "Course not found", 404);

    const course_id = course[0].id;
    const totalLectures = course[0].total_lectures;

    const [completed] = await db.execute(
      `SELECT lc.material_id
       FROM lecture_completions lc
       JOIN course_materials cm ON cm.id = lc.material_id
       WHERE lc.student_id = ? AND cm.course_id = ?`,
      [studentId, course_id]
    );

    const completedIds = completed.map(item => item.material_id);
    const completedCount = completedIds.length;

    const progress =
      totalLectures === 0
        ? 0
        : ((completedCount / totalLectures) * 100).toFixed(2);

    return success(res, "Course progress", {
      completed: completedCount,
      total: totalLectures,
      progress,
      completed_material_ids: completedIds
    });

  } catch (err) {
    return error(res, "Server error", 500);
  }
};