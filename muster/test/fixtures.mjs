/* A small, real PDF: FlateDecode content stream, escaped parentheses, an
 * end-of-line between the data and endstream - the shape a word processor
 * actually emits, which is what the reader has to cope with. */
import { deflateSync } from "node:zlib";

export function makePdf(lines) {
  const text = lines || [
    "RJ Thompson",
    "Toronto, ON - available on site",
    "EXPERIENCE",
    "Operations Lead, Acme (2019-2024)",
    "Ran a team of 12; cut cycle time 40%",
    "SKILLS",
    "Python, SQL, logistics"
  ];
  let body = "BT /F1 12 Tf 72 720 Td\n";
  text.forEach((t, i) => {
    const esc = t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    if (i) body += "0 -18 Td\n";
    body += `(${esc}) Tj\n`;
  });
  body += "ET\n";
  const comp = deflateSync(Buffer.from(body, "latin1"));

  const objs = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
              + "/Resources << /Font << /F1 5 0 R >> >> >>"),
    Buffer.concat([Buffer.from(`<< /Length ${comp.length} /Filter /FlateDecode >>\nstream\n`),
                   comp, Buffer.from("\nendstream")]),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  ];

  const parts = [Buffer.from("%PDF-1.4\n")];
  const offs = [];
  let at = parts[0].length;
  objs.forEach((o, i) => {
    const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), o, Buffer.from("\nendobj\n")]);
    offs.push(at); at += b.length; parts.push(b);
  });
  const xref = at;
  let tail = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offs) tail += String(o).padStart(10, "0") + " 00000 n \n";
  tail += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  parts.push(Buffer.from(tail));
  return Buffer.concat(parts);
}

/* A 1x1 png, for the image path. */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64");
