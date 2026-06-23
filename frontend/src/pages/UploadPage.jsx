import React, { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'

function UploadPage({ onLogsLoaded }) {
  const [pasteValue, setPasteValue] = useState('')
  const [scenario, setScenario] = useState('payment_outage')
  const [logGroup, setLogGroup] = useState('/digitide/postmortem-demo')
  const [logStream, setLogStream] = useState('payment-outage')
  const [hoursBack, setHoursBack] = useState(24)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePasteSubmit = async () => {
    if (!pasteValue.trim()) return setError('Paste some log data first')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/parse-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_logs: pasteValue })
      })
      const data = await res.json()
      onLogsLoaded(data.events)
    } catch { setError('Failed to parse logs.') }
    setLoading(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true); setError('')
    const text = await file.text()
    try {
      const res = await fetch('/api/parse-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_logs: text })
      })
      const data = await res.json()
      onLogsLoaded(data.events)
    } catch { setError('Failed to parse file.') }
    setLoading(false)
  }

  const handleSample = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/sample-incident?scenario=${scenario}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else onLogsLoaded(data.events)
    } catch { setError('Failed to load sample.') }
    setLoading(false)
  }

  const handleCloudWatchFetch = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(
  `/api/fetch-cloudwatch-logs?log_group=${encodeURIComponent(logGroup)}&log_stream=${encodeURIComponent(logStream)}&hours=${hoursBack}`
)
      const data = await res.json()
      if (data.error) setError(data.error)
      else if (data.events.length === 0) setError('No events found. Try increasing the time window.')
      else onLogsLoaded(data.events)
    } catch { setError('Failed to fetch from CloudWatch.') }
    setLoading(false)
  }

  const btnPrimary = "w-full py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 transition bg-white"
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"

  const samples = [
    { value: 'payment_outage', label: 'Payment Gateway Outage', desc: '12 events · PaymentService · 4 min outage' },
    { value: 'db_pool_exhaustion', label: 'Database Pool Exhaustion', desc: '14 events · OrderService · Black Friday spike' },
    { value: 'bad_deployment', label: 'Bad Deployment — Auth Outage', desc: '13 events · AuthService · Platform-wide logout' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-bold text-[#0D1B2A]">Upload Incident Logs</h1>
        <p className="text-sm text-slate-400 mt-0.5">Paste, upload, or fetch logs from CloudWatch to get started.</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <Tabs.Root defaultValue="paste" onValueChange={() => setError('')}>
              <Tabs.List className="flex border-b border-slate-100">
                {[
                  { value: 'paste', label: 'Paste JSON' },
                  { value: 'file', label: 'Upload File' },
                  { value: 'sample', label: 'Load Sample' },
                  { value: 'cloudwatch', label: '☁️ CloudWatch' },
                ].map(tab => (
                  <Tabs.Trigger
                    key={tab.value}
                    value={tab.value}
                    className="flex-1 py-3.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 hover:bg-slate-50 data-[state=active]:text-[#0D9488] data-[state=active]:border-b-2 data-[state=active]:border-[#0D9488] data-[state=active]:bg-teal-50/50 outline-none"
                  >
                    {tab.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <div className="p-6">
                {/* Paste JSON */}
                <Tabs.Content value="paste">
                  <p className="text-xs text-slate-400 mb-3">Paste a CloudWatch JSON log export.</p>
                  <textarea
                    value={pasteValue}
                    onChange={e => setPasteValue(e.target.value)}
                    placeholder={'{\n  "logEvents": [\n    {"timestamp": 1700000000000, "message": "..."}\n  ]\n}'}
                    className="w-full h-48 p-3 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 resize-y outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 transition"
                  />
                  <button onClick={handlePasteSubmit} disabled={loading} className={`mt-4 ${btnPrimary}`}>
                    {loading ? 'Parsing...' : 'Parse Logs →'}
                  </button>
                </Tabs.Content>

                {/* Upload File */}
                <Tabs.Content value="file">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-10 cursor-pointer hover:border-[#0D9488] hover:bg-teal-50/30 transition-colors group">
                    <div className="w-12 h-12 bg-slate-100 group-hover:bg-teal-100 rounded-2xl flex items-center justify-center mb-3 transition-colors">
                      <span className="text-2xl">📄</span>
                    </div>
                    <p className="font-semibold text-slate-700 mb-1 text-sm">Drop your log file here</p>
                    <p className="text-xs text-slate-400 mb-4">Supports .json, .log, .txt</p>
                    <span className="px-4 py-2 bg-[#0D9488] text-white text-xs font-semibold rounded-xl">Browse files</span>
                    <input type="file" accept=".json,.txt,.log" onChange={handleFileUpload} className="hidden" />
                  </label>
                </Tabs.Content>

                {/* Load Sample */}
                <Tabs.Content value="sample">
                  <p className="text-xs text-slate-400 mb-4">Choose a pre-built incident scenario.</p>
                  <div className="space-y-2.5 mb-5">
                    {samples.map(s => (
                      <label key={s.value} className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${
                        scenario === s.value ? 'border-[#0D9488] bg-teal-50' : 'border-slate-100 hover:border-slate-200'
                      }`}>
                        <input type="radio" name="scenario" value={s.value}
                          checked={scenario === s.value} onChange={e => setScenario(e.target.value)}
                          className="mt-0.5 accent-[#0D9488]" />
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{s.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleSample} disabled={loading} className={btnPrimary}>
                    {loading ? 'Loading...' : 'Load Sample Incident →'}
                  </button>
                </Tabs.Content>

                {/* CloudWatch */}
                <Tabs.Content value="cloudwatch">
                  <div className="flex items-center gap-2 mb-5 p-3 bg-teal-50 border border-teal-100 rounded-xl">
                    <span className="text-teal-600">☁️</span>
                    <p className="text-xs text-teal-700 font-medium">Fetches live logs from your AWS account via boto3.</p>
                  </div>
                  <div className="space-y-4 mb-5">
                    <div>
                      <label className={labelClass}>Log Group</label>
                      <input type="text" value={logGroup} onChange={e => setLogGroup(e.target.value)}
                        className={`${inputClass} font-mono text-xs`} />
                    </div>
                    <div>
  <label className={labelClass}>Log Stream</label>

  <select
    value={logStream}
    onChange={e => setLogStream(e.target.value)}
    className={inputClass}
  >
    <option value="payment-outage">payment-outage</option>
    <option value="db-pool-exhaustion">db-pool-exhaustion</option>
    <option value="k8s-crashloop">k8s-crashloop</option>
    <option value="bad-deployment">bad-deployment</option>
    <option value="disk-full">disk-full</option>
    <option value="high-cpu">high-cpu</option>
    <option value="security-attack">security-attack</option>
  </select>
</div>
                    <div>
                      <label className={labelClass}>Time Window</label>
                      <select value={hoursBack} onChange={e => setHoursBack(Number(e.target.value))} className={inputClass}>
                        <option value={1}>Last 1 hour</option>
                        <option value={6}>Last 6 hours</option>
                        <option value={24}>Last 24 hours</option>
                        <option value={168}>Last 7 days</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleCloudWatchFetch} disabled={loading} className={btnPrimary}>
                    {loading ? 'Fetching from AWS...' : 'Fetch from CloudWatch →'}
                  </button>
                </Tabs.Content>
              </div>
            </Tabs.Root>

            {error && (
              <div className="mx-6 mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-6 px-1">
            {[
              { label: 'Log Sources', value: '4' },
              { label: 'Sample Incidents', value: '3' },
              { label: 'Output Formats', value: '2' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-[#0D1B2A]">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPage