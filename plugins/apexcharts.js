export default defineNuxtPlugin((nuxtApp) => {
  if (process.client) {
    import('vue3-apexcharts').then((module) => {
      nuxtApp.vueApp.component('VueApexCharts', module.default);
    });
  }
});