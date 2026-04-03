import db from "../config/db.js";
import { createSlug } from "../services/service.slug.generator.js";

export const addCourseMaterial = async (req, res) => {
  try {

    const { title, material_type, link, course_title } = req.body;
    const file_url = req.file || null;
    const url_public_id = req.file?.filename || null;

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
    const materialSlug = createSlug(title)

    await db.execute(
      `INSERT INTO course_materials
      (course_id, title, material_type, file_url, youtube_url, url_public_id, slug)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        title,
        material_type,
        material_type === "pdf" ? file_url : null,
        material_type !== "pdf" ? link : null,
        url_public_id,
        materialSlug
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

export const getCourseMaterialByCourseSlug = async (req, res) => {
  try {
    const courseSlug = req.params.slug

    if (!courseSlug) {
      return res.json({ success: false, message: "Material not avaiable for these course ." })
    }

    const [checkCourse] = await db.execute(
      `SELECT id FROM courses WHERE slug = ?`,
      [courseSlug]
    )

    if(checkCourse.length === 0){
      return res.status(400).json({
        success: false, 
        message: "Courses not avaiable ."})
    }

    const courseId = checkCourse[0].id
    const [materialRows] = await db.execute(`
            SELECT id,title, material_type, file_url, youtube_url, created_at 
            FROM course_materials 
            WHERE course_id = ?`,
      [courseId]
    );

    if (materialRows.length == 0) {
      return res.status(400).json({ success: false, message: "Material not avaiable for these course ." })
    }

    return res.status(200).json({ success: true, material: materialRows })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, message: "Internal server error ." })
  }
}

export const updateCourseMaterialBySlug = async (req, res) => {
  try {

    const slug = req.params.slug;

    const { title, material_type, youtube_url, course_title } = req.body;

    const file_url = req.file ? req.file.filename : null;

    if (!title || !material_type || !course_title) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      });
    }

    const [rows] = await db.execute(
      `SELECT id FROM courses WHERE slug = ?`,
      [slug]
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

export const deleteCourseBySlug = async (req, res) => {
  try {

    const slug = req.params.slug

    if (!slug) {
      return res.status(400).json({ success: false, message: "Select course please ." })
    }

    const [existingMaterial] = await db.execute(`
        SELECT file_url , url_public_id
        from course_materials 
        WHERE slug = ?`, [slug]
    );

    if (existingMaterial === 0) {
      return res.status(400).json({ success: false, message: "Selected course is not avaiable ." })
    }

    const urlPublicId = existingMaterial[0].url_public_id
    if (urlPublicId) {
      const cloudinaryResult = await cloudinary.uploader.destroy(urlPublicId);
      console.log("Cloudinary delete result:", cloudinaryResult);
    }


    await db.execute(`DELETE FROM course_materials WHERE slug = ?`, [slug])
    return res.status(400).json({ success: true, message: "Material removed successfully ." })

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error ." })
  }
}

