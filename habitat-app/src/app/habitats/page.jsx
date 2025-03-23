import LayoutWrapper from '@/components/layout-wrapper';
import HabitatsClient from './habitats-client';

export const metadata = {
  title: 'Habitats',
  description: 'View and upload habitat images',
};

export default function HabitatsPage() {
  return (
    <LayoutWrapper>
      <div className="py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Habitats</h1>
        <HabitatsClient />
      </div>
    </LayoutWrapper>
  );
}