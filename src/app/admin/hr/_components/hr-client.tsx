'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Download, Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SURVEYS, periodFor, periodLabel, type SurveyType } from '@/lib/hr-survey'
import { canonicalName, inDirectory } from '@/lib/hr-roster'

interface HrRow {
  id: string
  survey_type: string
  period: string
  department: string | null
  assessed_name: string
  respondent_name: string
  respondent_email: string
  answers: number[]
  total: number
  kpi_score: number
  comment: string | null
  created_at: string
  is_admin?: boolean
}

type View = 'report' | 'completions' | 'settings'

const SELECT =
  'w-full rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-white focus:border-aurora-from focus:outline-none'
const LABEL = 'mb-1.5 block text-micro uppercase tracking-wider text-whitex-faint'
const PANEL = 'rounded-2xl border border-midnight-line bg-midnight-elevated/40'

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const kpiClass = (k: number) => (k >= 80 ? 'text-success' : k >= 60 ? 'text-warning' : 'text-danger')
const SCALE_WORD = ['', 'Very Poor', 'Poor', 'Satisfactory', 'Good', 'Excellent']
/** "Adil Sir", "adil", "Adil" are one person: group old and new rows under the directory spelling */
const shownName = (r: HrRow) => canonicalName(r.assessed_name).name
const keyOf = (type: string, name: string) => `${type}|${name.toLowerCase()}`
const CHECK = 'h-4 w-4 cursor-pointer rounded accent-[#F4A6C1]'
/** Name typed at the gate that matches nobody in the staff directory — worth a second look */
const Unlisted = ({ name }: { name: string }) =>
  inDirectory(name) ? null : (
    <Badge tone="danger" className="ml-1.5" title="This name does not match anyone in the staff list">
      Not in staff list
    </Badge>
  )

