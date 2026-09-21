export interface ApodEntry {
  date: string
  title: string
  explanation: string
  url: string
  hdurl?: string
  media_type: 'image' | 'video'
  thumbnail_url?: string
  copyright?: string
}
