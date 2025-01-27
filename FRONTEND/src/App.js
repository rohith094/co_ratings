import React from "react";
import { Navigate, Outlet, Route,Routes } from "react-router-dom";
import Login from "./components/Login";
import Ratings from "./components/Ratings";
import { ToastContainer } from 'react-toastify';
import ProtectedRoute from "./ProtectedRoute";
import FeedbackThankyou from "./components/FeedbackThankyou";

function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />}></Route>
        <Route path="/login" element={<Login />} />
        <Route path="/feedbacksubmitted" element={<FeedbackThankyou />} />
        <Route element={<ProtectedRoute />}>
        <Route path="/student/ratings" element={<Ratings />} />

        </Route>
        
      </Routes>
      <Outlet />
      </>
  );
}

export default App;
