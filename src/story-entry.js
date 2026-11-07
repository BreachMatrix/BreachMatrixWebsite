import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================================
   REACT - BITS FLUID GLASS WEBGL2 SHADER SYSTEM
   Raymarched refractive glass with chromatic dispersion, caustics, and wobble
   ============================================================================ */

const PIXEL_BUDGET = 5e6;
const SHADOW_SIZE = 160;
const SHAPES = ['icosahedron', 'geodesic'];
const EXTENT = { icosahedron: 1.05, geodesic: 1.02, diamond: 1.05, prism: 1.18, lens: 1.02, cube: 1.32, pill: 1.02, torus: 1.0, blob: 1.08 };
const BASE = {
  icosahedron: [0.15, 0.25, 0.0],
  geodesic: [0.0, 0.0, 0.0],
  lens: [0, 0, 0],
  blob: [0.2, 0, 0],
  cube: [-0.48, 0.62, 0.0],
  pill: [0.0, 0.0, 0.0],
  torus: [-0.5, 0.18, 0.0],
  prism: [-0.3, 0.45, 0.0],
  diamond: [-0.35, 0.5, 0.0]
};
const SPIN = {
  icosahedron: [1, 1],
  geodesic: [1, 1],
  lens: [0, 0],
  blob: [1, 0],
  cube: [1, 0],
  pill: [0, 0],
  torus: [0, 1],
  prism: [1, 0],
  diamond: [1, 0]
};

const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`;

const CONTENT = `#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uRatio;
uniform sampler2D uMedia;
uniform vec4 uMediaRect;
uniform float uMediaOn;
uniform sampler2D uText;
uniform float uTextOn;
uniform vec4 uBackground;
out vec4 fragColor;

void main() {
  vec2 w = gl_FragCoord.xy / uRatio;
  vec2 uv = vec2(w.x, uView.y - w.y) / uView;
  vec4 color = uBackground;
  if (uMediaOn > 0.5) {
    vec2 m = (uv - uMediaRect.xy) / uMediaRect.zw;
    if (m.x >= 0.0 && m.y >= 0.0 && m.x <= 1.0 && m.y <= 1.0) {
      vec4 media = texture(uMedia, m);
      color = media + color * (1.0 - media.a);
    }
  }
  if (uTextOn > 0.5) {
    vec4 text = texture(uText, uv);
    color = text + color * (1.0 - text.a);
  }
  fragColor = color;
}`;

const SDF = {
  icosahedron: `{
    vec3 ap = abs(p);
    float d = dot(ap, vec3(0.57735027)) - 0.85;
    d = max(d, dot(ap, vec3(0.0, 0.3568221, 0.9341724)) - 0.85);
    d = max(d, dot(ap, vec3(0.9341724, 0.0, 0.3568221)) - 0.85);
    d = max(d, dot(ap, vec3(0.3568221, 0.9341724, 0.0)) - 0.85);
    return d - 0.012;
  }`,
  geodesic: `{
    vec3 ap = abs(p);
    float d = dot(ap, vec3(0.57735027)) - 0.88;
    d = max(d, dot(ap, vec3(0.0, 0.3568221, 0.9341724)) - 0.88);
    d = max(d, dot(ap, vec3(0.9341724, 0.0, 0.3568221)) - 0.88);
    d = max(d, dot(ap, vec3(0.3568221, 0.9341724, 0.0)) - 0.88);
    d = max(d, dot(ap, vec3(0.8506508, 0.5257311, 0.0)) - 0.91);
    d = max(d, dot(ap, vec3(0.0, 0.8506508, 0.5257311)) - 0.91);
    d = max(d, dot(ap, vec3(0.5257311, 0.0, 0.8506508)) - 0.91);
    return d - 0.012;
  }`,
  lens: `{
    float a = length(p - vec3(0.0, 0.0, -1.85)) - 2.13;
    float b = length(p - vec3(0.0, 0.0, 1.85)) - 2.13;
    float h = clamp(0.5 - 0.5 * (b - a) / 0.2, 0.0, 1.0);
    return mix(b, a, h) + 0.2 * h * (1.0 - h);
  }`,
  blob: `{
    vec3 q = p * 1.6;
    float t = uTime;
    float n = sin(q.x + t * 1.1) * sin(q.y * 1.15 - t * 0.9) * sin(q.z * 0.95 + t * 0.8);
    n += 0.45 * sin(q.x * 1.6 - t * 0.6 + q.z) * sin(q.y * 1.9 + t * 1.2 + q.x * 0.5);
    return (length(p) - 0.92 - 0.085 * n) * 0.78;
  }`,
  cube: `{
    vec3 q = abs(p) - vec3(0.6);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.16;
  }`,
  pill: `{
    float outline = length(vec2(max(abs(p.x) - 0.58, 0.0), p.y)) - 0.42;
    vec2 q = vec2(outline + 0.16, abs(p.z) - 0.16);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.16;
  }`,
  torus: `{
    vec2 q = vec2(length(p.xy) - 0.68, p.z);
    return length(q) - 0.3;
  }`,
  prism: `{
    vec3 q = abs(p);
    float side = max(q.x * 0.866025 + p.y * 0.5, -p.y) - 0.5;
    float d = max(q.z - 0.34, side);
    return d - 0.08;
  }`,
  diamond: `{
    vec3 q = abs(p);
    return (q.x + q.y * 0.92 + q.z * 1.25 - 0.98) * 0.5;
  }`
};

const SUPERSAMPLE = `
  float rim = tr.mode > 1.5 ? 1.0 - smoothstep(0.3, 0.55, clamp(-dot(rd, tr.n), 0.0, 1.0)) : tr.mode;
  if (rim > 0.0) {
    vec2 offsets[3] = vec2[3](vec2(0.33, 0.33), vec2(-0.33, 0.25), vec2(0.25, -0.33));
    float scatter = (length(tx) + length(ty)) / max(uBound, 1.0);
    for (int k = 0; k < 3; k++) {
      vec2 sub = w + offsets[k] * pixel;
      vec3 subDir = normalize(vec3(sub, 0.0) - camera);
      Trace st = traceSurface(ro, subDir, eps, pixel);
      if (st.mode > 1.5 && (uTint.a > 0.0 || bandOf(clamp(-dot(subDir, st.n), 0.0, 1.0), scatter) < 1.0)) {
        traceInterior(st, subDir, eps);
      }
      color += shadeTrace(st, subDir, background, tone, sub, tx, ty, rx, ry);
    }
    color *= 0.25;
  }`;

const fragmentFor = (a, b, supersample) => `#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uRatio;
uniform float uFocal;
uniform vec3 uCenter;
uniform mat3 uInverse;
uniform float uScale;
uniform float uBound;
uniform float uMorph;
uniform float uRipple;
uniform float uTime;
uniform float uIor;
uniform float uDispersion;
uniform float uReflection;
uniform float uFrost;
uniform vec4 uTint;
uniform float uShadow;
uniform vec3 uLight;
uniform float uPresence;
uniform sampler2D uMedia;
uniform vec4 uMediaRect;
uniform float uMediaOn;
uniform sampler2D uText;
uniform float uTextOn;
uniform vec4 uBackground;
uniform float uPass;
uniform sampler2D uShadowMap;
uniform vec4 uShadowBox;
uniform vec2 uShadowSize;
out vec4 fragColor;

