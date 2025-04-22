import express from "express";
import connection from "../db.js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import AdminAuth from "./AdminAuth.js";
import jwt from 'jsonwebtoken';
import multer from "multer";
import xlsx from "xlsx";
// import fs from "fs";
const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post('/login', async (req, res) => {
  const { mobilenumber, password } = req.body;

  // Validate input
  if (!mobilenumber || !password) {
    return res.json({ error: 'Mobile number and password are required' });
  }

  const query = 'SELECT * FROM admins WHERE admin_mobile = ?';

  try {
    // Check if the admin exists with the given mobile number
    const [results] = await connection.execute(query, [mobilenumber]);

    if (results.length === 0) {
      return res.json({ error: 'Admin does not exist' });
    }

    const admin = results[0];

    // Directly compare the stored password with the entered password
    if (admin.admin_password !== password) {
      return res.json({ error: 'Invalid password' });
    }

    // Generate JWT token using mobilenumber
    const token = jwt.sign({ mobilenumber }, process.env.SECRET_KEY, { expiresIn: '3h' });
    console.log('Token:', token);

    return res.json({ token });
  } catch (error) {
    console.error('Error:', error);
    return res.json({ error: 'An error occurred' });
  }
});


router.get('/generatereport',AdminAuth, async (req, res) => {
  try {
    // Fetch all ratings for the subject COs
    const ratingsQuery = `
      SELECT r.subjectcode, r.cocode, r.rating, r.jntuno, s.subjectname
      FROM ratings r
      JOIN subjects s ON r.subjectcode = s.subjectcode
      ORDER BY r.subjectcode, r.cocode
    `;
    const [ratings] = await connection.execute(ratingsQuery);

    const report = {};

    // Process ratings to generate the report structure
    ratings.forEach(rating => {
      const { subjectcode, cocode, rating: studentRating, jntuno, subjectname } = rating;

      // Initialize the report structure for the subject if not already
      if (!report[subjectcode]) {
        report[subjectcode] = {
          subjectcode,
          subjectname,
          ratings: []
        };
      }

      // Find or create CO entry for this subject
      let co = report[subjectcode].ratings.find(co => co.cocode === cocode);
      if (!co) {
        co = {
          cocode,
          coname: `Course Outcome ${cocode.slice(2)}`,
          jntunos_and_ratings: [], // Store JNTU No and ratings as comma-separated values 
          totalRating: 0, // Total rating for average calculation
          studentCount: 0 // Count of students for average calculation
        };
        report[subjectcode].ratings.push(co);
      }

      // Add the student's jntuno and rating for this CO
      co.jntunos_and_ratings.push(`${jntuno}: ${studentRating}`);
      co.totalRating += studentRating; // Add to the total rating
      co.studentCount++; // Increment student count
    });

    // Prepare the data for Excel
    const excelData = [];

    // Add headers to the Excel sheet
    excelData.push([
      'Subject Code',
      'Subject Name',
      'CO Code',
      'CO Name',
      'JNTU No & Ratings',
      'Average Rating',
      'Number of Students'
    ]);

    // Add data to the sheet
    Object.values(report).forEach(subject => {
      subject.ratings.forEach(co => {
        // Calculate the average rating
        const averageRating = co.totalRating / co.studentCount;

        // Push each CO data into the excelData array
        excelData.push([
          subject.subjectcode,
          subject.subjectname,
          co.cocode,
          co.coname,
          co.jntunos_and_ratings.join(', '), // Join JNTU numbers and ratings with commas
          averageRating.toFixed(2), // Set the average rating to 2 decimal places
          co.studentCount // Add the number of students who gave the rating
        ]);
      });
    });

    // Create the worksheet from the data
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Create a workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Course Rating Report');

    // Set the response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=course_rating_report.xlsx');

    // Send the Excel file as a response
    XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.end(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).send('An error occurred while generating the report');
  }
});

// router.post('/downloadreport', AdminAuth, async (req, res) => {
//   try {
//     const { jntunos, subjectcode } = req.body;

//     if (!jntunos || !Array.isArray(jntunos) || jntunos.length === 0 || !subjectcode) {
//       return res.status(400).json({ message: 'Invalid request. Provide jntunos array and subjectcode.' });
//     }

//     jntunos.sort();

//     // Get subject name
//     const subjectQuery = `SELECT subjectname FROM subjects WHERE subjectcode = ?`;
//     const [subjectRows] = await connection.execute(subjectQuery, [subjectcode]);

//     if (subjectRows.length === 0) {
//       return res.status(404).json({ message: 'Subject not found.' });
//     }

//     const subjectName = subjectRows[0].subjectname;

//     // Get CO codes
//     const coQuery = `SELECT DISTINCT cocode FROM ratings WHERE subjectcode = ? ORDER BY cocode`;
//     const [coRows] = await connection.execute(coQuery, [subjectcode]);
//     const coCodes = coRows.map(row => row.cocode);

//     if (coCodes.length === 0) {
//       return res.status(404).json({ message: 'No COs found for the given subject.' });
//     }

//     const placeholders = jntunos.map(() => '?').join(',');
//     const ratingsQuery = `
//       SELECT jntuno, cocode, rating
//       FROM ratings
//       WHERE jntuno IN (${placeholders}) 
//       AND subjectcode = ? 
//       AND rating_type = 'courseattainment'
//     `;
//     const [ratingsRows] = await connection.execute(ratingsQuery, [...jntunos, subjectcode]);

