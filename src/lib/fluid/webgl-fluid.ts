// Real-time incompressible fluid simulation (Jos Stam's "stable fluids" on the
// GPU): semi-Lagrangian advection, vorticity confinement, Jacobi pressure
// solve, gradient subtraction. Dye is stored as pigment ABSORPTION (1 - paper
// color), and the display shader outputs `1 - absorption`, so compositing the
// canvas with CSS mix-blend-mode: multiply tints the page the way watercolor
// stains paper — blank fluid multiplies as pure white and is invisible.
//
// Self-contained: no dependencies, WebGL2 preferred with a WebGL1 + half-float
// extension fallback, manual bilinear filtering when linear half-float
// filtering is unavailable. Loaded lazily by HeroFluidInk, so none of this is
// on the critical path.

export interface FluidSimOptions {
  /** Pigment absorptions (1 - rgb of the ink color), each 0..1. */
  palette: Array<[number, number, number]>;
  /** Cap on device pixel ratio for the dye canvas. */
  maxDpr?: number;
}

export interface FluidSim {
  /** Inject ink + momentum at canvas-relative coordinates (px). */
  pointerMove(x: number, y: number, dx: number, dy: number): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}

const SIM_RESOLUTION = 128;
const DYE_RESOLUTION = 512;
const PRESSURE_ITERATIONS = 20;
const CURL = 24;
const VELOCITY_DISSIPATION = 0.22;
const DYE_DISSIPATION = 0.32;
const POINTER_FORCE = 4200;
const POINTER_RADIUS = 0.0032;
const AMBIENT_RADIUS = 0.0024;
const DROP_RADIUS = 0.0052;

const BASE_VERTEX = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const CLEAR_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () {
  gl_FragColor = value * texture2D(uTexture, vUv);
}`;

const SPLAT_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`;

const ADVECTION_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;

vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main () {
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
#endif
  float decay = 1.0 + dissipation * dt;
  gl_FragColor = result / decay;
}`;

const DIVERGENCE_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const CURL_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

const VORTICITY_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

const PRESSURE_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const GRADIENT_SUBTRACT_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

// Absorption -> paper transmittance. mix-blend-mode: multiply does the rest.
const DISPLAY_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
void main () {
  vec3 absorption = texture2D(uTexture, vUv).rgb;
  vec3 paper = clamp(vec3(1.0) - absorption, 0.0, 1.0);
  gl_FragColor = vec4(paper, 1.0);
}`;

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach(id: number): number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

interface TexFormat {
  internalFormat: number;
  format: number;
}

class Program {
  program: WebGLProgram;
  fragment: WebGLShader;
  uniforms: Record<string, WebGLUniformLocation> = {};

  constructor(gl: WebGLRenderingContext, vertex: WebGLShader, fragmentSource: string, keywords?: string[]) {
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, keywords);
    this.fragment = fragment;
    const program = gl.createProgram();
    if (!program) throw new Error("FLUID_PROGRAM_CREATE_FAILED");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`FLUID_PROGRAM_LINK_FAILED: ${gl.getProgramInfoLog(program) || "unknown"}`);
    }
    this.program = program;
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const location = gl.getUniformLocation(program, info.name);
      if (location) this.uniforms[info.name] = location;
    }
  }
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string, keywords?: string[]): WebGLShader {
  const prefixed = (keywords || []).map((keyword) => `#define ${keyword}\n`).join("") + source;
  const shader = gl.createShader(type);
  if (!shader) throw new Error("FLUID_SHADER_CREATE_FAILED");
  gl.shaderSource(shader, prefixed);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`FLUID_SHADER_COMPILE_FAILED: ${gl.getShaderInfoLog(shader) || "unknown"}`);
  }
  return shader;
}

