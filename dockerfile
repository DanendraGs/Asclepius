# Gunakan image resmi Node.js
FROM node:18

# Set direktori kerja di dalam container
WORKDIR /usr/src/app

# Salin package.json dan install dependencies
COPY package*.json ./
RUN npm install

# Salin sisa aplikasi ke dalam container
COPY . .

# Expose port 8080 (sesuaikan dengan port aplikasi Anda)
EXPOSE 8080

# Jalankan aplikasi
CMD ["node", "app.js"]
