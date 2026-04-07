import db from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";
import { createSlug } from "../services/service.slug.generator.js";
import { error, success } from "../utils/response.js";

export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return error(res, "Category name is required", 400)
    }

    if (!req.file) {
      return error(res, "Please select image", 400)
    }

    const [existing] = await db.execute(
      "SELECT id FROM categories WHERE name = ?",
      [name]
    );

    if (existing.length > 0) {
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return error(res, "Category already exists", 400)
    }

    const catergorySlug = createSlug(name)

    await db.execute(
      "INSERT INTO categories (name, icon, icon_public_id, slug, created_by) VALUES (?, ?, ?, ?, ?)",
      [name, req.file.path, req.file.filename, catergorySlug, req.user.id]
    );

    return success(
      res,
      "Category added successfully",
      {
        data: {
          name,
          catergorySlug,
          icon: req.file.path,
          icon_public_id: req.file.filename,
        }
      }, 201)
  } catch (error) {
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (destroyError) {
        console.error("Cloudinary cleanup error:", destroyError.message);
      }
    }

    return error(res, "Internal Server Error", 500)
  }
};

export const getCategories = async (req, res) => {
  try {

    const [categories] = await db.execute(`
     SELECT 
      categories.*, 
      COUNT(courses.id) AS course_count
     FROM categories
     LEFT JOIN courses 
      ON courses.category_id = categories.id
    GROUP BY categories.id
    ORDER BY categories.created_at DESC
`);

    return success(res, { categories }, 200)

  } catch (error) {
    return error(res, "Internal Server Error", 500)
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name } = req.body;

    if (!name) {
      return error(res, "Category name is required", 400)
    }

    const [existingCategory] = await db.execute(
      "SELECT id FROM categories WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (existingCategory.length === 0) {
      return error(res, "Category not found", 404)
    }

    const [duplicate] = await db.execute(
      "SELECT id FROM categories WHERE name = ?",
      [name]
    );

    if (duplicate.length > 0) {
      return error(res, "Category name already exists", 400)
    }

    await db.execute(
      "UPDATE categories SET name = ? WHERE id = ?",
      [name, id]
    );

    return success(res, "Category updated successfully", 200)

  } catch (error) {
    console.error("Update Category Error:", error);
    return error(res, "Internal server error ", 500)
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const [existingCategory] = await db.execute(
      "SELECT icon_public_id FROM categories WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (existingCategory.length === 0) {
      return error(res, "Category not found", 404)
    }

    const publicId = existingCategory[0].icon_public_id;

    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log("Cloudinary delete result:", result);
    }

    await db.execute("DELETE FROM categories WHERE slug = ?", [slug]);

    return success(res, "Category deleted successfully", 200)
  
  } catch (error) {
    return error(res, "Internal server error ", 500)
  }
};