'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * "Pank" — the survey mascot. A fluffy pink ball with big blue eyes, built
 * procedurally in three.js (shell-textured fur with curl, clumping and
 * jiggle; no external model).
 *
 * - Eyes and body follow the cursor anywhere on the page.
 * - Cursor still for a moment → looks down at its feet, breathing, tapping a foot.
 * - Nothing happening for a while → pulls a toy from behind its back and plays
 *   (bubble blaster, yo-yo, balloon). Any activity puts the toy away.
 * - `cheer` increments on every pick → an exaggerated reaction for `mood` (1–5).
 * - `celebrate` → party routine. Click it to make it laugh.
 */

export type MascotProps = {
  mood: number
  cheer: number
  celebrate?: boolean
  /** changes when a new question appears → eyes read along */
  read?: number
  /** covers its eyes (confidential comment) */
  shy?: boolean
  /** calm mode: minimal motion, no toys */
  calm?: boolean
  className?: string
}

const MOODS: Record<number, { key: string; rim: string; glow: string; say: string[] }> = {
  0: { key: '#fff7f2', rim: '#c9b3f2', glow: 'rgba(201,179,242,0.55)', say: ['Take your time', 'Hi there!'] },
  1: { key: '#ece7ff', rim: '#9d86e0', glow: 'rgba(157,134,224,0.50)', say: ['It’s okay, thank you', 'Honesty helps'] },
  2: { key: '#f1ebff', rim: '#b9a2f0', glow: 'rgba(185,162,240,0.50)', say: ['Got it, thank you', 'Noted, thanks'] },
  3: { key: '#fff1f5', rim: '#f4a6c1', glow: 'rgba(244,166,193,0.50)', say: ['Noted!', 'Good to know'] },
  4: { key: '#fff2ef', rim: '#f58fb6', glow: 'rgba(245,143,182,0.60)', say: ['Nice!', 'Yay!'] },
  5: { key: '#fff4e6', rim: '#f2c49b', glow: 'rgba(242,196,155,0.65)', say: ['Love that!', 'Woohoo!'] },
}

type Action = 'nod' | 'comfort' | 'thumbs' | 'wink' | 'hop' | 'spin' | 'jump' | 'flip' | 'dance' | 'laugh' | 'read'
const DUR: Record<Action, number> = {
  read: 1.1, nod: 1.4, comfort: 1.9, thumbs: 1.6, wink: 1.3, hop: 1.5, spin: 1.2, jump: 1.4, flip: 1.6, dance: 2.6, laugh: 1.6,
}
type Toy = 'blaster' | 'yoyo' | 'balloon'
const TOY_PLAY = 5.2
const FETCH = 0.6
const STOW = 0.45

function pickAction(mood: number, reduced: boolean): Action {
  if (reduced) return mood <= 2 ? 'nod' : 'thumbs'
  const pools: Record<number, Action[]> = {
    1: ['comfort'],
    2: ['nod', 'comfort'],
    3: ['thumbs', 'wink'],
    4: ['hop', 'spin', 'dance', 'thumbs'],
    5: ['flip', 'jump', 'dance', 'laugh'],
  }
  const pool = pools[mood] ?? ['thumbs']
  return pool[Math.floor(Math.random() * pool.length)]
}

