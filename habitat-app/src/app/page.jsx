// src/app/page.jsx
import HomeClient from './home-client';
import LayoutWrapper from '@/components/layout-wrapper';

export default function Home() {
  return (
    <LayoutWrapper>
      <HomeClient />
    </LayoutWrapper>
  );
}