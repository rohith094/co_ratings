import React from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Ratings from "./components/Ratings";
import { ToastContainer } from 'react-toastify';
import ProtectedRoute from "./ProtectedRoute";
import FeedbackThankyou from "./components/FeedbackThankyou";
import AdminLogin from "./components/AdminLogin";
import AddSubject from "./components/AddSubject";
import AdminProtectedRoute from './AdminProtectedRoute';
import SubjectsUpload from "./components/SubjectsUpload";
import CourseOutcomesUpload from "./components/CourseOutcomesUpload";
import StudentsUpload from "./components/StudentsUpload";

function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />}></Route>
        <Route path="/login" element={<Login />} />
        <Route path="/addsubject" element={<AddSubject />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/student/ratings" element={<Ratings />} />
          <Route path="/feedbacksubmitted" element={<FeedbackThankyou />} />
        </Route>

        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin/uploadsubjects" element={<SubjectsUpload />} />
          <Route path="/admin/uploadcourseoutcomes" element={<CourseOutcomesUpload />} />
          <Route path="/admin/uploadstudents" element={<StudentsUpload />} />
        </Route>
      </Routes>
      <Outlet />
    </>
  );
}

export default App;
