/* ═══════════════════════════════════════════════════════
   ⚠️  Safe Control Zone — عدّل هذا القسم فقط
   ═══════════════════════════════════════════════════════ */
export const APP_VERSION              = '20260504-contact-deploysafe-v1';
export const SUPABASE_URL             = 'https://vcqbgmieppefryzhqfsx.supabase.co';          // ← ضع رابط مشروعك
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_eFfxwgUUbpp6avSX-URnMQ_YxGNQAzU';     // ← ضع مفتاح anon
/* ═══════════════════════════════════════════════════════
   نهاية Safe Control Zone
   ═══════════════════════════════════════════════════════ */

export const DEFAULT_SCHOOL_PROFILE = Object.freeze({
  school_name:    'مدرسة شبشير الحصة للتعليم الأساسي',
  tagline:        'مدرسة رسمية تضم المرحلة الابتدائية والإعدادية',
  phone:          '',
  email:          'shabsheer.school@gmail.com',
  address:        'شبشير الحصة — محافظة الغربية',
  principalName:  '',
  schedule_days:  'الأحد — الخميس',
  shift1_label:   'فترة دراسية واحدة',
  shift1_time:    'صباحاً',
  shift2_label:   '',
  shift2_time:    '',
  facebook_url:   'https://www.facebook.com/profile.php?id=100051318836197',
  about_title:    'بيئة تعليمية متكاملة',
  about_body:     'مدرسة شبشير الحصة للتعليم الأساسي تضم المرحلة الابتدائية والإعدادية داخل محيط مدرسي منظم ومتكامل يهتم بالتحصيل الدراسي والأنشطة المدرسية.',
  maintenanceMode:         false,
  maintenanceMessage:      '',
  maintenanceAllowResults: false,
});

export const DEFAULT_SECTIONS = Object.freeze({
  news: true, announcements: true, articles: true,
  activities: true, results: true, urgent: true,
});

export const RESULTS_CONFIG_DEFAULTS = Object.freeze({
  sectionVisible:  true,
  queryVisible:    false,
  term1Published:  false,
  term2Published:  false,
  currentTerm:     '1',
  currentYear:     '2025 / 2026',
  /* الصفوف 1-6 ابتدائي + 7-9 إعدادي */
  gradeVisibility: {
    '1':true,'2':true,'3':true,'4':true,'5':true,'6':true,
    '7':true,'8':true,'9':true,
  },
});

export const SECTION_META = Object.freeze({
  news:          { title:'الأخبار',    heroTitle:'أخبار المدرسة',     icon:'📰', emptyTitle:'لا توجد أخبار منشورة',    emptyText:'سيظهر هنا آخر الأخبار فور نشرها.' },
  articles:      { title:'المقالات',   heroTitle:'المقالات التعليمية', icon:'📝', emptyTitle:'لا توجد مقالات منشورة',   emptyText:'سيظهر هنا المحتوى التعليمي.' },
  activities:    { title:'الأنشطة',    heroTitle:'الأنشطة المدرسية',   icon:'🎭', emptyTitle:'لا توجد أنشطة منشورة',   emptyText:'سيظهر هنا الأنشطة المدرسية.' },
  announcements: { title:'الإعلانات',  heroTitle:'الإعلانات الرسمية',  icon:'📢', emptyTitle:'لا توجد إعلانات منشورة', emptyText:'سيظهر هنا الإعلانات الرسمية.' },
  results:       { title:'النتائج',    description:'بوابة استعلام النتائج' },
});
