import Link from "next/link";
import { Suspense } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";
import { getServerTranslation } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ChannelMatrix } from "@/components/channel-matrix/ChannelMatrix";
import { getWorkbookPayload } from "@/lib/db/queries";

export default async function ByChannelPage({
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
          <p className="text-muted-foreground text-sm">{t("nav.byChannel")}</p>
        </div>
        <Suspense fallback={null}>
          <LanguageSwitcher locale={locale} />
        </Suspense>
      </div>
      <Link href={`/${locale}`} className="text-sm underline-offset-4 hover:underline">
        {/* "Back" conventionally points toward the visual start of reading
            flow: left in LTR, right in RTL. Since RTL text renders logical-
            first characters at the visual right, a "→" placed first in the
            Hebrew string ends up on the visual right -- not a hardcoded "←"
            that would point the wrong way once mirrored. */}
        {locale === "he" ? "→ חזרה ללוח המסלולים" : "← Back to the pathways matrix"}
      </Link>
      <ChannelMatrix payload={payload} locale={locale} />
    </main>
  );
}
