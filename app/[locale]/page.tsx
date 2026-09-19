import { Suspense } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";
import { getServerTranslation } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { WorkbookExplorer } from "@/components/workbook/WorkbookExplorer";
import { getWorkbookPayload } from "@/lib/db/queries";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const { t } = await getServerTranslation(locale);
  const payload = getWorkbookPayload();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("app.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("app.tagline")}</p>
        </div>
        <Suspense fallback={null}>
          <LanguageSwitcher locale={locale} />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <WorkbookExplorer payload={payload} locale={locale} />
      </Suspense>
    </main>
  );
}
