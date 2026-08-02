"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";

const steps: Array<{ titleKey: MessageKey; descKey: MessageKey }> = [
  { titleKey: "dashboard.guide.step1", descKey: "dashboard.guide.step1Desc" },
  { titleKey: "dashboard.guide.step2", descKey: "dashboard.guide.step2Desc" },
  { titleKey: "dashboard.guide.step3", descKey: "dashboard.guide.step3Desc" },
  { titleKey: "dashboard.guide.step4", descKey: "dashboard.guide.step4Desc" },
  { titleKey: "dashboard.guide.step5", descKey: "dashboard.guide.step5Desc" },
];

export function GuideView() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("guide.title")}
        description={t("guide.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/live-sessions">{t("dashboard.guide.cta")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/live-sessions/new">{t("dashboard.guide.ctaNew")}</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("guide.whatTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("dashboard.guide.intro")}</p>
          <p>{t("guide.whatBody")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("guide.flowTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step.titleKey} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <div className="text-sm font-medium">{t(step.titleKey)}</div>
                  <p className="text-sm text-muted-foreground">
                    {t(step.descKey)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("guide.shortcutsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>{t("guide.shortcut.a")}</li>
            <li>{t("guide.shortcut.p")}</li>
            <li>{t("guide.shortcut.l")}</li>
            <li>{t("guide.shortcut.n")}</li>
            <li>{t("guide.shortcut.other")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
