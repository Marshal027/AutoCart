// @ts-nocheck
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WireframeTerrain = () => {
  const meshRef = useRef();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const { geometry, originalPositions } = useMemo(() => {
    // A highly detailed plane
    const geo = new THREE.PlaneGeometry(100, 100, 80, 80);
    // Rotate to lay flat
    geo.rotateX(-Math.PI / 2);
    const orig = geo.attributes.position.array.slice();
    return { geometry: geo, originalPositions: orig };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!meshRef.current) return;
    
    const positions = meshRef.current.geometry.attributes.position.array;
    
    // Scale mouse coordinates to match the 3D plane scale roughly
    const mouseX = mouseRef.current.x * 25; 
    const mouseZ = -mouseRef.current.y * 25; 

    let i = 0;
    for (let x = 0; x <= 80; x++) {
      for (let z = 0; z <= 80; z++) {
        const idx = i * 3;
        
        // Original grid positions
        const origX = originalPositions[idx];
        const origZ = originalPositions[idx + 2];
        
        // Current positions
        const px = positions[idx];
        const py = positions[idx + 1];
        const pz = positions[idx + 2];
        // Flowing landscape using combined sine waves (Slowed down for calmness)
        const baseY = Math.sin(origX * 0.2 + time * 0.15) * 0.8 + 
                      Math.cos(origZ * 0.2 + time * 0.12) * 0.8;
                
        // Interactive cursor ripple (Sticky dragging)
        const dx = origX - mouseX;
        const dz = origZ - mouseZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        let targetX = origX;
        let targetY = baseY;
        let targetZ = origZ;
        
          // Keep the cursor response soft and localized.
          if (dist < 4.5) {
            const pull = Math.pow(1 - (dist / 4.5), 2);
           // Pull vertices towards the cursor location
            targetX = origX - dx * pull * 0.2; 
            targetZ = origZ - dz * pull * 0.2;
           // Push them down like pressing a hand into water
           targetY = baseY - pull * 3; 
        }

        // Smooth physics-like interpolation (spring back)
        positions[idx] = THREE.MathUtils.lerp(px, targetX, 0.15);
        positions[idx + 1] = THREE.MathUtils.lerp(py, targetY, 0.15);
        positions[idx + 2] = THREE.MathUtils.lerp(pz, targetZ, 0.15);
        
        i++;
      }
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Keep the tilt extremely subtle so the terrain feels premium and calm.
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, mouseRef.current.x * 0.015, 0.02);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -5, -15]}>
      <meshBasicMaterial 
        color="#caff00" // Neon lime/green
        wireframe={true} 
        transparent={true} 
        opacity={0.4} 
      />
    </mesh>
  );
};

export const Background3D = () => {
  useEffect(() => {
    console.log("Background3D mounted!");
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, #0a1100 0%, #000000 100%)'}}>
      <Canvas camera={{ position: [0, 5, 20], fov: 60 }} gl={{ antialias: true, alpha: true }} onError={(e) => console.error("Canvas Error:", e)}>
        <fog attach="fog" args={['#000000', 10, 40]} />
        <WireframeTerrain />
      </Canvas>
    </div>
  );
};