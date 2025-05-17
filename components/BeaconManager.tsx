'use client';
import React, { useState, useRef } from 'react';
import OrbitConfigPanel from './OrbitConfigPanel';

interface Beacon {
  id: string;
  isSunSync: boolean;
  altitude: number;
  lst?: number;
  inclination?: number;
  color: string;
}

interface BeaconManagerProps {
  onConfigChange: (configs: Array<{
    id: string;
    isSunSync: boolean;
    altitude: number;
    lst?: number;
    inclination?: number;
    timeScale?: number;
    color: string;
  }>) => void;
  isRunning: boolean;
  isPaused: boolean;
  onBeaconSelect?: (beaconId: string | undefined) => void;
}

const AVAILABLE_COLORS = [
  '#FF0000', // Red
  '#0000FF', // Blue
  '#00FF00', // Green
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFFF00', // Yellow
];

export default function BeaconManager({
  beacons,
  onConfigChange,
  isRunning,
  isPaused,
  onBeaconSelect
}: BeaconManagerProps & { beacons: Beacon[] }) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const beaconCounter = useRef(0);

  const handleTabClick = (beaconId: string) => {
    setActiveTab(beaconId);
    onBeaconSelect?.(beaconId);
  };

  const handleAddBeacon = () => {
    const newId = `beacon-${Date.now()}-${beaconCounter.current++}`;
    const newBeacon: Beacon = {
      id: newId,
      isSunSync: true,
      altitude: 500,
      lst: 12,
      inclination: 64,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
    const newBeacons = [...beacons, newBeacon];
    setActiveTab(newId);
    onBeaconSelect?.(newId);
    onConfigChange(newBeacons);
  };

  const handleRemoveBeacon = (id: string) => {
    const newBeacons = beacons.filter(b => b.id !== id);
    if (activeTab === id) {
      setActiveTab(newBeacons[0]?.id);
      onBeaconSelect?.(newBeacons[0]?.id);
    }
    onConfigChange(newBeacons);
  };

  const handleConfigChange = (id: string, config: {
    isSunSync: boolean;
    altitude: number;
    lst?: number;
    inclination?: number;
    timeScale?: number;
  }) => {
    const updatedBeacons = beacons.map(b => 
      b.id === id ? { ...b, ...config } : b
    );
    onConfigChange(updatedBeacons);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 1000,
    }}>
      {/* Add Beacon Button */}
      <button
        onClick={handleAddBeacon}
        disabled={beacons.length >= 3}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: 'none',
          background: beacons.length >= 3 ? 'rgba(68,68,68,0.8)' : 'rgba(30,144,255,0.8)',
          color: 'white',
          cursor: beacons.length >= 3 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s',
          width: '320px',
        }}
      >
        Add Beacon ({beacons.length}/3)
      </button>

      {/* Beacon Configuration Tabs */}
      {beacons.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          overflow: 'hidden',
          width: '320px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Tab Headers (vertical list) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) rgba(0,0,0,0.2)',
          }} className="custom-scrollbar">
            {beacons.map(beacon => (
              <button
                key={beacon.id}
                onClick={() => handleTabClick(beacon.id)}
                style={{
                  padding: '12px',
                  background: activeTab === beacon.id ? 'rgba(30,144,255,0.2)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: beacon.color,
                  flexShrink: 0,
                }} />
                <span>Beacon {beacon.id.split('-')[1]}</span>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBeacon(beacon.id);
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '4px',
                    marginLeft: 'auto',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  ×
                </div>
              </button>
            ))}
          </div>

          {/* Tab Content: summary and config below the tabset, full width */}
          {beacons.map(beacon => (
            <div
              key={beacon.id}
              style={{
                display: activeTab === beacon.id ? 'block' : 'none',
              }}
            >
              {/* Beacon Summary */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: beacon.color,
                  }} />
                  <h3 style={{
                    margin: 0,
                    color: '#1e90ff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}>
                    Beacon {beacon.id.split('-')[1]} Configuration
                  </h3>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '8px 16px',
                  fontSize: '13px',
                  color: '#ddd',
                }}>
                  <span style={{ color: '#aaa' }}>Orbit Type:</span>
                  <span>{beacon.isSunSync ? 'Sun-synchronous' : 'Non-polar'}</span>
                  <span style={{ color: '#aaa' }}>Altitude:</span>
                  <span>{beacon.altitude} km</span>
                  {beacon.isSunSync ? (
                    <>
                      <span style={{ color: '#aaa' }}>Local Solar Time:</span>
                      <span>{(beacon.lst ?? 12).toFixed(2)} hours</span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: '#aaa' }}>Inclination:</span>
                      <span>{(beacon.inclination ?? 64).toFixed(1)}°</span>
                    </>
                  )}
                </div>
              </div>

              <OrbitConfigPanel
                onConfigChange={(config) => handleConfigChange(beacon.id, config)}
                isRunning={isRunning}
                isPaused={isPaused}
                defaultConfig={{
                  isSunSync: beacon.isSunSync,
                  altitude: beacon.altitude,
                  lst: beacon.lst ?? 12,
                  inclination: beacon.inclination ?? 64,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 