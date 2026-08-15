import api from "./client";

export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { category, media: { key, url, fileName, mimeType, size } }
}
