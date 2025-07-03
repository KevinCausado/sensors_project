import { ref, computed, watch } from 'vue';
import { useCustomVibrationProfileStore } from '~/stores/customVibrationProfiles';

/**
 * Composable avanzado para la configuración técnica de activos.
 * 1. Oculta/muestra la lógica ISO según el modo seleccionado.
 * 2. Proporciona sugerencias inteligentes y cruzadas para Potencia y Altura de Eje.
 * 3. Guía la selección de componentes basándose en la rigidez del perfil o la clasificación ISO.
 * @param {import('vue').Ref<Object>} form - El objeto de formulario reactivo.
 * @param {Object} assetStore - La instancia del store de activos de Pinia.
 */
export function useAssetIsoLogic(form, assetStore) {
  const customProfileStore = useCustomVibrationProfileStore();

  const classificationHint = ref('Seleccione un modo o ingrese Potencia y Altura.');
  const machineClass = ref(null);
  const foundationSuggestion = ref('');
  const couplingSuggestion = ref('');
  const powerSuggestion = ref('');
  const heightSuggestion = ref('');

  const availableAssetTypes = ref([]);
  const availableFoundationTypes = ref([]);
  const availableCouplingTypes = ref([]);

  const isIsoModeActive = computed(() => !form.value.custom_vibration_profile_id);

  const refs = {
    assetTypes: { motor: null, pumps: [], others: [] },
    isoGroups: {},
    rigidityTypes: {
      rigida: '90502525-3fe0-4a09-b0a3-6b16805f2d7a',
      flexible: 'e953d391-2f92-479a-9ac6-f0d4c0162118',
      otro: '8db9e040-a4b9-4d0d-b5f5-215a0aac2d70'
    },
    keywords: {
      flexible: ['flexible', 'amortiguadores', 'aislamiento', 'flotante', 'resortes', 'cadena', 'hidráulico', 'magnético', 'rejilla', 'neumático'],
      bomba: ['bomba']
    }
  };

  const initializeReferences = () => {
    refs.assetTypes.motor = assetStore.assetTypes.find(t => t.name.toLowerCase().includes('motor'))?.id;
    const pumpKeywords = refs.keywords.bomba;
    const smallMachineKeywords = ['bomba', 'ventilador', 'compresor'];
    
    refs.assetTypes.pumps = assetStore.assetTypes.filter(t => pumpKeywords.some(kw => t.name.toLowerCase().includes(kw))).map(t => t.id);
    refs.assetTypes.others = assetStore.assetTypes.filter(t => smallMachineKeywords.some(kw => t.name.toLowerCase().includes(kw)) && !pumpKeywords.some(kw => t.name.toLowerCase().includes(kw))).map(t => t.id);

    refs.isoGroups.g1 = assetStore.isoGroups.find(g => g.name.includes('Grupo 1'))?.id;
    refs.isoGroups.g2 = assetStore.isoGroups.find(g => g.name.includes('Grupo 2'))?.id;
    refs.isoGroups.g3 = assetStore.isoGroups.find(g => g.name.includes('Grupo 3'))?.id;
    refs.isoGroups.g4 = assetStore.isoGroups.find(g => g.name.includes('Grupo 4'))?.id;
  };

  /**
   * Determina la clase de la máquina y actualiza las sugerencias de Potencia/Altura.
   */
  const determineMachineClassAndSuggestions = () => {
    const power = parseFloat(form.value.power_kw);
    const height = parseFloat(form.value.shaft_height_mm);
    
    powerSuggestion.value = '';
    heightSuggestion.value = '';

    if (isNaN(power) && isNaN(height)) {
      machineClass.value = null;
      return;
    }
    
    if (!isNaN(power)) {
        if (power > 15) heightSuggestion.value = 'Sugerencia ISO: Altura > 160 mm.';
        else heightSuggestion.value = 'Sugerencia ISO: Altura <= 160 mm.';
    }
    if (!isNaN(height)) {
        if (height > 315) powerSuggestion.value = 'Sugerencia ISO: Potencia > 15 kW.';
        else if (height > 160) powerSuggestion.value = 'Sugerencia ISO: Potencia > 15 kW.';
        else powerSuggestion.value = 'Sugerencia ISO: Potencia <= 15 kW.';
    }

    if (isNaN(power) || isNaN(height)) {
        machineClass.value = null;
        return;
    }
    
    if (power > 15 || height > 160) {
      machineClass.value = height > 315 ? 'MOTOR_GRANDE' : 'MOTOR_MEDIANO';
    } else {
      machineClass.value = 'MAQUINA_PEQUENA';
    }
  };

  const filterAssetTypes = () => {
    if (!machineClass.value) {
        availableAssetTypes.value = assetStore.assetTypes;
        return;
    }
    if (machineClass.value.includes('MOTOR')) {
      availableAssetTypes.value = assetStore.assetTypes.filter(t => t.id === refs.assetTypes.motor);
      form.value.asset_type_id = refs.assetTypes.motor;
    } else { 
      availableAssetTypes.value = assetStore.assetTypes.filter(t => [...refs.assetTypes.pumps, ...refs.assetTypes.others].includes(t.id));
    }
  };
  
  const filterFoundationAndCoupling = () => {
    let rigidityName = null;

    if (isIsoModeActive.value) {
        if (machineClass.value === 'MOTOR_GRANDE') rigidityName = 'rígida';
        if (machineClass.value === 'MOTOR_MEDIANO') rigidityName = 'flexible';
        if (machineClass.value === 'MAQUINA_PEQUENA') {
            if (refs.assetTypes.pumps.includes(form.value.asset_type_id)) rigidityName = 'rígida';
            else if (refs.assetTypes.others.includes(form.value.asset_type_id)) rigidityName = 'otro';
        }
    } else {
        const profile = customProfileStore.profiles.find(p => p.id === form.value.custom_vibration_profile_id);
        if (profile) rigidityName = profile.rigidity_name.toLowerCase();
    }
    
    foundationSuggestion.value = '';
    couplingSuggestion.value = '';

    if (rigidityName) {
        if (rigidityName.includes('rígida') || rigidityName.includes('otro')) {
            availableFoundationTypes.value = assetStore.foundationTypes.filter(f => !refs.keywords.flexible.some(kw => f.name.toLowerCase().includes(kw)));
            availableCouplingTypes.value = assetStore.couplingTypes.filter(c => !refs.keywords.flexible.some(kw => c.name.toLowerCase().includes(kw)));
            if(!isIsoModeActive.value) foundationSuggestion.value = 'Sugerencia: Elija una cimentación rígida.';
        } else { // Flexible
            availableFoundationTypes.value = assetStore.foundationTypes.filter(f => refs.keywords.flexible.some(kw => f.name.toLowerCase().includes(kw)));
            availableCouplingTypes.value = assetStore.couplingTypes.filter(c => refs.keywords.flexible.some(kw => c.name.toLowerCase().includes(kw)));
            if(!isIsoModeActive.value) foundationSuggestion.value = 'Sugerencia: Elija una cimentación flexible.';
        }
    } else {
        availableFoundationTypes.value = assetStore.foundationTypes;
        availableCouplingTypes.value = assetStore.couplingTypes;
    }
  };

  const updateFinalClassification = () => {
      if (!isIsoModeActive.value) {
          form.value.iso_group_id = null;
          form.value.rigidity_type_id = null;
          classificationHint.value = `Modo Guiado por perfil personalizado.`;
          return;
      }
      
      const allParamsSet = form.value.power_kw && form.value.shaft_height_mm && form.value.asset_type_id && form.value.foundation_type_id && form.value.coupling_type_id;
      if(!allParamsSet) {
          classificationHint.value = 'Complete los campos para la clasificación ISO.';
          form.value.iso_group_id = null;
          form.value.rigidity_type_id = null;
          return;
      }

      let determinedGroupId = null, determinedRigidityId = null, hint = '';
      const assetTypeId = form.value.asset_type_id;

      if (machineClass.value === 'MOTOR_GRANDE') {
          determinedGroupId = refs.isoGroups.g1; determinedRigidityId = refs.rigidityTypes.rigida; hint = 'Máquina Grande (H > 315mm) -> Grupo 1 (Rígida)';
      } else if (machineClass.value === 'MOTOR_MEDIANO') {
          determinedGroupId = refs.isoGroups.g2; determinedRigidityId = refs.rigidityTypes.flexible; hint = 'Máquina Mediana (161-315mm) -> Grupo 2 (Flexible)';
      } else if (machineClass.value === 'MAQUINA_PEQUENA') {
          if (refs.assetTypes.pumps.includes(assetTypeId)) {
              determinedGroupId = refs.isoGroups.g4; determinedRigidityId = refs.rigidityTypes.rigida; hint = 'Bomba (H <= 160mm) -> Grupo 4 (Rígida)';
          } else {
              determinedGroupId = refs.isoGroups.g3; determinedRigidityId = refs.rigidityTypes.otro; hint = 'Máquina Pequeña (H <= 160mm) -> Grupo 3 (Otro)';
          }
      }
      form.value.iso_group_id = determinedGroupId;
      form.value.rigidity_type_id = determinedRigidityId;
      classificationHint.value = hint;
  };
  
  const suggestedIsoGroupName = computed(() => {
    if (!isIsoModeActive.value) return 'N/A (Personalizado)';
    if (!form.value.iso_group_id) return 'Esperando parámetros...';
    return assetStore.isoGroups.find(g => g.id === form.value.iso_group_id)?.name || 'Grupo no encontrado';
  });

  const isAssetTypeLocked = computed(() => {
    return machineClass.value && machineClass.value.includes('MOTOR');
  });

  watch(() => [form.value.power_kw, form.value.shaft_height_mm], () => {
      determineMachineClassAndSuggestions();
      filterAssetTypes();
  }, { deep: true, immediate: true });

  watch(() => form.value.custom_vibration_profile_id, () => {
      form.value.foundation_type_id = null;
      form.value.coupling_type_id = null;
      filterFoundationAndCoupling();
  }, { deep: true });

  watch(() => form.value.asset_type_id, () => {
      form.value.foundation_type_id = null;
      form.value.coupling_type_id = null;
      filterFoundationAndCoupling();
  }, { deep: true });
  
  watch(() => [form.value.foundation_type_id, form.value.coupling_type_id], () => {
      if (isIsoModeActive.value) updateFinalClassification();
  }, { deep: true });
  
  watch(() => (assetStore.assetTypes.length > 0 && assetStore.isoGroups.length > 0), (isReady) => { 
      if (isReady) initializeReferences(); 
  }, { immediate: true });

  return {
    suggestedIsoGroupName, classificationHint, availableAssetTypes,
    availableFoundationTypes, availableCouplingTypes,
    isAssetTypeLocked,
    foundationSuggestion, couplingSuggestion, powerSuggestion, heightSuggestion,
    isIsoModeActive
  };
}
