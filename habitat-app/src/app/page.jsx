// src/app/page.jsx
import HomeClient from './home-client';
import LayoutWrapper from '@/components/layout-wrapper';

export default function Home() {
  return (
    <LayoutWrapper>
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Welcome to European vegetation and habitat types
          </h1>
        </div>

        <div className="mt-10">
          <HomeClient />
        </div>
      </div>
    </LayoutWrapper>
  );
}