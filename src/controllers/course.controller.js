import db from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";
import { createSlug } from "../services/service.slug.generator.js";
import { error, success } from "../utils/response.js";

export const addCourse = async (req, res) => {
  try {
    const {
      title, description, short_description, price,
      level, language, duration, total_lectures, category_id,
    } = req.body;

    const thumbnail = req.file?.path || null;
    const thumbnail_public_id = req.file?.filename || null;

    if (!thumbnail) {
      return error(res, "Please select image", 400)
    }

    if (!title || !description || !price || !category_id) {
      if (thumbnail_public_id) {
        await cloudinary.uploader.destroy(thumbnail_public_id);
      }

      return error(res, "Required fields missing", 400)
    }

    const [category] = await db.execute(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [category_id]
    );

    if (category.length === 0) {
      if (thumbnail_public_id) {
        await cloudinary.uploader.destroy(thumbnail_public_id);
      }

      return error(res, "Category not found", 404)

    }

    const courseSlug = createSlug(title)
    await db.execute(
      `INSERT INTO courses 
      (title, description, short_description, price, thumbnail, thumbnail_public_id,
       level, language, duration, total_lectures, category_id, created_by, slug) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description, short_description || null, price, thumbnail,
        thumbnail_public_id, level || "Beginner", language || "English", duration || null,
        total_lectures || 0, category_id, req.user.id, courseSlug
      ]
    );

    return success(
      res,
      "Course added successfully",
      {
        data: {
          title,
          courseSlug,
          thumbnail,
          thumbnail_public_id,
        }
      }, 200)

  } catch (err) {
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (destroyError) {
        console.error("Cloudinary cleanup error:", destroyError.message);
      }
    }

    console.error("Add Course Error:", error);
    return error(res, "Internal server error ", 500)
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

    return success(res, { courses: courses }, 200)

  } catch (err) {
    return error(res, "Internla server error", 500)
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { slug } = req.params;

    const {
      title, description, short_description, price, level,
      language, duration, total_lectures, category_name,
    } = req.body;

    if (
      !title || !description || !short_description || !price || !level || !language ||
      !duration || !total_lectures || !category_name) {

      return error(res, "All fields are required", 400)
    }

    const [existing] = await db.execute(
      "SELECT id FROM courses WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (existing.length === 0) {
      return error(res, "Course not found", 404)
    }

    const [category] = await db.execute(
      "SELECT id FROM categories WHERE name = ? LIMIT 1",
      [category_name]
    );

    if (category.length === 0) {
      return error(res, "Category not found", 404)
    }

    await db.execute(
      `UPDATE courses SET
        title = ?,description = ?,short_description = ?, price = ?, 
        level = ?, language = ?, duration = ?, total_lectures = ?, category_id = ?
      WHERE slug = ?`,
      [
        title, description, short_description, price, level,
        language, duration, total_lectures, category[0].id, slug,
      ]
    );

    return success(res, "Course updated successfully", 200)

  } catch (err) {
    return error(res, "Internal server error ", 500)
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { slug } = req.params;

    const [existing] = await db.execute(
      "SELECT thumbnail_public_id FROM courses WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (existing.length === 0) {
      return error(res, "Course not found", 404)
    }

    const thumbnailPublicId = existing[0].thumbnail_public_id;

    if (thumbnailPublicId) {
      const cloudinaryResult = await cloudinary.uploader.destroy(thumbnailPublicId);
      console.log("Cloudinary delete result:", cloudinaryResult);
    }

    await db.execute("DELETE FROM courses WHERE slug = ?", [slug]);

    return success(res, "Course deleted successfully", 200)

  } catch (err) {
    return error(res, "Internal server error ", 500)
  }
};

export const getCoursesByCategorySlug = async (req, res) => {

  try {
    const category_slug = req.params.slug;


    if (!category_slug) {
      return error(res, "Please select category", 400)
    }

    const [checkCategory] = await db.execute(
      `SELECT id FROM categories WHERE slug = ?`, [slug]
    )

    if (checkCategory.length === 0) {
      return error(res, "Category was present .", 404)
    }

    const category_id = checkCategory[0].id

    const [courseRows] = await db.execute(
      `SELECT 
    c.id, c.title, c.description, c.short_description,c.price,
    c.thumbnail, c.level, c.language, c.duration,c.total_lectures,c.category_id,
    cat.name AS category_name,
    c.is_published, c.created_at, c.updated_at
  FROM courses c
  JOIN categories cat ON c.category_id = cat.id
  WHERE c.category_id = ?`,
      [category_id]
    );

    if (courseRows.length == 0) {
      return error(res, "No courses are available for this category", 404)
    }

    const courses = courseRows;

    return success(res, { courses: courses })

  } catch (err) {
    return error(res, "Internal server error !", 500)
  }

};

export const getActiveCourses = async (req, res) => {
  try {

    const [courseRows] = await db.execute(
      `SELECT 
    id,title,description,short_description,
    price,thumbnail,level,language, duration,
    total_lectures,category_id,created_at,updated_at
    FROM courses
    WHERE is_published = ?
  `, [1]
    );

    if (courseRows.length === 0) {
      return error(res, "No active course are avaiable .", 404)
    }

    const activeCourses = courseRows;
    return success(res, { activeCourses: activeCourses })

  } catch (err) {
    return error(res, "Internal server error !", 500)
  }
};

export const enrollStudentInCourse = async (req, res) => {
  try {
    const { course_id, amount } = req.body;
    const student_id = req.user.id;

    if (!student_id) {
      return error(res, "Login to enroll course.", 400)
    }

    if (!course_id) {
      return error(res, "Please select course.", 400)
    }

    if (!amount) {
      return error(res, "Try again later.", 400)
    }


    const [courseLectures] = await db.execute(
      `SELECT total_lectures FROM courses WHERE id = ?`,
      [course_id]
    );

    if (courseLectures.length === 0) {
      return error(res, "Course not found.", 404)
    }

    const [existingCourse] = await db.execute(
      `SELECT id FROM student_courses WHERE student_id = ?`, [student_id]
    )

    if (existingCourse.length > 0) {
      return error(res, "Already course alloted .", 400)
    }

    await db.execute(
      `INSERT INTO student_courses 
       (student_id, course_id, amount, payment_status, enrolled_at)
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, course_id, amount, "paid", new Date(),]
    );

    await db.execute(
      `INSERT INTO course_progress 
       (student_id, course_id, completed_lectures, total_lectures, progress_percentage, last_accessed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        course_id,
        JSON.stringify([]),
        courseLectures[0].total_lectures,
        0,
        new Date()
      ]
    );

    return success(res, "Enrolled Successfully.", 201)

  } catch (err) {
    return error(res, "Internal server error", 500)
  }
};

export const getStudentCourses = async (req, res) => {
  try {
    const slug = req.params.slug;

    if (!slug) {
      return error(res, "Please login first.", 400);
    }

    const [checkStudent] = await db.execute(
      `SELECT id FROM students WHERE slug = ?`, [slug]
    );

    if (checkStudent.length === 0) {
      return error(res, "Unauthorized", 404);
    }

    const studentId = checkStudent[0].id;

    const [courses] = await db.execute(
      `SELECT c.*
       FROM courses c
       JOIN student_courses sc 
       ON sc.course_id = c.id
       WHERE sc.student_id = ?`,
      [studentId]
    );

    if (courses.length === 0) {
      return error(res, "No course enrolled by user.", 404);
    }

    return success(res, { courses }, 200);

  } catch (err) {
    console.log(err);
    return error(res, "Internal server error.", 500);
  }
};

export const getCourseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return error(res, "Selected course is not available.", 400);
    }

    const [course] = await db.execute(`
     SELECT 
       c.id, c.title, c.description, c.short_description,
       c.price, c.thumbnail, c.level, c.language, c.duration, c.total_lectures, c.slug,
       cat.name AS category_name,
       GROUP_CONCAT(cm.title) AS material_titles
     FROM courses c
     JOIN categories cat ON c.category_id = cat.id
     LEFT JOIN course_materials cm ON cm.course_id = c.id
     WHERE c.slug = ?
     GROUP BY c.id
    `, [slug]);

    if (course.length === 0) {
      return error(res, "Course not found", 404);
    }

    const [avgResult] = await db.execute(
      `SELECT AVG(rating) AS avgRating 
       FROM course_reviews 
       WHERE course_id = ?`,
      [course[0].id]
    );

    const [reviews] = await db.execute(
      `SELECT rating, review_text, created_at 
       FROM course_reviews 
       WHERE course_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [course[0].id]
    );

    return success(res, "Course fetched successfully", {
      course: course[0],
      avgRating: avgResult[0]?.avgRating || 0,
      totalReviews: reviews.length,
      reviews
    }, 200);

  } catch (err) {
    console.log("error", err);
    return error(res, "Internal server error.", 500);
  }
};

