import clsx from 'clsx'
import { Link } from 'react-router-dom'
import type { JurisdictionCompareData } from '@/api/compare'
import { SLOT_COLORS } from './JurisdictionPicker'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtSubsidy(v: number | null): string {
  if (v === null) return '—'
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

function fmtConfidence(v: number): string {
  return `${Math.round(v * 100)}%`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
}

/** Index of the column whose numeric value is highest (null excluded). Returns -1 if all null. */
function bestIdx(vals: (number | null)[]): number {
  let best = -1
  let bestVal = -Infinity
  vals.forEach((v, i) => {
    if (v !== null && v > bestVal) { bestVal = v; best = i }
  })
  return best
}

// ── section / row primitives ─────────────────────────────────────────────────

function SectionHeader({ label, cols }: { label: string; cols: number }) {
  return (
    <tr className="bg-slate-50">
      <td
        colSpan={cols + 1}
        className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200"
      >
        {label}
      </td>
    </tr>
  )
}

interface RowProps {
  label: string
  cells: React.ReactNode[]
  highlight?: number   // index of the "best" cell to tint
  tight?: boolean
}

function Row({ label, cells, highlight, tight }: RowProps) {
  return (
    <tr className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
      <td className={clsx('px-4 text-sm text-slate-600 font-medium whitespace-nowrap', tight ? 'py-2' : 'py-3')}>
        {label}
      </td>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={clsx(
            'px-4 text-sm text-center align-middle',
            tight ? 'py-2' : 'py-3',
            highlight === i && 'bg-teal-50',
          )}
        >
          {cell}
        </td>
      ))}
    </tr>
  )
}

