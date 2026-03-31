import express from "express"
import { verifyToken } from "../middleware/verifyToken.js";
import {
    getCertificateByUserId,
     getCourseAssessment, 
     getScoreAndAttemp, 
     insertAssesment ,
     submitAssesmentTest
    } from "../controllers/assisment.controller.js";


const assessmentRouter = express.Router();

assessmentRouter.post("/add_assessment/:id",verifyToken, insertAssesment )
assessmentRouter.post("/submit_assessment/:id",verifyToken, submitAssesmentTest)
assessmentRouter.get("/get_assessment/:id",verifyToken, getCourseAssessment)
assessmentRouter.get("/check_attempts",verifyToken, getScoreAndAttemp)
assessmentRouter.get("/generate_certificate/:id", getCertificateByUserId)


export default assessmentRouter
