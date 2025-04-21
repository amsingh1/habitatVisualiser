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
        <HabitatsClient />
      </div>
    </LayoutWrapper>
  );
}