import React, { useState } from 'react'
import UploadPage from './pages/UploadPage'
import TimelinePage from './pages/TimelinePage'
import OutputPage from './pages/OutputPage'

function App() {
  const [screen, setScreen] = useState('upload')
  const [events, setEvents] = useState(null)
  const [finalEvents, setFinalEvents] = useState(null)

  return (
    <div>
      {screen === 'upload' && (
        <UploadPage onLogsLoaded={(e) => { setEvents(e); setScreen('timeline') }} />
      )}
      {screen === 'timeline' && (
        <TimelinePage
          events={events}
          onBack={() => setScreen('upload')}
          onGenerate={(e) => { setFinalEvents(e); setScreen('output') }}
        />
      )}
      {screen === 'output' && (
        <OutputPage
          events={finalEvents}
          onBack={() => setScreen('timeline')}
        />
      )}
    </div>
  )
}

export default App