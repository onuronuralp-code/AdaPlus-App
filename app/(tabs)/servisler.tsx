import React from 'react';
import { useRouter } from 'expo-router';
import { FerrySchedule } from '@/components/FerrySchedule';

export default function ServislerTabScreen() {
  const router = useRouter();
  return (
    <FerrySchedule
      showBackButton
      onBack={() => router.navigate('/(tabs)/explore')}
    />
  );
}
