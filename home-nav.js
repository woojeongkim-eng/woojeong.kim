import * as THREE from 'three';

// Home page main element: Profile / Project / Archive, browsable two ways
// via a CIRCLE / LINE toggle —
//   circle: a real 3D cylinder (Three.js), its curved surface wrapped with
//           the 3 photos (120° of the drum each), each with its category
//           label baked onto the image itself; drag or the bottom
//           prev/next arrows spin it.
//   line:   the same 3 photos as flat cards in a row, dragged/panned
//           horizontally, label on each card.
// Built once and appended to document.body — outside the framework's
// re-rendered component tree (the home page re-renders on a timer and
// tears down anything mounted inside it; see prior history). Position is
// synced every frame to the `.pf-float-wrap` placeholder div.
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

let renderer = null, scene = null, camera = null, group = null, canvasEl = null;
let root = null, barEl = null, thumbEl = null, barLabelEl = null, modeToggleEl = null;
let lineWrapEl = null, cardEls = [];
let raf = null, built = false;

const state = {
  mode: 'circle', // 'circle' | 'line'
  activeIndex: 0,
  dragging: false,
  dragStartX: 0,
  dragDelta: 0,
  moved: false,
  visible: false,
  rotY: -Math.PI / N, // circle mode: settled rotation (radians) — offset so panel 0's own center (at +step/2) faces the camera
  cardW: 260,
  cardH: 173,
};

function anglePerItem() {
  return (Math.PI * 2) / N;
}

function navigateTo(id) {
  const link = document.querySelector(`[data-nav-id="${id}"]`);
  if (link) link.click();
}

// ---------- circle (3D cylinder) ----------

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

  const radius = 190;
  const height = radius * 0.92;
  const gap = 0.02;

  ITEMS.forEach((item, i) => {
    const thetaStart = i * anglePerItem() + gap / 2;
    const thetaLength = anglePerItem() - gap;
    const geo = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true, thetaStart, thetaLength);
    const mat = new THREE.MeshStandardMaterial({ color: 0xdedad2, side: THREE.DoubleSide, roughness: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    // Category label baked onto the image itself (canvas-composited),
    // matching the reference: text sits inside the photo, not floating
    // separately over the whole scene.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cw = img.naturalWidth, ch = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = item.label.charAt(0) + item.label.slice(1).toLowerCase();
      let fontSize = Math.round(ch * 0.16);
      const maxWidth = cw * 0.78;
      ctx.font = `italic ${fontSize}px ${SERIF}`;
      while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `italic ${fontSize}px ${SERIF}`;
      }
      ctx.fillText(text, cw / 2, ch / 2);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    };
    img.src = item.img;
  });

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  canvasEl = renderer.domElement;
}

function frontIndex(rot) {
  const step = anglePerItem();
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < N; i++) {
    const world = i * step + step / 2 + rot;
    const norm = Math.atan2(Math.sin(world), Math.cos(world));
    const diff = Math.abs(norm);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return best;
}

function updateBar(idx) {
  state.activeIndex = idx;
  const item = ITEMS[idx];
  barLabelEl.textContent = item.label;
  thumbEl.style.backgroundImage = `url(${item.img})`;
}

function settleRotation() {
  const step = anglePerItem();
  state.rotY = Math.round((state.rotY + step / 2) / step) * step - step / 2;
  updateBar(frontIndex(state.rotY));
}

function goToCircle(index) {
  const step = anglePerItem();
  const cur = (((state.rotY + step / 2) / step) % N + N) % N;
  const diff = ((index - cur + N / 2) % N + N) % N - N / 2;
  state.rotY += diff * step;
  settleRotation();
}

// ---------- line (flat cards) ----------

function lineTransformFor(i, index, dragDelta) {
  const spacing = state.cardW + 46;
  const x = (i - index) * spacing + dragDelta;
  const t = 1 - Math.min(Math.abs(x) / (spacing * 0.9), 1);
  const scale = 0.82 + 0.18 * t;
  const opacity = 0.35 + 0.65 * t;
  return { transform: `translate(-50%, -50%) translateX(${x}px) scale(${scale})`, opacity, zIndex: Math.round(1000 + t * 100) };
}

function applyLineTransforms(withTransition) {
  cardEls.forEach((el, i) => {
    const t = lineTransformFor(i, state.activeIndex, state.dragDelta);
    el.style.transition = withTransition ? 'transform 0.55s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease' : 'none';
    el.style.transform = t.transform;
    el.style.opacity = String(t.opacity);
    el.style.zIndex = String(t.zIndex);
  });
}

function nearestLineIndex() {
  const spacing = state.cardW + 46;
  const steps = Math.round(-state.dragDelta / spacing);
  return Math.max(0, Math.min(N - 1, state.activeIndex + steps));
}

function goToLine(index) {
  state.activeIndex = index;
  applyLineTransforms(true);
  updateBar(index);
}

// ---------- shared drag handling ----------

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
  if (state.mode === 'line') applyLineTransforms(false);
}

