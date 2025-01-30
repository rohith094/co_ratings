import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Cookies from 'js-cookie';

const AdminProtectedRoute = () => {
  const token = Cookies.get('admintoken');

  return token ? <Outlet /> : <Navigate to="" />;
};

export default AdminProtectedRoute;