import express from 'express'
import {
    getAllUser,
    getUserById,
} from '../controllers/user.controller.js'
import { verifyToken } from '../middleware/verifyToken.js'
import courseRouter from './course.route.js'

const userRouter = express.Router()


userRouter.get("/all-users", getAllUser)
userRouter.get("/user-profile/:id",verifyToken,getUserById)

//hadle courses
userRouter.use("/course",courseRouter)

export default userRouter