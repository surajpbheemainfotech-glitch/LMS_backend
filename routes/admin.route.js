import express from 'express'
import {
    adminLogin,
    adminLogout
} from '../controllers/admin.controller.js'



const adminRouter = express.Router()

//admin routes

adminRouter.post("/login", adminLogin)
adminRouter.post("/logout", adminLogout)





export default adminRouter