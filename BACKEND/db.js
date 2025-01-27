
import mysql from 'mysql2/promise';

const connection = mysql.createPool({
  host: '103.21.58.5',
  user: 'stepcone2024',
  password:  'Curie@1867',
  database: 'stepcone',
  waitForConnections: true,
  connectionLimit: 200,
  queueLimit: 0,
});

console.log('Successfully connected to the database.');

export default connection;