import * as THREE from 'three';

export function createCompositeTearMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      tLondon: { value: null },
      tParis: { value: null },
      uSeamX: { value: 0.5 },
      uVelocity: { value: 0.0 },
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(1280, 720) },
      uEtchingStrength: { value: 0.62 },
      uMonoMode: { value: 0.0 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform sampler2D tLondon;
      uniform sampler2D tParis;
      uniform float uSeamX;
      uniform float uVelocity;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uEtchingStrength;
      uniform float uMonoMode;

      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float noise1D(float x) {
        float i = floor(x);
        float f = fract(x);
        float u = f * f * (3.0 - 2.0 * f);
        return mix(hash21(vec2(i, 1.7)), hash21(vec2(i + 1.0, 1.7)), u);
      }

      float fbm1D(float y) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * (noise1D(y) - 0.5);
          y *= 2.13;
          a *= 0.5;
        }
        return v;
      }

      vec3 acesFilm(vec3 x) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }

      float copperplateHatch(vec2 fragCoord, float lum) {
        float hatch = 1.0;

        // Primary 45 deg engraving strokes
        float line1 = sin((fragCoord.x + fragCoord.y) * 0.68);
        // Cross -45 deg shadow hatching
        float line2 = sin((fragCoord.x - fragCoord.y) * 0.68);
        // Fine horizontal plate grain
        float line3 = sin(fragCoord.y * 1.10);

        if (lum < 0.78) {
          float w1 = smoothstep(0.78, 0.34, lum);
          float s1 = smoothstep(-0.28, 0.28, line1);
          hatch *= mix(1.0, 0.68 + 0.32 * s1, w1);
        }
        if (lum < 0.50) {
          float w2 = smoothstep(0.50, 0.14, lum);
          float s2 = smoothstep(-0.28, 0.28, line2);
          hatch *= mix(1.0, 0.56 + 0.44 * s2, w2);
        }
        if (lum < 0.26) {
          float w3 = smoothstep(0.26, 0.04, lum);
          float s3 = smoothstep(-0.35, 0.35, line3);
          hatch *= mix(1.0, 0.58 + 0.42 * s3, w3);
        }
        return hatch;
      }

      float sampleLuma(sampler2D tex, vec2 uv) {
        return dot(texture2D(tex, clamp(uv, 0.001, 0.999)).rgb, vec3(0.299, 0.587, 0.114));
      }

      float sobelEdge(sampler2D tex, vec2 uv, vec2 texel) {
        float tl = sampleLuma(tex, uv + vec2(-texel.x, texel.y));
        float tr = sampleLuma(tex, uv + vec2(texel.x, texel.y));
        float bl = sampleLuma(tex, uv + vec2(-texel.x, -texel.y));
        float br = sampleLuma(tex, uv + vec2(texel.x, -texel.y));
        float gx = (tr + br) - (tl + bl);
        float gy = (tl + tr) - (bl + br);
        return smoothstep(0.08, 0.30, length(vec2(gx, gy)));
      }

      void main() {
        vec2 fragCoord = vUv * uResolution;
        float aspect = uResolution.x / max(1.0, uResolution.y);

        // Organic hand-torn parchment seam along Y
        float speedBoost = clamp(abs(uVelocity) * 1.8, 0.0, 0.018);
        float tearAmp = 0.0085 + speedBoost;
        float tearOffset = fbm1D(vUv.y * 14.0 + uTime * 0.28) * tearAmp
                         + fbm1D(vUv.y * 46.0 - uTime * 0.45) * 0.0028;

        // Clamp seam edge perturbation smoothly near extreme left/right
        float edgeMask = smoothstep(0.0, 0.08, uSeamX) * smoothstep(1.0, 0.92, uSeamX);
        float seam = uSeamX + tearOffset * edgeMask;

        float dist = vUv.x - seam;
        float absDist = abs(dist);

        // Subtle glass/heat refraction near the Golden Seam
        float refractZone = exp(-absDist * 95.0) * edgeMask;
        vec2 refrOffset = vec2(sign(dist) * refractZone * 0.0045, refractZone * 0.002 * sin(vUv.y * 30.0));

        vec2 uvL = clamp(vUv + refrOffset, 0.001, 0.999);
        vec2 uvR = clamp(vUv - refrOffset, 0.001, 0.999);

        // Soft anti-aliased split
        float px = 1.35 / max(1.0, uResolution.x);
        float sideMask = smoothstep(-px, px, dist); // 0 = London (left), 1 = Paris (right)

        vec3 colLondon = texture2D(tLondon, uvL).rgb;
        vec3 colParis = texture2D(tParis, uvR).rgb;

        // City atmospheric color separation (Chiaroscuro)
        // London: cool slate moonlight + warm amber window sparks preserved
        float lumL = dot(colLondon, vec3(0.299, 0.587, 0.114));
        vec3 gradedLondon = mix(
          colLondon * vec3(0.86, 0.95, 1.08),
          colLondon * vec3(1.12, 1.03, 0.94),
          smoothstep(0.35, 0.85, lumL)
        );

        // Paris: warm umber soot shadows + glowing scarlet embers
        float lumP = dot(colParis, vec3(0.299, 0.587, 0.114));
        vec3 gradedParis = mix(
          colParis * vec3(1.06, 0.88, 0.86),
          colParis * vec3(1.18, 0.96, 0.85),
          smoothstep(0.30, 0.85, lumP)
        );

        vec3 sceneCol = mix(gradedLondon, gradedParis, sideMask);

        // Lift shadows subtly & run ACES Filmic in linear light, then encode sRGB
        sceneCol = acesFilm(sceneCol * 1.38);
        sceneCol = pow(max(sceneCol, vec3(0.0)), vec3(1.0 / 2.2));

        float finalLum = dot(sceneCol, vec3(0.299, 0.587, 0.114));

        // Gustave Dore Copperplate Cross-Hatching & Crisp Ink Outlines
        vec2 texel = 1.0 / max(vec2(1.0), uResolution);
        float edgeL = sobelEdge(tLondon, uvL, texel);
        float edgeP = sobelEdge(tParis, uvR, texel);
        float inkEdge = mix(edgeL, edgeP, sideMask);

        float hatch = copperplateHatch(fragCoord, finalLum);
        float hatchAmt = mix(uEtchingStrength * 0.52, uEtchingStrength * 0.92, uMonoMode);
        sceneCol *= mix(1.0, hatch, hatchAmt);
        sceneCol *= (1.0 - inkEdge * mix(0.36, 0.68, uMonoMode));

        // Pure Monochrome Copperplate Etching Mode (Sepia Ivory Paper + Iron Ink)
        if (uMonoMode > 0.01) {
          float inkLum = dot(sceneCol, vec3(0.299, 0.587, 0.114));
          vec3 inkShadow = mix(vec3(0.06, 0.06, 0.08), vec3(0.12, 0.06, 0.06), sideMask);
          vec3 paperLight = mix(vec3(0.90, 0.88, 0.82), vec3(0.93, 0.85, 0.74), sideMask);
          vec3 monoPlate = mix(inkShadow, paperLight, smoothstep(0.03, 0.88, inkLum));
          sceneCol = mix(sceneCol, monoPlate, uMonoMode);
        }

        // Golden Seam Torn-Parchment Glow & Charred Margin
        float charBorder = exp(-absDist * 220.0) * edgeMask;
        float moltenGold = exp(-absDist * 420.0) * (0.78 + 0.22 * sin(vUv.y * 40.0 + uTime * 3.0)) * edgeMask;
        float haloGold = exp(-absDist * (70.0 - speedBoost * 1600.0)) * (0.28 + speedBoost * 10.0) * edgeMask;

        sceneCol = mix(sceneCol, vec3(0.16, 0.08, 0.04), charBorder * 0.55);
        sceneCol += vec3(0.84, 0.64, 0.30) * haloGold;
        sceneCol += vec3(1.0, 0.86, 0.52) * moltenGold * 0.92;

        // Fine archival cotton-rag paper grain
        float grain = (hash21(fragCoord + fract(uTime * 17.3)) - 0.5) * 0.032;
        sceneCol += grain;

        // Subtle museum vignette (kept gentle so corners stay legible)
        vec2 centered = (vUv - 0.5) * vec2(aspect * 0.72, 1.0);
        float vig = 1.0 - smoothstep(0.55, 1.18, length(centered)) * 0.34;
        sceneCol *= vig;

        gl_FragColor = vec4(clamp(sceneCol, 0.0, 1.0), 1.0);
      }
    `,
    depthWrite: false,
    depthTest: false
  });
}
