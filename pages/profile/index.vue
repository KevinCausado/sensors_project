<template>
  <div>
    <PageHeader title="Mi Perfil" subtitle="Gestiona tu información personal">
      <template #actions>
        <button @click="updateProfile" class="btn btn-primary flex items-center" :disabled="saving">
          <CheckIcon class="h-5 w-5 mr-2" />
          {{ saving ? "Guardando..." : "Guardar Cambios" }}
        </button>
      </template>
    </PageHeader>

    <div v-if="user" class="max-w-3xl mx-auto space-y-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Información Personal</h2>
        <div class="flex items-center mb-6">
          <div class="relative">
            <div class="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-medium text-primary-700">
              {{ userInitials }}
            </div>
          </div>
          <div class="ml-6">
            <p class="text-sm text-gray-500">Foto de perfil</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="form-label">Nombre</label>
              <input type="text" v-model="form.firstName" class="form-input" />
            </div>

            <div>
              <label class="form-label">Apellido</label>
              <input type="text" v-model="form.lastName" class="form-input" />
            </div>
          </div>

          <div>
            <label class="form-label">Correo electrónico</label>
            <input type="email" v-model="form.email" class="form-input" disabled />
            <p class="mt-1 text-sm text-gray-500">El correo electrónico no puede ser modificado</p>
          </div>

          <div>
            <label class="form-label">Rol</label>            
            <input type="text" :value="authStore.userProfile ? translateRole(authStore.userProfile.role) : ''" class="form-input" disabled />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Cambiar Contraseña</h2>
        <form @submit.prevent="changePassword" class="space-y-4">
          <div>
            <label class="form-label">Contraseña Actual</label>
            <input type="password" v-model="passwordForm.current" class="form-input" />
          </div>

          <div>
            <label class="form-label">Nueva Contraseña</label>
            <input type="password" v-model="passwordForm.new" class="form-input" />
          </div>

          <div>
            <label class="form-label">Confirmar Nueva Contraseña</label>
            <input type="password" v-model="passwordForm.confirm" class="form-input" />
          </div>

          <div v-if="passwordError" class="text-error-600 text-sm">
            {{ passwordError }}
          </div>

          <div>
            <button type="submit" class="btn btn-primary" :disabled="passwordLoading">
              {{ passwordLoading ? "Cambiando..." : "Cambiar Contraseña" }}
            </button>
          </div>
        </form>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Preferencias</h2>
        <div class="space-y-4">
          <div>
            <label class="form-label">Idioma</label>
            <select v-model="form.preferences.language" class="form-input">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label class="form-label">Zona Horaria</label>
            <select v-model="form.preferences.timezone" class="form-input">
              <option value="Europe/Madrid">Europa/Madrid</option>
              <option value="America/Mexico_City">América/Ciudad de México</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Notificaciones</label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="checkbox" v-model="form.preferences.emailNotifications" class="form-checkbox" />
                <span class="ml-2 text-sm text-gray-700">Recibir notificaciones por correo</span>
              </label>

              <label class="flex items-center">
                <input type="checkbox" v-model="form.preferences.alertNotifications" class="form-checkbox" />
                <span class="ml-2 text-sm text-gray-700">Notificaciones de alertas críticas</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useAuthStore } from "~/stores/auth";
import { defineComponent, h } from "vue";

// Icons (placeholders)
const CheckIcon = defineComponent({
  render: () => h("div", { class: "i-heroicons-check" }),
});

definePageMeta({
  // middleware: ["auth"],
});

const authStore = useAuthStore();
const user = computed(() => authStore.userProfile); // <--- ¡CAMBIO AQUÍ!

// **Estado del formulario: INICIALIZACIÓN COMPLETA DE ESTRUCTURA**
// Aseguramos que todas las propiedades anidadas existan desde el principio.
const form = ref({
  firstName: "",
  lastName: "",
  email: "",
  preferences: {
    language: "es",
    timezone: "Europe/Madrid",
    emailNotifications: true,
    alertNotifications: true,
  },
});

const passwordForm = ref({
  current: "",
  new: "",
  confirm: "",
});

const saving = ref(false);
const passwordLoading = ref(false);
const passwordError = ref("");

// Computed
const userInitials = computed(() => {
  // Manejo de casos donde user.value, firstName o lastName puedan ser null/undefined
  if (user.value && user.value.firstName && user.value.lastName) {
    const firstInitial = user.value.firstName.charAt(0) || "";
    const lastInitial = user.value.lastName.charAt(0) || "";
    return `${firstInitial}${lastInitial}`.toUpperCase(); // Convertir a mayúsculas
  }
  return ""; // Devuelve cadena vacía si no hay datos
});

// Métodos
const translateRole = (role) => {
  const roles = {
    "super-admin": "Super Administrador",
    admin: "Administrador",
    technician: "Técnico",
    viewer: "Visualizador",
  };
  return roles[role] || role;
};

const updateProfile = async () => {
  try {
    saving.value = true;
    await authStore.updateProfile({
      id: user.value.id, // Asegúrate de pasar el ID del usuario
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      // Solo actualiza las preferencias si las tienes configuradas en tu store
      preferences: form.value.preferences,
    });
    // Puedes usar un toast o notificación aquí para indicar éxito
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    // Mostrar un mensaje de error al usuario
  } finally {
    saving.value = false;
  }
};

const changePassword = async () => {
  try {
    passwordError.value = "";

    if (passwordForm.value.new !== passwordForm.value.confirm) {
      passwordError.value = "Las contraseñas no coinciden";
      return;
    }

    if (passwordForm.value.new.length < 8) {
      passwordError.value = "La contraseña debe tener al menos 8 caracteres";
      return;
    }

    passwordLoading.value = true;
    await authStore.changePassword(passwordForm.value.current, passwordForm.value.new);
    // Puedes usar un toast o notificación aquí para indicar éxito
    passwordForm.value = {
      current: "",
      new: "",
      confirm: "",
    };
  } catch (error) {
    passwordError.value = error.message;
  } finally {
    passwordLoading.value = false;
  }
};

// **CARGAR DATOS DEL USUARIO EN EL FORMULARIO CUANDO ESTÉN DISPONIBLES**
watch(
  user,
  (newUser) => {
    if (newUser) {
      // Rellena el formulario con los datos del usuario
      form.value.firstName = newUser.firstName || "";
      form.value.lastName = newUser.lastName || "";
      form.value.email = newUser.email || "";
      // ¡IMPORTANTE! Asegúrate de que las preferencias se carguen también.
      // Si 'preferences' es un objeto anidado en tu perfil de usuario,
      // asegúrate de que exista antes de intentar acceder a sus propiedades.
      form.value.preferences = {
        language: newUser.preferences?.language || "es",
        timezone: newUser.preferences?.timezone || "Europe/Madrid",
        emailNotifications: newUser.preferences?.emailNotifications ?? true, // Usar nullish coalescing para booleanos
        alertNotifications: newUser.preferences?.alertNotifications ?? true,
      };
    }
  },
  { immediate: true }
);
</script>
