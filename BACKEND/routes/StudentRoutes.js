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


// router.post("/addstudents", upload.single("file"), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: "No file uploaded" });
//   }

//   const filePath = req.file.path;

//   try {
//     // Read the Excel file from the disk
//     const workbook = xlsx.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];
//     const data = xlsx.utils.sheet_to_json(sheet);

//     // Iterate through the data array and insert each student into the database
//     for (const student of data) {
//       const { jntuno, name, semesternumber, branchcode } = student;

//       // Validate required fields
//       if (!jntuno || !name || !semesternumber || !branchcode) {
//         return res
//           .status(400)
//           .json({ error: `Invalid data in row: ${JSON.stringify(student)}` });
//       }

//       // Check for duplicate jntuno
//       const checkQuery = `SELECT * FROM students WHERE jntuno = ?`;
//       const [existingStudent] = await connection.query(checkQuery, [jntuno]);

//       if (existingStudent.length > 0) {
//         console.log(`Duplicate student skipped: ${jntuno}`);
//         continue; // Skip adding this record
//       }

//       // Insert the student into the database
//       const insertQuery = `
//         INSERT INTO students (jntuno, name, semesternumber, branchcode)
//         VALUES (?, ?, ?, ?)
//       `;

//       await connection.query(insertQuery, [
//         jntuno,
//         name,
//         semesternumber,
//         branchcode,
//       ]);
//     }

//     // Delete the file after processing
//     fs.unlinkSync(filePath);

//     res.status(200).json({ message: "Students added successfully" });
//   } catch (error) {
//     console.error("Error adding students:", error);

//     // Delete the file in case of an error
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }

//     res.status(500).json({ error: "Error adding students", details: error.message });
//   }
// });

router.post('/addstudents', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;

  try {
    // Read the Excel file from the disk
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const duplicateEntries = [];
    const addedEntries = [];

    // Iterate through the data array and insert each student into the database
    for (const student of data) {
      const { jntuno, name, semesternumber, branchcode } = student;

      // Validate required fields
      if (!jntuno || !name || !semesternumber || !branchcode) {
        return res
          .status(400)
          .json({ error: `Invalid data in row: ${JSON.stringify(student)}` });
      }

      // Check for duplicate jntuno
      const checkQuery = `SELECT * FROM students WHERE jntuno = ?`;
      const [existingStudent] = await connection.query(checkQuery, [jntuno]);

      if (existingStudent.length > 0) {
        duplicateEntries.push(jntuno); // Track duplicates
        continue; // Skip adding this record
      }

      // Insert the student into the database
      const insertQuery = `
        INSERT INTO students (jntuno, name, semesternumber, branchcode)
        VALUES (?, ?, ?, ?)
      `;
      await connection.query(insertQuery, [jntuno, name, semesternumber, branchcode]);
      addedEntries.push(jntuno); // Track added entries
    }

    // Delete the file after processing
    fs.unlinkSync(filePath);

    res.status(200).json({
      message: 'Bulk upload completed',
      addedEntries,
      duplicateEntries,
    });
  } catch (error) {
    console.error('Error adding students:', error);

    // Delete the file in case of an error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({ error: 'Error adding students', details: error.message });
  }
});

//routes for giving ratings 

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


export default router;
