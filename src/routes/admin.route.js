import express from 'express'
import {
    approveUserRequests,
    getApprovalRequests,
    removeUser
} from '../controllers/admin.controller.js'
import categoryRouter from './category.route.js'
import courseRouter from './course.route.js'
import userRouter from './user.route.js'
import companyRouter from './company.route.js'
import { verifyToken } from '../middleware/verifyToken.js'

const adminRouter = express.Router()

//admin routes

adminRouter.get("/get_userReqs",verifyToken, getApprovalRequests)
adminRouter.patch("/update_req_status",verifyToken, approveUserRequests)
adminRouter.delete("/remove-admin/:id",removeUser)

//category route 
adminRouter.use("/category",categoryRouter)

//courses route 
adminRouter.use("/course",courseRouter)

//users route
adminRouter.use("/user",userRouter)

//company route
adminRouter.use("/company",companyRouter)

export default adminRouter