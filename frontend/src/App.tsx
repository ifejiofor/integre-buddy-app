import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { configureApi } from './services/api'

function App() {
  const location = useLocation()

  useEffect(() => {
    // Configure API based on current location
    configureApi()
    
    // Scroll to top on route change
    window.scrollTo(0, 0)
  }, [location])

  return (
    <div className="min-h-screen gradient-bg">
      <Outlet />
    </div>
  )
}

export default App
