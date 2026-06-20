import React, { useState, useEffect } from 'react'

function OutputPage({ events, onBack }) {
  const [view, setView]                 = useState('technical')
  const [technical, setTechnical]       = useState('')
  const [nonTechnical, setNonTechnical] = useState('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  useEffect(() => {
    fetch('/api/generate-postmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    })
      .then(r => r.json())
      .then(data => {
        setTechnical(data.technical)
        setNonTechnical(data.non_technical)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to generate postmortem. Check your API key.')
        setLoading(false)
      })
  }, [])

  const handleExport = () => {
    const content = view === 'technical' ? technical : nonTechnical
    const blob = new Blob([content], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `postmortem-${view}.md`
    a.click()
  }

  const tabStyle = (t) => ({
    padding: '0.5rem 1.25rem',
    cursor: 'pointer',
    border: 'none',
    borderBottom: view === t ? '2px solid #0D9488' : '2px solid transparent',
    background: 'none',
    fontWeight: view === t ? '600' : '400',
    color: view === t ? '#0D9488' : '#64748B',
    fontSize: '14px'
  })

  return (
    <div style={{ maxWidth: '760px', margin: '2rem auto', padding: '0 1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button onClick={onBack} style={{
            fontSize: '13px', color: '#64748B', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.5rem'
          }}>← Back to Timeline</button>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0D1B2A', margin: 0 }}>
            Generated Postmortem
          </h1>
        </div>
        {!loading && !error && (
          <button onClick={handleExport} style={{
            padding: '0.6rem 1.2rem', background: '#0D1B2A', color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px'
          }}>
            Export .md ↓
          </button>
        )}
      </div>

      {!loading && !error && (
        <div style={{ borderBottom: '1px solid #E2E8F0', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button style={tabStyle('technical')} onClick={() => setView('technical')}>Technical</button>
          <button style={tabStyle('non_technical')} onClick={() => setView('non_technical')}>Non-Technical</button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748B' }}>
          <p style={{ fontSize: '16px' }}>Generating postmortem...</p>
          <p style={{ fontSize: '13px' }}>This takes about 10 seconds</p>
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem', background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: '8px', color: '#DC2626', fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{
          background: '#F8FAFC', border: '1px solid #E2E8F0',
          borderRadius: '8px', padding: '1.5rem',
          whiteSpace: 'pre-wrap', fontSize: '14px',
          lineHeight: '1.8', color: '#1E293B', minHeight: '400px'
        }}>
          {view === 'technical' ? technical : nonTechnical}
        </div>
      )}
    </div>
  )
}

export default OutputPage