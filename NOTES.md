# Catatan Analisis Masalah & Solusi

Dokumen ini merinci masalah spesifik yang ditemukan dalam kode awal dan solusi yang diterapkan untuk memperbaikinya, dengan format yang jelas untuk setiap masalah.

---

## Bagian 1: Lapisan Persistence (`InMemory...Repository`)

### Isu 1.1: Pembuatan ID Tidak Aman dan Tidak Konsisten

- **Masalah:**
  - `InMemoryTodoRepository` menggunakan `Math.random()` untuk membuat ID, yang tidak menjamin keunikan dan dapat menyebabkan tabrakan data.
  - `InMemoryUserRepository` menggunakan `idCounter`, yang juga tidak ideal untuk lingkungan yang lebih kompleks.
- **Solusi:**
  - Menstandarkan pembuatan ID di kedua *repository* menggunakan **`crypto.randomUUID()`**.
  - Ini memastikan bahwa setiap entitas (`User` dan `Todo`) mendapatkan ID yang unik, aman, dan terstandarisasi sesuai praktik terbaik.

---

### Isu 1.2: Bug Logika pada Fungsi `update`

- **Masalah:**
  - Fungsi `update` di `InMemoryTodoRepository` memiliki bug kritis: jika ID `todo` yang akan di-update tidak ditemukan, fungsi tersebut justru **membuat `todo` baru**. Ini adalah perilaku yang salah untuk sebuah operasi *update*.
- **Solusi:**
  - Logika fungsi `update` ditulis ulang sepenuhnya.
  - Sekarang, fungsi tersebut akan mencari item terlebih dahulu. Jika tidak ada, ia akan mengembalikan `null` (sesuai ekspektasi).
  - Dengan ini, fungsi `update` hanya akan memodifikasi data yang sudah ada, tidak akan pernah membuat data baru.

---

### Isu 1.3: Kebocoran Data dan Pelanggaran Enkapsulasi

- **Masalah:**
  - Semua fungsi *repository* (`findById`, `findAll`, `create`) mengembalikan referensi langsung ke objek atau *array* yang disimpan di memori.
  - Ini sangat berbahaya karena kode di luar *repository* dapat secara tidak sengaja (atau sengaja) memodifikasi data internal tanpa melalui logika *repository*, sehingga merusak integritas data.
- **Solusi:**
  - Menerapkan **`deepCopy`** pada semua data yang dikembalikan dari *repository*.
  - Sekarang, setiap kali data diambil, klien akan menerima salinan data, bukan referensi aslinya. Ini melindungi keadaan internal *repository* dan memastikan data hanya dapat diubah melalui metode yang disediakan (`create`, `update`).

---

### Isu 1.4: Logika Kueri Pengingat Salah

- **Masalah:**
  - Fungsi `findDueReminders` hanya memfilter `todo` berdasarkan `remindAt <= now`.
  - Fungsi ini tidak memeriksa apakah status `todo` tersebut masih `PENDING`. Akibatnya, `todo` yang sudah `DONE` tetapi memiliki `remindAt` di masa lalu akan salah diproses lagi.
- **Solusi:**
  - Menambahkan kondisi `status === "PENDING"` ke dalam filter di fungsi `findDueReminders`.
  - Sekarang, hanya `todo` yang benar-benar relevan (masih tertunda dan sudah jatuh tempo) yang akan diproses.

---

## Bagian 2: Lapisan Logika Bisnis (`TodoService`)

### Isu 2.1: Tidak Ada Validasi Input

- **Masalah:**
  - `createTodo` tidak memvalidasi input sama sekali. Pengguna bisa membuat `todo` dengan `title` kosong atau `todo` untuk `userId` yang tidak ada dalam sistem.
- **Solusi:**
  - Menambahkan logika validasi di awal fungsi `createTodo`:
    1.  Memeriksa apakah `title` tidak kosong (setelah di-trim).
    2.  Menggunakan `userRepo.findById()` untuk memastikan `userId` yang diberikan valid dan ada.
  - Jika validasi gagal, fungsi akan melempar *error* yang jelas.

