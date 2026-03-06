import express from "express"
import {
    addCategory,
    deleteCategory,
    getCategories,
    updateCategory
} from "../controllers/category.controller.js"
import { verifyToken } from "../middleware/verifyToken.js"
import {upload} from "../middleware/upload.js"


const categoryRouter = express.Router()

//category route

categoryRouter.post("/add",verifyToken, upload.single("icon"),addCategory)
categoryRouter.get("/get", getCategories)
categoryRouter.patch("/update/:id",verifyToken, updateCategory)
categoryRouter.delete("/delete/:id",verifyToken, deleteCategory)


export default categoryRouter