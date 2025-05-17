'use client';
import React, { useState, useEffect, useRef } from 'react';

interface OrbitConfigPanelProps {
  onConfigChange: (config: {
    isSunSync: boolean;
    altitude: number;
    lst?: number;
    inclination?: number;
    timeScale?: number;
  }) => void;
  currentTimeScale: number;
  isRunning: boolean;
  isPaused: boolean;
}

export default function OrbitConfigPanel({ 
  onConfigChange, 
  currentTimeScale,
  isRunning,
  isPaused
}: OrbitConfigPanelProps) {
  const [isSunSync, setIsSunSync] = useState(true);
  const [altitude, setAltitude] = useState(410);
  const [lst, setLst] = useState(12.0);
  const [inclination, setInclination] = useState(64.0);
  const [timeScale, setTimeScale] = useState(currentTimeScale);
  const isFirstMount = useRef(true);

  // Convert time scale to human readable format
  const formatTimeScale = (scale: number) => {
    const secondsPerSecond = scale;
    if (secondsPerSecond >= 3600) {
      return `${(secondsPerSecond / 3600).toFixed(1)} hours/s`;
    } else if (secondsPerSecond >= 60) {
      return `${(secondsPerSecond / 60).toFixed(1)} mins/s`;
    } else {
      return `${secondsPerSecond.toFixed(1)} secs/s`;
    }
  };

  // Format LST to HH:MM format
  const formatLST = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const isDisabled = isRunning || isPaused;

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    onConfigChange({
      isSunSync,
      altitude,
      ...(isSunSync ? { lst } : { inclination }),
      timeScale,
    });
  }, [isSunSync, altitude, lst, inclination, timeScale]);

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: 20,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      color: 'white',
      padding: '16px',
      borderRadius: '12px',
      width: '320px',
      zIndex: 1000,
      fontFamily: 'monospace',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ opacity: isDisabled ? 0.7 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
        <h3 style={{ 
          margin: 0, 
          color: '#1e90ff', 
          fontSize: '16px',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '8px'
        }}>
          Orbit Configuration
        </h3>

        {/* Orbit Type Selection */}
        <div style={{ display: 'flex', gap: 8, marginTop: '12px' }}>
          <button
            onClick={() => setIsSunSync(true)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 6,
              border: 'none',
              background: isSunSync ? 'rgba(30,144,255,0.8)' : 'rgba(68,68,68,0.8)',
              color: 'white',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
              fontWeight: isSunSync ? 'bold' : 'normal',
            }}
            disabled={isDisabled}
          >
            Sun-synchronous
          </button>
          <button
            onClick={() => setIsSunSync(false)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 6,
              border: 'none',
              background: !isSunSync ? 'rgba(30,144,255,0.8)' : 'rgba(68,68,68,0.8)',
              color: 'white',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
              fontWeight: !isSunSync ? 'bold' : 'normal',
            }}
            disabled={isDisabled}
          >
            Non-polar
          </button>
        </div>

        {/* Altitude Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#aaa', fontSize: '13px' }}>Altitude</span>
            <span style={{ color: '#fff', fontSize: '13px' }}>{altitude} km</span>
          </div>
          <input
            type="range"
            min="120"
            max="700"
            value={altitude}
            onChange={(e) => setAltitude(Number(e.target.value))}
            disabled={isDisabled}
            style={{ 
              width: '100%',
              background: 'rgba(255,255,255,0.1)',
              height: '4px',
              borderRadius: '2px',
              outline: 'none',
              WebkitAppearance: 'none',
              opacity: isDisabled ? 0.5 : 1,
            }}
          />
        </div>

        {/* Conditional Inputs */}
        {isSunSync ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#aaa', fontSize: '13px' }}>Local Solar Time</span>
              <span style={{ color: '#fff', fontSize: '13px' }}>{formatLST(lst)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="23.99"
              step="0.01"
              value={lst}
              onChange={(e) => setLst(Number(e.target.value))}
              disabled={isDisabled}
              style={{ 
                width: '100%',
                background: 'rgba(255,255,255,0.1)',
                height: '4px',
                borderRadius: '2px',
                outline: 'none',
                WebkitAppearance: 'none',
                opacity: isDisabled ? 0.5 : 1,
              }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#aaa', fontSize: '13px' }}>Inclination</span>
              <span style={{ color: '#fff', fontSize: '13px' }}>{inclination.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="30"
              max="98"
              step="0.1"
              value={inclination}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Math.abs(value - 97.5) < 0.1) {
                  setInclination(value < 97.5 ? 97.4 : 97.6);
                } else {
                  setInclination(value);
                }
              }}
              disabled={isDisabled}
              style={{ 
                width: '100%',
                background: 'rgba(255,255,255,0.1)',
                height: '4px',
                borderRadius: '2px',
                outline: 'none',
                WebkitAppearance: 'none',
                opacity: isDisabled ? 0.5 : 1,
              }}
            />
          </div>
        )}
      </div>

      {/* Time Scale Control - Always enabled */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px',
        marginTop: '12px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingTop: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#aaa', fontSize: '13px' }}>Time Scale</span>
          <span style={{ color: '#fff', fontSize: '13px' }}>{formatTimeScale(timeScale)}</span>
        </div>
        <input
          type="range"
          min="1"
          max="10800" // 3 hours in seconds
          value={timeScale}
          onChange={(e) => setTimeScale(Number(e.target.value))}
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
    </div>
  );
} 