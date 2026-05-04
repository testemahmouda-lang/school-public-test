import { DEFAULT_SCHOOL_PROFILE, DEFAULT_SECTIONS, RESULTS_CONFIG_DEFAULTS } from '../config.js';
import { fetchActiveUrgentItems, fetchSettingValue } from '../supabase-client.js';

export function normalizeSchoolProfile(value = {}) {
  return {
    ...DEFAULT_SCHOOL_PROFILE,
    ...(value && typeof value === 'object' ? value : {}),
    maintenanceMode:         !!value?.maintenanceMode,
    maintenanceAllowResults: !!value?.maintenanceAllowResults,
  };
}

export function normalizeSections(value = {}) {
  return { ...DEFAULT_SECTIONS, ...(value && typeof value === 'object' ? value : {}) };
}

export function normalizeResultsConfig(value = {}) {
  const gv = (value?.gradeVisibility && typeof value.gradeVisibility === 'object')
    ? value.gradeVisibility : {};
  return {
    ...RESULTS_CONFIG_DEFAULTS,
    ...(value && typeof value === 'object' ? value : {}),
    gradeVisibility: { ...RESULTS_CONFIG_DEFAULTS.gradeVisibility, ...gv },
    sectionVisible:  value?.sectionVisible  !== false,
    queryVisible:    value?.queryVisible    !== false,
    term1Published:  !!value?.term1Published,
    term2Published:  !!value?.term2Published,
  };
}

export async function loadPublicCore() {
  const [profileVal, sectionsVal, resultsVal, urgentRows] = await Promise.allSettled([
    fetchSettingValue('school_profile'),
    fetchSettingValue('sections_config'),
    fetchSettingValue('results_config'),
    fetchActiveUrgentItems(),
  ]);

  return {
    profile:       normalizeSchoolProfile( profileVal.status  === 'fulfilled' ? profileVal.value  : {}),
    sections:      normalizeSections(      sectionsVal.status === 'fulfilled' ? sectionsVal.value : {}),
    resultsConfig: normalizeResultsConfig( resultsVal.status  === 'fulfilled' ? resultsVal.value  : {}),
    urgents:       urgentRows.status === 'fulfilled' ? urgentRows.value : [],
  };
}
