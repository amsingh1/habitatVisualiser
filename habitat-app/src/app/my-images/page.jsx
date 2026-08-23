import LayoutWrapper from '@/components/layout-wrapper';
import MyImagesClient from './my-images-client';
import SearchHabitatComponent from '@/components/SearchHabitatComponent';
export const metadata = {
  title: 'My Images',
  description: 'View your uploaded vegetation type images',
};

export default function MyImagesPage() {
  return (
    <LayoutWrapper>
      <div className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-stone-900">My Observations</h1>
          <p className="mt-1 text-sm text-stone-600">Everything you&rsquo;ve uploaded so far.</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 mb-6">
          <SearchHabitatComponent context="personal" />
        </div>
        <MyImagesClient />
      </div>
    </LayoutWrapper>
  );
}