import 'dotenv/config'

export interface WorkerEnv {
  supabaseUrl: string
  supabaseSecretKey: string
  deepgramApiKey: string
}

/**
 * Fail at startup with one message naming everything that is missing, rather
 * than crashing mid-book on the first request.
 */
export function readWorkerEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const required = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'DEEPGRAM_API_KEY'] as const
  const missing = required.filter((name) => !source[name])

  if (missing.length > 0) {
    throw new Error(
      `The worker needs ${missing.join(', ')} in .env. ` +
        'The secret key is in the Supabase dashboard under Project Settings → API Keys; ' +
        'never give either one a VITE_ prefix, which would inline it into the client bundle.',
    )
  }

  return {
    supabaseUrl: source.SUPABASE_URL!,
    supabaseSecretKey: source.SUPABASE_SECRET_KEY!,
    deepgramApiKey: source.DEEPGRAM_API_KEY!,
  }
}
