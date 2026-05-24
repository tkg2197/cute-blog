export function extensionFromFile(file: File) {
  const nameExt = file.name.match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase();
  if (nameExt) return nameExt;

  const mimeExt = file.type.split("/")[1]?.toLowerCase();
  if (mimeExt === "jpeg") return "jpg";
  return mimeExt && /^[a-z0-9]+$/.test(mimeExt) ? mimeExt : "bin";
}
