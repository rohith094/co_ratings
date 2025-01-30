// import React, { useState } from 'react';
// import Cookies from 'js-cookie';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';

// const AddSubject = () => {
//   const [formData, setFormData] = useState({
//     subjectcode: '',
//     subjectname: '',
//     semesternumber: '',
//     branchcode: '',
//   });
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   const handleInputChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleAddSubject = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const token = Cookies.get('admintoken');
//       await axios.post('http://localhost:3002/admin/addsubject', formData, {
//         headers: { Authorization: `${token}` },
//       });
//       toast.success('Subject added successfully');
//       navigate('/admin/subjects');
//     } catch (error) {
//       toast.error('Error adding subject');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100">
//       <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
//         <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Add Subject</h2>
//         <form onSubmit={handleAddSubject} className="space-y-4">
//           <div>
//             <label className="block text-gray-700 font-semibold mb-1">Subject Code:</label>
//             <input
//               type="text"
//               name="subjectcode"
//               value={formData.subjectcode}
//               onChange={handleInputChange}
//               required
//               className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-gray-700 font-semibold mb-1">Subject Name:</label>
//             <input
//               type="text"
//               name="subjectname"
//               value={formData.subjectname}
//               onChange={handleInputChange}
//               required
//               className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-gray-700 font-semibold mb-1">Semester Number:</label>
//             <input
//               type="number"
//               name="semesternumber"
//               value={formData.semesternumber}
//               onChange={handleInputChange}
//               required
//               className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-gray-700 font-semibold mb-1">Branch Code:</label>
//             <input
//               type="text"
//               name="branchcode"
//               value={formData.branchcode}
//               onChange={handleInputChange}
//               required
//               className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <button
//             type="submit"
//             className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition flex justify-center items-center"
//             disabled={loading}
//           >
//             {loading ? (
//               <svg
//                 className="animate-spin h-5 w-5 mr-2 border-t-2 border-white rounded-full"
//                 viewBox="0 0 24 24"
//               ></svg>
//             ) : (
//               'Add Subject'
//             )}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default AddSubject;

import React, { useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const branchMapping = {
  '42': 'AIML',
  '45': 'AIDS',
  '5': 'CSE',
};

const AddSubject = () => {
  const [formData, setFormData] = useState({
    subjectcode: '',
    subjectname: '',
    semesternumber: '',
    branchcode: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = Cookies.get('admintoken');
      await axios.post('http://localhost:3002/admin/addsubject', formData, {
        headers: { Authorization: `${token}` },
      });
      toast.success('Subject added successfully');
      navigate('/admin/subjects');
    } catch (error) {
      toast.error('Error adding subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl  w-full max-w-lg">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Add Subject</h2>
        <form onSubmit={handleAddSubject} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Subject Code:</label>
            <input
              type="text"
              name="subjectcode"
              value={formData.subjectcode}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Subject Name:</label>
            <input
              type="text"
              name="subjectname"
              value={formData.subjectname}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Semester Number:</label>
            <select
              name="semesternumber"
              value={formData.semesternumber}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select Semester</option>
              {[...Array(8).keys()].map(num => (
                <option key={num + 1} value={num + 1}>{num + 1}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Branch Code:</label>
            <select
              name="branchcode"
              value={formData.branchcode}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select Branch</option>
              {Object.entries(branchMapping).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition flex justify-center items-center cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2 border-t-2 border-white rounded-full"
                viewBox="0 0 24 24"
              ></svg>
            ) : (
              'Add Subject'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddSubject;