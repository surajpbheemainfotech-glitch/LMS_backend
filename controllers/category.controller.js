import db from "../config/db.js";
import path from "path";
import fs from "fs";

export const addCategory = async (req, res) => {
  console.log("req.body raw:", req.body);
console.log("req.body.name:", req.body.name);
console.log("typeof req.body.name:", typeof req.body.name);
console.log("req.file raw:", req.file);
console.log("req.file.filename:", req.file?.filename);
console.log("req.file.path:", req.file?.path);
  try {

    const { name } = req.body;
    const icon = req.file ? req.file.filename : null;

    if (!icon) {
      return res.status(400).json({ success: false, message: "Please select image" })
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM categories WHERE name = ?",
      [name]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }
    await db.execute(
      "INSERT INTO categories ( name,icon, created_by) VALUES (?, ?, ?)",
      [name, icon, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: "Category added successfully",
    });

  } catch (error) {
    console.error("Add Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
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
};;

export const updateCategory = async (req, res) => {
  try {

    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const [existingCategory] = await db.execute(
      "SELECT id FROM categories WHERE id = ?",
      [id]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const [duplicate] = await db.execute(
      "SELECT id FROM categories WHERE name = ? AND id != ?",
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

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
    });

  } catch (error) {
    console.error("Update Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {

    const { id } = req.params;
    console.log(id)
    const [existingCategory] = await db.execute(
      "SELECT icon FROM categories WHERE id = ?",
      [id]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const imagePath = existingCategory[0].icon;

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
      "DELETE FROM categories WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });

  } catch (error) {
    console.error("Delete Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
