import db from "../config/db.js";
import { createSlug } from "../services/service.slug.generator.js";
import { error, success } from "../utils/response.js";

export const addCourseMaterial = async (req, res) => {
  try {

    const { title, material_type, link, course_title } = req.body;
    const file_url = req.file || null;
    const url_public_id = req.file?.filename || null;

    if (!title || !material_type || !course_title) {
      return error(res, "All fields are required.", 400)
    }

    if (material_type === "pdf") {
      if (!file_url) {
        return error(res, "Please select a PDF file.", 400)
      }
    } else {
      if (!link) {
         return error(res, "Please enter YouTube link.", 400)
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

     return success(
      res,
       `Material added successfully for ${course_title}`,
       {file_url: material_type === "pdf" ? file_url : null,}, 
       201)
  } catch (err) {
    return error(res, "Internal server error", 500)
  }
};

export const getCourseMaterialByCourseSlug = async (req, res) => {
  try {
    const courseSlug = req.params.slug

    if (!courseSlug) {
      return error(res, "Material not avaiable for these course .", 400)
    }

    const [checkCourse] = await db.execute(
      `SELECT id FROM courses WHERE slug = ?`,
      [courseSlug]
    )

    if(checkCourse.length === 0){
      return error(res, "Courses not avaiable .", 400)
    }

    const courseId = checkCourse[0].id
    const [materialRows] = await db.execute(`
            SELECT id,title, material_type, file_url, youtube_url, created_at 
            FROM course_materials 
            WHERE course_id = ?`,
      [courseId]
    );

    if (materialRows.length == 0) {
      return error(res, "Material not avaiable for these course ." , 400)
    }
 return success(res, {material: materialRows}, 200)
    
  } catch (err) {
    return error(res, "Internal server error .", 500 )
  }
}

export const updateCourseMaterialBySlug = async (req, res) => {
  try {

    const slug = req.params.slug;

    const { title, material_type, youtube_url, course_title } = req.body;

    const file_url = req.file ? req.file.filename : null;

    if (!title || !material_type || !course_title) {
      return error(res, "All fields are required.", 400)
    }

    const [rows] = await db.execute(
      `SELECT id FROM courses WHERE slug = ?`,
      [slug]
    );

    if (rows.length === 0) {
      return error(res, "Course not found.", 404)
    }

    const courseId = rows[0].id;

    let updateQuery;
    let values;

    if (material_type === "pdf") {

      if (!file_url) {
        return error(res,  "Please upload PDF file.", 400)
      }

      updateQuery = `
        UPDATE course_materials
        SET title = ?, material_type = ?, file_url = ?, youtube_url = NULL, course_id = ?
        WHERE id = ?
      `;

      values = [title, material_type, file_url, courseId, id];

    } else {

      if (!youtube_url) {
        return error(res, "Please provide YouTube link.", 400)
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
      return error(res, "Material not found.", 404)
    }

    return error(res,  "Course material updated successfully.", 200)

  } catch (err) {
   return error(res, "Internal server error .", 500)
  }
};

export const deleteCourseBySlug = async (req, res) => {
  try {

    const slug = req.params.slug

    if (!slug) {
      return error(res,"Select course please .", 400 )    }

    const [existingMaterial] = await db.execute(`
        SELECT file_url , url_public_id
        from course_materials 
        WHERE slug = ?`, [slug]
    );

    if (existingMaterial === 0) {
      return error(res, "Selected course is not avaiable ." , 400)
    }

    const urlPublicId = existingMaterial[0].url_public_id
    if (urlPublicId) {
      const cloudinaryResult = await cloudinary.uploader.destroy(urlPublicId);
      console.log("Cloudinary delete result:", cloudinaryResult);
    }


    await db.execute(`DELETE FROM course_materials WHERE slug = ?`, [slug])

    return error(res, "Material removed successfully .", 200)

  } catch (err) {
    return error(res, "Internal server error .", 500)
  }
}

