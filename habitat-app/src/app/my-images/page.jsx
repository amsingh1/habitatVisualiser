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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">My Images</h1>
          <SearchHabitatComponent context="personal" />
        </div>
        <MyImagesClient />
      </div>
    </LayoutWrapper>
  );
}