import db from "../config/db.js";
import path from "path";
import fs from "fs";

export const addCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      short_description,
      price,
      level,
      language,
      duration,
      total_lectures,
      category_id
    } = req.body;

    const thumbnail = req.file ? req.file.filename : null;

    if (!thumbnail) {
      return res.status(400).json({ success: false, message: "Please select image" })
    }

    if (!title || !description || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const [category] = await db.execute(
      "SELECT id FROM categories WHERE id = ?",
      [category_id]
    );

    if (category.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await db.execute(
      `INSERT INTO courses 
      (title, description, short_description, price, thumbnail, level, language, duration, total_lectures, category_id, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        short_description,
        price,
        thumbnail,
        level || "Beginner",
        language || "English",
        duration,
        total_lectures || 0,
        category_id,
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: "Course added successfully",
    });

  } catch (error) {
    console.error("Add Course Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
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
      title,
      description,
      short_description,
      price,
      level,
      language,
      duration,
      total_lectures,
      category_id
    } = req.body;


    if (!title || !description || !short_description || !price || !level || !language
      || !duration || !total_lectures || !category_id) {
      return res.status(402).json({ success: false, message: "All fields are required" })
    }
    const [existing] = await db.execute(
      "SELECT id FROM courses WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    await db.execute(
      `UPDATE courses SET
        title = ?,
        description = ?,
        short_description = ?,
        price = ?,
        level = ?,
        language = ?,
        duration = ?,
        total_lectures = ?,
        category_id = ?
      WHERE id = ?`,
      [
        title,
        description,
        short_description,
        price,
        level,
        language,
        duration,
        total_lectures,
        category_id,
        id
      ]
    );

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
    });

  } catch (error) {
    console.error("Update Course Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute(
      "SELECT thumbnail FROM courses WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const imagePath = existing[0].thumbnail;

    console.log("DB icon value:", imagePath);

    if (imagePath) {
      const fileName = path.basename(imagePath);
      const filePath = path.join(process.cwd(), "uploads", fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("File deleted successfully");
      } else {
        console.log("File not found in uploads folder");
      }
    }

    await db.execute(
      "DELETE FROM courses WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });

  } catch (error) {
    console.error("Delete Course Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
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
    id,title,description,short_description,
    price,thumbnail,level,language, duration,
    total_lectures,category_id,is_published,created_at,updated_at
    FROM courses
    WHERE category_id = ?`,
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
}

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
}

export const enrollCourse = async (req, res) => {
  try {

    const { user_id, course_id, amount } = req.body

    if (!user_id) {
      return res.status(400).json({ success: false, message: "Login to enroll course ." })
    } else {
      if (!course_id) {
        return res.status(400).json({ success: false, message: "Please select course ." })
      }
      if (!amount) {
        return res.status(400).json({ success: false, message: "Try agaun later ." })
      }
    }

    await db.execute(`
        INSERT INTO purchased_courses 
        (user_id, course_id, purchased_at, amount, payment_status)
         VALUES (?, ?, ?, ?, ?)`,
      [user_id, course_id, new Date(), amount, "paid"]
    );

    return res.status(201).json({ success: true, message: "Enrolled Successfully ." })

  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, message: "Internal server error ." })
  }
}

export const getCoursesByUserId = async (req, res) => {
  try {
    const userId  = req.params.id;

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
      return res.status(400).json({ success: false, message: "NO course is enrolled by user ." })
    }

    return res.status(200).json({ success: true, courses: courses })

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error ." })
  }
}
