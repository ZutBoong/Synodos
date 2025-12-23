import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const VS = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// v0 스타일: 저주파 + domain warp (패턴티 제거)
const FS_BASE = `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}
float noise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  float a=hash(i);
  float b=hash(i+vec2(1.0,0.0));
  float c=hash(i+vec2(0.0,1.0));
  float d=hash(i+vec2(1.0,1.0));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float s=0.0;
  float a=0.55;
  s += a*noise(p); p = p*1.85 + 17.0; a*=0.45;
  s += a*noise(p); p = p*1.75 + 11.0; a*=0.45;
  s += a*noise(p);
  return s;
}

void main(){
  vec2 uv = vUv;
  vec2 asp = vec2(u_res.x/u_res.y, 1.0);
  vec2 p = (uv - 0.5) * asp;

  float t = u_time * 0.18; // 움직임이 확실히 보이도록 (나중에 줄이셔도 됩니다)

  // domain warp(저주파)
  vec2 w1 = vec2(fbm(p*0.55 + vec2(t, -t*0.6)), fbm(p*0.55 + vec2(-t*0.5, t)));
  vec2 w2 = vec2(fbm(p*0.30 + w1 + vec2(-t*0.25, t*0.35)), fbm(p*0.30 + w1 + vec2(t*0.3, -t*0.2)));

  float n = fbm(p*0.70 + w2*0.9);

  // v0 팔레트(골드/바이올렛/블루)
  vec3 gold   = vec3(0.80, 0.62, 0.38);
  vec3 violet = vec3(0.50, 0.45, 0.68);
  vec3 blue   = vec3(0.22, 0.38, 0.72);

  vec3 col = mix(gold, violet, smoothstep(0.22, 0.62, n));
  col = mix(col, blue,   smoothstep(0.55, 0.92, n));

  // 대비/채도 살짝 낮추기 (쉐이더 티 제거)
  col = mix(col, vec3(dot(col, vec3(0.333))), 0.14);

  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_BLUR = `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_tex;
uniform vec2 u_dir;

void main(){
  vec3 c = texture2D(u_tex, vUv).rgb * 0.227027;
  c += texture2D(u_tex, vUv + u_dir * 1.384615).rgb * 0.316216;
  c += texture2D(u_tex, vUv - u_dir * 1.384615).rgb * 0.316216;
  c += texture2D(u_tex, vUv + u_dir * 3.230769).rgb * 0.070270;
  c += texture2D(u_tex, vUv - u_dir * 3.230769).rgb * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}
