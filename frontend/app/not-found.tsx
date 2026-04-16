import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md mx-auto px-6 text-center">
        <div className="text-8xl font-bold gradient-text mb-4">404</div>
        <h2 className="text-xl font-bold text-slate-900">Page not found</h2>
        <p className="mt-2 text-sm text-slate-600">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full transition-all"
          >
            Go Home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-full hover:bg-slate-50 transition-all"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
