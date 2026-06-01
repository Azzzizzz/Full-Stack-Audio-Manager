import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudUpload, Music, FileText, Headphones, Clock, ShieldCheck } from 'lucide-react'
import client from '../services/client'

const FORMATS = [
  { ext: 'MP3', label: 'MPEG Audio Layer III', color: 'bg-violet-500' },
  { ext: 'WAV', label: 'Waveform Audio File', color: 'bg-sky-500' },
  { ext: 'M4A', label: 'MPEG-4 Audio', color: 'bg-emerald-500' },
  { ext: 'AAC', label: 'Advanced Audio Coding', color: 'bg-orange-500' },
  { ext: 'FLAC', label: 'Free Lossless Audio Codec', color: 'bg-pink-500' },
]

const TIPS = [
  { Icon: FileText,    title: 'Use descriptive file names', desc: 'Helps you organise and find files easily' },
  { Icon: Headphones,  title: 'Check audio quality',        desc: 'Ensure clear audio before uploading' },
  { Icon: Clock,       title: 'Large files may take time',  desc: "Please don't close the browser during upload" },
  { Icon: ShieldCheck, title: 'Secure & private',           desc: 'Your files are encrypted and stored securely' },
]

export default function Upload() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const pickFile = (f: File | null) => {
    if (!f) return
    setError('')
    if (!f.type.startsWith('audio/')) { setError('Please select an audio file.'); return }
    if (f.size > 50 * 1024 * 1024) { setError('File must be under 50 MB.'); return }
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files?.[0] ?? null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
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
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Audio</h1>
        <p className="mt-1 text-sm text-gray-400">Upload your audio files to secure cloud storage</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">

        {/* Left: drop zone + progress */}
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 text-center cursor-pointer transition ${
                dragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : file
                  ? 'border-indigo-300 bg-indigo-50/50'
                  : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
              }`}
            >
              {/* Cloud icon */}
              <div className="mb-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
                  <CloudUpload className="h-10 w-10 text-indigo-600" strokeWidth={1.5} />
                </div>
              </div>

              {file ? (
                <>
                  <p className="text-base font-semibold text-indigo-700">{file.name}</p>
                  <p className="mt-1 text-sm text-gray-400">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-800">Drag & drop your audio file here</p>
                  <p className="mt-1 text-sm text-gray-400">or</p>
                </>
              )}

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                <Music className="h-4 w-4" />
                Choose File
              </button>

              <p className="mt-3 text-xs text-gray-400">MP3, WAV, M4A, AAC, FLAC — max 50 MB</p>

              <input ref={inputRef} type="file" accept="audio/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </div>

            {/* Progress */}
            {uploading && (
              <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                    <Music className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{file?.name}</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-indigo-600 transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{progress}%</span>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            {file && !uploading && (
              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition active:scale-[0.98]"
              >
                Upload File
              </button>
            )}
          </form>
        </div>

        {/* Right: formats + tips */}
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">

          {/* Supported formats */}
          <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Supported Formats</h3>
            <ul className="space-y-3">
              {FORMATS.map((f) => (
                <li key={f.ext} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${f.color} text-xs font-bold text-white`}>
                    {f.ext[0]}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{f.ext}</p>
                    <p className="text-xs text-gray-400">{f.label}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-400">⚠ Max file size: 50 MB</p>
          </div>

          {/* Upload tips */}
          <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Upload Tips</h3>
            <ul className="space-y-3">
              {TIPS.map((t) => (
                <li key={t.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-indigo-50">
                    <t.Icon className="h-3.5 w-3.5 text-indigo-500" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
      </div>
    </div>
  )
}
