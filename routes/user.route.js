import express from 'express'
import {
    addAdmins,
    adminLogin,
    getAllUser,
    getUserById,
    logout,
} from '../controllers/user.controller.js'
import {
    signupValidation,
    loginValidation
} from "../middleware/authVallidation.js"
import { verifyToken } from '../middleware/verifyToken.js'

const userRouter = express.Router()

userRouter.post("/login", loginValidation, adminLogin)
userRouter.post("/add_admin", signupValidation, addAdmins)
userRouter.post("/logout", logout)

userRouter.get("/all-users", getAllUser)
userRouter.get("/user-profile/:id",verifyToken,getUserById)

export default userRouter