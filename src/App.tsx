import MaineGuide from './Jernie-PWA'
import { SheetProvider } from './contexts/SheetContext'

function App() {
  return (
    <SheetProvider>
      <MaineGuide />
    </SheetProvider>
  )
}

export default App
