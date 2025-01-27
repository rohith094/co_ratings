import express from "express";
import connection from "../db.js";
import dotenv from 'dotenv';
import multer from 'multer';
import xlsx from 'xlsx';
// import path from 'path';
import fs from 'fs';

const router = express.Router();
dotenv.config();
const upload = multer({ dest: 'uploads/' });

router.post('/addsubjects', upload.single('file'), async (req, res) => {
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

      // Check for duplicate subjectcode
      const checkQuery = `SELECT * FROM subjects WHERE subjectcode = ?`;
      const [existingSubject] = await connection.query(checkQuery, [subjectcode]);

      if (existingSubject.length > 0) {
        console.log(`Duplicate subject skipped: ${subjectcode}`);
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

export default router;
