import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-emerald-900 text-emerald-50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-7 w-7 rounded-md bg-white/15">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 3C10 3 3 9 3 18c0 1.5 1 2 2 2 9 0 15-7 15-17Z" />
                <path d="M8 18c3-3 6-6 11-11" />
              </svg>
            </span>
            <span className="font-bold text-sm">Vegetation Types</span>
            <span className="text-emerald-200/70 text-sm hidden sm:inline">
              &middot; Documenting Europe&rsquo;s habitats
            </span>
          </div>

          <div className="flex items-center gap-5 text-sm">
            <Link href="/habitats" className="text-emerald-100 hover:text-white">Explore</Link>
            <Link href="/community" className="text-emerald-100 hover:text-white">Community</Link>
            <span className="text-emerald-200/70">&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
