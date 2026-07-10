// ==========================================================================
// CONFIGURACIÓN GLOBAL Y ESTRUCTURA DE DATOS
// ==========================================================================
const CENTROS_POR_PARROQUIA = {
    "Parroquia Los Taques": ["C.E.I. Andrés Bello", "C.E.I. Los Taques", "E.B.B. Amuay", "E.B.B. Cumujacoa", "E.B.B. El Hoyito", "E.B.B. Jayana", "E.B. B. El Tacal", "E.B. José Antonio Velasco", "E.B.N. El Oasis", "E.B. Guanadito", "L.N.B. Pedro Antonio Leleux"],
    "Parroquia Judibana": ["C.E. Simón Bolívar", "E.B.B. 4 de Febrero", "E.B.B. Creolandia", "E.B.B. Don Rómulo Betancourt", "L.N. Hugo Rafael Chavez", "C.E. Don Bosco"]
};

let listaEmpadronados = [];
let origenElectoralActual = 'local'; 
let datosEmpadronador = { nombre: '', apellido: '', cedula: '' };
let tieneTelefonoActual = 'no';

// ==========================================================================
// CONTROLADORES DE EVENTOS DE INTERFAZ (DOMContentLoaded)
// ==========================================================================
document.addEventListener("DOMContentLoaded", function() {
    // Inicialización de Estados y Almacenamiento Local
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    if (localStorage.getItem('listaEmpadronadosLocal')) {
        try { 
            listaEmpadronados = JSON.parse(localStorage.getItem('listaEmpadronadosLocal')); 
        } catch(e) { console.error("Error al parsear el listado local.", e); }
    }
    if (localStorage.getItem('datosEmpadronadorDefinitivoLocal')) {
        try {
            datosEmpadronador = JSON.parse(localStorage.getItem('datosEmpadronadorDefinitivoLocal'));
            if (datosEmpadronador.nombre && datosEmpadronador.cedula) {
                inyectarDatosOperadorPantalla();
                document.getElementById('view-welcome').classList.remove('active');
                document.getElementById('view-form').classList.add('active');
                actualizarListaVisual();
            }
        } catch(e) { console.error("Error al cargar los datos del empadronador.", e); }
    }
    if (localStorage.getItem('jornadaParroquiaLocal')) {
        document.getElementById('jor-parroquia').value = localStorage.getItem('jornadaParroquiaLocal');
        cargarCentrosJornadaBase();
        if (localStorage.getItem('jornadaCentroLocal')) {
            document.getElementById('jor-centro-base').value = localStorage.getItem('jornadaCentroLocal');
        }
    }

    // Asignación Eventos Principales a Nodos del DOM
    document.getElementById('theme-btn').addEventListener('click', toggleTheme);
    document.getElementById('btn-ingresar').addEventListener('click', procesarInicioManual);
    document.getElementById('btn-finalizar').addEventListener('click', finalizarEmpadronamiento);
    document.getElementById('jor-parroquia').addEventListener('change', cargarCentrosJornadaBase);
    document.getElementById('btn-agregar-hijo').addEventListener('click', () => agregarCampoHijo());
    document.getElementById('btn-agregar-familiar').addEventListener('click', () => agregarCampoFamiliar());
    document.getElementById('toggle-local').addEventListener('click', () => setOrigenElectoral('local'));
    document.getElementById('toggle-foraneo').addEventListener('click', () => setOrigenElectoral('foraneo'));
    
    // Eventos Nuevos para el Switch de Teléfono
    document.getElementById('toggle-tel-no').addEventListener('click', () => setTieneTelefono('no'));
    document.getElementById('toggle-tel-si').addEventListener('click', () => setTieneTelefono('si'));

    document.getElementById('cit-parroquia').addEventListener('change', () => cargarCentrosPorParroquia());
    document.getElementById('buscador-interno').addEventListener('input', filtrarListaVisual);
    document.getElementById('btn-clear-all').addEventListener('click', botonBorrarTodaLaListaManual);
    document.getElementById('btn-download').addEventListener('click', generarPDFReal);
    
    // Delegación delegada para el botón submit principal
    document.getElementById('form-buttons-container').addEventListener('click', function(e) {
        if (e.target && e.target.id === 'btn-submit') {
            guardarRegistro();
        }
    });
});

