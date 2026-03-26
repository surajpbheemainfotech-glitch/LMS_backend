import db from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";

export const addCourse = async (req, res) => {
  try {
    const {
      title, description, short_description, price,
      level, language, duration, total_lectures, category_id,
    } = req.body;

    const thumbnail = req.file?.path || null;
    const thumbnail_public_id = req.file?.filename || null;

    if (!thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Please select image",
      });
    }

    if (!title || !description || !price || !category_id) {
      if (thumbnail_public_id) {
        await cloudinary.uploader.destroy(thumbnail_public_id);
      }

      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const [category] = await db.execute(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [category_id]
    );

    if (category.length === 0) {
      if (thumbnail_public_id) {
        await cloudinary.uploader.destroy(thumbnail_public_id);
      }

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await db.execute(
      `INSERT INTO courses 
      (title, description, short_description, price, thumbnail, thumbnail_public_id,
       level, language, duration, total_lectures, category_id, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description, short_description || null, price, thumbnail,
        thumbnail_public_id, level || "Beginner", language || "English", duration || null,
        total_lectures || 0, category_id, req.user.id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Course added successfully",
      data: {
        title,
        thumbnail,
        thumbnail_public_id,
      },
    });
  } catch (error) {
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (destroyError) {
        console.error("Cloudinary cleanup error:", destroyError.message);
      }
    }

    console.error("Add Course Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Server Error",
    });
  }
};

export const getCourses = async (req, res) => {
  try {

    const [courses] = await db.execute(`
      SELECT 
        courses.id,
        courses.title,
        courses.short_description,
        courses.price,
        courses.thumbnail,
        courses.level,
        courses.language,
        courses.duration,
        courses.total_lectures,
        courses.is_published,
        categories.name AS category_name,
        courses.created_at
      FROM courses
      JOIN categories ON courses.category_id = categories.id
      ORDER BY courses.created_at DESC
    `);

    res.status(200).json({
      success: true,
      courses,
    });

  } catch (error) {
    console.error("Get Courses Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title, description, short_description, price, level,
      language, duration, total_lectures, category_id,
    } = req.body;

    if (
      !title || !description || !short_description || !price || !level || !language ||
      !duration || !total_lectures || !category_id) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM courses WHERE id = ? LIMIT 1",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const [category] = await db.execute(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [category_id]
    );

    if (category.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await db.execute(
      `UPDATE courses SET
        title = ?,description = ?,short_description = ?, price = ?, 
        level = ?, language = ?, duration = ?, total_lectures = ?, category_id = ?
      WHERE id = ?`,
      [
        title, description, short_description, price, level,
        language, duration, total_lectures, category_id, id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("Update Course Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Server Error",
    });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute(
      "SELECT thumbnail_public_id FROM courses WHERE id = ? LIMIT 1",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const thumbnailPublicId = existing[0].thumbnail_public_id;

    if (thumbnailPublicId) {
      const cloudinaryResult = await cloudinary.uploader.destroy(thumbnailPublicId);
      console.log("Cloudinary delete result:", cloudinaryResult);
    }

    await db.execute("DELETE FROM courses WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete Course Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Server Error",
    });
  }
};

export const getCoursesByCategoryId = async (req, res) => {

  try {
    const category_id = req.params.id;


    if (!category_id) {
      return res.status(400).json({ success: false, message: "Please select category" })
    }

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
      return res.status(404).json({
        success: false,
        message: "No courses are available for this category"
      })
    }

    const courses = courseRows;

    return res.status(200).json({ success: true, courses: courses })

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error !" })
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
      return res.status(404).json({ success: false, message: "No active course are avaiable ." })
    }

    const activeCourses = courseRows;
    return res.status(200).json({ success: true, activeCourses: activeCourses })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error !" })
  }
};

export const enrollCourse = async (req, res) => {
  try {
    const { user_id, course_id, amount } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "Login to enroll course." });
    }

    if (!course_id) {
      return res.status(400).json({ success: false, message: "Please select course." });
    }

    if (!amount) {
      return res.status(400).json({ success: false, message: "Try again later." });
    }

    const [courseLectures] = await db.execute(
      `SELECT total_lectures FROM courses WHERE id = ?`,
      [course_id]
    );

    if (courseLectures.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const [purchaseResult] = await db.execute(
      `INSERT INTO purchased_courses 
       (user_id, course_id, purchased_at, amount, payment_status)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, course_id, new Date(), amount, "paid"]
    );

    const purchaseId = purchaseResult.insertId;

    await db.execute(
      `INSERT INTO course_progress 
       (purchase_id, user_id, course_id, total_lessons, progress_percent, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        purchaseId,
        user_id,
        course_id,
        courseLectures[0].total_lectures,
        0,
        "Started"
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Enrolled Successfully."
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

export const getCoursesByUserId = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(402).json({ success: false, message: "Please login first . " })
    }

    const [courses] = await db.execute(
      `SELECT c.*
   FROM courses c
   JOIN purchased_courses pc 
   ON pc.course_id = c.id
   WHERE pc.user_id = ?`,
      [userId]
    );

    if (courses == 0) {
      return res.status(400).json({
        success: false,
        message: "NO course is enrolled by user ."
      })
    }

    return res.status(200).json({
      success: true,
      courses: courses
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error ."
    })
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Selected course are not available."
      });
    }

    const [course] = await db.execute(`SELECT 
      c.id, c.title, c.description, c.short_description,
      c.price, c.thumbnail, c.level, c.language, c.duration, c.total_lectures,
      cat.name AS category_name,
      GROUP_CONCAT(cm.title) AS material_titles
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN course_materials cm ON cm.course_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const [avgResult] = await db.execute(
      `SELECT AVG(rating) AS avgRating 
       FROM course_reviews 
       WHERE course_id = ?`,
      [id]
    );

    const [reviews] = await db.execute(
      `SELECT rating, review_text, created_at 
       FROM course_reviews 
       WHERE course_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [id]
    );

    return res.json({
      success: true,
      data: course[0],
      avgRating: avgResult[0]?.avgRating || 0,
      totalReviews: reviews.length,
      reviews: reviews
    });

  } catch (error) {
    console.log("error ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

export const updateCourseProgress = async (req, res) => {
  try {
    const { completed_lessons_ids } = req.body;
    const course_id = req.params.id;
    const userId = req.user.id;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: "Please select course."
      });
    }

    if (!completed_lessons_ids || completed_lessons_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please send ids."
      });
    }

    const [progressData] = await db.execute(
      `SELECT 
         c.total_lectures,
         cp.completed_lessons
       FROM courses c
       JOIN course_progress cp 
         ON cp.course_id = c.id
       WHERE cp.course_id = ? AND cp.user_id = ?`,
      [course_id, userId]
    );

    if (progressData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course progress not found."
      });
    }

    const totalLessons = progressData[0].total_lectures;
    let existingLessons = [];

    const rawLessons = progressData[0].completed_lessons;

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
    const remainingLessons = totalLessons - completedCount;
    const progressPercent = ((completedCount / totalLessons) * 100).toFixed(2);

    await db.execute(
      `UPDATE course_progress 
       SET completed_lessons = ?, 
           remaining_lessons = ?, 
           progress_percent = ?, 
           status = ?
       WHERE user_id = ? AND course_id = ?`,
      [
        JSON.stringify(existingLessons),
        remainingLessons,
        progressPercent,
        progressPercent == 100 ? "Completed" : "In Progress",
        userId,
        course_id
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Progress saved."
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

export const getCourseProgressByCourseId = async (req, res) => {
  try {
    const courseId = req.params.id

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "This course is not available ."
      })
    };

    const [courseProgress] = await db.execute(
      `SELECT 
          completed_lessons,remaining_lessons, progress_percent, status 
          FROM course_progress 
          WHERE course_id = ?`,
      [courseId]
    );

    if (courseProgress.length == 0) {
      return res.status(404).json({
        success: false,
        message: "This course is not available ."
      })
    };

    return res.status(200).json({
      success: true,
      progress: courseProgress
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error ."
    })
  }
};
