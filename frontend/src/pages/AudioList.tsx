import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music, Upload } from 'lucide-react'
import { getAudioList, deleteAudio } from '../services/audio'
import { AudioCard } from '../components/AudioCard'
import type { AudioFile, AudioListResponse } from '../types/audio'

const PAGE_SIZE = 20

export default function AudioList() {
  const navigate = useNavigate()
  const [data, setData] = useState<AudioListResponse | null>(null)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const fetchPage = async (nextOffset: number) => {
    setLoading(true); setError('')
    try {
      const result = await getAudioList(PAGE_SIZE, nextOffset)
      setData(result); setOffset(nextOffset)
    } catch { setError('Failed to load audio files.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPage(0) }, [])

  const handleDelete = async (file: AudioFile) => {
    if (!confirm(`Delete "${file.file_name}"?`)) return
    setDeleting(file.id)
    try { await deleteAudio(file.id); await fetchPage(offset) }
    catch { setError('Delete failed.') }
    finally { setDeleting(null) }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="flex h-full flex-col bg-white">

      {/* Top bar */}
      <div className="hidden lg:flex h-16 flex-shrink-0 items-center border-b border-gray-100 px-8">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-end">
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Upload className="h-4 w-4" />
            Upload Audio
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">My Audio Library</h1>
            <p className="mt-1 text-sm text-gray-400">Manage and play your uploaded audio files</p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="lg:hidden flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition flex-shrink-0"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload Audio</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Music className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold text-gray-600">No audio files yet</p>
            <p className="mt-1 text-sm">Upload your first file to get started.</p>
            <button
              onClick={() => navigate('/upload')}
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >Upload Audio</button>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-gray-400">{data.total} file{data.total !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((file, i) => (
                <AudioCard
                  key={file.id}
                  file={file}
                  index={i + offset}
                  onDelete={handleDelete}
                  deleting={deleting === file.id}
                  isActive={playingId === file.id}
                  onActivate={() => setPlayingId(file.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => fetchPage(offset - PAGE_SIZE)}
                  disabled={offset === 0}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >← Previous</button>
                <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => fetchPage(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= data.total}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >Next →</button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}
