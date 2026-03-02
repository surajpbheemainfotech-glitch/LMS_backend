import express from "express"
import {
    addCategory,
    deleteCategory,
    getCategories,
    updateCategory
} from "../controllers/category.controller.js"
import { verifyToken } from "../middleware/verifyToken.js"


const categoryRouter = express.Router()

//category route

categoryRouter.post("/add", verifyToken, addCategory)
categoryRouter.get("/get", getCategories)
categoryRouter.patch("/update/:id", verifyToken, updateCategory)
categoryRouter.delete("/delete/:id", verifyToken, deleteCategory)


export default categoryRouter