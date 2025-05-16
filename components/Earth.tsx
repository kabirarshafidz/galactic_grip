'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Stars } from '@react-three/drei';
import * as THREE from 'three';
import satelliteData from '../satellite1.json';

// Import texture
const earthTexture = '/textures/earth.jpg';

// Global scale factor (1 unit = 1000 km)
const SCALE = 1000;
// Time scale for animation (higher = faster orbits)
const TIME_SCALE = 48;

// Original measurements in km
const EARTH_RADIUS = 6378; // Earth radius in km
const COVERAGE_DIAMETER = 4700; // Coverage diameter in km
const COVERAGE_RADIUS = COVERAGE_DIAMETER / 2; // Coverage radius in km
const SATELLITE_SIZE = 500; // Satellite size in meters
const COVERAGE_ANGLE = 143.3; // in degrees

interface BeaconProps {
  orbitRadius: number;
  speed: number;
  color: string;
  size?: number;
}

function Beacon({ orbitRadius, speed, color, size = 0.2 }: BeaconProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const time = useRef(0);

  useFrame(() => {
    if (groupRef.current) {
      time.current += speed;
      
      // Calculate position on the orbit
      const x = Math.cos(time.current) * (orbitRadius / SCALE);
      const z = Math.sin(time.current) * (orbitRadius / SCALE);
      groupRef.current.position.set(x, 0, z);
      
      // Calculate tangent direction (derivative of the orbit)
      const tangentX = -Math.sin(time.current);
      const tangentZ = Math.cos(time.current);
      
      // Set rotation to face the tangent direction
      groupRef.current.rotation.y = Math.atan2(tangentX, tangentZ);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main beacon */}
      <Box args={[size, size, size]}>
        <meshBasicMaterial color={color} />
      </Box>
      
      {/* Forward beam */}
      <mesh position={[0, 0, size * 1.5]}>
        <boxGeometry args={[size * 0.2, size * 0.2, size * 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      
      {/* Backward beam */}
      <mesh position={[0, 0, -size * 1.5]}>
        <boxGeometry args={[size * 0.2, size * 0.2, size * 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

interface SatelliteProps {
  data: {
    OBJECT_NAME: string;
    MEAN_MOTION: number;
    ECCENTRICITY: number;
    INCLINATION: number;
    RA_OF_ASC_NODE: number;
    ARG_OF_PERICENTER: number;
    MEAN_ANOMALY: number;
    radius: number;
    altitude: number;
    angle: number;
    period: number;
  };
}

function Satellite({ data }: SatelliteProps) {
  const satelliteRef = useRef<THREE.Group>(null!);
  const time = useRef(0);

  // Orbital parameters
  const altitude = data.altitude;
  const orbitRadius = (EARTH_RADIUS + altitude)  / SCALE;
  // Use period (hours) to set speed
  const periodSeconds = data.period * 3600; // convert hours to seconds
  const speed = (2 * Math.PI) / (periodSeconds / TIME_SCALE); // radians per frame
  const inclinationRad = (data.INCLINATION * Math.PI) / 180;
  const raanRad = (data.RA_OF_ASC_NODE * Math.PI) / 180;
  const argPericenterRad = (data.ARG_OF_PERICENTER * Math.PI) / 180;
  const meanAnomalyRad = (data.MEAN_ANOMALY * Math.PI) / 180;

  // Ensure time.current starts at 0 for all satellites
  useEffect(() => {
    time.current = 0;
  }, []);

  useFrame(() => {
    if (satelliteRef.current) {
      time.current += speed;
      // Satellite position in its local orbit plane (XZ)
      const phase = time.current + meanAnomalyRad;
      const x = Math.cos(phase) * orbitRadius;
      const z = Math.sin(phase) * orbitRadius;
      satelliteRef.current.position.set(x, 0, z);
      // Always point the cone toward the Earth's center
      satelliteRef.current.lookAt(0, 0, 0);
    }
  });

  // Compose the orbit plane rotation: RAAN (Z), inclination (X), argument of pericenter (Z)
  const orbitRotation = [
    0, // X
    0, // Y
    0  // Z
  ];
  // We'll use a group with .rotation.setFromRotationMatrix
  const orbitMatrix = new THREE.Matrix4();
  orbitMatrix.makeRotationZ(raanRad)
    .multiply(new THREE.Matrix4().makeRotationX(inclinationRad))
    .multiply(new THREE.Matrix4().makeRotationZ(argPericenterRad));
  const euler = new THREE.Euler().setFromRotationMatrix(orbitMatrix);

  return (
    <group rotation={[euler.x, euler.y, euler.z]}>
      <group ref={satelliteRef}>
        {/* Satellite body */}
        <Box args={[SATELLITE_SIZE/SCALE, SATELLITE_SIZE/SCALE/2, SATELLITE_SIZE/SCALE/2]}>
          <meshBasicMaterial color="cyan" />
        </Box>
        {/* Coverage area visualization */}
        <mesh position={[0, 0, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[COVERAGE_RADIUS/SCALE, -(COVERAGE_RADIUS/(2*Math.tan(COVERAGE_ANGLE/2)))/SCALE, 32]} />
          <meshBasicMaterial 
            color="cyan" 
            transparent 
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useLoader(THREE.TextureLoader, earthTexture);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <Sphere ref={meshRef} args={[EARTH_RADIUS/SCALE, 64, 64]}>
      <meshStandardMaterial
        map={texture}
        metalness={0.1}
        roughness={0.7}
      />
    </Sphere>
  );
}

export default function Earth() {
  return (
    <div className="w-full h-full">
      <Canvas 
        camera={{ position: [0, 5, 15], fov: 75 }}
        shadows
      >
        <fog attach="fog" args={['#000000', 20, 40]} />
        
        <Stars 
          radius={150} 
          depth={100} 
          count={8000} 
          factor={6} 
          saturation={0} 
          fade={false}
          speed={0.5}
        />
        
        {/* Enhanced lighting for better texture visibility */}
        <ambientLight intensity={3} />
        <pointLight position={[10, 10, 10]} intensity={4} />
        <pointLight position={[-10, -10, -10]} intensity={2} />
        <pointLight position={[0, 10, 0]} intensity={3} />
        <directionalLight position={[5, 5, 5]} intensity={5} />
        
        <Globe />
        {/* Beacons */}
        <Beacon orbitRadius={4000} speed={0.02} color="red" size={0.3} />
        <Beacon orbitRadius={5000} speed={0.015} color="green" />
        <Beacon orbitRadius={3500} speed={0.025} color="yellow" size={0.15} />
        <Beacon orbitRadius={4500} speed={0.018} color="purple" size={0.25} />
        
        {/* Satellites from data */}
        {satelliteData.map((satellite) => (
          <Satellite key={satellite.NORAD_CAT_ID} data={satellite} />
        ))}
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
} 