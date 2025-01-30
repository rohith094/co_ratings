import express from "express";
import connection from "../db.js";
import dotenv from "dotenv";
import multer from "multer";
import xlsx from "xlsx";
import fs from "fs";
import jwt from 'jsonwebtoken'
import AuthRoute from "./AuthRoute.js";

const router = express.Router();
dotenv.config();

const upload = multer({ dest: "uploads/" });


router.post("/login", async (req, res) => {
  const { jntuno } = req.body;

  // Validate input
  if (!jntuno) {
    return res.status(400).json({
      status: "error",
      message: "JNTU number is required. Please provide a valid JNTU number.",
    });
  }

  const query = "SELECT * FROM students WHERE jntuno = ?";

  try {
    // Check if the student exists with the given JNTU number
    const [results] = await connection.execute(query, [jntuno]);

    if (results.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Student does not exist. Please check your JNTU number or contact administration.",
      });
    }

    const student = results[0];
    console.log("Student Found:", student);

    // Generate JWT token using jntuno
    const token = jwt.sign({ jntuno }, process.env.SECRET_KEY, { expiresIn: "3h" });
    console.log("Generated Token:", token);

    return res.status(200).json({
      status: "success",
      message: "Login successful. Welcome!",
      token,
    });
  } catch (error) {
    console.error("Database Error:", error);

    return res.status(500).json({
      status: "error",
      message: "An internal server error occurred. Please try again later or contact support.",
    });
  }
});


router.get('/studentinfo/:jntuno',AuthRoute, async (req, res) => {
  const { jntuno } = req.params;
  const query = `SELECT * FROM students WHERE jntuno = ?`;

  try {
    const [result] = await connection.execute(query, [jntuno]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.status(200).json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.get('/subjects/:semesternumber/:branchcode',AuthRoute, async (req, res) => {
  const { semesternumber, branchcode } = req.params;
  const query = `SELECT * FROM subjects WHERE semesternumber = ? AND branchcode = ?`;

  try {
    const [subjects] = await connection.execute(query, [semesternumber, branchcode]);
    res.status(200).json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.get('/courseoutcomes/:subjectcode', AuthRoute, async (req, res) => {
  const { subjectcode } = req.params;
  const query = `SELECT * FROM courseoutcomes WHERE subjectcode = ?`;

  try {
    const [cos] = await connection.execute(query, [subjectcode]);
    res.status(200).json(cos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.post('/finalsubmit', AuthRoute, async (req, res) => {
  const { jntuno } = req.body; // Extract `jntuno` from request body

  try {
    // Check if student exists
    const checkStudentQuery = `SELECT * FROM students WHERE jntuno = ?`;
    const [student] = await connection.execute(checkStudentQuery, [jntuno]);

    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if feedback is already submitted
    const feedbackSubmitted = student[0].feedback_submitted;

    if (feedbackSubmitted) {
      // Return true if feedback is already submitted
      return res.status(200).json({ feedback_submitted: true });
    } else {
      // Return false if feedback is not submitted, without updating the database
      return res.status(200).json({ feedback_submitted: false });
    }
  } catch (err) {
    console.error('Error during final submission:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/submitfeedback', AuthRoute, async (req, res) => {
  const { jntuno } = req.body;

  try {
    // Check if the student exists
    const checkStudentQuery = `SELECT * FROM students WHERE jntuno = ?`;
    const [student] = await connection.execute(checkStudentQuery, [jntuno]);

    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Update feedbacksubmitted column to 1
    const updateFeedbackQuery = `UPDATE students SET feedback_submitted = 1 WHERE jntuno = ?`;
    await connection.execute(updateFeedbackQuery, [jntuno]);

    return res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('Error during final submission:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//fetching oe subjects
router.get('/fetchopenelectives/:semesternumber/:branchcode', AuthRoute, async (req, res) => {
  const { semesternumber, branchcode } = req.params;

  try {
    // Validate input parameters
    if (!semesternumber || !branchcode) {
      return res.status(400).json({ error: 'Semester number and branch code are required' });
    }

    // Fetch open elective subjects for the given semester and branch
    const fetchOpenElectivesQuery = `
      SELECT * FROM subjects
      WHERE semesternumber = ? AND branchcode = ? AND subjecttype = 'openelective'
    `;
    const [openElectives] = await connection.execute(fetchOpenElectivesQuery, [semesternumber, branchcode]);

    if (openElectives.length === 0) {
      return res.status(404).json({ error: 'No open electives found for this semester and branch' });
    }

    // Return the open electives subjects
    return res.status(200).json({ openElectives });
  } catch (err) {
    console.error('Error fetching open electives:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});




export default router;
