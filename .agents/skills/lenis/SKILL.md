---
name: lenis
description: Implement Lenis smooth scroll by Darkroom Engineering (lenis). Use for buttery-smooth inertia scrolling, GSAP ScrollTrigger synchronization, virtual scrolling, anchor links, nested scroll management with data-lenis-prevent, and React/Next.js/Vue integration.
metadata:
  author: darkroomengineering
  repository: https://github.com/darkroomengineering/lenis
  version: "1.1.0"
---

# Lenis Smooth Scroll Skill

Comprehensive implementation guide for **Lenis** (`lenis`), the lightweight, robust, high-performance smooth-scroll library developed by **Darkroom Engineering** (formerly Studio Freight).

Official Repository: [https://github.com/darkroomengineering/lenis](https://github.com/darkroomengineering/lenis)  
Documentation: [https://lenis.darkroom.engineering](https://lenis.darkroom.engineering)

---

## When to Use This Skill

Activate this skill when:
- Adding fluid, momentum-based smooth scrolling to modern web applications.
- Synchronizing scroll position with GSAP (`gsap`), `ScrollTrigger`, or animation pipelines.
- Preserving native browser features like `position: sticky`, keyboard navigation, accessibility, and hash anchors without layout breakage.
- Preventing scroll hijacking conflicts in modals, nested dropdowns, or code editors using `data-lenis-prevent`.
- Building interactive landing pages, luxury portfolios, or creative editorial layouts.

---

## 1. Installation

```bash
# Core package
npm install lenis

# React bindings (optional)
npm install lenis @studio-freight/react-lenis
# or for modern React 18/19:
npm install lenis
```

Via CDN / Vanilla Script Tag:
```html
<link rel="stylesheet" href="https://unpkg.com/lenis@1.1.18/dist/lenis.css">
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
```

---

## 2. Mandatory CSS Setup

Always include the official styles or equivalent rules. This prevents layout jitter, sets proper overscroll containment, and handles stopped scroll states:

```css
html.lenis, html.lenis body {
  height: auto;
}

.lenis.lenis-smooth {
  scroll-behavior: auto !important;
}

.lenis.lenis-smooth [data-lenis-prevent] {
  overscroll-behavior: contain;
}

.lenis.lenis-stopped {
  overflow: hidden;
}

.lenis.lenis-scrolling iframe {
  pointer-events: none;
}
```

---

## 3. Core Vanilla Implementation

```javascript
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

// Check reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease out
  orientation: 'vertical', // 'vertical' | 'horizontal'
  gestureOrientation: 'vertical',
  smoothWheel: !prefersReducedMotion,
  wheelMultiplier: 1,
  touchMultiplier: 2,
  infinite: false,
})

// Drive scroll loop via requestAnimationFrame
function raf(time) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}

requestAnimationFrame(raf)
```

---

## 4. Advanced: GSAP ScrollTrigger Synchronization

When combining Lenis with GSAP ScrollTrigger, **Lenis must drive its RAF loop through the GSAP ticker** to ensure frame-perfect synchronization and eliminate scroll jitter:

```javascript
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
})

// 1. Update ScrollTrigger when Lenis scrolls
lenis.on('scroll', ScrollTrigger.update)

// 2. Drive Lenis through GSAP ticker (time is in seconds; Lenis expects milliseconds)
gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

// 3. Disable GSAP lag smoothing to prevent stutter on CPU spikes
gsap.ticker.lagSmoothing(0)
```

---

## 5. React Integration

Using the official React wrapper:

```tsx
'use client'

import { ReactLenis, useLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: true }}>
      {children}
    </ReactLenis>
  )
}

// Accessing the instance inside children components:
export function ScrollProgress() {
  const lenis = useLenis(({ scroll, progress }) => {
    // Called on every scroll event
  })

  return null
}
```

---

## 6. Programmatic Control & Anchor Links

### Smooth Anchor Jumping
Intercept `#` links to scroll smoothly via Lenis:

```javascript
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const target = this.getAttribute('href')
    if (target && target.length > 1) {
      e.preventDefault()
      lenis.scrollTo(target, {
        offset: -80, // Optional offset for fixed headers
        duration: 1.2,
        immediate: false,
      })
    }
  })
})
```

### Pausing Scroll (e.g., Modals & Drawers)
When opening a modal, drawer, or navigation menu:

```javascript
// Freeze page scrolling
lenis.stop()

// Resume page scrolling
lenis.start()
```

---

## 7. Nested Scroll Containers (`data-lenis-prevent`)

For inner elements that require their own scrolling (e.g., modals, code snippets, chat windows, dropdown menus), add the `data-lenis-prevent` attribute so Lenis does not hijack their scroll:

```html
<!-- Prevent Lenis from intercepting scroll events in this container -->
<div class="chat-message-list" data-lenis-prevent style="overflow-y: auto; max-height: 400px;">
  <!-- Inner content scrolls natively without affecting page scroll -->
</div>
```

---

## 8. Complete Options Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `duration` | `number` | `1.2` | The scroll duration in seconds. |
| `easing` | `function` | `(t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))` | Easing curve function. |
| `lerp` | `number` | `0.1` | Linear interpolation intensity (if `duration` is not used). |
| `orientation` | `string` | `'vertical'` | Primary scroll direction (`'vertical'` or `'horizontal'`). |
| `gestureOrientation`| `string` | `'vertical'` | Gesture direction (`'vertical'`, `'horizontal'`, or `'both'`). |
| `smoothWheel` | `boolean` | `true` | Enable smooth wheel scrolling. |
| `wheelMultiplier` | `number` | `1` | Multiplier for mouse wheel events. |
| `touchMultiplier` | `number` | `2` | Multiplier for touch drag velocity. |
| `infinite` | `boolean` | `false` | Enable infinite wrap-around scroll. |
| `autoResize` | `boolean` | `true` | Auto-detect content resizes via ResizeObserver. |

---

## 9. Cleanup & Unmounting

Always destroy the Lenis instance when unmounting in Single Page Applications (Next.js, Vite, Vue):

```javascript
// Cleanup
lenis.destroy()
```
