'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * "Pank" — the survey mascot. A fluffy pink ball with big blue eyes, built
 * procedurally in three.js (shell-textured fur, no external model).
 *
 * Idle: breathes, head down looking at its feet, blinks, taps a foot.
 * Hover: looks up at you. Click: giggles.
 * `cheer` increments on every pick → plays a supportive reaction for `mood` (1–5).
 * `celebrate` → dances on the thank-you screen.
 * Mood lighting follows the latest rating.
 */

export type MascotProps = { mood: number; cheer: number; celebrate?: boolean }

const MOODS: Record<number, { key: string; rim: string; glow: string; say: string[] }> = {
  0: { key: '#fff6fa', rim: '#b9a2f0', glow: 'rgba(206,186,250,0.55)', say: ['Take your time', 'Hi there!'] },
  1: { key: '#e2e8ff', rim: '#7fa4ff', glow: 'rgba(130,165,255,0.50)', say: ['Thanks for being honest', 'Honesty helps'] },
  2: { key: '#ece6ff', rim: '#a58cf0', glow: 'rgba(170,150,250,0.50)', say: ['Got it, thank you', 'Noted, thanks'] },
  3: { key: '#fff0f6', rim: '#f4a6c1', glow: 'rgba(244,166,193,0.50)', say: ['Noted!', 'Good to know'] },
  4: { key: '#fff1f1', rim: '#ff8fb8', glow: 'rgba(255,145,190,0.60)', say: ['Nice!', 'Yay!'] },
  5: { key: '#fff4e4', rim: '#ffb36b', glow: 'rgba(255,186,140,0.65)', say: ['Love that!', 'Woohoo!'] },
}

type Action = 'idle' | 'nod' | 'thumbs' | 'hop' | 'jump' | 'dance' | 'giggle'
const DUR: Record<Action, number> = { idle: 0, nod: 1.3, thumbs: 1.6, hop: 1.2, jump: 1.3, dance: 2.2, giggle: 0.9 }

function pickAction(mood: number, reduced: boolean): Action {
  if (reduced) return mood <= 2 ? 'nod' : 'thumbs'
  const pools: Record<number, Action[]> = {
    1: ['nod'],
    2: ['nod', 'thumbs'],
    3: ['thumbs', 'nod'],
    4: ['thumbs', 'hop', 'dance'],
    5: ['jump', 'dance', 'hop'],
  }
  const pool = pools[mood] ?? ['thumbs']
  return pool[Math.floor(Math.random() * pool.length)]
}

