import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

const Login = () => {
  const [jntuno, setJntuNo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get('studenttoken');
    if (token) {
      navigate('/student/ratings');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('https://co-rating-qn28.onrender.com/student/login', { jntuno });

      if (response.status === 200 && response.data.status === 'success') {
        Cookies.set('studenttoken', response.data.token, { expires: 2 / 24 });
        toast.success(response.data.message, { position: 'top-right' });
        setLoading(false);
        navigate('/student/ratings');
      } else {
        toast.error(response.data.message || 'Invalid login response.', { position: 'top-right' });
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message, { position: 'top-right' });
      } else {
        toast.error('Something went wrong. Please try again later.', { position: 'top-right' });
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 animate-pulse">
          Login
        </h1>
        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label
              htmlFor="jntuNo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              JNTU Number
            </label>
            <input
              type="text"
              id="jntuNo"
              placeholder="Enter your JNTU number"
              value={jntuno}
              onChange={(e) => setJntuNo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:shadow-lg transition-all duration-300"
            />
          </div>
          <button style={{cursor : "pointer"}}
            type="submit"
            className={`w-full py-3 mt-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md font-medium transition-transform duration-300 ${
              loading ? 'cursor-not-allowed opacity-75' : 'hover:scale-105'
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="w-5 h-5 mr-2 text-white animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
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
                Processing...
              </div>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
