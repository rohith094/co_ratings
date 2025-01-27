//backendroutes for courseoutcomes

Router.post('/submitrating', adminAuth, async (req, res) => {
  try {
    const { jntuno, subjectcode, cocode, rating } = req.body;

    // Check if the student has already submitted a rating for the subject and course outcome
    const checkQuery = `
      SELECT * FROM ratings 
      WHERE jntuno = ? AND subjectcode = ? AND cocode = ?
    `;
    const [existingRatings] = await connection.query(checkQuery, [jntuno, subjectcode, cocode]);

    if (existingRatings.length > 0) {
      return res.status(400).json({
        message: 'Student has already submitted ratings for this subject and course outcome.'
      });
    }

    // If no existing rating is found, insert the new rating
    const insertQuery = `
      INSERT INTO ratings (jntuno, subjectcode, cocode, rating) 
      VALUES (?, ?, ?, ?)
    `;
    const values = [jntuno, subjectcode, cocode, rating];
    await connection.query(insertQuery, values);

    res.status(200).json({ message: 'Rating submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit rating', details: err.message });
  }
});

router.post('/addsubject', async (req, res) => {
  try {
    const { subjectcode, subjectname, semesternumber, branchcode } = req.body;

    // Validate input
    if (!subjectcode || !subjectname || !semesternumber || !branchcode) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check for duplicate subjectcode
    const checkQuery = `SELECT * FROM subjects WHERE subjectcode = ?`;
    const [existingSubject] = await connection.query(checkQuery, [subjectcode]);

    if (existingSubject.length > 0) {
      return res.status(400).json({
        message: `Subject with code "${subjectcode}" already exists.`,
      });
    }

    // Insert the subject
    const insertQuery = `
      INSERT INTO subjects (subjectcode, subjectname, semesternumber, branchcode)
      VALUES (?, ?, ?, ?)
    `;
    await connection.query(insertQuery, [subjectcode, subjectname, semesternumber, branchcode]);

    res.status(200).json({ message: 'Subject added successfully.' });
  } catch (err) {
    console.error('Error adding subject:', err);
    res.status(500).json({ error: 'Failed to add subject', details: err.message });
  }
});

router.post('/adminregister', async (req, res) => {
  const { mobilenumber, password } = req.body;

  // Validate input
  if (!mobilenumber || !password) {
    return res.json({ error: 'Mobile number and password are required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

  const query = 'INSERT INTO admins (mobilenumber, password) VALUES (?, ?)';

  try {
    // Insert admin into the database
    await connection.execute(query, [mobilenumber, hashedPassword]);
    return res.json({ message: 'Admin registered successfully' });
  } catch (error) {
    console.error('Error:', error);

    // Handle unique constraint error for the mobile number
    if (error.code === 'ER_DUP_ENTRY') {
      return res.json({ error: 'Mobile number already exists' });
    }

    return res.json({ error: 'An error occurred' });
  }
});