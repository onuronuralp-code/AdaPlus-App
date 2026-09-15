import React from 'react';
import IlanlarScreen from './explore/island/ilanlar';

export default function IlanlarTabScreen() {
  return (
    <IlanlarScreen
      showBackButton={false}
      leftRoute="/(tabs)/explore"
      rightRoute="/(tabs)/contact"
    />
  );
}
