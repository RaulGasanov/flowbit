"use client";

import { AppShell } from "@/widgets/app-shell/ui/app-shell";
import { Card } from "@/shared/ui/card";
import { useCurrentUser } from "@/entities/user/model/store";
import { SettingsForm } from "@/widgets/settings-form/ui/settings-form";

export default function SettingsPage() {
  const user = useCurrentUser();

  return (
    <AppShell>
      {user ? (
        <SettingsForm key={user.id} user={user} />
      ) : (
        <Card>
          <p className="text-sm text-foreground/70">No user selected.</p>
        </Card>
      )}
    </AppShell>
  );
}
