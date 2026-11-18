import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

function App() {
  const location = useLocation()

  useEffect(() => {
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
