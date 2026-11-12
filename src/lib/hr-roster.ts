/**
 * Staff directory for the HR survey, shared by the form (type-ahead) and the API (validation).
 * People pick a name from here so one person never ends up under three spellings.
 * Free typing is still allowed — it is matched loosely against this list, and only obvious
 * junk ("anonymous", "xyz") is refused.
 */

export interface StaffPerson {
  id: string
  name: string
  dept: string
  branch: string
  role?: string
}

const DEFS: [branch: string, dept: string, names: string[]][] = [
  ['Management', 'Management', ['Adil', 'Anam', 'Ashrat', 'Sharif', 'Nazrul', 'Hameed']],
  ['Dubai', 'Sales', ['Kamran', 'Adnan', 'Gulam', 'Alim', 'Mayur', 'Abeera']],
  ['Dubai', 'Logistics and Procurement', ['Imad', 'Dayem', 'Suman']],
  ['Dubai', 'IT and Marketing', ['Tarun', 'Hamdan']],
  ['Dubai', 'Accounts and Collections', ['Aswin', 'Tamil', 'Adharsh', 'Khalid', 'Zeeshan']],
  ['Dubai', 'Counter Sales', ['Ryan', 'Anjali', 'Vanessa', 'Moddasir']],
  ['Dubai', 'Storekeepers', ['Nehal', 'Osama', 'Daniyal']],
  ['Dubai', 'Drivers and Loaders', ['Bilal', 'Nouman', 'Samir', 'Shree', 'Arsalan', 'Nasim', 'Aziz', 'Ashraf', 'Abdul Kadir']],
  ['Dubai', 'Office', ['Danish']],
  ['Abu Dhabi', 'Sales', ['Lovely', 'Rafi', 'Hareesh', 'Anas']],
  ['Abu Dhabi', 'Counter Sales', ['Aquib']],
  ['Abu Dhabi', 'Loaders and Helpers', ['Junaid', 'Sohail']],
  ['Abu Dhabi', 'Drivers', ['Irfan']],
  ['Sharjah', 'Sales', ['Saeed', 'Ejaz', 'Zeeshan']],
  ['Sharjah', 'Counter Sales', ['Rehan']],
  ['Sharjah', 'Loaders and Helpers', ['Naeem']],
  ['Global Classic', 'Sales', ['Atheesh', 'Venkat']],
]
const ROLES: Record<string, string> = { Lovely: 'Branch Manager', Saeed: 'Branch Manager', Atheesh: 'Branch Manager' }

function build(): StaffPerson[] {
  const flat = DEFS.flatMap(([branch, dept, names]) => names.map(n => ({ n, dept, branch })))
  const dupes = new Set(flat.map(p => p.n).filter((n, i, a) => a.indexOf(n) !== i))
  return flat.map(({ n, dept, branch }) => {
    // Two Zeeshans: keep the stored name unique so reports never merge them
    const name = dupes.has(n) ? `${n} (${branch})` : n
    const id = `${branch}/${dept}/${n}`.toLowerCase().replace(/[^a-z0-9/]+/g, '-')
    return { id, name, dept, branch, role: ROLES[n] }
  })
}

export const STAFF: StaffPerson[] = build()

/** Groups in display order, management first. */
export const STAFF_GROUPS: { label: string; people: StaffPerson[] }[] = DEFS.map(([branch, dept]) => {
  const label = branch === 'Management' ? 'Management' : `${dept} · ${branch}`
  return { label, people: STAFF.filter(p => p.branch === branch && p.dept === dept) }
})

export const departmentOf = (p: StaffPerson) => (p.branch === 'Management' ? 'Management' : `${p.dept} · ${p.branch}`)

/* ---------------- loose name matching ---------------- */

