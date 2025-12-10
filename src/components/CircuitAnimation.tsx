export default function CircuitAnimation() {
  return (
    <>
      <style>{`
        /* 3D Container */
        .scene-container {
          perspective: 1200px;
          width: 100%;
          max-width: 400px;
          height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto;
        }

        .logo-wrapper {
          width: 400px;
          height: 400px;
          position: relative;
          transform: rotateX(50deg) rotateZ(-30deg);
          transform-style: preserve-3d;
        }

        /* The actual logo image */
        .logo-image {
          width: 80%;
          height: 80%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          object-fit: contain;
          filter: drop-shadow(0px 15px 25px rgba(13, 152, 186, 0.4));
        }

        /* SVG Container - invisible, just for the path */
        .circuit-svg {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0;
          pointer-events: none;
        }

        /* The Electric Pulse Ball */
        .energy-ball {
          position: absolute;
          /* Size tuned to be closer to the logo stroke width */
          width: 26px;
          height: 26px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 
            0 0 20px #fff,
            0 0 40px #fff,
            0 0 60px #0d98ba,
            0 0 80px #0d98ba,
            0 0 100px #0d98ba;
          filter: blur(2px);
          opacity: 0;
          z-index: 10;
          /* Make sure the CENTER of the ball sits on the path */
          offset-anchor: 50% 50%;
          /* Path adjusted to match the actual logo position - starts left of center at bottom */
          offset-path: path("M 150 337 L 95 337 Q 75 337 65 325 L 65 175 Q 65 162 85 147 L 170 75 Q 200 50 230 75 L 315 142 Q 340 157 340 175 L 340 315 Q 340 337 320 337 L 200 337 L 200 200");
          offset-distance: 0%;
          animation: travel 2.5s ease-in-out infinite;
        }

        /* Trail effect - creates copies that follow behind */
        .energy-ball::before,
        .energy-ball::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: #ffffff;
          border-radius: 50%;
          filter: blur(2px);
          top: 0;
          left: 0;
        }

        .energy-ball::before {
          opacity: 0.6;
          box-shadow: 
            0 0 15px #fff,
            0 0 30px #0d98ba,
            0 0 50px #0d98ba;
          animation: trail1 2.5s ease-in-out infinite;
        }

        .energy-ball::after {
          opacity: 0.3;
          box-shadow: 
            0 0 10px #fff,
            0 0 20px #0d98ba,
            0 0 40px #0d98ba;
          animation: trail2 2.5s ease-in-out infinite;
        }

        @keyframes trail1 {
          0% {
            transform: translateX(0) scale(0.9);
            opacity: 0;
          }
          5% {
            opacity: 0.6;
          }
          95% {
            opacity: 0.6;
          }
          100% {
            transform: translateX(-15px) scale(0.7);
            opacity: 0;
          }
        }

        @keyframes trail2 {
          0% {
            transform: translateX(0) scale(0.8);
            opacity: 0;
          }
          5% {
            opacity: 0.3;
          }
          95% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(-25px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes travel {
          0% {
            offset-distance: 0%;
            opacity: 0;
            transform: scale(0.5);
          }
          5% {
            opacity: 1;
            transform: scale(1);
          }
          85% {
            offset-distance: 99.2%;
            opacity: 1;
            transform: scale(1);
          }
          90% {
            offset-distance: 99.2%;
            opacity: 1;
            transform: scale(2);
          }
          95% {
            offset-distance: 99.2%;
            opacity: 0.8;
            transform: scale(3.5);
          }
          100% {
            offset-distance: 99.2%;
            opacity: 0;
            transform: scale(4.5);
          }
        }
      `}</style>

      <div className="scene-container">
        <div className="logo-wrapper">
          {/* Your original logo image */}
          <img src="/logo copy.png" alt="Tenantry Logo" className="logo-image" />
          
          {/* Hidden SVG path that the energy ball follows */}
          <svg className="circuit-svg" viewBox="0 0 400 400">
            <path 
              d="M 80 340 Q 60 340 60 320 L 60 180 Q 60 160 75 145 L 160 65 Q 200 25 240 65 L 325 145 Q 340 160 340 180 L 340 320 Q 340 340 320 340 L 220 340 L 220 210"
            />
          </svg>
          
          <div className="energy-ball"></div>
        </div>
      </div>
    </>
  );
}

