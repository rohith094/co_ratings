import express from "express";
import connection from "../db.js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import AdminAuth from "./AdminAuth.js";
import jwt from 'jsonwebtoken';
const router = express.Router();


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

export default router;
