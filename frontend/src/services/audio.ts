import client from './client'
import type { AudioFile, AudioListResponse } from '../types/audio'

export async function getAudioList(limit: number, offset: number): Promise<AudioListResponse> {
  const res = await client.get('/audio', { params: { limit, offset } })
  return res.data.data as AudioListResponse
}

export async function uploadAudio(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<AudioFile> {
  const form = new FormData()
  form.append('file', file)
  const res = await client.post('/audio/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100))
    },
  })
  return res.data.data as AudioFile
}

export async function deleteAudio(id: string): Promise<void> {
  await client.delete(`/audio/${id}`)
}
