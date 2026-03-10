// API Configuration
// Change this URL when deploying to production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://ali-smart-finder.onrender.com'
  : 'https://ali-smart-finder.onrender.com';

export default API_BASE_URL;