float shapeA(vec3 p) ${SDF[a]}
float shapeB(vec3 p) ${SDF[b]}

float field(vec3 p) {
  float d = shapeA(p);
  ${a !== b ? 'd = mix(d, shapeB(p), uMorph);' : ''}
  if (uRipple > 0.0) {
    d += uRipple * sin(p.x * 3.1 + uTime * 2.3) * sin(p.y * 3.4 - uTime * 1.9) * sin(p.z * 2.9 + uTime * 1.6);
  }
  return d;
}

float map(vec3 w) {
  return field(uInverse * (w - uCenter)) * uScale;
}

vec3 normalAt(vec3 w) {
  float e = 0.35;
  vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * map(w + k.xyy * e) +
    k.yyx * map(w + k.yyx * e) +
    k.yxy * map(w + k.yxy * e) +
    k.xxx * map(w + k.xxx * e)
  );
}

vec4 content(vec2 w, vec2 gx, vec2 gy) {
  vec2 uv = vec2(w.x, uView.y - w.y) / uView;
  vec2 dx = vec2(gx.x, -gx.y) / uView;
  vec2 dy = vec2(gy.x, -gy.y) / uView;
  vec4 color = uBackground;
  if (uMediaOn > 0.5) {
    vec2 m = (uv - uMediaRect.xy) / uMediaRect.zw;
    vec2 inside = step(vec2(0.0), m) * step(m, vec2(1.0));
    vec4 media = textureGrad(uMedia, m, dx / uMediaRect.zw, dy / uMediaRect.zw) * inside.x * inside.y;
    color = media + color * (1.0 - media.a);
  }
  if (uTextOn > 0.5) {
    vec4 text = textureGrad(uText, uv, dx, dy);
    color = text + color * (1.0 - text.a);
  }
  return color;
}

vec4 frosted(vec2 w, vec2 gx, vec2 gy) {
  if (uFrost <= 0.0) return content(w, gx, gy);
  float r = uFrost * 16.0;
  vec2 bx = gx + vec2(r * 0.35, 0.0);
  vec2 by = gy + vec2(0.0, r * 0.35);
  vec4 sum = content(w, bx, by) * 0.2;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398 + 0.3;
    sum += content(w + vec2(cos(a), sin(a)) * r * (0.55 + 0.45 * float(i & 1)), bx, by) * 0.1;
  }
  return sum;
}

vec3 studio(vec3 d) {
  vec2 a = vec2(atan(d.x, d.z), d.y);
  float key = smoothstep(0.42, 0.22, abs(a.x + 0.62)) * smoothstep(0.3, 0.12, abs(a.y - 0.5));
  float strip = smoothstep(0.12, 0.05, abs(a.x - 0.95)) * smoothstep(0.8, 0.35, abs(a.y - 0.05));
  float dome = smoothstep(0.0, 1.0, d.z) * 0.04;
  return vec3(18.0) * key + vec3(8.0) * strip + vec3(dome);
}

vec4 light(vec3 d, float weight) {
  vec3 c = studio(d) * weight;
  float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
  return vec4(min(c, vec3(a)), a);
}

vec2 landing(vec3 o, vec3 d, vec2 fallback) {
  if (d.z > -0.0005) return fallback;
  return o.xy + d.xy * (-o.z / d.z);
}

