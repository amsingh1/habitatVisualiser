'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import useSWR from 'swr';
import ImageSlider from '@/components/ImageSlider';

const fetcher = (...args) => fetch(...args).then((res) => res.json());

const LeafIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 3C10 3 3 9 3 18c0 1.5 1 2 2 2 9 0 15-7 15-17Z" />
    <path d="M8 18c3-3 6-6 11-11" />
  </svg>
);

const UploadIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

const UsersIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.3 2.5-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.6" /><path d="M15 14.2c2.6.4 4.5 2.6 4.5 5.8" />
  </svg>
);

function LoggedOutHome() {
  return (
    <div className="w-full">
      <section className="py-10 sm:py-14 flex flex-col lg:flex-row items-center gap-10">
        <div className="max-w-xl flex-1">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 font-semibold text-xs px-3 py-1.5 rounded-full">
            <LeafIcon width={14} height={14} />
            European habitat data, mapped
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900">
            See Europe&rsquo;s habitats, mapped and documented.
          </h1>
          <p className="mt-5 text-lg text-stone-600 max-w-xl">
            Explore vegetation types across the continent, upload your own field observations, and contribute to a growing community atlas of European habitats.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/signup"
              className="px-6 py-3 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800"
            >
              Sign up free
            </Link>
            <Link
              href="/auth/signin"
              className="px-6 py-3 rounded-lg border border-stone-300 text-stone-700 font-bold hover:border-emerald-600 hover:text-emerald-700"
            >
              Log in
            </Link>
          </div>
        </div>

        <div className="w-full flex-1 lg:max-w-lg">
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <ImageSlider />
          </div>
        </div>
      </section>

      <section className="py-10 border-t border-stone-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <span className="flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700">
              <LeafIcon />
            </span>
            <h3 className="mt-4 text-lg font-bold text-stone-900">Explore habitats</h3>
            <p className="mt-2 text-sm text-stone-600">
              Browse a growing catalogue of European vegetation and habitat types, mapped by location and classification.
            </p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <span className="flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700">
              <UploadIcon />
            </span>
            <h3 className="mt-4 text-lg font-bold text-stone-900">Upload observations</h3>
            <p className="mt-2 text-sm text-stone-600">
              Add your own field photos and coordinates to help document habitats as they change over time.
            </p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <span className="flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700">
              <UsersIcon />
            </span>
            <h3 className="mt-4 text-lg font-bold text-stone-900">Join the community</h3>
            <p className="mt-2 text-sm text-stone-600">
              See what others are cataloguing, compare notes, and climb the community leaderboard.
            </p>
          </div>
        </div>
      </section>

      <StatsStrip />
    </div>
  );
}

function StatsStrip() {
  const { data } = useSWR('/api/stats', fetcher);

  if (!data || typeof data.observationCount !== 'number') return null;

  const stats = [
    { label: 'Vegetation types documented', value: data.vegetationTypeCount },
    { label: 'Field observations uploaded', value: data.observationCount },
    { label: 'Community contributors', value: data.contributorCount },
    { label: 'Countries covered', value: data.countryCount },
  ];

  return (
    <section className="mt-4 bg-emerald-50 rounded-2xl px-6 py-8 sm:px-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-3xl font-extrabold text-emerald-800">{stat.value.toLocaleString()}</div>
            <div className="mt-1 text-sm text-stone-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentlyAdded() {
  const { data } = useSWR('/api/habitats?slider=true&limit=4', fetcher);

  if (!data?.sliderImages?.length) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-stone-900 mb-4">Recently added habitats</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.sliderImages.map((image, index) => (
          <div key={index} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="h-24 w-full">
              <img
                src={image.imageUrl[0]}
                alt={image.habitatName || 'Vegetation type image'}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-stone-900 truncate">
                {image.habitatName || 'Vegetation type'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LoggedInHome({ session }) {
  const firstName = (session.user.name || session.user.email || '').split(' ')[0];

  return (
    <div className="w-full py-8">
      <h1 className="text-2xl font-extrabold text-stone-900">Welcome back{firstName ? `, ${firstName}` : ''}</h1>
      <p className="mt-1 text-sm text-stone-600">Here&rsquo;s where you can pick up.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link href="/habitats/upload" className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-emerald-600 transition-colors">
          <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700">
            <UploadIcon width={20} height={20} />
          </span>
          <h3 className="mt-4 font-bold text-stone-900">Upload an observation</h3>
          <p className="mt-1.5 text-sm text-stone-600">Add a new field photo with coordinates.</p>
        </Link>
        <Link href="/habitats" className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-emerald-600 transition-colors">
          <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700">
            <LeafIcon width={20} height={20} />
          </span>
          <h3 className="mt-4 font-bold text-stone-900">Explore habitats</h3>
          <p className="mt-1.5 text-sm text-stone-600">Browse the full catalogue and map.</p>
        </Link>
        <Link href="/community" className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-emerald-600 transition-colors">
          <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700">
            <UsersIcon width={20} height={20} />
          </span>
          <h3 className="mt-4 font-bold text-stone-900">Community</h3>
          <p className="mt-1.5 text-sm text-stone-600">See recent contributions and the leaderboard.</p>
        </Link>
      </div>

      <RecentlyAdded />
    </div>
  );
}

export default function HomeClient() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!session) {
    return <LoggedOutHome />;
  }

  return <LoggedInHome session={session} />;
}
