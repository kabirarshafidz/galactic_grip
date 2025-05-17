# Galactic Grip

A 3D space visualization application built with Next.js, React Three Fiber, and Three.js. This application allows you to explore and interact with satellite data in a 3D environment.

![Main Application View](/public/images/main-view.png)
*Main 3D visualization showing Earth, satellites, and beacons in orbit*

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/kabirarshafidz/galactic_grip.git
cd galactic-grip
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode
To run the application in development mode with hot-reloading:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`

### Production Build
To create a production build:
```bash
npm run build
npm start
```

## Demo Tutorial

### Key Features

1. **3D Space Visualization**
   - Interactive 3D Earth with satellite orbits
   - Real-time visualization of satellite coverage areas
   - Dynamic lighting with ambient and point lights
   ![3D Visualization](/public/images/3d-visualization.jpeg)
   *Screenshot showing the 3D Earth with satellite orbits and coverage cones*

2. **Beacon Management**
   - Add up to 3 custom beacons
   - Configure orbit type (Sun-synchronous or non-polar)
   - Set altitude (120-700 km)
   - Adjust local solar time (for sun-synchronous) or inclination (for non-polar)
   ![Beacon Configuration](/public/images/beacon-config-1.jpeg)
   ![Beacon Configuration](/public/images/beacon-config-2.jpeg)
   *Screenshot of the beacon configuration panel showing orbit settings*

3. **Satellite Tracking**
   - Real-time tracking of satellite positions
   - Visual representation of satellite coverage areas
   - Handshake detection between beacons and satellites
   ![Satellite Tracking](/public/images/satellite-tracking.jpeg)
   *Screenshot showing satellite positions and coverage areas*

4. **Simulation Controls**
   - Start, pause, and reset simulation
   - Adjustable time scale (1 second to 3 hours per real second)
   - Timeline control for precise time navigation
   ![Simulation Controls](/public/images/simulation-controls.jpeg)
   *Screenshot of the simulation control panel with timeline and time scale*

5. **Statistics and Analytics**
   - Real-time handshake statistics
   - Coverage time analysis
   - Per-satellite and per-beacon metrics
   ![Statistics Panel](/public/images/stats-panel.jpeg)
   *Screenshot showing the statistics panel with handshake data*

### Basic Navigation
1. **Camera Controls**
   - Left-click and drag to rotate the view
   - Scroll to zoom in/out

2. **Satellite Visualization**
   - Satellites are represented as 3D objects in space
   - Hover over satellites to see satellite's name

3. **Interactive Features**
   - Toggle between free view and beacon-following mode
   - Lock camera to follow a specific beacon's orbit
   - View real-time handshake connections between beacons and satellites
   ![View Controls](/public/images/view-controls-1.jpeg)
   ![View Controls](/public/images/view-controls-2.jpeg)
   *Screenshot showing the view lock toggle and beacon following mode*

### Tips
- Use the view lock feature to follow a specific beacon's orbit
- Monitor the handshake panel to see active satellite connections
- Use the timeline controls to view satellite positions at different times

## Technologies Used
- Next.js 15.3.2
- React 19
- Three.js
- React Three Fiber
- TailwindCSS

## Contributing
Feel free to submit issues and enhancement requests!

## License
[Your License Here]
