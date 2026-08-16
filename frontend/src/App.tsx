import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RefreshProvider } from './context/RefreshContext'
import { Analytics } from './pages/Analytics'
import { Inbox } from './pages/Inbox'

export default function App() {
  return (
    <RefreshProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inbox />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RefreshProvider>
  )
}
