import client from './client'
import type { AudioListResponse } from '../types/audio'

export async function getAudioList(limit: number, offset: number): Promise<AudioListResponse> {
  const res = await client.get('/audio', { params: { limit, offset } })
  return res.data.data as AudioListResponse
}

export async function deleteAudio(id: string): Promise<void> {
  await client.delete(`/audio/${id}`)
}
