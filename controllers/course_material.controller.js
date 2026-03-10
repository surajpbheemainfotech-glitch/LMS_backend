import db from "../config/db.js";

export const addCourseMaterial = async (req, res) => {
  try {
  
    const { title, material_type, link, course_title } = req.body;
    console.log("material_type",material_type)
    const file_url = req.file ? req.file.path || req.file.secure_url : null;

    if (!title || !material_type || !course_title) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (material_type === "pdf") {
      if (!file_url) {
        return res.status(400).json({
          success: false,
          message: "Please select a PDF file.",
        });
      }
    } else {
      if (!link) {
        return res.status(400).json({
          success: false,
          message: "Please enter YouTube link.",
        });
      }
    }

    const [rows] = await db.execute(
      `SELECT id FROM courses WHERE title = ?`,
      [course_title]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title is not related to any course.",
      });
    }

    const courseId = rows[0].id;

    await db.execute(
      `INSERT INTO course_materials
      (course_id, title, material_type, file_url, youtube_url)
      VALUES (?, ?, ?, ?, ?)`,
      [
        courseId,
        title,
        material_type,
        material_type === "pdf" ? file_url : null,
        material_type !== "pdf" ? link : null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Material added successfully for ${course_title}`,
      file_url: material_type === "pdf" ? file_url : null,
    });
  } catch (error) {
    console.error("addCourseMaterial error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getCourseMaterialBy = async (req, res) => {
  try {
    const courseId = req.params.id

    if (!courseId) {
      return res.json({ success: false, message: "Material not avaiable for these course ." })
    }

    const [materialRows] = await db.execute(`
            SELECT title, material_type, file_url, youtube_url, created_at 
            FROM course_materials 
            WHERE course_id = ?`,
      [courseId]
    );

    if (materialRows.length == 0) {
      return res.status(400).json({ success: false, message: "Material not avaiable for these course ." })
    }

    return res.status(200).json({ success: true, material: materialRows })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error ." })
  }
}

export const updateCourseMaterialById = async (req, res) => {
  try {

    const id = req.params.id;

    const { title, material_type, youtube_url, course_title } = req.body;

    const file_url = req.file ? req.file.filename : null;

    if (!title || !material_type || !course_title) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      });
    }

    const [rows] = await db.execute(
      `SELECT id FROM courses WHERE title = ?`,
      [course_title]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found."
      });
    }

    const courseId = rows[0].id;

    let updateQuery;
    let values;

    if (material_type === "pdf") {

      if (!file_url) {
        return res.status(400).json({
          success: false,
          message: "Please upload PDF file."
        });
      }

      updateQuery = `
        UPDATE course_materials
        SET title = ?, material_type = ?, file_url = ?, youtube_url = NULL, course_id = ?
        WHERE id = ?
      `;

      values = [title, material_type, file_url, courseId, id];

    } else {

      if (!youtube_url) {
        return res.status(400).json({
          success: false,
          message: "Please provide YouTube link."
        });
      }

      updateQuery = `
        UPDATE course_materials
        SET title = ?, material_type = ?, youtube_url = ?, file_url = NULL, course_id = ?
        WHERE id = ?
      `;

      values = [title, material_type, youtube_url, courseId, id];
    }

    const [result] = await db.execute(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Material not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course material updated successfully."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

export const deleteCourseById = async (req, res) => {
  try {

    const id = req.params.id

    if (!id) {
      return res.status(400).json({ success: false, message: "Select course please ." })
    }

    const [existingMaterial] = await db.execute(`
        SELECT file_url 
        from course_materials 
        WHERE id = ?`, [id]
    );

    if (existingMaterial === 0) {
      return res.status(400).json({ success: false, message: "Selected course is not avaiable ." })
    }
    const imagePath = rows[0].file_url;
    
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

    await db.execute(`DELETE FROM course_materials WHERE id = ?`, [id])
    return res.status(400).json({ success: true, message: "Material removed successfully ." })

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error ." })
  }
}