// ==========================================================================
// LÓGICA DE CONTROL DE VISTAS Y JORNADAS
// ==========================================================================
function cargarCentrosJornadaBase() {
    const jParroquia = document.getElementById('jor-parroquia').value;
    const selectCentroBase = document.getElementById('jor-centro-base');
    localStorage.setItem('jornadaParroquiaLocal', jParroquia);
    
    selectCentroBase.innerHTML = '';
    if (!jParroquia) return;
    
    let html = '<option value="" disabled selected>-- Seleccione Centro de Votación --</option>';
    CENTROS_POR_PARROQUIA[jParroquia].forEach(c => {
        html += `<option value="${c}">${c}</option>`;
    });
    selectCentroBase.innerHTML = html;
    
    selectCentroBase.onchange = function() {
        localStorage.setItem('jornadaCentroLocal', selectCentroBase.value);
    };
}

function setOrigenElectoral(tipo) {
    origenElectoralActual = tipo;
    const btnLocal = document.getElementById('toggle-local');
    const btnForaneo = document.getElementById('toggle-foraneo');
    const boxLocal = document.getElementById('wrapper-electoral-local');
    const boxForaneo = document.getElementById('wrapper-electoral-foraneo');

    if (tipo === 'local') {
        btnLocal.classList.add('active'); btnForaneo.classList.remove('active');
        boxLocal.style.display = 'block'; boxForaneo.style.display = 'none';
    } else {
        btnForaneo.classList.add('active'); btnLocal.classList.remove('active');
        boxLocal.style.display = 'none'; boxForaneo.style.display = 'block';
    }
}

// Nueva función para gestionar el switch de teléfono
function setTieneTelefono(opcion) {
    tieneTelefonoActual = opcion;
    const btnNo = document.getElementById('toggle-tel-no');
    const btnSi = document.getElementById('toggle-tel-si');
    const inputTel = document.getElementById('cit-telefono');

    if (opcion === 'si') {
        btnSi.classList.add('active'); btnNo.classList.remove('active');
        inputTel.disabled = false; inputTel.style.opacity = '1'; inputTel.focus();
    } else {
        btnNo.classList.add('active'); btnSi.classList.remove('active');
        inputTel.disabled = true; inputTel.style.opacity = '0.5'; inputTel.value = '';
    }
}

function inyectarDatosOperadorPantalla() {
    document.getElementById('lbl-emp-nombre').innerText = `${datosEmpadronador.nombre} ${datosEmpadronador.apellido}`.toUpperCase();
    document.getElementById('lbl-emp-cedula').innerText = `C.I. ${datosEmpadronador.cedula}`;
}

function procesarInicioManual() {
    const nom = document.getElementById('emp-nombre').value.trim();
    const ape = document.getElementById('emp-apellido').value.trim();
    const ced = document.getElementById('emp-cedula').value.trim().replace(/\D/g, '');

    if (!nom || !ape || !ced) {
        alert("⚠️ Por favor, rellene todos los campos para ingresar al sistema.");
        return;
    }

    datosEmpadronador = { nombre: nom, apellido: ape, cedula: ced };
    localStorage.setItem('datosEmpadronadorDefinitivoLocal', JSON.stringify(datosEmpadronador));
    
    inyectarDatosOperadorPantalla();
    document.getElementById('view-welcome').classList.remove('active');
    document.getElementById('view-form').classList.add('active');
    actualizarListaVisual();
}

// CORRECCIÓN: Borrar configuración de zona (parroquia y centro base) al salir
function finalizarEmpadronamiento() {
    if (confirm("¿Cerrar sesión?")) {
        localStorage.removeItem('datosEmpadronadorDefinitivoLocal');
        localStorage.removeItem('jornadaParroquiaLocal');
        localStorage.removeItem('jornadaCentroLocal');
        
        // Resetear visualmente los select de la jornada
        document.getElementById('jor-parroquia').value = '';
        document.getElementById('jor-centro-base').innerHTML = '<option value="" disabled selected>-- Seleccione Primero la Parroquia --</option>';

        document.getElementById('view-form').classList.remove('active');
        document.getElementById('view-welcome').classList.add('active');
    }
}

