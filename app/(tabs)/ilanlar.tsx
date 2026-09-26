import React from 'react';
import IlanlarScreen from './explore/island/ilanlar';

export default function IlanlarTabScreen() {
  return (
    <IlanlarScreen
      showBackButton={true}
      leftRoute="/(tabs)/explore"
      rightRoute="/(tabs)/servisler"
    />
  );
}