export const updateStudentCourseProgress = async (req, res) => {
  try {
    const { completed_lessons_ids } = req.body;
    const course_slug = req.params.slug;
    const studentId = req.user.id;

    if (!course_slug) {
      return error(res, "Please select course.", 400);
    }

    if (!completed_lessons_ids || completed_lessons_ids.length === 0) {
      return error(res, "Please send lesson ids.", 400);
    }

    const [checkCourse] = await db.execute(
      `SELECT id FROM courses WHERE slug = ?`, [course_slug]
    );

    const course_id = checkCourse[0].id;

    const [progressData] = await db.execute(
      `SELECT 
         c.total_lectures,
         cp.completed_lectures
       FROM courses c
       JOIN course_progress cp 
         ON cp.course_id = c.id
       WHERE cp.course_id = ? AND cp.student_id = ?`,
      [course_id, studentId]
    );

    if (progressData.length === 0) {
      return error(res, "Course progress not found.", 404);
    }

    const totalLessons = progressData[0].total_lectures;
    let existingLessons = [];

    const rawLessons = progressData[0].completed_lectures;

    if (rawLessons) {
      try {
        existingLessons = typeof rawLessons === "string"
          ? JSON.parse(rawLessons)
          : rawLessons;
      } catch {
        existingLessons = rawLessons.split(",").map(id => Number(id));
      }
    }

    if (!Array.isArray(existingLessons)) {
      existingLessons = [];
    }

    completed_lessons_ids.forEach(id => {
      if (!existingLessons.includes(id)) {
        existingLessons.push(id);
      }
    });

    const completedCount = existingLessons.length;
    const progressPercent = ((completedCount / totalLessons) * 100).toFixed(2);

    await db.execute(
      `UPDATE course_progress 
       SET completed_lectures = ?, 
           progress_percentage = ?, 
           last_accessed = ?
       WHERE student_id = ? AND course_id = ?`,
      [
        JSON.stringify(existingLessons),
        progressPercent,
        new Date(),
        studentId,
        course_id
      ]
    );

    return success(res, "Progress saved.", {
      progress: progressPercent,
      completed_lessons: existingLessons
    }, 200);

  } catch (err) {
    return error(res, "Internal server error.", 500);
  }
};

export const getCourseProgressByCourseSlug = async (req, res) => {
  try {
    const slug = req.params.slug;

    if (!slug) {
      return error(res, "This course is not available.", 400);
    }

    const [checkCourse] = await db.execute(
      `SELECT id FROM courses WHERE slug = ?`, [slug]
    );

    if (checkCourse.length === 0) {
      return error(res, "Invalid course.", 404);
    }

    const courseId = checkCourse[0].id;

    const [courseProgress] = await db.execute(
      `SELECT 
          completed_lectures, 
          total_lectures, 
          progress_percentage, 
          last_accessed
       FROM course_progress 
       WHERE course_id = ?`,
      [courseId]
    );

    if (courseProgress.length === 0) {
      return error(res, "Course progress not found.", 404);
    }

    const courseData = courseProgress[0];

    return success(res, "Course progress fetched successfully", {
      progress: {
        completed_lectures: courseData.completed_lectures,
        total_lectures: courseData.total_lectures,
        progress: courseData.progress_percentage,
        last_accessed: courseData.last_accessed
      }
    }, 200);

  } catch (err) {
    return error(res, "Internal server error.", 500);
  }
};