function Check({ yes, label }: { yes: boolean; label?: string | null }) {
  return yes ? (
    <span className="inline-flex items-center gap-1 text-teal-600 font-semibold">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {label && <span className="text-xs text-slate-600 font-normal">{label}</span>}
    </span>
  ) : (
    <span className="text-slate-300 text-lg">—</span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-amber-100 text-amber-700',
    expired: 'bg-slate-100 text-slate-500',
    proposed: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize', map[status] ?? 'bg-slate-100 text-slate-600')}>
      {status}
    </span>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  data: JurisdictionCompareData[]
}

export default function CompareTable({ data }: Props) {
  const n = data.length

  // ── header names ──
  const headerRow = (
    <tr>
      <th className="w-48 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 bg-white" />
      {data.map((d, i) => {
        const color = SLOT_COLORS[i]
        return (
          <th
            key={d.jurisdiction}
            className="px-4 py-3 text-center border-b border-slate-200 bg-white"
          >
            <div className="flex flex-col items-center gap-1">
              <span className={clsx('w-3 h-3 rounded-full', color.bg)} />
              <span className="text-sm font-bold text-slate-800">{d.jurisdiction}</span>
              {d.jurisdiction_type && (
                <span className="text-xs text-slate-500 capitalize">
                  {d.jurisdiction_type.replace('_', ' ')}
                </span>
              )}
            </div>
          </th>
        )
      })}
    </tr>
  )

  // ── overview rows ──
  const statusCells = data.map(d =>
    d.primary_policy ? <StatusBadge status={d.primary_policy.status} /> : <span className="text-slate-300">—</span>
  )
  const effectiveCells = data.map(d => (
    <span className="text-slate-700">{fmtDate(d.primary_policy?.effective_date)}</span>
  ))
  const confidenceCells = data.map(d => {
    const pct = Math.round(d.avg_confidence * 100)
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className={clsx(
            'inline-block w-2 h-2 rounded-full',
            pct >= 85 ? 'bg-emerald-400' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400',
          )}
        />
        <span className="text-slate-700">{fmtConfidence(d.avg_confidence)}</span>
      </span>
    )
  })
  const policyCntCells = data.map(d => (
    <span>
      <span className="font-semibold text-slate-800">{d.active_policies}</span>
      <span className="text-slate-400 text-xs ml-1">/ {d.total_policies}</span>
    </span>
  ))
  const incentiveCntCells = data.map(d => (
    <span className="font-semibold text-slate-800">{d.total_incentives}</span>
  ))
  const primaryPolicyCell = data.map(d =>
    d.primary_policy ? (
      <Link
        to={`/policy/${d.primary_policy.id}`}
        className="text-teal-600 hover:text-teal-800 text-xs underline underline-offset-2 leading-tight block max-w-[180px] mx-auto"
      >
        {d.primary_policy.title}
      </Link>
    ) : (
      <span className="text-slate-300 text-xs">No data</span>
    )
  )

  // ── subsidy rows ──
  const sub2w = data.map(d => d.subsidies['2w'])
  const sub3w = data.map(d => d.subsidies['3w'])
  const sub4w = data.map(d => d.subsidies['4w'])
  const subCom = data.map(d => d.subsidies.commercial)
  const subBus = data.map(d => d.subsidies.bus)

  function subsidyCells(vals: (number | null)[]) {
    const best = bestIdx(vals)
    return {
      cells: vals.map((v, i) => (
        <span className={clsx('font-semibold', i === best ? 'text-teal-700' : 'text-slate-700')}>
          {fmtSubsidy(v)}
          {i === best && v !== null && (
            <span className="ml-1 text-xs text-teal-500 font-normal">↑best</span>
          )}
        </span>
      )),
      highlight: best === -1 ? undefined : best,
    }
  }

  const row2w = subsidyCells(sub2w)
  const row3w = subsidyCells(sub3w)
  const row4w = subsidyCells(sub4w)
  const rowCom = subsidyCells(subCom)
  const rowBus = subsidyCells(subBus)

  // ── coverage rows ──
  type CovKey = keyof JurisdictionCompareData['coverage']

  function covRow(key: CovKey) {
    const cells = data.map(d => {
      const entry = d.coverage[key]
      return <Check yes={entry.present} label={entry.best_value ?? undefined} />
    })
    return { cells }
  }

  const covTax   = covRow('tax_exemption')
  const covReg   = covRow('registration_waiver')
  const covCharg = covRow('charging_infra')
  const covFleet = covRow('fleet_incentive')
  const covScrap = covRow('scrappage')
  const covRd    = covRow('rd_grant')
  const covMfg   = covRow('manufacturing_incentive')

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
      <table className="w-full border-collapse">
        <thead>{headerRow}</thead>
        <tbody>

          <SectionHeader label="Overview" cols={n} />
          <Row label="Primary policy" cells={primaryPolicyCell} />
          <Row label="Policy status" cells={statusCells} />
          <Row label="Effective date" cells={effectiveCells} />
          <Row label="Avg. confidence" cells={confidenceCells} />
          <Row label="Active / total policies" cells={policyCntCells} />
          <Row label="Total incentives" cells={incentiveCntCells} />

          <SectionHeader label="Purchase Subsidies (max per segment)" cols={n} />
          <Row label="2-Wheeler" cells={row2w.cells} highlight={row2w.highlight} tight />
          <Row label="3-Wheeler" cells={row3w.cells} highlight={row3w.highlight} tight />
          <Row label="4-Wheeler / EV car" cells={row4w.cells} highlight={row4w.highlight} tight />
          <Row label="Commercial vehicle" cells={rowCom.cells} highlight={rowCom.highlight} tight />
          <Row label="Bus / transit" cells={rowBus.cells} highlight={rowBus.highlight} tight />

          <SectionHeader label="Tax & Registration" cols={n} />
          <Row label="Tax exemption" cells={covTax.cells} tight />
          <Row label="Registration waiver" cells={covReg.cells} tight />

          <SectionHeader label="Infrastructure & Adoption" cols={n} />
          <Row label="Charging infra support" cells={covCharg.cells} tight />
          <Row label="Fleet incentive" cells={covFleet.cells} tight />
          <Row label="Scrappage scheme" cells={covScrap.cells} tight />

          <SectionHeader label="Industry & R&D" cols={n} />
          <Row label="R&D grant" cells={covRd.cells} tight />
          <Row label="Manufacturing incentive" cells={covMfg.cells} tight />

        </tbody>
      </table>
    </div>
  )
}
