# Usa una imagen base de Node.js
FROM node:16

# Establecer el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar el package.json y package-lock.json
COPY package*.json ./

# Instalar las dependencias
RUN npm install

# Copiar el resto del código de la aplicación
COPY . .

# Exponer el puerto donde se ejecuta la app
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