float shadowAt(vec2 w, out float caustic) {
  caustic = 0.0;
  if (uShadow <= 0.0) return 0.0;
  vec3 p = vec3(w, 0.0);
  vec2 footprint = uCenter.xy + uLight.xy / uLight.z * uCenter.z;
  if (length(w - footprint) > uBound * 1.6) return 0.0;
  float t = 2.0;
  float occlusion = 1.0;
  float deepest = 1e5;
  for (int i = 0; i < 28; i++) {
    float h = map(p + uLight * t);
    deepest = min(deepest, h);
    if (h > 0.0) occlusion = min(occlusion, 6.0 * h / t);
    if (t > uCenter.z * 2.6 + uBound * 2.0) break;
    t += clamp(abs(h) * 0.8, 2.0, uBound * 0.25);
  }
  if (deepest > 0.0) return (1.0 - clamp(occlusion, 0.0, 1.0)) * 0.36;
  float depth = -deepest / max(uBound, 1.0);
  caustic = smoothstep(0.12, 0.5, depth) * (uIor - 1.0) * 2.0;
  return exp(-depth * 14.0) * 0.42;
}

vec2 shadowSample(vec2 w) {
  if (uShadow <= 0.0) return vec2(0.0);
  vec2 uv = (w - uShadowBox.xy) / uShadowBox.zw;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec2(0.0);
  vec2 s = textureLod(uShadowMap, uv, 0.0).rg;
  return vec2(s.x * 0.42, s.y * 2.0);
}

vec2 lighting(vec2 w, float under) {
  vec2 s = shadowSample(w);
  float dark = s.x * uShadow * uPresence;
  float glow = clamp(s.y * uShadow * uPresence, 0.0, 1.0) * mix(0.12, 0.3, under);
  return vec2(dark * mix(0.45, 1.0, under), glow);
}

vec4 shade(vec4 color, vec2 factors) {
  vec3 rgb = color.rgb * (1.0 - factors.x);
  float alpha = color.a + factors.x - color.a * factors.x;
  rgb = vec3(factors.y) + rgb * (1.0 - factors.y);
  alpha = factors.y + alpha * (1.0 - factors.y);
  return vec4(rgb, alpha);
}

struct Trace {
  float mode;
  float cover;
  vec3 p;
  vec3 n;
  vec3 q;
  vec3 inside;
  vec3 exitNormal;
  vec3 exitDir;
  float escaped;
  float travel;
  float bounces;
};

Trace traceSurface(vec3 ro, vec3 rd, float eps, float pixel) {
  Trace tr;
  tr.mode = 0.0;
  tr.cover = 0.0;
  tr.p = vec3(0.0);
  tr.n = vec3(0.0, 0.0, 1.0);
  tr.q = vec3(0.0);
  tr.inside = vec3(0.0, 0.0, -1.0);
  tr.exitNormal = vec3(0.0, 0.0, 1.0);
  tr.exitDir = vec3(0.0, 0.0, -1.0);
  tr.escaped = 0.0;
  tr.travel = 0.0;
  tr.bounces = 0.0;
  vec3 oc = ro - uCenter;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - uBound * uBound;
  float disc = b * b - c;
  if (disc <= 0.0 || uPresence <= 0.0) return tr;
  float sq = sqrt(disc);
  float t = max(-b - sq, 0.0);
  float tEnd = -b + sq;
  float closest = 1e5;
  float closestT = t;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    float d = map(ro + rd * t);
    if (d < closest) {
      closest = d;
      closestT = t;
    }
    if (d < eps) {
      hit = true;
      break;
    }
    t += d * 0.9;
    if (t > tEnd) break;
  }
  if (!hit && closest < pixel * 0.35) {
    hit = true;
    t = closestT;
  }
  if (!hit) {
    tr.cover = clamp(1.0 - closest / (pixel * 1.2), 0.0, 1.0) * uPresence;
    if (tr.cover > 0.0) {
      tr.mode = 1.0;
      tr.p = ro + rd * closestT;
      tr.n = normalAt(tr.p);
    }
    return tr;
  }
  tr.mode = 2.0;
  tr.p = ro + rd * t;
  tr.n = normalAt(tr.p);
  return tr;
}

void traceInterior(inout Trace tr, vec3 rd, float eps) {
  vec3 inside = refract(rd, tr.n, 1.0 / uIor);
  vec3 q = tr.p + inside * eps * 4.0;
  vec3 exitDir = inside;
  bool escaped = false;
  for (int bounce = 0; bounce < 3; bounce++) {
    for (int i = 0; i < 64; i++) {
      float d = map(q);
      if (d > -eps) break;
      float stepLength = max(-d * 0.9, eps);
      q += inside * stepLength;
      tr.travel += stepLength;
    }
    vec3 n2 = normalAt(q);
    tr.exitNormal = n2;
    vec3 out1 = refract(inside, -n2, uIor);
    if (dot(out1, out1) > 0.0) {
      exitDir = out1;
      escaped = true;
      break;
    }
    inside = reflect(inside, -n2);
    q += inside * eps * 4.0;
    tr.bounces += 1.0;
  }
  if (!escaped) exitDir = inside;
  if (exitDir.z > -0.2) exitDir = normalize(vec3(exitDir.xy, -0.2 - abs(exitDir.z)));
  tr.q = q;
  tr.inside = inside;
  tr.exitDir = exitDir;
  tr.escaped = escaped ? 1.0 : 0.0;
}

