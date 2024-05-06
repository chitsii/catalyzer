import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isUnEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

export function isEmptyArray(value: unknown): value is [] {
  if (!Array.isArray(value)) return false;
  return value.length === 0 || value.join('') === ''
}

export function isNonEmptyStringOrArray(value: unknown): value is string | string[] {
  if (typeof value === "string") {
    return value.length > 0
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.join('') !== ''
  }
  return false
}


import { toast } from "sonner"
import { invoke } from "@tauri-apps/api/tauri";

export const popUp = (title: "success" | "failed", msg: string) => {
  console.info(msg);
  toast(
    title.toUpperCase(),
    {
      description: msg,
      position: 'top-right',
      // duration: 3000,
      // closeButton: true,
    }
  );
}
