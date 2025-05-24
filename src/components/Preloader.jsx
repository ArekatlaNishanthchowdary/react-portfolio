import { useEffect } from 'react';
import '../Preloader.css';

const Preloader = ({ onLoadComplete }) => {
  useEffect(() => {
    // Trigger the completion after animations (3s total)
    const timer = setTimeout(() => {
      onLoadComplete();
    }, 3000); // Increased to 3 seconds to allow for welcome animation

    return () => clearTimeout(timer);
  }, [onLoadComplete]);

  return (
    <div className="preloader">
      <div className="preloader-content">
        <h1 className="welcome-text">Welcome to My Portfolio</h1>
        <div className="line"></div>
        <div className="icons-container">
          <i className="fab fa-python tech-icon" title="Python"></i>
          <i className="fas fa-brain tech-icon" title="Machine Learning"></i>
          <i className="fas fa-code tech-icon" title="Programming"></i>
          <i className="fab fa-react tech-icon" title="React"></i>
          <i className="fas fa-robot tech-icon" title="AI"></i>
        </div>
      </div>
    </div>
  );
};

export default Preloader; 