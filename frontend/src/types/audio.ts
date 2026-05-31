export interface AudioFileMeta {
  duration: number | null
  size: number | null
}

export interface AudioFile {
  id: string
  file_name: string
  file_type: string
  file_url: string
  file_metadata: AudioFileMeta | null
  created_at: string
}

export interface AudioListResponse {
  items: AudioFile[]
  total: number
  limit: number
  offset: number
}
