"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  return (
    <ClerkSignOutButton redirectUrl="/">
      <Button variant="ghost" fullWidth icon={<LogOut size={16} />}>
        יציאה מהחשבון
      </Button>
    </ClerkSignOutButton>
  );
}
