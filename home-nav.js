// Home page main element: 3 categories (Archive / Project / Profile) that
// can be browsed either as a draggable 3D ring (circle mode) or a
// draggable horizontal row (line mode), with a toggle to switch between
// the two. Built once and appended to document.body — NOT inside the
// framework's re-rendered component tree — because this site re-renders
// its whole home page on a timer (see webgl-home history for why that
// matters: anything mounted inside gets torn down repeatedly). Position
// is synced every frame to the `.pf-float-wrap` placeholder div,
// which lives inside the component and is cheap to recreate.
//
// Navigation reuses the site's own page-routing logic (including the
// Project passcode gate) by clicking hidden proxy links rendered in the
// home page's own template (`[data-nav-id]`), rather than reimplementing
// routing here.

const ITEMS = [
  { id: 'profile', label: 'PROFILE', img: 'uploads/home/profile-croissant-tea.jpg' },
  { id: 'project', label: 'PROJECT', img: 'uploads/home/project-hands-rings.jpg' },
  { id: 'archive', label: 'ARCHIVE', img: 'uploads/home/archive-lily.jpg' },
];

const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS = "'Archivo', Helvetica, Arial, sans-serif";

let root = null;
let anchorEl = null;
let stageEl = null;
let ringEl = null;
let toggleEl = null;
let cardEls = [];
let built = false;

const state = {
  mode: 'circle', // 'circle' | 'line'
  activeIndex: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragDelta: 0,
  moved: false,
  dragTargetIndex: null,
  visible: false,
  cardW: 260,
  cardH: 173,
};

// Circle mode is a flat 2D arrangement (not a 3D ring you rotate edge-on) —
// all 3 cards sit on the circumference of an actual circle and stay fully
// visible at all times; dragging spins the whole circle. This reads
// immediately as "a circle" rather than a carousel where only one card is
// legible at a time.
function circleBaseAngle(i) {
  return -90 + i * (360 / ITEMS.length); // item 0 starts at the top
}

