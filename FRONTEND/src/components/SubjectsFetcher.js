
// import { useState, useEffect } from "react";
// import axios from "axios";
// import { motion } from "framer-motion";
// import Cookies from "js-cookie";
// import { toast } from "react-toastify";

// const SubjectsFetcher = () => {
//   const [joiningYear, setJoiningYear] = useState("");
//   const [semester, setSemester] = useState("");
//   const [subjects, setSubjects] = useState([]);
//   const [jntunos, setJntunos] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const token = Cookies.get("admintoken");

//   const joiningYears = ["2021", "2022", "2023", "2024"];
//   const semesterNumbers = ["1", "2", "3", "4", "5", "6", "7", "8"];

//   useEffect(() => {
//     setSubjects([]);
//     setJntunos([]);
//   }, [joiningYear]);

//   const fetchSubjects = async () => {
//     if (!joiningYear || !semester) {
//       setError("Please select both joining year and semester.");
//       return;
//     }

//     setError("");
//     setLoading(true);

//     try {
//       const response = await axios.get(
//         `http://localhost:3002/admin/students/subjects/${joiningYear}/${semester}`,
//         {
//           headers: { Authorization: `${token}` },
//         }
//       );

//       setSubjects(response.data.uniqueSubjects);
//       setJntunos(response.data.allJntunos);
//       toast.success("Subjects fetched successfully!");
//     } catch (err) {
//       setError("Failed to fetch subjects. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const downloadReport = async (subjectcode, joiningyear, semesternumber) => {
//     if (jntunos.length === 0) {
//         toast.error("No JNTU numbers available for this subject.");
//         return;
//     }

//     try {
//         const response = await axios.post(
//             `http://localhost:3002/admin/downloadreport/${semesternumber}`,
//             { subjectcode, jntunos },
//             {
//                 headers: {
//                     Authorization: `${token}`,
//                     "Content-Type": "application/json",
//                 },
//                 responseType: "blob", // Important to handle file download
//             }
//         );

//         const blob = new Blob([response.data], {
//             type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//         });

//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement("a");
        
//         // Construct the filename as per the required format
//         const filename = `${joiningyear}-semester${semesternumber}-${subjectcode}.xlsx`;

//         a.href = url;
//         a.download = filename;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//         toast.success("Report downloaded successfully!");
//     } catch (error) {
//         toast.error("Failed to download report. Please try again.");
//     }
// };


//   return (
//     <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl mt-10">
//       <h2 className="text-2xl font-semibold text-center text-gray-700 mb-4">
//         Fetch Unique Subjects
//       </h2>

//       {/* Dropdowns */}
//       <div className="grid grid-cols-2 gap-4">
//         <select
//           className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 transition"
//           value={joiningYear}
//           onChange={(e) => setJoiningYear(e.target.value)}
//         >
//           <option value="">Select Joining Year</option>
//           {joiningYears.map((year) => (
//             <option key={year} value={year}>
//               {year}
//             </option>
//           ))}
//         </select>

//         <select
//           className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 transition"
//           value={semester}
//           onChange={(e) => setSemester(e.target.value)}
//         >
//           <option value="">Select Semester</option>
//           {semesterNumbers.map((sem) => (
//             <option key={sem} value={sem}>
//               {sem}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Fetch Button */}
//       <button
//         className="w-full cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 mt-4 rounded-lg transition"
//         onClick={fetchSubjects}
//       >
//         Fetch Subjects
//       </button>

//       {/* Loading Animation */}
//       {loading && (
//         <motion.div
//           className="mt-4 flex justify-center"
//           animate={{ rotate: 360 }}
//           transition={{ repeat: Infinity, duration: 1 }}
//         >
//           <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
//         </motion.div>
//       )}

//       {/* Error Message */}
//       {error && <p className="text-red-500 mt-2 text-center">{error}</p>}

