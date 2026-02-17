import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[var(--color-surface)] border border-[var(--color-border)]",
          },
        }}
      />
    </div>
  );
}
