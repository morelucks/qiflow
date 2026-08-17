import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-brand-600 dark:text-brand-400">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
