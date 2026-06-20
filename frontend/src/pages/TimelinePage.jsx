import React, { useState } from 'react'

const levelColor = {
  INFO:  { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  WARN:  { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  ERROR: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  FATAL: { bg: '#FDF2F8', color: '#9D174D', border: '#FBCFE8' },
}

function TimelineEvent({ event, index, onAnnotate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(event.note || '')
  const colors = levelColor[event.level] || levelColor.INFO
  const time = new Date(event.timestamp).toLocaleTimeString()

  return (
    <div style={{
      display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'flex-start'
    }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4px' }}>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: colors.color, flexShrink: 0
        }} />
        <div style={{ width: '2px', flex: 1, background: '#E2E8F0', marginTop: '4px' }} />
      </div>

      {/* Event card */}
      <div style={{
        flex: 1, border: `1px solid ${colors.border}`,
        borderRadius: '8px', padding: '0.75rem 1rem',
        background: colors.bg, marginBottom: '0.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{
              fontSize: '11px', fontWeight: '600', color: colors.color,
              background: 'white', padding: '1px 7px', borderRadius: '4px',
              border: `1px solid ${colors.border}`, marginRight: '8px'
            }}>{event.level}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>{time}</span>
            <span style={{
              fontSize: '11px', color: '#64748B', marginLeft: '8px',
              background: '#F1F5F9', padding: '1px 7px', borderRadius: '4px'
            }}>{event.service}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setEditing(!editing)} style={{
              fontSize: '11px', padding: '2px 8px', border: '1px solid #CBD5E1',
              borderRadius: '4px', background: 'white', cursor: 'pointer', color: '#475569'
            }}>
              {editing ? 'Done' : 'Annotate'}
            </button>
            <button onClick={() => onRemove(index)} style={{
              fontSize: '11px', padding: '2px 8px', border: '1px solid #FECACA',
              borderRadius: '4px', background: 'white', cursor: 'pointer', color: '#DC2626'
            }}>Remove</button>
          </div>
        </div>

        <p style={{ margin: '0.5rem 0 0', fontSize: '13px', color: '#1E293B' }}>
          {event.message}
        </p>

        {editing && (
          <textarea
            value={note}
            onChange={e => { setNote(e.target.value); onAnnotate(index, e.target.value) }}
            placeholder="Add a note about this event..."
            style={{
              marginTop: '0.5rem', width: '100%', padding: '0.4rem',
              fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px',
              fontFamily: 'sans-serif', resize: 'vertical', boxSizing: 'border-box'
            }}
          />
        )}
        {!editing && note && (
          <p style={{ marginTop: '0.4rem', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
            📝 {note}
          </p>
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

  const handleRemove = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const errorCount  = items.filter(e => e.level === 'ERROR' || e.level === 'FATAL').length
  const warnCount   = items.filter(e => e.level === 'WARN').length
  const serviceList = [...new Set(items.map(e => e.service))].join(', ')

  return (
    <div style={{ maxWidth: '760px', margin: '2rem auto', padding: '0 1.5rem', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button onClick={onBack} style={{
            fontSize: '13px', color: '#64748B', background: 'none',
            border: 'none', cursor: 'pointer', padding: '0', marginBottom: '0.5rem'
          }}>← Back</button>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0D1B2A', margin: 0 }}>
            Incident Timeline
          </h1>
        </div>
        <button onClick={() => onGenerate(items)} style={{
          padding: '0.6rem 1.4rem', background: '#0D9488', color: 'white',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          fontWeight: '600', fontSize: '14px'
        }}>
          Generate Postmortem →
        </button>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '1.5rem',
        padding: '0.75rem 1rem', background: '#F8FAFC',
        borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px'
      }}>
        <span><strong>{items.length}</strong> events</span>
        <span style={{ color: '#DC2626' }}><strong>{errorCount}</strong> errors</span>
        <span style={{ color: '#B45309' }}><strong>{warnCount}</strong> warnings</span>
        <span style={{ color: '#64748B' }}>Services: {serviceList}</span>
      </div>

      {/* Timeline */}
      {items.map((event, i) => (
        <TimelineEvent
          key={i}
          event={event}
          index={i}
          onAnnotate={handleAnnotate}
          onRemove={handleRemove}
        />
      ))}

      {/* Bottom generate button */}
      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
        <button onClick={() => onGenerate(items)} style={{
          padding: '0.7rem 2rem', background: '#0D9488', color: 'white',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          fontWeight: '600', fontSize: '15px'
        }}>
          Generate Postmortem →
        </button>
      </div>
    </div>
  )
}

export default TimelinePage