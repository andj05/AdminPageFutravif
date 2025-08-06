// admin-script.js

// Configuración de Firebase (usa la misma configuración del formulario)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    query, 
    orderBy, 
    where, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAAnZflJdnUOvpauAM8VROWLlvMo9JUujg",
    authDomain: "formualriofundacion.firebaseapp.com",
    projectId: "formualriofundacion",
    storageBucket: "formualriofundacion.firebasestorage.app",
    messagingSenderId: "715126519393",
    appId: "1:715126519393:web:1fba3a3c34593bf23fdc20",
    measurementId: "G-PZL2MHGXWK"
};

// Configuración de Cloudinary
const CLOUDINARY_CONFIG = {
    cloudName: 'dqrrpxw3j',
    apiKey: '462293412117268',
    uploadPreset: 'ml_default',
    folder: 'futravif/records'
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variables globales
let solicitudes = [];
let solicitudesFiltradas = [];
let paginaActual = 1;
const solicitudesPorPagina = 10;
let solicitudActual = null;

// Elementos del DOM
const elements = {
    totalSolicitudes: document.getElementById('totalSolicitudes'),
    pendientes: document.getElementById('pendientes'),
    aprobadas: document.getElementById('aprobadas'),
    rechazadas: document.getElementById('rechazadas'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    estadoFilter: document.getElementById('estadoFilter'),
    fechaFilter: document.getElementById('fechaFilter'),
    refreshBtn: document.getElementById('refreshBtn'),
    exportBtn: document.getElementById('exportBtn'),
    solicitudesTableBody: document.getElementById('solicitudesTableBody'),
    loading: document.getElementById('loading'),
    noResults: document.getElementById('noResults'),
    paginationInfo: document.getElementById('paginationInfo'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    pageNumbers: document.getElementById('pageNumbers'),
    detailModal: document.getElementById('detailModal'),
    modalBody: document.getElementById('modalBody'),
    aprobarBtn: document.getElementById('aprobarBtn'),
    rechazarBtn: document.getElementById('rechazarBtn'),
    cerrarModalBtn: document.getElementById('cerrarModalBtn'),
    closeModal: document.querySelector('.close'),
    imageModal: document.getElementById('imageModal'),
    imageModalImg: document.getElementById('imageModalImg'),
    imageModalClose: document.getElementById('imageModalClose')
};

// Función para generar URL de Cloudinary
function generarUrlCloudinary(publicId, transformaciones = 'c_fill,w_150,h_150,q_auto') {
    if (!publicId) return null;
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${transformaciones}/${publicId}`;
}

// Función para obtener tipo de archivo
function obtenerTipoArchivo(url, type = '') {
    if (!url && !type) return 'unknown';
    
    // Primero verificar por el tipo MIME si está disponible
    if (type) {
        if (type.startsWith('image/')) return 'image';
        if (type === 'application/pdf') return 'pdf';
    }
    
    // Luego verificar por extensión en la URL
    const extension = url.split('.').pop().toLowerCase();
    const imagenes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const pdfs = ['pdf'];
    
    if (imagenes.includes(extension)) return 'image';
    if (pdfs.includes(extension)) return 'pdf';
    return 'unknown';
}

// Función para mostrar imagen en modal
function mostrarImagenEnModal(publicId) {
    if (!publicId) return;
    
    const urlCompleta = generarUrlCloudinary(publicId, 'c_fit,w_800,h_600,q_auto');
    elements.imageModalImg.src = urlCompleta;
    elements.imageModal.style.display = 'block';
}

// Función para generar HTML de archivos - CORREGIDA
function generarHtmlArchivos(archivos) {
    // Verificar si hay archivos y manejar diferentes estructuras
    const archivosArray = archivos || [];
    
    if (archivosArray.length === 0) {
        return '<span class="no-files">No hay archivos adjuntos</span>';
    }

    console.log('Archivos recibidos:', archivosArray); // Debug

    return archivosArray.map(archivo => {
        // Verificar la estructura del archivo
        const tipo = obtenerTipoArchivo(archivo.url, archivo.type);
        const nombre = archivo.originalName || archivo.nombre || 'Archivo sin nombre';
        const publicId = archivo.publicId;
        const url = archivo.url;
        
        console.log('Procesando archivo:', { tipo, nombre, publicId, url }); // Debug
        
        if (tipo === 'image') {
            const urlMiniatura = generarUrlCloudinary(publicId, 'c_fill,w_60,h_60,q_auto');
            
            return `
                <div class="file-item image-item">
                    <div class="file-thumbnail" onclick="mostrarImagenEnModal('${publicId}')">
                        <img src="${urlMiniatura}" alt="${nombre}" />
                        <div class="file-overlay">
                            <span class="file-icon">👁️</span>
                        </div>
                    </div>
                    <div class="file-info">
                        <span class="file-name" title="${nombre}">${nombre}</span>
                        <span class="file-type">Imagen</span>
                    </div>
                </div>
            `;
        } else if (tipo === 'pdf') {
            return `
                <div class="file-item pdf-item">
                    <div class="file-thumbnail" onclick="window.open('${url}', '_blank')">
                        <div class="pdf-icon">📄</div>
                        <div class="file-overlay">
                            <span class="file-icon">👁️</span>
                        </div>
                    </div>
                    <div class="file-info">
                        <span class="file-name" title="${nombre}">${nombre}</span>
                        <span class="file-type">PDF</span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="file-item unknown-item">
                    <div class="file-thumbnail" onclick="window.open('${url}', '_blank')">
                        <div class="unknown-icon">📎</div>
                        <div class="file-overlay">
                            <span class="file-icon">👁️</span>
                        </div>
                    </div>
                    <div class="file-info">
                        <span class="file-name" title="${nombre}">${nombre}</span>
                        <span class="file-type">Archivo</span>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Función para mostrar mensajes
function showMessage(message, type = 'info') {
    // Remover mensaje anterior si existe
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Crear nuevo mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    // Insertar al inicio del main-content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);

    // Scroll al mensaje
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Función para cargar solicitudes desde Firebase
async function cargarSolicitudes() {
    try {
        console.log('Cargando solicitudes desde Firebase...');
        elements.loading.style.display = 'block';
        elements.noResults.style.display = 'none';

        // Crear query ordenado por fecha de creación (más recientes primero)
        const q = query(collection(db, 'solicitudes'), orderBy('fechaEnvio', 'desc'));
        
        // Obtener documentos
        const querySnapshot = await getDocs(q);
        
        solicitudes = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Solicitud cargada:', data); // Debug para ver la estructura
            solicitudes.push({
                id: doc.id,
                ...data,
                // Convertir timestamp a fecha legible
                fechaEnvio: data.fechaEnvio?.toDate ? data.fechaEnvio.toDate() : new Date(data.fechaCreacion || Date.now())
            });
        });

        console.log(`Cargadas ${solicitudes.length} solicitudes`);
        
        // Aplicar filtros actuales
        aplicarFiltros();
        
        // Actualizar estadísticas
        actualizarEstadisticas();
        
        elements.loading.style.display = 'none';
        
        if (solicitudes.length === 0) {
            elements.noResults.style.display = 'block';
        }

    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        elements.loading.style.display = 'none';
        showMessage('Error al cargar las solicitudes. Verifique su conexión.', 'error');
    }
}

// Función para actualizar estadísticas
function actualizarEstadisticas() {
    const stats = {
        total: solicitudes.length,
        pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
        aprobadas: solicitudes.filter(s => s.estado === 'aprobada').length,
        rechazadas: solicitudes.filter(s => s.estado === 'rechazada').length
    };

    elements.totalSolicitudes.textContent = stats.total;
    elements.pendientes.textContent = stats.pendientes;
    elements.aprobadas.textContent = stats.aprobadas;
    elements.rechazadas.textContent = stats.rechazadas;
}

// Función para aplicar filtros
function aplicarFiltros() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    const estadoFiltro = elements.estadoFilter.value;
    const fechaFiltro = elements.fechaFilter.value;

    solicitudesFiltradas = solicitudes.filter(solicitud => {
        // Filtro de búsqueda
        const matchSearch = !searchTerm || 
            solicitud.nombreEstudiante?.toLowerCase().includes(searchTerm) ||
            solicitud.cedulaEstudiante?.includes(searchTerm) ||
            solicitud.numeroSolicitud?.toLowerCase().includes(searchTerm) ||
            solicitud.emailEstudiante?.toLowerCase().includes(searchTerm);

        // Filtro de estado
        const matchEstado = !estadoFiltro || solicitud.estado === estadoFiltro;

        // Filtro de fecha
        let matchFecha = true;
        if (fechaFiltro) {
            const hoy = new Date();
            const fechaSolicitud = solicitud.fechaEnvio;
            
            switch (fechaFiltro) {
                case 'hoy':
                    matchFecha = fechaSolicitud.toDateString() === hoy.toDateString();
                    break;
                case 'semana':
                    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7);
                    matchFecha = fechaSolicitud >= inicioSemana;
                    break;
                case 'mes':
                    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                    matchFecha = fechaSolicitud >= inicioMes;
                    break;
            }
        }

        return matchSearch && matchEstado && matchFecha;
    });

    // Reset página actual
    paginaActual = 1;
    
    // Renderizar tabla
    renderizarTabla();
    
    // Actualizar paginación
    actualizarPaginacion();
}

// Función para renderizar la tabla - CORREGIDA
function renderizarTabla() {
    const inicio = (paginaActual - 1) * solicitudesPorPagina;
    const fin = inicio + solicitudesPorPagina;
    const solicitudesPagina = solicitudesFiltradas.slice(inicio, fin);

    if (solicitudesPagina.length === 0) {
        elements.solicitudesTableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 40px; color: #666;">
                    No se encontraron solicitudes con los filtros aplicados.
                </td>
            </tr>
        `;
        return;
    }

    elements.solicitudesTableBody.innerHTML = solicitudesPagina.map(solicitud => {
        // CORRECCIÓN: Cambiar archivosAdjuntos por recordsNotas
        const archivos = solicitud.recordsNotas || [];
        const cantidadArchivos = archivos.length;
        const tieneArchivos = cantidadArchivos > 0;
        
        console.log('Archivos para solicitud', solicitud.numeroSolicitud, ':', archivos); // Debug
        
        return `
            <tr>
                <td title="${solicitud.numeroSolicitud || 'N/A'}">${solicitud.numeroSolicitud || 'N/A'}</td>
                <td title="${formatearFecha(solicitud.fechaEnvio)}">${formatearFecha(solicitud.fechaEnvio)}</td>
                <td title="${solicitud.nombreEstudiante || 'N/A'}">${solicitud.nombreEstudiante || 'N/A'}</td>
                <td>${solicitud.edadEstudiante || 'N/A'}</td>
                <td title="${solicitud.cedulaEstudiante || 'N/A'}">${solicitud.cedulaEstudiante || 'N/A'}</td>
                <td title="${solicitud.telefonoEstudiante || 'N/A'}">${solicitud.telefonoEstudiante || 'N/A'}</td>
                <td title="${solicitud.emailEstudiante || 'N/A'}">${solicitud.emailEstudiante || 'N/A'}</td>
                <td title="${solicitud.universidadDeseada || 'N/A'}">${solicitud.universidadDeseada || 'N/A'}</td>
                <td title="${solicitud.carreraDeseada || 'N/A'}">${solicitud.carreraDeseada || 'N/A'}</td>
                <td class="files-column">
                    ${tieneArchivos ? 
                        `<span class="files-indicator" title="${cantidadArchivos} archivo(s)">📎 ${cantidadArchivos}</span>` : 
                        '<span class="no-files-indicator">Sin archivos</span>'
                    }
                </td>
                <td>
                    <span class="estado ${solicitud.estado || 'pendiente'}">
                        ${(solicitud.estado || 'pendiente').charAt(0).toUpperCase() + (solicitud.estado || 'pendiente').slice(1)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons-table">
                        <button class="btn-ver" onclick="verDetalles('${solicitud.id}')">Ver</button>
                        ${solicitud.estado !== 'aprobada' ? `<button class="btn-aprobar" onclick="cambiarEstado('${solicitud.id}', 'aprobada')">Aprobar</button>` : ''}
                        ${solicitud.estado !== 'rechazada' ? `<button class="btn-rechazar" onclick="cambiarEstado('${solicitud.id}', 'rechazada')">Rechazar</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Función para actualizar paginación
function actualizarPaginacion() {
    const totalPaginas = Math.ceil(solicitudesFiltradas.length / solicitudesPorPagina);
    const inicio = (paginaActual - 1) * solicitudesPorPagina + 1;
    const fin = Math.min(inicio + solicitudesPorPagina - 1, solicitudesFiltradas.length);

    // Información de paginación
    elements.paginationInfo.textContent = 
        `Mostrando ${inicio}-${fin} de ${solicitudesFiltradas.length} solicitudes`;

    // Controles de paginación
    elements.prevPage.disabled = paginaActual === 1;
    elements.nextPage.disabled = paginaActual === totalPaginas || totalPaginas === 0;

    // Números de página
    let pageNumbersHTML = '';
    const maxPagesToShow = 5;
    let startPage = Math.max(1, paginaActual - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPaginas, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbersHTML += `
            <span class="page-number ${i === paginaActual ? 'active' : ''}" 
                  onclick="irAPagina(${i})">${i}</span>
        `;
    }

    elements.pageNumbers.innerHTML = pageNumbersHTML;
}

// Función para formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    return fecha.toLocaleDateString('es-DO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para ver detalles de una solicitud - CORREGIDA
function verDetalles(id) {
    solicitudActual = solicitudes.find(s => s.id === id);
    if (!solicitudActual) {
        showMessage('No se pudo cargar la solicitud seleccionada.', 'error');
        return;
    }

    console.log('Mostrando detalles de solicitud:', solicitudActual); // Debug

    // Generar HTML con los detalles
    const detallesHTML = `
        <div class="detail-section">
            <h4>Información Personal del Estudiante</h4>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Nombre Completo:</span>
                    <span class="detail-value">${solicitudActual.nombreEstudiante || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Edad:</span>
                    <span class="detail-value">${solicitudActual.edadEstudiante || 'N/A'} años</span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Cédula:</span>
                    <span class="detail-value">${solicitudActual.cedulaEstudiante || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Teléfono:</span>
                    <span class="detail-value">${solicitudActual.telefonoEstudiante || 'N/A'}</span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${solicitudActual.emailEstudiante || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Dirección:</span>
                    <span class="detail-value">${solicitudActual.direccion || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Información Académica</h4>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Liceo:</span>
                    <span class="detail-value">${solicitudActual.liceo || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Grado:</span>
                    <span class="detail-value">${solicitudActual.grado || 'N/A'}</span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Índice de Calificaciones:</span>
                    <span class="detail-value">${solicitudActual.indiceCalificaciones || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Universidad Deseada:</span>
                    <span class="detail-value">${solicitudActual.universidadDeseada || 'N/A'}</span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Carrera Deseada:</span>
                    <span class="detail-value">${solicitudActual.carreraDeseada || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Información de Padres/Tutores</h4>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Padre/Tutor 1:</span>
                    <span class="detail-value">${solicitudActual.nombrePadre1 || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Cédula Padre 1:</span>
                    <span class="detail-value">${solicitudActual.cedulaPadre1 || 'N/A'}</span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Teléfono Padre 1:</span>
                    <span class="detail-value">${solicitudActual.telefonoPadre1 || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Ocupación Padre 1:</span>
                    <span class="detail-value">${solicitudActual.ocupacionPadre1 || 'N/A'}</span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Ingresos Padre 1:</span>
                    <span class="detail-value">${solicitudActual.ingresosPadre1 ? `RD$${parseInt(solicitudActual.ingresosPadre1).toLocaleString('es-DO')}` : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Padre/Tutor 2:</span>
                    <span class="detail-value">${solicitudActual.nombrePadre2 || 'N/A'}</span>
                </div>
            </div>
            ${solicitudActual.nombrePadre2 ? `
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="detail-label">Cédula Padre 2:</span>
                        <span class="detail-value">${solicitudActual.cedulaPadre2 || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Teléfono Padre 2:</span>
                        <span class="detail-value">${solicitudActual.telefonoPadre2 || 'N/A'}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="detail-label">Ocupación Padre 2:</span>
                        <span class="detail-value">${solicitudActual.ocupacionPadre2 || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ingresos Padre 2:</span>
                        <span class="detail-value">${solicitudActual.ingresosPadre2 ? `RD$${parseInt(solicitudActual.ingresosPadre2).toLocaleString('es-DO')}` : 'N/A'}</span>
                    </div>
                </div>
            ` : ''}
        </div>

        <div class="detail-section">
            <h4>Información Adicional</h4>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Motivación:</span>
                    <span class="detail-value">${solicitudActual.motivacion || 'N/A'}</span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Situación Económica:</span>
                    <span class="detail-value">${solicitudActual.situacionEconomica || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Archivos Adjuntos</h4>
            <div class="files-grid">
                ${generarHtmlArchivos(solicitudActual.recordsNotas)}
            </div>
        </div>

        <div class="detail-section">
            <h4>Información del Sistema</h4>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Número de Solicitud:</span>
                    <span class="detail-value">${solicitudActual.numeroSolicitud || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Estado:</span>
                    <span class="detail-value">
                        <span class="estado ${solicitudActual.estado || 'pendiente'}">
                            ${(solicitudActual.estado || 'pendiente').charAt(0).toUpperCase() + (solicitudActual.estado || 'pendiente').slice(1)}
                        </span>
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <span class="detail-label">Fecha de Envío:</span>
                    <span class="detail-value">${formatearFecha(solicitudActual.fechaEnvio)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total de Archivos:</span>
                    <span class="detail-value">${solicitudActual.totalArchivosSubidos || 0}</span>
                </div>
            </div>
        </div>
    `;

    elements.modalBody.innerHTML = detallesHTML;
    elements.detailModal.style.display = 'block';
    
    // Actualizar botones del modal según el estado
    const estado = solicitudActual.estado || 'pendiente';
    elements.aprobarBtn.style.display = estado !== 'aprobada' ? 'inline-block' : 'none';
    elements.rechazarBtn.style.display = estado !== 'rechazada' ? 'inline-block' : 'none';
}

// Función para cambiar estado de solicitud
async function cambiarEstado(id, nuevoEstado) {
    try {
        const solicitud = solicitudes.find(s => s.id === id);
        if (!solicitud) {
            showMessage('Solicitud no encontrada.', 'error');
            return;
        }

        const confirmacion = confirm(
            `¿Está seguro de que desea ${nuevoEstado === 'aprobada' ? 'aprobar' : 'rechazar'} la solicitud de ${solicitud.nombreEstudiante}?`
        );

        if (!confirmacion) return;

        // Actualizar en Firebase
        const docRef = doc(db, 'solicitudes', id);
        await updateDoc(docRef, {
            estado: nuevoEstado,
            fechaActualizacion: new Date(),
            actualizadoPor: 'Admin' // Puedes cambiar esto por el usuario actual
        });

        // Actualizar en la lista local
        const index = solicitudes.findIndex(s => s.id === id);
        if (index !== -1) {
            solicitudes[index].estado = nuevoEstado;
        }

        // Cerrar modal si está abierto
        elements.detailModal.style.display = 'none';

        // Refrescar la tabla y estadísticas
        aplicarFiltros();
        actualizarEstadisticas();

        showMessage(
            `Solicitud ${nuevoEstado === 'aprobada' ? 'aprobada' : 'rechazada'} exitosamente.`,
            'success'
        );

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        showMessage('Error al actualizar la solicitud. Inténtelo nuevamente.', 'error');
    }
}

// Función para exportar a Excel
function exportarAExcel() {
    if (solicitudesFiltradas.length === 0) {
        showMessage('No hay solicitudes para exportar.', 'error');
        return;
    }

    try {
        // Preparar datos para Excel
        const datosExcel = solicitudesFiltradas.map(solicitud => ({
            'Número de Solicitud': solicitud.numeroSolicitud || '',
            'Fecha de Envío': formatearFecha(solicitud.fechaEnvio),
            'Estado': (solicitud.estado || 'pendiente').charAt(0).toUpperCase() + (solicitud.estado || 'pendiente').slice(1),
            'Nombre del Estudiante': solicitud.nombreEstudiante || '',
            'Edad': solicitud.edadEstudiante || '',
            'Cédula': solicitud.cedulaEstudiante || '',
            'Teléfono': solicitud.telefonoEstudiante || '',
            'Email': solicitud.emailEstudiante || '',
            'Dirección': solicitud.direccion || '',
            'Liceo': solicitud.liceo || '',
            'Grado': solicitud.grado || '',
            'Índice de Calificaciones': solicitud.indiceCalificaciones || '',
            'Universidad Deseada': solicitud.universidadDeseada || '',
            'Carrera Deseada': solicitud.carreraDeseada || '',
            'Padre/Tutor 1': solicitud.nombrePadre1 || '',
            'Cédula Padre 1': solicitud.cedulaPadre1 || '',
            'Teléfono Padre 1': solicitud.telefonoPadre1 || '',
            'Ocupación Padre 1': solicitud.ocupacionPadre1 || '',
            'Ingresos Padre 1': solicitud.ingresosPadre1 || '',
            'Padre/Tutor 2': solicitud.nombrePadre2 || '',
            'Cédula Padre 2': solicitud.cedulaPadre2 || '',
            'Teléfono Padre 2': solicitud.telefonoPadre2 || '',
            'Ocupación Padre 2': solicitud.ocupacionPadre2 || '',
            'Ingresos Padre 2': solicitud.ingresosPadre2 || '',
            'Motivación': solicitud.motivacion || '',
            'Situación Económica': solicitud.situacionEconomica || '',
            'Total Archivos': solicitud.totalArchivosSubidos || 0
        }));

        // Crear CSV
        const headers = Object.keys(datosExcel[0]);
        const csvContent = [
            headers.join(','),
            ...datosExcel.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escapar comillas y agregar comillas si contiene comas
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');

        // Crear y descargar archivo
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `FUTRAVIF_Solicitudes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showMessage(`Se exportaron ${solicitudesFiltradas.length} solicitudes exitosamente.`, 'success');

    } catch (error) {
        console.error('Error al exportar:', error);
        showMessage('Error al exportar las solicitudes.', 'error');
    }
}

// Función para ir a una página específica
function irAPagina(pagina) {
    paginaActual = pagina;
    renderizarTabla();
    actualizarPaginacion();
}

// Event Listeners
function configurarEventListeners() {
    // Búsqueda
    elements.searchBtn.addEventListener('click', aplicarFiltros);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            aplicarFiltros();
        }
    });

    // Filtros
    elements.estadoFilter.addEventListener('change', aplicarFiltros);
    elements.fechaFilter.addEventListener('change', aplicarFiltros);

    // Botones de acción
    elements.refreshBtn.addEventListener('click', cargarSolicitudes);
    elements.exportBtn.addEventListener('click', exportarAExcel);

    // Paginación
    elements.prevPage.addEventListener('click', () => {
        if (paginaActual > 1) {
            irAPagina(paginaActual - 1);
        }
    });

    elements.nextPage.addEventListener('click', () => {
        const totalPaginas = Math.ceil(solicitudesFiltradas.length / solicitudesPorPagina);
        if (paginaActual < totalPaginas) {
            irAPagina(paginaActual + 1);
        }
    });

    // Modal principal
    elements.closeModal.addEventListener('click', () => {
        elements.detailModal.style.display = 'none';
    });

    elements.cerrarModalBtn.addEventListener('click', () => {
        elements.detailModal.style.display = 'none';
    });

    elements.aprobarBtn.addEventListener('click', () => {
        if (solicitudActual) {
            cambiarEstado(solicitudActual.id, 'aprobada');
        }
    });

    elements.rechazarBtn.addEventListener('click', () => {
        if (solicitudActual) {
            cambiarEstado(solicitudActual.id, 'rechazada');
        }
    });

    // Modal de imagen
    if (elements.imageModalClose) {
        elements.imageModalClose.addEventListener('click', () => {
            elements.imageModal.style.display = 'none';
        });
    }

    // Cerrar modales al hacer click fuera
    window.addEventListener('click', (e) => {
        if (e.target === elements.detailModal) {
            elements.detailModal.style.display = 'none';
        }
        if (e.target === elements.imageModal) {
            elements.imageModal.style.display = 'none';
        }
    });

    // Configurar actualización automática cada 30 segundos
    setInterval(() => {
        console.log('Actualizando solicitudes automáticamente...');
        cargarSolicitudes();
    }, 30000);
}

// Hacer funciones globales para los onclick del HTML
window.verDetalles = verDetalles;
window.cambiarEstado = cambiarEstado;
window.irAPagina = irAPagina;
window.mostrarImagenEnModal = mostrarImagenEnModal;

// Función de inicialización
function inicializar() {
    try {
        console.log('🔥 Iniciando Panel de Administración FUTRAVIF...');
        
        // Verificar Firebase
        if (!app || !db) {
            console.error('❌ Error: Firebase no se inicializó correctamente');
            showMessage('Error de configuración del sistema. Contacte al administrador.', 'error');
            return;
        }
        
        console.log('✅ Firebase inicializado correctamente');
        
        // Configurar event listeners
        configurarEventListeners();
        
        // Cargar solicitudes iniciales
        cargarSolicitudes();
        
        console.log('🎉 Panel de Administración inicializado correctamente');
        showMessage('Panel de administración cargado correctamente.', 'success');
        
    } catch (error) {
        console.error('💥 Error crítico al inicializar:', error);
        showMessage('Error crítico del sistema. Recargue la página.', 'error');
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}