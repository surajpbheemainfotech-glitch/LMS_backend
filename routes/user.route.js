import express from 'express'
import { login, logout, signup } from '../controllers/user.controller.js'
import {signupValidation,loginValidation} from "../middleware/authVallidation.js"

const userRouter = express.Router()

userRouter.post("/login",loginValidation, login)
userRouter.post("/signup",signupValidation, signup)
userRouter.post("/logout",logout)

export default userRouter