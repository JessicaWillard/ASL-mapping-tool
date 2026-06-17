const images = import.meta.glob("./assets/{M*,H*}.png", { eager: true, import: "default" });

const modules = {};
const headers = {};

for (const [path, url] of Object.entries(images)) {
  const match = path.match(/(M(\d+)|H\d+)\.png$/i);
  if (!match) continue;
  if (match[1].startsWith("M")) {
    modules[match[2]] = url;
  } else {
    headers[match[1].toUpperCase()] = url;
  }
}

export const THUMBNAILS = { modules, headers };

export function getModuleThumbnail(id) {
  return modules[String(id)] || "";
}

export function getHeaderThumbnail(id) {
  return headers[id] || "";
}
