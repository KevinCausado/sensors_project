<template>
  <div class="text-center py-16">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-error-600">403</h1>
      <h2 class="text-2xl font-semibold mt-2">Acceso No Autorizado</h2>
      <p class="mt-4 text-gray-600">No tienes permisos para acceder a esta página.</p>
    </div>
    
    <div>
      <NuxtLink to="/" class="btn btn-primary">
        Volver al Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  // middleware: ['auth']
});
</script>