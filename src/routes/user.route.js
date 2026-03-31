import express from 'express'
import {
    addAdmins,
    adminLogin,
    adminLogout,
    getAllUser,
    getUserById,
    removeAdmins,
} from '../controllers/user.controller.js'
import {
    signupValidation,
    loginValidation
} from "../middleware/authVallidation.js"
import { verifyToken } from '../middleware/verifyToken.js'

const userRouter = express.Router()

userRouter.post("/admin_login", loginValidation, adminLogin)
userRouter.post("/add_admin", signupValidation, addAdmins)
userRouter.post("/logout", adminLogout) 

userRouter.get("/all-users", getAllUser)
userRouter.get("/user-profile/:id",verifyToken,getUserById)

userRouter.delete("/remove-admin/:id",removeAdmins)

export default userRouter