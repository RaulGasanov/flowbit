"use client";

import { Card } from "@/shared/ui/card";
import { useCurrentUser } from "@/entities/user/model/store";
import { SettingsForm } from "@/widgets/settings-form/ui/settings-form";

export default function SettingsPage() {
  const user = useCurrentUser();

  return (
    <>
      {user ? (
        <SettingsForm key={user.id} user={user} />
      ) : (
        <Card>
          <p className="text-sm text-foreground/70">No user selected.</p>
        </Card>
      )}
    </>
  );
}
