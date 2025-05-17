'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Stars, Html, PerspectiveCamera } from '@react-three/drei';
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
  return radialDist <= allowedRadius;
}

function Beacon({
  altitude,
  color,
  size = SATELLITE_SIZE/SCALE,
  inclination = 64,
  sunSynchronous = false,
  lst = 12,
  simulationTime = 0,
  isRunning = false,
  satelliteData,
  timeScale = 1,
  coveringIridiums = [],
  raanRad = 0,
}: BeaconProps & { simulationTime: number, isRunning: boolean, satelliteData: any[], timeScale: number, coveringIridiums: string[], raanRad: number }) {
  const groupRef = useRef<THREE.Group>(null!);

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
    }
  });

  // Compose the orbit plane rotation: RAAN (Y), inclination (X)
  return (
    <group rotation={[0, raanRad, 0]}>
      <group rotation={[inclinationRad, 0, 0]}>
        {/* Orbit Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[orbitRadius / SCALE, 0.02, 16, 128]} />
          <meshBasicMaterial color={color} transparent opacity={coveringIridiums.length > 0 ? 0.8 : 0.3} />
        </mesh>
        <group ref={groupRef}>
          {/* Main beacon */}
          <Sphere args={[size, 16, 16]}>
            <meshBasicMaterial color={color} transparent opacity={coveringIridiums.length > 0 ? 1 : 0.5} />
          </Sphere>
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

interface EarthProps {
  simulationTime?: number;
  timeScale?: number;
  isRunning?: boolean;
  stats: any;
  setStats: any;
  coveringIridiums: string[];
  setCoveringIridiums: React.Dispatch<React.SetStateAction<string[]>>;
  setCoveringIridiumsByBeacon: (obj: { [beaconId: string]: string[] }) => void;
  beaconConfigs: Array<{
    id: string;
    isSunSync: boolean;
    altitude: number;
    lst?: number;
    inclination?: number;
    color: string;
    timeScale?: number;
  }>;
  selectedBeaconId?: string;
  isViewLocked?: boolean;
}

// Compute coveringIridiums for each beacon individually
function getCoveringIridiumsByBeacon(simulationTime: number, beaconConfigs: any[], satelliteData: any[], globalTimeScale: number) {
  // Ensure simulationTime doesn't exceed 24 hours
  const clampedTime = Math.min(simulationTime, 86400);
  let perBeaconCovering: { [beaconId: string]: string[] } = {};
  beaconConfigs.forEach(beaconConfig => {
    const beaconId = beaconConfig.id;
    perBeaconCovering[beaconId] = [];
    // Calculate beacon position using global timeScale
    const beaconAltitude = beaconConfig.altitude;
    const orbitRadius = EARTH_RADIUS + beaconAltitude;
    const MU = 398600.4418;
    const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(orbitRadius, 3) / MU);
    const angularSpeed = (2 * Math.PI) / periodSeconds;
    const t = angularSpeed * clampedTime;
    const x = Math.cos(t) * (orbitRadius / SCALE);
    const z = Math.sin(t) * (orbitRadius / SCALE);
    const beaconPos = new THREE.Vector3(x, 0, z);

    satelliteData.forEach((sat) => {
      // Satellite position at simulationTime (global)
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
      const phase = speed * clampedTime + meanAnomalyRad + phaseOffset;
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
        perBeaconCovering[beaconId].push(sat.OBJECT_NAME);
      }
    });
  });
  return perBeaconCovering;
}

