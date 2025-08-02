const montoInput = document.getElementById("monto");
const resultadoEl = document.getElementById("resultado");
const costoEnvioEl = document.getElementById("costoEnvio");
const montoConvertirEl = document.getElementById("montoConvertir");
const tipoCambioEl = document.getElementById("tipoCambio");
const fechaEntregaEl = document.getElementById("fechaEntrega");

let tasaCambio = 0;

async function obtenerTasa() {
  try {
    const resp = await fetch("https://api.exchangerate.host/convert?from=COP&to=VES");
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

function abrirModal() {
  document.getElementById("modal").style.display = "block";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}

function actualizarCamposBancoVE() {
  const tipo = document.getElementById("bancoVe").value;
  const contenedor = document.getElementById("camposVE");
  contenedor.innerHTML = "";

  if (tipo === "banesco" || tipo === "venezuela") {
    contenedor.innerHTML = `
      <input type="text" id="cuentaReceptor" placeholder="Número de cuenta bancaria" />
    `;
  } else if (tipo === "pagoMovil") {
    contenedor.innerHTML = `
      <input type="text" id="cuentaReceptor" placeholder="Teléfono (pago móvil)" />
      <input type="text" id="cuentaReceptor" placeholder="Cédula" />
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

function confirmarEnvio() {
  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const cuenta = document.getElementById("cuentaReceptor").value.trim();
  const bancoVe = document.getElementById("bancoVe").value;
  const pagador = document.getElementById("nombrePagador").value.trim();
  const bancoCo = document.getElementById("bancoCo").value;
  const telefono = document.getElementById("telefono").value.trim();

  if (!nombre || !apellido || !cuenta || !bancoVe || !pagador || !bancoCo) {
    alert("❌ Por favor, completa todos los campos.");
    return;
  }

  if (!/^[0-9]{6,20}$/.test(cuenta)) {
    alert("❌ El número de cuenta debe tener solo números.");
    return;
  }

  const datos = {
    nombre,
    apellido,
    bancoVe,
    cuenta,
    pagador,
    bancoCo,
    telefono
  };

  fetch("https://script.google.com/macros/s/AKfycbxb8oyTWa63QCJdJH7PWpfTQoNDYr3TxBxuhN7anwmOHpnEyKpB3LmK248eMtLiv8ab/exec", {  // REEMPLAZA con tu URL
    method: "POST",
    body: JSON.stringify(datos),
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(res => res.text())
    .then(respuesta => {
      alert("✅ Datos enviados correctamente.");
      cerrarModal();
    })
    .catch(error => {
      console.error("Error:", error);
      alert("❌ Hubo un problema al enviar los datos.");
    });
}


const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const lightbox = document.getElementById("lightboxOverlay");
const lightboxImg = lightbox.querySelector("img");

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

montoInput.addEventListener("input", calcular);
obtenerTasa();
calcularFechaEntrega();
