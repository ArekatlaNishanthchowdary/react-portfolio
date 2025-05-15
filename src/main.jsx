import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Import Font Awesome locally
import '@fortawesome/fontawesome-free/css/all.min.css'

// Add Google Fonts
const googleFonts = document.createElement('link');
googleFonts.rel = 'stylesheet';
googleFonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap';
document.head.appendChild(googleFonts);

// Add custom z-index style
const style = document.createElement('style');
style.textContent = `
  /* Custom z-index for proper stacking */
  .z-binary {
    z-index: -5;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
