import React, { useState } from 'react'

function UploadPage({ onLogsLoaded }) {
  const [activeTab, setActiveTab] = useState('paste')
  const [pasteValue, setPasteValue] = useState('')
  const [scenario, setScenario] = useState('payment_outage')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tabStyle = (tab) => ({
    padding: '0.5rem 1.25rem',
    cursor: 'pointer',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #0D9488' : '2px solid transparent',
    background: 'none',
    fontWeight: activeTab === tab ? '600' : '400',
    color: activeTab === tab ? '#0D9488' : '#64748B',
    fontSize: '14px'
  })

  const handlePasteSubmit = async () => {
    if (!pasteValue.trim()) return setError('Paste some log data first')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/parse-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_logs: pasteValue })
      })
      const data = await res.json()
      onLogsLoaded(data.events)
    } catch (e) {
      setError('Failed to parse logs. Is the backend running?')
    }
    setLoading(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError('')
    const text = await file.text()
    try {
      const res = await fetch('/api/parse-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_logs: text })
      })
      const data = await res.json()
      onLogsLoaded(data.events)
    } catch (e) {
      setError('Failed to parse file.')
    }
    setLoading(false)
  }

  const handleSample = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/sample-incident?scenario=${scenario}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        onLogsLoaded(data.events)
      }
    } catch (e) {
      setError('Failed to load sample.')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0D1B2A', marginBottom: '0.25rem' }}>
        Postmortem Generator
      </h1>
      <p style={{ color: '#64748B', marginBottom: '2rem' }}>
        Upload your incident logs and generate a postmortem in seconds.
      </p>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #E2E8F0', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <button style={tabStyle('paste')} onClick={() => setActiveTab('paste')}>Paste JSON</button>
        <button style={tabStyle('file')} onClick={() => setActiveTab('file')}>Upload File</button>
        <button style={tabStyle('sample')} onClick={() => setActiveTab('sample')}>Load Sample</button>
      </div>

      {/* Paste tab */}
      {activeTab === 'paste' && (
        <div>
          <textarea
            value={pasteValue}
            onChange={e => setPasteValue(e.target.value)}
            placeholder='Paste CloudWatch JSON logs here...'
            style={{
              width: '100%', height: '220px', padding: '0.75rem',
              border: '1px solid #E2E8F0', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '13px',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box'
            }}
          />
          <button
            onClick={handlePasteSubmit}
            disabled={loading}
            style={{
              marginTop: '1rem', padding: '0.6rem 1.5rem',
              background: '#0D9488', color: 'white', border: 'none',
              borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
            }}
          >
            {loading ? 'Parsing...' : 'Parse Logs →'}
          </button>
        </div>
      )}

      {/* File upload tab */}
      {activeTab === 'file' && (
        <div style={{
          border: '2px dashed #CBD5E1', borderRadius: '8px',
          padding: '3rem', textAlign: 'center'
        }}>
          <p style={{ color: '#64748B', marginBottom: '1rem' }}>
            Drop a CloudWatch JSON export here or click to browse
          </p>
          <input
            type='file'
            accept='.json,.txt,.log'
            onChange={handleFileUpload}
            style={{ cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Sample tab */}
      {activeTab === 'sample' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#64748B', marginBottom: '1rem' }}>
            Choose a sample incident to see the tool in action.
          </p>

          <select
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', marginBottom: '1.5rem',
              borderRadius: '6px', border: '1px solid #CBD5E1',
              fontSize: '13px', display: 'block', margin: '0 auto 1.5rem'
            }}
          >
            <option value="payment_outage">Payment Gateway Outage</option>
            <option value="db_pool_exhaustion">Database Pool Exhaustion</option>
            <option value="bad_deployment">Bad Deployment — Auth Outage</option>
          </select>

          <button
            onClick={handleSample}
            disabled={loading}
            style={{
              padding: '0.6rem 1.5rem',
              background: '#0D9488', color: 'white', border: 'none',
              borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
            }}
          >
            {loading ? 'Loading...' : 'Load Sample Incident →'}
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: '#EF4444', marginTop: '1rem', fontSize: '14px' }}>{error}</p>
      )}
    </div>
  )
}

export default UploadPage