function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Add CameraController component
function CameraController({ 
  isViewLocked, 
  selectedBeaconId, 
  beaconConfigs, 
  simulationTime 
}: { 
  isViewLocked: boolean;
  selectedBeaconId?: string;
  beaconConfigs: Array<{
    id: string;
    isSunSync: boolean;
    altitude: number;
    lst?: number;
    inclination?: number;
    color: string;
    timeScale?: number;
  }>;
  simulationTime: number;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const controlsRef = useRef<any>(null!);
  const [cameraAltitude, setCameraAltitude] = useState(20000); // Start at 20,000 km
  const lastDistanceRef = useRef<number>(20000);

  // Function to calculate position in orbit with all orbital parameters
  const getOrbitalPosition = (altitude: number, time: number, inclination: number, isSunSync: boolean, lst?: number) => {
    const orbitRadius = (EARTH_RADIUS + altitude) / SCALE;
    const MU = 398600.4418;
    const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(orbitRadius * SCALE, 3) / MU);
    const angularSpeed = (2 * Math.PI) / periodSeconds;
    const t = angularSpeed * time;

    // Calculate RAAN based on orbit type
    let raanRad = 0;
    if (isSunSync && lst !== undefined) {
      // For sun-synchronous orbits, calculate RAAN from LST
      const lstRad = (lst * Math.PI) / 12;
      raanRad = lstRad - Math.PI / 2;
    } else {
      // For non-polar orbits, use a fixed RAAN of 0
      raanRad = 0;
    }

    // Convert inclination to radians
    const inclinationRad = (inclination * Math.PI) / 180;

    // Calculate position in orbital plane
    const x = Math.cos(t) * orbitRadius;
    const z = Math.sin(t) * orbitRadius;
    const pos = new THREE.Vector3(x, 0, z);

    // Apply orbital plane rotations
    const matrix = new THREE.Matrix4();
    matrix.makeRotationY(raanRad)
      .multiply(new THREE.Matrix4().makeRotationX(inclinationRad));
    
    pos.applyMatrix4(matrix);
    return pos;
  };

  // Update camera position to follow selected beacon
  useFrame(() => {
    if (isViewLocked && selectedBeaconId && cameraRef.current) {
      const selectedBeacon = beaconConfigs.find(b => b.id === selectedBeaconId);
      if (selectedBeacon) {
        // Get beacon's orbital parameters
        const inclination = selectedBeacon.isSunSync ? 97.5 : (selectedBeacon.inclination || 64);
        const lst = selectedBeacon.lst;

        // Calculate beacon position
        const beaconPos = getOrbitalPosition(
          selectedBeacon.altitude,
          simulationTime,
          inclination,
          selectedBeacon.isSunSync,
          lst
        );
        
        // Calculate direction from Earth's center to beacon
        const direction = beaconPos.clone().normalize();
        
        // Position camera directly above beacon at current altitude
        const cameraPos = direction.multiplyScalar(cameraAltitude / SCALE);
        
        cameraRef.current.position.copy(cameraPos);
        // Look at Earth's center
        cameraRef.current.lookAt(0, 0, 0);
      }
    }
  });

  // Handle zoom
  useEffect(() => {
    if (!controlsRef.current) return;

    const handleZoom = () => {
      if (isViewLocked) {
        const distance = cameraRef.current.position.length() * SCALE;
        // Only update if the distance has changed significantly
        if (Math.abs(distance - lastDistanceRef.current) > 100) {
          lastDistanceRef.current = distance;
          // Clamp altitude between 10,000 km and 50,000 km
          setCameraAltitude(Math.max(10000, Math.min(50000, distance)));
        }
      }
    };

    controlsRef.current.addEventListener('change', handleZoom);
    return () => {
      if (controlsRef.current) {
        controlsRef.current.removeEventListener('change', handleZoom);
      }
    };
  }, [isViewLocked]);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 25]} />
      <OrbitControls 
        ref={controlsRef}
        enablePan={false}
        minDistance={8}
        maxDistance={30}
        enabled={true}
        enableRotate={!isViewLocked}
        target={[0, 0, 0]}
        enableDamping={true}
        dampingFactor={0.05}
        zoomSpeed={1}
      />
    </>
  );
}