// ==========================================================================
// ENTRADAS DINÁMICAS (HIJOS, FAMILIARES Y CENTROS DE VOTACIÓN)
// ==========================================================================
function cargarCentrosPorParroquia(centroSeleccionado = '') {
    const parroquia = document.getElementById('cit-parroquia').value;
    const selectCentro = document.getElementById('cit-centro');
    selectCentro.innerHTML = '';
    if (!parroquia) return;
    let html = '<option value="" disabled selected>-- Seleccione un centro --</option>';
    CENTROS_POR_PARROQUIA[parroquia].forEach(c => {
        html += `<option value="${c}" ${c === centroSeleccionado ? 'selected' : ''}>${c}</option>`;
    });
    selectCentro.innerHTML = html;
}

function agregarCampoHijo(c='', e='V') {
    const container = document.getElementById('dynamic-hijos-container');
    const div = document.createElement('div'); div.className = 'dynamic-field-wrapper';
    div.innerHTML = `<div class="flex-grow"><input type="tel" class="cit-hijo-adicional" value="${c}" placeholder="Cédula hijo"></div>
        <div><select class="cit-hijo-adicional-estatus select-status-small"><option value="V" ${e==='V'?'selected':''}>Vivo</option><option value="F" ${e==='F'?'selected':''}>Fallecido</option></select></div>
        <button type="button" class="btn" style="width:auto; background:#E74C3C; color:white; height:45px;" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(div);
}

function agregarCampoFamiliar(c='', e='V') {
    const container = document.getElementById('dynamic-family-container');
    const div = document.createElement('div'); div.className = 'dynamic-field-wrapper';
    div.innerHTML = `<div class="flex-grow"><input type="tel" class="cit-familiar-adicional" value="${c}" placeholder="C.I. Familiar"></div>
        <div><select class="cit-familiar-adicional-estatus select-status-small"><option value="V" ${e==='V'?'selected':''}>Vivo</option><option value="F" ${e==='F'?'selected':''}>Fallecido</option></select></div>
        <button type="button" class="btn" style="width:auto; background:#E74C3C; color:white; height:45px;" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(div);
}

// ==========================================================================
// PROCESAMIENTO CRUD (GUARDAR, EDITAR, ELIMINAR, LIMPIAR)
// ==========================================================================
function guardarRegistro() {
    const idx = parseInt(document.getElementById('edit-index').value);
    const nombre = document.getElementById('cit-nombre').value.trim();
    const apellido = document.getElementById('cit-apellido').value.trim();
    const cedula = document.getElementById('cit-cedula').value.trim().replace(/\D/g, '');
    
    // Condicionar teléfono según el switch activo
    let telefono = 'N/A';
    if (tieneTelefonoActual === 'si') {
        const telValue = document.getElementById('cit-telefono').value.trim();
        if (telValue) telefono = telValue;
    }
    
    let parroquia = "EXTERNO / OTRA";
    let centro = "";

    if (origenElectoralActual === 'local') {
        parroquia = document.getElementById('cit-parroquia').value;
        centro = document.getElementById('cit-centro').value;
        if (!parroquia || !centro) { showToast("⚠️ Seleccione parroquia y centro del ciudadano."); return; }
    } else {
        centro = document.getElementById('cit-centro-foraneo').value.trim();
        if (!centro) { showToast("⚠️ Escriba el centro electoral foráneo."); return; }
    }

    if (!nombre || !apellido || !cedula) { showToast("⚠️ Complete campos obligatorios."); return; }

    let hijos = [];
    document.querySelectorAll('.cit-hijo-adicional').forEach((input, i) => {
        const ci = input.value.trim().replace(/\D/g, '');
        const est = document.querySelectorAll('.cit-hijo-adicional-estatus')[i].value;
        if (ci) hijos.push({ cedula: ci, estatus: est });
    });

    let familiares = [];
    const h = document.getElementById('cit-hermano').value.trim().replace(/\D/g, '');
    if (h) familiares.push({ cedula: h, estatus: document.getElementById('cit-hermano-estatus').value });
    
    document.querySelectorAll('.cit-familiar-adicional').forEach((input, i) => {
        const ci = input.value.trim().replace(/\D/g, '');
        const est = document.querySelectorAll('.cit-familiar-adicional-estatus')[i].value;
        if (ci) familiares.push({ cedula: ci, estatus: est });
    });

    const madreCi = document.getElementById('cit-madre').value.replace(/\D/g,'');
    const madreEst = document.getElementById('cit-madre-estatus').value;
    const padreCi = document.getElementById('cit-padre').value.replace(/\D/g,'');
    const padreEst = document.getElementById('cit-padre-estatus').value;
    const conyugeCi = document.getElementById('cit-conyuge').value.replace(/\D/g,'');
    const conyugeEst = document.getElementById('cit-conyuge-estatus').value;

    const obj = {
        nombre, apellido, cedula, telefono, parroquia, centro, hijos, familiares,
        origenElectoral: origenElectoralActual,
        tieneTelefono: tieneTelefonoActual,
        madre: madreCi, madreEstatus: madreEst,
        padre: padreCi, padreEstatus: padreEst,
        conyuge: conyugeCi, conyugeEstatus: conyugeEst
    };

    if (idx === -1) { 
        listaEmpadronados.push(obj); 
    } else { 
        listaEmpadronados[idx] = obj; 
        cancelarEdicion(); 
    }
    
    localStorage.setItem('listaEmpadronadosLocal', JSON.stringify(listaEmpadronados));
    
    actualizarListaVisual();
    limpiarFormularioCompleto();
    showToast("🎉 Datos guardados de forma segura.");
}