`;

const FS_COMPOSE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_base;
uniform sampler2D u_blur;
uniform vec2 u_res;
uniform float u_time;

float grain(vec2 p){
  return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);
}

vec3 filmCurve(vec3 x){
  x = max(x, 0.0);
  x = x / (x + vec3(0.65));
  return pow(x, vec3(0.92));
}

void main(){
  vec3 base = texture2D(u_base, vUv).rgb;
  vec3 blur = texture2D(u_blur, vUv).rgb;

  // v0 느낌: 살짝 번지는 bloom
  vec3 col = base + blur * 0.72;

  // 약한 비네팅
  vec2 p = vUv - 0.5;
  p.x *= u_res.x / u_res.y;
  float v = dot(p,p);
  col *= 1.0 - v * 0.28;

  // 아주 미세한 그레인
  float g = grain(vUv * u_res + u_time * 60.0) - 0.5;
  col += g * 0.010;

  col = filmCurve(col);

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function ShaderBackgroundV0() {
    const mountRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // StrictMode(개발환경)에서 effect가 2번 돌 때 “첫 프레임만 남는” 문제 방지
        let stopped = false;
        let rafId = 0;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        const setSize = () => {
            const dpr = Math.min(window.devicePixelRatio, 2);
            renderer.setPixelRatio(dpr);
            renderer.setSize(window.innerWidth, window.innerHeight, false);
            return dpr;
        };

        const dpr0 = setSize();
        mount.appendChild(renderer.domElement);

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quadGeo = new THREE.PlaneGeometry(2, 2);

        const sceneBase = new THREE.Scene();
        const sceneBlurH = new THREE.Scene();
        const sceneBlurV = new THREE.Scene();
        const sceneCompose = new THREE.Scene();

        const baseMat = new THREE.ShaderMaterial({
            vertexShader: VS,
            fragmentShader: FS_BASE,
            uniforms: {
                u_time: { value: 0 },
                u_res: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            },
            depthTest: false,
            depthWrite: false,
        });

        const blurMatH = new THREE.ShaderMaterial({
            vertexShader: VS,
            fragmentShader: FS_BLUR,
            uniforms: {
                u_tex: { value: null },
                u_dir: { value: new THREE.Vector2(1, 0) },
            },
            depthTest: false,
            depthWrite: false,
        });

        const blurMatV = new THREE.ShaderMaterial({
            vertexShader: VS,
            fragmentShader: FS_BLUR,
            uniforms: {
                u_tex: { value: null },
                u_dir: { value: new THREE.Vector2(0, 1) },
            },
            depthTest: false,
            depthWrite: false,
        });

        const composeMat = new THREE.ShaderMaterial({
            vertexShader: VS,
            fragmentShader: FS_COMPOSE,
            uniforms: {
                u_base: { value: null },
                u_blur: { value: null },
                u_res: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_time: { value: 0 },
            },
            depthTest: false,
            depthWrite: false,
        });

        sceneBase.add(new THREE.Mesh(quadGeo, baseMat));
        sceneBlurH.add(new THREE.Mesh(quadGeo, blurMatH));
        sceneBlurV.add(new THREE.Mesh(quadGeo, blurMatV));
        sceneCompose.add(new THREE.Mesh(quadGeo, composeMat));

        let rtBase, rtBlurA, rtBlurB;

        const rebuildRT = () => {
            const dpr = Math.min(window.devicePixelRatio, 2);

            const W = Math.max(2, Math.floor(window.innerWidth * dpr));
            const H = Math.max(2, Math.floor(window.innerHeight * dpr));

            // bloom을 다운샘플해서 더 “안개처럼”
            const BW = Math.max(2, Math.floor(W * 0.5));
            const BH = Math.max(2, Math.floor(H * 0.5));

            rtBase?.dispose();
            rtBlurA?.dispose();
            rtBlurB?.dispose();

            rtBase = new THREE.WebGLRenderTarget(W, H, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                depthBuffer: false,
                stencilBuffer: false,
            });

            rtBlurA = new THREE.WebGLRenderTarget(BW, BH, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                depthBuffer: false,
                stencilBuffer: false,
            });

            rtBlurB = new THREE.WebGLRenderTarget(BW, BH, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                depthBuffer: false,
                stencilBuffer: false,
            });

            baseMat.uniforms.u_res.value.set(window.innerWidth, window.innerHeight);
            composeMat.uniforms.u_res.value.set(window.innerWidth, window.innerHeight);

            blurMatH.uniforms.u_dir.value.set(1 / BW, 0);
            blurMatV.uniforms.u_dir.value.set(0, 1 / BH);

            composeMat.uniforms.u_base.value = rtBase.texture;
            composeMat.uniforms.u_blur.value = rtBlurB.texture;
        };

        rebuildRT();

        const start = performance.now();

        const tick = () => {
            if (stopped) return;

            const t = (performance.now() - start) / 1000;
            baseMat.uniforms.u_time.value = t;
            composeMat.uniforms.u_time.value = t;

            // Pass 1: base
            renderer.setRenderTarget(rtBase);
            renderer.render(sceneBase, camera);

            // Pass 2: blur H
            blurMatH.uniforms.u_tex.value = rtBase.texture;
            renderer.setRenderTarget(rtBlurA);
            renderer.render(sceneBlurH, camera);

            // Pass 3: blur V
            blurMatV.uniforms.u_tex.value = rtBlurA.texture;
            renderer.setRenderTarget(rtBlurB);
            renderer.render(sceneBlurV, camera);

            // Pass 4: compose
            renderer.setRenderTarget(null);
            renderer.render(sceneCompose, camera);

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        const onResize = () => {
            setSize();
            rebuildRT();
        };
        window.addEventListener("resize", onResize);

        return () => {
            stopped = true;
            cancelAnimationFrame(rafId);
            window.removeEventListener("resize", onResize);

            rtBase?.dispose();
            rtBlurA?.dispose();
            rtBlurB?.dispose();

            quadGeo.dispose();
            baseMat.dispose();
            blurMatH.dispose();
            blurMatV.dispose();
            composeMat.dispose();

            renderer.dispose();

            // 캔버스 DOM 제거(StrictMode에서 특히 중요)
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        };
    }, []);

    return <div ref={mountRef} className="shader-layer" />;
}
