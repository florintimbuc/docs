// Modal zoom for mermaid diagrams. Clicking a diagram opens a copy of it,
// fitted to the viewport, on a translucent backdrop with zoom buttons below.
// Clicking the backdrop or pressing Escape closes it; middle-mouse drag pans.
//
// The overlay is built from a clone of the diagram and appended to
// document.body, so the React-owned mermaid container is never mutated
// (mutating it made the modal flaky: React re-renders reconciled away the
// injected class and controls).

const ZOOM_STEP = 1.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 8;

let overlay: HTMLElement | null = null;
let scale = 1;
let baseW = 0;
let baseH = 0;

function applyScale(): void {
  const svg = overlay?.querySelector('svg');
  if (!svg) return;
  svg.style.width = `${Math.round(baseW * scale)}px`;
  svg.style.height = `${Math.round(baseH * scale)}px`;
  svg.style.maxWidth = 'none';
}

function closeModal(): void {
  overlay?.remove();
  overlay = null;
  document.documentElement.style.overflow = '';
}

function openModal(sourceSvg: SVGSVGElement): void {
  closeModal();

  const vb = sourceSvg.viewBox?.baseVal;
  const naturalW = vb?.width || sourceSvg.getBoundingClientRect().width || 1;
  const naturalH = vb?.height || sourceSvg.getBoundingClientRect().height || 1;
  // 32px overlay padding + 24px panel padding per side, plus controls-bar room
  const availW = window.innerWidth - 144;
  const availH = window.innerHeight - 208;
  const fit = Math.min(availW / naturalW, availH / naturalH);
  baseW = naturalW * fit;
  baseH = naturalH * fit;
  scale = 1;

  overlay = document.createElement('div');
  overlay.className = 'mermaid-zoom-overlay';
  overlay.appendChild(sourceSvg.cloneNode(true));

  const bar = document.createElement('div');
  bar.className = 'mermaid-zoom-controls';
  const addButton = (label: string, title: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    bar.appendChild(b);
  };
  addButton('−', 'Zoom out', () => {
    scale = Math.max(ZOOM_MIN, scale / ZOOM_STEP);
    applyScale();
  });
  addButton('+', 'Zoom in', () => {
    scale = Math.min(ZOOM_MAX, scale * ZOOM_STEP);
    applyScale();
  });
  overlay.appendChild(bar);

  document.body.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';
  applyScale();
}

// Middle-mouse drag pans the zoomed diagram (same gesture as the office canvas).
let panning = false;
let panStartX = 0;
let panStartY = 0;
let panScrollX = 0;
let panScrollY = 0;

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (overlay) {
      if (target.closest('.mermaid-zoom-controls')) return;
      const svg = target.closest('svg');
      if (svg && overlay.contains(svg)) return; // click on the diagram: keep open
      closeModal();
      return;
    }
    const container = target.closest('.docusaurus-mermaid-container');
    const svg = container?.querySelector('svg');
    if (svg) openModal(svg as SVGSVGElement);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Close if the user navigates while the modal is open.
  window.addEventListener('popstate', closeModal);

  document.addEventListener('mousedown', (e) => {
    if (!overlay || e.button !== 1) return;
    e.preventDefault(); // suppress the browser's middle-click autoscroll
    panning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panScrollX = overlay.scrollLeft;
    panScrollY = overlay.scrollTop;
    overlay.classList.add('mermaid-panning');
  });

  document.addEventListener('mousemove', (e) => {
    if (!panning || !overlay) return;
    overlay.scrollLeft = panScrollX - (e.clientX - panStartX);
    overlay.scrollTop = panScrollY - (e.clientY - panStartY);
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button !== 1) return;
    panning = false;
    overlay?.classList.remove('mermaid-panning');
  });
}

export {};
