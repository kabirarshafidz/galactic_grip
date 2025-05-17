'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import satelliteData from '../satellite1.json';
import { cover } from 'three/src/extras/TextureUtils.js';

// Import texture
const earthTexture = '/textures/earth.jpg';

// Global scale factor (1 unit = 1000 km)
const SCALE = 1000
// Time scale for animation (higher = faster orbits)
const TIME_SCALE = 144;

// Original measurements in km
const EARTH_RADIUS = 6378; // Earth radius in km
const COVERAGE_DIAMETER = 4700; // Coverage diameter in km
const COVERAGE_RADIUS = COVERAGE_DIAMETER / 2; // Coverage radius in km
const SATELLITE_SIZE = 100; // Satellite size in meters
const COVERAGE_ANGLE = 2*COVERAGE_RADIUS/EARTH_RADIUS; // in radians
const CONE_RADIUS = EARTH_RADIUS * Math.sin(COVERAGE_ANGLE/2);
const CONE_HEIGHT_FACTOR = EARTH_RADIUS -Math.sqrt(EARTH_RADIUS**2 - CONE_RADIUS**2);

interface BeaconProps {
    altitude: number; // in km
    color: string;
    size?: number;
    inclination?: number; // in degrees
    sunSynchronous?: boolean;
    lst?: number; // Local Solar Time at Descending Node, in hours (0-24)
}

function beaconSpeed(altitude: number) {
  const G = 6.67430e-11;
  const M = 5.972e24;
  const r = (EARTH_RADIUS + altitude)*SCALE;
  const v = Math.sqrt(G * M / r);
  return v;
}

