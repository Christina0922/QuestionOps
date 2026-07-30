"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useI18n } from "@/i18n";

export default function SignUpPage() {
  const { t } = useI18n();

  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">{t("auth.signUp")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.devBypassHint")}
          </p>
          <Link className="mt-4 inline-block text-primary underline" href="/">
            {t("auth.goDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <SignUp />
    </div>
  );
}
