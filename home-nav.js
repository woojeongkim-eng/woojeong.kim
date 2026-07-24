import * as THREE from 'three';

// Home page main element: a big rotating 3D cylinder, its curved surface
// wrapped with the Profile / Project / Archive photos (120° of the drum
// each), with a bottom control bar (thumbnail + label + prev/next) and
// drag-to-spin. Built once and appended to document.body — outside the
// framework's re-rendered component tree (the home page re-renders on a
// timer and tears down anything mounted inside it; see prior history).
// Position is synced every frame to the `.pf-float-wrap` placeholder div.
//
// Navigation reuses the site's own page-routing logic (including the
// Project passcode gate) via the hidden `[data-nav-id]` proxy links
// rendered in the home page's own template.

const ITEMS = [
  { id: 'profile', label: 'PROFILE', img: 'uploads/home/profile-croissant-tea.jpg' },
  { id: 'project', label: 'PROJECT', img: 'uploads/home/project-hands-rings.jpg' },
  { id: 'archive', label: 'ARCHIVE', img: 'uploads/home/archive-lily.jpg' },
];
const N = ITEMS.length;
const SANS = "'Archivo', Helvetica, Arial, sans-serif";
const SERIF = "'Cormorant Garamond', Georgia, serif";

let renderer = null, scene = null, camera = null, group = null;
let canvasEl = null, root = null, labelEl = null, barEl = null, thumbEl = null, barLabelEl = null;
let raf = null, built = false;

const state = {
  activeIndex: 0,
  dragging: false,
  dragStartX: 0,
  dragDelta: 0,
  moved: false,
  visible: false,
  rotY: 0, // settled rotation (radians)
};

function anglePerItem() {
  return (Math.PI * 2) / N;
}

function navigateTo(id) {
  const link = document.querySelector(`[data-nav-id="${id}"]`);
  if (link) link.click();
}

function buildScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 16 / 9, 1, 5000);
  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 0.35);
  dir.position.set(200, 300, 400);
  scene.add(dir);

  group = new THREE.Group();
  scene.add(group);

  const radius = 460;
  const height = radius * 1.6;
  const loader = new THREE.TextureLoader();
  const gap = 0.018; // small radian gap between panels

  ITEMS.forEach((item, i) => {
    const thetaStart = i * anglePerItem() + gap / 2;
    const thetaLength = anglePerItem() - gap;
    const geo = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true, thetaStart, thetaLength);
    const mat = new THREE.MeshStandardMaterial({ color: 0xdedad2, side: THREE.DoubleSide, roughness: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    loader.load(item.img, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    });
  });

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  canvasEl = renderer.domElement;
}

function frontIndex(rot) {
  const step = anglePerItem();
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < N; i++) {
    const world = i * step + rot;
    const norm = Math.atan2(Math.sin(world), Math.cos(world));
    const diff = Math.abs(norm);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return best;
}

function updateLabel(rot) {
  const idx = frontIndex(rot);
  state.activeIndex = idx;
  const item = ITEMS[idx];
  labelEl.textContent = item.label;
  barLabelEl.textContent = item.label;
  thumbEl.style.backgroundImage = `url(${item.img})`;
}

function settleRotation() {
  const step = anglePerItem();
  state.rotY = Math.round(state.rotY / step) * step;
  updateLabel(state.rotY);
}

function goTo(index) {
  const step = anglePerItem();
  const cur = ((state.rotY / step) % N + N) % N;
  const diff = ((index - cur + N / 2) % N + N) % N - N / 2;
  state.rotY += diff * step;
  settleRotation();
}

function onPointerDown(e) {
  state.dragging = true;
  state.moved = false;
  state.dragDelta = 0;
  const p = e.touches ? e.touches[0] : e;
  state.dragStartX = p.clientX;
  e.preventDefault && e.preventDefault();
}

function onPointerMove(e) {
  if (!state.dragging) return;
  const p = e.touches ? e.touches[0] : e;
  const dx = p.clientX - state.dragStartX;
  if (Math.abs(dx) > 5) state.moved = true;
  state.dragDelta = dx;
}

