import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import ProtectedRoute from './ProtectedRoute'
import Login from '../pages/Login'
import Register from '../pages/Register'
import AudioList from '../pages/AudioList'
import Upload from '../pages/Upload'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: '/audio', element: <AudioList /> },
              { path: '/upload', element: <Upload /> },
            ],
          },
        ],
      },
      { path: '/', element: <Navigate to="/login" replace /> },
    ],
  },
])

export default router
