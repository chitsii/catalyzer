import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { trace, info, error, attachConsole } from "@tauri-apps/plugin-log";

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

export const popUp = (title: "success" | "failed" | "info", msg: string) => {
  if (title === "success") {
    !!msg ? info(msg) : info(title);
  } else if (title === "failed") {
    !!msg ? error(msg) : error(title);
  }
  toast(title.toUpperCase(), {
    description: msg,
    position: "bottom-center",
    className: "z-50",
    closeButton: true,
  });
};

export const windowReload = async (sleep_time_ms: number = 400) => {
  // FIXME: junky way to update client side
  const sleep = () => new Promise((res) => setTimeout(res, sleep_time_ms));
  await sleep().then(() => {
    window.location.reload();
  });
};
