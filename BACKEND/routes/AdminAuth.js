import jwt from 'jsonwebtoken';

const AdminAuth = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.json({ message: 'Token not found' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.admin = decoded.mobilenumber; // Here, the admin's mobile number is decoded from the JWT token
    next();
  } catch (err) {
    return res.json({ error: 'Token not verified' });
  }
};

export default AdminAuth;
