// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },

  devServer: {
    port: 3000
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/icon'
    // Si NO quieres usar el módulo @nuxtjs/supabase, déjalo comentado.
    // Si lo comentas, debes manejar el cliente Supabase manualmente en plugins y server routes.
    // '@nuxtjs/supabase',
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Panel de Sensores',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { hid: 'description', name: 'description', content: 'Panel de administración para monitoreo de sensores' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
      ]
    }
  },

  runtimeConfig: {
    public: {
      // Usar los nombres de variables de entorno con prefijo NUXT_PUBLIC_
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_KEY,
      appDbSchema: process.env.NUXT_PUBLIC_APP_DB_SCHEMA,
    },
    // Para la clave de rol de servicio, que es solo para el servidor, puedes definirla aquí
    // o accederla directamente vía process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY
    // La definiré aquí para que Nuxt la cargue explícitamente si prefieres.
    private: { // <- Sección 'private' para variables solo de servidor
        supabaseServiceRoleKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY
    }
  },
  plugins: [
    '~/plugins/supabase.client.js'
  ],

  // Puedes eliminar la sección nitro.devProxy si ya no la necesitas
  // nitro: {
  //   devProxy: {
  //     '/api': {
  //       target: 'http://localhost:3001',
  //       changeOrigin: true
  //     }
  //   }
  // }
});