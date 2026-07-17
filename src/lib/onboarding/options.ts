/** Shared account-setup option lists */

export const TARGET_UNIVERSITIES = [
  "Cambridge",
  "Oxford",
  "Imperial",
  "UCL",
  "Other",
  "Not sure yet",
] as const;

export type TargetUniversity = (typeof TARGET_UNIVERSITIES)[number];

export const REFERRAL_SOURCES = [
  "TikTok",
  "Instagram",
  "YouTube",
  "Google search",
  "Reddit",
  "Friend / classmate",
  "Teacher / school",
  "Tutor",
  "Discord / group chat",
  "ESAT score converter",
  "Fermi game",
  "Other",
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export function isTargetUniversity(value: string): value is TargetUniversity {
  return (TARGET_UNIVERSITIES as readonly string[]).includes(value);
}

export function isReferralSource(value: string): value is ReferralSource {
  return (REFERRAL_SOURCES as readonly string[]).includes(value);
}