function cssTransformFor(i, index, mode, dragDelta) {
  const n = ITEMS.length;
  if (mode === 'circle') {
    const radius = Math.round(state.cardW * 0.95);
    const dragAngle = dragDelta * 0.32;
    const baseOffset = -circleBaseAngle(index); // rotate so `index` sits at the top
    const angle = circleBaseAngle(i) + baseOffset + dragAngle;
    const rad = (angle * Math.PI) / 180;
    const x = radius * Math.cos(rad);
    const y = radius * Math.sin(rad);
    const norm = ((angle - circleBaseAngle(0) + 180) % 360 + 360) % 360 - 180;
    const t = 1 - Math.min(Math.abs(norm) / 180, 1);
    const scale = 0.86 + 0.14 * t;
    return {
      transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`,
      opacity: 1,
      zIndex: Math.round(1000 + t * 100),
    };
  }
  const spacing = state.cardW + 46;
  const x = (i - index) * spacing + dragDelta;
  const t = 1 - Math.min(Math.abs(x) / (spacing * 0.9), 1);
  const scale = 0.82 + 0.18 * t;
  const opacity = 0.35 + 0.65 * t;
  return {
    transform: `translate(-50%, -50%) translateX(${x}px) scale(${scale})`,
    opacity,
    zIndex: Math.round(1000 + t * 100),
  };
}

function applyTransforms(withTransition) {
  cardEls.forEach((el, i) => {
    const t = cssTransformFor(i, state.activeIndex, state.mode, state.dragDelta);
    el.style.transition = withTransition
      ? 'transform 0.62s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease'
      : 'none';
    el.style.transform = t.transform;
    el.style.opacity = String(t.opacity);
    el.style.zIndex = String(t.zIndex);
  });
}

function nearestIndexFromDrag() {
  const n = ITEMS.length;
  if (state.mode === 'circle') {
    const anglePerItem = 360 / n;
    const dragAngle = state.dragDelta * 0.32;
    const steps = Math.round(-dragAngle / anglePerItem);
    let idx = (state.activeIndex + steps) % n;
    if (idx < 0) idx += n;
    return idx;
  }
  const spacing = state.cardW + 46;
  const steps = Math.round(-state.dragDelta / spacing);
  return Math.max(0, Math.min(n - 1, state.activeIndex + steps));
}

function navigateTo(id) {
  const link = document.querySelector(`[data-nav-id="${id}"]`);
  if (link) link.click();
}

function onPointerDown(e, itemIndex) {
  state.dragging = true;
  state.moved = false;
  state.dragDelta = 0;
  state.dragTargetIndex = itemIndex;
  const p = e.touches ? e.touches[0] : e;
  state.dragStartX = p.clientX;
  state.dragStartY = p.clientY;
  applyTransforms(false);
  e.preventDefault && e.preventDefault();
}

function onPointerMove(e) {
  if (!state.dragging) return;
  const p = e.touches ? e.touches[0] : e;
  const dx = p.clientX - state.dragStartX;
  const dy = p.clientY - state.dragStartY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) state.moved = true;
  state.dragDelta = dx;
  applyTransforms(false);
}

function onPointerUp() {
  if (!state.dragging) return;
  state.dragging = false;

  if (!state.moved && state.dragTargetIndex != null) {
    navigateTo(ITEMS[state.dragTargetIndex].id);
    state.dragDelta = 0;
    applyTransforms(true);
    return;
  }

  state.activeIndex = nearestIndexFromDrag();
  state.dragDelta = 0;
  applyTransforms(true);
}

function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  toggleEl.setAttribute('data-mode', mode);
  applyTransforms(true);
}

function buildDom() {
  root = document.createElement('div');
  Object.assign(root.style, {
    position: 'fixed', left: '0px', top: '0px', width: '1px', height: '1px',
    display: 'none', zIndex: '2',
  });

  stageEl = document.createElement('div');
  Object.assign(stageEl.style, {
    position: 'absolute', inset: '0', perspective: '1600px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    touchAction: 'none', userSelect: 'none', cursor: 'grab',
  });
  root.appendChild(stageEl);

  ringEl = document.createElement('div');
  Object.assign(ringEl.style, {
    position: 'relative', width: '1px', height: '1px', transformStyle: 'preserve-3d',
  });
  stageEl.appendChild(ringEl);

  cardEls = ITEMS.map((item) => {
    const card = document.createElement('div');
    Object.assign(card.style, {
      position: 'absolute', left: '50%', top: '50%',
      width: state.cardW + 'px', height: state.cardH + 'px',
      borderRadius: '2px', overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
      backfaceVisibility: 'hidden',
      cursor: 'pointer',
    });

    const img = document.createElement('img');
    img.src = item.img;
    img.alt = item.label;
    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    card.appendChild(img);

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute', left: '0', right: '0', bottom: '0',
      padding: '14px 16px 12px',
      background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))',
    });
    const label = document.createElement('span');
    label.textContent = item.label;
    Object.assign(label.style, {
      fontFamily: SANS, fontSize: '12px', letterSpacing: '0.18em',
      color: '#fff', fontWeight: '700',
    });
    overlay.appendChild(label);
    card.appendChild(overlay);

    ringEl.appendChild(card);
    return card;
  });

  cardEls.forEach((card, i) => {
    card.addEventListener('mousedown', (e) => onPointerDown(e, i));
    card.addEventListener('touchstart', (e) => onPointerDown(e, i), { passive: false });
  });
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('touchend', onPointerUp);

  toggleEl = document.createElement('div');
  toggleEl.setAttribute('data-mode', state.mode);
  Object.assign(toggleEl.style, {
    position: 'absolute', left: '50%', bottom: '9%', transform: 'translateX(-50%)',
    display: 'flex', gap: '8px', alignItems: 'center',
    fontFamily: SANS, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(58,54,48,0.55)',
    pointerEvents: 'auto', cursor: 'pointer', userSelect: 'none',
  });
  const circleLabel = document.createElement('span');
  circleLabel.textContent = 'CIRCLE';
  const sep = document.createElement('span');
  sep.textContent = '/';
  const lineLabel = document.createElement('span');
  lineLabel.textContent = 'LINE';
  [circleLabel, sep, lineLabel].forEach((el) => toggleEl.appendChild(el));
  toggleEl.addEventListener('click', () => setMode(state.mode === 'circle' ? 'line' : 'circle'));
  root.appendChild(toggleEl);

  document.body.appendChild(root);
}

function syncFrame() {
  const anchor = document.querySelector('.pf-float-wrap');
  if (!anchor) {
    if (state.visible) {
      state.visible = false;
      root.style.display = 'none';
    }
    return;
  }
  const rect = anchor.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  if (!state.visible) {
    state.visible = true;
    root.style.display = 'block';
    applyTransforms(false);
  }
  root.style.left = rect.left + 'px';
  root.style.top = rect.top + 'px';
  root.style.width = rect.width + 'px';
  root.style.height = rect.height + 'px';

  // Circle mode needs room for the full circle (~2.9x card width across);
  // line mode just needs 3 cards in a row. Size for the circle case since
  // it's the default and the tighter constraint.
  const available = Math.min(rect.width * 0.92, rect.height * 0.8);
  const targetCardW = Math.round(Math.min(available / 2.7, 460));
  if (Math.abs(targetCardW - state.cardW) > 4) {
    state.cardW = targetCardW;
    state.cardH = Math.round(targetCardW * (2 / 3));
    cardEls.forEach((card) => {
      card.style.width = state.cardW + 'px';
      card.style.height = state.cardH + 'px';
    });
    applyTransforms(false);
  }
}

function tick() {
  requestAnimationFrame(tick);
  syncFrame();
}

function start() {
  if (built) return;
  built = true;
  buildDom();
  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
