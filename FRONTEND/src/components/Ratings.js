
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { FaChevronUp, FaChevronDown, FaCheckCircle, FaStar, FaRegStar } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Ratings = () => {
  const [studentInfo, setStudentInfo] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(false);
  const [submittedSubjects, setSubmittedSubjects] = useState([]);
  const [openAccordions, setOpenAccordions] = useState([]);
  const [courseOutcomes, setCourseOutcomes] = useState({});
  const [finalSubmitEnabled, setFinalSubmitEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [electives, setElectives] = useState({
    oesubjects: [],
    professionalelectives: [],
  });
  const navigate = useNavigate();

  const branchMapping = {
    '1': 'CIVIL',
    '12': 'IT',
    '2': 'EEE',
    '3': 'MECH',
    '4': 'ECE',
    '42': 'AIML',
    '45': 'AIDS',
    '5': 'CSE',
    '8': 'CHEM',
  };

  useEffect(() => {
    fetchFeedbackStatus();
  }, []);

  useEffect(() => {
    setFinalSubmitEnabled(checkAllSubjectsRated());
  }, [ratings, submittedSubjects, electives]);


  const handleFinalSubmit = async () => {
    try {
      const token = Cookies.get('studenttoken');
      const { jntuno } = JSON.parse(atob(token.split('.')[1]));
      await axios.post(
        'https://co-rating-qn28.onrender.com/student/submitfeedback',
        { jntuno },
        { headers: { Authorization: `${token}` } }
      );
      toast.success('Feedback submitted successfully!');
      navigate('/feedbacksubmitted');
    } catch (err) {
      console.error('Error during final submission:', err);
      toast.error('Error during final submission');
    }
  };

  const fetchStudentInfo = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('studenttoken');
      const { jntuno } = JSON.parse(atob(token.split('.')[1]));
      const response = await axios.get(`https://co-rating-qn28.onrender.com/student/studentinfo/${jntuno}`, {
        headers: { Authorization: `${token}` },
      });
      const data = response.data;
      data.branchshortcut = branchMapping[data.branchcode] || data.branchcode;
      setStudentInfo(data);
      fetchSubjects(data.semesternumber, data.branchcode, data.jntuno);
      checkRatedSubjects(data.jntuno);
      return data; // Return updated data
    } catch (err) {
      console.error('Error fetching student info:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkRatedSubjects = async (jntuno) => {
    try {
      const token = Cookies.get('studenttoken');
      const response = await axios.get(`https://co-rating-qn28.onrender.com/ratings/checkratedsubjects/${jntuno}`, {
        headers: { Authorization: `${token}` },
      });
      setSubmittedSubjects(response.data);
    } catch (err) {
      console.error('Error checking rated subjects:', err);
    }
  };

  const fetchSubjects = async (semesternumber, branchcode, jntuno) => {
    setLoading(true);
    try {
      const token = Cookies.get('studenttoken');
      const response = await axios.get(`https://co-rating-qn28.onrender.com/student/subjects/${semesternumber}/${branchcode}/${jntuno}`, {
        headers: { Authorization: `${token}` },
      });
      setSubjects(response.data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setLoading(false);
    }
  };


  const fetchCourseOutcomes = async (subjectCode) => {
    try {
      const token = Cookies.get('studenttoken');
      const response = await axios.get(`https://co-rating-qn28.onrender.com/student/courseoutcomes/${subjectCode}`, {
        headers: { Authorization: `${token}` },
      });

      const defaultRatings = response.data.reduce((acc, co) => {
        acc[co.cocode] = { coursealignment: 5, courseattainment: 5 }; // Default to 5 stars
        return acc;
      }, {});

      setCourseOutcomes((prev) => ({ ...prev, [subjectCode]: response.data }));
      setRatings((prev) => ({ ...prev, [subjectCode]: defaultRatings }));
    } catch (err) {
      console.error('Error fetching course outcomes:', err);
    }
  };

  const handleRatingChange = (subjectCode, cocode, star, ratingType) => {
    setRatings((prev) => ({
      ...prev,
      [subjectCode]: {
        ...prev[subjectCode],
        [cocode]: {
          ...(prev[subjectCode]?.[cocode] || {}),
          [ratingType]: star,
        },
      },
    }));
  };

  const areAllCOsRated = (subjectCode) => {
    const subjectRatings = ratings[subjectCode] || {};
    return (
      courseOutcomes[subjectCode]?.length === Object.keys(subjectRatings).length &&
      Object.values(subjectRatings).every((rating) => rating > 0)
    );
  };

  const checkAllSubjectsRated = () => {
    const allSubjectsRated = subjects.every((subject) =>
      ['coursealignment', 'courseattainment'].every((ratingType) =>
        submittedSubjects.includes(`${subject.subjectcode}-${ratingType}`)
      )
    );

    const allOEsRated = electives.oesubjects.every((oe) =>
      ['coursealignment', 'courseattainment'].every((ratingType) =>
        submittedSubjects.includes(`${oe.subjectcode}-${ratingType}`)
      )
    );

    const allPEsRated = electives.professionalelectives.every((pe) =>
      ['coursealignment', 'courseattainment'].every((ratingType) =>
        submittedSubjects.includes(`${pe.subjectcode}-${ratingType}`)
      )
    );

    return allSubjectsRated && allOEsRated && allPEsRated;
  };

  const handleSubmit = async (subjectCode, ratingType) => {
    setIsSubmitting(true); // Start loading
    try {
      const token = Cookies.get('studenttoken');
      const { jntuno } = JSON.parse(atob(token.split('.')[1]));

      const subjectRatings = Object.entries(ratings[subjectCode] || {}).map(([cocode, rating]) => ({
        cocode,
        rating: rating[ratingType],
        rating_type: ratingType,
      })).filter(r => r.rating);

      await axios.post(
        'https://co-rating-qn28.onrender.com/ratings/addrating',
        { jntuno, subjectcode: subjectCode, ratings: subjectRatings },
        { headers: { Authorization: `${token}` } }
      );

      setSubmittedSubjects((prev) => [...prev, `${subjectCode}-${ratingType}`]);

      // Close only the specific accordion for this subjectCode and ratingType
      setOpenAccordions((prev) => prev.filter((item) => item !== `${subjectCode}-${ratingType}`));

      toast.success(`${ratingType} ratings submitted successfully!`);
    } catch (err) {
      console.error('Error submitting ratings:', err);
      toast.error(`Error submitting ${ratingType} ratings`);
    } finally {
      setIsSubmitting(false); // Stop loading
    }
  };

  const toggleAccordion = async (subjectCode, ratingType) => {
    const key = `${subjectCode}-${ratingType}`;

    if (!submittedSubjects.includes(key)) {
      if (!courseOutcomes[subjectCode]) {
        await fetchCourseOutcomes(subjectCode);
      }
      setOpenAccordions((prev) =>
        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
      );
    }
  };

  const fetchFeedbackStatus = async () => {
    try {
      const token = Cookies.get('studenttoken');
      const { jntuno } = JSON.parse(atob(token.split('.')[1]));
      const response = await axios.post(
        'https://co-rating-qn28.onrender.com/student/finalsubmit',
        { jntuno },
        { headers: { Authorization: `${token}` } }
      );

      if (response.data.feedback_submitted) {
        navigate('/feedbacksubmitted');
      } else {
        const studentData = await fetchStudentInfo(); // Ensure studentInfo updates
        fetchElectives(studentData.jntuno); // Now fetch open electives
      }
    } catch (error) {
      console.error('Error checking feedback status:', error);
      toast.error('Error checking feedback status');
    }
  };

  const fetchElectives = async (jntuno) => {
    try {
      const token = Cookies.get('studenttoken');

      // Fetch Elective Subjects (OE and PE) from the backend
      const electivesResponse = await axios.get(
        `https://co-rating-qn28.onrender.com/student/electivesubjects/${jntuno}`,
        { headers: { Authorization: `${token}` } }
      );

      // Update the state with the fetched data
      setElectives({
        oesubjects: electivesResponse.data.oesubjects || [],
        professionalelectives: electivesResponse.data.professionalelectives || [],
      });

    } catch (error) {
      console.error('Error fetching electives:', error);
      toast.error('Error fetching electives');
    }
  };


  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{studentInfo.name}</h1>
          <p>{`Branch: ${studentInfo.branchshortcut || ''}, Semester: ${studentInfo.semesternumber || ''}`}</p>
        </div>

        <div className="flex items-center">
          <button
            className={`mr-4 py-2 px-6 rounded ${finalSubmitEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'} cursor-pointer`}
            disabled={!finalSubmitEnabled}
            onClick={handleFinalSubmit}
          >
            Final Submit
          </button>
        </div>
      </nav>
      <main className="p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Open Electives Section */}

            {['coursealignment', 'courseattainment'].map((ratingType) => (
              <div key={ratingType}>
                <h2 className="text-xl font-bold mb-4 capitalize">{ratingType.replace('course', 'Course ')}</h2>
                {subjects.map((subject) => (
                  <div key={`${subject.subjectcode}-${ratingType}`} className="mb-6">
                    <div
                      className={`bg-gray-200 p-4 rounded-lg flex justify-between items-center cursor-pointer ${submittedSubjects.includes(`${subject.subjectcode}-${ratingType}`) ? 'bg-green-300' : ''}`}
                      onClick={() => toggleAccordion(subject.subjectcode, ratingType)}
                    >
                      <span>{subject.subjectname}-{subject.subjectcode}</span>
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

                                {/* Star buttons with numbers inside */}
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    className={`relative p-2 cursor-pointer text-2xl flex flex-col items-center ${ratings[subject.subjectcode]?.[cocode]?.[ratingType] >= star ? 'text-yellow-400' : 'text-gray-300'}`}
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
            ))}


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
          </>
        )}
      </main>


    </div>
  );
};

export default Ratings;
