"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import type { User } from "@/shared/types/domain";
import { useUploadAvatar } from "@/features/upload-avatar/model/use-upload-avatar";

interface ProfileCardProps {
  user: User;
}

export const ProfileCard = ({ user }: ProfileCardProps) => {
  const uploadAvatar = useUploadAvatar();
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onAvatarFileChange = async (file?: File) => {
    if (!file) {
      return;
    }
    try {
      setIsUploading(true);
      setStatus(undefined);
      await uploadAvatar(file);
      setStatus("Avatar updated successfully");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to upload avatar");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} src={user.avatarUrl} className="h-16 w-16 text-base" />
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-foreground/70">{user.email}</p>
        </div>
      </div>
      <p className="text-sm text-foreground/80">{user.bio}</p>
      <div className="rounded-md bg-surface-muted p-3 text-sm">
        <p className="font-medium">Workspace</p>
        <p className="text-foreground/70">{user.workspace}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void onAvatarFileChange(event.target.files?.[0]);
          }}
        />
        <Button
          variant="secondary"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "Uploading..." : "Change avatar"}
        </Button>
        {status ? <p className="text-xs text-muted">{status}</p> : null}
      </div>
    </Card>
  );
};
