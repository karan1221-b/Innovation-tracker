export const colors = {
  surface: "#FFFFFF",
  onSurface: "#111827",
  surfaceSecondary: "#F9FAFB",
  onSurfaceSecondary: "#374151",
  surfaceTertiary: "#F3F4F6",
  onSurfaceTertiary: "#4B5563",
  surfaceInverse: "#1F2937",
  onSurfaceInverse: "#F9FAFB",
  brand: "#0D9488",
  brandPrimary: "#0F766E",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#14B8A6",
  brandTertiary: "#CCFBF1",
  onBrandTertiary: "#115E59",
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",
  muted: "#9CA3AF",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
export const font = { sm: 12, base: 14, lg: 16, xl: 20, "2xl": 24, "3xl": 30 };

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const CATEGORY_ICONS: Record<string, string> = {
  plumbing: "water",
  electrical: "flash",
  ac_cooling: "snow",
  appliance_repair: "build",
  cleaning: "sparkles",
  carpentry: "hammer",
  painting: "color-palette",
  pest_control: "bug",
  furniture_assembly: "cube",
  installation: "hardware-chip",
  other: "ellipsis-horizontal",
};
