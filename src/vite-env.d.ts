/// <reference types="vite/client" />

declare function gtag(...args: any[]): void;
interface Window {
  gtag: typeof gtag;
  dataLayer: any[];
}
