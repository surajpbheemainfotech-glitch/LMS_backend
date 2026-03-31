import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connectDB } from "./config/db.js";

import adminRouter from "./routes/admin.route.js";
import userRouter from "./routes/user.route.js";
import categoryRouter from "./routes/category.route.js";
import courseRouter from "./routes/course.route.js";
import materialRouter from "./routes/course_material.route.js";
import reviewRouter from "./routes/review.route.js";
import assessmentRouter from "./routes/assessment.route.js";
import studentRouter from "./routes/student.route.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.1.14:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.get("/",(req,res) =>{
  res.send(`Server is running on ${PORT} .`)
})

// Routes
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/category",categoryRouter)
app.use("/api/course", courseRouter);
app.use("/api/std_material",materialRouter)
app.use("/api/review",reviewRouter)
app.use("/api/assessment", assessmentRouter)
app.use("/api/student",studentRouter)

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();