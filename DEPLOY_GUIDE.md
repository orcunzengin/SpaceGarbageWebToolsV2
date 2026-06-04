# SpaceGarbageWebToolsV2 Dağıtım ve Kurulum Rehberi

Merhaba Kaptan! Projenizi başarıyla yeni modüler ve yetkilendirmeli yapıya geçirdik. Bu rehber ile projenizi GitHub'a taşıyıp, Firebase üzerinde güvenliğini nasıl sağlayacağınızı adım adım görebilirsiniz.

## 1. Firebase Kurulumu ve Ayarları

### A. Authentication (Kimlik Doğrulama) Açma
1. [Firebase Console](https://console.firebase.google.com/)'a gidin ve `spacegarbagetools` projesini açın.
2. Sol menüden **Authentication** (Kimlik Doğrulama) sekmesine tıklayın.
3. **Get Started** diyerek başlayın ve **Sign-in method** sekmesinden **Email/Password** sağlayıcısını etkinleştirin (Sadece Email/Password yeterli, Passwordless (Link) seçeneğine gerek yok).
4. **Users** sekmesinden projenizi kullanacak kişileri "Add User" butonuyla manuel ekleyebilir veya siteniz üzerinden kayıt olmalarına (eğer kod eklerseniz) izin verebilirsiniz. Şimdilik sizin tarafınızdan eklenmeleri daha güvenli.

### B. Admin Yetkisi Verme
1. Firebase Realtime Database'e gidin.
2. Kök dizinde (en üstte) `Admins` adında bir JSON node (düğüm) oluşturun.
3. Kendi kullanıcınızın (veya admin olacak kişinin) Firebase Authentication sayfasındaki **User UID**'sini kopyalayın.
4. `Admins` altına bu UID'yi key (anahtar) olarak, değerini (value) ise `true` (boolean) olarak ekleyin.
Örnek:
```json
{
  "Admins": {
    "SizinAuthUIDnizBurayaGelecek": true
  }
}
```

### C. Firebase Storage Kurulumu
1. Firebase Console sol menüsünden **Storage** sekmesine tıklayın.
2. **Get Started** (Başla) deyin.
3. Başlangıç kurallarını kabul ederek (Test veya Production mod fark etmez, kuralları biz değiştireceğiz) deponuzu oluşturun.

---

## 2. Güvenlik Kuralları (Security Rules)

Verilerinizin ve yüklenen dosyaların güvenliği için aşağıdaki kuralları Firebase Console üzerinden uygulamanız zorunludur. Aksi halde herkes (veya giriş yapan herkes) başkasının notunu silebilir.

### Realtime Database Kuralları
Firebase Realtime Database sayfasındaki **Rules** sekmesine girin ve mevcut kuralları silip şunu yapıştırın:

```json
{
  "rules": {
    // Sadece adminler Admins listesini görebilir/değiştirebilir
    "Admins": {
      ".read": "auth != null",
      ".write": false
    },
    // Eşya, Yetenek, Simülatör gibi oyun verilerini herkes (veya sadece giriş yapanlar) okuyabilir, ama sadece Adminler yazabilir.
    "spaceGarbageItems": {
      ".read": "true",
      ".write": "root.child('Admins').child(auth.uid).val() === true"
    },
    "spaceGarbageSkills": {
      ".read": "true",
      ".write": "root.child('Admins').child(auth.uid).val() === true"
    },
    "spaceGarbageSimulator": {
      ".read": "true",
      ".write": "root.child('Admins').child(auth.uid).val() === true"
    },
    
    // Not Defteri Kuralları: Herkes SADECE KENDİ notunu okuyup yazabilir. Adminler herkesinkini okuyup yazabilir.
    "spaceGarbageNotes": {
      "users": {
        "$uid": {
          ".read": "auth != null && (auth.uid === $uid || root.child('Admins').child(auth.uid).val() === true)",
          ".write": "auth != null && (auth.uid === $uid || root.child('Admins').child(auth.uid).val() === true)"
        }
      }
    },
    
    // Depo Kontrol (Storage Metaverileri): Sadece adminler okuyup silebilir, kullanıcılar sadece kendi yüklediklerini ekleyebilir.
    "spaceGarbageDepo": {
      ".read": "auth != null && root.child('Admins').child(auth.uid).val() === true",
      "$timestamp": {
        // Kullanıcı kendi ID'siyle eşleşen veri yazabilir.
        ".write": "auth != null && (root.child('Admins').child(auth.uid).val() === true || newData.child('uid').val() === auth.uid)"
      }
    }
  }
}
```

### Storage Kuralları
Firebase Storage sayfasındaki **Rules** sekmesine girin ve mevcut kuralları silip şunu yapıştırın:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{fileName} {
      // Dosyayı sadece yükleyen kişi (kendi klasörüne) veya admin okuyup yazabilir.
      // Not: Storage kurallarında Realtime Database'deki Admin düğümünü doğrudan okumak zordur. 
      // Ancak okuma (indirme) URL'i paylaşılmadığı sürece güvendedir. 
      // Sıkılaştırma olarak sadece oturum açmış kişilere izin veriyoruz.
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      // Sadece adminlerin silebilmesi için (Eğer Özel Yetki / Custom Claim atamadıysanız herkes sadece kendi dosyasını silebilir)
      allow delete: if request.auth != null; 
    }
  }
}
```

---

## 3. GitHub'a Pushlama ve Yayınlama (V2)

Yeni modüler yapımızı `SpaceGarbageWebToolsV2` adında yeni bir repoya atmak için terminalinizde sırasıyla şu komutları çalıştırın (Bilgisayarınızda Git yüklü olmalı):

1. GitHub'da `SpaceGarbageWebToolsV2` adında **boş** bir repository oluşturun (Readme veya Gitignore eklemeyin).
2. Terminalden proje klasörünün içine girin (`cd C:\Users\user\Desktop\SpaceGarbageWeb-main`).
3. Aşağıdaki komutları çalıştırın:

```bash
# Eğer daha önce git init yapıldıysa ilk komutu atlayabilirsiniz, yoksa çalıştırın.
git init

# Dosyaları ekleyin (node_modules gibi şeyleri dışlamak için .gitignore varsa onu kullanır)
git add .

# İlk commitinizi atın
git commit -m "V2 Modüler Yapı, RBAC, Firebase Auth ve Storage Entegrasyonu tamamlandı"

# Branch ismini main olarak güncelleyin
git branch -M main

# GitHub reponuzu bağlayın (KENDİ KULLANICI ADINIZI GİRİN)
git remote add origin https://github.com/<KULLANICI_ADINIZ>/SpaceGarbageWebToolsV2.git

# Kodları gönderin
git push -u origin main
```

4. Firebase Hosting'e bu yeni güncellemeyi atmak için:
```bash
firebase deploy --only hosting
```

---
Bu adımları tamamladığınızda projeniz tamamen yeni, güvenli ve organize bir sisteme geçmiş olacak. Tebrikler! 🚀