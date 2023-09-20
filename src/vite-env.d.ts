/// <reference types="vite/client" />
interface ImportMetaEnv {
  VITE_COLOR_FIDELITY: number;
  VITE_DEFAULT_COLORMAP_POINTS: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
