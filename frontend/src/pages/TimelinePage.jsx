import React, { useState } from 'react'

const levelConfig = {
  INFO:  { bg: 'bg-blue-50',   border: 'border-blue-200',  dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700' },
  WARN:  { bg: 'bg-amber-50',  border: 'border-amber-200', dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700' },
  ERROR: { bg: 'bg-red-50',    border: 'border-red-200',   dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700' },
  FATAL: { bg: 'bg-purple-50', border: 'border-purple-200',dot: 'bg-purple-600', badge: 'bg-purple-100 text-purple-700' },
}

function TimelineEvent({ event, index, onAnnotate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(event.note || '')
  const cfg = levelConfig[event.level] || levelConfig.INFO
  const time = new Date(event.timestamp).toLocaleTimeString()

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center pt-1 flex-shrink-0">
        <div className={`w-3 h-3 rounded-full ${cfg.dot} ring-4 ring-slate-50 shadow-sm`} />
        <div className="w-px flex-1 bg-slate-200 mt-1 group-last:hidden" />
      </div>
      <div className={`flex-1 mb-4 rounded-xl border ${cfg.border} ${cfg.bg} p-4 shadow-sm`}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${cfg.badge}`}>{event.level}</span>
            <span className="text-xs text-slate-400">{time}</span>
            <span className="text-xs bg-white text-slate-500 px-2 py-0.5 rounded-md font-medium border border-slate-200">{event.service}</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(!editing)}
              className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 transition-colors">
              {editing ? 'Done' : 'Annotate'}
            </button>
            <button onClick={() => onRemove(index)}
              className="text-xs px-2.5 py-1 border border-red-100 rounded-lg bg-white hover:bg-red-50 text-red-400 transition-colors">
              Remove
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-700 mt-2.5 font-medium">{event.message}</p>
        {editing && (
          <textarea value={note}
            onChange={e => { setNote(e.target.value); onAnnotate(index, e.target.value) }}
            placeholder="Add an engineering note..."
            className="mt-2.5 w-full p-2.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 resize-none h-16 transition bg-white"
          />
        )}
        {!editing && note && (
          <p className="mt-2 text-xs text-slate-500 italic bg-white/60 rounded-lg px-3 py-2 border border-slate-100">📝 {note}</p>
        )}
      </div>
    </div>
  )
}

function TimelinePage({ events, onBack, onGenerate }) {
  const [items, setItems] = useState(events)

  const handleAnnotate = (index, note) => {
    const updated = [...items]
    updated[index] = { ...updated[index], note }
    setItems(updated)
  }

  const handleRemove = (index) => setItems(items.filter((_, i) => i !== index))

  const errorCount  = items.filter(e => e.level === 'ERROR' || e.level === 'FATAL').length
  const warnCount   = items.filter(e => e.level === 'WARN').length
  const serviceList = [...new Set(items.map(e => e.service))]

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1 transition-colors">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-[#0D1B2A]">Incident Timeline</h1>
          <p className="text-sm text-slate-400 mt-0.5">Review, annotate, or remove events before generating</p>
        </div>
        <button onClick={() => onGenerate(items)}
          className="flex-shrink-0 px-5 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold rounded-xl text-sm transition-colors shadow-sm">
          Generate Postmortem →
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total events', value: items.length, color: 'text-slate-700' },
            { label: 'Errors / Fatal', value: errorCount, color: 'text-red-600' },
            { label: 'Warnings', value: warnCount, color: 'text-amber-600' },
            { label: 'Services', value: serviceList.length, color: 'text-blue-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Services */}
        <div className="flex flex-wrap gap-2 mb-6">
          {serviceList.map(s => (
            <span key={s} className="text-xs bg-[#0D1B2A] text-slate-300 px-3 py-1 rounded-full font-medium">{s}</span>
          ))}
        </div>

        {/* Timeline */}
        <div>
          {items.map((event, i) => (
            <TimelineEvent key={i} event={event} index={i} onAnnotate={handleAnnotate} onRemove={handleRemove} />
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={() => onGenerate(items)}
            className="px-6 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold rounded-xl text-sm transition-colors shadow-sm">
            Generate Postmortem →
          </button>
        </div>
      </div>
    </div>
  )
}

export default TimelinePage