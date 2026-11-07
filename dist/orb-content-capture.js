(function () {
  const captureCanvas = document.createElement('canvas');
  const context = captureCanvas.getContext('2d', { alpha: true });
  const MAX_CAPTURE_PIXELS = 560000;
  const CAPTURE_INTERVAL = 1000 / 24;
  let lastCapture = 0;
  let revision = 0;
  let state = null;

  const overlaps = (rect, left, top, right, bottom) =>
    rect.right > left && rect.left < right && rect.bottom > top && rect.top < bottom;

  const excluded = element =>
    element.id === 'story-canvas' ||
    element.classList?.contains('orb-hand-glow') ||
    element.classList?.contains('orb-hand-target') ||
    /^(SCRIPT|STYLE|LINK|META|NOSCRIPT)$/i.test(element.tagName);

  const isSameOrigin = source => {
    if (!source) return false;
    if (/^(data:|blob:)/i.test(source)) return true;
    try {
      return new URL(source, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  };

  const roundedRect = (ctx, rect, radius) => {
    const r = Math.max(0, Math.min(radius, rect.width / 2, rect.height / 2));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(rect.left, rect.top, rect.width, rect.height, r);
    } else {
      ctx.rect(rect.left, rect.top, rect.width, rect.height);
    }
  };

  const drawImageElement = (ctx, element, rect, style, alpha) => {
    const tag = element.tagName;
    const isImage = tag === 'IMG' && element.complete && element.naturalWidth > 0 && isSameOrigin(element.currentSrc || element.src);
    const isVideo = tag === 'VIDEO' && element.readyState >= 2 && isSameOrigin(element.currentSrc || element.src);
    const isCanvas = tag === 'CANVAS' && element.id !== 'story-canvas' && element.width > 0 && element.height > 0;
    if (!isImage && !isVideo && !isCanvas) return false;

    const width = isImage ? element.naturalWidth : isVideo ? element.videoWidth : element.width;
    const height = isImage ? element.naturalHeight : isVideo ? element.videoHeight : element.height;
    if (!width || !height) return false;

    const fit = style.objectFit || 'fill';
    let drawWidth = rect.width;
    let drawHeight = rect.height;
    if (fit === 'cover' || fit === 'contain') {
      const scale = fit === 'cover'
        ? Math.max(rect.width / width, rect.height / height)
        : Math.min(rect.width / width, rect.height / height);
      drawWidth = width * scale;
      drawHeight = height * scale;
    }

    try {
      ctx.save();
      ctx.globalAlpha = alpha;
      roundedRect(ctx, rect, parseFloat(style.borderTopLeftRadius) || 0);
      ctx.clip();
      ctx.drawImage(element, rect.left + (rect.width - drawWidth) / 2, rect.top + (rect.height - drawHeight) / 2, drawWidth, drawHeight);
      ctx.restore();
      return true;
    } catch (err) {
      ctx.restore();
      return false;
    }
  };

  const parseGradientStops = (bg) => {
    const stopRegex = /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s*(\d+%)?/g;
    let match;
    const stops = [];
    while ((match = stopRegex.exec(bg))) {
      stops.push({
        color: match[1],
        pos: match[2] ? parseFloat(match[2]) / 100 : null
      });
    }
    return stops;
  };

  const drawBackgroundGradient = (ctx, element, rect, style, alpha, radius) => {
    const bgImg = style.backgroundImage;
    if (!bgImg || bgImg === 'none') return false;

    // 1. Radial gradient (e.g. card-noise-bg, section radial auras)
    if (bgImg.includes('radial-gradient')) {
      const stops = parseGradientStops(bgImg);
      if (stops.length > 0) {
        let cx = rect.left + rect.width * 0.5;
        let cy = rect.top + rect.height; // default bottom center (50% 100%)
        if (bgImg.includes('at 50% 50%') || bgImg.includes('at center')) {
          cy = rect.top + rect.height * 0.5;
        } else if (bgImg.includes('at 50% 100%')) {
          cy = rect.top + rect.height;
        }
        const maxR = Math.max(rect.width, rect.height) * 1.15;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        stops.forEach((s, i) => {
          const offset = s.pos !== null ? s.pos : i / Math.max(1, stops.length - 1);
          grad.addColorStop(Math.min(1, Math.max(0, offset)), s.color);
        });
        grad.addColorStop(1, stops[stops.length - 1].color);

        ctx.save();
        ctx.globalAlpha = alpha;
        roundedRect(ctx, rect, radius);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
        return true;
      }
    }

    // 2. Linear gradient
    if (bgImg.includes('linear-gradient')) {
      const stops = parseGradientStops(bgImg);
      if (stops.length > 0) {
        let x0 = rect.left, y0 = rect.top, x1 = rect.left + rect.width, y1 = rect.top + rect.height;
        if (bgImg.includes('to bottom') || bgImg.includes('180deg')) {
          x1 = rect.left;
        } else if (bgImg.includes('to right') || bgImg.includes('90deg')) {
          y1 = rect.top;
        }
        const grad = ctx.createLinearGradient(x0, y0, x1, y1);
        stops.forEach((s, i) => {
          const offset = s.pos !== null ? s.pos : i / Math.max(1, stops.length - 1);
          grad.addColorStop(Math.min(1, Math.max(0, offset)), s.color);
        });
        ctx.save();
        ctx.globalAlpha = alpha;
        roundedRect(ctx, rect, radius);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
        return true;
      }
    }

    return false;
  };

  const drawTextNode = (ctx, node, bounds, style, alpha) => {
    const text = node.nodeValue || '';
    if (!text.trim() || !style || style.visibility === 'hidden' || style.display === 'none') return false;
    let color = style.webkitTextFillColor && style.webkitTextFillColor !== 'rgba(0, 0, 0, 0)' && style.webkitTextFillColor !== 'transparent'
      ? style.webkitTextFillColor
      : style.color;

    // Gradient text support (e.g. h4 headers with -webkit-background-clip: text)
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
      if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
        const match = style.backgroundImage.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
        if (match) color = match[1];
      }
    }
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return false;

    const fontSize = parseFloat(style.fontSize) || 16;
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = style.font || `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.direction = style.direction || 'inherit';
    if ('letterSpacing' in ctx && style.letterSpacing && style.letterSpacing !== 'normal') {
      ctx.letterSpacing = style.letterSpacing;
    }

    const range = document.createRange();
    const words = /\S+/g;
    let match;
    while ((match = words.exec(text))) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height || !overlaps(rect, bounds.left, bounds.top, bounds.right, bounds.bottom)) continue;
      let word = match[0];
      if (style.textTransform === 'uppercase') word = word.toLocaleUpperCase();
      else if (style.textTransform === 'lowercase') word = word.toLocaleLowerCase();
      else if (style.textTransform === 'capitalize') word = word.charAt(0).toLocaleUpperCase() + word.slice(1);
      const ascent = fontSize * 0.82;
      const baseline = rect.top + Math.max(ascent, (lineHeight - fontSize) / 2 + ascent);
      ctx.fillText(word, rect.left, baseline);
    }
    ctx.restore();
    return true;
  };

  window.__captureOrbContent = function (centerX, centerY, radius, viewWidth, viewHeight, deviceRatio) {
    const now = performance.now();
    if (state && now - lastCapture < CAPTURE_INTERVAL) return state;
    lastCapture = now;

    // Track live 3D orb coordinates for reciprocal Ghost Fibers interaction
    window.__orbState = { x: centerX, y: centerY, radius: radius, active: true };

    const captureWidth = Math.min(viewWidth, Math.max(1, radius * 4.2));
    const captureHeight = Math.min(viewHeight, Math.max(1, radius * 4.2));
    const left = Math.max(0, Math.min(viewWidth - captureWidth, centerX - captureWidth / 2));
    const top = Math.max(0, Math.min(viewHeight - captureHeight, centerY - captureHeight / 2));
    const ratio = Math.max(0.35, Math.min(deviceRatio || 1, 1, Math.sqrt(MAX_CAPTURE_PIXELS / (captureWidth * captureHeight))));
    const pixelWidth = Math.max(1, Math.round(captureWidth * ratio));
    const pixelHeight = Math.max(1, Math.round(captureHeight * ratio));
    if (captureCanvas.width !== pixelWidth || captureCanvas.height !== pixelHeight) {
      captureCanvas.width = pixelWidth;
      captureCanvas.height = pixelHeight;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.setTransform(ratio, 0, 0, ratio, -left * ratio, -top * ratio);

    let hasContent = false;

    const bounds = { left, top, right: left + captureWidth, bottom: top + captureHeight };
    const styles = new WeakMap();
    const alphaCache = new WeakMap();
    const getStyle = element => {
      if (!styles.has(element)) styles.set(element, getComputedStyle(element));
      return styles.get(element);
    };
    const opacityOf = element => {
      if (!element || element === document.documentElement) return 1;
      if (alphaCache.has(element)) return alphaCache.get(element);
      const style = getStyle(element);
      const own = style.visibility === 'hidden' || style.display === 'none' ? 0 : Math.max(0, Math.min(1, parseFloat(style.opacity) || 0));
      const alpha = own * opacityOf(element.parentElement);
      alphaCache.set(element, alpha);
      return alpha;
    };

    let ghostFibersDrawn = false;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node;
        if (excluded(element)) continue;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height || !overlaps(rect, bounds.left, bounds.top, bounds.right, bounds.bottom)) continue;
        const style = getStyle(element);
        const alpha = opacityOf(element);
        if (!alpha || style.visibility === 'hidden' || style.display === 'none') continue;

        let radius = parseFloat(style.borderTopLeftRadius) || 0;
        if (element.classList?.contains('card-noise-bg') && element.parentElement) {
          radius = parseFloat(getStyle(element.parentElement).borderTopLeftRadius) || 14;
        }

        // 1. Draw CSS Background Gradient if present (e.g. card-noise-bg, linear gradients)
        const drewGradient = drawBackgroundGradient(context, element, rect, style, alpha, radius);
        if (drewGradient) hasContent = true;

        // 2. Draw Solid Background Color (skip if container has card-noise-bg to keep gradient pure)
        const hasNoiseBgChild = element.querySelector?.('.card-noise-bg');
        if (!hasNoiseBgChild && style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
          context.save();
          context.globalAlpha = alpha;
          context.fillStyle = style.backgroundColor;
          roundedRect(context, rect, radius);
          context.fill();
          context.restore();
          hasContent = true;
        }

        // 3. Draw Border if present
        if (parseFloat(style.borderTopWidth) > 0 && style.borderTopColor && style.borderTopColor !== 'transparent' && style.borderTopColor !== 'rgba(0, 0, 0, 0)') {
          context.save();
          context.globalAlpha = alpha;
          context.strokeStyle = style.borderTopColor;
          context.lineWidth = parseFloat(style.borderTopWidth);
          roundedRect(context, rect, radius);
          context.stroke();
          context.restore();
          hasContent = true;
        }

        if (drawImageElement(context, element, rect, style, alpha)) {
          hasContent = true;
          if (element.classList?.contains('ghost-fibers-canvas')) {
            ghostFibersDrawn = true;
          }
        }
      } else {
        const parent = node.parentElement;
        if (!parent || excluded(parent)) continue;
        const alpha = opacityOf(parent);
        if (!alpha) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height || !overlaps(rect, bounds.left, bounds.top, bounds.right, bounds.bottom)) continue;
        if (drawTextNode(context, node, bounds, getStyle(parent), alpha)) hasContent = true;
      }
    }

      // Safety fallback: if ghost fibers canvas was not encountered in the DOM walk(e.g.shadow DOM or detached container), draw active canvas now
    if (!ghostFibersDrawn) {
      let ghostCanvas = window.__activeGhostFibersCanvas || window.__ghostFibersCanvas;
      if (!ghostCanvas || ghostCanvas.width === 0 || ghostCanvas.height === 0 || !ghostCanvas.isConnected) {
        const allGhostCanvases = document.querySelectorAll('.ghost-fibers-canvas');
        for (let i = 0; i < allGhostCanvases.length; i++) {
          const c = allGhostCanvases[i];
          if (c.width > 0 && c.height > 0) {
            const r = c.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              ghostCanvas = c;
              break;
            }
          }
        }
      }
      if (ghostCanvas && ghostCanvas.width > 0 && ghostCanvas.height > 0) {
        const ghostRect = ghostCanvas.getBoundingClientRect();
        if (overlaps(ghostRect, bounds.left, bounds.top, bounds.right, bounds.bottom)) {
          try {
            context.save();
            context.globalAlpha = 1.0;
            context.drawImage(ghostCanvas, ghostRect.left, ghostRect.top, ghostRect.width, ghostRect.height);
            context.restore();
            hasContent = true;
          } catch (err) { }
        }
      }
    }

    state = {
      canvas: captureCanvas,
      rect: [left / viewWidth, top / viewHeight, captureWidth / viewWidth, captureHeight / viewHeight],
      hasContent,
      revision: ++revision
    };
    return state;
  };
})();
