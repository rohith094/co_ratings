import { motion } from "framer-motion";
import Confetti from "react-confetti";
import Cookies from 'js-cookie';
import { useNavigate } from "react-router-dom";
function FeedbackThankYou() {
  const navigate = useNavigate();
  const confettiConfig = {
    numberOfPieces: 200,
    gravity: 0.2,
    colors: ["#6366F1", "#60A5FA", "#A78BFA", "#34D399", "#FBBF24"],
  };

  return (
    <div className="relative flex items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Confetti Effect */}
      <Confetti width={window.innerWidth} height={window.innerHeight} {...confettiConfig} />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-lg"
      >
        {/* Animated Illustration */}
        <motion.img
          src="https://cdn-icons-png.flaticon.com/512/3876/3876556.png"
          alt="Thank You Illustration"
          className="w-40 mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: "backOut" }}
        />

        {/* Message */}
        <h1 className="text-3xl font-bold text-gray-800">
          Thank you for your feedback!
        </h1>
        <p className="mt-2 text-gray-600">
          You may logout now.
        </p>

        {/* Logout Button */}
        <motion.button
          onClick={() => {
            Cookies.remove('studenttoken');
            navigate('/login');
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="mt-6 px-6 py-3 text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 cursor-pointer"
        >
          Logout
        </motion.button>
      </motion.div>
    </div>
  );
}

export default FeedbackThankYou;
