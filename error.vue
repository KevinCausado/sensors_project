<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
    <div class="text-center p-8 bg-white shadow-lg rounded-lg">
      <h1 class="text-6xl font-bold text-red-600 mb-4">404</h1>
      <p class="text-3xl font-semibold mb-4">Página no encontrada</p>
      <p class="text-lg text-gray-600 mb-8">
        Lo sentimos, no pudimos encontrar la página que buscas.
      </p>
      <NuxtLink 
        to="/" 
        class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Volver al inicio
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
// El error.vue oficial de Nuxt no necesita un script setup si solo muestra contenido estático.
// Si necesitas acceder a las propiedades del error, el setup podría verse así:
// const error = useError();
// const handleError = () => clearError({ redirect: '/' });
</script>

<style scoped>
/* Puedes añadir estilos específicos si es necesario */
</style>