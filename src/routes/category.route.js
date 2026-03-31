import express from "express"
import {
    addCategory,
    deleteCategory,
    getCategories,
    updateCategory
} from "../controllers/category.controller.js"
import { verifyToken } from "../middleware/verifyToken.js"
import { createImageUpload } from "../middleware/cloud.upload/image.upload.js"


const categoryRouter = express.Router();
const categoryUpload = createImageUpload("LMS_PROJECT/categories", "category");


categoryRouter.post("/add",verifyToken, categoryUpload.single("icon") ,addCategory)
categoryRouter.get("/get", getCategories)
categoryRouter.patch("/update/:slug",verifyToken, updateCategory)
categoryRouter.delete("/delete/:slug",verifyToken, deleteCategory)


export default categoryRouter