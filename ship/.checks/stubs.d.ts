// Generated stubs so `tsc` can resolve imports without node_modules.
// Types are `any` on purpose: the goal is scope and undefined-name checking
// (TS2304), not type correctness — that needs a real install.

declare module "*.css";
declare module "*.svg";
declare module "@radix-ui/react-accordion";
declare module "@radix-ui/react-alert-dialog";
declare module "@radix-ui/react-aspect-ratio";
declare module "@radix-ui/react-avatar";
declare module "@radix-ui/react-checkbox";
declare module "@radix-ui/react-collapsible";
declare module "@radix-ui/react-context-menu";
declare module "@radix-ui/react-dialog";
declare module "@radix-ui/react-dropdown-menu";
declare module "@radix-ui/react-hover-card";
declare module "@radix-ui/react-label";
declare module "@radix-ui/react-menubar";
declare module "@radix-ui/react-navigation-menu";
declare module "@radix-ui/react-popover";
declare module "@radix-ui/react-progress";
declare module "@radix-ui/react-radio-group";
declare module "@radix-ui/react-scroll-area";
declare module "@radix-ui/react-select";
declare module "@radix-ui/react-separator";
declare module "@radix-ui/react-slider";
declare module "@radix-ui/react-slot";
declare module "@radix-ui/react-switch";
declare module "@radix-ui/react-tabs";
declare module "@radix-ui/react-toast";
declare module "@radix-ui/react-toggle";
declare module "@radix-ui/react-toggle-group";
declare module "@radix-ui/react-tooltip";
declare module "@supabase/supabase-js";
declare module "@vercel/analytics/next";
declare module "cannot reach";
declare module "cmdk";
declare module "embla-carousel-react";
declare module "input-otp";
declare module "lucide-react";
declare module "next" {
  export type Metadata = any
  export type Viewport = any
  // A namespace, not a type — robots.ts and sitemap.ts use MetadataRoute.Robots
  export namespace MetadataRoute {
    type Robots = any
    type Sitemap = any
    type Manifest = any
  }
}
declare module "next-cloudinary";
declare module "next/font/google";
declare module "next/headers";
declare module "next/image";
declare module "next/link";
declare module "next/navigation";
declare module "node:assert/strict";
declare module "node:test";
declare module "react" {
  export type ReactNode = any
  export type FormEvent<T = any> = any
  export type ChangeEvent<T = any> = any
  export type KeyboardEvent<T = any> = any
  export type MouseEvent<T = any> = any
  export type RefObject<T> = { current: T | null }
  export type Dispatch<A> = (value: A) => void
  export type SetStateAction<S> = S | ((prev: S) => S)
  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>]
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>]
  export function useEffect(fn: () => void | (() => void), deps?: readonly any[]): void
  export function useLayoutEffect(fn: () => void | (() => void), deps?: readonly any[]): void
  export function useRef<T>(initial: T): { current: T }
  export function useRef<T>(initial: T | null): RefObject<T>
  export function useMemo<T>(fn: () => T, deps: readonly any[]): T
  export function useCallback<T extends (...a: any[]) => any>(fn: T, deps: readonly any[]): T
  export function useId(): string
  export function useReducer(...a: any[]): any
  export const Suspense: any
  export const Fragment: any
  const React: any
  export default React
}
declare module "react-day-picker";
declare module "react-hook-form";
declare module "react-resizable-panels";
declare module "recharts";
declare module "sonner";
declare module "tailwind-merge";
declare module "vaul";

declare namespace JSX { interface IntrinsicElements { [k: string]: any } }
declare const process: { env: Record<string, string | undefined> };
declare const WakeLockSentinel: any;

// A namespace for `React.ReactNode`-style references in props.
declare namespace React {
  type ReactNode = any
  type ReactElement = any
  type FormEvent<T = any> = any
  type ComponentPropsWithoutRef<T = any> = any
  type ElementRef<T = any> = any
  type CSSProperties = any
  type ChangeEvent<T = any> = any
  type KeyboardEvent<T = any> = any
  type MouseEvent<T = any> = any
  type RefObject<T = any> = any
  type ComponentProps<T = any> = any
}

declare module "next/server" {
  export type NextRequest = any
  export const NextResponse: any
  export type NextFetchEvent = any
}
declare module "next-themes/dist/types" {
  export type ThemeProviderProps = any
}
declare module "next-themes" {
  export const ThemeProvider: any
  export const useTheme: any
  export type ThemeProviderProps = any
}
declare module "clsx" {
  export type ClassValue = any
  export function clsx(...a: any[]): string
  export default clsx
}
declare module "class-variance-authority" {
  export type VariantProps<T = any> = any
  export const cva: any
}
