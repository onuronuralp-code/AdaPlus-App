import React from 'react';
import HizmetlerScreen from './explore/island/hizmetler';

export default function ServislerTabScreen() {
  return (
    <HizmetlerScreen
      showBackButton={false}
      leftRoute="/(tabs)/explore"
      rightRoute="/(tabs)/contact"
    />
  );
}