function onPointerUp() {
  if (!state.dragging) return;
  state.dragging = false;
  if (!state.moved) {
    navigateTo(ITEMS[state.activeIndex].id);
    state.dragDelta = 0;
    if (state.mode === 'line') applyLineTransforms(true);
    return;
  }
  if (state.mode === 'circle') {
    state.rotY += state.dragDelta * 0.0044;
    state.dragDelta = 0;
    settleRotation();
  } else {
    state.activeIndex = nearestLineIndex();
    state.dragDelta = 0;
    applyLineTransforms(true);
    updateBar(state.activeIndex);
  }
}

function makeArrow(dir) {
  const b = document.createElement('button');
  b.textContent = dir === 'prev' ? '←' : '→';
  Object.assign(b.style, {
    width: '30px', height: '30px', borderRadius: '50%', border: 'none',
    background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer',
    fontSize: '14px', lineHeight: '1', flexShrink: '0',
  });
  b.addEventListener('click', () => {
    const next = (state.activeIndex + (dir === 'prev' ? -1 : 1) + N) % N;
    if (state.mode === 'circle') goToCircle(next); else goToLine(next);
  });
  return b;
}

function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  modeToggleEl.setAttribute('data-mode', mode);
  canvasEl.style.display = mode === 'circle' ? 'block' : 'none';
  lineWrapEl.style.display = mode === 'line' ? 'block' : 'none';
  if (mode === 'line') { applyLineTransforms(false); updateBar(state.activeIndex); }
  else { settleRotation(); }
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

  lineWrapEl = document.createElement('div');
  Object.assign(lineWrapEl.style, {
    position: 'absolute', inset: '0', display: 'none',
    touchAction: 'none', userSelect: 'none', cursor: 'grab',
  });
  root.appendChild(lineWrapEl);

  cardEls = ITEMS.map((item) => {
    const card = document.createElement('div');
    Object.assign(card.style, {
      position: 'absolute', left: '50%', top: '50%',
      width: state.cardW + 'px', height: state.cardH + 'px',
      borderRadius: '2px', overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0,0,0,0.28)', cursor: 'pointer',
    });
    const img = document.createElement('img');
    img.src = item.img;
    img.alt = item.label;
    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    card.appendChild(img);
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.18)',
    });
    const label = document.createElement('span');
    label.textContent = item.label.charAt(0) + item.label.slice(1).toLowerCase();
    Object.assign(label.style, { fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(20px, 3vw, 34px)', color: 'rgba(255,255,255,0.96)' });
    overlay.appendChild(label);
    card.appendChild(overlay);
    lineWrapEl.appendChild(card);
    return card;
  });

  [canvasEl, lineWrapEl].forEach((el) => {
    el.addEventListener('mousedown', onPointerDown);
    el.addEventListener('touchstart', onPointerDown, { passive: false });
  });
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('touchend', onPointerUp);

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
  Object.assign(thumbEl.style, { width: '38px', height: '38px', borderRadius: '50%', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: '0' });
  barEl.appendChild(thumbEl);

  barLabelEl = document.createElement('div');
  Object.assign(barLabelEl.style, { fontSize: '12px', letterSpacing: '0.16em', fontWeight: '700', minWidth: '64px' });
  barEl.appendChild(barLabelEl);

  barEl.appendChild(makeArrow('prev'));
  barEl.appendChild(makeArrow('next'));

  modeToggleEl = document.createElement('div');
  modeToggleEl.setAttribute('data-mode', state.mode);
  Object.assign(modeToggleEl.style, {
    display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '6px',
    fontSize: '11px', letterSpacing: '0.14em', cursor: 'pointer',
    borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '14px',
  });
  const cLabel = document.createElement('span'); cLabel.textContent = 'CIRCLE';
  const sep = document.createElement('span'); sep.textContent = '/';
  const lLabel = document.createElement('span'); lLabel.textContent = 'LINE';
  [cLabel, sep, lLabel].forEach((el) => modeToggleEl.appendChild(el));
  modeToggleEl.addEventListener('click', () => setMode(state.mode === 'circle' ? 'line' : 'circle'));
  barEl.appendChild(modeToggleEl);

  updateBar(0);
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
    if (state.mode === 'line') applyLineTransforms(false);
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
    const scale = Math.max(0.95, Math.min(w / 900, 1.55));
    group.scale.setScalar(scale);
  }

  const available = Math.min(rect.width * 0.82, rect.height * 0.92);
  const targetCardW = Math.round(Math.min(available, 560));
  if (Math.abs(targetCardW - state.cardW) > 4) {
    state.cardW = targetCardW;
    state.cardH = Math.round(targetCardW * 0.56);
    cardEls.forEach((card) => { card.style.width = state.cardW + 'px'; card.style.height = state.cardH + 'px'; });
    if (state.mode === 'line') applyLineTransforms(false);
  }
}

function tick() {
  raf = requestAnimationFrame(tick);
  syncFrame();
  if (!state.visible || state.mode !== 'circle') return;

  const liveRot = state.dragging ? state.rotY + state.dragDelta * 0.0044 : state.rotY;
  group.rotation.y = liveRot;
  if (state.dragging) updateBar(frontIndex(liveRot));
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