/** Excel workbook for one period: a Summary and a Responses sheet per survey, full question text as headers. */
async function downloadWorkbook(period: string, rows: HrRow[], fileName = `hr-survey-${period}.xlsx`) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LapizBlue HR'

  const styleHeader = (ws: any) => {
    const h = ws.getRow(1)
    h.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D4FB3' } }
    h.alignment = { wrapText: true, vertical: 'middle' }
    h.height = 64
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  for (const type of ['A', 'B'] as const) {
    const list = rows.filter(r => r.survey_type === type)
    if (!list.length) continue
    const qs = SURVEYS[type].questions
    const tag = type === 'A' ? 'A Staff→Manager' : 'B Manager→Staff'

    // Summary: one row per person assessed
    const sum = wb.addWorksheet(`${tag} Summary`)
    sum.columns = [
      { header: 'Person assessed', width: 22 },
      { header: 'Department', width: 16 },
      { header: 'Responses', width: 11 },
      { header: 'KPI score /100 (average)', width: 14 },
      ...qs.map((q, i) => ({ header: `Q${i + 1}. ${q} (avg /5)`, width: 30 })),
      { header: 'Rated by', width: 40 },
    ]
    const byPerson = new Map<string, HrRow[]>()
    for (const r of list) {
      const k = shownName(r).toLowerCase()
      byPerson.set(k, [...(byPerson.get(k) ?? []), r])
    }
    for (const g of [...byPerson.values()].sort((a, b) => shownName(a[0]).localeCompare(shownName(b[0])))) {
      sum.addRow([
        shownName(g[0]),
        [...new Set(g.map(r => r.department).filter(Boolean))].join(', '),
        g.length,
        Math.round(avg(g.map(r => r.kpi_score))),
        ...qs.map((_, i) => Number(avg(g.map(r => r.answers[i])).toFixed(2))),
        g.map(r => `${r.respondent_name} <${r.respondent_email}>`).join('; '),
      ])
    }
    styleHeader(sum)

    // Responses: one row per submission
    const res = wb.addWorksheet(`${tag} Responses`)
    res.columns = [
      { header: 'Submitted', width: 18 },
      { header: 'Respondent name', width: 20 },
      { header: 'Respondent email', width: 26 },
      { header: 'Person assessed', width: 20 },
      { header: 'Department', width: 16 },
      ...qs.map((q, i) => ({ header: `Q${i + 1}. ${q}`, width: 30 })),
      { header: 'Total /50', width: 10 },
      { header: 'KPI /100', width: 10 },
      { header: 'Comment', width: 40 },
    ]
    for (const r of list) {
      res.addRow([
        new Date(r.created_at).toLocaleString('en-GB'),
        r.respondent_name + (r.is_admin ? ' (admin)' : ''),
        r.respondent_email,
        shownName(r),
        r.department ?? '',
        ...r.answers.map(a => `${a} – ${SCALE_WORD[a]}`),
        r.total,
        r.kpi_score,
        r.comment ?? '',
      ])
    }
    styleHeader(res)
  }

  if (!wb.worksheets.length) wb.addWorksheet('No responses')
  const buf = await wb.xlsx.writeBuffer()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function HrClient({ initial, passcode }: { initial: HrRow[]; passcode: string }) {
  const router = useRouter()
  const [view, setView] = useState<View>('report')
  const [period, setPeriod] = useState(periodFor())
  const [type, setType] = useState<SurveyType>('A')
  const [dept, setDept] = useState('All')
  const [open, setOpen] = useState<string | null>(null)
  const [newCode, setNewCode] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const rows = initial
  const periods = useMemo(() => [...new Set([periodFor(), ...rows.map(r => r.period)])].sort().reverse(), [rows])
  const depts = useMemo(() => ['All', ...new Set(rows.map(r => r.department).filter(Boolean) as string[])], [rows])
  const inPeriod = useMemo(() => rows.filter(r => r.period === period), [rows, period])
  const filtered = useMemo(
    () => inPeriod.filter(r => r.survey_type === type && (dept === 'All' || r.department === dept)),
    [inPeriod, type, dept],
  )

  const groups = useMemo(() => {
    const m = new Map<string, { name: string; depts: Set<string>; list: HrRow[] }>()
    for (const r of filtered) {
      const name = shownName(r)
      const k = name.toLowerCase()
      if (!m.has(k)) m.set(k, { name, depts: new Set(), list: [] })
      const g = m.get(k)!
      g.list.push(r)
      if (r.department) g.depts.add(r.department)
    }
    return [...m.values()]
      .map(g => ({
        name: g.name,
        list: g.list,
        dept: [...g.depts].join(', '),
        kpi: Math.round(avg(g.list.map(r => r.kpi_score))),
        perQ: Array.from({ length: 10 }, (_, i) => avg(g.list.map(r => r.answers[i]))),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  async function exportWorkbook() {
    if (!inPeriod.length) return toast.error(`No responses in ${periodLabel(period)} to export`)
    try {
      await downloadWorkbook(period, inPeriod)
    } catch {
      toast.error('Export failed, please try again')
    }
  }

  // Selection survives switching Survey A/B and Department, so HR can build one file across filters.
  const pickedRows = useMemo(() => inPeriod.filter(r => picked.has(keyOf(r.survey_type, shownName(r)))), [inPeriod, picked])
  const pickedCount = useMemo(() => new Set(pickedRows.map(r => keyOf(r.survey_type, shownName(r)))).size, [pickedRows])
  const allShownPicked = groups.length > 0 && groups.every(g => picked.has(keyOf(type, g.name)))
  const someShownPicked = groups.some(g => picked.has(keyOf(type, g.name)))

  function togglePick(name: string) {
    const k = keyOf(type, name)
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function toggleAllShown() {
    setPicked(prev => {
      const next = new Set(prev)
      for (const g of groups) {
        if (allShownPicked) next.delete(keyOf(type, g.name))
        else next.add(keyOf(type, g.name))
      }
      return next
    })
  }

  async function exportSelected() {
    if (!pickedRows.length) return toast.error('Tick at least one person to export')
    try {
      await downloadWorkbook(period, pickedRows, `hr-survey-${period}-selected-${pickedCount}.xlsx`)
    } catch {
      toast.error('Export failed, please try again')
    }
  }

  async function savePasscode() {
    if (!/^\d{6}$/.test(newCode)) return toast.error('Passcode must be exactly 6 digits')
    setBusy(true)
    const res = await fetch('/api/admin/hr/passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: newCode }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast.error(body?.error || 'Could not save passcode')
    setNewCode('')
    toast.success('Passcode updated. Share the new one with staff.')
    router.refresh()
  }

  async function del(id: string) {
    setBusy(true)
    const res = await fetch(`/api/admin/hr/responses/${id}`, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast.error(body?.error || 'Delete failed')
    setConfirmDel(null)
    toast.success('Response deleted')
    router.refresh()
  }

  const surveyUrl = typeof window !== 'undefined' ? `${window.location.origin}/survey` : '/survey'

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight text-white">HR Colleague Feedback</h1>
          <p className="mt-1 text-caption text-whitex-muted">
            {inPeriod.length} responses in {periodLabel(period)} · staff link <span className="font-mono">/survey</span>
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-midnight-line bg-midnight-deepest/60 p-1">
          {(
            [
              ['report', 'KPI Report'],
              ['completions', 'Completions'],
              ['settings', 'Settings'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-caption',
                view === k ? 'bg-midnight-elevated font-medium text-white shadow-sm' : 'text-whitex-muted hover:text-whitex-soft',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {view !== 'settings' && (
        <div className={cn(PANEL, 'mb-4 grid gap-3 p-4 sm:grid-cols-3')}>
          <div>
            <label className={LABEL} htmlFor="hr-period">Period</label>
            <select
              id="hr-period"
              className={SELECT}
              value={period}
              onChange={e => {
                setPeriod(e.target.value)
                setPicked(new Set())
              }}
            >
              {periods.map(p => (
                <option key={p} value={p}>{periodLabel(p)}</option>
              ))}
            </select>
          </div>
          {view === 'report' && (
            <>
              <div>
                <label className={LABEL} htmlFor="hr-type">Survey</label>
                <select
                  id="hr-type"
                  className={SELECT}
                  value={type}
                  onChange={e => {
                    setType(e.target.value as SurveyType)
                    setOpen(null)
                  }}
                >
                  <option value="A">A · Staff rating HOD ({inPeriod.filter(r => r.survey_type === 'A').length})</option>
                  <option value="B">B · HOD rating staff ({inPeriod.filter(r => r.survey_type === 'B').length})</option>
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="hr-dept">Department</label>
                <select id="hr-dept" className={SELECT} value={dept} onChange={e => setDept(e.target.value)}>
                  {depts.map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {view === 'report' &&
        (groups.length === 0 ? (
          <div className={cn(PANEL, 'p-12 text-center text-caption text-whitex-muted')}>
            No Survey {type} responses for {periodLabel(period)} yet.
          </div>
        ) : (
          <div className={cn(PANEL, 'overflow-hidden')}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-midnight-line px-5 py-3">
              <div>
                <div className="text-body font-semibold text-white">
                  KPI scores · {groups.length} {groups.length === 1 ? 'person' : 'people'}
                </div>
                <div className="text-micro text-whitex-faint">
                  {pickedCount > 0
                    ? `${pickedCount} selected · ${pickedRows.length} responses (selection is kept when you switch survey or department)`
                    : 'Tick people to export just them into one Excel, e.g. one department'}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {pickedCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
                    Clear
                  </Button>
                )}
                <Button size="sm" disabled={pickedCount === 0} onClick={exportSelected}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export selected{pickedCount > 0 ? ` (${pickedCount})` : ''}
                </Button>
                <Button variant="ghost" size="sm" onClick={exportWorkbook}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export everyone
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
                    <th className="w-10 py-3 pl-5 pr-1">
                      <input
                        type="checkbox"
                        className={CHECK}
                        aria-label="Select everyone shown"
                        title="Select everyone shown"
                        checked={allShownPicked}
                        ref={el => {
                          if (el) el.indeterminate = someShownPicked && !allShownPicked
                        }}
                        onChange={toggleAllShown}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Person</th>
                    <th className="px-4 py-3 font-medium">Dept</th>
                    <th className="px-4 py-3 font-medium">Responses</th>
                    <th className="px-4 py-3 font-medium">Rated by</th>
                    <th className="px-4 py-3 font-medium">KPI /100</th>
                    {SURVEYS[type].questions.map((q, i) => (
                      <th key={i} title={q} className="px-2 py-3 text-center font-medium">Q{i + 1}</th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <Fragment key={g.name}>
                      <tr
                        className={cn(
                          'border-b border-midnight-line/60 hover:bg-midnight-line/40',
                          picked.has(keyOf(type, g.name)) && 'bg-[#F4A6C1]/[0.06]',
                        )}
                      >
                        <td className="py-3 pl-5 pr-1">
                          <input
                            type="checkbox"
                            className={CHECK}
                            aria-label={`Select ${g.name}`}
                            checked={picked.has(keyOf(type, g.name))}
                            onChange={() => togglePick(g.name)}
                          />
                        </td>
                        <td className="px-4 py-3 text-body font-medium text-whitex-soft">
                          <label className="cursor-pointer" onClick={() => togglePick(g.name)}>{g.name}</label>
                        </td>
                        <td className="px-4 py-3 text-caption text-whitex-muted">{g.dept || '—'}</td>
                        <td className="px-4 py-3 text-caption text-whitex-soft">
                          {g.list.length}
                        </td>
                        <td className="px-4 py-3">
                          <div className="grid gap-1.5">
                            {g.list.map(r => (
                              <div key={r.id} className="leading-tight">
                                <div className="whitespace-nowrap text-caption font-medium text-whitex-soft">
                                  {r.respondent_name}
                                  {r.is_admin && <Badge tone="gold" className="ml-1.5">Admin</Badge>}
                                  <Unlisted name={r.respondent_name} />
                                </div>
                                <div className="whitespace-nowrap text-micro text-whitex-faint">{r.respondent_email}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={cn('px-4 py-3 font-mono text-lg font-bold', kpiClass(g.kpi))}>{g.kpi}</td>
                        {g.perQ.map((v, i) => (
                          <td key={i} className={cn('px-2 py-3 text-center font-mono text-caption', v < 3 ? 'text-danger' : 'text-whitex-soft')}>
                            {v.toFixed(1)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" aria-expanded={open === g.name} onClick={() => setOpen(open === g.name ? null : g.name)}>
                            {open === g.name ? 'Hide' : 'Details'}
                          </Button>
                        </td>
                      </tr>
                      {open === g.name && (
                        <tr className="border-b border-midnight-line/60 bg-midnight-deepest/40">
                          <td colSpan={17} className="px-5 py-4 text-caption">
                            <div className="mb-2 text-micro uppercase tracking-wider text-whitex-faint">Rated by</div>
                            <div className="mb-4 grid gap-1">
                              {g.list.map(r => (
                                <div key={r.id} className="flex flex-wrap items-baseline gap-x-3 text-whitex-soft">
                                  <span className="font-medium">{r.respondent_name}</span>
                                  <span className="text-micro text-whitex-faint">{r.respondent_email}</span>
                                  <span className={cn('font-mono', kpiClass(r.kpi_score))}>{r.kpi_score}</span>
                                  {r.is_admin && <Badge tone="gold">Admin</Badge>}
                                </div>
                              ))}
                            </div>
                            <div className="mb-2 text-micro uppercase tracking-wider text-whitex-faint">Comments</div>
                            {g.list.filter(r => r.comment).length === 0 ? (
                              <div className="text-whitex-muted">No comments.</div>
                            ) : (
                              g.list
                                .filter(r => r.comment)
                                .map(r => (
                                  <div key={r.id} className="mb-2 rounded-md border-l-2 border-glow bg-glow/5 px-3 py-2 text-whitex-soft">
                                    {r.comment}
                                    <div className="mt-1 text-micro text-whitex-faint">— {r.respondent_name}</div>
                                  </div>
                                ))
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <ol className="grid gap-1 border-t border-midnight-line px-5 py-4 text-caption text-whitex-muted md:grid-cols-2">
              {SURVEYS[type].questions.map((q, i) => (
                <li key={i}>
                  <span className="font-mono text-whitex-faint">Q{i + 1}</span> {q}
                </li>
              ))}
            </ol>
          </div>
        ))}

      {view === 'completions' && (
        <div className={cn(PANEL, 'overflow-hidden')}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-midnight-line px-5 py-3">
            <div>
              <div className="text-body font-semibold text-white">Who has submitted · {inPeriod.length}</div>
              <div className="text-micro text-whitex-faint">Admin only. Staff are told managers never see who said what — keep it that way.</div>
            </div>
            <Button variant="ghost" size="sm" onClick={exportWorkbook}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export Excel
            </Button>
          </div>
          {inPeriod.length === 0 ? (
            <div className="p-12 text-center text-caption text-whitex-muted">No responses in {periodLabel(period)} yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Respondent</th>
                    <th className="px-5 py-3 font-medium">Survey</th>
                    <th className="px-5 py-3 font-medium">Rated</th>
                    <th className="w-44 px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {inPeriod.map(r => (
                    <tr key={r.id} className="border-b border-midnight-line/60 last:border-0 hover:bg-midnight-line/40">
                      <td className="whitespace-nowrap px-5 py-3 text-caption text-whitex-muted">
                        {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-body font-medium text-whitex-soft">
                          {r.respondent_name}
                          {r.is_admin && <Badge tone="gold" className="ml-2">Admin</Badge>}
                          <Unlisted name={r.respondent_name} />
                        </div>
                        <div className="text-micro text-whitex-faint">{r.respondent_email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={r.survey_type === 'A' ? 'info' : 'glow'}>{r.survey_type}</Badge>
                      </td>
                      <td className="px-5 py-3 text-caption text-whitex-soft">{shownName(r)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        {confirmDel === r.id ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" disabled={busy} className="text-danger hover:bg-danger/10" onClick={() => del(r.id)}>
                              Confirm
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-whitex-muted hover:text-danger"
                            aria-label={`Delete response from ${r.respondent_name}`}
                            onClick={() => setConfirmDel(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'settings' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cn(PANEL, 'p-6')}>
            <div className="text-body font-semibold text-white">Staff passcode</div>
            <p className="mb-4 mt-1 text-caption text-whitex-muted">
              Everyone uses this 6-digit code to open the survey. Change it to cut off access.
            </p>
            <div className="mb-4 font-mono text-4xl font-bold tracking-[0.3em] text-white">{passcode || '— not set —'}</div>
            <label className={LABEL} htmlFor="new-code">New passcode</label>
            <div className="flex gap-2">
              <Input
                id="new-code"
                inputMode="numeric"
                maxLength={6}
                value={newCode}
                onChange={e => setNewCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6 digits"
                className="font-mono tracking-widest"
              />
              <Button onClick={savePasscode} disabled={busy} className="h-11">
                Save
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setNewCode(String(Math.floor(100000 + Math.random() * 900000)))}
            >
              Generate random
            </Button>
          </div>
          <div className={cn(PANEL, 'p-6')}>
            <div className="text-body font-semibold text-white">Survey link</div>
            <p className="mb-4 mt-1 text-caption text-whitex-muted">Send this link plus the passcode to staff.</p>
            <div className="flex gap-2">
              <Input readOnly value={surveyUrl} aria-label="Survey link" onFocus={e => e.target.select()} />
              <Button
                variant="ghost"
                className="h-11"
                aria-label="Copy survey link"
                onClick={() =>
                  navigator.clipboard
                    ?.writeText(surveyUrl)
                    .then(() => toast.success('Link copied'), () => toast.error('Copy failed, select the link manually'))
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-6 text-caption leading-relaxed text-whitex-muted">
              <strong className="text-whitex-soft">Scoring.</strong> 10 questions × 5 = 50 points. KPI score = total × 2, out of 100.
              Where several people rate the same person, the KPI is the average. Periods run Jan–Jun and Jul–Dec; each person can rate the same colleague once per period (admin, while signed in, can submit any number of times).
            </p>
          </div>
        </div>
      )}
    </>
  )
}
