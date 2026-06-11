import { Link } from 'react-router-dom'

const features = [
  { icon: '🗂️', title: 'Browse Policies', desc: 'Explore EV policies across 20+ Indian states and 12 global markets', to: '/browse' },
  { icon: '🗺️', title: 'India Map', desc: 'Choropleth map of policy coverage and incentive density by state', to: '/map' },
  { icon: '⚖️', title: 'Compare', desc: 'Side-by-side comparison of policy frameworks across jurisdictions', to: '/compare' },
  { icon: '💬', title: 'AI Assistant', desc: 'Ask questions about EV policies in natural language with cited answers', to: '/chat' },
]

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          India EV Policy Intelligence Platform
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Navigate India's EV Policy Landscape
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          A structured, queryable database of EV policies, incentives, and benchmarks across
          Indian jurisdictions and global markets — built for policymakers and researchers.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            to="/browse"
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Browse Policies
          </Link>
          <Link
            to="/chat"
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Ask AI Assistant
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map(f => (
          <Link
            key={f.to}
            to={f.to}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-teal-700">{f.title}</h3>
            <p className="text-sm text-slate-500">{f.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
