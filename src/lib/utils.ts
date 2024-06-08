import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { info, warn, trace, error, debug, attachLogger } from "tauri-plugin-log-api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isUnEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isEmptyArray(value: unknown): value is [] {
  if (!Array.isArray(value)) return false;
  return value.length === 0 || value.join("") === "";
}

export function isNonEmptyStringOrArray(value: unknown): value is string | string[] {
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.join("") !== "";
  }
  return false;
}

import { toast } from "sonner";

export const popUp = (title: "success" | "failed", msg: string) => {
  if (title === "success") {
    !!msg ? info(msg) : info(title);
  } else if (title === "failed") {
    !!msg ? error(msg) : error(title);
  }
  toast(title.toUpperCase(), {
    description: msg,
    position: "top-right",
    className: "z-50",
  });
};
