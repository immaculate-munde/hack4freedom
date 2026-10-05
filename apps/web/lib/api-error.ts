import { translate, type TranslateVars } from "./i18n";

/** Stable code for the UI, plus the English sentence for logs and older clients. */
export function apiError(
  code: string,
  status: number,
  params?: TranslateVars,
): Response {
  return Response.json(
    {
      code,
      ...(params ? { params } : {}),
      error: translate("en", code, params),
    },
    { status },
  );
}