const FUR_VERT = /* glsl */ `
  uniform float uShell;
  uniform float uLen;
  uniform float uTime;
  uniform vec3 uVel;
  varying vec3 vN;
  varying vec3 vP;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(normal);
    float s = uShell;
    vec3 p = position + n * s * uLen;
    p.y -= s * s * uLen * 0.55;                          // gravity
    p -= uVel * s * s * 0.16;                            // lag behind motion → jiggle
    p.x += sin(uTime * 1.3 + position.y * 5.0 + position.z * 3.0) * s * s * uLen * 0.12; // breeze
    vP = position;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * n);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const FUR_FRAG = /* glsl */ `
  uniform float uShell;
  uniform float uDensity;
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform vec3 uKey;
  uniform vec3 uRim;
  uniform float uFace;
  varying vec3 vN;
  varying vec3 vP;
  varying vec3 vView;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  void main() {
    vec3 dir = normalize(vP);
    vec3 q = dir * uDensity;
    q += vec3(sin(q.y * 0.3 + 1.7), sin(q.z * 0.3 + 0.4), sin(q.x * 0.3 + 2.3)) * uShell * 0.35; // gentle curl
    vec3 c = floor(q);
    vec3 f = fract(q);
    float h = hash(c);
    vec3 j = vec3(hash(c + 1.3), hash(c + 2.7), hash(c + 5.1)) * 0.4 + 0.3;
    float d = length(f - j);
    float len = 0.75 + 0.25 * h;
    // trim fur around the eyes and mouth so the face reads clearly
    float face = max(max(
      smoothstep(0.93, 0.97, dot(dir, normalize(vec3(-0.38, 0.2, 0.9)))),
      smoothstep(0.93, 0.97, dot(dir, normalize(vec3(0.38, 0.2, 0.9))))),
      smoothstep(0.965, 0.99, dot(dir, normalize(vec3(0.0, -0.14, 1.0)))));
    len *= mix(1.0, 0.55, face * uFace);
    float sh = uShell / len;
    // fat, overlapping strands with a soft rounded taper and soft edge
    float r = 1.05 * (1.0 - pow(clamp(sh, 0.0, 1.0), 2.0));
    float a = uShell > 0.0 ? (1.0 - smoothstep(r - 0.35, r, d)) : 1.0;
    a *= 1.0 - smoothstep(0.55, 1.0, sh) * 0.75;               // wispy tips
    vec3 n = normalize(vN);
    vec3 v = normalize(vView);
    float ndv = max(dot(n, v), 0.0);
    a *= mix(1.0, smoothstep(0.0, 0.45, ndv) * 0.7 + 0.3, sh); // fuzzier silhouette
    if (sh > 1.0 || a < 0.02) discard;
    vec3 L = normalize(vec3(0.45, 0.8, 0.6));
    float wrap = max(0.0, (dot(n, L) + 0.5) / 1.5);
    float ao = mix(0.35, 1.0, pow(clamp(sh, 0.0, 1.0), 1.3));
    vec3 deep = uBase * vec3(0.78, 0.42, 0.58);                  // coloured, plush shadow
    vec3 col = mix(uBase, uTip, smoothstep(0.15, 1.0, sh)) * (0.93 + 0.14 * h);
    col = mix(deep, col, ao) * (0.42 + 0.68 * wrap) * uKey;
    float back = pow(clamp(dot(v, -L) * 0.5 + 0.5, 0.0, 1.0), 3.0) * sh;
    float rim = pow(1.0 - ndv, 2.5) * sh;
    col += uRim * (back * 0.35 + rim * 0.75);
    vec3 T = normalize(n + 0.15 * vec3(f - 0.5));
    float th = dot(T, normalize(L + v));
    col += uTip * pow(sqrt(max(0.0, 1.0 - th * th)), 20.0) * 0.12 * sh;  // soft sheen
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`

function radialTexture(inner: string, outer: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, inner)
  grd.addColorStop(1, outer)
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const bump = (a: number, b: number, x: number) => (x <= a || x >= b ? 0 : Math.sin(((x - a) / (b - a)) * Math.PI))

export default function Mascot({ mood, cheer, celebrate = false, read = 0, shy = false, calm = false, className }: MascotProps) {
  const flags = useRef({ shy, calm })
  flags.current = { shy, calm }
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasHost = useRef<HTMLDivElement>(null)
  const api = useRef<{ react: (a: Action) => void; setMood: (m: number) => void; read: () => void } | null>(null)
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null)
  const [hearts, setHearts] = useState<number[]>([])
  const firstCheer = useRef(cheer)

  useEffect(() => {
    const host = canvasHost.current
    const wrap = wrapRef.current
    if (!host || !wrap) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const small = host.clientWidth < 220

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      return // no WebGL — the survey works without the mascot
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60)
    camera.position.set(0, 0.55, 9.6)
    camera.lookAt(0, 0.7, 0)

    const hemi = new THREE.HemisphereLight('#ffffff', '#f3cbd8', 1.15)
    const key = new THREE.DirectionalLight('#fff7f2', 2.3)
    key.position.set(2.5, 4, 5)
    const rim = new THREE.PointLight('#c9b3f2', 20, 14)
    rim.position.set(-2.6, 1.8, -2.6)
    scene.add(hemi, key, rim)

    const disposables: { dispose: () => void }[] = []
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

    // ---- fur ----
    const shared = {
      uTime: { value: 0 },
      uVel: { value: new THREE.Vector3() },
      uKey: { value: new THREE.Color('#fff7f2') },
      uRim: { value: new THREE.Color('#c9b3f2') },
    }
    function makeFur(
      geo: THREE.BufferGeometry,
      opt: { shells: number; len: number; density: number; base: string; tip: string; face?: boolean },
    ) {
      const g = new THREE.Group()
      const base = { value: new THREE.Color(opt.base) }
      const tip = { value: new THREE.Color(opt.tip) }
      for (let i = 0; i < opt.shells; i++) {
        const mat = track(
          new THREE.ShaderMaterial({
            vertexShader: FUR_VERT,
            fragmentShader: FUR_FRAG,
            alphaToCoverage: true,
            uniforms: {
              ...shared,
              uShell: { value: i / (opt.shells - 1) },
              uLen: { value: opt.len },
              uDensity: { value: opt.density },
              uBase: base,
              uTip: tip,
              uFace: { value: opt.face ? 1 : 0 },
            },
          }),
        )
        const m = new THREE.Mesh(geo, mat)
        m.renderOrder = i
        g.add(m)
      }
      return g
    }

    // ---- rig ----
    const root = new THREE.Group() // world position (jumps, side steps)
    const turn = new THREE.Group() // yaw toward cursor / spins
    const body = new THREE.Group() // tilt, squash
    root.add(turn)
    turn.add(body)
    scene.add(root)

    const bodyGeo = track(new THREE.SphereGeometry(1, small ? 52 : 76, small ? 40 : 58))
    const partGeo = track(new THREE.SphereGeometry(1, 22, 16))
    body.add(makeFur(bodyGeo, { shells: small ? 22 : 36, len: 0.26, density: small ? 34 : 44, base: '#ef74aa', tip: '#ffe1ec', face: true }))

    // fuzz halo: a camera-facing ring of soft wisps around the silhouette
    const fuzzMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: shared.uTime, uCol: { value: new THREE.Color('#ffd1e3') } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
          void main(){
            vec2 p = (vUv - 0.5) * 2.0 * 1.42;
            float r = length(p);
            float ang = atan(p.y, p.x);
            float lobes = 0.6 + 0.4 * sin(ang * 110.0 + sin(ang * 7.0 + uTime * 0.5) * 3.0);
            float a = smoothstep(1.36, 1.14, r) * smoothstep(1.0, 1.14, r) * lobes * 0.3;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uCol, a);
            #include <colorspace_fragment>
          }`,
      }),
    )
    const fuzz = new THREE.Mesh(track(new THREE.PlaneGeometry(2.84, 2.84)), fuzzMat)
    fuzz.renderOrder = 50
    root.add(fuzz)

    // tuft
    const tuft = makeFur(partGeo, { shells: small ? 8 : 14, len: 0.22, density: 9, base: '#f07cb0', tip: '#ffe3ee' })
    tuft.scale.set(0.17, 0.17, 0.17)
    tuft.position.set(0.1, 1.08, 0.1)
    tuft.rotation.z = -0.5
    body.add(tuft)

    const sphere = track(new THREE.SphereGeometry(1, 32, 24))

    // eyes
    const whiteMat = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18 }))
    const irisMat = track(
      new THREE.MeshStandardMaterial({ color: '#2a86ff', emissive: '#0d4fd1', emissiveIntensity: 0.5, roughness: 0.1 }),
    )
    const pupilMat = track(new THREE.MeshStandardMaterial({ color: '#0a0f2c', roughness: 0.08 }))
    const shineMat = track(new THREE.MeshBasicMaterial({ color: '#ffffff' }))
    const lidMat = track(new THREE.MeshStandardMaterial({ color: '#5b1a2e', roughness: 0.5 }))
    const arcGeo = track(new THREE.TorusGeometry(0.17, 0.038, 8, 24, Math.PI))
    // eyes sit "on top" of the fluff while Pank faces you; normal depth when turned away
    const overlayMats = [whiteMat, irisMat, pupilMat, shineMat, lidMat]
    for (const m of overlayMats) m.depthTest = false

    const eyes: { group: THREE.Group; look: THREE.Group; happy: THREE.Mesh }[] = []
    for (const side of [-1, 1]) {
      const anchor = new THREE.Group()
      const dir = new THREE.Vector3(side * 0.38, 0.2, 0.9).normalize()
      anchor.position.copy(dir.clone().multiplyScalar(1.2))
      anchor.lookAt(dir.clone().multiplyScalar(4))
      const g = new THREE.Group()
      const white = new THREE.Mesh(sphere, whiteMat)
      white.scale.set(0.34, 0.37, 0.2)
      const look = new THREE.Group()
      const iris = new THREE.Mesh(sphere, irisMat)
      iris.scale.set(0.24, 0.265, 0.08)
      iris.position.z = 0.135
      const pupil = new THREE.Mesh(sphere, pupilMat)
      pupil.scale.set(0.125, 0.14, 0.045)
      pupil.position.z = 0.19
      look.add(iris, pupil)
      const s1 = new THREE.Mesh(sphere, shineMat)
      s1.scale.setScalar(0.065)
      s1.position.set(0.09, 0.11, 0.235)
      const s2 = new THREE.Mesh(sphere, shineMat)
      s2.scale.setScalar(0.03)
      s2.position.set(-0.07, -0.08, 0.225)
      g.add(white, look, s1, s2)
      const happy = new THREE.Mesh(arcGeo, lidMat)
      happy.position.set(0, -0.05, 0.16)
      happy.visible = false
      anchor.add(g, happy)
      anchor.traverse(o => (o.renderOrder = 200))
      body.add(anchor)
      eyes.push({ group: g, look, happy })
    }

    // blush
    const blushTex = track(radialTexture('rgba(255,105,160,0.8)', 'rgba(255,105,160,0)'))
    const blushMat = track(new THREE.MeshBasicMaterial({ map: blushTex, transparent: true, depthWrite: false }))
    const blushGeo = track(new THREE.PlaneGeometry(0.4, 0.26))
    for (const side of [-1, 1]) {
      const dir = new THREE.Vector3(side * 0.62, -0.1, 0.78).normalize()
      const b = new THREE.Mesh(blushGeo, blushMat)
      b.position.copy(dir.clone().multiplyScalar(1.3))
      b.lookAt(dir.clone().multiplyScalar(4))
      b.renderOrder = 100
      body.add(b)
    }

    // mouth: smile arc / open mouth with tongue
    const mouthMat = track(new THREE.MeshStandardMaterial({ color: '#5b1a2e', roughness: 0.5 }))
    const tongueMat = track(new THREE.MeshStandardMaterial({ color: '#ff7da8', roughness: 0.6 }))
    const mouthDir = new THREE.Vector3(0, -0.14, 1).normalize()
    const mouthAnchor = new THREE.Group()
    mouthAnchor.position.copy(mouthDir.clone().multiplyScalar(1.07))
    mouthAnchor.lookAt(mouthDir.clone().multiplyScalar(4))
    const smile = new THREE.Mesh(track(new THREE.TorusGeometry(0.1, 0.026, 8, 24, Math.PI)), mouthMat)
    smile.rotation.z = Math.PI
    const open = new THREE.Group()
    const openMouth = new THREE.Mesh(sphere, mouthMat)
    openMouth.scale.set(1, 0.85, 0.35)
    const tongue = new THREE.Mesh(sphere, tongueMat)
    tongue.scale.set(0.6, 0.38, 0.3)
    tongue.position.set(0, -0.42, 0.12)
    open.add(openMouth, tongue)
    open.scale.setScalar(0.001)
    mouthAnchor.add(smile, open)
    body.add(mouthAnchor)

    // arms (fluffy) with hand anchors
    const arms: { pivot: THREE.Group; hand: THREE.Group; thumb: THREE.Mesh; fur: THREE.Group }[] = []
    const thumbMat = track(new THREE.MeshPhysicalMaterial({ color: '#f490bb', roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#ffd6e6') }))
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.98, -0.12, 0.12)
      const arm = makeFur(partGeo, { shells: small ? 7 : 12, len: 0.1, density: 7, base: '#ee6fa6', tip: '#ffdcea' })
      arm.scale.set(0.17, 0.27, 0.17)
      arm.position.y = -0.22
      const hand = new THREE.Group()
      hand.position.set(0, -0.46, 0.04)
      const thumb = new THREE.Mesh(sphere, thumbMat)
      thumb.scale.set(0.07, 0.12, 0.07)
      thumb.position.set(side * -0.09, -0.36, 0.1)
      thumb.visible = false
      pivot.add(arm, hand, thumb)
      body.add(pivot)
      arms.push({ pivot, hand, thumb, fur: arm })
    }

    // paws used to cover the eyes (shy)
    const pawRest: THREE.Vector3[] = []
    const pawUp = new THREE.Vector3(0, 1, 0)
    const paws = [-1, 1].map(side => {
      const dir = new THREE.Vector3(side * 0.36, 0.17, 0.92).normalize()
      pawRest.push(dir.multiplyScalar(1.5))
      const pw = makeFur(partGeo, { shells: small ? 7 : 12, len: 0.16, density: 16, base: '#ee6fa6', tip: '#ffdcea' })
      pw.visible = false
      body.add(pw)
      return pw
    })

    // feet
    const footMat = track(
      new THREE.MeshPhysicalMaterial({ color: '#e9679f', roughness: 0.85, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color('#ffd6e6') }),
    )
    const feet: THREE.Mesh[] = []
    for (const side of [-1, 1]) {
      const f = new THREE.Mesh(sphere, footMat)
      f.scale.set(0.27, 0.15, 0.34)
      f.position.set(side * 0.42, -1.16, 0.36)
      root.add(f)
      feet.push(f)
    }

    // ground shadow
    const shadowTex = track(radialTexture('rgba(91,26,46,0.32)', 'rgba(91,26,46,0)'))
    const shadowMat = track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }))
    const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(3, 3)), shadowMat)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.32
    scene.add(shadow)

    // ---- toys (hidden behind its back until play) ----
    const lav = track(new THREE.MeshStandardMaterial({ color: '#b9a2f0', roughness: 0.35 }))
    const maroon = track(new THREE.MeshStandardMaterial({ color: '#5b1a2e', roughness: 0.4 }))
    const pinkGloss = track(new THREE.MeshStandardMaterial({ color: '#f58fb6', roughness: 0.25 }))
    const beige = track(new THREE.MeshStandardMaterial({ color: '#f3e3cf', roughness: 0.3, transparent: true, opacity: 0.85 }))
    const cyl = track(new THREE.CylinderGeometry(1, 1, 1, 20))
    const box = track(new THREE.BoxGeometry(1, 1, 1))

    const blaster = new THREE.Group()
    {
      const b = new THREE.Mesh(box, lav)
      b.scale.set(0.42, 0.17, 0.14)
      const barrel = new THREE.Mesh(cyl, pinkGloss)
      barrel.scale.set(0.06, 0.3, 0.06)
      barrel.rotation.z = Math.PI / 2
      barrel.position.set(0.32, 0.02, 0)
      const muzzle = new THREE.Mesh(track(new THREE.TorusGeometry(0.075, 0.025, 8, 18)), maroon)
      muzzle.rotation.y = Math.PI / 2
      muzzle.position.set(0.48, 0.02, 0)
      const grip = new THREE.Mesh(box, maroon)
      grip.scale.set(0.1, 0.2, 0.1)
      grip.rotation.z = -0.25
      grip.position.set(-0.08, -0.15, 0)
      const tank = new THREE.Mesh(sphere, beige)
      tank.scale.setScalar(0.1)
      tank.position.set(-0.05, 0.15, 0)
      blaster.add(b, barrel, muzzle, grip, tank)
    }
    const yoyo = new THREE.Group()
    const yoyoBody = new THREE.Group()
    const yoyoString = new THREE.Mesh(cyl, maroon)
    {
      const d1 = new THREE.Mesh(cyl, maroon)
      d1.scale.set(0.15, 0.05, 0.15)
      d1.rotation.x = Math.PI / 2
      d1.position.z = 0.04
      const d2 = d1.clone()
      d2.position.z = -0.04
      const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.15, 0.025, 8, 24)), pinkGloss)
      yoyoBody.add(d1, d2, ring)
      yoyoString.scale.set(0.008, 1, 0.008)
      yoyo.add(yoyoBody, yoyoString)
    }
    const balloon = new THREE.Group()
    const balloonBall = new THREE.Group()
    {
      const ball = new THREE.Mesh(sphere, lav)
      ball.scale.set(0.34, 0.4, 0.32)
      const shine = new THREE.Mesh(sphere, shineMat)
      shine.scale.setScalar(0.06)
      shine.position.set(0.12, 0.16, 0.26)
      const knot = new THREE.Mesh(track(new THREE.ConeGeometry(0.05, 0.08, 10)), lav)
      knot.position.y = -0.42
      knot.rotation.x = Math.PI
      balloonBall.add(ball, shine, knot)
      balloonBall.position.y = 1.05
      const str = new THREE.Mesh(cyl, maroon)
      str.scale.set(0.008, 0.62, 0.008)
      str.position.y = 0.33
      balloon.add(balloonBall, str)
    }
    const TOY_SIZE: Record<Toy, number> = { blaster: 1.4, yoyo: 1.1, balloon: 1 }
    const toys: Record<Toy, THREE.Group> = { blaster, yoyo, balloon }
    for (const t of Object.values(toys)) {
      t.scale.setScalar(0.001)
      t.visible = false
      arms[1].hand.add(t)
    }

    // bubbles shot by the blaster
    const bubbleMat = track(
      new THREE.MeshStandardMaterial({ color: '#c9b3f2', emissive: '#f58fb6', emissiveIntensity: 0.35, transparent: true, opacity: 0.62, roughness: 0.05, depthWrite: false }),
    )
    const bubbles = Array.from({ length: 16 }, () => {
      const m = new THREE.Mesh(sphere, bubbleMat)
      m.visible = false
      scene.add(m)
      return { m, v: new THREE.Vector3(), life: 0, size: 0.1 }
    })
    const muzzleWorld = new THREE.Vector3()
    function shoot() {
      const b = bubbles.find(x => x.life <= 0)
      if (!b) return
      blaster.localToWorld(muzzleWorld.set(0.52, 0.02, 0))
      b.m.position.copy(muzzleWorld)
      b.v.set(0.2 + Math.random() * 1.0, 1.3 + Math.random() * 0.9, 1.1 + Math.random() * 0.8)
      b.size = 0.09 + Math.random() * 0.1
      b.life = 1.8
      b.m.visible = true
    }

    const faceDir = new THREE.Vector3()
    const toCam = new THREE.Vector3()
    let overlay = true

    // ---- state ----
    const clock = new THREE.Clock()
    let action: Action | null = null
    let actionT0 = 0
    let toy: Toy | null = null
    let toyPhase: 'fetch' | 'play' | 'stow' = 'fetch'
    let toyT0 = 0
    let lastToy: Toy | null = null
    let lastActivity = 0
    let lastMove = -10
    let lastToyEnd = 0
    let nextShot = 0
    let moodNow = 0
    const target = { key: new THREE.Color(MOODS[0].key), rim: new THREE.Color(MOODS[0].rim) }
    const ptr = { x: 0, y: 0 }
    let nextBlink = 1.5
    let blinkUntil = 0
    let prevY = 0

    const cur = {
      tilt: 0.34, yaw: 0, rotZ: 0, x: 0, y: 0, sx: 1, sy: 1, eye: 1, lx: 0, ly: -0.9,
      armL: 0, armR: 0, armRx: 0, mouth: 0, toyScale: 0, reach: 0,
    }
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k

    function startToy(t: number) {
      const options = (['blaster', 'yoyo', 'balloon'] as Toy[]).filter(x => x !== lastToy)
      toy = options[Math.floor(Math.random() * options.length)]
      lastToy = toy
      toyPhase = 'fetch'
      toyT0 = t
      toys[toy].visible = true
    }
    function stowToy(t: number, instant = false) {
      if (!toy) return
      if (instant) {
        toys[toy].visible = false
        toys[toy].scale.setScalar(0.001)
        toy = null
        cur.toyScale = 0
        lastToyEnd = t
        return
      }
      if (toyPhase !== 'stow') {
        toyPhase = 'stow'
        toyT0 = t
      }
    }

    api.current = {
      react: (a: Action) => {
        stowToy(clock.elapsedTime, true)
        action = a
        actionT0 = clock.elapsedTime
        lastActivity = clock.elapsedTime
      },
      read: () => {
        if (action && action !== 'read') return // don't cut off an answer reaction
        stowToy(clock.elapsedTime, true)
        action = 'read'
        actionT0 = clock.elapsedTime
      },
      setMood: (m: number) => {
        moodNow = m
        target.key.set(MOODS[m]?.key ?? MOODS[0].key)
        target.rim.set(MOODS[m]?.rim ?? MOODS[0].rim)
        wrap.style.setProperty('--pank-glow', MOODS[m]?.glow ?? MOODS[0].glow)
      },
    }

    function frame() {
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.elapsedTime
      const k = 1 - Math.pow(0.0012, dt)
      const calmNow = reduced || flags.current.calm
      const amp = calmNow ? 0.3 : 1
      shared.uTime.value = t

      const tracking = t - lastMove < 2.6
      const shyNow = flags.current.shy

      // idle defaults: head down looking at feet, or following the cursor
      let tilt = tracking ? -ptr.y * 0.16 : 0.34
      let yaw = tracking ? ptr.x * 0.4 : Math.sin(t * 0.4) * 0.08
      let rotZ = Math.sin(t * 0.9) * 0.05 * amp
      let x = 0
      let y = 0
      let sy = 1 + Math.sin(t * 2.1) * 0.03 * amp
      let sx = 1 - Math.sin(t * 2.1) * 0.015 * amp
      let eye = 1
      let lx = tracking ? ptr.x : Math.sin(t * 0.5) * 0.25
      let ly = tracking ? ptr.y : -0.9
      let armL = Math.sin(t * 2.1) * 0.08
      let armR = -Math.sin(t * 2.1) * 0.08
      let armRx = 0
      let mouth = 0
      let thumbs = false
      let laugh = false
      let wink = false
      let flip = 0

      // foot tap while waiting
      const tp = t % 3.4
      const tap = !action && !toy && !tracking ? bump(0, 0.45, tp) : 0
      feet[1].position.y = -1.16 + tap * 0.09 * amp
      feet[1].rotation.x = -tap * 0.4 * amp

      // toys: start after a quiet spell
      if (!action && !toy && !calmNow && t - lastActivity > 8 && t - lastToyEnd > 3) startToy(t)

      if (toy) {
        const pt = t - toyT0
        if (toyPhase === 'fetch') {
          // reach behind the back, pop the toy out
          const p = pt / FETCH
          armR = lerp(-0.4, 1.3, smooth(0.35, 1, p)) * (p < 0.35 ? smooth(0, 0.35, p) * -1 : 1)
          armRx = p < 0.5 ? -1.4 * bump(0, 0.5, p) : 0
          cur.toyScale = smooth(0.4, 0.9, p)
          if (p >= 1) {
            toyPhase = 'play'
            toyT0 = t
          }
        } else if (toyPhase === 'play') {
          const p = pt / TOY_PLAY
          eye = 1.08
          if (toy === 'blaster') {
            armR = 0.55
            armRx = -1.25
            yaw = -0.15
            lx = 0.4
            ly = 0.4
            tilt = 0
            mouth = 0.35
            if (t > nextShot) {
              shoot()
              nextShot = t + (Math.floor(pt * 2) % 3 === 2 ? 0.7 : 0.16)
              armR += 0.12
            }
            rotZ = Math.sin(t * 18) * 0.015
          } else if (toy === 'yoyo') {
            armR = 0.35
            armRx = -1.05
            const cycle = (pt % 1.3) / 1.3
            const drop = Math.sin(cycle * Math.PI)
            yoyoBody.position.y = -0.2 - drop * 1.1
            yoyoBody.rotation.z = t * 22
            yoyoString.scale.y = 0.2 + drop * 1.1
            yoyoString.position.y = -(0.2 + drop * 1.1) / 2
            lx = 0.6
            ly = -0.4 - drop * 0.5
            tilt = 0.1 + drop * 0.15
            sy += drop * 0.03
          } else {
            armR = 2.4 + Math.sin(t * 2) * 0.15
            balloonBall.position.x = Math.sin(t * 1.4) * 0.12
            balloonBall.rotation.z = Math.sin(t * 1.4) * 0.2
            lx = 0.5
            ly = 0.9
            tilt = -0.2
            y = Math.abs(Math.sin(t * 3)) * 0.12
            mouth = 0.5
          }
          if (p >= 1) stowToy(t)
        } else {
          const p = pt / STOW
          armR = lerp(1.2, -0.3, smooth(0, 0.6, p))
          armRx = -1.2 * bump(0.3, 1, p)
          cur.toyScale = 1 - smooth(0, 0.5, p)
          if (p >= 1) {
            toys[toy].visible = false
            toy = null
            lastToyEnd = t
          }
        }
        if (toy) toys[toy].scale.setScalar(Math.max(0.001, cur.toyScale * TOY_SIZE[toy]))
      }

      // reactions (exaggerated)
      if (action) {
        const p = (t - actionT0) / DUR[action]
        if (p >= 1) {
          action = null
          lastActivity = t
        } else {
          const env = smooth(0, 0.15, p) * (1 - smooth(0.82, 1, p))
          tilt = 0
          lx = 0
          ly = 0.2
          yaw = 0
          switch (action) {
            case 'read':
              // eyes sweep along the question, then settle on the options
              lx = -0.9 + smooth(0.05, 0.8, p) * 1.8
              ly = 0.15 - smooth(0.75, 1, p) * 0.5
              tilt = 0.05
              yaw = -0.25 + p * 0.3
              eye = 1.05
              break
            case 'nod':
              tilt = Math.sin(p * Math.PI * 4) * 0.3 * (1 - p)
              armL = 0.3 * env
              armR = -0.3 * env
              eye = 1.08
              mouth = 0.2 * env
              break
            case 'comfort':
              // little self-hug and slow nod: "it's okay"
              armL = -0.9 * env
              armR = 0.9 * env
              tilt = 0.15 + Math.sin(p * Math.PI * 3) * 0.18 * env
              rotZ = Math.sin(p * Math.PI * 2) * 0.12 * env
              sy = 1 - 0.05 * env
              sx = 1 + 0.04 * env
              eye = 0.95
              break
            case 'thumbs':
              armR = 2.75 * env
              thumbs = env > 0.5
              rotZ = -0.18 * env
              y = 0.18 * bump(0.1, 0.4, p)
              eye = 1 + 0.2 * env
              mouth = env
              break
            case 'wink':
              armR = 2.5 * env
              thumbs = env > 0.5
              wink = env > 0.4
              rotZ = -0.2 * env
              mouth = 0.6 * env
              break
            case 'hop': {
              const h = Math.abs(Math.sin(p * Math.PI * 3))
              y = 0.75 * h * amp
              sy = 1 + 0.18 * h - (h < 0.2 ? 0.25 : 0)
              sx = 2 - sy
              armL = -2.6 * env
              armR = 2.6 * env
              eye = 1 + 0.22 * env
              mouth = env
              break
            }
            case 'spin':
              yaw = smooth(0.1, 0.8, p) * Math.PI * 2
              y = 0.45 * bump(0.08, 0.85, p) * amp
              armL = -2.2 * env
              armR = 2.2 * env
              eye = 1.15
              mouth = env
              break
            case 'jump':
            case 'flip': {
              const crouch = bump(0, 0.2, p)
              const air = bump(0.2, 0.74, p)
              const land = bump(0.74, 0.92, p)
              y = 1.35 * air * amp
              sy = 1 - 0.38 * crouch + 0.3 * air - 0.35 * land
              sx = 2 - sy
              if (action === 'flip') flip = smooth(0.24, 0.7, p) * Math.PI * 2 * amp
              armL = -3 * env
              armR = 3 * env
              eye = 1 + 0.28 * env
              mouth = env
              break
            }
            case 'dance': {
              const b = p * Math.PI * 8
              rotZ = Math.sin(b) * 0.45 * amp
              x = Math.sin(p * Math.PI * 4) * 0.4 * amp
              y = Math.abs(Math.sin(b)) * 0.28 * amp
              yaw = Math.sin(p * Math.PI * 4) * 0.4
              armL = (-1.6 - Math.sin(b) * 1.1) * env
              armR = (1.6 - Math.sin(b) * 1.1) * env
              eye = 1 + 0.3 * env
              mouth = env
              lx = Math.sin(b) * 0.6
              break
            }
            case 'laugh': {
              const shake = Math.sin(p * Math.PI * 16) * (1 - p)
              y = Math.abs(Math.sin(p * Math.PI * 5)) * 0.35 * amp
              sy = 1 - 0.14 * shake
              sx = 1 + 0.12 * shake
              rotZ = Math.sin(p * Math.PI * 8) * 0.18
              tilt = -0.25
              laugh = env > 0.2
              armL = -1.2 * env
              armR = 1.2 * env
              mouth = env
              break
            }
          }
        }
      }

      // shy: hands over eyes (confidential comment)
      if (shyNow && !action) {
        armL = 0.5
        armR = -0.5
        armRx = -0.6
        tilt = 0.12
        laugh = true
        rotZ = Math.sin(t * 2.4) * 0.05
        mouth = 0.15
      }

      // blink (never mid-reaction)
      if (action || toy) nextBlink = Math.max(nextBlink, t + 0.6)
      if (t > nextBlink) {
        blinkUntil = t + 0.13
        nextBlink = t + 2.4 + Math.random() * 3
      }
      const blink = t < blinkUntil ? 0.1 : 1

      cur.tilt = lerp(cur.tilt, tilt, k * 0.55)
      cur.yaw = action === 'spin' ? yaw : lerp(cur.yaw, yaw, k * 0.7)
      cur.rotZ = lerp(cur.rotZ, rotZ, k * 1.2)
      cur.x = lerp(cur.x, x, k)
      cur.y = lerp(cur.y, y, k * 2)
      cur.sx = lerp(cur.sx, sx, k * 2)
      cur.sy = lerp(cur.sy, sy, k * 2)
      cur.eye = lerp(cur.eye, eye, k * 1.2)
      cur.lx = lerp(cur.lx, lx, k * 1.4)
      cur.ly = lerp(cur.ly, ly, k * 1.4)
      cur.armL = lerp(cur.armL, armL, k * 1.5)
      cur.armR = lerp(cur.armR, armR, k * 1.5)
      cur.armRx = lerp(cur.armRx, armRx, k * 1.5)
      cur.mouth = lerp(cur.mouth, mouth, k * 1.3)

      root.position.set(cur.x, cur.y, 0)
      fuzz.scale.set(cur.sx, cur.sy, 1)
      fuzz.position.y = cur.sy - 1
      turn.rotation.y = cur.yaw
      body.rotation.set(cur.tilt + flip, 0, cur.rotZ)
      body.scale.set(cur.sx, cur.sy, cur.sx)
      body.position.y = cur.sy - 1 // squash from the feet, not the middle

      // fur jiggle from vertical velocity
      const vy = dt > 0 ? (cur.y - prevY) / dt : 0
      prevY = cur.y
      shared.uVel.value.y = lerp(shared.uVel.value.y, THREE.MathUtils.clamp(vy, -4, 4), 0.35)
      shared.uVel.value.x = lerp(shared.uVel.value.x, (x - cur.x) * 2, 0.2)

      eyes.forEach((e, i) => {
        const closed = laugh || (wink && i === 0)
        e.group.visible = !closed
        e.happy.visible = closed
        e.group.scale.set(cur.eye, cur.eye * blink, cur.eye)
        e.happy.scale.setScalar(cur.eye)
        e.look.position.set(THREE.MathUtils.clamp(cur.lx, -1, 1) * 0.08, THREE.MathUtils.clamp(cur.ly, -1, 1) * 0.08, 0)
      })
      arms[0].pivot.rotation.set(shyNow && !action ? cur.armRx : 0, 0, cur.armL)
      cur.reach = lerp(cur.reach, shyNow && !action ? 1 : 0, k * 1.2)
      // paws rise up over the eyes
      paws.forEach((pw, i) => {
        pw.visible = cur.reach > 0.02
        pw.position.copy(pawRest[i]).addScaledVector(pawUp, (1 - cur.reach) * -0.75)
        pw.scale.setScalar(0.32 * Math.max(0.001, cur.reach))
      })
      arms[1].pivot.rotation.set(cur.armRx, 0, cur.armR)
      arms[1].thumb.visible = thumbs
      smile.scale.setScalar(Math.max(0.001, 1 - cur.mouth))
      open.scale.set(0.12 * cur.mouth + 0.001, 0.11 * cur.mouth + 0.001, 0.12 * cur.mouth + 0.001)
      shadow.scale.setScalar(1 - Math.min(cur.y, 1.2) * 0.45)
      shadowMat.opacity = 1 - Math.min(cur.y, 1.2) * 0.6

      for (const b of bubbles) {
        if (b.life <= 0) continue
        b.life -= dt
        b.v.y += dt * 0.25
        b.v.multiplyScalar(1 - dt * 0.9)
        b.m.position.addScaledVector(b.v, dt)
        const pop = b.life < 0.15 ? 1 + (0.15 - b.life) * 6 : 1
        b.m.scale.setScalar(b.size * pop * (1 + Math.sin(t * 9 + b.size * 50) * 0.06))
        if (b.life <= 0) b.m.visible = false
      }

      shared.uKey.value.lerp(target.key, k * 0.25)
      shared.uRim.value.lerp(target.rim, k * 0.25)
      key.color.lerp(target.key, k * 0.25)
      rim.color.lerp(target.rim, k * 0.25)
      rim.intensity = lerp(rim.intensity, 16 + moodNow * 4, k * 0.25)

      // eyes over the fur only while facing the camera
      body.updateMatrixWorld()
      faceDir.set(0, 0.1, 1).transformDirection(body.matrixWorld)
      toCam.copy(camera.position).sub(root.position).normalize()
      const facing = faceDir.dot(toCam) > 0.72 && !shyNow
      if (facing !== overlay) {
        overlay = facing
        for (const m of overlayMats) m.depthTest = !facing
      }

      renderer.render(scene, camera)
    }

    let raf = 0
    let visible = true
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (visible && !document.hidden) frame()
    }
    loop()
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(host)

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // short, wide stage (phones): come closer so Pank isn't tiny
      const wide = camera.aspect > 1.3
      camera.position.set(0, wide ? 0.45 : 0.55, wide ? 6.4 : 9.6)
      camera.lookAt(0, wide ? 0.25 : 0.7, 0)
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    // cursor tracking across the whole page
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height * 0.62
      ptr.x = THREE.MathUtils.clamp((e.clientX - cx) / 500, -1, 1)
      ptr.y = THREE.MathUtils.clamp(-(e.clientY - cy) / 400, -1, 1)
      lastMove = clock.elapsedTime
      lastActivity = clock.elapsedTime
      if (toy && toyPhase === 'play') stowToy(clock.elapsedTime)
    }
    const onActivity = () => {
      lastActivity = clock.elapsedTime
      if (toy && toyPhase === 'play') stowToy(clock.elapsedTime)
    }
    const onPoke = () => api.current?.react('laugh')
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('keydown', onActivity)
    window.addEventListener('scroll', onActivity, { passive: true, capture: true })
    wrap.addEventListener('click', onPoke)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('scroll', onActivity, { capture: true })
      wrap.removeEventListener('click', onPoke)
      disposables.forEach(d => d.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      api.current = null
    }
  }, [])

  useEffect(() => {
    api.current?.setMood(mood)
  }, [mood])

  useEffect(() => {
    if (read) api.current?.read()
  }, [read])

  useEffect(() => {
    if (cheer === firstCheer.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    api.current?.react(pickAction(mood, reduced || flags.current.calm))
    const lines = MOODS[mood]?.say ?? MOODS[0].say
    setBubble({ text: lines[Math.floor(Math.random() * lines.length)], id: cheer })
    if (mood >= 4) setHearts(h => [...h.slice(-6), cheer * 10, cheer * 10 + 1])
  }, [cheer, mood])

  useEffect(() => {
    if (!bubble) return
    const t = setTimeout(() => setBubble(null), 1800)
    return () => clearTimeout(t)
  }, [bubble])

  useEffect(() => {
    if (!celebrate) return
    api.current?.setMood(5)
    const seq: Action[] = ['flip', 'dance', 'laugh', 'spin', 'jump']
    let i = 0
    api.current?.react(seq[0])
    setBubble({ text: 'You’re a star!', id: -1 })
    setHearts(h => [...h, -1, -2, -3, -4])
    const timer = setInterval(() => {
      i++
      if (i >= seq.length) return clearInterval(timer)
      api.current?.react(seq[i])
    }, 2200)
    return () => clearInterval(timer)
  }, [celebrate])

  return (
    <div ref={wrapRef} className={`pank ${className ?? ''}`} aria-hidden="true">
      <div className="pank-glow" />
      <div ref={canvasHost} className="pank-canvas" />
      {bubble && (
        <div key={bubble.id} className="pank-bubble">
          {bubble.text}
        </div>
      )}
      {hearts.map((id, i) => (
        <svg
          key={id}
          className="pank-heart"
          style={{ left: `${i % 2 ? 66 - ((i * 11) % 12) : 22 + ((i * 13) % 12)}%`, animationDelay: `${(i % 3) * 0.12}s` }}
          viewBox="0 0 24 24"
          onAnimationEnd={() => setHearts(h => h.filter(x => x !== id))}
        >
          <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" />
        </svg>
      ))}
    </div>
  )
}
