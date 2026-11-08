/** Time a screen may stay blank before it offers the rider a retry. */
export const READ_DEADLINE_MS = 8_000;

/** Resolves with the fallback if the work has not settled by the deadline. */
export function withDeadline<T>(work: Promise<T>, fallback: T, deadlineMs = READ_DEADLINE_MS) {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), deadlineMs);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}
