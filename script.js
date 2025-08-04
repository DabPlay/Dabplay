// ELEMENTOS
const montoInput = document.getElementById("monto");
const resultadoEl = document.getElementById("resultado");
const costoEnvioEl = document.getElementById("costoEnvio");
const montoConvertirEl = document.getElementById("montoConvertir");
const tipoCambioEl = document.getElementById("tipoCambio");
const fechaEntregaEl = document.getElementById("fechaEntrega");

const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const lightbox = document.getElementById("lightboxOverlay");
const lightboxImg = lightbox.querySelector("img");

// SUPABASE CONFIG
const SUPABASE_URL = "https://vjzusozlpvyvqakudhpp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqenVzb3pscHZ5dnFha3VkaHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTYyNjYsImV4cCI6MjA2OTczMjI2Nn0.A8Jh0IR4IhuvlglaGYh69649VGHCAfNKEOAXn2Cw-JE"; // 🔐 pon tu API Key real aquí
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// TASA DE CAMBIO
let tasaCambio = 0;

async function obtenerTasa() {
  try {
    const resp = await fetch("https://api.exchangerate.host/convert?access_key=olzNPL8UXS5QXNJP+qVwxA==siwFxDux9yaqtojG&from=COP&to=VES&amount=1");
    const json = await resp.json();
    tasaCambio = json.result || 0;
  } catch (e) {
    console.error("Error al obtener tasa:", e);
  } finally {
    calcular();
  }
}

function calcular() {
  const monto = parseFloat(montoInput.value) || 0;
  if (monto < 10000) {
    resultadoEl.textContent = "Monto mínimo: 10,000 COP";
    costoEnvioEl.textContent = "-";
    montoConvertirEl.textContent = "-";
    tipoCambioEl.textContent = "-";
    return;
  }

  const envio = monto * 0.07;
  const convertir = monto - envio;

  costoEnvioEl.textContent = envio.toLocaleString("es-CO", { style: "currency", currency: "COP" });
  montoConvertirEl.textContent = convertir.toLocaleString("es-CO", { style: "currency", currency: "COP" });

  if (tasaCambio > 0) {
    const convertido = convertir * tasaCambio;
    resultadoEl.textContent = `${convertido.toFixed(2)} VES`;
    tipoCambioEl.textContent = `1 COP = ${tasaCambio.toFixed(6)} VES`;
  } else {
    resultadoEl.textContent = "Tasa no disponible";
    tipoCambioEl.textContent = "-";
  }
}

function calcularFechaEntrega() {
  const f = new Date();
  f.setDate(f.getDate() + 1);
  fechaEntregaEl.textContent = f.toLocaleDateString('es-CO', { day: '2-digit', month: 'long' });
}

// MODAL
function abrirModal() {
  document.getElementById("modal").style.display = "block";
}
function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}

// CAMPOS BANCO
function actualizarCamposBancoVE() {
  const tipo = document.getElementById("bancoVe").value;
  const contenedor = document.getElementById("camposVE");
  contenedor.innerHTML = "";

  if (tipo === "banesco" || tipo === "venezuela") {
    contenedor.innerHTML = `<input type="text" id="cuentaReceptor" placeholder="Número de cuenta bancaria" />`;
  } else if (tipo === "pagoMovil") {
    contenedor.innerHTML = `
      <input type="text" id="cuentaReceptor" placeholder="Teléfono (pago móvil)" />
      <input type="text" id="cedulaReceptor" placeholder="Cédula" />
    `;
  }
}

function actualizarCamposBancoCO() {
  const tipo = document.getElementById("bancoCo").value;
  const contenedor = document.getElementById("camposCO");
  contenedor.innerHTML = "";

  const cuentas = {
    nequi: "NEQUI - 3506463582",
    daviplata: "DAVIPLATA - No disponible",
    bancolombia: "Cuenta Bancolombia: No disponible",
    qr: `<img src="https://fakeimg.pl/250x250/?text=QR" alt="Código QR de pago">`
  };

  contenedor.innerHTML = `<div>${cuentas[tipo] || ""}</div>`;
}

// SUBIR COMPROBANTE A SUPABASE
async function subirComprobanteArchivo(file) {
  const fileName = `comprobantes/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from("comprobantes")
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error("Error al subir comprobante:", error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("comprobantes")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// CONFIRMAR ENVÍO
async function confirmarEnvio() {
  const nombre = document.getElementById("nombre")?.value.trim();
  const apellido = document.getElementById("apellido")?.value.trim();
  const cuenta = document.getElementById("cuentaReceptor")?.value.trim();
  const bancoVe = document.getElementById("bancoVe")?.value;
  const pagador = document.getElementById("nombrePagador")?.value.trim();
  const bancoCo = document.getElementById("bancoCo")?.value;
  const telefono = document.getElementById("telefono")?.value.trim();

  if (!nombre || !apellido || !cuenta || !bancoVe || !pagador || !bancoCo || !telefono) {
    alert("❌ Por favor, completa todos los campos.");
    return;
  }

  if (!/^[0-9]{6,20}$/.test(cuenta)) {
    alert("❌ El número de cuenta debe tener solo números (6 a 20 dígitos).");
    return;
  }

  const archivo = fileInput.files[0];
  let urlComprobante = "";

  if (archivo) {
    try {
      urlComprobante = await subirComprobanteArchivo(archivo);
    } catch (e) {
      alert("❌ Error al subir comprobante.");
      return;
    }
  }

  const datos = {
    nombre,
    apellido,
    banco_ve: bancoVe,
    cuenta,
    pagador,
    banco_co: bancoCo,
    telefono,
    comprobante: urlComprobante
  };

  try {
    const { error } = await supabase
      .from("transacciones")
      .insert([datos]);

    if (error) throw error;

    alert("✅ Datos enviados correctamente.");
    cerrarModal();
  } catch (err) {
    console.error("Error al insertar:", err);
    alert("❌ Error al enviar los datos.");
  }
}

// PREVISUALIZACIÓN IMAGEN
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  preview.innerHTML = "";

  if (file && file.type.startsWith("image/")) {
    const imgURL = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.src = imgURL;
    img.alt = "Comprobante";
    img.addEventListener("click", () => {
      lightboxImg.src = imgURL;
      lightbox.style.display = "flex";
    });
    preview.appendChild(img);
  } else {
    preview.innerHTML = "<span style='color:red;'>Archivo no válido</span>";
  }
});

lightbox.addEventListener("click", () => {
  lightbox.style.display = "none";
  lightboxImg.src = "";
});

// INICIALIZAR
montoInput.addEventListener("input", calcular);
obtenerTasa();
calcularFechaEntrega();

