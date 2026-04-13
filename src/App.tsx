import { SheetProvider } from './contexts/SheetContext'
import { AppShell } from './components/AppShell'

function App() {
  return (
    <SheetProvider>
      <AppShell />
    </SheetProvider>
  )
}

export default App
