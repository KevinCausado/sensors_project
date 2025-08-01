<template>
  <nav v-if="breadcrumbs.length > 0" class="flex items-center text-sm font-medium text-gray-500 mb-4" aria-label="Breadcrumb">
    <ol class="flex items-center space-x-2 flex-wrap">
      <li v-for="(crumb, index) in breadcrumbs" :key="index" class="flex items-center">
        <NuxtLink
          v-if="index < breadcrumbs.length - 1"
          :to="crumb.to"
          class="hover:text-gray-700"
        >
          {{ crumb.name }}
        </NuxtLink>
        <span
          v-else
          class="text-gray-700 font-semibold"
          aria-current="page"
        >
          {{ crumb.name }}
        </span>
        <span v-if="index < breadcrumbs.length - 1" class="mx-2 text-gray-400 select-none" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { navigationItems } from '~/utils/navigation';
import { useBreadcrumbStore } from "~/stores/breadCrumb";

const route = useRoute();
const breadcrumbStore = useBreadcrumbStore();

const segmentTranslations = new Map([
  ['create', 'Crear'],
  ['edit', 'Editar'],
  ['new', 'Nuevo']
]);

const pathNameMap = new Map();
const buildPathMap = (items) => {
  for (const item of items) {
    if (item.to) pathNameMap.set(item.to.toLowerCase(), item.name);
    if (item.children) buildPathMap(item.children);
  }
};
buildPathMap(navigationItems);
pathNameMap.set('/dashboard', 'Dashboard');

const breadcrumbs = computed(() => {
  const finalCrumbs = [];
  const pathSegments = route.path.split('/').filter(p => p);

  if (route.path === '/') return [];

  finalCrumbs.push({ name: 'Home', to: '/' });

  let constructedPath = '';
  let constructedPathLowercase = '';

  for (const segment of pathSegments) {
    constructedPath += `/${segment}`;
    constructedPathLowercase += `/${segment.toLowerCase()}`;
    let name = null;

    name = pathNameMap.get(constructedPathLowercase);

    if (!name) {
      name = breadcrumbStore.dynamicNames[constructedPath] || breadcrumbStore.dynamicNames[constructedPathLowercase];
    }

    if (!name) {
      const translated = segmentTranslations.get(segment.toLowerCase());
      if (translated) {
        name = translated;
      }
    }

    if (name) {
      finalCrumbs.push({ name, to: constructedPath });
    }
  }

  const finalRealPath = constructedPath;
  
  Object.keys(breadcrumbStore.dynamicNames).forEach(dynamicPath => {
    if (dynamicPath.startsWith(finalRealPath + '/')) {
      const dynamicName = breadcrumbStore.dynamicNames[dynamicPath];
      if (dynamicName && !finalCrumbs.some(c => c.name === dynamicName)) {
        
        finalCrumbs.push({ name: dynamicName, to: finalRealPath });
      }
    }
  });

  return finalCrumbs;
});
</script>
