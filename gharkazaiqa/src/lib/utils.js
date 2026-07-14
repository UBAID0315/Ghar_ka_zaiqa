import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function normalizeArrayResponse(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value.items)) return value.items
  if (Array.isArray(value.data)) return value.data
  if (Array.isArray(value.menu)) return value.menu
  if (Array.isArray(value.results)) return value.results
  return []
}
