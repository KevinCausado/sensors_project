<template>  
  <div class="min-h-screen flex flex-wrap font-lexend text-gray-800">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <div class="hidden lg:flex w-full lg:w-1/2 bg-[#154EC1] items-center justify-center p-12 text-white relative">
      <div class="text-center">        
        <div class="flex justify-center mb-4">          
          <Logo color="white" class="h-24 w-24" />
        </div>
        <h1 class="text-4xl font-bold mb-4">VibrAI</h1>
        
        <p class="text-xl text-white font-light tracking-wide">
          Inteligencia Predictiva para sus Activos
        </p>        
      </div>
       <div class="absolute bottom-6 text-center text-blue-300 text-sm">
          <p>&copy; {{ new Date().getFullYear() }} VibrAI. Todos los derechos reservados.</p>
        </div>
    </div>

    <!-- Panel del Formulario (Derecha) -->
    <div class="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-8 md:p-12">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import Logo from '~/components/Logo.vue';
</script>

<style>
.font-lexend {
  font-family: 'Lexend', sans-serif;
}
</style>
