/// <reference types="vite/client" />
import type { CmsApi } from '../../shared/types';

declare global {
  interface Window { cms: CmsApi; }
}

export {};
