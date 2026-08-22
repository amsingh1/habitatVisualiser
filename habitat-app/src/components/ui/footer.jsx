import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-emerald-950 text-stone-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 pb-8 border-b border-white/10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-md bg-white/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 3C10 3 3 9 3 18c0 1.5 1 2 2 2 9 0 15-7 15-17Z" />
                  <path d="M8 18c3-3 6-6 11-11" />
                </svg>
              </span>
              <span className="font-bold text-white">Vegetation Types</span>
            </div>
            <p className="mt-3 text-sm text-stone-300">
              Mapping and documenting Europe&rsquo;s vegetation and habitat types, one field observation at a time.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/habitats" className="text-stone-200 hover:text-white">Browse habitats</Link></li>
              <li><Link href="/habitats/upload" className="text-stone-200 hover:text-white">Upload an observation</Link></li>
              <li><Link href="/my-images" className="text-stone-200 hover:text-white">My observations</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Community</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/community" className="text-stone-200 hover:text-white">Leaderboards</Link></li>
              <li><Link href="/auth/signup" className="text-stone-200 hover:text-white">Create an account</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 text-sm text-stone-400">
          &copy; {new Date().getFullYear()} Vegetation Types.
        </div>
      </div>
    </footer>
  );
}
