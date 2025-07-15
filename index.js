const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/verificar', async (req, res) => {
  const { nombres, apellido1, apellido2 } = req.body;

  if (!nombres || !apellido1 || !apellido2) {
    return res.status(400).json({ error: 'Faltan datos.' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto('https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Esperar que los inputs estén visibles
    await page.waitForSelector('input[name=nombre]', { timeout: 15000 });
    await page.waitForSelector('input[name=paterno]', { timeout: 15000 });
    await page.waitForSelector('input[name=materno]', { timeout: 15000 });

    // Escribir en los campos
    await page.type('input[name=nombre]', nombres, { delay: 30 });
    await page.type('input[name=paterno]', apellido1, { delay: 30 });
    await page.type('input[name=materno]', apellido2, { delay: 30 });

// Clic en el botón "Consultar"
await page.evaluate(() => {
  const span = document.querySelector('#dijit_form_Button_0_label');
  if (span) span.click();
});




// ⏳ Espera unos segundos para ver qué pasa en pantalla
await new Promise(resolve => setTimeout(resolve, 3000));


// Luego intenta esperar la tabla
await page.waitForSelector('table tbody tr', { timeout: 15000 });

// Espera a que aparezca la tabla de resultados
await page.waitForSelector('table tbody tr', { timeout: 15000 });




    // Extraer resultados de la tabla
const data = await page.evaluate(() => {
  const fila = document.querySelector('.dojoxGridRow');
  if (!fila) return null;

  const celdas = fila.querySelectorAll('td');
  if (celdas.length < 5) return null;

  return {
    cedula_encontrada: celdas[0].innerText.trim(),
    nombre_encontrado: [
      celdas[1].innerText.trim(),
      celdas[2].innerText.trim(),
      celdas[3].innerText.trim()
    ].join(' '),
    tipo: celdas[4].innerText.trim()
  };
});

    await browser.close();

    if (!data || !data.cedula_encontrada) {
  return res.json({
    cedula_encontrada: null,
    nombre_encontrado: null,
    tipo: null
  });
}


    res.json(data);

  } catch (error) {
    console.error('Error en puppeteer:', error);
    res.status(500).json({ error: 'Error en verificación con SEP.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor de verificación activo en http://localhost:${PORT}`);
});
