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
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqenVzb3pscHZ5dnFha3VxdW5k..."; // 🔐 reemplaza con clave real segura
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// TASA DE CAMBIO
let tasaCambio = 0;

async function obtenerTasa() {
  try {
    const resp = await fetch("https://api.exchangerate.host/convert?access_key=a6ffcd270ac0cc922a05714cd8b7fd57&from=COP&to=VES&amount=1");
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

  const envio = monto * 0.05;
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
    contenedor.innerHTML = `<input type="text" id="cuentaReceptor" placeholder="Número de cuenta bancaria" required />`;
  } else if (tipo === "pagoMovil") {
    contenedor.innerHTML = `
      <input type="text" id="cuentaReceptor" placeholder="Teléfono (pago móvil)" required />
      <input type="text" id="cedulaReceptor" placeholder="Cédula" required />

      <select id="bancoReceptor" required>
        <option value="" disabled selected>Seleccione tipo de banco</option>
        <option value="Mercantil">Mercantil</option>
        <option value="Banesco">Banesco</option>
        <option value="Venezuela">Banco de Venezuela</option>
        <option value="Provincial">Provincial</option>
        <option value="Tesoro">Banco del Tesoro</option>
        <option value="Otro">Otro</option>
      </select>

      <input type="text" id="bancoOtro" placeholder="Ingrese nombre del banco" style="display: none; margin-top: 8px;" />
    `;

    // Configurar la lógica del "Otro" para que aparezca y sea obligatorio
    const bancoSelect = contenedor.querySelector("#bancoReceptor");
    const bancoOtroInput = contenedor.querySelector("#bancoOtro");

    bancoSelect.addEventListener("change", function () {
      if (this.value === "Otro") {
        bancoOtroInput.style.display = "block";
        bancoOtroInput.setAttribute("required", "true");
      } else {
        bancoOtroInput.style.display = "none";
        bancoOtroInput.removeAttribute("required");
        bancoOtroInput.value = "";
      }
    });
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

// VALIDACIÓN ESPECIAL PARA PAGO MÓVIL
function validarPagoMovilSiAplica(bancoVe) {
  if (bancoVe !== "pagoMovil") return { ok: true };

  const cuentaReceptor = document.getElementById("cuentaReceptor");
  const cedulaReceptor = document.getElementById("cedulaReceptor");
  const bancoReceptor = document.getElementById("bancoReceptor");
  const bancoOtro = document.getElementById("bancoOtro");

  if (!cuentaReceptor || !cedulaReceptor || !bancoReceptor) {
    return { ok: false, msg: "Faltan campos del pago móvil." };
  }

  if (!cuentaReceptor.value.trim() || !cedulaReceptor.value.trim()) {
    return { ok: false, msg: "Completa teléfono y cédula del receptor." };
  }

  if (!bancoReceptor.value) {
    return { ok: false, msg: "Selecciona el banco móvil." };
  }

  if (bancoReceptor.value === "Otro") {
    if (!bancoOtro || !bancoOtro.value.trim()) {
      return { ok: false, msg: "Debes ingresar el nombre del banco cuando eliges 'Otro'." };
    }
  }

  return { ok: true };
}

// CONFIRMAR ENVÍO
async function confirmarEnvio() {
  const nombre = document.getElementById("nombre")?.value.trim();
  const apellido = document.getElementById("apellido")?.value.trim();
  const bancoVe = document.getElementById("bancoVe")?.value;
  const pagador = document.getElementById("nombrePagador")?.value.trim();
  const bancoCo = document.getElementById("bancoCo")?.value;
  const telefono = document.getElementById("telefono")?.value.trim();

  // Validar campos básicos
  if (!nombre || !apellido || !bancoVe || !pagador || !bancoCo || !telefono) {
    alert("❌ Por favor, completa todos los campos obligatorios (nombre, apellido, bancos, pagador y teléfono).");
    return;
  }

  // Validar pago móvil si aplica
  const validacionPagoMovil = validarPagoMovilSiAplica(bancoVe);
  if (!validacionPagoMovil.ok) {
    alert("❌ " + validacionPagoMovil.msg);
    return;
  }

  // Obtener la cuenta / receptor dependiendo del tipo
  let cuenta = "";
  if (bancoVe === "pagoMovil") {
    cuenta = document.getElementById("cuentaReceptor")?.value.trim(); // teléfono
    // validar formato de "cuenta" (teléfono) si necesitas
  } else {
    cuenta = document.getElementById("cuentaReceptor")?.value.trim(); // número de cuenta bancaria
  }

  if (!cuenta) {
    alert("❌ El receptor debe tener una cuenta o teléfono válido.");
    return;
  }

  // Validación de formato de cuenta (solo si es número de cuenta bancaria)
  if (bancoVe !== "pagoMovil" && !/^[0-9]{6,20}$/.test(cuenta)) {
    alert("❌ El número de cuenta debe tener solo números (6 a 20 dígitos).");
    return;
  }

  // Construir qué banco móvil se usó (si aplica)
  let bancoVeFinal = bancoVe;
  if (bancoVe === "pagoMovil") {
    const bancoReceptor = document.getElementById("bancoReceptor")?.value;
    if (!bancoReceptor) {
      alert("❌ Selecciona el banco móvil.");
      return;
    }
    if (bancoReceptor === "Otro") {
      const bancoOtro = document.getElementById("bancoOtro")?.value.trim();
      if (!bancoOtro) {
        alert("❌ Ingresa el nombre del banco móvil.");
        return;
      }
      bancoVeFinal = `pagoMovil - ${bancoOtro}`;
    } else {
      bancoVeFinal = `pagoMovil - ${bancoReceptor}`;
    }
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
    banco_ve: bancoVeFinal,
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

// Escuchadores para selects de bancos para que carguen sus campos dinámicos
document.getElementById("bancoVe")?.addEventListener("change", actualizarCamposBancoVE);
document.getElementById("bancoCo")?.addEventListener("change", actualizarCamposBancoCO);

// Si ya hay un valor preseleccionado al cargar se inicializan los campos
if (document.getElementById("bancoVe")) actualizarCamposBancoVE();
if (document.getElementById("bancoCo")) actualizarCamposBancoCO();


