import { SheetProvider } from './contexts/SheetContext'
import { ConnectivityProvider } from './contexts/ConnectivityContext'
import { AppShell } from './components/AppShell'

function App() {
  return (
    <ConnectivityProvider>
      <SheetProvider>
        <AppShell />
      </SheetProvider>
    </ConnectivityProvider>
  )
}

export default App
