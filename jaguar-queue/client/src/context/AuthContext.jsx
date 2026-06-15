import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPerfil = async (userId) => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    setPerfil(data)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn  = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp  = (email, password, nombre, cif) =>
    supabase.auth.signUp({ email, password, options: { data: { nombre, cif, rol: 'estudiante' } } })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)