float bandOf(float cosi, float scatter) {
  return max(smoothstep(0.42, 0.12, cosi), smoothstep(0.06, 0.24, scatter));
}

vec4 shadeTrace(Trace tr, vec3 rd, vec4 background, vec4 tone, vec2 w, vec2 tx, vec2 ty, vec2 rx, vec2 ry) {
  if (tr.mode < 0.5) return background;
  vec3 mirrorDir = reflect(rd, tr.n);
  if (tr.mode < 1.5) {
    vec4 edgeTone = tone * uReflection * 0.8 + light(mirrorDir, uReflection) * 0.5;
    return mix(background, edgeTone + background * (1.0 - edgeTone.a), tr.cover * 0.7);
  }
  float cosi = clamp(-dot(rd, tr.n), 0.0, 1.0);
  float f0 = pow((uIor - 1.0) / (uIor + 1.0), 2.0);
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - cosi, 5.0);
  float band = bandOf(cosi, (length(tx) + length(ty)) / max(uBound, 1.0));

  vec4 mirror = tone * uReflection;
  vec4 transmitted = tone;
  if (band < 1.0) {
    mirror = mirrorDir.z < -0.0005 ? frosted(landing(tr.p, mirrorDir, w), rx, ry) * uReflection : light(mirrorDir, uReflection);
    vec2 hitT = landing(tr.q, tr.exitDir, w);
    vec4 green = frosted(hitT, tx, ty);
    vec4 red = green;
    vec4 blue = green;
    if (tr.escaped > 0.5 && uDispersion > 0.0) {
      vec3 spread = vec3(-1.0, 0.0, 1.0) * uDispersion * 0.06;
      vec3 dirR = refract(tr.inside, -tr.exitNormal, uIor + spread.x);
      vec3 dirB = refract(tr.inside, -tr.exitNormal, uIor + spread.z);
      if (dot(dirR, dirR) > 0.0 && dirR.z < -0.2) red = frosted(landing(tr.q, dirR, hitT), tx, ty);
      if (dot(dirB, dirB) > 0.0 && dirB.z < -0.2) blue = frosted(landing(tr.q, dirB, hitT), tx, ty);
    }
    vec2 factors = lighting(hitT, 0.0);
    red = shade(red, factors);
    green = shade(green, factors);
    blue = shade(blue, factors);
    transmitted = mix(vec4(red.r, green.g, blue.b, green.a), tone, band);
    mirror = mix(mirror, tone * uReflection, band);
  }

  vec3 tint = pow(max(uTint.rgb, vec3(0.001)), vec3(uTint.a * tr.travel / max(uBound, 1.0)));
  transmitted.rgb *= tint;
  float body = (1.0 - dot(tint, vec3(0.3333))) * 0.7;
  transmitted += vec4(uTint.rgb * body, body) * (1.0 - transmitted.a);

  vec4 reflected = mirrorDir.z < -0.0005 ? mirror * fresnel : light(mirrorDir, uReflection * fresnel);
  vec4 glass = reflected + transmitted * (1.0 - reflected.a);
  float edge = 1.0 - smoothstep(0.04, 0.3, cosi);
  glass = mix(glass, mirror + background * (1.0 - mirror.a), edge);
  vec2 facing = normalize(vec2(-0.42, 0.55));
  float rimLight = pow(1.0 - cosi, 3.0) * (0.25 + 0.75 * abs(dot(normalize(tr.n.xy + 1e-5), facing))) * 0.55 * uReflection;
  rimLight *= smoothstep(0.0, 0.08, cosi);
  glass = vec4(rimLight) + glass * (1.0 - rimLight);
  return mix(background, glass, uPresence);
}

