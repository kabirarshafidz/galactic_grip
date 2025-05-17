'use client';
import React, { useState, useEffect } from 'react';

export default function HandshakeStatsPanel({
  simulationTime,
  isRunning,
  onStart,
  onCancel,
  timeScale,
  stats,
  coveringIridiums = []
}: {
  simulationTime: number;
  isRunning: boolean;
  onStart: () => void;
  onCancel: () => void;
  timeScale: number;
  stats: any;
  coveringIridiums?: string[];
}) {
  // Calculate progress (0 to 1)
  const progress = Math.min(simulationTime / 86400, 1); // 86400 seconds in 24h
  // Format time as HH:MM:SS
  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const isFinished = !isRunning && simulationTime >= 86400;
  return (
    <>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(30,144,255,0.15)',
        color: '#1e90ff',
        padding: '10px 18px',
        borderRadius: '8px',
        minWidth: '220px',
        zIndex: 1100,
        fontFamily: 'monospace',
        fontSize: '15px',
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        Currently handshaking with:<br />
        <span style={{color: '#fff'}}>{coveringIridiums.length > 0 ? coveringIridiums.join(', ') : 'None'}</span>
      </div>
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        minWidth: '340px',
        zIndex: 1000,
        fontFamily: 'monospace',
        fontSize: '14px',
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={onStart} disabled={isRunning} style={{ padding: '6px 16px', fontWeight: 'bold', fontSize: '15px', borderRadius: 4, border: 'none', background: isRunning ? '#444' : '#1e90ff', color: 'white', cursor: isRunning ? 'not-allowed' : 'pointer'}}>Start Simulation</button>
          <button onClick={onCancel} disabled={!isRunning} style={{ padding: '6px 16px', fontWeight: 'bold', fontSize: '15px', borderRadius: 4, border: 'none', background: !isRunning ? '#444' : '#ff4d4f', color: 'white', cursor: !isRunning ? 'not-allowed' : 'pointer'}}>Cancel Simulation</button>
        </div>
        <div style={{marginBottom: 8}}>
          <div>Time: {formatTime(simulationTime)} / 24:00:00</div>
          <div style={{background: '#333', borderRadius: 4, height: 12, width: '100%', marginTop: 2, marginBottom: 2}}>
            <div style={{background: '#1e90ff', height: '100%', borderRadius: 4, width: `${progress * 100}%`, transition: 'width 0.2s'}} />
          </div>
          <div style={{fontSize: '12px', color: '#aaa'}}>Time scale: {timeScale}x</div>
        </div>
        <h3>Space Handshakes Stats</h3>
        <div>Total handshakes: {stats.totalHandshakes}</div>
        <div>Total out-of-coverage time: {stats.totalOutOfCoverageTime.toFixed(2)} s</div>
        <div>Average out-of-coverage time: {stats.avgOutOfCoverageTime.toFixed(2)} s</div>
        <hr style={{margin: '8px 0'}} />
        <div style={{maxHeight: '200px', overflowY: 'auto'}}>
          <table style={{width: '100%', color: 'white'}}>
            <thead>
              <tr>
                <th>Satellite</th>
                <th>Handshakes</th>
                <th>Total Time (s)</th>
              </tr>
            </thead>
            <tbody>
              {stats.perSatellite.map((sat: any) => (
                <tr key={sat.id}>
                  <td>{sat.id}</td>
                  <td>{sat.count}</td>
                  <td>{sat.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isFinished && (
          <div style={{marginTop: 16, padding: 12, background: '#222', borderRadius: 8, border: '1px solid #444'}}>
            <h4>Simulation Complete!</h4>
            <div><b>Total handshakes:</b> {stats.totalHandshakes}</div>
            <div><b>Total out-of-coverage time:</b> {stats.totalOutOfCoverageTime.toFixed(2)} s</div>
            <div><b>Average out-of-coverage time:</b> {stats.avgOutOfCoverageTime.toFixed(2)} s</div>
          </div>
        )}
      </div>
    </>
  );
} 