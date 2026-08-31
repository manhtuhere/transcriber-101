// Generated from the live Supabase schema. Regenerate after every migration —
// `supabase gen types typescript --project-id satvpduraxbmxapbjhrw` — rather
// than editing by hand.
//
// Note: status columns come through as plain `string` because the schema
// enforces them with check constraints. The narrowed unions live in ./book.ts,
// which is what application code should use.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          favorited_at: string | null
          id: string
          owner_id: string
          source_hash: string | null
          status: string
          title: string
          total_duration_sec: number | null
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          favorited_at?: string | null
          id?: string
          owner_id?: string
          source_hash?: string | null
          status?: string
          title: string
          total_duration_sec?: number | null
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          favorited_at?: string | null
          id?: string
          owner_id?: string
          source_hash?: string | null
          status?: string
          title?: string
          total_duration_sec?: number | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          audio_path: string | null
          book_id: string
          bytes: number | null
          char_count: number
          claimed_at: string | null
          created_at: string
          duration_sec: number | null
          error: string | null
          id: string
          idx: number
          owner_id: string
          start_offset_sec: number | null
          status: string
          text_content: string
          title: string
          tts_voice: string
        }
        Insert: {
          audio_path?: string | null
          book_id: string
          bytes?: number | null
          char_count: number
          claimed_at?: string | null
          created_at?: string
          duration_sec?: number | null
          error?: string | null
          id?: string
          idx: number
          owner_id?: string
          start_offset_sec?: number | null
          status?: string
          text_content: string
          title: string
          tts_voice?: string
        }
        Update: {
          audio_path?: string | null
          book_id?: string
          bytes?: number | null
          char_count?: number
          claimed_at?: string | null
          created_at?: string
          duration_sec?: number | null
          error?: string | null
          id?: string
          idx?: number
          owner_id?: string
          start_offset_sec?: number | null
          status?: string
          text_content?: string
          title?: string
          tts_voice?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chapters_book_id_fkey'
            columns: ['book_id']
            isOneToOne: false
            referencedRelation: 'books'
            referencedColumns: ['id']
          },
        ]
      }
      chunks: {
        Row: {
          audio_path: string | null
          chapter_id: string
          created_at: string
          id: string
          idx: number
          owner_id: string
          status: string
          text: string
          text_hash: string
          tts_voice: string
        }
        Insert: {
          audio_path?: string | null
          chapter_id: string
          created_at?: string
          id?: string
          idx: number
          owner_id?: string
          status?: string
          text: string
          text_hash: string
          tts_voice: string
        }
        Update: {
          audio_path?: string | null
          chapter_id?: string
          created_at?: string
          id?: string
          idx?: number
          owner_id?: string
          status?: string
          text?: string
          text_hash?: string
          tts_voice?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chunks_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      claim_next_chapter: {
        Args: never
        Returns: {
          audio_path: string | null
          book_id: string
          bytes: number | null
          char_count: number
          claimed_at: string | null
          created_at: string
          duration_sec: number | null
          error: string | null
          id: string
          idx: number
          owner_id: string
          start_offset_sec: number | null
          status: string
          text_content: string
          title: string
          tts_voice: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'chapters'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      release_stale_claims: { Args: { max_age?: string }; Returns: number }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

type DefaultSchema = Database['public']

export type Tables<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Update']
