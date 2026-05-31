import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAudioList, deleteAudio } from '../services/audio'
import type { AudioFile, AudioListResponse } from '../types/audio'

const PAGE_SIZE = 20

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(secs: number | null): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioList() {
  const navigate = useNavigate()
  const [data, setData] = useState<AudioListResponse | null>(null)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchPage = async (nextOffset: number) => {
    setLoading(true)
    setError('')
    try {
      const result = await getAudioList(PAGE_SIZE, nextOffset)
      setData(result)
      setOffset(nextOffset)
    } catch {
      setError('Failed to load audio files.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage(0)
  }, [])

  const handleDelete = async (file: AudioFile) => {
    if (!confirm(`Delete "${file.file_name}"?`)) return
    setDeleting(file.id)
    try {
      await deleteAudio(file.id)
      await fetchPage(offset)
    } catch {
      setError('Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">My Audio Files</h1>
        <button
          onClick={() => navigate('/upload')}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Upload
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <svg className="mb-4 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-lg font-medium">No audio files yet</p>
            <p className="mt-1 text-sm">Upload your first file to get started.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {data.total} file{data.total !== 1 ? 's' : ''}
            </p>
            <ul className="space-y-4">
              {data.items.map((file) => (
                <li
                  key={file.id}
                  className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{file.file_name}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDuration(file.file_metadata?.duration ?? null)}
                        {' · '}
                        {formatSize(file.file_metadata?.size ?? null)}
                        {' · '}
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deleting === file.id}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      {deleting === file.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                  <audio
                    controls
                    src={file.file_url}
                    className="mt-3 w-full"
                    preload="none"
                  />
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => fetchPage(offset - PAGE_SIZE)}
                  disabled={offset === 0}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => fetchPage(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= data.total}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