function limpiarFormularioCompleto() {
    document.getElementById('cit-nombre').value = ''; document.getElementById('cit-apellido').value = ''; document.getElementById('cit-cedula').value = '';
    document.getElementById('cit-madre').value = ''; document.getElementById('cit-padre').value = ''; document.getElementById('cit-conyuge').value = '';
    document.getElementById('cit-telefono').value = ''; document.getElementById('cit-hermano').value = '';
    document.getElementById('cit-centro-foraneo').value = '';
    document.getElementById('dynamic-hijos-container').innerHTML = ''; document.getElementById('dynamic-family-container').innerHTML = '';
    setOrigenElectoral('local');
    setTieneTelefono('no');
}

window.editarElemento = function(index) {
    const c = listaEmpadronados[index];
    document.getElementById('edit-index').value = index;
    document.getElementById('cit-nombre').value = c.nombre;
    document.getElementById('cit-apellido').value = c.apellido;
    document.getElementById('cit-cedula').value = c.cedula;

    if (c.tieneTelefono === 'si') {
        setTieneTelefono('si');
        document.getElementById('cit-telefono').value = c.telefono;
    } else {
        setTieneTelefono('no');
    }

    document.getElementById('cit-madre').value = c.madre || '';
    document.getElementById('cit-madre-estatus').value = c.madreEstatus || 'V';
    document.getElementById('cit-padre').value = c.padre || '';
    document.getElementById('cit-padre-estatus').value = c.padreEstatus || 'V';
    document.getElementById('cit-conyuge').value = c.conyuge || '';
    document.getElementById('cit-conyuge-estatus').value = c.conyugeEstatus || 'V';

    if (c.origenElectoral === 'foraneo') {
        setOrigenElectoral('foraneo');
        document.getElementById('cit-centro-foraneo').value = c.centro;
    } else {
        setOrigenElectoral('local');
        document.getElementById('cit-parroquia').value = c.parroquia || '';
        cargarCentrosPorParroquia(c.centro);
    }

    document.getElementById('dynamic-hijos-container').innerHTML = '';
    if (c.hijos) c.hijos.forEach(h => agregarCampoHijo(h.cedula, h.estatus));
    
    document.getElementById('dynamic-family-container').innerHTML = '';
    if (c.familiares && c.familiares.length > 0) {
        document.getElementById('cit-hermano').value = c.familiares[0].cedula;
        document.getElementById('cit-hermano-estatus').value = c.familiares[0].estatus;
        for (let i = 1; i < c.familiares.length; i++) agregarCampoFamiliar(c.familiares[i].cedula, c.familiares[i].estatus);
    }

    document.getElementById('form-title').innerText = "📝 Editando Registro";
    document.getElementById('form-buttons-container').innerHTML = `<div style="display:flex; gap:10px;"><button class="btn btn-warning flex-grow" onclick="guardarRegistro()">Actualizar</button><button class="btn" style="background:#BDC3C7;" onclick="cancelarEdicion()">Cancelar</button></div>`;
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.cancelarEdicion = function() {
    document.getElementById('edit-index').value = "-1";
    document.getElementById('form-title').innerText = "Sistema de Empadronamiento Municipal";
    document.getElementById('form-buttons-container').innerHTML = `<button id="btn-submit" class="btn btn-primary" style="background-color: var(--accent-color); margin-top:15px;">Empadronar</button>`;
    limpiarFormularioCompleto();
};

function filtrarListaVisual() { actualizarListaVisual(); }

function actualizarListaVisual() {
    const listContainer = document.getElementById('empadronados-lista');
    const vacioText = document.getElementById('lista-vacia');
    const btnDescarga = document.getElementById('btn-download');
    const panelBorrado = document.getElementById('panel-control-borrado');
    const buscador = document.getElementById('buscador-interno').value.toLowerCase().trim();

    document.getElementById('counter').innerText = `${listaEmpadronados.length} / 200`;

    if (listaEmpadronados.length === 0) {
        vacioText.style.display = 'block'; listContainer.innerHTML = '';
        btnDescarga.style.display = 'none'; panelBorrado.style.display = 'none'; return;
    }

    let filtrados = listaEmpadronados.filter(item => item.nombre.toLowerCase().includes(buscador) || item.apellido.toLowerCase().includes(buscador) || item.cedula.includes(buscador));

    if (filtrados.length === 0) {
        vacioText.style.display = 'block'; listContainer.innerHTML = ''; return;
    }

    vacioText.style.display = 'none'; btnDescarga.style.display = 'block'; panelBorrado.style.display = 'block';
    
    let html = '';
    filtrados.reverse().forEach((c) => {
        const badgeExtra = c.origenElectoral === 'foraneo' ? `<span style="background:#E74C3C; color:white; font-size:0.7rem; padding:2px 5px; border-radius:4px; font-weight:bold; margin-left:5px;">FORÁNEO</span>` : '';
        html += `<div class="empadronado-item">
            <strong>${c.nombre} ${c.apellido}</strong> - C.I: ${c.cedula} ${badgeExtra}<br>
            <span style="font-size:0.8rem; color:var(--text-secondary);">Centro: ${c.centro}</span>
            <div class="item-actions"><button class="btn-action-small btn-edit" onclick="editarElemento(${listaEmpadronados.indexOf(c)})">✏️ Editar</button></div>
        </div>`;
    });
    listContainer.innerHTML = html;
}

function obtenerFechaYHoraActual() {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const hora = String(ahora.getHours() % 12 || 12).padStart(2, '0');
    const min = String(ahora.getMinutes()).padStart(2, '0');
    const ampm = ahora.getHours() >= 12 ? 'PM' : 'AM';
    return { stringCompleto: `${dia}/${mes}/${ahora.getFullYear()} — ${hora}:${min} ${ampm}` };
}

function botonBorrarTodaLaListaManual() {
    if (confirm("¿Borrar todos los registros locales? Esto vaciará la lista por completo.")) { 
        listaEmpadronados = []; 
        localStorage.removeItem('listaEmpadronadosLocal'); 
        actualizarListaVisual(); 
    }
}

// ==========================================================================
// MOTOR DE EXPORTACIÓN Y GENERACIÓN DE REPORTES EN PDF (AUTO-TABLE)
// ==========================================================================
function generarPDFReal() {
    if (listaEmpadronados.length === 0) return;

    const jParroquia = document.getElementById('jor-parroquia').value;
    const jCentroBase = document.getElementById('jor-centro-base').value;

    if (!jParroquia || !jCentroBase) {
        alert("⚠️ ATENCIÓN: Debe configurar la 'Parroquia de la Jornada' y el 'Centro de Control Base' en el recuadro superior antes de descargar el PDF.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    let uParroquia = jParroquia.toUpperCase(); 
    let uCentroElectoralBase = jCentroBase.toUpperCase(); 
    const tiempoReporte = obtenerFechaYHoraActual();

    const filasTabla = listaEmpadronados.map((c, i) => {
        let estatusCelda = c.origenElectoral === 'foraneo' ? `CENTRO: ${c.centro.toUpperCase()}` : c.centro.toUpperCase();

        return [
            i + 1, 
            `${c.nombre} ${c.apellido}`, 
            c.cedula,
            c.madre ? `${c.madre} (${c.madreEstatus})` : 'SIN DATOS',
            c.padre ? `${c.padre} (${c.padreEstatus})` : 'SIN DATOS',
            c.conyuge ? `${c.conyuge} (${c.conyugeEstatus})` : 'SIN DATOS',
            c.telefono || 'N/A', // Mantiene N/A si el switch estuvo apagado
            c.hijos && c.hijos.length > 0 ? c.hijos.map(h => `${h.cedula} (${h.estatus})`).join('\n') : 'SIN DATOS',
            c.familiares && c.familiares.length > 0 ? c.familiares.map(f => `${f.cedula} (${f.estatus})`).join('\n') : 'SIN DATOS',
            estatusCelda
        ];
    });

    doc.autoTable({
        body: filasTabla,
        theme: 'grid',
        startY: 42,
        rowPageBreak: 'avoid',
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, valign: 'middle' },
        headStyles: { fillColor: [27, 54, 93], textColor: [255, 255, 255], fontStyle: 'bold' },
        columns: [
            { header: 'N°' }, 
            { header: 'Nombre y Apellido' }, 
            { header: 'Cédula' },
            { header: 'C.I. Madre' }, 
            { header: 'C.I. Padre' }, 
            { header: 'C.I. Cónyuge' },
            { header: 'Teléfono' }, 
            { header: 'Hijos (V/F)' }, 
            { header: 'Familiares (V/F)' },
            { header: 'Centro de Votación / Estatus' }
        ],
        didDrawPage: function () {
            try { doc.addImage(document.getElementById('logo-main').src, 'PNG', 15, 10, 24, 24); } catch (e) {}
            doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(27, 54, 93);
            doc.text("SISTEMA DE EMPADRONAMIENTO MUNICIPAL", 44, 16);
            
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
            doc.text("Estructura Municipal — Vente Los Taques | Jornada de Casa por Casa", 44, 22);
            
            doc.setDrawColor(27, 54, 93); doc.setFillColor(245, 247, 250);
            doc.rect(185, 8, 97, 25, 'FD'); 
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(27, 54, 93);
            doc.text(`TERRITORIO OPERATIVO Y REGISTRURA`, 188, 13);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
            
            doc.text(`ZONA VISITA: ${uParroquia.substring(0,35)}`, 188, 18);
            doc.text(`CENTRO ELECTORAL/CC: ${uCentroElectoralBase.substring(0,34)}`, 188, 23);
            
            doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 20, 20);
            doc.text(`EMISIÓN: ${tiempoReporte.stringCompleto}`, 188, 28); 

            doc.line(15, 36, 282, 36);
        }
    });
                
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60);
    
    let strNombre = `EMPADRONADOR RESPONSABLE: ${datosEmpadronador.nombre} ${datosEmpadronador.apellido}`.toUpperCase();
    let strCargo = `CÉDULA DE IDENTIDAD: ${datosEmpadronador.cedula}`;

    if (finalY > 175) { 
        doc.addPage(); doc.setDrawColor(180, 180, 180); doc.line(15, 25, 115, 25);
        doc.setFont('helvetica', 'bold'); doc.text(strNombre, 15, 30);
        doc.setFont('helvetica', 'normal'); doc.text(strCargo, 15, 35);
    } else { 
        doc.setDrawColor(180, 180, 180); doc.line(15, finalY, 115, finalY);
        doc.setFont('helvetica', 'bold'); doc.text(strNombre, 15, finalY + 5);
        doc.setFont('helvetica', 'normal'); doc.text(strCargo, 15, finalY + 10);
    }

    doc.save(`Reporte_Empadronamiento_${datosEmpadronador.apellido}.pdf`);

    setTimeout(() => {
        if (confirm("¿Deseas vaciar la lista de empadronados para iniciar una nueva jornada limpia?")) {
            listaEmpadronados = [];
            localStorage.removeItem('listaEmpadronadosLocal');
            actualizarListaVisual();
            showToast("🧹 Lista reiniciada con éxito.");
        }
    }, 500);
}

// ==========================================================================
// UTILIDADES ADICIONALES (TEMAS, NOTIFICACIONES TOAST)
// ==========================================================================
function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    if (cur === 'dark') { 
        document.documentElement.removeAttribute('data-theme'); 
        localStorage.setItem('theme', 'light'); 
    } else { 
        document.documentElement.setAttribute('data-theme', 'dark'); 
        localStorage.setItem('theme', 'dark'); 
    }
}

function showToast(m) {
    const t = document.getElementById('toast'); t.innerText = m; t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}