function Beacon({
  altitude,
  color, // will be ignored, dynamic color used
  size = SATELLITE_SIZE/SCALE,
  inclination = 64,
  sunSynchronous = false,
  lst = 12, // noon by default
}: BeaconProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const [beaconColor, setBeaconColor] = useState('green');
  const time = useRef(0);

  // Inclination for sun-sync orbits
  const inclinationDeg = sunSynchronous ? 97.5 : inclination;
  const inclinationRad = (inclinationDeg * Math.PI) / 180;

  // Compute orbit radius and speed based on altitude (in km)
  const orbitRadius = EARTH_RADIUS + altitude;
  const speed = beaconSpeed(altitude);
  const angularSpeed = speed / (orbitRadius * 1000); // radians/sec, both in meters

  // Helper to get satellite position in world coordinates
  function getSatelliteWorldPosition(sat: any, t: number) {
    // Orbital parameters
    const satAltitude = sat.altitude;
    const satOrbitRadius = (EARTH_RADIUS + satAltitude) / SCALE;
    const periodSeconds = sat.period * 3600;
    const satSpeed = (2 * Math.PI) / (periodSeconds / TIME_SCALE);
    const inclinationRad = (sat.INCLINATION * Math.PI) / 180;
    const raanRad = (sat.RA_OF_ASC_NODE * Math.PI) / 180;
    const argPericenterRad = (sat.ARG_OF_PERICENTER * Math.PI) / 180;
    const meanAnomalyRad = (sat.MEAN_ANOMALY * Math.PI) / 180;
    const now = new Date();
    const epochDate = new Date(sat.EPOCH);
    const timeSinceEpoch = (now.getTime() - epochDate.getTime()) / 1000;
    const phaseOffset = (timeSinceEpoch / periodSeconds) * 2 * Math.PI;
    const phase = t + meanAnomalyRad + phaseOffset;
    // Local orbit position
    const x = Math.cos(phase) * satOrbitRadius;
    const z = Math.sin(phase) * satOrbitRadius;
    const y = 0;
    // Apply orbit plane rotation: RAAN (Y), inclination (X), arg of pericenter (Y)
    const pos = new THREE.Vector3(x, y, z);
    const m = new THREE.Matrix4();
    m.makeRotationY(raanRad)
      .multiply(new THREE.Matrix4().makeRotationX(inclinationRad))
      .multiply(new THREE.Matrix4().makeRotationY(argPericenterRad));
    pos.applyMatrix4(m);
    return pos;
  }

  // Helper to get beacon world position
  function getBeaconWorldPosition(t: number) {
    const x = Math.cos(t) * (orbitRadius / SCALE);
    const z = Math.sin(t) * (orbitRadius / SCALE);
    return new THREE.Vector3(x, 0, z);
  }

  // Helper to check if beacon is inside satellite's cone
  function isBeaconInCone(beaconPos: THREE.Vector3, satPos: THREE.Vector3, satAltitude: number) {
    // Cone apex at satPos, axis toward Earth's center (0,0,0)
    const axis = (new THREE.Vector3(0,0,0)).clone().sub(satPos).normalize();
    const beaconVec = beaconPos.clone().sub(satPos);
    const beaconDist = beaconVec.length();
    const beaconDir = beaconVec.clone().normalize();
    // Cone geometry based on visualization
    const h = (satAltitude + CONE_HEIGHT_FACTOR) / SCALE; // cone height in scene units
    const halfAngle = Math.atan(CONE_RADIUS / h / SCALE); // CONE_RADIUS in km, h in scene units, so convert CONE_RADIUS to scene units
    const angle = axis.angleTo(beaconDir);
    const EPSILON = 0.01; // ~0.5 degree in radians
    const inside = (angle < halfAngle + EPSILON) && (beaconDist < h + EPSILON);
    if (inside) {
      console.log(
        `Beacon is under a cone: angle = ${(angle * 180 / Math.PI).toFixed(2)}°, halfAngle = ${(halfAngle * 180 / Math.PI).toFixed(2)}°`
      );
    }
    return inside;
  }

  useFrame((state, delta) => { 
    if (groupRef.current) {
      time.current += angularSpeed * delta * TIME_SCALE;
      // Calculate position on the orbit
      const x = Math.cos(time.current) * (orbitRadius / SCALE);
      const z = Math.sin(time.current) * (orbitRadius / SCALE);
      groupRef.current.position.set(x, 0, z);
      // Calculate tangent direction (derivative of the orbit)
      const tangentX = -Math.sin(time.current);
      const tangentZ = Math.cos(time.current);
      // Set rotation to face the tangent direction
      groupRef.current.rotation.y = Math.atan2(tangentX, tangentZ);

      // --- Coverage check logic ---
      const beaconPos = getBeaconWorldPosition(time.current);
      const covered = satelliteData.some(sat => {
        const satPos = getSatelliteWorldPosition(sat, time.current);
        return isBeaconInCone(beaconPos, satPos, sat.altitude);
      });
      setBeaconColor(covered ? 'green' : 'red');
    }
  });

  // Use simulated time of day (scaled by TIME_SCALE) for sun-synchronous RAAN
  // Get elapsed simulated seconds
  const getElapsedSimSeconds = () => {
    if (typeof window !== 'undefined' && window.__R3F_ROOTS) {
      // Try to get the clock from the first root (Canvas)
      const roots = window.__R3F_ROOTS;
      const root = Object.values(roots)[0];
      if (root && root.store && root.store.getState) {
        return root.store.getState().clock.getElapsedTime() * TIME_SCALE;
      }
    }
    return 0;
  };
  const elapsed = getElapsedSimSeconds();
  // Sun's longitude (radians): 0 at midnight, increases with Earth's rotation
  const sunLongitude = (elapsed * (2 * Math.PI) / 86400) % (2 * Math.PI);
  // LST to longitude: LST (in hours) -> angle (radians)
  const lstAngle = ((lst / 24) * 2 * Math.PI) % (2 * Math.PI);
  // RAAN: for sun-sync, set so that the descending node is at the longitude where the sun is at LST
  const raanRad = sunSynchronous ? (sunLongitude - lstAngle + Math.PI / 2) : 0;

  // Compose the orbit plane rotation: RAAN (Y), inclination (X)
  return (
    <group rotation={[0, raanRad, 0]}>
      <group rotation={[inclinationRad, 0, 0]}>
        <group ref={groupRef}>
          {/* Main beacon */}
          <Sphere args={[size, 16, 16]}>
            <meshBasicMaterial color={beaconColor} />
          </Sphere>
          {/* Forward beam (tangent direction) */}
          <mesh position={[0, 0, -size * 2]} rotation={[1.5, 0, 0]}>
            <coneGeometry args={[size * 2, size * 2, 24]} />
            <meshBasicMaterial color={beaconColor} transparent opacity={0.5} />
          </mesh>
          {/* Backward beam (opposite tangent) */}
          <mesh position={[0, 0, size * 2]} rotation={[-1.5, 0, 0]}>
            <coneGeometry args={[size * 2, size * 2, 24]} />
            <meshBasicMaterial color={beaconColor} transparent opacity={0.5} />
          </mesh>
        </group>
      </group>
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
    EPOCH: string;
  };
}

