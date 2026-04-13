import express from 'express'
import {
    signupValidation,
    loginValidation
} from "../middleware/authVallidation.js"
import { 
    adminLogin, 
    loginUser,registerUser, 
    studentLogin, studentRegister,
    logout, 
    forgetPassword,
    verifyOtp,
    generateUserPassword,
    resetPassword
} from '../controllers/auth.controller.js'

const authRouter = express.Router()


authRouter.post("/admin_login",loginValidation, adminLogin)

//user
authRouter.post("/user_register", signupValidation, registerUser)
authRouter.post("/user_login",loginValidation, loginUser)

//student
authRouter.post("/student_register",signupValidation, studentRegister)
authRouter.post("/student_login",loginValidation, studentLogin)

//common-routes 
authRouter.post("/forget_password", forgetPassword)
authRouter.post("/verify_otp", verifyOtp)
authRouter.post("/logout",logout)

authRouter.patch("/generate_password", generateUserPassword)
authRouter.patch("/reset_password", resetPassword)


export default authRouter