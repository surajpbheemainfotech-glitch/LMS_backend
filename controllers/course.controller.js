import db from "../config/db.js";

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

    if(!thumbnail){
      return res.status(400).json({success: false, message: "Please select image"})
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

    console.log(req.body)

  if(!title || !description || !short_description || !price  || !level || !language 
    || !duration || !total_lectures || !category_id){
     return res.status(402).json({success: false, message: "All fields are required"})
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