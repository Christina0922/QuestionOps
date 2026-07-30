import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (process.env.DEV_AUTH_BYPASS === "true") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Dev auth bypass enabled</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Clerk sign-up is skipped. Open the{" "}
            <a className="text-primary underline" href="/">
              dashboard
            </a>
            .
          </p>
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
