import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, Calendar, Trash2, Music, Upload } from 'lucide-react'
import { getAudioList, deleteAudio } from '../services/audio'
import type { AudioFile, AudioListResponse } from '../types/audio'

const PAGE_SIZE = 20

const ICON_COLORS = [
  'bg-violet-500', 'bg-orange-500', 'bg-emerald-500',
  'bg-pink-500', 'bg-sky-500', 'bg-indigo-500',
]
const ACCENT_COLORS = [
  '#7C3AED', '#EA580C', '#059669', '#DB2777', '#0284C7', '#4F46E5',
]


function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AudioCard({
  file, index, onDelete, deleting, isActive, onActivate,
}: {
  file: AudioFile; index: number; onDelete: (f: AudioFile) => void; deleting: boolean
  isActive: boolean; onActivate: () => void
}) {
  const iconColor = ICON_COLORS[index % ICON_COLORS.length]
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length]
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(file.file_metadata?.duration ?? 0)
  const [loaded, setLoaded] = useState(false)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Pause when another card becomes active
  useEffect(() => {
    if (!isActive && playing) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [isActive])

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      onActivate()
      el.play().catch(() => {})
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current
    if (!el) return
    const val = parseFloat(e.target.value)
    el.currentTime = val
    setCurrentTime(val)
  }

  return (
    <div className="group rounded-2xl bg-white border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">

      {/* Hidden audio */}
      <audio
        ref={audioRef}
        src={file.file_url}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0) }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration ?? 0
          if (d && isFinite(d)) setDuration(d)
          setLoaded(true)
        }}
      />

      {/* Header: icon + info + delete */}
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
          <Music className="h-4.5 w-4.5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 leading-tight">{file.file_name}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span>·</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Delete — visible on hover */}
        <button
          onClick={() => onDelete(file)}
          disabled={deleting}
          title="Delete"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Player row: play button + seek bar + time */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95 shadow-sm"
          style={{ backgroundColor: accent }}
        >
          {playing
            ? <Pause className="h-3.5 w-3.5" fill="white" strokeWidth={0} />
            : <Play className="h-3.5 w-3.5 ml-0.5" fill="white" strokeWidth={0} />
          }
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!loaded}
            className="w-full cursor-pointer appearance-none rounded-full h-1.5 outline-none disabled:cursor-default"
            style={{
              background: `linear-gradient(to right, ${accent} ${progress}%, #E5E7EB ${progress}%)`,
              accentColor: accent,
            }}
          />
        </div>

        <span className="flex-shrink-0 text-xs tabular-nums text-gray-400 w-16 text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

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
