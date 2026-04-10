import db from "../config/db.config.js";
import cloudinary from "../config/cloudinary.config.js";
import logger from "../utils/logger.js";
import { createSlug } from "../services/service.slug.generator.js";
import { error, success } from "../utils/response.js";


export const addCategory = async (req, res) => {
  try {

    const { name } = req.body;

    logger.info({ name, userId: req.user?.id }, "Add category request");

    if (!name) {

      logger.warn("Category name missing");

      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return error(res, "Category name is required", 400);
    }

    if (!req.file) {
      logger.warn("Category image missing");
      return error(res, "Please select image", 400);
    }

    const [existing] = await db.execute(
      "SELECT id FROM categories WHERE name = ?",
      [name]
    );

    if (existing.length > 0) {

      logger.warn({ name }, "Duplicate category attempted");

      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return error(res, "Category already exists", 400);
    }

    const categorySlug = createSlug(name);

    await db.execute(
      "INSERT INTO categories (name, icon, icon_public_id, slug, created_by) VALUES (?, ?, ?, ?, ?)",
      [name, req.file.path, req.file.filename, categorySlug, req.user.id]
    );

    logger.info({ name, categorySlug }, "Category created");

    return success(
      res,
      "Category added successfully",
      {
        data: {
          name,
          categorySlug,
          icon: req.file.path,
          icon_public_id: req.file.filename
        }
      },
      201
    );

  } catch (err) {

    logger.error(err, "Add category failed");

    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
        logger.warn("Uploaded image cleaned from cloudinary");
      } catch (destroyError) {
        logger.error(destroyError, "Cloudinary cleanup failed");
      }
    }

    return error(res, "Internal Server Error", 500);
  }
};

export const getCategories = async (req, res) => {

  try {

    logger.info("Fetching categories");

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

    logger.info({ total: categories.length }, "Categories fetched");

    return success(res, { categories }, 200);

  } catch (err) {

    logger.error(err, "Fetching categories failed");

    return error(res, "Internal Server Error", 500);
  }
};

export const updateCategory = async (req, res) => {

  try {

    const { slug } = req.params;
    const { name } = req.body;

    logger.info({ slug }, "Update category request");

    if (!name) {
      logger.warn("Category name missing");
      return error(res, "Category name is required", 400);
    }

    const [existingCategory] = await db.execute(
      "SELECT id FROM categories WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (existingCategory.length === 0) {
      logger.warn({ slug }, "Category not found");
      return error(res, "Category not found", 404);
    }

    const categoryId = existingCategory[0].id;

    const [duplicate] = await db.execute(
      "SELECT id FROM categories WHERE name = ? AND id != ?",
      [name, categoryId]
    );

    if (duplicate.length > 0) {
      logger.warn({ name }, "Duplicate category name during update");
      return error(res, "Category name already exists", 400);
    }

    await db.execute(
      "UPDATE categories SET name = ? WHERE id = ?",
      [name, categoryId]
    );

    logger.info({ categoryId, name }, "Category updated");

    return success(res, "Category updated successfully", 200);

  } catch (err) {

    logger.error(err, "Update category failed");

    return error(res, "Internal server error", 500);
  }
};

export const deleteCategory = async (req, res) => {

  try {

    const { slug } = req.params;

    logger.info({ slug }, "Delete category request");

    const [existingCategory] = await db.execute(
      "SELECT icon_public_id FROM categories WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (existingCategory.length === 0) {
      logger.warn({ slug }, "Category not found for deletion");
      return error(res, "Category not found", 404);
    }

    const publicId = existingCategory[0].icon_public_id;

    if (publicId) {

      const result = await cloudinary.uploader.destroy(publicId);

      logger.info({ publicId, result }, "Cloudinary image deleted");

    }

    await db.execute("DELETE FROM categories WHERE slug = ?", [slug]);

    logger.info({ slug }, "Category deleted");

    return success(res, "Category deleted successfully", 200);

  } catch (err) {

    logger.error(err, "Delete category failed");

    return error(res, "Internal server error", 500);
  }
};