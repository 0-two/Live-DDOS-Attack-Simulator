import centroids from "@/data/centroids.json";

export type LatLng = { lat: number; lng: number; name: string };

// Natural Earth 110m drops many small states/territories that show up
// frequently in Cloudflare Radar rankings, so we patch them in here.
const EXTRA: Record<string, LatLng> = {
  SG: { lat: 1.35, lng: 103.82, name: "Singapore" },
  HK: { lat: 22.32, lng: 114.17, name: "Hong Kong" },
  MO: { lat: 22.2, lng: 113.54, name: "Macao" },
  BH: { lat: 26.07, lng: 50.55, name: "Bahrain" },
  MT: { lat: 35.94, lng: 14.38, name: "Malta" },
  LU: { lat: 49.82, lng: 6.13, name: "Luxembourg" },
  MU: { lat: -20.35, lng: 57.55, name: "Mauritius" },
  MV: { lat: 3.2, lng: 73.22, name: "Maldives" },
  AD: { lat: 42.55, lng: 1.6, name: "Andorra" },
  MC: { lat: 43.74, lng: 7.42, name: "Monaco" },
  LI: { lat: 47.17, lng: 9.56, name: "Liechtenstein" },
  SM: { lat: 43.94, lng: 12.46, name: "San Marino" },
  GI: { lat: 36.14, lng: -5.35, name: "Gibraltar" },
  IM: { lat: 54.24, lng: -4.55, name: "Isle of Man" },
  JE: { lat: 49.21, lng: -2.13, name: "Jersey" },
  GG: { lat: 49.47, lng: -2.59, name: "Guernsey" },
  SC: { lat: -4.68, lng: 55.49, name: "Seychelles" },
  BB: { lat: 13.19, lng: -59.54, name: "Barbados" },
  AG: { lat: 17.06, lng: -61.8, name: "Antigua and Barbuda" },
  BS: { lat: 25.03, lng: -77.4, name: "Bahamas" },
  KY: { lat: 19.31, lng: -81.25, name: "Cayman Islands" },
  BM: { lat: 32.32, lng: -64.76, name: "Bermuda" },
  VG: { lat: 18.42, lng: -64.64, name: "British Virgin Islands" },
  CW: { lat: 12.17, lng: -68.99, name: "Curaçao" },
  AW: { lat: 12.52, lng: -69.97, name: "Aruba" },
  PR: { lat: 18.22, lng: -66.59, name: "Puerto Rico" },
  GU: { lat: 13.44, lng: 144.79, name: "Guam" },
  RE: { lat: -21.12, lng: 55.54, name: "Réunion" },
  GP: { lat: 16.27, lng: -61.55, name: "Guadeloupe" },
  MQ: { lat: 14.64, lng: -61.02, name: "Martinique" },
  CV: { lat: 16.0, lng: -24.01, name: "Cabo Verde" },
  KM: { lat: -11.88, lng: 43.87, name: "Comoros" },
  ST: { lat: 0.19, lng: 6.61, name: "São Tomé and Príncipe" },
  WS: { lat: -13.76, lng: -172.1, name: "Samoa" },
  TO: { lat: -21.18, lng: -175.2, name: "Tonga" },
  FM: { lat: 7.43, lng: 150.55, name: "Micronesia" },
  MH: { lat: 7.13, lng: 171.18, name: "Marshall Islands" },
  PW: { lat: 7.51, lng: 134.58, name: "Palau" },
  KI: { lat: 1.87, lng: -157.36, name: "Kiribati" },
  LC: { lat: 13.91, lng: -60.98, name: "Saint Lucia" },
  GD: { lat: 12.12, lng: -61.68, name: "Grenada" },
  VC: { lat: 13.25, lng: -61.2, name: "Saint Vincent" },
  KN: { lat: 17.36, lng: -62.78, name: "Saint Kitts and Nevis" },
  DM: { lat: 15.41, lng: -61.37, name: "Dominica" },
};

const TABLE: Record<string, LatLng> = {
  ...(centroids as Record<string, LatLng>),
  ...EXTRA,
};

export function locate(code: string | undefined | null): LatLng | null {
  if (!code) return null;
  return TABLE[code.toUpperCase()] ?? null;
}
