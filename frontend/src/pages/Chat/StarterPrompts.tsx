interface Props {
  onSelect: (prompt: string) => void
}

const PROMPTS = [
  { icon: '🏷️', label: 'Delhi 2-wheeler incentives', q: "What are Delhi's EV purchase incentives for 2-wheelers?" },
  { icon: '⚖️', label: 'Compare top states', q: 'Compare the EV policies of Maharashtra, Delhi, and Karnataka — which offers the highest combined incentive?' },
  { icon: '🌍', label: 'India vs Norway', q: 'How does India\'s national FAME II scheme compare to Norway\'s EV incentive programme?' },
  { icon: '🏭', label: 'Manufacturing incentives', q: 'Which Indian states offer the best manufacturing incentives for EV companies?' },
  { icon: '🔋', label: 'Charging infrastructure', q: 'Summarise the charging infrastructure support available across Indian states.' },
  { icon: '💰', label: 'Highest subsidies', q: 'Which jurisdictions offer the highest purchase subsidies for electric 4-wheelers?' },
]

export default function StarterPrompts({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-8">
      <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
        <span className="text-2xl">⚡</span>
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">EV Policy AI Assistant</h2>
      <p className="text-sm text-slate-500 mb-8 text-center max-w-md">
        Ask anything about EV policies, incentives, and benchmarks across India and global markets.
        Answers are grounded in verified policy data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {PROMPTS.map((p) => (
          <button
            key={p.q}
            onClick={() => onSelect(p.q)}
            className="flex items-center gap-2.5 text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50 transition-colors group"
          >
            <span className="text-lg flex-shrink-0">{p.icon}</span>
            <span className="text-sm text-slate-600 group-hover:text-teal-700 leading-tight">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
