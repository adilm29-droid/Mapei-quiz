'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { AVATARS } from '../../lib/helpers'

function Particles({ count = 30 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); let id
    const p = []; const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    for (let i = 0; i < count; i++) p.push({ x: Math.random()*c.width, y: Math.random()*c.height, r: Math.random()*1.5+0.5, dx: (Math.random()-0.5)*0.2, dy: (Math.random()-0.5)*0.2, o: Math.random()*0.15+0.05 })
    function draw() { ctx.clearRect(0,0,c.width,c.height); for(const d of p){d.x+=d.dx;d.y+=d.dy;if(d.x<0)d.x=c.width;if(d.x>c.width)d.x=0;if(d.y<0)d.y=c.height;if(d.y>c.height)d.y=0;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${d.o})`;ctx.fill()}id=requestAnimationFrame(draw)}
    draw(); return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [count])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

export default function AvatarSelect() {
  const [user, setUser] = useState(null)
  const [selected, setSelected] = useState(1)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    if (u.avatar) setSelected(u.avatar)
  }, [])

  async function confirm() {
    setSaving(true)
    await supabase.from('users').update({ avatar: selected }).eq('id', user.id)
    const updated = { ...user, avatar: selected }
    localStorage.setItem('user', JSON.stringify(updated))
    router.push('/dashboard')
  }

  if (!user) return null
  const sel = AVATARS.find(a => a.id === selected) || AVATARS[0]

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="navbar">
          <img src="/lapizblue-logo.png" alt="LapizBlue" style={{ height: 26, filter: 'brightness(1.8)' }} />
          <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700 }}>Choose Your Avatar</div>
          <div style={{ width: 60 }} />
        </div>

        <div className="page" style={{ paddingTop: 30, textAlign: 'center' }}>
          {/* Preview */}
          <div className="animate-scale" style={{ marginBottom: 30 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: sel.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, margin: '0 auto 12px', border: '3px solid rgba(255,255,255,0.2)', boxShadow: `0 0 30px ${sel.color}40` }}>
              {sel.emoji}
            </div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700 }}>{sel.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user.username}</div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {AVATARS.map(a => (
              <div key={a.id} onClick={() => setSelected(a.id)}
                className="card animate-fade"
                style={{
                  padding: 14, cursor: 'pointer', textAlign: 'center',
                  borderColor: selected === a.id ? a.color : 'rgba(255,255,255,0.06)',
                  borderWidth: selected === a.id ? 2 : 1,
                  boxShadow: selected === a.id ? `0 0 20px ${a.color}30` : 'var(--shadow)',
                  transform: selected === a.id ? 'scale(1.05)' : 'scale(1)',
                  animationDelay: `${a.id * 0.04}s`,
                }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 8px' }}>
                  {a.emoji}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: selected === a.id ? 'white' : 'var(--muted)' }}>{a.name}</div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={confirm} disabled={saving}>
            {saving ? 'Saving...' : 'Confirm Avatar'}
          </button>

          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )
}
