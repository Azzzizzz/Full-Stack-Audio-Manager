import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Calendar, Trash2, Music } from 'lucide-react'
import type { AudioFile } from '../types/audio'

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

export function AudioCard({
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

  useEffect(() => {
    if (!isActive && playing) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [isActive, playing])

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

        <button
          onClick={() => onDelete(file)}
          disabled={deleting}
          title="Delete"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

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
