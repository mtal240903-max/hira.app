import api from "./client";

// Sur mobile, un "fichier" est décrit par { uri, name, type } (pas un objet File
// comme dans un navigateur). expo-image-picker et expo-document-picker renvoient
// déjà des objets compatibles avec cette forme.
export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name || `upload-${Date.now()}`,
    type: file.mimeType || file.type || "application/octet-stream",
  });

  const { data } = await api.post("/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { category, media: { key, url, fileName, mimeType, size } }
}
