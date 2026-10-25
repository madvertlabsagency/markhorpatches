"use client";

import { ActionButton } from "@/components/ui/client";
import { resendVerificationAction } from "@/app/actions/auth";

export function ResendVerificationButton() {
  return (
    <ActionButton variant="secondary" action={() => resendVerificationAction()}>
      Resend email
    </ActionButton>
  );
}