export default function Earth({ 
  simulationTime = 0, 
  timeScale = 48, 
  isRunning = false, 
  stats, 
  setStats, 
  coveringIridiums, 
  setCoveringIridiums,
  setCoveringIridiumsByBeacon,
  beaconConfigs,
  selectedBeaconId,
  isViewLocked = false
}: EarthProps) {
  // Use a typical altitude for the ring, or the first satellite's altitude if available
  const ringAltitude = satelliteData[0]?.altitude || 780;
  const ringRadius = (EARTH_RADIUS + ringAltitude) / SCALE;

  // Restore handshakeRefs for per-beacon, per-satellite handshake tracking
  const handshakeRefs = useRef<{ [beaconId: string]: { [satId: string]: {
    handshakeCount: number;
    handshakeDurations: number[];
    isCoveredLast: boolean;
    lastHandshakeStart: number;
  }; } }>({});

  // Add per-beacon out-of-coverage tracking
  const beaconOutCoverageRefs = useRef<{ [beaconId: string]: {
    outOfCoverageDurations: number[];
    lastOutOfCoverageTime: number | null;
    isOutOfCoverage: boolean;
  } }>({});

  // Add ref for per-beacon coverage
  const perBeaconCoveringRef = useRef<{ [beaconId: string]: string[] }>({});

  // Add ref for previous stats
  const prevStatsRef = useRef<any>(null);

  useEffect(() => {
    // Initialize handshakeRefs for all beacons and satellites
    if (simulationTime === 0) {
      handshakeRefs.current = {};
      beaconConfigs.forEach(beacon => {
        handshakeRefs.current[beacon.id] = {};
        satelliteData.forEach(sat => {
          handshakeRefs.current[beacon.id][sat.OBJECT_NAME] = {
            handshakeCount: 0,
            handshakeDurations: [],
            isCoveredLast: false,
            lastHandshakeStart: 0,
          };
        });
      });
    }

    // For each beacon, track which satellites it covers
    let perBeaconCovering: { [beaconId: string]: string[] } = getCoveringIridiumsByBeacon(simulationTime, beaconConfigs, satelliteData, timeScale);

    // Update the ref
    perBeaconCoveringRef.current = perBeaconCovering;

    // Always update coveringIridiums based on simulationTime (for handshaking panel sync)
    const allCovering = Array.from(new Set(Object.values(perBeaconCovering).flat()));
    setCoveringIridiums((prev) => {
      if (JSON.stringify(prev as string[]) !== JSON.stringify(allCovering)) {
        return allCovering;
      }
      return prev as string[];
    });
    // Update per-beacon coverage for the stats panel
    setCoveringIridiumsByBeacon(perBeaconCovering);

  }, [simulationTime, beaconConfigs, setCoveringIridiums, setCoveringIridiumsByBeacon, timeScale]);

  // Separate effect for stats updates
  useEffect(() => {
    if (!isRunning) return;

    // Initialize handshakeRefs for all beacons and satellites
    beaconConfigs.forEach(beaconConfig => {
      if (!handshakeRefs.current[beaconConfig.id]) {
        handshakeRefs.current[beaconConfig.id] = {};
        satelliteData.forEach(sat => {
          handshakeRefs.current[beaconConfig.id][sat.OBJECT_NAME] = {
            handshakeCount: 0,
            handshakeDurations: [],
            isCoveredLast: false,
            lastHandshakeStart: 0,
          };
        });
      }
    });

    // Initialize out-of-coverage refs for all beacons
    beaconConfigs.forEach(beaconConfig => {
      if (!beaconOutCoverageRefs.current[beaconConfig.id]) {
        beaconOutCoverageRefs.current[beaconConfig.id] = {
          outOfCoverageDurations: [],
          lastOutOfCoverageTime: 0,
          isOutOfCoverage: true,
        };
      }
    });

    // Per-beacon, per-satellite handshake tracking
    beaconConfigs.forEach(beaconConfig => {
      const beaconId = beaconConfig.id;
      satelliteData.forEach(sat => {
        const satId = sat.OBJECT_NAME;
        const ref = handshakeRefs.current[beaconId][satId];
        const isNowCovered = perBeaconCoveringRef.current[beaconId]?.includes(satId) || false;
        if (isNowCovered && !ref.isCoveredLast) {
          // Handshake started
          ref.handshakeCount++;
          ref.lastHandshakeStart = simulationTime;
        }
        if (!isNowCovered && ref.isCoveredLast) {
          // Handshake ended
          const duration = simulationTime - ref.lastHandshakeStart;
          if (ref.lastHandshakeStart > 0) ref.handshakeDurations.push(duration);
        }
        ref.isCoveredLast = isNowCovered;
      });
    });

    // For each beacon, check if it is covered by any satellite
    beaconConfigs.forEach(beaconConfig => {
      const beaconId = beaconConfig.id;
      const isNowCovered = perBeaconCoveringRef.current[beaconId] && perBeaconCoveringRef.current[beaconId].length > 0;
      const ref = beaconOutCoverageRefs.current[beaconId];
      if (!isNowCovered && !ref.isOutOfCoverage) {
        // Just entered out-of-coverage
        ref.lastOutOfCoverageTime = simulationTime;
        ref.isOutOfCoverage = true;
      } else if (isNowCovered && ref.isOutOfCoverage) {
        // Just left out-of-coverage
        if (ref.lastOutOfCoverageTime !== null) {
          const duration = simulationTime - ref.lastOutOfCoverageTime;
          ref.outOfCoverageDurations.push(duration);
        }
        ref.lastOutOfCoverageTime = null;
        ref.isOutOfCoverage = false;
      }
    });

    // At the end of the simulation, close any open handshakes
    if (simulationTime >= 86400 || !isRunning) {
      beaconConfigs.forEach(beaconConfig => {
        const beaconId = beaconConfig.id;
        satelliteData.forEach(sat => {
          const satId = sat.OBJECT_NAME;
          const ref = handshakeRefs.current[beaconId][satId];
          if (ref.isCoveredLast && ref.lastHandshakeStart > 0) {
            const duration = Math.min(simulationTime, 86400) - ref.lastHandshakeStart;
            ref.handshakeDurations.push(duration);
            ref.isCoveredLast = false;
            ref.lastHandshakeStart = 0;
          }
        });
      });
    }

    // At the end of the simulation, close any open out-of-coverage periods
    if (simulationTime >= 86400 || !isRunning) {
      beaconConfigs.forEach(beaconConfig => {
        const beaconId = beaconConfig.id;
        const ref = beaconOutCoverageRefs.current[beaconId];
        if (ref.isOutOfCoverage && ref.lastOutOfCoverageTime !== null) {
          const duration = Math.min(simulationTime, 86400) - ref.lastOutOfCoverageTime;
          ref.outOfCoverageDurations.push(duration);
          ref.lastOutOfCoverageTime = null;
        }
      });
    }

    // Aggregate per-beacon stats for the stats panel
    let perBeaconStats: any[] = beaconConfigs.map(beaconConfig => {
      const beaconId = beaconConfig.id;
      const beaconRefs = handshakeRefs.current[beaconId];
      let allDurations: number[] = [];
      let totalHandshakes = 0;
      Object.values(beaconRefs).forEach(ref => {
        allDurations = allDurations.concat(ref.handshakeDurations);
        totalHandshakes += ref.handshakeCount;
      });
      
      // Calculate total in-coverage time from handshake durations
      const totalInCoverageTime = allDurations.reduce((a, b) => a + b, 0);
      
      // Out-of-coverage aggregation
      const outRef = beaconOutCoverageRefs.current[beaconId];
      const totalOutOfCoverageTime = outRef.outOfCoverageDurations.reduce((a, b) => a + b, 0);
      
      // Calculate averages based on the number of periods
      const avgOutOfCoverageTime = outRef.outOfCoverageDurations.length > 0 
        ? totalOutOfCoverageTime / outRef.outOfCoverageDurations.length 
        : 0;
      const avgInCoverageTime = allDurations.length > 0 
        ? totalInCoverageTime / allDurations.length 
        : 0;

      // If total time exceeds 24 hours, scale both times proportionally
      const totalTime = totalInCoverageTime + totalOutOfCoverageTime;
      let finalInCoverageTime = totalInCoverageTime;
      let finalOutOfCoverageTime = totalOutOfCoverageTime;
      
      if (totalTime > 86400) {
        const scale = 86400 / totalTime;
        finalInCoverageTime = totalInCoverageTime * scale;
        finalOutOfCoverageTime = totalOutOfCoverageTime * scale;
      }

      return {
        beaconId,
        totalInCoverageTime: finalInCoverageTime,
        avgInCoverageTime,
        handshakeCount: totalHandshakes,
        totalOutOfCoverageTime: finalOutOfCoverageTime,
        avgOutOfCoverageTime,
      };
    });

    // Aggregate per-satellite stats for the stats table
    let perSatellite: any[] = [];
    beaconConfigs.forEach(beaconConfig => {
      const beaconId = beaconConfig.id;
      satelliteData.forEach(sat => {
        const satId = sat.OBJECT_NAME;
        const ref = handshakeRefs.current[beaconId][satId];
        const totalHandshakeTime = ref.handshakeDurations.reduce((a, b) => a + b, 0);
        perSatellite.push({
          beaconId,
          satId,
          count: ref.handshakeCount,
          total: totalHandshakeTime,
        });
      });
    });

    // Update stats for display
    const newStats = {
      perBeacon: perBeaconStats,
      perSatellite,
    };
    if (!deepEqual(newStats, prevStatsRef.current)) {
      prevStatsRef.current = newStats;
      setStats(newStats);
    }
  }, [simulationTime, isRunning, beaconConfigs, timeScale]);

  return (
    <div className="w-full h-full">
      <Canvas 
        camera={{ position: [0, 25, 50], fov: 75 }}
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
        
        {/* Render beacons */}
        {beaconConfigs.map(config => {
          // LST/RAAN logic for sun-synchronous orbits
          let raanRad = 0;
          if (config.isSunSync && typeof config.lst === 'number') {
            // Convert LST (hours) to radians (24h = 2π)
            const lstRad = (config.lst * Math.PI) / 12;
            raanRad = lstRad - Math.PI / 2;
          }

          return (
            <Beacon 
              key={config.id}
              altitude={config.altitude}
              color={config.color}
              size={SATELLITE_SIZE/SCALE} 
              sunSynchronous={config.isSunSync}
              lst={config.lst}
              inclination={config.inclination}
              simulationTime={simulationTime}
              isRunning={isRunning}
              satelliteData={satelliteData}
              timeScale={timeScale}
              coveringIridiums={getCoveringIridiumsByBeacon(simulationTime, beaconConfigs, satelliteData, timeScale)[config.id]}
              raanRad={raanRad}
            />
          );
        })}

        {/* Satellites from data */}
        {satelliteData.map((satellite) => (
          <Satellite 
            key={satellite.OBJECT_ID}
            data={satellite}
            simulationTime={simulationTime}
          />
        ))}
        <CameraController 
          isViewLocked={isViewLocked}
          selectedBeaconId={selectedBeaconId}
          beaconConfigs={beaconConfigs}
          simulationTime={simulationTime}
        />
      </Canvas>
    </div>
  );
} 