export function createFluidSim(canvas: HTMLCanvasElement, options: FluidSimOptions): FluidSim | null {
  const palette = options.palette;
  const maxDpr = options.maxDpr ?? 1.5;

  const params: WebGLContextAttributes = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
  let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
  const isWebGL2 = Boolean(gl);
  if (!gl) {
    gl = (canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)) as WebGL2RenderingContext | null;
  }
  if (!gl) return null;
  const ctx = gl;

  // --- capability probing -------------------------------------------------
  let halfFloatType: number;
  let supportLinearFiltering: boolean;
  if (isWebGL2) {
    if (!ctx.getExtension("EXT_color_buffer_float")) return null;
    halfFloatType = (ctx as WebGL2RenderingContext).HALF_FLOAT;
    supportLinearFiltering = true; // 16F filtering is core in WebGL2
  } else {
    const halfFloat = ctx.getExtension("OES_texture_half_float");
    if (!halfFloat) return null;
    halfFloatType = halfFloat.HALF_FLOAT_OES;
    supportLinearFiltering = Boolean(ctx.getExtension("OES_texture_half_float_linear"));
  }

  function formatSupported(internalFormat: number, format: number): boolean {
    const texture = ctx.createTexture();
    ctx.bindTexture(ctx.TEXTURE_2D, texture);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.texImage2D(ctx.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, halfFloatType, null);
    const fbo = ctx.createFramebuffer();
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, fbo);
    ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, texture, 0);
    const complete = ctx.checkFramebufferStatus(ctx.FRAMEBUFFER) === ctx.FRAMEBUFFER_COMPLETE;
    ctx.deleteFramebuffer(fbo);
    ctx.deleteTexture(texture);
    return complete;
  }

  function pickFormat(candidates: TexFormat[]): TexFormat | null {
    for (const candidate of candidates) {
      if (formatSupported(candidate.internalFormat, candidate.format)) return candidate;
    }
    return null;
  }

  const gl2 = ctx as WebGL2RenderingContext;
  const formatRGBA = isWebGL2
    ? pickFormat([{ internalFormat: gl2.RGBA16F, format: ctx.RGBA }])
    : pickFormat([{ internalFormat: ctx.RGBA, format: ctx.RGBA }]);
  const formatRG = isWebGL2
    ? pickFormat([{ internalFormat: gl2.RG16F, format: gl2.RG }, { internalFormat: gl2.RGBA16F, format: ctx.RGBA }])
    : formatRGBA;
  const formatR = isWebGL2
    ? pickFormat([{ internalFormat: gl2.R16F, format: gl2.RED }, { internalFormat: gl2.RGBA16F, format: ctx.RGBA }])
    : formatRGBA;
  if (!formatRGBA || !formatRG || !formatR) return null;

  // --- geometry -----------------------------------------------------------
  const vertexBuffer = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, vertexBuffer);
  ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), ctx.STATIC_DRAW);
  const indexBuffer = ctx.createBuffer();
  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, indexBuffer);
  ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), ctx.STATIC_DRAW);
  ctx.vertexAttribPointer(0, 2, ctx.FLOAT, false, 0, 0);
  ctx.enableVertexAttribArray(0);

  function blit(target: FBO | null) {
    if (target === null) {
      ctx.viewport(0, 0, ctx.drawingBufferWidth, ctx.drawingBufferHeight);
      ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
    } else {
      ctx.viewport(0, 0, target.width, target.height);
      ctx.bindFramebuffer(ctx.FRAMEBUFFER, target.fbo);
    }
    ctx.drawElements(ctx.TRIANGLES, 6, ctx.UNSIGNED_SHORT, 0);
  }

  // --- framebuffers -------------------------------------------------------
  function createFBO(w: number, h: number, internalFormat: number, format: number, filter: number): FBO {
    const texture = ctx.createTexture();
    if (!texture) throw new Error("FLUID_TEXTURE_CREATE_FAILED");
    ctx.activeTexture(ctx.TEXTURE0);
    ctx.bindTexture(ctx.TEXTURE_2D, texture);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, filter);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, filter);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.texImage2D(ctx.TEXTURE_2D, 0, internalFormat, w, h, 0, format, halfFloatType, null);
    const fbo = ctx.createFramebuffer();
    if (!fbo) throw new Error("FLUID_FBO_CREATE_FAILED");
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, fbo);
    ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, texture, 0);
    ctx.viewport(0, 0, w, h);
    ctx.clearColor(0, 0, 0, 1);
    ctx.clear(ctx.COLOR_BUFFER_BIT);
    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach(id: number) {
        ctx.activeTexture(ctx.TEXTURE0 + id);
        ctx.bindTexture(ctx.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, filter: number): DoubleFBO {
    let fbo1 = trackFBO(createFBO(w, h, internalFormat, format, filter));
    let fbo2 = trackFBO(createFBO(w, h, internalFormat, format, filter));
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; },
      get write() { return fbo2; },
      swap() { const temp = fbo1; fbo1 = fbo2; fbo2 = temp; },
    } as DoubleFBO;
  }

  function getResolution(resolution: number) {
    const aspect = ctx.drawingBufferWidth / Math.max(1, ctx.drawingBufferHeight);
    const aspectRatio = aspect < 1 ? 1 / aspect : aspect;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    return ctx.drawingBufferWidth > ctx.drawingBufferHeight
      ? { width: max, height: min }
      : { width: min, height: max };
  }

  // --- programs -----------------------------------------------------------
  const baseVertex = compileShader(ctx, ctx.VERTEX_SHADER, BASE_VERTEX);
  const filterKeywords = supportLinearFiltering ? undefined : ["MANUAL_FILTERING"];
  const clearProgram = new Program(ctx, baseVertex, CLEAR_SHADER);
  const splatProgram = new Program(ctx, baseVertex, SPLAT_SHADER);
  const advectionProgram = new Program(ctx, baseVertex, ADVECTION_SHADER, filterKeywords);
  const divergenceProgram = new Program(ctx, baseVertex, DIVERGENCE_SHADER);
  const curlProgram = new Program(ctx, baseVertex, CURL_SHADER);
  const vorticityProgram = new Program(ctx, baseVertex, VORTICITY_SHADER);
  const pressureProgram = new Program(ctx, baseVertex, PRESSURE_SHADER);
  const gradientProgram = new Program(ctx, baseVertex, GRADIENT_SUBTRACT_SHADER);
  const displayProgram = new Program(ctx, baseVertex, DISPLAY_SHADER);
  const allPrograms = [
    clearProgram, splatProgram, advectionProgram, divergenceProgram, curlProgram,
    vorticityProgram, pressureProgram, gradientProgram, displayProgram,
  ];

  const texFilter = supportLinearFiltering ? ctx.LINEAR : ctx.NEAREST;
  let dye: DoubleFBO;
  let velocity: DoubleFBO;
  let divergence: FBO;
  let curl: FBO;
  let pressure: DoubleFBO;
  // Every GL object created for the current target set, so a resize can free
  // the previous generation instead of leaking eight textures per relayout.
  let liveTargets: FBO[] = [];

  function trackFBO(fbo: FBO): FBO {
    liveTargets.push(fbo);
    return fbo;
  }

  function disposeTargets() {
    for (const target of liveTargets) {
      ctx.deleteTexture(target.texture);
      ctx.deleteFramebuffer(target.fbo);
    }
    liveTargets = [];
  }

  function initFramebuffers() {
    disposeTargets();
    const simRes = getResolution(SIM_RESOLUTION);
    const dyeRes = getResolution(DYE_RESOLUTION);
    dye = createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA!.internalFormat, formatRGBA!.format, texFilter);
    velocity = createDoubleFBO(simRes.width, simRes.height, formatRG!.internalFormat, formatRG!.format, texFilter);
    divergence = trackFBO(createFBO(simRes.width, simRes.height, formatR!.internalFormat, formatR!.format, ctx.NEAREST));
    curl = trackFBO(createFBO(simRes.width, simRes.height, formatR!.internalFormat, formatR!.format, ctx.NEAREST));
    pressure = createDoubleFBO(simRes.width, simRes.height, formatR!.internalFormat, formatR!.format, ctx.NEAREST);
  }

  function resizeCanvas(): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  resizeCanvas();
  initFramebuffers();

  // --- simulation steps ---------------------------------------------------
  function splat(x: number, y: number, dx: number, dy: number, color: [number, number, number], dyeStrength: number, radius: number) {
    ctx.useProgram(splatProgram.program);
    ctx.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    ctx.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    ctx.uniform2f(splatProgram.uniforms.point, x, y);
    ctx.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
    ctx.uniform1f(splatProgram.uniforms.radius, radius);
    blit(velocity.write);
    velocity.swap();

    ctx.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    ctx.uniform3f(
      splatProgram.uniforms.color,
      color[0] * dyeStrength,
      color[1] * dyeStrength,
      color[2] * dyeStrength,
    );
    blit(dye.write);
    dye.swap();
  }

  function step(dt: number) {
    ctx.disable(ctx.BLEND);

    ctx.useProgram(curlProgram.program);
    ctx.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    ctx.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    ctx.useProgram(vorticityProgram.program);
    ctx.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    ctx.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    ctx.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    ctx.uniform1f(vorticityProgram.uniforms.curl, CURL);
    ctx.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    ctx.useProgram(divergenceProgram.program);
    ctx.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    ctx.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    ctx.useProgram(clearProgram.program);
    ctx.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    ctx.uniform1f(clearProgram.uniforms.value, 0.8);
    blit(pressure.write);
    pressure.swap();

    ctx.useProgram(pressureProgram.program);
    ctx.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    ctx.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      ctx.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    ctx.useProgram(gradientProgram.program);
    ctx.uniform2f(gradientProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    ctx.uniform1i(gradientProgram.uniforms.uPressure, pressure.read.attach(0));
    ctx.uniform1i(gradientProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    ctx.useProgram(advectionProgram.program);
    ctx.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!supportLinearFiltering) {
      ctx.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    }
    ctx.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    ctx.uniform1i(advectionProgram.uniforms.uSource, velocity.read.attach(0));
    ctx.uniform1f(advectionProgram.uniforms.dt, dt);
    ctx.uniform1f(advectionProgram.uniforms.dissipation, VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    if (!supportLinearFiltering) {
      ctx.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    }
    ctx.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    ctx.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    ctx.uniform1f(advectionProgram.uniforms.dissipation, DYE_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  function render() {
    ctx.useProgram(displayProgram.program);
    ctx.uniform1i(displayProgram.uniforms.uTexture, dye.read.attach(0));
    blit(null);
  }

  // --- ambient ink: slow wandering current + occasional paint drops --------
  let ambientPhase = Math.random() * 1000;
  let lastAmbient = 0;
  let lastDrop = 0;
  let nextDropDelay = 2.2;
  let paletteIndex = 0;

  function ambient(now: number, dt: number) {
    ambientPhase += dt;
    const t = ambientPhase * 0.13;
    const x = 0.5 + 0.3 * Math.sin(t) * Math.cos(t * 0.37);
    const y = 0.34 + 0.2 * Math.sin(t * 0.73 + 1.7);

    if (now - lastAmbient > 0.16) {
      lastAmbient = now;
      const angle = t * 2.1;
      const force = 42 + 26 * Math.sin(t * 1.9);
      splat(
        x,
        y,
        Math.cos(angle) * force,
        Math.sin(angle) * force,
        palette[paletteIndex % palette.length],
        0.035,
        AMBIENT_RADIUS,
      );
    }

    if (now - lastDrop > nextDropDelay) {
      lastDrop = now;
      nextDropDelay = 4.5 + Math.random() * 4;
      paletteIndex += 1;
      const dropX = 0.18 + Math.random() * 0.64;
      const dropY = 0.12 + Math.random() * 0.5;
      splat(dropX, dropY, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, palette[paletteIndex % palette.length], 0.22, DROP_RADIUS);
    }
  }

  // Seed the pool so the very first frame already looks like dissolved paint.
  splat(0.44, 0.3, 60, 30, palette[0], 0.3, DROP_RADIUS * 1.6);
  splat(0.6, 0.24, -50, 40, palette[1 % palette.length], 0.18, DROP_RADIUS);
  splat(0.3, 0.42, 30, -50, palette[2 % palette.length], 0.14, DROP_RADIUS);

  // --- main loop ----------------------------------------------------------
  let raf = 0;
  let paused = false;
  let destroyed = false;
  let halted = false;
  let lastTime = performance.now();
  // A window-edge drag changes the size every frame; reallocating ten
  // framebuffers per frame is pure churn, so re-init only once the size has
  // been stable for a beat. Until then the old targets simply render scaled.
  let resizeSettledAt = 0;

  // A genuinely lost GPU context (driver reset, memory pressure) turns every
  // GL call into a no-op and createTexture into null, so keeping the loop
  // alive would eventually throw from initFramebuffers inside a rAF callback.
  // Halt for good instead — the page quietly falls back to the SVG watercolor.
  const onContextLost = (event: Event) => {
    event.preventDefault();
    halted = true;
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  function frame(nowMs: number) {
    if (destroyed || halted || ctx.isContextLost()) return;
    raf = requestAnimationFrame(frame);
    if (paused) { lastTime = nowMs; return; }
    const dt = Math.min((nowMs - lastTime) / 1000, 1 / 30);
    lastTime = nowMs;
    if (dt <= 0) return;
    if (resizeCanvas()) resizeSettledAt = nowMs + 150;
    if (resizeSettledAt !== 0 && nowMs >= resizeSettledAt) {
      resizeSettledAt = 0;
      initFramebuffers();
    }
    ambient(nowMs / 1000, dt);
    step(dt);
    render();
  }
  raf = requestAnimationFrame(frame);

  let pointerPalette = 0;
  return {
    pointerMove(x: number, y: number, dx: number, dy: number) {
      if (destroyed || paused) return;
      const u = x / Math.max(1, canvas.clientWidth);
      const v = 1 - y / Math.max(1, canvas.clientHeight);
      if (u < 0 || u > 1 || v < 0 || v > 1) return;
      const speed = Math.hypot(dx, dy);
      if (speed < 0.5) return;
      if (Math.random() < 0.02) pointerPalette += 1;
      splat(
        u,
        v,
        (dx / Math.max(1, canvas.clientWidth)) * POINTER_FORCE,
        (-dy / Math.max(1, canvas.clientHeight)) * POINTER_FORCE,
        palette[pointerPalette % palette.length],
        Math.min(0.14, 0.02 + speed * 0.003),
        POINTER_RADIUS,
      );
    },
    setPaused(next: boolean) {
      paused = next;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      // Free resources explicitly instead of loseContext(): dev Fast Refresh
      // remounts reuse the same canvas node, and getContext on a deliberately
      // lost context returns that same dead context forever, silently killing
      // the fluid until a full reload. Deleting the tracked objects reclaims
      // the GPU memory; the context itself dies with the canvas element.
      if (!ctx.isContextLost()) {
        disposeTargets();
        ctx.deleteBuffer(vertexBuffer);
        ctx.deleteBuffer(indexBuffer);
        for (const entry of allPrograms) {
          ctx.deleteProgram(entry.program);
          ctx.deleteShader(entry.fragment);
        }
        ctx.deleteShader(baseVertex);
      }
    },
  };
}
