const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY,
  },
});

const FROM = process.env.EMAIL_FROM || 'vacaciones@bridgetdf.com';
const FRONTEND = process.env.FRONTEND_URL || 'https://vacaciones-bridget.netlify.app';

function formatFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function mailNuevoPedidoGerente({ gerente, pedido, token }) {
  const link = `${FRONTEND}/aprobar/${token}`;
  await transporter.sendMail({
    from: `Sistema de Vacaciones <${FROM}>`,
    to: gerente.email,
    subject: `Nuevo pedido de vacaciones — ${pedido.empleado_nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#1E3A5F">Nuevo pedido de vacaciones</h2>
        <p>Hola <strong>${gerente.nombre}</strong>, recibiste un nuevo pedido:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Empleado</td><td style="padding:8px">${pedido.empleado_nombre}</td></tr>
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Empresa</td><td style="padding:8px">${pedido.empresa_nombre}</td></tr>
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Desde</td><td style="padding:8px">${formatFecha(pedido.fecha_inicio)}</td></tr>
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Hasta</td><td style="padding:8px">${formatFecha(pedido.fecha_fin)}</td></tr>
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Días hábiles</td><td style="padding:8px">${pedido.dias_habiles}</td></tr>
          ${pedido.comentario_empleado ? `<tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Comentario</td><td style="padding:8px">${pedido.comentario_empleado}</td></tr>` : ''}
        </table>
        <a href="${link}" style="display:inline-block;background:#1E3A5F;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Ver y resolver pedido</a>
        <p style="color:#888;font-size:12px;margin-top:24px">También podés ingresar a tu panel en ${FRONTEND}/gerente</p>
      </div>
    `
  });
}

