import express from "express";
import cors from 'cors';
import StudnetLogin from './routes/StudentLogin.js'
import CourseOutcomes from './routes/CourseOutcomes.js'
import Ratings from './routes/Ratings.js'
import SubjectsRoutes from './routes/SubjectsRoutes.js'
import StudentsRoutes from './routes/StudentRoutes.js'
import AdminRoutes from './routes/AdminRoutes.js';
const app = express();
app.use(express.json()); 
app.use(cors()); 


app.use("/student", StudentsRoutes);
app.use("/admin", AdminRoutes);
app.use("/courseoutcomes", CourseOutcomes);
app.use("/ratings", Ratings);
app.use("/subjects", SubjectsRoutes)
app.listen(3002, () => {
  console.log("Server Connected"); 
})  



