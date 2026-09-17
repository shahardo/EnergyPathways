import { createInstance } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const NAMESPACE = "common";

/**
 * i18next needs a fresh instance per request: a module-level singleton would
 * leak language state across concurrent requests handled by the same server process.
 */
export async function getServerTranslation(locale: Locale) {
  const instance = createInstance();
  await instance
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`./locales/${language}/${namespace}.json`),
      ),
    )
    .init({
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      ns: NAMESPACE,
      defaultNS: NAMESPACE,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });

  return { t: instance.getFixedT(locale, NAMESPACE), i18n: instance };
}
