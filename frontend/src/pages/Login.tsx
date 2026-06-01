import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import client from '../services/client'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await client.post('/login', data)
      login(res.data.data.access_token)
      navigate('/audio')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      setServerError(status === 401 ? 'Invalid email or password.' : 'Something went wrong.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F2FA] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white px-10 py-10 shadow-xl">

        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <svg className="h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <rect x="1"  y="9"  width="3" height="6" rx="1.5"/>
            <rect x="6"  y="5"  width="3" height="14" rx="1.5"/>
            <rect x="11" y="2"  width="3" height="20" rx="1.5"/>
            <rect x="16" y="5"  width="3" height="14" rx="1.5"/>
            <rect x="21" y="9"  width="3" height="6" rx="1.5"/>
          </svg>
          <span className="text-xl font-bold text-indigo-700 tracking-tight">Meeami</span>
        </div>

        <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p className="mb-7 text-center text-sm text-gray-400">Sign in to access your audio library</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                {...register('email')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                placeholder="Enter your email"
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}
