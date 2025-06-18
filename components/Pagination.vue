<template>
  <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        @click="previousPage"
        :disabled="currentPage === 1"
        class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }">
        Anterior
      </button>
      <button
        @click="nextPage"
        :disabled="currentPage >= totalPages"
        class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        :class="{ 'opacity-50 cursor-not-allowed': currentPage >= totalPages }">
        Siguiente
      </button>
    </div>
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div>
        <p class="text-sm text-gray-700">
          Mostrando de
          <span class="font-medium">{{ startItem }}</span>
          a
          <span class="font-medium">{{ endItem }}</span>
          de
          <span class="font-medium">{{ totalItems }}</span>
          resultados
        </p>
      </div>
      <div>
        <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          <button
            @click="previousPage"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20"
            :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }">
            <span class="sr-only">Previous</span>
            <!-- Chevron left icon would go here -->
            <span>&laquo;</span>
          </button>
          
          <!-- Page numbers -->
          <button
            v-for="page in displayedPageNumbers"
            :key="page"
            @click="goToPage(page)"
            :class="[
              page === currentPage ? 'z-10 bg-primary-50 border-primary-500 text-primary-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
              'relative inline-flex items-center border px-4 py-2 text-sm font-medium focus:z-20'
            ]">
            {{ page }}
          </button>
          
          <button
            @click="nextPage"
            :disabled="currentPage >= totalPages"
            class="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20"
            :class="{ 'opacity-50 cursor-not-allowed': currentPage >= totalPages }">
            <span class="sr-only">Next</span>
            <!-- Chevron right icon would go here -->
            <span>&raquo;</span>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
  totalItems: {
    type: Number,
    required: true
  },
  itemsPerPage: {
    type: Number,
    default: 10
  },
  currentPage: {
    type: Number,
    default: 1
  },
  maxDisplayedPages: {
    type: Number,
    default: 5
  }
});

// Emits
const emit = defineEmits(['page-change']);

// Computed properties
const totalPages = computed(() => {
  return Math.ceil(props.totalItems / props.itemsPerPage);
});

const startItem = computed(() => {
  if (props.totalItems === 0) return 0;
  return (props.currentPage - 1) * props.itemsPerPage + 1;
});

const endItem = computed(() => {
  const end = props.currentPage * props.itemsPerPage;
  return end > props.totalItems ? props.totalItems : end;
});

const displayedPageNumbers = computed(() => {
  if (totalPages.value <= props.maxDisplayedPages) {
    return Array.from({ length: totalPages.value }, (_, i) => i + 1);
  }
  
  // Complex logic for when there are many pages
  const halfWay = Math.floor(props.maxDisplayedPages / 2);
  
  if (props.currentPage <= halfWay) {
    // Near the start
    return Array.from({ length: props.maxDisplayedPages }, (_, i) => i + 1);
  } else if (props.currentPage > totalPages.value - halfWay) {
    // Near the end
    return Array.from(
      { length: props.maxDisplayedPages },
      (_, i) => totalPages.value - props.maxDisplayedPages + i + 1
    );
  } else {
    // In the middle
    return Array.from(
      { length: props.maxDisplayedPages },
      (_, i) => props.currentPage - halfWay + i
    );
  }
});

// Methods
const goToPage = (page) => {
  emit('page-change', page);
};

const previousPage = () => {
  if (props.currentPage > 1) {
    emit('page-change', props.currentPage - 1);
  }
};

const nextPage = () => {
  if (props.currentPage < totalPages.value) {
    emit('page-change', props.currentPage + 1);
  }
};
</script>