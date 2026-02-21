// apps/mobile/src/types/expo-clipboard.d.ts
declare module "expo-clipboard" {
  export function setStringAsync(text: string): Promise<void>;
}
