/* Widok 3D sceny lekcji (projektor nauczyciela, podgląd w panelu, tryb „3D” ucznia). */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { swiatla, otoczenie } from "./silnik-sceny.js";

export function widok3D(container, lekcja, { onClick, tlo = 0xe9edf0, autoKamera = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(tlo);
  scene.fog = new THREE.Fog(tlo, 6, 14);
  swiatla(scene);
  otoczenie(renderer, scene);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(tlo).multiplyScalar(0.93), roughness: 1, envMapIntensity: 0.4 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true; scene.add(ground);
  scene.add(lekcja.root);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.02, 50);
  const HOME = { pos: new THREE.Vector3(0, 1.35, 2.75), target: new THREE.Vector3(0, 0.42, -0.1) };
  camera.position.copy(HOME.pos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME.target); controls.enableDamping = true; controls.maxPolarAngle = 1.48;
  controls.minDistance = 0.6; controls.maxDistance = 6;

  // płynny przelot kamery
  let fly = null;
  // na wąskim (pionowym) ekranie kamera musi stać dalej
  const odl = () => camera.aspect < 1 ? Math.min(2.2, 0.8 / camera.aspect) : 1;
  function lecDo(id) {
    let target = HOME.target.clone(), pos = HOME.target.clone().add(HOME.pos.clone().sub(HOME.target).multiplyScalar(odl()));
    const p = id && lekcja.pozycja(id);
    if (p) {
      target = p;
      const dir = new THREE.Vector3(p.x, 0, p.z); if (dir.lengthSq() < 0.01) dir.set(0, 0, 1); dir.normalize();
      const it = lekcja.items.get(id);
      const ekran = it && it.kind !== "model";
      // ekran ogląda się z przodu (jego normalna), model – od strony widza
      const n = ekran ? new THREE.Vector3(Math.sin(it.group.rotation.y), 0, Math.cos(it.group.rotation.y)) : new THREE.Vector3(0, 0, 1);
      const dist = (ekran ? Math.max(0.9, (it.width || 0.6) * 1.45) : 1.5) * odl();
      pos = p.clone().add(n.multiplyScalar(dist)).add(new THREE.Vector3(0, ekran ? 0.12 : 0.45, 0));
    }
    fly = { t: 0, fromP: camera.position.clone(), fromT: controls.target.clone(), toP: pos, toT: target };
  }

  // klik/tap w element (bez przeciągania)
  const ray = new THREE.Raycaster(); let down = null;
  renderer.domElement.addEventListener("pointerdown", e => down = { x: e.clientX, y: e.clientY });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || !onClick) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    onClick(lekcja.trafienie(ray));
  });

  // wybór elementu w punkcie ekranu (nx, ny w zakresie 0..1) – dla wskazywania palcem
  function pick(nx, ny) {
    ray.setFromCamera(new THREE.Vector2(nx * 2 - 1, -(ny * 2 - 1)), camera);
    return lekcja.trafienie(ray);
  }
  // obrót kamery wokół celu (np. gestem „chwyć i przesuń”) i przybliżanie
  const sph = new THREE.Spherical();
  function obroc(dTheta, dPhi) {
    fly = null;
    const off = camera.position.clone().sub(controls.target); sph.setFromVector3(off);
    sph.theta -= dTheta; sph.phi = Math.min(controls.maxPolarAngle, Math.max(0.15, sph.phi - dPhi));
    off.setFromSpherical(sph); camera.position.copy(controls.target).add(off);
  }
  function przybliz(f) {
    fly = null;
    const off = camera.position.clone().sub(controls.target);
    const len = Math.min(controls.maxDistance, Math.max(controls.minDistance, off.length() * f));
    camera.position.copy(controls.target).add(off.setLength(len));
  }

  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container); resize();
  camera.position.copy(HOME.target.clone().add(HOME.pos.clone().sub(HOME.target).multiplyScalar(odl())));

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    lekcja.update(dt);
    if (fly) {
      fly.t = Math.min(1, fly.t + dt * 1.4); const k = 1 - Math.pow(1 - fly.t, 3);
      camera.position.lerpVectors(fly.fromP, fly.toP, k); controls.target.lerpVectors(fly.fromT, fly.toT, k);
      if (fly.t >= 1) fly = null;
    }
    controls.update(); renderer.render(scene, camera);
  });
  return { renderer, scene, camera, controls, lecDo, pick, obroc, przybliz, dom: renderer.domElement, autoKamera,
    dispose() { renderer.setAnimationLoop(null); renderer.dispose(); renderer.domElement.remove(); } };
}
