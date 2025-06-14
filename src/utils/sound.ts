import { cookie } from "./cookie.ts";

export function getSoundMode(): "on" | "off" {
  return (cookie("soundMode") || "on") as "on" | "off";
}