function onPointerUp() {
  if (!state.dragging) return;
  state.dragging = false;
  if (!state.moved) {
    navigateTo(ITEMS[state.activeIndex].id);
    state.dragDelta = 0;
    return;
  }
  state.rotY += state.dragDelta * 0.0044;
  state.dragDelta = 0;
  settleRotation();
}

function makeArrow(dir) {
  const b = document.createElement('button');
  b.textContent = dir === 'prev' ? '←' : '→';
  Object.assign(b.style, {
    width: '30px', height: '30px', borderRadius: '50%', border: 'none',
    background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer',
    fontSize: '14px', lineHeight: '1',
  });
  b.addEventListener('click', () => {
    goTo((state.activeIndex + (dir === 'prev' ? -1 : 1) + N) % N);
  });
  return b;
}

function buildDom() {
  root = document.createElement('div');
  Object.assign(root.style, {
    position: 'fixed', left: '0px', top: '0px', width: '1px', height: '1px',
    display: 'none', zIndex: '2',
  });
  document.body.appendChild(root);

  buildScene();
  Object.assign(canvasEl.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    display: 'block', cursor: 'grab', touchAction: 'none',
  });
  root.appendChild(canvasEl);

  canvasEl.addEventListener('mousedown', onPointerDown);
  canvasEl.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('touchend', onPointerUp);

  labelEl = document.createElement('div');
  Object.assign(labelEl.style, {
    position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%, -50%)',
    fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(32px, 5vw, 64px)',
    color: 'rgba(255,255,255,0.94)', textShadow: '0 2px 18px rgba(0,0,0,0.35)',
    pointerEvents: 'none', letterSpacing: '0.01em',
  });
  root.appendChild(labelEl);

  barEl = document.createElement('div');
  Object.assign(barEl.style, {
    position: 'absolute', left: '50%', bottom: '6%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: '14px',
    background: 'rgba(58,54,48,0.55)', backdropFilter: 'blur(6px)',
    borderRadius: '999px', padding: '8px 18px 8px 8px',
    fontFamily: SANS, color: '#fff', userSelect: 'none',
  });
  root.appendChild(barEl);

  thumbEl = document.createElement('div');
  Object.assign(thumbEl.style, {
    width: '38px', height: '38px', borderRadius: '50%', backgroundSize: 'cover',
    backgroundPosition: 'center', flexShrink: '0',
  });
  barEl.appendChild(thumbEl);

  barLabelEl = document.createElement('div');
  Object.assign(barLabelEl.style, { fontSize: '12px', letterSpacing: '0.16em', fontWeight: '700' });
  barEl.appendChild(barLabelEl);

  barEl.appendChild(makeArrow('prev'));
  barEl.appendChild(makeArrow('next'));

  updateLabel(state.rotY);
}

function syncFrame() {
  const anchor = document.querySelector('.pf-float-wrap');
  if (!anchor) {
    if (state.visible) { state.visible = false; root.style.display = 'none'; }
    return;
  }
  const rect = anchor.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  if (!state.visible) {
    state.visible = true;
    root.style.display = 'block';
  }
  root.style.left = rect.left + 'px';
  root.style.top = rect.top + 'px';
  root.style.width = rect.width + 'px';
  root.style.height = rect.height + 'px';

  const w = rect.width, h = rect.height;
  if (canvasEl.__w !== w || canvasEl.__h !== h) {
    canvasEl.__w = w; canvasEl.__h = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
}

function tick() {
  raf = requestAnimationFrame(tick);
  syncFrame();
  if (!state.visible) return;

  const liveRot = state.dragging ? state.rotY + state.dragDelta * 0.0044 : state.rotY;
  group.rotation.y = liveRot;
  if (state.dragging) updateLabel(liveRot);
  renderer.render(scene, camera);
}

function start() {
  if (built) return;
  built = true;
  buildDom();
  raf = requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
