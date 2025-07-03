<template>
  <div>
    <PageHeader
      title="Perfiles de Vibración"
      subtitle="Gestiona los estándares ISO y los perfiles personalizados para el monitoreo de activos."
    >
      <template #actions>
        <!-- Este botón te lleva a crear un nuevo perfil -->
       <PermissionGuard moduleId="vibration_profiles" permission="create">
            <NuxtLink to="/vibration-profiles/custom/new" class="btn btn-primary flex items-center">
              <PlusIcon class="h-5 w-5 mr-2" />
              Crear Perfil Personalizado
            </NuxtLink>
        </PermissionGuard>
      </template>
    </PageHeader>

    <div class="space-y-8">
      <!-- Este componente ahora tendrá el botón de editar para cada perfil -->
      <customProfilesSection />

      <div class="border-t border-gray-200 my-10"></div>
      
      <isoStandardsSection />
    </div>
  </div>
</template>

<script setup>
import { PlusIcon } from "@heroicons/vue/24/outline";
import PageHeader from '~/components/PageHeader.vue';
// ++ CORREGIDO: Se ajustan las rutas de importación a la carpeta de componentes ++
import customProfilesSection from '~/pages/vibration-profiles/CustomProfilesSection.vue';
import isoStandardsSection from '~/pages/vibration-profiles/IsoStandardsSection.vue';

definePageMeta({
  permission: "vibration_profiles.ver", 
});
</script>

<style scoped>
.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}
</style>
