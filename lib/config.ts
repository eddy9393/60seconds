// Ported from assets/js/config.js (window.APP_CONFIG)
export const APP_CONFIG = {
  appName: "60 Seconds FM",
  supabase: {
    url:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://rgoutegbcpjytplqcwze.supabase.co",
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh",
  },
  profileRuntimeStateKey: "ssfm_profile_runtime_state",
  radioSessionKey: "ssfm_radio_session_v2",
  radioVolumeKey: "ssfm_radio_volume_v2",
  radioLikeKey: "ssfm_radio_likes_v2",
  dailySecondsLimit: 10,
  skipCost: 1,
  defaultVolume: 0.3,
  features: {
    enableLikes: true,
    enableSkips: true,
    enableNotifications: true,
    requireApproval: true,
  },
} as const;
