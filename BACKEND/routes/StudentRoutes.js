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

router.get('/subjects/:semesternumber/:branchcode/:jntuno', AuthRoute, async (req, res) => {
  const { semesternumber, branchcode, jntuno } = req.params;

  if (!jntuno || jntuno.length < 2) {
    return res.status(400).json({ error: 'Invalid jntuno format' });
  }

  // Extract the first two digits of jntuno
  const yearPrefix = parseInt(jntuno.substring(0, 2), 10);
  const regulation = yearPrefix < 23 ? 'AR21' : 'AR23';

  const query = `
    SELECT * FROM subjects 
    WHERE semesternumber = ? AND branchcode = ? AND regulation = ?`;

  try {
    const [subjects] = await connection.execute(query, [semesternumber, branchcode, regulation]);
    res.status(200).json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// router.get('/subjects/:branchcode/:jntuno', AuthRoute, async (req, res) => {
//   const { branchcode, jntuno } = req.params;
//   let { semesternumber } = req.query; // Use query params for semesternumber

//   if (!jntuno || jntuno.length < 2) {
//     return res.status(400).json({ error: 'Invalid jntuno format' });
//   }

//   try {
//     let semester = semesternumber;
//     let regulation;

//     if (!semester) {
//       // Fetch semester number and regulation from students table
//       const studentQuery = `SELECT semesternumber, regulation FROM students WHERE jntuno = ? AND branchcode = ?`;
//       const [studentResult] = await connection.execute(studentQuery, [jntuno, branchcode]);

//       if (studentResult.length === 0) {
//         return res.status(404).json({ error: 'Student not found' });
//       }

//       semester = studentResult[0].semesternumber;
//       regulation = studentResult[0].regulation;
//     } else {
//       // Determine regulation based on jntuno if semester is provided
//       const yearPrefix = parseInt(jntuno.substring(0, 2), 10);
//       regulation = yearPrefix < 23 ? 'AR21' : 'AR23';
//     }

//     // Fetch subjects based on semester, branchcode, and regulation
//     const subjectQuery = `SELECT * FROM subjects WHERE semesternumber = ? AND branchcode = ? AND regulation = ?`;
//     const [subjects] = await connection.execute(subjectQuery, [semester, branchcode, regulation]);

//     res.status(200).json(subjects);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'An error occurred' });
//   }
// });


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

//getting the oesubjects
router.get('/oesubjects/:jntuno', AuthRoute, async (req, res) => {
  const { jntuno } = req.params;

  if (!jntuno || jntuno.length < 2) {
      return res.status(400).json({ error: 'Invalid jntuno format' });
  }

  try {
      // Step 1: Fetch oesubjects JSON array, branchcode, and semesternumber from students table
      const studentQuery = `SELECT oesubjects, branchcode, semesternumber FROM students WHERE jntuno = ?`;
      const [studentRows] = await connection.execute(studentQuery, [jntuno]);

      if (studentRows.length === 0) {
          return res.status(404).json({ error: 'Student not found' });
      }

      let { oesubjects, branchcode, semesternumber } = studentRows[0];

      if (!oesubjects) {
          return res.status(200).json({ message: 'No OE subjects found for this student', subjects: [] });
      }

      let subjectCodes;
      try {
          // Ensure oesubjects is an array (MySQL may return it as a string)
          subjectCodes = typeof oesubjects === 'string' ? JSON.parse(oesubjects) : oesubjects;
          console.log(subjectCodes);
      } catch (jsonError) {
          return res.status(500).json({ 
              error: `Data format error: Unable to parse OE subjects for student ${jntuno}.`,
              details: jsonError.message,
              stored_value: oesubjects
          });
      }

      if (!Array.isArray(subjectCodes) || subjectCodes.length === 0) {
          return res.status(200).json({ message: 'No OE subjects assigned', subjects: [] });
      }

      // Step 3: Determine regulation based on jntuno
      const yearPrefix = parseInt(jntuno.substring(0, 2), 10);
      const regulation = yearPrefix < 23 ? 'AR21' : 'AR23';

      // Step 4: Fetch full subject details from subjects table using subjectcode, branchcode, semesternumber, and regulation
      const placeholders = subjectCodes.map(() => '?').join(','); // Generate (?, ?, ?) dynamically
      
      const subjectQuery = `
          SELECT * FROM subjects 
          WHERE subjectcode IN (${placeholders}) 
          AND branchcode = ? 
          AND semesternumber = ? 
          AND regulation = ?
      `;

      const [subjects] = await connection.execute(subjectQuery, [...subjectCodes, branchcode, semesternumber, regulation]);

      res.status(200).json({ jntuno, subjects });

  } catch (err) {
      console.error('Error fetching OE subjects:', err);
      res.status(500).json({ error: 'An error occurred while fetching OE subjects', details: err.message });
  }
});

//electives 

router.get('/electivesubjects/:jntuno',AuthRoute, async (req, res) => {
  const { jntuno } = req.params;

  if (!jntuno || jntuno.length < 2) {
    return res.status(400).json({ error: 'Invalid jntuno format' });
  }

  try {
    // Step 1: Fetch oesubjects, professionalelective, and branchcode from students table
    const studentQuery = `SELECT oesubjects, professionalelective, branchcode FROM students WHERE jntuno = ?`;
    const [studentRows] = await connection.execute(studentQuery, [jntuno]);

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let { oesubjects, professionalelective, branchcode } = studentRows[0];

    const parseJSON = (data) => {
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        return [];
      }
    };

    const oeSubjects = parseJSON(oesubjects) || [];
    const peSubjects = parseJSON(professionalelective) || [];

    if (oeSubjects.length === 0 && peSubjects.length === 0) {
      return res.status(200).json({ message: 'No subjects found for this student', oesubjects: [], professionalelectives: [] });
    }

    // Step 2: Fetch full subject details for both OEs and PEs based on branchcode
    const allSubjectCodes = [...oeSubjects, ...peSubjects];

    if (allSubjectCodes.length === 0) {
      return res.status(200).json({ oesubjects: [], professionalelectives: [] });
    }

    const placeholders = allSubjectCodes.map(() => '?').join(',');

    const subjectQuery = `
      SELECT * FROM subjects 
      WHERE subjectcode IN (${placeholders}) AND branchcode = ?
    `;

    const [subjects] = await connection.execute(subjectQuery, [...allSubjectCodes, branchcode]);

    // Separate the subjects into OEs and PEs
    const oeSubjectDetails = subjects.filter(sub => oeSubjects.includes(sub.subjectcode));
    const peSubjectDetails = subjects.filter(sub => peSubjects.includes(sub.subjectcode));

    res.status(200).json({ jntuno, oesubjects: oeSubjectDetails, professionalelectives: peSubjectDetails });

  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'An error occurred while fetching subjects', details: err.message });
  }
});


