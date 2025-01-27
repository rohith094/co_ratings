import express from "express";
import connection from "../db.js";
import dotenv from 'dotenv';
import multer from "multer";
import xlsx from "xlsx";
import fs from "fs";


const Router = express.Router();
dotenv.config();
const upload = multer({ dest: "uploads/" });

Router.post('/addcourseoutcome', async (req, res) => {
  try {
    const { subjectcode, cocode, coname } = req.body;

    // Query to insert course outcome
    const query = `
      INSERT INTO courseoutcomes (subjectcode, cocode, coname) 
      VALUES (?, ?, ?)
    `;
    const values = [subjectcode, cocode, coname];

    await connection.query(query, values);
    res.status(200).json({ message: 'Course outcome added successfully', subjectcode, cocode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add course outcome', details: err.message });
  }
});

Router.post("/addcourseoutcomes",upload.single("file"),async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
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
      const invalidSubjects = [];

      // Iterate through the data array and insert each course outcome
      for (const outcome of data) {
        const { subjectcode, cocode, coname } = outcome;

        // Validate required fields
        if (!subjectcode || !cocode || !coname) {
          return res.status(400).json({
            error: `Invalid data in row: ${JSON.stringify(outcome)}`,
          });
        }

        // Check if the subjectcode exists
        const subjectQuery = `SELECT * FROM subjects WHERE subjectcode = ?`;
        const [subjectExists] = await connection.query(subjectQuery, [
          subjectcode,
        ]);

        if (subjectExists.length === 0) {
          invalidSubjects.push(subjectcode); // Track invalid subject codes
          continue; // Skip adding this record
        }

        // Check for duplicate course outcomes
        const duplicateQuery = `SELECT * FROM courseoutcomes WHERE subjectcode = ? AND cocode = ?`;
        const [existingOutcome] = await connection.query(duplicateQuery, [
          subjectcode,
          cocode,
        ]);

        if (existingOutcome.length > 0) {
          duplicateEntries.push({ subjectcode, cocode }); // Track duplicates
          continue; // Skip adding this record
        }

        // Insert the course outcome into the database
        const insertQuery = `
          INSERT INTO courseoutcomes (subjectcode, cocode, coname)
          VALUES (?, ?, ?)
        `;
        await connection.query(insertQuery, [subjectcode, cocode, coname]);
        addedEntries.push({ subjectcode, cocode }); // Track added entries
      }

      // Delete the file after processing
      fs.unlinkSync(filePath);

      res.status(200).json({
        message: "Bulk upload completed",
        addedEntries,
        duplicateEntries,
        invalidSubjects,
      });
    } catch (error) {
      console.error("Error adding course outcomes:", error);

      // Delete the file in case of an error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(500).json({
        error: "Error adding course outcomes",
        details: error.message,
      });
    }
  }
);




Router.put('/updatecourseoutcome/:subjectcode/:cocode', async (req, res) => {
  try {
    const { subjectcode, cocode } = req.params;
    const { coname } = req.body;

    // Query to update course outcome
    const query = `
      UPDATE courseoutcomes 
      SET coname = ? 
      WHERE subjectcode = ? AND cocode = ?
    `;
    const values = [coname, subjectcode, cocode];

    const [result] = await connection.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Course outcome not found' });
    }

    res.status(200).json({ message: 'Course outcome updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update course outcome', details: err.message });
  }
});
Router.delete('/deletecourseoutcome/:subjectcode/:cocode', async (req, res) => {
  try {
    const { subjectcode, cocode } = req.params;

    // Query to delete course outcome
    const query = `
      DELETE FROM courseoutcomes 
      WHERE subjectcode = ? AND cocode = ?
    `;
    const values = [subjectcode, cocode];

    const [result] = await connection.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Course outcome not found' });
    }

    res.status(200).json({ message: 'Course outcome deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete course outcome', details: err.message });
  }
});
Router.get('/getcourseoutcomes/:subjectcode', async (req, res) => {
  try {
    const { subjectcode } = req.params;

    // Query to get all course outcomes for a specific subject
    const query = `
      SELECT cocode, coname 
      FROM courseoutcomes 
      WHERE subjectcode = ?
    `;
    const [results] = await connection.query(query, [subjectcode]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'No course outcomes found for the given subject code' });
    }

    res.status(200).json({ courseoutcomes: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course outcomes', details: err.message });
  }
}); 

export default Router;