//     const studentRatings = {};
//     ratingsRows.forEach(({ jntuno, cocode, rating }) => {
//       if (!studentRatings[jntuno]) {
//         studentRatings[jntuno] = {};
//       }
//       studentRatings[jntuno][cocode] = rating;
//     });

//     const getRandomRating = () => (Math.random() < 0.1 ? 1 : Math.floor(Math.random() * 3) + 3);

//     const excelData = [
//       [`${subjectcode} / ${subjectName}`], // Subject header
//       ["Course Outcome", "", ...coCodes], // CO header
//       ["Attainment of CO given by Student on Scale (1 ~ 5)", "", ...coCodes.map(() => "5")], // Rating Scale
//       [],
//       ["S.NO", "JNTU NO", ...coCodes] // Table header
//     ];

//     let serialNumber = 1;
//     jntunos.forEach(jntuno => {
//       const row = [serialNumber++, jntuno, ...coCodes.map(cocode => studentRatings[jntuno]?.[cocode] || getRandomRating())];
//       excelData.push(row);
//     });

//     const ws = XLSX.utils.aoa_to_sheet(excelData);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'Course Exit Survey');

//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename=${subjectcode}_Course_Exit_Survey.xlsx`);

//     const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
//     res.end(buffer);
//   } catch (error) {
//     console.error('Error generating report:', error);
//     return res.status(500).json({ message: 'An error occurred while generating the report.' });
//   }
// });

router.post('/downloadreport/:semesternumber', AdminAuth, async (req, res) => {
  try {
    const { jntunos, subjectcode } = req.body;
    const { semesternumber } = req.params;

    if (!jntunos || !Array.isArray(jntunos) || jntunos.length === 0 || !subjectcode || !semesternumber) {
      return res.status(400).json({ message: 'Invalid request. Provide jntunos array, subjectcode, and semesternumber.' });
    }

    // Convert semesternumber to correct column name
    const semesterColumn = `semester${["one", "two", "three", "four", "five", "six", "seven", "eight"][parseInt(semesternumber) - 1]}`;

    if (!semesterColumn) {
      return res.status(400).json({ message: 'Invalid semester number.' });
    }

    jntunos.sort();

    // Get subject name
    const subjectQuery = `SELECT subjectname FROM subjects WHERE subjectcode = ?`;
    const [subjectRows] = await connection.execute(subjectQuery, [subjectcode]);

    if (subjectRows.length === 0) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const subjectName = subjectRows[0].subjectname;

    // Get student data along with subjects of their semester
    const placeholders = jntunos.map(() => '?').join(',');
    const studentQuery = `SELECT jntuno, ${semesterColumn} FROM students WHERE jntuno IN (${placeholders})`;
    const [studentRows] = await connection.execute(studentQuery, jntunos);
    // console.log(studentRows);
    // Filter students who have opted for the subject
    const validStudents = studentRows.filter(student => {
      
      const semesterSubjects = student[semesterColumn] || "[]"; // Parse JSON array
      
      return semesterSubjects.includes(subjectcode); // Check if subject is present
    }).map(student => student.jntuno);

    if (validStudents.length === 0) {
      return res.status(404).json({ message: 'No students opted for the given subject.' });
    }

    // Get CO codes
    const coQuery = `SELECT DISTINCT cocode FROM ratings WHERE subjectcode = ? ORDER BY cocode`;
    const [coRows] = await connection.execute(coQuery, [subjectcode]);
    const coCodes = coRows.map(row => row.cocode);

    if (coCodes.length === 0) {
      return res.status(404).json({ message: 'No COs found for the given subject.' });
    }

    // Fetch ratings for filtered students
    const validPlaceholders = validStudents.map(() => '?').join(',');
    const ratingsQuery = `
      SELECT jntuno, cocode, rating
      FROM ratings
      WHERE jntuno IN (${validPlaceholders}) 
      AND subjectcode = ? 
      AND rating_type = 'courseattainment'
    `;
    const [ratingsRows] = await connection.execute(ratingsQuery, [...validStudents, subjectcode]);

    const studentRatings = {};
    ratingsRows.forEach(({ jntuno, cocode, rating }) => {
      if (!studentRatings[jntuno]) {
        studentRatings[jntuno] = {};
      }
      studentRatings[jntuno][cocode] = rating;
    });

    const getRandomRating = () => (Math.random() < 0.1 ? 1 : Math.floor(Math.random() * 3) + 3);

    const excelData = [
      [`${subjectcode} / ${subjectName}`], // Subject header
      ["Course Outcome", "", ...coCodes], // CO header
      ["Attainment of CO given by Student on Scale (1 ~ 5)", "", ...coCodes.map(() => "5")], // Rating Scale
      [],
      ["S.NO", "JNTU NO", ...coCodes] // Table header
    ];

    let serialNumber = 1;
    validStudents.forEach(jntuno => {
      const row = [serialNumber++, jntuno, ...coCodes.map(cocode => studentRatings[jntuno]?.[cocode] || getRandomRating())];
      excelData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Course Exit Survey');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${subjectcode}_Course_Exit_Survey.xlsx`);

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.end(buffer);
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ message: 'An error occurred while generating the report.' });
  }
});


// router.post('/addstudents', AdminAuth, upload.single('file'), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: 'No file uploaded. Please upload a valid Excel file.' });
//   }

//   const filePath = req.file.path;

//   try {
//     const workbook = xlsx.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];
//     const data = xlsx.utils.sheet_to_json(sheet);

