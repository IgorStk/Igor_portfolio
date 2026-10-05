import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { contacts, documents } from './documents';
import { paperTexture } from './paper';
import { createMist } from './mist';
import { createPortal } from 'react-dom';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { LaptopTerminal } from './LaptopTerminal';
import { createLaptopScreen } from './laptopScreen';

type Phase = 'dark' | 'ready' | 'error';
type PaperBounds = { left: number; top: number; width: number; height: number };

function Scene({ onReady, onError, onSelect, selected, reading, onPresented, onInteract }: { onReady: () => void; onError: () => void; onSelect: (index: number) => void; selected: number | null; reading: boolean; onPresented: (bounds: PaperBounds) => void; onInteract: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const markers = useRef<(HTMLButtonElement | null)[]>([]);
  const laptopMarker = useRef<HTMLButtonElement>(null);
  const [terminalElement] = useState(() => document.createElement('div'));
  const [laptopOpen, setLaptopOpen] = useState(false);
  const laptopActive = useRef(false);
  const openLaptop = useCallback(() => { onInteract(); laptopActive.current = true; setLaptopOpen(true); }, [onInteract]);
  const closeLaptop = useCallback(() => { laptopActive.current = false; setLaptopOpen(false); }, []);
  const selection = useRef(selected);
  const readerVisible = useRef(reading);
  useEffect(() => { selection.current = selected; }, [selected]);
  useLayoutEffect(() => { readerVisible.current = reading; }, [reading]);
  useEffect(() => {
    const container = host.current!;
    let disposed = false;
    let frame = 0;
    const started = performance.now();
    let reveal = Infinity;
    let announced = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020408');
    scene.fog = new THREE.FogExp2('#020408', 0.065);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { onError(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    container.appendChild(renderer.domElement);
    const screenRenderer = new CSS3DRenderer();
    screenRenderer.domElement.className = 'laptop-screen-layer';
    container.appendChild(screenRenderer.domElement);
    terminalElement.className = 'laptop-screen-surface';
    const terminalObject = new CSS3DObject(terminalElement);
    terminalObject.position.set(0.215, 1.13, 0);
    terminalObject.rotation.y = -Math.PI / 2;
    terminalObject.scale.setScalar(0.00335);
    let laptopObject: THREE.Object3D | null = null;
    const laptopMeshes: THREE.Object3D[] = [];
    const terminalCenter = new THREE.Vector3();
    let laptopFocus = 0;
    // Screen-space shader: preserve the desk at the center and shade the room edges.
    const vignetteScene = new THREE.Scene();
    const vignetteCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const vignetteMaterial = new THREE.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader: 'varying vec2 vUv; void main(){vec2 p=(vUv-vec2(0.5,0.48))*vec2(1.0,1.12); float shade=smoothstep(0.20,0.70,length(p)); gl_FragColor=vec4(0.005,0.012,0.028,shade*0.78);}',
    });
    const vignette = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), vignetteMaterial);
    vignetteScene.add(vignette);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: '#25384d', roughness: 0.94 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const mist = createMist();
    scene.add(mist.group);
    const key = new THREE.SpotLight('#c0dfff', 0, 25, Math.PI / 4, 0.7, 1.5);
    // A little cold light entering through an off-camera window.
    key.position.set(-4.5, 5, -2.5);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.025;
    scene.add(key, key.target);
    const fill = new THREE.HemisphereLight('#c6dfff', '#17243b', 0);
    scene.add(fill);
    const rim = new THREE.DirectionalLight('#6d9fff', 0);
    rim.position.set(2, 3, -3);
    scene.add(rim);
    const screenGlow = new THREE.PointLight('#8abbe8', 0, 2.8, 2);
    scene.add(screenGlow);
    const flashlight = new THREE.SpotLight('#e4edff', 0, 18, 0.12, 0.85, 1.5);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(1024, 1024);
    flashlight.shadow.bias = -0.00015;
    flashlight.shadow.normalBias = 0.015;
    scene.add(flashlight, flashlight.target);
    const flashlightPointer = new THREE.Vector2();
    let pointerInside = false;
    let flashlightPower = 0;
    const textures = new Set<THREE.Texture>();
    const textureLoader = new THREE.TextureLoader();
    const laptopDir = `${import.meta.env.BASE_URL}models/laptop/`;
    const loadLaptopMap = (file: string, color: boolean) =>
      textureLoader.loadAsync(`${laptopDir}${file}`).then(texture => {
        texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.anisotropy = 8;
        if (disposed) texture.dispose(); else textures.add(texture);
        return texture;
      });

    const laptopPromise = Promise.all([
      new OBJLoader().loadAsync(`${laptopDir}Lowpoly_Notebook_2.obj`),
      loadLaptopMap('Lowpoly_Laptop_1.jpg', true),
      loadLaptopMap('Lowpoly_Laptop_Nor_1.jpg', false),
      loadLaptopMap('Lowpoly_Laptop_2.jpg', true),
      loadLaptopMap('Lowpoly_Laptop_Nor_2.jpg', false),
    ]).then(([laptop, bodyMap, bodyNormal, screenMap, screenNormal]) => {
      if (disposed) { disposeObject(laptop); return laptop; }
      const body = new THREE.MeshStandardMaterial({ map: screenMap, normalMap: screenNormal, roughness: 0.45, metalness: 0.3 });
      const screen = new THREE.MeshStandardMaterial({ map: bodyMap, normalMap: bodyNormal, roughness: 0.25 });
      laptop.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        laptopMeshes.push(child);
        const old = Array.isArray(child.material) ? child.material : [child.material];
        const pick = (m: THREE.Material) => (m.name === 'Lowpoly_Screen' ? screen : body);
        child.material = Array.isArray(child.material) ? old.map(pick) : pick(old[0]);
        old.forEach(m => m.dispose());
      });
      scene.add(laptop);
      laptopObject = laptop;
      laptop.add(terminalObject);
      const idleScreen = createLaptopScreen();
      textures.add(idleScreen.texture);
      laptop.add(idleScreen.mesh);
      return laptop;
    });
    const papers: THREE.Mesh[] = [];
    let held: THREE.Mesh | null = null;
    let lift = 0;
    let presented = false;
    let handoff = 0;
    const homePosition = new THREE.Vector3();
    const homeRotation = new THREE.Quaternion();
    const readingPosition = new THREE.Vector3();
    const readingRotation = new THREE.Quaternion();
    const faceCamera = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const portraitPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const portrait = new Image();
      portrait.onload = () => resolve(portrait);
      portrait.onerror = reject;
      portrait.src = `${import.meta.env.BASE_URL}profile.jpg`;
    });
    const texturePromise = textureLoader.loadAsync(`${import.meta.env.BASE_URL}models/table_obj/table_color.jpg`).then(texture => {
      if (disposed) texture.dispose();
      else textures.add(texture);
      return texture;
    });
    const modelPromise = new OBJLoader().loadAsync(`${import.meta.env.BASE_URL}models/table_obj/table.obj`).then(model => {
      if (disposed) disposeObject(model);
      else scene.add(model);
      return model;
    });
    Promise.all([modelPromise, texturePromise, portraitPromise, laptopPromise]).then(([model, texture, portrait, laptop]) => {
      if (disposed) return;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const wood = new THREE.MeshStandardMaterial({ map: texture, color: '#a6b6c9', roughness: 0.86 });
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          const old = Array.isArray(child.material) ? child.material : [child.material];
          old.forEach(material => material.dispose());
          child.material = wood;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      model.rotation.y = Math.PI / 2;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      model.scale.setScalar(3.8 / Math.max(size.x, size.z));
      bounds.setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -bounds.min.y + 0.01, -center.z);
      bounds.setFromObject(model);
      const tabletop = bounds.max.y;

      laptop.rotation.y = Math.PI / 2;
      const laptopBounds = new THREE.Box3().setFromObject(laptop);
      const laptopSize = laptopBounds.getSize(new THREE.Vector3());
      laptop.scale.setScalar(1.45 / Math.max(laptopSize.x, laptopSize.z));
      laptopBounds.setFromObject(laptop);
      const laptopCenter = laptopBounds.getCenter(new THREE.Vector3());
      laptop.position.set(1.04 - laptopCenter.x, tabletop + 0.04 - laptopBounds.min.y, -0.14 - laptopCenter.z);
      laptop.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(material => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.roughness = Math.max(material.roughness, 0.35);
              if (material.map) textures.add(material.map);
            }
          });
        }
      });
      const placements = [
        [-1.00, 0.37, -0.20], [-0.24, -0.25, 0.22],
        [-1.16, -0.43, 0.12], [1.02, 0.48, -0.12],
      ];
      documents.forEach((section, index) => {
        const map = paperTexture(section, index, portrait);
        map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        textures.add(map);
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.006, 0.99), [
          new THREE.MeshStandardMaterial({ color: '#c9d4df' }),
          new THREE.MeshStandardMaterial({ color: '#c9d4df' }),
          new THREE.MeshStandardMaterial({ map, roughness: 0.96 }),
          new THREE.MeshStandardMaterial({ color: '#dde5ec' }),
          new THREE.MeshStandardMaterial({ color: '#c9d4df' }),
          new THREE.MeshStandardMaterial({ color: '#c9d4df' }),
        ]);
        const [x, z, rotation] = placements[index];
        sheet.position.set(x, tabletop + 0.008 + index * 0.003, z);
        sheet.rotation.y = rotation;
        sheet.castShadow = true;
        sheet.receiveShadow = true;
        sheet.userData.index = index;
        sheet.userData.baseY = sheet.position.y;
        papers.push(sheet);
        scene.add(sheet);
      });
      reveal = Math.max(started + 1000, performance.now());
    }).catch(() => { if (!disposed) onError(); });
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const rayPointer = new THREE.Vector2();
    let hovered: THREE.Mesh | undefined;
    const hit = (event: PointerEvent | MouseEvent) => {
      const rect = container.getBoundingClientRect();
      rayPointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(rayPointer, camera);
      return raycaster.intersectObjects([...papers, ...laptopMeshes], false)[0]?.object as THREE.Mesh | undefined;
    };
    const move = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      flashlightPointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      pointerInside = true;
      pointer.set(event.clientX / innerWidth * 2 - 1, event.clientY / innerHeight * 2 - 1);
      const marker = (event.target as HTMLElement).closest<HTMLButtonElement>('.paper-marker');
      hovered = announced && !held && !laptopActive.current ? (marker ? papers[Number(marker.dataset.index)] : hit(event)) : undefined;
      container.style.cursor = hovered ? 'pointer' : 'default';
    };
    const leave = () => { pointerInside = false; hovered = undefined; pointer.set(0, 0); container.style.cursor = 'default'; };
    const select = (event: MouseEvent) => {
      if (held || selection.current !== null || laptopActive.current) return;
      if ((event.target as HTMLElement).closest('.paper-marker, .laptop-screen-surface')) return;
      const sheet = announced && hit(event);
      if (sheet && laptopMeshes.includes(sheet)) openLaptop();
      else if (sheet) onSelect(sheet.userData.index);
    };
    container.addEventListener('pointermove', move);
    container.addEventListener('pointerdown', move);
    container.addEventListener('pointerleave', leave);
    container.addEventListener('click', select);
    const resize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      screenRenderer.setSize(container.clientWidth, container.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const cameraStart = new THREE.Vector3();
    const cameraEnd = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const smoothedPointer = new THREE.Vector2();
    const markerPosition = new THREE.Vector3();
    let previousTime = performance.now();
    const animate = (now: number) => {
      if (disposed) return;
      const delta = Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      const progress = THREE.MathUtils.clamp((now - reveal) / (reduced ? 1 : 1100), 0, 1);
      const light = 1 - Math.pow(1 - progress, 3);
      mist.uniforms.uTime.value = reduced ? 0 : (now - started) / 1000;
      mist.uniforms.uLight.value = light * 0.12;
      key.intensity = light * 7;
      fill.intensity = light * 0.055;
      rim.intensity = light * 0.07;
      screenGlow.intensity = light * 1.1;
      if (progress > 0 && !announced) { announced = true; onReady(); }
      // Let the light reveal the front view before moving toward the papers.
      // The timeline starts when assets are ready, never behind the black screen.
      const travel = reduced ? 1 : THREE.MathUtils.clamp((now - reveal - 1200) / 3400, 0, 1);
      const eased = travel * travel * travel * (travel * (travel * 6 - 15) + 10);
      const framing = Math.max(1, 1 / camera.aspect);
      cameraStart.set(0, 1.25 + 1.15 * framing, 7 * framing);
      cameraEnd.set(0, 4.2 * framing, 3.7 * framing);
      smoothedPointer.lerp(pointer, 1 - Math.exp(-6 * delta));
      if (!held) {
        camera.position.lerpVectors(cameraStart, cameraEnd, eased);
        camera.position.x += reduced ? 0 : smoothedPointer.x * 0.10 * eased;
        cameraTarget.set(0, THREE.MathUtils.lerp(cameraStart.y, 1.25, eased), 0);
        camera.lookAt(cameraTarget);
      }
      laptopFocus = reduced ? Number(laptopActive.current) : THREE.MathUtils.damp(laptopFocus, Number(laptopActive.current), 5, delta);
      if (laptopObject && laptopFocus > 0.001) {
        terminalObject.getWorldPosition(terminalCenter);
        cameraEnd.copy(terminalCenter).add(new THREE.Vector3(0, 0.06, Math.max(1.5, 1.05 / camera.aspect)));
        camera.position.lerp(cameraEnd, laptopFocus);
        cameraTarget.lerp(terminalCenter, laptopFocus);
        camera.lookAt(cameraTarget);
      }
      if (laptopObject) {
        terminalObject.getWorldPosition(screenGlow.position);
        screenGlow.position.z += 0.16;
        screenGlow.position.y -= 0.12;
      }
      camera.updateMatrixWorld();
      raycaster.setFromCamera(flashlightPointer, camera);
      flashlight.position.copy(camera.position);
      raycaster.ray.at(8, flashlight.target.position);
      const torchOn = pointerInside && !held && !laptopActive.current;
      flashlightPower = THREE.MathUtils.damp(flashlightPower, torchOn ? 38 : 0, 9, delta);
      flashlight.intensity = flashlightPower * light;
      if (selection.current !== null && !held) {
        held = papers[selection.current];
        if (held) {
          homePosition.copy(held.position);
          homePosition.y = held.userData.baseY;
          homeRotation.copy(held.quaternion);
          hovered = undefined;
          presented = false;
          handoff = 0;
        }
      }
      papers.forEach(sheet => {
        if (sheet === held) return;
        const target = sheet.userData.baseY + (hovered === sheet ? 0.025 : 0);
        sheet.position.y = reduced ? target : THREE.MathUtils.lerp(sheet.position.y, target, 0.15);
      });
      if (held) {
        const opening = selection.current !== null;
        lift = reduced ? (opening ? 1 : 0) : THREE.MathUtils.clamp(lift + (opening ? 1 : -1) * delta / 0.95, 0, 1);
        const smooth = lift * lift * (3 - 2 * lift);
        // Lift away from the tabletop, turn upright, then bring the page to eye level.
        const distance = Math.max(1.65, 1.15 / camera.aspect);
        readingPosition.set(0, 0, -distance).applyQuaternion(camera.quaternion).add(camera.position);
        readingRotation.copy(camera.quaternion).multiply(faceCamera);
        held.position.lerpVectors(homePosition, readingPosition, smooth);
        held.position.y += Math.sin(Math.PI * lift) * 0.32;
        held.quaternion.slerpQuaternions(homeRotation, readingRotation, smooth);
        // Keep the physical sheet until the HTML reader has actually mounted.
        // Both surfaces overlap during the handoff, avoiding a one-frame hole.
        handoff = opening && readerVisible.current ? Math.min(1, handoff + delta / 0.52) : 0;
        const materials = Array.isArray(held.material) ? held.material : [held.material];
        materials.forEach(material => {
          material.transparent = true;
          material.opacity = 1 - handoff;
          material.depthWrite = handoff === 0;
        });
        held.visible = handoff < 1;
        if (opening && lift === 1 && !presented) {
          held.updateMatrixWorld(true);
          camera.updateMatrixWorld(true);
          const corners = [[-0.35, -0.495], [0.35, -0.495], [-0.35, 0.495], [0.35, 0.495]].map(([x, z]) => held!.localToWorld(new THREE.Vector3(x, 0.003, z)).project(camera));
          const rect = container.getBoundingClientRect();
          const xs = corners.map(point => (point.x * 0.5 + 0.5) * rect.width + rect.left);
          const ys = corners.map(point => (-point.y * 0.5 + 0.5) * rect.height + rect.top);
          presented = true;
          onPresented({ left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) });
        }
        if (!opening && lift === 0) {
          held.position.copy(homePosition);
          held.quaternion.copy(homeRotation);
          held.visible = true;
          materials.forEach(material => { material.transparent = false; material.opacity = 1; material.depthWrite = true; });
          held = null;
        }
      }
      renderer.render(scene, camera);
      renderer.autoClear = false;
      renderer.render(vignetteScene, vignetteCamera);
      renderer.autoClear = true;
      // CSS3D cannot participate in the WebGL depth buffer. While a sheet moves,
      // its lit WebGL counterpart remains on and is correctly covered by paper.
      terminalElement.style.visibility = progress === 1 && !held ? 'visible' : 'hidden';
      terminalElement.style.pointerEvents = laptopActive.current ? 'auto' : 'none';
      screenRenderer.render(scene, camera);
      if (laptopObject && laptopMarker.current) {
        terminalObject.getWorldPosition(markerPosition);
        markerPosition.project(camera);
        laptopMarker.current.style.left = `${(markerPosition.x * 0.5 + 0.5) * container.clientWidth}px`;
        laptopMarker.current.style.top = `${(-markerPosition.y * 0.5 + 0.5) * container.clientHeight}px`;
        laptopMarker.current.hidden = progress !== 1 || !!held || laptopActive.current;
        laptopMarker.current.dataset.hovered = String(!!hovered && laptopMeshes.includes(hovered));
      }
      papers.forEach((sheet, index) => {
        const marker = markers.current[index];
        if (!marker) return;
        markerPosition.set(0.25, 0.025, 0.36);
        sheet.localToWorld(markerPosition);
        markerPosition.project(camera);
        marker.style.left = `${(markerPosition.x * 0.5 + 0.5) * container.clientWidth}px`;
        marker.style.top = `${(-markerPosition.y * 0.5 + 0.5) * container.clientHeight}px`;
        const visible = !held && !laptopActive.current && progress === 1 && markerPosition.z > -1 && markerPosition.z < 1;
        marker.hidden = !visible;
        marker.dataset.hovered = String(hovered === sheet);
      });
      frame = requestAnimationFrame(animate);
    };
    camera.position.set(0, 2.4, 7);
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerdown', move);
      container.removeEventListener('pointerleave', leave);
      container.removeEventListener('click', select);
      disposeObject(scene);
      disposeObject(vignetteScene);
      textures.forEach(texture => texture.dispose());
      key.shadow.dispose();
      flashlight.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      terminalObject.removeFromParent();
      screenRenderer.domElement.remove();
    };
  }, [onReady, onError, onSelect, onPresented, terminalElement, openLaptop]);
  return <div className="scene" ref={host} role="group" aria-label="Mesa de madeira iluminada em azul, com quatro folhas do currículo. Selecione uma folha para ler.">
    {createPortal(<LaptopTerminal active={laptopOpen} onClose={closeLaptop} />, terminalElement)}
    <button ref={laptopMarker} className="paper-marker laptop-marker" hidden aria-label="Abrir notebook" onClick={openLaptop}><span className="marker-dot" aria-hidden="true" /><span className="marker-label" aria-hidden="true">Notebook</span></button>
    {documents.map((section, index) => <button className="paper-marker" key={section.title} data-index={index} ref={element => { markers.current[index] = element; }} hidden aria-label={`Abrir ${section.title}`} onClick={() => onSelect(index)}><span className="marker-dot" aria-hidden="true" /><span className="marker-label" aria-hidden="true">{section.title}</span></button>)}
  </div>;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => material.dispose());
    }
  });
}

