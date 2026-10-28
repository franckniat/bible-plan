/** The browser preview asks with the browser's own dialog. */
export function confirm({
  title,
  message,
}: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`))
}
