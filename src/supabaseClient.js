import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app-name' },
  },
})

// Enable console logging for debugging
const enableLogging = (supabase) => {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session)
  })

  // Log all queries (be cautious with this in production)
  supabase.rest.getSchema = (prev => (...args) => {
    const query = prev(...args)
    console.log('SQL query:', query.sql)
    return query
  })(supabase.rest.getSchema)
}

// Call this function to enable logging
enableLogging(supabase)