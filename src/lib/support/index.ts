export {
  SUPPORT_PUBLIC_EMAIL,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_LIMITS,
  SUPPORT_RESPONSE_COPY,
  SUPPORT_INTRO_COPY,
  type SupportCategory,
} from "./constants";
export { validateSupportPayload, isSupportCategory } from "./validation";
export { buildSupportMailto } from "./mailto";
export { collectSupportDiagnostics } from "./diagnostics";
export { shouldShowSupportLauncher } from "./visibility";
