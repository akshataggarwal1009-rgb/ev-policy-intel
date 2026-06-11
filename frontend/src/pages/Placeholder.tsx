interface Props { title: string; coming: string }

export default function Placeholder({ title, coming }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mb-4">🔜</div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 text-sm max-w-sm">Coming in {coming}</p>
    </div>
  )
}