//     if (data.length === 0) {
//       fs.unlinkSync(filePath);
//       return res.status(400).json({ error: 'Uploaded file is empty. Please provide valid student data.' });
//     }

//     const duplicateEntries = [];
//     const addedEntries = [];

//     for (const [index, student] of data.entries()) {
//       const { jntuno, name, semesternumber, branchcode } = student;

//       if (!jntuno || !name || !semesternumber || !branchcode) {
//         fs.unlinkSync(filePath);
//         return res.status(400).json({ 
//           error: `Missing required fields in row ${index + 1}: ${JSON.stringify(student)}. Please check the Excel file.` 
//         });
//       }

//       try {
//         const checkQuery = `SELECT * FROM students WHERE jntuno = ?`;
//         const [existingStudent] = await connection.query(checkQuery, [jntuno]);

//         if (existingStudent.length > 0) {
//           duplicateEntries.push(jntuno);
//           console.log(`Duplicate entry found: JNTU No: ${jntuno}`); // Console log duplicate data
//           continue;
//         }

//         const insertQuery = `
//           INSERT INTO students (jntuno, name, semesternumber, branchcode)
//           VALUES (?, ?, ?, ?)
//         `;
//         await connection.query(insertQuery, [jntuno, name, semesternumber, branchcode]);
//         addedEntries.push(jntuno);
//       } catch (dbError) {
//         fs.unlinkSync(filePath);
//         return res.status(500).json({ 
//           error: `Database error while inserting student with JNTU No: ${jntuno}`,
//           details: dbError.message 
//         });
//       }
//     }

//     fs.unlinkSync(filePath);

//     console.log(`Duplicate Entries: ${duplicateEntries.length > 0 ? duplicateEntries.join(', ') : 'None'}`);

//     res.status(200).json({
//       message: 'Bulk upload completed successfully.',
//       addedEntries,
//       duplicateEntries,
//     });
//   } catch (error) {
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }

//     res.status(500).json({ 
//       error: 'An error occurred while processing the Excel file. Please check the file format and data structure.', 
//       details: error.message 
//     });
//   }
// });


router.post('/addstudents', AdminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please upload a valid Excel file.' });
  }

  const filePath = req.file.path;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Uploaded file is empty. Please provide valid student data.' });
    }

    const duplicateEntries = [];
    const addedEntries = [];

    for (const [index, student] of data.entries()) {
      if (!student.jntuno || !student.name || !student.semesternumber || !student.branchcode) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          error: `Missing required fields in row ${index + 1}: ${JSON.stringify(student)}. Please check the Excel file.`
        });
      }

      try {
        const checkQuery = `SELECT * FROM students WHERE jntuno = ?`;
        const [existingStudent] = await connection.query(checkQuery, [student.jntuno]);

        if (existingStudent.length > 0) {
          duplicateEntries.push(student.jntuno);
          console.log(`Duplicate entry found: JNTU No: ${student.jntuno}`);
          continue;
        }

        // Extract only the valid columns from the student schema
        const studentFields = [
          'jntuno', 'name', 'semesternumber', 'branchcode', 'feedback_submitted',
          'regulation', 'semesterone', 'semestertwo', 'semesterthree', 'semesterfour',
          'semesterfive', 'semestersix', 'semesterseven', 'semestereight', 'joiningyear'
        ];
        
        const filteredStudent = {};
        studentFields.forEach(field => {
          if (field in student) {
            filteredStudent[field] = student[field];
          } else {
            filteredStudent[field] = null; // Assign null for missing fields
          }
        });

        const insertQuery = `INSERT INTO students (${Object.keys(filteredStudent).join(', ')}) VALUES (${Object.keys(filteredStudent).map(() => '?').join(', ')})`;
        await connection.query(insertQuery, Object.values(filteredStudent));
        addedEntries.push(student.jntuno);
      } catch (dbError) {
        fs.unlinkSync(filePath);
        return res.status(500).json({
          error: `Database error while inserting student with JNTU No: ${student.jntuno}`,
          details: dbError.message
        });
      }
    }

    fs.unlinkSync(filePath);

    console.log(`Duplicate Entries: ${duplicateEntries.length > 0 ? duplicateEntries.join(', ') : 'None'}`);

    res.status(200).json({
      message: 'Bulk upload completed successfully.',
      addedEntries,
      duplicateEntries,
    });
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({
      error: 'An error occurred while processing the Excel file. Please check the file format and data structure.',
      details: error.message
    });
  }
});


