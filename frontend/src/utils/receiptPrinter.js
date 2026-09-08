/**
 * Thermal Receipt Printing Utility
 * Isolates the receipt into a dedicated 80mm zero-margin iframe
 * to eliminate all browser UI, page scroll, and parent layout offsets.
 */
export function printThermalElement(elementOrSelector, title = 'Receipt') {
  const el = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  if (!el) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      @page {
        size: 80mm auto;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html, body {
        width: 80mm;
        max-width: 80mm;
        margin: 0 !important;
        padding: 0mm 2mm 2mm 2mm !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1.4 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td, th {
        color: #000000 !important;
        font-weight: 900 !important;
      }
    </style>
  </head>
  <body>
    ${el.innerHTML}
  </body>
</html>`);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 150);
}
