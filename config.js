window.APP_CONFIG = {
  // Sevgilin için kullanıcı adı + site giriş şifresi
  partnerUsername: "güzel kızım",
  sitePassword: "iremhasekisultan",
  // Sadece sana özel admin panel şifresi
  adminPassword: "gorzerk28",
  // (Opsiyonel) Kalp Sorumlusu'nun site kapısından giriş bilgileri
  ownerUsername: "kalpsorumlusu",
  ownerSitePassword: "gorzerk28",
  // Talep cevaplandığında bildirimin gideceği e-posta
  partnerEmail: "",
  // Senkron modu:
  // local  -> klasik hosting paketi için en uygun, tamamen tarayıcı localStorage modu.
  // remote -> /api/state endpoint'ine zorunlu senkron.
  // auto   -> /api/state varsa kullanır, yoksa local moda düşer.
  syncMode: "local",

  // (Opsiyonel) Farklı bir backend adresi kullanacaksan buraya yazabilirsin.
  // syncMode remote/auto iken boş bırakırsan otomatik olarak bu sitenin kendi /api/state adresi kullanılır.
  apiBaseUrl: "",
};