void main() {
  if (uPass > 0.5) {
    float caustic;
    float dark = shadowAt(uShadowBox.xy + gl_FragCoord.xy / uShadowSize * uShadowBox.zw, caustic);
    fragColor = vec4(dark / 0.42, caustic * 0.5, 0.0, 1.0);
    return;
  }
  vec2 w = gl_FragCoord.xy / uRatio;
  vec3 camera = vec3(uView * 0.5, uFocal);
  vec3 ro = camera;
  vec3 rd = normalize(vec3(w, 0.0) - camera);
  float pixel = 1.0 / uRatio;
  float eps = 0.25 * pixel;

  Trace tr = traceSurface(ro, rd, eps, pixel);
  if (tr.mode > 1.5) traceInterior(tr, rd, eps);
  vec2 hitT = tr.mode > 1.5 ? landing(tr.q, tr.exitDir, w) : w;
  vec2 hitR = tr.mode > 0.5 ? landing(tr.p, reflect(rd, tr.n), w) : w;
  vec2 tx = dFdx(hitT);
  vec2 ty = dFdy(hitT);
  vec2 rx = dFdx(hitR);
  vec2 ry = dFdy(hitR);
  vec2 wx = dFdx(w);
  vec2 wy = dFdy(w);

  vec2 lit = lighting(w, 1.0);
  vec4 background = vec4(0.0, 0.0, 0.0, lit.x * 0.45);
  vec4 tone = tr.mode > 0.5 ? content(uCenter.xy, vec2(uBound * 1.4, 0.0), vec2(0.0, uBound * 1.4)) : vec4(0.0);
  vec4 color = shadeTrace(tr, rd, background, tone, w, tx, ty, rx, ry);
  ${supersample ? SUPERSAMPLE : ''}
  fragColor = color;
}`;

// Math and Matrix Helpers
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseColor = value => {
  const text = String(value || '').trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const full = hex[1].length === 3 ? hex[1].replace(/./g, digit => digit + digit) : hex[1];
    return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16) / 255).concat(1);
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/i.exec(text);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return [rgb[1], rgb[2], rgb[3]].map(channel => clamp(parseFloat(channel) / 255, 0, 1)).concat(clamp(alpha, 0, 1));
  }
  return null;
};

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

const smoother = t => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

const quaternion = (x, y, z) => {
  const cx = Math.cos(x / 2);
  const sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2);
  const sz = Math.sin(z / 2);
  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz
  ];
};

const multiply = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];

const slerp = (a, b, t) => {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const target = dot < 0 ? b.map(value => -value) : b;
  dot = Math.abs(dot);
  if (dot > 0.9995) {
    const mixed = a.map((value, index) => value + (target[index] - value) * t);
    const length = Math.hypot(...mixed);
    return mixed.map(value => value / length);
  }
  const theta = Math.acos(dot);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return a.map((value, index) => value * wa + target[index] * wb);
};

const driftAt = (clock, size) => [
  Math.sin(clock * 0.37) * size * 0.35 + Math.sin(clock * 0.71 + 1.3) * size * 0.12,
  Math.sin(clock * 0.29 + 0.8) * size * 0.2 + Math.cos(clock * 0.53) * size * 0.08
];

const toMatrix = ([x, y, z, w]) => [
  1 - 2 * (y * y + z * z),
  2 * (x * y + z * w),
  2 * (x * z - y * w),
  2 * (x * y - z * w),
  1 - 2 * (x * x + z * z),
  2 * (y * z + x * w),
  2 * (x * z + y * w),
  2 * (y * z - x * w),
  1 - 2 * (x * x + y * y)
];

/* ============================================================================
   MAIN STORY LAYER ORCHESTRATOR
   ============================================================================ */

export function initStoryLayer() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('story') === 'off' || window.__STORY_LAYER === false) {
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // 1. Mount Canvas
  let canvas = document.getElementById('story-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'story-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
  }

  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none !important;
    z-index: 12 !important;
    display: block;
  `;

  // 2. Initialize Lenis Smooth Scroll
  const lenis = new Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.8,
  });

  window.__lenis = lenis;

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Hook into contact drawer & menu to pause / resume Lenis cleanly
  const modal = document.getElementById('secure-modal');
  if (modal) {
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('chat-drawer-open')) {
        lenis.stop();
      } else {
        lenis.start();
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // 3. WebGL2 Context
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return;

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const programs = new Map();

  const view = { width: window.innerWidth, height: window.innerHeight, ratio: Math.min(window.devicePixelRatio || 1, 2) };

  const request = (name) => {
    const key = name === 'content' ? name : `${name}>${view.ratio < 1.75 ? 1 : 0}`;
    if (programs.has(key)) return programs.get(key);
    const [a, b, sampled] = key.split('>');
    const fragment = compile(
      gl,
      gl.FRAGMENT_SHADER,
      key === 'content' ? CONTENT : fragmentFor(a, b, sampled === '1')
    );
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    const entry = { program, fragment, uniforms: null, failed: false };
    programs.set(key, entry);
    return entry;
  };

  const ready = (entry) => {
    if (entry.failed) return false;
    if (entry.uniforms) return true;
    if (parallel && !gl.getProgramParameter(entry.program, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(entry.program, gl.LINK_STATUS)) {
      entry.failed = true;
      return false;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(entry.program, gl.ACTIVE_UNIFORMS);
    for (let index = 0; index < count; index++) {
      const info = gl.getActiveUniform(entry.program, index);
      if (info) uniforms[info.name] = gl.getUniformLocation(entry.program, info.name);
    }
    entry.uniforms = uniforms;
    return true;
  };

  const vao = gl.createVertexArray();

  const makeTexture = () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
  };

  const mediaTexture = makeTexture();
  const textTexture = makeTexture();
  const shadowMap = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, shadowMap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW_SIZE, SHADOW_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const shadowTarget = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowTarget);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowMap, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Settings from specification: Polygonal Icosahedron Orb with Fluid Glass
  const isInitialMobile = window.innerWidth < 768;
  const initialAnchorX = isInitialMobile ? window.innerWidth * 0.5 : window.innerWidth * 0.62;
  const initialAnchorY = isInitialMobile ? window.innerHeight * 0.46 : window.innerHeight * 0.44;
  const initialSize = isInitialMobile ? Math.min(230, window.innerWidth * 0.58) : 500;

  const s = {
    shape: 'icosahedron',
    cycle: ['icosahedron'],
    size: initialSize,
    ior: 1.52,
    dispersion: 0.42,
    reflection: 1.6,
    frost: 0,
    color: [1.0, 1.0, 1.0, 1.0],
    tint: 0.0,
    shadow: 0.4,
    elevation: 0.35,
    smoothness: 0.52,
    wobble: 0.56,
    spin: 0.22,
    idle: true,
    morphOnClick: false,
    position: [initialAnchorX / window.innerWidth, initialAnchorY / window.innerHeight],
    intro: true,
    maxRatio: 1.75
  };

  const pointer = {
    x: initialAnchorX,
    y: initialAnchorY,
    inside: false,
    down: false,
    grabbed: false,
    offsetX: 0,
    offsetY: 0
  };

  const body = {
    x: initialAnchorX,
    y: initialAnchorY,
    vx: 0,
    vy: 0,
    spin: 0,
    ripple: 0,
    dirX: 1,
    dirY: 0,
    anchorX: initialAnchorX,
    anchorY: initialAnchorY
  };

const spring = { stretch: 1, vstretch: 0, tiltX: 0, vtiltX: 0, tiltY: 0, vtiltY: 0, scale: 0, vscale: 0 };
const morph = { from: s.shape, to: s.shape, t: 1, pending: null };
let requested = s.shape;
let presence = 0;
let time = 0;
let idleClock = Math.random() * 20;
let raf = 0;
let last = performance.now();
let current = null;

const resize = () => {
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, s.maxRatio);
  const width = Math.max(1, Math.round(cssWidth * ratio));
  const height = Math.max(1, Math.round(cssHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  view.width = cssWidth;
  view.height = cssHeight;
  view.ratio = width / cssWidth;
};

const radius = () => {
  return Math.min(s.size / 2, Math.min(view.width, view.height) * 0.48);
};

let captureState = null;
let uploadedCaptureRevision = -1;

const refreshPageCapture = () => {
  captureState = window.__captureOrbContent?.(body.x, body.y, radius(), view.width, view.height, view.ratio) || null;
  if (!captureState?.hasContent || captureState.revision === uploadedCaptureRevision) return;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, mediaTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, captureState.canvas);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  uploadedCaptureRevision = captureState.revision;
};

const step = (key, target, omega, zeta, dt) => {
  const velocity = `v${key}`;
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let index = 0; index < steps; index++) {
    spring[velocity] += (omega * omega * (target - spring[key]) - 2 * zeta * omega * spring[velocity]) * h;
    spring[key] += spring[velocity] * h;
  }
  const settled = Math.abs(target - spring[key]) < 0.0005 && Math.abs(spring[velocity]) < 0.002;
  if (settled) {
    spring[key] = target;
    spring[velocity] = 0;
  }
  return !settled;
};

