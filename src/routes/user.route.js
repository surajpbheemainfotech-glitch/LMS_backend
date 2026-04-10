import express from 'express'
import {
    adminLogin,
    adminLogout,
    getAllUser,
    getUserById,
    registerUser,
    removeAdmins,
} from '../controllers/user.controller.js'
import {
    signupValidation,
    loginValidation
} from "../middleware/authVallidation.js"
import { verifyToken } from '../middleware/verifyToken.js'
import courseRouter from './course.route.js'

const userRouter = express.Router()

userRouter.post("/admin_login", loginValidation, adminLogin)
userRouter.post("/register_admin", signupValidation, registerUser)
userRouter.post("/logout", adminLogout) 

userRouter.get("/all-users", getAllUser)
userRouter.get("/user-profile/:id",verifyToken,getUserById)

userRouter.delete("/remove-admin/:id",removeAdmins)

//hadle courses
userRouter.use("/course",courseRouter)

export default userRouter