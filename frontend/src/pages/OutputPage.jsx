import React, { useState, useEffect } from 'react'

function OutputPage({ events, onBack }) {
  const [view, setView]           = useState('technical')
  const [technical, setTechnical] = useState('')
  const [nonTechnical, setNonTechnical] = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch('/api/generate-postmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setTechnical(data.technical)
        setNonTechnical(data.non_technical)
        setLoading(false)
      })
      .catch(() => { setError('Failed to generate postmortem.'); setLoading(false) })
  }, [])

  const handleExport = () => {
    const content  = view === 'technical' ? technical : nonTechnical
    const filename = view === 'technical' ? 'postmortem-technical.md' : 'postmortem-nontechnical.md'
    const blob = new Blob([content], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const errorCount  = events.filter(e => e.level === 'ERROR' || e.level === 'FATAL').length
  const serviceList = [...new Set(events.map(e => e.service))]

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1 transition-colors">
            ← Back to timeline
          </button>
          <h1 className="text-xl font-bold text-[#0D1B2A]">Generated Postmortem</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {events.length} events · {errorCount} errors · {serviceList.join(', ')}
          </p>
        </div>
        {!loading && !error && (
          <button onClick={handleExport}
            className="flex-shrink-0 px-5 py-2.5 bg-[#0D1B2A] hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2">
            ↓ Export .md
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl">

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0D9488] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-700 font-medium">Generating postmortem...</p>
              <p className="text-slate-400 text-sm mt-1">This takes about 10 seconds</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <button onClick={onBack} className="mt-4 text-sm text-slate-500 hover:text-slate-700">← Go back</button>
            </div>
          )}

          {/* Output */}
          {!loading && !error && (
            <>
              {/* Toggle */}
              <div className="flex bg-white border border-slate-100 rounded-xl p-1 shadow-sm mb-4 w-fit">
                {[
                  { value: 'technical', label: '⚙️ Technical' },
                  { value: 'non_technical', label: '👥 Non-Technical' },
                ].map(tab => (
                  <button key={tab.value} onClick={() => setView(tab.value)}
                    className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      view === tab.value ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Audience label */}
              <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium w-fit ${
                view === 'technical'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-teal-50 text-teal-700 border border-teal-100'
              }`}>
                {view === 'technical'
                  ? 'For engineers — root cause, stack details, action items'
                  : 'For stakeholders — plain English, business impact focus'}
              </div>

              {/* Content card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                <div className="prose prose-sm max-w-none">
                  {(view === 'technical' ? technical : nonTechnical)
                    .split('\n')
                    .map((line, i) => {
                      if (line.startsWith('## ')) return (
                        <h2 key={i} className="text-base font-bold text-[#0D1B2A] mt-6 mb-2 first:mt-0 pb-1 border-b border-slate-100">
                          {line.replace('## ', '')}
                        </h2>
                      )
                      if (line.startsWith('# ')) return (
                        <h1 key={i} className="text-lg font-bold text-[#0D1B2A] mt-4 mb-2">{line.replace('# ', '')}</h1>
                      )
                      if (line.startsWith('- ')) return (
                        <p key={i} className="text-sm text-slate-600 leading-relaxed pl-4 before:content-['•'] before:mr-2 before:text-[#0D9488]">
                          {line.replace('- ', '')}
                        </p>
                      )
                      if (line.trim() === '') return <div key={i} className="h-2" />
                      return <p key={i} className="text-sm text-slate-600 leading-relaxed">{line}</p>
                    })}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Generated from {events.length} log events across {serviceList.length} service{serviceList.length > 1 ? 's' : ''}
                </p>
                <button onClick={handleExport} className="text-xs text-[#0D9488] hover:text-[#0F766E] font-medium transition-colors">
                  Export {view === 'technical' ? 'technical' : 'non-technical'} version →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default OutputPage