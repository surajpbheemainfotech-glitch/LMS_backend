import express from 'express'
import {
    getAllUser,
    getUserById,
    login,
    logout,
    signup,
    updateUserProfileById
} from '../controllers/user.controller.js'
import {
    signupValidation,
    loginValidation
} from "../middleware/authVallidation.js"
import { verifyToken } from '../middleware/verifyToken.js'
import { createPdfUpload } from '../middleware/cloud.upload/pdf.upload.js'

const userRouter = express.Router()

const uploadPdf = createPdfUpload("LMS_PROJECT/user-resumes", "pdf");

userRouter.post("/login", loginValidation, login)
userRouter.post("/signup", signupValidation, signup)
userRouter.post("/logout", logout)

userRouter.patch("/update-profile/:id", verifyToken, updateUserProfileById )

userRouter.get("/all-users", getAllUser)
userRouter.get("/user-profile/:id",verifyToken,getUserById)

export default userRouter