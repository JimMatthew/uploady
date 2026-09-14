/**
 * Conditionally creates an object containing a single property when the value
 * is present.
 *
 * This is primarily useful when passing optional props with TypeScript's
 * `exactOptionalPropertyTypes` option enabled.
 *
 * With `exactOptionalPropertyTypes`, an optional property such as:
 *
 *   interface Props {
 *     error?: string;
 *   }
 *
 * means that `error` may either:
 *
 *   1. Be completely absent from the object, or
 *   2. Be present with a `string` value.
 *
 * It does NOT mean that the property may explicitly contain `undefined`.
 * Therefore, this can produce a type error:
 *
 *   const error: string | undefined = getError();
 *
 *   <Field error={error} />
 *
 * because the resulting props object may contain:
 *
 *   { error: undefined }
 *
 * `propIfPresent` solves this by returning either:
 *
 *   {}                         // when value is null or undefined
 *   { [key]: value }           // when a value is present
 *
 * This allows the result to be spread into an object or JSX props while
 * preserving the distinction between an absent property and a property whose
 * value is undefined.
 *
 * Example:
 *
 *   <Field
 *     label="Host"
 *     {...propIfPresent("error", errors.host)}
 *   />
 *
 * If `errors.host` is undefined:
 *
 *   propIfPresent("error", undefined)
 *   // => {}
 *
 * so the `error` prop is not passed at all.
 *
 * If `errors.host` is "Host is required":
 *
 *   propIfPresent("error", "Host is required")
 *   // => { error: "Host is required" }
 *
 * The helper treats both `null` and `undefined` as "not present":
 *
 *   propIfPresent("host", undefined) // {}
 *   propIfPresent("host", null)      // {}
 *   propIfPresent("host", "server")  // { host: "server" }
 *
 * The generic parameters preserve the property's type:
 *
 *   K = the literal property name
 *   V = the non-null/non-undefined value type
 *
 * For example:
 *
 *   const output: ActionOutput | undefined = outputs[id];
 *   propIfPresent("output", output);
 *
 * is typed as:
 *
 *   {} | { output: ActionOutput }
 *
 * rather than:
 *
 *   { output: ActionOutput | undefined }
 *
 * This is what makes it safe to spread into a type containing:
 *
 *   output?: ActionOutput;
 *
 * Use this helper when `null` or `undefined` means that the property should be
 * omitted entirely. Do not use it when `null` or `undefined` is itself a
 * meaningful value that needs to be passed to the receiving function or
 * component.
 */

export function propIfPresent<K extends string, V>(
  key: K,
  value: V | null | undefined,
): {} | { [P in K]: V } {
  return value == null
    ? {}
    : ({ [key]: value } as { [P in K]: V });
}