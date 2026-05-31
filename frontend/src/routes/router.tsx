import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
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
      { path: '/audio', element: <AudioList /> },
      { path: '/upload', element: <Upload /> },
      { path: '/', element: <Login /> },
    ],
  },
])

export default router
