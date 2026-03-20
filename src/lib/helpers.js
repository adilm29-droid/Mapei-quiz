import { supabase } from './supabase'

// ── Avatars ──
export const AVATARS = [
  { id: 1, emoji: '🏗️', name: 'Builder', color: '#ea580c' },
  { id: 2, emoji: '🔧', name: 'Technician', color: '#2563eb' },
  { id: 3, emoji: '💼', name: 'Sales Pro', color: '#1e3a5f' },
  { id: 4, emoji: '🎯', name: 'Expert', color: '#E30613' },
  { id: 5, emoji: '⭐', name: 'Star', color: '#d97706' },
  { id: 6, emoji: '🚀', name: 'Pioneer', color: '#7c3aed' },
  { id: 7, emoji: '🛡️', name: 'Guardian', color: '#059669' },
  { id: 8, emoji: '👑', name: 'Champion', color: '#92400e' },
]

export function getAvatar(id) {
  return AVATARS.find(a => a.id === id) || AVATARS[0]
}

// ── Ranks ──
export const RANKS = [
  { name: 'Apprentice', minXp: 0, color: '#9ca3af', icon: '' },
  { name: 'Practitioner', minXp: 500, color: '#60a5fa', icon: '🔵' },
  { name: 'Specialist', minXp: 1500, color: '#4ade80', icon: '🟢' },
  { name: 'Expert', minXp: 3000, color: '#fbbf24', icon: '🟡' },
  { name: 'Master', minXp: 6000, color: '#ff6b6b', icon: '👑' },
]

export function getRank(xp) {
  let rank = RANKS[0]
  for (const r of RANKS) {
    if (xp >= r.minXp) rank = r
  }
  return rank
}

export function getNextRank(xp) {
  for (const r of RANKS) {
    if (xp < r.minXp) return r
  }
  return null
}

// ── XP System ──
export async function awardXP(userId, correctAnswers, totalQuestions, scorePct, level) {
  let xpGained = 10 // complete quiz
  xpGained += correctAnswers * 5 // per correct answer
  if (scorePct >= 90) xpGained += 50
  else if (scorePct >= 70) xpGained += 25

  // Check if first time passing this level
  const { count } = await supabase
    .from('scores').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('level', level).gte('score', 70)
  if (count <= 1) xpGained += 100 // first pass bonus

  // Get current XP and update
  const { data: userData } = await supabase.from('users').select('xp').eq('id', userId).single()
  const currentXp = userData?.xp || 0
  const newXp = currentXp + xpGained
  const newRank = getRank(newXp)

  await supabase.from('users').update({ xp: newXp, rank: newRank.name }).eq('id', userId)

  // Update localStorage
  const stored = JSON.parse(localStorage.getItem('user') || '{}')
  stored.xp = newXp
  stored.rank = newRank.name
  localStorage.setItem('user', JSON.stringify(stored))

  return { xpGained, newXp, newRank }
}

// ── Levels ──
export const LEVELS = ['Foundation', 'Practitioner', 'Advanced', 'Expert']
export const LEVEL_CLASS = { Foundation: 'level-foundation', Practitioner: 'level-practitioner', Advanced: 'level-advanced', Expert: 'level-expert' }
export const CATEGORIES = ['All', 'Adhesives', 'Waterproofing', 'Flooring', 'Grouts and Mortars', 'Concrete Repair', 'General Products']
