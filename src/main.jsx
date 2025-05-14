import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Add Font Awesome and Google Fonts
const fontAwesome = document.createElement('link');
fontAwesome.rel = 'stylesheet';
fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
fontAwesome.integrity = 'sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==';
fontAwesome.crossOrigin = 'anonymous';
fontAwesome.referrerPolicy = 'no-referrer';
document.head.appendChild(fontAwesome);

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
