'use client'
import Earth from "@/components/Earth";
import React, { useState, useRef, useEffect } from "react";
import HandshakeStatsPanel from "@/components/HandshakeStatsPanel";

// How many seconds of simulation time pass per real second
const DEFAULT_TIME_SCALE = 1440; // 24 hours (86400s) / 1 minute (60s) = 1440 seconds per second
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
  const [timeScale, setTimeScale] = useState(DEFAULT_TIME_SCALE);
  const [stats, setStats] = useState(initialStats);
  const [coveringIridiums, setCoveringIridiums] = useState<string[]>([]);
  const lastUpdateTime = useRef<number>(0);

  const handleStart = () => {
    setSimulationTime(0);
    setStats(initialStats);
    setIsRunning(true);
    lastUpdateTime.current = Date.now();
  };

  const handleCancel = () => {
    setIsRunning(false);
  };

  useEffect(() => {
    if (!isRunning) return;

    const updateSimulation = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTime.current) / 1000; // Convert to seconds
      lastUpdateTime.current = now;

      setSimulationTime(prev => {
        const newTime = prev + (deltaTime * timeScale);
        if (newTime >= SIM_DURATION) {
          setIsRunning(false);
          return SIM_DURATION;
        }
        return newTime;
      });

      if (isRunning) {
        requestAnimationFrame(updateSimulation);
      }
    };

    requestAnimationFrame(updateSimulation);

    return () => {
      setIsRunning(false);
    };
  }, [isRunning, timeScale]);

  return (
    <main className="w-full h-screen">
      <Earth simulationTime={simulationTime} timeScale={timeScale} isRunning={isRunning} stats={stats} setStats={setStats} coveringIridiums={coveringIridiums} setCoveringIridiums={setCoveringIridiums} />
      <HandshakeStatsPanel simulationTime={simulationTime} isRunning={isRunning} onStart={handleStart} onCancel={handleCancel} timeScale={timeScale} stats={stats} coveringIridiums={coveringIridiums} />
    </main>
  );
}
