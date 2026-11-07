/**
 * BreachMatrix — ScrollReveal Text Engine
 * Progressive word/char unblur & fade scrub system with GSAP & ScrollTrigger.
 * Inspired by modern Awwwards & brutalist editorial cyber typography.
 */

(function () {
  'use strict';

    // This engine is intentionally limited to the standalone content subpages.
    if(
      !document.body.matches('.page-about, .page-products, .page-service, .page-works') ||
      !document.querySelector('main.view-mode-scroll')
    ) {
    return;
  }

  // Guard: reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const SCRUB_SPAN = 0.5;
  const RISE_MASK = 'inset(-1em -1em -0.15em -1em)';

  const clampToScroll = position =>
    typeof position === 'string' && !position.startsWith('clamp(') ? `clamp(${position})` : position;

  const clamp01 = value => Math.min(Math.max(value, 0), 1);
  const smooth = value => value * value * (3 - 2 * value);
  const easeOut = value => 1 - Math.pow(1 - value, 3);
  const easeBack = (value, overshoot) => {
    const shifted = value - 1;
    return 1 + (overshoot + 1) * shifted * shifted * shifted + overshoot * shifted * shifted;
  };
  const glowAt = t => (t <= 0 || t >= 1 ? 0 : t < 0.35 ? smooth(t / 0.35) : 1 - smooth((t - 0.35) / 0.65));

  const paintPiece = (piece, t, look) => {
    let reveal = t;
    let fadeIn = t;
    let motion = '';
    if (look.effect === 'rise') {
      reveal = easeOut(t);
      fadeIn = clamp01(reveal * 1.25);
      if (reveal < 1) {
        motion = look.masked
          ? `translateY(${((1 - reveal) * 100).toFixed(2)}%) translateY(${((1 - reveal) * 0.2).toFixed(3)}em)`
          : `translateY(${((1 - reveal) * 0.8).toFixed(3)}em)`;
      }
    } else if (look.effect === 'flip') {
      reveal = easeBack(t, 1.2);
      fadeIn = clamp01(t * 2);
      if (t < 1) motion = `perspective(6em) rotateX(${((1 - reveal) * 90).toFixed(2)}deg)`;
    } else if (look.effect === 'scale') {
      reveal = easeBack(t, 1.6);
      fadeIn = clamp01(t * 1.6);
      if (t < 1) motion = `scale(${(0.72 + 0.28 * reveal).toFixed(4)})`;
    }
    if (look.highlightColor) fadeIn = Math.max(fadeIn, clamp01(t / 0.35));
    const settle = clamp01(reveal);
    const lift = look.offset * (1 - settle);
    piece.style.opacity = t >= 1 ? '' : (look.baseOpacity + (1 - look.baseOpacity) * fadeIn).toFixed(3);
    piece.style.transform = [lift ? `translateY(${lift.toFixed(2)}px)` : '', motion].filter(Boolean).join(' ');
    piece.style.filter = look.blur && settle < 1 ? `blur(${(look.blur * (1 - settle)).toFixed(2)}px)` : '';
    if (look.highlightColor) {
      const glow = glowAt(t);
      piece.style.color =
        glow > 0.002 ? `color-mix(in srgb, ${look.highlightColor} ${(glow * 100).toFixed(1)}%, currentColor)` : '';
    }
  };

  function splitElementIntoWords(el, splitBy) {
    const existingPieces = el.querySelectorAll('.scroll-reveal-piece');
    if (existingPieces.length > 0) {
      return {
        wrappers: Array.from(el.querySelectorAll('.scroll-reveal-word')),
        pieces: Array.from(existingPieces)
      };
    }

    const wrappers = [];
    const pieces = [];

    function processTextNode(node) {
      const text = node.textContent;
      if (!text || text.trim() === '') {
        return document.createTextNode(text);
      }
      const frag = document.createDocumentFragment();
      const tokens = text.split(/(\s+)/);

      tokens.forEach(token => {
        if (token.trim() === '') {
          frag.appendChild(document.createTextNode(token));
        } else {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'scroll-reveal-word';

          if (splitBy === 'chars') {
            Array.from(token).forEach(char => {
              const pieceSpan = document.createElement('span');
              pieceSpan.className = 'scroll-reveal-piece';
              pieceSpan.textContent = char;
              wordSpan.appendChild(pieceSpan);
              pieces.push(pieceSpan);
            });
          } else {
            const pieceSpan = document.createElement('span');
            pieceSpan.className = 'scroll-reveal-piece';
            pieceSpan.textContent = token;
            wordSpan.appendChild(pieceSpan);
            pieces.push(pieceSpan);
          }

          wrappers.push(wordSpan);
          frag.appendChild(wordSpan);
        }
      });
      return frag;
    }

    function walk(node) {
      const children = Array.from(node.childNodes);
      children.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const replacement = processTextNode(child);
          node.replaceChild(replacement, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tag = child.tagName.toLowerCase();
          if (tag !== 'script' && tag !== 'style' && tag !== 'svg') {
            walk(child);
          }
        }
      });
    }

    walk(el);
    return { wrappers, pieces };
  }

  function applyScrollReveal(el, customOptions = {}) {
    if (el.classList.contains('scroll-reveal-initialized')) return;
    if (el.closest('.page-hero-section') || el.matches('.page-hero-title')) return;

    el.classList.add('scroll-reveal-initialized', 'scroll-reveal');

      // Accessibility label
    const rawText = el.textContent.trim();
    if (!el.getAttribute('aria-label') && rawText) {
      el.setAttribute('aria-label', rawText);
    }

    const effect = el.dataset.effect || customOptions.effect || 'fade';
    const mode = el.dataset.mode || customOptions.mode || 'scrub';
    const splitBy = el.dataset.splitBy || customOptions.splitBy || 'words';
    const enableBlur = el.dataset.blur !== 'false' && customOptions.enableBlur !== false;
    const blurStrength = parseFloat(el.dataset.blurStrength || customOptions.blurStrength || 4);
    const baseOpacity = parseFloat(el.dataset.baseOpacity || customOptions.baseOpacity || 0.1);
    const baseRotation = parseFloat(
      el.dataset.rotation !== undefined
        ? el.dataset.rotation
        : customOptions.baseRotation !== undefined
          ? customOptions.baseRotation
          : 0
    );
    const baseOffset = parseFloat(el.dataset.baseOffset || customOptions.baseOffset || 0);
    const stagger = parseFloat(el.dataset.stagger || customOptions.stagger || 0.04);
    const smoothing = parseFloat(el.dataset.smoothing || customOptions.smoothing || 0);
    const duration = parseFloat(el.dataset.duration || customOptions.duration || 0.8);
    const highlightColor = el.dataset.highlight || customOptions.highlightColor || '';
    const wordAnimationEnd = el.dataset.animationEnd || customOptions.wordAnimationEnd || 'bottom bottom';
    const rotationEnd = el.dataset.rotationEnd || customOptions.rotationEnd || 'bottom bottom';

    const { wrappers, pieces } = splitElementIntoWords(el, splitBy);
    if (!pieces.length) return;

    const scroller = window;
    const viewportHeight = () => window.innerHeight;
    const scrub = smoothing > 0 ? smoothing : true;
    const span = mode === 'enter' ? Math.max(0.05, duration) : SCRUB_SPAN;
    const gap = Math.max(0, stagger);
    const look = {
      effect,
      masked: effect === 'rise' && wrappers.length > 0,
      baseOpacity,
      blur: enableBlur ? blurStrength : 0,
      offset: baseOffset,
      highlightColor
    };

    const order = pieces.map((_, index) => index);
    const last = pieces.map(() => -1);
    const state = { p: 0 };
    let count = pieces.length;

    if (splitBy === 'lines' && wrappers.length) {
      let line = -1;
      let top = -Infinity;
      wrappers.forEach((wrapper, index) => {
        const next = wrapper.offsetTop;
        if (Math.abs(next - top) > 2) {
          line += 1;
          top = next;
        }
        order[index] = line;
      });
      count = line + 1;
    }

    const total = () => span + Math.max(0, count - 1) * gap;

    const render = () => {
      const at = state.p * total();
      pieces.forEach((piece, index) => {
        const t = clamp01((at - order[index] * gap) / span);
        if (t === last[index]) return;
        last[index] = t;
        paintPiece(piece, t, look);
      });
    };

    pieces.forEach(piece => {
      piece.style.willChange =
        pieces.length > 80 ? '' : effect === 'fade' && !baseOffset ? 'opacity' : 'opacity, transform';
      piece.style.transformOrigin = effect === 'flip' ? '50% 100%' : '';
    });

    if (look.masked) {
      wrappers.forEach(wrapper => {
        wrapper.style.clipPath = RISE_MASK;
      });
    }

    render();

    if (mode === 'enter') {
      let played = false;
      const play = () => {
        if (played) return;
        played = true;
        gsap.to(state, { p: 1, duration: total(), ease: 'none', onUpdate: render });
        if (baseRotation) gsap.to(el, { rotate: 0, duration: Math.min(total(), 1.4), ease: 'power3.out' });
      };
      const startAt = () => {
        const view = viewportHeight();
        const top = el.getBoundingClientRect().top + window.scrollY;
        const raw = top - view + 0.2 * Math.min(el.offsetHeight, view);
        return Math.min(raw, ScrollTrigger.maxScroll(scroller) - 1);
      };
      if (baseRotation) gsap.set(el, { transformOrigin: '0% 50%', rotate: baseRotation });
      ScrollTrigger.create({
        trigger: el,
        scroller,
        start: startAt,
        onEnter: play,
        onLeave: play,
        onRefresh: self => {
          if (self.progress > 0) play();
        }
      });
    } else {
      // mode: scrub
      if (baseRotation) {
        gsap.fromTo(
          el,
          { transformOrigin: '0% 50%', rotate: baseRotation },
          {
            ease: 'none',
            rotate: 0,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top bottom',
              end: clampToScroll(rotationEnd),
              scrub
            }
          }
        );
      }
      gsap.to(state, {
        p: 1,
        ease: 'none',
        onUpdate: render,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: () => `top bottom-=${0.2 * Math.min(el.offsetHeight, viewportHeight())}`,
          end: clampToScroll(wordAnimationEnd),
          scrub
        }
      });
    }
  }

  function initScrollReveal() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[ScrollReveal] GSAP or ScrollTrigger not loaded.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

      // Reveal readable page copy and project labels, while leaving navigation,
      // controls, and the dedicated page hero untouched.
    const selector = [
      '.view-mode-scroll section:not(.page-hero-section) .reveal-big-statement',
      '.view-mode-scroll section:not(.page-hero-section) .reveal-card-title',
      '.view-mode-scroll section:not(.page-hero-section) .reveal-paragraph',
      '.view-mode-scroll section:not(.page-hero-section) h2',
      '.view-mode-scroll section:not(.page-hero-section) h3',
      '.view-mode-scroll section:not(.page-hero-section) h4',
      '.view-mode-scroll section:not(.page-hero-section) p',
      '.view-mode-scroll section:not(.page-hero-section) .reveal-card-tag',
      '.view-mode-scroll section:not(.page-hero-section) .project-badge-cat',
      '.view-mode-scroll section:not(.page-hero-section) .coming-soon-tag-sub',
      '.view-mode-scroll section:not(.page-hero-section) .contact-heading-lime',
      '.view-mode-scroll section:not(.page-hero-section) .contact-coords-list > div',
      '.view-mode-scroll section:not(.page-hero-section) [data-scroll-reveal]'
    ].join(', ');

    const allCandidates = Array.from(document.querySelectorAll(selector));

    allCandidates.forEach(el => {
        // Guard against hero section or hero text
      if (el.closest('.page-hero-section') || el.matches('.page-hero-title')) return;
        // Dialog copy is shown on demand and should not start in a hidden reveal state.
        if(el.closest('dialog, [hidden]')) return;
        // Keep text inside interactive controls stable and easy to read.
        if(el.closest('button, a, [role="button"], [role="tab"], .btn-transmit, .btn-control')) return;
        // Guard against empty nodes
      if (!el.textContent || !el.textContent.trim()) return;

      const tagName = el.tagName.toLowerCase();
      let defaultOptions = {
        effect: 'scale',
        mode: 'scrub',
        enableBlur: true,
        blurStrength: 4,
        baseOpacity: 0.12,
        stagger: 0.075
      };

      if (el.classList.contains('reveal-big-statement')) {
        defaultOptions.baseRotation = 1.5;
        defaultOptions.highlightColor = '#d4ff00';
        defaultOptions.blurStrength = 5.5;
        defaultOptions.baseOpacity = 0.08;
        defaultOptions.stagger = 0.09;
      } else if (el.classList.contains('reveal-card-title') || tagName === 'h2') {
        defaultOptions.baseRotation = 1;
        defaultOptions.highlightColor = '#d4ff00';
        defaultOptions.blurStrength = 4.5;
        defaultOptions.stagger = 0.08;
      } else if (tagName === 'h3') {
        defaultOptions.baseRotation = 0;
        defaultOptions.highlightColor = '';
        defaultOptions.blurStrength = 3.5;
        defaultOptions.stagger = 0.075;
      } else {
          // Paragraphs and body text
        defaultOptions.baseRotation = 0;
        defaultOptions.highlightColor = '';
        defaultOptions.blurStrength = 3.5;
        defaultOptions.baseOpacity = 0.12;
        defaultOptions.stagger = 0.07;
      }

      applyScrollReveal(el, defaultOptions);
    });

      // Refresh triggers on window load to ensure all asset layout dimensions are finalized
    window.addEventListener('load', () => {
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
    });
  }

    // Export helper globally if needed
  window.ScrollRevealEngine = {
      init: initScrollReveal,
      apply: applyScrollReveal
    };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollReveal);
  } else {
    initScrollReveal();
  }
})();
