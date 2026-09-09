import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: Capacitor.isNativePlatform() ? { flowType: 'pkce', detectSessionInUrl: false } : {},
})

export function isMissingDatabaseFunction(error, functionName) {
  const code = String(error?.code || '').toUpperCase()
  const message = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const expectedName = String(functionName || '').toLowerCase()

  return code === 'PGRST202'
    || code === '42883'
    || (message.includes(expectedName)
      && (message.includes('could not find')
        || message.includes('does not exist')
        || message.includes('schema cache')))
}
