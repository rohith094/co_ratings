import express from "express";

import connection from "../db.js";
import dotenv from 'dotenv';
import AuthRoute from "./AuthRoute.js";

const Router = express.Router();
dotenv.config();


// Router.post('/addrating',AuthRoute, async (req, res) => {
//   try {
//     const { jntuno, subjectcode, ratings } = req.body;

//     // Validate input data
//     if (!jntuno || !subjectcode || !ratings || !Array.isArray(ratings)) {
//       return res.status(400).json({ error: 'Invalid input data' });
//     }

//     // Check if jntuno exists in the students table
//     const studentQuery = `SELECT * FROM students WHERE jntuno = ?`;
//     const [studentResult] = await connection.query(studentQuery, [jntuno]);

//     if (studentResult.length === 0) {
//       return res.status(400).json({ error: `Invalid jntuno: ${jntuno}` });
//     }

//     // Check if subjectcode exists in the subjects table
//     const subjectQuery = `SELECT * FROM subjects WHERE subjectcode = ?`;
//     const [subjectResult] = await connection.query(subjectQuery, [subjectcode]);

//     if (subjectResult.length === 0) {
//       return res.status(400).json({ error: `Invalid subjectcode: ${subjectcode}` });
//     }

//     // Process ratings
//     for (const rating of ratings) {
//       const { cocode, rating: ratingValue } = rating;

//       // Check if the rating already exists
//       const checkQuery = `
//         SELECT * 
//         FROM ratings 
//         WHERE jntuno = ? AND subjectcode = ? AND cocode = ?
//       `;
//       const [existingRatings] = await connection.query(checkQuery, [jntuno, subjectcode, cocode]);

//       if (existingRatings.length > 0) {
//         return res.status(400).json({
//           message: `You have already submitted a rating for subjectcode: ${subjectcode}, cocode: ${cocode}.`,
//         });
//       }

//       // Insert the new rating if it doesn't exist
//       const insertQuery = `
//         INSERT INTO ratings (jntuno, subjectcode, cocode, rating) 
//         VALUES (?, ?, ?, ?)
//       `;
//       await connection.query(insertQuery, [jntuno, subjectcode, cocode, ratingValue]);
//     }

//     res.status(200).json({ message: 'Ratings added successfully' });
//   } catch (err) {
//     console.error('Error adding ratings:', err);
//     res.status(500).json({ error: 'Failed to add ratings', details: err.message });
//   }
// });


//checking for rated subjects before submitting 

Router.post('/addrating', AuthRoute, async (req, res) => {
  try {
    const { jntuno, subjectcode, ratings } = req.body;

    if (!jntuno || !subjectcode || !ratings || !Array.isArray(ratings)) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    const studentQuery = `SELECT * FROM students WHERE jntuno = ?`;
    const [studentResult] = await connection.query(studentQuery, [jntuno]);

    if (studentResult.length === 0) {
      return res.status(400).json({ error: `Invalid jntuno: ${jntuno}` });
    }

    const subjectQuery = `SELECT * FROM subjects WHERE subjectcode = ?`;
    const [subjectResult] = await connection.query(subjectQuery, [subjectcode]);

    if (subjectResult.length === 0) {
      return res.status(400).json({ error: `Invalid subjectcode: ${subjectcode}` });
    }

    for (const rating of ratings) {
      const { cocode, rating_type, rating: ratingValue } = rating;

      if (!['coursealignment', 'courseattainment'].includes(rating_type)) {
        return res.status(400).json({ error: `Invalid rating_type: ${rating_type}` });
      }

      const checkQuery = `
        SELECT * FROM ratings 
        WHERE jntuno = ? AND subjectcode = ? AND cocode = ? AND rating_type = ?
      `;
      const [existingRatings] = await connection.query(checkQuery, [jntuno, subjectcode, cocode, rating_type]);

      if (existingRatings.length > 0) {
        return res.status(400).json({
          message: `You have already submitted a ${rating_type} rating for subjectcode: ${subjectcode}, cocode: ${cocode}.`,
        });
      }

      const insertQuery = `
        INSERT INTO ratings (jntuno, subjectcode, cocode, rating_type, rating) 
        VALUES (?, ?, ?, ?, ?)
      `;
      await connection.query(insertQuery, [jntuno, subjectcode, cocode, rating_type, ratingValue]);
    }

    res.status(200).json({ message: 'Ratings added successfully' });
  } catch (err) {
    console.error('Error adding ratings:', err);
    res.status(500).json({ error: 'Failed to add ratings', details: err.message });
  }
});


Router.get('/checkratedsubjects/:jntuno', async (req, res) => {
  const { jntuno } = req.params;

  try {
    const query = `
      SELECT subjectcode FROM ratings WHERE jntuno = ?;
    `;
    const [ratedSubjects] = await connection.execute(query, [jntuno]);

    const subjectCodes = ratedSubjects.map((subject) => subject.subjectcode);
    res.status(200).json(subjectCodes);
  } catch (error) {
    console.error('Error fetching rated subjects:', error);
    res.status(500).send('An error occurred while checking rated subjects');
  }
});


Router.put('/updaterating/:ratingid', async (req, res) => {
  try {
    const { ratingid } = req.params;
    const { rating } = req.body;

    const query = `
      UPDATE ratings 
      SET rating = ? 
      WHERE ratingid = ?
    `;
    const values = [rating, ratingid];

    const [result] = await connection.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    res.status(200).json({ message: 'Rating updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rating', details: err.message });
  }
});

Router.delete('/deleterating/:ratingid', async (req, res) => {
  try {
    const { ratingid } = req.params;

    const query = `
      DELETE FROM ratings 
      WHERE ratingid = ?
    `;
    const [result] = await connection.query(query, [ratingid]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    res.status(200).json({ message: 'Rating deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rating', details: err.message });
  }
});

Router.get('/getratings/:jntuno', async (req, res) => {
  try {
    const { jntuno } = req.params;

    const query = `
      SELECT * FROM ratings 
      WHERE jntuno = ?
    `;
    const [results] = await connection.query(query, [jntuno]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'No ratings found for the given JNTU number' });
    }

    res.status(200).json({ ratings: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratings', details: err.message });
  }
});

Router.get('/getratingsbyoutcome/:subjectcode/:cocode', async (req, res) => {
  try {
    const { subjectcode, cocode } = req.params;

    const query = `
      SELECT * FROM ratings 
      WHERE subjectcode = ? AND cocode = ?
    `;
    const [results] = await connection.query(query, [subjectcode, cocode]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'No ratings found for the given course outcome' });
    }

    res.status(200).json({ ratings: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratings', details: err.message });
  }
});

Router.post('/checksubmission', async (req, res) => {
  try {
    const { jntuno, subjectcode, cocode } = req.body;

    // Validate the input data
    if (!jntuno || !subjectcode || !cocode) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    // Check if the specific rating already exists
    const checkQuery = `
      SELECT * 
      FROM ratings 
      WHERE jntuno = ? AND subjectcode = ? AND cocode = ?
    `;
    const [existingRating] = await connection.query(checkQuery, [jntuno, subjectcode, cocode]);

    if (existingRating.length > 0) {
      return res.status(200).json({
        success: true,
        alreadyExists: true,
      });
    }

    res.status(200).json({
      success: true,
      alreadyExists: false,
    });
  } catch (err) {
    console.error('Error checking rating:', err);
    res.status(500).json({ success: false, error: 'Failed to check rating', details: err.message });
  }
});


export default Router;
