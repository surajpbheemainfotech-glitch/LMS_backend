import express from "express"
import {
    addCategory,
    deleteCategory,
    getCategories,
    updateCategory
} from "../controllers/category.controller.js"
import { verifyToken } from "../middleware/verifyToken.js"
import { createImageUpload } from "../middleware/cloud.upload/image.upload.js"


const categoryRouter = express.Router()
const categoryUpload = createImageUpload("LMS_PROJECT/categories", "category");

//category route

// categoryRouter.post("/add",verifyToken,categoryUpload.single("icon") ,addCategory)

categoryRouter.post(
  "/add",
  (req, res, next) => {
    console.log("category /add route hit");
    next();
  },
  (req, res, next) => {
    categoryUpload.single("icon")(req, res, function (err) {
      if (err) {
        console.log("multer err raw:", err);
        console.log("multer err message:", err.message);
        return res.status(400).json({
          success: false,
          message: err.message || "Upload error",
        });
      }

      console.log("after multer");
      console.log("req.body:", req.body);
      console.log("req.file:", req.file);
      next();
    });
  },
  addCategory
);

categoryRouter.get("/get", getCategories)
categoryRouter.patch("/update/:id",verifyToken, updateCategory)
categoryRouter.delete("/delete/:id",verifyToken, deleteCategory)


export default categoryRouter