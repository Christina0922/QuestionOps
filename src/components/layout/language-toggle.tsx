"use client";

import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const options: Locale[] = ["ko", "en"];

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className="inline-flex items-center rounded-md border bg-background p-0.5"
      role="group"
      aria-label={t("common.language")}
    >
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 px-2 text-xs",
            locale === option && "bg-accent text-accent-foreground",
          )}
          onClick={() => setLocale(option)}
        >
          {t(option === "ko" ? "common.lang.ko" : "common.lang.en")}
        </Button>
      ))}
    </div>
  );
}