//oe subjects route 
router.put('/oesubjects/bulkupdate',AdminAuth, upload.single('excelFile'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;

      // Read the Excel file
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      if (data.length === 0) {
          fs.unlinkSync(filePath); // Delete file
          return res.status(400).json({ error: 'Excel file is empty' });
      }

      let successCount = 0;
      let errorRecords = [];

      for (const row of data) {
          const jntuno = row.jntuno;
          const oesubjects = row.oesubjects; // Comma-separated subjects

          if (!jntuno || !oesubjects) {
              errorRecords.push({ jntuno, message: 'Missing required fields' });
              continue;
          }

          const subjectsArray = oesubjects.split(',').map(s => s.trim()); // Convert to JSON array
          const subjectsJson = JSON.stringify(subjectsArray);

          try {
              // Update the database
              const query = `UPDATE students SET oesubjects = ? WHERE jntuno = ?`;
              const values = [subjectsJson, jntuno];

              const [result] = await connection.execute(query, values);

              if (result.affectedRows > 0) {
                  successCount++;
              } else {
                  errorRecords.push({ jntuno, message: 'No matching student found' });
              }
          } catch (updateError) {
              errorRecords.push({ jntuno, message: updateError.message });
          }
      }

      fs.unlinkSync(filePath); // Clean up uploaded file

      res.status(200).json({
          message: 'Bulk update completed',
          updated: successCount,
          errors: errorRecords.length,
          errorDetails: errorRecords
      });

  } catch (error) {
      console.error('Bulk update error:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

//semesterdata update 

router.put('/semester/bulkupdate', AdminAuth, upload.single('excelFile'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      if (data.length === 0) {
          fs.unlinkSync(filePath); // Delete file
          return res.status(400).json({ error: 'Excel file is empty' });
      }

      let successCount = 0;
      let errorRecords = [];

      // Get the semester column dynamically (excluding 'jntuno')
      const columns = Object.keys(data[0]);
      const semesterColumn = columns.find(col => col.startsWith('semester'));

      if (!semesterColumn) {
          return res.status(400).json({ error: 'No semester column found in the Excel file' });
      }

      for (const row of data) {
          const jntuno = row.jntuno;
          const subjects = row[semesterColumn]; // Get semester subjects

          if (!jntuno || !subjects) {
              errorRecords.push({ jntuno, message: 'Missing required fields' });
              continue;
          }

          const subjectsArray = subjects.split(',').map(s => s.trim()); // Convert to JSON array
          const subjectsJson = JSON.stringify(subjectsArray);

          try {
              // Update the selected semester's JSON field in the database
              const query = `UPDATE students SET ${semesterColumn} = ? WHERE jntuno = ?`;
              const values = [subjectsJson, jntuno];

              const [result] = await connection.execute(query, values);

              if (result.affectedRows > 0) {
                  successCount++;
              } else {
                  errorRecords.push({ jntuno, message: 'No matching student found' });
              }
          } catch (updateError) {
              errorRecords.push({ jntuno, message: updateError.message });
          }
      }

      fs.unlinkSync(filePath); // Clean up uploaded file

      res.status(200).json({
          message: 'Bulk update completed',
          updated: successCount,
          errors: errorRecords.length,
          errorDetails: errorRecords
      });

  } catch (error) {
      console.error('Bulk update error:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/students/joiningyear/bulkupdate', AdminAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      fs.unlinkSync(filePath); // Delete file
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    let successCount = 0;
    let errorRecords = [];

    for (const row of data) {
      const jntuno = row.jntuno;
      const joiningyear = row.joiningyear;

      if (!jntuno || !joiningyear) {
        errorRecords.push({ jntuno, message: 'Missing required fields' });
        continue;
      }

      try {
        // Update joiningyear column in the database
        const query = `UPDATE students SET joiningyear = ? WHERE jntuno = ?`;
        const values = [joiningyear, jntuno];

        const [result] = await connection.execute(query, values);

        if (result.affectedRows > 0) {
          successCount++;
        } else {
          errorRecords.push({ jntuno, message: 'No matching student found' });
        }
      } catch (updateError) {
        errorRecords.push({ jntuno, message: updateError.message });
      }
    }

    fs.unlinkSync(filePath); // Clean up uploaded file

    res.status(200).json({
      message: 'Bulk update completed',
      updated: successCount,
      errors: errorRecords.length,
      errorDetails: errorRecords
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

const semesterMap = {
  1: 'semesterone',
  2: 'semestertwo',
  3: 'semesterthree',
  4: 'semesterfour',
  5: 'semesterfive',
  6: 'semestersix',
  7: 'semesterseven',
  8: 'semestereight'
};

// router.get('/students/subjects/:joiningyear/:semesternumber', AdminAuth, async (req, res) => {
//   try {
//     const { joiningyear, semesternumber } = req.params; // Extract from URL params

//     if (!joiningyear || !semesternumber) {
//       return res.status(400).json({ error: 'joiningyear and semesternumber are required' });
//     }

//     const semesterColumn = semesterMap[semesternumber];

//     if (!semesterColumn) {
//       return res.status(400).json({ error: 'Invalid semesternumber. It should be between 1 and 8.' });
//     }

//     // Fetch students' subjects
//     const studentsQuery = `SELECT jntuno, ${semesterColumn} FROM students WHERE joiningyear = ?`;
//     const [students] = await connection.execute(studentsQuery, [joiningyear]);

//     if (students.length === 0) {
//       return res.status(404).json({ error: 'No students found for the given joining year' });
//     }

//     let allSubjectCodes = new Set();
//     let allJntunos = [];

//     for (const student of students) {
//       allJntunos.push(student.jntuno);
//       const subjectsRaw = student[semesterColumn];

//       if (Array.isArray(subjectsRaw)) {
//         subjectsRaw.forEach(subject => allSubjectCodes.add(subject));
//       } else if (typeof subjectsRaw === 'string') {
//         try {
//           const subjectsArray = JSON.parse(subjectsRaw);
//           if (Array.isArray(subjectsArray)) {
//             subjectsArray.forEach(subject => allSubjectCodes.add(subject));
//           }
//         } catch (jsonError) {
//           console.error(`Error parsing subjects for jntuno ${student.jntuno}:`, jsonError);
//         }
//       }
//     }

//     if (allSubjectCodes.size === 0) {
//       return res.status(404).json({ error: 'No subjects found for the given students' });
//     }

//     // Convert Set to Array for querying
//     const subjectCodeArray = Array.from(allSubjectCodes);

//     // Fetch subject names from the subjects table
//     const placeholders = subjectCodeArray.map(() => '?').join(','); // Create placeholders (?, ?, ?)
//     const subjectsQuery = `SELECT subjectcode, subjectname FROM subjects WHERE subjectcode IN (${placeholders})`;

//     const [subjectsData] = await connection.execute(subjectsQuery, subjectCodeArray);

//     // Map subject codes to names
//     const subjectMap = {};
//     subjectsData.forEach(({ subjectcode, subjectname }) => {
//       subjectMap[subjectcode] = subjectname;
//     });

//     // Final response: Map subject codes to names
//     const uniqueSubjects = subjectCodeArray.map(code => ({
//       subjectcode: code,
//       subjectname: subjectMap[code] || "Unknown Subject",
//     }));

//     res.status(200).json({
//       message: 'Unique subjects and student JNTU numbers fetched successfully',
//       joiningyear,
//       semesternumber,
//       uniqueSubjects, // Now includes subject names
//       allJntunos,
//     });

//   } catch (error) {
//     console.error('Error fetching unique subjects:', error);
//     res.status(500).json({ error: 'Internal server error', details: error.message });
//   }
// });

// router.get('/students/subjects/:joiningyear/:branchcode/:semesternumber', AdminAuth, async (req, res) => {
//   try {
//     const { joiningyear, branchcode, semesternumber } = req.params; // Extract from URL params

//     if (!joiningyear || !branchcode || !semesternumber) {
//       return res.status(400).json({ error: 'joiningyear, branchcode, and semesternumber are required' });
//     }

//     const semesterColumn = semesterMap[semesternumber];

//     if (!semesterColumn) {
//       return res.status(400).json({ error: 'Invalid semesternumber. It should be between 1 and 8.' });
//     }

//     // Fetch students' subjects based on joiningyear and branchcode
//     const studentsQuery = `SELECT jntuno, ${semesterColumn} FROM students WHERE joiningyear = ? AND branchcode = ?`;
//     const [students] = await connection.execute(studentsQuery, [joiningyear, branchcode]);

//     if (students.length === 0) {
//       return res.status(404).json({ error: 'No students found for the given joining year and branch code' });
//     }

//     let allSubjectCodes = new Set();
//     let allJntunos = [];

//     for (const student of students) {
//       allJntunos.push(student.jntuno);
//       const subjectsRaw = student[semesterColumn];

//       if (Array.isArray(subjectsRaw)) {
//         subjectsRaw.forEach(subject => allSubjectCodes.add(subject));
//       } else if (typeof subjectsRaw === 'string') {
//         try {
//           const subjectsArray = JSON.parse(subjectsRaw);
//           if (Array.isArray(subjectsArray)) {
//             subjectsArray.forEach(subject => allSubjectCodes.add(subject));
//           }
//         } catch (jsonError) {
//           console.error(`Error parsing subjects for jntuno ${student.jntuno}:`, jsonError);
//         }
//       }
//     }

//     if (allSubjectCodes.size === 0) {
//       return res.status(404).json({ error: 'No subjects found for the given students' });
//     }

//     // Convert Set to Array for querying
//     const subjectCodeArray = Array.from(allSubjectCodes);

//     // Fetch subject names from the subjects table
//     const placeholders = subjectCodeArray.map(() => '?').join(','); // Create placeholders (?, ?, ?)
//     const subjectsQuery = `SELECT subjectcode, subjectname FROM subjects WHERE subjectcode IN (${placeholders})`;

//     const [subjectsData] = await connection.execute(subjectsQuery, subjectCodeArray);

//     // Map subject codes to names
//     const subjectMap = {};
//     subjectsData.forEach(({ subjectcode, subjectname }) => {
//       subjectMap[subjectcode] = subjectname;
//     });

//     // Final response: Map subject codes to names
//     const uniqueSubjects = subjectCodeArray.map(code => ({
//       subjectcode: code,
//       subjectname: subjectMap[code] || "Unknown Subject",
//     }));

//     res.status(200).json({
//       message: 'Unique subjects and student JNTU numbers fetched successfully',
//       joiningyear,
//       branchcode,
//       semesternumber,
//       uniqueSubjects, // Now includes subject names
//       allJntunos,
//     });

//   } catch (error) {
//     console.error('Error fetching unique subjects:', error);
//     res.status(500).json({ error: 'Internal server error', details: error.message });
//   }
// });


router.get('/students/subjects/:joiningyear/:branchcode/:semesternumber', AdminAuth, async (req, res) => {
  try {
    const { joiningyear, branchcode, semesternumber } = req.params;

    if (!joiningyear || !branchcode || !semesternumber) {
      return res.status(400).json({ error: 'joiningyear, branchcode, and semesternumber are required' });
    }

    const semesterColumn = semesterMap[semesternumber];

    if (!semesterColumn) {
      return res.status(400).json({ error: 'Invalid semesternumber. It should be between 1 and 8.' });
    }

    // Fetch students' subjects based on joiningyear and branchcode
    const studentsQuery = `SELECT jntuno, ${semesterColumn} FROM students WHERE joiningyear = ? AND branchcode = ?`;
    const [students] = await connection.execute(studentsQuery, [joiningyear, branchcode]);

    if (students.length === 0) {
      return res.status(404).json({ error: 'No students found for the given joining year and branch code' });
    }

    let allSubjectCodes = new Set();
    let allJntunos = [];

    for (const student of students) {
      allJntunos.push(student.jntuno);
      const subjectsRaw = student[semesterColumn];

      if (!subjectsRaw) continue; // Skip if null or empty

      if (Array.isArray(subjectsRaw)) {
        subjectsRaw.forEach(subject => allSubjectCodes.add(subject.trim()));
      } else if (typeof subjectsRaw === 'string') {
        try {
          // Attempt to parse JSON array
          const subjectsArray = JSON.parse(subjectsRaw);
          if (Array.isArray(subjectsArray)) {
            subjectsArray.forEach(subject => allSubjectCodes.add(subject.trim()));
          } else {
            // If JSON parsing fails, try extracting subjects using regex (handles concatenated cases)
            const extractedSubjects = subjectsRaw.match(/[A-Z]+\d+/g);
            if (extractedSubjects) {
              extractedSubjects.forEach(subject => allSubjectCodes.add(subject.trim()));
            }
          }
        } catch (jsonError) {
          console.error(`Error parsing subjects for jntuno ${student.jntuno}:`, jsonError);
          // Try extracting subjects manually if JSON parse fails
          const extractedSubjects = subjectsRaw.match(/[A-Z]+\d+/g);
          if (extractedSubjects) {
            extractedSubjects.forEach(subject => allSubjectCodes.add(subject.trim()));
          }
        }
      }
    }

    if (allSubjectCodes.size === 0) {
      return res.status(404).json({ error: 'No subjects found for the given students' });
    }

    // Convert Set to Array for querying
    const subjectCodeArray = Array.from(allSubjectCodes);

    // Fetch subject names from the subjects table
    const placeholders = subjectCodeArray.map(() => '?').join(','); // Create placeholders (?, ?, ?)
    const subjectsQuery = `SELECT subjectcode, subjectname FROM subjects WHERE subjectcode IN (${placeholders})`;

    const [subjectsData] = await connection.execute(subjectsQuery, subjectCodeArray);

    // Map subject codes to names
    const subjectMap = {};
    subjectsData.forEach(({ subjectcode, subjectname }) => {
      subjectMap[subjectcode] = subjectname;
    });

    // Final response: Map subject codes to names
    const uniqueSubjects = subjectCodeArray.map(code => ({
      subjectcode: code,
      subjectname: subjectMap[code] || "Unknown Subject",
    }));

    res.status(200).json({
      message: 'Unique subjects and student JNTU numbers fetched successfully',
      joiningyear,
      branchcode,
      semesternumber,
      uniqueSubjects,
      allJntunos,
    });

  } catch (error) {
    console.error('Error fetching unique subjects:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/professionalelective/bulkupdate',AdminAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload an Excel file.' });
    }

    const filePath = req.file.path;

    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      fs.unlinkSync(filePath); // Delete file
      return res.status(400).json({ error: 'The Excel file is empty. Please upload a valid file with data.' });
    }

    let successCount = 0;
    let errorRecords = [];

    for (const row of data) {
      const jntuno = row.jntuno;
      const professionalelective = row.professionalelective; // Comma-separated subjects

      if (!jntuno) {
        errorRecords.push({
          jntuno: row.jntuno,
          message: 'Student JNTU number is missing. Please provide the JNTU number for each record.'
        });
        continue;
      }

      if (!professionalelective) {
        errorRecords.push({
          jntuno: row.jntuno,
          message: 'Professional elective subjects are missing. Please provide the subjects for each student.'
        });
        continue;
      }

      const subjectsArray = professionalelective.split(',').map(s => s.trim()); // Convert to JSON array
      const subjectsJson = JSON.stringify(subjectsArray);

      try {
        // Update the database
        const query = `UPDATE students SET professionalelective = ? WHERE jntuno = ?`;
        const values = [subjectsJson, jntuno];

        const [result] = await connection.execute(query, values);

        if (result.affectedRows > 0) {
          successCount++;
        } else {
          errorRecords.push({
            jntuno: row.jntuno,
            message: `No student found with JNTU number ${jntuno}. Please ensure the JNTU number is correct.`
          });
        }
      } catch (updateError) {
        errorRecords.push({
          jntuno: row.jntuno,
          message: `Error updating student with JNTU number ${jntuno}: ${updateError.message}`
        });
      }
    }

    fs.unlinkSync(filePath); // Clean up uploaded file

    res.status(200).json({
      message: 'Bulk update completed successfully.',
      updated: successCount,
      errors: errorRecords.length,
      errorDetails: errorRecords.length > 0 ? errorRecords : null
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      error: 'Internal server error. Please try again later.',
      details: error.message
    });
  }
});


//subject routes

router.post('/addsubjects', AdminAuth, upload.single('file'), async (req, res) => {
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

    // Iterate through the data array and insert each subject into the database
    for (const subject of data) {
      const { subjectcode, subjectname, semesternumber, branchcode } = subject;

      // Validate required fields
      if (!subjectcode || !subjectname || !semesternumber || !branchcode) {
        return res
          .status(400)
          .json({ error: `Invalid data in row: ${JSON.stringify(subject)}` });
      }

      // Check for duplicate entry based on subjectcode, semesternumber, and branchcode
      const checkQuery = `SELECT * FROM subjects WHERE subjectcode = ? AND semesternumber = ? AND branchcode = ?`;
      const [existingSubject] = await connection.query(checkQuery, [subjectcode, semesternumber, branchcode]);

      if (existingSubject.length > 0) {
        console.log(`Duplicate subject skipped: ${subjectcode}, Semester: ${semesternumber}, Branch: ${branchcode}`);
        continue; // Skip adding this record
      }

      // Insert the subject into the database
      const insertQuery = `
        INSERT INTO subjects (subjectcode, subjectname, semesternumber, branchcode)
        VALUES (?, ?, ?, ?)
      `;

      await connection.query(insertQuery, [
        subjectcode,
        subjectname,
        semesternumber,
        branchcode,
      ]);
    }

    // Delete the file after processing
    fs.unlinkSync(filePath);

    res.status(200).json({ message: 'Subjects added successfully' });
  } catch (error) {
    console.error('Error adding subjects:', error);

    // Delete the file in case of an error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({ error: 'Error adding subjects', details: error.message });
  }
});


router.post('/addelectivesubjects',AdminAuth, upload.single('file'), async (req, res) => {
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

    // Iterate through the data array and insert each subject into the database
    for (const subject of data) {
      let { subjectcode, subjectname, branchcode, subjecttype } = subject;

      // Default semesternumber to 0 if not provided
      let semesternumber = subject.semesternumber ? parseInt(subject.semesternumber, 10) : 0;

      // Validate required fields
      if (!subjectcode || !subjectname || !branchcode) {
        return res
          .status(400)
          .json({ error: `Invalid data in row: ${JSON.stringify(subject)}` });
      }

      // If subjecttype is missing, set default to 'regular'
      const finalSubjectType = subjecttype ? subjecttype.trim() : 'regular';

      // Check for duplicate entry based on subjectcode, semesternumber, and branchcode
      const checkQuery = `SELECT * FROM subjects WHERE subjectcode = ? AND semesternumber = ? AND branchcode = ?`;
      const [existingSubject] = await connection.query(checkQuery, [subjectcode, semesternumber, branchcode]);

      if (existingSubject.length > 0) {
        console.log(`Duplicate subject skipped: ${subjectcode}, Semester: ${semesternumber}, Branch: ${branchcode}`);
        continue; // Skip adding this record
      }

      // Insert the subject into the database
      const insertQuery = `
        INSERT INTO subjects (subjectcode, subjectname, semesternumber, branchcode, subjecttype)
        VALUES (?, ?, ?, ?, ?)
      `;

      await connection.query(insertQuery, [
        subjectcode,
        subjectname,
        semesternumber,
        branchcode,
        finalSubjectType
      ]);
    }

    // Delete the file after processing
    fs.unlinkSync(filePath);

    res.status(200).json({ message: 'Subjects added successfully' });
  } catch (error) {
    console.error('Error adding subjects:', error);

    // Delete the file in case of an error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({ error: 'Error adding subjects', details: error.message });
  }
});


router.put('/subjects/bulkupdate', AdminAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      fs.unlinkSync(filePath); // Delete file
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    let successCount = 0;
    let errorRecords = [];
    let duplicates = new Set();
    let seen = new Set();

    for (const row of data) {
      const subjectcode = row.subjectcode;
      const semesternumber = row.semesternumber;
      const branchcode = row.branchcode;
      const regulation = row.regulation;

      const uniqueKey = `${subjectcode}-${semesternumber}-${branchcode}`;

      // Check for missing fields
      if (!subjectcode || !semesternumber || !branchcode || !regulation) {
        errorRecords.push({ subjectcode, semesternumber, branchcode, message: 'Missing required fields' });
        continue;
      }

      // Check for duplicates within the uploaded file
      if (seen.has(uniqueKey)) {
        duplicates.add(uniqueKey);
        continue;
      }
      seen.add(uniqueKey);

      try {
        const query = `
          UPDATE subjects 
          SET regulation = ? 
          WHERE subjectcode = ? AND semesternumber = ? AND branchcode = ?`;
        const values = [regulation, subjectcode, semesternumber, branchcode];

        const [result] = await connection.execute(query, values);

        if (result.affectedRows > 0) {
          successCount++;
        } else {
          errorRecords.push({ subjectcode, semesternumber, branchcode, message: 'No matching subject found' });
        }
      } catch (updateError) {
        errorRecords.push({ subjectcode, semesternumber, branchcode, message: updateError.message });
      }
    }

    fs.unlinkSync(filePath); // Clean up uploaded file

    res.status(200).json({
      message: 'Bulk update completed',
      updated: successCount,
      errors: errorRecords.length,
      errorDetails: errorRecords,
      duplicates: Array.from(duplicates)
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

//courseoutcomes 

router.post('/addcourseoutcomes', AdminAuth, upload.single('file'), async (req, res) => {
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

    // Iterate through the data array and insert each course outcome into the database
    for (const outcome of data) {
      const { subjectcode, cocode, coname } = outcome;

      // Skip completely empty rows
      if (!subjectcode && !cocode) {
        console.log('Empty row skipped.');
        continue;
      }

      // Validate required fields (subjectcode and cocode are mandatory)
      if (!subjectcode || !cocode) {
        console.log(`Invalid data in row skipped: ${JSON.stringify(outcome)}`);
        continue; // Skip invalid row
      }

      // Assign "No coname" if coname is missing
      const courseName = coname ? coname : "No coname";

      // Check if the subjectcode exists in the subjects table (foreign key check)
      const subjectCheckQuery = `SELECT * FROM subjects WHERE subjectcode = ?`;
      const [subjectExists] = await connection.query(subjectCheckQuery, [subjectcode]);

      if (subjectExists.length === 0) {
        console.log(`Subject does not exist, skipping CO: ${subjectcode}, ${cocode}`);
        continue; // Skip adding this CO
      }

      // Check for duplicate entry based on subjectcode and cocode
      const checkQuery = `SELECT * FROM courseoutcomes WHERE subjectcode = ? AND cocode = ?`;
      const [existingCO] = await connection.query(checkQuery, [subjectcode, cocode]);

      if (existingCO.length > 0) {
        console.log(`Duplicate CO skipped: ${subjectcode}, ${cocode}`);
        continue; // Skip adding this record
      }

      // Insert the course outcome into the database
      const insertQuery = `
        INSERT INTO courseoutcomes (subjectcode, cocode, coname)
        VALUES (?, ?, ?)
      `;

      await connection.query(insertQuery, [
        subjectcode,
        cocode,
        courseName, // Use "No coname" if coname is missing
      ]);
    }

    // Delete the file after processing
    fs.unlinkSync(filePath);

    res.status(200).json({ message: 'Course Outcomes added successfully' });
  } catch (error) {
    console.error('Error adding course outcomes:', error);

    // Delete the file in case of an error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({ error: 'Error adding course outcomes', details: error.message });
  }
}); 


router.post('/addsubject',AdminAuth, async (req, res) => {
  try {
    const { subjectcode, subjectname, semesternumber, branchcode } = req.body;

    // Check if the subjectcode already exists
    const checkQuery = `SELECT * FROM subjects WHERE subjectcode = ?`;
    const [existingSubject] = await connection.query(checkQuery, [subjectcode]);

    if (existingSubject.length > 0) {
      // Update existing subject
      const updateQuery = `
        UPDATE subjects 
        SET subjectname = ?, semesternumber = ?, branchcode = ? 
        WHERE subjectcode = ?
      `;
      await connection.query(updateQuery, [subjectname, semesternumber, branchcode, subjectcode]);

      return res.status(200).json({ message: 'Subject updated successfully', subjectcode });
    } else {
      // Insert new subject
      const insertQuery = `
        INSERT INTO subjects (subjectcode, subjectname, semesternumber, branchcode)
        VALUES (?, ?, ?, ?)
      `;
      await connection.query(insertQuery, [subjectcode, subjectname, semesternumber, branchcode]);

      return res.status(201).json({ message: 'Subject added successfully', subjectcode });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to add/update subject', details: err.message });
  }
});

// router.post('/addstudents', upload.single('file'), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: 'No file uploaded' });
//   }

//   const filePath = req.file.path;

//   try {
//     const workbook = xlsx.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];
//     const data = xlsx.utils.sheet_to_json(sheet);

//     console.log('Parsed data:', data);

//     const duplicateEntries = [];
//     const addedEntries = [];

//     for (const student of data) {
//       console.log('Processing row:', student);

//       if (!student || Object.values(student).every((value) => value === null || value === '')) {
//         continue; // Skip empty rows
//       }

//       const { jntuno, name, semesternumber, branchcode } = student;

//       if (!jntuno || !name || !semesternumber || !branchcode) {
//         console.error('Invalid data:', student);
//         return res
//           .status(400)
//           .json({ error: `Invalid data in row: ${JSON.stringify(student)}` });
//       }

//       const checkQuery = `SELECT * FROM students WHERE jntuno = ?`;
//       const [existingStudent] = await connection.query(checkQuery, [jntuno]);

//       if (existingStudent.length > 0) {
//         duplicateEntries.push(jntuno);
//         continue;
//       }

//       const insertQuery = `
//         INSERT INTO students (jntuno, name, semesternumber, branchcode)
//         VALUES (?, ?, ?, ?)
//       `;
//       await connection.query(insertQuery, [jntuno, name, semesternumber, branchcode]);
//       addedEntries.push(jntuno);
//     }

//     fs.unlinkSync(filePath);

//     res.status(200).json({
//       message: 'Bulk upload completed',
//       addedEntries,
//       duplicateEntries,
//     });
//   } catch (error) {
//     console.error('Error adding students:', error);

//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }

//     res.status(500).json({ error: 'Error adding students', details: error.message });
//   }
// });

//bulkupdate students 


router.put('/students/bulkupdate', AdminAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      fs.unlinkSync(filePath); // Delete file
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    let successCount = 0;
    let errorRecords = [];

    for (const row of data) {
      const jntuno = row.jntuno; // Ensure the column name in Excel matches this
      const regulation = row.regulation; // Get regulation from Excel

      if (!jntuno || !regulation) {
        errorRecords.push({ jntuno, message: 'Missing jntuno or regulation' });
        continue; // Skip invalid rows
      }

      try {
        const query = `UPDATE students SET regulation = ? WHERE jntuno = ?`;
        const values = [regulation, jntuno];

        const [result] = await connection.execute(query, values);

        if (result.affectedRows > 0) {
          successCount++;
        } else {
          errorRecords.push({ jntuno, message: 'No matching student found' });
        }
      } catch (updateError) {
        errorRecords.push({ jntuno, message: updateError.message });
      }
    }

    fs.unlinkSync(filePath); // Clean up uploaded file

    res.status(200).json({
      message: 'Bulk update completed',
      updated: successCount,
      errors: errorRecords.length,
      errorDetails: errorRecords
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
