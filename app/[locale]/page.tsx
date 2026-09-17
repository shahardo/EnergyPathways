import { Suspense } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";
import { getServerTranslation } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const { t } = await getServerTranslation(locale);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Suspense fallback={null}>
        <LanguageSwitcher locale={locale} />
      </Suspense>
      <h1 className="text-2xl font-semibold">{t("app.title")}</h1>
      <p className="text-muted-foreground">{t("app.tagline")}</p>
      <div className="border-border mt-8 max-w-md rounded-lg border border-dashed p-6">
        <h2 className="font-medium">{t("home.comingSoon.title")}</h2>
        <p className="text-muted-foreground mt-2 text-sm">{t("home.comingSoon.body")}</p>
      </div>
    </main>
  );
}
