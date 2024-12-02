require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');  // Para las rutas de las vistas
const fs = require('fs');  // Para manipular archivos

console.log(process.env)

const app = express();
const port = process.env.PORT || 5000;

// Configura EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));  // Asegúrate de tener una carpeta "views" en tu proyecto

// Habilitar CORS
app.use(cors());

// Para manejar las solicitudes con JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Lista de URLs que vamos a scrapear
let urls = [
    
   
];


// Función para hacer scraping de las URLs
async function scrapeUrl(url, isFirst) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const noticias = [];
        const titulo = $('h1.c-detail__title').text().trim();
        if (titulo) {
            const resumen = $('.c-detail__summary').text().trim();
            const imagen = isFirst ? $('meta[property="og:image"]').attr('content') : '';
            const link = url;

            noticias.push({
                titulo,
                resumen,
                link,
                imagen: imagen || 'no-image.jpg',
            });
        }
        return noticias;
    } catch (error) {
        console.error(`Error al hacer scraping de la URL: ${url}`, error);
        return [];
    }
}

// Ruta para hacer scraping de todas las URLs y generar el boletín
app.get('/scrape', async (req, res) => {
    let allNoticias = [];
    let isFirst = true;

    for (const url of urls) {
        const noticias = await scrapeUrl(url, isFirst);
        allNoticias = allNoticias.concat(noticias);
        isFirst = false;
    }

    // Renderizar la plantilla EJS con las noticias obtenidas
    res.render('boletin', { noticias: allNoticias });
});

// Ruta para generar y descargar el boletín como archivo HTML
app.get('/descargar-boletin', async (req, res) => {
    let allNoticias = [];
    let isFirst = true;

    // Generar el boletín como se hacía en la ruta /scrape
    for (const url of urls) {
        const noticias = await scrapeUrl(url, isFirst);
        allNoticias = allNoticias.concat(noticias);
        isFirst = false;
    }

    // Renderizar el boletín a HTML (sin enviarlo al navegador aún)
    const htmlContent = await new Promise((resolve, reject) => {
        res.render('boletin', { noticias: allNoticias }, (err, html) => {
            if (err) reject(err);
            else resolve(html);
        });
    });

        // Guardar el contenido como archivo .html en la carpeta 'public'
        const filePath = path.join(__dirname, 'public', 'boletin.html');
        fs.writeFile(filePath, htmlContent, (err) => {
            if (err) {
                console.error('Error al guardar el archivo HTML:', err);
                return res.status(500).send('Error al generar el boletín.');
            }
    
            // Enviar el archivo para descarga
            res.download(filePath, 'boletin.html', (err) => {
                if (err) {
                    console.error('Error al descargar el archivo:', err);
                }
                // Eliminar el archivo después de la descarga
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error al eliminar el archivo temporal:', err);
                });
            });
        });
    });

// Ruta para recibir las URLs desde el formulario y actualizarlas
app.post('/api/guardar-urls', (req, res) => {
    const { urls: nuevasUrls } = req.body;

    // Validar que las URLs sean un arreglo y tenga 7 URLs
    if (Array.isArray(nuevasUrls) && nuevasUrls.length === 7) {
        urls = nuevasUrls;  // Reemplazar las URLs actuales por las nuevas
        res.json({ message: 'URLs actualizadas correctamente' });
    } else {
        res.status(400).json({ message: 'El formato de las URLs es incorrecto' });
    }
});

// Ruta para hacer scraping de todas las URLs y generar el boletín
app.get('/scrape', async (req, res) => {
    let allNoticias = [];
    let isFirst = true;

    // Usar la lista de URLs actualizada
    for (const url of urls) {
        const noticias = await scrapeUrl(url, isFirst);
        allNoticias = allNoticias.concat(noticias);
        isFirst = false;
    }

    // Renderizar la plantilla EJS con las noticias obtenidas
    res.render('boletin', { noticias: allNoticias });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