//fetching semester wise subjects  

const semesterMapping = {
  '1': 'semesterone',
  '2': 'semestertwo',
  '3': 'semesterthree',
  '4': 'semesterfour',
  '5': 'semesterfive',
  '6': 'semestersix',
  '7': 'semesterseven',
  '8': 'semestereight',
};

router.get('/semesterwise-subjects/:jntuno/:semesternumber', AuthRoute, async (req, res) => {
  const { jntuno, semesternumber } = req.params;

  if (!jntuno || jntuno.length < 2) {
    return res.status(400).json({ error: 'Invalid jntuno format' });
  }

  const semesterField = semesterMapping[semesternumber];

  if (!semesterField) {
    return res.status(400).json({ error: 'Invalid semester number' });
  }

  try {
    // Fetch semester subjects and branchcode for the given student
    const studentQuery = `SELECT ${semesterField} AS subjects, branchcode FROM students WHERE jntuno = ?`;
    const [studentRows] = await connection.execute(studentQuery, [jntuno]);

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const semesterSubjects = studentRows[0].subjects || [];
    const branchcode = studentRows[0].branchcode;

    if (semesterSubjects.length === 0) {
      return res.status(200).json({ message: 'No subjects found for this semester', subjects: [] });
    }

    // Fetch subject details from subjects table with semester number included
    const placeholders = semesterSubjects.map(() => '?').join(',');
    const subjectQuery = `
      SELECT * FROM subjects 
      WHERE subjectcode IN (${placeholders}) 
      AND branchcode = ? 
      AND semesternumber = ?`;

    const [subjectDetails] = await connection.execute(subjectQuery, [...semesterSubjects, branchcode, semesternumber]);

    // Find missing subject codes
    const foundSubjectCodes = subjectDetails.map((sub) => sub.subjectcode);
    console.log(foundSubjectCodes);
    const missingSubjects = semesterSubjects.filter((code) => !foundSubjectCodes.includes(code));
    console.log(missingSubjects);

    if (missingSubjects.length > 0) {
      // Fetch missing elective subjects
      const electivePlaceholders = missingSubjects.map(() => '?').join(',');
      const electiveQuery = `
        SELECT * FROM subjects 
        WHERE subjectcode IN (${electivePlaceholders}) 
        AND subjecttype = 'elective' 
        `;

      const [electiveSubjects] = await connection.execute(electiveQuery, [...missingSubjects]);

      // Merge elective subjects into the final list
      subjectDetails.push(...electiveSubjects);
    }

    res.status(200).json({ jntuno, semesternumber, subjects: subjectDetails });
  } catch (err) {
    console.error('Error fetching semester-wise subjects:', err);
    res.status(500).json({ error: 'An error occurred while fetching subjects', details: err.message });
  }
});



export default router;
