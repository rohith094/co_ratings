import express from "express";
import jwt from 'jsonwebtoken';
import connection from "../db.js";
import dotenv from 'dotenv';

const router = express.Router();
dotenv.config();

router.post("/login", async (req, res) => {
  const { jntuno } = req.body;

  // Validate input
  if (!jntuno) {
    return res.json({ "error": "JNTU number is required" });
  }

  const query = "SELECT * FROM students WHERE jntuno = ?";

  try {
    // Check if the student exists with the given JNTU number
    const [results] = await connection.execute(query, [jntuno]);

    if (results.length === 0) {
      return res.json({ "error": "Student does not exist" });
    }

    const student = results[0];
    console.log(student);

    // Generate JWT token using jntuno
    const token = jwt.sign({ jntuno }, process.env.SECRET_KEY, { expiresIn: "3h" });
    console.log('Token:', token);
    return res.json({ token });
  } catch (error) {
    console.error("Error:", error);
    return res.json({ "error": "An error occurred" });
  }
});

export default router;
