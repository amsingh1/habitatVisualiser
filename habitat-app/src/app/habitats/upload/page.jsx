// app/habitats/upload/page.js (Next.js App Router)
// or pages/habitats/upload.js (Next.js Pages Router)




import HabitatUpload from '@/components/habitat/HabitatUpload';
import LayoutWrapper from '@/components/layout-wrapper';

export default function UploadHabitatPage() {
  return (
     <LayoutWrapper>
    <div>
      <HabitatUpload />
    </div>
    </LayoutWrapper>
  );
}