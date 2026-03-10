import db from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";

export const addCategory = async (req, res) => {
  try {
    const {name} = req.body;

    if (!name) {
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select image",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM categories WHERE name = ?",
      [name]
    );

    if (existing.length > 0) {
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    await db.execute(
      "INSERT INTO categories (name, icon, icon_public_id, created_by) VALUES (?, ?, ?, ?)",
      [name, req.file.path, req.file.filename, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Category added successfully",
      data: {
        name,
        icon: req.file.path,
        icon_public_id: req.file.filename,
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

    console.error("Add Category Error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Server Error",
    });
  }
};

export const getCategories = async (req, res) => {
  try {


    const [categories] = await db.execute(
      "SELECT * FROM categories ORDER BY created_at DESC"
    );

    res.status(200).json({
      success: true,
      categories,
    });

  } catch (error) {
    console.error("Get Categories Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {name} = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const [existingCategory] = await db.execute(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const [duplicate] = await db.execute(
      "SELECT id FROM categories WHERE name = ?",
      [name, id]
    );

    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists",
      });
    }

    await db.execute(
      "UPDATE categories SET name = ? WHERE id = ?",
      [name, id]
    );

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
    });

  } catch (error) {
    console.error("Update Category Error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Server Error",
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [existingCategory] = await db.execute(
      "SELECT icon_public_id FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const publicId = existingCategory[0].icon_public_id;

    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log("Cloudinary delete result:", result);
    }

    await db.execute("DELETE FROM categories WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete Category Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Server Error",
    });
  }
};
