
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  // Evita condiciones de carrera cuando cambian la sesión/usuario
  const reqIdRef = useRef(0)

  const fetchPerfil = async (userId) => {
    const reqId = ++reqIdRef.current
    setLoading(true)

    try {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (reqId === reqIdRef.current) setPerfil(data ?? null)
    } catch {
      if (reqId === reqIdRef.current) setPerfil(null)
    } finally {
      if (reqId === reqIdRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true

    // 1) Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return

      const u = session?.user ?? null
      setUser(u)

      if (u) {
        fetchPerfil(u.id)
      } else {
        reqIdRef.current += 1 // invalida requests previos
        setPerfil(null)
        setLoading(false)
      }
    })

    // 2) Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)

      if (u) {
        fetchPerfil(u.id)
      } else {
        reqIdRef.current += 1 // invalida requests previos
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password, nombre, cif) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, cif, rol: 'estudiante' } },
    })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

