import { Skia } from '@shopify/react-native-skia';

/**
 * Night sky with soft volumetric-style clouds (simplex-ish noise + FBM).
 * Adapted from classic “sky + clouds” shaders; palette/motion tuned for SleepSync (quiet, dark).
 * `pos` is pixel coordinates in canvas space.
 */
export const BACKGROUND_SKSL = `
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uSwipe;
uniform float uGrain;

// Same linear transform as mat2(1.6, 1.2, -1.2, 1.6) column vectors (explicit for SkSL portability).
vec2 mMul(vec2 v) {
  return vec2(1.6 * v.x - 1.2 * v.y, 1.2 * v.x + 1.6 * v.y);
}

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  float K1 = 0.366025404;
  float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n =
      h * h * h * h *
      vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + vec2(1.0, 1.0))));
  return dot(n, vec3(70.0));
}

float fbm(vec2 n) {
  float total = 0.0;
  float amplitude = 0.1;
  vec2 x = n;
  for (int i = 0; i < 7; i++) {
    total += noise(x) * amplitude;
    x = mMul(x);
    amplitude *= 0.4;
  }
  return total;
}

vec4 main(vec2 fragCoord) {
  vec2 res = max(uResolution, vec2(1.0));
  vec2 p = fragCoord / res;
  vec2 swipeN = uSwipe / max(res.y, 1.0);

  float cloudscale = 1.05;
  float speed = 0.015;
  float clouddark = 0.52;
  float cloudlight = 0.18;
  float cloudcover = 0.10;
  float cloudalpha = 1.15;
  float skytint = 0.28;

  // Zenith → horizon (night): deep blue-violet → slightly lighter band low in frame.
  vec3 skycolour1 = vec3(0.022, 0.028, 0.055);
  vec3 skycolour2 = vec3(0.048, 0.058, 0.105);

  vec2 uvAspect = p * vec2(res.x / res.y, 1.0);
  uvAspect += swipeN * vec2(0.35, 0.28);

  float time = uTime * speed;

  float q = fbm(uvAspect * cloudscale * 0.5);

  float r = 0.0;
  vec2 uv = uvAspect * cloudscale;
  uv -= q - time;
  float weight = 0.8;
  for (int i = 0; i < 8; i++) {
    r += abs(weight * noise(uv));
    uv = mMul(uv) + vec2(time * 0.65, time * 0.72);
    weight *= 0.7;
  }

  float f = 0.0;
  uv = p * vec2(res.x / res.y, 1.0);
  uv += swipeN * vec2(0.35, 0.28);
  uv *= cloudscale;
  uv -= q - time;
  weight = 0.7;
  for (int i = 0; i < 8; i++) {
    f += weight * noise(uv);
    uv = mMul(uv) + vec2(time * 0.65, time * 0.72);
    weight *= 0.6;
  }

  f *= r + f;

  float c = 0.0;
  time = uTime * speed * 2.0;
  uv = p * vec2(res.x / res.y, 1.0);
  uv += swipeN * vec2(0.35, 0.28);
  uv *= cloudscale * 2.0;
  uv -= q - time;
  weight = 0.4;
  for (int i = 0; i < 7; i++) {
    c += weight * noise(uv);
    uv = mMul(uv) + vec2(time * 0.65, time * 0.72);
    weight *= 0.6;
  }

  float c1 = 0.0;
  time = uTime * speed * 3.0;
  uv = p * vec2(res.x / res.y, 1.0);
  uv += swipeN * vec2(0.35, 0.28);
  uv *= cloudscale * 3.0;
  uv -= q - time;
  weight = 0.4;
  for (int i = 0; i < 7; i++) {
    c1 += abs(weight * noise(uv));
    uv = mMul(uv) + vec2(time * 0.65, time * 0.72);
    weight *= 0.6;
  }

  c += c1;

  // Muted moonlit clouds (no daytime cream).
  vec3 cloudcolour =
      vec3(0.14, 0.11, 0.22) * clamp(clouddark + cloudlight * c, 0.0, 1.0);

  vec3 skycolour = mix(skycolour2, skycolour1, p.y);

  f = cloudcover + cloudalpha * f * r;

  vec3 result =
      mix(skycolour, clamp(skytint * skycolour + cloudcolour, 0.0, 1.0), clamp(f + c, 0.0, 1.0));

  vec2 edge = p * (1.0 - p);
  float vign = clamp(edge.x * edge.y * 5.2, 0.0, 1.0);
  result *= (0.92 + 0.08 * vign);

  float bottomMask = smoothstep(0.22, 1.0, p.y);
  result *= mix(1.0, 0.78, bottomMask);

  float gn = fract(sin(dot(floor(fragCoord * 2.2), vec2(12.9898, 78.233))) * 43758.5453);
  result += (gn - 0.5) * 0.012 * uGrain;

  return vec4(clamp(result, 0.0, 1.0), 1.0);
}
`;

/** Compiled after Skia native / CanvasKit is ready; null means shader SkSL rejected on device. */
export function compileAuroraShader(): ReturnType<typeof Skia.RuntimeEffect.Make> {
  const src = BACKGROUND_SKSL.trim();
  const effect = Skia.RuntimeEffect.Make(src);
  if (!effect && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[Background] SkSL compile failed — shader disabled until fixed.');
  }
  return effect;
}
