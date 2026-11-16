import * as BABYLON from '@babylonjs/core';
import { GarageScene } from './scenes/GarageScene';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Could not find #renderCanvas element');
}

// Initialize Babylon.js 3D Engine
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
  antialias: true,
});

// Create 3D Garage Sandbox Scene
const garage = new GarageScene(engine, canvas);

// Render loop
engine.runRenderLoop(() => {
  garage.scene.render();
});

// Responsive resize
window.addEventListener('resize', () => {
  engine.resize();
});
