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
    phone: '+902163815454',
    whatsapp: '+902163815454',
    description: 'Taze sıcak börek çeşitleri, poğaça, boyoz ve kahvaltı paket servisi.',
    workingHours: '06:30 - 18:00',
    estimatedTime: '15 - 25 dk',
    minOrder: '150 ₺',
    badge: 'Taze & Sıcak',
    menu: [
      // Börekler
      { name: 'Peynirli Su Böreği (Porsiyon)', price: '120 ₺', category: 'Börekler', description: 'Taptaze peynirli sıcak su böreği', badge: 'Çok Satan' },
      { name: 'Kıymalı Kol Böreği (Porsiyon)', price: '130 ₺', category: 'Börekler', description: 'Bol kıymalı, sıcak ve çıtır el açması börek' },
      { name: 'Ispanaklı Gül Böreği', price: '110 ₺', category: 'Börekler', description: 'Taze ıspanaklı rulo gül böreği' },
      { name: 'Patatesli Kır Böreği', price: '110 ₺', category: 'Börekler', description: 'Özel baharatlı patates iç harcıyla' },
      
      // Poğaça & Simit
      { name: 'Sokak Simidi', price: '25 ₺', category: 'Unlu Mamüller', description: 'Bol susamlı, çıtır İstanbul simidi', badge: 'Taze' },
      { name: 'Tereyağlı Sade Açma', price: '40 ₺', category: 'Unlu Mamüller', description: 'Yumuşacık tereyağlı açma' },
      { name: 'Zeytinli Açma', price: '45 ₺', category: 'Unlu Mamüller', description: 'Dilim zeytinli taze açma' },
      { name: 'Kaşarlı Poğaça', price: '45 ₺', category: 'Unlu Mamüller', description: 'Eriyen kaşar peyniri dolgulu' },
      { name: 'Dereotlu Peynirli Poğaça', price: '45 ₺', category: 'Unlu Mamüller', description: 'Taze dereotlu, ağızda dağılan poğaça' },
      { name: 'Karaköy Poğaçası (Sade)', price: '40 ₺', category: 'Unlu Mamüller', description: 'Geleneksel kıyır kıyır Karaköy poğaçası' },

      // Kahvaltı
      { name: 'Menemen', price: '180 ₺', category: 'Kahvaltı', description: 'Taze domates ve köy biberiyle hazırlanan sıcak menemen' },
      { name: 'Klasik Kahvaltı Tabağı', price: '280 ₺', category: 'Kahvaltı', description: 'Ezine peyniri, kaşar, zeytin, reçel, bal, tereyağı, domates, salatalık, haşlanmış yumurta ve 2 çay', badge: 'Favori' },
      { name: 'Sahanda Sucuklu Yumurta', price: '190 ₺', category: 'Kahvaltı', description: 'Kasap sucuk ve tereyağı ile sahanda yumurta' },

      // Tatlılar
      { name: 'Fırın Sütlaç', price: '110 ₺', category: 'Tatlılar', description: 'Fırınlanmış geleneksel sütlaç' },
      { name: 'Çikolatalı Ekler (Adet)', price: '45 ₺', category: 'Tatlılar', description: 'Taze krema dolgulu, çikolata soslu' },
      { name: 'Profiterol', price: '130 ₺', category: 'Tatlılar', description: 'Özel çikolata sosu ve krema dolgusuyla' },

      // İçecekler
      { name: 'İnce Belli Çay', price: '35 ₺', category: 'İçecekler', badge: 'Sıcak' },
      { name: 'Fincan Çay', price: '45 ₺', category: 'İçecekler' },
      { name: 'Taze Sıkma Portakal Suyu', price: '90 ₺', category: 'İçecekler', badge: 'Taze Sıkım' },
      { name: 'Ayran', price: '40 ₺', category: 'İçecekler' },
      { name: 'Türk Kahvesi', price: '70 ₺', category: 'İçecekler', description: 'Lokum ve su ikramıyla' },
    ]
  },
  {
    id: '6',
    name: 'Maestro Cafe Bar Restaurant',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905467780363',
    whatsapp: '+905467780363',
    description: 'Zengin dünya mutfağı, makarna, pizza, burger ve soğuk-sıcak içecek servisi.',
    workingHours: '08:30 - 01:00',
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
    id: '11',
    name: 'Mimoza Restaurant',
    category: 'food',
    categoryLabel: 'Restoran & Meyhane',
    island: 'Kınalıada',
    phone: '+902163814444',
    whatsapp: '+902163814444',
    description: 'Deniz manzaralı klasik ada meyhanesi. Taze meze ve balık çeşitleri.',
    workingHours: '12:00 - 00:00',
    estimatedTime: '30 - 45 dk',
    minOrder: '400 ₺',
    badge: 'Ada Klasiği',
    menu: [
      { name: 'Kalamar Tava', price: '320 ₺', category: 'Ara Sıcaklar', description: 'Taze kalamar, özel tarator sos ile' },
      { name: 'Karides Güveç', price: '350 ₺', category: 'Ara Sıcaklar' },
      { name: 'Levrek Izgara', price: '450 ₺', category: 'Ana Yemekler', badge: 'Popüler' },
      { name: 'Karışık Meze Tabağı', price: '280 ₺', category: 'Mezeler', description: 'Şefin seçimi 5 çeşit günlük meze' },
      { name: 'Kavun Peynir Tabağı', price: '220 ₺', category: 'Mezeler' },
    ]
  },
  {
    id: '12',
    name: 'Jash Herman Chef',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+902163815555',
    whatsapp: '+902163815555',
    description: 'Ermeni ve Türk mutfağından seçkin lezzetler.',
    workingHours: '10:00 - 23:30',
    estimatedTime: '25 - 40 dk',
    minOrder: '350 ₺',
    badge: 'Özel Lezzetler',
    menu: [
      { name: 'Topik', price: '180 ₺', category: 'Mezeler', description: 'Geleneksel Ermeni mezesi', badge: 'Özel' },
      { name: 'Midye Dolma (Porsiyon)', price: '160 ₺', category: 'Mezeler' },
      { name: 'Herman Şef Özel Köfte', price: '320 ₺', category: 'Ana Yemekler', description: 'Izgara sebzeler ve pilav ile' },
      { name: 'Fırınlanmış Helva', price: '140 ₺', category: 'Tatlılar' },
    ]
  },
  {
    id: '13',
    name: 'Teos Kınalıada Beach & Restaurant',
    category: 'food',
    categoryLabel: 'Restoran',
    island: 'Kınalıada',
    phone: '+902163816666',
    whatsapp: '+902163816666',
    description: 'Plaj keyfi ve dünya mutfağından seçkin atıştırmalıklar.',
    workingHours: '09:00 - 22:00',
    estimatedTime: '20 - 35 dk',
    minOrder: '250 ₺',
    menu: [
      { name: 'Teos Burger', price: '310 ₺', category: 'Burgerler', description: 'Özel burger köftesi, karamelize soğan, patates kızartması' },
      { name: 'Chicken Fingers', price: '240 ₺', category: 'Atıştırmalıklar' },
      { name: 'Buzlu Latte', price: '120 ₺', category: 'İçecekler', badge: 'Serinletici' },
      { name: 'Mevsim Meyveleri Tabağı', price: '190 ₺', category: 'Tatlılar' },
    ]
  },
  {
    id: '14',
    name: 'Bahar Pastanesi',
    category: 'food',
    categoryLabel: 'Pastane & Fırın',
    island: 'Kınalıada',
    phone: '+902163817777',
    whatsapp: '+902163817777',
    description: 'Adanın en eski ve meşhur pastanesi. Taze kurabiyeler, tatlılar ve kahvaltı.',
    workingHours: '07:00 - 20:00',
    estimatedTime: '15 - 25 dk',
    minOrder: '100 ₺',
    badge: 'Tarihi Lezzet',
    menu: [
      { name: 'Bademli Kurabiye (Kutu)', price: '250 ₺', category: 'Kurabiyeler', description: 'Meşhur ada kurabiyesi', badge: 'Çok Satan' },
      { name: 'Lor Tatlısı', price: '120 ₺', category: 'Tatlılar' },
      { name: 'Çilekli Milföy', price: '140 ₺', category: 'Tatlılar' },
      { name: 'Dereotlu Poğaça', price: '40 ₺', category: 'Tuzlular' },
      { name: 'Limonata', price: '60 ₺', category: 'İçecekler' },
    ]
  },
  {
    id: '15',
    name: 'İki Kapı Cafe',
    category: 'food',
    categoryLabel: 'Kafe',
    island: 'Kınalıada',
    phone: '+902163818888',
    whatsapp: '+902163818888',
    description: 'Vapur iskelesine yakın, çiçekler içinde şirin kahve molası noktası.',
    workingHours: '08:00 - 23:00',
    estimatedTime: '15 - 20 dk',
    minOrder: '90 ₺',
    badge: 'Kahve Severler',
    menu: [
      { name: 'Filtre Kahve', price: '85 ₺', category: 'Kahveler' },
      { name: 'Iced Americano', price: '95 ₺', category: 'Kahveler' },
      { name: 'Brownie', price: '130 ₺', category: 'Tatlılar', description: 'Sıcak çikolata soslu ev yapımı brownie' },
      { name: 'Tost (Kaşarlı)', price: '110 ₺', category: 'Atıştırmalıklar' },
    ]
  },
  {
    id: '16',
    name: 'Kafe Ros Fiore',
    category: 'food',
    categoryLabel: 'Kafe',
    island: 'Kınalıada',
    phone: '+902163819999',
    whatsapp: '+902163819999',
    description: 'Hayvan dostu, deniz manzaralı huzurlu kafe.',
    workingHours: '09:00 - 22:30',
    estimatedTime: '15 - 25 dk',
    minOrder: '120 ₺',
    menu: [
      { name: 'Matcha Latte', price: '135 ₺', category: 'Özel İçecekler', badge: 'Yeni' },
      { name: 'San Sebastian Cheesecake', price: '160 ₺', category: 'Tatlılar', badge: 'Popüler' },
      { name: 'Cortado', price: '110 ₺', category: 'Kahveler' },
      { name: 'Kedi/Köpek Maması (Bağış)', price: '50 ₺', category: 'Sosyal Sorumluluk', description: 'Sokak hayvanları için bağış' },
    ]
  },
  {
    id: '17',
    name: 'Çınaraltı Kuyu Restaurant',
    category: 'food',
    categoryLabel: 'Restoran',
    island: 'Kınalıada',
    phone: '+902163811234',
    whatsapp: '+902163811234',
    description: 'Taze günlük balıklar ve efsanevi mezelerle kasaba samimiyeti.',
    workingHours: '12:00 - 23:30',
    estimatedTime: '30 - 45 dk',
    minOrder: '300 ₺',
    badge: 'Taze Balık',
    menu: [
      { name: 'Izgara Çipura', price: '450 ₺', category: 'Ana Yemekler', description: 'Taze otlar ve limon eşliğinde' },
      { name: 'Kalamar Tava', price: '320 ₺', category: 'Ara Sıcaklar' },
      { name: 'Fava', price: '180 ₺', category: 'Mezeler' },
    ]
  },
  {
    id: '18',
    name: 'Adres Köşe Meyhane',
    category: 'food',
    categoryLabel: 'Meyhane',
    island: 'Kınalıada',
    phone: '+902163811235',
    whatsapp: '+902163811235',
    description: 'Günlük ve taze balık çeşitleri, samimi ada meyhanesi.',
    workingHours: '14:00 - 00:00',
    estimatedTime: '30 - 40 dk',
    minOrder: '350 ₺',
    menu: [
      { name: 'Karides Söğüş', price: '310 ₺', category: 'Ara Sıcaklar' },
      { name: 'Levrek Marin', price: '260 ₺', category: 'Mezeler', badge: 'Popüler' },
      { name: 'Izgara Tekir', price: '400 ₺', category: 'Ana Yemekler' },
    ]
  },
  {
    id: '19',
    name: 'Metin\'in Yeri',
    category: 'food',
    categoryLabel: 'Restoran',
    island: 'Kınalıada',
    phone: '+902163811236',
    whatsapp: '+902163811236',
    description: 'Kendin pişir kendin ye mangal keyfi ve et çeşitleri.',
    workingHours: '12:00 - 22:30',
    estimatedTime: '40 - 50 dk',
    minOrder: '400 ₺',
    badge: 'Mangal',
    menu: [
      { name: 'Karışık Izgara Tabağı', price: '650 ₺', category: 'Etler', description: 'Köfte, tavuk şiş, pirzola, sucuk', badge: 'Doyurucu' },
      { name: 'Kasap Köfte (Porsiyon)', price: '320 ₺', category: 'Etler' },
      { name: 'Gavurdağı Salatası', price: '180 ₺', category: 'Salatalar' },
    ]
  },
  {
    id: '20',
    name: 'Yeşil Roma Dondurma',
    category: 'food',
    categoryLabel: 'Tatlıcı',
    island: 'Kınalıada',
    phone: '+902163811237',
    whatsapp: '',
    description: 'Adanın en sevilen doğal, günlük ve taze Roma dondurmacısı.',
    workingHours: '10:00 - 23:30',
    estimatedTime: '10 - 20 dk',
    minOrder: '100 ₺',
    badge: 'Doğal Dondurma',
    menu: [
      { name: 'Karışık Dondurma (Yarım Kilo)', price: '280 ₺', category: 'Dondurmalar', description: 'Çikolata, vanilya, çilek, fıstık vb. seçimiyle' },
      { name: 'Külah (Boş)', price: '10 ₺', category: 'Dondurmalar' },
      { name: 'Özel Roma Dondurması (Porsiyon)', price: '120 ₺', category: 'Dondurmalar', badge: 'Çok Satan' },
    ]
  },
  {
    id: '21',
    name: 'Bab-ı Kahve',
    category: 'food',
    categoryLabel: 'Kafe',
    island: 'Kınalıada',
    phone: '+902163811238',
    whatsapp: '+902163811238',
    description: 'Ada sokaklarında kahve ve atıştırmalık molası.',
    workingHours: '09:00 - 21:00',
    estimatedTime: '15 - 25 dk',
    minOrder: '80 ₺',
    menu: [
      { name: 'Taze Demleme Filtre Kahve', price: '85 ₺', category: 'Kahveler' },
      { name: 'Soğuk Kahve (Latte)', price: '110 ₺', category: 'Kahveler' },
      { name: 'Ev Yapımı Mozaik Pasta', price: '120 ₺', category: 'Tatlılar' },
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
