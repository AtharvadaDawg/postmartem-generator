import React, { useState } from 'react'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import TimelinePage from './pages/TimelinePage'
import OutputPage from './pages/OutputPage'

function App() {
  const [screen, setScreen] = useState('dashboard')
  const [events, setEvents] = useState(null)
  const [finalEvents, setFinalEvents] = useState(null)

  return (
    <Layout currentScreen={screen} onNavigate={setScreen}>
      {screen === 'dashboard' && (
        <DashboardPage onNavigate={setScreen} />
      )}
      {screen === 'upload' && (
        <UploadPage onLogsLoaded={(e) => { setEvents(e); setScreen('timeline') }} />
      )}
      {screen === 'timeline' && events && (
        <TimelinePage
          events={events}
          onBack={() => setScreen('upload')}
          onGenerate={(e) => { setFinalEvents(e); setScreen('output') }}
        />
      )}
      {screen === 'output' && finalEvents && (
        <OutputPage
          events={finalEvents}
          onBack={() => setScreen('timeline')}
        />
      )}
    </Layout>
  )
}

export default App