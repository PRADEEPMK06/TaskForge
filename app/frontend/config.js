// Detect API URL based on environment
function getApiUrl() {
  // If already set globally, use it
  if (window.TASKFORGE_API_URL) {
    return window.TASKFORGE_API_URL;
  }
  
  // Production on Render
  if (window.location.hostname.includes('onrender.com')) {
    return 'https://taskforge-backend-v3z4.onrender.com/api/v1';
  }
  
  // Local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000/api/v1';
  }
  
  // Custom domain - assume backend is on same domain with /api prefix
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}/api/v1`;
}

window.TASKFORGE_API_URL = getApiUrl();

