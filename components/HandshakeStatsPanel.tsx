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
  coveringIridiums = [],
  onHandshakePanelHeightChange,
  onTimeChange,
}: {
  simulationTime: number;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  timeScale: number;
  stats: any;
  coveringIridiums?: string[];
  onHandshakePanelHeightChange?: (height: number) => void;
  onTimeChange?: (time: number) => void;
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

  return (
    <>
      <div ref={statsPanelRef} style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        width: '360px',
        zIndex: 1000,
        fontFamily: 'monospace',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={onStart}
            disabled={isRunning && !isPaused}
            style={{
              padding: '6px 16px',
              fontWeight: 'bold',
              fontSize: '15px',
              borderRadius: 4,
              border: 'none',
              background: isRunning && !isPaused ? 'rgba(68,68,68,0.8)' : 'rgba(30,144,255,0.8)',
              color: 'white',
              cursor: isRunning && !isPaused ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {isPaused ? 'Continue' : 'Start'}
          </button>
          <button
            onClick={onPause}
            disabled={!isRunning || isPaused}
            style={{
              padding: '6px 16px',
              fontWeight: 'bold',
              fontSize: '15px',
              borderRadius: 4,
              border: 'none',
              background: (!isRunning || isPaused) ? 'rgba(68,68,68,0.8)' : 'rgba(255,179,0,0.8)',
              color: 'white',
              cursor: (!isRunning || isPaused) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            Pause
          </button>
          <button
            onClick={onReset}
            style={{
              padding: '6px 16px',
              fontWeight: 'bold',
              fontSize: '15px',
              borderRadius: 4,
              border: 'none',
              background: 'rgba(255,77,79,0.8)',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            Reset
          </button>
        </div>
        <div style={{marginBottom: 8}}>
          <div style={{ color: '#aaa' }}>Time: {formatTime(simulationTime)} / 24:00:00</div>
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
              marginTop: 8,
            }}
          />
          <div style={{fontSize: '12px', color: '#aaa'}}>Time scale: {timeScale}x</div>
        </div>
        <h3 style={{ color: '#1e90ff', margin: '0 0 12px 0' }}>Space Handshakes Stats</h3>
        <div style={{ color: '#ddd' }}>Total handshakes: {stats.totalHandshakes}</div>
        <div style={{ color: '#ddd' }}>Total out-of-coverage time: {stats.totalOutOfCoverageTime.toFixed(2)} s</div>
        <div style={{ color: '#ddd' }}>Average out-of-coverage time: {stats.avgOutOfCoverageTime.toFixed(2)} s</div>
        <div style={{ color: '#ddd' }}>Total in-coverage time: {stats.totalInCoverageTime?.toFixed(2) ?? '0.00'} s</div>
        <div style={{ color: '#ddd' }}>Average in-coverage time: {stats.avgInCoverageTime?.toFixed(2) ?? '0.00'} s</div>
        <hr style={{margin: '8px 0', borderColor: 'rgba(255,255,255,0.1)'}} />
        <div style={{maxHeight: '200px', overflowY: 'auto'}}>
          <table style={{width: '100%', color: '#ddd'}}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: '#aaa' }}>Satellite</th>
                <th style={{ textAlign: 'right', color: '#aaa' }}>Handshakes</th>
                <th style={{ textAlign: 'right', color: '#aaa' }}>Total Time (s)</th>
              </tr>
            </thead>
            <tbody>
              {stats.perSatellite.map((sat: any) => (
                <tr key={sat.id}>
                  <td>{sat.id}</td>
                  <td style={{ textAlign: 'right' }}>{sat.count}</td>
                  <td style={{ textAlign: 'right' }}>{sat.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={handshakePanelRef} style={{
        position: 'absolute',
        top: 20 + statsPanelHeight + 40, // Increased gap to 40px
        right: 20,
        background: 'rgba(30,144,255,0.15)',
        backdropFilter: 'blur(8px)',
        color: '#1e90ff',
        padding: '10px 18px',
        borderRadius: '8px',
        width: '240px',
        minHeight: '60px',
        zIndex: 1100,
        fontFamily: 'monospace',
        fontSize: '15px',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        border: '1px solid rgba(30,144,255,0.2)',
        transform: 'translateY(0)', // Ensure no transform is affecting position
      }}>
        Currently handshaking with:<br />
        <div style={{ color: '#fff', marginTop: 4 }}>
          {coveringIridiums.length > 0 ? (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {coveringIridiums.map((id) => (
                <li key={id} style={{ color: '#fff', fontWeight: 'normal', fontSize: 15, margin: 0, padding: 0 }}>{id}</li>
              ))}
            </ul>
          ) : (
            <span>None</span>
          )}
        </div>
      </div>
    </>
  );
} 