const HONORIFICS = new Set([
  'sir', 'bhai', 'bhaiya', 'bhaiyya', 'bro', 'brother', 'madam', 'maam', 'miss', 'mr', 'mrs', 'ms', 'ji', 'saab', 'sahab',
  'sahib', 'boss', 'sb', 'uncle', 'aunty', 'auntie', 'dr', 'eng', 'engr', 'mam', 'ma',
])
// Common name parts that don't identify anyone on their own
const LOW = new Set([
  'mohammed', 'mohammad', 'muhammad', 'mohamed', 'mohd', 'md', 'muhammed', 'mohmd', 'syed', 'sayed', 'shaikh', 'sheikh',
  'shaik', 'khan', 'bin', 'ibn', 'al', 'ul', 'ur', 'ahmed', 'ahmad', 'ali', 'hussain', 'hossain', 'islam', 'kumar', 'singh', 'sk',
])

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function tokensOf(name: string): string[] {
  return fold(name)
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/[\s'-]+/)
    .filter(t => t && !HONORIFICS.has(t))
}

/** Consonant skeleton: Sharif / Shareef / Shariff → "shrf" */
function skeleton(t: string): string {
  return t
    .replace(/^[aeiouy]+/, 'a') // Osama/Usama, Emad/Imad, but Ashraf stays apart from Sharif
    .replace(/ph/g, 'f').replace(/gh/g, 'g').replace(/kh/g, 'k').replace(/th/g, 't').replace(/dh/g, 'd').replace(/bh/g, 'b')
    .replace(/q/g, 'k').replace(/ck/g, 'k').replace(/c/g, 'k').replace(/z/g, 's').replace(/x/g, 'ks').replace(/w/g, 'v')
    .replace(/(?!^)[aeiouy]/g, '')
    .replace(/(.)\1+/g, '$1')
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

function tokenScore(a: string, b: string): number {
  if (a === b) return 3
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  if (s.length >= 4 && l.startsWith(s) && l.length - s.length <= 3) return 2
  if (skeleton(a) === skeleton(b)) return 2
  const d = lev(a, b)
  if (d <= 1 && s.length >= 5) return 1
  if (d <= 2 && s.length >= 8) return 1
  return 0
}

export interface StaffMatch {
  person: StaffPerson
  score: number
  /** @internal every typed token found a home, or one was an exact hit */
  ok: boolean
  /** Confident: safe to store under the directory spelling */
  sure: boolean
}

/** Rank directory people against a typed name. Empty when nothing is even close. */
export function matchStaff(typed: string): StaffMatch[] {
  const toks = tokensOf(typed)
  if (!toks.length) return []
  const use = toks.filter(t => !LOW.has(t))
  if (!use.length) return [] // "Syed" or "Mohammed" alone identifies nobody
  const scored = STAFF.map(person => {
    const ptoks = tokensOf(person.name.replace(/\(.*\)/, ''))
    let score = 0
    let exact = false
    let unmatched = 0
    for (const t of use) {
      const best = Math.max(0, ...ptoks.map(p => tokenScore(t, p)))
      score += best
      if (best === 3) exact = true
      if (best === 0) unmatched++
    }
    // "Usama Manzoor" must not become Osama: a near-miss plus an unknown surname is not the same person
    return { person, score, sure: false, ok: exact || unmatched === 0 }
  })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
  if (scored.length) {
    const top = scored[0].score
    const ties = scored.filter(m => m.score === top).length
    // Exact / near-exact and unambiguous → sure. Two Zeeshans tie on purpose, so they're never auto-picked.
    if (top >= 2 && ties === 1 && scored[0].ok) scored[0].sure = true
  }
  return scored
}

/** Directory spelling if the typed name clearly means one person, else the cleaned typed name. */
export function canonicalName(typed: string): { name: string; person: StaffPerson | null } {
  const best = matchStaff(typed)[0]
  if (best?.sure) return { name: best.person.name, person: best.person }
  const cleaned = tokensOf(typed)
    .map(t => t[0].toUpperCase() + t.slice(1))
    .join(' ')
  return { name: cleaned, person: null }
}

/* ---------------- junk names ---------------- */

const JUNK = new Set([
  'anonymous', 'anonymus', 'anonimous', 'anonymos', 'anon', 'anonymity', 'none', 'nil', 'na', 'null', 'nobody', 'noone',
  'unknown', 'staff', 'employee', 'worker', 'member', 'user', 'person', 'someone', 'somebody', 'me', 'myself', 'you', 'xyz',
  'abc', 'abcd', 'asdf', 'qwerty', 'test', 'tester', 'testing', 'admin', 'hr', 'name', 'fullname', 'firstname', 'lastname',
  'secret', 'private', 'hidden', 'confidential', 'random', 'dummy', 'sample', 'example', 'guest', 'nope', 'no', 'yes',
  'lapiz', 'lapizblue', 'mapei', 'company', 'manager', 'hod', 'colleague', 'friend', 'team', 'department', 'nothing', 'skip',
])

/** True for "anonymous", "xyz", "aaaa", keyboard mash, honorifics only, etc. */
export function isJunkName(name: string): boolean {
  const toks = tokensOf(name)
  if (!toks.length) return true
  const joined = toks.join('')
  if (joined.length < 2) return true
  if (/anony|anonim/.test(joined)) return true
  if (JUNK.has(joined)) return true
  if (toks.every(t => JUNK.has(t))) return true
  if (/^(.)\1+$/.test(joined)) return true
  if (joined.length >= 4 && !/[aeiouy]/.test(joined)) return true
  // real names are letters; a name made mostly of digits/symbols never got here as a token
  if (fold(name).replace(/[\s'-]/g, '').replace(/[a-z]/g, '').length > fold(name).length / 2) return true
  return false
}

export function isJunkEmail(email: string): boolean {
  const [local = '', domain = ''] = email.toLowerCase().split('@')
  const l = local.replace(/[^a-z]/g, '')
  if (/anony|noreply|no-reply|donotreply/.test(local)) return true
  if (['test', 'none', 'null', 'fake', 'example', 'abc', 'xyz', 'asdf', 'email', 'mail'].includes(l)) return true
  if (/(^|\.)(example|test)\.(com|org|net)$/.test(domain)) return true
  return false
}

/** Does this stored name belong to someone in the directory? Used for the admin "unlisted" flag. */
export const inDirectory = (name: string) =>
  STAFF.some(p => p.name.toLowerCase() === name.toLowerCase()) || !!matchStaff(name)[0]?.sure
