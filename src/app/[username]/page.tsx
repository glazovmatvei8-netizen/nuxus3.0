/**
 * Route disabled due to Next.js static export restrictions.
 * Redirect logic is now handled via Home params (?u=username).
 * This dummy export is required for 'output: export' build stability.
 */
export function generateStaticParams() {
  return [{ username: 'node' }];
}

export default function RemovedPage() {
  return null;
}
