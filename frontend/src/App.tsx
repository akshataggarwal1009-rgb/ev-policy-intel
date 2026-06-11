import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Home from '@/pages/Home'
import Browse from '@/pages/Browse'
import PolicyDetail from '@/pages/PolicyDetail'
import Chat from '@/pages/Chat'
import MapView from '@/pages/Map'
import Compare from '@/pages/Compare'
import Admin from '@/pages/Admin'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/policy/:id" element={<PolicyDetail />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
