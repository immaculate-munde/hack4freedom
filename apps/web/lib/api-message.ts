import { translate, type Locale, type TranslateVars } from "./i18n";

export type ApiErrorBody = {
  code?: string;
  error?: string;
  params?: TranslateVars;
};

/** Prefer a translation key from the API. Fall back to its English sentence, then a generic line. */
export function messageFromApi(
  locale: Locale,
  body: ApiErrorBody | null | undefined,
  fallbackKey = "common.somethingWentWrong",
): string {
  if (body?.code) {
    const translated = translate(locale, body.code, body.params);
    if (translated !== body.code) return translated;
  }
  if (typeof body?.error === "string" && body.error.trim()) return body.error;
  return translate(locale, fallbackKey);
}
