import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Cookies from 'js-cookie';

const ProtectedRoute = () => {
  const token = Cookies.get('studenttoken');

  return token ? <Outlet /> : <Navigate to="" />;
};

export default ProtectedRoute;