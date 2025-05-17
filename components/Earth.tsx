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

// Helper to check if beacon is inside satellite's cone
function isBeaconInCone(beaconPos: THREE.Vector3, satPos: THREE.Vector3, satAltitude: number) {
  // Cone apex at satPos, axis toward Earth's center (0,0,0)
  const axis = (new THREE.Vector3(0,0,0)).clone().sub(satPos).normalize();
  const beaconVec = beaconPos.clone().sub(satPos);
  // Cone height (from satellite to tangent point on Earth, in scene units)
  const h = (satAltitude + CONE_HEIGHT_FACTOR) / SCALE;
  // Project beacon vector onto axis to get height along the cone
  const heightOnAxis = beaconVec.dot(axis);
  if (heightOnAxis < 0 || heightOnAxis > h) return false;
  // Perpendicular (radial) distance from axis
  const perpendicular = beaconVec.clone().sub(axis.clone().multiplyScalar(heightOnAxis));
  const radialDist = perpendicular.length();
  // Allowed radius at this height (cone expands linearly)
  const allowedRadius = (CONE_RADIUS / h) * heightOnAxis / SCALE; // CONE_RADIUS in km, convert to scene units
  const inside = radialDist <= allowedRadius;
  if (inside) {
    console.log(
      `Beacon is under a cone: radialDist = ${radialDist.toFixed(4)}, allowedRadius = ${allowedRadius.toFixed(4)}, heightOnAxis = ${heightOnAxis.toFixed(4)}, h = ${h.toFixed(4)}`
    );
  }
  return inside;
}