function Satellite({ data }: SatelliteProps) {
  const satelliteRef = useRef<THREE.Group>(null!);
  const time = useRef(0);
  const [hovered, setHovered] = useState(false);

  // Orbital parameters
  const altitude = data.altitude;
  const orbitRadius = (EARTH_RADIUS + altitude)  / SCALE;
  // Use period (hours) to set speed
  const periodSeconds = data.period * 3600; // convert hours to seconds
  const speed = (2 * Math.PI) / (periodSeconds / TIME_SCALE); // radians per second
  const inclinationRad = (data.INCLINATION * Math.PI) / 180;
  const raanRad = (data.RA_OF_ASC_NODE * Math.PI) / 180;
  const argPericenterRad = (data.ARG_OF_PERICENTER * Math.PI) / 180;
  const meanAnomalyRad = (data.MEAN_ANOMALY * Math.PI) / 180;

  // Calculate phase offset from epoch
  const now = new Date();
  const epochDate = new Date(data.EPOCH);
  const timeSinceEpoch = (now.getTime() - epochDate.getTime()) / 1000; // seconds
  const phaseOffset = (timeSinceEpoch / periodSeconds) * 2 * Math.PI;

  useFrame((state, delta) => {
    if (satelliteRef.current) {
      time.current += speed * delta;
      // Satellite position in its local orbit plane (XZ)
      const phase = time.current + meanAnomalyRad + phaseOffset;
      const x = Math.cos(phase) * orbitRadius;
      const z = Math.sin(phase) * orbitRadius;
      satelliteRef.current.position.set(x, 0, z);
      // Always point the cone toward the Earth's center
      satelliteRef.current.lookAt(0, 0, 0);
    }
  });

  // Compose the orbit plane rotation: RAAN (Y), inclination (X), argument of pericenter (Y)
  const orbitMatrix = new THREE.Matrix4();
  orbitMatrix.makeRotationY(raanRad)
    .multiply(new THREE.Matrix4().makeRotationX(inclinationRad))
    .multiply(new THREE.Matrix4().makeRotationY(argPericenterRad));
  const euler = new THREE.Euler().setFromRotationMatrix(orbitMatrix);

  // Pointer event handlers
  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
  };
  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
  };

  return (
    <group rotation={[euler.x, euler.y, euler.z]}>
      <group ref={satelliteRef}>
        {/* Satellite body */}
        <Sphere args={[SATELLITE_SIZE/SCALE, 16, 16]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <meshBasicMaterial color="cyan" />
        </Sphere>
        {/* Show label if hovered */}
        {hovered && (
          <Html center style={{ pointerEvents: 'none', color: 'white', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '14px' }}>
            {data.OBJECT_NAME}
          </Html>
        )}
        {/* Coverage area visualization */}
        <mesh position={[0, 0, 0.625]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* <coneGeometry args={[COVERAGE_RADIUS/SCALE, -(COVERAGE_RADIUS/(2*Math.tan(COVERAGE_ANGLE/2)))/SCALE, 32]} /> */}
          <coneGeometry args={[CONE_RADIUS/SCALE, (altitude+CONE_HEIGHT_FACTOR)/SCALE, 32]} />
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

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 16, 128]} />
      <meshBasicMaterial color="red" />
    </mesh>
  );
}

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useLoader(THREE.TextureLoader, earthTexture);

  // Earth rotates 360° in 86400 seconds (24 hours)
  const earthRotationSpeed = (2 * Math.PI) / 86400 * TIME_SCALE; // radians per second

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += earthRotationSpeed * delta;
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

function Sun() {
  const sunRef = useRef<THREE.DirectionalLight>(null!);
  
  // The Sun is fixed in space, tilted at 23.5 degrees (Earth's axial tilt)
  const sunOrbitRadius = 30; // Distance from Earth center in scene units
  const axialTilt = (23.5 * Math.PI) / 180; // Convert 23.5 degrees to radians

  return (
    <group rotation={[axialTilt, 0, 0]}>
      <directionalLight
        ref={sunRef}
        position={[0, 0, sunOrbitRadius]}
        intensity={8}
        color="#ffffff"
        castShadow
      />
    </group>
  );
}

export default function Earth() {
  // Use a typical altitude for the ring, or the first satellite's altitude if available
  const ringAltitude = satelliteData[0]?.altitude || 780;
  const ringRadius = (EARTH_RADIUS + ringAltitude) / SCALE;

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
        {/* Red static ring for satellite orbit */}
        <OrbitRing radius={ringRadius} />
        {/* Enhanced lighting for better texture visibility */}
        <ambientLight intensity={1.0} color="#1a1a2e" />
        <pointLight position={[10, 10, 10]} intensity={5.0} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={4.0} color="#ffffff" />
        <pointLight position={[0, 10, 0]} intensity={5.0} color="#ffffff" />
        {/* Dynamic Sun for day/night */}
        <Sun />
        
        <Globe />
        {/* Beacons */}
        {/* <Beacon 
          altitude={600}
          color="red" 
          size={SATELLITE_SIZE/SCALE} 
          inclination={64}
          sunSynchronous={false}
        /> */}
        <Beacon 
          altitude={10}
          color="green" 
          size={SATELLITE_SIZE/SCALE} 
          sunSynchronous={true}
          lst={12.0} // 10:00am
        />
        {/* <Beacon 
          altitude={600}
          color="blue" 
          size={SATELLITE_SIZE/SCALE} 
          sunSynchronous={true}
          lst={9.0} // 9:00am
        /> */}
        {/* Satellites from data */}
        {satelliteData.map((satellite, idx) => (
          <Satellite 
            key={satellite.NORAD_CAT_ID} 
            data={satellite}
          />
        ))}
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
} 