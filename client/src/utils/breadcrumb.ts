import { joinPath } from "./path";
import type { BreadcrumbEntry } from "../types/fileBrowser";

/**
 * Builds breadcrumb entries for a directory path, starting from the given root.
 */
export function buildBreadcrumbs(
  currentDirectory: string,
  rootPath: string,
): BreadcrumbEntry[] {
  const result: BreadcrumbEntry[] = [
    {
      name: "Home",
      path: rootPath,
    },
  ];

  let breadcrumbPath = rootPath;

  currentDirectory
    .split("/")
    .filter(Boolean)
    .forEach((part) => {
      breadcrumbPath = joinPath(breadcrumbPath, part);

      result.push({
        name: part,
        path: breadcrumbPath,
      });
    });

  return result;
}