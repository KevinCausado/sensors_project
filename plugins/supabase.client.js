// plugins/supabase.client.js

import { createClient } from '@supabase/supabase-js';
// ¡IMPORTANTE! Ya no necesitas importar useUserStore aquí, ni useAuthStore.
// La gestión del estado de autenticación ahora está CENTRALIZADA en stores/auth.js

export default defineNuxtPlugin((nuxtApp) => { // No es necesario que sea async a menos que hagas await aquí
    const supabaseUrl = nuxtApp.$config.public.supabaseUrl;
    const supabaseAnonKey = nuxtApp.$config.public.supabaseAnonKey;
    const defaultSchema = nuxtApp.$config.public.appDbSchema;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Error: Supabase URL o Anon Key no configuradas en nuxt.config.ts o .env');
        return;
    }

    const supabase = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            db: {
                schema: defaultSchema
            },
            auth: {
                persistSession: true, // Esto debe ser TRUE
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        }
    );

    // Provee la instancia de Supabase a toda la aplicación como $supabase
    nuxtApp.provide('supabase', supabase);

    // ¡IMPORTANTE! Toda la lógica de `getSession()` y `onAuthStateChange()`
    // ha sido movida a `stores/auth.js` (`checkAuth` e `initAuthListener`).
    // Este plugin SÓLO se encarga de crear y proveer el cliente Supabase.
    // console.log('[Supabase Plugin] Cliente Supabase inicializado y provisto.');
});