export default function App() {
  const [interacted, setInteracted] = useState(false);
  const interact = useCallback(() => setInteracted(true), []);
  const [phase, setPhase] = useState<Phase>('dark');
  const [take, setTake] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const reader = useRef<HTMLElement>(null);
  const origin = useRef<PaperBounds | null>(null);
  const select = useCallback((index: number) => { setInteracted(true); setSelected(index); }, []);
  const presented = useCallback((bounds: PaperBounds) => { origin.current = bounds; setReading(true); }, []);
  const close = useCallback(() => { setReading(false); setSelected(null); }, []);
  const ready = useCallback(() => setPhase('ready'), []);
  const error = useCallback(() => setPhase('error'), []);
  const replay = () => { setPhase('dark'); setTake(value => value + 1); };
  useLayoutEffect(() => {
    if (!reading) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    if (dialog.current) dialog.current.scrollTop = 0;
    const paper = reader.current;
    if (!paper || !origin.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = paper.getBoundingClientRect();
    const from = origin.current;
    const animation = paper.animate([
      { opacity: 0, transform: `translate(${from.left - target.left}px, ${from.top - target.top}px) scale(${from.width / target.width}, ${from.height / target.height})` },
      { opacity: 1, transform: 'translate(0, 0) scale(1, 1)' },
    ], { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
    return () => animation.cancel();
  }, [reading]);
  const section = selected !== null ? documents[selected] : null;
  return <main className={`experience ${phase}`}>
    <Scene key={take} onReady={ready} onError={error} onSelect={select} selected={selected} reading={reading} onPresented={presented} onInteract={interact} />
    <div className="blackout" />
    <p className={`interaction-hint${phase === 'ready' && !interacted ? ' is-visible' : ''}`} aria-hidden={phase !== 'ready' || interacted}>Interaja com os documentos</p>
    <dialog ref={dialog} className="document-dialog" aria-labelledby="document-title" onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      {section && <article ref={reader} className="paper-reader" key={selected}>
        <button className="close" autoFocus onClick={close} aria-label="Devolver folha à mesa">×</button>
        <header><p className="document-owner">Igor Roberto Freitas Barbosa</p><h1 id="document-title">{section.title}</h1></header>
        {section.photo && <div className="portrait-row"><p>Desenvolvedor de Software<br />FullStack</p><figure><img src={`${import.meta.env.BASE_URL}profile.jpg`} alt="Igor Roberto Freitas Barbosa" /></figure></div>}
        {section.paragraphs.map((paragraph, index) => <section key={index}>{paragraph.heading && <h2>{paragraph.heading}</h2>}<p>{paragraph.text}</p>{paragraph.href && <a className="project-link" href={paragraph.href} target="_blank" rel="noreferrer">{paragraph.href.replace('https://', '')} ↗</a>}</section>)}
        {section.photo && <section className="contacts"><h2>Contato</h2>{contacts.map(contact => <a key={contact.label} href={contact.href} target={contact.href.startsWith('https:') ? '_blank' : undefined} rel="noreferrer"><span>{contact.label}</span>{contact.text}<b aria-hidden="true">↗</b></a>)}</section>}
        <footer><span>Portfólio pessoal</span><span>{String((selected ?? 0) + 1).padStart(2, '0')}</span></footer>
      </article>}
    </dialog>
    {phase === 'error' && <div className="error" role="alert"><h2>Não foi possível abrir o cenário.</h2><p>Confira sua conexão e se o navegador oferece suporte a WebGL.</p><button onClick={replay}>Tentar novamente</button></div>}
    <span className="sr-only" role="status">{phase === 'dark' ? 'Preparando o cenário.' : phase === 'ready' ? 'Luz acesa. Selecione uma folha para ler o currículo de Igor.' : 'Falha ao carregar o cenário.'}</span>
  </main>;
}
