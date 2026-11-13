import { cache } from "react";
import type { Setting } from "@prisma/client";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/config/site";
import type { PricingSettings } from "@/lib/fare/engine";

const DEFAULTS: Omit<Setting, "updatedAt"> = {
  id: 1,
  businessName: siteConfig.name,
  tagline: siteConfig.tagline,
  phonePrimary: siteConfig.phones[0],
  phoneSecondary: siteConfig.phones[1] ?? "",
  whatsappPrimary: siteConfig.whatsapp[0],
  whatsappSecondary: siteConfig.whatsapp[1] ?? "",
  email: siteConfig.email,
  address: siteConfig.address,
  advanceBookingHours: 2,
  cancellationCutoffHours: 6,
  nightCharge: 300,
  nightStartHour: 22,
  nightEndHour: 6,
  gstPercent: 5,
  minKmPerDay: 250,
  oneWayMinKm: 150,
};

/** Business settings, read once per request. */
export const getSettings = cache(async (): Promise<Setting> => {
  const row = await prisma.setting.findUnique({ where: { id: 1 } });
  return row ?? { ...DEFAULTS, updatedAt: new Date() };
});

export function toPricingSettings(s: Setting): PricingSettings {
  return {
    nightCharge: s.nightCharge,
    nightStartHour: s.nightStartHour,
    nightEndHour: s.nightEndHour,
    gstPercent: s.gstPercent,
    minKmPerDay: s.minKmPerDay,
    oneWayMinKm: s.oneWayMinKm,
  };
}

export type PublicSettings = Pick<
  Setting,
  | "businessName"
  | "tagline"
  | "phonePrimary"
  | "phoneSecondary"
  | "whatsappPrimary"
  | "whatsappSecondary"
  | "email"
  | "address"
>;