function Beacon({
  altitude,
  color, // will be ignored, dynamic color used
  size = SATELLITE_SIZE/SCALE,
  inclination = 64,
  sunSynchronous = false,
  lst = 12, // noon by default
  simulationTime = 0,
  isRunning = false,
  satelliteData,
  timeScale = 1,
  coveringIridiums = [],
}: BeaconProps & { simulationTime: number, isRunning: boolean, satelliteData: any[], timeScale: number, coveringIridiums: string[] }) {
  const groupRef = useRef<THREE.Group>(null!);
  const [beaconColor, setBeaconColor] = useState('blue');
  const raanRad = useRef(0);

  // Inclination for sun-sync orbits
  const inclinationDeg = sunSynchronous ? 97.5 : inclination;
  const inclinationRad = (inclinationDeg * Math.PI) / 180;

  // Compute orbit radius and speed based on altitude (in km)
  const orbitRadius = EARTH_RADIUS + altitude;
  const MU = 398600.4418; // Earth's standard gravitational parameter, km^3/s^2
  const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(orbitRadius, 3) / MU);
  const angularSpeed = (2 * Math.PI) / periodSeconds; // radians/sec

  // Animation uses simulationTime for perfect sync
  useFrame(() => {
    if (groupRef.current) {
      const t = angularSpeed * simulationTime;
      const x = Math.cos(t) * (orbitRadius / SCALE);
      const z = Math.sin(t) * (orbitRadius / SCALE);
      groupRef.current.position.set(x, 0, z);
      // Calculate tangent direction (derivative of the orbit)
      const tangentX = -Math.sin(t);
      const tangentZ = Math.cos(t);
      groupRef.current.rotation.y = Math.atan2(tangentX, tangentZ);
      // Set color based on coveringIridiums
      setBeaconColor(coveringIridiums.length > 0 ? 'blue' : 'red');
    }
  });

  // Compose the orbit plane rotation: RAAN (Y), inclination (X)
  return (
    <group rotation={[0, raanRad.current, 0]}>
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

function Satellite({ data, simulationTime }: SatelliteProps & { simulationTime: number }) {
  const satelliteRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  // Orbital parameters
  const altitude = data.altitude;
  const orbitRadius = (EARTH_RADIUS + altitude)  / SCALE;
  const periodSeconds = data.period * 3600; // convert hours to seconds
  const speed = (2 * Math.PI) / (periodSeconds); // radians per second
  const inclinationRad = (data.INCLINATION * Math.PI) / 180;
  const raanRad = (data.RA_OF_ASC_NODE * Math.PI) / 180;
  const argPericenterRad = (data.ARG_OF_PERICENTER * Math.PI) / 180;
  const meanAnomalyRad = (data.MEAN_ANOMALY * Math.PI) / 180;

  // Calculate phase offset from epoch
  const now = new Date();
  const epochDate = new Date(data.EPOCH);
  const timeSinceEpoch = (now.getTime() - epochDate.getTime()) / 1000;
  const phaseOffset = (timeSinceEpoch / periodSeconds) * 2 * Math.PI;

  useFrame(() => {
    if (satelliteRef.current) {
      const phase = speed * simulationTime + meanAnomalyRad + phaseOffset;
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

function Globe({ simulationTime }: { simulationTime: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useLoader(THREE.TextureLoader, earthTexture);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = (2 * Math.PI) * (simulationTime / 86400);
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

export default function Earth({ simulationTime = 0, timeScale = 48, isRunning = false, stats, setStats, coveringIridiums, setCoveringIridiums }: { simulationTime?: number, timeScale?: number, isRunning?: boolean, stats: any, setStats: any, coveringIridiums: string[], setCoveringIridiums: (ids: string[]) => void }) {
  // Use a typical altitude for the ring, or the first satellite's altitude if available
  const ringAltitude = satelliteData[0]?.altitude || 780;
  const ringRadius = (EARTH_RADIUS + ringAltitude) / SCALE;

  // Handshake tracking refs
  const handshakeRefs = useRef(satelliteData.map(sat => ({
    id: sat.OBJECT_NAME,
    isCoveredLast: false,
    lastHandshakeStart: 0,
    handshakeDurations: [] as number[],
    handshakeCount: 0,
  })));
  const lastOutOfCoverageTime = useRef<number | null>(null);
  const outOfCoverageDurations = useRef<number[]>([]);
  // Add in-coverage tracking
  const lastInCoverageTime = useRef<number | null>(null);
  const inCoverageDurations = useRef<number[]>([]);
  const isInCoverage = useRef<boolean>(false);

  useEffect(() => {
    // Reset all tracking refs/arrays when simulation starts
    if (simulationTime === 0) {
      handshakeRefs.current = satelliteData.map(sat => ({
        id: sat.OBJECT_NAME,
        isCoveredLast: false,
        lastHandshakeStart: 0,
        handshakeDurations: [] as number[],
        handshakeCount: 0,
      }));
      lastOutOfCoverageTime.current = null;
      outOfCoverageDurations.current = [];
      lastInCoverageTime.current = null;
      inCoverageDurations.current = [];
      isInCoverage.current = false;
    }
    if (!isRunning) return;

    // Calculate beacon position
    const beaconAltitude = 20; // match the Beacon's altitude prop
    const orbitRadius = EARTH_RADIUS + beaconAltitude;
    const MU = 398600.4418;
    const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(orbitRadius, 3) / MU);
    const angularSpeed = (2 * Math.PI) / periodSeconds;
    const t = angularSpeed * simulationTime;
    const x = Math.cos(t) * (orbitRadius / SCALE);
    const z = Math.sin(t) * (orbitRadius / SCALE);
    const beaconPos = new THREE.Vector3(x, 0, z);

    // Coverage check
    let coveredBy: string[] = [];
    satelliteData.forEach((sat, idx) => {
      // Satellite position at simulationTime
      const satOrbitRadius = (EARTH_RADIUS + sat.altitude) / SCALE;
      const periodSeconds = sat.period * 3600;
      const speed = (2 * Math.PI) / (periodSeconds);
      const inclinationRad = (sat.INCLINATION * Math.PI) / 180;
      const raanRad = (sat.RA_OF_ASC_NODE * Math.PI) / 180;
      const argPericenterRad = (sat.ARG_OF_PERICENTER * Math.PI) / 180;
      const meanAnomalyRad = (sat.MEAN_ANOMALY * Math.PI) / 180;
      const now = new Date();
      const epochDate = new Date(sat.EPOCH);
      const timeSinceEpoch = (now.getTime() - epochDate.getTime()) / 1000;
      const phaseOffset = (timeSinceEpoch / periodSeconds) * 2 * Math.PI;
      const phase = speed * simulationTime + meanAnomalyRad + phaseOffset;
      const sx = Math.cos(phase) * satOrbitRadius;
      const sz = Math.sin(phase) * satOrbitRadius;
      const sy = 0;
      const satPos = new THREE.Vector3(sx, sy, sz);
      const m = new THREE.Matrix4();
      m.makeRotationY(raanRad)
        .multiply(new THREE.Matrix4().makeRotationX(inclinationRad))
        .multiply(new THREE.Matrix4().makeRotationY(argPericenterRad));
      satPos.applyMatrix4(m);
      if (isBeaconInCone(beaconPos, satPos, sat.altitude)) {
        coveredBy.push(sat.OBJECT_NAME);
      }
    });
    setCoveringIridiums(coveredBy);

    // Track in/out of coverage based on whether ANY satellite is covering
    const isNowInCoverage = coveredBy.length > 0;

    // Handle the final period first if we're at the end
    if (simulationTime >= 86400 || !isRunning) {
      if (isInCoverage.current && lastInCoverageTime.current !== null) {
        const finalPeriod = simulationTime - lastInCoverageTime.current;
        inCoverageDurations.current.push(finalPeriod);
        console.log(`Final in-coverage period: ${finalPeriod.toFixed(2)}s`);
        lastInCoverageTime.current = null;
      } else if (!isInCoverage.current && lastOutOfCoverageTime.current !== null) {
        const finalPeriod = simulationTime - lastOutOfCoverageTime.current;
        outOfCoverageDurations.current.push(finalPeriod);
        console.log(`Final out-of-coverage period: ${finalPeriod.toFixed(2)}s`);
        lastOutOfCoverageTime.current = null;
      }
      isInCoverage.current = false;
    } else {
      // Normal coverage tracking
      if (isNowInCoverage && !isInCoverage.current) {
        // Just entered coverage
        if (lastOutOfCoverageTime.current !== null) {
          const outPeriod = simulationTime - lastOutOfCoverageTime.current;
          outOfCoverageDurations.current.push(outPeriod);
          console.log(`Out-of-coverage period: ${outPeriod.toFixed(2)}s`);
          lastOutOfCoverageTime.current = null;
        }
        lastInCoverageTime.current = simulationTime;
        isInCoverage.current = true;
      } else if (!isNowInCoverage && isInCoverage.current) {
        // Just left coverage
        if (lastInCoverageTime.current !== null) {
          const inPeriod = simulationTime - lastInCoverageTime.current;
          inCoverageDurations.current.push(inPeriod);
          console.log(`In-coverage period: ${inPeriod.toFixed(2)}s`);
          lastInCoverageTime.current = null;
        }
        lastOutOfCoverageTime.current = simulationTime;
        isInCoverage.current = false;
      }
    }

    // Per-satellite handshake logic
    let totalHandshakes = 0;
    handshakeRefs.current.forEach((ref, idx) => {
      const isNowCovered = coveredBy.includes(ref.id);
      if (!ref.isCoveredLast && isNowCovered) {
        // Handshake started
        ref.handshakeCount++;
        ref.lastHandshakeStart = simulationTime;
      }
      if (ref.isCoveredLast && !isNowCovered) {
        // Handshake ended
        const duration = simulationTime - ref.lastHandshakeStart;
        if (ref.lastHandshakeStart > 0) ref.handshakeDurations.push(duration);
      }
      ref.isCoveredLast = isNowCovered;
      totalHandshakes += ref.handshakeCount;
    });

    // Update stats for display
    const totalOutOfCoverageTime = outOfCoverageDurations.current.reduce((a, b) => a + b, 0);
    const avgOutOfCoverageTime = outOfCoverageDurations.current.length > 0 ? totalOutOfCoverageTime / outOfCoverageDurations.current.length : 0;
    
    // In-coverage stats
    const totalInCoverageTime = inCoverageDurations.current.reduce((a, b) => a + b, 0);
    const avgInCoverageTime = inCoverageDurations.current.length > 0 ? totalInCoverageTime / inCoverageDurations.current.length : 0;

    // Verify total coverage time equals simulation time
    const totalCoverageTime = totalInCoverageTime + totalOutOfCoverageTime;
    if (Math.abs(totalCoverageTime - 86400) > 0.01) { // Allow for small floating point errors
      console.warn(`Coverage time mismatch: ${totalCoverageTime.toFixed(2)} != 86400`);
      console.log('In-coverage periods:', inCoverageDurations.current.map(t => t.toFixed(2)));
      console.log('Out-of-coverage periods:', outOfCoverageDurations.current.map(t => t.toFixed(2)));
      console.log('Current state:', {
        isInCoverage: isInCoverage.current,
        lastInCoverageTime: lastInCoverageTime.current,
        lastOutOfCoverageTime: lastOutOfCoverageTime.current,
        simulationTime
      });
    }

    setStats({
      totalHandshakes,
      totalOutOfCoverageTime,
      avgOutOfCoverageTime,
      totalInCoverageTime,
      avgInCoverageTime,
      perSatellite: handshakeRefs.current.map(ref => ({
        id: ref.id,
        count: ref.handshakeCount,
        durations: ref.handshakeDurations,
        total: ref.handshakeDurations.reduce((a, b) => a + b, 0),
      })),
    });
  }, [simulationTime, isRunning]);

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
        <ambientLight intensity={1.0} color="#1a1a2e" />
        <pointLight position={[10, 10, 10]} intensity={5.0} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={4.0} color="#ffffff" />
        <pointLight position={[0, 10, 0]} intensity={5.0} color="#ffffff" />
        {/* Dynamic Sun for day/night */}
        <Sun />
        
        <Globe simulationTime={simulationTime} />
        {/* Beacons */}
        {/* <Beacon 
          altitude={600}
          color="red" 
          size={SATELLITE_SIZE/SCALE} 
          inclination={64}
          sunSynchronous={false}
        /> */}
        <Beacon 
          altitude={20}
          color="blue" 
          size={SATELLITE_SIZE/SCALE} 
          sunSynchronous={true}
          lst={12.0} // 10:00am
          simulationTime={simulationTime}
          isRunning={isRunning}
          satelliteData={satelliteData}
          timeScale={timeScale}
          coveringIridiums={coveringIridiums}
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
            simulationTime={simulationTime}
          />
        ))}
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
} 