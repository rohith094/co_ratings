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






{['coursealignment', 'courseattainment'].map((ratingType) => (
              <div key={ratingType}>
                <h2 className="text-xl font-bold mb-4 capitalize">{ratingType.replace('course', 'Course ')}</h2>

                {/* Professional Electives */}
                {electives.professionalelectives.length > 0 && (
                  <div className="mb-6 border-l-4 border-blue-500 bg-blue-100 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-blue-800">Professional Electives</h3>
                    {electives.professionalelectives.map((subject) => (
                      <div key={`${subject.subjectcode}-${ratingType}`} className="mb-6">
                        <div
                          className={`bg-gray-200 p-4 rounded-lg flex justify-between items-center cursor-pointer ${submittedSubjects.includes(`${subject.subjectcode}-${ratingType}`) ? 'bg-green-300' : ''
                            }`}
                          onClick={() => toggleAccordion(subject.subjectcode, ratingType)}
                        >
                          <span>{subject.subjectname} - {subject.subjectcode}</span>
                          <span className="flex items-center">
                            {submittedSubjects.includes(`${subject.subjectcode}-${ratingType}`) ? (
                              <>
                                <FaCheckCircle className="text-green-500 mr-2" /> Submitted
                              </>
                            ) : (
                              openAccordions.includes(`${subject.subjectcode}-${ratingType}`) ? (
                                <FaChevronUp className="text-blue-500 ml-2" />
                              ) : (
                                <FaChevronDown className="text-blue-500 ml-2" />
                              )
                            )}
                          </span>
                        </div>

                        {openAccordions.includes(`${subject.subjectcode}-${ratingType}`) && (
                          <div className="p-4 bg-white shadow-lg rounded-lg mt-4">
                            {courseOutcomes[subject.subjectcode]?.map(({ cocode, coname }) => (
                              <div key={cocode} className="mb-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold">CO Code: {cocode}</p>
                                    <p className="text-sm text-gray-600">CO Name: {coname}</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        className={`relative p-2 text-2xl cursor-pointer flex flex-col items-center ${ratings[subject.subjectcode]?.[cocode]?.[ratingType] >= star ? 'text-yellow-400' : 'text-gray-300'
                                          }`}
                                        onClick={() => handleRatingChange(subject.subjectcode, cocode, star, ratingType)}
                                      >
                                        {ratings[subject.subjectcode]?.[cocode]?.[ratingType] >= star ? <FaStar /> : <FaRegStar />}
                                        <span className="absolute bottom-0 text-xs font-bold text-black">{star}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              className={`mt-4 py-2 px-4 rounded bg-green-500 hover:bg-green-600 text-white cursor-pointer flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                                }`}
                              onClick={() => handleSubmit(subject.subjectcode, ratingType)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <>
                                  <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8v8H4z"
                                    ></path>
                                  </svg>
                                  Submitting...
                                </>
                              ) : (
                                'Submit Ratings'
                              )}
                            </button>



                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Open Electives */}
                {electives.oesubjects.length > 0 && (
                  <div className="mb-6 border-l-4 border-purple-500 bg-purple-100 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-purple-800">Open Electives</h3>
                    {electives.oesubjects.map((subject) => (
                      <div key={`${subject.subjectcode}-${ratingType}`} className="mb-6">
                        <div
                          className={`bg-gray-200 p-4 rounded-lg flex justify-between items-center cursor-pointer ${submittedSubjects.includes(`${subject.subjectcode}-${ratingType}`) ? 'bg-green-300' : ''
                            }`}
                          onClick={() => toggleAccordion(subject.subjectcode, ratingType)}
                        >
                          <span>{subject.subjectname} - {subject.subjectcode}</span>
                          <span className="flex items-center">
                            {submittedSubjects.includes(`${subject.subjectcode}-${ratingType}`) ? (
                              <>
                                <FaCheckCircle className="text-green-500 mr-2" /> Submitted
                              </>
                            ) : (
                              openAccordions.includes(`${subject.subjectcode}-${ratingType}`) ? (
                                <FaChevronUp className="text-blue-500 ml-2" />
                              ) : (
                                <FaChevronDown className="text-blue-500 ml-2" />
                              )
                            )}
                          </span>
                        </div>

                        {openAccordions.includes(`${subject.subjectcode}-${ratingType}`) && (
                          <div className="p-4 bg-white shadow-lg rounded-lg mt-4">
                            {courseOutcomes[subject.subjectcode]?.map(({ cocode, coname }) => (
                              <div key={cocode} className="mb-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold">CO Code: {cocode}</p>
                                    <p className="text-sm text-gray-600">CO Name: {coname}</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        className={`relative p-2 text-2xl cursor-pointer flex flex-col items-center ${ratings[subject.subjectcode]?.[cocode]?.[ratingType] >= star ? 'text-yellow-400' : 'text-gray-300'
                                          }`}
                                        onClick={() => handleRatingChange(subject.subjectcode, cocode, star, ratingType)}
                                      >
                                        {ratings[subject.subjectcode]?.[cocode]?.[ratingType] >= star ? <FaStar /> : <FaRegStar />}
                                        <span className="absolute bottom-0 text-xs font-bold text-black">{star}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              className={`mt-4 py-2 px-4 rounded bg-green-500 hover:bg-green-600 text-white cursor-pointer flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                                }`}
                              onClick={() => handleSubmit(subject.subjectcode, ratingType)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <>
                                  <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8v8H4z"
                                    ></path>
                                  </svg>
                                  Submitting...
                                </>
                              ) : (
                                'Submit Ratings'
                              )}
                            </button>

                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}


              </div>
            ))}