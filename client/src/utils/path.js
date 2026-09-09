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

export const getParentDirectory = (path) =>{
  const parts = path.replace(/\/+$/, "").split("/");
  parts.pop();
  return parts.length ? `${parts.join("/")}/` : "";
}

export const getPathName = (path) => {
  return path.replace(/\/+$/, "").split("/").pop();
};