/* Generated from the captured New API runtime. */
(() => {
  const start = () => {
  const VERTEX = "\nattribute vec2 position;\nattribute vec2 uv;\n\nvarying vec2 vUv;\n\nvoid main() {\n  vUv = uv;\n  gl_Position = vec4(position, 0.0, 1.0);\n}\n";
  const FRAGMENT = "\nprecision highp float;\n\nuniform float uTime;\nuniform vec2 uResolution;\nuniform vec2 uMouse;    // damped pointer, [-1, 1], +y up\nuniform vec2 uCenter;   // hole center offset from screen center (scene units)\nuniform float uSeed;\nuniform vec3 uTintA;    // logo cyan  #59dbee\nuniform vec3 uTintB;    // logo pink  #fc73bf\nuniform vec3 uTintC;    // logo purple (arc bottoms)\n\nvarying vec2 vUv;\n\nconst float DISK_IN = 2.6;   // inner disk edge (units of rs)\nconst float DISK_OUT = 10.0; // outer disk edge\nconst float CAM_DIST = 26.0;\nconst float FOCAL = 1.4;\nconst int STEPS = 110;\n\n// ---------------------------------------------------------------- simplex 3D\n// Ashima Arts / Ian McEwan simplex noise (MIT licensed).\nvec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\nvec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\nvec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }\nvec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }\n\nfloat snoise(vec3 v) {\n  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);\n  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);\n\n  vec3 i = floor(v + dot(v, C.yyy));\n  vec3 x0 = v - i + dot(i, C.xxx);\n\n  vec3 g = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g;\n  vec3 i1 = min(g.xyz, l.zxy);\n  vec3 i2 = max(g.xyz, l.zxy);\n\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy;\n  vec3 x3 = x0 - D.yyy;\n\n  i = mod289(i);\n  vec4 p = permute(permute(permute(\n      i.z + vec4(0.0, i1.z, i2.z, 1.0))\n    + i.y + vec4(0.0, i1.y, i2.y, 1.0))\n    + i.x + vec4(0.0, i1.x, i2.x, 1.0));\n\n  float n_ = 0.142857142857;\n  vec3 ns = n_ * D.wyz - D.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_);\n\n  vec4 x = x_ * ns.x + ns.yyyy;\n  vec4 y = y_ * ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4(x.xy, y.xy);\n  vec4 b1 = vec4(x.zw, y.zw);\n\n  vec4 s0 = floor(b0) * 2.0 + 1.0;\n  vec4 s1 = floor(b1) * 2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;\n  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;\n\n  vec3 p0 = vec3(a0.xy, h.x);\n  vec3 p1 = vec3(a0.zw, h.y);\n  vec3 p2 = vec3(a1.xy, h.z);\n  vec3 p3 = vec3(a1.zw, h.w);\n\n  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));\n}\n\nfloat hash21(vec2 p) {\n  p = fract(p * vec2(234.34, 435.345));\n  p += dot(p, p + 34.23);\n  return fract(p.x * p.y);\n}\n\n// ------------------------------------------------------------ accretion disk\n// Differential rotation winds the streaks tighter without bound: after a\n// minute they read as fine rings, after an hour as flat haze. So the shear\n// clock runs on two staggered phases. Each one is visible only while its age\n// is in [0, FLOW_CYCLE / 2 + FLOW_FADE], crossfades into the other, and\n// restarts on a fresh noise slice while hidden.\nconst float FLOW_CYCLE = 16.0;\nconst float FLOW_FADE = 3.0;\nconst float FLOW_SHEAR_MIN = 1.0;\n\n// Shear time (s), noise offset, weight of one flow phase.\nvec3 flowPhase(float offset) {\n  float cycles = uTime / FLOW_CYCLE + offset;\n  float age = fract(cycles) * FLOW_CYCLE;\n  float halfCycle = 0.5 * FLOW_CYCLE;\n  float w = smoothstep(0.0, FLOW_FADE, age)\n          * (1.0 - smoothstep(halfCycle, halfCycle + FLOW_FADE, age));\n  return vec3(FLOW_SHEAR_MIN + age, mod(floor(cycles), 64.0) * 7.3, w);\n}\n\n// Log-polar sampling, three octaves: broad ribbons → streaks → fine grit.\nfloat diskNoise(float ang, float logR, float omega, vec3 flow) {\n  float sa = ang + flow.x * omega;\n  vec3 np = vec3(cos(sa) * 1.15, sin(sa) * 1.15, logR * 4.6 + uSeed + flow.y);\n  return 0.52 * snoise(np)\n       + 0.31 * snoise(np * vec3(2.3, 2.3, 2.7))\n       + 0.17 * snoise(np * vec3(5.1, 5.1, 5.6));\n}\n\n// Emission (rgb) + opacity (a) where a bent ray crosses the disk plane.\nvec4 diskShade(vec3 hit, vec3 rd, vec3 flowA, vec3 flowB) {\n  float hr = length(hit.xz);\n  float ang = atan(hit.z, hit.x);\n\n  // Keplerian differential rotation shears the noise into orbital streaks.\n  float omega = 2.8 * pow(hr, -1.5);\n  float logR = log(hr);\n\n  // Weights are uniform across the frame, so outside crossfades the idle\n  // phase is skipped without divergence. Dividing by the weight norm keeps\n  // the streak contrast steady while two uncorrelated phases mix.\n  float n = 0.0;\n  if (flowA.z > 0.0) n += flowA.z * diskNoise(ang, logR, omega, flowA);\n  if (flowB.z > 0.0) n += flowB.z * diskNoise(ang, logR, omega, flowB);\n  n = 0.5 + 0.5 * n / length(vec2(flowA.z, flowB.z));\n  float streak = 0.25 + 0.75 * pow(n, 2.2);\n\n  // Orbiting hot spots: the brightest turbulence peaks flare up.\n  float clump = smoothstep(0.74, 0.95, n);\n\n  // Density: soft inner/outer edges, thinning outward.\n  float fade = smoothstep(DISK_IN, DISK_IN + 1.0, hr)\n             * (1.0 - smoothstep(6.0, DISK_OUT, hr));\n  float density = fade * pow(DISK_IN / hr, 1.7);\n\n  // Temperature ramp: cool-white rim → cyan/pink body → deep-purple trails.\n  // Azimuth carries the logo split (cyan ↔ pink); radius carries the fade to purple.\n  float t = clamp((hr - DISK_IN) / (DISK_OUT - DISK_IN), 0.0, 1.0);\n  vec3 brand = mix(uTintA, uTintB, 0.54 + 0.46 * sin(ang - uTime * 0.05));\n  vec3 inner = vec3(1.0, 0.97, 1.0);\n  vec3 outer = mix(brand, uTintC, 0.70);\n  vec3 base = mix(inner, brand, smoothstep(0.02, 0.35, t));\n  base = mix(base, outer, smoothstep(0.40, 0.95, t));\n\n  // Relativistic Doppler: approaching side beams brighter + cyan; receding\n  // side dims toward pink-purple (no amber).\n  vec3 tangent = normalize(vec3(-hit.z, 0.0, hit.x));\n  float dop = dot(tangent, normalize(rd));\n  float beam = pow(clamp(1.0 - 0.62 * dop, 0.4, 2.2), 3.0);\n  base = mix(base, uTintA, clamp(-dop * 0.36, 0.0, 0.36));\n  base = mix(base, mix(uTintB, uTintC, 0.35), clamp(dop * 0.38, 0.0, 0.38));\n\n  // Slow stochastic flicker — accretion is never steady.\n  float flick = 0.93 + 0.07 * sin(uTime * 0.9 + sin(uTime * 0.37) * 2.2);\n\n  float e = density * streak * beam * flick * (1.0 + 0.9 * clump);\n  return vec4(base * e * 1.4, clamp(e * 1.5, 0.0, 1.0));\n}\n\n// ------------------------------------------------------- lensed background\n// One round twinkling star point per sparse grid cell.\nvec3 starLayer(vec2 sc, float scale, float threshold, float sharp) {\n  vec2 cell = floor(sc * scale);\n  vec2 cuv = fract(sc * scale);\n  float sh = hash21(cell + floor(uSeed));\n  vec2 spos = vec2(hash21(cell + 7.13), hash21(cell + 3.71));\n  float sd = length(cuv - spos);\n  float star = step(threshold, sh) * exp(-sd * sd * sharp);\n  float tw = 0.6 + 0.4 * sin(uTime * (0.3 + sh * 2.0) + sh * 41.0);\n  // Slight per-star tint: icy cyan ↔ soft pink, staying on the logo pair.\n  vec3 tintC = mix(uTintA, uTintB, 0.15 + hash21(cell + 11.7) * 0.55);\n  tintC = mix(vec3(0.86, 0.90, 1.0), tintC, 0.45);\n  return tintC * star * tw;\n}\n\nvec3 background(vec3 dir) {\n  vec3 d = normalize(dir);\n  vec2 sc = vec2(atan(d.z, d.x) * 3.2, asin(clamp(d.y, -1.0, 1.0)) * 6.4);\n\n  // Two depths of stars: a few bright ones, many faint ones.\n  vec3 col = starLayer(sc, 14.0, 0.92, 380.0) * 0.6;\n  col += starLayer(sc + 17.3, 31.0, 0.80, 520.0) * 0.22;\n\n  // Structured nebula, split across the logo pair and a touch of purple.\n  float nn = snoise(d * 2.3 + uSeed) * 0.5 + 0.5;\n  float nn2 = snoise(d * 5.9 - uSeed) * 0.5 + 0.5;\n  vec3 nebula = mix(uTintA, uTintB, clamp(0.54 + 0.76 * d.x, 0.0, 1.0));\n  nebula = mix(nebula, uTintC, 0.18);\n  col += nebula * 0.050 * nn * nn * (0.5 + 0.5 * nn2);\n\n  return col;\n}\n\nvoid main() {\n  float aspect = uResolution.x / max(uResolution.y, 1.0);\n  vec2 sp = (vUv - 0.5) * vec2(aspect, 1.0) - uCenter;\n\n  // Camera orbits the hole a few degrees toward the pointer, sitting just\n  // above the disk plane so the disk is seen nearly edge-on.\n  float az = uMouse.x * 0.20;\n  float el = 0.115 + uMouse.y * 0.05;\n  vec3 ro = CAM_DIST * vec3(cos(el) * sin(az), sin(el), -cos(el) * cos(az));\n  vec3 fwd = normalize(-ro);\n  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));\n  vec3 up = cross(right, fwd);\n  vec3 rd = normalize(fwd * FOCAL + right * sp.x + up * sp.y);\n\n  // Advance analytically to the r=15 sphere — bending is negligible outside.\n  vec3 pos = ro;\n  float b = dot(ro, rd);\n  float disc = b * b - (dot(ro, ro) - 225.0);\n  if (disc > 0.0) {\n    float tEnter = -b - sqrt(disc);\n    if (tEnter > 0.0) pos = ro + rd * tEnter;\n  }\n\n  // Conserved angular momentum of the (straight) incoming ray.\n  vec3 hv = cross(pos, rd);\n  float h2 = dot(hv, hv);\n\n  vec3 vel = rd;\n  vec3 col = vec3(0.0);\n  float through = 1.0;\n  bool captured = false;\n\n  vec3 flowA = flowPhase(FLOW_FADE / FLOW_CYCLE);\n  vec3 flowB = flowPhase(FLOW_FADE / FLOW_CYCLE + 0.5);\n\n  for (int i = 0; i < STEPS; i++) {\n    float r2 = dot(pos, pos);\n    float r = sqrt(r2);\n\n    if (r < 1.0) { captured = true; break; }             // fell into the hole\n    if (r > 15.5 && dot(pos, vel) > 0.0) break;          // escaped\n\n    // Small steps near the photon sphere, large steps in empty space.\n    float dt = clamp(0.30 * (r - 1.0), 0.04, 0.8);\n\n    // Schwarzschild null-geodesic bending.\n    vel += (-1.5 * h2 * pos / (r2 * r2 * r)) * dt;\n    vec3 next = pos + vel * dt;\n\n    // Did this segment cross the disk plane?\n    if (pos.y * next.y < 0.0) {\n      vec3 hit = mix(pos, next, pos.y / (pos.y - next.y));\n      float hr = length(hit.xz);\n      if (hr > DISK_IN && hr < DISK_OUT) {\n        vec4 e = diskShade(hit, vel, flowA, flowB);\n        col += e.rgb * through;\n        through *= 1.0 - e.a;\n        if (through < 0.03) break;\n      }\n    }\n    pos = next;\n  }\n\n  if (!captured) col += background(vel) * through;\n\n  // Analytic bloom in the logo pair (single-pass stand-in for a real bloom\n  // pipeline). Faded out inside the shadow so the void stays black.\n  vec2 hp = sp * vec2(1.0, 1.9);\n  float halo = exp(-length(hp) * 3.2) * 0.10 + exp(-length(hp) * 7.5) * 0.09;\n  vec3 brandHalo = mix(mix(uTintA, uTintB, 0.55), uTintC, 0.18);\n  col += brandHalo * halo * smoothstep(0.10, 0.17, length(sp));\n\n  // Filmic-ish tonemap keeps the hot inner edge from clipping harshly.\n  col = 1.0 - exp(-col * 1.7);\n\n  // Fine static grain + dither sell the \"photographed\" texture.\n  col *= 0.94 + 0.12 * hash21(gl_FragCoord.xy * 0.71);\n  col += (hash21(gl_FragCoord.xy) - 0.5) * 0.004;\n\n  gl_FragColor = vec4(col, 1.0);\n}\n";
  const TINT_A = [0.349, 0.859, 0.933];
  const TINT_B = [0.988, 0.451, 0.749];
  const TINT_C = [0.42, 0.298, 1];
  const QUALITY = [1, 0.75, 0.5];

  const host = document.querySelector('canvas[data-blackhole-host]');
  if (!host) return;
  const frame = host.parentElement || host;

  const gl = host.getContext('webgl2', {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance'
  }) || host.getContext('webgl', {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = compile(gl.VERTEX_SHADER, VERTEX);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }

  const position = gl.getAttribLocation(program, 'position');
  const uv = gl.getAttribLocation(program, 'uv');
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);

  const uniforms = {
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uMouse: gl.getUniformLocation(program, 'uMouse'),
    uCenter: gl.getUniformLocation(program, 'uCenter'),
    uSeed: gl.getUniformLocation(program, 'uSeed'),
    uTintA: gl.getUniformLocation(program, 'uTintA'),
    uTintB: gl.getUniformLocation(program, 'uTintB'),
    uTintC: gl.getUniformLocation(program, 'uTintC')
  };

  const state = {
    time: 0,
    lastFrame: 0,
    target: { x: 0, y: 0 },
    damped: { x: 0, y: 0 },
    center: [0.34, 0.04],
    quality: 0,
    autoQuality: true,
    previousMean: 0,
    sampleStart: 0,
    samples: [],
    running: false,
    visible: true,
    seed: 100 * Math.random(),
    raf: 0,
    fadeRaf: 0
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1024px)');

  const setCenter = () => {
    const height = Math.max(frame.clientHeight, 1);
    if (desktop.matches) {
      const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      state.center[0] = Math.max(0.34, 21 * rootSize / height);
      state.center[1] = -2 * rootSize / height;
    } else {
      state.center[0] = 0;
      state.center[1] = 0.15;
    }
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * QUALITY[state.quality];
    const width = Math.max(1, frame.clientWidth);
    const height = Math.max(1, frame.clientHeight);
    host.width = Math.round(width * dpr);
    host.height = Math.round(height * dpr);
    host.style.width = '100%';
    host.style.height = '100%';
    gl.viewport(0, 0, host.width, host.height);
    setCenter();
    render();
  };

  const render = () => {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(uniforms.uTime, reducedMotion.matches ? 8 : state.time);
    gl.uniform2f(uniforms.uResolution, host.width, host.height);
    gl.uniform2f(uniforms.uMouse, state.damped.x, state.damped.y);
    gl.uniform2f(uniforms.uCenter, state.center[0], state.center[1]);
    gl.uniform1f(uniforms.uSeed, state.seed);
    gl.uniform3fv(uniforms.uTintA, TINT_A);
    gl.uniform3fv(uniforms.uTintB, TINT_B);
    gl.uniform3fv(uniforms.uTintC, TINT_C);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resetSamples = () => {
    state.sampleStart = performance.now() + 750;
    state.samples.length = 0;
  };

  const sampleFrame = (now, delta) => {
    if (!state.autoQuality || now < state.sampleStart) return;
    state.samples.push(delta);
    if (now - state.sampleStart < 1500 || state.samples.length < 2) return;

    state.samples.sort((a, b) => a - b);
    const trim = state.samples.length - Math.floor(0.1 * state.samples.length);
    let total = 0;
    for (let i = 0; i < trim; i += 1) total += state.samples[i];
    const mean = total / trim;
    state.sampleStart = now;
    state.samples.length = 0;

    if (state.previousMean) {
      const improved = mean < 0.85 * state.previousMean;
      state.previousMean = 0;
      if (!improved) {
        state.autoQuality = false;
        state.quality = Math.max(0, state.quality - 1);
        resize();
        return;
      }
    }
    if (mean > 25 && state.quality < QUALITY.length - 1) {
      state.previousMean = mean;
      state.quality += 1;
      resize();
      resetSamples();
    }
  };

  const tick = now => {
    if (!host.isConnected) {
      cancelAnimationFrame(state.raf);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return;
    }
    state.raf = requestAnimationFrame(tick);
    const delta = now - state.lastFrame;
    if (delta < 10.5) return;
    state.lastFrame = now;
    const dt = Math.min(delta / 1000, 0.05);
    state.time += dt;
    const damp = 1 - Math.pow(0.955, 60 * dt);
    state.damped.x += (state.target.x - state.damped.x) * damp;
    state.damped.y += (state.target.y - state.damped.y) * damp;
    render();
    sampleFrame(now, delta);
  };

  const updateRunning = () => {
    const shouldRun = state.visible && !document.hidden && !reducedMotion.matches;
    if (shouldRun && !state.running) {
      state.running = true;
      state.lastFrame = performance.now();
      resetSamples();
      state.raf = requestAnimationFrame(tick);
    } else if (!shouldRun && state.running) {
      state.running = false;
      cancelAnimationFrame(state.raf);
      render();
    }
  };

  const onPointerMove = event => {
    state.target.x = event.clientX / window.innerWidth * 2 - 1;
    state.target.y = -(event.clientY / window.innerHeight * 2 - 1);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(frame);
  const visibility = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
    updateRunning();
  });
  visibility.observe(frame);

  host.style.display = 'block';
  state.seed = 100 * Math.random();
  if (reducedMotion.matches) {
    host.style.opacity = '1';host.setAttribute('data-rm-ready','1');window.dispatchEvent(new Event('rm:blackhole-ready'));
    resize();
  } else {
    host.style.opacity = '0';
    host.style.transition = 'opacity 900ms ease';
    resize();
    state.fadeRaf = requestAnimationFrame(() => {
      state.fadeRaf = requestAnimationFrame(() => {
        host.style.opacity = '1';host.setAttribute('data-rm-ready','1');window.dispatchEvent(new Event('rm:blackhole-ready'));
      });
    });
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', updateRunning);
  reducedMotion.addEventListener('change', updateRunning);
  desktop.addEventListener('change', resize);
  updateRunning();

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(state.raf);
    cancelAnimationFrame(state.fadeRaf);
    observer.disconnect();
    visibility.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', updateRunning);
    reducedMotion.removeEventListener('change', updateRunning);
    desktop.removeEventListener('change', resize);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }, { once: true });
  };
  requestAnimationFrame(() => requestAnimationFrame(start));
})();