---

### Isu 2.2: Pesan Error Terlalu Umum

- **Masalah:**
  - Layanan hanya melempar error generik seperti `new Error("Not found")`. Ini menyulitkan klien API untuk memberikan umpan balik yang benar kepada pengguna, karena tidak jelas apa yang "tidak ditemukan".
- **Solusi:**
  - Mengganti pesan *error* generik menjadi pesan yang lebih spesifik dan kontekstual, seperti `"User not found"` atau `"Todo not found"`.
  - Ini memungkinkan *error handler* di lapisan API untuk memberikan kode status HTTP yang tepat (misalnya, `404 Not Found`) dengan pesan yang lebih bermakna.

---

## Bagian 3: Pemrosesan Latar Belakang (`SimpleScheduler`)

### Isu 3.1: Scheduler Tidak Kuat (Rawan Crash)

- **Masalah:**
  - Jika tugas yang dijadwalkan (`fn`) mengalami *error* saat dieksekusi, *error* tersebut tidak ditangani. Ini akan menyebabkan seluruh proses server Node.js berhenti (*crash*).
- **Solusi:**
  - Membungkus pemanggilan `fn()` di dalam blok `try...catch`.
  - Menambahkan logika untuk menangani *Promise* yang mungkin dikembalikan oleh `fn()`, dengan melampirkan `.catch()` untuk menangani *error* asinkron.
  - Setiap *error* yang terjadi sekarang akan dicatat ke konsol tanpa menghentikan aplikasi.

---

### Isu 3.2: Potensi Kebocoran Sumber Daya (Resource Leak)

- **Masalah:**
  - Memanggil `scheduleRecurring` beberapa kali dengan `name` yang sama akan membuat beberapa interval berjalan secara bersamaan, sementara hanya referensi interval terakhir yang disimpan. Interval sebelumnya menjadi "yatim" dan tidak bisa dihentikan.
- **Solusi:**
  - Sebelum membuat `setInterval` baru, *scheduler* sekarang memeriksa apakah sudah ada tugas dengan nama yang sama.
  - Jika ada, tugas lama akan dihentikan (`stop()`) terlebih dahulu sebelum yang baru dimulai. Ini memastikan hanya ada satu tugas aktif per nama.

---

## Bagian 4: Implementasi Server API (Express.js)

### Isu 4.1: API Belum Tersedia

- **Masalah:**
  - Kode inti tidak dapat digunakan karena tidak ada antarmuka eksternal seperti REST API.
- **Solusi:**
  - Mengimplementasikan server REST API menggunakan **Express.js**.
  - Menambahkan *endpoint* yang diperlukan (`POST /users`, `POST /todos`, `GET /todos?userId=...`, `PATCH /todos/:id/complete`).
  - Menyiapkan *middleware* penting seperti `express.json` untuk *parsing body* dan `cors` untuk dukungan lintas-origin.
  - Membuat *error handler middleware* khusus untuk menangani *error* dari lapisan layanan dan mengubahnya menjadi respons HTTP yang sesuai (misalnya, status `400`, `404`, `500`).

---

## Bagian 5: Pengkabelan Aplikasi (`app/main.ts`)

### Isu 5.1: Aplikasi Tidak Di-bootstrap

- **Masalah:**
  - File `main.ts` hanya berisi kerangka dan tidak menginisialisasi atau menjalankan komponen apa pun.
- **Solusi:**
  - Menulis ulang `main.ts` untuk menjadi titik masuk aplikasi yang sebenarnya.
  - File ini sekarang melakukan *dependency injection*: membuat *instance repository*, lalu menyuntikkannya ke `TodoService`, dan akhirnya menyuntikkan layanan tersebut ke server HTTP.
  - File ini juga bertanggung jawab untuk memulai *scheduler* dan server HTTP, serta menangani *graceful shutdown*.
