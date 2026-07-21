import type { z } from "zod";

export function parseOrThrow<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  label: string,
): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid ${label} content:\n${JSON.stringify(
        result.error.format(),
        null,
        2,
      )}`,
    );
  }
  return result.data;
}