//       {/* Subjects Table */}
//       {subjects.length > 0 && (
//         <div className="mt-6">
//           <h3 className="text-lg font-semibold text-gray-700 mb-2">
//             Unique Subjects:
//           </h3>
//           <div className="overflow-x-auto">
//             <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
//               <thead className="bg-gray-100">
//                 <tr>
//                   <th className="border p-2 text-left">Subject Code</th>
//                   <th className="border p-2 text-left">Subject Name</th>
//                   <th className="border p-2 text-center">Download Report</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {subjects.map(({ subjectcode, subjectname }, index) => (
//                   <tr key={index} className="border-t">
//                     <td className="border p-2">{subjectcode}</td>
//                     <td className="border p-2">{subjectname}</td>
//                     <td className="border p-2 text-center">
//                       <button
//                         className="bg-green-500 cursor-pointer hover:bg-green-600 text-white px-4 py-1 rounded transition"
//                         onClick={() => downloadReport(subjectcode, joiningYear, semester)}
//                       >
//                         Download Report
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* JNTU Numbers */}
//       {jntunos.length > 0 && (
//         <div className="mt-6 bg-gray-100 p-4 rounded-lg">
//           <h3 className="text-lg font-semibold text-gray-700 mb-2">
//             JNTU Numbers:
//           </h3>
//           <div className="flex flex-wrap gap-2">
//             {jntunos.map((jntuno, index) => (
//               <span
//                 key={index}
//                 className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm"
//               >
//                 {jntuno}
//               </span>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>

//   );
// };

// export default SubjectsFetcher;


import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import { toast } from "react-toastify";

const branchMapping = {
  "5": "CSE",
  "42": "AIML",
  "45": "AIDS",
};

const SubjectsFetcher = () => {
  const [joiningYear, setJoiningYear] = useState("");
  const [semester, setSemester] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [jntunos, setJntunos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const token = Cookies.get("admintoken");

  const joiningYears = ["2021", "2022", "2023", "2024"];
  const semesterNumbers = ["1", "2", "3", "4", "5", "6", "7", "8"];

  useEffect(() => {
    setSubjects([]);
    setJntunos([]);
  }, [joiningYear, branchCode]);

  const fetchSubjects = async () => {
    if (!joiningYear || !branchCode || !semester) {
      setError("Please select joining year, branch, and semester.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await axios.get(
        `http://localhost:3002/admin/students/subjects/${joiningYear}/${branchCode}/${semester}`,
        {
          headers: { Authorization: `${token}` },
        }
      );

      setSubjects(response.data.uniqueSubjects);
      setJntunos(response.data.allJntunos);
      toast.success("Subjects fetched successfully!");
    } catch (err) {
      setError("Failed to fetch subjects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (subjectcode, joiningyear, semesternumber) => {
    if (jntunos.length === 0) {
      toast.error("No JNTU numbers available for this subject.");
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:3002/admin/downloadreport/${semesternumber}`,
        { subjectcode, jntunos },
        {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `${joiningyear}-semester${semesternumber}-${subjectcode}.xlsx`;

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download report. Please try again.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl mt-10">
      <h2 className="text-2xl font-semibold text-center text-gray-700 mb-4">
        Fetch Unique Subjects
      </h2>

      {/* Dropdowns */}
      <div className="grid grid-cols-3 gap-4">
        <select
          className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 transition"
          value={joiningYear}
          onChange={(e) => setJoiningYear(e.target.value)}
        >
          <option value="">Select Joining Year</option>
          {joiningYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 transition"
          value={branchCode}
          onChange={(e) => setBranchCode(e.target.value)}
        >
          <option value="">Select Branch</option>
          {Object.entries(branchMapping).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>

        <select
          className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 transition"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        >
          <option value="">Select Semester</option>
          {semesterNumbers.map((sem) => (
            <option key={sem} value={sem}>
              {sem}
            </option>
          ))}
        </select>
      </div>

      {/* Fetch Button */}
      <button
        className="w-full cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 mt-4 rounded-lg transition"
        onClick={fetchSubjects}
      >
        Fetch Subjects
      </button>

      {/* Loading Animation */}
      {loading && (
        <motion.div
          className="mt-4 flex justify-center"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && <p className="text-red-500 mt-2 text-center">{error}</p>}

      {/* Subjects Table */}
      {subjects.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Unique Subjects:
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Subject Code</th>
                  <th className="border p-2 text-left">Subject Name</th>
                  <th className="border p-2 text-center">Download Report</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(({ subjectcode, subjectname }, index) => (
                  <tr key={index} className="border-t">
                    <td className="border p-2">{subjectcode}</td>
                    <td className="border p-2">{subjectname}</td>
                    <td className="border p-2 text-center">
                      <button
                        className="bg-green-500 cursor-pointer hover:bg-green-600 text-white px-4 py-1 rounded transition"
                        onClick={() =>
                          downloadReport(subjectcode, joiningYear, semester)
                        }
                      >
                        Download Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JNTU Numbers */}
      {jntunos.length > 0 && (
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            JNTU Numbers:
          </h3>
          <div className="flex flex-wrap gap-2">
            {jntunos.map((jntuno, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm"
              >
                {jntuno}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsFetcher;



