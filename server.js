const express = require('express');
const multer = require('multer');
const tf = require('@tensorflow/tfjs-node'); // TensorFlow.js
const uuidv4 = require('uuid').v4;
const app = express();
const port = 3000;

// Setup multer untuk upload gambar
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // Maksimum ukuran file 1MB
}).single('image'); // Pastikan field yang digunakan adalah 'image'

// Load model TensorFlow.js dari Google Cloud Storage
let model;
async function loadModel() {
  model = await tf.loadGraphModel('https://storage.googleapis.com/asclepius-bucket-dgs/model/model.json');
  console.log('Model loaded successfully');
}
loadModel();

// Endpoint predict (POST)
app.post('/predict', (req, res) => {
  upload(req, res, async (err) => {
    // Penanganan error jika file terlalu besar
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        status: 'fail',
        message: 'Payload content length greater than maximum allowed: 1000000'
      });
    }

    // Penanganan error lain jika terjadi masalah saat upload file
    if (err) {
      return res.status(400).json({
        status: 'fail',
        message: 'Terjadi kesalahan dalam mengunggah gambar'
      });
    }

    // Jika tidak ada gambar yang diupload
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Gambar tidak ditemukan dalam permintaan'
      });
    }

    try {
      // Decode gambar menjadi tensor
      const imageBuffer = req.file.buffer;
      const imageTensor = tf.node.decodeImage(imageBuffer)
        .resizeBilinear([224, 224]) // Resize ke dimensi model
        .expandDims(0) // Tambah batch dimension
        .toFloat();

      // Log tensor image size and type
      console.log('Image Tensor:', imageTensor.shape);

      // Prediksi menggunakan model
      const prediction = await model.predict(imageTensor).data();
      console.log('Prediction result:', prediction); // Debugging prediksi

      // Ambil nilai prediksi pertama (prediksi hanya satu kelas dalam kasus binary classification)
      const predictionValue = prediction[0];

      // Debugging nilai prediksi
      console.log('Prediction value:', predictionValue);

      // Tentukan ambang batas untuk klasifikasi Cancer
      const threshold = 0.5; // Ambang batas standar
      const isCancer = predictionValue > threshold;

      // Debugging hasil prediksi
      console.log('Is cancer prediction:', isCancer);

      // Response sukses dengan status 201
      return res.status(201).json({
        status: 'success',
        message: 'Model is predicted successfully',
        data: {
          id: uuidv4(),
          result: isCancer ? 'Cancer' : 'Non-cancer', // Mengubah output berdasarkan hasil prediksi
          suggestion: isCancer ? 'Segera periksa ke dokter!' : 'Penyakit kanker tidak terdeteksi.',
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      // Jika terjadi error saat proses prediksi
      console.error('Prediction error:', error); // Debug error
      return res.status(400).json({
        status: 'fail',
        message: 'Terjadi kesalahan dalam melakukan prediksi'
      });
    }
  });
});

// Endpoint GET untuk pengecekan server
app.get('/', (req, res) => {
  res.send('Server berjalan dengan baik!');
});

// Jalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
