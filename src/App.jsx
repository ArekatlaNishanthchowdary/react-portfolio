import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';
import emailjs from '@emailjs/browser';
import VanillaTilt from 'vanilla-tilt';
import Preloader from './components/Preloader';
import './index.css';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [pdfViewerModal, setPdfViewerModal] = useState({ isOpen: false, url: '' });
  const [preloaderComplete, setPreloaderComplete] = useState(false);
  const bgCanvasRef = useRef(null);
  const contactFormRef = useRef(null);
  const [formStatus, setFormStatus] = useState({ message: '', type: '' });
  const mainContainerRef = useRef(null);
  const appContentRef = useRef(null);
  const [activeSection, setActiveSection] = useState('projects');

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init("mHOKmkvlGWOsdMT-b")
  }, []);

  // Handle preloader completion
  const handlePreloaderLoaded = () => {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
      preloader.classList.add('fade-out');
      // Wait for preloader fade out before showing main content
      setTimeout(() => {
        setPreloaderComplete(true);
        // Small delay before showing main content
        setTimeout(() => {
          if (appContentRef.current) {
            appContentRef.current.classList.add('visible');
          }
        }, 100);
      }, 500); // Match the preloader fade-out duration
    }
  };

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
        
        // Text animation variables
        let textMessages = [];
        let textPointsArrays = [];
        
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
            
            // Check if it's time to transition to Phase 4
            if (animationTimer >= transitionTime) {
              console.log("Transitioning to Phase 4: Matrix Digital Rain");
              animationTimer = 0;
              animationPhase = 4;
              startPhaseFour();
            }
          }
          else if (animationPhase === 4) {
            // Phase 4: Matrix-like Digital Rain
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Matrix-like falling motion
              particle.position.y -= particle.speed * 1.5;
              
              // Reset particles that fall below the view
              if (particle.position.y < -40) {
                particle.position.y = 40;
                particle.position.x = (Math.random() * 2 - 1) * 40;
                particle.position.z = (Math.random() - 0.5) * 20;
              }
              
              // Add some slight horizontal movement
              particle.position.x += Math.sin(Date.now() * 0.0005 + i * 0.1) * 0.02;
              
              // Matrix green color with varying brightness based on position
              const brightness = 0.4 + 0.6 * Math.abs(particle.position.y / 40);
              particleColors[i * 3] = 0.1 * brightness; // slight red
              particleColors[i * 3 + 1] = 0.8 * brightness; // strong green
              particleColors[i * 3 + 2] = 0.3 * brightness; // some blue
              
              // Make some particles pulse
              if (i % 7 === 0) {
                const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.003 + i);
                particleColors[i * 3] = 0.1 * pulse;
                particleColors[i * 3 + 1] = pulse;
                particleColors[i * 3 + 2] = 0.3 * pulse;
                particleSizes[i] = particle.size * (1 + 0.5 * pulse);
              }
              
              // Update position in buffer
              particlePositions[i * 3] = particle.position.x;
              particlePositions[i * 3 + 1] = particle.position.y;
              particlePositions[i * 3 + 2] = particle.position.z;
              
              // Update line positions to create falling trails
              linePositions[i * 6] = particle.position.x;
              linePositions[i * 6 + 1] = particle.position.y + 1.5; // trail above
              linePositions[i * 6 + 2] = particle.position.z;
              linePositions[i * 6 + 3] = particle.position.x;
              linePositions[i * 6 + 4] = particle.position.y;
              linePositions[i * 6 + 5] = particle.position.z;
            }
            
            // Slowly rotate for added dimension
            particleSystem.rotation.y += 0.0002;
            
            // Transition to phase 5 after the digital rain completes its cycle
            if (animationTimer >= transitionTime * 1.5) {
              console.log("Transitioning to Phase 5: Galaxy Formation");
              animationTimer = 0;
              animationPhase = 5;
              startPhaseFive();
            }
          }
          else if (animationPhase === 5) {
            // Phase 5: Galaxy/Starfield Formation
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Calculate time-dependent values
              const time = Date.now() * 0.0003;
              const particleIndex = i / particles.length;
              
              // Assign particles to different orbital rings
              const ringIndex = i % 5; // 5 different orbital rings
              const ringRadius = 10 + ringIndex * 6; // Increasing radii for each ring
              const ringSpeed = 0.2 - ringIndex * 0.03; // Outer rings move slower
              
              // Calculate orbital position
              const orbitAngle = time * ringSpeed + particleIndex * Math.PI * 2;
              const targetX = Math.cos(orbitAngle) * ringRadius;
              const targetY = Math.sin(orbitAngle) * ringRadius;
              
              // Add some vertical variance based on ring (creates disk thickness)
              const verticalOffset = (Math.sin(orbitAngle * 3) * (ringIndex * 0.4));
              const targetZ = verticalOffset + Math.sin(time * 0.5 + i) * 2;
              
              // Smoothly move toward target position
              particle.position.x += (targetX - particle.position.x) * 0.05;
              particle.position.y += (targetY - particle.position.y) * 0.05;
              particle.position.z += (targetZ - particle.position.z) * 0.05;
              
              // Stellar colors - create a realistic starfield with different star colors
              // Blue, white, yellow, orange, red stars
              let r, g, b;
              
              if (i % 10 === 0) { // Blue stars
                r = 0.5 + 0.2 * Math.sin(time * 2 + i);
                g = 0.7 + 0.3 * Math.sin(time * 2 + i);
                b = 1.0;
              } else if (i % 10 === 1) { // Red stars
                r = 1.0;
                g = 0.3 + 0.2 * Math.sin(time * 2 + i);
                b = 0.2 + 0.1 * Math.sin(time * 2 + i);
              } else if (i % 10 === 2) { // Yellow stars
                r = 1.0;
                g = 0.9 + 0.1 * Math.sin(time * 2 + i);
                b = 0.4 + 0.2 * Math.sin(time * 2 + i);
              } else { // White/blue-white stars (majority)
                const brightness = 0.7 + 0.3 * Math.sin(time * 0.5 + i);
                r = brightness * 0.9;
                g = brightness * 0.95;
                b = brightness;
              }
              
              // Make center of galaxy brighter
              const distFromCenter = Math.sqrt(
                particle.position.x * particle.position.x + 
                particle.position.y * particle.position.y
              );
              
              if (distFromCenter < 5) {
                const centerBoost = (5 - distFromCenter) / 5;
                r = Math.min(1.0, r + centerBoost * 0.5);
                g = Math.min(1.0, g + centerBoost * 0.5);
                b = Math.min(1.0, b + centerBoost * 0.5);
                
                // Make center particles larger
                particleSizes[i] = particle.size * (1 + centerBoost);
              } else {
                particleSizes[i] = particle.size;
              }
              
              // Occasional "twinkle" effect for random stars
              if (i % 23 === 0) {
                const twinkle = 0.7 + 0.5 * Math.sin(time * 10 + i);
                r *= twinkle;
                g *= twinkle;
                b *= twinkle;
              }
              
              particleColors[i * 3] = r;
              particleColors[i * 3 + 1] = g;
              particleColors[i * 3 + 2] = b;
              
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
            
            // Slowly rotate the entire galaxy for added effect
            particleSystem.rotation.z += 0.001;
            
            // Transition to phase 6 after galaxy animation completes
            if (animationTimer >= transitionTime * 1.5) {
              console.log("Transitioning to Phase 6: Swarm Behavior");
              animationTimer = 0;
              animationPhase = 6;
              startPhaseSix();
            }
          }
          else if (animationPhase === 6) {
            // Phase 6: Swarm/Flock Behavior
            // Simulate flocking behavior with separation, alignment, and cohesion (boids algorithm)
            
            // Parameters for flocking behavior
            const cohesionForce = 0.005;
            const alignmentForce = 0.03;
            const separationForce = 0.04;
            const perceptionRadius = 15;
            const maxSpeed = 0.2;
            const centerAttraction = 0.001;
            
            // Calculate center of mass for the entire flock
            const flockCenter = new THREE.Vector3();
            for (let i = 0; i < particles.length; i++) {
              flockCenter.add(particles[i].position);
            }
            flockCenter.divideScalar(particles.length);
            
            // Update each particle according to flocking rules
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Initialize forces
              const separation = new THREE.Vector3();
              const alignment = new THREE.Vector3();
              const cohesion = new THREE.Vector3();
              
              // Track neighbors for flocking calculations
              let neighborCount = 0;
              
              // Check against all other particles for neighborhood calculations
              for (let j = 0; j < particles.length; j++) {
                if (i === j) continue; // Skip self
                
                const otherParticle = particles[j];
                const distance = particle.position.distanceTo(otherParticle.position);
                
                // Only consider particles within perception radius
                if (distance < perceptionRadius) {
                  // Separation: steer away from neighbors that are too close
                  if (distance < perceptionRadius * 0.5) {
                    const diff = new THREE.Vector3().subVectors(particle.position, otherParticle.position);
                    diff.normalize().divideScalar(Math.max(0.1, distance)); // Stronger effect when closer
                    separation.add(diff);
                  }
                  
                  // Alignment: steer towards average heading of neighbors
                  const velocity = new THREE.Vector3().subVectors(
                    otherParticle.position, 
                    otherParticle.lastPosition
                  ).normalize();
                  
                  alignment.add(velocity);
                  
                  // Cohesion: steer towards center of mass of neighbors
                  cohesion.add(otherParticle.position);
                  
                  neighborCount++;
                }
              }
              
              // Only apply flocking rules if there are neighbors
              if (neighborCount > 0) {
                // Alignment: average velocities of neighbors
                alignment.divideScalar(neighborCount);
                alignment.normalize().multiplyScalar(alignmentForce);
                
                // Cohesion: move toward center of mass of neighbors
                cohesion.divideScalar(neighborCount);
                cohesion.sub(particle.position);
                cohesion.normalize().multiplyScalar(cohesionForce);
              }
              
              // Apply separation force regardless of neighbor count
              separation.normalize().multiplyScalar(separationForce);
              
              // Add natural attraction to center to keep flock visible
              const toCenter = new THREE.Vector3().subVectors(
                new THREE.Vector3(
                  Math.sin(Date.now() * 0.0005) * 10, 
                  Math.cos(Date.now() * 0.0003) * 10,
                  Math.sin(Date.now() * 0.0007) * 5
                ), 
                particle.position
              );
              toCenter.normalize().multiplyScalar(centerAttraction);
              
              // Apply all forces to create velocity
              const velocity = new THREE.Vector3().subVectors(
                particle.position, 
                particle.lastPosition
              );
              
              // Add forces to current velocity
              velocity.add(separation);
              velocity.add(alignment);
              velocity.add(cohesion);
              velocity.add(toCenter);
              
              // Limit maximum speed
              if (velocity.length() > maxSpeed) {
                velocity.normalize().multiplyScalar(maxSpeed);
              }
              
              // Apply velocity to position
              particle.position.add(velocity);
              
              // Ensure particles stay within bounds
              const bound = 40;
              if (particle.position.x > bound) particle.position.x = bound;
              if (particle.position.x < -bound) particle.position.x = -bound;
              if (particle.position.y > bound) particle.position.y = bound;
              if (particle.position.y < -bound) particle.position.y = -bound;
              if (particle.position.z > bound) particle.position.z = bound;
              if (particle.position.z < -bound) particle.position.z = -bound;
              
              // Color based on position and velocity
              const speed = velocity.length() / maxSpeed;
              const phase = (Date.now() * 0.001) % 20;
              
              // Create a wave-like color pattern through the flock
              const colorPhase = (Math.sin(phase + i * 0.1) + 1) / 2;
              
              // Blue to purple to pink gradient
              particleColors[i * 3] = 0.2 + (speed * 0.8) + (colorPhase * 0.4); // Red
              particleColors[i * 3 + 1] = 0.2 + (speed * 0.3) * (1 - colorPhase); // Green
              particleColors[i * 3 + 2] = 0.6 + (speed * 0.4) * colorPhase; // Blue
              
              // Vary particle size based on speed
              particleSizes[i] = particle.size * (0.8 + speed * 0.4);
              
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
            
            // Subtle rotation of the entire system for more dynamic look
            particleSystem.rotation.y += 0.0003;
            
            // Transition to phase 7 after swarm animation completes
            if (animationTimer >= transitionTime * 1.5) {
              console.log("Transitioning to Phase 7: Tornado Vortex");
              animationTimer = 0;
              animationPhase = 7;
              startPhaseSeven();
            }
          }
          else if (animationPhase === 7) {
            // Phase 7: Tornado/Vortex Effect
            const time = Date.now() * 0.001;
            
            // Tornado parameters
            const tornadoBaseWidth = 25;
            const tornadoTopWidth = 8;
            const tornadoHeight = 60;
            const tornadoBase = -20; // Base y position
            const swirl = 5 + Math.sin(time * 0.5) * 2; // Dynamic swirl intensity
            
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Calculate particle's current height ratio in the tornado (0 at bottom, 1 at top)
              let heightRatio = (particle.position.y - tornadoBase) / tornadoHeight;
              
              // If particle is outside the tornado, move it toward the base
              if (heightRatio < 0 || heightRatio > 1 || 
                  Math.sqrt(particle.position.x * particle.position.x + particle.position.z * particle.position.z) > 
                  tornadoBaseWidth * (1 - heightRatio) + tornadoTopWidth * heightRatio) {
                
                // Move fallen particles back to the base of the tornado
                if (Math.random() < 0.03) {
                  const angle = Math.random() * Math.PI * 2;
                  const radius = Math.random() * tornadoBaseWidth;
                  
                  particle.position.x = Math.cos(angle) * radius;
                  particle.position.y = tornadoBase + Math.random() * 5;
                  particle.position.z = Math.sin(angle) * radius;
                  
                  heightRatio = 0;
                }
              }
              
              // For particles in the tornado
              if (heightRatio >= 0 && heightRatio <= 1) {
                // Calculate the tornado width at this height
                const radiusAtHeight = tornadoBaseWidth * (1 - heightRatio) + tornadoTopWidth * heightRatio;
                
                // Current angle of particle around the central axis
                const currentAngle = Math.atan2(particle.position.z, particle.position.x);
                
                // Spiral movement: increase angle based on height
                const angularVelocity = (1.5 - heightRatio) * particle.speed * swirl;
                const newAngle = currentAngle + angularVelocity * 0.1;
                
                // Calculate new position based on spiral
                const currentRadius = Math.sqrt(particle.position.x * particle.position.x + particle.position.z * particle.position.z);
                
                // Gradually adjust radius to match the tornado shape
                const targetRadius = radiusAtHeight * (0.8 + Math.random() * 0.4);
                const newRadius = currentRadius + (targetRadius - currentRadius) * 0.03;
                
                // Update position
                particle.position.x = Math.cos(newAngle) * newRadius;
                particle.position.z = Math.sin(newAngle) * newRadius;
                
                // Move upward with increasing speed based on height
                particle.position.y += particle.speed * (0.5 + heightRatio * 2);
                
                // Add some turbulence
                const turbulence = 0.1 + heightRatio * 0.2;
                particle.position.x += (Math.random() * 2 - 1) * turbulence;
                particle.position.z += (Math.random() * 2 - 1) * turbulence;
                
                // Reset particles that reach the top
                if (particle.position.y > tornadoBase + tornadoHeight) {
                  // Some particles shoot out from the top
                  if (Math.random() < 0.3) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = tornadoTopWidth + Math.random() * 10;
                    particle.position.x = Math.cos(angle) * radius;
                    particle.position.z = Math.sin(angle) * radius;
                    particle.position.y += 2 + Math.random() * 3;
                  } else {
                    // Others return to the base
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * tornadoBaseWidth;
                    particle.position.x = Math.cos(angle) * radius;
                    particle.position.y = tornadoBase + Math.random() * 5;
                    particle.position.z = Math.sin(angle) * radius;
                  }
                }
                
                // Dynamic colors based on height and time
                const hue = (time * 0.1 + heightRatio) % 1;
                const saturation = 0.7 + heightRatio * 0.3;
                const lightness = 0.3 + heightRatio * 0.3;
                
                const rgb = hslToRgb(hue, saturation, lightness);
                
                particleColors[i * 3] = rgb[0];
                particleColors[i * 3 + 1] = rgb[1];
                particleColors[i * 3 + 2] = rgb[2];
                
                // Make particles near the center of the tornado brighter
                const distFromCenter = Math.sqrt(
                  particle.position.x * particle.position.x + 
                  particle.position.z * particle.position.z
                );
                
                if (distFromCenter < radiusAtHeight * 0.3) {
                  const centerBoost = 1 - (distFromCenter / (radiusAtHeight * 0.3));
                  particleColors[i * 3] = Math.min(1.0, particleColors[i * 3] + centerBoost * 0.5);
                  particleColors[i * 3 + 1] = Math.min(1.0, particleColors[i * 3 + 1] + centerBoost * 0.5);
                  particleColors[i * 3 + 2] = Math.min(1.0, particleColors[i * 3 + 2] + centerBoost * 0.5);
                }
                
                // Vary particle size based on height - larger at the top
                particleSizes[i] = particle.size * (1 + heightRatio * 0.5);
              }
              
              // Particles outside the tornado slowly float down
              if (heightRatio > 1 || (heightRatio < 0 && particle.position.y > tornadoBase - 20)) {
                particle.position.y -= 0.05;
                
                // Dim the colors for particles outside the tornado
                particleColors[i * 3] *= 0.95;
                particleColors[i * 3 + 1] *= 0.95;
                particleColors[i * 3 + 2] *= 0.95;
              }
              
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
            
            // Rotate the entire system slowly for an added effect
            particleSystem.rotation.y += 0.001;
            
            // Transition to Phase 8 after tornado animation completes
            if (animationTimer >= transitionTime * 1.8) { // Slightly longer duration for this effect
              console.log("Transitioning to Phase 8: DNA Double Helix");
              animationTimer = 0;
              animationPhase = 8;
              startPhaseEight();
            }
          }
          else if (animationPhase === 8) {
            // Phase 8: DNA Double Helix Animation
            const time = Date.now() * 0.001;
            
            // DNA parameters
            const dnaLength = 100;      // Length of the DNA strand
            const dnaRadius = 15;       // Radius of the helix
            const dnaStep = 4;          // Vertical distance between steps
            const twistRate = 0.2;      // How fast the DNA twists
            const baseWidth = 3;        // Width of base pairs
            
            // Calculate the current animation progress
            const animProgress = Math.min(1.0, animationTimer / (transitionTime * 0.8));
            
            // Smooth formation progress using easing function
            const formationProgress = easeInOutCubic(animProgress);
            
            // DNA moves up slowly
            const dnaYOffset = -dnaLength / 2 + (time * 3) % dnaLength;
            
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Assign particles to different parts of the DNA structure
              const particleGroup = i % 8; // Group particles into roles
              
              // Calculate target position on DNA
              let targetX, targetY, targetZ;
              let colorR, colorG, colorB;
              
              // Particle's relative position in the DNA strand
              const dnaPosition = (i % (particles.length / 4)) / (particles.length / 4);
              const yPos = dnaPosition * dnaLength - dnaLength / 2 + dnaYOffset;
              
              if (particleGroup < 4) {
                // Particles for the two main strands (double helix)
                const strandIndex = particleGroup % 2; // 0 or 1 for first or second strand
                const angle = yPos * 0.2 + strandIndex * Math.PI + time * twistRate;
                
                targetX = Math.cos(angle) * dnaRadius;
                targetY = yPos;
                targetZ = Math.sin(angle) * dnaRadius;
                
                // Different colors for each strand
                if (strandIndex === 0) {
                  // First strand - blue to cyan
                  colorR = 0.1 + Math.sin(yPos * 0.1 + time) * 0.1;
                  colorG = 0.5 + Math.sin(yPos * 0.1 + time) * 0.2;
                  colorB = 0.9;
                } else {
                  // Second strand - purple to pink
                  colorR = 0.8;
                  colorG = 0.2 + Math.sin(yPos * 0.1 + time + Math.PI) * 0.2;
                  colorB = 0.8 + Math.sin(yPos * 0.1 + time + Math.PI) * 0.2;
                }
              } else if (particleGroup < 8) {
                // Particles for the base pairs connecting the strands
                const basePairIndex = (particleGroup - 4) % 4;
                const baseProgress = basePairIndex / 3; // 0-1 position across the base pair
                
                // Calculate the position of the connecting base pair
                const angle = yPos * 0.2 + time * twistRate;
                const baseAngle = angle + Math.PI * baseProgress;
                
                // Only add base pairs at regular intervals
                if (Math.floor(yPos / dnaStep) === yPos / dnaStep) {
                  targetX = Math.cos(angle) * dnaRadius * (1 - baseProgress) + 
                            Math.cos(angle + Math.PI) * dnaRadius * baseProgress;
                  targetY = yPos;
                  targetZ = Math.sin(angle) * dnaRadius * (1 - baseProgress) + 
                            Math.sin(angle + Math.PI) * dnaRadius * baseProgress;
                } else {
                  // Particles not in a base pair position follow a smaller helix pattern
                  const miniStrandIndex = basePairIndex % 2;
                  const miniAngle = yPos * 0.3 + miniStrandIndex * Math.PI + time * twistRate * 1.5;
                  
                  targetX = Math.cos(miniAngle) * (dnaRadius * 0.5);
                  targetY = yPos + Math.sin(time + i) * 0.5;
                  targetZ = Math.sin(miniAngle) * (dnaRadius * 0.5);
                }
                
                // Base pair colors (green-yellow)
                colorR = 0.4 + Math.sin(yPos * 0.2) * 0.2;
                colorG = 0.8;
                colorB = 0.3 + Math.cos(yPos * 0.2) * 0.2;
              }
              
              // Apply smooth formation effect
              if (formationProgress < 1.0) {
                // Mix between current position and target DNA position based on formation progress
                particle.position.x += (targetX - particle.position.x) * 0.03 * (1 + formationProgress * 2);
                particle.position.y += (targetY - particle.position.y) * 0.03 * (1 + formationProgress * 2);
                particle.position.z += (targetZ - particle.position.z) * 0.03 * (1 + formationProgress * 2);
                
                // Blend colors smoothly during formation
                const currentR = particleColors[i * 3];
                const currentG = particleColors[i * 3 + 1];
                const currentB = particleColors[i * 3 + 2];
                
                particleColors[i * 3] = currentR + (colorR - currentR) * 0.05 * (1 + formationProgress * 2);
                particleColors[i * 3 + 1] = currentG + (colorG - currentG) * 0.05 * (1 + formationProgress * 2);
                particleColors[i * 3 + 2] = currentB + (colorB - currentB) * 0.05 * (1 + formationProgress * 2);
              } else {
                // DNA fully formed - use direct targeting
                particle.position.x += (targetX - particle.position.x) * 0.1;
                particle.position.y += (targetY - particle.position.y) * 0.1;
                particle.position.z += (targetZ - particle.position.z) * 0.1;
                
                particleColors[i * 3] = colorR;
                particleColors[i * 3 + 1] = colorG;
                particleColors[i * 3 + 2] = colorB;
                
                // Add some gentle randomness for more organic look
                particle.position.x += (Math.random() - 0.5) * 0.1;
                particle.position.y += (Math.random() - 0.5) * 0.1;
                particle.position.z += (Math.random() - 0.5) * 0.1;
                
                // Pulsating effect for base pairs
                if (particleGroup >= 4 && particleGroup < 8) {
                  const pulse = Math.sin(time * 2 + i * 0.1) * 0.2 + 0.8;
                  particleColors[i * 3] *= pulse;
                  particleColors[i * 3 + 1] *= pulse;
                  particleColors[i * 3 + 2] *= pulse;
                }
              }
              
              // Set particle size based on its role
              if (particleGroup < 4) {
                // Main helix strands - slightly larger
                particleSizes[i] = particle.size * 1.2;
              } else {
                // Base pairs - slightly smaller
                particleSizes[i] = particle.size * 0.9;
              }
              
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
            
            // Rotate the DNA structure for better viewing
            particleSystem.rotation.y += 0.002;
            
            // Smoothly animate camera during formation
            if (formationProgress < 1.0) {
              const cameraY = 10 + formationProgress * 10;
              camera.position.set(Math.sin(time * 0.2) * 10, cameraY, 80 - formationProgress * 10);
              camera.lookAt(0, 0, 0);
            } else {
              // Spiral camera around DNA once formed
              const cameraTime = time * 0.3;
              const cameraRadius = 60;
              camera.position.set(
                Math.sin(cameraTime) * cameraRadius,
                0,
                Math.cos(cameraTime) * cameraRadius
              );
              camera.lookAt(0, 0, 0);
            }
            
            // Reset to phase 0 after DNA animation completes
            if (animationTimer >= transitionTime * 2) {
              console.log("Transitioning to Phase 9: Morphing Geometry");
              animationTimer = 0;
              animationPhase = 9;
              startPhaseNine();
            }
          }
          else if (animationPhase === 9) {
            // Phase 9: Morphing Geometric Shapes
            const time = Date.now() * 0.001;
            
            // Calculate the current shape transition progress
            const morphDuration = transitionTime * 0.5; // Duration for each shape
            const shapeCycle = Math.floor(animationTimer / morphDuration) % 5; // 5 different shapes
            const morphProgress = (animationTimer % morphDuration) / morphDuration;
            
            // Smooth the transition using easing
            const easedMorphProgress = easeInOutQuad(morphProgress);
            
            // Different shape parameters
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Calculate normalized position for this particle (0-1 range)
              const normalizedIndex = i / particles.length;
              
              // Target positions for different shapes
              let targetX, targetY, targetZ;
              let nextTargetX, nextTargetY, nextTargetZ;
              let colorR, colorG, colorB;
              
              // Calculate current and next shape positions
              const currentShape = shapeCycle;
              const nextShape = (shapeCycle + 1) % 5;
              
              // Shape 0: Cube
              if (currentShape === 0 || nextShape === 0) {
                // Create a cube
                const cubeSize = 25;
                const point3dIndex = i % 8; // 8 corners of a cube
                const cornerX = ((point3dIndex & 1) ? 1 : -1) * cubeSize;
                const cornerY = ((point3dIndex & 2) ? 1 : -1) * cubeSize;
                const cornerZ = ((point3dIndex & 4) ? 1 : -1) * cubeSize;
                
                if (currentShape === 0) {
                  targetX = cornerX;
                  targetY = cornerY;
                  targetZ = cornerZ;
                } else {
                  nextTargetX = cornerX;
                  nextTargetY = cornerY;
                  nextTargetZ = cornerZ;
                }
              }
              
              // Shape 1: Sphere
              if (currentShape === 1 || nextShape === 1) {
                // Create a sphere using spherical coordinates
                const radius = 25;
                const phi = Math.acos(2 * ((i / particles.length) * 2 - 1));
                const theta = 2 * Math.PI * ((i % 100) / 100);
                
                const sphereX = radius * Math.sin(phi) * Math.cos(theta);
                const sphereY = radius * Math.sin(phi) * Math.sin(theta);
                const sphereZ = radius * Math.cos(phi);
                
                if (currentShape === 1) {
                  targetX = sphereX;
                  targetY = sphereY;
                  targetZ = sphereZ;
                } else {
                  nextTargetX = sphereX;
                  nextTargetY = sphereY;
                  nextTargetZ = sphereZ;
                }
              }
              
              // Shape 2: Torus
              if (currentShape === 2 || nextShape === 2) {
                // Create a torus
                const torusMajorRadius = 25;
                const torusMinorRadius = 8;
                const u = ((i % 50) / 50) * Math.PI * 2;
                const v = ((Math.floor(i / 50) % 30) / 30) * Math.PI * 2;
                
                const torusX = (torusMajorRadius + torusMinorRadius * Math.cos(v)) * Math.cos(u);
                const torusY = (torusMajorRadius + torusMinorRadius * Math.cos(v)) * Math.sin(u);
                const torusZ = torusMinorRadius * Math.sin(v);
                
                if (currentShape === 2) {
                  targetX = torusX;
                  targetY = torusY;
                  targetZ = torusZ;
                } else {
                  nextTargetX = torusX;
                  nextTargetY = torusY;
                  nextTargetZ = torusZ;
                }
              }
              
              // Shape 3: Cone/Pyramid
              if (currentShape === 3 || nextShape === 3) {
                // Create a cone/pyramid
                const coneHeight = 40;
                const coneBaseRadius = 25;
                const angle = ((i % 60) / 60) * Math.PI * 2;
                const heightRatio = (Math.floor(i / 60) % 20) / 20;
                
                const coneX = coneBaseRadius * (1 - heightRatio) * Math.cos(angle);
                const coneY = coneBaseRadius * (1 - heightRatio) * Math.sin(angle);
                const coneZ = coneHeight * heightRatio - coneHeight/2;
                
                if (currentShape === 3) {
                  targetX = coneX;
                  targetY = coneY;
                  targetZ = coneZ;
                } else {
                  nextTargetX = coneX;
                  nextTargetY = coneY;
                  nextTargetZ = coneZ;
                }
              }
              
              // Shape 4: Spiral
              if (currentShape === 4 || nextShape === 4) {
                // Create a spiral
                const spiralRadius = 22;
                const spiralHeight = 40;
                const spiralTurns = 3;
                const heightRatio = (i / particles.length);
                const angle = heightRatio * Math.PI * 2 * spiralTurns;
                
                const spiralX = spiralRadius * Math.cos(angle);
                const spiralY = spiralRadius * Math.sin(angle);
                const spiralZ = (heightRatio - 0.5) * spiralHeight;
                
                if (currentShape === 4) {
                  targetX = spiralX;
                  targetY = spiralY;
                  targetZ = spiralZ;
                } else {
                  nextTargetX = spiralX;
                  nextTargetY = spiralY;
                  nextTargetZ = spiralZ;
                }
              }
              
              // If we're in a transition, interpolate between shapes
              if (currentShape !== nextShape) {
                const finalTargetX = targetX * (1 - easedMorphProgress) + nextTargetX * easedMorphProgress;
                const finalTargetY = targetY * (1 - easedMorphProgress) + nextTargetY * easedMorphProgress;
                const finalTargetZ = targetZ * (1 - easedMorphProgress) + nextTargetZ * easedMorphProgress;
                
                // Smooth movement toward target
                particle.position.x += (finalTargetX - particle.position.x) * 0.08;
                particle.position.y += (finalTargetY - particle.position.y) * 0.08;
                particle.position.z += (finalTargetZ - particle.position.z) * 0.08;
              } else {
                // Direct movement when not transitioning
                particle.position.x += (targetX - particle.position.x) * 0.08;
                particle.position.y += (targetY - particle.position.y) * 0.08;
                particle.position.z += (targetZ - particle.position.z) * 0.08;
              }
              
              // Add slight jitter for more organic movement
              particle.position.x += (Math.random() - 0.5) * 0.1;
              particle.position.y += (Math.random() - 0.5) * 0.1;
              particle.position.z += (Math.random() - 0.5) * 0.1;
              
              // Color based on shape and position
              const hue = (time * 0.1 + normalizedIndex + shapeCycle * 0.2) % 1.0;
              const saturation = 0.7;
              const lightness = 0.5 + 0.2 * Math.sin(time + i * 0.01);
              
              const rgb = hslToRgb(hue, saturation, lightness);
              
              particleColors[i * 3] = rgb[0];
              particleColors[i * 3 + 1] = rgb[1];
              particleColors[i * 3 + 2] = rgb[2];
              
              // Slightly vary sizes based on shape transition
              particleSizes[i] = particle.size * (1 + 0.2 * Math.sin(time * 2 + i * 0.1));
              
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
            
            // Rotate the shapes for added effect
            particleSystem.rotation.y += 0.003;
            particleSystem.rotation.x += 0.001;
            
            // Camera movement to showcase the shapes
            const cameraTime = time * 0.2;
            const cameraRadius = 90;
            const cameraHeight = 20 * Math.sin(cameraTime * 0.5);
            
            camera.position.set(
              Math.sin(cameraTime) * cameraRadius,
              cameraHeight,
              Math.cos(cameraTime) * cameraRadius
            );
            camera.lookAt(0, 0, 0);
            
            // Reset to phase 0 after geometric shapes animation completes
            if (animationTimer >= transitionTime * 2.5) { // Longer duration for this complex effect
              console.log("Transitioning to Phase 10: Particle Text");
              animationTimer = 0;
              animationPhase = 10;
              startPhaseTen();
            }
          }
          else if (animationPhase === 10) {
            // Phase 10: Particle Text Animation
            const time = Date.now() * 0.001;
            
            // Control text message cycling
            const textCycleDuration = transitionTime * 0.5; // Duration for each text message
            const textIndex = Math.floor(animationTimer / textCycleDuration) % textMessages.length;
            const morphProgress = (animationTimer % textCycleDuration) / textCycleDuration;
            
            // Eased progress for smoother transitions
            const easedProgress = easeInOutQuad(morphProgress);
            
            // Get current and next text points
            const currentTextPoints = textPointsArrays[textIndex];
            const nextTextPoints = textPointsArrays[(textIndex + 1) % textMessages.length];
            
            // Update each particle
            for (let i = 0; i < particles.length; i++) {
              const particle = particles[i];
              
              // Store previous position for trails
              particle.lastPosition.copy(particle.position);
              
              // Calculate target positions based on text
              let targetX, targetY, targetZ;
              let nextTargetX, nextTargetY, nextTargetZ;
              
              if (i < currentTextPoints.length) {
                // Particle has a specific position in the text
                targetX = currentTextPoints[i].x;
                targetY = currentTextPoints[i].y;
                targetZ = 0; // Keep text flat on Z axis to ensure visibility
                
                // Get next text position if available
                if (i < nextTextPoints.length) {
                  nextTargetX = nextTextPoints[i].x;
                  nextTargetY = nextTextPoints[i].y;
                  nextTargetZ = 0;
                } else {
                  // If no position in next text, just float randomly
                  const angle = Math.random() * Math.PI * 2;
                  const radius = 30 + Math.random() * 10;
                  nextTargetX = Math.cos(angle) * radius;
                  nextTargetY = Math.sin(angle) * radius;
                  nextTargetZ = (Math.random() - 0.5) * 5; // Reduced depth variation
                }
              } else {
                // Particles not used in text float around the outside
                const angle = (i / particles.length) * Math.PI * 2;
                const floatRadius = 40 + Math.sin(time + i * 0.1) * 5;
                targetX = Math.cos(angle + time * 0.1) * floatRadius;
                targetY = Math.sin(angle + time * 0.1) * floatRadius;
                targetZ = Math.sin(time * 0.2 + i * 0.1) * 5;
                
                // These particles use the same target for current and next
                nextTargetX = targetX;
                nextTargetY = targetY;
                nextTargetZ = targetZ;
              }
              
              // During text transitions, interpolate between current and next positions
              if (textIndex !== (textIndex + 1) % textMessages.length) {
                // Only interpolate during transition phase (morphProgress > 0.1)
                if (morphProgress > 0.1 && morphProgress < 0.9) {
                  const morphFactor = (morphProgress - 0.1) / 0.8; // Rescale to 0-1 within the 0.1-0.9 range
                  const easedMorphFactor = easeInOutQuint(morphFactor);
                  
                  const finalTargetX = targetX * (1 - easedMorphFactor) + nextTargetX * easedMorphFactor;
                  const finalTargetY = targetY * (1 - easedMorphFactor) + nextTargetY * easedMorphFactor;
                  const finalTargetZ = targetZ * (1 - easedMorphFactor) + nextTargetZ * easedMorphFactor;
                  
                  // Move towards interpolated position
                  particle.position.x += (finalTargetX - particle.position.x) * 0.1;
                  particle.position.y += (finalTargetY - particle.position.y) * 0.1;
                  particle.position.z += (finalTargetZ - particle.position.z) * 0.1;
                } else {
                  // Before and after transition, move toward current target
                  particle.position.x += (targetX - particle.position.x) * 0.1;
                  particle.position.y += (targetY - particle.position.y) * 0.1;
                  particle.position.z += (targetZ - particle.position.z) * 0.1;
                }
              } else {
                // No transition occurring, just move toward target
                particle.position.x += (targetX - particle.position.x) * 0.1;
                particle.position.y += (targetY - particle.position.y) * 0.1;
                particle.position.z += (targetZ - particle.position.z) * 0.1;
              }
              
              // Add a slight jitter for more organic movement
              particle.position.x += (Math.random() - 0.5) * 0.1;
              particle.position.y += (Math.random() - 0.5) * 0.1;
              particle.position.z += (Math.random() - 0.5) * 0.1;
              
              // Color based on position in text and time
              if (i < currentTextPoints.length) {
                // Main text particles get vibrant colors
                const hueBase = (textIndex * 0.2) % 1.0; // Different base hue for each text
                const hueOffset = (i / currentTextPoints.length) * 0.3; // Gradient effect
                const hue = (hueBase + hueOffset + time * 0.05) % 1.0;
                
                const rgb = hslToRgb(hue, 0.7, 0.6);
                particleColors[i * 3] = rgb[0];
                particleColors[i * 3 + 1] = rgb[1];
                particleColors[i * 3 + 2] = rgb[2];
                
                // Make text particles slightly larger
                particleSizes[i] = particle.size * 1.5;
              } else {
                // Background particles have more subdued colors
                const hue = (time * 0.03 + i * 0.001) % 1.0;
                const rgb = hslToRgb(hue, 0.5, 0.3);
                particleColors[i * 3] = rgb[0];
                particleColors[i * 3 + 1] = rgb[1];
                particleColors[i * 3 + 2] = rgb[2];
                
                // Background particles are smaller
                particleSizes[i] = particle.size * 0.7;
              }
              
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
            
            // Reset any rotation to ensure text faces camera directly
            particleSystem.rotation.set(0, 0, 0);
            
            // Fixed camera position to clearly see the text - moved further back to see full height
            camera.position.set(0, 0, 100);
            camera.lookAt(0, 0, 0);
            
            // Reset to phase 0 after text animation completes
            if (animationTimer >= transitionTime * 2.5) { // Duration for full cycle through all text messages
              console.log("Resetting to Phase 0");
              animationTimer = 0;
              animationPhase = 0;
              particleSystem.rotation.set(0, 0, 0);
              lines.rotation.set(0, 0, 0);
              
              // Reset camera position
              camera.position.set(0, 0, 80);
              camera.lookAt(0, 0, 0);
              
              // Reset particles to random positions for flow field
              for (let i = 0; i < particles.length; i++) {
                const x = (Math.random() - 0.5) * flowfieldSize;
                const y = (Math.random() - 0.5) * flowfieldSize;
                const z = (Math.random() - 0.5) * flowfieldSize;
                
                particles[i].position.set(x, y, z);
                particles[i].lastPosition.set(x, y, z);
              }
            }
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

        // Function to start phase four animation
        function startPhaseFour() {
          // Reset particle system rotation
          particleSystem.rotation.set(0, 0, 0);
          lines.rotation.set(0, 0, 0);
          
          // Distribute particles in a grid-like pattern at the top
          for (let i = 0; i < particles.length; i++) {
            // Distribute across the width
            const x = (Math.random() * 2 - 1) * 40;
            // Distribute vertically with some randomness
            const y = 40 + (Math.random() * 40);
            // Some depth variation
            const z = (Math.random() - 0.5) * 20;
            
            particles[i].position.set(x, y, z);
            particles[i].lastPosition.set(x, y, z);
            
            // Vary speeds slightly for more natural look
            particles[i].speed = particleBaseSpeed * (0.8 + Math.random() * 0.4);
          }
          
          // Update line material for the matrix effect
          lineMaterial.color.set(0x00ff00);
          lineMaterial.opacity = 0.7;
        }

        // Function to start phase five animation
        function startPhaseFive() {
          // Reset particle system rotation
          particleSystem.rotation.set(0, 0, 0);
          lines.rotation.set(0, 0, 0);
          
          // Distribute particles in a spherical formation
          for (let i = 0; i < particles.length; i++) {
            // Random distribution in 3D space
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 20 + Math.random() * 20;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi) * 0.5; // Flatten z-axis to create disk-like formation
            
            particles[i].position.set(x, y, z);
            particles[i].lastPosition.set(x, y, z);
            particles[i].speed = particleBaseSpeed * (0.8 + Math.random() * 0.4);
          }
          
          // Update line material for the galaxy effect
          lineMaterial.color.set(0xaaaaff);
          lineMaterial.opacity = 0.3;
        }

        // Function to start phase six animation
        function startPhaseSix() {
          // Reset particle system rotation
          particleSystem.rotation.set(0, 0, 0);
          lines.rotation.set(0, 0, 0);
          
          // Distribute particles in a spherical cluster to start the swarm
          const clusterRadius = 15;
          for (let i = 0; i < particles.length; i++) {
            // Random direction from center
            const direction = new THREE.Vector3(
              Math.random() * 2 - 1,
              Math.random() * 2 - 1,
              Math.random() * 2 - 1
            ).normalize();
            
            // Random distance from center
            const distance = Math.random() * clusterRadius;
            
            // Position
            const x = direction.x * distance;
            const y = direction.y * distance;
            const z = direction.z * distance;
            
            particles[i].position.set(x, y, z);
            
            // Offset last position slightly to give initial velocity in random direction
            const randomOffset = new THREE.Vector3(
              (Math.random() * 2 - 1) * 0.1,
              (Math.random() * 2 - 1) * 0.1,
              (Math.random() * 2 - 1) * 0.1
            );
            
            particles[i].lastPosition.copy(particles[i].position).add(randomOffset);
            particles[i].speed = particleBaseSpeed * (0.8 + Math.random() * 0.4);
          }
          
          // Update line material for the swarm effect
          lineMaterial.color.set(0x4488ff);
          lineMaterial.opacity = 0.4;
        }

        // Function to start phase seven animation
        function startPhaseSeven() {
          // Reset particle system rotation
          particleSystem.rotation.set(0, 0, 0);
          lines.rotation.set(0, 0, 0);
          
          // Position camera to better view the tornado
          camera.position.set(0, 20, 80);
          camera.lookAt(0, 10, 0);
          
          // Set up initial tornado formation at the base
          const tornadoBase = -20;
          const tornadoBaseWidth = 25;
          
          for (let i = 0; i < particles.length; i++) {
            // Distribute particles in a circle at the base of the tornado
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * tornadoBaseWidth;
            
            const x = Math.cos(angle) * radius;
            const y = tornadoBase + Math.random() * 5; // Slightly scattered vertically at base
            const z = Math.sin(angle) * radius;
            
            particles[i].position.set(x, y, z);
            particles[i].lastPosition.set(x, y, z);
            
            // Vary speeds for more natural movement
            particles[i].speed = particleBaseSpeed * (0.5 + Math.random() * 1.5);
          }
          
          // Update line material for tornado effect
          lineMaterial.color.set(0xffffff);
          lineMaterial.opacity = 0.2;
        }

        // Function to start phase eight animation
        function startPhaseEight() {
          // Create a smooth transition from tornado to DNA
          // Don't reset particle positions, let them morph
          
          // Adjust line material for DNA effect
          lineMaterial.color.set(0x88aaff);
          lineMaterial.opacity = 0.4;
          
          // Position camera for DNA view
          camera.position.set(0, 10, 80);
          camera.lookAt(0, 0, 0);
          
          // Give particles a slight initial velocity toward their eventual positions
          for (let i = 0; i < particles.length; i++) {
            // Very subtle movement to prevent jarring transition
            particles[i].lastPosition.copy(particles[i].position);
            
            // Slightly vary speeds
            particles[i].speed = particleBaseSpeed * (0.8 + Math.random() * 0.6);
          }
        }
        
        // Function to start phase nine animation
        function startPhaseNine() {
          // Adjust line material for geometric shapes
          lineMaterial.color.set(0xffffff);
          lineMaterial.opacity = 0.15;
          
          // Position camera for a good view of the shapes
          camera.position.set(0, 0, 80);
          camera.lookAt(0, 0, 0);
          
          // Distribute particles randomly as starting point
          for (let i = 0; i < particles.length; i++) {
            // Random positions within a sphere
            const radius = 30 * Math.random();
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            particles[i].position.set(x, y, z);
            particles[i].lastPosition.set(x, y, z);
            
            // Reset particle speed
            particles[i].speed = particleBaseSpeed * (0.8 + Math.random() * 0.4);
          }
        }
        
        // Function to start phase ten animation
        function startPhaseTen() {
          // Text messages to display
          textMessages = [
            "NISHANTH",
            "PORTFOLIO",
            "AI",
            "DEVELOPER",
            "WELCOME"
          ];
          
          // Pre-calculate text point positions for all messages
          textPointsArrays = generateTextPointsArrays(textMessages, particles.length);
          
          // Reset any rotation to ensure text is facing the camera
          particleSystem.rotation.set(0, 0, 0);
          lines.rotation.set(0, 0, 0);
          
          // Set camera directly in front of the XY plane - moved further back to see full height
          camera.position.set(0, 0, 100);
          camera.lookAt(0, 0, 0);
          
          // Adjust line material for text effect
          lineMaterial.color.set(0xffffff);
          lineMaterial.opacity = 0.2;
          
          // Reset particle positions to random starting points
          for (let i = 0; i < particles.length; i++) {
            // Distribute in a sphere
            const radius = 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi) * 0.2; // Flatten z-axis slightly
            
            particles[i].position.set(x, y, z);
            particles[i].lastPosition.set(x, y, z);
          }
        }
        
        // Generate points for text
        function generateTextPointsArrays(messages, maxParticles) {
          const pointsArrays = [];
          
          // Create temporary canvas for text rendering
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 1024;
          canvas.height = 512; // Increased height for better text fitting
          
          for (let msgIndex = 0; msgIndex < messages.length; msgIndex++) {
            const message = messages[msgIndex];
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Set text properties
            ctx.fillStyle = 'white';
            ctx.font = 'bold 100px Arial'; // Slightly smaller font
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw text
            ctx.fillText(message, canvas.width / 2, canvas.height / 2);
            
            // Sample points from the text
            const points = [];
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const sampleStep = 4; // Sample every 4 pixels
            
            for (let y = 0; y < canvas.height; y += sampleStep) {
              for (let x = 0; x < canvas.width; x += sampleStep) {
                const index = (y * canvas.width + x) * 4;
                
                // If pixel is not transparent (text pixel)
                if (data[index + 3] > 128) {
                  // Convert canvas coordinates to world coordinates with proper scaling
                  const worldX = (x - canvas.width / 2) * 0.05;
                  const worldY = -(y - canvas.height / 2) * 0.05;
                  
                  points.push({ x: worldX, y: worldY });
                  
                  // Limit number of points to maxParticles
                  if (points.length >= maxParticles) {
                    break;
                  }
                }
              }
              if (points.length >= maxParticles) {
                break;
              }
            }
            
            // If we have too few points, duplicate some
            while (points.length < maxParticles / 2) {
              const randomIndex = Math.floor(Math.random() * points.length);
              const point = points[randomIndex];
              // Add with slight offset
              points.push({
                x: point.x + (Math.random() - 0.5) * 0.3,
                y: point.y + (Math.random() - 0.5) * 0.3
              });
            }
            
            pointsArrays.push(points);
          }
          
          return pointsArrays;
        }

        // Cubic easing function for smoother transitions
        function easeInOutCubic(t) {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        // Quadratic easing function
        function easeInOutQuad(t) {
          return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        // Quintic easing function for snappier animations
        function easeInOutQuint(t) {
          return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
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
      github: 'https://github.com/ArekatlaNishanthchowdary/Smart-Traffic-Management',
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
      github: 'https://github.com/ArekatlaNishanthchowdary/Explainable-Hybrid-Model-for-Accident-Severity',
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
      url: 'https://www.linkedin.com/in/arekatla-nishanth-chowdary/',
      icon: 'fab fa-linkedin'
    },
    {
      name: 'Twitter',
      url: 'https://x.com/NishantP4K',
      icon: 'fab fa-twitter'
    }
  ];

  const baseUrl = import.meta.env.PROD ? '' : '/react-portfolio';
  
  // Handle PDF viewer modal
  const openPdfViewer = (url) => {
    setPdfViewerModal({ isOpen: true, url: url });
  };

  const closePdfViewer = () => {
    setPdfViewerModal({ isOpen: false, url: '' });
  };

  // Add intersection observer setup
  useEffect(() => {
    if (preloaderComplete) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.transform = 'translateX(0)';
            entry.target.style.opacity = '1';
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px'
      });

      document.querySelectorAll('.reveal-on-scroll').forEach(element => {
        observer.observe(element);
      });

      return () => observer.disconnect();
    }
  }, [preloaderComplete]);

  // Certificate data
  const certificates = [
    {
      id: 1,
      title: "Oracle Cloud Infrastructure",
      issuer: "Oracle OCI",
      description: "Cloud Infrastructure Foundations",
      icon: "fas fa-cloud",
      file: "Oracle OCI.pdf"
    },
    {
      id: 2,
      title: "Oracle AI Foundations",
      issuer: "Oracle OCI AI",
      description: "AI and Machine Learning",
      icon: "fas fa-brain",
      file: "Oracle OCI AI.pdf"
    },
    {
      id: 3,
      title: "Problem Solving Intermediate",
      issuer: "HackerRank",
      description: "Advanced Problem-Solving Skills",
      icon: "fas fa-code",
      file: "problem_solving_intermediate certificate.pdf"
    },
    {
      id: 4,
      title: "Artificial Intelligence Mastery",
      issuer: "Event Beep",
      description: "AI Fundamentals and Applications",
      icon: "fas fa-robot",
      file: "Arekatla-Nishanth-Chowdary-Artificial-Intelligence-Certificate.pdf"
    },
    {
      id: 5,
      title: "Deep Learning",
      issuer: "Advanced Neural Networks",
      description: "Neural Networks and Deep Learning",
      icon: "fas fa-network-wired",
      file: "Deep_Learning_Arekatla_Certificate.pdf"
    },
    {
      id: 6,
      title: "Joy of Computing with Python",
      issuer: "NPTEL",
      description: "Python Programming Fundamentals",
      icon: "fas fa-award",
      file: "Joy of computing using python nptel.pdf"
    },
    {
      id: 7,
      title: "Introduction to Artificial Intelligence",
      issuer: "Infosys Springboard",
      description: "AI Fundamentals",
      icon: "fas fa-robot",
      file: "Introduction to artificial Intelligence infosys.pdf"
    },
    {
      id: 8,
      title: "Introduction to Deep Learning",
      issuer: "Infosys Springboard",
      description: "Deep Learning Fundamentals",
      icon: "fas fa-brain",
      file: "Introduction to Deep Learning infosys.pdf"
    },
    {
      id: 9,
      title: "Introduction to Python",
      issuer: "Infosys Springboard",
      description: "Python Programming",
      icon: "fab fa-python",
      file: "Introduction to python infosys.pdf"
    }
  ];

  return (
    <div className="app">
      {/* WebGL Background Canvas */}
      <canvas 
        ref={bgCanvasRef} 
        id="bg-canvas" 
        className="fixed top-0 left-0 w-full h-full blur-[2px] opacity-85"
      ></canvas>

      {/* Fallback Background */}
      <div 
        id="fallback-bg" 
        className="fixed top-0 left-0 w-full h-full bg-gradient-to-br from-black via-slate-900 to-black opacity-0"
      ></div>

      {/* Preloader */}
      {!preloaderComplete && <Preloader onLoadComplete={handlePreloaderLoaded} />}

      {/* Main Content */}
      <main 
        ref={appContentRef} 
        className={`relative z-10 min-h-screen ${preloaderComplete ? 'app-content visible' : 'app-content'}`}
      >
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
                <a 
                  href="#main-sections" 
                  onClick={() => setActiveSection('projects')} 
                  className="btn btn-primary inline-flex items-center justify-center min-w-[160px]"
                >
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
        <section id="about" className="py-20 bg-secondary/20 relative z-20">
          <div className="container mx-auto px-4">
            <div className="reveal-on-scroll translate-x-[-50px] opacity-0">
              <h2 className="text-4xl font-bold mb-12 text-center">About Me</h2>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="backdrop-blur-md bg-black/10 p-6 rounded-xl">
                  <p className="text-lg mb-6">
                    I am an AI undergraduate student at Amrita Vishwa Vidyapeetham, Amaravati, passionate about 
                    developing AI-driven solutions for real-world problems. My focus areas include computer vision, 
                    machine learning, and data analysis, with a special interest in safety applications.
                  </p>
                  <div className="flex gap-4">
                    <a href={`${baseUrl}/Resume.pdf`} className="btn btn-primary" download>
                    <i className="fas fa-download mr-2"></i> Download Resume
                  </a>
                    <button onClick={() => openPdfViewer('/Resume.pdf')} className="btn btn-secondary">
                      <i className="fas fa-eye mr-2"></i> View Resume
                    </button>
                </div>
                </div>
                <div className="backdrop-blur-md bg-black/10 p-6 rounded-xl">
                  <h3 className="text-2xl font-semibold mb-4">Technical Skills</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <div className="mr-3 text-accent-blue text-2xl">
                        <i className="fas fa-brain"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">Deep Learning</h4>
                        <div className="h-2 w-full bg-secondary/50 rounded-full mt-2">
                          <div className="h-full bg-accent-blue rounded-full" style={{ width: '90%' }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="mr-3 text-accent-blue text-2xl">
                        <i className="fas fa-robot"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">Machine Learning</h4>
                        <div className="h-2 w-full bg-secondary/50 rounded-full mt-2">
                          <div className="h-full bg-accent-purple rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="mr-3 text-accent-blue text-2xl">
                        <i className="fab fa-python"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">Python</h4>
                        <div className="h-2 w-full bg-secondary/50 rounded-full mt-2">
                          <div className="h-full bg-accent-pink rounded-full" style={{ width: '95%' }}></div>
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
                          <div className="h-full bg-accent-blue rounded-full" style={{ width: '80%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="backdrop-blur-md bg-black/10 p-6 rounded-xl mt-6">
                  <h3 className="text-2xl font-semibold mb-4">HackerRank Achievements</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-yellow-500 text-2xl">
                        <i className="fas fa-medal"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">Python</h4>
                        <p className="text-sm text-gray-400">Gold Badge</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-yellow-500 text-2xl">
                        <i className="fas fa-medal"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">Problem Solving</h4>
                        <p className="text-sm text-gray-400">Gold Badge</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-secondary/30 relative z-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Projects */}
              <div className="reveal-on-scroll translate-x-[-50px] opacity-0" style={{ animationDelay: '0.2s' }}>
                <a href="#main-sections" onClick={() => setActiveSection('projects')} className="group">
                  <div className="backdrop-blur-md bg-black/20 p-6 rounded-xl hover:bg-black/30 transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue mb-4">
                        <i className="fas fa-code text-2xl"></i>
                      </div>
                      <i className="fas fa-arrow-right opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all"></i>
                    </div>
                    <h3 className="text-4xl font-bold mb-2">4</h3>
                    <p className="text-gray-400 font-medium">TOTAL PROJECTS</p>
                    <p className="text-sm text-gray-500">View my work</p>
                  </div>
                </a>
              </div>

              {/* Certificates */}
              <div className="reveal-on-scroll translate-x-[-50px] opacity-0" style={{ animationDelay: '0.4s' }}>
                <a 
                  href="#main-sections" 
                  onClick={() => setActiveSection('certificates')} 
                  className="group"
                >
                  <div className="backdrop-blur-md bg-black/20 p-6 rounded-xl hover:bg-black/30 transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-full bg-accent-purple/10 flex items-center justify-center text-accent-purple mb-4">
                        <i className="fas fa-certificate text-2xl"></i>
                      </div>
                      <i className="fas fa-arrow-right opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all"></i>
                    </div>
                    <h3 className="text-4xl font-bold mb-2">4</h3>
                    <p className="text-gray-400 font-medium">CERTIFICATES</p>
                    <p className="text-sm text-gray-500">Professional skills validated</p>
                  </div>
                </a>
              </div>

              {/* Experience */}
              <div className="reveal-on-scroll translate-x-[-50px] opacity-0" style={{ animationDelay: '0.6s' }}>
                <a href="#experience" className="group">
                  <div className="backdrop-blur-md bg-black/20 p-6 rounded-xl hover:bg-black/30 transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-full bg-accent-pink/10 flex items-center justify-center text-accent-pink mb-4">
                        <i className="fas fa-globe text-2xl"></i>
                      </div>
                      <i className="fas fa-arrow-right opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all"></i>
                    </div>
                    <h3 className="text-4xl font-bold mb-2">Fresher</h3>
                    <p className="text-gray-400 font-medium">YEARS OF EXPERIENCE</p>
                    <p className="text-sm text-gray-500">View my journey</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* New Tabbed Sections */}
        <section id="main-sections" className="py-20 bg-secondary/30 relative z-20">
          <div className="container">
            {/* Section Navigation */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              <button 
                onClick={() => setActiveSection('projects')}
                className={`p-6 rounded-xl backdrop-blur-md transition-all ${
                  activeSection === 'projects' 
                    ? 'bg-accent-blue/20 border-2 border-accent-blue' 
                    : 'bg-black/20 hover:bg-black/30'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <i className="fas fa-code text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-center">Projects</h3>
              </button>

              <button 
                onClick={() => setActiveSection('certificates')}
                className={`p-6 rounded-xl backdrop-blur-md transition-all ${
                  activeSection === 'certificates' 
                    ? 'bg-accent-purple/20 border-2 border-accent-purple' 
                    : 'bg-black/20 hover:bg-black/30'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <i className="fas fa-certificate text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-center">Certificates</h3>
              </button>

              <button 
                onClick={() => setActiveSection('techstack')}
                className={`p-6 rounded-xl backdrop-blur-md transition-all ${
                  activeSection === 'techstack' 
                    ? 'bg-accent-pink/20 border-2 border-accent-pink' 
                    : 'bg-black/20 hover:bg-black/30'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <i className="fas fa-layer-group text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-center">Tech Stack</h3>
              </button>
            </div>

            {/* Section Content */}
            <div className="min-h-[600px]">
              {/* Projects Section */}
              <div className={activeSection === 'projects' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                  {projects.map((project, index) => (
                    <div 
                      key={project.id} 
                      className="reveal-on-scroll card backdrop-blur-md bg-black/20"
                      style={{ 
                        opacity: 0,
                        transform: `translateX(${index % 2 === 0 ? '-50px' : '50px'})`,
                        animationDelay: `${index * 0.2}s`
                      }}
                    >
                      <img src={project.image} alt={project.title} className="w-full h-48 object-cover rounded-t-xl" />
                      <div className="p-4 md:p-6">
                        <h3 className="text-lg md:text-xl font-semibold mb-2">{project.title}</h3>
                        <p className="text-sm md:text-base text-gray-400 mb-4">{project.description}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.tags.map((tag, index) => (
                            <span key={index} className="bg-accent-blue/20 text-accent-blue text-xs px-2 py-1 rounded">{tag}</span>
                          ))}
                        </div>
                        <div className="flex gap-2 md:gap-4 flex-col sm:flex-row">
                          <button className="btn btn-primary text-sm md:text-base" onClick={() => openProjectModal(project.id)}>
                            <i className="fas fa-info-circle mr-2"></i> Details
                          </button>
                          <a href={project.github} className="btn btn-secondary text-sm md:text-base" target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-github mr-2"></i> Live Demo
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certificates Section */}
              <div className={activeSection === 'certificates' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                  {certificates.map((cert, index) => (
                    <div 
                      key={cert.id}
                      className="reveal-on-scroll card backdrop-blur-md bg-black/20 transition-all duration-1000 ease-out"
                      style={{ 
                        opacity: 0,
                        transform: `translateX(${index % 2 === 0 ? '-100px' : '100px'})`,
                        animationDelay: `${index * 0.3}s`
                      }}
                    >
                      <div className="p-4 md:p-6 transform transition-transform duration-500 hover:scale-[1.02]">
                        <div className="mb-4 text-2xl md:text-4xl text-accent-purple">
                          <i className={cert.icon}></i>
                        </div>
                        <h3 className="text-lg md:text-xl font-semibold mb-2">{cert.title}</h3>
                        <p className="text-sm md:text-base text-gray-300 mb-2">{cert.issuer}</p>
                        <p className="text-xs md:text-sm text-gray-400 mb-4">{cert.description}</p>
                        <button 
                          onClick={() => openPdfViewer(`${baseUrl}/certificates/${cert.file}`)}
                          className="btn btn-primary w-full text-sm md:text-base"
                        >
                          <i className="fas fa-eye mr-2"></i> View Certificate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack Section */}
              <div className={activeSection === 'techstack' ? 'block' : 'hidden'}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="card backdrop-blur-md bg-black/20">
                    <div className="p-6">
                      <div className="mb-4 text-accent-pink text-4xl">
                        <i className="fas fa-brain"></i>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">AI & ML</h3>
                      <ul className="space-y-2 text-gray-300">
                        <li><i className="fas fa-check text-accent-pink mr-2"></i>TensorFlow</li>
                        <li><i className="fas fa-check text-accent-pink mr-2"></i>PyTorch</li>
                        <li><i className="fas fa-check text-accent-pink mr-2"></i>Scikit-learn</li>
                        <li><i className="fas fa-check text-accent-pink mr-2"></i>OpenCV</li>
                      </ul>
                    </div>
                  </div>

                  <div className="card backdrop-blur-md bg-black/20">
                    <div className="p-6">
                      <div className="mb-4 text-accent-blue text-4xl">
                        <i className="fas fa-code"></i>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Programming</h3>
                      <ul className="space-y-2 text-gray-300">
                        <li><i className="fas fa-check text-accent-blue mr-2"></i>Python</li>
                        <li><i className="fas fa-check text-accent-blue mr-2"></i>JavaScript</li>
                        <li><i className="fas fa-check text-accent-blue mr-2"></i>React</li>
                        <li><i className="fas fa-check text-accent-blue mr-2"></i>Node.js</li>
                      </ul>
                    </div>
                  </div>

                  <div className="card backdrop-blur-md bg-black/20">
                    <div className="p-6">
                      <div className="mb-4 text-accent-purple text-4xl">
                        <i className="fas fa-database"></i>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Data & Tools</h3>
                      <ul className="space-y-2 text-gray-300">
                        <li><i className="fas fa-check text-accent-purple mr-2"></i>SQL</li>
                        <li><i className="fas fa-check text-accent-purple mr-2"></i>MongoDB</li>
                        <li><i className="fas fa-check text-accent-purple mr-2"></i>Git</li>
                        <li><i className="fas fa-check text-accent-purple mr-2"></i>Docker</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
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
              </div>
            </div>
          ))}
        </div>

        {/* Experience Section */}
        <section id="experience" className="py-20 bg-secondary/30 relative z-20">
          <div className="container mx-auto px-4">
            <div className="reveal-on-scroll translate-y-[50px] opacity-0">
              <h2 className="text-4xl font-bold mb-12 text-center">Experience</h2>
              <div className="card backdrop-blur-md bg-black/20 p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-accent-purple mb-2">AI & ML Developer</h3>
                    <p className="text-gray-400">Fresher</p>
                  </div>
                  <p className="text-gray-400 mt-2 md:mt-0">2025 - Present</p>
                </div>
                <ul className="space-y-4 text-gray-300">
                  <li className="flex items-start">
                    <i className="fas fa-check-circle text-accent-purple mt-1 mr-3"></i>
                    <span>Developed AI-powered solutions using Python, TensorFlow, and PyTorch for various applications</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-check-circle text-accent-purple mt-1 mr-3"></i>
                    <span>Implemented deep learning models for image recognition and natural language processing tasks</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-check-circle text-accent-purple mt-1 mr-3"></i>
                    <span>Created and optimized machine learning workflows for data preprocessing and model training</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-check-circle text-accent-purple mt-1 mr-3"></i>
                    <span>Collaborated with cross-functional teams to integrate AI solutions into existing systems</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-check-circle text-accent-purple mt-1 mr-3"></i>
                    <span>Conducted research on emerging AI technologies and their potential applications</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 bg-secondary/30 relative z-20">
          <div className="container mx-auto px-4">
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
      </main>

      {/* Modals */}
      <div className="relative z-50">
        {/* PDF Viewer Modal */}
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 ${pdfViewerModal.isOpen ? 'flex' : 'hidden'}`}
          onClick={closePdfViewer}>
          <div 
            className="w-full h-[80vh] md:max-w-4xl md:h-[90vh] bg-secondary rounded-xl p-4 md:p-6 shadow-2xl flex flex-col relative"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl md:text-2xl font-bold">Document Viewer</h3>
              <button className="close-modal text-xl text-gray-400 hover:text-white" onClick={closePdfViewer}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="flex-1 w-full relative bg-white rounded-lg overflow-hidden">
              <object 
                data={pdfViewerModal.url}
                type="application/pdf"
                className="absolute inset-0 w-full h-full"
                style={{ minHeight: '100%' }}>
                <p>Your browser does not support PDFs. 
                  <a href={pdfViewerModal.url} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
                    Click here to download the PDF
                  </a>
                </p>
              </object>
            </div>
          </div>
        </div>

        {/* PDF Viewer Modal */}
        {pdfViewerModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <div className="relative w-full max-w-4xl h-[90vh] bg-gray-900 rounded-lg shadow-xl">
              <button
                onClick={closePdfViewer}
                className="absolute top-4 right-4 text-white hover:text-accent-purple transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
              <div className="h-full p-4">
                <object
                  data={pdfViewerModal.url}
                  type="application/pdf"
                  className="w-full h-full rounded-lg"
                >
                  <div className="flex flex-col items-center justify-center h-full text-white">
                    <p className="mb-4">Unable to display PDF directly.</p>
                    <a
                      href={pdfViewerModal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      <i className="fas fa-download mr-2"></i>
                      Download PDF
                    </a>
                  </div>
                </object>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add these keyframe animations to your existing styles */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.7s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.7s ease-out forwards;
        }

        .reveal-on-scroll {
          transition: all 0.7s ease-out;
        }

        .animate-reveal {
          opacity: 1 !important;
          transform: translate(0, 0) !important;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-in-up {
          animation: slideInUp 0.7s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default App;