const FUR_VERT = /* glsl */ `
  uniform float uShell;
  uniform float uLen;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vP;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(normal);
    vec3 p = position + n * uShell * uLen;
    p.y -= uShell * uShell * uLen * 0.35;
    p.x += sin(uTime * 1.6 + position.y * 6.0) * uShell * uShell * 0.012;
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
  varying vec3 vN;
  varying vec3 vP;
  varying vec3 vView;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  void main() {
    vec3 q = normalize(vP) * uDensity;
    vec3 c = floor(q);
    vec3 f = fract(q);
    float h = hash(c);
    vec3 j = vec3(hash(c + 1.3), hash(c + 2.7), hash(c + 5.1)) * 0.5 + 0.25;
    float d = length(f - j);
    float r = pow(1.0 - uShell, 0.8) * 0.78 * (0.7 + 0.3 * h);
    if (uShell > 0.0 && (d > r || h < 0.06)) discard;
    vec3 n = normalize(vN);
    vec3 v = normalize(vView);
    float wrap = clamp((dot(n, normalize(vec3(0.45, 0.8, 0.6))) + 0.6) / 1.6, 0.0, 1.0);
    float ao = mix(0.62, 1.0, uShell);
    vec3 col = mix(uBase, uTip, uShell) * (0.5 + 0.7 * wrap) * uKey * ao;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 2.4);
    col += uRim * rim * (0.3 + 0.55 * uShell);
    gl_FragColor = vec4(col, 1.0);
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

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export default function Mascot({ mood, cheer, celebrate = false }: MascotProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasHost = useRef<HTMLDivElement>(null)
  const api = useRef<{ react: (a: Action) => void; setMood: (m: number) => void } | null>(null)
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null)
  const [hearts, setHearts] = useState<number[]>([])
  const firstCheer = useRef(cheer)

  // ---- three.js scene (mounted once) ----
  useEffect(() => {
    const host = canvasHost.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const small = host.clientWidth < 160

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return // no WebGL — the survey works without the mascot
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50)
    camera.position.set(0, 0.35, 7.6)
    camera.lookAt(0, 0.12, 0)

    // Lights (mood-tinted)
    const hemi = new THREE.HemisphereLight('#ffffff', '#f3c6da', 1.1)
    const key = new THREE.DirectionalLight('#fff6fa', 2.2)
    key.position.set(2.5, 4, 5)
    const rim = new THREE.PointLight('#b9a2f0', 18, 12)
    rim.position.set(-2.5, 1.5, -2.5)
    scene.add(hemi, key, rim)

    const disposables: { dispose: () => void }[] = []
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

    // Character rig
    const root = new THREE.Group() // position (jumps)
    const body = new THREE.Group() // tilt / squash
    root.add(body)
    scene.add(root)

    // Fur body: shells
    const SHELLS = small ? 14 : 28
    const furGeo = track(new THREE.SphereGeometry(1, small ? 48 : 72, small ? 36 : 54))
    const shared = {
      uTime: { value: 0 },
      uLen: { value: 0.17 },
      uDensity: { value: small ? 40 : 58 },
      uBase: { value: new THREE.Color('#f36fa8') },
      uTip: { value: new THREE.Color('#ffd0e4') },
      uKey: { value: new THREE.Color('#fff6fa') },
      uRim: { value: new THREE.Color('#b9a2f0') },
    }
    for (let i = 0; i < SHELLS; i++) {
      const mat = track(
        new THREE.ShaderMaterial({
          vertexShader: FUR_VERT,
          fragmentShader: FUR_FRAG,
          uniforms: { ...shared, uShell: { value: i / (SHELLS - 1) } },
        }),
      )
      const m = new THREE.Mesh(furGeo, mat)
      m.renderOrder = i
      body.add(m)
    }

    const fluff = (color: string) =>
      track(
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.85,
          sheen: 1,
          sheenRoughness: 0.45,
          sheenColor: new THREE.Color('#ffd6e6'),
        }),
      )

    // Eyes
    const whiteMat = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }))
    const irisMat = track(
      new THREE.MeshStandardMaterial({ color: '#1f7dff', emissive: '#0b45c4', emissiveIntensity: 0.45, roughness: 0.12 }),
    )
    const pupilMat = track(new THREE.MeshStandardMaterial({ color: '#0a0f2c', roughness: 0.1 }))
    const shineMat = track(new THREE.MeshBasicMaterial({ color: '#ffffff' }))
    const sphere = track(new THREE.SphereGeometry(1, 32, 24))

    const eyes: { group: THREE.Group; look: THREE.Group }[] = []
    for (const side of [-1, 1]) {
      const g = new THREE.Group()
      const dir = new THREE.Vector3(side * 0.37, 0.2, 0.91).normalize()
      g.position.copy(dir.clone().multiplyScalar(1.05))
      g.lookAt(dir.clone().multiplyScalar(3))
      const white = new THREE.Mesh(sphere, whiteMat)
      white.scale.set(0.28, 0.31, 0.16)
      const look = new THREE.Group()
      const iris = new THREE.Mesh(sphere, irisMat)
      iris.scale.set(0.205, 0.225, 0.07)
      iris.position.z = 0.115
      const pupil = new THREE.Mesh(sphere, pupilMat)
      pupil.scale.set(0.105, 0.12, 0.04)
      pupil.position.z = 0.16
      look.add(iris, pupil)
      const s1 = new THREE.Mesh(sphere, shineMat)
      s1.scale.setScalar(0.055)
      s1.position.set(0.075, 0.09, 0.2)
      const s2 = new THREE.Mesh(sphere, shineMat)
      s2.scale.setScalar(0.026)
      s2.position.set(-0.06, -0.07, 0.19)
      g.add(white, look, s1, s2)
      body.add(g)
      eyes.push({ group: g, look })
    }

    // Blush
    const blushTex = track(radialTexture('rgba(255,110,160,0.75)', 'rgba(255,110,160,0)'))
    const blushMat = track(new THREE.MeshBasicMaterial({ map: blushTex, transparent: true, depthWrite: false }))
    const blushGeo = track(new THREE.PlaneGeometry(0.34, 0.22))
    for (const side of [-1, 1]) {
      const dir = new THREE.Vector3(side * 0.6, -0.1, 0.8).normalize()
      const b = new THREE.Mesh(blushGeo, blushMat)
      b.position.copy(dir.clone().multiplyScalar(1.16))
      b.lookAt(dir.clone().multiplyScalar(3))
      b.renderOrder = 100
      body.add(b)
    }

    // Mouth: smile arc + open "o"
    const mouthMat = track(new THREE.MeshStandardMaterial({ color: '#6a1f45', roughness: 0.5 }))
    const mouthDir = new THREE.Vector3(0, -0.13, 1).normalize()
    const smile = new THREE.Mesh(track(new THREE.TorusGeometry(0.085, 0.022, 8, 24, Math.PI)), mouthMat)
    smile.position.copy(mouthDir.clone().multiplyScalar(1.12))
    smile.rotation.z = Math.PI
    const open = new THREE.Mesh(sphere, mouthMat)
    open.position.copy(mouthDir.clone().multiplyScalar(1.1))
    open.scale.set(0.001, 0.001, 0.001)
    body.add(smile, open)

    // Arms (stubby) + thumb
    const armMat = fluff('#f59cc0')
    const arms: { pivot: THREE.Group; thumb: THREE.Mesh; side: number }[] = []
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.93, -0.12, 0.12)
      const arm = new THREE.Mesh(sphere, armMat)
      arm.scale.set(0.15, 0.24, 0.15)
      arm.position.y = -0.2
      const thumb = new THREE.Mesh(sphere, armMat)
      thumb.scale.set(0.06, 0.1, 0.06)
      thumb.position.set(side * -0.08, -0.3, 0.08)
      thumb.visible = false
      pivot.add(arm, thumb)
      body.add(pivot)
      arms.push({ pivot, thumb, side })
    }

    // Feet
    const footMat = fluff('#f28ab4')
    const feet: THREE.Mesh[] = []
    for (const side of [-1, 1]) {
      const f = new THREE.Mesh(sphere, footMat)
      f.scale.set(0.24, 0.13, 0.3)
      f.position.set(side * 0.4, -1.06, 0.32)
      root.add(f)
      feet.push(f)
    }

    // Ground shadow
    const shadowTex = track(radialTexture('rgba(110,60,120,0.35)', 'rgba(110,60,120,0)'))
    const shadow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(2.6, 2.6)),
      track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.2
    scene.add(shadow)

    // ---- state ----
    let action: Action = 'idle'
    let t0 = 0
    let moodNow = 0
    const target = { key: new THREE.Color(MOODS[0].key), rim: new THREE.Color(MOODS[0].rim) }
    const pointer = { x: 0, y: 0, over: false }
    let nextBlink = 1.5
    let blinkUntil = 0
    const clock = new THREE.Clock()

    // damped values
    const cur = { tilt: 0.32, rotZ: 0, y: 0, sx: 1, sy: 1, eye: 1, lx: 0, ly: -0.8, armL: 0, armR: 0, mouth: 0 }
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k

    api.current = {
      react: (a: Action) => {
        action = a
        t0 = clock.elapsedTime
      },
      setMood: (m: number) => {
        moodNow = m
        target.key.set(MOODS[m]?.key ?? MOODS[0].key)
        target.rim.set(MOODS[m]?.rim ?? MOODS[0].rim)
        if (wrapRef.current) wrapRef.current.style.setProperty('--pank-glow', MOODS[m]?.glow ?? MOODS[0].glow)
      },
    }

    function frame() {
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.elapsedTime
      const k = 1 - Math.pow(0.0015, dt) // frame-rate independent damping
      const amp = reduced ? 0.3 : 1
      shared.uTime.value = t

      // idle defaults
      let tilt = pointer.over ? 0.02 : 0.32
      let rotZ = Math.sin(t * 0.9) * 0.04 * amp
      let y = 0
      let sy = 1 + Math.sin(t * 2.1) * 0.025 * amp
      let sx = 1 - Math.sin(t * 2.1) * 0.012 * amp
      let eye = 1
      let lx = pointer.over ? pointer.x : Math.sin(t * 0.5) * 0.25
      let ly = pointer.over ? pointer.y : -0.85
      let armL = Math.sin(t * 2.1) * 0.06
      let armR = -Math.sin(t * 2.1) * 0.06
      let mouth = 0
      let thumbs = false
      let x = 0

      // foot tap while waiting
      const tap = action === 'idle' && !pointer.over ? Math.max(0, Math.sin(((t % 3.4) / 0.45) * Math.PI)) * ((t % 3.4) < 0.45 ? 1 : 0) : 0
      feet[1].position.y = -1.06 + tap * 0.07 * amp
      feet[1].rotation.x = -tap * 0.35 * amp

      // action
      if (action !== 'idle') {
        const p = (t - t0) / DUR[action]
        if (p >= 1) {
          action = 'idle'
        } else {
          const env = smooth(0, 0.18, p) * (1 - smooth(0.8, 1, p))
          tilt = 0
          lx = 0
          ly = 0.15
          switch (action) {
            case 'nod':
              tilt = Math.sin(p * Math.PI * 4) * 0.22 * (1 - p)
              armL = armR = 0.25 * env
              eye = 1.05
              break
            case 'thumbs':
              armR = 2.55 * env
              thumbs = env > 0.5
              rotZ = -0.1 * env
              eye = 1 + 0.18 * env
              mouth = env
              break
            case 'hop': {
              const h = Math.abs(Math.sin(p * Math.PI * 2))
              y = 0.32 * h * amp
              sy = 1 + 0.08 * h - (h < 0.15 ? 0.12 : 0)
              sx = 2 - sy
              armL = -2.2 * env
              armR = 2.2 * env
              eye = 1 + 0.22 * env
              mouth = env
              break
            }
            case 'jump': {
              const crouch = p < 0.2 ? Math.sin((p / 0.2) * Math.PI) : 0
              const air = p >= 0.2 && p < 0.72 ? Math.sin(((p - 0.2) / 0.52) * Math.PI) : 0
              const land = p >= 0.72 && p < 0.88 ? Math.sin(((p - 0.72) / 0.16) * Math.PI) : 0
              y = 0.6 * air * amp
              sy = 1 - 0.2 * crouch + 0.12 * air - 0.16 * land
              sx = 2 - sy
              armL = -2.7 * env
              armR = 2.7 * env
              eye = 1 + 0.32 * env
              mouth = env
              rotZ = Math.sin(p * Math.PI * 2) * 0.12 * air
              break
            }
            case 'dance': {
              rotZ = Math.sin(p * Math.PI * 6) * 0.24 * amp
              x = Math.sin(p * Math.PI * 3) * 0.14 * amp
              y = Math.abs(Math.sin(p * Math.PI * 6)) * 0.1 * amp
              armL = -1.4 - Math.sin(p * Math.PI * 6) * 0.9
              armR = 1.4 - Math.sin(p * Math.PI * 6) * 0.9
              armL *= env
              armR *= env
              eye = 1 + 0.2 * env
              mouth = env
              lx = Math.sin(p * Math.PI * 6) * 0.5
              break
            }
            case 'giggle': {
              const w = Math.sin(p * Math.PI * 7) * (1 - p)
              sy = 1 - 0.12 * w
              sx = 1 + 0.1 * w
              eye = 0.9
              mouth = env
              break
            }
          }
        }
      }

      // blink
      if (action !== 'idle') nextBlink = Math.max(nextBlink, t + 0.6)
      if (t > nextBlink) {
        blinkUntil = t + 0.13
        nextBlink = t + 2.5 + Math.random() * 3
      }
      const blink = t < blinkUntil ? 0.12 : 1

      cur.tilt = lerp(cur.tilt, tilt, k * 0.6)
      cur.rotZ = lerp(cur.rotZ, rotZ, k)
      cur.y = lerp(cur.y, y, k * 1.6)
      cur.sx = lerp(cur.sx, sx, k * 1.6)
      cur.sy = lerp(cur.sy, sy, k * 1.6)
      cur.eye = lerp(cur.eye, eye, k)
      cur.lx = lerp(cur.lx, lx, k)
      cur.ly = lerp(cur.ly, ly, k)
      cur.armL = lerp(cur.armL, armL, k * 1.3)
      cur.armR = lerp(cur.armR, armR, k * 1.3)
      cur.mouth = lerp(cur.mouth, mouth, k)

      root.position.set(x, cur.y, 0)
      body.rotation.set(cur.tilt, 0, cur.rotZ)
      body.scale.set(cur.sx, cur.sy, cur.sx)
      for (const e of eyes) {
        e.group.scale.set(cur.eye, cur.eye * blink, cur.eye)
        e.look.position.set(cur.lx * 0.07, cur.ly * 0.07, 0)
      }
      arms[0].pivot.rotation.z = cur.armL
      arms[1].pivot.rotation.z = cur.armR
      arms[1].thumb.visible = thumbs
      smile.scale.setScalar(1 - cur.mouth * 0.9 + 0.001)
      open.scale.set(0.09 * cur.mouth + 0.001, 0.075 * cur.mouth + 0.001, 0.04)
      shadow.scale.setScalar(1 - cur.y * 0.5)
      ;(shadow.material as THREE.MeshBasicMaterial).opacity = 1 - cur.y * 0.8

      // mood lighting
      shared.uKey.value.lerp(target.key, k * 0.25)
      shared.uRim.value.lerp(target.rim, k * 0.25)
      key.color.lerp(target.key, k * 0.25)
      rim.color.lerp(target.rim, k * 0.25)
      rim.intensity = lerp(rim.intensity, 14 + moodNow * 3, k * 0.25)

      renderer.render(scene, camera)
    }

    // loop, paused when hidden / off-screen
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
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      pointer.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1))
      pointer.y = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)))
    }
    const onEnter = () => (pointer.over = true)
    const onLeave = () => (pointer.over = false)
    const onClick = () => api.current?.react('giggle')
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerenter', onEnter)
    host.addEventListener('pointerleave', onLeave)
    host.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerenter', onEnter)
      host.removeEventListener('pointerleave', onLeave)
      host.removeEventListener('click', onClick)
      disposables.forEach(d => d.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      api.current = null
    }
  }, [])

  // mood lighting
  useEffect(() => {
    api.current?.setMood(mood)
  }, [mood])

  // reactions
  useEffect(() => {
    if (cheer === firstCheer.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    api.current?.react(pickAction(mood, reduced))
    const lines = MOODS[mood]?.say ?? MOODS[0].say
    setBubble({ text: lines[Math.floor(Math.random() * lines.length)], id: cheer })
    if (mood >= 4) setHearts(h => [...h.slice(-6), cheer])
  }, [cheer, mood])

  useEffect(() => {
    if (!bubble) return
    const t = setTimeout(() => setBubble(null), 1700)
    return () => clearTimeout(t)
  }, [bubble])

  // celebrate: dance, then jump, repeat a few times
  useEffect(() => {
    if (!celebrate) return
    api.current?.setMood(5)
    const seq: Action[] = ['dance', 'jump', 'dance', 'hop']
    let i = 0
    api.current?.react(seq[0])
    setBubble({ text: 'You’re a star!', id: -1 })
    setHearts(h => [...h, -1, -2, -3])
    const timer = setInterval(() => {
      i++
      if (i >= seq.length) return clearInterval(timer)
      api.current?.react(seq[i])
    }, 2300)
    return () => clearInterval(timer)
  }, [celebrate])

  return (
    <div ref={wrapRef} className="pank" aria-hidden="true">
      <div className="pank-glow" />
      <div ref={canvasHost} className="pank-canvas" title="Hi, I’m Pank!" />
      {bubble && (
        <div key={bubble.id} className="pank-bubble">
          {bubble.text}
        </div>
      )}
      {hearts.map((id, i) => (
        <svg
          key={id}
          className="pank-heart"
          style={{ left: `${i % 2 ? 72 - ((i * 11) % 14) : 14 + ((i * 13) % 14)}%`, animationDelay: `${(i % 3) * 0.12}s` }}
          viewBox="0 0 24 24"
          onAnimationEnd={() => setHearts(h => h.filter(x => x !== id))}
        >
          <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" />
        </svg>
      ))}
    </div>
  )
}
