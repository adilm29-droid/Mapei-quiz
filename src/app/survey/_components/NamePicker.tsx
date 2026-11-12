'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { STAFF, STAFF_GROUPS, departmentOf, matchStaff, type StaffPerson } from '@/lib/hr-roster'

interface Props {
  id: string
  label: string
  value: string
  onChange: (name: string, person: StaffPerson | null) => void
  autoFocus?: boolean
  autoComplete?: string
  /** Hide this person from the suggestions (you can't rate yourself) */
  exclude?: string
}

/**
 * One plain text field. As you type, matching staff names drop down so people tap the
 * right spelling. Free typing still works — nobody gets stuck because of a spelling.
 */
export function NamePicker({ id, label, value, onChange, autoFocus, autoComplete = 'off', exclude }: Props) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const [picked, setPicked] = useState<StaffPerson | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  const options = useMemo(() => {
    const q = value.trim()
    const hide = (p: StaffPerson) => exclude && p.name.toLowerCase() === exclude.toLowerCase()
    if (!q) return STAFF_GROUPS.flatMap(g => g.people).filter(p => !hide(p))
    const ranked = matchStaff(q).map(m => m.person)
    const sub = STAFF.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) && !ranked.includes(p))
    return [...ranked, ...sub].filter(p => !hide(p)).slice(0, 8)
  }, [value, exclude])

  useEffect(() => {
    setHi(0)
  }, [value])

  useEffect(() => {
    function away(e: PointerEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', away)
    return () => window.removeEventListener('pointerdown', away)
  }, [])

  function choose(p: StaffPerson) {
    setPicked(p)
    onChange(p.name, p)
    setOpen(false)
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !options.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi(h => (h + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi(h => (h - 1 + options.length) % options.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(options[hi])
    } else if (e.key === 'Escape') setOpen(false)
  }

  const showList = open && options.length > 0 && !(picked && picked.name === value)

  return (
    <div ref={wrap} className="namepick">
      <div className="field">
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete={autoComplete}
          placeholder=" "
          value={value}
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKey}
          onChange={e => {
            setPicked(null)
            onChange(e.target.value, null)
            setOpen(true)
          }}
        />
        <label htmlFor={id}>{label}</label>
        <span className="line" />
        {picked && picked.name === value && (
          <span className="namepick-ok" aria-hidden="true">
            ✓ {departmentOf(picked)}
          </span>
        )}
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="namepick-list">
          {options.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === hi}
              className={i === hi ? 'hi' : ''}
              onPointerEnter={() => setHi(i)}
              onPointerDown={e => {
                e.preventDefault()
                choose(p)
              }}
            >
              <span className="n">{p.name}</span>
              <span className="d">
                {departmentOf(p)}
                {p.role ? ` · ${p.role}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
