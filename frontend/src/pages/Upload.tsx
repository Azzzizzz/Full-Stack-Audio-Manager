import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../services/client'

export default function Upload() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File must be under 50 MB.')
      return
    }

    const form = new FormData()
    form.append('file', file)

    setUploading(true)
    setError('')
    setProgress(0)

    try {
      await client.post('/audio/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
        },
      })
      navigate('/audio')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 400) setError('Invalid file type. Only audio files are accepted.')
      else if (status === 413) setError('File exceeds the 50 MB limit.')
      else setError('Upload failed. Please try again.')
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/audio')}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Upload Audio</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">

          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <svg className="mb-3 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {file ? (
              <p className="text-sm font-medium text-indigo-600">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Click to select an audio file</p>
                <p className="mt-1 text-xs text-gray-400">MP3, WAV, FLAC, OGG — up to 50 MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </main>
    </div>
  )
}
