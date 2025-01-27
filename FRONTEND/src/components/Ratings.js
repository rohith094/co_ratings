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
    if (subjects.length > 0) {
      setFinalSubmitEnabled(areAllSubjectsRated());
    }
  }, [ratings, subjects, courseOutcomes]);
  

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
      data.branchshortcut = branchMapping[data.branchcode] || data.branchcode; // Map branchcode to branchshortcut
      setStudentInfo(data);
      fetchSubjects(data.semesternumber, data.branchcode);
      checkRatedSubjects(data.jntuno);
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

  const fetchSubjects = async (semesternumber, branchcode) => {
    setLoading(true);
    try {
      const token = Cookies.get('studenttoken');
      const response = await axios.get(`https://co-rating-qn28.onrender.com/student/subjects/${semesternumber}/${branchcode}`, {
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
      setCourseOutcomes((prev) => ({
        ...prev,
        [subjectCode]: response.data,
      }));
    } catch (err) {
      console.error('Error fetching course outcomes:', err);
    }
  };

  const handleRatingChange = (subjectCode, cocode, value) => {
    setRatings((prev) => ({
      ...prev,
      [subjectCode]: {
        ...(prev[subjectCode] || {}),
        [cocode]: value,
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
  const areAllSubjectsRated = () => {
    return subjects.every((subject) => {
      const subjectRatings = ratings[subject.subjectcode] || {};
      // Check if all COs for the subject are rated
      return (
        courseOutcomes[subject.subjectcode]?.length === Object.keys(subjectRatings).length &&
        Object.values(subjectRatings).every((rating) => rating > 0)
      );
    });
};

  const handleSubmit = async (subjectCode) => {
    try {
      const token = Cookies.get('studenttoken');
      const { jntuno } = JSON.parse(atob(token.split('.')[1]));
      const subjectRatings = Object.entries(ratings[subjectCode] || {}).map(([cocode, rating]) => ({
        cocode,
        rating,
      }));

      await axios.post(
        'https://co-rating-qn28.onrender.com/ratings/addrating',
        { jntuno, subjectcode: subjectCode, ratings: subjectRatings },
        {
          headers: {
            Authorization: `${token}`,
          },
        }
      );

      setSubmittedSubjects((prev) => [...prev, subjectCode]);
      setOpenAccordions((prev) => prev.filter((code) => code !== subjectCode)); // Close the accordion
      toast.success('Ratings submitted successfully!');
    } catch (err) {
      console.error('Error submitting ratings:', err);
      toast.error('Error submitting ratings');
    }
  };

  const toggleAccordion = async (subjectCode) => {
    if (!submittedSubjects.includes(subjectCode)) {
      if (!courseOutcomes[subjectCode]) {
        await fetchCourseOutcomes(subjectCode);
      }
      setOpenAccordions((prev) =>
        prev.includes(subjectCode)
          ? prev.filter((code) => code !== subjectCode)
          : [...prev, subjectCode]
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
        navigate('/feedbacksubmitted'); // Redirect to Thank You page
      } else {
        fetchStudentInfo();
      }
    } catch (error) {
      console.error('Error checking feedback status:', error);
      toast.error('Error checking feedback status');
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
          {/* Final Submit Button */}
          <button
            className={`mr-4 py-2 px-6 rounded ${finalSubmitEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'} cursor-pointer`}
            disabled={!finalSubmitEnabled}
            onClick={handleFinalSubmit}
          >
            Final Submit
          </button>

          {/* Logout Button */}
          <button
            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded cursor-pointer"
            onClick={() => {
              Cookies.remove('studenttoken');
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      </nav>



      <main className="p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          </div>
        ) : (
          subjects.map((subject) => (
            <div key={subject.subjectcode} className="mb-6">
              <div
                className={`bg-gray-200 p-4 rounded-lg flex justify-between items-center cursor-pointer ${submittedSubjects.includes(subject.subjectcode) ? 'bg-green-300' : ''
                  }`}
                onClick={() => toggleAccordion(subject.subjectcode)}
              >
                <span>{subject.subjectname}-{subject.subjectcode}</span>
                <span className="flex items-center">
                  {submittedSubjects.includes(subject.subjectcode) ? (
                    <>
                      <FaCheckCircle className="text-green-500 mr-2" />
                      Submitted
                    </>
                  ) : (
                    openAccordions.includes(subject.subjectcode) ? (
                      <FaChevronUp className="text-blue-500 ml-2" />
                    ) : (
                      <FaChevronDown className="text-blue-500 ml-2" />
                    )
                  )}
                </span>
              </div>

              {openAccordions.includes(subject.subjectcode) && (
                <div className="p-4 bg-white shadow-lg rounded-lg mt-4">
                  {courseOutcomes[subject.subjectcode]?.map(({ cocode, coname }) => (
                    <div key={cocode} className="mb-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{`CO Code: ${cocode}`}</p>
                        <p className="text-sm text-gray-600">{`CO Name: ${coname}`}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            className={`p-2 text-2xl ${ratings[subject.subjectcode]?.[cocode] >= star
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                              }`}
                            onClick={() => handleRatingChange(subject.subjectcode, cocode, star)}
                          >
                            {ratings[subject.subjectcode]?.[cocode] >= star ? <FaStar /> : <FaRegStar />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    className={`mt-4 py-2 px-4 rounded ${submittedSubjects.includes(subject.subjectcode) || !areAllCOsRated(subject.subjectcode)
                      ? 'bg-gray-400'
                      : 'bg-green-500 hover:bg-green-600'
                      } text-white cursor-pointer`}
                    onClick={() => handleSubmit(subject.subjectcode)}
                    disabled={submittedSubjects.includes(subject.subjectcode) || !areAllCOsRated(subject.subjectcode)}
                  >
                    {submittedSubjects.includes(subject.subjectcode) ? (
                      <>
                        <FaCheckCircle className="inline mr-2" />
                        Submitted
                      </>
                    ) : (
                      'Submit Ratings'
                    )}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default Ratings;



