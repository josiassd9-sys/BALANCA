"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ScaleCalculator = dynamic(
  () => import('@/components/scale-calculator'),
  { 
    ssr: false,
    loading: () => <Skeleton className="w-full h-[600px]" />,
  }
);

export default function Home() {
  return (
    <main className="container mx-auto p-px md:p-6 lg:p-8">
      <ScaleCalculator />
    </main>
  );
}
