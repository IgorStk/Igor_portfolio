import * as THREE from 'three';

// The idle screen also exists in WebGL so moving papers can occlude it normally.
// CSS3D supplies the interactive version only when no paper is in front.
export function createLaptopScreen() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  const background = ctx.createRadialGradient(400, 144, 0, 400, 144, 470);
  background.addColorStop(0, '#172f46');
  background.addColorStop(1, '#09131f');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 800, 480);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '30px Arial';
  ctx.fillStyle = '#e0edf9';
  ctx.fillText('digite o código do projeto', 400, 187);
  ctx.beginPath();
  ctx.roundRect(270, 235, 260, 75, 6);
  ctx.fillStyle = '#07111e';
  ctx.fill();
  ctx.strokeStyle = '#6886a3';
  ctx.stroke();
  ctx.font = '34px monospace';
  ctx.fillStyle = '#587086';
  ctx.fillText('0 0 0 0', 400, 273);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 480),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  mesh.position.set(0.214, 1.13, 0);
  mesh.rotation.y = -Math.PI / 2;
  mesh.scale.setScalar(0.00335);
  return { mesh, texture };
}
