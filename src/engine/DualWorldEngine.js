import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createCompositeTearMaterial } from './CompositeTearShader.js';

const CAMERA_PRESETS = {
  prologue: {
    pos: new THREE.Vector3(0.1, 7.6, 13.8),
    target: new THREE.Vector3(0.0, 1.55, 0.2),
    autoOrbit: true
  },
  diorama: {
    pos: new THREE.Vector3(0.0, 7.8, 13.4),
    target: new THREE.Vector3(0.0, 1.45, 0.0),
    autoOrbit: false
  },
  finale: {
    pos: new THREE.Vector3(-4.6, 8.2, 12.6),
    target: new THREE.Vector3(0.0, 1.55, 0.0),
    autoOrbit: true
  }
};

export class DualWorldEngine {
  constructor(canvas, { onLoaded, onError, onFrame } = {}) {
    this.canvas = canvas;
    this.onLoaded = onLoaded;
    this.onError = onError;
    this.onFrame = onFrame;

    this.seamX = 0.5;
    this.seamVelocity = 0.0;
    this.monoTarget = 0.0;
    this.monoCurrent = 0.0;
    this.autoOrbit = true;
    this.userInteracting = false;
    this.tween = null;
    this.clock = new THREE.Clock();
    this.animFrame = null;

    this.londonLights = {};
    this.parisLights = {};

    this._initRenderer();
    this._initScenes();
    this._initCompositePass();
    this._initControls();
    this._loadModels();

    this._handleResize = this._resize.bind(this);
    window.addEventListener('resize', this._handleResize);
    this._resize();
    this._animate();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const dpr = this.renderer.getPixelRatio();

    const rtOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true
    };
    this.rtLondon = new THREE.WebGLRenderTarget(Math.floor(w * dpr), Math.floor(h * dpr), rtOptions);
    this.rtParis = new THREE.WebGLRenderTarget(Math.floor(w * dpr), Math.floor(h * dpr), rtOptions);

    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 120);
    this.camera.position.copy(CAMERA_PRESETS.prologue.pos);
  }

  _initScenes() {
    // 1. LONDON 1775 SCENE (Cool moonlight fog + warm Soho gaslight & brass)
    this.sceneLondon = new THREE.Scene();
    this.sceneLondon.background = new THREE.Color('#162333');
    this.sceneLondon.fog = new THREE.FogExp2('#152130', 0.024);

    const lonHemi = new THREE.HemisphereLight('#96bddf', '#262d38', 1.45);
    this.sceneLondon.add(lonHemi);

    const lonMoon = new THREE.DirectionalLight('#cce3f8', 2.45);
    lonMoon.position.set(-8, 14, 9);
    lonMoon.castShadow = true;
    lonMoon.shadow.mapSize.set(1024, 1024);
    lonMoon.shadow.camera.near = 2;
    lonMoon.shadow.camera.far = 36;
    lonMoon.shadow.camera.left = -9;
    lonMoon.shadow.camera.right = 9;
    lonMoon.shadow.camera.top = 9;
    lonMoon.shadow.camera.bottom = -9;
    lonMoon.shadow.bias = -0.0005;
    this.sceneLondon.add(lonMoon);

    const lonFill = new THREE.DirectionalLight('#6b88aa', 0.95);
    lonFill.position.set(10, 6, -8);
    this.sceneLondon.add(lonFill);

    const lonSohoGlow = new THREE.PointLight('#ffaf4a', 5.2, 11, 1.4);
    lonSohoGlow.position.set(-2.7, 2.0, 0.2);
    this.sceneLondon.add(lonSohoGlow);

    const lonCoachGlow = new THREE.PointLight('#ffbe5c', 4.4, 8, 1.4);
    lonCoachGlow.position.set(-0.3, 1.8, 2.2);
    this.sceneLondon.add(lonCoachGlow);

    const lonBankGlow = new THREE.PointLight('#ffd288', 2.8, 8, 1.5);
    lonBankGlow.position.set(2.3, 1.8, 2.1);
    this.sceneLondon.add(lonBankGlow);

    this.londonLights = { lonSohoGlow, lonCoachGlow, lonBankGlow };
    this.londonRain = this._createLondonRain();
    this.sceneLondon.add(this.londonRain);

    // 2. PARIS 1775 SCENE (Smoky crimson dusk + brazier fire & guillotine steel glint)
    this.sceneParis = new THREE.Scene();
    this.sceneParis.background = new THREE.Color('#271014');
    this.sceneParis.fog = new THREE.FogExp2('#220d11', 0.025);

    const parHemi = new THREE.HemisphereLight('#c87e70', '#241418', 1.38);
    this.sceneParis.add(parHemi);

    const parSun = new THREE.DirectionalLight('#ff9b6d', 2.55);
    parSun.position.set(-7, 13, 10);
    parSun.castShadow = true;
    parSun.shadow.mapSize.set(1024, 1024);
    parSun.shadow.camera.near = 2;
    parSun.shadow.camera.far = 36;
    parSun.shadow.camera.left = -9;
    parSun.shadow.camera.right = 9;
    parSun.shadow.camera.top = 9;
    parSun.shadow.camera.bottom = -9;
    parSun.shadow.bias = -0.0005;
    this.sceneParis.add(parSun);

    const parRim = new THREE.DirectionalLight('#a8b6cc', 0.9);
    parRim.position.set(10, 9, -7);
    this.sceneParis.add(parRim);

    const parBrazier = new THREE.PointLight('#ff5d22', 6.2, 12, 1.3);
    parBrazier.position.set(-1.1, 1.4, 2.2);
    this.sceneParis.add(parBrazier);

    const parWine = new THREE.PointLight('#e32436', 4.6, 9, 1.4);
    parWine.position.set(-2.6, 1.5, 0.9);
    this.sceneParis.add(parWine);

    const parTower = new THREE.PointLight('#ff8f52', 3.4, 10, 1.4);
    parTower.position.set(2.8, 3.8, -1.8);
    this.sceneParis.add(parTower);

    this.parisLights = { parBrazier, parWine, parTower };
    this.parisEmbers = this._createParisEmbers();
    this.sceneParis.add(this.parisEmbers);
  }

  _createLondonRain() {
    const count = 480;
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 18;
      const y = Math.random() * 11;
      const z = (Math.random() - 0.5) * 18;
      const len = 0.35 + Math.random() * 0.25;
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x - 0.08;
      positions[i * 6 + 4] = y - len;
      positions[i * 6 + 5] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#a8cce8',
      transparent: true,
      opacity: 0.32
    });
    return new THREE.LineSegments(geo, mat);
  }

  _createParisEmbers() {
    const count = 260;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = Math.random() * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      speeds[i] = 0.45 + Math.random() * 1.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData.speeds = speeds;
    const mat = new THREE.PointsMaterial({
      color: '#ff7b3b',
      size: 0.09,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    return new THREE.Points(geo, mat);
  }

  _initCompositePass() {
    this.compositeScene = new THREE.Scene();
    this.compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.compositeMaterial = createCompositeTearMaterial();
    this.compositeMaterial.uniforms.tLondon.value = this.rtLondon.texture;
    this.compositeMaterial.uniforms.tParis.value = this.rtParis.texture;

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMaterial);
    this.compositeScene.add(quad);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.copy(CAMERA_PRESETS.prologue.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 6.2;
    this.controls.maxDistance = 17.5;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI * 0.46;

    this.controls.addEventListener('start', () => {
      this.userInteracting = true;
      this.tween = null;
    });
    this.controls.addEventListener('end', () => {
      this.userInteracting = false;
    });
  }

  _createCanvasTexture(drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  _getCraftTexturePack() {
    if (this._craftPack) return this._craftPack;

    const cobbleBump = this._createCanvasTexture((ctx, size) => {
      ctx.fillStyle = '#242424';
      ctx.fillRect(0, 0, size, size);
      const rows = 10;
      const cols = 8;
      const rh = size / rows;
      const cw = size / cols;
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (cw * 0.5);
        for (let c = -1; c <= cols; c++) {
          const x = c * cw + offset + 4;
          const y = r * rh + 4;
          const w = cw - 8;
          const h = rh - 8;
          const shade = 148 + ((r * 37 + c * 53) % 62);
          const grad = ctx.createRadialGradient(
            x + w * 0.45,
            y + h * 0.42,
            2,
            x + w * 0.5,
            y + h * 0.5,
            Math.max(w, h) * 0.65
          );
          grad.addColorStop(0, `rgb(${shade + 24},${shade + 24},${shade + 24})`);
          grad.addColorStop(1, `rgb(${shade - 55},${shade - 55},${shade - 55})`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 9);
          ctx.fill();
        }
      }
    });

    const cobbleRough = this._createCanvasTexture((ctx, size) => {
      ctx.fillStyle = '#484848'; // glossy wet mortar seams
      ctx.fillRect(0, 0, size, size);
      const rows = 10;
      const cols = 8;
      const rh = size / rows;
      const cw = size / cols;
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (cw * 0.5);
        for (let c = -1; c <= cols; c++) {
          const x = c * cw + offset + 4;
          const y = r * rh + 4;
          const v = 98 + ((r * 29 + c * 43) % 52);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.beginPath();
          ctx.roundRect(x, y, cw - 8, rh - 8, 9);
          ctx.fill();
        }
      }
    });

    const stoneBump = this._createCanvasTexture((ctx, size) => {
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(0, 0, size, size);
      const rows = 12;
      const cols = 6;
      const rh = size / rows;
      const cw = size / cols;
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (cw * 0.5);
        for (let c = -1; c <= cols; c++) {
          const x = c * cw + offset + 2.5;
          const y = r * rh + 2.5;
          const shade = 140 + ((r * 41 + c * 67) % 58);
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
          ctx.fillRect(x, y, cw - 5, rh - 5);
        }
      }
      // Subtle weathered mineral speckle
      for (let i = 0; i < 1600; i++) {
        const px = (i * 197) % size;
        const py = (i * 313) % size;
        const s = i % 2 === 0 ? 110 : 210;
        ctx.fillStyle = `rgba(${s},${s},${s},0.16)`;
        ctx.fillRect(px, py, 2, 2);
      }
    });

    const grainBump = this._createCanvasTexture((ctx, size) => {
      ctx.fillStyle = '#787878';
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 6) {
        const v = 105 + Math.floor(Math.sin(y * 0.14) * 28 + ((y * 13) % 24));
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(0, y, size, 4);
      }
      for (let i = 0; i < 420; i++) {
        const gx = (i * 131) % size;
        const gy = (i * 257) % size;
        ctx.fillStyle = 'rgba(40,40,40,0.22)';
        ctx.fillRect(gx, gy, 36, 1.5);
      }
    });

    this._craftPack = { cobbleBump, cobbleRough, stoneBump, grainBump };
    return this._craftPack;
  }

  _applyBoxProjectionUV(mesh, uvScale = 0.52) {
    const geom = mesh.geometry;
    const pos = geom.attributes.position;
    if (!pos) return;
    if (!geom.attributes.normal) geom.computeVertexNormals();
    const norm = geom.attributes.normal;
    const count = pos.count;
    const uvs = new Float32Array(count * 2);

    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const normalMat = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);

    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      n.fromBufferAttribute(norm, i).applyMatrix3(normalMat).normalize();
      const ax = Math.abs(n.x);
      const ay = Math.abs(n.y);
      const az = Math.abs(n.z);

      let uCoord = 0;
      let vCoord = 0;
      if (ay >= ax && ay >= az) {
        uCoord = v.x;
        vCoord = v.z;
      } else if (ax >= ay && ax >= az) {
        uCoord = v.z;
        vCoord = v.y;
      } else {
        uCoord = v.x;
        vCoord = v.y;
      }
      uvs[i * 2] = uCoord * uvScale;
      uvs[i * 2 + 1] = vCoord * uvScale;
    }
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  applyProceduralCraftTextures(root) {
    const pack = this._getCraftTexturePack();
    root.updateMatrixWorld(true);

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const matName = mats[0]?.name || '';

      // Skip emissive/glass/brass/tiny trim details from heavy stone UV projection
      if (/Amber|Fire|BloodText|Wine|Brass|Blade|Iron/i.test(matName)) return;

      const scale = /Cobble/i.test(matName) ? 0.55 : /Slate|Mahogany|OakStave|RoyalCoach/i.test(matName) ? 0.85 : 0.45;
      this._applyBoxProjectionUV(obj, scale);

      mats.forEach((mat) => {
        const mName = mat.name || '';
        if (/Cobble/i.test(mName)) {
          mat.bumpMap = pack.cobbleBump;
          mat.bumpScale = 0.09;
          mat.roughnessMap = pack.cobbleRough;
          mat.roughness = 0.48;
          mat.needsUpdate = true;
        } else if (/Stone|Brick|Plaster/i.test(mName)) {
          mat.bumpMap = pack.stoneBump;
          mat.bumpScale = 0.06;
          mat.needsUpdate = true;
        } else if (/Slate|Mahogany|OakStave|RoyalCoach/i.test(mName)) {
          mat.bumpMap = pack.grainBump;
          mat.bumpScale = 0.04;
          mat.needsUpdate = true;
        }
      });
    });
  }

  _loadModels() {
    const loader = new GLTFLoader();
    let loadedCount = 0;

    const prepareSceneModel = (root) => {
      root.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      this.applyProceduralCraftTextures(root);
    };

    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount === 2 && this.onLoaded) {
        this.onLoaded();
      }
    };

    loader.load(
      './models/london_act1.glb',
      (gltf) => {
        prepareSceneModel(gltf.scene);
        this.londonModel = gltf.scene;
        this.sceneLondon.add(gltf.scene);
        markLoaded();
      },
      undefined,
      (err) => {
        console.error('Failed loading london_act1.glb', err);
        if (this.onError) this.onError(err);
      }
    );

    loader.load(
      './models/paris_act1.glb',
      (gltf) => {
        prepareSceneModel(gltf.scene);
        this.parisModel = gltf.scene;
        this.sceneParis.add(gltf.scene);
        markLoaded();
      },
      undefined,
      (err) => {
        console.error('Failed loading paris_act1.glb', err);
        if (this.onError) this.onError(err);
      }
    );
  }

  setSeam(x, velocity = 0) {
    this.seamX = Math.max(0.04, Math.min(0.96, x));
    this.seamVelocity = velocity;
  }

  setMonoMode(isMono) {
    this.monoTarget = isMono ? 1.0 : 0.0;
  }

  setOrbitEnabled(enabled) {
    this.controls.enabled = enabled;
  }

  focusPreset(name, duration = 1.15) {
    const preset = CAMERA_PRESETS[name] || CAMERA_PRESETS.diorama;
    this.autoOrbit = preset.autoOrbit;
    this.tween = {
      startPos: this.camera.position.clone(),
      endPos: preset.pos.clone(),
      startTarget: this.controls.target.clone(),
      endTarget: preset.target.clone(),
      elapsed: 0,
      duration
    };
  }

  focusWorldPoint(pointArr, duration = 0.9) {
    const target = new THREE.Vector3(pointArr[0], pointArr[1] * 0.75, pointArr[2]);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const desiredPos = target.clone().addScaledVector(dir, 8.8);
    desiredPos.y = Math.max(3.6, Math.min(8.2, desiredPos.y));
    this.autoOrbit = false;
    this.tween = {
      startPos: this.camera.position.clone(),
      endPos: desiredPos,
      startTarget: this.controls.target.clone(),
      endTarget: target,
      elapsed: 0,
      duration
    };
  }

  projectAnchors(anchors) {
    const vec = new THREE.Vector3();
    return anchors.map((anchor) => {
      vec.set(anchor.pos[0], anchor.pos[1], anchor.pos[2]);
      vec.project(this.camera);
      const sx = (vec.x + 1) * 0.5;
      const sy = (1 - vec.y) * 0.5;
      const visible = vec.z < 1 && sx > 0.04 && sx < 0.96 && sy > 0.10 && sy < 0.90;
      const side = sx < this.seamX ? 'london' : 'paris';
      return {
        id: anchor.id,
        sx,
        sy,
        visible,
        side
      };
    });
  }

  _resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.rtLondon.setSize(Math.floor(w * dpr), Math.floor(h * dpr));
    this.rtParis.setSize(Math.floor(w * dpr), Math.floor(h * dpr));

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.compositeMaterial.uniforms.uResolution.value.set(w * dpr, h * dpr);
  }

  _updateParticlesAndLights(dt, t) {
    // Animate London slanted rain
    if (this.londonRain) {
      const posAttr = this.londonRain.geometry.getAttribute('position');
      const arr = posAttr.array;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= dt * 8.2;
        arr[i + 4] -= dt * 8.2;
        arr[i + 0] -= dt * 0.85;
        arr[i + 3] -= dt * 0.85;
        if (arr[i + 4] < -0.5) {
          const resetY = 9.5 + Math.random() * 2.5;
          const resetX = (Math.random() - 0.5) * 18;
          const len = 0.35 + Math.random() * 0.25;
          arr[i + 0] = resetX;
          arr[i + 1] = resetY;
          arr[i + 3] = resetX - 0.08;
          arr[i + 4] = resetY - len;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Animate Paris rising embers
    if (this.parisEmbers) {
      const posAttr = this.parisEmbers.geometry.getAttribute('position');
      const speeds = this.parisEmbers.geometry.userData.speeds;
      const arr = posAttr.array;
      for (let i = 0; i < speeds.length; i++) {
        const idx = i * 3;
        arr[idx + 1] += dt * speeds[i];
        arr[idx + 0] += Math.sin(t * 1.6 + i) * dt * 0.22;
        if (arr[idx + 1] > 9.5) {
          arr[idx + 1] = 0.15;
          arr[idx + 0] = (Math.random() - 0.5) * 14;
          arr[idx + 2] = (Math.random() - 0.5) * 14;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Subtle gaslight & brazier candle flicker
    if (this.londonLights.lonSohoGlow) {
      this.londonLights.lonSohoGlow.intensity = 5.0 + Math.sin(t * 4.3) * 0.35;
      this.londonLights.lonCoachGlow.intensity = 4.3 + Math.sin(t * 6.1 + 1.2) * 0.28;
    }
    if (this.parisLights.parBrazier) {
      this.parisLights.parBrazier.intensity = 6.0 + Math.sin(t * 8.5) * 0.9 + Math.cos(t * 13.0) * 0.45;
      this.parisLights.parWine.intensity = 4.4 + Math.sin(t * 5.2 + 0.7) * 0.55;
    }
  }

  _animate() {
    this.animFrame = requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // Camera tweening
    if (this.tween) {
      this.tween.elapsed += dt;
      const p = Math.min(1, this.tween.elapsed / this.tween.duration);
      const ease = 1 - Math.pow(1 - p, 3);
      this.camera.position.lerpVectors(this.tween.startPos, this.tween.endPos, ease);
      this.controls.target.lerpVectors(this.tween.startTarget, this.tween.endTarget, ease);
      if (p >= 1) this.tween = null;
    } else if (this.autoOrbit && !this.userInteracting) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.09);
      this.camera.position.copy(this.controls.target).add(offset);
    }

    this.controls.update();
    this._updateParticlesAndLights(dt, t);

    // Smooth shader parameters
    this.seamVelocity *= 0.88;
    this.monoCurrent += (this.monoTarget - this.monoCurrent) * Math.min(1, dt * 8.0);

    this.compositeMaterial.uniforms.uSeamX.value = this.seamX;
    this.compositeMaterial.uniforms.uVelocity.value = this.seamVelocity;
    this.compositeMaterial.uniforms.uTime.value = t;
    this.compositeMaterial.uniforms.uMonoMode.value = this.monoCurrent;

    // Render London & Paris offscreen, then Composite Tear Shader to screen
    this.renderer.setRenderTarget(this.rtLondon);
    this.renderer.render(this.sceneLondon, this.camera);

    this.renderer.setRenderTarget(this.rtParis);
    this.renderer.render(this.sceneParis, this.camera);

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.compositeScene, this.compositeCamera);

    if (this.onFrame) {
      this.onFrame();
    }
  }

  dispose() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    window.removeEventListener('resize', this._handleResize);
    this.controls.dispose();
    this.rtLondon.dispose();
    this.rtParis.dispose();
    this.renderer.dispose();
  }
}
