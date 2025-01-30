import express from "express";
import connection from "../db.js";
import dotenv from 'dotenv';
import multer from 'multer';
import xlsx from 'xlsx';
// import path from 'path';
import fs from 'fs';
import AdminAuth from "./AdminAuth.js";

const router = express.Router();
dotenv.config();
const upload = multer({ dest: 'uploads/' });



// router.post('/addsubject',AdminAuth, async (req, res) => {
//   try {
//     const { subjectcode, subjectname, semesternumber, branchcode } = req.body;

//     // Query to insert subject
//     const query = `
//       INSERT INTO subjects (subjectcode, subjectname, semesternumber, branchcode) 
//       VALUES (?, ?, ?, ?)
//     `;
//     const values = [subjectcode, subjectname, semesternumber, branchcode];

//     await connection.query(query, values);
//     res.status(200).json({ message: 'Subject added successfully', subjectcode, branchcode, semesternumber });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to add subject', details: err.message });
//   }
// });




export default router;
