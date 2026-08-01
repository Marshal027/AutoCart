import React from 'react';
import { RippleGrid } from './ReactBits';

export const Background3D = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#040506]">
      <RippleGrid
        enableRainbow
        gridColor="#ffffff"
        rippleIntensity={0.06}
        gridSize={22}
        gridThickness={16}
        fadeDistance={2.4}
        vignetteStrength={5}
        glowIntensity={0.5}
        opacity={1}
        gridRotation={0}
        mouseInteraction
        mouseInteractionRadius={1}
      />
    </div>
  );
};