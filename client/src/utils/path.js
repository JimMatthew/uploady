export const joinPath = (...parts) => {
  return "/" + parts
    .map(p => p.replace(/^\/+|\/+$/g, ""))  
    .filter(Boolean)                          
    .join("/");
};

export const cleanPath = (p) => {
  if (!p) return "/";
  return "/" + p.replace(/\/+/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
};