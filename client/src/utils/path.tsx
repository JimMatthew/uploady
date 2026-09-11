export const joinPath = (...parts: string[]): string => {
  return (
    "/" +
    parts
      .map((part) => part.replace(/^\/+|\/+$/g, ""))
      .filter(Boolean)
      .join("/")
  );
};

export const cleanPath = (path: string): string => {
  if (!path) {
    return "/";
  }

  return (
    "/" + path.replace(/\/+/g, "/").replace(/^\/+/, "").replace(/\/+$/, "")
  );
};

export const getParentDirectory = (path: string): string => {
  const parts = path.replace(/\/+$/, "").split("/");

  parts.pop();

  return parts.length ? `${parts.join("/")}/` : "";
};

export const getPathName = (path: string): string => {
  return path.replace(/\/+$/, "").split("/").pop() ?? "";
};
