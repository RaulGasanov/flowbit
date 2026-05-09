import { useUserStore } from "@/entities/user/model/store";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read image"));
    };
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });

export const useUploadAvatar = () => {
  const uploadAvatar = useUserStore((state) => state.uploadAvatar);
  return async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Choose an image file");
    }
    if (file.size > MAX_AVATAR_SIZE) {
      throw new Error("Image must be smaller than 2 MB");
    }
    const dataUrl = await readFileAsDataUrl(file);
    await uploadAvatar({
      fileName: file.name || "avatar.png",
      dataUrl,
    });
  };
};
