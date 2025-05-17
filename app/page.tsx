'use client'
import Earth from "@/components/Earth";
import React, { useState, useRef, useEffect, useCallback } from "react";
import HandshakeStatsPanel from "@/components/HandshakeStatsPanel";
import BeaconManager from "@/components/BeaconManager";

// How many seconds of simulation time pass per real second
const DEFAULT_TIME_SCALE = 10800; // 3 hours per second (3 * 60 * 60)
const SIM_DURATION = 86400; // 24h in seconds

const initialStats = {
  totalHandshakes: 0,
  totalOutOfCoverageTime: 0,
  avgOutOfCoverageTime: 0,
  perSatellite: []
};

export default function Home() {
  const [simulationTime, setSimulationTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(DEFAULT_TIME_SCALE);
  const [stats, setStats] = useState(initialStats);
  const [coveringIridiums, setCoveringIridiums] = useState<string[]>([]);
  const [coveringIridiumsByBeacon, setCoveringIridiumsByBeacon] = useState<{ [beaconId: string]: string[] }>({});
  const [beaconConfigs, setBeaconConfigs] = useState<Array<{
    id: string;
    isSunSync: boolean;
    altitude: number;
    lst?: number;
    inclination?: number;
    timeScale?: number;
    color: string;
  }>>([]);
  const [selectedBeaconId, setSelectedBeaconId] = useState<string | undefined>();
  const [isViewLocked, setIsViewLocked] = useState(false);
  const lastUpdateTime = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);

  const handleStart = () => {
    if (isPaused) {
      setIsPaused(false);
      setIsRunning(true);
      lastUpdateTime.current = Date.now();
      return;
    }
    setSimulationTime(0);
    setStats(initialStats);
    setIsRunning(true);
    setIsPaused(false);
    lastUpdateTime.current = Date.now();
  };

  const handlePause = () => {
    setIsPaused(true);
    setIsRunning(false);
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    lastUpdateTime.current = Date.now();
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setSimulationTime(0);
    setStats(initialStats);
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    lastUpdateTime.current = Date.now();
  };

  const handleTimeChange = (newTime: number) => {
    setSimulationTime(Math.min(newTime, SIM_DURATION));
  };

  const handleTimeScaleChange = (newTimeScale: number) => {
    setTimeScale(newTimeScale);
  };

  // Memoized config change handler to prevent infinite update loop
  const handleBeaconConfigChange = useCallback((configs: Array<{
    id: string;
    isSunSync: boolean;
    altitude: number;
    lst?: number;
    inclination?: number;
    timeScale?: number;
    color: string;
  }>) => {
    setBeaconConfigs(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(configs)) {
        return configs;
      }
      return prev;
    });
  }, []);

  const handleBeaconSelect = (beaconId: string | undefined) => {
    setSelectedBeaconId(beaconId);
  };

  useEffect(() => {
    if (!isRunning || isPaused) return;

    const updateSimulation = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTime.current) / 1000; // Convert to seconds
      lastUpdateTime.current = now;

      setSimulationTime(prev => {
        const newTime = Math.min(prev + (deltaTime * timeScale), SIM_DURATION);
        if (newTime >= SIM_DURATION) {
          setIsRunning(false);
          setIsPaused(false);
          return SIM_DURATION;
        }
        return newTime;
      });

      if (isRunning && !isPaused) {
        animationFrameId.current = requestAnimationFrame(updateSimulation);
      }
    };

    animationFrameId.current = requestAnimationFrame(updateSimulation);

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isRunning, isPaused, timeScale]);

  return (
    <main className="w-full h-screen">
      <Earth 
        simulationTime={simulationTime} 
        timeScale={timeScale} 
        isRunning={isRunning} 
        stats={stats} 
        setStats={setStats} 
        coveringIridiums={coveringIridiums} 
        setCoveringIridiums={setCoveringIridiums}
        setCoveringIridiumsByBeacon={setCoveringIridiumsByBeacon}
        beaconConfigs={beaconConfigs}
        selectedBeaconId={selectedBeaconId}
        isViewLocked={isViewLocked}
      />
      <HandshakeStatsPanel
        simulationTime={simulationTime}
        isRunning={isRunning}
        isPaused={isPaused}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        timeScale={timeScale}
        stats={stats}
        coveringIridiumsByBeacon={coveringIridiumsByBeacon}
        onTimeChange={handleTimeChange}
        onTimeScaleChange={handleTimeScaleChange}
        selectedBeaconId={selectedBeaconId}
        isViewLocked={isViewLocked}
        onViewLockChange={setIsViewLocked}
      />
      <BeaconManager 
        beacons={beaconConfigs}
        onConfigChange={handleBeaconConfigChange}
        isRunning={isRunning}
        isPaused={isPaused}
        onBeaconSelect={handleBeaconSelect}
      />
    </main>
  );
}
