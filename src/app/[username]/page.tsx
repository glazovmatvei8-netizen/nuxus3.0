
/**
 * Route disabled due to Next.js static export restrictions.
 * Redirect logic is now handled via Home params (?u=username).
 */
export default function RemovedPage() {
  return null;
}

export function generateStaticParams() {
  return [];
}
