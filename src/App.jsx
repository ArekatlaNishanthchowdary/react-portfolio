import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';
import emailjs from '@emailjs/browser';
import VanillaTilt from 'vanilla-tilt';
import './index.css';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const bgCanvasRef = useRef(null);
  const contactFormRef = useRef(null);
  const [formStatus, setFormStatus] = useState({ message: '', type: '' });

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init("mHOKmkvlGWOsdMT-b")
  }, []);

  // Initialize WebGL background
  useEffect(() => {
    console.log("Initializing WebGL background");
    let scene, camera, renderer;
    let model;
    const canvas = bgCanvasRef.current;

    // Check if WebGL is supported
    try {
      if (!canvas) {
        console.error('Canvas reference is null');
        return;
      }
      
      if (window.WebGLRenderingContext) {
        console.log('WebGL is supported, initializing...');
        initWebGL();
      } else {
        console.error('WebGL is not supported by your browser');
        // Show fallback background for devices without WebGL
        document.getElementById('fallback-bg').style.opacity = 1;
      }
    } catch (e) {
      console.error('Error initializing WebGL:', e);
      document.getElementById('fallback-bg').style.opacity = 1;
    }

    function initWebGL() {
      // Scene setup
      console.log('Setting up WebGL scene');
      scene = new THREE.Scene();
      scene.background = null; // Ensure transparent background
      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5; // Move camera even closer

      // Renderer setup
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0); // Completely transparent background
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // Don't set z-index directly on the canvas to avoid glitching
      // Instead, manage z-index through CSS classes

      // Add lighting - much brighter
      const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); 
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
      directionalLight.position.set(5, 5, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Add point lights from multiple directions
      const pointLight1 = new THREE.PointLight(0xffffff, 2.0);
      pointLight1.position.set(0, 0, 10);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0xffffff, 1.0);
      pointLight2.position.set(-10, 0, 5);
      scene.add(pointLight2);

      const pointLight3 = new THREE.PointLight(0xffffff, 1.0);
      pointLight3.position.set(10, 0, 5);
      scene.add(pointLight3);

      // Create data flow background effect
      function createParticleSystem() {
        // Configuration parameters
        const numParticles = 800;
        const particleSize = 0.5;
        const flowfieldSize = 100;
        const flowfieldResolution = 12;
        const particleBaseSpeed = 0.04;
        const particleSpeedVariation = 0.03;
        const curveIntensity = 6.0;
        
        // Animation control
        let animationTimer = 0;
        let animationPhase = 0; // 0=flow field, 1=forming car, 2=car complete
        let finalShapeComplete = false;
        const transitionTime = 6000; // 6 seconds in milliseconds
        
        // Create particle geometry and material
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(numParticles * 3);
        const particleSizes = new Float32Array(numParticles);
        const particleColors = new Float32Array(numParticles * 3);
        
        // Create points for flowing lines
        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = new Float32Array(numParticles * 6); // Start and end points for each line
        
        // Particles data structure for animation
        const particles = [];
        
        // Create flow field grid - will be used to determine particle movement
        const flowField = [];
        for (let i = 0; i < flowfieldResolution; i++) {
          flowField[i] = [];
          for (let j = 0; j < flowfieldResolution; j++) {
            flowField[i][j] = [];
            for (let k = 0; k < flowfieldResolution; k++) {
              // Create a vector field with smooth variation
              const angle1 = Math.sin(i / flowfieldResolution * Math.PI * 2) * curveIntensity;
              const angle2 = Math.cos(j / flowfieldResolution * Math.PI * 2) * curveIntensity;
              const angle3 = Math.sin((i+j+k) / (flowfieldResolution*3) * Math.PI * 2) * curveIntensity;
              
              flowField[i][j][k] = new THREE.Vector3(
                Math.sin(angle1),
                Math.sin(angle2),
                Math.sin(angle3)
              ).normalize();
            }
          }
        }
        
        // Create target shapes
        const carPoints = createCarShape();
        
        // Generate car shape pattern
        function createCarShape() {
          const points = [];
          
          // Car dimensions
          const carWidth = 30;
          const carLength = 50;
          const carHeight = 12;
          const z = 15; // Fixed Z position for 2D-like appearance
          
          // Car body (main rectangle)
          for (let i = 0; i < 300; i++) {
            const x = (Math.random() * 2 - 1) * carWidth;
            const y = (Math.random() * 2 - 1) * carLength;
            points.push(new THREE.Vector3(x, y, z));
          }
          
          // Car roof (narrower rectangle on top)
          for (let i = 0; i < 150; i++) {
            const x = (Math.random() * 2 - 1) * (carWidth * 0.6);
            const y = (Math.random() * 2 - 1) * (carLength * 0.4);
            points.push(new THREE.Vector3(x, y, z + carHeight));
          }
          
          // Wheels (4 circles)
          const wheelRadius = 8;
          const wheelPositions = [
            { x: -carWidth * 0.8, y: -carLength * 0.4, z: z - 2 }, // Front left
            { x: carWidth * 0.8, y: -carLength * 0.4, z: z - 2 },  // Front right
            { x: -carWidth * 0.8, y: carLength * 0.4, z: z - 2 },  // Rear left
            { x: carWidth * 0.8, y: carLength * 0.4, z: z - 2 }    // Rear right
          ];
          
          // Add wheel particles
          for (let wheel of wheelPositions) {
            for (let i = 0; i < 60; i++) {
              const angle = Math.random() * Math.PI * 2;
              const r = Math.random() * wheelRadius;
              const x = wheel.x + Math.cos(angle) * r;
              const y = wheel.y + Math.sin(angle) * r;
              points.push(new THREE.Vector3(x, y, wheel.z));
            }
          }
          
          // Headlights
          for (let i = 0; i < 30; i++) {
            const x = -carWidth * 0.6 + (i % 2) * carWidth * 1.2; // Left and right headlights
            const y = -carLength * 0.48;
            points.push(new THREE.Vector3(x, y, z));
          }
          
          // Fill remaining points if needed
          while (points.length < numParticles) {
            const x = (Math.random() * 2 - 1) * carWidth;
            const y = (Math.random() * 2 - 1) * carLength;
            const pz = z + (Math.random() > 0.7 ? carHeight : 0); // Some points on roof, some on body
            points.push(new THREE.Vector3(x, y, pz));
          }
          
          // Ensure we have exactly the right number of points
          return points.slice(0, numParticles);
        }
        
        // Initialize particles with random positions
        for (let i = 0; i < numParticles; i++) {
          // Random position within flowfield bounds
          const x = (Math.random() - 0.5) * flowfieldSize;
          const y = (Math.random() - 0.5) * flowfieldSize;
          const z = (Math.random() - 0.5) * flowfieldSize;
          
          particlePositions[i * 3] = x;
          particlePositions[i * 3 + 1] = y;
          particlePositions[i * 3 + 2] = z;
          
          // Particle size variation
          const size = particleSize * (0.8 + Math.random() * 0.5);
          particleSizes[i] = size;
          
          // Initial color (blue to cyan gradient)
          const positionRatio = new THREE.Vector3(x, y, z).length() / (flowfieldSize * 0.5);
          let r = 0.0;
          let g = 0.5 * positionRatio;
          let b = 0.7 + 0.3 * positionRatio;
          
          particleColors[i * 3] = r;
          particleColors[i * 3 + 1] = g;
          particleColors[i * 3 + 2] = b;
          
          // Store particle data
          particles.push({
            position: new THREE.Vector3(x, y, z),
            size: size,
            speed: particleBaseSpeed + Math.random() * particleSpeedVariation,
            lastPosition: new THREE.Vector3(x, y, z),
            originalColor: { r, g, b },
            targetPosition: new THREE.Vector3(),
            targetIndex: i
          });
          
          // Initialize line segments
          linePositions[i * 6] = x;
          linePositions[i * 6 + 1] = y;
          linePositions[i * 6 + 2] = z;
          linePositions[i * 6 + 3] = x;
          linePositions[i * 6 + 4] = y;
          linePositions[i * 6 + 5] = z;
        }
        
        // Set attributes for particle system
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        // Use a simpler material that doesn't require external textures
        const particleMaterial = new THREE.PointsMaterial({
          size: particleSize * 3,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          transparent: true,
          sizeAttenuation: true
        });
        
        // Create particle system
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);
        
        // Setup line geometry
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x2299ff,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending
        });
        const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene.add(lines);
        
        // Position camera for best view
        camera.position.set(0, 0, 80);
        camera.lookAt(0, 0, 0);
        
        // Function to get flow direction at a position
        function getFlowDirection(position) {
          // Convert position to flow field grid coordinate
          const gridSize = flowfieldSize / flowfieldResolution;
          const i = Math.floor((position.x + flowfieldSize/2) / gridSize);
          const j = Math.floor((position.y + flowfieldSize/2) / gridSize);
          const k = Math.floor((position.z + flowfieldSize/2) / gridSize);
          
          // Check bounds
          const ii = Math.max(0, Math.min(flowfieldResolution-1, i));
          const jj = Math.max(0, Math.min(flowfieldResolution-1, j));
          const kk = Math.max(0, Math.min(flowfieldResolution-1, k));
          
          return flowField[ii][jj][kk].clone();
        }
        
        // Check if a position is out of bounds and wrap if needed
        function checkBounds(position) {
          const boundSize = flowfieldSize * 0.4;
          
          if (position.x > boundSize) position.x = -boundSize;
          else if (position.x < -boundSize) position.x = boundSize;
          
          if (position.y > boundSize) position.y = -boundSize;
          else if (position.y < -boundSize) position.y = boundSize;
          
          if (position.z > boundSize) position.z = -boundSize;
          else if (position.z < -boundSize) position.z = boundSize;
        }
        
        // Initiate transition to car shape
        function startCarFormation() {
          console.log("Starting car formation");
          animationPhase = 1;
          
          // Assign target positions from the car shape
          for (let i = 0; i < particles.length; i++) {
            particles[i].targetPosition.copy(carPoints[i % carPoints.length]);
          }
        }
        
        // Animation function - called every frame
        function animateFlow() {
          // Update animation timer
          animationTimer += 16; // ~16ms per frame
          
          // Check if we should switch to car formation after 6 seconds
          if (animationPhase === 0 && animationTimer >= transitionTime) {
            console.log("6 seconds elapsed, transitioning to car formation");
            animationTimer = 0;
            startCarFormation();
          }
          
          // Check if we should switch to phase 3 (6 seconds after car is complete)
          if (animationPhase === 2 && finalShapeComplete && animationTimer >= transitionTime) {
            console.log("Starting phase 3 animation");
            animationTimer = 0;
            animationPhase = 3;
            startPhaseThree();
          }
          
          // Handle each animation phase
          if (animationPhase === 0) {
            // Flow field phase - particles follow the vector field
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Get flow direction and move particle
              const flowDir = getFlowDirection(particle.position);
              particle.position.add(flowDir.multiplyScalar(particle.speed));
              
              // Check boundaries and wrap around if needed
              checkBounds(particle.position);
              
              // Update position in buffer
              particlePositions[i * 3] = particle.position.x;
              particlePositions[i * 3 + 1] = particle.position.y;
              particlePositions[i * 3 + 2] = particle.position.z;
              
              // Update line positions for trails
              linePositions[i * 6] = particle.lastPosition.x;
              linePositions[i * 6 + 1] = particle.lastPosition.y;
              linePositions[i * 6 + 2] = particle.lastPosition.z;
              linePositions[i * 6 + 3] = particle.position.x;
              linePositions[i * 6 + 4] = particle.position.y;
              linePositions[i * 6 + 5] = particle.position.z;
              
              // Keep original flow field colors
              particleColors[i * 3] = particle.originalColor.r;
              particleColors[i * 3 + 1] = particle.originalColor.g;
              particleColors[i * 3 + 2] = particle.originalColor.b;
            }
            
            // Rotate the entire scene slightly for more visual interest
            particleSystem.rotation.y += 0.0005;
            lines.rotation.y += 0.0005;
          } 
          else if (animationPhase === 1 || animationPhase === 2) {
            // Car formation or completed phase
            let formationComplete = true;
            
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              if (animationPhase === 1) {
                // Moving toward target positions in car shape
                const toTarget = particle.targetPosition.clone().sub(particle.position);
                const distToTarget = toTarget.length();
                
                if (distToTarget > 0.1) {
                  // Not at target yet
                  formationComplete = false;
                  
                  // Move faster based on distance
                  const moveSpeed = Math.min(distToTarget * 0.1, 2.0);
                  toTarget.normalize().multiplyScalar(moveSpeed);
                  particle.position.add(toTarget);
                } else {
                  // Snap to exact position when close
                  particle.position.copy(particle.targetPosition);
                }
                
                // Color transition based on car part
                let targetR, targetG, targetB;
                
                // Headlights (yellow)
                if (particle.position.y < -20 && Math.abs(particle.position.x) > 10) {
                  targetR = 1.0;
                  targetG = 1.0;
                  targetB = 0.3;
                } 
                // Taillights (red)
                else if (particle.position.y > 20 && Math.abs(particle.position.x) > 10) {
                  targetR = 1.0;
                  targetG = 0.2;
                  targetB = 0.2;
                }
                // Body (blue)
                else {
                  targetR = 0.1;
                  targetG = 0.5;
                  targetB = 1.0;
                }
                
                // Blend colors based on distance to target
                const blend = Math.max(0, Math.min(1, 1 - distToTarget / 20));
                particleColors[i * 3] = particle.originalColor.r * (1 - blend) + targetR * blend;
                particleColors[i * 3 + 1] = particle.originalColor.g * (1 - blend) + targetG * blend;
                particleColors[i * 3 + 2] = particle.originalColor.b * (1 - blend) + targetB * blend;
                
                // Slightly increase size during formation
                particleSizes[i] = particle.size * (1 + blend * 0.5);
              }
              
              // Update positions in buffer
              particlePositions[i * 3] = particle.position.x;
              particlePositions[i * 3 + 1] = particle.position.y;
              particlePositions[i * 3 + 2] = particle.position.z;
              
              // Update line positions for trails
              linePositions[i * 6] = particle.lastPosition.x;
              linePositions[i * 6 + 1] = particle.lastPosition.y;
              linePositions[i * 6 + 2] = particle.lastPosition.z;
              linePositions[i * 6 + 3] = particle.position.x;
              linePositions[i * 6 + 4] = particle.position.y;
              linePositions[i * 6 + 5] = particle.position.z;
            }
            
            // Check if car formation is complete
            if (animationPhase === 1 && formationComplete) {
              console.log("Car formation complete");
              animationPhase = 2;
              finalShapeComplete = true;
              animationTimer = 0; // Reset timer to track time since car formation completed
            }
            
            // If car is complete, make it drive
            if (finalShapeComplete) {
              // Move the car (move both particle system and lines)
              particleSystem.position.y -= 0.15;
              lines.position.y -= 0.15;
              
              // Wrap around when car reaches the edge
              if (particleSystem.position.y < -50) {
                particleSystem.position.y = 50;
                lines.position.y = 50;
              }
            }
          }
          else if (animationPhase === 3) {
            // Phase 3: Spiral pattern
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Calculate spiral movement
              const time = Date.now() * 0.001;
              const index = i / particles.length;
              const radius = 20 + 10 * Math.sin(time * 0.2 + index * Math.PI * 2);
              const angle = index * Math.PI * 20 + time * 0.5;
              
              // Update position based on spiral pattern
              const targetX = Math.cos(angle) * radius;
              const targetY = Math.sin(angle) * radius;
              const targetZ = Math.sin(time * 0.3 + index * Math.PI) * 15;
              
              // Smoothly interpolate to target position
              particle.position.x += (targetX - particle.position.x) * 0.03;
              particle.position.y += (targetY - particle.position.y) * 0.03;
              particle.position.z += (targetZ - particle.position.z) * 0.03;
              
              // Update colors to create rainbow effect
              const hue = (time * 0.1 + index) % 1;
              const rgb = hslToRgb(hue, 0.7, 0.5);
              
              particleColors[i * 3] = rgb[0];
              particleColors[i * 3 + 1] = rgb[1];
              particleColors[i * 3 + 2] = rgb[2];
              
              // Update position in buffer
              particlePositions[i * 3] = particle.position.x;
              particlePositions[i * 3 + 1] = particle.position.y;
              particlePositions[i * 3 + 2] = particle.position.z;
              
              // Update line positions for trails
              linePositions[i * 6] = particle.lastPosition.x;
              linePositions[i * 6 + 1] = particle.lastPosition.y;
              linePositions[i * 6 + 2] = particle.lastPosition.z;
              linePositions[i * 6 + 3] = particle.position.x;
              linePositions[i * 6 + 4] = particle.position.y;
              linePositions[i * 6 + 5] = particle.position.z;
            }
            
            // Rotate the scene for added effect
            particleSystem.rotation.y += 0.001;
            particleSystem.rotation.x += 0.0005;
          }
          
          // Update the geometries
          particleGeometry.attributes.position.needsUpdate = true;
          particleGeometry.attributes.size.needsUpdate = true;
          particleGeometry.attributes.color.needsUpdate = true;
          lineGeometry.attributes.position.needsUpdate = true;
          
          // Request the next frame
          requestAnimationFrame(animateFlow);
          
          // Render the scene
        renderer.render(scene, camera);
      }

        // Helper function to convert HSL to RGB for smooth color transitions
        function hslToRgb(h, s, l) {
          let r, g, b;
          
          if (s === 0) {
            r = g = b = l; // achromatic
          } else {
            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
          }
          
          return [r, g, b];
        }
        
        // Function to start phase three animation
        function startPhaseThree() {
          // Reset particle system position from car phase
          particleSystem.position.set(0, 0, 0);
          lines.position.set(0, 0, 0);
          
          // Optional: Add a transition effect
          for (let i = 0; i < particles.length; i++) {
            // Slightly scatter particles for a nice transition
            particles[i].position.x += (Math.random() - 0.5) * 5;
            particles[i].position.y += (Math.random() - 0.5) * 5;
            particles[i].position.z += (Math.random() - 0.5) * 5;
          }
        }

        // Start the animation loop
        animateFlow();

      // Handle window resize
      function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }

      window.addEventListener('resize', handleResize);

        // Return cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        if (renderer) {
          renderer.dispose();
          scene.clear();
        }
      };
      }

      // Initialize particle system and get cleanup function
      const cleanup = createParticleSystem();

      // Return cleanup function for useEffect
      return cleanup;
    }
  }, []);

  // Initialize tilt effect on project cards
  useEffect(() => {
    const projectCards = document.querySelectorAll('.project-card');
    if (projectCards.length > 0) {
      VanillaTilt.init(projectCards, {
        max: 5,
        speed: 400,
        glare: false,
        "max-glare": 0.2,
      });
    }
  }, []);

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Handle project modal
  const openProjectModal = (projectId) => {
    setActiveModal(projectId);
    document.body.classList.add('overflow-hidden');
  };

  const closeProjectModal = () => {
    setActiveModal(null);
    document.body.classList.remove('overflow-hidden');
  };

  // Handle contact form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus({ message: 'Sending...', type: 'info' });
    
    console.log("Sending email via EmailJS...");
    console.log("Form data:", {
      name: contactFormRef.current.name.value,
      email: contactFormRef.current.email.value,
      message: contactFormRef.current.message.value.substring(0, 20) + "..."
    });

    emailjs.sendForm(
      'service_a4cirzr', // Your EmailJS service ID
      'template_b681597', // Your EmailJS template ID
      contactFormRef.current,
      'mHOKmkvlGWOsdMT-b' // Your EmailJS public key
    )
      .then((result) => {
        console.log("Email sent successfully:", result.text);
        setFormStatus({ message: 'Message sent successfully!', type: 'success' });
        contactFormRef.current.reset();
      })
      .catch((error) => {
        console.error("EmailJS error:", error);
        setFormStatus({ 
          message: `Failed to send message: ${error.text || 'Network error'}. Please try again or contact directly via email.`, 
          type: 'error' 
        });
      });
  };

  // Project details
  const projects = [
    {
      id: 'project1',
      title: 'IoT-Enabled Emergency Vehicle Detection',
      description: 'An intelligent traffic management system that prioritizes emergency vehicles using YOLOv8x and IoT cameras.',
      icon: 'fas fa-traffic-light',
      gradient: 'from-slate-800 to-cyan-500',
      tags: ['Python', 'OpenCV', 'YOLOv8x', 'IoT'],
      features: [
        'Real-time emergency vehicle detection using YOLOv8x with 0.92 mAP accuracy',
        'Vehicle tracking module with 0.89 MOTA performance',
        'Adaptive signal control using virtual red and blue detection lines',
        'Demonstrated 35% reduction in emergency vehicle response time (45s to 29s)',
        'Scalable architecture ideal for smart city applications'
      ],
      overview: 'This intelligent traffic management system prioritizes emergency vehicles in urban settings to reduce response times. It integrates IoT cameras for real-time video capture and uses the YOLOv8x model for accurate vehicle detection and classification.',
      github: '#',
      demo: '#',
      image: 'https://placehold.co/600x400/1e293b/38bdf8?text=Emergency+Vehicle+Detection'
    },
    {
      id: 'project2',
      title: 'Explainable Hybrid Model for Accident Severity',
      description: 'An ensemble model using LightGBM, SVM, and Random Forest with VAE-based feature augmentation for predicting accident severity.',
      icon: 'fas fa-car-crash',
      gradient: 'from-gray-900 to-green-500',
      tags: ['Python', 'LightGBM', 'SVM', 'XAI', 'Random Forest', 'VAE'],
      features: [
        '93.36% accuracy in classifying accidents into Minor, Severe, and Fatal categories',
        'Addresses imbalanced datasets using hybrid feature augmentation',
        'XAI implementation using LIME highlights key factors like Cause_of_accident (0.24) and Weather_conditions (0.21)',
        'Validated on 31,245 records from a 284,807-record real-world dataset',
        'Ablation study confirmed 3.7% performance gain with hybrid features'
      ],
      overview: 'This project develops an explainable hybrid ensemble model for predicting road accident severity, integrating LightGBM, Support Vector Machine (SVM), and Random Forest. The model is enhanced by a variational autoencoder (VAE)-based feature augmentation technique inspired by hybrid quantum-classical methods.',
      github: '#',
      demo: '#',
      image: 'https://placehold.co/600x400/1e293b/a855f7?text=Accident+Severity+Prediction'
    },
    {
      id: 'project3',
      title: 'AI-Powered Sentiment Analysis',
      description: 'A project analyzing social media sentiment using natural language processing techniques.',
      icon: 'fas fa-comments',
      gradient: 'from-black to-blue-600',
      tags: ['Python', 'NLTK', 'BERT', 'PyTorch'],
      features: [
        'Pre-trained BERT model fine-tuned for sentiment analysis',
        'Real-time processing of social media streams',
        'Visualization of sentiment trends over time',
        'Multi-language support'
      ],
      overview: 'A NLP-based system that analyzes sentiment from social media posts and comments. It uses BERT for contextual understanding and classifies text as positive, negative, or neutral.',
      github: '#',
      demo: '#',
      image: 'https://placehold.co/600x400/1e293b/ec4899?text=Sentiment+Analysis'
    }
  ];

  const socialLinks = [
    {
      name: 'GitHub',
      url: 'https://github.com/ArekatlaNishanthchowdary',
      icon: 'fab fa-github'
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/nishanth-chowdary-arekatla-4a8b1b1b3/',
      icon: 'fab fa-linkedin'
    },
    {
      name: 'Twitter',
      url: 'https://x.com/NishantP4K',
      icon: 'fab fa-twitter'
    }
  ];

  return (
    <>
      {/* WebGL Background Canvas */}
      <canvas ref={bgCanvasRef} id="bg-canvas" className="fixed top-0 left-0 w-full h-full -z-5 blur-[2px] opacity-85"></canvas>

      {/* Fallback Background for Low-end Devices */}
      <div id="fallback-bg" className="fixed top-0 left-0 w-full h-full bg-gradient-to-br from-black via-slate-900 to-black -z-10 opacity-0"></div>

      {/* Main Content */}
      <div id="app" className="relative z-30">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-lg bg-primary/50 border-b border-accent-purple/20">
          <div className="container py-4 flex justify-between items-center">
            <div className="text-xl font-bold">
              <span className="text-accent-blue">Nish</span><span className="text-accent-purple">anth</span>
            </div>
            
            <div className="hidden md:flex space-x-6">
              <a href="#home" className="hover:text-accent-blue transition-colors">Home</a>
              <a href="#about" className="hover:text-accent-blue transition-colors">About</a>
              <a href="#projects" className="hover:text-accent-blue transition-colors">Projects</a>
              <a href="#contact" className="hover:text-accent-blue transition-colors">Contact</a>
            </div>
            
            <button id="mobile-menu-btn" className="md:hidden text-xl" onClick={toggleMobileMenu}>
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </nav>
        
        {/* Mobile Menu */}
        <div id="mobile-menu" className={`fixed top-16 left-0 w-full bg-secondary/95 backdrop-blur-md py-4 ${mobileMenuOpen ? 'block' : 'hidden'} z-40 border-b border-accent-purple/20`}>
          <div className="container flex flex-col space-y-4">
            <a href="#home" className="hover:text-accent-blue transition-colors">Home</a>
            <a href="#about" className="hover:text-accent-blue transition-colors">About</a>
            <a href="#projects" className="hover:text-accent-blue transition-colors">Projects</a>
            <a href="#contact" className="hover:text-accent-blue transition-colors">Contact</a>
          </div>
        </div>

        {/* Hero Section */}
        <section id="home" className="min-h-screen flex items-center pt-16">
          <div className="container">
            <div className="max-w-2xl p-8 rounded-xl">
              <h1 className="text-4xl md:text-6xl font-bold mb-2">
                <span className="text-white">Nishanth Chowdary</span>
              </h1>
              <h2 className="text-xl md:text-2xl text-accent-blue mb-4">AI Undergraduate Student</h2>
              <div id="typewriter" className="text-lg md:text-xl mb-8 h-8">Innovating AI for a Safer Future</div>
              <div className="flex flex-wrap gap-4 relative z-20">
                <a href="#projects" className="btn btn-primary inline-flex items-center justify-center min-w-[160px]">
                  <i className="fas fa-code-branch mr-2"></i> Explore Projects
                </a>
                <a href="#contact" className="btn btn-secondary inline-flex items-center justify-center min-w-[160px]">
                  <i className="fas fa-envelope mr-2"></i> Contact Me
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20">
          <div className="container">
            <h2 className="section-title backdrop-blur-md bg-black/10 p-2 rounded-lg inline-block mb-6">About Me</h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="backdrop-blur-md bg-black/10 p-6 rounded-xl">
                <p className="text-lg mb-6">
                  I am an AI undergraduate student at Amrita Vishwa Vidyapeetham, Amaravati, passionate about 
                  developing AI-driven solutions for real-world problems. My focus areas include computer vision, 
                  machine learning, and data analysis, with a special interest in safety applications.
                </p>
                <a href="/Resume.pdf" className="btn btn-primary" download>
                  <i className="fas fa-download mr-2"></i> Download Resume
                </a>
              </div>
              <div className="backdrop-blur-md bg-black/10 p-6 rounded-xl">
                <h3 className="text-2xl font-semibold mb-4">Technical Skills</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <div className="mr-3 text-accent-blue text-2xl">
                      <i className="fab fa-python"></i>
                    </div>
                    <div>
                      <h4 className="font-medium">Python</h4>
                      <div className="h-2 w-full bg-secondary/50 rounded-full mt-2">
                        <div className="h-full bg-accent-blue rounded-full" style={{ width: '90%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-3 text-accent-blue text-2xl">
                      <i className="fas fa-brain"></i>
                    </div>
                    <div>
                      <h4 className="font-medium">TensorFlow</h4>
                      <div className="h-2 w-full bg-secondary/50 rounded-full mt-2">
                        <div className="h-full bg-accent-purple rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-3 text-accent-blue text-2xl">
                      <i className="fas fa-camera"></i>
                    </div>
                    <div>
                      <h4 className="font-medium">OpenCV</h4>
                      <div className="h-2 w-full bg-secondary/50 rounded-full mt-2">
                        <div className="h-full bg-accent-pink rounded-full" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-3 text-accent-blue text-2xl">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div>
                      <h4 className="font-medium">Scikit-learn</h4>
                      <div className="h-2 w-full bg-secondary/50 rounded-full mt-2">
                        <div className="h-full bg-accent-blue rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="py-20 bg-secondary/30">
          <div className="container">
            <h2 className="section-title backdrop-blur-md bg-black/10 p-2 rounded-lg inline-block mb-6">My Projects</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map(project => (
                <div key={project.id} className="card project-card backdrop-blur-md bg-black/20" data-tilt data-tilt-max="5">
                  <div className={`h-48 rounded-lg mb-4 bg-gradient-to-r ${project.gradient} flex items-center justify-center`}>
                    <i className={`${project.icon} text-6xl`}></i>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                  <p className="mb-4 text-gray-300">{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.slice(0, 4).map((tag, index) => (
                      <span key={index} className="bg-accent-blue/20 text-accent-blue text-xs px-2 py-1 rounded">{tag}</span>
                    ))}
                  </div>
                  <button 
                    className="text-sm text-accent-blue hover:underline" 
                    onClick={() => openProjectModal(project.id)}>
                    <i className="fas fa-circle-info mr-1"></i> Learn More
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Project Modals */}
        <div 
          className={`project-modals fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 ${activeModal ? 'flex' : 'hidden'}`}
          onClick={closeProjectModal}>
          {projects.map(project => (
            <div 
              key={`${project.id}-modal`}
              id={`${project.id}-modal`} 
              className={`max-w-2xl w-full bg-secondary rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${activeModal === project.id ? 'block' : 'hidden'}`}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">{project.title}</h3>
                <button className="close-modal text-xl text-gray-400 hover:text-white" onClick={closeProjectModal}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="mb-6">
                <img src={project.image} alt={`${project.title} preview`} className="w-full rounded-lg mb-4" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Project Overview</h4>
              <p className="mb-4">{project.overview}</p>
              <h4 className="text-xl font-semibold mb-2">Key Features</h4>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                {project.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              <h4 className="text-xl font-semibold mb-2">Technologies Used</h4>
              <div className="flex flex-wrap gap-2 mb-6">
                {project.tags.map((tag, index) => (
                  <span key={index} className="bg-accent-blue/20 text-accent-blue px-3 py-1 rounded">{tag}</span>
                ))}
              </div>
              <div className="flex gap-4">
                <a href={project.github} className="btn btn-primary">
                  <i className="fab fa-github mr-2"></i> GitHub
                </a>
                <a href={project.demo} className="btn btn-secondary">
                  <i className="fas fa-desktop mr-2"></i> Demo
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <section id="contact" className="py-20">
          <div className="container">
            <h2 className="section-title backdrop-blur-md bg-black/10 p-2 rounded-lg inline-block mb-6">Get In Touch</h2>
            <div className="grid md:grid-cols-2 gap-10">
              <div className="backdrop-blur-md bg-black/10 p-6 rounded-xl">
                <h3 className="text-2xl font-semibold mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                      <i className="fas fa-envelope"></i>
                    </div>
                    <div>
                      <p className="text-gray-400">Email</p>
                      <a href="mailto:nishanthchowdary1234@gmail.com" className="text-accent-blue hover:underline">nishanthchowdary1234@gmail.com</a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                      <i className="fas fa-map-marker-alt"></i>
                    </div>
                    <div>
                      <p className="text-gray-400">Location</p>
                      <p>Amaravati, Andhra Pradesh, India</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-accent-pink/10 flex items-center justify-center text-accent-pink">
                      <i className="fas fa-code-branch"></i>
                    </div>
                    <div>
                      <p className="text-gray-400">GitHub</p>
                      <a href="https://github.com/ArekatlaNishanthchowdary" target="_blank" rel="noopener noreferrer" className="text-accent-pink hover:underline">@ArekatlaNishanthchowdary</a>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex space-x-4">
                  {socialLinks.map((link, index) => (
                    <a key={index} href={link.url} className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue hover:bg-accent-blue/20 transition-colors" target="_blank" rel="noopener noreferrer">
                      <i className={link.icon}></i>
                    </a>
                  ))}
                </div>
              </div>
              <div className="backdrop-blur-md bg-black/10 p-6 rounded-xl">
                <h3 className="text-2xl font-semibold mb-4">Send Me a Message</h3>
                <form ref={contactFormRef} onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block mb-2 text-gray-300">Your Name</label>
                    <input type="text" id="name" name="name" required className="w-full px-4 py-3 rounded-lg bg-secondary border border-accent-purple/20 focus:border-accent-purple outline-none transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block mb-2 text-gray-300">Your Email</label>
                    <input type="email" id="email" name="email" required className="w-full px-4 py-3 rounded-lg bg-secondary border border-accent-purple/20 focus:border-accent-purple outline-none transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="message" className="block mb-2 text-gray-300">Your Message</label>
                    <textarea id="message" name="message" rows="5" required className="w-full px-4 py-3 rounded-lg bg-secondary border border-accent-purple/20 focus:border-accent-purple outline-none transition-colors"></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary w-full">
                    <i className="fas fa-paper-plane mr-2"></i> Send Message
                  </button>
                  {formStatus.message && (
                    <div className={`mt-4 p-3 rounded-lg ${formStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : formStatus.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {formStatus.message}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 bg-secondary/50 backdrop-blur-md border-t border-accent-purple/10">
          <div className="container text-center">
            <div className="text-xl font-bold mb-4">
              <span className="text-accent-blue">Nish</span><span className="text-accent-purple">anth</span>
            </div>
            <p className="text-gray-400 mb-4">© {new Date().getFullYear()} Nishanth Chowdary. All Rights Reserved.</p>
            <div className="flex justify-center space-x-6">
              {socialLinks.map((link, index) => (
                <a key={index} href={link.url} className="text-gray-400 hover:text-accent-blue transition-colors" target="_blank" rel="noopener noreferrer">
                  <i className={link.icon}></i>
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
