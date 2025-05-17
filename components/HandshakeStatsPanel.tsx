'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function HandshakeStatsPanel({
  simulationTime,
  isRunning,
  isPaused,
  onStart,
  onPause,
  onReset,
  timeScale,
  stats,
  coveringIridiumsByBeacon = {},
  onHandshakePanelHeightChange,
  onTimeChange,
  onTimeScaleChange,
  selectedBeaconId,
  isViewLocked,
  onViewLockChange,
}: {
  simulationTime: number;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  timeScale: number;
  stats: any;
  coveringIridiumsByBeacon?: { [beaconId: string]: string[] };
  onHandshakePanelHeightChange?: (height: number) => void;
  onTimeChange?: (time: number) => void;
  onTimeScaleChange?: (timeScale: number) => void;
  selectedBeaconId?: string;
  isViewLocked?: boolean;
  onViewLockChange?: (locked: boolean) => void;
}) {
  const handshakePanelRef = useRef<HTMLDivElement>(null);
  const statsPanelRef = useRef<HTMLDivElement>(null);
  const [statsPanelHeight, setStatsPanelHeight] = useState(0);

  useEffect(() => {
    if (statsPanelRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          setStatsPanelHeight(entry.contentRect.height);
        }
      });
      
      resizeObserver.observe(statsPanelRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    if (handshakePanelRef.current && onHandshakePanelHeightChange) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          onHandshakePanelHeightChange(entry.contentRect.height);
        }
      });
      
      resizeObserver.observe(handshakePanelRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [onHandshakePanelHeightChange]);

  // Calculate progress (0 to 1)
  const progress = Math.min(simulationTime / 86400, 1); // 86400 seconds in 24h
  // Format time as HH:MM:SS
  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Use per-beacon stats for the selected beacon
  const selectedBeaconStats = selectedBeaconId
    ? stats.perBeacon?.find((b: any) => b.beaconId === selectedBeaconId)
    : (stats.perBeacon && stats.perBeacon.length > 0 ? stats.perBeacon[0] : undefined);

  const totalHandshakesForBeacon = selectedBeaconStats?.handshakeCount ?? 0;
  const totalInCoverageTime = selectedBeaconStats?.totalInCoverageTime ?? 0;
  const totalOutOfCoverageTime = selectedBeaconStats?.totalOutOfCoverageTime ?? 0;
  const avgInCoverageTime = selectedBeaconStats?.avgInCoverageTime ?? 0;
  const avgOutOfCoverageTime = selectedBeaconStats?.avgOutOfCoverageTime ?? 0;

  // For the table: filter per-satellite stats for the selected beacon
  const selectedBeaconSatelliteStats = stats.perSatellite
    ? stats.perSatellite.filter((sat: any) => sat.beaconId === selectedBeaconId)
    : [];

  // For the handshaking panel, use the satellites for the selected beacon
  const currentCoveringIridiums = selectedBeaconId ? (coveringIridiumsByBeacon[selectedBeaconId] || []) : [];

  return (
    <>
      <div ref={statsPanelRef} style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        color: 'white',
        padding: '16px',
        borderRadius: '12px',
        width: '360px',
        zIndex: 1000,
        fontFamily: 'var(--font-geist-sans)',
        fontSize: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Control Buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={onStart}
            disabled={isRunning && !isPaused}
            style={{
              padding: '6px 12px',
              fontWeight: '600',
              fontSize: '13px',
              borderRadius: 6,
              border: 'none',
              background: isRunning && !isPaused ? 'rgba(68,68,68,0.8)' : 'rgba(30,144,255,0.9)',
              color: 'white',
              cursor: isRunning && !isPaused ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {isPaused ? 'Continue' : 'Start'}
          </button>
          <button
            onClick={onPause}
            disabled={!isRunning || isPaused}
            style={{
              padding: '6px 12px',
              fontWeight: '600',
              fontSize: '13px',
              borderRadius: 6,
              border: 'none',
              background: (!isRunning || isPaused) ? 'rgba(68,68,68,0.8)' : 'rgba(255,179,0,0.9)',
              color: 'white',
              cursor: (!isRunning || isPaused) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Pause
          </button>
          <button
            onClick={onReset}
            style={{
              padding: '6px 12px',
              fontWeight: '600',
              fontSize: '13px',
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255,77,79,0.9)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Reset
          </button>
        </div>

        {/* View Lock Toggle */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '8px', 
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.2s ease',
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
            userSelect: 'none',
            width: '100%',
            justifyContent: 'center'
          }}>
            <input
              type="checkbox"
              checked={isViewLocked}
              onChange={(e) => onViewLockChange?.(e.target.checked)}
              style={{ 
                cursor: 'pointer',
                width: '14px',
                height: '14px',
                margin: 0,
                accentColor: '#1e90ff'
              }}
            />
            <span style={{ 
              color: '#1e90ff', 
              fontWeight: '600',
              fontSize: '13px',
              letterSpacing: '0.5px'
            }}>
              {isViewLocked ? '🔒 Locked to Beacon' : '🔓 Free View'}
            </span>
          </label>
        </div>

        {/* Time Controls */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '12px'
        }}>
          <div style={{ 
            color: '#aaa',
            fontSize: '12px',
            marginBottom: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Simulation Time</span>
            <span style={{ color: '#fff' }}>{formatTime(simulationTime)} / 24:00:00</span>
          </div>
          <input
            type="range"
            min="0"
            max="86400"
            value={simulationTime}
            onChange={(e) => onTimeChange?.(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.1)',
              height: '4px',
              borderRadius: '2px',
              outline: 'none',
              WebkitAppearance: 'none',
              marginBottom: '12px',
            }}
          />
          <div style={{ 
            color: '#aaa',
            fontSize: '12px',
            marginBottom: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Time Scale</span>
            <span style={{ color: '#fff' }}>
              {timeScale >= 3600 
                ? `${(timeScale / 3600).toFixed(1)} hours/s`
                : timeScale >= 60 
                  ? `${(timeScale / 60).toFixed(1)} mins/s`
                  : `${timeScale.toFixed(1)} secs/s`}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10800"
            value={timeScale}
            onChange={(e) => onTimeScaleChange?.(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.1)',
              height: '4px',
              borderRadius: '2px',
              outline: 'none',
              WebkitAppearance: 'none',
            }}
          />
        </div>

        {/* Stats Section */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '12px'
        }}>
          <h3 style={{ 
            color: '#1e90ff', 
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '600',
            letterSpacing: '0.5px'
          }}>
            {selectedBeaconId ? `Beacon ${selectedBeaconId} Stats` : 'All Beacons Stats'}
          </h3>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            marginBottom: '8px'
          }}>
            <div style={{ color: '#ddd', fontSize: '12px' }}>Total handshakes</div>
            <div style={{ color: '#fff', fontSize: '12px', textAlign: 'right' }}>{totalHandshakesForBeacon}</div>
            <div style={{ color: '#ddd', fontSize: '12px' }}>Out-of-coverage time</div>
            <div style={{ color: '#fff', fontSize: '12px', textAlign: 'right' }}>{totalOutOfCoverageTime.toFixed(2)}s</div>
            <div style={{ color: '#ddd', fontSize: '12px' }}>Avg out-of-coverage</div>
            <div style={{ color: '#fff', fontSize: '12px', textAlign: 'right' }}>{avgOutOfCoverageTime.toFixed(2)}s</div>
            <div style={{ color: '#ddd', fontSize: '12px' }}>In-coverage time</div>
            <div style={{ color: '#fff', fontSize: '12px', textAlign: 'right' }}>{totalInCoverageTime.toFixed(2)}s</div>
            <div style={{ color: '#ddd', fontSize: '12px' }}>Avg in-coverage</div>
            <div style={{ color: '#fff', fontSize: '12px', textAlign: 'right' }}>{avgInCoverageTime.toFixed(2)}s</div>
          </div>
        </div>

        {/* Satellite Table */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '12px',
          borderRadius: '6px',
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          <table style={{
            width: '100%',
            color: '#ddd',
            borderCollapse: 'collapse',
            fontSize: '12px'
          }}>
            <thead>
              <tr>
                <th style={{ 
                  textAlign: 'left', 
                  color: '#aaa',
                  padding: '0 0 6px 0',
                  fontWeight: '500',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>Satellite</th>
                <th style={{ 
                  textAlign: 'right', 
                  color: '#aaa',
                  padding: '0 0 6px 0',
                  fontWeight: '500',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>Handshakes</th>
                <th style={{ 
                  textAlign: 'right', 
                  color: '#aaa',
                  padding: '0 0 6px 0',
                  fontWeight: '500',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>Total Time</th>
              </tr>
            </thead>
            <tbody>
              {selectedBeaconSatelliteStats && selectedBeaconSatelliteStats.map((sat: any) => (
                <tr key={`${sat.beaconId}-${sat.satId}`}>
                  <td style={{ padding: '2px 0' }}>{sat.satId}</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>{sat.count}</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>{sat.total.toFixed(2)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Handshaking Panel - Now integrated into stats panel */}
        <div style={{
          background: 'rgba(30,144,255,0.15)',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid rgba(30,144,255,0.2)',
        }}>
          <div style={{ marginBottom: '6px', color: '#1e90ff', fontWeight: '600' }}>
            {selectedBeaconId ? `Beacon ${selectedBeaconId} handshaking with:` : 'Currently handshaking with:'}
          </div>
          <div style={{ color: '#fff' }}>
            {currentCoveringIridiums.length > 0 ? (
              <ul style={{ 
                paddingLeft: '16px', 
                margin: 0,
                listStyleType: 'none'
              }}>
                {currentCoveringIridiums.map((id: string) => (
                  <li key={id} style={{ 
                    color: '#fff', 
                    fontWeight: 'normal', 
                    fontSize: '12px', 
                    margin: '2px 0',
                    padding: 0,
                    opacity: 0.9
                  }}>
                    {id}
                  </li>
                ))}
              </ul>
            ) : (
              <span style={{ opacity: 0.7 }}>None</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 