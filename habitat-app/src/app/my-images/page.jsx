import LayoutWrapper from '@/components/layout-wrapper';
import MyImagesClient from './my-images-client';

export const metadata = {
  title: 'My Images',
  description: 'View your uploaded habitat images',
};

export default function MyImagesPage() {
  return (
    <LayoutWrapper>
      <div className="py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Images</h1>
        <MyImagesClient />
      </div>
    </LayoutWrapper>
  );
}