async function mailConfirmacionEmpleado({ pedido }) {
  await transporter.sendMail({
    from: `Sistema de Vacaciones <${FROM}>`,
    to: pedido.empleado_email,
    subject: `Tu pedido de vacaciones fue recibido`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#1E3A5F">Pedido recibido</h2>
        <p>Hola <strong>${pedido.empleado_nombre}</strong>, tu pedido fue enviado correctamente y está pendiente de aprobación.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Desde</td><td style="padding:8px">${formatFecha(pedido.fecha_inicio)}</td></tr>
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Hasta</td><td style="padding:8px">${formatFecha(pedido.fecha_fin)}</td></tr>
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Días hábiles</td><td style="padding:8px">${pedido.dias_habiles}</td></tr>
        </table>
        <p>Te avisaremos cuando el gerente responda.</p>
      </div>
    `
  });
}

async function mailResolucionEmpleado({ pedido, estado }) {
  const colores = { aprobado: '#16a34a', rechazado: '#dc2626', a_revisar: '#ca8a04' };
  const etiquetas = { aprobado: 'Aprobado ✓', rechazado: 'Rechazado ✗', a_revisar: 'Con comentarios — revisar' };
  const color = colores[estado] || '#1E3A5F';
  const etiqueta = etiquetas[estado] || estado;

  await transporter.sendMail({
    from: `Sistema de Vacaciones <${FROM}>`,
    to: pedido.empleado_email,
    subject: `Tu pedido de vacaciones: ${etiqueta}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:${color}">${etiqueta}</h2>
        <p>Hola <strong>${pedido.empleado_nombre}</strong>, tu pedido de vacaciones fue respondido.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Desde</td><td style="padding:8px">${formatFecha(pedido.fecha_inicio)}</td></tr>
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Hasta</td><td style="padding:8px">${formatFecha(pedido.fecha_fin)}</td></tr>
          <tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Días hábiles</td><td style="padding:8px">${pedido.dias_habiles}</td></tr>
          ${pedido.reemplazante ? `<tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Reemplazante</td><td style="padding:8px">${pedido.reemplazante}</td></tr>` : ''}
          ${pedido.comentario_gerente ? `<tr><td style="padding:8px;background:#EEF3FA;font-weight:bold">Comentario del gerente</td><td style="padding:8px">${pedido.comentario_gerente}</td></tr>` : ''}
        </table>
      </div>
    `
  });
}

async function mailRecordatorio({ gerente, pedido, token }) {
  const link = `${FRONTEND}/aprobar/${token}`;
  await transporter.sendMail({
    from: `Sistema de Vacaciones <${FROM}>`,
    to: gerente.email,
    subject: `Recordatorio: pedido pendiente de ${pedido.empleado_nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#ca8a04">Pedido pendiente de respuesta</h2>
        <p>Hola <strong>${gerente.nombre}</strong>, tenés un pedido sin resolver hace más de 3 días:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#FEF9EE;font-weight:bold">Empleado</td><td style="padding:8px">${pedido.empleado_nombre}</td></tr>
          <tr><td style="padding:8px;background:#FEF9EE;font-weight:bold">Desde</td><td style="padding:8px">${formatFecha(pedido.fecha_inicio)}</td></tr>
          <tr><td style="padding:8px;background:#FEF9EE;font-weight:bold">Hasta</td><td style="padding:8px">${formatFecha(pedido.fecha_fin)}</td></tr>
          <tr><td style="padding:8px;background:#FEF9EE;font-weight:bold">Días hábiles</td><td style="padding:8px">${pedido.dias_habiles}</td></tr>
        </table>
        <a href="${link}" style="display:inline-block;background:#1E3A5F;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Resolver ahora</a>
      </div>
    `
  });
}

async function mailAprobacionRRHH({ gerente, pedido }) {
  await transporter.sendMail({
    from: `Sistema de Vacaciones <${FROM}>`,
    to: 'clientesrg@bridgetdf.com',
    subject: `Vacaciones aprobadas — ${pedido.empleado_nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#16a34a">Vacaciones aprobadas ✓</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Empleado</td><td style="padding:8px">${pedido.empleado_nombre}</td></tr>
          <tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Empresa</td><td style="padding:8px">${pedido.empresa_nombre || ''}</td></tr>
          <tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Aprobado por</td><td style="padding:8px">${gerente.nombre}</td></tr>
          <tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Desde</td><td style="padding:8px">${formatFecha(pedido.fecha_inicio)}</td></tr>
          <tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Hasta</td><td style="padding:8px">${formatFecha(pedido.fecha_fin)}</td></tr>
          <tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Días</td><td style="padding:8px">${pedido.dias_habiles}</td></tr>
          ${pedido.reemplazante ? `<tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Reemplazante</td><td style="padding:8px">${pedido.reemplazante}</td></tr>` : ''}
          ${pedido.comentario_gerente ? `<tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Comentario</td><td style="padding:8px">${pedido.comentario_gerente}</td></tr>` : ''}
          <tr><td style="padding:8px;background:#DCFCE7;font-weight:bold">Fecha de aprobación</td><td style="padding:8px">${formatFecha(new Date().toISOString())}</td></tr>
        </table>
      </div>
    `
  });
}

async function mailPedidoEditado({ gerente, pedido, token }) {
  const link = `${FRONTEND}/aprobar/${token}`;
  await transporter.sendMail({
    from: `Sistema de Vacaciones <${FROM}>`,
    to: gerente.email,
    subject: `Pedido modificado — ${pedido.empleado_nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#ca8a04">Pedido de vacaciones modificado</h2>
        <p>Hola <strong>${gerente.nombre}</strong>, <strong>${pedido.empleado_nombre}</strong> modificó su pedido de vacaciones. Las nuevas fechas son:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#FEF9EE;font-weight:bold">Desde</td><td style="padding:8px">${formatFecha(pedido.fecha_inicio)}</td></tr>
          <tr><td style="padding:8px;background:#FEF9EE;font-weight:bold">Hasta</td><td style="padding:8px">${formatFecha(pedido.fecha_fin)}</td></tr>
          <tr><td style="padding:8px;background:#FEF9EE;font-weight:bold">Días hábiles</td><td style="padding:8px">${pedido.dias_habiles}</td></tr>
          ${pedido.comentario_empleado ? `<tr><td style="padding:8px;background:#FEF9EE;font-weight:bold">Comentario</td><td style="padding:8px">${pedido.comentario_empleado}</td></tr>` : ''}
        </table>
        <a href="${link}" style="display:inline-block;background:#1E3A5F;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Ver y resolver pedido</a>
      </div>
    `
  });
}

module.exports = { mailNuevoPedidoGerente, mailConfirmacionEmpleado, mailResolucionEmpleado, mailRecordatorio, mailPedidoEditado, mailAprobacionRRHH };
