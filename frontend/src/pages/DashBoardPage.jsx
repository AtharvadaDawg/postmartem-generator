import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6']

function StatCard({ label, value, sub, color = 'text-[#0D1B2A]' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function DashboardPage({ onNavigate }) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/incidents')
      .then(r => r.json())
      .then(data => { setIncidents(data.incidents || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0D9488] rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-500 text-sm">Loading incidents...</p>
      </div>
    </div>
  )

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalIncidents  = incidents.length
  const totalErrors     = incidents.reduce((s, i) => s + i.error_count, 0)
  const totalEvents     = incidents.reduce((s, i) => s + i.event_count, 0)

  // Most affected service
  const serviceCounts = {}
  incidents.forEach(i => i.services.forEach(s => { serviceCounts[s] = (serviceCounts[s] || 0) + 1 }))
  const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Severity breakdown for pie chart
  const severityData = [
    { name: 'Errors/Fatal', value: incidents.reduce((s, i) => s + i.error_count, 0) },
    { name: 'Warnings', value: incidents.reduce((s, i) => s + i.warn_count, 0) },
    { name: 'Info', value: incidents.reduce((s, i) => s + Math.max(0, i.event_count - i.error_count - i.warn_count), 0) },
  ].filter(d => d.value > 0)

  // Service frequency for bar chart
  const serviceBarData = Object.entries(serviceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Errors per incident for bar chart
  const errorsPerIncident = incidents.slice(-8).map((inc, i) => ({
    name: `#${inc.id}`,
    errors: inc.error_count,
    warnings: inc.warn_count,
  }))

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0D1B2A]">Incident Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Overview of all generated postmortems</p>
        </div>
        <button
          onClick={() => onNavigate('upload')}
          className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          + New Incident
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {totalIncidents === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-3xl">📋</div>
            <p className="text-slate-600 font-medium mb-1">No incidents yet</p>
            <p className="text-slate-400 text-sm mb-4">Generate your first postmortem to see it here</p>
            <button onClick={() => onNavigate('upload')}
              className="px-4 py-2 bg-[#0D9488] text-white text-sm font-semibold rounded-xl hover:bg-[#0F766E] transition-colors">
              Upload Logs →
            </button>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Incidents" value={totalIncidents} />
              <StatCard label="Total Errors" value={totalErrors} color="text-red-600" sub="across all incidents" />
              <StatCard label="Total Events" value={totalEvents} sub="log lines processed" />
              <StatCard label="Most Affected" value={topService} color="text-[#0D9488]" sub="service" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Errors per incident */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-[#0D1B2A] mb-1">Errors & Warnings per Incident</p>
                <p className="text-xs text-slate-400 mb-4">Last {errorsPerIncident.length} incidents</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={errorsPerIncident} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="errors" fill="#EF4444" radius={[4, 4, 0, 0]} name="Errors/Fatal" />
                    <Bar dataKey="warnings" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Warnings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Severity breakdown pie */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-[#0D1B2A] mb-1">Severity Breakdown</p>
                <p className="text-xs text-slate-400 mb-4">All events across all incidents</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {severityData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Service frequency bar */}
            {serviceBarData.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-8">
                <p className="text-sm font-semibold text-[#0D1B2A] mb-1">Services by Incident Frequency</p>
                <p className="text-xs text-slate-400 mb-4">How often each service appears in incidents</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={serviceBarData} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748B' }} width={120} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#0D9488" radius={[0, 4, 4, 0]} name="Incidents" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Incident history table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0D1B2A]">Incident History</p>
                <span className="text-xs text-slate-400">{totalIncidents} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Services</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Events</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Errors</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Root Cause</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...incidents].reverse().map((inc, i) => (
                      <tr key={inc.id}
                        className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                        <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">#{inc.id}</td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                          {new Date(inc.timestamp).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {inc.services.map(s => (
                              <span key={s} className="text-xs bg-[#0D1B2A] text-slate-300 px-2 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{inc.event_count}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold ${inc.error_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {inc.error_count}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs max-w-xs truncate">
                          {inc.root_cause_snippet || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setSelected(inc)}
                            className="text-xs text-[#0D9488] hover:text-[#0F766E] font-medium transition-colors whitespace-nowrap"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Incident detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#0D1B2A]">Incident #{selected.id}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(selected.timestamp).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-light transition-colors">✕</button>
            </div>
            <div className="p-6">
              <div className="flex gap-3 flex-wrap mb-4">
                {selected.services.map(s => (
                  <span key={s} className="text-xs bg-[#0D1B2A] text-slate-300 px-3 py-1 rounded-full">{s}</span>
                ))}
                <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                  {selected.error_count} errors
                </span>
              </div>
              <div className="prose prose-sm max-w-none">
                {selected.technical.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) return (
                    <h2 key={i} className="text-sm font-bold text-[#0D1B2A] mt-4 mb-1 pb-1 border-b border-slate-100">
                      {line.replace('## ', '')}
                    </h2>
                  )
                  if (line.trim() === '') return <div key={i} className="h-1.5" />
                  return <p key={i} className="text-xs text-slate-600 leading-relaxed">{line}</p>
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage