import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
import { uploadFile } from "@/src/api";

type PickResult = { uri: string; name: string; type: string } | null;

/**
 * Handles the permission contract for the media library, then launches the picker.
 * Returns the picked asset or null. `onDenied` receives a boolean canAskAgain.
 */
export async function pickImage(
  onDenied: (canAskAgain: boolean) => void,
  allowVideo = true,
): Promise<PickResult> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  let status = current.status;
  let canAskAgain = current.canAskAgain;

  if (status !== "granted") {
    if (!canAskAgain) {
      onDenied(false);
      return null;
    }
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    status = req.status;
    canAskAgain = req.canAskAgain;
    if (status !== "granted") {
      onDenied(canAskAgain);
      return null;
    }
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: allowVideo ? ["images", "videos"] : ["images"],
    quality: 0.7,
    videoMaxDuration: 30,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const name = a.fileName || `upload.${a.type === "video" ? "mp4" : "jpg"}`;
  const type = a.mimeType || (a.type === "video" ? "video/mp4" : "image/jpeg");
  return { uri: a.uri, name, type };
}

export async function pickAndUpload(onDenied: (canAskAgain: boolean) => void, allowVideo = true) {
  const picked = await pickImage(onDenied, allowVideo);
  if (!picked) return null;
  const uploaded = await uploadFile(picked.uri, picked.name, picked.type);
  return uploaded; // { path, url }
}

export function openSettings() {
  Linking.openSettings();
}