const bindContent = (u) => {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, mediaTexture);
  gl.uniform1i(u.uMedia, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textTexture);
  gl.uniform1i(u.uText, 1);
  gl.uniform2f(u.uView, view.width, view.height);
  gl.uniform1f(u.uRatio, view.ratio);
  const rect = captureState?.rect || [0, 0, 1, 1];
  gl.uniform4f(u.uMediaRect, rect[0], rect[1], rect[2], rect[3]);
  gl.uniform1f(u.uMediaOn, captureState?.hasContent ? 1 : 0);
  gl.uniform1f(u.uTextOn, 0);
  gl.uniform4f(u.uBackground, 0, 0, 0, 0);
};

  // Render Frame
const frame = (now) => {
  raf = requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
  last = now;
  time += dt;

  // 1. Scroll & Hand Docking Tracker
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const currentScroll = window.__lenis?.scroll !== undefined ? window.__lenis.scroll : (window.scrollY || window.pageYOffset || 0);
  const scrollProgress = Math.min(Math.max(currentScroll / maxScroll, 0), 1);

  const handTarget = document.querySelector('.view-mode-scroll .orb-hand-target') ||
    document.querySelector('.orb-hand-target');
  const handGlow = document.querySelector('.view-mode-scroll .orb-hand-glow') ||
    document.querySelector('.orb-hand-glow');

  let dockFactor = 0;
  let targetPixelX = 0;
  let targetPixelY = 0;

  if (handTarget) {
    const rect = handTarget.getBoundingClientRect();
    if (rect.width > 0 || rect.top !== 0) {
      targetPixelX = rect.left + rect.width / 2;
      targetPixelY = rect.top + rect.height / 2;

      const viewportH = window.innerHeight;
      const distToView = rect.top - (viewportH * 0.55);
      const rampDist = viewportH * 0.85;
      const rawFactor = 1 - Math.min(Math.max(distToView / rampDist, 0), 1);
      const scrollBottomFactor = Math.min(Math.max((scrollProgress - 0.72) / 0.26, 0), 1);
      const blended = Math.max(rawFactor, scrollBottomFactor);
      dockFactor = blended * blended * (3 - 2 * blended);
    }
  }

  // Responsive Positions & Sizing
  const isDesk = view.width >= 1024;
  const isTablet = view.width >= 768 && view.width < 1024;
  const isMobile = view.width < 768;

  const heroAnchorX = isDesk ? view.width * 0.62 : (isTablet ? view.width * 0.64 : view.width * 0.5);
  const heroAnchorY = isMobile ? view.height * 0.46 : view.height * 0.44;
  const heroSize = isDesk ? 500 : (isTablet ? Math.min(380, view.width * 0.4) : Math.min(230, view.width * 0.58));

  // In responsive / mobile view: orb is strictly fixed in place in the hero section and does NOT travel below
  const isTravelOn = !isMobile && window.__orbTravelEnabled !== false && !document.body.classList.contains("orb-travel-off");
  const isDeckMode = !document.body.classList.contains("mode-scroll");
  const isDeckPastHero = isDeckMode && typeof currentSlideIndex !== "undefined" && currentSlideIndex > 0;

  const journeyX = heroAnchorX + Math.sin(scrollProgress * Math.PI * 1.5) * (view.width * 0.08);
  const journeyY = heroAnchorY + (scrollProgress * view.height * 0.22);
  const journeySize = heroSize - (scrollProgress * 280);

  let currentGoalX, currentGoalY, currentGoalSize;
  if (!isTravelOn) {
    // Locked strictly to Hero Section: stays with hero in world coordinates so it never blocks other sections
    currentGoalX = heroAnchorX;
    currentGoalY = isDeckPastHero ? -9999 : (heroAnchorY - currentScroll);
    currentGoalSize = heroSize;
    dockFactor = 0;
  } else if (dockFactor > 0) {
    currentGoalX = (1 - dockFactor) * journeyX + dockFactor * targetPixelX;
    currentGoalY = (1 - dockFactor) * journeyY + dockFactor * targetPixelY;
    // Fits majestically right into the character's open palm
    currentGoalSize = (1 - dockFactor) * journeySize + dockFactor * 185;

    if (dockFactor > 0.85) {
      const hoverHum = Math.sin(time * 2.2) * 3 * dockFactor;
      currentGoalY += hoverHum;
    }
  } else {
    currentGoalX = (1 - scrollProgress) * heroAnchorX + scrollProgress * journeyX;
    currentGoalY = (1 - scrollProgress) * heroAnchorY + scrollProgress * journeyY;
    currentGoalSize = (1 - scrollProgress) * heroSize + scrollProgress * journeySize;
  }

  s.size = currentGoalSize;

  // Hand glow aura illumination
  if (handGlow) {
    handGlow.style.opacity = (dockFactor * 0.95).toFixed(2);
    const glowPulse = 1.0 + Math.sin(time * 2.5) * 0.08;
    handGlow.style.transform = `translate(-50%, -50%) scale(${glowPulse})`;
  }

  // Morph state
  if (s.shape !== requested) {
    requested = s.shape;
    morph.pending = s.shape;
  }
  if (morph.pending && morph.t >= 1) {
    const key = `${morph.to}>${morph.pending}`;
    const entry = request(key);
    if (ready(entry)) {
      request(`${morph.pending}>${morph.pending}`);
      morph.from = morph.to;
      morph.to = morph.pending;
      morph.pending = null;
      morph.t = 0;
      spring.vstretch -= 2.5 * s.wobble;
    }
  }
  if (morph.t < 1) {
    morph.t = Math.min(1, morph.t + dt / 0.7);
  }

  const currentRadius = radius();
  const drifting = s.idle && dockFactor < 0.8;
  if (drifting) {
    idleClock += dt;
  }
  const drift = drifting ? driftAt(idleClock, currentRadius * 0.08) : [0, 0];

  // NO pointer influence on position! The orb position never moves or chases the cursor!
  let goalX = currentGoalX + drift[0];
  let goalY = currentGoalY + drift[1];

  const omega = 24 * Math.pow(0.18, s.smoothness);
  const substeps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / substeps;

  for (let index = 0; index < substeps; index++) {
    body.vx += (omega * omega * (goalX - body.x) - 2 * 0.86 * omega * body.vx) * h;
    body.vy += (omega * omega * (goalY - body.y) - 2 * 0.86 * omega * body.vy) * h;
    body.x += body.vx * h;
    body.y += body.vy * h;
  }

  const speed = Math.hypot(body.vx, body.vy);
  if (speed > 1) {
    body.dirX = body.vx / speed;
    body.dirY = body.vy / speed;
  }

  // Cursor controls 3D tilt and rotation ONLY when cursor is directly ON the orb
  let targetTiltX = 0;
  let targetTiltY = 0;
  const distToOrb = Math.hypot(pointer.x - body.x, pointer.y - body.y);
  const isCursorOnOrb = pointer.inside && distToOrb <= currentRadius * 1.05;

  if (isCursorOnOrb) {
    const ndx = clamp((pointer.x - body.x) / currentRadius, -1.0, 1.0);
    const ndy = clamp((pointer.y - body.y) / currentRadius, -1.0, 1.0);
    targetTiltX = -ndy * 0.95; // 3D Pitch from direct touch on orb
    targetTiltY = ndx * 0.95; // 3D Yaw from direct touch on orb

    if (pointer.prevX !== undefined) {
      const pdx = pointer.x - pointer.prevX;
      body.spin += pdx * 0.004; // Rotates only when cursor moves directly on the orb
    }
  }
  pointer.prevX = pointer.x;
  pointer.prevY = pointer.y;

  const stretchTarget = 1 + clamp(speed / 1400, 0, 0.45) * s.wobble;
  step('stretch', stretchTarget, 12, 0.35, dt);
  step('tiltX', targetTiltX, 7, 0.45, dt);
  step('tiltY', targetTiltY, 7, 0.45, dt);

  if (s.spin) {
    body.spin += dt * s.spin;
  }

  const key = morph.t < 1 ? `${morph.from}>${morph.to}` : `${morph.to}>${morph.to}`;
  const entry = request(key);
  if (ready(entry)) current = entry;

  if (current) {
    if (presence < 1) {
      presence = Math.min(1, presence + dt / 0.5);
    }
    step('scale', 1, 11, 0.52, dt);
  }
  body.ripple += ((morph.t < 1 ? 0.05 * s.wobble * Math.sin(Math.PI * morph.t) : 0) - body.ripple) * (1 - Math.exp(-dt / 0.08));

  if (!current) return;

  refreshPageCapture();

  const eased = smoother(morph.t);
  const extent = EXTENT[morph.from] + (EXTENT[morph.to] - EXTENT[morph.from]) * eased;
  const unit = currentRadius / extent;
  const scale = Math.max(0.001, spring.scale);
  const qa = quaternion(...BASE[morph.from]);
  const qb = quaternion(...BASE[morph.to]);
  let orientation = slerp(qa, qb, eased);
  const tumble = SPIN[morph.from][0] + (SPIN[morph.to][0] - SPIN[morph.from][0]) * eased;
  const sway = SPIN[morph.from][1] + (SPIN[morph.to][1] - SPIN[morph.from][1]) * eased;
  const angle = body.spin % (Math.PI * 2);
  const turnY = slerp([0, 0, 0, 1], quaternion(0, angle, 0), tumble);
  const turnZ = slerp([0, 0, 0, 1], quaternion(0, 0, angle), sway);
  orientation = multiply(multiply(quaternion(Math.sin(body.spin * 0.6) * 0.18 * tumble, 0, 0), turnY), orientation);
  orientation = multiply(turnZ, orientation);
  orientation = multiply(quaternion(spring.tiltX, spring.tiltY, 0), orientation);
  const r = toMatrix(orientation);
  const sx = Math.max(0.2, spring.stretch);
  const q = 1 / Math.sqrt(sx);
  const ux = body.dirX;
  const uy = -body.dirY;
  const inv = [
    1 / q + (1 / sx - 1 / q) * ux * ux,
    (1 / sx - 1 / q) * ux * uy,
    0,
    (1 / sx - 1 / q) * ux * uy,
    1 / q + (1 / sx - 1 / q) * uy * uy,
    0,
    0,
    0,
    1 / q
  ];
  const transposeR = [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
  const combined = new Float32Array(9);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += transposeR[k * 3 + row] * inv[col * 3 + k];
      combined[col * 3 + row] = sum / (unit * scale);
    }
  }
  const minScale = Math.min(sx, q);
  const maxScale = Math.max(sx, q);
  const focal = Math.max(view.width, view.height) * 1.6;
  const height = unit * (0.35 + s.elevation);
  const worldY = view.height - body.y;
  const cx = view.width / 2 + (body.x - view.width / 2) * ((focal - height) / focal);
  const cy = view.height / 2 + (worldY - view.height / 2) * ((focal - height) / focal);

  const u = current.uniforms;
  gl.useProgram(current.program);
  gl.bindVertexArray(vao);
  bindContent(u);
  gl.uniform1f(u.uFocal, focal);
  gl.uniform3f(u.uCenter, cx, cy, height);
  gl.uniformMatrix3fv(u.uInverse, false, combined);
  gl.uniform1f(u.uScale, unit * scale * minScale);
  const bound = currentRadius * scale * maxScale * 1.08 + 2;
  gl.uniform1f(u.uBound, bound);
  gl.uniform1f(u.uMorph, eased);
  gl.uniform1f(u.uRipple, body.ripple);
  gl.uniform1f(u.uTime, time);
  gl.uniform1f(u.uIor, s.ior);
  gl.uniform1f(u.uDispersion, s.dispersion);
  gl.uniform1f(u.uReflection, s.reflection);
  gl.uniform1f(u.uFrost, s.frost);
  gl.uniform4f(u.uTint, s.color[0], s.color[1], s.color[2], s.tint * 1.6);
  gl.uniform1f(u.uShadow, s.shadow);
  const light = [-0.42, 0.55, 1];
  const length = Math.hypot(...light);
  gl.uniform3f(u.uLight, light[0] / length, light[1] / length, light[2] / length);
  gl.uniform1f(u.uPresence, presence);
  const footprint = bound * 1.6 * (SHADOW_SIZE / (SHADOW_SIZE - 6)) + 1;
  const footX = cx + (light[0] / light[2]) * height;
  const footY = cy + (light[1] / light[2]) * height;
  gl.uniform4f(u.uShadowBox, footX - footprint, footY - footprint, footprint * 2, footprint * 2);
  gl.uniform2f(u.uShadowSize, SHADOW_SIZE, SHADOW_SIZE);
  gl.uniform1i(u.uShadowMap, 2);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, null);

  if (s.shadow > 0) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowTarget);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.uniform1f(u.uPass, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, shadowMap);
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(u.uPass, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

  // Event Listeners
window.addEventListener('mousemove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.inside = true;
}, { passive: true });

window.addEventListener('mouseleave', () => {
  pointer.inside = false;
}, { passive: true });

  // Morph on click when clicking on the fluid glass
window.addEventListener('pointerdown', (e) => {
  const d = Math.hypot(e.clientX - body.x, e.clientY - body.y);
  if (d < radius() * 1.35) {
    body.ripple = Math.min(0.12, body.ripple + 0.08 * s.wobble);
    spring.vstretch -= 3 * s.wobble;
    if (s.morphOnClick && s.cycle.length > 1) {
      const index = s.cycle.indexOf(morph.pending || morph.to);
      morph.pending = s.cycle[(index + 1) % s.cycle.length];
    }
  }
}, { passive: true });

window.addEventListener('resize', () => {
  resize();
  ScrollTrigger.refresh();
}, { passive: true });

resize();
request('content');
request(`${s.shape}>${s.shape}`);
raf = requestAnimationFrame(frame);
}

if (typeof window !== 'undefined') {
  window.initStoryLayer = initStoryLayer;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStoryLayer);
  } else {
    initStoryLayer();
  }
}
