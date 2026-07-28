export interface MenuItem {
  name: string;
  price: string;
  category?: string;
  description?: string;
  badge?: string;
}

export interface DeliveryProvider {
  id: string;
  name: string;
  category: 'market' | 'waterGas' | 'cargo' | 'food' | 'courier';
  categoryLabel: string;
  island: string;
  phone: string;
  whatsapp?: string;
  description: string;
  workingHours: string;
  estimatedTime: string;
  minOrder?: string;
  badge?: string;
  menu?: MenuItem[];
}

export const DELIVERY_PROVIDERS: DeliveryProvider[] = [
  {
    id: '1',
    name: 'Kınalıada Su & İpragaz Servisi',
    category: 'waterGas',
    categoryLabel: 'Su & Tüp',
    island: 'Kınalıada',
    phone: '+905331112244',
    whatsapp: '+905331112244',
    description: 'Erikli, Pınar su ve İpragaz/Aygaz tüp kapıya teslimat servisi.',
    workingHours: '08:30 - 20:00',
    estimatedTime: '20 - 35 dk',
    minOrder: '80 ₺',
    badge: 'Aynı Gün Teslimat',
  },
  {
    id: '2',
    name: 'Kınalıada Ada Market & Bakkal',
    category: 'market',
    categoryLabel: 'Market & Bakkal',
    island: 'Kınalıada',
    phone: '+905332223355',
    whatsapp: '+905332223355',
    description: 'Günlük taze ekmek, süt, şarküteri ve market ihtiyaçları adrese teslimat.',
    workingHours: '08:00 - 22:30',
    estimatedTime: '15 - 30 dk',
    minOrder: '60 ₺',
    badge: 'Hızlı Servis',
  },
  {
    id: '3',
    name: 'Kınalıada PTT & Kargo Dağıtım Noktası',
    category: 'cargo',
    categoryLabel: 'Kargo & Paket',
    island: 'Kınalıada',
    phone: '+905334445566',
    description: 'Kınalıada kargo ve paket teslim alım/dağıtım bilgilendirme hattı.',
    workingHours: '09:00 - 17:00',
    estimatedTime: 'Gün içi',
    badge: 'Kargo Noktası',
  },
  {
    id: '4',
    name: 'Ada İçi Kurye & Paket',
    category: 'courier',
    categoryLabel: 'Ada İçi Kurye',
    island: 'Tüm Adalar',
    phone: '+905301234567',
    whatsapp: '+905301234567',
    description: 'Adalar içi kapıdan kapıya hızlı paket ve evrak taşıma servisi.',
    workingHours: '08:30 - 21:00',
    estimatedTime: '20 - 35 dk',
    minOrder: '50 ₺',
    badge: 'Hızlı Kurye',
  },
  {
    id: '5',
    name: 'Harbiye Börekçisi',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905336667788',
    whatsapp: '+905336667788',
    description: 'Taze sıcak börek çeşitleri, poğaça, boyoz ve kahvaltı paket servisi.',
    workingHours: '06:30 - 18:00',
    estimatedTime: '15 - 25 dk',
    minOrder: '70 ₺',
    badge: 'Taze & Sıcak',
    menu: [
      { name: 'Kıymalı Su Böreği (Porsiyon)', price: '110 ₺', category: 'Börekler', description: 'Geleneksel lezzet, bol kıymalı sıcak porsiyon', badge: 'Çok Satan' },
      { name: 'Peynirli Su Böreği (Porsiyon)', price: '95 ₺', category: 'Börekler', description: 'Taze ezine peynirli su böreği' },
      { name: 'Kütüt Böreği (Pudra Şekerli)', price: '90 ₺', category: 'Börekler', description: 'Pudra şekeri ile servis edilir' },
      { name: 'Patatesli Kuru Börek', price: '85 ₺', category: 'Börekler', description: 'Çıtır el açması patatesli çıtır börek' },
      { name: 'İzmir Boyoz', price: '45 ₺', category: 'Hamur İşleri', description: 'Geleneksel taze İzmir boyozu' },
      { name: 'Sıcak Demleme Çay', price: '30 ₺', category: 'İçecekler' },
    ]
  },
  {
    id: '6',
    name: 'Maestro Cafe Bar Restaurant',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905337778899',
    whatsapp: '+905337778899',
    description: 'Zengin dünya mutfağı, makarna, pizza, burger ve soğuk-sıcak içecek servisi.',
    workingHours: '09:00 - 00:00',
    estimatedTime: '20 - 35 dk',
    minOrder: '120 ₺',
    badge: 'Ada Favorisi',
    menu: [
      { name: 'Maestro Özel Burger', price: '280 ₺', category: 'Burgerler', description: '200g dana köfte, karamelize soğan, cheddar, özel sos, patates kızartması', badge: 'Popüler' },
      { name: 'Pizza Margherita', price: '240 ₺', category: 'Pizzalar', description: 'Taze mozzarella, fesleğen, domates sosu' },
      { name: 'Pizza Quattro Formaggi', price: '290 ₺', category: 'Pizzalar', description: 'Gorgonzola, mozzarella, parmesan, roquefort', badge: 'Şefin Seçimi' },
      { name: 'Penne Arrabbiata', price: '210 ₺', category: 'Makarnalar', description: 'Acılı domates sosu, sarımsak, taze fesleğen, parmesan' },
      { name: 'Sezar Salata', price: '195 ₺', category: 'Salatalar', description: 'Izgara tavuk göğsü, kruton, sezar sos, parmesan' },
      { name: 'Taze Sıkma Portakal Suyu', price: '75 ₺', category: 'İçecekler' },
      { name: 'San Sebastian Cheesecake', price: '140 ₺', category: 'Tatlılar', badge: 'Taze' },
    ]
  },
  {
    id: '7',
    name: 'Hina Cafe',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905338889900',
    whatsapp: '+905338889900',
    description: 'Özel nitelikli kahveler, taze tatlılar, kruvasan ve kahvaltı tabağı paket servisi.',
    workingHours: '08:30 - 22:00',
    estimatedTime: '15 - 30 dk',
    minOrder: '85 ₺',
    badge: '3. Nesil Kahve',
    menu: [
      { name: 'Flat White (Specialty Coffee)', price: '95 ₺', category: 'Kahveler', badge: '3. Nesil' },
      { name: 'Iced Caramel Latte', price: '110 ₺', category: 'Soğuk Kahveler', badge: 'Popüler' },
      { name: 'Tereyağlı Kruvasan', price: '90 ₺', category: 'Fırın & Tatlı' },
      { name: 'Çikolatalı Babka', price: '120 ₺', category: 'Fırın & Tatlı' },
      { name: 'Serpme Ada Kahvaltı Tabağı', price: '320 ₺', category: 'Kahvaltı' },
    ]
  },
  {
    id: '8',
    name: 'Kaiki Cafe',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905339990011',
    whatsapp: '+905339990011',
    description: 'Deniz manzaralı lezzetler, tost, sandviç, soğuk kahve ve atıştırmalık paket servis.',
    workingHours: '09:00 - 23:00',
    estimatedTime: '20 - 30 dk',
    minOrder: '90 ₺',
    badge: 'Hızlı Paket',
    menu: [
      { name: 'Ayvalık Tostu', price: '160 ₺', category: 'Tostlar', badge: 'Popüler' },
      { name: 'Kulüp Sandviç', price: '185 ₺', category: 'Sandviçler' },
      { name: 'Soğuk Americano', price: '90 ₺', category: 'İçecekler' },
      { name: 'Çıtır Patates Tabağı', price: '120 ₺', category: 'Atıştırmalıklar' },
    ]
  },
  {
    id: '9',
    name: 'Juju Kafe',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905330001122',
    whatsapp: '+905330001122',
    description: 'Ev yapımı kekler, kurabiyeler, waffle, pankek ve taze sıkma meyve suları.',
    workingHours: '09:00 - 22:00',
    estimatedTime: '15 - 25 dk',
    minOrder: '75 ₺',
    badge: 'Tatlı & Kahve',
    menu: [
      { name: 'Belçika Çikolatalı Waffle', price: '190 ₺', category: 'Waffle & Pankek', badge: 'Popüler' },
      { name: 'Meyveli Pankek Kulesi', price: '175 ₺', category: 'Waffle & Pankek' },
      { name: 'Ev Yapımı Limonata', price: '75 ₺', category: 'İçecekler', badge: 'Taze' },
      { name: 'Havuçlu Tarçınlı Kek', price: '95 ₺', category: 'Tatlılar' },
    ]
  },
  {
    id: '10',
    name: 'Büyükada Su & İpragaz Servisi',
    category: 'waterGas',
    categoryLabel: 'Su & Tüp',
    island: 'Büyükada',
    phone: '+905321112233',
    whatsapp: '+905321112233',
    description: 'Erikli, Saka su ve Aygaz/İpragaz tüp ev teslimat servisi.',
    workingHours: '09:00 - 19:30',
    estimatedTime: '30 - 45 dk',
    minOrder: '100 ₺',
    badge: 'Aynı Gün Teslimat',
  },
];
